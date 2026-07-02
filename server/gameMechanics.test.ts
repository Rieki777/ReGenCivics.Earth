import { describe, expect, it } from "vitest";
import {
  buildGameMechanicsSnapshot,
  MECHANICS_VARIABLE_FALLBACKS,
  MECHANICS_VARIABLE_KEYS,
} from "@shared/gameMechanics";
import { TIER_BONUS, RITES_OF_PASSAGE_COUNT } from "@shared/questPools";

describe("buildGameMechanicsSnapshot", () => {
  it("prefers live values over fallbacks", () => {
    const snap = buildGameMechanicsSnapshot(
      {
        "governance.claim_threshold_regen": 1234,
        "citizenship.sage.min_percentile": 90,
        "gratitude.multiplier.steward": 1.5,
      },
      1000,
    );
    expect(snap.claims.thresholds.regen).toBe(1234);
    expect(snap.citizenship.tiers.sage.minPercentile).toBe(90);
    expect(snap.citizenship.tiers.steward.gratitudeMultiplier).toBe(1.5);
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
  });

  it("sources structural constants, not variables", () => {
    const snap = buildGameMechanicsSnapshot({}, 0);
    expect(snap.quests.ritesOfPassageCount).toBe(RITES_OF_PASSAGE_COUNT);
    expect(snap.quests.tierBonus.sage).toBe(TIER_BONUS.sage);
  });

  it("every declared key has a fallback and vice versa", () => {
    for (const key of MECHANICS_VARIABLE_KEYS) {
      expect(MECHANICS_VARIABLE_FALLBACKS[key]).toBeTypeOf("number");
    }
    expect(MECHANICS_VARIABLE_KEYS.length).toBe(
      Object.keys(MECHANICS_VARIABLE_FALLBACKS).length,
    );
  });
});
