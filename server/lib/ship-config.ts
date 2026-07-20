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
// Pricing is PER VOYAGE, not nightly (confirmed by Rye 2026-07-11). The nightly
// numbers below are the derivation basis only: a voyage bills a 7-night tank
// cycle, so the per-voyage totals are seven times these. The $600/night anchor
// is kept as the struck-through reference everywhere (supersession ledger).
/** The listed anchor price the ship is worth, per night; struck through as the reference. */
export const ANCHOR_NIGHTLY_USD = 600;
/** Trial-year insured rental charged on the platform (custom offer), per-night basis. */
export const TRIAL_RENTAL_NIGHTLY_USD = 150;
/** Trial-year suggested voyage offering to CORE (legally voluntary), per-night basis. */
export const TRIAL_OFFERING_NIGHTLY_USD = 150;
/**
 * Trial-year total ask per night (rental + offering), the per-voyage derivation
 * basis. Held at exactly half the $600/night anchor so the trial reads as a
 * clean 50% off everywhere it is shown.
 */
export const TRIAL_TOTAL_NIGHTLY_USD = TRIAL_RENTAL_NIGHTLY_USD + TRIAL_OFFERING_NIGHTLY_USD; // 300

/** One voyage is a single 7-night tank cycle (Mon 3pm board to Sun 11am return). */
export const VOYAGE_NIGHTS = 7;

// Per-voyage totals (the numbers a guest actually sees; the site is per-voyage).
/** Anchor value of one voyage week, struck through ($600 × 7). */
export const ANCHOR_VOYAGE_USD = ANCHOR_NIGHTLY_USD * VOYAGE_NIGHTS; // 4200
/** Trial-year platform rental for one voyage week ($1,050). */
export const TRIAL_RENTAL_VOYAGE_USD = TRIAL_RENTAL_NIGHTLY_USD * VOYAGE_NIGHTS; // 1050
/** Trial-year suggested offering for one voyage week ($1,050). */
export const TRIAL_OFFERING_VOYAGE_USD = TRIAL_OFFERING_NIGHTLY_USD * VOYAGE_NIGHTS; // 1050
/** Trial-year total ask for one voyage week ($2,100, exactly half the anchor). */
export const TRIAL_TOTAL_VOYAGE_USD = TRIAL_TOTAL_NIGHTLY_USD * VOYAGE_NIGHTS; // 2100

/**
 * Year two sails at her full rate: double the trial (~$4,200 per voyage, near
 * the $600/night anchor). Applied as a base multiplier to any week on or after
 * the year-2 boundary, composed with seasonal windows. See §3 of
 * CLAUDE_CODE_PROMPT_2026-07-11_SHIP_MAINTAINER_INVENTORY.md.
 */
export const YEAR2_PRICE_MULTIPLIER = 2;
/**
 * When the 50%-off trial ends and she bills at the full $600/night rate. Every
 * bookable week on or after this Monday is full rate; every week before it is
 * the trial half-price. Confirmed by Rye: full rate starts April 2027 (first
 * bookable Monday, 2027-04-05).
 */
export const SHIP_YEAR2_START_YMD = "2027-04-05";

// ── Crew capacity ────────────────────────────────────────────────────────────
// Four guests max, designed for one couple and comfortable for two. A fifth
// berth opens only for a family: five is allowed when at least three of the crew
// are children (SHIP_V4_LOVE, confirmed in the supersession ledger).
export const MIN_GUESTS = 1;
/** Standard maximum crew. */
export const MAX_GUESTS = 4;
/** The most a family crew can bring (only with MIN_CHILDREN_FOR_FIVE children). */
export const MAX_GUESTS_WITH_KIDS = 5;
/** Children required before the fifth berth opens. */
export const MIN_CHILDREN_FOR_FIVE = 3;
/**
 * Most consecutive weeks a crew can chain into one voyage (7, 14, 21, or 28
 * nights; four weeks is a full lunar cycle). Canonical in shared/shipVoyages.ts
 * so the booking page and the suggested voyages read the same cap.
 */
export { MAX_VOYAGE_WEEKS } from "@shared/shipVoyages";

/**
 * True when a crew of `adults` + `children` may sail: up to four aboard, or five
 * when at least three are children. At least one adult must sail.
 */
export function isValidCrewSize(adults: number, children: number): boolean {
  if (!Number.isInteger(adults) || !Number.isInteger(children)) return false;
  if (adults < 1 || children < 0) return false;
  const total = adults + children;
  if (total <= MAX_GUESTS) return true;
  return total === MAX_GUESTS_WITH_KIDS && children >= MIN_CHILDREN_FOR_FIVE;
}

