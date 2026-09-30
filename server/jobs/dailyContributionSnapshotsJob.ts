/**
 * Daily contribution snapshot WRITER for Sage.
 *
 * Reads live contribution scores from player_profiles (optionally refreshing
 * contributionScoreRaw from contribution_score_events first), ranks every
 * player with a positive raw score, and upserts daily_contribution_snapshots
 * for one UTC calendar day.
 *
 * Day convention (safer default): **yesterday UTC**.
 *   - Snapshots are UTC calendar days (toUtcDateString / schema comment).
 *   - Sage (evaluateSage) counts season days that have rows; a completed day
 *     avoids mid-day partial ranks if the cron fires early.
 *   - Schedule Railway at ~00:15 UTC so "yesterday" is fully closed.
 *   - Override with body `{ "day": "today" }` or `{ "snapshotDate": "YYYY-MM-DD" }`.
 *
 * Score freshness: by default this job refreshes contributionScoreRaw (same
 * SQL as private recalculateScores in batchJobs.ts) and writes contributionScore
 * + currentTier on profiles so ranks match live events. Set refreshScores:false
 * to snapshot whatever is already on profiles (e.g. if admin nightly already ran).
 *
 * Idempotent via upsertDailyContributionSnapshot unique (userId, snapshotDate).
 *
 * Railway: dashboard HTTP cron POST /api/cron/daily-contribution-snapshots
 * (not railway.toml). See package PR.md.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { upsertDailyContributionSnapshot } from "../db/dailyContributionSnapshots";
import {
  ensureTierBandsFresh,
  getCurrentSeason,
  getTierFromPercentile,
} from "../game";
import { logger } from "../_core/logger";
import {
  rankContributionScores,
  resolveSnapshotDate,
  type RankedContributionRow,
  type SnapshotDayMode,
} from "../lib/dailyContributionSnapshotRank";

export {
  rankContributionScores,
  resolveSnapshotDate,
  yesterdayUtcDateString,
  todayUtcDateString,
  type ContributionScoreRow,
  type RankedContributionRow,
  type SnapshotDayMode,
} from "../lib/dailyContributionSnapshotRank";

const log = logger("daily-contribution-snapshots");

export type DailySnapshotJobOptions = {
  /** Clock for date resolution and score refresh. Defaults to now. */
  now?: Date;
  /**
   * Which UTC calendar day to stamp. Default "yesterday" (completed day).
   * Ignored when snapshotDate is set.
   */
  day?: SnapshotDayMode;
  /** Explicit YYYY-MM-DD (UTC). Wins over day. */
  snapshotDate?: string;
  /**
   * Refresh contributionScoreRaw from events + write percentiles on profiles
   * before snapshotting. Default true.
   */
  refreshScores?: boolean;
};

export type DailySnapshotJobReport = {
  ok: boolean;
  snapshotDate: string;
  dayMode: SnapshotDayMode | "explicit";
  refreshedScores: boolean;
  profilesScanned: number;
  upserted: number;
  errors: string[];
};

/**
 * Same raw-sum SQL as private recalculateScores in batchJobs.ts.
 * Kept here (not extracted) to avoid a large batchJobs refactor; a later
 * shared helper can dedupe.
 */
async function refreshContributionScoreRaw(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<void> {
  const season = await getCurrentSeason();
  const seasonFilter = season ? sql`AND cse.seasonId = ${season.id}` : sql``;

  await db.execute(sql`
    UPDATE player_profiles pp
    SET pp.contributionScoreRaw = COALESCE((
      SELECT SUM(cse.points)
      FROM contribution_score_events cse
      WHERE cse.userId = pp.userId ${seasonFilter}
    ), 0),
    pp.scoreLastCalculatedAt = NOW()
    WHERE pp.userId IS NOT NULL
  `);
}

async function loadPositiveScoreRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<Array<{ userId: number; score: number }>> {
  const [raw] = await db.execute(sql`
    SELECT userId, contributionScoreRaw
    FROM player_profiles
    WHERE userId IS NOT NULL AND contributionScoreRaw > 0
  `);
  const list: any[] = Array.isArray(raw) ? (raw as any[]) : [];
  return list
    .map((r) => ({
      userId: Number(r.userId),
      score: Number(r.contributionScoreRaw ?? 0),
    }))
    .filter((r) => Number.isFinite(r.userId) && r.userId > 0 && Number.isFinite(r.score));
}

/** Write contributionScore + currentTier so profiles stay aligned with the snapshot. */
async function writeProfilePercentiles(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  ranked: RankedContributionRow[],
): Promise<void> {
  await ensureTierBandsFresh();
  for (const p of ranked) {
    const tier = getTierFromPercentile(p.percentile);
    await db.execute(sql`
      UPDATE player_profiles
      SET contributionScore = ${p.percentile}, currentTier = ${tier}
      WHERE userId = ${p.userId}
    `);
  }
}

export async function runDailyContributionSnapshotsJob(
  opts: DailySnapshotJobOptions = {},
): Promise<DailySnapshotJobReport> {
  const refreshScores = opts.refreshScores !== false;
  const { snapshotDate, dayMode } = resolveSnapshotDate(opts);

  const report: DailySnapshotJobReport = {
    ok: true,
    snapshotDate,
    dayMode,
    refreshedScores: false,
    profilesScanned: 0,
    upserted: 0,
    errors: [],
  };

  const db = await getDb();
  if (!db) {
    return { ...report, ok: false, errors: ["database unavailable"] };
  }

  try {
    if (refreshScores) {
      await refreshContributionScoreRaw(db);
      report.refreshedScores = true;
    }

    const rows = await loadPositiveScoreRows(db);
    report.profilesScanned = rows.length;
    const ranked = rankContributionScores(rows);

    if (refreshScores && ranked.length > 0) {
      await writeProfilePercentiles(db, ranked);
    }

    for (const row of ranked) {
      try {
        await upsertDailyContributionSnapshot({
          userId: row.userId,
          snapshotDate,
          score: row.score,
          rank: row.rank,
          percentile: row.percentile,
        });
        report.upserted += 1;
      } catch (err: any) {
        report.ok = false;
        report.errors.push(`user ${row.userId}: ${err?.message ?? err}`);
      }
    }

    log.info("daily contribution snapshots written", {
      snapshotDate,
      dayMode,
      refreshedScores: report.refreshedScores,
      profilesScanned: report.profilesScanned,
      upserted: report.upserted,
      errorCount: report.errors.length,
    });
  } catch (err: any) {
    report.ok = false;
    report.errors.push(err?.message ?? String(err));
    log.error("daily contribution snapshots job failed", err);
  }

  return report;
}
