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

/** The legal entity behind the Ship (Terms §1). */
export const SHIP_LEGAL_ENTITY = "Church of the Regenerative Earth";

/** The Vessel herself (Terms §1). */
export const SHIP_VEHICLE = "2006 Fleetwood Revolution";

/** The date v1.0 takes effect. */
export const SHIP_TERMS_EFFECTIVE = "July 16, 2026";

/** The core team's line for radius permission requests (§6.4) and breakdowns
 *  (§13). Permission still only counts once confirmed in writing, so a text is
 *  the reliable channel. `TEL` is the href form. */
export const SHIP_CORE_TEAM_PHONE = "(707) 267-7660";
export const SHIP_CORE_TEAM_TEL = "+17072677660";

/** Late return (§4): $50/hour for the first 12 hours, then $600/day. The hourly
 *  window tops out exactly at the daily rate (12 x 50 = 600), so the two meet. */
export const SHIP_LATE_FEE_PER_HOUR_USD = 50;
export const SHIP_LATE_FEE_HOURLY_WINDOW_HOURS = 12;
export const SHIP_LATE_FEE_PER_DAY_USD = 600;

/** The refundable security deposit held on the Platform, in USD (Terms §11).
 *  The terms page and the booking flow both read this, so the number a guest is
 *  quoted at checkout always matches the number in the agreement they accept. */
export const SHIP_DEPOSIT_USD = 1500;

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
