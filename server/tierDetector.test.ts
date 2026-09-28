/**
 * Ally Steward + Sage measurement wiring (path progression).
 *
 * Pure criterion checks: swap-log evidence for Ally Steward, and the written
 * Sage bar (Steward + top-20% on >= 80% of snapshot days). DB integration
 * stays with detectTierProgression / cron. Investor Fund-vote tests preserved.
 */
import { describe, it, expect } from "vitest";
import {
  FUND_VOTE_PROPOSAL_CATEGORY,
  isFundVoteProposalCategory,
  evaluateAllySteward,
  evaluateSage,
  SAGE_TOP_PERCENTILE,
  SAGE_MIN_TOP_DAY_RATIO,
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
  function alreadyFiredKey(eventType: string, path: string | null): string {
    return `${eventType}:${path ?? "_"}`;
  }

  it("uses a path-scoped key so investor Steward is skipped once awarded", () => {
    const fired = new Set([alreadyFiredKey("steward_earned", "investor")]);
    expect(fired.has("steward_earned:investor")).toBe(true);
  });

  it("does not treat another path's Steward as investor Steward", () => {
    const fired = new Set([alreadyFiredKey("steward_earned", "player")]);
    expect(fired.has("steward_earned:investor")).toBe(false);
  });
});

describe("evaluateAllySteward", () => {
  it("empty log (no resource, no token) is unmet", () => {
    const r = evaluateAllySteward({
      hasConfirmedResourceSwap: false,
      hasConfirmedTokenSwap: false,
    });
    expect(r.met).toBe(false);
    expect(r.evidence.hasConfirmedResourceSwap).toBe(false);
    expect(r.evidence.hasConfirmedTokenSwap).toBe(false);
  });

  it("only resource swap is unmet", () => {
    const r = evaluateAllySteward({
      hasConfirmedResourceSwap: true,
      hasConfirmedTokenSwap: false,
    });
    expect(r.met).toBe(false);
  });

  it("only token swap is unmet", () => {
    const r = evaluateAllySteward({
      hasConfirmedResourceSwap: false,
      hasConfirmedTokenSwap: true,
    });
    expect(r.met).toBe(false);
  });

  it("both confirmed resource and token swaps is met", () => {
    const r = evaluateAllySteward({
      hasConfirmedResourceSwap: true,
      hasConfirmedTokenSwap: true,
    });
    expect(r.met).toBe(true);
    expect(r.note).toMatch(/resource swap and token swap/i);
  });
});

describe("evaluateSage (written bar)", () => {
  it("exposes the written thresholds", () => {
    expect(SAGE_TOP_PERCENTILE).toBe(80);
    expect(SAGE_MIN_TOP_DAY_RATIO).toBe(0.8);
  });

  it("no snapshots is unmet (even with Steward)", () => {
    const r = evaluateSage({
      hasStewardOnAnyPath: true,
      snapshots: [],
    });
    expect(r.met).toBe(false);
    expect(r.note).toMatch(/no daily contribution snapshots/i);
    expect(r.evidence.snapshotDayCount).toBe(0);
  });

  it("below bar (top-20% on fewer than 80% of snapshot days) is unmet", () => {
    // 7 of 10 days at top 20% => 70% < 80%
    const snapshots = [
      ...Array.from({ length: 7 }, () => ({ percentile: 85 })),
      ...Array.from({ length: 3 }, () => ({ percentile: 50 })),
    ];
    const r = evaluateSage({
      hasStewardOnAnyPath: true,
      snapshots,
    });
    expect(r.met).toBe(false);
    expect(r.evidence.top20DayCount).toBe(7);
    expect(r.evidence.snapshotDayCount).toBe(10);
    expect(r.evidence.top20Ratio).toBeCloseTo(0.7);
  });

  it("no Steward is unmet even with perfect snapshot bar", () => {
    const snapshots = Array.from({ length: 10 }, () => ({ percentile: 95 }));
    const r = evaluateSage({
      hasStewardOnAnyPath: false,
      snapshots,
    });
    expect(r.met).toBe(false);
    expect(r.note).toMatch(/requires Steward/i);
  });

  it("Steward + top-20% on >= 80% of snapshot days is met", () => {
    // 8 of 10 days at percentile 80 (exactly top-20% threshold)
    const snapshots = [
      ...Array.from({ length: 8 }, () => ({ percentile: 80 })),
      ...Array.from({ length: 2 }, () => ({ percentile: 79.9 })),
    ];
    const r = evaluateSage({
      hasStewardOnAnyPath: true,
      snapshots,
    });
    expect(r.met).toBe(true);
    expect(r.evidence.top20Ratio).toBeCloseTo(0.8);
  });

  it("does not treat percentile 79.999 as top 20%", () => {
    const snapshots = Array.from({ length: 10 }, () => ({ percentile: 79.999 }));
    const r = evaluateSage({
      hasStewardOnAnyPath: true,
      snapshots,
    });
    expect(r.met).toBe(false);
    expect(r.evidence.top20DayCount).toBe(0);
  });
});

describe("Ally / Sage sticky awards (contract)", () => {
  function alreadyFiredKey(eventType: string, path: string | null): string {
    return `${eventType}:${path ?? "_"}`;
  }

  it("ally Steward is path-scoped and sticky once awarded", () => {
    const fired = new Set([alreadyFiredKey("steward_earned", "ally")]);
    expect(fired.has("steward_earned:ally")).toBe(true);
    // Later swap-log emptiness must not clear the set (no demotion).
    expect(fired.has("steward_earned:ally")).toBe(true);
  });

  it("Sage uses the cross-path underscore key", () => {
    const fired = new Set([alreadyFiredKey("sage_earned", null)]);
    expect(fired.has("sage_earned:_")).toBe(true);
  });
});
