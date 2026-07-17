/**
 * coordinationFlywheel: Phase 5 of the Movement Coordination Engine.
 *
 * Two agents kept on a daily cron:
 *
 * 1. Stale-claims agent. Walks every bounty_roles row in payStatus 'filled'
 *    (meaning claimed but not yet submitted/paid). Older than
 *    coordination.stale_claim_nudge_days (default 7) gets one in-app nudge;
 *    older than coordination.stale_claim_expire_days (default 14) reverts
 *    to 'unfilled' so the work can move to someone else. The nudge is
 *    one-shot per claim: we set a marker in the body so we never spam
 *    the same claim across daily runs.
 *
 * 2. Roles-reconciliation agent. Re-parses client/src/data/gameRoles.ts
 *    and diffs against the roleHolders table. New roles get inserted
 *    with userId=NULL so they show up in the admin assign form. Drifted
 *    roleTitle / circle / kind are refreshed on existing rows. Aliases
 *    are merged additively so an admin's hand-edits never get clobbered.
 *    We never delete a row; deactivating a role is a manual call (the
 *    isActive flag) to preserve the audit trail.
 *
 * Both agents are idempotent and safe to re-run on the same day.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { bounties, bountyRoles, bountyDemandFactors, notifications, roleHolders, roles } from "../../drizzle/schema";
import { getGameVariable } from "../game";
import {
  computeDemandFactor,
  DEFAULT_LEARNING,
  SCOPE_TIERS,
  type ScopeTier,
  type DemandSignals,
} from "../db/bountyValuation";

const DEFAULT_NUDGE_DAYS = 7;
const DEFAULT_EXPIRE_DAYS = 14;
const NUDGE_MARKER = "[flywheel-nudge]";
// How fast a claim must land to read as a fast-claim signal, and how many
// bounties a (circle, scopeTier) needs before the factor is allowed to move.
const FAST_CLAIM_DAYS = 2;
const MIN_SAMPLE = 3;

export interface StaleClaimsReport {
  nudged: number;
  expired: number;
  scanned: number;
}

export interface RolesReconcileReport {
  inserted: number;
  updated: number;
  unchanged: number;
  total: number;
}

async function getDays(key: string, fallback: number): Promise<number> {
  try {
    const v = await getGameVariable(key);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

export async function runStaleClaimsAgent(): Promise<StaleClaimsReport> {
  const db = await getDb();
  if (!db) return { nudged: 0, expired: 0, scanned: 0 };
  const nudgeDays = await getDays("coordination.stale_claim_nudge_days", DEFAULT_NUDGE_DAYS);
  const expireDays = await getDays("coordination.stale_claim_expire_days", DEFAULT_EXPIRE_DAYS);
  const now = Date.now();
  const nudgeCutoff = new Date(now - nudgeDays * 24 * 60 * 60 * 1000);
  const expireCutoff = new Date(now - expireDays * 24 * 60 * 60 * 1000);

  // Find bounty roles in 'filled' status (claimed but not yet paid) older than nudge cutoff
  const claimedRoles = await db
    .select({
      id: bountyRoles.id,
      bountyId: bountyRoles.bountyId,
      userId: bountyRoles.userId,
      updatedAt: bountyRoles.updatedAt,
    })
    .from(bountyRoles)
    .where(and(eq(bountyRoles.payStatus, "filled"), isNotNull(bountyRoles.userId), lt(bountyRoles.updatedAt, nudgeCutoff)));

  if (!claimedRoles.length) return { nudged: 0, expired: 0, scanned: 0 };

  const bIds = [...new Set(claimedRoles.map((r) => r.bountyId))];
  const bRows = await db
    .select({ id: bounties.id, title: bounties.title })
    .from(bounties)
    .where(and(isNotNull(bounties.id)));
  const bMap = new Map(bRows.map((b) => [b.id, b]));

  let nudged = 0;
  let expired = 0;

  for (const r of claimedRoles) {
    if (!r.userId || !r.updatedAt) continue;
    const bounty = bMap.get(r.bountyId);
    const title = bounty?.title ?? `Bounty #${r.bountyId}`;

    if (r.updatedAt < expireCutoff) {
      await db.insert(notifications).values({
        userId: r.userId,
        type: "mention",
        title: `Released: ${title.slice(0, 180)}`,
        body: `${NUDGE_MARKER} Your claim sat for over ${expireDays} days, so the role is back in the open pool for someone else. You can still re-claim it any time.`,
        link: `/bounties/${r.bountyId}`,
      });
      await db
        .update(bountyRoles)
        .set({ userId: null, payStatus: "unfilled", filledByLog: null })
        .where(eq(bountyRoles.id, r.id));
      expired += 1;
      continue;
    }

    const linkPath = `/bounties/${r.bountyId}`;
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, r.userId),
        eq(notifications.link, linkPath),
        sql`${notifications.body} LIKE ${`%${NUDGE_MARKER}%`}`,
      ))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(notifications).values({
      userId: r.userId,
      type: "mention",
      title: `Still on this one? ${title.slice(0, 160)}`,
      body: `${NUDGE_MARKER} You claimed this role ${nudgeDays}+ days ago. Link your PR when ready, or release the role so someone else can pick it up (auto-releases at ${expireDays} days).`,
      link: linkPath,
    });
    nudged += 1;
  }

  return { nudged, expired, scanned: claimedRoles.length };
}

interface ParsedRole {
  slug: string;
  title: string;
  characterName: string;
  circle: string;
  kind: "game" | "fund";
  aliases: string[];
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildAliases(role: Omit<ParsedRole, "aliases" | "slug">): string[] {
  const out = new Set<string>();
  out.add(role.title);
  if (role.characterName) {
    out.add(role.characterName);
    const stripped = role.characterName.replace(/^The\s+/i, "").trim();
    if (stripped && stripped !== role.characterName) out.add(stripped);
  }
  if (role.circle) {
    out.add(role.circle);
    const noCircle = role.circle.replace(/\s*Circle$/i, "").trim();
    if (noCircle && noCircle !== role.circle) out.add(noCircle);
  }
  return Array.from(out);
}

function parseGameRoles(): ParsedRole[] {
  const path = join(process.cwd(), "client", "src", "data", "gameRoles.ts");
  const file = readFileSync(path, "utf8");
  const arrayStart = file.indexOf("export const gameRoles");
  if (arrayStart === -1) return [];
  const eq = file.indexOf("=", arrayStart);
  const open = file.indexOf("[", eq);
  let depth = 0;
  let end = open;
  for (let i = open; i < file.length; i++) {
    if (file[i] === "[") depth++;
    else if (file[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = file.slice(open + 1, end);

  const objects: string[] = [];
  let braceDepth = 0;
  let start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") {
      if (braceDepth === 0) start = i;
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && start !== -1) {
        objects.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }

  const field = (src: string, name: string): string | null => {
    const re = new RegExp(`\\b${name}\\s*:\\s*(['"\\\`])`, "m");
    const m = src.match(re);
    if (!m) return null;
    const q = m[1];
    const startIdx = src.indexOf(q, m.index) + 1;
    let i = startIdx;
    while (i < src.length) {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === q) break;
      i++;
    }
    return src.slice(startIdx, i);
  };

  return objects
    .map((src): ParsedRole | null => {
      const title = field(src, "title");
      if (!title) return null;
      const characterName = field(src, "characterName") ?? "";
      const circle = field(src, "circle") ?? "";
      const kindStr = field(src, "kind");
      const base = {
        title,
        characterName,
        circle,
        kind: (kindStr === "fund" ? "fund" : "game") as "game" | "fund",
      };
      return {
        slug: toSlug(title),
        ...base,
        aliases: buildAliases(base),
      };
    })
    .filter((r): r is ParsedRole => Boolean(r));
}

function mergeAliases(existing: unknown, fresh: string[]): { merged: string[]; changed: boolean } {
  const have = new Set<string>();
  if (Array.isArray(existing)) {
    for (const a of existing) if (typeof a === "string") have.add(a);
  }
  const before = have.size;
  for (const a of fresh) have.add(a);
  return { merged: Array.from(have), changed: have.size !== before };
}

export async function runRolesReconciliationAgent(): Promise<RolesReconcileReport> {
  const db = await getDb();
  if (!db) return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
  // Source of truth is the roles table (seeded from gameRoles.ts). The disk
  // parser (parseGameRoles) is retired to a fallback used only if the table is
  // empty, so a fresh DB still reconciles.
  const roleRows = await db
    .select({ slug: roles.slug, title: roles.title, circle: roles.circle, kind: roles.kind, aliases: roles.aliases })
    .from(roles)
    .where(eq(roles.active, 1));
  const parsed: ParsedRole[] = roleRows.length > 0
    ? roleRows.map((r) => ({
        slug: r.slug,
        title: r.title,
        characterName: "",
        circle: r.circle ?? "",
        kind: r.kind as "game" | "fund",
        aliases: Array.isArray(r.aliases)
          ? (r.aliases as string[])
          : buildAliases({ title: r.title, characterName: "", circle: r.circle ?? "", kind: r.kind as "game" | "fund" }),
      }))
    : parseGameRoles();
  if (parsed.length === 0) return { inserted: 0, updated: 0, unchanged: 0, total: 0 };

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const role of parsed) {
    const [existing] = await db
      .select({
        id: roleHolders.id,
        roleTitle: roleHolders.roleTitle,
        circle: roleHolders.circle,
        kind: roleHolders.kind,
        aliases: roleHolders.aliases,
      })
      .from(roleHolders)
      .where(eq(roleHolders.roleSlug, role.slug))
      .limit(1);

    if (!existing) {
      await db.insert(roleHolders).values({
        roleSlug: role.slug,
        roleTitle: role.title,
        kind: role.kind,
        circle: role.circle || null,
        userId: null,
        isActive: 1,
        notifyEmail: 1,
        notifyInApp: 1,
        aliases: role.aliases,
      });
      inserted += 1;
      continue;
    }

    const aliasResult = mergeAliases(existing.aliases, role.aliases);
    const titleChanged = existing.roleTitle !== role.title;
    const circleChanged = (existing.circle ?? "") !== (role.circle ?? "");
    const kindChanged = existing.kind !== role.kind;

    if (!titleChanged && !circleChanged && !kindChanged && !aliasResult.changed) {
      unchanged += 1;
      continue;
    }

    await db
      .update(roleHolders)
      .set({
        roleTitle: role.title,
        circle: role.circle || null,
        kind: role.kind,
        aliases: aliasResult.merged,
      })
      .where(eq(roleHolders.id, existing.id));
    updated += 1;
  }

  return { inserted, updated, unchanged, total: parsed.length };
}

export interface DemandPrecedentReport {
  groupsUpdated: number;
  boostedBounties: number;
}

async function getNum(key: string, fallback: number): Promise<number> {
  try {
    const v = await getGameVariable(key);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

interface DoerRow {
  circle: string;
  scopeTier: ScopeTier;
  workStatus: string;
  payStatus: string;
  amount: number;
  ageDays: number; // days since the bounty was created
  claimLagDays: number | null; // days from creation to when the doer role was filled
}

/**
 * Demand + precedent learning agent. For each (circle, scopeTier) it recomputes,
 * over a rolling window, the precedent median (what the community has actually
 * paid) and a bounded demand factor that rises when bounties go unclaimed and
 * eases down when they are claimed fast. It also flags hard-to-fill bounties
 * (unfilled past the unclaimed threshold) with priorityBoost. The valuation
 * engine reads both. See BOUNTY_VALUATION_ENGINE_SPEC.md.
 */
