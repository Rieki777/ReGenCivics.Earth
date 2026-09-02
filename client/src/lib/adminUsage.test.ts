import { describe, expect, it, beforeEach } from "vitest";
import { ADMIN_USAGE_KEY, recordAdminVisit, topAdminDestinations, usageScore } from "./adminUsage";

describe("admin usage scoring", () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_USAGE_KEY);
  });

  it("scores recent heavy use above old one-off visits", () => {
    const now = Date.UTC(2026, 8, 2);
    const hot = { id: "applications", count: 8, lastVisited: now };
    const stale = { id: "newsletter", count: 20, lastVisited: now - 30 * 86_400_000 };
    expect(usageScore(hot, now)).toBeGreaterThan(usageScore(stale, now));
  });

  it("seeds the dial with Applications and Harvest until there is history", () => {
    const top = topAdminDestinations(4);
    expect(top.map((item) => item.id)).toEqual(
      expect.arrayContaining(["applications", "harvest"]),
    );
    expect(top.length).toBe(4);
  });

  it("ranks a visited destination first after several visits", () => {
    recordAdminVisit("calls");
    recordAdminVisit("calls");
    recordAdminVisit("funding");
    const top = topAdminDestinations(3);
    expect(top[0].id).toBe("calls");
  });

  it("ignores overview so the dial stays a jump list", () => {
    recordAdminVisit("overview");
    expect(topAdminDestinations(3).map((item) => item.id)).not.toContain("overview");
  });
});
