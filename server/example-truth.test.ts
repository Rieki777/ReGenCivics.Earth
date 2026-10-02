/**
 * Migration 0269 (drizzle/0269_example_truth.sql): example campaigns tell the
 * truth (crowdpool bundle 1, 2026-10-01).
 *
 * The file's text is checked first: twelve statements, each limited to
 * isDemo = 1; ten update rewrites with no semicolon or em-dash inside a
 * string, no banned word (scripts/check-banned-terms.mjs), none of the old
 * real-looking names, no month names, and the same ten titles and bodies in
 * scripts/seed-demo-campaigns.ts.
 *
 * Then the file runs on fixtures as the runner runs it (split the same way,
 * one connection, prepared statements), with ONE change: each statement is
 * scoped to this file's fixture campaigns by `AND c.id IN (...)` right after
 * its `c.isDemo = 1`, checked to land exactly once per statement. Unscoped it
 * would rewrite every example in the database. An example fixture with
 * inflated counters ends at what its rows give, a real fixture campaign is
 * untouched, updatedAt is kept, and a second run changes nothing.
 *
 * DB-backed: runs against a LOCAL database only (the scratch MariaDB, or CI's
 * 127.0.0.1 MySQL), never a remote one. Fixture titles copy the four example
 * titles (the update statements match on them), in status 'draft', so they
 * never show on a public page while the test runs.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { findBannedTerms } from "../scripts/check-banned-terms.mjs";
import { isTestDbUrl } from "./test-db-guard";

const skipIfNoDb = !isTestDbUrl(process.env.DATABASE_URL);
const FILE = path.resolve(__dirname, "../drizzle/0269_example_truth.sql");
const SEED = path.resolve(__dirname, "../scripts/seed-demo-campaigns.ts");
const OWNER = 986269;
const DB_TIMEOUT = 60_000;
const OLD = "2026-01-02 03:04:05";

const RAW = fs.readFileSync(FILE, "utf8");

/** The runner's split (scripts/run-migration.ts): drop full-line comments, then split on semicolons. */
function statements(sqlRaw: string): string[] {
  return sqlRaw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const STATEMENTS = statements(RAW);
const SCOPE_POINT = "c.isDemo = 1";

/** Scope every statement to these campaigns, at its one `c.isDemo = 1`. */
function scoped(ids: number[]): string[] {
  const list = ids.map((n) => Number(n)).join(", ");
  return STATEMENTS.map((s, i) => {
    const n = s.split(SCOPE_POINT).length - 1;
    if (n !== 1) throw new Error(`statement ${i + 1}: expected one scope point, found ${n}`);
    return s.replace(SCOPE_POINT, `${SCOPE_POINT} AND c.id IN (${list})`);
  });
}

type Rewrite = { campaign: string; number: number; title: string; body: string };

/** The ten update rewrites, read from the file. */
function rewrites(): Rewrite[] {
  return STATEMENTS.slice(2).map((s) => {
    const m = /AND c\.title = '((?:[^']|'')*)'\s+SET cu\.title = '((?:[^']|'')*)',\s+cu\.body = '((?:[^']|'')*)'\s+WHERE cu\.updateNumber = (\d+)$/.exec(s);
    if (!m) throw new Error(`not an update rewrite: ${s.slice(0, 80)}`);
    const un = (t: string) => t.replace(/''/g, "'");
    return { campaign: un(m[1]), title: un(m[2]), body: un(m[3]), number: Number(m[4]) };
  });
}

const OLD_NAMES = ["Teodora", "Cypress", "Ashgrove", "Sol Nascente", "Tierra Viva", "Andes Media", "Rosa", "Struan", "Inverness"];
const MONTHS = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/;

