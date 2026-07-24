/**
 * seed-funding-pipeline.ts
 *
 * Load the 117-row funder pipeline (data/funding-pipeline-seed.json, researched
 * and source-verified 2026-07-24) into `funding_pipeline`.
 *
 * Idempotent, keyed on `name` (UNIQUE). Re-running refreshes the research
 * columns and leaves Rye's tracking work alone:
 *
 *   research columns  category, capitalType, whatItFunds, typicalSize,
 *                     geography, eligibility, accessStatus, deadline, fit,
 *                     regenEntity, link, notes, priority, sortOrder
 *                     -> always overwritten from the JSON
 *
 *   tracking columns  appStatus, owner, nextAction, nextActionDate, lastTouch
 *                     -> set on first insert only, never overwritten
 *
 * That split matters: the JSON is the research record and gets re-verified over
 * time, but a re-seed must never walk a submitted application back to
 * not_started.
 *
 * sortOrder is the file order within a priority band, so the portal's default
 * sort reproduces the order the research was compiled in.
 *
 * DRK is the one row that seeds mid-funnel: its application is drafted
 * (APPLICATION_DRK_2026-07-24.md) and blocked only on Rye's CV.
 *
 * Usage:
 *   npx tsx scripts/seed-funding-pipeline.ts             # upsert all rows
 *   npx tsx scripts/seed-funding-pipeline.ts --dry-run   # plan only, no DB
 *
 * Requires DATABASE_URL (.env). For local runs against Railway use the public
 * proxy URL, not mysql.railway.internal.
 */
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

const isDryRun = process.argv.includes("--dry-run");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(__dirname, "..", "data", "funding-pipeline-seed.json");

const PRIORITIES = ["P1", "P2", "P3", "ADV", "ALLY"] as const;
type Priority = (typeof PRIORITIES)[number];

interface SeedRow {
  name: string;
  category: string;
  capitalType?: string;
  whatItFunds?: string;
  typicalSize?: string;
  geography?: string;
  eligibility?: string;
  accessStatus?: string;
  deadline?: string;
  fit?: string;
  regenEntity?: string;
  link?: string;
  notes?: string;
  priority?: string;
}

/**
 * Rows that seed somewhere other than not_started. Applied on first insert
 * only, same as every other tracking column.
 */
const SEEDED_TRACKING: Record<
  string,
  { appStatus: string; owner: string; nextAction: string }
> = {
  "Draper Richards Kaplan Foundation (DRK)": {
    appStatus: "preparing",
    owner: "Rye + Claude",
    nextAction: "Rye: CV + submit form (draft in APPLICATION_DRK_2026-07-24.md)",
  },
};

function truncate(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function normalizePriority(value: unknown): Priority {
  const s = String(value ?? "").trim().toUpperCase();
  return (PRIORITIES as readonly string[]).includes(s) ? (s as Priority) : "P2";
}

async function main() {
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const rows: SeedRow[] = JSON.parse(raw);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No rows in ${SEED_PATH}`);
  }

  // Guard the UNIQUE key before touching the database: a duplicate name in the
  // JSON would silently collapse two funders into one row.
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of rows) {
    if (!r.name || !r.category) {
      throw new Error(`Row missing name or category: ${JSON.stringify(r).slice(0, 200)}`);
    }
    if (seen.has(r.name)) dupes.push(r.name);
    seen.add(r.name);
  }
  if (dupes.length > 0) {
    throw new Error(`Duplicate names in seed JSON: ${dupes.join(", ")}`);
  }

  const byPriority = rows.reduce<Record<string, number>>((acc, r) => {
    const p = normalizePriority(r.priority);
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[seed-funding-pipeline] ${rows.length} rows from ${path.basename(SEED_PATH)}`);
  console.log(`[seed-funding-pipeline] by priority: ${JSON.stringify(byPriority)}`);

  if (isDryRun) {
    console.log("[seed-funding-pipeline] --dry-run: no database writes");
    for (const [name, t] of Object.entries(SEEDED_TRACKING)) {
      const found = rows.some((r) => r.name === name);
      console.log(
        `[seed-funding-pipeline] tracking seed ${found ? "matches" : "MISSING FROM JSON"}: ${name} -> ${t.appStatus}`
      );
    }
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (check .env)");

  const conn = await mysql.createConnection(url);
  let inserted = 0;
  let updated = 0;

  try {
    // Classify insert vs refresh from the names already present, not from
    // affectedRows. mysql2 connects with CLIENT_FOUND_ROWS by default, so an
    // ON DUPLICATE KEY UPDATE that changes nothing still reports affectedRows
    // of 1 and would read as a fresh insert on every re-run.
    const [existingRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT name FROM funding_pipeline"
    );
    const existing = new Set(existingRows.map((r) => r.name as string));

    // sortOrder counts within a priority band so the portal reproduces the
    // order the research was compiled in.
    const bandCounts: Record<string, number> = {};

    for (const r of rows) {
      const priority = normalizePriority(r.priority);
      bandCounts[priority] = (bandCounts[priority] ?? 0) + 1;
      const sortOrder = bandCounts[priority];

      const tracking = SEEDED_TRACKING[r.name] ?? {
        appStatus: "not_started",
        owner: null as string | null,
        nextAction: null as string | null,
      };

      // ON DUPLICATE KEY UPDATE lists ONLY the research columns, so a re-seed
      // never overwrites appStatus / owner / nextAction / nextActionDate /
      // lastTouch on a row Rye has already worked.
      if (existing.has(r.name)) updated++;
      else inserted++;

      await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO funding_pipeline
           (name, category, capitalType, whatItFunds, typicalSize, geography,
            eligibility, accessStatus, deadline, fit, regenEntity, link, notes,
            priority, sortOrder, appStatus, owner, nextAction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           category = VALUES(category),
           capitalType = VALUES(capitalType),
           whatItFunds = VALUES(whatItFunds),
           typicalSize = VALUES(typicalSize),
           geography = VALUES(geography),
           eligibility = VALUES(eligibility),
           accessStatus = VALUES(accessStatus),
           deadline = VALUES(deadline),
           fit = VALUES(fit),
           regenEntity = VALUES(regenEntity),
           link = VALUES(link),
           notes = VALUES(notes),
           priority = VALUES(priority),
           sortOrder = VALUES(sortOrder)`,
        [
          truncate(r.name, 255),
          truncate(r.category, 120),
          truncate(r.capitalType, 255),
          truncate(r.whatItFunds, 65535),
          truncate(r.typicalSize, 160),
          truncate(r.geography, 160),
          truncate(r.eligibility, 65535),
          truncate(r.accessStatus, 255),
          truncate(r.deadline, 160),
          truncate(r.fit, 120),
          truncate(r.regenEntity, 255),
          truncate(r.link, 500),
          truncate(r.notes, 65535),
          priority,
          sortOrder,
          tracking.appStatus,
          tracking.owner,
          tracking.nextAction,
        ]
      );
    }

    const [countRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM funding_pipeline"
    );
    const [statusRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT appStatus, COUNT(*) AS n FROM funding_pipeline GROUP BY appStatus ORDER BY n DESC"
    );

    console.log(`[seed-funding-pipeline] inserted ${inserted}, refreshed ${updated}`);
    console.log(`[seed-funding-pipeline] funding_pipeline row count: ${countRows[0].n}`);
    console.log(
      `[seed-funding-pipeline] by appStatus: ${statusRows
        .map((s) => `${s.appStatus}=${s.n}`)
        .join(", ")}`
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[seed-funding-pipeline] failed:", err);
  process.exit(1);
});
