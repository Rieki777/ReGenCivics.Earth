/**
 * The $ReGen builders' pool: the cycle statement job (ADR-50, ADR-51).
 *
 * Once a lunar cycle closes, this asks every roster village how many of its
 * members opened each module during that cycle, splits the pool in proportion
 * to that reach, resolves each third-party builder's Base address from that
 * builder's OWN ReGen Civics profile, sends the platform's own share back into
 * the ReGen Civics gratitude pool, and writes one statement.
 *
 * ── WHAT ADR-51 CHANGED ─────────────────────────────────────────────────────
 *
 * This job used to read `/api/platform/info`, which carries module ids and a
 * lifecycle word, and split the pool by HOW MANY VILLAGES had each module
 * switched on. That measured installation, which Module Library Contract clause
 * 14 does not promise and the village platform's own meter explicitly rejects:
 * "shelfware earns exactly as much as a module the village lives inside". It
 * also dropped every module with no hub builder record before computing the
 * denominator, so the platform's own modules never entered the split at all,
 * and their share was quietly handed to third-party builders.
 *
 * It now reads `/api/platform/module-usage`, which every village has served all
 * along and which the hub had never once called.
 *
 * IT STILL MOVES NO TOKEN ON CHAIN. The statement is a document, and a payable
 * line becomes a proposal in the treasury's Hypha space through the Hypha
 * Bridge, which a human and then that space's members carry. There is no key
 * here, no transaction, and no transfer. `server/blockchain.ts` opens with
 * "Read-only Base blockchain queries, no wallet, no signing" and this job does
 * not weaken it.
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
  formatVillageCycleId,
  mergeVillageUsage,
  provenanceCoverage,
  readVillageUsage,
  type CountedVillage,
  type VillageUsageReport,
} from "@shared/villageUsage";
import {
  POOL_DUST_FLOOR,
  computeStatement,
  isAccruingState,
  statementSnapshotInput,
  type PoolIdentity,
  type PoolUsage,
} from "@shared/modulePool";
import { recycleIntoGratitudePool } from "../lib/gratitude-cycles";

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
  /** The cycle the village answered about. Null where it never answered. */
  cycleId: string | null;
  sealed: boolean;
  activeMembers: number;
  /** Module ids seen in the answer, for the snapshot. The weights live in `report`. */
  modules: string[];
  /**
   * Why an answer was not used, in words. Empty on a clean answer. Carried into
   * the statement so an operator reading "3 villages could not be counted" can
   * find out which and why without reading a log.
   */
  refusedBecause: string | null;
  /** How many of this village's modules said who built them. */
  provenance: { stated: number; unstated: number };
  /** The parsed report, or null. Not persisted: the snapshot carries the digest. */
  report: VillageUsageReport | null;
}

/** The roster: villages a human has agreed are real and live. */
export function poolRoster(games: readonly NetworkGame[] = NETWORK_GAMES): NetworkGame[] {
  return games.filter((g) => g.listed && g.status === "live");
}

/**
 * One village's usage report for one closed cycle.
 *
 * Reads `/api/platform/module-usage?cycle=lunar-NNNNNN`. Every village has
 * served this endpoint since the meter shipped; the hub had never called it.
 * It carries counts of people and never a person: the village's own meter
 * deletes member identity when it seals a cycle, and what survives is
 * `(module, cycle, members_reached, active_members)`.
 *
 * Returns the refusal sentence rather than null on a bad answer, because
 * "unreachable" and "answered about the wrong cycle" have different fixes and
 * collapsing them into one silence is how an outage and a bug look identical.
 */
export async function fetchVillageUsage(
  game: NetworkGame,
  cycleNumber: number,
): Promise<{ ok: true; report: VillageUsageReport } | { ok: false; reason: string }> {
  if (!game.url.startsWith("https://")) return { ok: false, reason: "the registry entry is not an https url" };
  const cycleId = formatVillageCycleId(cycleNumber);
  const url = `${game.url.replace(/\/$/, "")}/api/platform/module-usage?cycle=${encodeURIComponent(cycleId)}`;

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
        headers: { accept: "application/json", "user-agent": "ReGenCivicsBuildersPool/2.0" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return { ok: false, reason: `the village answered ${res.status}` };
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return { ok: false, reason: "the answer is larger than this hub will read" };
    }
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) return { ok: false, reason: "the answer is larger than this hub will read" };

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, reason: "the answer is not JSON" };
    }
    return readVillageUsage(body, cycleNumber);
  } catch (err) {
    return { ok: false, reason: `unreachable: ${(err as Error)?.message ?? "unknown"}` };
  }
}

