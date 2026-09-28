/**
 * Example campaigns that never go stale: the daily step. Each live example
 * near its close date moves forward in time, whole, so it reads partway
 * through its window again. The rule is shared/exampleWindow.ts
 * (exampleShiftDays); migration 0268 applied it once in SQL, and this applies
 * it every day from the daily crowdpool job (server/jobs/crowdpoolDailyJob.ts).
 *
 * Examples only. The candidate query, the locked re-read and every UPDATE
 * each require isDemo = 1, so a real campaign is never touched even if one of
 * them is wrong.
 *
 * Safe to run twice at once (the in-process timer and the admin "Run nightly"
 * button can overlap): each example moves in one transaction that locks its
 * need rows and then its campaign row (the lock order used everywhere,
 * server/lib/campaign-close.ts), re-reads the campaign under the lock and
 * works out the move again. A second run waits, reads the moved campaign and
 * finds nothing to do.
 *
 * The UPDATEs run with the session in UTC and put the zone back after, so
 * TIMESTAMP arithmetic never crosses a daylight-saving change in the
 * database's own zone (the scratch MariaDB runs in America/Los_Angeles). Only
 * integers and a UTC timestamp string go into that session, never a JS Date,
 * which mysql2 would write in the server process's local zone.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { cacheDel } from "../cache";
import { OPEN_NEEDS_CACHE_KEY } from "../../shared/openNeeds";
import { exampleShiftDays, type ExampleWindowCampaign } from "../../shared/exampleWindow";
import { crowdpoolSwitchOn } from "./campaign-close";

/** Pauses the daily roll without a deploy. Off when missing or unreadable, like the other crowdpool switches. */
export const EXAMPLES_ROLL_SWITCH = "crowdpool.examples_roll";

type TableSpec = {
  alias: string;
  /** Planned dates: they move by the whole interval. */
  moves: readonly string[];
  /** Stamps of things that happened: they move too, but never past now. */
  movesUpToNow: readonly string[];
  /** The table's updatedAt is ON UPDATE CURRENT_TIMESTAMP: set it to itself so it stays. */
  keepsUpdatedAt: boolean;
};

/**
 * Every dated column that belongs to an example, in the order 0268 moves
 * them (the campaign last). server/example-window.test.ts checks 0268's SET
 * clauses against this list, so the migration and the daily job move the
 * same columns. campaigns.createdAt stays (no page shows it; it records when
 * the row was made). Examples refuse ticks, markers, arrival notes and
 * replies, and practice offers write nothing, so no other table holds a date
 * that belongs to an example.
 */
export const EXAMPLE_DATED_COLUMNS: Readonly<Record<string, TableSpec>> = {
  campaign_items: {
    alias: "ci",
    moves: ["needDeadline", "shiftStartsAt", "shiftEndsAt", "loanWindowStart", "loanWindowEnd", "neededFrom", "neededUntil"],
    movesUpToNow: [],
    keepsUpdatedAt: true,
  },
  campaign_contributions: {
    alias: "cc",
    moves: ["availableFrom", "lendUntil", "claimExpiresAt"],
    movesUpToNow: [
      "submittedAt", "createdAt", "reviewedAt", "fulfilledAt", "acknowledgedAt", "returnedAt",
      "hyphaConfirmedAt", "cancelNoticedAt", "nudge1At", "nudge2At", "waitNoteAt", "closeReleasedAt",
    ],
    keepsUpdatedAt: true,
  },
  campaign_updates: {
    alias: "cu",
    moves: [],
    movesUpToNow: ["publishedAt", "createdAt"],
    keepsUpdatedAt: false,
  },
  campaign_partner_links: {
    alias: "pl",
    moves: [],
    movesUpToNow: ["lastFetchedAt", "verifiedAt"],
    keepsUpdatedAt: false,
  },
  campaigns: {
    alias: "c",
    moves: ["startedAt", "publishedAt"],
    movesUpToNow: ["reviewedAt", "completedAt", "closedAt", "closeNoticedAt", "finalStretchNoticedAt"],
    keepsUpdatedAt: true,
  },
};

