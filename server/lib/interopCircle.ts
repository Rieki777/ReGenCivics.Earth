/**
 * Interoperability Circle: carry the live time vote into the events table.
 *
 * The Circle's weekly sessions are ordinary `events` rows, so they share every
 * pipe the other sessions use: /schedule, /events/:id, the calendar feeds
 * (including /calendar/interop-circle.ics), Admin > Events, and the
 * auto-reminder job with its 24h / 1h / 33m sends to the people signed up.
 *
 * What this sync does, idempotently:
 *   1. Works out which slot the Circle runs in: the admin pin if set, otherwise
 *      the vote leader once it has held the lead for INTEROP_LEAD_SETTLE_HOURS.
 *   2. Keeps INTEROP_CIRCLE_WEEKS_AHEAD weeks of rows on the calendar, one per
 *      Pacific week, inserting the missing ones.
 *   3. Moves future rows onto the current slot, except rows inside the
 *      INTEROP_FREEZE_HOURS window, rows an admin edited (manualOverride), and
 *      cancelled rows. Every person signed up for a moved session gets one
 *      "the Circle moved" email. Calendar subscribers get the move through the
 *      feed, since the update bumps updatedAt and so the ICS SEQUENCE.
 *   4. Gives every Circle row an auto-reminder config (custom audience, this
 *      event's sign-ups) unless one exists, so an admin's edits in the Events
 *      tab stick.
 *   5. Carries Circle members forward: a new week's row starts with the active
 *      sign-ups of the latest existing Circle row.
 *
 * "Signed up for the Circle" means an active event_signups row on each week.
 * Leaving through any Circle email's unsubscribe link cancels every future
 * week (see events.unsubscribe), so the carry-forward in step 5 respects it.
 */
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { events, eventSignups, eventAutoReminders, interopTimeVotes } from "../../drizzle/schema";
import { getDb, getSiteSetting, setSiteSetting } from "../db";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { SESSION_TIME_ZONE, zoneName } from "@shared/sessionClock";
import {
  INTEROP_APPLIED_SETTING,
  INTEROP_CIRCLE_DESCRIPTION,
  INTEROP_CIRCLE_MINUTES,
  INTEROP_CIRCLE_SEASON,
  INTEROP_CIRCLE_TITLE,
  INTEROP_CIRCLE_WEEKS_AHEAD,
  INTEROP_FREEZE_HOURS,
  INTEROP_LEADER_SETTING,
  INTEROP_PIN_SETTING,
  INTEROP_REMINDER_OFFSETS,

  circleWeekKey,
  interopSlot,
  slotStartInWeek,
  isInteropSlotKey,
  leadingSlot,
  parseSlots,
  resolveCircleSlot,
  upcomingSlotStarts,
  type InteropSlotKey,
} from "@shared/interopCircle";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * The vote table the interopSessions router and this sync read (drizzle/0246_interop_time_votes.sql).
 *
 * Deploys do not run migrations, and this page went up with the Circle's first
 * invitation, so the code makes sure its own table is there before it reads
 * or writes. CREATE TABLE IF NOT EXISTS is idempotent and runs once per
 * process; when the migration has already been applied by hand, this is a
 * no-op. Remove the guard once 0246 is confirmed applied in production.
 */
let tableReady: Promise<void> | null = null;

