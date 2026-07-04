/**
 * Nightly Batch Jobs
 * Admin-only tRPC endpoints for running game system maintenance.
 * Steps: lunar cycles, contribution scores, trust scores,
 * citizenship tier checks, gratitude multipliers, job logging.
 */
import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { getGameVariable, getGameVariables, getTierFromPercentile, getCurrentSeason } from "../game";
import { CAPITAL_TYPES, QUEST_CATEGORY_TO_CAPITAL, zeroCapitalScores, type CapitalType } from "@shared/capitals";

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
       WHERE gt.receiverId = pp.userId) as gratitudeReceived,
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
    const rawInt = Math.round(score);
    try {
      await db.execute(sql`
        UPDATE player_profiles
        SET trustScore = ${clamped},
            trustScoreRaw = ${rawInt},
            trustLastCalculatedAt = NOW()
        WHERE userId = ${p.userId}
      `);
    } catch {
      // trustScoreRaw / trustLastCalculatedAt columns may be missing pre-migration.
      // Fall back to the trust-score-only update so the batch still progresses.
      await db.execute(sql`
        UPDATE player_profiles SET trustScore = ${clamped} WHERE userId = ${p.userId}
      `);
    }
    processed++;
  }
  return processed;
}

// ─── Step 3b: Recalculate Capital Scores ────────────────────────────────────
// Percentile ranked per capital across active players. Writes to the cache
// columns on player_profiles so profile loads can skip the live calc.

async function recalculateCapitalScores(db: any): Promise<number> {
  // Step 1: Raw totals per user per capital from self-reported contributions.
  const [contribRows] = await db.execute(sql`
    SELECT userId, capitalType, COUNT(*) * 10 + FLOOR(COALESCE(SUM(estimatedValue), 0) / 1000) AS pts
    FROM player_contributions
    WHERE userId IS NOT NULL
    GROUP BY userId, capitalType
  `);

  // Step 2: Raw points per user per capital from quest completions,
  // mapped through QUEST_CATEGORY_TO_CAPITAL via inferQuestCategory.
  const [questRows] = await db.execute(sql`
    SELECT userId, questId, COUNT(*) AS completions
    FROM quest_completions
    WHERE userId IS NOT NULL
    GROUP BY userId, questId
  `);

  // Assemble rawScores[userId][capital] = points.
  const rawScores: Record<number, Record<CapitalType, number>> = {};
  const ensure = (uid: number) => {
    if (!rawScores[uid]) rawScores[uid] = zeroCapitalScores();
    return rawScores[uid];
  };
  for (const row of (contribRows as any[])) {
    const capital = row.capitalType as CapitalType;
    if (!CAPITAL_TYPES.includes(capital)) continue;
    ensure(row.userId)[capital] += Number(row.pts ?? 0);
  }
  for (const row of (questRows as any[])) {
    const category = inferQuestCategoryForBatch(String(row.questId));
    const capital = QUEST_CATEGORY_TO_CAPITAL[category];
    if (!capital) continue;
    ensure(row.userId)[capital] += Number(row.completions ?? 0) * 5;
  }

  // Step 3: For each capital, compute the sorted score distribution and percentile rank.
  const userIds = Object.keys(rawScores).map(Number);
  if (userIds.length === 0) return 0;

  const seriesByCapital: Record<CapitalType, number[]> = zeroCapitalScores() as any;
  for (const c of CAPITAL_TYPES) (seriesByCapital as any)[c] = [] as number[];
  for (const uid of userIds) {
    for (const c of CAPITAL_TYPES) {
      (seriesByCapital as any)[c].push(rawScores[uid][c]);
    }
  }
  for (const c of CAPITAL_TYPES) {
    (seriesByCapital as any)[c].sort((a: number, b: number) => a - b);
  }

  // Step 4: Write the normalised 0-100 scores to each player's cache.
  let processed = 0;
  const now = new Date();
  for (const uid of userIds) {
    const normalised: Record<CapitalType, number> = zeroCapitalScores();
    for (const c of CAPITAL_TYPES) {
      const myScore = rawScores[uid][c];
      const series = (seriesByCapital as any)[c] as number[];
      if (myScore === 0 || series.length === 0) {
        normalised[c] = 0;
        continue;
      }
      const below = binaryCountLT(series, myScore);
      normalised[c] = Math.min(100, Math.round((below / series.length) * 100));
    }
    try {
      await db.execute(sql`
        UPDATE player_profiles
        SET capitalScoresJson = ${JSON.stringify(normalised)},
            capitalScoresUpdatedAt = ${now}
        WHERE userId = ${uid}
      `);
      processed++;
    } catch {
      // Cache columns missing pre-migration — skip and keep processing.
    }
  }
  return processed;
}

