/**
 * Auto-reminder offset claims.
 * A row is finished only when every address in the audience received a Resend id.
 * A partial row is a lock, not a completed send, so a dropped tail is still due.
 */

export const REMINDER_CLAIM_LEASE_MS = 4 * 60 * 1000;

export type ReminderClaimAction = "insert_partial" | "skip_complete" | "skip_inflight" | "takeover_stale";

export function reminderClaimAction(
  existing: { status: "complete" | "partial"; sentAt: Date } | null,
  now: Date,
  leaseMs = REMINDER_CLAIM_LEASE_MS,
): ReminderClaimAction {
  if (!existing) return "insert_partial";
  if (existing.status !== "partial") return "skip_complete";
  if (now.getTime() - new Date(existing.sentAt).getTime() < leaseMs) return "skip_inflight";
  return "takeover_stale";
}

export type ReminderSendResult = { id?: string | null; status?: string };

/**
 * Send to addresses that do not already have an accepted id.
 * A hold or rate limit stops the rest of the list so they stay due.
 */
export async function settleReminderRecipients<T extends { email: string }>(opts: {
  recipients: T[];
  alreadyDelivered: Iterable<string>;
  send: (recipient: T) => Promise<ReminderSendResult | null | undefined>;
}): Promise<{ delivered: string[]; dropped: string[]; complete: boolean }> {
  const delivered = new Set(
    [...opts.alreadyDelivered].map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
  const newly: string[] = [];
  const dropped: string[] = [];
  let stop = false;
  for (const recipient of opts.recipients) {
    const key = recipient.email.trim().toLowerCase();
    if (!key || delivered.has(key)) continue;
    if (stop) {
      dropped.push(key);
      continue;
    }
    let result: ReminderSendResult | null | undefined;
    try {
      result = await opts.send(recipient);
    } catch {
      result = null;
    }
    if (typeof result?.id === "string" && result.id.length > 0) {
      delivered.add(key);
      newly.push(key);
    } else {
      dropped.push(key);
      if (result?.status === "rate_limited" || result?.status === "held") stop = true;
    }
  }
  const wanted = opts.recipients.map((r) => r.email.trim().toLowerCase()).filter(Boolean);
  const complete = wanted.every((email) => delivered.has(email));
  return { delivered: newly, dropped, complete };
}