export function ensureVotesTable(database: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<void> {
  if (!tableReady) {
    tableReady = database
      .execute(sql`CREATE TABLE IF NOT EXISTS interopTimeVotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slot VARCHAR(24) NOT NULL,
        voterKey VARCHAR(64) NOT NULL,
        displayName VARCHAR(80) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY interop_vote_voter_idx (voterKey),
        KEY interop_vote_slot_idx (slot)
      )`)
      .then(() => undefined)
      .catch((err) => {
        // A failed guard must not take the page down: reset so the next call
        // retries, and let the caller's own error handling answer empty.
        tableReady = null;
        console.error("[interopSessions] ensureTable failed:", err);
      });
  }
  return tableReady;
}


/** Hand counts per slot, from the vote table. */
export async function circleVoteCounts(database: Db): Promise<Record<InteropSlotKey, number>> {
  const counts = { tue: 0, wed: 0, thu: 0 } as Record<InteropSlotKey, number>;
  await ensureVotesTable(database);
  try {
    const rows = await database.select({ slot: interopTimeVotes.slot }).from(interopTimeVotes).limit(5000);
    for (const r of rows) for (const s of parseSlots(r.slot)) counts[s] += 1;
  } catch (err) {
    console.error("[interopCircle] vote read failed:", err);
  }
  return counts;
}

export type CircleState = {
  slot: InteropSlotKey;
  pinned: InteropSlotKey | null;
  leader: InteropSlotKey | null;
  leaderSince: number | null;
  applied: InteropSlotKey | null;
  counts: Record<InteropSlotKey, number>;
};

async function readSlotSetting(key: string): Promise<InteropSlotKey | null> {
  const v = await getSiteSetting(key);
  return isInteropSlotKey(v) ? v : null;
}

/** Read the vote and settings, record a new leader, and say which slot applies now. */
export async function resolveCircleState(database: Db, now: Date): Promise<CircleState> {
  const counts = await circleVoteCounts(database);
  const leader = leadingSlot(counts);
  const pinned = await readSlotSetting(INTEROP_PIN_SETTING);
  const applied = await readSlotSetting(INTEROP_APPLIED_SETTING);

  let leaderSince: number | null = null;
  try {
    const raw = JSON.parse((await getSiteSetting(INTEROP_LEADER_SETTING)) ?? "null");
    if (raw && raw.slot === leader && typeof raw.since === "number") leaderSince = raw.since;
  } catch {
    // Unreadable record: treat the lead as starting now.
  }
  if (leader && leaderSince == null) {
    leaderSince = now.getTime();
    await setSiteSetting(INTEROP_LEADER_SETTING, JSON.stringify({ slot: leader, since: leaderSince }));
  }

  const slot = resolveCircleSlot({ pinned, leader, leaderSince, applied, nowMs: now.getTime() });
  return { slot, pinned, leader, leaderSince, applied, counts };
}

function circleWhen(start: Date): string {
  const date = start.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: SESSION_TIME_ZONE,
  });
  const time = start.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: SESSION_TIME_ZONE,
  });
  return `${date} at ${time} ${zoneName(start, SESSION_TIME_ZONE)}`;
}

