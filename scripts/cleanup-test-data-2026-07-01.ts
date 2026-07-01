/**
 * cleanup-test-data-2026-07-01.ts
 *
 * Deletes the throwaway rows created during the 2026-07-01 Cowork
 * coordination-engine verification. Guards on exact ids so it is
 * impossible to delete unrelated production data.
 *
 * Safe to run multiple times (idempotent). Prints a summary of what
 * it deleted (or found already gone).
 *
 * Run with: npx tsx scripts/cleanup-test-data-2026-07-01.ts
 * Requires: DATABASE_URL env var (copy from .env or Railway).
 */

import * as mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const TEST_BOUNTY_ID = 1;           // "TEST — coordination engine payout check"
const TEST_INVITE_PENDING_ID = 1;   // pending_members row
const TEST_INVITE_USER_ID = 5091510; // users row (rieki.cordon+invitetest@gmail.com)
const TEST_INVITE_EMAIL = "rieki.cordon+invitetest@gmail.com";
const TEST_ROLE_SLUG = "tool-curator";
const TEST_DATE_PREFIX = "2026-07-01";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);
  let totalDeleted = 0;

  console.log("\n=== Cleanup: 2026-07-01 Cowork test data ===\n");

  // ── 1. Bounty artifacts for the test bounty ───────────────────────────────
  const [artifacts] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM bounty_artifacts WHERE bountyId = ? LIMIT 50",
    [TEST_BOUNTY_ID]
  );
  if (artifacts.length) {
    await conn.execute("DELETE FROM bounty_artifacts WHERE bountyId = ?", [TEST_BOUNTY_ID]);
    console.log(`  deleted ${artifacts.length} bounty_artifacts for bounty ${TEST_BOUNTY_ID}`);
    totalDeleted += artifacts.length;
  } else {
    console.log(`  bounty_artifacts for bounty ${TEST_BOUNTY_ID}: none found`);
  }

  // ── 2. Bounty events for the test bounty ─────────────────────────────────
  const [bevents] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM bounty_events WHERE bountyId = ? LIMIT 50",
    [TEST_BOUNTY_ID]
  );
  if (bevents.length) {
    await conn.execute("DELETE FROM bounty_events WHERE bountyId = ?", [TEST_BOUNTY_ID]);
    console.log(`  deleted ${bevents.length} bounty_events for bounty ${TEST_BOUNTY_ID}`);
    totalDeleted += bevents.length;
  } else {
    console.log(`  bounty_events for bounty ${TEST_BOUNTY_ID}: none found`);
  }

  // ── 3. Bounty roles for the test bounty ──────────────────────────────────
  const [broles] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM bounty_roles WHERE bountyId = ? LIMIT 50",
    [TEST_BOUNTY_ID]
  );
  if (broles.length) {
    await conn.execute("DELETE FROM bounty_roles WHERE bountyId = ?", [TEST_BOUNTY_ID]);
    console.log(`  deleted ${broles.length} bounty_roles for bounty ${TEST_BOUNTY_ID}`);
    totalDeleted += broles.length;
  } else {
    console.log(`  bounty_roles for bounty ${TEST_BOUNTY_ID}: none found`);
  }

  // ── 4. The test bounty itself ─────────────────────────────────────────────
  const [bountyRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id, title FROM bounties WHERE id = ?",
    [TEST_BOUNTY_ID]
  );
  if (bountyRows.length) {
    await conn.execute("DELETE FROM bounties WHERE id = ?", [TEST_BOUNTY_ID]);
    console.log(`  deleted bounty ${TEST_BOUNTY_ID}: "${bountyRows[0].title}"`);
    totalDeleted += 1;
  } else {
    console.log(`  bounty ${TEST_BOUNTY_ID}: already gone`);
  }

  // ── 5. Tool-curator role assignment log entries from 2026-07-01 ──────────
  const [ralRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id, action FROM role_assignment_log WHERE roleSlug = ? AND DATE(createdAt) = ?",
    [TEST_ROLE_SLUG, TEST_DATE_PREFIX]
  );
  if (ralRows.length) {
    await conn.execute(
      "DELETE FROM role_assignment_log WHERE roleSlug = ? AND DATE(createdAt) = ?",
      [TEST_ROLE_SLUG, TEST_DATE_PREFIX]
    );
    console.log(`  deleted ${ralRows.length} role_assignment_log rows (slug=${TEST_ROLE_SLUG}, date=${TEST_DATE_PREFIX})`);
    totalDeleted += ralRows.length;
  } else {
    console.log(`  role_assignment_log (${TEST_ROLE_SLUG}, ${TEST_DATE_PREFIX}): none found`);
  }

  // ── 6. Test invite: pending_members row ──────────────────────────────────
  const [pmRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id, email FROM pending_members WHERE id = ?",
    [TEST_INVITE_PENDING_ID]
  );
  if (pmRows.length) {
    // Confirm the email matches before deleting.
    if (pmRows[0].email !== TEST_INVITE_EMAIL) {
      console.warn(`  WARNING: pending_members id ${TEST_INVITE_PENDING_ID} has email "${pmRows[0].email}", expected "${TEST_INVITE_EMAIL}". Skipping.`);
    } else {
      await conn.execute("DELETE FROM pending_members WHERE id = ?", [TEST_INVITE_PENDING_ID]);
      console.log(`  deleted pending_members id ${TEST_INVITE_PENDING_ID} (${pmRows[0].email})`);
      totalDeleted += 1;
    }
  } else {
    console.log(`  pending_members id ${TEST_INVITE_PENDING_ID}: already gone`);
  }

  // ── 7. Test invite: user_token_ledger rows for the test user ─────────────
  const [ledgerRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM user_token_ledger WHERE userId = ? LIMIT 50",
    [TEST_INVITE_USER_ID]
  );
  if (ledgerRows.length) {
    await conn.execute("DELETE FROM user_token_ledger WHERE userId = ?", [TEST_INVITE_USER_ID]);
    console.log(`  deleted ${ledgerRows.length} user_token_ledger rows for user ${TEST_INVITE_USER_ID}`);
    totalDeleted += ledgerRows.length;
  } else {
    console.log(`  user_token_ledger for user ${TEST_INVITE_USER_ID}: none found`);
  }

  // ── 8. Test invite: users row ─────────────────────────────────────────────
  const [userRows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT id, email FROM users WHERE id = ?",
    [TEST_INVITE_USER_ID]
  );
  if (userRows.length) {
    if (userRows[0].email !== TEST_INVITE_EMAIL) {
      console.warn(`  WARNING: users id ${TEST_INVITE_USER_ID} has email "${userRows[0].email}", expected "${TEST_INVITE_EMAIL}". Skipping.`);
    } else {
      await conn.execute("DELETE FROM users WHERE id = ?", [TEST_INVITE_USER_ID]);
      console.log(`  deleted users id ${TEST_INVITE_USER_ID} (${userRows[0].email})`);
      totalDeleted += 1;
    }
  } else {
    console.log(`  users id ${TEST_INVITE_USER_ID}: already gone`);
  }

  await conn.end();
  console.log(`\nDone. ${totalDeleted} row(s) deleted.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