// ── Voyage week grid + seasonal bands ────────────────────────────────────────
// Bookable weeks derive from a fixed Monday grid, not a free date field. Each
// voyage boards Monday 5pm and returns the following Monday 11am; turnover runs
// Monday 11am to 5pm (a weekday window so propane fills and
// other services are open before the next crew boards). The 7-night slot is shared
// at the Monday boundary (half-open ranges). A guest never has to deduce a valid
// start date: the server enumerates the grid and the booking page renders only
// real weeks. Edit the anchor and horizon here.
/** The first bookable Monday of the trial year. Must be a Monday. */
export const SHIP_SEASON_START_YMD = "2026-07-27";
/** How many weeks forward the booking page offers at once (through the end of year two). */
export const SHIP_BOOKING_HORIZON_WEEKS = 104;

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
  // Year one
  { startDate: "2026-07-27", endDate: "2026-09-21", bioregion: "Rogue & Southern Cascadia" },
  { startDate: "2026-09-21", endDate: "2026-09-28", bioregion: "On passage north", migration: true },
  { startDate: "2026-09-28", endDate: "2026-11-16", bioregion: "Willamette & the Columbia Gorge" },
  { startDate: "2026-11-16", endDate: "2027-03-15", bioregion: "Winter anchorage, Ashland" },
  { startDate: "2027-03-15", endDate: "2027-07-26", bioregion: "Rogue & Southern Cascadia" },
  // Year two (full rate) — projections firm up as the itinerary does
  { startDate: "2027-07-26", endDate: "2027-09-20", bioregion: "Rogue & Southern Cascadia" },
  { startDate: "2027-09-20", endDate: "2027-09-27", bioregion: "On passage north", migration: true },
  { startDate: "2027-09-27", endDate: "2027-11-15", bioregion: "Willamette & the Columbia Gorge" },
  { startDate: "2027-11-15", endDate: "2028-03-13", bioregion: "Winter, projected southern bioregion" },
  { startDate: "2028-03-13", endDate: "2028-08-01", bioregion: "Rogue & Southern Cascadia" },
];

/** Flat Ship Keeper pay per turnover. */
export const KEEPER_PAY_USD = 200;

// ── Entry model (points threshold, weighted draw) ────────────────────────────
// Entry is a points threshold, not a checklist. Reach SHIP_ENTRY_THRESHOLD_POINTS
// verified points and you are in every future drawing. No single action is
// mandatory. Draws are weighted-random: your points are your raffle tickets, so
// every point above the threshold raises your odds. Approved nominations enter
// at NOMINATION_TICKETS, the same footing as a threshold entrant. Every free
// voyage is drawn weighted-random, so there is no first-crew prize.
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
// One free voyage is drawn at launch (the first draw, on August 16). The rest
// release as the first year books up, on the non-uniform, later-weighted
// schedule in FREE_VOYAGE_RELEASE_MILESTONES (40/60/75/85/95% booked), up to
// MAX_FREE_VOYAGES total at a fully booked year. Each free voyage is drawn
// weighted at random from everyone in the draw (threshold entrants + approved
// nominees), and winners pick their own dates. The schedule lives in
// @shared/shipFreeVoyage so the server truth and the client preview never drift.
export {
  MAIDEN_FREE_VOYAGES,
  MAX_FREE_VOYAGES,
  FREE_VOYAGE_RELEASE_MILESTONES,
} from "@shared/shipFreeVoyage";
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

// ── State-of-the-ship baselines (real-world totals from before tracking) ──────
// Seeds were planted and voyages sailed before the ledger existed. These
// baselines seed the public trust dashboard so it tells the true story from day
// one; live DB counts are added on top and the tiles keep growing. Rye can
// override either at runtime with the game variables ship.seeds_planted_base and
// ship.voyages_sailed_base (no deploy needed) once the ledger catches up.
export const SEEDS_PLANTED_BASELINE = 489;
export const VOYAGES_SAILED_BASELINE = 1;

// ── Free Voyage Giveaway (public entry layer) ────────────────────────────────
// The public sweepstakes constants live in @shared/shipGiveaway so the draw, the
// router credit math, and the client preview cannot drift. The rules gate below
// is server-only (it reads a Railway var).
export {
  GIVEAWAY_BONUS,
  REFERRAL_CREDIT_CAP,
  REFERRAL_MILESTONE_STICKERS,
  REFERRAL_MILESTONE_LEADERBOARD,
  GIVEAWAY_ENTRIES_OPEN_YMD,
  GIVEAWAY_ENTRIES_CLOSE_YMD,
  GIVEAWAY_DRAW_YMD,
  GIVEAWAY_ENTRIES_CLOSE_ISO,
  GIVEAWAY_ARV_USD,
} from "@shared/shipGiveaway";

/**
 * The official-rules gate. The rules page and the public entry button stay off
 * until Oregon counsel signs off and GIVEAWAY_RULES_APPROVED is set on Railway.
 * Lets the whole entry layer deploy ahead of the legal review (the page shows a
 * "rules publish before entries open" placeholder and the enter button disables).
 */
export function isGiveawayRulesApproved(): boolean {
  return ENV.giveawayRulesApproved;
}

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
