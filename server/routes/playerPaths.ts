/**
 * Player Paths router.
 *
 * Phase 2 of QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md.
 *
 * Exposes the per-path tier progression state to the Profile UI:
 *   - getMyPaths: returns each declared path with its current tier
 *     state (explorer / co_creator_earned / co_creator_claimed /
 *     steward_earned / steward_claimed) plus a checklist of remaining
 *     criteria. Drives the Your Paths section of the Profile Quests
 *     tab.
 *   - declarePath: explicit Add a Path button, lets a player join a
 *     path that wasn't auto-declared by a soft trigger.
 *
 * Tier bonus claims reuse the existing playerProfiles.requestClaim
 * mutation. The Profile UI calls that with tokens: ['rgvoice'] when
 * the path block is in the "earned, unclaimed" state.
 */

import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
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
import { declarePath as declarePathHelper, type TierPath } from "../lib/tierDetector";
import {
  RITES_OF_PASSAGE_COUNT,
  PLAYER_STEWARD_QUEST_COUNT,
  PLAYER_STEWARD_VOTE_COUNT,
  TIER_BONUS,
  isRiteOfPassage,
} from "@shared/questPools";

const PATH_VALUES = ["investor", "land_project", "ally", "player"] as const;
const PathSchema = z.enum(PATH_VALUES);

/**
 * One step in the per-path criterion checklist surfaced to the UI.
 * Each step has a label, whether it's done, and an optional CTA route.
 */
interface PathCriterionStep {
  label: string;
  done: boolean;
  /** Wouter route for the action button. Omit if no in-app target. */
  actionRoute?: string;
  /** Visible button label when not done. */
  actionLabel?: string;
}

/**
 * Per-path block state surfaced to Profile UI. The UI renders one of
 * three visual states from this:
 *   tier === 'explorer' && !readyToClaim    → checklist (State A)
 *   readyToClaim === true                   → big Claim button (State B)
 *   tier === 'co_creator_claimed' or above  → calm earned banner (State C)
 */
export interface PathBlockState {
  path: TierPath;
  declaredAt: string;
  /** Highest tier this path has earned. */
  tier:
    | "explorer"
    | "co_creator_earned"
    | "co_creator_claimed"
    | "steward_earned"
    | "steward_claimed";
  /** RGVoice bonus waiting to be claimed on Hypha (77, 144, or 0). */
  unclaimedBonusAmount: number;
  /** Co-Creator checklist. Empty once the tier is past Co-Creator. */
  coCreatorSteps: PathCriterionStep[];
  /** Steward checklist. Empty until Co-Creator is earned. */
  stewardSteps: PathCriterionStep[];
  coCreatorEarnedAt: string | null;
  stewardEarnedAt: string | null;
}

