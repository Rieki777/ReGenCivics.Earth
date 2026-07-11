/**
 * ReGen Ship configuration + feature guards.
 *
 * The ship is a CORE (Church of the Regenerative Earth) program. Every
 * env-dependent feature is gated by an isConfigured guard so the whole system
 * ships and each piece lights up when its Railway var lands (see the ship ADRs
 * and CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md).
 *
 * Money numbers live here as the single source of truth so the pricing display,
 * the emails, and the admin surfaces all agree. These are trial-year defaults;
 * Rye edits pricing windows and policy in admin (see SHIP_VARIABLES.md).
 */
import { ENV } from "../_core/env";
import { isZeffyConfigured } from "./zeffy";
import { isStripeConfigured } from "./stripe";

// ── Pricing (trial year) ─────────────────────────────────────────────────────
/** The listed anchor price the ship is worth; the strikethrough everywhere. */
export const ANCHOR_NIGHTLY_USD = 600;
/** Trial-year insured rental charged on the platform (custom offer). */
export const TRIAL_RENTAL_NIGHTLY_USD = 149;
/** Trial-year suggested voyage offering to CORE (legally voluntary). */
export const TRIAL_OFFERING_NIGHTLY_USD = 150;
/** Trial-year total ask per night (rental + offering). */
export const TRIAL_TOTAL_NIGHTLY_USD = TRIAL_RENTAL_NIGHTLY_USD + TRIAL_OFFERING_NIGHTLY_USD; // 299

/** One voyage is a single 7-night tank cycle. */
export const VOYAGE_NIGHTS = 7;
export const MIN_GUESTS = 1;
export const MAX_GUESTS = 4;
/** Most consecutive weeks a crew can chain into one voyage (7, 14, or 21 nights). */
export const MAX_VOYAGE_WEEKS = 3;

// ── Voyage week grid + seasonal bands ────────────────────────────────────────
// Bookable weeks derive from a fixed Saturday grid, not a free date field. Each
// voyage runs Saturday to Saturday (7 nights); the shared Saturday is the
// turnover day when the Keeper resets her for the next crew. A guest never has
// to deduce a valid start date: the server enumerates the grid and the booking
// page renders only real weeks. Edit the anchor and horizon here.
/** The first bookable Saturday of the trial year. Must be a Saturday. */
export const SHIP_SEASON_START_YMD = "2026-07-25";
/** How many weeks forward the booking page offers at once. */
export const SHIP_BOOKING_HORIZON_WEEKS = 20;

/**
 * Projected bioregion by date range (the seasonal band data the booking cards
 * show). A band with `migration: true` is a passage week: she is relocating
 * between bioregions and is not bookable. These are trial-year projections Rye
 * tunes as the itinerary firms up; nothing here blocks a week on its own except
 * a migration band. Dates are half-open [startDate, endDate).
 */
export type ShipSeasonalBand = {
  startDate: string;
  endDate: string;
  bioregion: string;
  migration?: boolean;
};
export const SHIP_SEASONAL_BANDS: ShipSeasonalBand[] = [
  { startDate: "2026-07-25", endDate: "2026-09-19", bioregion: "Rogue & Southern Cascadia" },
  { startDate: "2026-09-19", endDate: "2026-09-26", bioregion: "On passage north", migration: true },
  { startDate: "2026-09-26", endDate: "2026-11-14", bioregion: "Willamette & the Columbia Gorge" },
  { startDate: "2026-11-14", endDate: "2027-03-13", bioregion: "Winter anchorage, Ashland" },
  { startDate: "2027-03-13", endDate: "2027-06-30", bioregion: "Rogue & Southern Cascadia" },
];

/** Flat Ship Keeper pay per turnover. */
export const KEEPER_PAY_USD = 200;

