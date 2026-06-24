/**
 * coordinationFlywheel: Phase 5 of the Movement Coordination Engine.
 *
 * Two agents kept on a daily cron:
 *
 * 1. Stale-claims agent. Walks every callTasks row in status 'claimed'.
 *    Older than coordination.stale_claim_nudge_days (default 7) gets
 *    one in-app nudge; older than coordination.stale_claim_expire_days
 *    (default 14) reverts to 'open' so the work can move to someone
 *    else. The nudge is one-shot per claim: we set a marker in the
 *    body so we never spam the same claim across daily runs.
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
import { callTasks, notifications, roleHolders } from "../../drizzle/schema";
import { getGameVariable } from "../game";

const DEFAULT_NUDGE_DAYS = 7;
const DEFAULT_EXPIRE_DAYS = 14;
const NUDGE_MARKER = "[flywheel-nudge]";

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

  const claimed = await db
    .select({
      id: callTasks.id,
      title: callTasks.title,
      assigneeUserId: callTasks.assigneeUserId,
      claimedAt: callTasks.claimedAt,
    })
    .from(callTasks)
    .where(and(eq(callTasks.status, "claimed"), isNotNull(callTasks.claimedAt), lt(callTasks.claimedAt, nudgeCutoff)));

  let nudged = 0;
  let expired = 0;

  for (const t of claimed) {
    if (!t.claimedAt || !t.assigneeUserId) continue;
    if (t.claimedAt < expireCutoff) {
      // Past the expire window. Notify the original assignee that we're
      // releasing the task, then revert to open so anyone in the circle
      // can pick it back up.
      await db.insert(notifications).values({
        playerId: t.assigneeUserId,
        type: "mention",
        title: `Released: ${t.title.slice(0, 180)}`,
        body: `${NUDGE_MARKER} Your claim sat for over ${expireDays} days, so the task is back in the open pool for someone else. You can still re-claim it any time.`,
        link: `/profile?tab=tasks#call-task-${t.id}`,
      });
      await db
        .update(callTasks)
        .set({ status: "open", assigneeUserId: null, claimedAt: null })
        .where(eq(callTasks.id, t.id));
      expired += 1;
      continue;
    }

    // Nudge zone. Send a single nudge per claim by checking the
    // notifications table for our marker on this task. Spamming the
    // same person every cron tick is exactly the failure mode this
    // agent is trying to avoid.
    const linkPath = `/profile?tab=tasks#call-task-${t.id}`;
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.playerId, t.assigneeUserId),
        eq(notifications.link, linkPath),
        sql`${notifications.body} LIKE ${`%${NUDGE_MARKER}%`}`,
      ))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(notifications).values({
      playerId: t.assigneeUserId,
      type: "mention",
      title: `Still on this one? ${t.title.slice(0, 160)}`,
      body: `${NUDGE_MARKER} You claimed this task ${nudgeDays}+ days ago. Submit when you're ready, or leave it for someone else by ignoring (auto-releases at ${expireDays} days).`,
      link: linkPath,
    });
    nudged += 1;
  }

  return { nudged, expired, scanned: claimed.length };
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
  const parsed = parseGameRoles();
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

export async function runCoordinationFlywheel(): Promise<{
  staleClaims: StaleClaimsReport;
  rolesReconcile: RolesReconcileReport;
}> {
  const staleClaims = await runStaleClaimsAgent();
  const rolesReconcile = await runRolesReconciliationAgent();
  return { staleClaims, rolesReconcile };
}
