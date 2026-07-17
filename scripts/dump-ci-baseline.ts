/**
 * dump-ci-baseline.ts
 *
 * Regenerates `drizzle/ci-baseline.sql`: a structure-only snapshot of the
 * schema, used to build a fresh database in CI. See ADR-37.
 *
 * Why this file exists at all: the numbered migrations cannot build a fresh
 * database. 36 of them fail on an empty MySQL across five root causes (the
 * keystone is `0096_game_system.sql`, which quotes `maxValue` bare and so is a
 * syntax error on any MySQL: MAXVALUE is a reserved word. That one file
 * cascades into 20 more). Those files are already applied in production and
 * must never be re-run there, so they are frozen as history rather than fixed.
 * CI loads this baseline instead, then runs `run-migration.ts --all` for
 * anything added since.
 *
 * The dump carries `_migrations_applied` rows (filenames only, no timestamps)
 * so the runner knows the baselined history is already applied and only new
 * migrations run on top. That is what makes CI test new migrations.
 *
 * Structure, plus rows for the REFERENCE_TABLES allowlist below. Everything
 * else is structure-only: the DB-backed suites build and clean up their own
 * fixtures (see evolution.test.ts / ratification.test.ts), and a full data dump
 * would drag production content into the repo.
 *
 * Regenerate when the base schema drifts (the drift check in
 * `check-schema-drift.ts` tells you when):
 *
 *   npx tsx scripts/dump-ci-baseline.ts
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in environment. Check your .env file.");
  process.exit(1);
}

const OUT_PATH = path.resolve(process.cwd(), "drizzle", "ci-baseline.sql");

/**
 * Tables whose ROWS ship in the baseline, not just their structure.
 *
 * The bar is: seeded reference data that migrations create and that the app (or
 * a test) treats as always-present. `forumCategories` is the case that forced
 * this: forum.test.ts asserts the `general` category exists, and the seed
 * migrations that would recreate it are part of the broken history this
 * baseline replaces.
 *
 * Keep this list short and keep live state OUT of it. `game_variables` looks
 * like reference data but is not: the evolution engine rewrites those values
 * through governance, so dumping them would churn this file and make the drift
 * check meaningless.
 */
const REFERENCE_TABLES = ["forumCategories"];

function parseConnectionString(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306"),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
  };
}

/**
 * AUTO_INCREMENT counters track row inserts, so leaving them in would make the
 * dump churn on every regeneration and turn the drift check into noise.
 */
function normalize(ddl: string): string {
  return ddl.replace(/\s+AUTO_INCREMENT=\d+/g, "").replace(/\r\n/g, "\n");
}

async function main() {
  const config = parseConnectionString(DATABASE_URL!);
  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`);

  const conn = await mysql.createConnection({ ...config, multipleStatements: false });

  try {
    const [tableRows] = await conn.query<any[]>(
      `SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [config.database]
    );

    const baseTables = tableRows
      .filter((r) => r.TABLE_TYPE === "BASE TABLE")
      .map((r) => r.TABLE_NAME as string);
    const views = tableRows
      .filter((r) => r.TABLE_TYPE === "VIEW")
      .map((r) => r.TABLE_NAME as string);

    console.log(`Found ${baseTables.length} tables and ${views.length} views.`);

    const parts: string[] = [];
    parts.push("-- ci-baseline.sql: GENERATED FILE, DO NOT EDIT BY HAND.");
    parts.push("-- Regenerate with: npx tsx scripts/dump-ci-baseline.ts");
    parts.push("--");
    parts.push("-- Structure-only snapshot used to build a fresh CI database. The numbered");
    parts.push("-- migrations cannot do this on their own (see ADR-37); CI loads this file,");
    parts.push("-- then runs run-migration.ts --all for anything added since the snapshot.");
    parts.push("");
    // Tables are emitted alphabetically, so a child table can precede its
    // parent. Disable FK checks for the load rather than topologically sort.
    parts.push("SET FOREIGN_KEY_CHECKS = 0;");
    parts.push("");

    for (const table of baseTables) {
      const [rows] = await conn.query<any[]>(`SHOW CREATE TABLE \`${table}\``);
      const ddl = normalize(rows[0]["Create Table"]);
      parts.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      parts.push(`${ddl};`);
      parts.push("");
    }

    for (const view of views) {
      const [rows] = await conn.query<any[]>(`SHOW CREATE VIEW \`${view}\``);
      // DEFINER pins the dump to a specific MySQL account, which will not exist
      // in the CI service container.
      const ddl = normalize(rows[0]["Create View"]).replace(
        /DEFINER=`[^`]*`@`[^`]*`\s*/g,
        ""
      );
      parts.push(`DROP VIEW IF EXISTS \`${view}\`;`);
      parts.push(`${ddl};`);
      parts.push("");
    }

    for (const table of REFERENCE_TABLES) {
      if (!baseTables.includes(table)) {
        throw new Error(
          `REFERENCE_TABLES lists '${table}', which does not exist in ${config.database}. ` +
            `Remove it from the allowlist or fix the name.`
        );
      }
      const [rows] = await conn.query<any[]>(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const columnList = columns.map((c) => `\`${c}\``).join(", ");
      const values = rows
        .map(
          (row) =>
            `  (${columns.map((c) => mysql.escape(row[c])).join(", ")})`
        )
        .join(",\n");

      parts.push(`-- Reference rows: ${table} (${rows.length}).`);
      parts.push(`INSERT INTO \`${table}\` (${columnList}) VALUES\n${values};`);
      parts.push("");
      console.log(`  reference data: ${table} (${rows.length} rows)`);
    }

    parts.push("SET FOREIGN_KEY_CHECKS = 1;");
    parts.push("");

    // Record the baselined migration history so run-migration.ts --all skips it
    // and applies only what landed after this snapshot.
    const [applied] = await conn.query<any[]>(
      "SELECT filename FROM _migrations_applied ORDER BY filename"
    );
    if (applied.length > 0) {
      parts.push("-- Migration history covered by this baseline.");
      const values = applied
        .map((r) => `  (${mysql.escape(r.filename)}, 0)`)
        .join(",\n");
      parts.push(
        `INSERT INTO _migrations_applied (filename, statementsRun) VALUES\n${values};`
      );
      parts.push("");
    }

    fs.writeFileSync(OUT_PATH, parts.join("\n"), "utf-8");
    console.log(
      `Wrote ${path.relative(process.cwd(), OUT_PATH)} (${baseTables.length} tables, ${views.length} views, ${applied.length} migrations baselined).`
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
