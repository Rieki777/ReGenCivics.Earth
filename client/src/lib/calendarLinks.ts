/**
 * Calendar subscribe links, and times rendered in the reader's own zone.
 *
 * Two problems this fixes, both reported by real users on 2026-09-07.
 *
 * 1. Every "Subscribe" button on the site pointed at a `webcal://` URL and
 *    nothing else. `webcal://` is an operating-system protocol handler: it
 *    opens Apple Calendar or Outlook. Google Calendar is a website and never
 *    registers for it, so a Chrome-on-Windows reader got a dead click or an
 *    unfamiliar "choose an app" dialog. Google needs its own https deep link,
 *    which the codebase already had as a constant and never rendered.
 *
 * 2. Session times were published as Pacific and Eastern only. A reader in
 *    Berlin had to do the arithmetic; a reader in Sydney got something worse,
 *    because the event row rendered the DATE in the viewer's zone next to a
 *    clock in Pacific. On 2026-09-07 a Sydney reader saw "Sunday, September 27
 *    at 11:00 AM PDT" for an event that runs Saturday the 26th. Date and clock
 *    have to come from one zone. Here they do.
 */
import { SESSION_TIME_ZONE } from "@shared/sessionClock";
import { JOIN_URL, RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";

const ORIGIN = "https://regencivics.earth";

export type CalendarFeed = {
  /** Path on our own origin. */
  path: string;
  /** What Google, and any "add by URL" box, wants. */
  httpsUrl: string;
  /** What Apple Calendar and Outlook want. */
  webcalUrl: string;
  /** One click into Google's "add calendar by URL" flow. */
  googleUrl: string;
};

function feed(path: string): CalendarFeed {
  const httpsUrl = `${ORIGIN}${path}`;
  const webcalUrl = `webcal://regencivics.earth${path}`;
  return {
    path,
    httpsUrl,
    webcalUrl,
    // `render?cid=` with a URL-encoded webcal:// value. This exact form is the
    // one Rye confirmed by hand on 2026-09-07 when a reader could not subscribe:
    // it added "ReGen Civics All Events" under Other calendars. The codebase
    // already had a CALENDAR_SUBSCRIBE_GOOGLE constant using `/calendar/u/0/r?`
    // with an https value, wired into no component and never verified. Not the
    // form to guess with when fixing a reported bug.
    //
    // No `/u/0/` either way: that segment pins the flow to whichever Google
    // account happens to be first, which is the wrong one for anybody signed
    // into more than one.
    googleUrl: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`,
  };
}

/** The three things a reader can subscribe to. */
export const CALENDAR_FEEDS = {
  all: feed("/calendar/all.ics"),
  openAccess: feed("/calendar/open-access.ics"),
  season2: feed("/calendar/season2.ics"),
} as const;

/**
 * The URL existing subscribers are already polling. Kept so nothing that was
 * shipped before 2026-09-07 breaks; new buttons use CALENDAR_FEEDS.all.
 */
export const LEGACY_ALL_EVENTS_FEED = feed("/regen-civics-all-events.ics");

/** One session, as a live subscription rather than a one-shot download. */
export function eventFeed(eventId: number): CalendarFeed {
  return feed(`/calendar/event/${eventId}.ics`);
}

/**
 * The room link to show for a session. Mirrors roomUrl() in
 * server/lib/calendarFeed.ts so a page and an invite always agree.
 *
 * A row holding the default studio URL resolves to /join, so the token stops
 * being handed out. A row holding something else is a genuine per-event room
 * and passes through. The token was never a secret (it ships in the client
 * bundle and has been a visible href on /schedule), so this is not about
 * hiding it: it is so that rotating it does not break anything.
 */
export function resolveRoomUrl(stored?: string | null): string {
  const value = stored?.trim();
  if (!value || value === RIVERSIDE_ROOM_URL) return JOIN_URL;
  return value;
}

// ── Times, in the reader's own zone ─────────────────────────────────────────

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SESSION_TIME_ZONE;
  } catch {
    return SESSION_TIME_ZONE;
  }
}

function offsetMinutes(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - d.getTime()) / 60_000);
}

/** True when the reader's clock already reads the same as Pacific. */
export function viewerIsPacific(d: Date, tz: string = viewerTimeZone()): boolean {
  return offsetMinutes(d, tz) === offsetMinutes(d, SESSION_TIME_ZONE);
}

/** "Thursday, September 10, 2026", in the reader's zone. */
export function formatLocalDate(d: Date, tz: string = viewerTimeZone()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** "Thu, Sep 10", in the reader's zone. */
export function formatLocalDateShort(d: Date, tz: string = viewerTimeZone()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** "11:00 AM PDT", in the reader's zone. */
export function formatLocalTime(d: Date, tz: string = viewerTimeZone()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

function clockOnly(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function zoneLabel(d: Date, tz: string): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

/** "11:00 AM to 1:00 PM PDT", in the reader's zone. */
export function formatLocalRange(start: Date, end: Date, tz: string = viewerTimeZone()): string {
  return `${clockOnly(start, tz)} to ${clockOnly(end, tz)} ${zoneLabel(start, tz)}`;
}

/**
 * The Pacific time, for a reader who is not in Pacific.
 *
 * We publish the schedule in Pacific, so somebody comparing against an email or
 * a forum post needs to see it. Suppressed when the reader's clock already
 * reads the same, which covers Arizona in summer as well as the west coast.
 */
export function pacificReference(d: Date, tz: string = viewerTimeZone()): string | null {
  if (viewerIsPacific(d, tz)) return null;
  return formatLocalTime(d, SESSION_TIME_ZONE);
}

/** "11:00 AM PDT" or "8:00 PM GMT+2 (11:00 AM PDT)". */
export function formatStartWithReference(d: Date, tz: string = viewerTimeZone()): string {
  const local = formatLocalTime(d, tz);
  const ref = pacificReference(d, tz);
  return ref ? `${local} (${ref})` : local;
}

/** "11:00 AM to 1:00 PM PDT" or "8:00 PM to 10:00 PM GMT+2 (11:00 AM PDT)". */
export function formatRangeWithReference(
  start: Date,
  end: Date,
  tz: string = viewerTimeZone(),
): string {
  const local = formatLocalRange(start, end, tz);
  const ref = pacificReference(start, tz);
  return ref ? `${local} (${ref})` : local;
}

/**
 * The whole line: date and clock from the same zone, Pacific appended when it
 * differs. This is the only correct way to print a session for a reader whose
 * date is not our date.
 */
export function formatSessionWhen(start: Date, end: Date, tz: string = viewerTimeZone()): string {
  return `${formatLocalDate(start, tz)} · ${formatRangeWithReference(start, end, tz)}`;
}
