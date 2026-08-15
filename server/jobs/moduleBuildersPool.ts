/**
 * The $ReGen builders' pool: the cycle statement job (ADR-50).
 *
 * Once a lunar cycle closes, this reads how many roster villages are running
 * each pool-eligible module, splits the pool in proportion, resolves each
 * builder's Base address from that builder's OWN ReGen Civics profile, and
 * writes one statement.
 *
 * IT MOVES NOTHING. The statement is a document a human reads and executes
 * through Hypha from the treasury. `server/blockchain.ts` opens with
 * "Read-only Base blockchain queries, no wallet, no signing" and this job does
 * not weaken it: there is no key here, no transaction, no transfer, and no
 * button anywhere in this codebase that makes one.
 *
 * Runs from POST /api/cron/module-pool-statement, daily. Daily rather than
 * monthly because a lunation is 29.53 days and no cron expression lands on a
 * new moon; on the ~28 days with nothing to settle the job does nothing and
 * says so.
 */
import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import { assertSafeExternalUrl } from "../_core/ssrf";
import { getGameVariableOr } from "../game";
import { NETWORK_GAMES, type NetworkGame } from "@shared/networkRegistry";
import { MODULE_BUILDERS, moduleBuildersById } from "@shared/moduleBuilders";
import { cycleBoundsByNumber, lastClosedCycle } from "@shared/lunar";
import {
  POOL_ACCRUAL_CYCLES,
  POOL_DUST_FLOOR,
  computeStatement,
  statementSnapshotInput,
  type PoolIdentity,
  type PoolUsage,
} from "@shared/modulePool";

const log = logger("module-pool");

/** Copied from server/lib/network-feed.ts rather than reinvented. */
const FETCH_TIMEOUT_MS = 4000;
const MAX_BODY_BYTES = 512 * 1024;

/** The same report shape every other job in server/jobs/ returns. */
export interface JobReport {
  job: string;
  ok: boolean;
  count?: number;
  error?: string;
  detail?: Record<string, unknown>;
}

/** How a roster village answered on statement night. */
export type VillageState = "ok" | "carried" | "absent";

export interface VillageAnswer {
  id: string;
  instanceId: string | null;
  state: VillageState;
  modules: string[];
}

/** The roster: villages a human has agreed are real and live. */
export function poolRoster(games: readonly NetworkGame[] = NETWORK_GAMES): NetworkGame[] {
  return games.filter((g) => g.listed && g.status === "live");
}

/**
 * One village's module manifest.
 *
 * Reads `/api/platform/info`, which every village already serves publicly and
 * which carries `{ id, lifecycle }` for modules at rank members or above. The
 * pool asks for nothing that is not already published and learns nothing about
 * anybody: module ids and a lifecycle word, no people, no counts of people.
 *
 * Returns null for anything less than a clean answer. A null is not "no
 * modules", and the caller must not treat it as one.
 */
