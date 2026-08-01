/**
 * shared/shipVoyageGrid.ts
 *
 * The voyage-week grid as pure arithmetic, with no DB, clock, or env.
 *
 * The ship sells whole Monday-to-Monday voyage weeks. Outdoorsy sells nights,
 * and its minimum stay is four of them (decision D1, 2026-08-01), so an inbound
 * Outdoorsy booking almost never lines up with our grid. Rather than teach the
 * booking page about partial weeks, we snap each inbound range OUTWARD to the
 * whole voyage weeks it touches. A four-night Outdoorsy trip consumes a full
 * voyage week on our side. We lose the remainder on purpose: a coherent week
 * grid is worth more than the nights.
 *
 * Snapping outward is also the fail-safe direction. Rounding inward would leave
 * a night bookable that someone has already paid for.
 *
 * The grid must agree with `enumerateVoyageWeeks` in server/lib/ship-logic.ts,
 * which walks `cursor = seasonStart` forward in 7-day steps. That makes every
 * voyage week start `seasonStart + 7k`, and the arithmetic below is just the
 * closed form of that walk. If one changes, change both.
 *
 * This lives in shared/ rather than server/ so the client can reuse it and the
 * tests do not need a server import. That is also why it carries its own date
 * helpers instead of importing ship-logic's: shared/ is bundled into the
 * client, and must not reach into server/.
 */

/** Nights in one voyage week. Mirrors VOYAGE_NIGHTS in server/lib/ship-config.ts. */
export const VOYAGE_WEEK_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/** Parse YYYY-MM-DD as a UTC midnight instant. UTC throughout so DST cannot shift a Monday. */
function utcMs(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00Z`);
}

/** Add whole days to a YYYY-MM-DD, returning YYYY-MM-DD. */
export function addDaysYmd(ymd: string, days: number): string {
  const t = utcMs(ymd);
  if (Number.isNaN(t)) return ymd;
  return new Date(t + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMs(to) - utcMs(from)) / MS_PER_DAY);
}

/**
 * Which voyage week a date falls in, as an offset from the season start.
 *
 * Negative for dates before the season start, which is meaningful: the grid is
 * infinite in both directions, we simply do not sell the earlier part of it.
 */
export function voyageWeekIndex(seasonStart: string, ymd: string): number {
  return Math.floor(daysBetween(seasonStart, ymd) / VOYAGE_WEEK_DAYS);
}

/** The Monday that opens the voyage week containing `ymd`. */
export function voyageWeekStart(seasonStart: string, ymd: string): string {
  return addDaysYmd(seasonStart, voyageWeekIndex(seasonStart, ymd) * VOYAGE_WEEK_DAYS);
}

export type SnapInput = {
  /** Anchor Monday of the grid (SHIP_SEASON_START_YMD). */
  seasonStart: string;
  /** Inclusive first occupied day, YYYY-MM-DD. */
  startDate: string;
  /** Exclusive last day, YYYY-MM-DD. Half-open, matching our own convention. */
  endDate: string;
};

export type SnappedRange = {
  startDate: string;
  endDate: string;
  /** False when the range sits entirely before the grid and was left as-is. */
  snapped: boolean;
};

/**
 * Expand a half-open [startDate, endDate) range to the union of the voyage
 * weeks it intersects.
 *
 * A range already sitting exactly on voyage-week boundaries comes back
 * unchanged, so re-snapping is idempotent and the sync's upsert stays a no-op
 * on an unchanged feed.
 *
 * A range entirely before the season start is returned untouched: there are no
 * voyage weeks back there to snap to, and inventing some would write a blackout
 * over dates the grid never offers.
 */
export function snapRangeToVoyageWeeks(input: SnapInput): SnappedRange {
  const { seasonStart, startDate } = input;
  // Guard a zero-length or inverted range: treat it as the single start day, so
  // a malformed feed entry still blocks something rather than nothing.
  const endDate = input.endDate > startDate ? input.endDate : addDaysYmd(startDate, 1);

  // The last day actually occupied. endDate is exclusive, so step back one.
  const lastDay = addDaysYmd(endDate, -1);

  if (lastDay < seasonStart) return { startDate, endDate, snapped: false };

  const snappedStart = voyageWeekStart(seasonStart, startDate);
  const snappedEnd = addDaysYmd(voyageWeekStart(seasonStart, lastDay), VOYAGE_WEEK_DAYS);
  return { startDate: snappedStart, endDate: snappedEnd, snapped: true };
}
