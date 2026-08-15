/**
 * callIntelligence router: the ops view over community-call insights
 * (Stage 7). adminProcedure, not ownerProcedure: progress, roles, jobs, and
 * strategic moves are TEAM intelligence, matching how recordings themselves
 * are admin-visible. Everything here is suggestions-first: accepting an
 * insight records the team's judgment, it never auto-creates a task (decided
 * with Rye 2026-07-17; wiring accepted commitments into call tasks is a
 * later, separate step).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { callInsights, recordings } from "../../drizzle/schema";
import { INSIGHT_KINDS } from "../lib/call-insights";

function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist/i.test(msg);
}

export const callIntelligenceRouter = router({
  /** Recent calls with their insights, ops suggestions first. */
  list: adminProcedure
    .input(z.object({
      status: z.enum(["suggested", "accepted", "dismissed", "all"]).default("all"),
      limit: z.number().int().min(1).max(50).default(15),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      try {
        const rows = await db.select().from(callInsights)
          .orderBy(desc(callInsights.createdAt))
          .limit(600);
        const filtered = input?.status && input.status !== "all"
          ? rows.filter((r) => r.status === input.status)
          : rows;

        const recordingIds = Array.from(new Set(filtered.map((r) => r.recordingId))).slice(0, input?.limit ?? 15);
        const meta = recordingIds.length > 0
          ? await db.select({
              id: recordings.id,
              title: recordings.title,
              sessionDate: recordings.sessionDate,
              youtubeUrl: recordings.youtubeUrl,
              editedYoutubeUrl: recordings.editedYoutubeUrl,
            }).from(recordings).where(inArray(recordings.id, recordingIds))
          : [];

        return {
          ready: true,
          calls: recordingIds.map((id) => {
            const recording = meta.find((m) => m.id === id);
            return {
              recordingId: id,
              title: recording?.title ?? `Recording ${id}`,
              date: recording?.sessionDate ?? null,
              link: recording?.editedYoutubeUrl || recording?.youtubeUrl || null,
              insights: filtered.filter((r) => r.recordingId === id),
            };
          }),
        };
      } catch (err) {
        if (isMissingTableError(err)) return { ready: false, calls: [] };
        throw err;
      }
    }),

  /** Open ops suggestions across all calls, oldest first (staleness view). */
  openSuggestions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    try {
      const rows = await db.select().from(callInsights)
        .where(and(
          eq(callInsights.status, "suggested"),
          inArray(callInsights.kind, ["decision", "commitment", "role_change", "strategic_move"]),
        ))
        .orderBy(callInsights.createdAt)
        .limit(100);
      return { ready: true, suggestions: rows };
    } catch (err) {
      if (isMissingTableError(err)) return { ready: false, suggestions: [] };
      throw err;
    }
  }),

  /** Accept or dismiss one suggestion. Judgment recorded, nothing automated. */
  setStatus: adminProcedure
    .input(z.object({
      insightId: z.number().int().positive(),
      status: z.enum(["accepted", "dismissed", "suggested"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(callInsights)
        .set({ status: input.status })
        .where(eq(callInsights.id, input.insightId));
      return { ok: true };
    }),

  /** The kinds, for client filters (single source of truth server-side). */
  kinds: adminProcedure.query(() => ({ kinds: INSIGHT_KINDS })),
});
