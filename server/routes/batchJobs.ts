/**
 * Nightly Batch Jobs
 * Admin-only tRPC endpoints for running game system maintenance.
 * Steps: lunar cycles, contribution scores, trust scores,
 * citizenship tier checks, gratitude multipliers, job logging.
 */
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { getGameVariable, getGameVariables, getTierFromPercentile, getCurrentSeason } from "../game";

// ─── Step 1: Advance Lunar Cycles ──────────────────────────────────────────

async function advanceLunarCycles(db: any): Promise<number> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  // Mark completed cycles
  await db.execute(sql`
    UPDATE lunar_cycles SET status = 'completed'
    WHERE status = 'active' AND endDate < ${now}
  `);
  // Activate upcoming cycles that have started
  const [result] = await db.execute(sql`
    UPDATE lunar_cycles SET status = 'active'
    WHERE status = 'upcoming' AND startDate <= ${now} AND endDate >= ${now}
  `);
  return (result as any)?.affectedRows ?? 0;
}

// ─── Step 2: Recalculate Contribution Scores + Percentiles ─────────────────

async function recalculateScores(db: any): Promise<number> {
  const season = await getCurrentSeason();
  const seasonFilter = season ? sql`AND cse.seasonId = ${season.id}` : sql``;

  // Sum all score events per player
  await db.execute(sql`
    UPDATE player_profiles pp
    SET pp.contributionScoreRaw = COALESCE((
      SELECT SUM(cse.points)
      FROM contribution_score_events cse
      WHERE cse.userId = pp.userId ${seasonFilter}
    ), 0),
    pp.scoreLastCalculatedAt = NOW()
    WHERE pp.userId IS NOT NULL
  `);

  // Calculate percentiles using PERCENT_RANK
  const [players] = await db.execute(sql`
    SELECT userId, contributionScoreRaw,
      ROUND(PERCENT_RANK() OVER (ORDER BY contributionScoreRaw) * 100) as percentile
    FROM player_profiles
    WHERE userId IS NOT NULL AND contributionScoreRaw > 0
  `);

  let processed = 0;
  for (const p of (players as any[])) {
    const tier = getTierFromPercentile(p.percentile);
    await db.execute(sql`
      UPDATE player_profiles
      SET contributionScore = ${p.percentile}, currentTier = ${tier}
      WHERE userId = ${p.userId}
    `);
    processed++;
  }
  return processed;
}

// ─── Step 3: Recalculate Trust Scores ──────────────────────────────────────

async function recalculateTrustScores(db: any): Promise<number> {
  // 7-input trust formula, all weights from Game Variables
  const weights = await getGameVariables([
    "trust.weight.endorsements_from_projects",
    "trust.weight.endorsements_from_players",
    "trust.weight.account_age_seasons",
    "trust.weight.quests_completed",
    "trust.weight.gratitude_received",
    "trust.weight.flags_validated",
    "trust.weight.contribution_percentile",
  ]);

  const [players] = await db.execute(sql`
    SELECT pp.userId, pp.seasonsCompleted, pp.contributionScore,
      (SELECT COUNT(*) FROM game_endorsements ge
       WHERE ge.endorsedType = 'player' AND ge.endorsedId = pp.userId
       AND ge.endorserType = 'project' AND ge.status = 'active') as projectEndorsements,
      (SELECT COUNT(*) FROM game_endorsements ge
       WHERE ge.endorsedType = 'player' AND ge.endorsedId = pp.userId
       AND ge.endorserType = 'player' AND ge.status = 'active') as playerEndorsements,
      (SELECT COUNT(*) FROM quest_completions qc WHERE qc.userId = pp.userId) as questsCount,
      (SELECT COUNT(*) FROM gratitude_transactions gt
       WHERE gt.recipientId = pp.userId) as gratitudeReceived,
      (SELECT COUNT(*) FROM game_flags gf
       WHERE gf.flaggedType = 'player' AND gf.flaggedId = pp.userId
       AND gf.status = 'validated') as flagsValidated
    FROM player_profiles pp
    WHERE pp.userId IS NOT NULL
  `);

  let processed = 0;
  for (const p of (players as any[])) {
    const score =
      (p.projectEndorsements ?? 0) * (weights["trust.weight.endorsements_from_projects"] ?? 4) +
      (p.playerEndorsements ?? 0) * (weights["trust.weight.endorsements_from_players"] ?? 1) +
      (p.seasonsCompleted ?? 0) * (weights["trust.weight.account_age_seasons"] ?? 0.5) +
      (p.questsCount ?? 0) * (weights["trust.weight.quests_completed"] ?? 0.2) +
      (p.gratitudeReceived ?? 0) * (weights["trust.weight.gratitude_received"] ?? 0.3) +
      (p.flagsValidated ?? 0) * (weights["trust.weight.flags_validated"] ?? -5) +
      (p.contributionScore ?? 0) * (weights["trust.weight.contribution_percentile"] ?? 0.01);

    // Clamp trust score between 0.0 and 2.0
    const clamped = Math.max(0, Math.min(2.0, score / 10));
    await db.execute(sql`
      UPDATE player_profiles SET trustScore = ${clamped} WHERE userId = ${p.userId}
    `);
    processed++;
  }
  return processed;
}

