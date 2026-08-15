/**
 * Unit tests for the gratitude lunar-cycle economy math.
 * Pure functions only — no DB. The orchestration paths (send guards,
 * budget rows, distribution job) are covered by integration flows.
 */
import { describe, expect, it } from "vitest";
import {
  computeEffectiveBudget,
  computePerPersonShare,
  computePoolShares,
} from "./lib/gratitude-cycles";
import {
  SYNODIC_MONTH_MS,
  cycleBoundsFor,
  daysRemainingInCycle,
  moonPhase,
  moonPhaseName,
} from "../shared/lunar";

const SPEC_VARS = { streakBonusPerCycle: 0.03, streakBonusMax: 0.3 };

describe("computeEffectiveBudget", () => {
  it("matches the spec's tier table with no streak", () => {
    for (const [multiplier, expected] of [[1.0, 100], [2.0, 200], [3.0, 300], [5.0, 500]] as const) {
      expect(
        computeEffectiveBudget({ baseBudget: 100, multiplier, streakCycles: 0, ...SPEC_VARS }).effectiveBudget,
      ).toBe(expected);
    }
  });

  it("matches the spec's streak table for a Steward (300 base)", () => {
    // | 0 | 300 | 1 | 309 | 5 | 345 | 10+ | 390 |
    const steward = (streakCycles: number) =>
      computeEffectiveBudget({ baseBudget: 100, multiplier: 3.0, streakCycles, ...SPEC_VARS }).effectiveBudget;
    expect(steward(0)).toBe(300);
    expect(steward(1)).toBe(309);
    expect(steward(5)).toBe(345);
    expect(steward(10)).toBe(390);
  });

  it("caps the streak bonus at 30% even past 10 cycles", () => {
    const r = computeEffectiveBudget({ baseBudget: 100, multiplier: 5.0, streakCycles: 25, ...SPEC_VARS });
    expect(r.streakBonus).toBe(0.3);
    expect(r.effectiveBudget).toBe(650);
  });
});

describe("computePerPersonShare", () => {
  const T = 10; // full-power threshold

  it("gives a full share at and past the threshold, diluting beyond it", () => {
    expect(computePerPersonShare(300, 10, T)).toBe(30);
    expect(computePerPersonShare(300, 20, T)).toBe(15);
    expect(computePerPersonShare(300, 30, T)).toBe(10);
  });

  it("forfeits the remainder below the threshold instead of concentrating it", () => {
    // The old rule divided by n, so 5 recipients got 60 each and the sender
    // still emitted the whole 300. Use it or lose it means 30 each and 150 gone.
    expect(computePerPersonShare(300, 5, T)).toBe(30);
    expect(computePerPersonShare(300, 5, T) * 5).toBe(150);
    expect(computePerPersonShare(300, 1, T)).toBe(30);
  });

  it("emits nothing when nobody has been acknowledged", () => {
    expect(computePerPersonShare(300, 0, T)).toBe(0);
  });

  it("treats a zero or negative threshold as one", () => {
    expect(computePerPersonShare(300, 3, 0)).toBe(100);
  });
});

describe("computePoolShares", () => {
  const NO_CAP = 0;

  it("distributes the pool proportionally to weight received", () => {
    // Sage sends 50/person, Explorer sends 10/person (spec §Distribution).
    const weights = new Map([[1, 50], [2, 10]]);
    const { totalWeight, shares } = computePoolShares(weights, 6000, NO_CAP);
    expect(totalWeight).toBe(60);
    const byUser = new Map(shares.map((s) => [s.userId, s]));
    expect(byUser.get(1)!.poolShare).toBeCloseTo(5000);
    expect(byUser.get(2)!.poolShare).toBeCloseTo(1000);
  });

  it("floors credited amounts and never over-mints the pool", () => {
    const weights = new Map([[1, 1], [2, 1], [3, 1]]);
    const { shares, distributed } = computePoolShares(weights, 100, NO_CAP);
    for (const s of shares) expect(s.creditedAmount).toBe(33);
    expect(distributed).toBe(99);
    expect(distributed).toBeLessThanOrEqual(100);
  });

  it("returns no shares when nothing was received", () => {
    expect(computePoolShares(new Map(), 10000, NO_CAP).shares).toEqual([]);
    expect(computePoolShares(new Map([[1, 0]]), 10000, NO_CAP).shares).toEqual([]);
  });

  it("caps what any one person can be credited in a cycle", () => {
    // Rye's collusion case: two people acknowledge only each other, so a
    // 10,000 pool would have paid them 5,000 apiece. With a 1,000 cap the
    // cycle mints 2,000 and the other 8,000 is never created.
    const weights = new Map([[1, 30], [2, 30]]);
    const { shares, distributed } = computePoolShares(weights, 10000, 1000);
    for (const s of shares) {
      expect(s.creditedAmount).toBe(1000);
      expect(s.capped).toBe(true);
      expect(s.poolShare).toBeCloseTo(5000); // the uncapped entitlement is still recorded
    }
    expect(distributed).toBe(2000);
  });

  it("leaves everyone under the cap untouched", () => {
    const weights = new Map([[1, 1], [2, 1]]);
    const { shares, distributed } = computePoolShares(weights, 1000, 1000);
    for (const s of shares) {
      expect(s.creditedAmount).toBe(500);
      expect(s.capped).toBe(false);
    }
    expect(distributed).toBe(1000);
  });

  it("caps only the whales in a mixed cycle, and does not redistribute", () => {
    const weights = new Map([[1, 90], [2, 5], [3, 5]]);
    const { shares, distributed } = computePoolShares(weights, 10000, 1000);
    const byUser = new Map(shares.map((s) => [s.userId, s]));
    expect(byUser.get(1)!.creditedAmount).toBe(1000); // would have been 9000
    expect(byUser.get(2)!.creditedAmount).toBe(500);
    expect(byUser.get(3)!.creditedAmount).toBe(500);
    expect(distributed).toBe(2000); // the freed 8000 is not handed to anyone
  });
});

describe("lunar math", () => {
  it("keeps phase in [0, 1) and hits the known 2000-01-21 full moon", () => {
    const phase = moonPhase(new Date(Date.UTC(2000, 0, 21, 4, 40)));
    expect(phase).toBeGreaterThan(0.45);
    expect(phase).toBeLessThan(0.55);
    expect(moonPhaseName(phase)).toBe("Full moon");
  });

  it("produces cycle bounds that contain the date and span one synodic month", () => {
    const d = new Date(Date.UTC(2026, 6, 3, 12, 0));
    const bounds = cycleBoundsFor(d);
    expect(bounds.startsAt.getTime()).toBeLessThanOrEqual(d.getTime());
    expect(bounds.endsAt.getTime()).toBeGreaterThan(d.getTime());
    expect(bounds.endsAt.getTime() - bounds.startsAt.getTime()).toBeCloseTo(SYNODIC_MONTH_MS, -2);
  });

  it("gives adjacent dates in the same lunation the same cycle number", () => {
    const a = cycleBoundsFor(new Date(Date.UTC(2026, 6, 3)));
    const b = cycleBoundsFor(new Date(Date.UTC(2026, 6, 10)));
    expect(a.cycleNumber).toBe(b.cycleNumber);
    const next = cycleBoundsFor(new Date(a.endsAt.getTime() + 1000));
    expect(next.cycleNumber).toBe(a.cycleNumber + 1);
  });

  it("counts down days remaining without going negative", () => {
    const d = new Date(Date.UTC(2026, 6, 3));
    const remaining = daysRemainingInCycle(d);
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(30);
  });
});