export const playerPathsRouter = router({
  /**
   * Return the calling user's paths with full UI state per path.
   * Empty array if the user has no declared paths yet (the UI shows
   * the Add a Path button alone in that case).
   */
  getMyPaths: protectedProcedure.query(async ({ ctx }): Promise<PathBlockState[]> => {
    const db = await getDb();
    if (!db) return [];

    const userId = ctx.user.id;

    const paths: PlayerPath[] = await db
      .select()
      .from(playerPaths)
      .where(eq(playerPaths.userId, userId));

    if (paths.length === 0) return [];

    // Pre-load shared facts once. Per-path criteria pull from these.
    const tierRows: TierEvent[] = await db
      .select()
      .from(tierEvents)
      .where(eq(tierEvents.userId, userId));
    const completedQuests = await db
      .select({ questId: questCompletions.questId })
      .from(questCompletions)
      .where(eq(questCompletions.userId, userId));
    const loiRows = await db
      .select({ status: letterOfIntent.status })
      .from(letterOfIntent)
      .where(eq(letterOfIntent.userId, userId));
    const appRows = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.userId, userId));
    const voteRows = await db
      .select({ id: proposalVotes.id })
      .from(proposalVotes)
      .where(eq(proposalVotes.userId, userId));

    // Derived counts.
    const ritesCompleted = new Set<string>(
      completedQuests
        .map((r: { questId: string | null }) => r.questId)
        .filter((id: string | null): id is string => typeof id === "string" && isRiteOfPassage(id)),
    ).size;
    const distinctQuestCount = new Set<string>(
      completedQuests
        .map((r: { questId: string | null }) => r.questId)
        .filter((q: string | null): q is string => q !== null),
    ).size;
    const voteCount = voteRows.length;
    const loiSigned = loiRows.some((r: { status: string }) => r.status === "confirmed" || r.status === "converted");
    const investmentSent = loiRows.some((r: { status: string }) => r.status === "converted");
    const fundVoteCast = voteCount > 0; // approximation, see tierDetector
    const appApproved = appRows.some((r: { status: string }) => r.status === "approved" || r.status === "active");

    // Lookup tier-event status per path. Use a Map rather than nested loops.
    const tierStatus = new Map<
      string,
      {
        coCreatorEarned: boolean;
        stewardEarned: boolean;
        coCreatorClaimed: boolean;
        stewardClaimed: boolean;
      }
    >();
    for (const path of PATH_VALUES) {
      const events = tierRows.filter((e: TierEvent) => e.path === path);
      tierStatus.set(path, {
        coCreatorEarned: events.some((e: TierEvent) => e.eventType === "co_creator_earned"),
        stewardEarned: events.some((e: TierEvent) => e.eventType === "steward_earned"),
        // Bonus-claimed flag lives on player_paths.coCreatorBonusClaimedAt etc.
        coCreatorClaimed: false,
        stewardClaimed: false,
      });
    }

    return paths.map((row: PlayerPath): PathBlockState => {
      const path = row.path as TierPath;
      const status = tierStatus.get(path) ?? {
        coCreatorEarned: false,
        stewardEarned: false,
        coCreatorClaimed: false,
        stewardClaimed: false,
      };
      const coCreatorClaimed = row.coCreatorBonusClaimedAt !== null;
      const stewardClaimed = row.stewardBonusClaimedAt !== null;

      // Tier label (highest reached state).
      let tier: PathBlockState["tier"] = "explorer";
      if (status.stewardEarned && stewardClaimed) tier = "steward_claimed";
      else if (status.stewardEarned) tier = "steward_earned";
      else if (status.coCreatorEarned && coCreatorClaimed) tier = "co_creator_claimed";
      else if (status.coCreatorEarned) tier = "co_creator_earned";

      // Outstanding bonus amount waiting for the player to claim.
      let unclaimedBonusAmount = 0;
      if (status.stewardEarned && !stewardClaimed) unclaimedBonusAmount = TIER_BONUS.steward;
      else if (status.coCreatorEarned && !coCreatorClaimed) unclaimedBonusAmount = TIER_BONUS.co_creator;

      // Build the checklists. Only show Co-Creator steps if not yet
      // earned; only show Steward steps if Co-Creator earned but
      // Steward not yet earned.
      const coCreatorSteps: PathCriterionStep[] = status.coCreatorEarned
        ? []
        : buildCoCreatorSteps(path, {
            ritesCompleted,
            loiSigned,
            appApproved,
          });
      const stewardSteps: PathCriterionStep[] = !status.coCreatorEarned || status.stewardEarned
        ? []
        : buildStewardSteps(path, {
            distinctQuestCount,
            voteCount,
            investmentSent,
            fundVoteCast,
          });

      return {
        path,
        declaredAt: row.declaredAt instanceof Date ? row.declaredAt.toISOString() : String(row.declaredAt),
        tier,
        unclaimedBonusAmount,
        coCreatorSteps,
        stewardSteps,
        coCreatorEarnedAt: row.coCreatorEarnedAt instanceof Date ? row.coCreatorEarnedAt.toISOString() : null,
        stewardEarnedAt: row.stewardEarnedAt instanceof Date ? row.stewardEarnedAt.toISOString() : null,
      };
    });
  }),

  /**
   * Explicitly declare a path. Idempotent. Used by the Add a Path
   * button in the Profile.
   */
  declarePath: protectedProcedure
    .input(z.object({ path: PathSchema }))
    .mutation(async ({ ctx, input }) => {
      await declarePathHelper(ctx.user.id, input.path);
      return { ok: true };
    }),

  /**
   * Admin-only manual override to flip the bonus-claimed flag for a
   * given user / path / tier. The normal flow is automatic: the Hypha
   * Alchemy webhook (server/lib/hypha-bridge/webhook-receiver.ts,
   * cascadeClaimPassed) flips the flags on RGVoice claim confirmation.
   * This procedure exists as a fallback for the rare case where the
   * webhook missed an event and an admin needs to reconcile.
   *
   * Restricted to adminProcedure because letting a regular user
   * self-flip this would lose audit accuracy: the timestamp would no
   * longer reflect the on-chain confirmation time.
   */
  markBonusClaimed: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        path: PathSchema,
        tier: z.enum(["co_creator", "steward"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      const column =
        input.tier === "co_creator" ? "coCreatorBonusClaimedAt" : "stewardBonusClaimedAt";
      await db.execute(sql`
        UPDATE player_paths
        SET ${sql.identifier(column)} = NOW()
        WHERE userId = ${input.userId} AND path = ${input.path}
      `);
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Checklist builders. Per spec section 8.2.
// ---------------------------------------------------------------------------

function buildCoCreatorSteps(
  path: TierPath,
  facts: { ritesCompleted: number; loiSigned: boolean; appApproved: boolean },
): PathCriterionStep[] {
  switch (path) {
    case "player":
      return [
        {
          label: `Complete the 14 Rites of Passage (${facts.ritesCompleted}/${RITES_OF_PASSAGE_COUNT})`,
          done: facts.ritesCompleted >= RITES_OF_PASSAGE_COUNT,
          actionRoute: "/quest",
          actionLabel: "View Rites",
        },
      ];
    case "investor":
      return [
        {
          label: "Sign the LOI",
          done: facts.loiSigned,
          actionRoute: "/loi",
          actionLabel: "Sign LOI",
        },
      ];
    case "land_project":
      return [
        {
          label: "Submit a project application and get approved",
          done: facts.appApproved,
          actionRoute: "/apply",
          actionLabel: "Open application",
        },
      ];
    case "ally":
      return [
        {
          label: "Submit a tool that 11+ people use, OR join the alliance via approved proposal",
          done: false, // schema gap, see tierDetector.checkAllyCoCreator
          actionRoute: "/tools/submit",
          actionLabel: "Submit a tool",
        },
      ];
  }
}

function buildStewardSteps(
  path: TierPath,
  facts: {
    distinctQuestCount: number;
    voteCount: number;
    investmentSent: boolean;
    fundVoteCast: boolean;
  },
): PathCriterionStep[] {
  switch (path) {
    case "player":
      return [
        {
          label: `Complete ${PLAYER_STEWARD_QUEST_COUNT} quests (${facts.distinctQuestCount}/${PLAYER_STEWARD_QUEST_COUNT})`,
          done: facts.distinctQuestCount >= PLAYER_STEWARD_QUEST_COUNT,
          actionRoute: "/quest",
          actionLabel: "More quests",
        },
        {
          label: `Vote on ${PLAYER_STEWARD_VOTE_COUNT} proposals (${facts.voteCount}/${PLAYER_STEWARD_VOTE_COUNT})`,
          done: facts.voteCount >= PLAYER_STEWARD_VOTE_COUNT,
          actionRoute: "/governance",
          actionLabel: "View proposals",
        },
      ];
    case "investor":
      return [
        {
          label: "Send an investment",
          done: facts.investmentSent,
          actionRoute: "/opportunity",
          actionLabel: "View opportunity",
        },
        {
          label: "Vote in a Fund decision",
          done: facts.fundVoteCast,
          actionRoute: "/governance",
          actionLabel: "View Fund decisions",
        },
      ];
    case "land_project":
      return [
        {
          label: "Complete a season of the Game Co-Creation Journey",
          done: false, // schema gap
        },
        {
          label: "Successfully launch a Game for your community",
          done: false, // schema gap
        },
      ];
    case "ally":
      return [
        {
          label: "Conduct a resource swap with ReGen Civics",
          done: false, // schema gap
        },
        {
          label: "Conduct a token swap with ReGen Civics",
          done: false, // schema gap
        },
      ];
  }
}
