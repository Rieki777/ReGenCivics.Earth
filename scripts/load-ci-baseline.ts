/**
 * load-ci-baseline.ts
 *
 * Loads `drizzle/ci-baseline.sql` into the database named by DATABASE_URL.
 * CI runs this to build a fresh schema before `run-migration.ts --all`. See ADR-37.
 *
 *   npx tsx scripts/load-ci-baseline.ts
 *
 * Refuses to run against anything that looks like production. This script
 * drops every table in the baseline, so a misaimed DATABASE_URL would be
 * unrecoverable. Set CI_BASELINE_ALLOW_NONLOCAL=1 to override for a scratch
 * database on a remote host.
 *
 * Uses multipleStatements rather than run-migration.ts's semicolon splitter:
 * the splitter chokes on semicolons inside inline comments, and a generated
 * DDL dump has no reason to route through it.
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in environment.");
  process.exit(1);
}

const BASELINE_PATH = path.resolve(process.cwd(), "drizzle", "ci-baseline.sql");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "mysql", "host.docker.internal"]);

function main() {
  const url = new URL(DATABASE_URL!);
  const host = url.hostname;
  const database = url.pathname.slice(1);

  const isLocal = LOCAL_HOSTS.has(host);
  const override = process.env.CI_BASELINE_ALLOW_NONLOCAL === "1";

  if (!isLocal && !override) {
    console.error(
      `REFUSING: DATABASE_URL points at '${host}', which is not a local/CI host.\n` +
        `This script DROPs every table in the baseline. If you really mean to\n` +
        `target a scratch database on a remote host, set CI_BASELINE_ALLOW_NONLOCAL=1.`
    );
    process.exit(1);
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(
      `ERROR: ${path.relative(process.cwd(), BASELINE_PATH)} not found.\n` +
        `Generate it with: npx tsx scripts/dump-ci-baseline.ts`
    );
    process.exit(1);
  }

  return { url, host, database };
}

const { url, host, database } = main()!;

(async () => {
  const sql = fs.readFileSync(BASELINE_PATH, "utf-8");

  console.log(`Loading baseline into ${host}:${url.port || 3306}/${database}...`);

  const conn = await mysql.createConnection({
    host,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    const [rows] = await conn.query<any[]>(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [database]
    );
    const [applied] = await conn.query<any[]>(
      "SELECT COUNT(*) AS n FROM _migrations_applied"
    );
    console.log(
      `Baseline loaded: ${rows[0].n} tables present, ${applied[0].n} migrations marked applied.`
    );
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
