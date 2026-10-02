/**
 * Seat rules for event signups.
 *
 * A cancelled reminder does not hold a seat. A waitlist row does not hold one
 * either. Re-signing a cancelled row reopens it. Leaving an active reminder
 * seat is what opens a spot for the next waitlist row. The "How was it?"
 * note goes to people who held a seat.
 */

export type SignupKind = "reminder" | "waitlist";

export function isActiveReminderSeat(row: {
  signupType: string;
  cancelledAt: Date | string | null;
}): boolean {
  return row.signupType === "reminder" && row.cancelledAt == null;
}

/** Waitlist once every active reminder seat is taken. No cap means reminder. */
export function signupKindForCapacity(
  activeReminderSeats: number,
  maxAttendees: number | null | undefined,
): SignupKind {
  if (typeof maxAttendees === "number" && maxAttendees > 0 && activeReminderSeats >= maxAttendees) {
    return "waitlist";
  }
  return "reminder";
}

/** A duplicate row that is still active stays. A cancelled row is reopened. */
export function duplicateSignupNext(cancelledAt: Date | string | null | undefined): "already" | "revive" {
  return cancelledAt == null ? "already" : "revive";
}

/** Only an active reminder seat, once cancelled, should pull the next waitlist row. */
export function cancellingOpensASeat(row: {
  signupType: string;
  cancelledAt: Date | string | null;
} | null | undefined): boolean {
  return row != null && isActiveReminderSeat(row);
}

export function receivesSessionFollowup(signupType: string): boolean {
  return signupType === "reminder";
}
