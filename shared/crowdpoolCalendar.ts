/**
 * The season's shared crowdpooling day. Pure, read by the /campaigns gallery
 * (client/src/components/crowdpool/SeasonDefaults.tsx).
 *
 * Ruling 2026-09-24, confirmed 2026-09-27 (question 14): a shared default
 * opening day, labelled as a default; each project may choose its own. The
 * day comes from the Year wheel in shared/regenYear.ts (not edited here).
 * ADR-70: crowdpooling opens together at the March equinox, when the Build
 * Season opens (TURNING_POINTS.summer). The Resource Season still opens at
 * the December solstice, with a recap and passoff. The launch follows at
 * the equinox.
 */
import { SEASON_2_OPENS, TURNING_POINTS, regenSeasonSpan } from "./regenYear";

/** The March equinox (the Build Season's opening day) in a given year, UTC midnight. */
function launchOpensIn(year: number): Date {
  const tp = TURNING_POINTS.summer;
  return new Date(Date.UTC(year, tp.month - 1, tp.day));
}

/**
 * The season's shared crowdpooling day from the Year wheel: the March
 * equinox, when the Build Season opens. A default; each project may choose
 * its own.
 *
 *   Design Season (winter): the March equinox that follows, same season number.
 *   Resource Season (spring): that same March equinox, still upcoming.
 *   Build Season (summer): the day it opened, state 'open'.
 *   Rest Season (fall): the next cycle's March equinox, next season number.
 *   Before Season 2 opened: 20 March 2027, Season 2.
 *
 * At 2026-09-27 it returns 20 March 2027, Season 2, upcoming.
 */
export function defaultCrowdpoolOpening(now: Date = new Date()): {
  date: Date;
  seasonNumber: number;
  state: "upcoming" | "open";
} {
  if (now.getTime() < SEASON_2_OPENS.getTime()) {
    return { date: launchOpensIn(2027), seasonNumber: 2, state: "upcoming" };
  }
  const span = regenSeasonSpan(now);
  const year = span.start.getUTCFullYear();
  switch (span.season) {
    case "winter":
      // Design opens at the September equinox; this cycle's launch is the following March.
      return { date: launchOpensIn(year + 1), seasonNumber: span.seasonNumber, state: "upcoming" };
    case "spring":
      // Resource runs December to March. The launch is the March equinox, still ahead.
      return { date: launchOpensIn(year + 1), seasonNumber: span.seasonNumber, state: "upcoming" };
    case "summer":
      return { date: new Date(span.start.getTime()), seasonNumber: span.seasonNumber, state: "open" };
    default:
      // Rest opens at the June solstice. The next cycle launches the following March.
      return { date: launchOpensIn(year + 1), seasonNumber: span.seasonNumber + 1, state: "upcoming" };
  }
}
