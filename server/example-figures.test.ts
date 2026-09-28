/**
 * Migration 0263 (drizzle/0263_example_money_share.sql): example campaigns
 * ask for money at about 20% of the whole ask (ruling 2026-09-27), their
 * example routes show about 40% of the new money ask, legacy crypto needs on
 * examples drop to 0, and no example runs past the nine-month cap.
 *
 * The statements run as the migration file has them, split the way
 * scripts/run-migration.ts splits them, with ONE change: each gets a scope
 * clause naming this file's fixture campaigns (`c.id IN (...)`). Unscoped they
 * would rewrite every example in the database, including the live example
 * fixtures other suites build in parallel (campaign-progress.test.ts asserts
 * an example's money ask of 10,000). The test checks each statement took
 * exactly one scope clause, so a change to the file's shape fails here first.
 *
 * Then, read-only, every example present that is not a test fixture must
 * already meet the rule, once 0263 is recorded as applied.
 *
 * DB-backed: runs against a LOCAL database only (the scratch MariaDB, or CI's
 * 127.0.0.1 MySQL), never a remote one.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { exampleDurationDays, exampleMoneyAsk, exampleRouteFigures } from "../shared/exampleCampaignFigures";
import { MAX_WINDOW_DAYS } from "../shared/campaignClose";

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const skipIfNoDb = !isLocalDb(process.env.DATABASE_URL);
const FILE = path.resolve(__dirname, "../drizzle/0263_example_money_share.sql");
const OWNER = 986263;

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

const STATEMENTS = statements(fs.readFileSync(FILE, "utf8"));

/** Scope one statement to these campaigns. Exactly one clause is added, or it throws. */
function scoped(statement: string, ids: number[]): string {
  const list = ids.map((n) => Number(n)).join(", ");
  const patterns: Array<[RegExp, string]> = [
    [/WHERE c\.isDemo = 1/g, `WHERE c.isDemo = 1 AND c.id IN (${list})`],
    [/WHERE isDemo = 1/g, `WHERE isDemo = 1 AND id IN (${list})`],
  ];
  let out = statement;
  let hits = 0;
  for (const [re, to] of patterns) {
    const n = (out.match(re) ?? []).length;
    hits += n;
    out = out.replace(re, to);
  }
  if (hits !== 1) throw new Error(`expected one scope point, found ${hits} in: ${statement.slice(0, 80)}`);
  return out;
}

describe("0263, as written", () => {
  it("has four statements, each limited to examples, and keeps updatedAt where the table has one", () => {
    expect(STATEMENTS).toHaveLength(4);
    for (const s of STATEMENTS) expect(s).toMatch(/isDemo = 1/);
    expect(STATEMENTS[0]).toMatch(/ci\.updatedAt = ci\.updatedAt/);
    expect(STATEMENTS[1]).toMatch(/c\.updatedAt = c\.updatedAt/);
    expect(STATEMENTS[3]).toMatch(/updatedAt = updatedAt/);
    // campaign_partner_links has no updatedAt column.
    expect(STATEMENTS[2]).not.toMatch(/updatedAt/);
  });

  it("scopes each statement at exactly one point", () => {
    for (const s of STATEMENTS) expect(scoped(s, [1, 2])).toMatch(/id IN \(1, 2\)/);
  });

  it("the TypeScript rule agrees with the table in the spec", () => {
    expect(exampleMoneyAsk(100600)).toBe(25000);
    expect(exampleRouteFigures(25000, [{ cachedRaised: 52000 }, { cachedRaised: 33000 }])).toEqual([6000, 4000]);
  });
});

type CampaignRow = {
  id: number;
  isDemo: number;
  financialTarget: number;
  durationDays: number;
  updatedAt: Date;
};