// ─── Step 4: Citizenship Tier Checks + Grace Period ────────────────────────

export async function checkCitizenshipTiers(db: any): Promise<{ promotions: number; demotions: number }> {
  let promotions = 0;
  let demotions = 0;

  // Load all tier requirements from Game Variables
  const vars = await getGameVariables([
    // Co-Creator requirements
    "citizenship.co_creator.min_percentile",
    "citizenship.co_creator.min_fire_quest",
    "citizenship.co_creator.min_rites",
    "citizenship.co_creator.min_gratitude_sent",
    "citizenship.co_creator.min_seasons",
    // Steward requirements
    "citizenship.steward.min_percentile",
    "citizenship.steward.min_epic_quests",
    "citizenship.steward.min_endorsements_project",
    "citizenship.steward.min_gratitude_received",
    "citizenship.steward.min_seasons",
    // Sage requirements
    "citizenship.sage.min_percentile",
    "citizenship.sage.min_seasons",
    "citizenship.sage.min_contributions",
    "citizenship.sage.min_endorsements_total",
    // Grace period
    "citizenship.grace_period_days",
  ]);

  const graceDays = vars["citizenship.grace_period_days"] ?? 30;

  const [players] = await db.execute(sql`
    SELECT pp.userId, pp.citizenshipTier, pp.contributionScore,
      pp.graceStartedAt, pp.seasonsCompleted,
      (SELECT COUNT(*) FROM quest_completions qc WHERE qc.userId = pp.userId) as questsCount,
      (SELECT COUNT(*) FROM gratitude_transactions gt WHERE gt.senderId = pp.userId) as gratitudeSent,
      (SELECT COUNT(*) FROM gratitude_transactions gt WHERE gt.recipientId = pp.userId) as gratitudeReceived,
      (SELECT COUNT(*) FROM game_endorsements ge
       WHERE ge.endorsedType = 'player' AND ge.endorsedId = pp.userId
       AND ge.endorserType = 'project' AND ge.status = 'active') as projectEndorsements,
      (SELECT COUNT(*) FROM game_endorsements ge
       WHERE ge.endorsedType = 'player' AND ge.endorsedId = pp.userId
       AND ge.status = 'active') as totalEndorsements
    FROM player_profiles pp
    WHERE pp.userId IS NOT NULL
  `);

  for (const p of (players as any[])) {
    const current = p.citizenshipTier ?? "explorer";
    let qualifiesFor = "explorer";

    // Check Sage
    if (
      (p.contributionScore ?? 0) >= (vars["citizenship.sage.min_percentile"] ?? 90) &&
      (p.seasonsCompleted ?? 0) >= (vars["citizenship.sage.min_seasons"] ?? 6) &&
      (p.questsCount ?? 0) >= (vars["citizenship.sage.min_contributions"] ?? 100) &&
      (p.totalEndorsements ?? 0) >= (vars["citizenship.sage.min_endorsements_total"] ?? 10)
    ) {
      qualifiesFor = "sage";
    }
    // Check Steward
    else if (
      (p.contributionScore ?? 0) >= (vars["citizenship.steward.min_percentile"] ?? 50) &&
      (p.seasonsCompleted ?? 0) >= (vars["citizenship.steward.min_seasons"] ?? 3) &&
      (p.projectEndorsements ?? 0) >= (vars["citizenship.steward.min_endorsements_project"] ?? 1) &&
      (p.gratitudeReceived ?? 0) >= (vars["citizenship.steward.min_gratitude_received"] ?? 10)
    ) {
      qualifiesFor = "steward";
    }
    // Check Co-Creator
    else if (
      (p.contributionScore ?? 0) >= (vars["citizenship.co_creator.min_percentile"] ?? 15) &&
      (p.gratitudeSent ?? 0) >= (vars["citizenship.co_creator.min_gratitude_sent"] ?? 5) &&
      (p.seasonsCompleted ?? 0) >= (vars["citizenship.co_creator.min_seasons"] ?? 2)
    ) {
      qualifiesFor = "co_creator";
    }

    const tierOrder = ["explorer", "co_creator", "steward", "sage"];
    const currentIdx = tierOrder.indexOf(current);
    const qualIdx = tierOrder.indexOf(qualifiesFor);

    if (qualIdx > currentIdx) {
      // Promote
      await db.execute(sql`
        UPDATE player_profiles SET citizenshipTier = ${qualifiesFor}, citizenshipTierUpdatedAt = NOW(), graceStartedAt = NULL
        WHERE userId = ${p.userId}
      `);
      await db.execute(sql`
        INSERT INTO citizenship_tier_history (userId, fromTier, toTier, reason, createdAt)
        VALUES (${p.userId}, ${current}, ${qualifiesFor}, 'automatic', NOW())
      `);
      promotions++;
    } else if (qualIdx < currentIdx) {
      // Grace period or demote
      if (!p.graceStartedAt) {
        // Start grace period
        await db.execute(sql`
          UPDATE player_profiles SET graceStartedAt = NOW() WHERE userId = ${p.userId}
        `);
      } else {
        const graceStart = new Date(p.graceStartedAt);
        const daysSinceGrace = (Date.now() - graceStart.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceGrace >= graceDays) {
          // Grace expired, demote
          await db.execute(sql`
            UPDATE player_profiles SET citizenshipTier = ${qualifiesFor}, citizenshipTierUpdatedAt = NOW(), graceStartedAt = NULL
            WHERE userId = ${p.userId}
          `);
          await db.execute(sql`
            INSERT INTO citizenship_tier_history (userId, fromTier, toTier, reason, createdAt)
            VALUES (${p.userId}, ${current}, ${qualifiesFor}, 'grace_period_expired', NOW())
          `);
          demotions++;
        }
      }
    } else if (qualIdx >= currentIdx && p.graceStartedAt) {
      // Requirements met again, clear grace
      await db.execute(sql`
        UPDATE player_profiles SET graceStartedAt = NULL WHERE userId = ${p.userId}
      `);
    }
  }

  return { promotions, demotions };
}

