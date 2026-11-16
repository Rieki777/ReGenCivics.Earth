/**
 * ReGen Ship pure logic. No DB, no I/O. Everything here is deterministic so it
 * can be unit-tested directly (see server/ship.test.ts) and reused by the
 * router. Deterministic-first per STEERING section 11.
 *
 * Dates are YYYY-MM-DD strings. For that format, lexical string comparison is
 * the same as chronological comparison, which keeps overlap checks trivial.
 */
import {
  VOYAGE_NIGHTS,
  MAX_VOYAGE_WEEKS,
  ANCHOR_NIGHTLY_USD,
  TRIAL_RENTAL_NIGHTLY_USD,
  TRIAL_OFFERING_NIGHTLY_USD,
  SHIP_PROGRAM_TAG,
  SHIP_GIFT_PROGRAM_TAG,
} from "./ship-config";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(s: string): boolean {
  return YMD_RE.test(s);
}

/** Nights between two YYYY-MM-DD dates (endDate exclusive of the last night). */
export function nightsBetween(startYmd: string, endYmd: string): number {
  const start = Date.parse(`${startYmd}T00:00:00Z`);
  const end = Date.parse(`${endYmd}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return NaN;
  return Math.round((end - start) / 86_400_000);
}

/**
 * A voyage is a whole number of 7-night tank cycles. Multi-week voyages are
 * allowed (guest resets systems mid-voyage) but must land on a 7-night multiple,
 * capped at MAX_VOYAGE_WEEKS (four weeks, a full lunar cycle).
 */
export function isValidVoyageLength(startYmd: string, endYmd: string): boolean {
  const nights = nightsBetween(startYmd, endYmd);
  return (
    Number.isInteger(nights) &&
    nights >= VOYAGE_NIGHTS &&
    nights <= MAX_VOYAGE_WEEKS * VOYAGE_NIGHTS &&
    nights % VOYAGE_NIGHTS === 0
  );
}

/**
 * How many nights the concierge should chart, read from a session's intake
 * answers (the suggested voyages seed `voyage_nights`). Falls back to one
 * voyage week when absent or out of bounds. Deterministic and testable.
 */
export function voyageNightsFromAnswers(answers: Record<string, unknown>): number {
  const raw = Number(String(answers?.voyage_nights ?? ""));
  const valid =
    Number.isInteger(raw) &&
    raw >= VOYAGE_NIGHTS &&
    raw <= MAX_VOYAGE_WEEKS * VOYAGE_NIGHTS &&
    raw % VOYAGE_NIGHTS === 0;
  return valid ? raw : VOYAGE_NIGHTS;
}

/**
 * Two half-open date ranges [aStart, aEnd) and [bStart, bEnd) overlap when each
 * starts before the other ends. A booking ending the day another starts does
 * NOT overlap (that shared day is the turnover day).
 */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** True if the requested range overlaps any existing [start,end) range. */
export function overlapsAny(
  startYmd: string,
  endYmd: string,
  ranges: Array<{ startDate: string; endDate: string }>,
): boolean {
  return ranges.some((r) => rangesOverlap(startYmd, endYmd, r.startDate, r.endDate));
}

export type VoyagePrice = {
  nights: number;
  multiplier: number;
  anchorTotal: number;
  rentalTotal: number;
  offeringTotal: number;
  total: number;
};

/** Trial-year price breakdown for a voyage. Multiplier is the seasonal window. */
export function computeVoyagePrice(nights: number, multiplier = 1): VoyagePrice {
  const m = multiplier > 0 ? multiplier : 1;
  const rentalTotal = Math.round(TRIAL_RENTAL_NIGHTLY_USD * nights * m);
  const offeringTotal = Math.round(TRIAL_OFFERING_NIGHTLY_USD * nights * m);
  return {
    nights,
    multiplier: m,
    anchorTotal: Math.round(ANCHOR_NIGHTLY_USD * nights * m),
    rentalTotal,
    offeringTotal,
    total: rentalTotal + offeringTotal,
  };
}

/** Offering donations are program-tagged so ship revenue is segmentable. */
export function programTagForBooking(opts: { isGifted?: boolean }): string {
  return opts.isGifted ? SHIP_GIFT_PROGRAM_TAG : SHIP_PROGRAM_TAG;
}

// ── Voyage week grid ──────────────────────────────────────────────────────────
/** Add whole days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDaysYmd(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(t)) return ymd;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

export type WeekState = "open" | "requested" | "booked" | "turnover" | "migration";

export type SeasonalBand = {
  startDate: string;
  endDate: string;
  bioregion: string;
  migration?: boolean;
};

export type VoyageWeek = {
  /** Monday the voyage boards, 5pm (YYYY-MM-DD). */
  startDate: string;
  /** The following Monday she returns, 11am (display date; seven nights after boarding). */
  returnDate: string;
  /** The following Monday: exclusive end of the 7-day slot, shared with the next week. */
  endDate: string;
  /** True when this week bills at the year-two full rate. */
  isYear2: boolean;
  state: WeekState;
  /** Where she is projected to be that week. */
  bioregion: string;
  /** True when she is repositioning between bioregions (not bookable). */
  migration: boolean;
  /** True when a guest can request this week (open or requested-by-others). */
  selectable: boolean;
  priceMultiplier: number;
  price: VoyagePrice;
  /** Pricing-window label, when one applies (e.g. "Peak"). */
  windowLabel: string | null;
};

type DateRange = { startDate: string; endDate: string };

export type EnumerateWeeksInput = {
  /** Anchor Monday the grid starts from. */
  seasonStart: string;
  /** First Monday of year two; weeks on/after it bill at the full rate. */
  year2Start?: string;
  /** Base multiplier applied to year-two weeks (e.g. 2 for double the trial). */
  year2Multiplier?: number;
  /** How many upcoming weeks to return. */
  horizonWeeks: number;
  /** Today as YYYY-MM-DD; weeks that have fully passed are dropped. */
  today: string;
  /** Blocking bookings (approved and later). */
  booked: DateRange[];
  /** Requested-but-unconfirmed bookings (do not block, shown as "requested"). */
  requested: DateRange[];
  /** Admin holds; a reason mentioning "turnover" renders as the turnover state. */
  blackouts: Array<DateRange & { reason?: string | null }>;
  /** Seasonal pricing windows (multiplier as number or decimal string). */
  pricingWindows: Array<DateRange & { multiplier: number | string; label?: string | null }>;
  /** Projected bioregion bands, including migration passages. */
  bands: SeasonalBand[];
};

/**
 * Enumerate the bookable voyage-week grid. Each week boards Monday 5pm and
 * returns the following Monday 11am; the 7-day slot is shared at the Monday
 * boundary (half-open ranges, so a week ending the day another starts does not
 * overlap), and the Monday 11am to 5pm window is turnover. Each week resolves to
 * a single state, a projected bioregion, and a per-voyage price (doubled in year
 * two). This is the source of truth for the booking page: the guest never
 * deduces a valid start date.
 */
export function enumerateVoyageWeeks(input: EnumerateWeeksInput): VoyageWeek[] {
  const out: VoyageWeek[] = [];
  let cursor = input.seasonStart;
  const year2Mult = input.year2Multiplier ?? 1;
  // Hard cap on iterations so a bad anchor can never loop forever.
  for (let i = 0; i < 520 && out.length < input.horizonWeeks; i++) {
    const startDate = cursor;
    const endDate = addDaysYmd(startDate, VOYAGE_NIGHTS);
    const returnDate = addDaysYmd(startDate, VOYAGE_NIGHTS); // the following Monday she returns
    cursor = endDate; // next week boards the following Monday
    if (startDate <= input.today) continue; // already begun or past: cannot start it

    const band = input.bands.find((b) => startDate >= b.startDate && startDate < b.endDate);
    const bioregion = band?.bioregion ?? "Cascadia";
    const migration = Boolean(band?.migration);

    const isYear2 = Boolean(input.year2Start && startDate >= input.year2Start);
    const baseMultiplier = isYear2 ? year2Mult : 1;
    const win = input.pricingWindows.find((w) => rangesOverlap(startDate, endDate, w.startDate, w.endDate));
    const priceMultiplier = baseMultiplier * (win ? Number(win.multiplier) || 1 : 1);

    let state: WeekState;
    if (migration) {
      state = "migration";
    } else if (overlapsAny(startDate, endDate, input.booked)) {
      state = "booked";
    } else if (
      input.blackouts.some(
        (b) => rangesOverlap(startDate, endDate, b.startDate, b.endDate) && /turnover/i.test(b.reason ?? ""),
      )
    ) {
      state = "turnover";
    } else if (overlapsAny(startDate, endDate, input.blackouts)) {
      state = "booked";
    } else if (overlapsAny(startDate, endDate, input.requested)) {
      state = "requested";
    } else {
      state = "open";
    }

    out.push({
      startDate,
      returnDate,
      endDate,
      isYear2,
      state,
      bioregion,
      migration,
      selectable: state === "open" || state === "requested",
      priceMultiplier,
      price: computeVoyagePrice(VOYAGE_NIGHTS, priceMultiplier),
      windowLabel: win?.label ?? (isYear2 ? "Full rate" : null),
    });
  }
  return out;
}

// ── Itinerary validation (concierge safety) ──────────────────────────────────
export type ItineraryDay = { day: number; title?: string; locationIds: number[]; notes?: string };
export type Itinerary = { days: ItineraryDay[]; summary?: string };

/**
 * The concierge composes an itinerary strictly from verified ship_locations we
 * pass it. Before saving, every location id it returns must exist in the
 * allow-set. Returns the set of ids the model invented (empty = clean).
 */
export function invalidItineraryLocationIds(itinerary: Itinerary, allowedIds: Iterable<number>): number[] {
  const allow = new Set<number>(allowedIds);
  const invalid = new Set<number>();
  for (const day of itinerary.days ?? []) {
    for (const id of day.locationIds ?? []) {
      if (!allow.has(id)) invalid.add(id);
    }
  }
  return Array.from(invalid);
}

/** Drop any invented ids so a mostly-good itinerary can still be saved. */
export function sanitizeItinerary(itinerary: Itinerary, allowedIds: Iterable<number>): Itinerary {
  const allow = new Set<number>(allowedIds);
  return {
    summary: itinerary.summary,
    days: (itinerary.days ?? []).map((d) => ({
      ...d,
      locationIds: (d.locationIds ?? []).filter((id) => allow.has(id)),
    })),
  };
}

// ── Quest standings (a public game score, no prize) ──────────────────────────
// Rye, 15 Nov 2026: points and the leaderboard stay as a public score with no
// prize and no line to cross. The free-voyage draw and its 150-point line were
// retired.
export type QuestCompletionRow = {
  userId: number;
  actionId: number;
  status: "pending" | "verified" | "rejected";
  verifiedAt: Date | string | null;
  points: number; // points of the linked action
};

export type QuestStanding = {
  userId: number;
  verifiedPoints: number;
  verifiedCount: number;
};

/** Per-user standings from verified completions, highest score first. */
export function computeQuestStandings(completions: QuestCompletionRow[]): QuestStanding[] {
  const byUser = new Map<number, QuestStanding>();
  for (const c of completions) {
    if (c.status !== "verified") continue;
    const row = byUser.get(c.userId) ?? { userId: c.userId, verifiedPoints: 0, verifiedCount: 0 };
    row.verifiedPoints += c.points || 0;
    row.verifiedCount += 1;
    byUser.set(c.userId, row);
  }
  return [...byUser.values()].sort((a, b) => b.verifiedPoints - a.verifiedPoints);
}

// ── Booking volume ────────────────────────────────────────────────────────────
/** Percent of the first year booked, from booked voyages against the target. */
export function percentBooked(bookedVoyages: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((bookedVoyages / target) * 100)));
}

// ── Crew sponsorship (accumulation toward the voyage goal) ────────────────────
export type SponsorshipProgress = {
  sponsoredCents: number;
  goalCents: number;
  percent: number;
  goalReached: boolean;
};

/** Progress toward a crew's voyage goal, clamped to 100%. */
export function sponsorshipProgress(sponsoredCents: number, goalCents: number): SponsorshipProgress {
  const goal = goalCents > 0 ? goalCents : 1;
  const sponsored = Math.max(0, sponsoredCents);
  return {
    sponsoredCents: sponsored,
    goalCents,
    percent: Math.max(0, Math.min(100, Math.round((sponsored / goal) * 100))),
    goalReached: sponsored >= goalCents,
  };
}

/**
 * Apply a sponsorship contribution to a running total. Returns the new total
 * and whether this contribution is the one that crossed the goal (so the caller
 * fires the goal-reached notice exactly once).
 */
export function applySponsorship(
  currentCents: number,
  addCents: number,
  goalCents: number,
): { sponsoredCents: number; goalReached: boolean; newlyReached: boolean } {
  const before = Math.max(0, currentCents);
  const sponsoredCents = before + Math.max(0, addCents);
  const goalReached = sponsoredCents >= goalCents;
  return { sponsoredCents, goalReached, newlyReached: goalReached && before < goalCents };
}
