/**
 * Shared Season 2 / Open Access calendar data.
 *
 * /schedule and /season2 both render add-to-calendar buttons from this module
 * so titles, times, timezones, and ICS/Google links cannot drift.
 *
 * Canonical wall time: 11:00 America/Los_Angeles for every Open Access session
 * and every Season 2 weekly episode. Eastern is 14:00 that same instant
 * (2:00 PM EDT in September, 2:00 PM EST after the fall change).
 */

export {
  RIVERSIDE_INFO,
  JOIN_URL,
  SEEDS_YOUTUBE_URL,
  SEEDS_YOUTUBE_SUBSCRIBE_URL,
} from "@shared/sessionLinks";
import { JOIN_URL as JOIN, SEEDS_YOUTUBE_URL as SEEDS } from "@shared/sessionLinks";

export {
  SESSION_TIME_ZONE,
  SESSION_EASTERN_ZONE,
  SESSION_START_HOUR_PT,
  SESSION_DURATION_HOURS,
  OPEN_ACCESS_TITLE,
  sessionStartUtc,
  sessionEndUtc,
  wallTimeInZoneToUtc,
  sundayAfterSeason2Saturday,
} from "@shared/sessionClock";
import { SEASON2_CURRICULUM, episodeTitle } from "@shared/season2Curriculum";
import { SEASON2_EPISODE_DATES } from "@shared/sessionClock";
import {
  OPEN_ACCESS_PUBLISHED_DATES,
  OPEN_ACCESS_TITLE as SHARED_OA_TITLE,
  SESSION_DURATION_HOURS,
  SESSION_EASTERN_ZONE,
  SESSION_TIME_ZONE,
  sessionEndUtc,
  sessionStartUtc,
  sundayAfterSeason2Saturday,
  zoneName,
} from "@shared/sessionClock";

/** Bumped when published times moved from 8:00 AM PT / 1:00 PM ET to 11:00 AM PT. */
export const ICS_SEQUENCE = 1;
/** Extra bump when an Open Access session moves off a Season 2 Saturday. */
export const ICS_SEQUENCE_OA_RESCHEDULE = ICS_SEQUENCE + 1;

export const CALENDAR_FEED_PATH = "/regen-civics-all-events.ics";
export const CALENDAR_FEED_HTTPS = "https://regencivics.earth/regen-civics-all-events.ics";
export const CALENDAR_SUBSCRIBE_WEBCAL = "webcal://regencivics.earth/regen-civics-all-events.ics";
export const CALENDAR_SUBSCRIBE_GOOGLE =
  `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(CALENDAR_FEED_HTTPS)}`;

const ICS_DTSTAMP = "20260902T040000Z";

export type OpenAccessSession = {
  date: string;
  dayName: string;
  /** First-published / new-moon date. Stays on the ICS UID if the session moves. */
  publishedDate: string;
  sequence: number;
  startUtc: string;
  endUtc: string;
};

/**
 * Open Access copy moved to shared/openAccess.ts on 2026-09-07 so the calendar
 * feed can use it too. It was client-only, which is why a subscriber's invite
 * could say when a session was but never what it was about. Re-exported here
 * because /schedule and Season2Calendar already import it from this module.
 */
export {
  OPEN_ACCESS_PITCH,
  SESSION_TOPICS,
  sessionTopic,
  openAccessDescription,
  type SessionTopic,
} from "@shared/openAccess";
import { OPEN_ACCESS_DESCRIPTION } from "@shared/openAccess";

/** Kept under its old name. The copy itself now lives in shared/openAccess.ts. */
export const OPEN_ACCESS_DESC = OPEN_ACCESS_DESCRIPTION;

export function parseCompactUtc(stamp: string): Date {
  return new Date(stamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z"));
}

export function toCompactUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

export function hourInZone(d: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d).find((p) => p.type === "hour")?.value;
  return Number(hour);
}

export function formatTimeInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function formatDualZoneStart(d: Date): string {
  return `${formatTimeInZone(d, SESSION_TIME_ZONE)}, ${formatTimeInZone(d, SESSION_EASTERN_ZONE)}`;
}

function formatClockInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDualZoneRange(start: Date, end: Date): string {
  const ptZone = zoneName(start, SESSION_TIME_ZONE);
  const etZone = zoneName(start, SESSION_EASTERN_ZONE);
  const pt = `${formatClockInZone(start, SESSION_TIME_ZONE)} to ${formatClockInZone(end, SESSION_TIME_ZONE)} ${ptZone}`;
  const et = `${formatClockInZone(start, SESSION_EASTERN_ZONE)} to ${formatClockInZone(end, SESSION_EASTERN_ZONE)} ${etZone}`;
  return `${pt}, ${et}`;
}