function circleEmailShell(heading: string, bodyHtml: string, footerHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background-color:#1a472a;background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
      <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">${INTEROP_CIRCLE_TITLE}</p>
    </div>
    <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
      <h2 style="color:#1a472a;margin:0 0 10px 0;">${heading}</h2>
      ${bodyHtml}
      <a href="${APP_BASE_URL}/interop-sessions" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin-top:8px;">Circle page and time vote</a>
    </div>
    <div style="background:#f0f7f0;padding:16px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
      <p style="color:#888;font-size:12px;margin:0;">${footerHtml}</p>
    </div>
  </div>`;
}

function unsubscribeLink(eventId: number, email: string): string {
  return `${APP_BASE_URL}/schedule?unsubscribe=${eventId}&email=${encodeURIComponent(email)}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Future, non-cancelled Circle rows, soonest first. */
export async function upcomingCircleRows(database: Db, now: Date) {
  return database
    .select()
    .from(events)
    .where(and(eq(events.season, INTEROP_CIRCLE_SEASON), gt(events.startTime, now)))
    .orderBy(asc(events.startTime));
}

async function ensureReminderConfig(database: Db, eventId: number): Promise<void> {
  await database
    .insert(eventAutoReminders)
    .values({
      eventId,
      enabled: 1,
      audienceMode: "custom",
      audienceConfig: { includeEventSignups: true },
      offsetsJson: INTEROP_REMINDER_OFFSETS,
    })
    .onDuplicateKeyUpdate({ set: { eventId: sql`eventId` } });
}

/** Active sign-ups on the latest Circle row that has any sign-up history. */
async function currentMembers(database: Db, excludeIds: number[]) {
  const [latest] = await database
    .select({ eventId: eventSignups.eventId })
    .from(eventSignups)
    .innerJoin(events, eq(events.id, eventSignups.eventId))
    .where(and(
      eq(events.season, INTEROP_CIRCLE_SEASON),
      excludeIds.length ? sql`${events.id} NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})` : sql`1=1`,
    ))
    .orderBy(desc(events.startTime))
    .limit(1);
  if (!latest) return [];
  return database
    .select({ email: eventSignups.email, name: eventSignups.name })
    .from(eventSignups)
    .where(and(
      eq(eventSignups.eventId, latest.eventId),
      eq(eventSignups.signupType, "reminder"),
      isNull(eventSignups.cancelledAt),
    ));
}

/** Add (or re-activate) these people on these Circle rows. */
export async function addCircleSignups(
  database: Db,
  eventIds: number[],
  people: Array<{ email: string; name: string | null }>,
): Promise<void> {
  for (const eventId of eventIds) {
    for (const p of people) {
      await database
        .insert(eventSignups)
        .values({ eventId, email: p.email, name: p.name, signupType: "reminder" })
        .onDuplicateKeyUpdate({ set: { cancelledAt: null, signupType: "reminder" } });
    }
  }
}

export type CircleSyncResult = {
  slot: InteropSlotKey;
  inserted: number;
  moved: number;
  notified: number;
};

let running: Promise<CircleSyncResult | null> | null = null;
let lastRunMs = 0;
const MIN_INTERVAL_MS = 60_000;

/**
 * Run the sync. Callers on hot paths (events.list, the vote) pass nothing and
 * get at most one run a minute per process; admin actions pass force.
 */
export function syncInteropCircle(opts: { force?: boolean; now?: Date } = {}): Promise<CircleSyncResult | null> {
  const now = opts.now ?? new Date();
  if (running) return running;
  if (!opts.force && now.getTime() - lastRunMs < MIN_INTERVAL_MS) return Promise.resolve(null);
  lastRunMs = now.getTime();
  running = runSync(now)
    .catch((err) => {
      console.error("[interopCircle] sync failed:", err);
      return null;
    })
    .finally(() => { running = null; });
  return running;
}

async function runSync(now: Date): Promise<CircleSyncResult | null> {
  const database = await getDb();
  if (!database) return null;

  const state = await resolveCircleState(database, now);
  const slot = interopSlot(state.slot);
  if (state.applied !== state.slot) await setSiteSetting(INTEROP_APPLIED_SETTING, state.slot);

  const existing = await upcomingCircleRows(database, now);
  const byWeek = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    const key = circleWeekKey(new Date(row.startTime));
    if (!byWeek.has(key)) byWeek.set(key, row);
  }

  const freezeUntil = now.getTime() + INTEROP_FREEZE_HOURS * 3_600_000;
  const insertedIds: number[] = [];
  const movedIds: number[] = [];

  // Every week that should hold a Circle: the next INTEROP_CIRCLE_WEEKS_AHEAD,
  // plus any week that already has a future row, so a row past the horizon
  // (left there by a longer horizon or an earlier slot) moves in the same run
  // as the rest instead of triggering a second notice later.
  const horizonWeeks = new Set(
    upcomingSlotStarts(slot, now, INTEROP_CIRCLE_WEEKS_AHEAD).map((d) => circleWeekKey(d)),
  );
  const weeks = [...new Set([...horizonWeeks, ...byWeek.keys()])].sort();

  for (const week of weeks) {
    const start = slotStartInWeek(slot, week);
    const end = new Date(start.getTime() + INTEROP_CIRCLE_MINUTES * 60_000);
    const timezone = zoneName(start, SESSION_TIME_ZONE);
    const row = byWeek.get(week);

    if (!row) {
      // Never add a session at short notice, e.g. when the slot moves to a
      // later day of the current week. Next week's row covers it.
      if (!horizonWeeks.has(week) || start.getTime() <= freezeUntil) continue;
      const result = await database.insert(events).values({
        title: INTEROP_CIRCLE_TITLE,
        description: INTEROP_CIRCLE_DESCRIPTION,
        type: "special",
        startTime: start,
        endTime: end,
        timezone,
        season: INTEROP_CIRCLE_SEASON,
        status: "upcoming",
      });
      const id = Number((result as any)[0]?.insertId ?? (result as any).insertId);
      if (Number.isInteger(id) && id > 0) {
        insertedIds.push(id);
        await ensureReminderConfig(database, id);
      }
      continue;
    }

    await ensureReminderConfig(database, row.id);
    if (row.manualOverride || row.status === "cancelled") continue;
    const rowStart = new Date(row.startTime).getTime();
    if (rowStart === start.getTime()) continue;
    // Frozen: too close to move. Also never move a row into the past or into
    // the freeze window.
    if (rowStart <= freezeUntil || start.getTime() <= freezeUntil) continue;

    await database
      .update(events)
      .set({ startTime: start, endTime: end, timezone })
      .where(eq(events.id, row.id));
    movedIds.push(row.id);
  }

  if (insertedIds.length) {
    const members = await currentMembers(database, insertedIds);
    if (members.length) await addCircleSignups(database, insertedIds, members);
  }

  const notified = movedIds.length ? await notifyMove(database, movedIds, slot.label, now) : 0;
  return { slot: state.slot, inserted: insertedIds.length, moved: movedIds.length, notified };
}

