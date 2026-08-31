import { describe, it, expect } from "vitest";
import {
  shouldApplyBackpressure,
  MAX_AUTO_DRAFTS_PER_RUN,
  READY_BACKPRESSURE_LIMIT,
  GENERATION_SCAN_LIMIT,
  HARVEST_VARS,
} from "./lib/harvest";

describe("harvest throughput", () => {
  it("pauses at or above the limit, and not below it", () => {
    expect(shouldApplyBackpressure(14, 15)).toBe(false);
    expect(shouldApplyBackpressure(15, 15)).toBe(true);  // at the limit counts
    expect(shouldApplyBackpressure(22, 15)).toBe(true);  // the real stall
  });

  it("treats 0 as never pause, which is the escape hatch", () => {
    expect(shouldApplyBackpressure(0, 0)).toBe(false);
    expect(shouldApplyBackpressure(10_000, 0)).toBe(false);
    expect(shouldApplyBackpressure(10_000, -1)).toBe(false);
  });

  it("would not have stalled the real backlog", () => {
    // 22 untouched drafts against a limit of 15 held the hourly cron shut for
    // 34 days. The raised default has to clear that specific number.
    expect(shouldApplyBackpressure(22, READY_BACKPRESSURE_LIMIT)).toBe(false);
  });

  it("keeps the brake, rather than removing it", () => {
    // Rye asked for more throughput, not for an unbounded feed. A limit that
    // never engages is the same as no limit.
    expect(READY_BACKPRESSURE_LIMIT).toBeGreaterThan(0);
    expect(shouldApplyBackpressure(READY_BACKPRESSURE_LIMIT, READY_BACKPRESSURE_LIMIT)).toBe(true);
  });

  it("raised every throughput default", () => {
    expect(MAX_AUTO_DRAFTS_PER_RUN).toBeGreaterThan(3);      // was 3
    expect(READY_BACKPRESSURE_LIMIT).toBeGreaterThan(15);    // was 15
    expect(GENERATION_SCAN_LIMIT).toBeGreaterThan(500);      // was 500 inline
  });

  it("names its dials under one prefix so they are findable", () => {
    for (const key of Object.values(HARVEST_VARS)) {
      expect(key).toMatch(/^harvest\.[a-z_]+$/);
    }
  });
});
