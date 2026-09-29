/**
 * Season Schedule: carry each Season's time vote into its episode rows.
 *
 * A Season's weekly sessions are ordinary `events` rows (type "episode",
 * season "Season 2"), so a move reaches /schedule, /events/:id, the calendar
 * feeds and the reminder job with no Season-specific copies. Which time
 * applies is decided in shared/seasonSchedule.ts; this file reads the vote and
 * the settings, applies those rules, and writes the moves.
 *
 * What the sync does, idempotently, for every Season still running (ADR-65):
 *   1. Works out the Season's time: the admin pin; else, once the vote is
 *      steering, the leader after it has held the lead for a day; else the
 *      time last applied; else the opening time.
 *   2. Records that time as applied, and records when the current leader took
 *      the lead, so the settle rule has a clock to read.
 *   3. Moves upcoming episode rows onto it (planSeasonMoves: never inside the
 *      72-hour freeze, never a row an admin edited, cancelled, live or done).
 *   4. Before each move, marks the reminder offsets already due at the new time
 *      as handled, so the reminder job does not send "In 7 days" to a session
 *      five days out. Later reminders go out on time, carrying the new time.
 *   5. Emails everyone the sessions' reminders go to, once, with the new time
 *      and the sessions ahead, the way the Circle tells its members.
 *
 * Calendar subscribers get the move through the feed, since the update bumps
 * updatedAt and so the ICS SEQUENCE.
 *
 * syncCatalogEvents keeps the Season 2 titles and descriptions in line with the
 * curriculum and leaves the times to this file.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  eventAutoReminderSends,
  eventAutoReminders,
  events,
  seasonFeedback,
  seasonScheduleVotes,
} from "../../drizzle/schema";
import { getDb, getSiteSetting, setSiteSetting } from "../db";
import { APP_BASE_URL, sendEmail } from "../_core/email";
import { communityTopicForAudience, resolveAutoReminderRecipients } from "../jobs/eventReminders";
import { managePreferencesUrl } from "./emailPrefs";
import { SESSION_TIME_ZONE, zoneName } from "@shared/sessionClock";
import {
  ALWAYS_INCLUDED_FOOTER_TEXT,
  ALWAYS_INCLUDED_STOP_PATH,
  isAlwaysIncluded,
  parseOffsetMinutes,
} from "@shared/eventAutoReminders";
import { newsletterLegalFooterHtml } from "@shared/letterHtml";
import {
  SEASON_FACILITATION_MAX,
  SEASON_TOPIC_MAX,
  cleanNoteText,
  isSeasonSlotKey,
  nextSessionWeek,
  overdueOffsets,
  parseInstant,
  parseLeaderRecord,
  parseOfferedTimes,
  parseSlotTime,
  parseToggle,
  planSeasonMoves,
  resolveSeasonSlot,
  seasonConfig,
  seasonLeader,
  seasonNames,
  SEASON_FREEZE_HOURS,
  seasonEnds,
  seasonSettingKey,
  seasonSlot,
  serializeSlotTime,
  tallySeasonVotes,
  type SeasonScheduleConfig,
  type SeasonSlot,
  type SeasonSlotKey,
  type SeasonSlotTime,
  type SeasonTally,
} from "@shared/seasonSchedule";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** How many vote rows a tally reads. A cohort is tens of people; this is headroom. */
const VOTE_READ_LIMIT = 2000;

/** Trim and bound. The router passes the stricter public cleaner for anything it shows. */
function plain(raw: string | null | undefined): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 80) : null;
}

export async function readSeasonVotes(database: Db, season: string) {
  return database
    .select({
      slots: seasonScheduleVotes.slots,
      displayName: seasonScheduleVotes.displayName,
      projectName: seasonScheduleVotes.projectName,
      projectUrl: seasonScheduleVotes.projectUrl,
    })
    .from(seasonScheduleVotes)
    .where(eq(seasonScheduleVotes.season, season))
    .orderBy(asc(seasonScheduleVotes.createdAt))
    .limit(VOTE_READ_LIMIT);
}

