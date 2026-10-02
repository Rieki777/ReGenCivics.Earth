/**
 * The 24-hour signup blast, an admin-scheduled custom reminder, and the
 * manual send button used to share events.reminderSent. Whichever path
 * finished first left the others with nothing to send.
 *
 * reminderSent belongs to the signup blast (and to a manual send of that
 * same list). A custom reminder stays due for as long as reminderScheduledFor
 * is set and has arrived, even when the blast already ran.
 */

export function scheduledReminderStillDue(event: {
  reminderSent?: number | null;
  reminderScheduledFor: Date | string | null;
  now: Date;
}): boolean {
  if (event.reminderScheduledFor == null || event.reminderScheduledFor === "") return false;
  const at = event.reminderScheduledFor instanceof Date
    ? event.reminderScheduledFor.getTime()
    : new Date(event.reminderScheduledFor).getTime();
  if (!Number.isFinite(at)) return false;
  return at <= event.now.getTime();
}

/** Columns to clear after a custom reminder is sent or dropped because the session is over. */
export function scheduledReminderDonePatch(): { reminderScheduledFor: null } {
  return { reminderScheduledFor: null };
}
