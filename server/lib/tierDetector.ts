/**
 * Tier progression detector.
 *
 * Implements section 7 of QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md.
 *
 * Per-path Co-Creator and Steward criteria are checked against the
 * authoritative tables (LOI signed, application approved, quest
 * completions, proposal votes, etc.). When a criterion fires for a
 * (user, path, tier) tuple that doesn't already have a tier_events
 * row, we:
 *   1. Insert a tier_events audit row.
 *   2. Update player_paths to set the earned timestamp.
 *   3. Credit the bonus RGVoice to the user's private ledger.
 *   4. (Optional) emit a notification.
 *
 * Idempotent: running detectTierProgression(userId) twice in a row on
 * the same user does not double-credit. The detector reads tier_events
 * before crediting.
 *
 * Called from:
 *   - scripts/cron/detect-tier-progression.ts (every 15 min, all users)
 *   - inline at LOI submit, application approval, quest completion,
 *     proposal vote handlers (real-time per user)
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  playerPaths,
  tierEvents,
  questCompletions,
  letterOfIntent,
  applications,
  proposalVotes,
  type TierEvent,
  type PlayerPath,
} from "../../drizzle/schema";
import { creditPrivateTokens } from "../db/tokens";
import {
  RITES_OF_PASSAGE_COUNT,
  PLAYER_STEWARD_QUEST_COUNT,
  PLAYER_STEWARD_VOTE_COUNT,
  TIER_BONUS,
  isRiteOfPassage,
} from "@shared/questPools";

export type TierPath = "investor" | "land_project" | "ally" | "player";
type TierEventType = "co_creator_earned" | "steward_earned" | "sage_earned";

const PATH_VALUES = ["investor", "land_project", "ally", "player"] as const;
function isTierPath(v: unknown): v is TierPath {
  return typeof v === "string" && (PATH_VALUES as readonly string[]).includes(v);
}

interface CriterionResult {
  met: boolean;
  /** Human-readable note that ends up in tier_events.details. */
  note?: string;
  /** Raw counts / IDs that informed the decision (debugging). */
  evidence?: Record<string, unknown>;
}

/**
 * Declare a path for a user. Idempotent: returns the existing row
 * if one exists, otherwise inserts. Called from auto-declare soft
 * triggers (signup, LOI start, application open, etc.) and from the
 * explicit Add a Path button in Profile.
 */
export async function declarePath(userId: number, path: TierPath): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // INSERT ... ON DUPLICATE KEY UPDATE (idempotent at the SQL level via
  // the unique key on userId+path). If the row exists, this is a no-op.
  await db.execute(sql`
    INSERT INTO player_paths (userId, path, declaredAt, createdAt, updatedAt)
    VALUES (${userId}, ${path}, NOW(), NOW(), NOW())
    ON DUPLICATE KEY UPDATE updatedAt = NOW()
  `);
}

/**
 * Run the full tier-progression check for a single user. Safe to call
 * frequently: idempotent and cheap.
 */
