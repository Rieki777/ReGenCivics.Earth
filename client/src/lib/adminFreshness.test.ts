import { describe, expect, it } from "vitest";
import { formatRelativeAge, getRunFreshness, DEFAULT_STALE_AFTER_DAYS } from "./adminFreshness";

describe("formatRelativeAge", () => {
  const now = Date.parse("2026-09-16T17:00:00Z");

  it("says Never for missing timestamps", () => {
    expect(formatRelativeAge(null, now).relativeLabel).toBe("Never");
    expect(formatRelativeAge(undefined, now).daysSince).toBe(Number.POSITIVE_INFINITY);
  });

  it("formats hours and days", () => {
    expect(formatRelativeAge(new Date(now - 3 * 3_600_000), now).relativeLabel).toBe("3h ago");
    expect(formatRelativeAge(new Date(now - 2 * 86_400_000), now).relativeLabel).toBe("2d ago");
  });
});

describe("getRunFreshness", () => {
  const now = Date.parse("2026-09-16T17:00:00Z");

  it("marks never-run and old runs as stale", () => {
    expect(getRunFreshness(null, { nowMs: now }).isStale).toBe(true);
    expect(getRunFreshness(null, { nowMs: now }).displayLine).toMatch(/Never · stale/);

    const eightDaysAgo = new Date(now - (DEFAULT_STALE_AFTER_DAYS + 1) * 86_400_000);
    const stale = getRunFreshness(eightDaysAgo, { nowMs: now });
    expect(stale.isStale).toBe(true);
    expect(stale.displayLine).toMatch(/stale/);
  });

  it("keeps recent runs fresh", () => {
    const twoDaysAgo = new Date(now - 2 * 86_400_000);
    const fresh = getRunFreshness(twoDaysAgo, { nowMs: now });
    expect(fresh.isStale).toBe(false);
    expect(fresh.displayLine).toBe("Last run 2d ago");
  });
});