// ─── Step 5: Update Gratitude Multipliers ──────────────────────────────────

async function updateGratitudeMultipliers(db: any): Promise<number> {
  const vars = await getGameVariables([
    "gratitude.trust_graph.received_weight",
    "gratitude.trust_graph.max_bonus",
    "gratitude.multiplier.explorer",
    "gratitude.multiplier.co_creator",
    "gratitude.multiplier.steward",
    "gratitude.multiplier.sage",
  ]);

  const tierMultipliers: Record<string, number> = {
    explorer: vars["gratitude.multiplier.explorer"] ?? 1.0,
    co_creator: vars["gratitude.multiplier.co_creator"] ?? 1.2,
    steward: vars["gratitude.multiplier.steward"] ?? 1.5,
    sage: vars["gratitude.multiplier.sage"] ?? 2.0,
  };

  const receivedWeight = vars["gratitude.trust_graph.received_weight"] ?? 0.1;
  const maxBonus = vars["gratitude.trust_graph.max_bonus"] ?? 0.5;

  // For each player, calculate gratitude multiplier = tierBase + min(receivedPrev * weight, maxBonus)
  const [players] = await db.execute(sql`
    SELECT pp.userId, pp.citizenshipTier,
      (SELECT COUNT(*) FROM gratitude_transactions gt
       WHERE gt.recipientId = pp.userId) as gratitudeReceived
    FROM player_profiles pp
    WHERE pp.userId IS NOT NULL
  `);

  let processed = 0;
  for (const p of (players as any[])) {
    const tierBase = tierMultipliers[p.citizenshipTier ?? "explorer"] ?? 1.0;
    const bonus = Math.min((p.gratitudeReceived ?? 0) * receivedWeight, maxBonus);
    const multiplier = tierBase + bonus;
    await db.execute(sql`
      UPDATE player_profiles SET trustScore = ${Math.min(multiplier, 2.0)} WHERE userId = ${p.userId}
    `);
    processed++;
  }
  return processed;
}

