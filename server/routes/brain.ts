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
import { and, gte, inArray, sql } from "drizzle-orm";
import { ownerProcedure, rateLimited, router } from "../_core/trpc";
import { getDb } from "../db";
import { brainAudit, harvestRuns, quickNotes } from "../../drizzle/schema";
import * as items from "../lib/brain-items";
import { BRAIN_KINDS, BRAIN_STATES } from "../lib/brain-items";

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

/**
 * Monday 00:00 local, so "this week" lines up with the Monday morning message
 * rather than drifting on a rolling window (addendum 2, item 8).
 */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
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

    // The month-one metric, which the plan named and then never computed
    // (addendum 2, item 8). Counted from brain_audit, not from current state:
    // the audit records the EVENT, so reopening an item later cannot rewrite
    // the week in which it was closed.
    const weekStart = startOfWeek();
    let closedThisWeek = 0;
    let promotedThisWeek = 0;
    try {
      const rows = await db
        .select({ action: brainAudit.action, n: sql<number>`COUNT(*)` })
        .from(brainAudit)
        .where(and(gte(brainAudit.createdAt, weekStart), inArray(brainAudit.action, ["state:done", "promote"])))
        .groupBy(brainAudit.action);
      closedThisWeek = Number(rows.find((r) => r.action === "state:done")?.n ?? 0);
      promotedThisWeek = Number(rows.find((r) => r.action === "promote")?.n ?? 0);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }

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
