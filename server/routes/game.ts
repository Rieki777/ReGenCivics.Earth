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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      // Get current value + safety bounds for history and validation
      const [current] = await db.execute(sql`SELECT value, \`key\`, minValue, maxValue FROM game_variables WHERE id = ${input.id}`).then((r: any) => r[0] ?? []);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Game variable not found" });

      // Enforce the seeded min/max bounds. These are the safety rails the
      // valuation/scoring engines rely on; without this check an admin typo
      // (e.g. impact weight 100 instead of 1.0) silently pegs every payout to
      // the cap. Null bounds mean "unbounded" for that side.
      const minV = current.minValue == null ? null : Number(current.minValue);
      const maxV = current.maxValue == null ? null : Number(current.maxValue);
      if ((minV != null && input.value < minV) || (maxV != null && input.value > maxV)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Value ${input.value} is outside the allowed range for ${current.key} (${minV ?? "-∞"} to ${maxV ?? "∞"}).`,
        });
      }

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

  sendGratitude: protectedProcedure
    .input(z.object({
      receiverId: z.number().optional(),
      // When set, this is a top-up on a completed bounty: the receiver defaults
      // to the bounty's paid worker and the ledger credit is tagged to the bounty.
      bountyId: z.number().int().positive().optional(),
      amount: z.number().min(1).max(5),
      message: z.string().min(1).max(280),
    }).refine((d) => d.receiverId != null || d.bountyId != null, { message: "receiverId or bountyId is required" }))
    .mutation(async ({ ctx, input }) => {
      const season = await getCurrentSeason();
      if (!season) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No active season" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      // Resolve the receiver. A bounty gift targets the paid worker (the shipper
      // for a contribution, else the doer), never the proposer.
      let receiverId = input.receiverId ?? null;
      if (input.bountyId != null) {
        const workerRows = await db.execute(sql`
          SELECT userId FROM bounty_roles
          WHERE bountyId = ${input.bountyId} AND role IN ('doer','shipper')
            AND payStatus = 'paid' AND userId IS NOT NULL
          ORDER BY (role = 'shipper') DESC LIMIT 1
        `).then((r: any) => r[0] ?? []);
        const worker = workerRows[0];
        if (!worker) throw new TRPCError({ code: "NOT_FOUND", message: "This bounty has no paid worker to thank yet" });
        receiverId = Number(worker.userId);
      }
      if (receiverId == null) throw new TRPCError({ code: "BAD_REQUEST", message: "No recipient" });
      if (receiverId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot send gratitude to yourself" });

      // Check budget
      const budgetRows = await db.execute(sql`SELECT spent, totalBudget FROM gratitude_budgets WHERE userId = ${ctx.user.id} AND seasonId = ${season.id}`).then((r: any) => r[0] ?? []);
      const budget = budgetRows[0];
      if (!budget) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No gratitude budget for this season" });
      if (budget.spent + input.amount > budget.totalBudget) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient gratitude budget" });

      // Check daily limit
      const todayCount = await db.execute(sql`
        SELECT COUNT(*) as cnt FROM gratitude_transactions
        WHERE senderId = ${ctx.user.id} AND receiverId = ${receiverId}
        AND createdAt > DATE_SUB(NOW(), INTERVAL 1 DAY)
      `).then((r: any) => (r[0]?.[0]?.cnt ?? 0));
      if (Number(todayCount) > 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You can send gratitude to this person once per day" });

      // Record transaction
      const insertResult: any = await db.execute(sql`INSERT INTO gratitude_transactions (senderId, receiverId, amount, message, seasonId) VALUES (${ctx.user.id}, ${receiverId}, ${input.amount}, ${input.message}, ${season.id})`);
      await db.execute(sql`UPDATE gratitude_budgets SET spent = spent + ${input.amount} WHERE userId = ${ctx.user.id} AND seasonId = ${season.id}`);

      const gratitudeId = insertResult?.insertId ?? insertResult?.[0]?.insertId ?? null;

      // Score events
      try {
        await recordScoreEvent(receiverId, "gratitude_received", "scoring.weights.gratitude_received", "gratitude", ctx.user.id);
        await recordScoreEvent(ctx.user.id, "gratitude_sent", "scoring.weights.gratitude_sent", "gratitude", receiverId);
      } catch { /* non-fatal */ }

      // Private ledger credit: $ReGen +5 to the recipient. Replaces the
      // old governanceTokenLedger write now that user_token_ledger is
      // the single source of truth (2026-04-24 supersede). A bounty gift is
      // tagged 'gratitude_bounty' with sourceRef bounty:{id} so the board can
      // tally gratitude per bounty.
      try {
        const { governanceTenants } = await import("../../drizzle/schema");
        const { eq: eqDrizzle } = await import("drizzle-orm");
        const tenants = await db.select({ id: governanceTenants.id }).from(governanceTenants).where(eqDrizzle(governanceTenants.slug, "platform")).limit(1);
        const tenantId = tenants[0]?.id ?? 1;
        const { creditPrivateTokens } = await import("../db");
        await creditPrivateTokens({
          userId: receiverId,
          tokenType: "regen",
          amount: 5,
          source: input.bountyId != null ? "gratitude_bounty" : "harvest",
          sourceId: gratitudeId ?? null,
          sourceRef: input.bountyId != null ? `bounty:${input.bountyId}` : (gratitudeId ? `gratitude:${gratitudeId}` : "gratitude"),
          tenantId,
          description: input.bountyId != null ? "Gratitude on a bounty" : "Gratitude received",
        });
      } catch { /* non-fatal */ }

      return { ok: true, receiverId };
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
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
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