// ── Free-voyage giveaway model (booking-volume driven) ───────────────────────
// The maiden voyage is given away free. Then one more free voyage unlocks for
// every FREE_VOYAGE_MILESTONE_PCT of the first year that gets booked, up to
// MAX_FREE_VOYAGES total at 100% booked. Each free voyage is drawn at random
// from everyone who has completed the Maiden Voyage Quest. This aligns everyone
// around spreading the word: more bookings unlock more free voyages, and every
// quest-completer is in every draw.
/** Free voyages given at launch (the maiden voyage). */
export const MAIDEN_FREE_VOYAGES = 1;
/** Each this-percent of the year booked unlocks one more free voyage. */
export const FREE_VOYAGE_MILESTONE_PCT = 20;
/** The most free voyages we give away in the first year (at 100% booked). */
export const MAX_FREE_VOYAGES = 6;
/** Voyages that count as 100% booked for the first year. Edit to pace giveaways. */
export const MAIDEN_YEAR_VOYAGE_TARGET = 40;
/** Suggested winter host income share (church council sets per agreement). */
export const WINTER_HOST_SHARE_DEFAULT_PCT = 25;
/** Share of church ship revenue routed to RV token buyback. */
export const FLEET_BUYBACK_PCT = 10;
/** Minimum driver age policy default. */
export const MIN_DRIVER_AGE = 25;
/** Included miles per voyage, then per-mile overage. */
export const MILES_INCLUDED = 1000;
export const OVERAGE_PER_MILE_USD = 0.5;

/** churchDonations program tags so Transparency/Reconciliation segments ship revenue. */
export const SHIP_PROGRAM_TAG = "regen_ship";
export const SHIP_GIFT_PROGRAM_TAG = "regen_ship_gift";

/** Token ledger source tags (STEERING section 5, private writes only). */
export const SHIP_QUEST_SOURCE = "ship_quest";
export const SHIP_REFERRAL_SOURCE = "ship_referral";

/** Approved bookings auto-expire if the platform step is not completed in time. */
export const PLATFORM_PENDING_EXPIRY_HOURS = 72;

// ── Feature guards ───────────────────────────────────────────────────────────
/** The AI concierge lights up when an LLM key is present (OpenRouter or Anthropic). */
export { isLLMConfigured as isConciergeConfigured } from "../_core/llm";

/** The suggested voyage offering form (Zeffy preferred, Stripe fallback). */
export function isOfferingConfigured(): boolean {
  return Boolean(ENV.shipZeffyOfferingUrl) || isZeffyConfigured() || isStripeConfigured();
}
export function getOfferingUrl(): string | null {
  return ENV.shipZeffyOfferingUrl || null;
}

/** Gift a Voyage (twice the regular offering). */
export function isGiftConfigured(): boolean {
  return Boolean(ENV.shipZeffyGiftUrl) || isStripeConfigured();
}
export function getGiftUrl(): string | null {
  return ENV.shipZeffyGiftUrl || null;
}

/** The platform (Outdoorsy) listing URL, shown on the booking page + emails. */
export function isPlatformListingConfigured(): boolean {
  return Boolean(ENV.shipOutdoorsyListingUrl);
}
export function getPlatformListingUrl(): string | null {
  return ENV.shipOutdoorsyListingUrl || null;
}

/** The GPS tracker API (position pin v2). Manual pings work without it. */
export function isTrackerConfigured(): boolean {
  return Boolean(ENV.shipGpsTrackerApiUrl && ENV.shipGpsTrackerApiKey);
}

/** One place for the client to learn what is live. */
export function shipFeatureFlags() {
  return {
    concierge: (ENV.openrouterApiKey || ENV.anthropicApiKey) ? true : false,
    offering: isOfferingConfigured(),
    offeringUrl: getOfferingUrl(),
    gift: isGiftConfigured(),
    giftUrl: getGiftUrl(),
    platformListing: isPlatformListingConfigured(),
    platformListingUrl: getPlatformListingUrl(),
    tracker: isTrackerConfigured(),
  };
}
