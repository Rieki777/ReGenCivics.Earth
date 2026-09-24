/**
 * Event-signup reminder sends used by the hourly cron (tomorrow blast +
 * durable scheduled custom reminders). Renders through buildSignupReminderHtml
 * so footers match the auto-reminder sweep: Manage email preferences (signed
 * token) and never the old "You signed up… View all events" only footer.
 *
 * Audience matches main's prior cron behavior: only event_signups with an
 * email. Always-include recipients are NOT emailed here (main's cron paths
 * never called sendToAlwaysIncluded; that remains on the auto-reminder sweep
 * and admin sendReminders).
 *
 * Does not change cron timing windows — only template, join label, and 1:1
 * addressing (required for a per-recipient prefs URL).
 */
import { logger } from "../_core/logger";
import { sendEmail } from "../_core/email";
import type { Event } from "../../drizzle/schema";
import { managePreferencesUrl } from "./emailPrefs";
import {
  buildSignupReminderHtml,
  reminderMuteTopic,
} from "./eventReminderEmail";

const log = logger("signup-reminder-blast");

export type SignupReminderRecipient = {
  email: string | null;
  name?: string | null;
};

/**
 * Send one reminder per signup email. Returns emails attempted.
 * Zero email signups → no sends (including always-include).
 */
export async function sendSignupReminderBlast(
  event: Event,
  opts: {
    subject: string;
    bodyText?: string | null;
    /** Drives the lead line in buildAutoReminderHtml (24h → "Starting in about 24 hours"). */
    offsetMinutes: number;
    signups: SignupReminderRecipient[];
  },
): Promise<number> {
  const mute = reminderMuteTopic(event);
  const emailSignups = opts.signups.filter(
    (s): s is SignupReminderRecipient & { email: string } =>
      typeof s.email === "string" && s.email.trim().length > 0,
  );

  let sent = 0;
  for (const signup of emailSignups) {
    const email = signup.email.trim();
    const preferencesUrl = await managePreferencesUrl(email, { mute });
    const html = buildSignupReminderHtml({
      title: event.title,
      startTime: event.startTime,
      timezone: event.timezone,
      description: event.description,
      bodyText: opts.bodyText,
      eventId: event.id,
      riversideRoomUrl: event.riversideRoomUrl,
      zoomUrl: event.zoomUrl,
      offsetMinutes: opts.offsetMinutes,
      preferencesUrl,
    });
    await sendEmail({
      to: [email],
      subject: opts.subject,
      html,
      template: "event_reminder",
      recipientName: signup.name?.trim() || undefined,
    }).catch((err) => {
      log.error("signup reminder failed", { eventId: event.id, email, err });
    });
    sent += 1;
  }

  return sent;
}
