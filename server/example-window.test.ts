/**
 * Example campaigns that never go stale: migration 0268
 * (drizzle/0268_refresh_example_windows.sql) and the daily step
 * (server/lib/example-window.ts, step 6 of server/jobs/crowdpoolDailyJob.ts).
 *
 * The file's text is checked against EXAMPLE_DATED_COLUMNS, so the migration
 * and the daily job move the same columns, the same way.
 *
 * Then both run on fixture campaigns built twice, one set each, and both must
 * give exactly what shared/exampleWindow.ts says: every listed column of an
 * example near its close moves by the same whole number of days (a stamp of
 * something that happened never past now), a real campaign and every other
 * row stay as they were, updatedAt is kept, and a second run changes nothing.
 * Those fixtures' needs all close more than 14 days out, so the daily step's
 * need rule (bundle 1) asks for nothing there and both give the same answer.
 * One more fixture, far from its close with a shift that has started, is the
 * case only the daily step moves.
 *
 * The migration's statements run as the runner runs them (split the same
 * way, one connection, prepared statements) with TWO changes: the ledger
 * insert is scoped to this file's fixture campaigns (unscoped it would move
 * every example in the database, including other suites' fixtures), and
 * "now" is pinned so the expected shift is exact. The test checks each change
 * lands at exactly one point, so a change to the file's shape fails here
 * first. The game variable insert is left out (it is global); its text is
 * checked instead.
 *
 * DB-backed: runs against a LOCAL database only (the scratch MariaDB, or CI's
 * 127.0.0.1 MySQL), never a remote one.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { exampleShiftDays, movedDay, movedStamp } from "../shared/exampleWindow";
import { needClosesAt } from "../shared/needWindow";
import {
  EXAMPLE_DATED_COLUMNS,
  EXAMPLES_ROLL_SWITCH,
  rollExampleWindows,
  setClauseFor,
  utcStamp,
} from "./lib/example-window";
import { runCrowdpoolDailyJob } from "./jobs/crowdpoolDailyJob";

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const skipIfNoDb = !isLocalDb(process.env.DATABASE_URL);
const FILE = path.resolve(__dirname, "../drizzle/0268_refresh_example_windows.sql");
const OWNER = 986268;
const DAY_MS = 86_400_000;
const DB_TIMEOUT = 60_000;

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
const SCOPE_POINT = "WHERE c.isDemo = 1 AND c.status = 'active'";
const NOW_POINT = "(SELECT UTC_TIMESTAMP() AS nowAt)";
const PIN = "2026-10-01 12:00:00";
const PIN_DATE = new Date("2026-10-01T12:00:00Z");

/** Scope the ledger insert to these campaigns and pin its now. Each lands exactly once, or it throws. */
function prepared(ids: number[], pin: string): string[] {
  const list = ids.map((n) => Number(n)).join(", ");
  let scopes = 0;
  let pins = 0;
  const out = STATEMENTS.filter((s) => !/^INSERT INTO game_variables/.test(s)).map((s) => {
    let t = s;
    scopes += t.split(SCOPE_POINT).length - 1;
    pins += t.split(NOW_POINT).length - 1;
    t = t.split(SCOPE_POINT).join(`${SCOPE_POINT} AND c.id IN (${list})`);
    t = t.split(NOW_POINT).join(`(SELECT CAST('${pin}' AS DATETIME) AS nowAt)`);
    return t;
  });
  if (scopes !== 1 || pins !== 1) throw new Error(`expected one scope point and one now point, found ${scopes} and ${pins}`);
  return out;
}

/** The columns each data UPDATE of 0268 assigns, by table. */
function assignedColumns(): Map<string, { cols: string[]; clamped: string[]; text: string }> {
  const out = new Map<string, { cols: string[]; clamped: string[]; text: string }>();
  for (const s of STATEMENTS) {
    const m = /^UPDATE `(\w+)` (\w+)\b/.exec(s);
    if (!m || m[1].startsWith("_")) continue;
    const [, table, alias] = m;
    const afterSet = s.slice(s.indexOf(" SET ") + 5);
    const set = afterSet.includes(" WHERE ") ? afterSet.slice(0, afterSet.lastIndexOf(" WHERE ")) : afterSet;
    const cols = [...set.matchAll(new RegExp(`\\b${alias}\\.(\\w+) = `, "g"))].map((x) => x[1]);
    const clamped = [...set.matchAll(new RegExp(`\\b${alias}\\.(\\w+) = LEAST\\(DATE_ADD\\(${alias}\\.\\1, INTERVAL w\\.shiftDays DAY\\), w\\.nowAt\\)`, "g"))].map((x) => x[1]);
    out.set(table, { cols, clamped, text: s });
  }
  return out;
}

