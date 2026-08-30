/**
 * brain router: the second-brain command center
 * (TASK_SESSIONS_2026-08-29/BRIEF_SECOND_BRAIN_FABLE_RESPONSE.md §2-§4).
 *
 * Every procedure is ownerProcedure: this is Rye's private work queue, not
 * admin data. Work-item STATE is canonical here; the vault stays canonical for
 * essays, concepts, positions and voice, and later receives a regenerated
 * mirror of these rows (never the reverse).
 *
 * `status` is the heartbeat (response doc §11): the pipeline went quiet for
 * fifteen days in August and nobody knew. Making silence visible is the first
 * tile of the command center, and it is deliberately fail-soft: a missing
 * table reports "never" instead of crashing the page.
 */
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { ownerProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { harvestRuns, quickNotes } from "../../drizzle/schema";

function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist|no such table/i.test(msg);
}

async function requireDb() {
  const drizzle = await getDb();
  if (!drizzle) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }
  return drizzle;
}

/**
 * Expected cadence per signal, in minutes. A signal goes amber past 2x its
 * cadence, which is the point where "it is a bit late" becomes "it stopped".
 */
export const HEARTBEAT_CADENCE_MIN = {
  generation: 60,
  digest: 7 * 24 * 60,
  bridge: 60,
  capture: 7 * 24 * 60, // Rye capturing nothing for a week is worth a glance, not an alarm
} as const;

export type HeartbeatSignal = keyof typeof HEARTBEAT_CADENCE_MIN;
export type HeartbeatState = "ok" | "late" | "never";

export function heartbeatState(
  lastAt: Date | null,
  cadenceMin: number,
  now = new Date(),
): HeartbeatState {
  if (!lastAt) return "never";
  const ageMin = (now.getTime() - lastAt.getTime()) / 60_000;
  return ageMin > cadenceMin * 2 ? "late" : "ok";
}

/** MySQL hands MAX(timestamp) back as a Date, a string, or null depending on driver path. */
function asDate(v: unknown): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export const brainRouter = router({
  /**
   * Four signals with honest ages. Read-only, fail-soft per signal: one missing
   * table must not blank the whole strip.
   */
  status: ownerProcedure.query(async () => {
    const db = await requireDb();

    let runs: Array<{ kind: string; last: unknown }> = [];
    try {
      runs = await db
        .select({ kind: harvestRuns.kind, last: sql<unknown>`MAX(${harvestRuns.ranAt})` })
        .from(harvestRuns)
        .groupBy(harvestRuns.kind);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
    const lastOf = (k: string) => asDate(runs.find((r) => r.kind === k)?.last);

    // Capture: quick_notes is transit and is emptied after the bridge pulls, so
    // "last capture" is the most recent row that is still in flight. Once
    // brain_items lands (Task 1.1) the Telegram path writes there instead, and
    // this takes the later of the two rather than reporting a false "never".
    let lastCapture: Date | null = null;
    try {
      const [row] = await db
        .select({ last: sql<unknown>`MAX(${quickNotes.createdAt})` })
        .from(quickNotes);
      lastCapture = asDate(row?.last);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
    try {
      const [row] = await db.execute(
        sql`SELECT MAX(captured_at) AS last FROM brain_items`,
      );
      const brainLast = asDate((row as unknown as Array<{ last: unknown }>)?.[0]?.last);
      if (brainLast && (!lastCapture || brainLast > lastCapture)) lastCapture = brainLast;
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }

    const signals: Record<HeartbeatSignal, Date | null> = {
      generation: lastOf("generation"),
      digest: lastOf("digest"),
      bridge: lastOf("bridge"),
      capture: lastCapture,
    };

    return {
      signals: Object.fromEntries(
        (Object.keys(signals) as HeartbeatSignal[]).map((k) => [
          k,
          { lastAt: signals[k], state: heartbeatState(signals[k], HEARTBEAT_CADENCE_MIN[k]) },
        ]),
      ) as Record<HeartbeatSignal, { lastAt: Date | null; state: HeartbeatState }>,
    };
  }),
});
