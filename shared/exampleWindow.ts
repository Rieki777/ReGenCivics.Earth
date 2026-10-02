/**
 * Example campaigns that never go stale. Pure, shared by migration 0268
 * (drizzle/0268_refresh_example_windows.sql), the daily crowdpool job
 * (server/jobs/crowdpoolDailyJob.ts, through server/lib/example-window.ts)
 * and the tests.
 *
 * Examples never close (ruling 2026-09-27), and they run from startedAt (or
 * publishedAt) plus durationDays, so their dates age: production's Harmony
 * Valley read a close date a week away on 2026-09-28 and would then have
 * shown a past close date forever. Demos can't be re-seeded while
 * drizzle/after-deploy/0251 is held. Instead, an example is moved forward in
 * time, whole, so it reads partway through its window again.
 *
 * The close rule (0268 applied it once, in SQL):
 *   - An example rolls when its close date is fewer than 30 days away, or
 *     past. A window shorter than 100 days rolls at 30% of it left instead,
 *     so a short window doesn't sit under 30 days right after a roll and move
 *     every day.
 *   - It moves by the fewest whole days that leave about 60% of its window
 *     (round(3/5 of durationDays) days) still to run.
 *
 * The need rule (bundle 1, 2026-10-01; the daily step applies both): an
 * example also rolls when any of its shifts has started or any need window
 * has passed (shared/needWindow.ts needClosesAt), so no example shows a past
 * shift or window. It then moves by the larger of the close rule and the
 * fewest whole days that put every shift and window at least 14 days out,
 * never moving its start past now.
 *
 * Whole days, so a DATE column ('YYYY-MM-DD', a need's window, a lend's
 * dates) and a TIMESTAMP move by exactly the same interval.
 *
 * Everything that belongs to the example moves by that interval (the column
 * list is EXAMPLE_DATED_COLUMNS in server/lib/example-window.ts). Planned
 * dates (a need's window, a lend's dates, the campaign's own start) move by
 * the whole interval. Stamps of things that already happened (an offer
 * submitted, a delivery, an update posted) move too, but never past now, so
 * nothing reads as having happened in the future; the move is monotonic, so
 * their order is kept.
 *
 * Arithmetic is in whole seconds and integers only. The close rule mirrors
 * the SQL in 0268 statement for statement: MySQL's TIMESTAMPDIFF(SECOND, ...),
 * integer DIV, and no float that could round a day the other way. The need
 * rule has no SQL mirror; only the daily step applies it.
 */
import { needClosesAt, type NeedWindowLike } from "./needWindow";

export const DAY_SECONDS = 86_400;

/** The rule's numbers. Integer fractions, so SQL and TypeScript agree to the day. */
export const EXAMPLE_WINDOW = {
  /** An example rolls once its close date is fewer than this many days away (or past)... */
  rollBelowDays: 30,
  /** ...or, for a short window, once fewer than 3/10 of its days are left. */
  rollBelowShare: { numerator: 3, denominator: 10 },
  /** After a roll, about 3/5 of the window is left. */
  keepShare: { numerator: 3, denominator: 5 },
  /** After a roll for a started shift or a passed window, every shift and window is at least this many days out. */
  needLeadDays: 14,
} as const;

export type ExampleWindowCampaign = {
  isDemo: boolean | number | null;
  status: string | null;
  startedAt: Date | string | null;
  publishedAt?: Date | string | null;
  durationDays: number | string | null;
};

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function isExample(isDemo: ExampleWindowCampaign["isDemo"]): boolean {
  const n = Number(isDemo);
  return Number.isFinite(n) && n !== 0;
}

function wholeSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/** round(n * num / den) half up, in integers: SQL (n * num * 2 + den) DIV (den * 2). */
function roundShare(n: number, num: number, den: number): number {
  return Math.floor((n * num * 2 + den) / (den * 2));
}

/**
 * The days an example keeps after a roll: round(3/5 of durationDays).
 * SQL: (6 * durationDays + 5) DIV 10.
 */
export function exampleKeepDays(durationDays: number): number {
  const { numerator, denominator } = EXAMPLE_WINDOW.keepShare;
  return roundShare(durationDays, numerator, denominator);
}

/**
 * The days left below which an example rolls: 30, or round(3/10 of
 * durationDays) when that is smaller. SQL: LEAST(30, (3 * durationDays + 5) DIV 10).
 */
