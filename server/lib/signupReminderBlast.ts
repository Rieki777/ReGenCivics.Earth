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
import { providerAccepted } from "./emailAttempt";
import { emailsAcceptedForInquiry } from "../emailTracking";
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
): Promise<{ accepted: number; dropped: number }> {
  const mute = reminderMuteTopic(event);
  const emailSignups = opts.signups.filter(
    (s): s is SignupReminderRecipient & { email: string } =>
      typeof s.email === "string" && s.email.trim().length > 0,
  );
  let already = new Set<string>();
  try {
    already = await emailsAcceptedForInquiry("event_reminder", "event_fanout", event.id);
  } catch (err) {
    log.error("signup reminder prior-send lookup failed", { eventId: event.id, err });
  }

  let accepted = 0;
  let dropped = 0;
  let stop = false;
  for (const signup of emailSignups) {
    const email = signup.email.trim();
    if (already.has(email.toLowerCase())) continue;
    if (stop) {
      dropped += 1;
      continue;
    }
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
    try {
      const result = await sendEmail({
        to: [email],
        subject: opts.subject,
        html,
        template: "event_reminder",
        inquiryType: "event_fanout",
        inquiryId: event.id,
        recipientName: signup.name?.trim() || undefined,
      });
      if (providerAccepted(result)) accepted += 1;
      else {
        dropped += 1;
        if (result?.status === "rate_limited" || result?.status === "held") stop = true;
      }
    } catch (err) {
      dropped += 1;
      log.error("signup reminder failed", { eventId: event.id, email, err });
    }
  }

  return { accepted, dropped };
}
