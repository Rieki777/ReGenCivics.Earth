/**
 * Citizenship tier nightly batch end-to-end test (M-3).
 *
 * Seeds one player at the steward tier with an expired graceStartedAt
 * and a contributionScore that no longer qualifies them for that
 * tier. Runs `checkCitizenshipTiers` and asserts the player is
 * demoted to explorer with the right history row.
 *
 * The schema drift discovered on 2026-04-07 (player_profiles missing
 * citizenshipTier / citizenshipTierUpdatedAt / graceStartedAt /
 * seasonsCompleted) was resolved by migration
 * drizzle/0106_add_citizenship_tier_columns.sql.
 *
 * Skipped automatically when DATABASE_URL is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { checkCitizenshipTiers } from "./routes/batchJobs";

const skipIfNoDb = !process.env.DATABASE_URL;

const TEST_USER_EMAIL = `tier-test-${Date.now()}@regencivics.test`;
let testUserId: number | null = null;

describe.skipIf(skipIfNoDb)("citizenship tier nightly batch (M-3)", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Insert a throwaway test user
    const userResult: any = await db.execute(sql`
      INSERT INTO users (openId, name, email, role)
      VALUES (${TEST_USER_EMAIL}, 'Tier Test User', ${TEST_USER_EMAIL}, 'user')
    `);
    testUserId = (userResult as any)?.[0]?.insertId ?? null;
    if (!testUserId) throw new Error("Failed to insert test user");

    // Seed a player profile that should demote on the next batch:
    //   - currently citizenshipTier = 'steward'
    //   - contributionScore = 5 (well below the 50 floor for steward)
    //   - graceStartedAt = 90 days ago (well past the 30-day grace window)
    await db.execute(sql`
      INSERT INTO player_profiles (
        userId, displayName, citizenshipTier, contributionScore,
        graceStartedAt, seasonsCompleted
      ) VALUES (
        ${testUserId}, 'Tier Test User', 'steward', 5,
        DATE_SUB(NOW(), INTERVAL 90 DAY), 1
      )
    `);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db || !testUserId) return;
    // Best-effort cleanup so the test does not pollute the live DB
    await db.execute(sql`DELETE FROM citizenship_tier_history WHERE userId = ${testUserId}`);
    await db.execute(sql`DELETE FROM player_profiles WHERE userId = ${testUserId}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${testUserId}`);
  });

  it("demotes a player whose grace period has expired", { timeout: 60_000 }, async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db || !testUserId) return;

    // checkCitizenshipTiers iterates every row in player_profiles, so on
    // a real DB this can take several seconds. The 60s timeout above
    // gives it room to breathe without making the test feel broken.
    const result = await checkCitizenshipTiers(db);
    expect(result.demotions).toBeGreaterThanOrEqual(1);

    // Verify the test user specifically is now back at explorer
    const rows = await db.execute(sql`
      SELECT citizenshipTier, graceStartedAt FROM player_profiles WHERE userId = ${testUserId}
    `);
    const row = (rows as any)?.[0]?.[0];
    expect(row).toBeTruthy();
    expect(row.citizenshipTier).toBe("explorer");
    expect(row.graceStartedAt).toBeNull();

    // Verify a history row was written with the right reason
    const history = await db.execute(sql`
      SELECT fromTier, toTier, reason FROM citizenship_tier_history
      WHERE userId = ${testUserId}
      ORDER BY id DESC LIMIT 1
    `);
    const last = (history as any)?.[0]?.[0];
    expect(last).toBeTruthy();
    expect(last.fromTier).toBe("steward");
    expect(last.toTier).toBe("explorer");
    expect(last.reason).toBe("grace_period_expired");
  });
});