export async function detectTierProgression(userId: number): Promise<{
  earnedTiers: Array<{ path: TierPath | null; eventType: TierEventType; amount: number }>;
}> {
  const db = await getDb();
  if (!db) return { earnedTiers: [] };

  const earnedTiers: Array<{ path: TierPath | null; eventType: TierEventType; amount: number }> = [];

  // 1. Load existing tier_events for this user so we can short-circuit
  // criteria that have already fired. Idempotency lives here.
  const existing: TierEvent[] = await db
    .select()
    .from(tierEvents)
    .where(eq(tierEvents.userId, userId));
  const alreadyFired = new Set(
    existing
      .filter((e: TierEvent) => e.eventType !== "bonus_claimed")
      .map((e: TierEvent) => `${e.eventType}:${e.path ?? "_"}`),
  );

  // 2. Load declared paths so we only check criteria for paths the user
  // has entered. Avoids spurious "earned Steward on a path you never
  // declared" events.
  const paths: PlayerPath[] = await db
    .select()
    .from(playerPaths)
    .where(eq(playerPaths.userId, userId));
  const declared: TierPath[] = paths
    .map((p: PlayerPath) => p.path)
    .filter(isTierPath);

  // 3. Co-Creator checks per declared path.
  for (const path of declared) {
    const key = `co_creator_earned:${path}`;
    if (alreadyFired.has(key)) continue;

    const result = await checkCoCreator(userId, path);
    if (result.met) {
      await fireTierEvent(userId, "co_creator_earned", path, TIER_BONUS.co_creator, result);
      earnedTiers.push({ path, eventType: "co_creator_earned", amount: TIER_BONUS.co_creator });
    }
  }

  // 4. Steward checks. Only check paths where Co-Creator has already
  // been earned (you can't reach Steward without Co-Creator).
  const coCreatorPathList: TierPath[] = [
    ...existing
      .filter((e: TierEvent) => e.eventType === "co_creator_earned")
      .map((e: TierEvent) => e.path),
    ...earnedTiers
      .filter((e) => e.eventType === "co_creator_earned")
      .map((e) => e.path),
  ].filter(isTierPath);
  const coCreatorPaths = new Set<TierPath>(coCreatorPathList);

  for (const path of coCreatorPaths) {
    const key = `steward_earned:${path}`;
    if (alreadyFired.has(key)) continue;

    const result = await checkSteward(userId, path);
    if (result.met) {
      await fireTierEvent(userId, "steward_earned", path, TIER_BONUS.steward, result);
      earnedTiers.push({ path, eventType: "steward_earned", amount: TIER_BONUS.steward });
    }
  }

  // 5. Sage check. Cross-path; requires at least one Steward earned.
  const hasSteward =
    existing.some((e: TierEvent) => e.eventType === "steward_earned") ||
    earnedTiers.some((e) => e.eventType === "steward_earned");
  const sageKey = "sage_earned:_";
  if (hasSteward && !alreadyFired.has(sageKey)) {
    const result = await checkSage(userId);
    if (result.met) {
      await fireTierEvent(userId, "sage_earned", null, TIER_BONUS.sage, result);
      earnedTiers.push({ path: null, eventType: "sage_earned", amount: TIER_BONUS.sage });
    }
  }

  return { earnedTiers };
}

/**
 * Insert a tier_events row, update player_paths, credit the RGVoice
 * bonus. Wrapped so per-criterion code stays focused on the check.
 */
async function fireTierEvent(
  userId: number,
  eventType: TierEventType,
  path: TierPath | null,
  amount: number,
  criterion: CriterionResult,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 1. Audit row.
  const insertResult = await db.insert(tierEvents).values({
    userId,
    eventType,
    path: path ?? null,
    amountCredited: amount,
    details: {
      note: criterion.note ?? null,
      evidence: criterion.evidence ?? null,
    },
  });
  const eventId = (insertResult as { insertId?: number } | undefined)?.insertId ?? null;

  // 2. Update player_paths (only for path-specific tiers).
  if (path !== null && eventType !== "sage_earned") {
    const column = eventType === "co_creator_earned" ? "coCreatorEarnedAt" : "stewardEarnedAt";
    await db.execute(sql`
      UPDATE player_paths
      SET ${sql.identifier(column)} = NOW()
      WHERE userId = ${userId} AND path = ${path}
    `);
  }

  // 3. Credit the RGVoice bonus to private ledger.
  const sourceTag =
    eventType === "co_creator_earned"
      ? "tier_bonus_co_creator"
      : eventType === "steward_earned"
        ? "tier_bonus_steward"
        : "tier_bonus_sage";

  await creditPrivateTokens({
    userId,
    tokenType: "rgvoice",
    amount,
    source: sourceTag,
    sourceId: eventId,
    sourceRef: path ?? "cross_path",
    description:
      eventType === "sage_earned"
        ? `Sage tier earned across all paths`
        : `${eventType === "co_creator_earned" ? "Co-Creator" : "Steward"} tier earned on ${path} path`,
  });
}

// ---------------------------------------------------------------------------
// Per-path criterion checks. Each returns CriterionResult.
// ---------------------------------------------------------------------------

async function checkCoCreator(userId: number, path: TierPath): Promise<CriterionResult> {
  switch (path) {
    case "player":
      return checkPlayerCoCreator(userId);
    case "investor":
      return checkInvestorCoCreator(userId);
    case "land_project":
      return checkLandProjectCoCreator(userId);
    case "ally":
      return checkAllyCoCreator(userId);
  }
}

async function checkSteward(userId: number, path: TierPath): Promise<CriterionResult> {
  switch (path) {
    case "player":
      return checkPlayerSteward(userId);
    case "investor":
      return checkInvestorSteward(userId);
    case "land_project":
      return checkLandProjectSteward(userId);
    case "ally":
      return checkAllySteward(userId);
  }
}

