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

export const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description: "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  roomUrl: "https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b",
};

export const SESSION_TIME_ZONE = "America/Los_Angeles";
export const SESSION_EASTERN_ZONE = "America/New_York";
export const SESSION_START_HOUR_PT = 11;
export const SESSION_DURATION_HOURS = 2;

/** Bumped when published times moved from 8:00 AM PT / 1:00 PM ET to 11:00 AM PT. */
export const ICS_SEQUENCE = 1;

export const CALENDAR_FEED_PATH = "/regen-civics-all-events.ics";
export const CALENDAR_FEED_HTTPS = "https://regencivics.earth/regen-civics-all-events.ics";
export const CALENDAR_SUBSCRIBE_WEBCAL = "webcal://regencivics.earth/regen-civics-all-events.ics";
export const CALENDAR_SUBSCRIBE_GOOGLE =
  `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(CALENDAR_FEED_HTTPS)}`;

const ICS_DTSTAMP = "20260902T040000Z";

export type OpenAccessSession = {
  date: string;
  dayName: string;
  startUtc: string;
  endUtc: string;
};

export const OPEN_ACCESS_TITLE = "ReGen Civics Open Access Session";
export const OPEN_ACCESS_DESC =
  "Open community session for the ReGenerative Renaissance. Drop in, meet the community, ask questions, no commitment required.";

const OPEN_ACCESS_DATES: Array<{ date: string; dayName: string }> = [
  { date: "2026-05-16", dayName: "Saturday" },
  { date: "2026-06-14", dayName: "Sunday" },
  { date: "2026-07-14", dayName: "Tuesday" },
  { date: "2026-08-12", dayName: "Wednesday" },
  { date: "2026-09-10", dayName: "Thursday" },
  { date: "2026-10-10", dayName: "Saturday" },
  { date: "2026-11-09", dayName: "Monday" },
  { date: "2026-12-08", dayName: "Tuesday" },
  { date: "2027-01-07", dayName: "Thursday" },
  { date: "2027-02-06", dayName: "Saturday" },
  { date: "2027-03-08", dayName: "Monday" },
  { date: "2027-04-06", dayName: "Tuesday" },
];

export function parseCompactUtc(stamp: string): Date {
  return new Date(stamp.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z"));
}

export function toCompactUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

export function wallTimeInZoneToUtc(ymd: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utc));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asZone = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    const delta = wanted - asZone;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
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

function zoneName(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "";
}

export function formatDualZoneRange(start: Date, end: Date): string {
  const ptZone = zoneName(start, SESSION_TIME_ZONE);
  const etZone = zoneName(start, SESSION_EASTERN_ZONE);
  const pt = `${formatClockInZone(start, SESSION_TIME_ZONE)} to ${formatClockInZone(end, SESSION_TIME_ZONE)} ${ptZone}`;
  const et = `${formatClockInZone(start, SESSION_EASTERN_ZONE)} to ${formatClockInZone(end, SESSION_EASTERN_ZONE)} ${etZone}`;
  return `${pt}, ${et}`;
}

export function sessionStartUtc(ymd: string): Date {
  return wallTimeInZoneToUtc(ymd, SESSION_START_HOUR_PT, 0, SESSION_TIME_ZONE);
}

export function sessionEndUtc(ymd: string): Date {
  return new Date(sessionStartUtc(ymd).getTime() + SESSION_DURATION_HOURS * 3_600_000);
}

function sessionPair(ymd: string): { startUtc: string; endUtc: string } {
  return {
    startUtc: toCompactUtc(sessionStartUtc(ymd)),
    endUtc: toCompactUtc(sessionEndUtc(ymd)),
  };
}

export const NEW_MOON_SESSIONS: OpenAccessSession[] = OPEN_ACCESS_DATES.map((row) => ({
  ...row,
  ...sessionPair(row.date),
}));

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

function calendarDetails(description: string): string {
  return `${description}\n\nRiverside: ${RIVERSIDE_INFO.roomUrl}\n\nYouTube Livestream: https://www.youtube.com/@SEEDSRegenerativeEconomies`;
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
    title: OPEN_ACCESS_TITLE,
    startUtc: session.startUtc,
    endUtc: session.endUtc,
    description: OPEN_ACCESS_DESC,
  });
}

export function openAccessIcsUrl(session: OpenAccessSession): string {
  return icsDataUrl({
    uid: openAccessUid(session.date),
    summary: OPEN_ACCESS_TITLE,
    startUtc: session.startUtc,
    endUtc: session.endUtc,
    description: OPEN_ACCESS_DESC,
  });
}

