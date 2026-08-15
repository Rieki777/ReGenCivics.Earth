/**
 * Free Voyage Giveaway: shared constants + the public-entry weight math, used by
 * the server (the draw + the router credit math), the config, and the client
 * (thank-you page preview) so none of them can drift. This is the public
 * sweepstakes layer that wraps the existing weighted draw.
 *
 * Word discipline (campaign brief + STEERING section 1): no public surface ever
 * says "raffle" or "tickets". Public words are "entries" and "the draw". The
 * `tickets` name below is an internal draw-weight term only; it never reaches a
 * page, email, or the rules.
 */

/** The referral credit ceiling: a public entrant earns at most this many entries
 *  from referrals, however many friends they bring. A fraud brake, and the
 *  official rules disclose it. */
export const REFERRAL_CREDIT_CAP = 40;

/** Entry credit each optional action adds. `base` is the free email-only entry;
 *  everything else is optional so the base entry alone is always enough (an
 *  effort-gated base entry would read as consideration under sweepstakes law). */
export const GIVEAWAY_BONUS = {
  base: 1,
  perReferral: 5,
  referralCreditCap: REFERRAL_CREDIT_CAP,
  nomination: 3,
  quest: 2,
  instagram: 1,
  youtube: 1,
} as const;

/** Recruiting-count milestones (raw confirmed referrals, not capped credit). At
 *  5 we mail the ship's colors; at 25 the entrant rises on the leaderboard. */
export const REFERRAL_MILESTONE_STICKERS = 5;
export const REFERRAL_MILESTONE_LEADERBOARD = 25;

/** Promotion window (America/Los_Angeles). Entries open 9:00 am PT July 27 and
 *  close 11:59 pm PT September 6, 2026; the draw is on or about September 8. */
export const GIVEAWAY_ENTRIES_OPEN_YMD = "2026-07-27";
export const GIVEAWAY_ENTRIES_CLOSE_YMD = "2026-09-06";
export const GIVEAWAY_DRAW_YMD = "2026-09-08";
/** Close instant in UTC (Sep 6 23:59 PDT = Sep 7 06:59 UTC), for the countdown. */
export const GIVEAWAY_ENTRIES_CLOSE_ISO = "2026-09-07T06:59:00Z";

/** Approximate Retail Value of the grand prize (one trial-year voyage week). */
export const GIVEAWAY_ARV_USD = 2093;

/** Bonus-entry credits stored on a public entry. `referrals` is kept pre-capped
 *  at REFERRAL_CREDIT_CAP; the rest are 0 or their flat value. */
export type PublicEntryBonus = {
  referrals?: number;
  nomination?: number;
  quest?: number;
  ig?: number;
  yt?: number;
};

/** A fresh, zero-bonus credit record for a new entry. */
export function emptyBonus(): Required<PublicEntryBonus> {
  return { referrals: 0, nomination: 0, quest: 0, ig: 0, yt: 0 };
}

/** Coerce a stored bonus blob into a full, non-negative integer record. */
export function normalizeBonus(raw: unknown): Required<PublicEntryBonus> {
  const b = (raw ?? {}) as PublicEntryBonus;
  const n = (v: unknown) => {
    const x = Math.floor(Number(v));
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  return { referrals: n(b.referrals), nomination: n(b.nomination), quest: n(b.quest), ig: n(b.ig), yt: n(b.yt) };
}

function nonneg(n: unknown): number {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Draw weight of a verified public entry: one base entry plus its optional
 * bonuses, with the referral credit clamped to `referralCap`. Deterministic and
 * pure so the router (credit math), the draw, and the tests all agree. The
 * official rules define this exact math; the draw's threshold cap never lowers a
 * public entry below it.
 */
export function publicEntryTickets(
  bonus: PublicEntryBonus | null | undefined,
  referralCap = REFERRAL_CREDIT_CAP,
): number {
  const b = bonus ?? {};
  const referrals = Math.min(nonneg(b.referrals), Math.max(0, Math.floor(referralCap)));
  return GIVEAWAY_BONUS.base + referrals + nonneg(b.nomination) + nonneg(b.quest) + nonneg(b.ig) + nonneg(b.yt);
}

/**
 * Clamp a threshold or nomination entrant's draw weight to the draw's cap. The
 * cap is an admin/counsel choice recorded on the audit row: for the public
 * sweepstakes draw, effort-earned quest points (which can dwarf a public entry's
 * 1 + bonuses) are held to at most `cap`, so effort cannot buy odds past what
 * counsel approves. A null/undefined cap leaves the weight untouched, which is
 * how the pre-public milestone draws run.
 */
export function cappedThresholdTickets(tickets: number, cap: number | null | undefined): number {
  if (cap == null) return tickets;
  return Math.min(tickets, Math.max(0, Math.floor(cap)));
}
