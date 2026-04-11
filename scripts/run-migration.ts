/**
 * run-migration.ts
 *
 * Runs SQL migration files against the Railway MySQL database.
 * Uses the DATABASE_URL from .env. Tracks which migrations have been applied
 * in a `_migrations_applied` table so the same file is never run twice.
 *
 * Usage:
 *   npx tsx scripts/run-migration.ts drizzle/0101_regen_tools_library.sql
 *   npx tsx scripts/run-migration.ts drizzle/0101_regen_tools_library.sql drizzle/0102_another.sql
 *   npx tsx scripts/run-migration.ts --all          # runs all unapplied migrations in drizzle/
 *   npx tsx scripts/run-migration.ts --status        # shows which migrations have been applied
 *
 * The script:
 *   1. Connects to MySQL using DATABASE_URL
 *   2. Creates _migrations_applied table if it doesn't exist
 *   3. Checks if migration was already applied
 *   4. Splits SQL by semicolons, executes each statement
 *   5. Records the migration as applied
 *   6. Reports results
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in environment. Check your .env file.");
  process.exit(1);
}

function parseConnectionString(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306"),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1), // remove leading /
  };
}

async function ensureTrackingTable(conn: mysql.Connection) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS _migrations_applied (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      statementsRun INT DEFAULT 0
    )
  `);
}

async function getAppliedMigrations(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.execute("SELECT filename FROM _migrations_applied");
  return new Set((rows as any[]).map((r) => r.filename));
}

async function runMigrationFile(conn: mysql.Connection, filePath: string): Promise<boolean> {
  const filename = path.basename(filePath);

  // Check if already applied
  const applied = await getAppliedMigrations(conn);
  if (applied.has(filename)) {
    console.log(`  SKIP: ${filename} (already applied)`);
    return false;
  }

  // Read and parse SQL.
  // Split on semicolons, then for each chunk strip leading comment-only lines
  // (lines starting with `--` or blank). A chunk that begins with a file-level
  // comment and then has a real CREATE/INSERT/etc below must still run.
  const sql = fs.readFileSync(filePath, "utf-8");
  const statements = sql
    .split(";")
    .map((chunk) => {
      const lines = chunk.split("\n");
      let firstReal = 0;
      while (firstReal < lines.length) {
        const trimmed = lines[firstReal].trim();
        if (trimmed.length === 0 || trimmed.startsWith("--")) {
          firstReal++;
          continue;
        }
        break;
      }
      return lines.slice(firstReal).join("\n").trim();
    })
    .filter((s) => s.length > 0);

  if (statements.length === 0) {
    console.log(`  SKIP: ${filename} (no SQL statements found)`);
    return false;
  }

  console.log(`  RUN:  ${filename} (${statements.length} statements)`);

  let successCount = 0;
  for (const statement of statements) {
    try {
      await conn.execute(statement);
      successCount++;
    } catch (err: any) {
      // Some errors are OK (like "table already exists" with IF NOT EXISTS,
      // or "duplicate key" with ON DUPLICATE KEY UPDATE)
      const code = err.code || "";
      const errno = err.errno || 0;

      if (errno === 1065) {
        // Empty query, skip
        continue;
      }

      console.error(`  ERR:  ${err.message}`);
      console.error(`        Statement: ${statement.slice(0, 80)}...`);
      throw err;
    }
  }

  // Record as applied
  await conn.execute(
    "INSERT INTO _migrations_applied (filename, statementsRun) VALUES (?, ?)",
    [filename, successCount]
  );

  console.log(`  DONE: ${filename} (${successCount} statements executed)`);
  return true;
}

async function showStatus(conn: mysql.Connection) {
  // Get all SQL files in drizzle/ that match the numbered pattern
  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  const allFiles = fs.readdirSync(drizzleDir)
    .filter((f) => /^\d{4}.*\.sql$/.test(f))
    .sort();

  const applied = await getAppliedMigrations(conn);

  console.log("\nMigration Status:");
  console.log("=".repeat(60));

  let pendingCount = 0;
  for (const file of allFiles) {
    const status = applied.has(file) ? "APPLIED" : "PENDING";
    const marker = applied.has(file) ? "  " : "* ";
    console.log(`${marker}[${status}] ${file}`);
    if (!applied.has(file)) pendingCount++;
  }

  console.log("=".repeat(60));
  console.log(`Total: ${allFiles.length} | Applied: ${allFiles.length - pendingCount} | Pending: ${pendingCount}`);
}

async function findUnappliedMigrations(conn: mysql.Connection): Promise<string[]> {
  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  const allFiles = fs.readdirSync(drizzleDir)
    .filter((f) => /^\d{4}.*\.sql$/.test(f))
    .sort();

  const applied = await getAppliedMigrations(conn);

  return allFiles
    .filter((f) => !applied.has(f))
    .map((f) => path.join(drizzleDir, f));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage:");
    console.log("  npx tsx scripts/run-migration.ts <file.sql> [file2.sql ...]");
    console.log("  npx tsx scripts/run-migration.ts --all      Run all unapplied migrations");
    console.log("  npx tsx scripts/run-migration.ts --status   Show migration status");
    process.exit(0);
  }

  const config = parseConnectionString(DATABASE_URL!);
  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`);

  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: false,
  });

  try {
    await ensureTrackingTable(conn);

    if (args[0] === "--status") {
      await showStatus(conn);
      return;
    }

    let files: string[];

    if (args[0] === "--all") {
      files = await findUnappliedMigrations(conn);
      if (files.length === 0) {
        console.log("All migrations are already applied.");
        return;
      }
      console.log(`Found ${files.length} unapplied migration(s):\n`);
    } else {
      // Resolve file paths
      files = args.map((a) => {
        const resolved = path.resolve(process.cwd(), a);
        if (!fs.existsSync(resolved)) {
          console.error(`ERROR: File not found: ${a}`);
          process.exit(1);
        }
        return resolved;
      });
    }

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const wasApplied = await runMigrationFile(conn, file);
        if (wasApplied) applied++;
        else skipped++;
      } catch (err) {
        failed++;
        console.error(`FAILED: ${path.basename(file)}`);
        // Continue with other files or stop?
        if (args[0] !== "--all") {
          // Stop on single file errors
          process.exit(1);
        }
      }
    }

    console.log(`\nResults: ${applied} applied, ${skipped} skipped, ${failed} failed`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
