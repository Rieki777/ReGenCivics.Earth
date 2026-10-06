/**
 * Incubator season numbering for land project applications.
 *
 * This is the Season 1 / Season 2 count of incubator cohorts, distinct from
 * the calendar-season theming in client/src/lib/seasons.ts. Applications are
 * stamped with the current season at submit time (server/routes/applications.ts)
 * and the admin Applications tab filters on that stored tag, never on dates:
 * the Season 1 batch was seeded with submittedAt 2026-03-14 while real
 * Season 2 applications arrived from February 2026 on, so dates cannot
 * separate the cohorts.
 */

/**
 * Season 3 begins at the September 2026 equinox, when the Season 2 cohort
 * kicks off (per Rye, 2026-08-01). Same date the game-season rotation in
 * client/src/lib/seasons.ts turns over.
 */
const SEASON_3_STARTS = new Date("2026-09-22T00:00:00Z");

/**
 * Season 2 takes applications again, on a rolling basis, until its
 * crowdpooling round opens (Rye, 2026-10-01). Being accepted means a project
 * meets the minimum criteria to take part in crowdpooling; from there each
 * village and project follows the live sessions, catches up on any it missed,
 * and does the parts its project needs to join the round.
 *
 * The window closes at the end of the round's default opening day, March
 * 20, 2027, on the US west coast (shared/crowdpoolCalendar.ts; a test keeps
 * the two together). March 20, 2027 is Pacific Daylight Time, so the end of
 * that day is 07:00 UTC on March 21. Applications from September 22 to 30
 * were stamped Season 3, under the 2026-09-24 ruling that had closed Season 2.
 */
export const SEASON_2_ROLLING = {
  season: 2,
  /** October 1, 2026, midnight Pacific. */
  opens: new Date("2026-10-01T07:00:00Z"),
  /** The end of March 20, 2027, Pacific (PDT, UTC-7). */
  closes: new Date("2027-03-21T07:00:00Z"),
  /** The day the crowdpooling round opens, for copy. */
  closesOn: "March 20",
} as const;

/** True while Season 2 takes rolling applications. */
export function season2Rolling(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= SEASON_2_ROLLING.opens.getTime() && t < SEASON_2_ROLLING.closes.getTime();
}

export function currentIncubatorSeason(now: Date = new Date()): number {
  if (now < SEASON_3_STARTS || season2Rolling(now)) return 2;
  return 3;
}
