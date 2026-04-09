/**
 * Game System tRPC routes.
 * Admin: Game Variables management, Living Ledger, Endorsements/Flags, Gratitude admin
 * Player: Score, tier, gratitude, endorsements
 */
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql, desc, eq } from "drizzle-orm";
import { getGameVariable, invalidateGameVariable, getCurrentSeason, recordScoreEvent, logActivityEvent, getTierFromPercentile } from "../game";

export const gameRouter = router({
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

  // ─── Game Variables (Admin) ─────────────────────────────────────────────

  listVariables: adminProcedure
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
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Get current value for history
      const [current] = await db.execute(sql`SELECT value, \`key\` FROM game_variables WHERE id = ${input.id}`).then((r: any) => r[0] ?? []);
      if (!current) throw new Error("Variable not found");

      // Write history
      await db.execute(sql`INSERT INTO game_variable_history (variableId, previousValue, newValue, changedBy, reason) VALUES (${input.id}, ${current.value}, ${input.value}, ${ctx.user.id}, ${input.reason})`);
      // Update value
      await db.execute(sql`UPDATE game_variables SET value = ${input.value}, updatedBy = ${ctx.user.id} WHERE id = ${input.id}`);
      // Bust cache
      await invalidateGameVariable(current.key);
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
      if (!db) throw new Error("DB unavailable");
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
        throw new Error("Self-endorsement is not allowed");
      }
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
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

  sendGratitude: protectedProcedure
    .input(z.object({
      receiverId: z.number(),
      amount: z.number().min(1).max(5),
      message: z.string().min(1).max(280),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.receiverId === ctx.user.id) throw new Error("Cannot send gratitude to yourself");
      const season = await getCurrentSeason();
      if (!season) throw new Error("No active season");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Check budget
      const budgetRows = await db.execute(sql`SELECT spent, totalBudget FROM gratitude_budgets WHERE userId = ${ctx.user.id} AND seasonId = ${season.id}`).then((r: any) => r[0] ?? []);
      const budget = budgetRows[0];
      if (!budget) throw new Error("No gratitude budget for this season");
      if (budget.spent + input.amount > budget.totalBudget) throw new Error("Insufficient gratitude budget");

      // Check daily limit
      const todayCount = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM gratitude_transactions
        WHERE senderId = ${ctx.user.id} AND receiverId = ${input.receiverId}
        AND createdAt > DATE_SUB(NOW(), INTERVAL 1 DAY)
      `).then((r: any) => (r[0]?.[0]?.cnt ?? 0));
      if (Number(todayCount) > 0) throw new Error("You can send gratitude to this person once per day");

      // Record transaction
      await db.execute(sql`INSERT INTO gratitude_transactions (senderId, receiverId, amount, message, seasonId) VALUES (${ctx.user.id}, ${input.receiverId}, ${input.amount}, ${input.message}, ${season.id})`);
      await db.execute(sql`UPDATE gratitude_budgets SET spent = spent + ${input.amount} WHERE userId = ${ctx.user.id} AND seasonId = ${season.id}`);

      // Score events
      try {
        await recordScoreEvent(input.receiverId, "gratitude_received", "scoring.weights.gratitude_received", "gratitude", ctx.user.id);
        await recordScoreEvent(ctx.user.id, "gratitude_sent", "scoring.weights.gratitude_sent", "gratitude", input.receiverId);
      } catch { /* non-fatal */ }

      return { ok: true };
    }),

  myGratitudeBudget: protectedProcedure.query(async ({ ctx }) => {
    const season = await getCurrentSeason();
    if (!season) return { total: 0, spent: 0, remaining: 0 };
    const db = await getDb();
    if (!db) return { total: 0, spent: 0, remaining: 0 };
    const rows = await db.execute(sql`SELECT totalBudget, spent FROM gratitude_budgets WHERE userId = ${ctx.user.id} AND seasonId = ${season.id}`).then((r: any) => r[0] ?? []);
    const budget = rows[0];
    if (!budget) return { total: 5, spent: 0, remaining: 5 }; // Default for new players
    return { total: budget.totalBudget, spent: budget.spent, remaining: budget.totalBudget - budget.spent };
  }),

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
      if (!db) throw new Error("DB unavailable");
      await db.execute(sql`
        INSERT IGNORE INTO game_flags (flaggerType, flaggerId, flaggedType, flaggedId, reason, description)
        VALUES ('player', ${ctx.user.id}, ${input.flaggedType}, ${input.flaggedId}, ${input.reason}, ${input.description ?? null})
      `);
      await logActivityEvent("flag_submitted", "player", ctx.user.id, input.flaggedType, input.flaggedId, { reason: input.reason }, "admin_only");
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
