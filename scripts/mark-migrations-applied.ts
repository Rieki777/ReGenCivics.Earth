/**
 * One-time script: marks specific Drizzle migrations as already applied
 * in the __drizzle_migrations table without re-running their SQL.
 *
 * Use this when a migration's SQL has already been executed manually on
 * production but Drizzle doesn't know about it yet.
 *
 * Usage:
 *   railway run npx tsx scripts/mark-migrations-applied.ts
 *
 * The script is idempotent — it checks for existing hash records before
 * inserting, so running it twice is safe.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

// Migrations to mark as applied.
// These have already been executed on production but are not recorded in
// __drizzle_migrations. `when` values come from drizzle/meta/_journal.json.
const MIGRATIONS_TO_MARK = [
  { tag: "0036_dashing_adam_destine", when: 1772827747709 },
  { tag: "0039_meeting_frequency_dietary_patterns", when: 1741320000000 },
  { tag: "0040_early_darkstar", when: 1773000890165 },
  { tag: "0041_spooky_monster_badoon", when: 1773275918364 },
  { tag: "0042_amusing_guardian", when: 1773285409941 },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);

  try {
    // Ensure the migrations table exists (Drizzle creates it on first migrate,
    // but it may not exist yet if migrations have never been run via Drizzle).
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    // Fetch all hashes already in the table
    const [rows] = await conn.execute(
      `SELECT hash FROM \`__drizzle_migrations\``
    ) as mysql.RowDataPacket[][];
    const existingHashes = new Set(rows.map((r) => r.hash as string));

    for (const { tag, when } of MIGRATIONS_TO_MARK) {
      const sqlPath = path.join(MIGRATIONS_DIR, `${tag}.sql`);

      if (!fs.existsSync(sqlPath)) {
        console.warn(`WARN: SQL file not found, skipping: ${sqlPath}`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, "utf-8");
      const hash = crypto.createHash("sha256").update(sql).digest("hex");

      if (existingHashes.has(hash)) {
        console.log(`— Already recorded: ${tag} (hash: ${hash.slice(0, 12)}...)`);
        continue;
      }

      await conn.execute(
        `INSERT INTO \`__drizzle_migrations\` (hash, created_at) VALUES (?, ?)`,
        [hash, when]
      );

      console.log(`✓ Marked as applied: ${tag} (hash: ${hash.slice(0, 12)}...)`);
    }

    console.log("\nDone. These migrations will be skipped on next deploy.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