export type SeasonVotes = Awaited<ReturnType<typeof readSeasonVotes>>;

export type SeasonState = {
  season: string;
  name: string;
  offered: SeasonSlot[];
  tally: SeasonTally;
  /** The raw vote rows (no voter keys), for the register. Never returned to the public as-is. */
  votes: SeasonVotes;
  leader: SeasonSlotKey | null;
  /** When the current leader took the lead, ms since epoch. */
  leaderSince: number | null;
  pinned: SeasonSlotKey | null;
  applied: SeasonSlotTime | null;
  /** When the vote decides the next session and starts steering the schedule. */
  followsFrom: Date;
  /** Whether it is steering yet. */
  following: boolean;
  /** When the first decision was made and announced; null until then. */
  decidedAt: Date | null;
  scheduled: SeasonSlot;
  /** Whether the page asks projects who missed Selection Day for their video. */
  selectionVideos: boolean;
  /** Whether any of the Season's sessions can still be ahead. */
  running: boolean;
};

/**
 * Read the vote and the settings, record a new leader, and say which time the
 * Season follows now. Like the Circle's resolveCircleState, this writes the
 * leader record as it reads, so the settle rule always has a start to count from.
 */
export async function resolveSeasonState(
  database: Db,
  config: SeasonScheduleConfig,
  now: Date,
  clean: (raw: string | null | undefined) => string | null = plain,
): Promise<SeasonState> {
  const [offeredRaw, followsRaw, pinnedRaw, appliedRaw, leaderRaw, decidedRaw, videosRaw] = await Promise.all([
    getSiteSetting(seasonSettingKey(config.season, "offered")),
    getSiteSetting(seasonSettingKey(config.season, "follows_from")),
    getSiteSetting(seasonSettingKey(config.season, "pinned")),
    getSiteSetting(seasonSettingKey(config.season, "applied")),
    getSiteSetting(seasonSettingKey(config.season, "leader")),
    getSiteSetting(seasonSettingKey(config.season, "decided")),
    getSiteSetting(seasonSettingKey(config.season, "selection_videos")),
  ]);
  const offered = parseOfferedTimes(offeredRaw, config.offered);
  const followsFrom = parseInstant(followsRaw, config.followsFrom);
  const following = now.getTime() >= followsFrom.getTime();
  const decided = decidedRaw ? new Date(decidedRaw) : null;
  const decidedAt = decided && Number.isFinite(decided.getTime()) ? decided : null;
  const pinned = isSeasonSlotKey(pinnedRaw) ? pinnedRaw : null;
  const applied = parseSlotTime(appliedRaw);

  let rows: SeasonVotes = [];
  try {
    rows = await readSeasonVotes(database, config.season);
  } catch (err) {
    // The page keeps its shape on a database hiccup: no hands, no error.
    console.error("[seasonSchedule] vote read failed:", err);
  }
  const tally = tallySeasonVotes(rows, offered, clean);
  const leader = seasonLeader(tally.counts, offered, (applied ?? config.opening).key);

  const record = parseLeaderRecord(leaderRaw);
  let leaderSince = record && record.slot === leader ? record.since : null;
  if (leader && leaderSince == null) {
    leaderSince = now.getTime();
    await setSiteSetting(seasonSettingKey(config.season, "leader"), JSON.stringify({ slot: leader, since: leaderSince }));
  }

  const slot = resolveSeasonSlot({
    pinned,
    leader,
    leaderSince,
    following,
    followsFromMs: followsFrom.getTime(),
    applied,
    opening: config.opening,
    offered,
    nowMs: now.getTime(),
  });
  return {
    season: config.season,
    name: config.name,
    offered,
    tally,
    votes: rows,
    leader,
    leaderSince,
    pinned,
    applied,
    followsFrom,
    following,
    decidedAt,
    scheduled: seasonSlot(slot.key, slot.hourPT),
    selectionVideos: parseToggle(videosRaw, config.selectionVideos),
    running: stillRunning(config, now),
  };
}

