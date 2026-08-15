/**
 * check-schema-drift.ts
 *
 * Foundation audit finding C5. Diffs the live database (information_schema)
 * against `drizzle/schema.ts`, the TypeScript type source of truth.
 *
 *   npx tsx scripts/check-schema-drift.ts
 *
 * CI runs this against the freshly-built database (ci-baseline.sql plus any
 * migrations added since), so it fails a push where schema.ts gained a table or
 * column that no migration creates. That is the drift that hurts: the runtime
 * types promise a column the database does not have, and the failure surfaces
 * in production rather than here.
 *
 * The check is deliberately ONE-DIRECTIONAL. Tables and columns that exist in
 * the database but not in schema.ts are reported as info, never failures: the
 * database carries legacy tables that schema.ts has never modelled (220 vs 207
 * at the time of writing), and failing on those would just train people to
 * ignore this gate.
 *
 * Reads schema.ts through drizzle's own getTableConfig rather than parsing the
 * file, so it cannot drift from how the ORM actually reads the schema.
 */

import mysql from "mysql2/promise";
import { getTableConfig, type MySqlTable } from "drizzle-orm/mysql-core";
import { is } from "drizzle-orm";
import { MySqlTable as MySqlTableClass } from "drizzle-orm/mysql-core";
import * as dotenv from "dotenv";
import * as schema from "../drizzle/schema";

dotenv.config({ quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in environment.");
  process.exit(1);
}

/**
 * Drift that already existed when this check was written (2026-07-16), frozen
 * so the gate can go green and catch NEW drift. Same convention as the
 * GRANDFATHERED set in check-migration-numbers.mjs. Do not add to this list:
 * write the migration instead.
 *
 * These are not cosmetic. Every entry is referenced by mounted server code, so
 * each one is a live ER_NO_SUCH_TABLE / unknown-column error in production:
 *   - referrals, share_events  -> server/routes/sharing.ts (routers.ts:185)
 *   - organisations.regenerativeScore -> server/routes/orgRatings.ts (routers.ts:194)
 * Tracked for repair under separate commits; they are listed here to make the
 * gate honest about what it is knowingly ignoring, not to bless them.
 */
const KNOWN_DRIFT = new Set([
  "referrals",
  "share_events",
  "organisations.communityRatingsCount",
  "organisations.regenerativeScore",
  "organisations.regenerativeTier",
  "seasonal_councils.meetingDate",
  "seasonal_councils.notes",
  "seasonal_harvests.percentileAtEnd",
  "seasonal_harvests.scoreAtEnd",
]);

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

async function main() {
  const config = parseConnectionString(DATABASE_URL!);
  const conn = await mysql.createConnection({ ...config, multipleStatements: false });

  try {
    const [rows] = await conn.query<any[]>(
      `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    const live = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!live.has(row.TABLE_NAME)) live.set(row.TABLE_NAME, new Set());
      live.get(row.TABLE_NAME)!.add(row.COLUMN_NAME);
    }

    const declared = new Map<string, Set<string>>();
    for (const value of Object.values(schema)) {
      if (!is(value, MySqlTableClass)) continue;
      const cfg = getTableConfig(value as MySqlTable);
      declared.set(cfg.name, new Set(cfg.columns.map((c) => c.name)));
    }

    const missingTables: string[] = [];
    const missingColumns: string[] = [];
    const knownHits: string[] = [];

    for (const [table, columns] of declared) {
      const liveColumns = live.get(table);
      if (!liveColumns) {
        if (KNOWN_DRIFT.has(table)) knownHits.push(table);
        else missingTables.push(table);
        continue;
      }
      for (const column of columns) {
        if (liveColumns.has(column)) continue;
        const key = `${table}.${column}`;
        if (KNOWN_DRIFT.has(key)) knownHits.push(key);
        else missingColumns.push(key);
      }
    }

    const extraTables = [...live.keys()].filter(
      (t) => !declared.has(t) && !t.startsWith("_")
    );

    console.log(
      `Compared ${declared.size} tables declared in schema.ts against ${live.size} in ${config.database}.`
    );

    if (extraTables.length > 0) {
      console.log(
        `\nInfo: ${extraTables.length} table(s) in the database are not modelled in schema.ts. ` +
          `Not a failure.\n  ${extraTables.sort().join("\n  ")}`
      );
    }

    if (knownHits.length > 0) {
      console.log(
        `\nKnown drift, grandfathered (${knownHits.length}). Each is a live bug awaiting a migration:\n  ` +
          knownHits.sort().join("\n  ")
      );
    }

    if (missingTables.length === 0 && missingColumns.length === 0) {
      console.log("\nNo new drift: every table and column schema.ts declares exists in the database.");
      return;
    }

    console.error("\nSCHEMA DRIFT: schema.ts declares things the database does not have.");
    if (missingTables.length > 0) {
      console.error(`\nMissing tables (${missingTables.length}):`);
      for (const t of missingTables.sort()) console.error(`  ${t}`);
    }
    if (missingColumns.length > 0) {
      console.error(`\nMissing columns (${missingColumns.length}):`);
      for (const c of missingColumns.sort()) console.error(`  ${c}`);
    }
    console.error(
      `\nWrite a migration in drizzle/ that creates these, then run it. If the\n` +
        `database is right and schema.ts is wrong, fix schema.ts instead.`
    );
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