function sessionPair(ymd: string): { startUtc: string; endUtc: string } {
  return {
    startUtc: toCompactUtc(sessionStartUtc(ymd)),
    endUtc: toCompactUtc(sessionEndUtc(ymd)),
  };
}

export function openAccessUid(date: string): string {
  return `open-access-${date}@regencivics.earth`;
}

export function season2EpisodeUid(week: number): string {
  return `season2-week-${week}@regencivics.earth`;
}

export function nextIcsSequence(prevSequence: number, prevStartUtc: string, nextStartUtc: string): number {
  return prevStartUtc === nextStartUtc ? prevSequence : prevSequence + 1;
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcsEvent(opts: {
  uid: string;
  summary: string;
  startUtc: string;
  endUtc: string;
  sequence: number;
  description?: string;
  location?: string;
}): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `SEQUENCE:${opts.sequence}`,
    `DTSTAMP:${ICS_DTSTAMP}`,
    `DTSTART:${opts.startUtc}`,
    `DTEND:${opts.endUtc}`,
    `SUMMARY:${icsEscape(opts.summary)}`,
  ];
  if (opts.description) lines.push(`DESCRIPTION:${icsEscape(opts.description)}`);
  if (opts.location) lines.push(`LOCATION:${icsEscape(opts.location)}`);
  lines.push("END:VEVENT");
  return lines.join("\n");
}

/**
 * The body of a one-shot Google or Apple add.
 *
 * The room link is /join, never the Riverside studio URL, because that URL
 * carries a session token and this text lands on somebody's phone until April.
 * See shared/sessionLinks.ts.
 */
function calendarDetails(description: string): string {
  return `${description}\n\nJoin us live: ${JOIN}\n\nWatch live or catch the rerun on YouTube: ${SEEDS}`;
}

export function googleCalUrl(opts: { title: string; startUtc: string; endUtc: string; description: string }): string {
  const details = encodeURIComponent(calendarDetails(opts.description));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(opts.title)}&dates=${opts.startUtc}/${opts.endUtc}&details=${details}&location=Online+via+Riverside`;
}

export function icsDataUrl(opts: {
  uid: string;
  summary: string;
  startUtc: string;
  endUtc: string;
  description: string;
  sequence?: number;
}): string {
  const event = buildIcsEvent({
    uid: opts.uid,
    summary: opts.summary,
    startUtc: opts.startUtc,
    endUtc: opts.endUtc,
    sequence: opts.sequence ?? ICS_SEQUENCE,
    description: calendarDetails(opts.description),
    location: "Online via Riverside",
  });
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ReGen Civics//Events//EN\n${event}\nEND:VCALENDAR`;
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

export function openAccessGoogleUrl(session: OpenAccessSession): string {
  return googleCalUrl({
    title: SHARED_OA_TITLE,
    startUtc: session.startUtc,
    endUtc: session.endUtc,
    description: OPEN_ACCESS_DESC,
  });
}

export function openAccessIcsUrl(session: OpenAccessSession): string {
  return icsDataUrl({
    uid: openAccessUid(session.publishedDate),
    summary: SHARED_OA_TITLE,
    startUtc: session.startUtc,
    endUtc: session.endUtc,
    description: OPEN_ACCESS_DESC,
    sequence: session.sequence,
  });
}

export function openAccessFallbackEvent(session: OpenAccessSession, idx: number) {
  const start = parseCompactUtc(session.startUtc);
  return {
    id: 200 + idx,
    title: SHARED_OA_TITLE,
    date: session.date,
    time: "11:00 AM",
    timezone: zoneName(start, SESSION_TIME_ZONE),
    duration: "2 hours",
    description: OPEN_ACCESS_DESC,
    type: "open",
    googleCalendarUrl: openAccessGoogleUrl(session),
    appleCalendarUrl: openAccessIcsUrl(session),
  };
}

type EpisodeDef = {
  id: number;
  title: string;
  date: string;
  description: string;
};

/**
 * The thirteen weeks, from the one place the curriculum is defined.
 *
 * This array used to carry its own copy of the titles and descriptions, and by
 * 2026-09-07 it disagreed with /seasons, with the seed list, and with the rows
 * in MySQL. Weeks 3 to 13 said three different things depending on which
 * surface you looked at, and the calendar invites carried the version nobody
 * could see on the site. See shared/season2Curriculum.ts.
 */