// ---------------------------------------------------------------------------
// ReGen Player path: data exists, fully implemented.
// ---------------------------------------------------------------------------

async function checkPlayerCoCreator(userId: number): Promise<CriterionResult> {
  const db = await getDb();
  if (!db) return { met: false };

  // questCompletions.questId is a varchar like "quest-0". Filter to the
  // ones that match a Rite (Quest 0 through Quest 13) via the helper.
  const rows = await db
    .select({ questId: questCompletions.questId })
    .from(questCompletions)
    .where(eq(questCompletions.userId, userId));

  const completedRiteIds = new Set<string>(
    rows
      .map((r: { questId: string | null }) => r.questId)
      .filter((id: string | null): id is string => typeof id === "string" && isRiteOfPassage(id)),
  );

  return {
    met: completedRiteIds.size >= RITES_OF_PASSAGE_COUNT,
    note: `Rites completed: ${completedRiteIds.size} of ${RITES_OF_PASSAGE_COUNT}`,
    evidence: { completedRiteIds: Array.from(completedRiteIds).sort() },
  };
}

async function checkPlayerSteward(userId: number): Promise<CriterionResult> {
  const db = await getDb();
  if (!db) return { met: false };

  // Count all distinct quest completions (every pool counts).
  const questRows = await db
    .select({ questId: questCompletions.questId })
    .from(questCompletions)
    .where(eq(questCompletions.userId, userId));
  const distinctQuests = new Set<string>(
    questRows
      .map((r: { questId: string | null }) => r.questId)
      .filter((q: string | null): q is string => q !== null),
  ).size;

  // Count proposal votes.
  const voteRows = await db
    .select({ id: proposalVotes.id })
    .from(proposalVotes)
    .where(eq(proposalVotes.userId, userId));
  const voteCount = voteRows.length;

  const met =
    distinctQuests >= PLAYER_STEWARD_QUEST_COUNT && voteCount >= PLAYER_STEWARD_VOTE_COUNT;

  return {
    met,
    note: `Quests: ${distinctQuests}/${PLAYER_STEWARD_QUEST_COUNT}, Votes: ${voteCount}/${PLAYER_STEWARD_VOTE_COUNT}`,
    evidence: { distinctQuests, voteCount },
  };
}

// ---------------------------------------------------------------------------
// Investor path: LOI table exists, implemented.
// ---------------------------------------------------------------------------

async function checkInvestorCoCreator(userId: number): Promise<CriterionResult> {
  const db = await getDb();
  if (!db) return { met: false };

  // LOI signed = status is 'confirmed' or 'converted'.
  const rows = await db
    .select({ id: letterOfIntent.id, status: letterOfIntent.status })
    .from(letterOfIntent)
    .where(eq(letterOfIntent.userId, userId));

  type LoiRow = { id: number; status: string };
  const signed = rows.some((r: LoiRow) => r.status === "confirmed" || r.status === "converted");

  return {
    met: signed,
    note: signed ? "LOI signed" : "LOI not yet signed",
    evidence: { loiCount: rows.length, statuses: rows.map((r: LoiRow) => r.status) },
  };
}

async function checkInvestorSteward(userId: number): Promise<CriterionResult> {
  const db = await getDb();
  if (!db) return { met: false };

  // Investment sent = LOI status is 'converted' (means an actual
  // investment landed and the LOI became a real commitment).
  const rows = await db
    .select({ status: letterOfIntent.status })
    .from(letterOfIntent)
    .where(eq(letterOfIntent.userId, userId));
  const investmentSent = rows.some((r: { status: string }) => r.status === "converted");

  // Fund vote: TODO. We need to know which proposals are Fund-scoped
  // (vs. game proposals) once that classification exists. For now,
  // approximate as "any proposal vote" so the criterion is checkable.
  // Replace this with a proper Fund-scoped filter when the schema gains
  // a proposal.scope or proposal.tenant filter.
  const voteRows = await db
    .select({ id: proposalVotes.id })
    .from(proposalVotes)
    .where(eq(proposalVotes.userId, userId));
  const fundVoteCast = voteRows.length > 0;

  const met = investmentSent && fundVoteCast;

  return {
    met,
    note: `Investment: ${investmentSent}, Fund vote: ${fundVoteCast}`,
    evidence: { investmentSent, voteCount: voteRows.length },
  };
}

