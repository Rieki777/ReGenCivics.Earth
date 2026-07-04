/**
 * Assembly lifecycle job (ASSEMBLY_PAGE_SPEC.md section 11).
 *
 * Runs inside the hourly governance cron (POST /api/cron/governance-jobs):
 *   - expireLastCall: a quiet last-call window flips the proposal to
 *     ready-to-launch (status threshold_reached) and notifies subscribers.
 *     The launch itself stays human: the owner clicks through the Hypha
 *     bridge (AI-AUTOMATION-RISKS Risk 7).
 *   - passQuietMinorLane: minor-lane proposals with no objection pass by
 *     lazy consent after the quiet window.
 *   - markResting: forming proposals with no new signals or replies fold
 *     into the resting strip. One click revives them.
 *
 * Deterministic-first (STEERING section 11): plain SQL on a schedule, no LLM.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";

interface JobReport {
  job: string;
  ok: boolean;
  count?: number;
  error?: string;
}

async function readVar(key: string, fallback: number): Promise<number> {
  const db = await getDb();
  if (!db) return fallback;
  try {
    const rows = await db.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${key} LIMIT 1`).then((r: any) => r[0] ?? []);
    if (rows && rows.length > 0) return Number(rows[0].value) || fallback;
  } catch { /* ignore */ }
  return fallback;
}

export async function expireLastCall(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "expireLastCall", ok: false, error: "no db" };
    const hours = await readVar("governance.last_call_hours", 48);
    const [due] = await db.execute(
      sql`SELECT id, title, aim FROM proposals
          WHERE status = 'signaling' AND lastCallStartedAt IS NOT NULL
            AND lastCallStartedAt < DATE_SUB(NOW(), INTERVAL ${hours} HOUR)
          LIMIT 25`
    );
    const rows = due as unknown as any[];
    for (const p of rows) {
      await db.execute(
        sql`UPDATE proposals SET status = 'threshold_reached', readyToLaunchAt = NOW(), lastCallStartedAt = NULL WHERE id = ${p.id}`
      );
    }
    if (rows.length > 0) {
      const { notifySubscribersOfReadyProposals } = await import("./assemblyNotify");
      void notifySubscribersOfReadyProposals(rows);
    }
    return { job: "expireLastCall", ok: true, count: rows.length };
  } catch (err: any) {
    return { job: "expireLastCall", ok: false, error: err.message };
  }
}

export async function passQuietMinorLane(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "passQuietMinorLane", ok: false, error: "no db" };
    const quietDays = await readVar("governance.minor_lane_quiet_days", 7);
    const [result] = await db.execute(
      sql`UPDATE proposals
          SET status = 'passed'
          WHERE status = 'signaling' AND lane = 'minor'
            AND createdAt < DATE_SUB(NOW(), INTERVAL ${quietDays} DAY)
            AND (objectionLog IS NULL OR JSON_LENGTH(objectionLog) = 0)
          LIMIT 25`
    );
    return { job: "passQuietMinorLane", ok: true, count: (result as any)?.affectedRows ?? 0 };
  } catch (err: any) {
    return { job: "passQuietMinorLane", ok: false, error: err.message };
  }
}

export async function markResting(): Promise<JobReport> {
  try {
    const db = await getDb();
    if (!db) return { job: "markResting", ok: false, error: "no db" };
    const restDays = await readVar("governance.resting_after_days", 30);
    const [result] = await db.execute(
      sql`UPDATE proposals p
          SET p.restingSince = NOW()
          WHERE p.status = 'signaling' AND p.restingSince IS NULL AND p.lastCallStartedAt IS NULL
            AND p.createdAt < DATE_SUB(NOW(), INTERVAL ${restDays} DAY)
            AND NOT EXISTS (
              SELECT 1 FROM proposal_signals s
              WHERE s.proposalId = p.id AND s.updatedAt > DATE_SUB(NOW(), INTERVAL ${restDays} DAY)
            )
            AND (p.forumThreadId IS NULL OR NOT EXISTS (
              SELECT 1 FROM forumReplies r
              WHERE r.postId = p.forumThreadId AND r.createdAt > DATE_SUB(NOW(), INTERVAL ${restDays} DAY)
            ))
          LIMIT 50`
    );
    return { job: "markResting", ok: true, count: (result as any)?.affectedRows ?? 0 };
  } catch (err: any) {
    return { job: "markResting", ok: false, error: err.message };
  }
}

/** Rung 3: move gated feature PRs through their launch window and merge.
 * Dark below autonomy tier 3, so this is a no-op until the community votes
 * the tier up (ASSEMBLY_PAGE_SPEC.md section 7.3). */
export async function advanceEvolutionLaunchWindows(): Promise<JobReport> {
  try {
    const { advanceLaunchWindows } = await import("../lib/evolution");
    const res = await advanceLaunchWindows();
    return { job: "advanceEvolutionLaunchWindows", ok: true, count: res.merged };
  } catch (err: any) {
    return { job: "advanceEvolutionLaunchWindows", ok: false, error: err.message };
  }
}

export async function runAssemblyLifecycleJobs(): Promise<JobReport[]> {
  return [await expireLastCall(), await passQuietMinorLane(), await markResting(), await advanceEvolutionLaunchWindows()];
}