// ─── Feedback ────────────────────────────────────────────────────────────────

/** A note as it may be stored: shared notes are public text, so hidden characters go too. */
function note(raw: string | null | undefined, max: number): string | null {
  return cleanNoteText(raw, max);
}

/**
 * File a note for the organizers against the next session that has not
 * started. Returns the week it was filed under, or null when the Season is
 * over (the note is still kept, with no week).
 */
export async function recordSeasonFeedback(
  database: Db,
  config: SeasonScheduleConfig,
  input: {
    topic?: string | null;
    facilitation?: string | null;
    displayName: string | null;
    projectName: string | null;
    /** The writer's choice: show it on the page for the cohort, or keep it with the organizers. */
    isPublic?: boolean;
  },
  now: Date,
): Promise<{ week: number | null }> {
  const topic = note(input.topic, SEASON_TOPIC_MAX);
  const facilitation = note(input.facilitation, SEASON_FACILITATION_MAX);
  if (!topic && !facilitation) return { week: null };
  const rows = await seasonEpisodeRows(database, config.season);
  const week = nextSessionWeek(
    rows.map((r) => ({ week: r.week, start: new Date(r.startTime), status: r.status })),
    now,
  );
  await database.insert(seasonFeedback).values({
    season: config.season,
    week,
    displayName: input.displayName,
    projectName: input.projectName,
    topic,
    facilitation,
    isPublic: input.isPublic ? 1 : 0,
  });
  return { week };
}

/** Every note for a Season, newest first. Admin only. */
export async function seasonFeedbackRows(database: Db, season: string, limit = 500) {
  return database
    .select({
      id: seasonFeedback.id,
      week: seasonFeedback.week,
      displayName: seasonFeedback.displayName,
      projectName: seasonFeedback.projectName,
      topic: seasonFeedback.topic,
      facilitation: seasonFeedback.facilitation,
      isPublic: seasonFeedback.isPublic,
      createdAt: seasonFeedback.createdAt,
    })
    .from(seasonFeedback)
    .where(eq(seasonFeedback.season, season))
    .orderBy(desc(seasonFeedback.createdAt))
    .limit(limit);
}

/**
 * The notes their writers chose to share, newest first: the cohort's shared
 * agenda. Text and the signature they chose; no id, nothing else.
 */
export async function seasonPublicNotes(database: Db, season: string, limit = 60) {
  return database
    .select({
      week: seasonFeedback.week,
      displayName: seasonFeedback.displayName,
      projectName: seasonFeedback.projectName,
      topic: seasonFeedback.topic,
      facilitation: seasonFeedback.facilitation,
      createdAt: seasonFeedback.createdAt,
    })
    .from(seasonFeedback)
    .where(and(eq(seasonFeedback.season, season), eq(seasonFeedback.isPublic, 1)))
    .orderBy(desc(seasonFeedback.createdAt))
    .limit(limit);
}

/** Admin: take a public note down, or put it back up. */
export async function setSeasonNotePublic(database: Db, season: string, id: number, isPublic: boolean): Promise<void> {
  await database
    .update(seasonFeedback)
    .set({ isPublic: isPublic ? 1 : 0 })
    .where(and(eq(seasonFeedback.season, season), eq(seasonFeedback.id, id)));
}

/** How many notes are in for one week, shared or not. A count only. */
export async function seasonFeedbackCount(database: Db, season: string, week: number): Promise<number> {
  const [row] = await database
    .select({ n: sql<number>`count(*)` })
    .from(seasonFeedback)
    .where(and(eq(seasonFeedback.season, season), eq(seasonFeedback.week, week)));
  return Number(row?.n ?? 0);
}

