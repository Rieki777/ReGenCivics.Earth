import { describe, expect, it } from "vitest";
import {
  rankContributionScores,
  resolveSnapshotDate,
  todayUtcDateString,
  yesterdayUtcDateString,
} from "./dailyContributionSnapshotRank";

describe("yesterdayUtcDateString / todayUtcDateString", () => {
  it("formats UTC calendar days", () => {
    // 2026-09-30 03:00 UTC → today 2026-09-30, yesterday 2026-09-29
    const now = new Date(Date.UTC(2026, 8, 30, 3, 0, 0));
    expect(todayUtcDateString(now)).toBe("2026-09-30");
    expect(yesterdayUtcDateString(now)).toBe("2026-09-29");
  });

  it("crosses month boundary in UTC", () => {
    const now = new Date(Date.UTC(2026, 9, 1, 0, 15, 0)); // 2026-10-01 00:15 UTC
    expect(todayUtcDateString(now)).toBe("2026-10-01");
    expect(yesterdayUtcDateString(now)).toBe("2026-09-30");
  });
});

describe("resolveSnapshotDate", () => {
  const now = new Date(Date.UTC(2026, 8, 30, 12, 0, 0));

  it("defaults to yesterday UTC", () => {
    expect(resolveSnapshotDate({ now })).toEqual({
      snapshotDate: "2026-09-29",
      dayMode: "yesterday",
    });
  });

  it("honors day=today", () => {
    expect(resolveSnapshotDate({ now, day: "today" })).toEqual({
      snapshotDate: "2026-09-30",
      dayMode: "today",
    });
  });

  it("explicit snapshotDate wins over day", () => {
    expect(
      resolveSnapshotDate({ now, day: "today", snapshotDate: "2026-09-01" }),
    ).toEqual({ snapshotDate: "2026-09-01", dayMode: "explicit" });
  });

  it("rejects bad snapshotDate", () => {
    expect(() => resolveSnapshotDate({ snapshotDate: "9/30/2026" })).toThrow(
      /Invalid snapshotDate/,
    );
  });
});

describe("rankContributionScores", () => {
  it("returns empty for empty input", () => {
    expect(rankContributionScores([])).toEqual([]);
  });

  it("single player gets rank 1 and percentile 0 (PERCENT_RANK)", () => {
    expect(rankContributionScores([{ userId: 7, score: 42 }])).toEqual([
      { userId: 7, score: 42, rank: 1, percentile: 0 },
    ]);
  });

  it("assigns rank 1 to highest score and 100 percentile to top", () => {
    const ranked = rankContributionScores([
      { userId: 1, score: 10 },
      { userId: 2, score: 50 },
      { userId: 3, score: 30 },
    ]);
    expect(ranked.map((r) => r.userId)).toEqual([2, 3, 1]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    // ASC ranks: user1=1, user3=2, user2=3 → pct = round((r-1)/(3-1)*100)
    expect(ranked.find((r) => r.userId === 1)?.percentile).toBe(0);
    expect(ranked.find((r) => r.userId === 3)?.percentile).toBe(50);
    expect(ranked.find((r) => r.userId === 2)?.percentile).toBe(100);
  });

  it("breaks score ties by userId ascending for both rank and percentile", () => {
    const ranked = rankContributionScores([
      { userId: 9, score: 100 },
      { userId: 2, score: 100 },
    ]);
    // DESC tie-break: lower userId first → user 2 rank 1
    expect(ranked[0]).toMatchObject({ userId: 2, rank: 1, percentile: 0 });
    expect(ranked[1]).toMatchObject({ userId: 9, rank: 2, percentile: 100 });
  });

  it("marks top quintile at percentile >= 80 for a five-player ladder", () => {
    // Scores 10..50 → percentiles 0,25,50,75,100. Only the top is >= 80.
    const ranked = rankContributionScores([
      { userId: 1, score: 10 },
      { userId: 2, score: 20 },
      { userId: 3, score: 30 },
      { userId: 4, score: 40 },
      { userId: 5, score: 50 },
    ]);
    const top = ranked.filter((r) => r.percentile >= 80);
    expect(top).toHaveLength(1);
    expect(top[0].userId).toBe(5);
    expect(top[0].rank).toBe(1);
  });
});
