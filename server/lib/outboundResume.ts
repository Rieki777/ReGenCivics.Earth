/**
 * A letter left in `sending` never matches the normal claim sets, so the
 * unsent rows sit there. These helpers decide who still needs a try, and
 * when a stuck row is old enough that a second worker may pick it up.
 */

export const OUTBOUND_RESUME_LEASE_MS = 15 * 60 * 1000;

export type ResumeRecipientAction = "already_sent" | "skip" | "send";

export function resumeRecipientAction(status: string): ResumeRecipientAction {
  if (status === "sent") return "already_sent";
  if (status === "skipped_unsub") return "skip";
  return "send";
}

export function sendingLeaseOpen(updatedAt: Date, now: Date, leaseMs = OUTBOUND_RESUME_LEASE_MS): boolean {
  return now.getTime() - updatedAt.getTime() >= leaseMs;
}
