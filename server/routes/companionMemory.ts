/**
 * Consent-based player memory: the transparency surface (Phase D2).
 *
 * "What the Guide remembers about you", in full: opt-in toggle (default OFF),
 * the complete list of stored facts, delete any or all, export. This surface
 * shipped before any memory write existed and remains the gate: the writer
 * job (server/jobs/companionMemoryJob.ts) only writes for opted-in players,
 * and the companion only reads for opted-in players.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md, improvement 13.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { playerCompanionMemory, playerProfiles } from "../../drizzle/schema";

export const companionMemoryRouter = router({
  /** The whole surface in one read: opt-in state + every stored fact. */
  settings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { optIn: false, facts: [] };
    const [profile] = await db
      .select({ optIn: playerProfiles.companionMemoryOptIn })
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, ctx.user.id))
      .limit(1);
    const facts = await db
      .select()
      .from(playerCompanionMemory)
      .where(eq(playerCompanionMemory.userId, ctx.user.id))
      .orderBy(desc(playerCompanionMemory.createdAt));
    return {
      optIn: (profile?.optIn ?? 0) === 1,
      facts: facts.map((f) => ({
        id: f.id,
        surface: f.surface,
        fact: f.fact,
        createdAt: f.createdAt,
        supersededAt: f.supersededAt,
      })),
    };
  }),

  setOptIn: protectedProcedure
    .input(z.object({ optIn: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(playerProfiles)
        .set({ companionMemoryOptIn: input.optIn ? 1 : 0 })
        .where(eq(playerProfiles.userId, ctx.user.id));
      return { ok: true };
    }),

  deleteFact: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .delete(playerCompanionMemory)
        .where(and(eq(playerCompanionMemory.id, input.id), eq(playerCompanionMemory.userId, ctx.user.id)));
      return { ok: true };
    }),

  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await db.delete(playerCompanionMemory).where(eq(playerCompanionMemory.userId, ctx.user.id));
    return { ok: true };
  }),

  /** Full export of the player's own memory, as data they can keep. */
  exportMemory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { exportedAt: new Date().toISOString(), facts: [] };
    const facts = await db
      .select()
      .from(playerCompanionMemory)
      .where(eq(playerCompanionMemory.userId, ctx.user.id))
      .orderBy(desc(playerCompanionMemory.createdAt));
    return {
      exportedAt: new Date().toISOString(),
      facts: facts.map((f) => ({
        surface: f.surface,
        fact: f.fact,
        sourceRef: f.sourceRef,
        createdAt: f.createdAt,
        supersededAt: f.supersededAt,
      })),
    };
  }),
});