export async function runDemandPrecedentAgent(): Promise<DemandPrecedentReport> {
  const db = await getDb();
  if (!db) return { groupsUpdated: 0, boostedBounties: 0 };

  const windowDays = await getDays("bounty.learning.window_days", DEFAULT_LEARNING.windowDays);
  const unclaimedDays = await getDays("bounty.learning.unclaimed_days", DEFAULT_LEARNING.unclaimedDays);
  const learning = {
    raiseSensitivity: await getNum("bounty.learning.raise_sensitivity", DEFAULT_LEARNING.raiseSensitivity),
    lowerSensitivity: await getNum("bounty.learning.lower_sensitivity", DEFAULT_LEARNING.lowerSensitivity),
    factorMin: await getNum("bounty.learning.factor_min", DEFAULT_LEARNING.factorMin),
    factorMax: await getNum("bounty.learning.factor_max", DEFAULT_LEARNING.factorMax),
    minSample: MIN_SAMPLE,
  };

  // Auto-flag hard-to-fill bounties: still-unfilled doer role, open past the
  // unclaimed threshold. This sets the priority factor the engine reads.
  const boostRes = await db.execute(sql`
    UPDATE bounties b
    JOIN bounty_roles r ON r.bountyId = b.id AND r.role = 'doer' AND r.payStatus = 'unfilled'
    SET b.priorityBoost = 1
    WHERE b.priorityBoost = 0
      AND b.workStatus IN ('proposed', 'accepted', 'open')
      AND b.createdAt < (NOW() - INTERVAL ${unclaimedDays} DAY)
  `);
  const boostedBounties = Number((boostRes as any)?.[0]?.affectedRows ?? 0);

  // Pull one row per doer role in the window, with its bounty's circle + tier.
  const raw = await db.execute(sql`
    SELECT
      COALESCE(NULLIF(TRIM(ro.circle), ''), 'general') AS circle,
      b.tier AS scopeTier,
      b.workStatus AS workStatus,
      r.payStatus AS payStatus,
      r.amount AS amount,
      DATEDIFF(NOW(), b.createdAt) AS ageDays,
      CASE WHEN r.userId IS NOT NULL THEN DATEDIFF(r.updatedAt, b.createdAt) ELSE NULL END AS claimLagDays
    FROM bounties b
    JOIN bounty_roles r ON r.bountyId = b.id AND r.role = 'doer'
    LEFT JOIN roles ro ON ro.slug = b.roleSlug
    WHERE b.tier IS NOT NULL
      AND b.createdAt >= (NOW() - INTERVAL ${windowDays} DAY)
  `);
  const rows: DoerRow[] = ((raw as any)?.[0] ?? []).map((r: any) => ({
    circle: String(r.circle ?? "general"),
    scopeTier: r.scopeTier as ScopeTier,
    workStatus: String(r.workStatus ?? ""),
    payStatus: String(r.payStatus ?? ""),
    amount: Number(r.amount ?? 0),
    ageDays: Number(r.ageDays ?? 0),
    claimLagDays: r.claimLagDays == null ? null : Number(r.claimLagDays),
  }));

  // Group by circle|scopeTier.
  const groups = new Map<string, DoerRow[]>();
  for (const row of rows) {
    if (!SCOPE_TIERS.includes(row.scopeTier)) continue;
    const key = `${row.circle}|${row.scopeTier}`;
    let bucket = groups.get(key);
    if (!bucket) { bucket = []; groups.set(key, bucket); }
    bucket.push(row);
  }

  const PAID = new Set(["paid", "payable", "held"]);
  let groupsUpdated = 0;

  for (const [key, g] of groups) {
    const [circle, scopeTier] = key.split("|") as [string, ScopeTier];

    // Precedent: median amount of bounties that actually paid out.
    const paidAmounts = g.filter((r) => r.workStatus === "completed" || PAID.has(r.payStatus)).map((r) => r.amount).filter((n) => n > 0);
    const precedentMedian = median(paidAmounts);

    // Unclaimed signal: still-unfilled past the threshold, or expired unclaimed.
    const offerable = g.filter((r) => ["proposed", "accepted", "open", "expired"].includes(r.workStatus));
    const unclaimedCount = offerable.filter(
      (r) => (r.payStatus === "unfilled" && r.ageDays >= unclaimedDays) || (r.workStatus === "expired" && r.payStatus === "unfilled"),
    ).length;
    const unclaimedRate = offerable.length ? unclaimedCount / offerable.length : 0;

    // Fast-claim signal: of the ones that got claimed, how many landed quickly.
    const claimed = g.filter((r) => r.claimLagDays != null);
    const fastClaims = claimed.filter((r) => (r.claimLagDays as number) <= FAST_CLAIM_DAYS).length;
    const fastClaimSignal = claimed.length ? fastClaims / claimed.length : 0;

    const signals: DemandSignals = { sampleSize: g.length, unclaimedRate, fastClaimSignal };

    const [prevRow] = await db
      .select({ factor: bountyDemandFactors.factor })
      .from(bountyDemandFactors)
      .where(and(eq(bountyDemandFactors.circle, circle), eq(bountyDemandFactors.scopeTier, scopeTier)))
      .limit(1);
    const prev = prevRow ? Number(prevRow.factor) : 1;

    const factor = computeDemandFactor(prev, signals, learning);

    await db
      .insert(bountyDemandFactors)
      .values({ circle, scopeTier, factor, precedentMedian: precedentMedian ?? null, sampleSize: g.length })
      .onDuplicateKeyUpdate({ set: { factor, precedentMedian: precedentMedian ?? null, sampleSize: g.length } });
    groupsUpdated += 1;
  }

  return { groupsUpdated, boostedBounties };
}

export async function runCoordinationFlywheel(): Promise<{
  staleClaims: StaleClaimsReport;
  rolesReconcile: RolesReconcileReport;
  demandPrecedent: DemandPrecedentReport;
}> {
  const staleClaims = await runStaleClaimsAgent();
  const rolesReconcile = await runRolesReconciliationAgent();
  const demandPrecedent = await runDemandPrecedentAgent();
  return { staleClaims, rolesReconcile, demandPrecedent };
}
