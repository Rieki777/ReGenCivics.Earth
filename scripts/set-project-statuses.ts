/**
 * set-project-statuses.ts
 *
 * Updates land project application statuses based on Rye's 2026-03-13 review.
 * Run AFTER `pnpm db:push` has been run to add active/inactive to the status enum.
 *
 * Usage:
 *   npx tsx scripts/set-project-statuses.ts [--dry-run]
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

const ACTIVE_PROJECTS = [
  "Finca Sagrada",
  "Liminal Village",
  "Traditional Dream Factory",
  "Heartland Collective",
  "StarSeed Village",
  "Nyx",
  "NeighbourGood",
];

const INACTIVE_PROJECTS = [
  "Salt Cross",
  "La Tierra",
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Load .env first.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);
  console.log(DRY_RUN ? "DRY RUN — no changes will be written\n" : "LIVE RUN — writing to DB\n");

  try {
    // Show current state of all named projects
    const allNames = [...ACTIVE_PROJECTS, ...INACTIVE_PROJECTS];
    const placeholders = allNames.map(() => "?").join(", ");
    const [rows] = await conn.execute<any[]>(
      `SELECT id, projectName, status FROM applications WHERE projectName IN (${placeholders})`,
      allNames,
    );

    console.log("Current state of named projects:");
    for (const row of rows) {
      console.log(`  [${row.id}] ${row.projectName} — ${row.status}`);
    }
    console.log();

    // Set active
    for (const name of ACTIVE_PROJECTS) {
      const match = rows.find((r: any) => r.projectName === name);
      if (!match) {
        console.log(`  SKIP (not in DB): ${name}`);
        continue;
      }
      if (match.status === "active") {
        console.log(`  ALREADY ACTIVE: ${name}`);
        continue;
      }
      console.log(`  SET active: ${name} (was: ${match.status})`);
      if (!DRY_RUN) {
        await conn.execute(
          "UPDATE applications SET status = 'active' WHERE id = ?",
          [match.id],
        );
      }
    }

    // Set inactive
    for (const name of INACTIVE_PROJECTS) {
      const match = rows.find((r: any) => r.projectName === name);
      if (!match) {
        console.log(`  SKIP (not in DB): ${name}`);
        continue;
      }
      if (match.status === "inactive") {
        console.log(`  ALREADY INACTIVE: ${name}`);
        continue;
      }
      console.log(`  SET inactive: ${name} (was: ${match.status})`);
      if (!DRY_RUN) {
        await conn.execute(
          "UPDATE applications SET status = 'inactive' WHERE id = ?",
          [match.id],
        );
      }
    }

    if (DRY_RUN) {
      console.log("\nDRY RUN complete. Re-run without --dry-run to apply.");
    } else {
      console.log("\nDone. Statuses updated.");
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
