/**
 * Accounts seeded for launch social proof, so the calendar and the draw board are
 * not empty for the first real crew (scripts/seed-ship-social-proof.ts and
 * scripts/seed-ship-example-crews.ts).
 *
 * They are marked by an openId prefix. The free-voyage draw that excluded them was
 * retired on 15 Nov 2026; example crews still appear on the quest board and as
 * crew cards, which is the whole point of seeding them.
 *
 * This lives in shared/ (with no env or db imports) so the seed scripts and the
 * server can agree on one prefix and can never drift apart.
 */

/** Every seeded demo account's openId starts with this. */
export const DEMO_ACCOUNT_OPENID_PREFIX = "demo-ship-";

/** Example crews that show on the draw board and the crew cards. */
export const DEMO_CREW_OPENID_PREFIX = `${DEMO_ACCOUNT_OPENID_PREFIX}crew:`;

/** Demo accounts that own the seeded social-proof bookings (no quest points). */
export const DEMO_BOOKING_OPENID_PREFIX = `${DEMO_ACCOUNT_OPENID_PREFIX}seed:`;

/** True when an account was seeded for social proof, so it cannot win a draw. */
export function isDemoOpenId(openId: string | null | undefined): boolean {
  return typeof openId === "string" && openId.startsWith(DEMO_ACCOUNT_OPENID_PREFIX);
}