const IDENT = /^[A-Za-z][A-Za-z0-9_]*$/;

/** 'YYYY-MM-DD HH:MM:SS' in UTC, whole seconds, for the UTC session. */
export function utcStamp(d: Date): string {
  const s = new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 19)}`;
}

/**
 * The SET list for one table. Built only from the constants above, a whole
 * number of days and a UTC timestamp this module formatted, each checked
 * before it goes into the SQL text.
 */
export function setClauseFor(spec: TableSpec, days: number, nowUtc: string): string {
  if (!Number.isInteger(days) || days <= 0) throw new Error(`example window: bad shift ${days}`);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(nowUtc)) throw new Error(`example window: bad now ${nowUtc}`);
  const a = spec.alias;
  const cols = [...spec.moves, ...spec.movesUpToNow];
  if (!IDENT.test(a) || !cols.every((c) => IDENT.test(c))) throw new Error("example window: bad identifier");
  const parts = [
    ...spec.moves.map((c) => `${a}.${c} = DATE_ADD(${a}.${c}, INTERVAL ${days} DAY)`),
    ...spec.movesUpToNow.map((c) => `${a}.${c} = LEAST(DATE_ADD(${a}.${c}, INTERVAL ${days} DAY), CAST('${nowUtc}' AS DATETIME))`),
  ];
  if (spec.keepsUpdatedAt) parts.push(`${a}.updatedAt = ${a}.updatedAt`);
  return parts.join(", ");
}

type ExampleRow = ExampleWindowCampaign & { id: number };

/**
 * The campaign fields the rule reads. The dates come back as epoch seconds
 * (UNIX_TIMESTAMP of a TIMESTAMP column returns its stored UTC value), not
 * through drizzle's timestamp column, which reads the session's wall time as
 * if it were UTC: right on production (a UTC session), 7 hours off on the
 * scratch MariaDB (America/Los_Angeles), and the move has to be exact.
 */
const SELECT_EXAMPLE = sql`SELECT id, isDemo, status, durationDays,
  UNIX_TIMESTAMP(startedAt) AS startedAtS, UNIX_TIMESTAMP(publishedAt) AS publishedAtS
  FROM campaigns`;

function epochDate(v: unknown): Date | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

function exampleRowOf(r: any): ExampleRow {
  return {
    id: Number(r.id),
    isDemo: Number(r.isDemo),
    status: r.status == null ? null : String(r.status),
    durationDays: Number(r.durationDays),
    startedAt: epochDate(r.startedAtS),
    publishedAt: epochDate(r.publishedAtS),
  };
}

function rowsOf(result: unknown): any[] {
  const rows = (result as any)?.[0];
  return Array.isArray(rows) ? rows : [];
}

/** Live examples, optionally only these ids (tests: scratch holds a thousand old fixtures). */
export async function listLiveExamples(onlyCampaignIds?: number[]): Promise<ExampleRow[]> {
  const database = await getDb();
  if (!database) return [];
  const only = onlyCampaignIds?.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (only && only.length === 0) return [];
  const scope = only ? sql` AND id IN (${sql.join(only.map((n) => sql`${n}`), sql`, `)})` : sql``;
  const result = await database.execute(sql`${SELECT_EXAMPLE} WHERE isDemo = 1 AND status = 'active'${scope}`);
  return rowsOf(result).map(exampleRowOf);
}

const LOCK_ERRORS = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]);

function isLockError(e: any): boolean {
  return LOCK_ERRORS.has(e?.code) || LOCK_ERRORS.has(e?.cause?.code);
}

/**
 * Moves one example by the rule, in one transaction. Returns the whole days
 * it moved, or 0 when it had nothing to do: a real campaign, one no longer
 * live, one not near its close, or one a run beside this one already moved.
 * campaign_items has no campaignId index, so the need-row lock scans the
 * table (as the close does); a deadlock with another writer rolls this
 * transaction back whole, and it is tried again up to twice.
 */
export async function shiftExampleWindow(campaignId: number, now: Date): Promise<number> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await shiftExampleWindowOnce(campaignId, now);
    } catch (e) {
      if (attempt >= 3 || !isLockError(e)) throw e;
      await new Promise((r) => setTimeout(r, 100 * attempt));
    }
  }
}

async function shiftExampleWindowOnce(campaignId: number, now: Date): Promise<number> {
  const database = await getDb();
  if (!database) return 0;
  const id = Number(campaignId);
  if (!Number.isInteger(id) || id <= 0) return 0;
  return database.transaction(async (tx) => {
    // Lock order as everywhere: need rows, then the campaign row, then
    // contribution rows (taken by the UPDATE below).
    await tx.execute(sql`SELECT id FROM campaign_items WHERE campaignId = ${id} FOR UPDATE`);
    const [raw] = rowsOf(await tx.execute(sql`${SELECT_EXAMPLE} WHERE id = ${id} FOR UPDATE`));
    if (!raw) return 0;
    const days = exampleShiftDays(exampleRowOf(raw), now);
    if (days <= 0) return 0;

    const nowUtc = utcStamp(now);
    await tx.execute(sql`SET @rc_example_window_tz = @@session.time_zone`);
    await tx.execute(sql`SET time_zone = '+00:00'`);
    try {
      for (const [table, spec] of Object.entries(EXAMPLE_DATED_COLUMNS)) {
        if (!IDENT.test(table)) throw new Error("example window: bad table");
        const set = sql.raw(setClauseFor(spec, days, nowUtc));
        if (table === "campaigns") {
          await tx.execute(sql`UPDATE campaigns c SET ${set} WHERE c.id = ${id} AND c.isDemo = 1 AND c.status = 'active'`);
        } else {
          const t = sql.raw(`\`${table}\` ${spec.alias}`);
          const on = sql.raw(`c.id = ${spec.alias}.campaignId AND c.isDemo = 1`);
          const scope = sql.raw(`${spec.alias}.campaignId`);
          await tx.execute(sql`UPDATE ${t} JOIN campaigns c ON ${on} SET ${set} WHERE ${scope} = ${id}`);
        }
      }
    } finally {
      await tx.execute(sql`SET time_zone = @rc_example_window_tz`);
    }
    return days;
  });
}