describe.skipIf(skipIfNoDb)("0263 on fixture campaigns", () => {
  let conn: mysql.Connection;
  const ids: { harmony: number; rewild: number; real: number } = { harmony: 0, rewild: 0, real: 0 };
  const all = () => [ids.harmony, ids.rewild, ids.real];
  const OLD = "2026-01-01 00:00:00";

  async function campaign(title: string, isDemo: 0 | 1, currency: string, financialTarget: number, durationDays: number): Promise<number> {
    const [r] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO campaigns (userId, status, isDemo, title, description, projectName, currency, financialTarget,
                              durationDays, startedAt, publishedAt, createdAt, updatedAt)
       VALUES (?, 'active', ?, ?, 'Example figures fixture', ?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
      [OWNER, isDemo, title, title, currency, financialTarget, durationDays, OLD, OLD],
    );
    return r.insertId;
  }

  async function need(campaignId: number, kind: string, estimatedValue: number): Promise<void> {
    const category = kind === "role" ? "role" : "resource";
    await conn.query(
      `INSERT INTO campaign_items (campaignId, category, kind, estimatedValue, quantityWanted, resourceName, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, 'Test need', ?, ?)`,
      [campaignId, category, kind, estimatedValue, OLD, OLD],
    );
  }

  async function route(campaignId: number, partner: string, status: string, cachedRaised: number | null, currency: string): Promise<void> {
    await conn.query(
      `INSERT INTO campaign_partner_links (campaignId, partner, label, url, cachedRaised, status, cachedCurrency)
       VALUES (?, ?, 'Test route', 'https://example.com/test-route', ?, ?, ?)`,
      [campaignId, partner, cachedRaised, status, currency],
    );
  }

  async function snapshot() {
    const [campaigns] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT id, isDemo, financialTarget, durationDays, updatedAt FROM campaigns WHERE id IN (?) ORDER BY id`,
      [all()],
    );
    const [items] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT id, campaignId, kind, estimatedValue, updatedAt FROM campaign_items WHERE campaignId IN (?) ORDER BY id`,
      [all()],
    );
    const [links] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT id, campaignId, partner, status, cachedRaised FROM campaign_partner_links WHERE campaignId IN (?) ORDER BY id`,
      [all()],
    );
    return {
      campaigns: campaigns as unknown as CampaignRow[],
      items: items as Array<{ id: number; campaignId: number; kind: string; estimatedValue: number; updatedAt: Date }>,
      links: links as Array<{ id: number; campaignId: number; partner: string; status: string; cachedRaised: number | null }>,
    };
  }

  async function runScoped(): Promise<void> {
    for (const s of STATEMENTS) await conn.query(scoped(s, all()));
  }

  beforeAll(async () => {
    conn = await mysql.createConnection({ uri: process.env.DATABASE_URL!, decimalNumbers: true, dateStrings: false });
    await conn.query("SET time_zone = '+00:00'");

    // Harmony Valley's scratch figures: in-kind 100,600, a crypto need of 25,000, routes 52,000 and 33,000.
    ids.harmony = await campaign("Test Figures Harmony", 1, "USD", 500000, 120);
    await need(ids.harmony, "item", 60000);
    await need(ids.harmony, "role", 40600);
    await need(ids.harmony, "crypto", 25000);
    await route(ids.harmony, "maearth", "example", 52000, "USD");
    await route(ids.harmony, "gosteward", "example", 33000, "USD");

    // Rewild Britain's: in-kind 131,640 over 300 days, plus a money link need and a pending route that stay as they are.
    ids.rewild = await campaign("Test Figures Rewild", 1, "GBP", 750000, 300);
    await need(ids.rewild, "item", 100000);
    await need(ids.rewild, "shift", 31640);
    await need(ids.rewild, "crypto", 30000);
    await need(ids.rewild, "financial_link", 7000);
    await route(ids.rewild, "maearth", "example", 96000, "GBP");
    await route(ids.rewild, "gosteward", "example", 54000, "GBP");
    await route(ids.rewild, "maearth", "pending", 1234, "GBP");

    // A real campaign with everything 0263 would touch on an example: nothing changes.
    ids.real = await campaign("Test Figures Real", 0, "USD", 99999, 300);
    await need(ids.real, "item", 8000);
    await need(ids.real, "crypto", 5000);
    await route(ids.real, "maearth", "example", 10000, "USD");
  });

  afterAll(async () => {
    if (!conn) return;
    const list = all().filter((n) => n > 0);
    if (list.length) {
      await conn.query("DELETE FROM campaign_partner_links WHERE campaignId IN (?)", [list]);
      await conn.query("DELETE FROM campaign_items WHERE campaignId IN (?)", [list]);
      await conn.query("DELETE FROM campaigns WHERE id IN (?)", [list]);
    }
    await conn.end();
  });

  it("writes the spec's figures, keeps updatedAt, and leaves real campaigns and other rows alone", async () => {
    const before = await snapshot();
    await runScoped();
    const after = await snapshot();

    const c = (id: number) => after.campaigns.find((r) => r.id === id)!;
    expect(c(ids.harmony).financialTarget).toBe(25000);
    expect(c(ids.harmony).financialTarget).toBe(exampleMoneyAsk(100600));
    expect(c(ids.harmony).durationDays).toBe(120);
    expect(c(ids.rewild).financialTarget).toBe(33000);
    expect(c(ids.rewild).durationDays).toBe(270);
    expect(c(ids.rewild).durationDays).toBe(exampleDurationDays(300));
    expect(c(ids.real)).toMatchObject({ financialTarget: 99999, durationDays: 300 });

    const raised = (id: number, status = "example") =>
      after.links.filter((l) => l.campaignId === id && l.status === status).map((l) => l.cachedRaised);
    expect(raised(ids.harmony)).toEqual([6000, 4000]);
    expect(raised(ids.harmony)).toEqual(exampleRouteFigures(25000, [{ cachedRaised: 52000 }, { cachedRaised: 33000 }]));
    expect(raised(ids.rewild)).toEqual([8500, 5000]);
    expect(raised(ids.rewild, "pending")).toEqual([1234]);
    expect(raised(ids.real)).toEqual([10000]);

    const value = (id: number, kind: string) =>
      after.items.filter((i) => i.campaignId === id && i.kind === kind).map((i) => i.estimatedValue);
    expect(value(ids.harmony, "crypto")).toEqual([0]);
    expect(value(ids.rewild, "crypto")).toEqual([0]);
    expect(value(ids.rewild, "financial_link")).toEqual([7000]);
    expect(value(ids.real, "crypto")).toEqual([5000]);
    expect(value(ids.harmony, "item")).toEqual([60000]);

    // Only figures change: every updatedAt is the one the fixture set.
    for (const row of [...after.campaigns, ...after.items]) {
      const was = [...before.campaigns, ...before.items].find((b) => b.id === row.id && ("kind" in b) === ("kind" in row))!;
      expect(new Date(row.updatedAt).toISOString(), `row ${row.id}`).toBe(new Date(was.updatedAt).toISOString());
    }

    // The money line after: about 20% of the whole, the routes about 40% of the money and never landed.
    const share = (money: number, inKind: number) => (money / (money + inKind)) * 100;
    expect(share(25000, 100600)).toBeGreaterThanOrEqual(18);
    expect(share(33000, 131640)).toBeLessThanOrEqual(22);
    expect(6000 + 4000).toBeLessThan(25000);
    expect(8500 + 5000).toBeLessThan(33000);
  });

  it("changes nothing on a second run", async () => {
    const first = await snapshot();
    await runScoped();
    const second = await snapshot();
    expect(JSON.parse(JSON.stringify(second))).toEqual(JSON.parse(JSON.stringify(first)));
  });

  it("every example present that is not a test fixture already meets the rule once 0263 is applied", async () => {
    let applied = false;
    try {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        "SELECT 1 FROM _migrations_applied WHERE filename = '0263_example_money_share.sql'",
      );
      applied = rows.length > 0;
    } catch {
      applied = false;
    }
    if (!applied) return; // A database 0263 hasn't reached yet has nothing to check.

    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT c.id, c.title, c.financialTarget, c.durationDays,
              (SELECT COALESCE(SUM(ci.estimatedValue), 0) FROM campaign_items ci
                WHERE ci.campaignId = c.id AND ci.kind NOT IN ('crypto', 'financial_link')) AS inKind,
              (SELECT COALESCE(SUM(ci.estimatedValue), 0) FROM campaign_items ci
                WHERE ci.campaignId = c.id AND ci.kind = 'crypto') AS crypto,
              (SELECT COALESCE(SUM(pl.cachedRaised), 0) FROM campaign_partner_links pl
                WHERE pl.campaignId = c.id AND pl.status = 'example') AS routes
         FROM campaigns c
        WHERE c.isDemo = 1 AND LOWER(c.title) NOT LIKE '%test%' AND c.id NOT IN (?)`,
      [all()],
    );
    for (const r of rows as Array<{ id: number; title: string; financialTarget: number; durationDays: number; inKind: number; crypto: number; routes: number }>) {
      const label = `#${r.id} ${r.title}`;
      expect(Number(r.crypto), label).toBe(0);
      expect(r.durationDays, label).toBeLessThanOrEqual(MAX_WINDOW_DAYS);
      if (Number(r.inKind) > 0) {
        expect(r.financialTarget, label).toBe(exampleMoneyAsk(Number(r.inKind)));
        expect(Number(r.routes), label).toBeLessThan(r.financialTarget);
        if (Number(r.inKind) >= 20000) {
          const pct = (r.financialTarget / (r.financialTarget + Number(r.inKind))) * 100;
          expect(pct, label).toBeGreaterThanOrEqual(18);
          expect(pct, label).toBeLessThanOrEqual(22);
        }
      }
    }
  });
});
