/**
 * Auto-scheduled event reminders. Deterministic, zero LLM.
 *
 * Picked up by the existing hourly POST /api/cron/event-reminders job (and a
 * 5-minute in-process sweep so the 33-minute and 1-hour offsets do not wait
 * for the next hour). When several offsets are already due, only the closest
 * one is sent. Past events (now >= endTime, or >= startTime when
 * endTime is missing) are skipped even if DB status still says upcoming/live.
 * Idempotent via unique (eventId, offsetMinutes) on event_auto_reminder_sends:
 * the insert is the claim, a duplicate key means another run already owns it.
 */
import { and, eq, inArray, isNull, lt, ne } from "drizzle-orm";
import { getDb } from "../db";
import { asMutationResult } from "../db/_shared";
import {
  applications,
  eventAutoReminders,
  eventAutoReminderDeliveries,
  eventAutoReminderSends,
  eventSignups,
  events,
  investorInquiries,
  letterOfIntent,
  users,
  type Event,
} from "../../drizzle/schema";
import { sendEmail } from "../_core/email";
import { providerAccepted } from "../lib/emailAttempt";
import { emailsAcceptedForInquiry } from "../emailTracking";
import {
  REMINDER_CLAIM_LEASE_MS,
  reminderClaimAction,
  settleReminderRecipients,
} from "../lib/reminderClaim";
import { logger } from "../_core/logger";
import { buildAutoReminderHtml, reminderJoinUrl, reminderUnsubscribeUrl } from "../lib/eventReminderEmail";
import { audienceForTopic, buildPrefsToken, emailsBlockingTopic, managePreferencesUrl } from "../lib/emailPrefs";
import type { EmailTopicKey } from "@shared/emailPrefs";
import {
  ALWAYS_INCLUDE_REMINDER_RECIPIENTS,
  audienceIncludesEventSignups,
  canEnableAutoReminders,
  defaultAudienceMode,
  isAlwaysIncluded,
  dueOffsets,
  isDuplicateKeyError,
  isOpenForUpcomingReminders,
  mergeRecipients,
  offsetSubjectFromRemaining,
  parseAudienceConfig,
  parseOffsetMinutes,
  type AutoReminderAudienceMode,
  type CustomAudienceConfig,
  type ReminderRecipient,
} from "@shared/eventAutoReminders";

const log = logger("event-auto-reminders");

export function communityTopicForAudience(mode: AutoReminderAudienceMode): EmailTopicKey {
  if (mode === "season2_approved") return "season2";
  if (mode === "open_access") return "open_access";
  return "events";
}

export type AutoReminderJobReport = {
  ok: boolean;
  scanned: number;
  due: number;
  sent: number;
  skipped: number;
  errors: string[];
};

/**
 * ALWAYS_INCLUDE_REMINDER_RECIPIENTS, minus anyone who has since muted this
 * topic or paused community mail. Most people on the list have no subscriber
 * row, so this usually removes nobody, but if one of them later subscribes and
 * mutes, that choice has to win over the list.
 */
export async function alwaysIncludedRecipients(topic: EmailTopicKey): Promise<ReminderRecipient[]> {
  if (ALWAYS_INCLUDE_REMINDER_RECIPIENTS.length === 0) return [];
  const blocked = await emailsBlockingTopic(topic);
  return ALWAYS_INCLUDE_REMINDER_RECIPIENTS.filter((r) => !blocked.has(r.email.toLowerCase()));
}

/**
 * Send one reminder to each always-include recipient for a session reached by
 * a send path that predates auto-reminders: the daily signup blast for events
 * without auto-reminders, admin-scheduled custom reminders, and the manual
 * "send reminders" button. Those paths read only event_signups, so without this
 * a person on the list would miss any session that goes through them.
 *
 * Sent one message per recipient, through the tested auto-reminder template.
 * The older paths put up to 50 signups into a single `to:` field, where every
 * recipient sees every other address, and nobody added here should see, or be
 * seen by, those people. `exclude` skips anyone the caller already emailed.
 */
