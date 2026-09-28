/**
 * Daily contribution snapshot reads (and a write helper for a future cron).
 *
 * Sage uses snapshots inside the current season window. Writing daily ranks
 * is out of scope for this package beyond the insert helper; the detector
 * only reads.
 */
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { dailyContributionSnapshots } from "../../drizzle/schema";
import { getDb } from "../db";
import { getCurrentSeasonDateRange } from "../lib/currentSeason";

export type SnapshotInsert = {
    userId: number;
    snapshotDate: string; // YYYY-MM-DD
    score: number;
    rank: number;
    percentile: number;
};

/** Upsert one day's snapshot (admin/cron). Idempotent on (userId, snapshotDate). */
export async function upsertDailyContributionSnapshot(
    row: SnapshotInsert,
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

  await db.execute(sql`
      INSERT INTO daily_contribution_snapshots
            (userId, snapshotDate, score, \`rank\`, percentile, createdAt)
                VALUES
                      (${row.userId}, ${row.snapshotDate}, ${row.score}, ${row.rank}, ${row.percentile}, NOW())
                          ON DUPLICATE KEY UPDATE
                                score = VALUES(score),
                                      \`rank\` = VALUES(\`rank\`),
                                            percentile = VALUES(percentile)
                                              `);
}

/**
 * Snapshots for a user in [start, end) (season window).
 * Returns percentile rows only — enough for evaluateSage.
 *
 * Drizzle's `date` column is typed as Date, so compare with Date bounds
 * (not YYYY-MM-DD strings).
 */
export async function getUserSeasonSnapshots(
    userId: number,
    start: Date,
    end: Date,
  ): Promise<Array<{ percentile: number; snapshotDate: string; score: number; rank: number }>> {
    const db = await getDb();
    if (!db) return [];

  const rows = await db
      .select({
              percentile: dailyContributionSnapshots.percentile,
              snapshotDate: dailyContributionSnapshots.snapshotDate,
              score: dailyContributionSnapshots.score,
              rank: dailyContributionSnapshots.rank,
      })
      .from(dailyContributionSnapshots)
      .where(
              and(
                        eq(dailyContributionSnapshots.userId, userId),
                        gte(dailyContributionSnapshots.snapshotDate, start),
                        lt(dailyContributionSnapshots.snapshotDate, end),
                      ),
            );

  return rows.map((r) => ({
        percentile: Number(r.percentile),
        snapshotDate: String(r.snapshotDate),
        score: Number(r.score),
        rank: Number(r.rank),
  }));
}

/** Snapshots for the user in the current Game season. */
export async function getUserCurrentSeasonSnapshots(
    userId: number,
    now: Date = new Date(),
  ): Promise<Array<{ percentile: number; snapshotDate: string; score: number; rank: number }>> {
    const { start, end } = getCurrentSeasonDateRange(now);
    return getUserSeasonSnapshots(userId, start, end);
}
