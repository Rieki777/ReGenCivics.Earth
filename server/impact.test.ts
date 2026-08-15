/**
 * ReGen impact schema, Phase C1 (pure, no DB): validation bounds, tolerant
 * parsing of stored JSON, and the public summary that gates all display.
 */

import { describe, expect, it } from "vitest";
import { impactDataSchema, parseImpactData, publicImpactSummary } from "@shared/impact";

describe("impactDataSchema", () => {
  it("accepts a full, sane record", () => {
    const result = impactDataSchema.safeParse({
      hectaresUnderRegeneration: 12.5,
      waterCapturedM3PerYear: 40_000,
      soilOrganicMatterPercent: 6.2,
      foodOutputKgPerYear: 18_000,
      peopleHoused: 14,
      peopleFed: 120,
      peopleTrained: 45,
      governanceMaturity: "practicing",
      context: "Measured against 2025 baseline; water via flume meter.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negatives, out-of-range percentages, and unknown keys", () => {
    expect(impactDataSchema.safeParse({ hectaresUnderRegeneration: -1 }).success).toBe(false);
    expect(impactDataSchema.safeParse({ soilOrganicMatterPercent: 140 }).success).toBe(false);
    expect(impactDataSchema.safeParse({ carbonCredits: 5 }).success).toBe(false);
    expect(impactDataSchema.safeParse({ peopleHoused: 2.5 }).success).toBe(false);
    expect(impactDataSchema.safeParse({ governanceMaturity: "excellent" }).success).toBe(false);
  });

  it("accepts an empty record (all fields optional)", () => {
    expect(impactDataSchema.safeParse({}).success).toBe(true);
  });
});

describe("parseImpactData", () => {
  it("parses stored objects and JSON strings, and returns null on garbage", () => {
    expect(parseImpactData({ peopleFed: 10 })).toEqual({ peopleFed: 10 });
    expect(parseImpactData('{"peopleFed": 10}')).toEqual({ peopleFed: 10 });
    expect(parseImpactData("not json")).toBeNull();
    expect(parseImpactData({ peopleFed: -5 })).toBeNull();
    expect(parseImpactData(null)).toBeNull();
    expect(parseImpactData(undefined)).toBeNull();
  });
});

describe("publicImpactSummary", () => {
  it("strips the admin bookkeeping stamp and passes measures through", () => {
    const summary = publicImpactSummary({
      hectaresUnderRegeneration: 3,
      updatedAt: "2026-07-17T00:00:00.000Z",
    });
    expect(summary).toEqual({ hectaresUnderRegeneration: 3 });
  });

  it("returns null for empty or absent records so surfaces can skip them", () => {
    expect(publicImpactSummary(null)).toBeNull();
    expect(publicImpactSummary({ updatedAt: "2026-07-17T00:00:00.000Z" })).toBeNull();
  });
});