export async function sendToAlwaysIncluded(
  event: Event,
  opts: {
    subject: string;
    bodyText?: string | null;
    /** Picks the lead line. An offset that is not a standard one reads "Upcoming session". */
    offsetMinutes: number;
    exclude?: Iterable<string>;
  },
): Promise<{ accepted: number; dropped: number }> {
  const topic = communityTopicForAudience(defaultAudienceMode(event));
  const skip = new Set([...(opts.exclude ?? [])].map((e) => e.trim().toLowerCase()));
  let already = new Set<string>();
  try {
    already = await emailsAcceptedForInquiry("event_reminder", "event_fanout", event.id);
  } catch (err) {
    log.error("always-include prior-send lookup failed", { eventId: event.id, err });
  }
  const recipients = (await alwaysIncludedRecipients(topic)).filter((r) => !skip.has(r.email) && !already.has(r.email.trim().toLowerCase()));
  if (recipients.length === 0) return { accepted: 0, dropped: 0 };

  const joinUrl = reminderJoinUrl({
    eventId: event.id,
    riversideRoomUrl: event.riversideRoomUrl,
    zoomUrl: event.zoomUrl,
  });
  let accepted = 0;
  let dropped = 0;
  let stop = false;
  for (const recipient of recipients) {
    if (stop) {
      dropped += 1;
      continue;
    }
    const html = buildAutoReminderHtml({
      title: event.title,
      startTime: event.startTime,
      timezone: event.timezone,
      description: event.description,
      bodyText: opts.bodyText,
      eventId: event.id,
      joinUrl,
      offsetMinutes: opts.offsetMinutes,
      alwaysIncluded: true,
    });
    try {
      const result = await sendEmail({
        to: [recipient.email],
        subject: opts.subject,
        html,
        template: "event_reminder",
        inquiryType: "event_fanout",
        inquiryId: event.id,
        recipientName: recipient.name,
      });
      if (providerAccepted(result)) accepted += 1;
      else {
        dropped += 1;
        if (result?.status === "rate_limited" || result?.status === "held") stop = true;
      }
    } catch (err) {
      dropped += 1;
      log.error("always-include reminder failed", { eventId: event.id, email: recipient.email, err });
    }
  }
  return { accepted, dropped };
}

export async function listEnabledAutoReminderEventIds(): Promise<Set<number>> {
  const database = await getDb();
  if (!database) return new Set();
  const rows = await database
    .select({ eventId: eventAutoReminders.eventId })
    .from(eventAutoReminders)
    .where(eq(eventAutoReminders.enabled, 1));
  return new Set(rows.map((r) => r.eventId));
}

export async function resolveAutoReminderRecipients(opts: {
  eventId: number;
  audienceMode: AutoReminderAudienceMode;
  audienceConfig?: CustomAudienceConfig | null;
}): Promise<ReminderRecipient[]> {
  const database = await getDb();
  if (!database) return [];

  const groups: Array<Array<{ email?: string | null; name?: string | null }>> = [];

  const loadSeason2Approved = async () => {
    const rows = await database
      .select({
        email: users.email,
        name: users.name,
      })
      .from(applications)
      .leftJoin(users, eq(users.id, applications.userId))
      .where(inArray(applications.status, ["approved", "active"]));
    groups.push(rows);
  };

  const loadOpenAccess = async () => {
    groups.push(await audienceForTopic("open_access"));
  };

  const loadEventSignups = async (eventId: number) => {
    return database
      .select({
        email: eventSignups.email,
        name: eventSignups.name,
      })
      .from(eventSignups)
      .where(and(
        eq(eventSignups.eventId, eventId),
        eq(eventSignups.signupType, "reminder"),
        isNull(eventSignups.cancelledAt),
      ));
  };

  if (opts.audienceMode === "season2_approved") {
    await loadSeason2Approved();
  } else if (opts.audienceMode === "open_access") {
    await loadOpenAccess();
  } else {
    const config = opts.audienceConfig ?? {};
    if (!canEnableAutoReminders("custom", config)) return [];
    if (config.newsletterSources && config.newsletterSources.length > 0) {
      groups.push(await audienceForTopic("events", { sources: config.newsletterSources }));
    }
    if (config.includeInvestors) {
      const investors = await database
        .select({
          email: investorInquiries.email,
          name: investorInquiries.fullName,
        })
        .from(investorInquiries)
        .where(and(
          ne(investorInquiries.status, "archived"),
          ne(investorInquiries.status, "declined"),
        ));
      groups.push(investors);
    }
    if (config.includeLoi) {
      const lois = await database
        .select({
          email: letterOfIntent.email,
          name: letterOfIntent.fullName,
        })
        .from(letterOfIntent)
        .where(ne(letterOfIntent.status, "withdrawn"));
      groups.push(lois);
    }
    if (config.applicationStatuses && config.applicationStatuses.length > 0) {
      const apps = await database
        .select({
          email: users.email,
          name: users.name,
        })
        .from(applications)
        .leftJoin(users, eq(users.id, applications.userId))
        .where(inArray(applications.status, config.applicationStatuses));
      groups.push(apps);
    }
  }

  if (audienceIncludesEventSignups(opts.audienceMode)) {
    groups.push(await loadEventSignups(opts.eventId));
  }

  // Last, so a person who is also in the real audience keeps that entry.
  groups.push(await alwaysIncludedRecipients(communityTopicForAudience(opts.audienceMode)));

  const merged = mergeRecipients(groups);
  if (opts.audienceMode === "season2_approved") {
    const blocked = await emailsBlockingTopic("season2");
    return merged.filter((row) => !blocked.has(row.email.toLowerCase()));
  }
  return merged;
}

