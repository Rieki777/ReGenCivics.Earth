/**
 * Multi-week booking discount (Rye 2026-07-19). One shared source of truth for
 * the booking page display and any extend path, so the number never drifts.
 *
 * The discount is applied to the ENTIRE booking subtotal based on total weeks:
 *   1 week  -> 0%
 *   2 weeks -> 5%
 *   3 weeks -> 10%
 *   4 weeks -> 15% (a month, the cap)
 *
 * It stacks ON TOP of the first-year 50% off: each week's subtotal is already
 * the trial (half) rate, and this percentage comes off that whole subtotal. So
 * extending a booking by a week recomputes the discount deeper and applies it to
 * the entire stay, including the weeks already chosen.
 *
 * Bookings cap at four weeks (MAX_VOYAGE_WEEKS), so 15% is the maximum; there is
 * no multi-month case to recompute.
 */

/** Discount percentage for a booking of `weeks` total weeks. */
export function multiWeekDiscountPct(weeks: number): number {
  if (weeks >= 4) return 15;
  if (weeks === 3) return 10;
  if (weeks === 2) return 5;
  return 0;
}

export type MultiWeekPricing = {
  weeks: number;
  /** Subtotal before the multi-week discount (already the first-year rate). */
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  /** Subtotal after the multi-week discount. */
  total: number;
  /** Effective price per week after the multi-week discount. */
  perWeek: number;
};

/** Apply the multi-week discount to a subtotal that is already the trial rate. */
export function applyMultiWeekDiscount(subtotal: number, weeks: number): MultiWeekPricing {
  const discountPct = multiWeekDiscountPct(weeks);
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discountAmount;
  return {
    weeks,
    subtotal,
    discountPct,
    discountAmount,
    total,
    perWeek: weeks > 0 ? Math.round(total / weeks) : total,
  };
}

/** The next tier up, for an "add a week, save X%" nudge. Null once at the cap. */
export function nextTierNudge(weeks: number): { atWeeks: number; pct: number } | null {
  if (weeks >= 4) return null;
  const atWeeks = Math.max(2, weeks + 1);
  return { atWeeks, pct: multiWeekDiscountPct(atWeeks) };
}
