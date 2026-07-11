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
  ANCHOR_NIGHTLY_USD,
  TRIAL_RENTAL_NIGHTLY_USD,
  TRIAL_OFFERING_NIGHTLY_USD,
  MAIDEN_FREE_VOYAGES,
  FREE_VOYAGE_MILESTONE_PCT,
  MAX_FREE_VOYAGES,
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
 * allowed (guest resets systems mid-voyage) but must land on a 7-night multiple.
 */
export function isValidVoyageLength(startYmd: string, endYmd: string): boolean {
  const nights = nightsBetween(startYmd, endYmd);
  return Number.isInteger(nights) && nights >= VOYAGE_NIGHTS && nights % VOYAGE_NIGHTS === 0;
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
  /** Saturday the voyage begins (YYYY-MM-DD). */
  startDate: string;
  /** The following Saturday: turnover day, exclusive end of the 7 nights. */
  endDate: string;
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
  /** Anchor Saturday the grid starts from. */
  seasonStart: string;
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
 * Enumerate the bookable voyage-week grid. Weeks run Saturday to Saturday on a
 * fixed anchor; the shared Saturday is the turnover day (half-open ranges, so a
 * week ending the day another starts does not overlap). Each week resolves to a
 * single state, a projected bioregion, and a seasonal price. This is the source
 * of truth for the booking page: the guest never deduces a valid start date.
 */
export function enumerateVoyageWeeks(input: EnumerateWeeksInput): VoyageWeek[] {
  const out: VoyageWeek[] = [];
  let cursor = input.seasonStart;
  // Hard cap on iterations so a bad anchor can never loop forever.
  for (let i = 0; i < 520 && out.length < input.horizonWeeks; i++) {
    const startDate = cursor;
    const endDate = addDaysYmd(startDate, VOYAGE_NIGHTS);
    cursor = endDate; // next week begins on the turnover Saturday
    if (startDate <= input.today) continue; // already begun or past: cannot start it

    const band = input.bands.find((b) => startDate >= b.startDate && startDate < b.endDate);
    const bioregion = band?.bioregion ?? "Cascadia";
    const migration = Boolean(band?.migration);

    const win = input.pricingWindows.find((w) => rangesOverlap(startDate, endDate, w.startDate, w.endDate));
    const priceMultiplier = win ? Number(win.multiplier) || 1 : 1;

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
      endDate,
      state,
      bioregion,
      migration,
      selectable: state === "open" || state === "requested",
      priceMultiplier,
      price: computeVoyagePrice(VOYAGE_NIGHTS, priceMultiplier),
      windowLabel: win?.label ?? null,
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

// ── Quest standings (finish order + top-3) ───────────────────────────────────
export type QuestCompletionRow = {
  userId: number;
  actionId: number;
  status: "pending" | "verified" | "rejected";
  verifiedAt: Date | string | null;
  points: number; // points of the linked action
  isRequired: boolean;
};

export type QuestStanding = {
  userId: number;
  verifiedPoints: number;
  requiredVerified: number;
  /** True once every required action is verified: this crew is in the draw. */
  isFinisher: boolean;
  /** ms timestamp of the last verified REQUIRED action, when all required done. */
  finishAt: number | null;
};

function toMs(v: Date | string | null): number | null {
  if (v == null) return null;
  const t = typeof v === "string" ? Date.parse(v) : v.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Compute per-user standings from verified completions. A crew that has every
 * required action verified is a finisher, meaning they are in the draw for a
 * free voyage. Free voyages are awarded by random selection (see
 * freeVoyagesUnlocked), not by finish order, so no one has to rush.
 */
export function computeQuestStandings(
  completions: QuestCompletionRow[],
  requiredActionIds: number[],
): QuestStanding[] {
  const required = new Set(requiredActionIds);
  const byUser = new Map<number, { points: number; requiredTimes: Map<number, number> }>();

  for (const c of completions) {
    if (c.status !== "verified") continue;
    let u = byUser.get(c.userId);
    if (!u) {
      u = { points: 0, requiredTimes: new Map() };
      byUser.set(c.userId, u);
    }
    u.points += c.points || 0;
    if (required.has(c.actionId)) {
      const ts = toMs(c.verifiedAt) ?? 0;
      // Keep the latest verification time for each required action.
      const prev = u.requiredTimes.get(c.actionId);
      if (prev == null || ts > prev) u.requiredTimes.set(c.actionId, ts);
    }
  }

  const standings: QuestStanding[] = [];
  for (const [userId, u] of byUser) {
    const requiredVerified = u.requiredTimes.size;
    const isFinisher = required.size > 0 && requiredVerified === required.size;
    const finishAt = isFinisher ? Math.max(...Array.from(u.requiredTimes.values())) : null;
    standings.push({
      userId,
      verifiedPoints: u.points,
      requiredVerified,
      isFinisher,
      finishAt,
    });
  }

  // Order: finishers first by finishAt asc (earliest completers shown first,
  // though selection is random), then the rest by points, then progress.
  standings.sort((a, b) => {
    if (a.isFinisher && b.isFinisher) return (a.finishAt! - b.finishAt!);
    if (a.isFinisher) return -1;
    if (b.isFinisher) return 1;
    if (b.verifiedPoints !== a.verifiedPoints) return b.verifiedPoints - a.verifiedPoints;
    return b.requiredVerified - a.requiredVerified;
  });

  return standings;
}

/** How many crews have completed the quest (the size of the draw pool). */
export function countCompleted(standings: QuestStanding[]): number {
  return standings.filter((s) => s.isFinisher).length;
}

// ── Free-voyage giveaway (booking-volume driven, random selection) ────────────
/** Percent of the first year booked, from booked voyages against the target. */
export function percentBooked(bookedVoyages: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((bookedVoyages / target) * 100)));
}

/**
 * How many free voyages are unlocked at a given percent booked. The maiden
 * voyage is free from the start; each FREE_VOYAGE_MILESTONE_PCT booked unlocks
 * one more, capped at MAX_FREE_VOYAGES (six at 100% booked).
 */
export function freeVoyagesUnlocked(percent: number): number {
  const milestones = Math.floor(Math.max(0, Math.min(100, percent)) / FREE_VOYAGE_MILESTONE_PCT);
  return Math.min(MAX_FREE_VOYAGES, MAIDEN_FREE_VOYAGES + milestones);
}
