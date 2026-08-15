/**
 * Citizenship tier engine: promotions, demotions, grace periods.
 *
 * Lives in lib (not routes) because three callers need it: the nightly batch
 * job router, the _core cron endpoint, and the Hypha bridge webhook receiver.
 * Extracted from routes/batchJobs.ts in the foundation audit (Phase 2) to fix
 * the lib -> routes layering violation.
 *
 * Tier requirements are Game Variables (community-governed), read fresh on
 * every run. Covered by server/citizenship-tiers.test.ts.
 */
import { sql } from "drizzle-orm";
import { getGameVariables } from "../game";

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
      -- Lunar-cycle model (ADR-30). These used to read gratitude_transactions,
      -- the retired seasonal table, so post-cutover nobody accrued the counts
      -- that promote them and every budget quietly flattened to Explorer.
      (SELECT COUNT(DISTINCT gl.recipientId) FROM gratitudeLog gl WHERE gl.senderId = pp.userId) as gratitudeSent,
      (SELECT COUNT(DISTINCT gl.senderId) FROM gratitudeLog gl WHERE gl.recipientId = pp.userId) as gratitudeReceived,
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
