import { describe, expect, it } from "vitest";
import {
  EXAMPLE_DURATION_FIX_DAYS,
  EXAMPLE_MONEY,
  EXAMPLE_ROUTES,
  exampleDurationDays,
  exampleMoneyAsk,
  exampleRouteFigures,
} from "./exampleCampaignFigures";
import { moneySharePct } from "./campaignProgress";

describe("exampleMoneyAsk (0263 step 2)", () => {
  it("gives every money ask in the spec's tables", () => {
    expect(exampleMoneyAsk(82400)).toBe(21000); // production Harmony Valley
    expect(exampleMoneyAsk(100600)).toBe(25000); // scratch Harmony Valley, and a re-seed
    expect(exampleMoneyAsk(85100)).toBe(21000); // Terra Nova
    expect(exampleMoneyAsk(54100)).toBe(14000); // Pachamama
    expect(exampleMoneyAsk(131640)).toBe(33000); // Rewild Britain
  });

  it("never goes below 1,000 when there is an in-kind ask, and is 0 when there is none", () => {
    expect(exampleMoneyAsk(1200)).toBe(1000);
    expect(exampleMoneyAsk(1)).toBe(1000);
    expect(exampleMoneyAsk(0)).toBe(0);
    expect(exampleMoneyAsk(-500)).toBe(0);
    expect(exampleMoneyAsk(Number.NaN)).toBe(0);
  });

  it("rounds half up, as MySQL rounds an exact DECIMAL, with no float drift", () => {
    expect(exampleMoneyAsk(6000)).toBe(2000); // 1,500 rounds up
    expect(exampleMoneyAsk(5999.96)).toBe(1000); // 1,499.99 rounds down
    expect(exampleMoneyAsk(10000)).toBe(3000); // 2,500 rounds up
    expect(exampleMoneyAsk(0.1 + 0.2)).toBe(1000);
    expect(exampleMoneyAsk(123456789.99)).toBe(30864000);
  });

  it("keeps money near a fifth of the whole ask for real-sized examples", () => {
    for (const inKind of [54100, 82400, 85100, 100600, 131640]) {
      const pct = moneySharePct(inKind, exampleMoneyAsk(inKind));
      expect(pct, String(inKind)).toBeGreaterThanOrEqual(19);
      expect(pct, String(inKind)).toBeLessThanOrEqual(21);
    }
  });

  it("carries the ruled constants", () => {
    expect(EXAMPLE_MONEY).toEqual({ inKindDivisor: 4, roundTo: 1000, floor: 1000 });
    expect(EXAMPLE_ROUTES).toEqual({ shareNumerator: 2, shareDenominator: 5, roundTo: 500 });
    expect(EXAMPLE_DURATION_FIX_DAYS).toBe(270);
  });
});

describe("exampleRouteFigures (0263 step 3)", () => {
  const r = (...raised: number[]) => raised.map((cachedRaised) => ({ cachedRaised }));

  // [money ask, routes before, routes after], from section 4.2.
  const TABLE: Array<[string, number, number[], number[]]> = [
    ["scratch 1597 Harmony Valley", 25000, [52000, 33000], [6000, 4000]],
    ["scratch 1598 / prod 80 Terra Nova", 21000, [38000, 27000], [5000, 3500]],
    ["scratch 1599 / prod 81 Pachamama", 14000, [31000, 14000], [4000, 1500]],
    ["scratch 1600 / prod 82 Rewild Britain", 33000, [96000, 54000], [8500, 5000]],
    ["prod 79 Harmony Valley", 21000, [52000, 33000], [5000, 3500]],
  ];

  it("gives every route figure in the spec's tables", () => {
    for (const [label, ask, before, after] of TABLE) {
      expect(exampleRouteFigures(ask, r(...before)), label).toEqual(after);
    }
  });

  it("is stable on a second pass", () => {
    for (const [label, ask, , after] of TABLE) {
      expect(exampleRouteFigures(ask, r(...after)), label).toEqual(after);
    }
  });

  it("shows real progress that never lands: about 40% of the ask", () => {
    for (const [label, ask, before] of TABLE) {
      const total = exampleRouteFigures(ask, r(...before)).reduce((a, b) => a + b, 0);
      expect(total, label).toBeLessThan(ask);
      expect(total / ask, label).toBeGreaterThanOrEqual(0.38);
      expect(total / ask, label).toBeLessThanOrEqual(0.42);
    }
  });

  it("gives every figure in whole 500s", () => {
    for (const [, ask, before] of TABLE) {
      for (const f of exampleRouteFigures(ask, r(...before))) expect(f % 500).toBe(0);
    }
  });

  it("leaves a route with no figure as null, and changes nothing when the routes total 0", () => {
    expect(exampleRouteFigures(25000, [{ cachedRaised: 52000 }, { cachedRaised: null }, { cachedRaised: 33000 }]))
      .toEqual([6000, null, 4000]);
    expect(exampleRouteFigures(25000, r(0, 0))).toEqual([0, 0]);
    expect(exampleRouteFigures(25000, [])).toEqual([]);
  });
});

describe("exampleDurationDays (0263 step 4)", () => {
  it("brings an example over nine months to 270 and leaves the rest", () => {
    expect(exampleDurationDays(300)).toBe(270);
    expect(exampleDurationDays(274)).toBe(270);
    expect(exampleDurationDays(273)).toBe(273);
    expect(exampleDurationDays(120)).toBe(120);
  });
});
