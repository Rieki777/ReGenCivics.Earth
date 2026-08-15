import { describe, expect, it } from "vitest";
import {
  buildGameMechanicsSnapshot,
  MECHANICS_VARIABLE_FALLBACKS,
  MECHANICS_VARIABLE_KEYS,
} from "@shared/gameMechanics";
import {
  TIER_BONUS,
  RITES_OF_PASSAGE_COUNT,
  PLAYER_STEWARD_QUEST_COUNT,
  PLAYER_STEWARD_VOTE_COUNT,
} from "@shared/questPools";
import { DEFAULT_WEIGHTS, DEFAULT_LEARNING } from "./db/bountyValuation";
import { DEFAULT_FAST_CLAIM_DAYS, DEFAULT_MIN_SAMPLE } from "./jobs/coordinationFlywheel";

describe("buildGameMechanicsSnapshot", () => {
  it("prefers live values over fallbacks", () => {
    const snap = buildGameMechanicsSnapshot(
      {
        "governance.claim_threshold_regen": 1234,
        "citizenship.sage.min_percentile": 90,
        "gratitude.budget_multiplier.steward": 4.0,
        "governance.last_call_hours": 96,
        "paths.tier_bonus.sage": 500,
      },
      1000,
    );
    expect(snap.claims.thresholds.regen).toBe(1234);
    expect(snap.citizenship.tiers.sage.minPercentile).toBe(90);
    expect(snap.citizenship.tiers.steward.gratitudeMultiplier).toBe(4.0);
    expect(snap.variables["governance.last_call_hours"]).toBe(96);
    expect(snap.quests.tierBonus.sage).toBe(500);
    expect(snap.meta.generatedAt).toBe(1000);
  });

  it("falls back to seeded defaults when a key is missing", () => {
    const snap = buildGameMechanicsSnapshot({}, 0);
    // Sage percentile fallback is the real engine value (90), NOT the stale
    // 80 the page used to hardcode.
    expect(snap.citizenship.tiers.sage.minPercentile).toBe(90);
    expect(snap.claims.thresholds.regen).toBe(1000);
    expect(snap.harvest.split.contributors).toBe(30);
    expect(snap.bounties.roundTo).toBe(25);
    // Tier gratitude multipliers come from the ADR-30 budget engine keys
    // (2/3/5), not the legacy trust-graph 1.2/1.5/2.0 no engine reads.
    expect(snap.citizenship.tiers.coCreator.gratitudeMultiplier).toBe(2.0);
    expect(snap.citizenship.tiers.sage.gratitudeMultiplier).toBe(5.0);
    // The live gratitude economy is on the snapshot.
    expect(snap.gratitudeEconomy.poolPerCycle).toBe(10000);
    expect(snap.gratitudeEconomy.maxPayoutPerPerson).toBe(1000);
  });

  it("sources structural constants, and live-backs the promoted path numbers", () => {
    const snap = buildGameMechanicsSnapshot({}, 0);
    expect(snap.quests.ritesOfPassageCount).toBe(RITES_OF_PASSAGE_COUNT);
    // Tier bonuses and steward thresholds are registry-backed now, with the
    // questPools constants as their fallbacks.
    expect(snap.quests.tierBonus.sage).toBe(TIER_BONUS.sage);
    expect(snap.quests.stewardQuestCount).toBe(PLAYER_STEWARD_QUEST_COUNT);
    expect(snap.quests.stewardVoteCount).toBe(PLAYER_STEWARD_VOTE_COUNT);
  });

  it("every declared key has a fallback, and the variables map is exhaustive", () => {
    for (const key of MECHANICS_VARIABLE_KEYS) {
      expect(MECHANICS_VARIABLE_FALLBACKS[key]).toBeTypeOf("number");
    }
    const snap = buildGameMechanicsSnapshot({}, 0);
    expect(Object.keys(snap.variables).sort()).toEqual([...MECHANICS_VARIABLE_KEYS].sort());
  });

  // The REAL parity checks: the snapshot fallbacks must equal the server-side
  // default constants the engines fall back on. If either side drifts, the
  // public page shows numbers the engine does not use.
  it("bounty valuation fallbacks match the engine defaults", () => {
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.tier.trivial.base"]).toBe(DEFAULT_WEIGHTS.base.trivial);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.tier.small.base"]).toBe(DEFAULT_WEIGHTS.base.small);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.tier.medium.base"]).toBe(DEFAULT_WEIGHTS.base.medium);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.tier.large.base"]).toBe(DEFAULT_WEIGHTS.base.large);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.impact.low"]).toBe(DEFAULT_WEIGHTS.impact.low);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.impact.normal"]).toBe(DEFAULT_WEIGHTS.impact.normal);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.impact.high"]).toBe(DEFAULT_WEIGHTS.impact.high);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.priority.boost"]).toBe(DEFAULT_WEIGHTS.priorityBoost);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.anchor.weight"]).toBe(DEFAULT_WEIGHTS.anchorWeight);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.max"]).toBe(DEFAULT_WEIGHTS.max);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.round_to"]).toBe(DEFAULT_WEIGHTS.roundTo);
  });

  it("bounty learning fallbacks match the engine defaults", () => {
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.window_days"]).toBe(DEFAULT_LEARNING.windowDays);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.unclaimed_days"]).toBe(DEFAULT_LEARNING.unclaimedDays);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.raise_sensitivity"]).toBe(DEFAULT_LEARNING.raiseSensitivity);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.lower_sensitivity"]).toBe(DEFAULT_LEARNING.lowerSensitivity);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.factor_min"]).toBe(DEFAULT_LEARNING.factorMin);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.factor_max"]).toBe(DEFAULT_LEARNING.factorMax);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.fast_claim_days"]).toBe(DEFAULT_FAST_CLAIM_DAYS);
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.learning.min_sample"]).toBe(DEFAULT_MIN_SAMPLE);
  });

  it("path-tier fallbacks match the shared constants the detector falls back on", () => {
    expect(MECHANICS_VARIABLE_FALLBACKS["paths.player.steward.quest_count"]).toBe(PLAYER_STEWARD_QUEST_COUNT);
    expect(MECHANICS_VARIABLE_FALLBACKS["paths.player.steward.vote_count"]).toBe(PLAYER_STEWARD_VOTE_COUNT);
    expect(MECHANICS_VARIABLE_FALLBACKS["paths.tier_bonus.co_creator"]).toBe(TIER_BONUS.co_creator);
    expect(MECHANICS_VARIABLE_FALLBACKS["paths.tier_bonus.steward"]).toBe(TIER_BONUS.steward);
    expect(MECHANICS_VARIABLE_FALLBACKS["paths.tier_bonus.sage"]).toBe(TIER_BONUS.sage);
  });

  it("the drift bugs stay dead: engine tier vocabulary, seeded harvest keys", () => {
    // trivial/small/medium/large is the engine vocabulary — 'epic' existed
    // in no seed and no engine; the old snapshot shifted every tier a notch.
    expect(MECHANICS_VARIABLE_FALLBACKS["bounty.tier.epic.base"]).toBeUndefined();
    // harvest.split keys match the seeded rows (bffs/orgs), not the
    // never-seeded projects/stewards the page used to carry.
    expect(MECHANICS_VARIABLE_FALLBACKS["harvest.split.projects"]).toBeUndefined();
    expect(MECHANICS_VARIABLE_FALLBACKS["harvest.split.bffs"]).toBe(20);
    expect(MECHANICS_VARIABLE_FALLBACKS["harvest.split.orgs"]).toBe(20);
  });
});
