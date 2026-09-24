/**
 * Auto-scheduled event reminders. Deterministic, zero LLM.
 *
 * Picked up by the existing hourly POST /api/cron/event-reminders job (and a
 * 5-minute in-process sweep so the 33-minute and 1-hour offsets do not wait
 * for the next hour). Catch-up still sends an offset that is already due,
 * until the session starts. Past events (now >= endTime, or >= startTime when
 * endTime is missing) are skipped even if DB status still says upcoming/live.
 * Idempotent via unique (eventId, offsetMinutes) on event_auto_reminder_sends:
 * the insert is the claim, a duplicate key means another run already owns it.
 */
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "../db";
import {
  applications,
  eventAutoReminders,
  eventAutoReminderSends,
  eventSignups,
  events,
  investorInquiries,
  letterOfIntent,
  users,
  type Event,
} from "../../drizzle/schema";
import { sendEmail } from "../_core/email";
import { logger } from "../_core/logger";
import { buildAutoReminderHtml, reminderJoinUrl } from "../lib/eventReminderEmail";
import { audienceForTopic, emailsBlockingTopic, managePreferencesUrl } from "../lib/emailPrefs";
import type { EmailTopicKey } from "@shared/emailPrefs";
import {
  ALWAYS_INCLUDE_REMINDER_RECIPIENTS,
  canEnableAutoReminders,
  defaultAudienceMode,
  isAlwaysIncluded,
  dueOffsets,
  isDuplicateKeyError,
  isOpenForUpcomingReminders,
  mergeRecipients,
  offsetSubject,
  parseAudienceConfig,
  parseOffsetMinutes,
  type AutoReminderAudienceMode,
  type CustomAudienceConfig,
  type ReminderRecipient,
} from "@shared/eventAutoReminders";

const log = logger("event-auto-reminders");

function communityTopicForAudience(mode: AutoReminderAudienceMode): EmailTopicKey {
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
): Promise<number> {
  const topic = communityTopicForAudience(defaultAudienceMode(event));
  const skip = new Set([...(opts.exclude ?? [])].map((e) => e.trim().toLowerCase()));
  const recipients = (await alwaysIncludedRecipients(topic)).filter((r) => !skip.has(r.email));
  if (recipients.length === 0) return 0;

  const joinUrl = reminderJoinUrl({
    eventId: event.id,
    riversideRoomUrl: event.riversideRoomUrl,
    zoomUrl: event.zoomUrl,
  });
  let sent = 0;
  for (const recipient of recipients) {
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
    await sendEmail({
      to: [recipient.email],
      subject: opts.subject,
      html,
      template: "event_reminder",
      recipientName: recipient.name,
    }).catch((err) => {
      log.error("always-include reminder failed", { eventId: event.id, email: recipient.email, err });
    });
    sent += 1;
  }
  return sent;
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
    groups.push(await loadEventSignups(opts.eventId));
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
    if (config.includeEventSignups) {
      groups.push(await loadEventSignups(opts.eventId));
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

  // Last, so a person who is also in the real audience keeps that entry.
  groups.push(await alwaysIncludedRecipients(communityTopicForAudience(opts.audienceMode)));

  const merged = mergeRecipients(groups);
  if (opts.audienceMode === "season2_approved") {
    const blocked = await emailsBlockingTopic("season2");
    return merged.filter((row) => !blocked.has(row.email.toLowerCase()));
  }
  return merged;
}

async function claimSend(eventId: number, offsetMinutes: number): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;
  try {
    await database.insert(eventAutoReminderSends).values({
      eventId,
      offsetMinutes,
      recipientCount: 0,
    });
    return true;
  } catch (err) {
    if (isDuplicateKeyError(err)) return false;
    throw err;
  }
}

async function recordRecipientCount(eventId: number, offsetMinutes: number, recipientCount: number) {
  const database = await getDb();
  if (!database) return;
  await database
    .update(eventAutoReminderSends)
    .set({ recipientCount })
    .where(and(
      eq(eventAutoReminderSends.eventId, eventId),
      eq(eventAutoReminderSends.offsetMinutes, offsetMinutes),
    ));
}

async function sendOffset(
  event: Event,
  offsetMinutes: number,
  recipients: ReminderRecipient[],
  customSubject: string | null,
  customBody: string | null,
  audienceMode: AutoReminderAudienceMode,
) {
  const joinUrl = reminderJoinUrl({
    eventId: event.id,
    riversideRoomUrl: event.riversideRoomUrl,
    zoomUrl: event.zoomUrl,
  });
  const subject = customSubject?.trim() || offsetSubject(event.title, offsetMinutes);
  const mute = communityTopicForAudience(audienceMode);

  let sent = 0;
  for (const recipient of recipients) {
    const prefsUrl = await managePreferencesUrl(recipient.email, { mute });
    const html = buildAutoReminderHtml({
      title: event.title,
      startTime: event.startTime,
      timezone: event.timezone,
      description: event.description,
      bodyText: customBody,
      eventId: event.id,
      joinUrl,
      offsetMinutes,
      preferencesUrl: prefsUrl,
      alwaysIncluded: isAlwaysIncluded(recipient.email),
    });
    await sendEmail({
      to: [recipient.email],
      subject,
      html,
      template: "event_reminder",
      recipientName: recipient.name,
    }).catch((err) => {
      log.error("auto-reminder email failed", { eventId: event.id, email: recipient.email, err });
    });
    sent += 1;
  }
  return sent;
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
    })
    .from(eventAutoReminderSends)
    .where(inArray(eventAutoReminderSends.eventId, eventIds));
  const sentByEvent = new Map<number, Set<number>>();
  for (const row of sentRows) {
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
      let claimed = false;
      try {
        claimed = await claimSend(event.id, offsetMinutes);
      } catch (err: any) {
        report.ok = false;
        report.errors.push(`claim ${event.id}/${offsetMinutes}: ${err?.message ?? err}`);
        continue;
      }
      if (!claimed) {
        report.skipped += 1;
        continue;
      }
      try {
        const sent = await sendOffset(
          event,
          offsetMinutes,
          recipients,
          config.customSubject,
          config.customBody,
          config.audienceMode,
        );
        await recordRecipientCount(event.id, offsetMinutes, sent);
        if (offsetMinutes === 24 * 60) {
          await database.update(events).set({ reminderSent: 1 }).where(eq(events.id, event.id));
        }
        report.sent += sent;
      } catch (err: any) {
        report.ok = false;
        report.errors.push(`send ${event.id}/${offsetMinutes}: ${err?.message ?? err}`);
      }
    }
  }

  return report;
}