describe("0268, as written", () => {
  it("moves exactly the columns the daily job moves, each the same way", () => {
    const got = assignedColumns();
    expect([...got.keys()]).toEqual(Object.keys(EXAMPLE_DATED_COLUMNS));
    for (const [table, spec] of Object.entries(EXAMPLE_DATED_COLUMNS)) {
      const g = got.get(table)!;
      const expected = [...spec.moves, ...spec.movesUpToNow, ...(spec.keepsUpdatedAt ? ["updatedAt"] : [])];
      expect([...g.cols].sort(), table).toEqual([...expected].sort());
      expect([...g.clamped].sort(), `${table} stamps never past now`).toEqual([...spec.movesUpToNow].sort());
      for (const col of spec.moves) {
        expect(g.text, `${table}.${col} moves whole`).toContain(`${spec.alias}.${col} = DATE_ADD(${spec.alias}.${col}, INTERVAL w.shiftDays DAY)`);
      }
      if (spec.keepsUpdatedAt) expect(g.text).toContain(`${spec.alias}.updatedAt = ${spec.alias}.updatedAt`);
      else expect(g.text).not.toMatch(/updatedAt/);
      // Every data UPDATE requires an example, and moves only campaigns at its step.
      expect(g.text).toMatch(/c\.isDemo = 1/);
      expect(g.text).toMatch(/w\.stepsDone = \d/);
    }
  });

  it("runs in UTC and restores the zone, decides the shift once, drops its ledger, and adds the switch last", () => {
    expect(STATEMENTS[0]).toBe("SET @rc0268_tz = @@session.time_zone");
    expect(STATEMENTS[1]).toBe("SET time_zone = '+00:00'");
    const drop = STATEMENTS.findIndex((s) => s === "DROP TABLE IF EXISTS `_example_window_0268`");
    expect(drop).toBeGreaterThan(0);
    expect(STATEMENTS[drop + 1]).toBe("SET time_zone = @rc0268_tz");
    const last = STATEMENTS[STATEMENTS.length - 1];
    expect(last).toMatch(/^INSERT INTO game_variables/);
    expect(last).toContain(`'${EXAMPLES_ROLL_SWITCH}'`);
    expect(STATEMENTS.filter((s) => /^INSERT INTO game_variables/.test(s))).toHaveLength(1);
    // The ledger insert names its table once: never in a subquery of its own SELECT, which MySQL refuses.
    const ledger = STATEMENTS.find((s) => s.startsWith("INSERT INTO `_example_window_0268`"))!;
    expect(ledger.split("_example_window_0268").length - 1).toBe(1);
    expect(ledger).toMatch(/ON DUPLICATE KEY UPDATE stepsDone = stepsDone$/);
  });

  it("scopes and pins at exactly one point each", () => {
    const s = prepared([1, 2], PIN);
    expect(s.join("\n")).toContain("c.id IN (1, 2)");
    expect(s.join("\n")).toContain(`CAST('${PIN}' AS DATETIME)`);
  });

  it("the daily job's SET list refuses anything but a whole positive shift and a UTC stamp", () => {
    const spec = EXAMPLE_DATED_COLUMNS.campaign_items;
    expect(setClauseFor(spec, 3, "2026-10-01 12:00:00")).toContain("ci.neededFrom = DATE_ADD(ci.neededFrom, INTERVAL 3 DAY)");
    expect(() => setClauseFor(spec, 0, "2026-10-01 12:00:00")).toThrow();
    expect(() => setClauseFor(spec, 1.5, "2026-10-01 12:00:00")).toThrow();
    expect(() => setClauseFor(spec, 3, "2026-10-01'; DROP TABLE x; --")).toThrow();
    expect(utcStamp(new Date("2026-10-01T12:00:00.999Z"))).toBe("2026-10-01 12:00:00");
  });
});

// ── On fixtures ─────────────────────────────────────────────────────────────

type Row = Record<string, string | number | null>;
type Snapshot = Record<string, Row[]>;

