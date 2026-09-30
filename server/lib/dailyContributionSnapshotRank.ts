/**
 * Pure helpers for the daily contribution snapshot writer.
 * Kept DB-free so vitest can cover date + rank logic without mocking getDb.
 */
import { toUtcDateString } from "./currentSeason";

export type SnapshotDayMode = "yesterday" | "today";

export type ContributionScoreRow = {
  userId: number;
  /** Raw contribution points (contributionScoreRaw). */
  score: number;
};

export type RankedContributionRow = {
  userId: number;
  score: number;
  /** 1 = highest score that day (schema comment). */
  rank: number;
  /** 0–100, PERCENT_RANK style (high score → high percentile). Sage top-20% = >= 80. */
  percentile: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Yesterday's UTC calendar day as YYYY-MM-DD. */
export function yesterdayUtcDateString(now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - 1);
  return toUtcDateString(d);
}

/** Today's UTC calendar day as YYYY-MM-DD. */
export function todayUtcDateString(now: Date = new Date()): string {
  return toUtcDateString(now);
}

/**
 * Resolve which snapshotDate to write.
 * Priority: explicit snapshotDate > day mode > yesterday (default).
 */
export function resolveSnapshotDate(opts: {
  now?: Date;
  day?: SnapshotDayMode;
  snapshotDate?: string;
}): { snapshotDate: string; dayMode: SnapshotDayMode | "explicit" } {
  const now = opts.now ?? new Date();
  if (opts.snapshotDate) {
    const trimmed = opts.snapshotDate.trim();
    if (!DATE_RE.test(trimmed)) {
      throw new Error(`Invalid snapshotDate "${opts.snapshotDate}" (want YYYY-MM-DD)`);
    }
    return { snapshotDate: trimmed, dayMode: "explicit" };
  }
  const day: SnapshotDayMode = opts.day === "today" ? "today" : "yesterday";
  return {
    snapshotDate: day === "today" ? todayUtcDateString(now) : yesterdayUtcDateString(now),
    dayMode: day,
  };
}

/**
 * Rank players for a snapshot day.
 *
 * - rank: 1 = highest score (DESC). Ties broken by userId ascending (stable).
 * - percentile: matches MySQL `ROUND(PERCENT_RANK() OVER (ORDER BY score) * 100)`
 *   i.e. ascending rank position: lowest → ~0, highest → 100.
 *   Single player → 0 (PERCENT_RANK of a one-row partition).
 */
export function rankContributionScores(
  rows: readonly ContributionScoreRow[],
): RankedContributionRow[] {
  if (rows.length === 0) return [];

  const n = rows.length;
  const asc = [...rows].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.userId - b.userId;
  });
  const ascRankByUser = new Map<number, number>();
  for (let i = 0; i < asc.length; i++) {
    ascRankByUser.set(asc[i].userId, i + 1);
  }

  const desc = [...rows].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.userId - b.userId;
  });

  return desc.map((r, i) => {
    const ascRank = ascRankByUser.get(r.userId) ?? i + 1;
    const percentile =
      n <= 1 ? 0 : Math.round(((ascRank - 1) / (n - 1)) * 100);
    return {
      userId: r.userId,
      score: r.score,
      rank: i + 1,
      percentile,
    };
  });
}
