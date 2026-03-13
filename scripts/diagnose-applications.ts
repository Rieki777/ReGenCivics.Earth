/**
 * diagnose-applications.ts -- Report on all applications in the database.
 * Shows counts, status breakdown, and lists all submitted/active applications
 * so you can identify which are real vs test data.
 *
 * Usage:
 *   npx tsx scripts/diagnose-applications.ts
 *
 * Requires DATABASE_URL env var.
 */

import * as mysql from "mysql2/promise";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  // Count by status
  const [counts] = await conn.execute(
    "SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC"
  ) as any;

  console.log("\n=== Application Counts by Status ===");
  for (const row of counts) {
    console.log(`  ${row.status}: ${row.count}`);
  }

  // List all submitted / under_review / approved applications
  const [realApps] = await conn.execute(
    "SELECT a.id, a.projectName, a.status, a.createdAt, u.email FROM applications a LEFT JOIN users u ON a.userId = u.id WHERE a.status IN ('submitted','under_review','approved','accepted','active') ORDER BY a.id ASC"
  ) as any;

  console.log(`\n=== Submitted / Active Applications (${realApps.length} total) ===`);
  for (const app of realApps) {
    console.log(`  id=${app.id}  status=${app.status}  name="${app.projectName}"  email=${app.email}  created=${app.createdAt}`);
  }

  // Also list drafts with a project name (potential real data)
  const [drafts] = await conn.execute(
    "SELECT a.id, a.projectName, a.status, a.createdAt, u.email FROM applications a LEFT JOIN users u ON a.userId = u.id WHERE a.status = 'draft' AND a.projectName IS NOT NULL AND a.projectName != 'Untitled Project' AND a.projectName != '' ORDER BY a.id ASC LIMIT 20"
  ) as any;

  if (drafts.length > 0) {
    console.log(`\n=== Named Drafts (${drafts.length} shown, max 20) ===`);
    for (const app of drafts) {
      console.log(`  id=${app.id}  name="${app.projectName}"  email=${app.email}  created=${app.createdAt}`);
    }
  }

  await conn.end();
  console.log("\nDone. Use these IDs in cleanup-test-applications.ts KEEP_IDS array.");
}

main().catch(err => { console.error(err); process.exit(1); });
