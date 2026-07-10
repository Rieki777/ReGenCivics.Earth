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
  WINNER_SLOTS,
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
  isFinisher: boolean;
  /** ms timestamp of the last verified REQUIRED action, when all required done. */
  finishAt: number | null;
  /** 1-based winner rank among the first WINNER_SLOTS finishers, else null. */
  winnerRank: number | null;
};

function toMs(v: Date | string | null): number | null {
  if (v == null) return null;
  const t = typeof v === "string" ? Date.parse(v) : v.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Compute per-user standings from verified completions.
 * Finish order = timestamp of the last verified REQUIRED action once every
 * required action is verified. The first WINNER_SLOTS finishers get a rank.
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
      winnerRank: null,
    });
  }

  // Order: finishers first by finishAt asc (earliest wins), then the rest by
  // points desc, then by requiredVerified desc for a stable, fair board.
  standings.sort((a, b) => {
    if (a.isFinisher && b.isFinisher) return (a.finishAt! - b.finishAt!);
    if (a.isFinisher) return -1;
    if (b.isFinisher) return 1;
    if (b.verifiedPoints !== a.verifiedPoints) return b.verifiedPoints - a.verifiedPoints;
    return b.requiredVerified - a.requiredVerified;
  });

  let rank = 0;
  for (const s of standings) {
    if (s.isFinisher && rank < WINNER_SLOTS) {
      rank += 1;
      s.winnerRank = rank;
    }
  }
  return standings;
}

/** How many winner slots remain open. */
export function remainingWinnerSlots(standings: QuestStanding[]): number {
  const taken = standings.filter((s) => s.winnerRank != null).length;
  return Math.max(0, WINNER_SLOTS - taken);
}
