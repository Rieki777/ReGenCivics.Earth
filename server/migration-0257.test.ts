/**
 * Migration 0257's two backfills (drizzle/0257_crowdpool_give_lend_money_routes.sql)
 * touch only the new columns: they keep updatedAt (both tables carry
 * ON UPDATE CURRENT_TIMESTAMP) and take each loan window's date in UTC, so
 * a session west of UTC does not move a need window a day early.
 *
 * The statements run exactly as the migration file has them, split the way
 * scripts/run-migration.ts splits them, against TEMPORARY copies of the two
 * tables, so no real row is touched. Run against the SCRATCH database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const skipIfNoDb = !process.env.DATABASE_URL;
const FILE = path.resolve(__dirname, "../drizzle/0257_crowdpool_give_lend_money_routes.sql");

/** The runner's split: drop full-line comments, then split on semicolons. */
function statements(sqlRaw: string): string[] {
  return sqlRaw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const backfills = statements(fs.readFileSync(FILE, "utf8")).filter((s) => /^UPDATE\s+`?campaign_(items|contributions)`?/i.test(s));

describe("0257 backfills, as written", () => {
  it("there are two, one per table, and each keeps updatedAt", () => {
    expect(backfills).toHaveLength(2);
    expect(backfills[0]).toMatch(/`updatedAt`\s*=\s*`updatedAt`/);
    expect(backfills[1]).toMatch(/cc\.updatedAt\s*=\s*cc\.updatedAt/);
  });

  it("each reads the loan window's date in UTC", () => {
    for (const s of backfills) {
      const dates = s.match(/DATE\(/g) ?? [];
      const utc = s.match(/DATE\(CONVERT_TZ\([^)]*, @@session\.time_zone, '\+00:00'\)\)/g) ?? [];
      expect(utc.length).toBe(2);
      // Each UTC date carries one plain DATE() fallback, never more.
      expect(dates.length).toBe(4);
    }
  });
});

describe("0257 backfills on a session west of UTC", () => {
  let conn: mysql.Connection | null = null;

  beforeAll(async () => {
    if (skipIfNoDb) return;
    conn = await mysql.createConnection(process.env.DATABASE_URL!);
    await conn.query("SET time_zone = '+00:00'");
    await conn.query("CREATE TEMPORARY TABLE tmp_0257_items LIKE campaign_items");
    await conn.query("CREATE TEMPORARY TABLE tmp_0257_contribs LIKE campaign_contributions");
    // A legacy loan need whose window starts early on the 9th, UTC, and a
    // contribution on it, both last touched on 1 January.
    await conn.query(
      `INSERT INTO tmp_0257_items (id, campaignId, category, kind, acceptsGift, acceptsLoan, loanWindowStart, loanWindowEnd, updatedAt)
       VALUES (900001, 1, 'equipment', 'loan', 1, 0, '2026-10-09 02:27:38', '2026-12-15 03:00:00', '2026-01-01 00:00:00')`,
    );
    await conn.query(
      `INSERT INTO tmp_0257_contribs (id, campaignId, campaignItemId, contributorName, contributorEmail, contributionType, title, offerMode, updatedAt)
       VALUES (900002, 1, 900001, 'Test', 'test@example.com', 'equipment', 'Test loan', NULL, '2026-01-01 00:00:00')`,
    );
    // Now the session sits seven hours west of UTC, like the scratch server.
    await conn.query("SET time_zone = '-07:00'");
    for (const s of backfills) {
      const onTemp = s
        .replace(/`campaign_items`|\bcampaign_items\b/g, "tmp_0257_items")
        .replace(/`campaign_contributions`|\bcampaign_contributions\b/g, "tmp_0257_contribs");
      expect(onTemp).not.toMatch(/\bcampaign_(items|contributions)\b/);
      await conn.query(onTemp);
    }
    await conn.query("SET time_zone = '+00:00'");
  });

  afterAll(async () => {
    if (!conn) return;
    await conn.query("DROP TEMPORARY TABLE IF EXISTS tmp_0257_items");
    await conn.query("DROP TEMPORARY TABLE IF EXISTS tmp_0257_contribs");
    await conn.end();
  });

  it.skipIf(skipIfNoDb)("the need window is the UTC day, and updatedAt is kept", async () => {
    const [rows]: any = await conn!.query(
      `SELECT acceptsGift, acceptsLoan, DATE_FORMAT(neededFrom, '%Y-%m-%d') f, DATE_FORMAT(neededUntil, '%Y-%m-%d') u,
              DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') t FROM tmp_0257_items WHERE id = 900001`,
    );
    expect(rows[0]).toEqual({ acceptsGift: 0, acceptsLoan: 1, f: "2026-10-09", u: "2026-12-15", t: "2026-01-01 00:00:00" });
  });

  it.skipIf(skipIfNoDb)("the lend dates are the UTC days, and updatedAt is kept", async () => {
    const [rows]: any = await conn!.query(
      `SELECT offerMode, DATE_FORMAT(availableFrom, '%Y-%m-%d') f, DATE_FORMAT(lendUntil, '%Y-%m-%d') u,
              DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') t FROM tmp_0257_contribs WHERE id = 900002`,
    );
    expect(rows[0]).toEqual({ offerMode: "lend", f: "2026-10-09", u: "2026-12-15", t: "2026-01-01 00:00:00" });
  });
});
