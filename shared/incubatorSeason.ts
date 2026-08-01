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

/** Season 2 runs through September 2026 (per Rye, 2026-08-01). */
const SEASON_3_STARTS = new Date("2026-10-01T00:00:00Z");

export function currentIncubatorSeason(now: Date = new Date()): number {
  return now < SEASON_3_STARTS ? 2 : 3;
}
