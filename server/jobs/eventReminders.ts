/**
 * Auto-scheduled event reminders. Deterministic, zero LLM.
 *
 * Picked up by the existing hourly POST /api/cron/event-reminders job (and a
 * 10-minute in-process sweep so the 1h offset does not wait for the next hour).
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
  newsletterSubscribers,
  users,
  type Event,
} from "../../drizzle/schema";
import { sendEmail } from "../_core/email";
import { logger } from "../_core/logger";
import { buildAutoReminderHtml, reminderUnsubscribeUrl } from "../lib/eventReminderEmail";
import {
  canEnableAutoReminders,
  dueOffsets,
  isDuplicateKeyError,
  mergeRecipients,
  offsetSubject,
  parseAudienceConfig,
  parseOffsetMinutes,
  type AutoReminderAudienceMode,
  type CustomAudienceConfig,
  type ReminderRecipient,
} from "@shared/eventAutoReminders";

const log = logger("event-auto-reminders");

export type AutoReminderJobReport = {
  ok: boolean;
  scanned: number;
  due: number;
  sent: number;
  skipped: number;
  errors: string[];
};

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
    const subs = await database
      .select({
        email: newsletterSubscribers.email,
        name: newsletterSubscribers.name,
      })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.isActive, 1));
    groups.push(subs);
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
      const subs = await database
        .select({
          email: newsletterSubscribers.email,
          name: newsletterSubscribers.name,
        })
        .from(newsletterSubscribers)
        .where(and(
          eq(newsletterSubscribers.isActive, 1),
          inArray(newsletterSubscribers.source, config.newsletterSources),
        ));
      groups.push(subs);
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

  return mergeRecipients(groups);
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

async function sendOffset(event: Event, offsetMinutes: number, recipients: ReminderRecipient[], customSubject: string | null, customBody: string | null) {
  const joinUrl = event.riversideRoomUrl ?? event.zoomUrl ?? "";
  const subject = customSubject?.trim() || offsetSubject(event.title, offsetMinutes);

  let sent = 0;
  for (const recipient of recipients) {
    const html = buildAutoReminderHtml({
      title: event.title,
      startTime: event.startTime,
      timezone: event.timezone,
      description: event.description,
      bodyText: customBody,
      joinUrl,
      offsetMinutes,
      unsubscribeUrl: reminderUnsubscribeUrl(recipient.email, event.id, "list"),
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

    const offsets = parseOffsetMinutes(config.offsetsJson);
    const due = dueOffsets({
      startTime: event.startTime,
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
