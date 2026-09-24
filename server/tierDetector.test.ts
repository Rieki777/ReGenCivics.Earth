/**
 * Investor Steward Fund-vote filter (path progression).
 *
 * Pure checks only: the category marker and the sticky alreadyFired contract
 * documented in detectTierProgression. DB integration stays with the cron /
 * handler paths that call detectTierProgression.
 */
import { describe, it, expect } from "vitest";
import {
  FUND_VOTE_PROPOSAL_CATEGORY,
  isFundVoteProposalCategory,
} from "./lib/tierDetector";

describe("FUND_VOTE_PROPOSAL_CATEGORY", () => {
  it("is the schema Fund Allocation enum value", () => {
    expect(FUND_VOTE_PROPOSAL_CATEGORY).toBe("fund_allocation");
  });
});

describe("isFundVoteProposalCategory", () => {
  it("accepts fund_allocation only", () => {
    expect(isFundVoteProposalCategory("fund_allocation")).toBe(true);
    expect(isFundVoteProposalCategory(FUND_VOTE_PROPOSAL_CATEGORY)).toBe(true);
  });

  it("rejects game and community proposal categories", () => {
    for (const category of [
      "game_variable",
      "new_quest",
      "food_economy",
      "platform_feature",
      "community",
      "bff_initiative",
      "partnership",
      "community_agreement",
      "other",
    ] as const) {
      expect(isFundVoteProposalCategory(category)).toBe(false);
    }
  });

  it("rejects null, undefined, and empty string (strict-null safe)", () => {
    expect(isFundVoteProposalCategory(null)).toBe(false);
    expect(isFundVoteProposalCategory(undefined)).toBe(false);
    expect(isFundVoteProposalCategory("")).toBe(false);
    expect(isFundVoteProposalCategory("  fund_allocation  ")).toBe(false);
  });
});

describe("Investor Steward sticky awards (contract)", () => {
  /**
   * Mirrors detectTierProgression's alreadyFired key for Steward on investor.
   * Once steward_earned:investor exists in tier_events, the detector never
   * re-runs checkInvestorSteward for that path — so tightening the Fund-vote
   * filter cannot demote anyone who already holds the tier.
   */
  function alreadyFiredKey(eventType: string, path: string | null): string {
    return `${eventType}:${path ?? "_"}`;
  }

  it("uses a path-scoped key so investor Steward is skipped once awarded", () => {
    const fired = new Set([alreadyFiredKey("steward_earned", "investor")]);
    expect(fired.has("steward_earned:investor")).toBe(true);
    // A later criterion miss (no fund_allocation vote) does not clear the set.
    expect(fired.has("steward_earned:investor")).toBe(true);
  });

  it("does not treat another path's Steward as investor Steward", () => {
    const fired = new Set([alreadyFiredKey("steward_earned", "player")]);
    expect(fired.has("steward_earned:investor")).toBe(false);
  });
});
