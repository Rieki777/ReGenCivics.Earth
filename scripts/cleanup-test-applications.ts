/**
 * cleanup-test-applications.ts -- Delete test/dummy applications from the database.
 *
 * INSTRUCTIONS:
 * 1. Run `npx tsx scripts/diagnose-applications.ts` first to see all applications.
 * 2. Identify the IDs of REAL applications you want to keep.
 * 3. Add those IDs to KEEP_IDS below.
 * 4. Run with DRY_RUN=true first to preview what would be deleted.
 * 5. When satisfied, run with DRY_RUN=false to actually delete.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/cleanup-test-applications.ts
 *   DRY_RUN=false npx tsx scripts/cleanup-test-applications.ts
 *
 * Requires DATABASE_URL env var.
 */

import * as mysql from "mysql2/promise";

// ─── EDIT THIS ARRAY ──────────────────────────────────────────────────────────
// Add the IDs of real applications you want to KEEP (all others will be deleted).
// Run diagnose-applications.ts first to find your real IDs.
const KEEP_IDS: number[] = [
  // e.g. 1, 2, 3
];
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN !== "false";

async function main() {
  if (KEEP_IDS.length === 0) {
    console.error("ERROR: KEEP_IDS is empty. Add real application IDs before running.");
    console.error("Run diagnose-applications.ts first to find your real IDs.");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  // Count what would be deleted
  const placeholders = KEEP_IDS.map(() => "?").join(", ");
  const [toDelete] = await conn.execute(
    `SELECT id, projectName, status, createdAt FROM applications WHERE id NOT IN (${placeholders}) ORDER BY id ASC`,
    KEEP_IDS
  ) as any;

  console.log(`\n=== Applications to DELETE (${toDelete.length} total) ===`);
  for (const app of toDelete) {
    console.log(`  id=${app.id}  status=${app.status}  name="${app.projectName}"  created=${app.createdAt}`);
  }

  const [toKeep] = await conn.execute(
    `SELECT id, projectName, status FROM applications WHERE id IN (${placeholders})`,
    KEEP_IDS
  ) as any;

  console.log(`\n=== Applications to KEEP (${toKeep.length} total) ===`);
  for (const app of toKeep) {
    console.log(`  id=${app.id}  status=${app.status}  name="${app.projectName}"`);
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No changes made. Set DRY_RUN=false to execute.");
  } else {
    if (toDelete.length === 0) {
      console.log("\nNothing to delete.");
    } else {
      await conn.execute(
        `DELETE FROM applications WHERE id NOT IN (${placeholders})`,
        KEEP_IDS
      );
      console.log(`\nDeleted ${toDelete.length} test applications.`);
    }
  }

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
