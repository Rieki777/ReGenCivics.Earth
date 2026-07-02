import { describe, it, expect } from "vitest";
import {
  computeValuation,
  computeDemandFactor,
  type ValuationWeights,
  type LearningParams,
} from "./db/bountyValuation";

const W: ValuationWeights = {
  base: { trivial: 25, small: 75, medium: 250, large: 750 },
  impact: { low: 0.75, normal: 1, high: 1.5 },
  priorityBoost: 1.25,
  anchorWeight: 0.25,
  max: 2000,
  roundTo: 25,
};
const noDemand = { factor: 1, precedentMedian: null };

describe("computeValuation", () => {
  it("a baseline bounty (normal impact, no priority, demand 1, no precedent) values to its base", () => {
    const r = computeValuation({ scopeTier: "medium", impactLevel: "normal", priority: false }, W, noDemand);
    expect(r.amount).toBe(250);
    expect(r.anchored).toBe(r.raw);
  });

  it("multiplies base * impact * priority * demand", () => {
    const r = computeValuation({ scopeTier: "large", impactLevel: "high", priority: true }, W, { factor: 1, precedentMedian: null });
    expect(r.raw).toBeCloseTo(1406.25); // 750 * 1.5 * 1.25 * 1.0
    expect(r.amount).toBe(1400); // round(1406.25 / 25) * 25
  });

  it("applies the learned demand factor", () => {
    const r = computeValuation({ scopeTier: "medium", impactLevel: "normal", priority: false }, W, { factor: 1.2, precedentMedian: null });
    expect(r.amount).toBe(300); // 250 * 1.2
  });

  it("anchors toward the precedent median", () => {
    const r = computeValuation({ scopeTier: "medium", impactLevel: "normal", priority: false }, W, { factor: 1, precedentMedian: 500 });
    expect(r.anchored).toBeCloseTo(312.5); // 250 * 0.75 + 500 * 0.25
    expect(r.amount).toBe(325);
  });

  it("with no precedent, anchored equals raw", () => {
    const r = computeValuation({ scopeTier: "small", impactLevel: "normal", priority: false }, W, { factor: 1, precedentMedian: null });
    expect(r.anchored).toBe(r.raw);
    expect(r.amount).toBe(75);
  });

  it("caps at bounty.max", () => {
    const r = computeValuation({ scopeTier: "large", impactLevel: "high", priority: true }, { ...W, max: 1000 }, { factor: 1.4, precedentMedian: null });
    expect(r.amount).toBe(1000);
    expect(r.amount).toBeLessThanOrEqual(1000);
  });

  it("caps at the remaining season budget", () => {
    const r = computeValuation({ scopeTier: "large", impactLevel: "high", priority: false }, W, { factor: 1, precedentMedian: null }, 300);
    expect(r.amount).toBe(300); // raw 1125, clamped to budget 300
  });

  it("never exceeds the hard cap even after rounding up", () => {
    const r = computeValuation({ scopeTier: "large", impactLevel: "high", priority: false }, W, { factor: 1, precedentMedian: null }, 313);
    expect(r.amount).toBeLessThanOrEqual(313);
    expect(r.amount).toBe(300); // would round to 325, floored to a clean multiple under the cap
  });

  it("rounds to bounty.round_to", () => {
    const r = computeValuation({ scopeTier: "trivial", impactLevel: "high", priority: false }, W, { factor: 1, precedentMedian: null });
    expect(r.amount).toBe(50); // 25 * 1.5 = 37.5 -> nearest 25
  });

  it("carries the token and the classification labels for explainability", () => {
    const r = computeValuation({ scopeTier: "medium", impactLevel: "high", priority: false, tokenType: "regen" }, W, noDemand);
    expect(r.token).toBe("regen");
    expect(r.scopeTier).toBe("medium");
    expect(r.impactLevel).toBe("high");
    expect(r.seasonBudgetRemaining).toBeNull(); // Infinity stored as null
  });
});

const L: LearningParams = { raiseSensitivity: 0.15, lowerSensitivity: 0.05, factorMin: 0.9, factorMax: 1.4, minSample: 3 };

describe("computeDemandFactor", () => {
  it("raises when bounties keep going unclaimed", () => {
    const f = computeDemandFactor(1, { sampleSize: 10, unclaimedRate: 1, fastClaimSignal: 0 }, L);
    expect(f).toBeCloseTo(1.1); // 1 * (1 + 0.15) = 1.15, clamped to a 0.1 step
  });

  it("raises proportionally to the unclaimed rate", () => {
    const f = computeDemandFactor(1, { sampleSize: 10, unclaimedRate: 0.2, fastClaimSignal: 0 }, L);
    expect(f).toBeCloseTo(1.03); // 1 * (1 + 0.15 * 0.2)
  });

  it("lowers gently on fast claims", () => {
    const f = computeDemandFactor(1.2, { sampleSize: 10, unclaimedRate: 0, fastClaimSignal: 1 }, L);
    expect(f).toBeCloseTo(1.14); // 1.2 * (1 - 0.05)
  });

  it("does not move below the minimum sample size", () => {
    const f = computeDemandFactor(1.3, { sampleSize: 2, unclaimedRate: 1, fastClaimSignal: 0 }, L);
    expect(f).toBe(1.3);
  });

  it("clamps to the factor ceiling", () => {
    const f = computeDemandFactor(1.35, { sampleSize: 50, unclaimedRate: 1, fastClaimSignal: 0 }, L);
    expect(f).toBe(1.4);
  });

  it("clamps to the factor floor", () => {
    const f = computeDemandFactor(0.92, { sampleSize: 50, unclaimedRate: 0, fastClaimSignal: 1 }, L);
    expect(f).toBeGreaterThanOrEqual(0.9);
    expect(f).toBeLessThan(0.92);
  });

  it("never jumps more than one step per cycle", () => {
    const f = computeDemandFactor(1, { sampleSize: 100, unclaimedRate: 1, fastClaimSignal: 0 }, L);
    expect(Math.abs(f - 1)).toBeLessThanOrEqual(0.1 + 1e-9);
  });
});
