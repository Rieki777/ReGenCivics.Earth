/**
 * Season Schedule: carry each Season's time vote into its episode rows.
 *
 * A Season's weekly sessions are ordinary `events` rows (type "episode",
 * season "Season 2"), so a move reaches /schedule, /events/:id, the calendar
 * feeds and the reminder job with no Season-specific copies. Which time
 * applies is decided in shared/seasonSchedule.ts; this file reads the vote and
 * the settings, applies those rules, and writes the moves.
 *
 * What the sync does, idempotently, for every Season still running:
 *   1. Works out the Season's time: the admin pin, else the vote's leader once
 *      voting has closed, else the time last applied, else the opening time.
 *   2. Records that time as applied, so reopening the vote cannot move a
 *      session until the vote closes again.
 *   3. Moves upcoming episode rows onto it (planSeasonMoves: never inside the
 *      72-hour freeze, never a row an admin edited, cancelled, live or done).
 *   4. Before each move, marks the reminder offsets already due at the new time
 *      as handled, so the reminder job does not send "In 7 days" to a session
 *      five days out. Later reminders go out on time, carrying the new time.
 *
 * It sends no email of its own: the organizers announce a new time from Admin.
 * Calendar subscribers get the move through the feed, since the update bumps
 * updatedAt and so the ICS SEQUENCE.
 *
 * syncCatalogEvents keeps the Season 2 titles and descriptions in line with the
 * curriculum and leaves the times to this file.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  eventAutoReminderSends,
  eventAutoReminders,
  events,
  seasonFeedback,
  seasonScheduleVotes,
} from "../../drizzle/schema";
import { getDb, getSiteSetting, setSiteSetting } from "../db";
import { SESSION_TIME_ZONE, zoneName } from "@shared/sessionClock";
import { parseOffsetMinutes } from "@shared/eventAutoReminders";
import {
  SEASON_FACILITATION_MAX,
  SEASON_TOPIC_MAX,
  isSeasonSlotKey,
  nextSessionWeek,
  overdueOffsets,
  parseClosesAt,
  parseOfferedTimes,
  parseSlotTime,
  parseToggle,
  planSeasonMoves,
  resolveSeasonSlot,
  seasonConfig,
  seasonLeader,
  seasonNames,
  seasonSessionStart,
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

/** When this Season's current round of voting closes: the stored date, else the Season's default. */
export async function seasonClosesAt(config: SeasonScheduleConfig): Promise<Date> {
  return parseClosesAt(await getSiteSetting(seasonSettingKey(config.season, "closes_at")), config.closesAt);
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
  pinned: SeasonSlotKey | null;
  applied: SeasonSlotTime | null;
  closesAt: Date;
  closed: boolean;
  scheduled: SeasonSlot;
  /** Whether the page asks projects who missed Selection Day for their video. */
  selectionVideos: boolean;
};

/** Read the vote and the settings, and say which time the Season follows now. */
export async function resolveSeasonState(
  database: Db,
  config: SeasonScheduleConfig,
  now: Date,
  clean: (raw: string | null | undefined) => string | null = plain,
): Promise<SeasonState> {
  const [offeredRaw, closesRaw, pinnedRaw, appliedRaw, videosRaw] = await Promise.all([
    getSiteSetting(seasonSettingKey(config.season, "offered")),
    getSiteSetting(seasonSettingKey(config.season, "closes_at")),
    getSiteSetting(seasonSettingKey(config.season, "pinned")),
    getSiteSetting(seasonSettingKey(config.season, "applied")),
    getSiteSetting(seasonSettingKey(config.season, "selection_videos")),
  ]);
  const offered = parseOfferedTimes(offeredRaw, config.offered);
  const closesAt = parseClosesAt(closesRaw, config.closesAt);
  const closed = now.getTime() >= closesAt.getTime();
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
  const slot = resolveSeasonSlot({ pinned, leader, closed, applied, opening: config.opening, offered });
  return {
    season: config.season,
    name: config.name,
    offered,
    tally,
    votes: rows,
    leader,
    pinned,
    applied,
    closesAt,
    closed,
    scheduled: seasonSlot(slot.key, slot.hourPT),
    selectionVideos: parseToggle(videosRaw, config.selectionVideos),
  };
}

// ─── Feedback ────────────────────────────────────────────────────────────────

/** Trim and bound a free-text note. React escapes it on the way out; the admin panel is its only reader. */
function note(raw: string | null | undefined, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * File a note for the organizers against the next session that has not
 * started. Returns the week it was filed under, or null when the Season is
 * over (the note is still kept, with no week).
 */
export async function recordSeasonFeedback(
  database: Db,
  config: SeasonScheduleConfig,
  input: { topic?: string | null; facilitation?: string | null; displayName: string | null; projectName: string | null },
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
      createdAt: seasonFeedback.createdAt,
    })
    .from(seasonFeedback)
    .where(eq(seasonFeedback.season, season))
    .orderBy(desc(seasonFeedback.createdAt))
    .limit(limit);
}

/** How many notes are in for one week. A count only: the page never shows what they say. */
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
};

/** One Season: record the time that applies, then move the rows that should follow it. */
export async function syncSeason(database: Db, config: SeasonScheduleConfig, now: Date): Promise<SeasonSyncResult> {
  const state = await resolveSeasonState(database, config, now);
  const slot: SeasonSlotTime = { key: state.scheduled.key, hourPT: state.scheduled.hourPT };
  if (!state.applied || state.applied.key !== slot.key || state.applied.hourPT !== slot.hourPT) {
    await setSiteSetting(seasonSettingKey(config.season, "applied"), serializeSlotTime(slot));
  }

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
  return { season: config.season, slot, moved: moves.length, claimedReminders };
}

/** Whether any of a Season's sessions can still be ahead. A finished Season has nothing to move. */
function stillRunning(config: SeasonScheduleConfig, now: Date): boolean {
  const lastPossible = seasonSessionStart(config, config.weeks.length, { key: "sun", hourPT: 23 });
  return lastPossible != null && lastPossible.getTime() > now.getTime();
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