/** Quest slug -> category mapper, mirrored from players.ts. */
function inferQuestCategoryForBatch(questId: string): string {
  const id = questId.toLowerCase();
  if (id.includes("fire") || id.includes("quest-0")) return "ceremony";
  if (id.includes("food") || id.includes("soil") || id.includes("land") || id.includes("seed")) return "land-stewardship";
  if (id.includes("gov") || id.includes("proposal")) return "governance";
  if (id.includes("event") || id.includes("gather")) return "events";
  if (id.includes("heal") || id.includes("body") || id.includes("fast")) return "wellness";
  if (id.includes("story") || id.includes("write") || id.includes("song")) return "storytelling";
  if (id.includes("circle") || id.includes("community")) return "community-building";
  if (id.includes("build") || id.includes("tool") || id.includes("infra")) return "infrastructure";
  if (id.includes("fund") || id.includes("money") || id.includes("crowd")) return "fundraising";
  return "community-building";
}

/** Count values in sorted series strictly less than `target`. */
function binaryCountLT(sorted: number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
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
      (SELECT COUNT(*) FROM gratitude_transactions gt WHERE gt.receiverId = pp.userId) as gratitudeReceived,
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
       WHERE gt.receiverId = pp.userId) as gratitudeReceived
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

// ─── Step 7: Auto-cancel stale claim bridges ──────────────────────────────
//
// A claim bridge is "stale" if it has sat in `created` or `handoff_sent`
// status for longer than the configured timeout (default 24h). The
// initiator either closed the Hypha tab without finishing or the chain
// never confirmed. Either way the user's private balance is debited
// and the tokens need to come back.
//
// For each stale bridge: mark it `cancelled` and write a `claim_released`
// credit ledger row equal to the original `claim_pending` debit. This
// uses the same logic as the user-facing cancelClaim mutation so the
// math stays consistent.
//
// Idempotent: a bridge that has already been cancelled, failed, or
// passed is skipped. The release row is only written once (existence
// guard via sourceRef='bridge:<key>' source='claim_released').