/**
 * Ask every roster village what its members opened, and decide what a silent
 * one contributes.
 *
 * THE CARRY RULE, unchanged from the version that counted installations. A
 * village that does not answer is not a village whose members stopped opening
 * things, and counting the two the same would cut a builder's share for
 * somebody else's outage. So a silent village contributes its last stored
 * report ONCE, flagged `carried`. A village whose stored report has already
 * been carried contributes nothing on the next failure and keeps contributing
 * nothing until it answers again, which is what `carriedForCycle` records.
 * Without that, one permanently dead village would prop up a module's share
 * forever.
 *
 * WHAT IS STORED CHANGED, and it had to. The snapshot now holds the whole
 * report rather than a list of module ids, because a carried village has to
 * contribute the reach it last reported and a module id carries no reach.
 * A carried report keeps its ORIGINAL cycle id, so the statement's snapshot
 * shows plainly that one village's numbers came from an earlier lunation.
 */
export async function readRoster(cycleNumber: number, db: any): Promise<VillageAnswer[]> {
  const roster = poolRoster();
  const answers: VillageAnswer[] = [];

  for (const game of roster) {
    const live = await fetchVillageUsage(game, cycleNumber);

    if (live.ok) {
      await db.execute(sql`
        INSERT INTO modulePoolVillageSnapshots (villageId, instanceId, modules, usageReport, fetchedAt, carriedForCycle)
        VALUES (
          ${game.id}, ${live.report.instanceId},
          ${JSON.stringify(live.report.modules.map((m) => m.moduleId))},
          ${JSON.stringify(live.report)}, NOW(), NULL
        )
        ON DUPLICATE KEY UPDATE
          instanceId = VALUES(instanceId),
          modules = VALUES(modules),
          usageReport = VALUES(usageReport),
          fetchedAt = NOW(),
          carriedForCycle = NULL
      `);
      answers.push(answerFrom(game.id, "ok", live.report, null));
      continue;
    }

    const rows: any = await db.execute(sql`
      SELECT instanceId, usageReport, carriedForCycle
      FROM modulePoolVillageSnapshots WHERE villageId = ${game.id} LIMIT 1
    `);
    const stored = rows?.[0]?.[0] ?? rows?.rows?.[0] ?? null;
    const storedReport = parseStoredReport(stored?.usageReport);

    if (!stored || stored.carriedForCycle !== null || !storedReport) {
      // No snapshot at all, one already spent on an earlier cycle, or one
      // written before this hub stored whole reports. None of those is a
      // village that reported zero, and none of them is counted as one.
      answers.push({
        id: game.id,
        instanceId: stored?.instanceId ?? null,
        state: "absent",
        cycleId: null,
        sealed: false,
        activeMembers: 0,
        modules: [],
        refusedBecause: live.reason,
        provenance: { stated: 0, unstated: 0 },
        report: null,
      });
      continue;
    }

    await db.execute(sql`
      UPDATE modulePoolVillageSnapshots SET carriedForCycle = ${cycleNumber} WHERE villageId = ${game.id}
    `);
    answers.push(answerFrom(game.id, "carried", storedReport, live.reason));
  }

  return answers;
}

function answerFrom(
  id: string,
  state: VillageState,
  report: VillageUsageReport,
  refusedBecause: string | null,
): VillageAnswer {
  return {
    id,
    instanceId: report.instanceId,
    state,
    cycleId: report.cycleId,
    sealed: report.sealed,
    activeMembers: report.activeMembers,
    modules: report.modules.map((m) => m.moduleId).sort(),
    refusedBecause,
    provenance: provenanceCoverage(report),
    report,
  };
}