export async function fetchVillageModules(
  game: NetworkGame,
): Promise<{ instanceId: string | null; modules: string[] } | null> {
  if (!game.url.startsWith("https://")) return null;
  const url = `${game.url.replace(/\/$/, "")}/api/platform/info`;

  try {
    // The URL comes from our own registry, so this is belt to that braces: it
    // still catches a registry entry whose host started resolving somewhere it
    // should not.
    await assertSafeExternalUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: "error",
        headers: { accept: "application/json", "user-agent": "ReGenCivicsBuildersPool/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) return null;

    const body = JSON.parse(text) as Record<string, unknown>;
    const raw = Array.isArray(body.modules) ? body.modules : null;
    if (!raw) return null;

    const modules = raw
      .map((m) => (m && typeof m === "object" ? String((m as any).id ?? "") : ""))
      .filter((id) => id.length > 0 && id.length <= 80);

    return {
      instanceId: typeof body.instanceId === "string" ? body.instanceId.slice(0, 80) : null,
      modules: Array.from(new Set(modules)).sort(),
    };
  } catch (err) {
    log.info(`platform/info unavailable for ${game.id}: ${(err as Error)?.message ?? "unknown"}`);
    return null;
  }
}

/**
 * Ask every roster village what it is running, and decide what a silent one
 * contributes.
 *
 * THE CARRY RULE. A village that does not answer is not a village that turned
 * its modules off, and counting the two the same would cut a builder's share
 * for somebody else's outage. So a silent village contributes its last known
 * snapshot ONCE, flagged `carried`. A village that already had a snapshot
 * carried contributes nothing on the next failure and keeps contributing
 * nothing until it answers again, which is what `carriedForCycle` records.
 * Without that, one permanently dead village would prop up a module's count
 * forever.
 */
export async function readRoster(cycleNumber: number, db: any): Promise<VillageAnswer[]> {
  const roster = poolRoster();
  const answers: VillageAnswer[] = [];

  for (const game of roster) {
    const live = await fetchVillageModules(game);

    if (live) {
      await db.execute(sql`
        INSERT INTO modulePoolVillageSnapshots (villageId, instanceId, modules, fetchedAt, carriedForCycle)
        VALUES (${game.id}, ${live.instanceId}, ${JSON.stringify(live.modules)}, NOW(), NULL)
        ON DUPLICATE KEY UPDATE
          instanceId = VALUES(instanceId),
          modules = VALUES(modules),
          fetchedAt = NOW(),
          carriedForCycle = NULL
      `);
      answers.push({ id: game.id, instanceId: live.instanceId, state: "ok", modules: live.modules });
      continue;
    }

    const rows: any = await db.execute(sql`
      SELECT instanceId, modules, carriedForCycle
      FROM modulePoolVillageSnapshots WHERE villageId = ${game.id} LIMIT 1
    `);
    const stored = rows?.[0]?.[0] ?? rows?.rows?.[0] ?? null;

    if (!stored || stored.carriedForCycle !== null) {
      // No snapshot at all, or one already spent on an earlier cycle.
      answers.push({ id: game.id, instanceId: stored?.instanceId ?? null, state: "absent", modules: [] });
      continue;
    }

    const modules = parseModules(stored.modules);
    await db.execute(sql`
      UPDATE modulePoolVillageSnapshots SET carriedForCycle = ${cycleNumber} WHERE villageId = ${game.id}
    `);
    answers.push({ id: game.id, instanceId: stored.instanceId ?? null, state: "carried", modules });
  }

  return answers;
}

function parseModules(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Villages running each payable module.
 *
 * A module id a village serves that has no builder record pays nobody, which is
 * the second human gate: a forged village is not on the roster, and a forged
 * module id is not in `MODULE_BUILDERS`.
 */
export function countUsage(answers: readonly VillageAnswer[]): PoolUsage[] {
  const builders = moduleBuildersById();
  const counts = new Map<string, number>();
  for (const answer of answers) {
    for (const id of new Set(answer.modules)) {
      if (!builders.has(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...builders.values()].map((b) => ({
    moduleId: b.moduleId,
    villages: counts.get(b.moduleId) ?? 0,
    builtBy: b.builtBy,
    builtByAccount: b.account,
  }));
}

/**
 * Resolve each builder's handle to the Base address on their own profile.
 *
 * `COALESCE(walletAddress, baseAccountName)` is the fallback order every
 * existing consumer uses. `users.baseWalletAddress` is deliberately not read:
 * it has had no writer since Privy was removed. The address is NOT trusted for
 * shape here; `computeStatement` re-checks it, because the profile write path
 * has never validated one.
 */
export async function resolveIdentities(
  usage: readonly PoolUsage[],
  db: any,
): Promise<Map<string, PoolIdentity>> {
  const out = new Map<string, PoolIdentity>();
  for (const u of usage) {
    if (!u.builtByAccount) continue;
    const rows: any = await db.execute(sql`
      SELECT u.id AS userId, COALESCE(p.walletAddress, p.baseAccountName) AS address
      FROM users u
      LEFT JOIN player_profiles p ON p.userId = u.id
      WHERE u.handle = ${u.builtByAccount}
      LIMIT 1
    `);
    const row = rows?.[0]?.[0] ?? rows?.rows?.[0] ?? null;
    out.set(u.moduleId, {
      userId: row?.userId ?? null,
      address: row?.address ?? null,
    });
  }
  return out;
}

/**
 * What earlier cycles left owing.
 *
 * Only shares that are still inside the accrual window carry. Anything that has
 * waited longer than POOL_ACCRUAL_CYCLES has lapsed to the treasury and is not
 * counted again; it stays in its own statement as history.
 */
export async function carryInFor(cycleNumber: number, db: any): Promise<number> {
  const oldest = cycleNumber - POOL_ACCRUAL_CYCLES;
  const rows: any = await db.execute(sql`
    SELECT COALESCE(SUM(s.amount), 0) AS total
    FROM modulePoolShares s
    JOIN modulePoolStatements st ON st.id = s.statementId
    WHERE s.state IN ('no-account','no-address','unusable-address')
      AND st.cycleNumber = ${cycleNumber - 1}
      AND COALESCE(s.accruedSinceCycle, st.cycleNumber) > ${oldest}
  `);
  const row = rows?.[0]?.[0] ?? rows?.rows?.[0] ?? null;
  return Number(row?.total ?? 0);
}

/**
 * Settle one closed cycle, once.
 *
 * Concurrency copies `closeDueCycles` in server/lib/gratitude-cycles.ts,
 * including the part learned the hard way there: the row latches to
 * `computing` with a conditional UPDATE so a second runner finds nothing, and
 * a throw UN-LATCHES it back to `open`. Without the un-latch a failed run
 * leaves the cycle unreachable forever while the cron keeps reporting success,
 * which is exactly how gratitude cycles silently stopped distributing for
 * months.
 */
export async function settleCycle(cycleNumber: number, opts: { dryRun?: boolean } = {}): Promise<JobReport> {
  const job = "moduleBuildersPool";
  const db = await getDb();
  if (!db) return { job, ok: false, error: "no db" };

  const bounds = cycleBoundsByNumber(cycleNumber);
  const pool = Math.max(0, Math.floor(await getGameVariableOr("pool.regen_per_cycle", 0)));

  try {
    if (!opts.dryRun) {
      await db.execute(sql`
        INSERT IGNORE INTO modulePoolStatements (cycleNumber, cycleStartsAt, cycleEndsAt, status)
        VALUES (${cycleNumber}, ${bounds.startsAt}, ${bounds.endsAt}, 'open')
      `);
      const latched: any = await db.execute(sql`
        UPDATE modulePoolStatements SET status = 'computing'
        WHERE cycleNumber = ${cycleNumber} AND status = 'open'
      `);
      const affected = latched?.[0]?.affectedRows ?? latched?.affectedRows ?? 0;
      if (!affected) {
        return { job, ok: true, count: 0, detail: { cycleNumber, skipped: "already settled or being settled" } };
      }
    }

    try {
      const answers = await readRoster(cycleNumber, db);
      const usage = countUsage(answers);
      const identities = await resolveIdentities(usage, db);
      const carryIn = opts.dryRun ? 0 : await carryInFor(cycleNumber, db);

      const statement = computeStatement({ pool, carryIn, usage, identities, dustFloor: POOL_DUST_FLOOR });
      const snapshot = statementSnapshotInput({
        cycleNumber,
        pool,
        carryIn,
        dustFloor: POOL_DUST_FLOOR,
        villages: answers,
        usage,
      });
      const snapshotHash = crypto.createHash("sha256").update(snapshot).digest("hex");

      if (opts.dryRun) {
        return {
          job, ok: true, count: statement.lines.length,
          detail: { cycleNumber, dryRun: true, snapshotHash, totals: statement.totals, lines: statement.lines, roster: answers },
        };
      }

      const idRows: any = await db.execute(sql`
        SELECT id FROM modulePoolStatements WHERE cycleNumber = ${cycleNumber} LIMIT 1
      `);
      const statementId = (idRows?.[0]?.[0] ?? idRows?.rows?.[0])?.id;

      for (const line of statement.lines) {
        const identity = identities.get(line.moduleId);
        await db.execute(sql`
          INSERT IGNORE INTO modulePoolShares
            (statementId, moduleId, builtBy, builtByAccount, userId, address, villages, rawShare, amount, state, accruedSinceCycle)
          VALUES (
            ${statementId}, ${line.moduleId}, ${line.builtBy}, ${line.builtByAccount},
            ${identity?.userId ?? null}, ${line.address}, ${line.villages},
            ${line.rawShare.toFixed(6)}, ${line.amount}, ${line.state},
            ${line.state === "payable" || line.state === "below-floor" ? null : cycleNumber}
          )
        `);
      }

      await db.execute(sql`
        UPDATE modulePoolStatements SET
          status = 'computed', poolAmount = ${statement.totals.pool}, carryIn = ${statement.totals.carryIn},
          paid = ${statement.totals.paid}, accrued = ${statement.totals.accrued},
          unallocated = ${statement.totals.unallocated}, snapshotHash = ${snapshotHash},
          roster = ${JSON.stringify(answers)}, computedAt = NOW()
        WHERE cycleNumber = ${cycleNumber}
      `);

      log.info(`cycle ${cycleNumber}: ${statement.lines.length} line(s), ${statement.totals.paid} $ReGen payable`);
      return { job, ok: true, count: statement.lines.length, detail: { cycleNumber, snapshotHash, totals: statement.totals } };
    } catch (err) {
      // Un-latch, then rethrow. A cycle stuck in `computing` is a cycle the
      // cron will never pick up again while reporting green forever.
      await db.execute(sql`
        UPDATE modulePoolStatements SET status = 'open' WHERE cycleNumber = ${cycleNumber} AND status = 'computing'
      `);
      throw err;
    }
  } catch (err: any) {
    log.error(`cycle ${cycleNumber} failed`, err);
    return { job, ok: false, error: err?.message ?? "unknown" };
  }
}

/**
 * The cron entry point: settle the cycle that has closed, if it has not been
 * settled already. Does nothing on the ~28 days a month where that is true.
 */
export async function runModulePoolStatement(now: Date = new Date()): Promise<JobReport> {
  return settleCycle(lastClosedCycle(now).cycleNumber);
}

export { MODULE_BUILDERS };