/** One email per person signed up for any moved session, naming the new time. */
async function notifyMove(database: Db, movedIds: number[], slotLabel: string, now: Date): Promise<number> {
  // The full list of what is coming, moved or not, so a session that stayed
  // put inside the freeze window is not a surprise.
  const upcoming = (await upcomingCircleRows(database, now)).filter((r) => r.status !== "cancelled");
  const first = upcoming[0];
  if (!first) return 0;

  const signups = await database
    .select({ email: eventSignups.email, name: eventSignups.name })
    .from(eventSignups)
    .where(and(
      inArray(eventSignups.eventId, movedIds),
      eq(eventSignups.signupType, "reminder"),
      isNull(eventSignups.cancelledAt),
    ));
  const people = new Map<string, string | null>();
  for (const s of signups) if (!people.has(s.email.toLowerCase())) people.set(s.email.toLowerCase(), s.name);

  const whenList = upcoming.map((m) => `<li>${circleWhen(new Date(m.startTime))}</li>`).join("");
  let sent = 0;
  for (const [email, name] of people) {
    const hello = name ? `<p style="color:#444;line-height:1.7;">Hi ${escapeHtml(name)},</p>` : "";
    const html = circleEmailShell(
      `The Circle now meets ${slotLabel}`,
      `${hello}<p style="color:#444;line-height:1.7;">The group's time vote moved, so the Interoperability Circle moves with it. Your upcoming sessions are now:</p>
       <ul style="color:#444;line-height:1.7;">${whenList}</ul>
       <p style="color:#444;line-height:1.7;">If you subscribed to the calendar feed, your calendar updates on its own. Reminders still arrive the day before and an hour before.</p>`,
      `You are signed up for the ${INTEROP_CIRCLE_TITLE}. <a href="${unsubscribeLink(first.id, email)}" style="color:#999;">Leave the Circle</a>`,
    );
    try {
      await sendEmail({ to: [email], subject: `The Interoperability Circle moved to ${slotLabel}`, html, template: "interop_circle_moved" });
      sent += 1;
    } catch (err) {
      console.error("[interopCircle] move notice failed:", err);
    }
  }
  return sent;
}

/** The welcome email for someone who just joined. */
export async function sendCircleWelcome(opts: { email: string; name: string | null; nextId: number; nextStart: Date; slotLabel: string }) {
  const hello = opts.name ? `<p style="color:#444;line-height:1.7;">Hi ${escapeHtml(opts.name)},</p>` : "";
  const html = circleEmailShell(
    "You are in the Circle",
    `${hello}<p style="color:#444;line-height:1.7;">Right now the Circle meets ${opts.slotLabel}. Your first session is ${circleWhen(opts.nextStart)}.</p>
     <p style="color:#444;line-height:1.7;">You will get a reminder the day before and an hour before each week. If the group's vote moves the time, we email you the new one.</p>
     <p style="color:#444;line-height:1.7;">Bring a link to your repo, a sentence or two on what your tool does and who it serves, and the bot or agent you would put to work.</p>
     <p style="color:#444;line-height:1.7;"><a href="${APP_BASE_URL}/calendar/interop-circle.ics" style="color:#1a472a;">Subscribe to the Circle calendar</a> and it keeps itself up to date.</p>`,
    `You signed up for the ${INTEROP_CIRCLE_TITLE}. <a href="${unsubscribeLink(opts.nextId, opts.email)}" style="color:#999;">Leave the Circle</a>`,
  );
  await sendEmail({ to: [opts.email], subject: "You are in the Interoperability Circle", html, template: "interop_circle_welcome" });
}

/** Leave: cancel this person on every future Circle row. */
export async function leaveCircle(database: Db, email: string, now: Date = new Date()): Promise<void> {
  const rows = await upcomingCircleRows(database, now);
  if (!rows.length) return;
  await database
    .update(eventSignups)
    .set({ cancelledAt: now })
    .where(and(
      inArray(eventSignups.eventId, rows.map((r) => r.id)),
      eq(eventSignups.email, email),
    ));
}

