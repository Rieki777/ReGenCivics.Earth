import { describe, expect, it } from "vitest";
import { isListableValue, zeroValueNeedIndexes } from "./needRules";

describe("isListableValue (ruling 2026-09-27: no need at 0)", () => {
  it("lists a value above 0", () => {
    expect(isListableValue(1)).toBe(true);
    expect(isListableValue(0.01)).toBe(true);
    expect(isListableValue(36400)).toBe(true);
    expect(isListableValue("250")).toBe(true);
    expect(isListableValue("0.5")).toBe(true);
  });

  it("tests at the cent, the way the DECIMAL(18,2) column stores it", () => {
    // 0.004 is stored as 0.00: a need at 0 (review 2026-09-28).
    for (const v of [0.004, 0.0049, "0.001", 1e-9]) expect(isListableValue(v), String(v)).toBe(false);
    // 0.005 rounds up to 0.01 in the column, so it lists.
    for (const v of [0.005, 0.01, "0.01"]) expect(isListableValue(v), String(v)).toBe(true);
  });

  it("refuses 0, negatives and anything that isn't a finite number", () => {
    for (const v of [0, -0, -1, -0.01, "0", "", "  ", "abc", "12abc", null, undefined, Number.NaN, Infinity, -Infinity, true, false, {}]) {
      expect(isListableValue(v), String(v)).toBe(false);
    }
  });
});

describe("zeroValueNeedIndexes", () => {
  it("names every need that can't be listed, in order", () => {
    expect(
      zeroValueNeedIndexes([
        { estimatedValue: 100 },
        { estimatedValue: 0 },
        { estimatedValue: 250.5 },
        { estimatedValue: null },
        { estimatedValue: -3 },
      ]),
    ).toEqual([1, 3, 4]);
    expect(zeroValueNeedIndexes([])).toEqual([]);
    expect(zeroValueNeedIndexes([{ estimatedValue: 1 }])).toEqual([]);
  });
});
