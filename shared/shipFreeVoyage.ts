/**
 * The free-voyage giveaway schedule, shared by the server (source of truth in
 * loadFreeVoyageStatus) and the client (FreeVoyageLadder drag-preview) so the
 * two can never drift. One voyage is drawn at launch (the first draw, on
 * August 16). The rest release as the first year books up, on a non-uniform,
 * later-weighted schedule. Winners pick their own dates from the open weeks.
 */

/** Free voyages drawn at launch (the first draw, before any booking milestone). */
export const MAIDEN_FREE_VOYAGES = 1;

/** The most free voyages we give away in the first year (at a fully booked year). */
export const MAX_FREE_VOYAGES = 6;

/**
 * Percent-booked milestones that release voyages 2..6, in order. Non-uniform and
 * weighted toward the later months so the giveaways build as she fills up. Edit
 * this array to retune the pace; keep its length at MAX_FREE_VOYAGES - MAIDEN_FREE_VOYAGES.
 */
export const FREE_VOYAGE_RELEASE_MILESTONES = [40, 60, 75, 85, 95] as const;

/** How many free voyages are unlocked at a given percent booked. */
export function freeVoyagesUnlocked(percent: number): number {
  const p = Math.max(0, Math.min(100, percent));
  const released = FREE_VOYAGE_RELEASE_MILESTONES.filter((m) => p >= m).length;
  return Math.min(MAX_FREE_VOYAGES, MAIDEN_FREE_VOYAGES + released);
}