export const SEASON2_EPISODE_DEFS: EpisodeDef[] = SEASON2_CURRICULUM.map((ep, i) => ({
  id: ep.week,
  title: episodeTitle(ep),
  date: SEASON2_EPISODE_DATES[i]!,
  description: ep.description,
}));

const SEASON2_DATES = new Set(SEASON2_EPISODE_DEFS.map((e) => e.date));

export const NEW_MOON_SESSIONS: OpenAccessSession[] = OPEN_ACCESS_PUBLISHED_DATES.map((row) => {
  const publishedDate = row.date;
  const clashes = SEASON2_DATES.has(publishedDate);
  const date = clashes ? sundayAfterSeason2Saturday(publishedDate) : publishedDate;
  return {
    date,
    dayName: clashes ? "Sunday" : row.dayName,
    publishedDate,
    sequence: clashes ? ICS_SEQUENCE_OA_RESCHEDULE : ICS_SEQUENCE,
    ...sessionPair(date),
  };
});

function episodeFallback(def: EpisodeDef) {
  const { startUtc, endUtc } = sessionPair(def.date);
  const start = parseCompactUtc(startUtc);
  const title = def.title;
  return {
    id: def.id,
    title,
    date: def.date,
    time: "11:00 AM",
    timezone: zoneName(start, SESSION_TIME_ZONE),
    duration: "2 hours",
    description: def.description,
    type: "episode",
    googleCalendarUrl: googleCalUrl({
      title: `ReGen Civics ${title}`,
      startUtc,
      endUtc,
      description: def.description,
    }),
    appleCalendarUrl: icsDataUrl({
      uid: season2EpisodeUid(def.id),
      summary: `ReGen Civics ${title}`,
      startUtc,
      endUtc,
      description: def.description,
    }),
  };
}

export const upcomingEventsFallback = [
  ...NEW_MOON_SESSIONS.map(openAccessFallbackEvent),
  ...SEASON2_EPISODE_DEFS.map(episodeFallback),
];

export function toGcalDate(d: Date) {
  return toCompactUtc(d);
}

export function buildGoogleCalendarUrl(event: { title: string; startTime: string | Date; endTime?: string | Date | null; description?: string | null }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  return googleCalUrl({
    title: event.title,
    startUtc: toCompactUtc(start),
    endUtc: toCompactUtc(end),
    description: event.description ?? "",
  });
}

export function buildIcsDataUrl(event: { title: string; startTime: string | Date; endTime?: string | Date | null; description?: string | null; id?: number | string }) {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const uid = event.id != null ? `event-${event.id}@regencivics.earth` : `event-${toCompactUtc(start)}@regencivics.earth`;
  return icsDataUrl({
    uid,
    summary: event.title,
    startUtc: toCompactUtc(start),
    endUtc: toCompactUtc(end),
    description: event.description ?? "",
  });
}

export type CalendarFallbackEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  timezone: string;
  duration: string;
  description: string;
  type: string;
  googleCalendarUrl: string;
  appleCalendarUrl: string;
};

/** End of 2026-09-11 in America/Los_Angeles. September is PDT (UTC-7). */
export const APPLICATIONS_CLOSE = new Date("2026-09-11T23:59:59-07:00");

/**
 * The Season 2 series links used to live here as SEASON_2_SERIES_GOOGLE_URL and
 * SEASON_2_SERIES_ICS_URL. Both were wrong in ways nobody had noticed:
 *
 *   - The Google one was a single-event TEMPLATE link for September 26 titled
 *     'ReGen Civics Season 2 Episode'. A reader who clicked 'Google Calendar'
 *     under 'All 13 weekly episodes' got exactly one generic event.
 *   - The Apple one was a data: URL carrying all thirteen, which iOS Safari
 *     handles unreliably and which no client can ever re-read for updates.
 *
 * Both are now live subscriptions: see CALENDAR_FEEDS in ./calendarLinks.
 */

export function upcomingOpenAccessSessions(nowMs: number = Date.now()): OpenAccessSession[] {
  return NEW_MOON_SESSIONS.filter((s) => parseCompactUtc(s.startUtc).getTime() > nowMs);
}

export function season2EpisodeEvents(): CalendarFallbackEvent[] {
  return upcomingEventsFallback.filter((e) => e.type === "episode") as CalendarFallbackEvent[];
}

export function formatSessionLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function formatSessionMonthDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatOpenAccessWhen(session: OpenAccessSession): string {
  return formatDualZoneRange(parseCompactUtc(session.startUtc), parseCompactUtc(session.endUtc));
}

export function formatOpenAccessStart(session: OpenAccessSession): string {
  return formatDualZoneStart(parseCompactUtc(session.startUtc));
}