async function cancelStaleClaimBridges(
  db: any,
  staleAfterHours = 24,
): Promise<{ cancelled: number; refunded: number }> {
  const cutoffMs = Date.now() - staleAfterHours * 60 * 60 * 1000;
  const cutoffSql = new Date(cutoffMs).toISOString().slice(0, 19).replace("T", " ");

  // Find candidate bridges. Pulling rows directly so we have the full
  // payload + status for the refund logic. Limited to redeem_tokens
  // bridges so other bridge sources (loomio_decision, fund_grant, etc)
  // are not touched.
  const [rows] = await db.execute(sql`
    SELECT id, bridgeKey, initiatorUserId, payload, status, createdAt
    FROM hyphaBridges
    WHERE source = 'redeem_tokens'
      AND status IN ('created', 'handoff_sent')
      AND createdAt < ${cutoffSql}
  `);
  const candidates = (rows as any[]) ?? [];
  if (candidates.length === 0) return { cancelled: 0, refunded: 0 };

  const { creditPrivateTokens } = await import("../db");

  let cancelled = 0;
  let refunded = 0;

  for (const bridge of candidates) {
    let payload: any = null;
    try {
      payload = typeof bridge.payload === "string" ? JSON.parse(bridge.payload) : bridge.payload;
    } catch { /* ignore */ }
    const tokenType = payload?.metadata?.tokenType as ("rgvoice" | "regen" | "rcvoice" | "rcivics" | undefined);
    const requestedAmount = Number(payload?.metadata?.requestedAmount ?? 0);

    // Existence guard: skip if a release row already exists.
    const [existing] = await db.execute(sql`
      SELECT id FROM user_token_ledger
      WHERE sourceRef = ${"bridge:" + bridge.bridgeKey}
        AND source = 'claim_released'
      LIMIT 1
    `);
    const alreadyReleased = ((existing as any[]) ?? []).length > 0;

    if (!alreadyReleased && tokenType && requestedAmount > 0) {
      try {
        await creditPrivateTokens({
          userId: bridge.initiatorUserId,
          tokenType,
          amount: requestedAmount,
          source: "claim_released",
          sourceId: bridge.id,
          sourceRef: `bridge:${bridge.bridgeKey}`,
          // Once-only across cancelClaim / this cleanup / failure webhook.
          idempotencyKey: `claim_released:${bridge.bridgeKey}`,
          description: `Claim of ${requestedAmount} ${tokenType} timed out after ${staleAfterHours}h, refunded`,
        });
        refunded++;
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        // A concurrent writer already refunded this bridge; not an error.
        if (!/duplicate/i.test(msg) && !/unique/i.test(msg)) {
          console.error(`[stale-claim-cleanup] refund failed for bridge ${bridge.bridgeKey}:`, err);
        }
      }
    }

    await db.execute(sql`
      UPDATE hyphaBridges
      SET status = 'cancelled',
          updatedAt = NOW()
      WHERE id = ${bridge.id}
    `);
    cancelled++;
  }

  return { cancelled, refunded };
}

// ─── Main Router ───────────────────────────────────────────────────────────

export const batchJobsRouter = router({
  // Run the full nightly batch job
  runNightly: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

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
      // Step 3b: Capital scores cache
      await recalculateCapitalScores(db);
    } catch (e: any) { errors.push(`Step 3b (capital): ${e.message}`); }

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

    let staleClaimsCancelled = 0;
    let staleClaimsRefunded = 0;
    try {
      // Step 7: Auto-cancel stale claim bridges (>24h in created/handoff_sent).
      // Refunds the user's private ledger so abandoned claims do not freeze
      // tokens forever.
      const result = await cancelStaleClaimBridges(db, 24);
      staleClaimsCancelled = result.cancelled;
      staleClaimsRefunded = result.refunded;
    } catch (e: any) { errors.push(`Step 7 (stale claims): ${e.message}`); }

    let gratitudeCyclesClosed = 0;
    let gratitudeCredited = 0;
    try {
      // Step 8: Gratitude lunar cycles. Close any cycle whose new moon has
      // passed (writes acknowledgment weights, distributes the $ReGen pool
      // to recipients) and open the current lunation. Idempotent.
      const { closeDueCycles } = await import("../lib/gratitude-cycles");
      const result = await closeDueCycles(db);
      gratitudeCyclesClosed = result.closed;
      gratitudeCredited = result.credited;
    } catch (e: any) { errors.push(`Step 8 (gratitude cycles): ${e.message}`); }

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

    return { status, playersProcessed, promotions, demotions, errors, staleClaimsCancelled, staleClaimsRefunded, gratitudeCyclesClosed, gratitudeCredited };
  }),

  // Manual trigger for the stale-claim cleanup (admin-only). Useful for
  // running ad-hoc when a player flags a frozen claim.
  cancelStaleClaims: adminProcedure
    .input(z.object({ staleAfterHours: z.number().min(1).max(720).default(24) }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
      return cancelStaleClaimBridges(db, input?.staleAfterHours ?? 24);
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
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });

      const [current] = await db.execute(sql`
        SELECT citizenshipTier FROM player_profiles WHERE userId = ${input.userId} LIMIT 1
      `).then((r: any) => r[0] ?? []);

      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });

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