function parseStoredReport(value: unknown): VillageUsageReport | null {
  if (!value) return null;
  const parsed = typeof value === "string" ? safeJson(value) : value;
  if (!parsed || typeof parsed !== "object") return null;
  const r = parsed as VillageUsageReport;
  return Array.isArray(r.modules) && typeof r.cycleId === "string" ? r : null;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * What each module earned its share on, and who the hub is willing to say
 * built it.
 *
 * Thin on purpose: the decisions live in `mergeVillageUsage`, which is pure and
 * has the argument for each one written next to it.
 */
export function countUsage(
  answers: readonly VillageAnswer[],
  attestations = moduleBuildersById(),
): PoolUsage[] {
  const villages: CountedVillage[] = answers.map((a) => ({ id: a.id, state: a.state, report: a.report }));
  return mergeVillageUsage(villages, attestations);
}

/**
 * Resolve each third-party builder's handle to the Base address on their own
 * profile.
 *
 * `COALESCE(walletAddress, baseAccountName)` is the fallback order every
 * existing consumer uses. `users.baseWalletAddress` is deliberately not read:
 * it has had no writer since Privy was removed. The address is NOT trusted for
 * shape here; `computeStatement` re-checks it, because the profile write path
 * has never validated one.
 *
 * A platform-built module is skipped: nobody is looked up, because its share is
 * never sent to a wallet. An unattested module is skipped for a different
 * reason, and the two are kept apart deliberately: looking up a handle a
 * village asserted would put a real person's address next to a line the hub has
 * refused to pay, which reads to an operator like an invitation to pay it.
 */
export async function resolveIdentities(
  usage: readonly PoolUsage[],
  db: any,
): Promise<Map<string, PoolIdentity>> {
  const out = new Map<string, PoolIdentity>();
  for (const u of usage) {
    if (u.platformBuilt || !u.attested || !u.builtByAccount) continue;
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
 * What the previous cycle left owing to a builder, carried into this one.
 *
 * WHAT THIS IS AND IS NOT. It is the sum of the previous statement's lines owed
 * to a builder nobody could pay, added to this cycle's pool and RE-SPLIT by
 * this cycle's reach. It is not an escrow held for the builder who earned it. A
 * builder who links an address keeps earning from the cycles after they do, and
 * the amount their silence contributed goes back to the pool the modules are
 * sharing.
 *
 * **NAMING WHAT THAT COSTS SOMEBODY, because it is not free.** A builder who
 * links an account three cycles late does not receive what accrued in their
 * name; it was re-split among every module in the cycles they were absent for.
 * The statement records `accruedSinceCycle` on every such line so the history
 * exists, `/builders-pool` prints the waiting amount so nobody has to be told
 * about it, and `modulePool.myAccruals` shows a signed-in builder every cycle
 * their modules earned in, what the share was, and why it was not sent. There
 * is NO claim path: whether the treasury honours a late claim for a cycle whose
 * statement was already executed is a money question and is Rye's, and building
 * a rule for it here would put a guess in a table money is reconciled against.
 *
 * The platform's recycled share is NOT carried here. It leaves for the
 * gratitude pool the moment the statement is computed, and carrying it as well
 * would spend it twice.
 */
export async function carryInFor(cycleNumber: number, db: any): Promise<number> {
  const rows: any = await db.execute(sql`
    SELECT COALESCE(SUM(s.amount), 0) AS total
    FROM modulePoolShares s
    JOIN modulePoolStatements st ON st.id = s.statementId
    WHERE s.state IN ('no-account','no-address','unusable-address','unattested')
      AND st.cycleNumber = ${cycleNumber - 1}
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
        villages: answers.map((a) => ({
          id: a.id,
          instanceId: a.instanceId,
          state: a.state,
          cycleId: a.cycleId,
          sealed: a.sealed,
          activeMembers: a.activeMembers,
          modules: a.modules,
        })),
        usage,
      });
      const snapshotHash = crypto.createHash("sha256").update(snapshot).digest("hex");

      if (opts.dryRun) {
        return {
          job, ok: true, count: statement.lines.length,
          detail: {
            cycleNumber, dryRun: true, snapshotHash, totals: statement.totals,
            lines: statement.lines, roster: answers.map(publicAnswer),
          },
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
            (statementId, moduleId, builtBy, builtByAccount, platformBuilt, attested, userId, address,
             villages, membersReached, reach, rawShare, amount, state, accruedSinceCycle)
          VALUES (
            ${statementId}, ${line.moduleId}, ${line.builtBy}, ${line.builtByAccount},
            ${line.platformBuilt ? 1 : 0}, ${line.attested ? 1 : 0},
            ${identity?.userId ?? null}, ${line.address}, ${line.villages}, ${line.membersReached},
            ${line.reach.toFixed(6)}, ${line.rawShare.toFixed(6)}, ${line.amount}, ${line.state},
            ${isAccruingState(line.state) ? cycleNumber : null}
          )
        `);
      }

      await db.execute(sql`
        UPDATE modulePoolStatements SET
          status = 'computed', poolAmount = ${statement.totals.pool}, carryIn = ${statement.totals.carryIn},
          paid = ${statement.totals.paid}, accrued = ${statement.totals.accrued},
          recycled = ${statement.totals.recycled},
          unallocated = ${statement.totals.unallocated}, snapshotHash = ${snapshotHash},
          roster = ${JSON.stringify(answers.map(publicAnswer))}, computedAt = NOW()
        WHERE cycleNumber = ${cycleNumber}
      `);

      // R64: what the platform's own modules earned goes to the ReGen Civics
      // gratitude pool, to be given out. Done AFTER the statement is written,
      // and idempotent on the cycle number, so a retry of a half-finished run
      // cannot hand the community the same amount twice.
      const recycle = await recycleIntoGratitudePool(db, {
        cycleNumber,
        amount: statement.totals.recycled,
      });

      log.info(
        `cycle ${cycleNumber}: ${statement.lines.length} line(s), ` +
        `${statement.totals.paid} $ReGen payable, ${statement.totals.recycled} recycled (${recycle.outcome})`,
      );
      return {
        job, ok: true, count: statement.lines.length,
        detail: { cycleNumber, snapshotHash, totals: statement.totals, recycle },
      };
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

/** The part of an answer that is stored and shown. The parsed report stays in memory. */
function publicAnswer(a: VillageAnswer) {
  const { report: _report, ...rest } = a;
  return rest;
}

/**
 * The cron entry point: settle the cycle that has closed, if it has not been
 * settled already. Does nothing on the ~28 days a month where that is true.
 */
export async function runModulePoolStatement(now: Date = new Date()): Promise<JobReport> {
  return settleCycle(lastClosedCycle(now).cycleNumber);
}

export { MODULE_BUILDERS };