async function acquireOffset(eventId: number, offsetMinutes: number, now: Date): Promise<"owned" | "skip"> {
  const database = await getDb();
  if (!database) return "skip";
  try {
    await database.insert(eventAutoReminderSends).values({
      eventId,
      offsetMinutes,
      recipientCount: 0,
      status: "partial",
      sentAt: now,
    });
    return "owned";
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
  const [row] = await database
    .select({
      status: eventAutoReminderSends.status,
      sentAt: eventAutoReminderSends.sentAt,
    })
    .from(eventAutoReminderSends)
    .where(and(
      eq(eventAutoReminderSends.eventId, eventId),
      eq(eventAutoReminderSends.offsetMinutes, offsetMinutes),
    ))
    .limit(1);
  if (!row) return "skip";
  const action = reminderClaimAction(
    { status: row.status === "partial" ? "partial" : "complete", sentAt: new Date(row.sentAt) },
    now,
  );
  if (action !== "takeover_stale") return "skip";
  const cutoff = new Date(now.getTime() - REMINDER_CLAIM_LEASE_MS);
  const updated = await database
    .update(eventAutoReminderSends)
    .set({ sentAt: now, status: "partial" })
    .where(and(
      eq(eventAutoReminderSends.eventId, eventId),
      eq(eventAutoReminderSends.offsetMinutes, offsetMinutes),
      eq(eventAutoReminderSends.status, "partial"),
      lt(eventAutoReminderSends.sentAt, cutoff),
    ));
  return asMutationResult(updated).affectedRows > 0 ? "owned" : "skip";
}

async function markOffset(
  eventId: number,
  offsetMinutes: number,
  recipientCount: number,
  status: "complete" | "partial",
) {
  const database = await getDb();
  if (!database) return;
  await database
    .update(eventAutoReminderSends)
    .set({ recipientCount, status })
    .where(and(
      eq(eventAutoReminderSends.eventId, eventId),
      eq(eventAutoReminderSends.offsetMinutes, offsetMinutes),
    ));
}

async function deliveredAddresses(eventId: number, offsetMinutes: number): Promise<Set<string>> {
  const database = await getDb();
  if (!database) return new Set();
  const rows = await database
    .select({ email: eventAutoReminderDeliveries.email })
    .from(eventAutoReminderDeliveries)
    .where(and(
      eq(eventAutoReminderDeliveries.eventId, eventId),
      eq(eventAutoReminderDeliveries.offsetMinutes, offsetMinutes),
    ));
  return new Set(rows.map((row) => row.email.trim().toLowerCase()));
}

async function rememberDeliveries(eventId: number, offsetMinutes: number, emails: string[]) {
  const database = await getDb();
  if (!database) return;
  for (const email of emails) {
    try {
      await database.insert(eventAutoReminderDeliveries).values({ eventId, offsetMinutes, email });
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }
}

async function sendOffset(
  event: Event,
  offsetMinutes: number,
  recipients: ReminderRecipient[],
  customSubject: string | null,
  customBody: string | null,
  audienceMode: AutoReminderAudienceMode,
  alreadyDelivered: Iterable<string>,
  now: Date,
) {
  const joinUrl = reminderJoinUrl({
    eventId: event.id,
    riversideRoomUrl: event.riversideRoomUrl,
    zoomUrl: event.zoomUrl,
  });
  const subject = customSubject?.trim() || offsetSubjectFromRemaining(event.title, event.startTime, now);
  const mute = communityTopicForAudience(audienceMode);

  return settleReminderRecipients({
    recipients,
    alreadyDelivered,
    send: async (recipient) => {
      const alwaysIncluded = isAlwaysIncluded(recipient.email);
      const prefsUrl = await managePreferencesUrl(recipient.email, { mute });
      const eventStopUrl = alwaysIncluded
        ? undefined
        : reminderUnsubscribeUrl(
            recipient.email,
            event.id,
            "event_signup",
            await buildPrefsToken(recipient.email),
          );
      const html = buildAutoReminderHtml({
        title: event.title,
        startTime: event.startTime,
        timezone: event.timezone,
        description: event.description,
        bodyText: customBody,
        eventId: event.id,
        joinUrl,
        offsetMinutes,
        now,
        preferencesUrl: prefsUrl,
        eventStopUrl,
        alwaysIncluded,
      });
      return sendEmail({
        to: [recipient.email],
        subject,
        html,
        template: "event_reminder",
        inquiryType: `auto_offset:${offsetMinutes}`.slice(0, 50),
        inquiryId: event.id,
        recipientName: recipient.name,
      });
    },
  });
}

export async function runAutoEventReminders(now = new Date()): Promise<AutoReminderJobReport> {
  const report: AutoReminderJobReport = {
    ok: true,
    scanned: 0,
    due: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };
  const database = await getDb();
  if (!database) return { ...report, ok: false, errors: ["database unavailable"] };

  const configs = await database
    .select()
    .from(eventAutoReminders)
    .where(eq(eventAutoReminders.enabled, 1));
  report.scanned = configs.length;
  if (!configs.length) return report;

  const eventIds = configs.map((c) => c.eventId);
  const eventRows = await database
    .select()
    .from(events)
    .where(inArray(events.id, eventIds));
  const eventById = new Map(eventRows.map((e) => [e.id, e]));

  const sentRows = await database
    .select({
      eventId: eventAutoReminderSends.eventId,
      offsetMinutes: eventAutoReminderSends.offsetMinutes,
      status: eventAutoReminderSends.status,
    })
    .from(eventAutoReminderSends)
    .where(inArray(eventAutoReminderSends.eventId, eventIds));
  const sentByEvent = new Map<number, Set<number>>();
  for (const row of sentRows) {
    // A partial row is still due. Only a finished offset leaves the queue.
    if (row.status === "partial") continue;
    const set = sentByEvent.get(row.eventId) ?? new Set<number>();
    set.add(row.offsetMinutes);
    sentByEvent.set(row.eventId, set);
  }

  for (const config of configs) {
    const event = eventById.get(config.eventId);
    if (!event) {
      report.skipped += 1;
      continue;
    }
    if (event.status === "cancelled" || event.status === "completed") {
      report.skipped += 1;
      continue;
    }
    // Defense when status sweep lags or endTime was never set: do not OA/S2
    // reminder-send past sessions.
    if (!isOpenForUpcomingReminders({
      startTime: event.startTime,
      endTime: event.endTime,
      now,
    })) {
      report.skipped += 1;
      continue;
    }

    const offsets = parseOffsetMinutes(config.offsetsJson);
    const due = dueOffsets({
      startTime: event.startTime,
      endTime: event.endTime,
      now,
      offsetsMinutes: offsets,
      alreadySent: sentByEvent.get(event.id) ?? [],
    });
    if (!due.length) continue;

    const audienceConfig = parseAudienceConfig(config.audienceConfig);
    if (!canEnableAutoReminders(config.audienceMode, audienceConfig)) {
      report.skipped += 1;
      continue;
    }

    let recipients: ReminderRecipient[] = [];
    try {
      recipients = await resolveAutoReminderRecipients({
        eventId: event.id,
        audienceMode: config.audienceMode,
        audienceConfig,
      });
    } catch (err: any) {
      report.ok = false;
      report.errors.push(`event ${event.id}: ${err?.message ?? err}`);
      continue;
    }

    for (const offsetMinutes of due) {
      report.due += 1;
      let owned: "owned" | "skip" = "skip";
      try {
        owned = await acquireOffset(event.id, offsetMinutes, now);
      } catch (err: any) {
        report.ok = false;
        report.errors.push(`claim ${event.id}/${offsetMinutes}: ${err?.message ?? err}`);
        continue;
      }
      if (owned !== "owned") {
        report.skipped += 1;
        continue;
      }
      try {
        const already = await deliveredAddresses(event.id, offsetMinutes);
        const outcome = await sendOffset(
          event,
          offsetMinutes,
          recipients,
          config.customSubject,
          config.customBody,
          config.audienceMode,
          already,
          now,
        );
        await rememberDeliveries(event.id, offsetMinutes, outcome.delivered);
        const deliveredCount = already.size + outcome.delivered.length;
        if (outcome.complete) {
          await markOffset(event.id, offsetMinutes, deliveredCount, "complete");
          if (offsetMinutes === 24 * 60) {
            await database.update(events).set({ reminderSent: 1 }).where(eq(events.id, event.id));
          }
        } else {
          await markOffset(event.id, offsetMinutes, deliveredCount, "partial");
        }
        report.sent += outcome.delivered.length;
      } catch (err: any) {
        report.ok = false;
        report.errors.push(`send ${event.id}/${offsetMinutes}: ${err?.message ?? err}`);
      }
    }
  }

  return report;
}
