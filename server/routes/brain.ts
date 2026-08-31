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
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { ownerProcedure, rateLimited, router } from "../_core/trpc";
import { getDb } from "../db";
import { adminAutomations, harvestRuns, quickNotes } from "../../drizzle/schema";
import * as items from "../lib/brain-items";
import { BRAIN_KINDS, BRAIN_STATES, isMissingTableError, startOfWeek } from "../lib/brain-items";

// Re-exported because the week boundary is a rule about this router's numbers,
// and server/brain.test.ts pins it here. The implementation lives beside the
// query that uses it so the morning message cannot drift from the status tile.
export { startOfWeek };

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
  // The automations runner fires hourly and drives the morning message. It sat
  // dead from the day it was created until 2026-08-31 because the cron service's
  // CRON_SECRET was empty, so every call 401'd and nothing recorded a thing.
  // Nobody noticed for months. That is precisely what this strip is for.
  automations: 24 * 60,
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
  status: ownerProcedure.query(async ({ ctx }) => {
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

    // Sourced from the automations themselves rather than a runs table: if the
    // hourly runner is being rejected, every lastRunAt stops moving, which is
    // the symptom the strip should show.
    let lastAutomation: Date | null = null;
    try {
      const [row] = await db
        .select({ last: sql<unknown>`MAX(${adminAutomations.lastRunAt})` })
        .from(adminAutomations);
      lastAutomation = asDate(row?.last);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }

    const signals: Record<HeartbeatSignal, Date | null> = {
      generation: lastOf("generation"),
      digest: lastOf("digest"),
      bridge: lastOf("bridge"),
      capture: lastCapture,
      automations: lastAutomation,
    };

    // The month-one metric, which the plan named and then never computed
    // (addendum 2, item 8). The query lives in the item library so the morning
    // message reports the same two numbers this tile does, from one place.
    const { weekStart, closedThisWeek, promotedThisWeek } = await items.weekMetrics(ctx.user.id);

    return {
      weekStart,
      closedThisWeek,
      promotedThisWeek,
      signals: Object.fromEntries(
        (Object.keys(signals) as HeartbeatSignal[]).map((k) => [
          k,
          { lastAt: signals[k], state: heartbeatState(signals[k], HEARTBEAT_CADENCE_MIN[k]) },
        ]),
      ) as Record<HeartbeatSignal, { lastAt: Date | null; state: HeartbeatState }>,
    };
  }),

  /** The four sections are filters over this one list (response doc §3). */
  list: ownerProcedure
    .input(
      z
        .object({
          kind: z.enum(BRAIN_KINDS).optional(),
          kinds: z.array(z.enum(BRAIN_KINDS)).max(7).optional(),
          realm: z.enum(["regen", "personal"]).optional(),
          state: z.enum(BRAIN_STATES).optional(),
          states: z.array(z.enum(BRAIN_STATES)).max(7).optional(),
          repo: z.string().max(64).optional(),
          q: z.string().max(200).optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(({ ctx, input }) => items.listItems(ctx.user.id, input ?? {})),

  get: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ ctx, input }) => items.getItem(ctx.user.id, input.id)),

  today: ownerProcedure.query(({ ctx }) => items.summarizeToday(ctx.user.id)),

  create: ownerProcedure
    .use(rateLimited({ windowMs: 60_000, max: 60 }))
    .input(
      z.object({
        body: z.string().min(1).max(20_000),
        source: z.string().min(1).max(191),
        kind: z.enum(BRAIN_KINDS).optional(),
        attachments: z.array(z.string().max(512)).max(20).optional(),
        followsId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => items.createItem(ctx.user.id, input, "web")),

  update: ownerProcedure
    .input(
      z.object({
        id: z.number().int(),
        kind: z.enum(BRAIN_KINDS).optional(),
        // Without this the sheet's realm control is a lie: zod STRIPS an unknown
        // key rather than rejecting it, so the save returns 200 and moves nothing.
        realm: z.enum(["regen", "personal"]).optional(),
        title: z.string().max(300).optional(),
        ask: z.string().max(500).nullable().optional(),
        doneWhen: z.string().max(500).nullable().optional(),
        blockedOn: z.string().max(300).nullable().optional(),
        due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        effort: z.enum(["S", "M", "L"]).nullable().optional(),
        priority: z.enum(["now", "soon", "someday"]).optional(),
        repo: z.string().max(64).nullable().optional(),
        surface: z.string().max(200).nullable().optional(),
        followsId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => items.updateItem(ctx.user.id, input, "web")),

  setState: ownerProcedure
    .input(
      z.object({
        id: z.number().int(),
        state: z.enum(BRAIN_STATES),
        evidence: z.string().max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      items.setItemState(ctx.user.id, input.id, input.state, "web", input.evidence),
    ),

  /**
   * The gate. Owner only, blockers returned verbatim so Rye reads why rather
   * than guessing. No other procedure may write `ready`.
   */
  promote: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => items.promoteItem(ctx.user.id, input.id, "web")),

  /**
   * The "probably done" queue (ADDENDUM-1 item 2). Raw items flagged
   * `proposed.maybe_done`, oldest capture first, snoozed ones held back. The
   * flag is set at import time and never recomputed here; its rule and its
   * measured error rate are in scripts/import-brain-items.ts.
   */
  triageNext: ownerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }).optional())
    .query(({ ctx, input }) => items.triageQueue(ctx.user.id, input?.limit ?? 5)),

  /** How many questions are left, so a caller can say "3 more" without fetching them. */
  triagePending: ownerProcedure.query(({ ctx }) => items.triagePending(ctx.user.id)),

  /**
   * done   -> state done, closed_by rye-triage, one `state:done` audit row
   * open   -> flag cleared, state untouched
   * unsure -> flag kept, parked a week
   */
  triageAnswer: ownerProcedure
    .input(z.object({ id: z.number().int(), answer: z.enum(["done", "open", "unsure"]) }))
    .mutation(({ ctx, input }) => items.answerTriage(ctx.user.id, input.id, input.answer, "web")),

  split: ownerProcedure
    .input(z.object({ id: z.number().int(), secondBody: z.string().min(1).max(20_000) }))
    .mutation(async ({ ctx, input }) => {
      const [first, second] = await items.splitItem(
        ctx.user.id,
        input.id,
        input.secondBody,
        "web",
      );
      return { first, second };
    }),
});