export type ExampleRollOptions = {
  now?: Date;
  /** Only these campaigns. Tests always pass it. */
  onlyCampaignIds?: number[];
  /** Report how many would move; write nothing. */
  dryRun?: boolean;
  /** Reads a crowdpool switch (game variable). Tests pass their own. */
  readSwitch?: (key: string) => Promise<number>;
};

/**
 * The daily step: move every live example near its close. Returns how many
 * moved (or would, on a dry run). Paused while crowdpool.examples_roll is off
 * or missing. One example that fails doesn't stop the others; the failures
 * are thrown together at the end, so the daily job counts them.
 */
export async function rollExampleWindows(opts: ExampleRollOptions = {}): Promise<{ moved: number; paused: boolean }> {
  if (!(await crowdpoolSwitchOn(EXAMPLES_ROLL_SWITCH, opts))) return { moved: 0, paused: true };
  const now = opts.now ?? new Date();
  const candidates = await listLiveExamples(opts.onlyCampaignIds);
  let moved = 0;
  const failed: string[] = [];
  for (const c of candidates) {
    if (exampleShiftDays(c, now) <= 0) continue;
    if (opts.dryRun) {
      moved++;
      continue;
    }
    try {
      if ((await shiftExampleWindow(c.id, now)) > 0) moved++;
    } catch (e: any) {
      failed.push(`campaign ${c.id}: ${e?.message ?? e}`);
    }
  }
  // A need's window reads on the Needs tab, which is cached.
  if (moved > 0 && !opts.dryRun) await cacheDel(OPEN_NEEDS_CACHE_KEY).catch(() => undefined);
  if (failed.length) throw new Error(`moved ${moved}, failed ${failed.length}: ${failed.join("; ")}`);
  return { moved, paused: false };
}