const DATE_ONLY = new Set(["neededFrom", "neededUntil", "availableFrom", "lendUntil"]);

/** 'YYYY-MM-DD HH:MM:SS' in UTC for a moment `days` (and `seconds`) from PIN. */
function at(days: number, seconds = 0): string {
  return utcStamp(new Date(PIN_DATE.getTime() + days * DAY_MS + seconds * 1000));
}
function day(days: number): string {
  return at(days).slice(0, 10);
}
const OLD = "2026-01-02 03:04:05";

type FixtureSet = {
  near: number; pubOnly: number; far: number; boundary: number; underBoundary: number;
  short: number; draft: number; real: number;
};

describe.skipIf(skipIfNoDb)("0268 and the daily step on fixture campaigns", () => {
  let conn: mysql.Connection;
  const created: number[] = [];
  const on = async () => 1;

  async function q(sqlText: string, params: unknown[] = []): Promise<any> {
    const [r] = await conn.query(sqlText, params);
    return r;
  }

  async function campaign(title: string, isDemo: 0 | 1, status: string, durationDays: number, leftSeconds: number | null, extra: Row = {}): Promise<number> {
    const start = leftSeconds == null ? null : utcStamp(new Date(PIN_DATE.getTime() + leftSeconds * 1000 - durationDays * DAY_MS));
    const cols: Row = {
      userId: OWNER, status, isDemo, title, description: "Example window fixture", projectName: title,
      durationDays, startedAt: start, publishedAt: start, createdAt: OLD, updatedAt: OLD, ...extra,
    };
    const r = await q(`INSERT INTO campaigns (${Object.keys(cols).join(", ")}) VALUES (?)`, [Object.values(cols)]);
    created.push(r.insertId);
    return r.insertId;
  }

  async function insert(table: string, cols: Row): Promise<void> {
    await q(`INSERT INTO ${table} (${Object.keys(cols).join(", ")}) VALUES (?)`, [Object.values(cols)]);
  }

  /**
   * An example with every dated column set somewhere, one stamp recent enough
   * to be capped at now. Its needs close 20 or more days after PIN.
   */
  async function fullChildren(id: number, emailDomain = "example.com"): Promise<void> {
    await insert("campaign_items", { campaignId: id, category: "resource", kind: "item", resourceName: "Posts", estimatedValue: 500, neededFrom: day(9), neededUntil: day(50), createdAt: OLD, updatedAt: OLD });
    await insert("campaign_items", { campaignId: id, category: "equipment", kind: "loan", equipmentName: "Chipper", estimatedValue: 800, loanWindowStart: at(12, 3600), loanWindowEnd: at(40, 3600), neededFrom: day(12), neededUntil: day(40), createdAt: OLD, updatedAt: OLD });
    await insert("campaign_items", { campaignId: id, category: "role", kind: "shift", roleTitle: "Planting day", estimatedValue: 300, shiftStartsAt: at(20, 7200), shiftEndsAt: at(20, 36000), needDeadline: at(18), createdAt: OLD, updatedAt: OLD });
    await insert("campaign_items", { campaignId: id, category: "role", kind: "role", roleTitle: "Undated role", estimatedValue: 900, createdAt: OLD, updatedAt: OLD });
    await insert("campaign_contributions", {
      campaignId: id, contributorName: "Thanked Offer", contributorEmail: `thanked@${emailDomain}`, contributionType: "resource", title: "Saplings", status: "thanked",
      submittedAt: at(-70), createdAt: at(-70), reviewedAt: at(-68), fulfilledAt: at(-63), acknowledgedAt: at(-61, 1234), updatedAt: OLD,
    });
    await insert("campaign_contributions", {
      campaignId: id, contributorName: "Lend Offer", contributorEmail: `lend@${emailDomain}`, contributionType: "equipment", title: "Trailer", status: "accepted",
      offerMode: "lend", availableFrom: day(5), lendUntil: day(30), claimExpiresAt: at(8), submittedAt: at(-6), createdAt: at(-6),
      reviewedAt: at(-2), returnedAt: at(-60), hyphaConfirmedAt: at(-59), cancelNoticedAt: at(-58), nudge1At: at(-4), nudge2At: at(-3, 5),
      waitNoteAt: at(-57), closeReleasedAt: at(-56), updatedAt: OLD,
    });
    await insert("campaign_contributions", {
      campaignId: id, contributorName: "Waiting Offer", contributorEmail: `waiting@${emailDomain}`, contributionType: "role", title: "Help", status: "pending",
      submittedAt: at(-1), createdAt: at(-1), updatedAt: OLD,
    });
    await insert("campaign_updates", { campaignId: id, authorId: OWNER, updateNumber: 1, title: "Posts in", body: "The first posts are in.", publishedAt: at(-40), createdAt: at(-40) });
    await insert("campaign_updates", { campaignId: id, authorId: OWNER, updateNumber: 2, title: "Draft", body: "Not yet.", publishedAt: null, createdAt: at(-30) });
    await insert("campaign_partner_links", { campaignId: id, partner: "maearth", label: "Gifts", url: "https://example.com/route", cachedRaised: 4000, status: "example", lastFetchedAt: at(-3), verifiedAt: at(-50), createdAt: at(-50) });
  }

  async function buildSet(tag: string): Promise<FixtureSet> {
    const stamps = { reviewedAt: at(-117), completedAt: at(-20), closedAt: at(-19), closeNoticedAt: at(-18), finalStretchNoticedAt: at(-1) };
    const near = await campaign(`Test Window ${tag} near`, 1, "active", 120, 5 * 86400 + 6 * 3600, stamps);
    await fullChildren(near);
    const pubOnly = await campaign(`Test Window ${tag} published only`, 1, "active", 90, -10 * 86400, {});
    await q("UPDATE campaigns SET startedAt = NULL, updatedAt = updatedAt WHERE id = ?", [pubOnly]);
    // Its need closes ahead (more than 14 days out), so only the close rule decides its move.
    await insert("campaign_items", { campaignId: pubOnly, category: "resource", kind: "item", resourceName: "Seed", estimatedValue: 100, neededUntil: day(25), createdAt: OLD, updatedAt: OLD });
    const far = await campaign(`Test Window ${tag} far`, 1, "active", 120, 40 * 86400);
    await fullChildren(far);
    const boundary = await campaign(`Test Window ${tag} boundary`, 1, "active", 120, 30 * 86400);
    const underBoundary = await campaign(`Test Window ${tag} under boundary`, 1, "active", 120, 30 * 86400 - 1);
    const short = await campaign(`Test Window ${tag} short`, 1, "active", 20, 10 * 86400);
    const draft = await campaign(`Test Window ${tag} draft`, 1, "draft", 120, 3 * 86400);
    await fullChildren(draft);
    const real = await campaign(`Test Window ${tag} real`, 0, "active", 120, 3 * 86400, stamps);
    await fullChildren(real);
    return { near, pubOnly, far, boundary, underBoundary, short, draft, real };
  }

  const ids = (s: FixtureSet) => Object.values(s);

  async function snapshot(campaignIds: number[]): Promise<Snapshot> {
    const out: Snapshot = {};
    for (const [table, spec] of Object.entries(EXAMPLE_DATED_COLUMNS)) {
      const cols = ["id", ...(table === "campaigns" ? ["isDemo", "status", "durationDays", "createdAt"] : ["campaignId"]), ...spec.moves, ...spec.movesUpToNow, ...(spec.keepsUpdatedAt ? ["updatedAt"] : [])];
      const key = table === "campaigns" ? "id" : "campaignId";
      out[table] = await q(`SELECT ${cols.join(", ")} FROM ${table} WHERE ${key} IN (?) ORDER BY id`, [campaignIds]);
    }
    return out;
  }

  function norm(v: unknown): string | null {
    if (v == null) return null;
    return String(v).replace(/\.\d+$/, "");
  }

  /**
   * What shared/exampleWindow.ts says every row should read after one move at
   * PIN: the close rule, or the shift given for a campaign in `shifts`.
   */
  function expected(before: Snapshot, shifts: Map<number, number> = new Map()): Snapshot {
    const shiftOf = new Map<number, number>(shifts);
    for (const c of before.campaigns) {
      if (shiftOf.has(Number(c.id))) continue;
      const toIso = (v: unknown) => (v == null ? null : `${String(v).replace(" ", "T")}Z`);
      shiftOf.set(Number(c.id), exampleShiftDays({
        isDemo: Number(c.isDemo), status: String(c.status), durationDays: Number(c.durationDays),
        startedAt: toIso(c.startedAt), publishedAt: toIso(c.publishedAt),
      }, PIN_DATE));
    }
    const out: Snapshot = {};
    for (const [table, spec] of Object.entries(EXAMPLE_DATED_COLUMNS)) {
      out[table] = before[table].map((r) => {
        const shift = shiftOf.get(Number(table === "campaigns" ? r.id : r.campaignId)) ?? 0;
        const next: Row = { ...r };
        if (shift === 0) return next;
        for (const col of [...spec.moves, ...spec.movesUpToNow]) {
          const v = norm(r[col]);
          if (v == null) continue;
          if (DATE_ONLY.has(col)) next[col] = movedDay(v, shift);
          else next[col] = utcStamp(movedStamp(`${v.replace(" ", "T")}Z`, shift, PIN_DATE, spec.movesUpToNow.includes(col))!);
        }
        return next;
      });
    }
    return out;
  }

  function normalized(s: Snapshot): Snapshot {
    const out: Snapshot = {};
    for (const [t, rows] of Object.entries(s)) {
      out[t] = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? v : norm(v)])));
    }
    return out;
  }

  const LOCK_ERRORS = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "ER_CHECKREAD"]);
  async function runMigration(campaignIds: number[], pin = PIN): Promise<void> {
    for (const s of prepared(campaignIds, pin)) {
      for (let attempt = 1; ; attempt++) {
        try {
          await conn.execute(s);
          break;
        } catch (e: any) {
          if (attempt >= 5 || !LOCK_ERRORS.has(e?.code)) throw e;
          await new Promise((r) => setTimeout(r, 150 * attempt));
        }
      }
    }
  }

  let M: FixtureSet;
  let J: FixtureSet;

  beforeAll(async () => {
    conn = await mysql.createConnection({ uri: process.env.DATABASE_URL!, dateStrings: true, decimalNumbers: true });
    await conn.query("SET time_zone = '+00:00'");
    await conn.query("DROP TABLE IF EXISTS `_example_window_0268`");
    M = await buildSet("M");
    J = await buildSet("J");
  }, DB_TIMEOUT);

  afterAll(async () => {
    if (!conn) return;
    if (created.length) {
      for (const t of ["campaign_partner_links", "campaign_updates", "campaign_contributions", "campaign_items"]) {
        await conn.query(`DELETE FROM ${t} WHERE campaignId IN (?)`, [created]);
      }
      await conn.query("DELETE FROM campaigns WHERE id IN (?)", [created]);
    }
    await conn.end();
  }, DB_TIMEOUT);

  it("the near example sets every listed column, so every one is really checked", async () => {
    const snap = await snapshot([M.near]);
    for (const [table, spec] of Object.entries(EXAMPLE_DATED_COLUMNS)) {
      for (const col of [...spec.moves, ...spec.movesUpToNow]) {
        expect(snap[table].some((r) => r[col] != null), `${table}.${col}`).toBe(true);
      }
    }
    const before = expected(snap);
    expect(before.campaigns[0].startedAt).not.toBe(snap.campaigns[0].startedAt);
  }, DB_TIMEOUT);

  it("0268 moves every dated thing of an example near its close by one interval, and nothing else", async () => {
    const before = await snapshot(ids(M));
    await runMigration(ids(M));
    const after = await snapshot(ids(M));
    expect(normalized(after)).toEqual(normalized(expected(before)));

    // The shifts, spelled out: near 67 days, published-only 64, one second under 30 days 43; the rest stay.
    const moved = (id: number) => {
      const b = before.campaigns.find((r) => r.id === id)!;
      const a = after.campaigns.find((r) => r.id === id)!;
      const col = b.startedAt ? "startedAt" : "publishedAt";
      return (Date.parse(`${a[col]}Z`.replace(" ", "T")) - Date.parse(`${b[col]}Z`.replace(" ", "T"))) / DAY_MS;
    };
    expect(moved(M.near)).toBe(67);
    expect(moved(M.pubOnly)).toBe(64);
    expect(moved(M.underBoundary)).toBe(43);
    for (const id of [M.far, M.boundary, M.short, M.draft, M.real]) expect(moved(id), `campaign ${id}`).toBe(0);

    // A stamp two days old would land in the future: it stops at now instead.
    const lend = after.campaign_contributions.find((r) => r.campaignId === M.near && r.availableFrom != null)!;
    expect(norm(lend.reviewedAt)).toBe(PIN);
    // updatedAt and the campaign's createdAt are kept on every row.
    for (const t of ["campaigns", "campaign_items", "campaign_contributions"]) {
      for (const r of after[t]) expect(norm(r.updatedAt), `${t} ${r.id}`).toBe(OLD);
    }
    for (const r of after.campaigns) expect(norm(r.createdAt)).toBe(OLD);
    // The ledger is gone.
    expect(await q("SHOW TABLES LIKE '\\_example\\_window\\_0268'")).toHaveLength(0);
  }, DB_TIMEOUT);

  it("0268 changes nothing on a second run", async () => {
    const first = await snapshot(ids(M));
    await runMigration(ids(M));
    expect(normalized(await snapshot(ids(M)))).toEqual(normalized(first));
  }, DB_TIMEOUT);

  it("0268 stopped part way finishes on a second run with the first run's shift, moving no table twice", async () => {
    const id = await campaign("Test Window part way", 1, "active", 120, 5 * 86400 + 6 * 3600);
    await fullChildren(id);
    const before = await snapshot([id]);
    const all = prepared([id], PIN);
    // Stop right after the offers step (needs and offers moved, the rest not).
    const stop = all.findIndex((s) => s.includes("SET stepsDone = 2 WHERE stepsDone = 1"));
    expect(stop).toBeGreaterThan(0);
    for (const s of all.slice(0, stop + 1)) await conn.execute(s);
    const partWay = await snapshot([id]);
    const want = expected(before);
    expect(normalized({ t: partWay.campaign_items })).toEqual(normalized({ t: want.campaign_items }));
    expect(normalized({ t: partWay.campaign_contributions })).toEqual(normalized({ t: want.campaign_contributions }));
    expect(normalized({ t: partWay.campaigns })).toEqual(normalized({ t: before.campaigns }));
    expect(normalized({ t: partWay.campaign_updates })).toEqual(normalized({ t: before.campaign_updates }));
    // Three days later the file runs again from the top: the ledger keeps the first shift and its now.
    await runMigration([id], "2026-10-04 12:00:00");
    expect(normalized(await snapshot([id]))).toEqual(normalized(expected(before)));
    expect(await q("SHOW TABLES LIKE '\\_example\\_window\\_0268'")).toHaveLength(0);
  }, DB_TIMEOUT);

  it("the daily step gives exactly what 0268 gives, and then changes nothing", async () => {
    const before = await snapshot(ids(J));
    const r = await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: ids(J), readSwitch: on });
    expect(r).toEqual({ moved: 3, paused: false });
    const after = await snapshot(ids(J));
    expect(normalized(after)).toEqual(normalized(expected(before)));

    // Same interval on both sets, fixture by fixture.
    const startOf = (s: Snapshot, id: number) => s.campaigns.find((c) => c.id === id)!;
    const mAfter = await snapshot(ids(M));
    for (const k of Object.keys(J) as Array<keyof FixtureSet>) {
      const j = startOf(after, J[k]);
      const m = startOf(mAfter, M[k]);
      expect(norm(j.startedAt), k).toBe(norm(m.startedAt));
      expect(norm(j.publishedAt), k).toBe(norm(m.publishedAt));
    }

    expect(await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: ids(J), readSwitch: on })).toEqual({ moved: 0, paused: false });
    expect(normalized(await snapshot(ids(J)))).toEqual(normalized(after));
  }, DB_TIMEOUT);

  it("the daily step also moves an example far from its close whose shift has started, which 0268 leaves alone", async () => {
    // 60 days left of 120, so the close rule asks for nothing.
    const id = await campaign("Window b1 started shift", 1, "active", 120, 60 * 86400);
    await fullChildren(id, "b1-lane.invalid");
    // A shift that started yesterday.
    await insert("campaign_items", { campaignId: id, category: "role", kind: "shift", roleTitle: "Mulching day", estimatedValue: 200, shiftStartsAt: at(-1), shiftEndsAt: at(-1, 6 * 3600), createdAt: OLD, updatedAt: OLD });
    const before = await snapshot([id]);

    await runMigration([id]);
    expect(normalized(await snapshot([id])), "0268 leaves it alone").toEqual(normalized(before));

    expect(await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: on })).toEqual({ moved: 1, paused: false });
    const after = await snapshot([id]);
    // 15 days puts the shift that started a day ago 14 days out; every listed column moves by that one interval.
    expect(normalized(after)).toEqual(normalized(expected(before, new Map([[id, 15]]))));
    const start = Date.parse(`${norm(after.campaigns[0].startedAt)!.replace(" ", "T")}Z`);
    expect(start).toBeLessThan(PIN_DATE.getTime());
    expect((PIN_DATE.getTime() - start) / DAY_MS).toBe(45);
    // Every shift and window now closes 14 or more days out (UTC session, so the strings read as UTC).
    const needs = await q("SELECT id, kind, category, shiftStartsAt, neededUntil, needDeadline, loanWindowEnd FROM campaign_items WHERE campaignId = ?", [id]);
    expect(needs.filter((n: any) => n.kind === "shift" && n.shiftStartsAt)).toHaveLength(2);
    for (const need of needs) {
      const closes = needClosesAt(need);
      if (closes) expect(closes.getTime() - PIN_DATE.getTime(), `need ${need.id}`).toBeGreaterThanOrEqual(14 * DAY_MS);
    }
    // And it is not due again.
    expect(await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: on })).toEqual({ moved: 0, paused: false });
    expect(normalized(await snapshot([id]))).toEqual(normalized(after));
  }, DB_TIMEOUT);

  it("the daily step waits while its switch is off or missing, and a dry run writes nothing", async () => {
    const id = await campaign("Test Window switch", 1, "active", 120, 2 * 86400);
    await fullChildren(id);
    const before = await snapshot([id]);
    expect(await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: async () => 0 })).toEqual({ moved: 0, paused: true });
    expect(await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: async () => { throw new Error("Game variable not found"); } })).toEqual({ moved: 0, paused: true });
    expect(await rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: on, dryRun: true })).toEqual({ moved: 1, paused: false });
    expect(normalized(await snapshot([id]))).toEqual(normalized(before));
  }, DB_TIMEOUT);

  it("two runs at once move an example once", async () => {
    const id = await campaign("Test Window race", 1, "active", 120, 2 * 86400);
    await fullChildren(id);
    const before = await snapshot([id]);
    // Hold the campaign row so every run has read it and is waiting before any can write:
    // without the locked re-read, each would move it by the shift it read first.
    const blocker = await mysql.createConnection({ uri: process.env.DATABASE_URL! });
    try {
      await blocker.query("START TRANSACTION");
      await blocker.query("SELECT id FROM campaigns WHERE id = ? FOR UPDATE", [id]);
      const running = Promise.all([
        rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: on }),
        rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: on }),
        rollExampleWindows({ now: PIN_DATE, onlyCampaignIds: [id], readSwitch: on }),
      ]);
      await new Promise((r) => setTimeout(r, 800));
      await blocker.query("COMMIT");
      const runs = await running;
      expect(runs.reduce((n, r) => n + r.moved, 0)).toBe(1);
    } finally {
      await blocker.end();
    }
    expect(normalized(await snapshot([id]))).toEqual(normalized(expected(before)));
  }, DB_TIMEOUT);

  it("the daily job runs it as step 6 and counts it", async () => {
    const id = await campaign("Test Window daily job", 1, "active", 160, 29 * 86400);
    const real = await campaign("Test Window daily job real", 0, "active", 160, 29 * 86400);
    const r = await runCrowdpoolDailyJob({ now: PIN_DATE, onlyCampaignIds: [id, real], readSwitch: on, insert: (async () => true) as any, sendEmail: (async () => ({ id: "x" })) as any });
    expect(r).toMatchObject({ examplesRolled: 1, closed: 0, errors: [] });
    const [row] = await q("SELECT startedAt FROM campaigns WHERE id = ?", [id]);
    const [realRow] = await q("SELECT startedAt, updatedAt FROM campaigns WHERE id = ?", [real]);
    const start = Date.parse(`${norm(row.startedAt)!.replace(" ", "T")}Z`);
    expect((start + 160 * DAY_MS - PIN_DATE.getTime()) / DAY_MS).toBe(96); // 29 days left, back to 96
    expect(norm(realRow.updatedAt)).toBe(OLD);
    const again = await runCrowdpoolDailyJob({ now: PIN_DATE, onlyCampaignIds: [id, real], readSwitch: on, insert: (async () => true) as any, sendEmail: (async () => ({ id: "x" })) as any });
    expect(again.examplesRolled).toBe(0);
  }, DB_TIMEOUT);
});
