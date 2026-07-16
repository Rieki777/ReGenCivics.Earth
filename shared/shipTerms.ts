/**
 * Shared constants for the ReGen Ship Voyage Covenant and Rental Terms.
 * The terms page (client/src/pages/ship/ShipTerms.tsx) renders the copy; the
 * booking flow records which version a Crew accepted; the voyage map reads the
 * radius policy. One source of truth so the page, the acceptance record, and the
 * map never drift.
 *
 * Keep the page wording in sync with ReGen_Ship_Voyage_Covenant_and_Rental_Terms.md
 * (the master doc). When the wording changes, bump SHIP_TERMS_VERSION so old
 * acceptances stay auditable against the version the Crew actually saw.
 */

/** The active terms version. Bump on any wording change; bookings record the
 *  version accepted so old acceptances stay auditable. */
export const SHIP_TERMS_VERSION = "1.0";

/** Travel radius policy (STEERING deterministic-first; the map + copy read these). */
export const RADIUS_BASE_MILES = 500; // one-week voyage
export const RADIUS_PER_EXTRA_WEEK_MILES = 250; // each added week
/** The longest voyage the radius table covers (whole 7-night cycles). */
export const RADIUS_MAX_WEEKS = 4;

/** Permitted straight-line radius from Ashland for a voyage of `weeks` weeks. */
export function permittedRadiusMiles(weeks: number): number {
  const w = Math.max(1, Math.min(RADIUS_MAX_WEEKS, Math.floor(weeks)));
  return RADIUS_BASE_MILES + (w - 1) * RADIUS_PER_EXTRA_WEEK_MILES;
}
