/**
 * Game System tRPC routes.
 * Admin: Game Variables management, Living Ledger, Endorsements/Flags, Gratitude admin
 * Player: Score, tier, gratitude, endorsements
 */
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { sql, desc, eq } from "drizzle-orm";
import { getGameVariable, getGameVariables, invalidateGameVariable, getCurrentSeason, recordScoreEvent, logActivityEvent, getTierFromPercentile } from "../game";
import {
  MECHANICS_VARIABLE_KEYS,
  buildGameMechanicsSnapshot,
  type GameMechanicsSnapshot,
} from "@shared/gameMechanics";

export const gameRouter = router({
  /**
   * PUBLIC: the single typed snapshot the game-mechanics pages render. Every
   * number comes from the live game_variables table (with seeded fallbacks)
   * plus a few structural constants, so the pages can never drift from the
   * engine. Cached 5 min per key via getGameVariables; an admin edit through
   * game.updateVariable busts that cache, so this is fresh within ~5 min.
   */
  getMechanics: publicProcedure.query(async (): Promise<GameMechanicsSnapshot> => {
    const vars = await getGameVariables(MECHANICS_VARIABLE_KEYS);
    return buildGameMechanicsSnapshot(vars, Date.now());
  }),
  // ─── Season snapshots (public, for the Game Mechanics simulator ghost curve) ─

  /**
   * Returns the most recent finalized season snapshot's variables map, or
   * null if no snapshots exist yet. The simulator uses this to draw a
   * dashed "previous season" line behind each variable's sparkline.
   */
  previousVariables: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.execute(sql`SELECT seasonId, seasonName, variables FROM seasonSnapshots ORDER BY snapshotAt DESC LIMIT 1`).then((r: any) => r[0] ?? []);
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    let variables: Record<string, number> = {};
    try {
      variables = typeof row.variables === "string" ? JSON.parse(row.variables) : (row.variables ?? {});
    } catch {
      variables = {};
    }
    return {
      seasonId: row.seasonId as number,
      seasonName: (row.seasonName as string | null) ?? null,
      variables,
    };
  }),

  // ─── Game Variables ─────────────────────────────────────────────────────
  //
  // listVariables is PUBLIC so every visitor to /game-mechanics can see the
  // live game variables (citizenship thresholds, gratitude multipliers,
  // contribution formulas). Inline editing remains admin-only via
  // updateVariable below.

  listVariables: publicProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const category = input?.category;
      if (category) {
        return db.execute(sql`SELECT * FROM game_variables WHERE category = ${category} ORDER BY \`key\``).then((r: any) => r[0] ?? []);
      }
      return db.execute(sql`SELECT * FROM game_variables ORDER BY category, \`key\``).then((r: any) => r[0] ?? []);
    }),

  updateVariable: adminProcedure
    .input(z.object({
      id: z.number(),
      value: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Shared write path with the Evolution Engine dispatcher: bounds
      // enforced, history written, cache busted (server/lib/evolution.ts).
      const { applyVariableChange } = await import("../lib/evolution");
      const result = await applyVariableChange({
        variableId: input.id,
        newValue: input.value,
        changedBy: ctx.user.id,
        reason: input.reason,
      });
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      }
      return { ok: true };
    }),

  variableHistory: adminProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.execute(sql`
        SELECT h.*, v.displayName, v.\`key\`
        FROM game_variable_history h
        JOIN game_variables v ON v.id = h.variableId
        ORDER BY h.createdAt DESC
        LIMIT ${input.limit}
      `).then((r: any) => r[0] ?? []);
    }),

  // ─── Seasons (Admin) ───────────────────────────────────────────────────

  currentSeason: publicProcedure.query(async () => {
    return getCurrentSeason();
  }),

  listSeasons: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`SELECT * FROM game_seasons ORDER BY startDate DESC`).then((r: any) => r[0] ?? []);
  }),

  createSeason: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      status: z.enum(["upcoming", "active", "closing", "archived"]).default("upcoming"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      await db.execute(sql`INSERT INTO game_seasons (name, slug, startDate, endDate, status) VALUES (${input.name}, ${input.slug}, ${input.startDate}, ${input.endDate}, ${input.status})`);
      return { ok: true };
    }),

  // ─── Activity Feed / Living Ledger (Admin) ─────────────────────────────

  activityFeed: adminProcedure
    .input(z.object({
      limit: z.number().default(50),
      eventType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.eventType) {
        return db.execute(sql`SELECT * FROM activity_feed_events WHERE eventType = ${input.eventType} ORDER BY createdAt DESC LIMIT ${input.limit}`).then((r: any) => r[0] ?? []);
      }
      return db.execute(sql`SELECT * FROM activity_feed_events ORDER BY createdAt DESC LIMIT ${input.limit}`).then((r: any) => r[0] ?? []);
    }),

  // ─── Player Score & Tier (Public) ──────────────────────────────────────

  myScore: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { score: 0, raw: 0, tier: "Seedling", trust: 1.0 };
    const rows = await db.execute(sql`SELECT contributionScore, contributionScoreRaw, currentTier, trustScore FROM player_profiles WHERE userId = ${ctx.user.id} LIMIT 1`).then((r: any) => r[0] ?? []);
    const profile = rows[0];
    if (!profile) return { score: 0, raw: 0, tier: "Seedling", trust: 1.0 };
    return {
      score: profile.contributionScore ?? 0,
      raw: profile.contributionScoreRaw ?? 0,
      tier: profile.currentTier ?? "Seedling",
      trust: Number(profile.trustScore ?? 1.0),
    };
  }),

  // ─── Endorsements ─────────────────────────────────────────────────────

  endorse: protectedProcedure
    .input(z.object({
      endorsedType: z.enum(["player", "project"]),
      endorsedId: z.number(),
      note: z.string().max(280).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.endorsedType === "player" && input.endorsedId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Self-endorsement is not allowed" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      // Capture endorser's citizenship tier at time of endorsement
      let endorserTier: string | null = null;
      try {
        const [ep] = await db.execute(sql`SELECT citizenshipTier FROM player_profiles WHERE userId = ${ctx.user.id} LIMIT 1`).then((r: any) => r[0] ?? []);
        endorserTier = ep?.citizenshipTier ?? null;
      } catch { /* non-fatal */ }

      await db.execute(sql`
        INSERT IGNORE INTO game_endorsements (endorserType, endorserId, endorsedType, endorsedId, note, endorserTierAtTime)
        VALUES ('player', ${ctx.user.id}, ${input.endorsedType}, ${input.endorsedId}, ${input.note ?? null}, ${endorserTier})
      `);
      // Record score event for the endorsed entity
      const variableKey = input.endorsedType === "project"
        ? "scoring.weights.endorsement_from_player"
        : "scoring.weights.endorsement_from_player";
      try {
        await recordScoreEvent(input.endorsedId, "endorsement_received", variableKey, "endorsement", ctx.user.id);
        await recordScoreEvent(ctx.user.id, "endorsement_given", "scoring.weights.endorsement_given", "endorsement", input.endorsedId);
      } catch { /* non-fatal if game variables not seeded yet */ }
      return { ok: true };
    }),

  // ─── Gratitude ────────────────────────────────────────────────────────
  //
  // Removed 2026-07-28. `sendGratitude` and `myGratitudeBudget` implemented
  // the retired seasonal model: a spend-down balance in gratitude_budgets,
  // an `amount` per send in gratitude_transactions, and an immediate flat
  // +5 $ReGen minted to the recipient on every send.
  //
  // That contradicts the lunar model (ADR-30, GRATITUDE_SYSTEM_SPEC.md),
  // where gratitude is a signal that never enters the ledger and $ReGen is
  // distributed once per cycle from a capped pool. Both were live at the
  // same time and reachable from the bounty board. Use gratitudeRouter
  // (server/routes/gratitude.ts) instead.

  // ─── Flags (Admin) ────────────────────────────────────────────────────

  submitFlag: protectedProcedure
    .input(z.object({
      flaggedType: z.enum(["player", "project"]),
      flaggedId: z.number(),
      reason: z.enum(["misrepresentation", "unresponsive", "safety_concern", "harassment", "other"]),
      description: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      await db.execute(sql`
        INSERT IGNORE INTO game_flags (flaggerType, flaggerId, flaggedType, flaggedId, reason, description)
        VALUES ('player', ${ctx.user.id}, ${input.flaggedType}, ${input.flaggedId}, ${input.reason}, ${input.description ?? null})
      `);
      await logActivityEvent("flag_submitted", "player", ctx.user.id, input.flaggedType, input.flaggedId, { reason: input.reason }, "admin");
      return { ok: true };
    }),

  listFlags: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`SELECT * FROM game_flags ORDER BY FIELD(status,'pending','investigating','actioned','dismissed'), createdAt DESC`).then((r: any) => r[0] ?? []);
  }),

  listEndorsements: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`SELECT * FROM game_endorsements ORDER BY createdAt DESC LIMIT 100`).then((r: any) => r[0] ?? []);
  }),
});
