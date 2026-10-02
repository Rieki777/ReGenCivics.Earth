/**
 * People who get every session reminder, whatever the session's audience.
 *
 * Server-only. The admin client imports `@shared/eventAutoReminders` and must
 * not import this file. An admin setting for the list is still B-9.
 */
import type { ReminderRecipient } from "@shared/eventAutoReminders";

export const ALWAYS_INCLUDE_REMINDER_RECIPIENTS: readonly ReminderRecipient[] = [
  // Added 2026-09-21 at Rye's request.
  { email: "franz@integrity.earth", name: "Franz" },
];

export function isAlwaysIncluded(email: string): boolean {
  const needle = email.trim().toLowerCase();
  return ALWAYS_INCLUDE_REMINDER_RECIPIENTS.some((r) => r.email === needle);
}