export function exampleRollBelowDays(durationDays: number): number {
  const { numerator, denominator } = EXAMPLE_WINDOW.rollBelowShare;
  return Math.min(EXAMPLE_WINDOW.rollBelowDays, roundShare(durationDays, numerator, denominator));
}

/** The window's length in whole days, or 0 when it has none. */
function durationOf(c: ExampleWindowCampaign): number {
  const n = Math.trunc(Number(c.durationDays));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Whole days to move this example forward so it reads partway through its
 * window with no past shift or window, or 0 for no move: a real campaign,
 * one that isn't live, one with no start date or no duration, and an example
 * with enough time left whose shifts and windows are all still ahead.
 *
 * The close rule, as SQL (0268, the ledger insert), with left =
 * TIMESTAMPDIFF(SECOND, now, COALESCE(startedAt, publishedAt) + INTERVAL
 * durationDays DAY):
 *   rolls when left < LEAST(30, (3 * D + 5) DIV 10) * 86400, and then moves
 *   GREATEST(0, (((6 * D + 5) DIV 10) * 86400 - left + 86399) DIV 86400) days.
 *
 * The need rule (no SQL mirror): with `needs` given, the example also rolls
 * when any need's needClosesAt is at or before now, and moves by at least
 * the whole days that put the earliest one needLeadDays (14) days out. When
 * that is more than the close rule, the move stops where the example's start
 * would pass now, so its window always started in the past. With no needs
 * this is exactly the close rule.
 */
export function exampleShiftDays(c: ExampleWindowCampaign, now: Date, needs: readonly NeedWindowLike[] = []): number {
  if (!isExample(c.isDemo) || c.status !== "active") return 0;
  const start = toDate(c.startedAt) ?? toDate(c.publishedAt ?? null);
  const days = durationOf(c);
  if (!start || days <= 0) return 0;
  const nowS = wholeSeconds(now);
  const startS = wholeSeconds(start);
  const left = startS + days * DAY_SECONDS - nowS;
  const nearClose = left < exampleRollBelowDays(days) * DAY_SECONDS;
  const closes: number[] = [];
  for (const need of needs) {
    const at = needClosesAt(need);
    if (at) closes.push(wholeSeconds(at));
  }
  const anyPassed = closes.some((t) => t <= nowS);
  if (!nearClose && !anyPassed) return 0;

  const closeRule = nearClose ? Math.max(0, Math.ceil((exampleKeepDays(days) * DAY_SECONDS - left) / DAY_SECONDS)) : 0;
  const needRule = closes.length
    ? Math.max(0, Math.ceil((nowS + EXAMPLE_WINDOW.needLeadDays * DAY_SECONDS - Math.min(...closes)) / DAY_SECONDS))
    : 0;
  let shift = Math.max(closeRule, needRule);
  // The close rule alone always leaves about 40% of the window behind now, so
  // only the need rule can push the start past now: stop it there.
  if (needRule > closeRule) shift = Math.min(shift, Math.max(closeRule, Math.floor((nowS - startS) / DAY_SECONDS)));
  return shift > 0 ? shift : 0;
}

/** The example's close date once moved by `shiftDays`, or null when it has none. */
export function exampleClosesAt(c: ExampleWindowCampaign, shiftDays = 0): Date | null {
  const start = toDate(c.startedAt) ?? toDate(c.publishedAt ?? null);
  const days = durationOf(c);
  if (!start || days <= 0) return null;
  return new Date(start.getTime() + (days + shiftDays) * DAY_SECONDS * 1000);
}

/**
 * A timestamp moved by `shiftDays`. A planned date moves by the whole
 * interval; a stamp of something that happened moves too, but never past
 * now. SQL: DATE_ADD(col, INTERVAL n DAY), and for a stamp
 * LEAST(DATE_ADD(col, INTERVAL n DAY), now).
 */
export function movedStamp(value: Date | string | null, shiftDays: number, now: Date, happened: boolean): Date | null {
  const d = toDate(value);
  if (!d) return null;
  const moved = new Date(d.getTime() + shiftDays * DAY_SECONDS * 1000);
  const cap = new Date(wholeSeconds(now) * 1000);
  return happened && moved.getTime() > cap.getTime() ? cap : moved;
}

/** A 'YYYY-MM-DD' day moved by `shiftDays` whole days. SQL: DATE_ADD(col, INTERVAL n DAY). */
export function movedDay(day: string | null, shiftDays: number): string | null {
  if (!day) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + shiftDays * DAY_SECONDS * 1000;
  return new Date(t).toISOString().slice(0, 10);
}