export function openAccessFallbackEvent(session: OpenAccessSession, idx: number) {
  const start = parseCompactUtc(session.startUtc);
  return {
    id: 200 + idx,
    title: OPEN_ACCESS_TITLE,
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

export const SEASON2_EPISODE_DEFS: EpisodeDef[] = [
  {
    id: 1,
    title: "Week 1: Selection Day",
    date: "2026-09-26",
    description: "First steps of the ReGen Civics Incubator. Meet the selected projects, set intentions, and begin mapping your regenerative vision together.",
  },
  {
    id: 2,
    title: "Week 2: Incubator Overview",
    date: "2026-10-03",
    description: "Starting Season 2! Deep dive into the incubator structure, expectations, and how we'll journey together over the next 13 episodes.",
  },
  {
    id: 3,
    title: "Week 3: DAO/DHO/Org Co-Creation Part 1",
    date: "2026-10-10",
    description: "Designing the structure of our projects. Introduction to decentralized autonomous organizations and how to structure your community.",
  },
  {
    id: 4,
    title: "Week 4: DAO/DHO/Org Co-Creation Part 2",
    date: "2026-10-17",
    description: "Continuing to design the structure of our projects. Practical implementation of governance frameworks and community design.",
  },
  {
    id: 5,
    title: "Week 5: Game Guides & Economic Systems",
    date: "2026-10-24",
    description: "Co-creating project 'Game Guides' and kickstarting our economic systems. How to document your project's unique plays and patterns.",
  },
  {
    id: 6,
    title: "Week 6: Intro to the ReGen Civics DHO",
    date: "2026-10-31",
    description: "Introduction to the ReGen Civics DHO and the first steps in setting up yours. How our alliance operates and how you can participate.",
  },
  {
    id: 7,
    title: "Week 7: Ecosystem Map & Policies",
    date: "2026-11-07",
    description: "Evolving our culture through ecosystem mapping and policy design. How we co-create the rules of our regenerative game.",
  },
  {
    id: 8,
    title: "Week 8: Tokenomics Part 1",
    date: "2026-11-14",
    description: "The art and science of our token-assisted land-based economies. Understanding how tokens can support regenerative projects.",
  },
  {
    id: 9,
    title: "Week 9: Tokenomics Part 2",
    date: "2026-11-21",
    description: "Continuing the art and theory of our token-assisted land-based economies. Practical token design for your project.",
  },
  {
    id: 10,
    title: "Week 10: Legal Structures Part 1",
    date: "2026-11-28",
    description: "Exploring the expansive world of legal structures. How do our projects relate to nation states and existing legal frameworks?",
  },
  {
    id: 11,
    title: "Week 11: Legal Structures Part 2",
    date: "2026-12-05",
    description: "Continuing to explore legal structures. Practical considerations for land ownership, community agreements, and compliance.",
  },
  {
    id: 12,
    title: "Week 12: Coordination & Minimum Viable Economies",
    date: "2026-12-12",
    description: "Meeting our needs through coordination structures. How do we create minimum viable regenerative economies? How do we thrive?",
  },
  {
    id: 13,
    title: "Week 13: Season Overview & Project Updates",
    date: "2026-12-19",
    description: "A complete overview of the ReGen Civics Incubator journey. Project stewards share updates on their progress and celebrate our collective achievements.",
  },
];

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

const week1 = sessionPair("2026-09-26");

export const SEASON_2_SERIES_GOOGLE_URL = googleCalUrl({
  title: "ReGen Civics Season 2 Episode",
  startUtc: week1.startUtc,
  endUtc: week1.endUtc,
  description: "ReGen Civics Season 2 Incubator weekly episode.",
});

function seriesIcsBody(): string {
  const events = SEASON2_EPISODE_DEFS.map((def) => {
    const { startUtc, endUtc } = sessionPair(def.date);
    return buildIcsEvent({
      uid: season2EpisodeUid(def.id),
      summary: `ReGen Civics ${def.title}`,
      startUtc,
      endUtc,
      sequence: ICS_SEQUENCE,
      description: calendarDetails(def.description),
      location: "Online via Riverside",
    });
  });
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ReGen Civics//Season 2//EN\n${events.join("\n")}\nEND:VCALENDAR`;
}

export const SEASON_2_SERIES_ICS_URL = `data:text/calendar;charset=utf8,${encodeURIComponent(seriesIcsBody())}`;

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

export function buildAllEventsIcs(): string {
  const openAccess = NEW_MOON_SESSIONS.map((session) =>
    buildIcsEvent({
      uid: openAccessUid(session.date),
      summary: OPEN_ACCESS_TITLE,
      startUtc: session.startUtc,
      endUtc: session.endUtc,
      sequence: ICS_SEQUENCE,
      description: calendarDetails(OPEN_ACCESS_DESC),
      location: "Online via Riverside",
    }),
  );
  const episodes = SEASON2_EPISODE_DEFS.map((def) => {
    const { startUtc, endUtc } = sessionPair(def.date);
    return buildIcsEvent({
      uid: season2EpisodeUid(def.id),
      summary: `ReGen Civics ${def.title}`,
      startUtc,
      endUtc,
      sequence: ICS_SEQUENCE,
      description: `${def.description}\n\nRiverside: ${RIVERSIDE_INFO.roomUrl}`,
      location: "Online via Riverside",
    });
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReGen Civics//All Events//EN",
    "X-WR-CALNAME:ReGen Civics All Events",
    "X-WR-CALDESC:All ReGen Civics sessions and events",
    ...openAccess,
    ...episodes,
    "END:VCALENDAR",
    "",
  ].join("\n");
}
