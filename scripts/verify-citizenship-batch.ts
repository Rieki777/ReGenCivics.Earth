/**
 * Citizenship tier batch verification (one-off script).
 *
 * Proves end-to-end that `checkCitizenshipTiers` actually demotes a player
 * whose grace period has expired AND writes the corresponding history row.
 *
 * Background:
 *   - `checkCitizenshipTiers` is defined in `server/routes/batchJobs.ts`.
 *   - It is invoked from the `runNightly` admin tRPC procedure (same file)
 *     and now from the `/api/cron/nightly-batch` Railway cron endpoint
 *     registered in `server/_core/index.ts`.
 *   - It does NOT write to a `notifications` table. The actual record of a
 *     demotion lives in `citizenship_tier_history` (the prompt asked for a
 *     "notification row"; the equivalent here is the history row, since no
 *     notifications table exists for tier changes).
 *
 * Usage:
 *   DATABASE_URL=mysql://... npx tsx scripts/verify-citizenship-batch.ts
 *
 * Exit codes:
 *   0 — all assertions PASS
 *   1 — at least one assertion FAILED, or DATABASE_URL was missing
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { checkCitizenshipTiers } from "../server/routes/batchJobs";

const TEST_EMAIL = `tier-verify-${Date.now()}@regencivics.test`;

let pass = 0;
let fail = 0;

function assertEq(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  PASS  ${label}: ${String(actual)}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}: expected ${String(expected)}, got ${String(actual)}`);
    fail++;
  }
}

function assertGte(label: string, actual: number, min: number) {
  const ok = actual >= min;
  if (ok) {
    console.log(`  PASS  ${label}: ${actual} >= ${min}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}: ${actual} < ${min}`);
    fail++;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Cannot verify against live DB.");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("getDb() returned null. Cannot verify.");
    process.exit(1);
  }

  let testUserId: number | null = null;

  try {
    console.log(`\nSeeding test user (${TEST_EMAIL})...`);

    const userInsert: any = await db.execute(sql`
      INSERT INTO users (openId, name, email, role)
      VALUES (${TEST_EMAIL}, 'Tier Verify User', ${TEST_EMAIL}, 'user')
    `);
    testUserId = (userInsert as any)?.[0]?.insertId ?? null;
    if (!testUserId) throw new Error("Failed to insert test user");
    console.log(`  user id = ${testUserId}`);

    // Seed a player profile that should demote on the next batch:
    //   - currently citizenshipTier = 'steward'
    //   - contributionScore = 5 (well below the 50 floor for steward)
    //   - graceStartedAt = 90 days ago (well past the 30-day grace window)
    await db.execute(sql`
      INSERT INTO player_profiles (
        userId, displayName, citizenshipTier, contributionScore,
        graceStartedAt, seasonsCompleted
      ) VALUES (
        ${testUserId}, 'Tier Verify User', 'steward', 5,
        DATE_SUB(NOW(), INTERVAL 90 DAY), 1
      )
    `);
    console.log("  player_profile seeded at steward / score 5 / grace -90d");

    console.log("\nRunning checkCitizenshipTiers...");
    const result = await checkCitizenshipTiers(db);
    console.log(`  result = ${JSON.stringify(result)}`);

    console.log("\nAssertions:");
    assertGte("checkCitizenshipTiers reported >= 1 demotion", result.demotions, 1);

    const profileRows: any = await db.execute(sql`
      SELECT citizenshipTier, graceStartedAt
      FROM player_profiles WHERE userId = ${testUserId}
    `);
    const profile = profileRows?.[0]?.[0];
    assertEq("test user citizenshipTier dropped to explorer", profile?.citizenshipTier, "explorer");
    assertEq("test user graceStartedAt cleared", profile?.graceStartedAt, null);

    const historyRows: any = await db.execute(sql`
      SELECT fromTier, toTier, reason
      FROM citizenship_tier_history
      WHERE userId = ${testUserId}
      ORDER BY id DESC LIMIT 1
    `);
    const last = historyRows?.[0]?.[0];
    assertEq("history fromTier == steward", last?.fromTier, "steward");
    assertEq("history toTier == explorer", last?.toTier, "explorer");
    assertEq("history reason == grace_period_expired", last?.reason, "grace_period_expired");
  } catch (err) {
    console.error("\nUnexpected error during verification:", err);
    fail++;
  } finally {
    if (testUserId) {
      console.log("\nCleaning up test rows...");
      try {
        await db.execute(sql`DELETE FROM citizenship_tier_history WHERE userId = ${testUserId}`);
        await db.execute(sql`DELETE FROM player_profiles WHERE userId = ${testUserId}`);
        await db.execute(sql`DELETE FROM users WHERE id = ${testUserId}`);
        console.log("  done");
      } catch (cleanupErr) {
        console.error("  cleanup failed:", cleanupErr);
      }
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