// ─── Step 6: Land Project Status Progression ───────────────────────────────

async function checkLandProjectStatus(db: any): Promise<number> {
  const vars = await getGameVariables([
    "project.accepted_endorsements",
    "project.active_endorsements",
    "project.active_contributions",
    "project.established_funded_campaigns",
    "project.established_seasons",
    "project.anchor_seasons",
    "project.anchor_endorsements",
  ]);

  const [projects] = await db.execute(sql`
    SELECT id, projectStatus, endorsementCount, contributionCount, fundedCampaignCount, seasonsActive
    FROM applications
    WHERE status IN ('approved', 'active') AND projectStatus IS NOT NULL
  `);

  let updated = 0;
  for (const p of (projects as any[])) {
    const current = p.projectStatus ?? "applied";
    let newStatus = current;

    if (
      current === "established" &&
      (p.seasonsActive ?? 0) >= (vars["project.anchor_seasons"] ?? 8) &&
      (p.endorsementCount ?? 0) >= (vars["project.anchor_endorsements"] ?? 20)
    ) {
      newStatus = "anchor";
    } else if (
      current === "active" &&
      (p.fundedCampaignCount ?? 0) >= (vars["project.established_funded_campaigns"] ?? 1) &&
      (p.seasonsActive ?? 0) >= (vars["project.established_seasons"] ?? 3)
    ) {
      newStatus = "established";
    } else if (
      current === "accepted" &&
      (p.endorsementCount ?? 0) >= (vars["project.active_endorsements"] ?? 3) &&
      (p.contributionCount ?? 0) >= (vars["project.active_contributions"] ?? 5)
    ) {
      newStatus = "active";
    } else if (
      current === "applied" &&
      (p.endorsementCount ?? 0) >= (vars["project.accepted_endorsements"] ?? 1)
    ) {
      newStatus = "accepted";
    }

    if (newStatus !== current) {
      await db.execute(sql`
        UPDATE applications SET projectStatus = ${newStatus}, projectStatusUpdatedAt = NOW()
        WHERE id = ${p.id}
      `);
      updated++;
    }
  }
  return updated;
}

// ─── Main Router ───────────────────────────────────────────────────────────