/** Every episode row of a Season, week order. */
export async function seasonEpisodeRows(database: Db, season: string) {
  return database
    .select({
      id: events.id,
      week: events.episodeNumber,
      title: events.title,
      startTime: events.startTime,
      endTime: events.endTime,
      status: events.status,
      manualOverride: events.manualOverride,
    })
    .from(events)
    .where(and(eq(events.season, season), eq(events.type, "episode")))
    .orderBy(asc(events.episodeNumber));
}

/** Mark the offsets already due at a session's new start as handled. Returns how many. */
async function claimOverdueReminders(database: Db, eventId: number, newStart: Date, now: Date): Promise<number> {
  const [config] = await database
    .select({ offsetsJson: eventAutoReminders.offsetsJson })
    .from(eventAutoReminders)
    .where(eq(eventAutoReminders.eventId, eventId))
    .limit(1);
  if (!config) return 0;
  const due = overdueOffsets(parseOffsetMinutes(config.offsetsJson), newStart, now);
  for (const offsetMinutes of due) {
    // recipientCount 0 is the marker for "claimed by a move, never sent".
    await database
      .insert(eventAutoReminderSends)
      .values({ eventId, offsetMinutes, recipientCount: 0 })
      .onDuplicateKeyUpdate({ set: { eventId: sql`eventId` } });
  }
  return due.length;
}

export type SeasonSyncResult = {
  season: string;
  slot: SeasonSlotTime;
  moved: number;
  claimedReminders: number;
  /** Decision or move emails sent. */
  notified: number;
  /** Whether this run made the first decision. */
  decided: boolean;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function sessionWhen(start: Date): string {
  const date = start.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: SESSION_TIME_ZONE,
  });
  const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: SESSION_TIME_ZONE });
  return `${date} at ${time} ${zoneName(start, SESSION_TIME_ZONE)}`;
}

/**
 * The footer the reminders use, so a move notice explains itself the same way:
 * someone the team added to every reminder is told why and how to stop, since
 * a preferences link would do nothing for them; everyone else gets Manage
 * email preferences (ADR-55).
 */
async function moveFooterHtml(email: string, topic: ReturnType<typeof communityTopicForAudience>): Promise<string> {
  if (isAlwaysIncluded(email)) {
    const stop = `${APP_BASE_URL}${ALWAYS_INCLUDED_STOP_PATH}`;
    return `<p style="color:#8a8a8a;font-size:11px;margin:16px 0 0 0;line-height:1.6;">${escapeHtml(ALWAYS_INCLUDED_FOOTER_TEXT)} <a href="${stop}" style="color:#8a8a8a;">${escapeHtml(stop.replace(/^https?:\/\//, ""))}</a>.</p>`;
  }
  return newsletterLegalFooterHtml(await managePreferencesUrl(email, { mute: topic }));
}

export type SeasonNoticeKind = "decided" | "moved";

