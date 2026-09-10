import { describe, expect, it } from "vitest";
import { deriveSeedsClaimAmounts } from "./seedsClaimAmounts";

describe("deriveSeedsClaimAmounts", () => {
  it("clamps spent and claimed amounts to the contribution total", () => {
    const result = deriveSeedsClaimAmounts({
      isDispute: false,
      contributionTotalUsd: 1000,
      spentUsdAmount: 200,
      claimedUsdAmount: 800,
      regenPerUsd: 10,
    });
    expect(result).toEqual({
      ok: true,
      originalUsdTotal: 1000,
      spentUsdAmount: 200,
      claimedUsdAmount: 800,
      regenAmount: 8000,
    });
  });

  it("rejects a non-dispute claim with no contribution records", () => {
    const result = deriveSeedsClaimAmounts({
      isDispute: false,
      contributionTotalUsd: 0,
      spentUsdAmount: 0,
      claimedUsdAmount: 50,
      regenPerUsd: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/No SEEDS contributions/i);
    }
  });

  it("stores a dispute for an unknown account at the claimed amount, never treating it as entitled", () => {
    const result = deriveSeedsClaimAmounts({
      isDispute: true,
      contributionTotalUsd: 0,
      spentUsdAmount: 0,
      claimedUsdAmount: 250,
      regenPerUsd: 10,
    });
    expect(result).toEqual({
      ok: true,
      originalUsdTotal: 0,
      spentUsdAmount: 0,
      claimedUsdAmount: 250,
      regenAmount: 2500,
    });
  });

  it("rejects a dispute with no claimed USD", () => {
    const result = deriveSeedsClaimAmounts({
      isDispute: true,
      contributionTotalUsd: 0,
      spentUsdAmount: 0,
      claimedUsdAmount: 0,
      regenPerUsd: 10,
    });
    expect(result.ok).toBe(false);
  });
});
