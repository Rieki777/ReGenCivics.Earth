/**
 * The season's shared crowdpooling day. Pure, read by the /campaigns gallery
 * (client/src/components/crowdpool/SeasonDefaults.tsx).
 *
 * Ruling 2026-09-24, confirmed 2026-09-27 (question 14): a shared default
 * opening day, labelled as a default; each project may choose its own. The
 * day comes from the Year wheel in shared/regenYear.ts (not edited here):
 * crowdpooling opens together when the Resource Season opens, at the
 * December solstice (TURNING_POINTS.spring), when week 13 of the incubator
 * launches the shared crowdpool.
 */
import { SEASON_2_OPENS, TURNING_POINTS, regenSeasonSpan } from "./regenYear";

/** The Resource Season's opening day (the December solstice) in a given year, UTC midnight. */
function resourceOpensIn(year: number): Date {
  const tp = TURNING_POINTS.spring;
  return new Date(Date.UTC(year, tp.month - 1, tp.day));
}

/**
 * The season's shared crowdpooling day from the Year wheel: the December
 * solstice, when the Resource Season opens. A default; each project may
 * choose its own.
 *
 *   Design Season (winter): the upcoming December solstice of that cycle.
 *   Resource Season (spring): the day it opened, state 'open'.
 *   Build or Rest Season: the next cycle's December solstice, next season number.
 *   Before Season 2 opened: 21 December 2026, Season 2.
 *
 * At 2026-09-27 it returns 21 December 2026, Season 2, upcoming.
 */
export function defaultCrowdpoolOpening(now: Date = new Date()): {
  date: Date;
  seasonNumber: number;
  state: "upcoming" | "open";
} {
  if (now.getTime() < SEASON_2_OPENS.getTime()) {
    return { date: resourceOpensIn(SEASON_2_OPENS.getUTCFullYear()), seasonNumber: 2, state: "upcoming" };
  }
  const span = regenSeasonSpan(now);
  switch (span.season) {
    case "winter":
      // The cycle's winter opens at the September equinox; its Resource Season the same December.
      return { date: resourceOpensIn(span.start.getUTCFullYear()), seasonNumber: span.seasonNumber, state: "upcoming" };
    case "spring":
      return { date: new Date(span.start.getTime()), seasonNumber: span.seasonNumber, state: "open" };
    default:
      // Build (from the March equinox) and Rest (from the June solstice) fall in
      // the calendar year the next cycle opens, so its December is this year's.
      return { date: resourceOpensIn(span.start.getUTCFullYear()), seasonNumber: span.seasonNumber + 1, state: "upcoming" };
  }
}