function moveEmailHtml(opts: {
  kind: SeasonNoticeKind;
  name: string | null;
  seasonName: string;
  label: string;
  next: string | null;
  list: string;
  footer: string;
}): string {
  const p = 'style="color:#444;line-height:1.7;"';
  const hello = opts.name ? `<p ${p}>Hi ${escapeHtml(opts.name)},</p>` : "";
  const heading = opts.kind === "decided"
    ? `${escapeHtml(opts.seasonName)} meets ${escapeHtml(opts.label)}`
    : `${escapeHtml(opts.seasonName)} now meets ${escapeHtml(opts.label)}`;
  const lead = opts.kind === "decided"
    ? `The land projects picked the weekly time.${opts.next ? ` The next session is ${escapeHtml(opts.next)}.` : ""} Here is every session still to come:`
    : "The land projects' vote moved the weekly time. Here is every session still to come:";
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background-color:#1a472a;background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
      <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">${escapeHtml(opts.seasonName)} Season Schedule</p>
    </div>
    <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
      <h2 style="color:#1a472a;margin:0 0 10px 0;">${heading}</h2>
      ${hello}
      <p ${p}>${lead}</p>
      <ul ${p}>${opts.list}</ul>
      <p ${p}>If you subscribed to the ${escapeHtml(opts.seasonName)} calendar, it already shows these times. Reminders still come before each session.</p>
      <p ${p}>If your week changes, change your picks on the Season Schedule and the time moves with the group.</p>
      <a href="${APP_BASE_URL}/season-schedule" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin-top:8px;">The Season Schedule</a>
      ${opts.footer}
    </div>
  </div>`;
}

/**
 * Tell the people these sessions remind what the vote decided: one email each,
 * naming the time, the next session and every session still ahead, the way
 * the Circle tells its members. "decided" is the first decision, sent even
 * when nothing moved, so a Saturday result reaches people too; "moved" is any
 * later change. The audience is the sessions' own reminder audience
 * (season2_approved for Season 2), so the same people hear it, and their
 * season2 mute holds.
 */
async function notifySeason(
  database: Db,
  config: SeasonScheduleConfig,
  kind: SeasonNoticeKind,
  eventIds: number[],
  label: string,
  now: Date,
): Promise<number> {
  if (!eventIds.length) return 0;
  const [reminder] = await database
    .select({
      eventId: eventAutoReminders.eventId,
      enabled: eventAutoReminders.enabled,
      audienceMode: eventAutoReminders.audienceMode,
      audienceConfig: eventAutoReminders.audienceConfig,
    })
    .from(eventAutoReminders)
    .where(inArray(eventAutoReminders.eventId, eventIds))
    .limit(1);
  if (!reminder || !reminder.enabled) return 0;
  const recipients = await resolveAutoReminderRecipients({
    eventId: reminder.eventId,
    audienceMode: reminder.audienceMode,
    audienceConfig: reminder.audienceConfig as Parameters<typeof resolveAutoReminderRecipients>[0]["audienceConfig"],
  });
  if (!recipients.length) return 0;

  const ahead = (await seasonEpisodeRows(database, config.season)).filter(
    (r) => r.status === "upcoming" && new Date(r.startTime).getTime() > now.getTime(),
  );
  const list = ahead.map((r) => `<li>${escapeHtml(r.title)}: ${sessionWhen(new Date(r.startTime))}</li>`).join("");
  const next = ahead[0] ? `${ahead[0].title}, ${sessionWhen(new Date(ahead[0].startTime))}` : null;
  const topic = communityTopicForAudience(reminder.audienceMode);
  const subject = kind === "decided" ? `${config.name} meets ${label}` : `${config.name} now meets ${label}`;

  let sent = 0;
  for (const person of recipients) {
    try {
      const footer = await moveFooterHtml(person.email, topic);
      await sendEmail({
        to: [person.email],
        subject,
        html: moveEmailHtml({ kind, name: person.name ?? null, seasonName: config.name, label, next, list, footer }),
        template: kind === "decided" ? "season_schedule_decided" : "season_schedule_moved",
        recipientName: person.name ?? undefined,
      });
      sent += 1;
    } catch (err) {
      console.error("[seasonSchedule] move notice failed:", err);
    }
  }
  return sent;
}

/** One Season: record the time that applies, then move the rows that should follow it. */
export async function syncSeason(database: Db, config: SeasonScheduleConfig, now: Date): Promise<SeasonSyncResult> {
  const state = await resolveSeasonState(database, config, now);
  const slot: SeasonSlotTime = { key: state.scheduled.key, hourPT: state.scheduled.hourPT };
  // Email only when the Season's time really changed from one it already had.
  // A first run (nothing applied yet) or a row being put back on the time it
  // should have had is housekeeping, and the cohort hears nothing about it.
  const changed = state.applied != null && (state.applied.key !== slot.key || state.applied.hourPT !== slot.hourPT);
  if (!state.applied || changed) {
    await setSiteSetting(seasonSettingKey(config.season, "applied"), serializeSlotTime(slot));
  }

  // The first decision: the vote was due, and everyone was told the next
  // session depends on it, so any session that has not started may move
  // however close it is. Recorded before anything moves or sends, so a second
  // sync running beside this one treats it as already made.
  const firstDecision = state.following && state.decidedAt == null;
  if (firstDecision) await setSiteSetting(seasonSettingKey(config.season, "decided"), now.toISOString());

  const rows = await seasonEpisodeRows(database, config.season);
  const moves = planSeasonMoves(
    config,
    rows.map((r) => ({
      id: r.id,
      week: r.week,
      start: new Date(r.startTime),
      status: r.status,
      manualOverride: !!r.manualOverride,
    })),
    slot,
    now,
    firstDecision ? 0 : SEASON_FREEZE_HOURS,
  );

  let claimedReminders = 0;
  for (const move of moves) {
    // Claim first, then move: the reminder sweep never sees the new start
    // without its overdue offsets already marked.
    claimedReminders += await claimOverdueReminders(database, move.id, move.to, now);
    await database
      .update(events)
      .set({
        startTime: move.to,
        endTime: new Date(move.to.getTime() + config.minutes * 60_000),
        timezone: zoneName(move.to, SESSION_TIME_ZONE),
      })
      .where(eq(events.id, move.id));
  }
  if (moves.length) {
    console.log(`[seasonSchedule] ${config.season}: moved ${moves.length} sessions to ${state.scheduled.label}`);
  }
  let notified = 0;
  if (firstDecision) {
    // Announced whatever the result, so a Saturday win (nothing moves) still
    // tells everyone the next session is on.
    const upcoming = rows.filter((r) => r.status === "upcoming").map((r) => r.id);
    notified = await notifySeason(database, config, "decided", upcoming, state.scheduled.label, now);
    console.log(`[seasonSchedule] ${config.season}: decided on ${state.scheduled.label}, ${notified} told`);
  } else if (moves.length && changed) {
    notified = await notifySeason(database, config, "moved", moves.map((m) => m.id), state.scheduled.label, now);
  }
  return { season: config.season, slot, moved: moves.length, claimedReminders, notified, decided: firstDecision };
}

/** Whether any of a Season's sessions can still be ahead. A finished Season has nothing to move. */
function stillRunning(config: SeasonScheduleConfig, now: Date): boolean {
  const ends = seasonEnds(config);
  return ends != null && ends.getTime() > now.getTime();
}

let running: Promise<SeasonSyncResult[]> | null = null;
let lastRunMs = 0;
const MIN_INTERVAL_MS = 60_000;

/**
 * Run the sync for every Season still running. Hot paths (events.list, the
 * page) pass nothing and get at most one run a minute per process; the
 * reminder sweep and admin actions pass force.
 */
export function syncSeasonSchedules(opts: { force?: boolean; now?: Date; season?: string } = {}): Promise<SeasonSyncResult[]> {
  const now = opts.now ?? new Date();
  if (running) return running;
  if (!opts.force && now.getTime() - lastRunMs < MIN_INTERVAL_MS) return Promise.resolve([]);
  lastRunMs = now.getTime();
  running = runAll(now, opts.season)
    .catch((err) => {
      console.error("[seasonSchedule] sync failed:", err);
      return [] as SeasonSyncResult[];
    })
    .finally(() => {
      running = null;
    });
  return running;
}

async function runAll(now: Date, only?: string): Promise<SeasonSyncResult[]> {
  const database = await getDb();
  if (!database) return [];
  const results: SeasonSyncResult[] = [];
  for (const name of seasonNames()) {
    if (only && name !== only) continue;
    const config = seasonConfig(name);
    if (!config || !stillRunning(config, now)) continue;
    results.push(await syncSeason(database, config, now));
  }
  return results;
}