describe("0269, as written", () => {
  it("has two counter statements and ten update rewrites, each limited to examples", () => {
    expect(STATEMENTS).toHaveLength(12);
    expect(STATEMENTS[0]).toMatch(/^UPDATE `campaign_items` ci\s+JOIN `campaigns` c ON c\.id = ci\.campaignId AND c\.isDemo = 1\s/);
    expect(STATEMENTS[0]).toContain("ci.updatedAt = ci.updatedAt");
    expect(STATEMENTS[1]).toMatch(/^UPDATE `campaigns` c\s/);
    expect(STATEMENTS[1]).toMatch(/WHERE c\.isDemo = 1$/);
    expect(STATEMENTS[1]).toContain("c.updatedAt = c.updatedAt");
    for (const s of STATEMENTS.slice(2)) {
      expect(s).toMatch(/^UPDATE `campaign_updates` cu\s+JOIN `campaigns` c ON c\.id = cu\.campaignId AND c\.isDemo = 1 AND c\.title = '/);
      expect(s).not.toMatch(/updatedAt/);
    }
    expect(() => scoped([1, 2])).not.toThrow();
  });

  it("rewrites the ten example updates the database holds, by campaign title and number", () => {
    expect(rewrites().map((r) => `${r.campaign} ${r.number}`)).toEqual([
      "Harmony Valley Ecovillage 1", "Harmony Valley Ecovillage 2", "Harmony Valley Ecovillage 3",
      "Terra Nova Regenerative Farm 1", "Terra Nova Regenerative Farm 2",
      "Pachamama Learning Village 1", "Pachamama Learning Village 2",
      "Rewild Britain Sanctuary 1", "Rewild Britain Sanctuary 2", "Rewild Britain Sanctuary 3",
    ]);
  });

  it("puts no semicolon or em-dash inside any string", () => {
    const code = RAW.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
    const literals = [...code.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
    expect(literals.length).toBeGreaterThan(20);
    for (const lit of literals) {
      expect(lit).not.toContain(";");
      expect(lit).not.toContain(String.fromCharCode(0x2014));
    }
    // No line the runner would drop as a comment sits inside a string.
    for (const line of code.split("\n")) expect(line.trim().startsWith("--")).toBe(false);
  });

  it("says no banned word, names no one, claims no progress by date, and keeps to plain text", () => {
    for (const r of rewrites()) {
      const text = `${r.title}\n${r.body}`;
      expect(findBannedTerms("drizzle/0269_example_truth.sql", text), r.title).toEqual([]);
      for (const name of OLD_NAMES) expect(text, `${r.title} names ${name}`).not.toContain(name);
      expect(text, r.title).not.toMatch(MONTHS);
      expect(text, r.title).not.toMatch(/in three weeks|\bclaim/i);
      expect(text, r.title).not.toMatch(/[<>&\\]/);
    }
  });

  it("scripts/seed-demo-campaigns.ts carries the same ten titles and bodies, in update order", () => {
    const seed = fs.readFileSync(SEED, "utf8");
    const blocks = [...seed.matchAll(/\n    updates: \[\n([\s\S]*?)\n    \],/g)].map((m) => m[1]);
    expect(blocks).toHaveLength(4);
    const seeded = blocks.flatMap((b) => [...b.matchAll(/title: "([^"]*)", daysAgo: \d+,\n\s+body: "([^"]*)",/g)].map((m) => ({ title: m[1], body: m[2] })));
    expect(seeded).toEqual(rewrites().map((r) => ({ title: r.title, body: r.body })));
    for (const b of blocks) for (const name of OLD_NAMES) expect(b).not.toContain(name);
  });
});

// ── On fixtures ─────────────────────────────────────────────────────────────

type Row = Record<string, string | number | null>;

describe.skipIf(skipIfNoDb)("0269 on fixture campaigns", () => {
  let conn: mysql.Connection;
  const created: number[] = [];

  async function q(sqlText: string, params: unknown[] = []): Promise<any> {
    const [r] = await conn.query(sqlText, params);
    return r;
  }

  async function insert(table: string, cols: Row): Promise<number> {
    const r = await q(`INSERT INTO ${table} (${Object.keys(cols).join(", ")}) VALUES (?)`, [Object.values(cols)]);
    return r.insertId;
  }

  /** A campaign with every pledged column inflated. Draft, so it never shows publicly. */
  async function campaign(title: string, isDemo: 0 | 1): Promise<number> {
    const id = await insert("campaigns", {
      userId: OWNER, status: "draft", isDemo, title, description: "Example truth fixture", projectName: `${title} b1`,
      durationDays: 120, pledgedTotal: 99999, pledgedLand: 1, pledgedEquipment: 2, pledgedRoles: 3, pledgedResources: 4,
      pledgedFinancial: 5, createdAt: OLD, updatedAt: OLD,
    });
    created.push(id);
    return id;
  }

  async function need(campaignId: number, cols: Row): Promise<number> {
    return insert("campaign_items", { campaignId, estimatedValue: 500, createdAt: OLD, updatedAt: OLD, ...cols });
  }

  async function offer(campaignId: number, cols: Row): Promise<void> {
    await insert("campaign_contributions", {
      campaignId, contributorName: "Fixture Person", contributorEmail: "truth.person@b1-lane.invalid",
      title: "Fixture offer", updatedAt: OLD, ...cols,
    });
  }

  /** One campaign with three needs and rows in every status that matters. */
  async function withRows(id: number): Promise<{ a: number; b: number; c: number }> {
    const a = await need(id, { category: "resource", kind: "item", resourceName: "Cedar posts", quantityWanted: 10, quantityClaimed: 50, quantityDelivered: 20, pledgedValue: 9999 });
    const b = await need(id, { category: "role", kind: "role", capacityUnit: "count", roleTitle: "Guide", quantityWanted: 2, quantityClaimed: 7, quantityDelivered: 7, pledgedValue: 5000 });
    const c = await need(id, { category: "resource", kind: "item", resourceName: "Seed", quantityWanted: 3, quantityClaimed: 3, quantityDelivered: 1, pledgedValue: 700 });
    await offer(id, { campaignItemId: a, contributionType: "resource", status: "accepted", quantityPledged: 1, estimatedValue: 250 });
    await offer(id, { campaignItemId: a, contributionType: "resource", status: "pending", quantityPledged: 4, estimatedValue: 1000 });
    await offer(id, { campaignItemId: a, contributionType: "resource", status: "expired", quantityPledged: 2, estimatedValue: 500 });
    await offer(id, { campaignItemId: b, contributionType: "role", status: "thanked", quantityPledged: 1, estimatedValue: 40 });
    await offer(id, { campaignItemId: null, contributionType: "financial", status: "fulfilled", quantityPledged: 1, estimatedValue: 100, financialAmount: 80 });
    await offer(id, { campaignItemId: null, contributionType: "knowledge", status: "accepted", quantityPledged: 1, estimatedValue: 30 });
    return { a, b, c };
  }

  const NEED_COLS = "id, quantityClaimed, quantityDelivered, pledgedValue, updatedAt";
  const CAMPAIGN_COLS = "id, pledgedTotal, pledgedLand, pledgedEquipment, pledgedRoles, pledgedResources, pledgedFinancial, updatedAt";

  async function snapshot(): Promise<{ campaigns: Row[]; items: Row[]; updates: Row[] }> {
    return {
      campaigns: await q(`SELECT ${CAMPAIGN_COLS} FROM campaigns WHERE id IN (?) ORDER BY id`, [created]),
      items: await q(`SELECT campaignId, ${NEED_COLS} FROM campaign_items WHERE campaignId IN (?) ORDER BY id`, [created]),
      updates: await q("SELECT id, campaignId, updateNumber, title, body FROM campaign_updates WHERE campaignId IN (?) ORDER BY id", [created]),
    };
  }

  async function run(): Promise<void> {
    for (const s of scoped(created)) await conn.execute(s);
  }

  let harmony: number;
  let real: number;
  let harmonyNeeds: { a: number; b: number; c: number };
  let realNeeds: { a: number; b: number; c: number };
  let before: Awaited<ReturnType<typeof snapshot>>;

  beforeAll(async () => {
    conn = await mysql.createConnection({ uri: process.env.DATABASE_URL!, dateStrings: true, decimalNumbers: true });
    harmony = await campaign("Harmony Valley Ecovillage", 1);
    harmonyNeeds = await withRows(harmony);
    real = await campaign("Harmony Valley Ecovillage", 0);
    realNeeds = await withRows(real);
    const others = {
      "Terra Nova Regenerative Farm": await campaign("Terra Nova Regenerative Farm", 1),
      "Pachamama Learning Village": await campaign("Pachamama Learning Village", 1),
      "Rewild Britain Sanctuary": await campaign("Rewild Britain Sanctuary", 1),
    };
    const ids: Record<string, number> = { "Harmony Valley Ecovillage": harmony, ...others };
    for (const r of rewrites()) {
      await insert("campaign_updates", { campaignId: ids[r.campaign], authorId: OWNER, updateNumber: r.number, title: `Old ${r.number}`, body: "Old text with a name in it.", createdAt: OLD });
    }
    // The real campaign shares Harmony Valley's title and update number 1.
    await insert("campaign_updates", { campaignId: real, authorId: OWNER, updateNumber: 1, title: "Real update", body: "A real project's own words.", createdAt: OLD });
    before = await snapshot();
    await run();
  }, DB_TIMEOUT);

  afterAll(async () => {
    if (!conn) return;
    if (created.length) {
      for (const t of ["campaign_updates", "campaign_contributions", "campaign_items"]) {
        await conn.query(`DELETE FROM ${t} WHERE campaignId IN (?)`, [created]);
      }
      await conn.query("DELETE FROM campaigns WHERE id IN (?)", [created]);
    }
    await conn.end();
  }, DB_TIMEOUT);

  it("an example's need counters end at what its rows give, and updatedAt stays", async () => {
    const items: Row[] = await q(`SELECT ${NEED_COLS} FROM campaign_items WHERE campaignId = ? ORDER BY id`, [harmony]);
    const byId = new Map(items.map((r) => [Number(r.id), r]));
    // Accepted 1 counts; pending and expired do not.
    expect(byId.get(harmonyNeeds.a)).toMatchObject({ quantityClaimed: 1, quantityDelivered: 0, pledgedValue: 250 });
    // Thanked counts as claimed and delivered.
    expect(byId.get(harmonyNeeds.b)).toMatchObject({ quantityClaimed: 1, quantityDelivered: 1, pledgedValue: 40 });
    // No rows left: zero.
    expect(byId.get(harmonyNeeds.c)).toMatchObject({ quantityClaimed: 0, quantityDelivered: 0, pledgedValue: 0 });
    for (const r of items) expect(String(r.updatedAt).replace(/\.\d+$/, "")).toBe(OLD);
  }, DB_TIMEOUT);

  it("an example's campaign totals end at what its rows give, the way getCampaignPledgedTotals adds them", async () => {
    const [c] = await q(`SELECT ${CAMPAIGN_COLS} FROM campaigns WHERE id = ?`, [harmony]);
    expect(c).toMatchObject({
      pledgedTotal: 420, // 250 + 40 + 100 + 30
      pledgedLand: 0,
      pledgedEquipment: 0,
      pledgedRoles: 40, // role only; knowledge counts in the total
      pledgedResources: 250,
      pledgedFinancial: 80, // financialAmount when it is not 0
    });
    expect(String(c.updatedAt).replace(/\.\d+$/, "")).toBe(OLD);
  }, DB_TIMEOUT);

  it("a real campaign with the same rows, title and update number is untouched", async () => {
    const pick = (s: Awaited<ReturnType<typeof snapshot>>) => ({
      campaigns: s.campaigns.filter((r) => r.id === real),
      items: s.items.filter((r) => r.campaignId === real),
      updates: s.updates.filter((r) => r.campaignId === real),
    });
    const now = await snapshot();
    expect(pick(now)).toEqual(pick(before));
    expect(now.items.find((r) => r.id === realNeeds.a)).toMatchObject({ quantityClaimed: 50, pledgedValue: 9999 });
    expect(now.updates.find((r) => r.campaignId === real)).toMatchObject({ title: "Real update" });
  }, DB_TIMEOUT);

  it("rewrites every example update with the new title and body", async () => {
    const rows: Row[] = await q(
      "SELECT c.title AS campaign, cu.updateNumber AS number, cu.title, cu.body FROM campaign_updates cu JOIN campaigns c ON c.id = cu.campaignId WHERE c.id IN (?) AND c.isDemo = 1 ORDER BY c.id, cu.updateNumber",
      [created],
    );
    expect(rows).toEqual(rewrites());
  }, DB_TIMEOUT);

  it("changes nothing on a second run", async () => {
    const first = await snapshot();
    await run();
    expect(await snapshot()).toEqual(first);
  }, DB_TIMEOUT);
});
