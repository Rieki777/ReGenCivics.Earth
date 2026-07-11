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

/** Flat Ship Keeper pay per turnover. */
export const KEEPER_PAY_USD = 200;

// ── Entry model (points threshold, weighted draw) ────────────────────────────
// Entry is a points threshold, not a checklist. Reach SHIP_ENTRY_THRESHOLD_POINTS
// verified points and you are in every future drawing. No single action is
// mandatory. Draws are weighted-random: your points are your raffle tickets, so
// every point above the threshold raises your odds. Approved nominations enter
// at NOMINATION_TICKETS, the same footing as a threshold entrant. The maiden
// voyage goes to the first crew to cross the threshold.
/** Verified points that put a crew in every future drawing. */
export const SHIP_ENTRY_THRESHOLD_POINTS = 150;
/** Raffle tickets an approved nomination enters with (same as the threshold). */
export const NOMINATION_TICKETS = SHIP_ENTRY_THRESHOLD_POINTS;

// ── Crew profiles + sponsorship ──────────────────────────────────────────────
/** The full voyage ask a crew can be sponsored toward, in cents ($2,100). */
export const CREW_SPONSOR_GOAL_CENTS = 210_000;
/** churchDonations program tag for crew sponsorships (same as gifted voyages). */
export const CREW_SPONSOR_PROGRAM_TAG = "regen_ship_gift";

// ── Free-voyage giveaway model (booking-volume driven) ───────────────────────
// The maiden voyage is given away free. Then one more free voyage unlocks for
// every FREE_VOYAGE_MILESTONE_PCT of the first year that gets booked, up to
// MAX_FREE_VOYAGES total at 100% booked. Each free voyage is drawn weighted at
// random from everyone in the draw (threshold entrants + approved nominees).
// This aligns everyone around spreading the word: more bookings unlock more free
// voyages, and everyone in the draw has a shot at each one.
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
    // Crew sponsorship checkout is live when Stripe is configured.
    sponsor: isStripeConfigured(),
    // The quest entry model, so copy can read one source of truth.
    entryThreshold: SHIP_ENTRY_THRESHOLD_POINTS,
    sponsorGoalCents: CREW_SPONSOR_GOAL_CENTS,
  };
}