export const batchJobsRouter = router({
  // Run the full nightly batch job
  runNightly: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const startedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    let jobId: number | undefined;

    // Log job start
    await db.execute(sql`
      INSERT INTO batch_job_runs (jobType, startedAt, status, triggeredBy, createdAt)
      VALUES ('nightly', ${startedAt}, 'running', 'admin', NOW())
    `);
    const [lastId] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
    jobId = (lastId as any)?.[0]?.id;

    const errors: string[] = [];
    let playersProcessed = 0;
    let promotions = 0;
    let demotions = 0;

    try {
      // Step 1: Lunar cycles
      await advanceLunarCycles(db);
    } catch (e: any) { errors.push(`Step 1 (lunar): ${e.message}`); }

    try {
      // Step 2: Contribution scores
      playersProcessed = await recalculateScores(db);
    } catch (e: any) { errors.push(`Step 2 (scores): ${e.message}`); }

    try {
      // Step 3: Trust scores
      await recalculateTrustScores(db);
    } catch (e: any) { errors.push(`Step 3 (trust): ${e.message}`); }

    try {
      // Step 4: Citizenship tiers
      const tierResult = await checkCitizenshipTiers(db);
      promotions = tierResult.promotions;
      demotions = tierResult.demotions;
    } catch (e: any) { errors.push(`Step 4 (tiers): ${e.message}`); }

    try {
      // Step 5: Gratitude multipliers
      await updateGratitudeMultipliers(db);
    } catch (e: any) { errors.push(`Step 5 (gratitude): ${e.message}`); }

    try {
      // Step 6: Land project status
      await checkLandProjectStatus(db);
    } catch (e: any) { errors.push(`Step 6 (projects): ${e.message}`); }

    // Log job completion
    const status = errors.length === 0 ? "success" : "partial_failure";
    if (jobId) {
      await db.execute(sql`
        UPDATE batch_job_runs
        SET completedAt = NOW(), status = ${status},
            promotions = ${promotions}, demotions = ${demotions},
            playersProcessed = ${playersProcessed},
            errors = ${errors.length > 0 ? JSON.stringify(errors) : null}
        WHERE id = ${jobId}
      `);
    }

    return { status, playersProcessed, promotions, demotions, errors };
  }),

  // Get job history
  getJobHistory: adminProcedure
    .input(z.object({ limit: z.number().max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 20;
      return db.execute(sql`
        SELECT * FROM batch_job_runs ORDER BY createdAt DESC LIMIT ${limit}
      `).then((r: any) => r[0] ?? []);
    }),

  // Get players in grace period
  getGracePeriodPlayers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.execute(sql`
      SELECT pp.userId, pp.displayName, pp.citizenshipTier, pp.graceStartedAt,
        pp.contributionScore, pp.currentTier
      FROM player_profiles pp
      WHERE pp.graceStartedAt IS NOT NULL
      ORDER BY pp.graceStartedAt ASC
    `).then((r: any) => r[0] ?? []);
  }),

  // Admin override: manually set a player's citizenship tier
  overrideTier: adminProcedure
    .input(z.object({
      userId: z.number(),
      tier: z.enum(["explorer", "co_creator", "steward", "sage"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [current] = await db.execute(sql`
        SELECT citizenshipTier FROM player_profiles WHERE userId = ${input.userId} LIMIT 1
      `).then((r: any) => r[0] ?? []);

      if (!current) throw new Error("Player not found");

      await db.execute(sql`
        UPDATE player_profiles
        SET citizenshipTier = ${input.tier}, citizenshipTierUpdatedAt = NOW(), graceStartedAt = NULL
        WHERE userId = ${input.userId}
      `);

      await db.execute(sql`
        INSERT INTO citizenship_tier_history (userId, fromTier, toTier, reason, promotedBy, createdAt)
        VALUES (${input.userId}, ${current.citizenshipTier ?? 'explorer'}, ${input.tier}, 'admin_override', ${ctx.user.id}, NOW())
      `);

      return { success: true };
    }),
});