// ---------------------------------------------------------------------------
// Land Project path: applications table exists, implemented.
// ---------------------------------------------------------------------------

async function checkLandProjectCoCreator(userId: number): Promise<CriterionResult> {
  const db = await getDb();
  if (!db) return { met: false };

  const rows = await db
    .select({ id: applications.id, status: applications.status })
    .from(applications)
    .where(eq(applications.userId, userId));

  type AppRow = { id: number; status: string };
  const approved = rows.some((r: AppRow) => r.status === "approved" || r.status === "active");

  return {
    met: approved,
    note: approved ? "Application approved" : "Application not yet approved",
    evidence: { applicationCount: rows.length, statuses: rows.map((r: AppRow) => r.status) },
  };
}

async function checkLandProjectSteward(_userId: number): Promise<CriterionResult> {
  // TODO: requires "completed a season of the Game Co-Creation Journey"
  // tracking + "successfully launched a Game for their community"
  // tracking. Neither has a dedicated table yet. Likely needs:
  //   - applications.seasonsCompleted: int field, or
  //   - a new land_project_seasons table with status enum
  //   - a new land_project_games table tracking launched community games
  // Stubbed until that schema lands. Always returns met=false so the
  // detector is a no-op for this criterion, not a false positive.
  return {
    met: false,
    note: "Land Project Steward criterion not yet implementable (schema gaps)",
  };
}

// ---------------------------------------------------------------------------
// Alliance Partner path: partial implementation.
// ---------------------------------------------------------------------------

async function checkAllyCoCreator(_userId: number): Promise<CriterionResult> {
  // TODO: requires "submitted a tool that >11 people use" via
  // regenTools + regenToolClicks (or a per-user usage table) AND/OR
  // "joined the alliance via approved proposal" via proposals with
  // intent='ally_join' or similar tag. Both criteria need a clean
  // attribution path back to the submitting user, which the current
  // schema partially supports but not without further design.
  // Stubbed until the alliance proposal type lands.
  return {
    met: false,
    note: "Alliance Co-Creator criterion not yet implementable (schema gaps)",
  };
}

async function checkAllySteward(_userId: number): Promise<CriterionResult> {
  // TODO: requires "conducted resource swap AND token swap with
  // ReGen Civics" tracking. Both swap types likely live in proposals
  // or a dedicated swap log once introduced. Stubbed.
  return {
    met: false,
    note: "Alliance Steward criterion not yet implementable (schema gaps)",
  };
}

// ---------------------------------------------------------------------------
// Sage: cross-path contribution percentile.
// ---------------------------------------------------------------------------

async function checkSage(_userId: number): Promise<CriterionResult> {
  // TODO: requires daily contribution score snapshots + a sliding
  // window of the current season's days. Per spec section 3.4 + open
  // question #5 (resolved): user's daily contribution score must rank
  // in the top 80th percentile for at least 80% of season days.
  //
  // Implementation needs:
  //   - daily_contribution_snapshots table (userId, snapshotDate, score, rank, percentile)
  //   - a "current season" helper (existing seasons table or computed)
  //   - aggregate query: count days where percentile >= 80, divide by total season days
  // Stubbed until the snapshots table exists.
  return {
    met: false,
    note: "Sage criterion not yet implementable (no daily snapshot table)",
  };
}

// ---------------------------------------------------------------------------
// Bulk runner used by the cron.
// ---------------------------------------------------------------------------

/**
 * Walk every user with at least one declared path and run the detector.
 * Called by scripts/cron/detect-tier-progression.ts.
 */
export async function detectTierProgressionForAllUsers(): Promise<{
  scanned: number;
  earned: number;
}> {
  const db = await getDb();
  if (!db) return { scanned: 0, earned: 0 };

  const userRows = await db
    .selectDistinct({ userId: playerPaths.userId })
    .from(playerPaths);

  let earned = 0;
  for (const row of userRows as Array<{ userId: number | null }>) {
    const userId = row.userId;
    if (userId == null) continue;
    try {
      const result = await detectTierProgression(userId);
      earned += result.earnedTiers.length;
    } catch (err) {
      console.error(`[tierDetector] user ${userId} failed`, err);
    }
  }

  return { scanned: userRows.length, earned };
}
