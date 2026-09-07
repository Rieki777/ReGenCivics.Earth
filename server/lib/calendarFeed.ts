/**
 * The public calendar feeds, built from the events table.
 *
 * Before 2026-09-07 the feed was a checked-in static file
 * (client/public/regen-civics-all-events.ics) generated from hardcoded arrays
 * in the client bundle. That meant two things, both bad:
 *
 *   1. Editing an event in Admin > Events changed /schedule and changed nothing
 *      in the feed. There was no code path from an admin edit to a subscriber's
 *      calendar, so "subscribe and updates arrive automatically" was false.
 *   2. express.static served it with `max-age=31536000, immutable`, so even a
 *      redeployed file would have sat in CDN and client caches for a year.
 *
 * Now the feed is rendered per request from the same rows /schedule reads. An
 * admin edit is the update mechanism. See registerCalendarFeedRoutes for the
 * cache headers that let that reach people.
 *
 * UIDs are load-bearing. People are already subscribed with
 * `open-access-<published-date>@regencivics.earth` and
 * `season2-week-<n>@regencivics.earth`. Emit a different UID for the same
 * session and every subscriber gets a duplicate rather than an update, so
 * eventUid() reproduces those exactly and must keep doing so.
 */
import { asc, gte } from "drizzle-orm";
import { events } from "../../drizzle/schema";
import { getDb } from "../db";
import { buildIcsCalendar, type IcsEvent } from "@shared/ical";
import {
  catalogOpenAccessRows,
  OPEN_ACCESS_TITLE,
  SEASON2_EPISODE_DATES,
  SESSION_TIME_ZONE,
  sessionEndUtc,
  sessionStartUtc,
} from "@shared/sessionClock";
import {
  SEASON2_CURRICULUM,
  episodeTitle,
  PUBLIC_EPISODE_WEEKS,
} from "@shared/season2Curriculum";
import { JOIN_URL, SEEDS_YOUTUBE_URL, SITE_ORIGIN } from "@shared/sessionLinks";
import { openAccessDescription } from "@shared/openAccess";

export const UID_DOMAIN = "regencivics.earth";

export type FeedKind = "all" | "open-access" | "season2";

/** A row shaped like the events table, loose enough to build from the catalog too. */
export type FeedRow = {
  id: number | null;
  title: string;
  description: string | null;
  type: string;
  season: string | null;
  episodeNumber: number | null;
  startTime: Date;
  endTime: Date | null;
  status: string;
  riversideRoomUrl: string | null;
  youtubeUrl: string | null;
  updatedAt: Date;
};

/** The row's calendar date in Pacific, which is the zone the schedule is set in. */
function pacificYmd(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SESSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * The UID a subscriber already holds for this session.
 *
 * Open Access UIDs key off the *published* (new moon) date, not the date the
 * session actually runs, because a session that moves off a Season 2 Saturday
 * has to reach existing subscribers as a move rather than as a new event.
 */
export function eventUid(row: FeedRow): string {
  if (row.type === "episode" && row.season === "Season 2" && row.episodeNumber) {
    return `season2-week-${row.episodeNumber}@${UID_DOMAIN}`;
  }
  if (row.type === "open") {
    const ymd = pacificYmd(row.startTime);
    const match = catalogOpenAccessRows().find((r) => r.date === ymd || r.publishedDate === ymd);
    return `open-access-${match?.publishedDate ?? ymd}@${UID_DOMAIN}`;
  }
  return `event-${row.id ?? pacificYmd(row.startTime)}@${UID_DOMAIN}`;
}

/**
 * SEQUENCE, derived from when the row last changed.
 *
 * A calendar client that already holds a UID ignores an update whose SEQUENCE
 * did not advance. The old feed hardcoded `1` and bumped it by hand, which
 * meant an edit could reach the feed and never reach anybody's phone. Minutes
 * since 2026-01-01 is monotonic, stays well inside a 32-bit int for decades,
 * and is always larger than the 1 and 2 already in the wild.
 */
const SEQUENCE_EPOCH_MS = Date.UTC(2026, 0, 1);
export function eventSequence(updatedAt: Date): number {
  return Math.max(3, Math.floor((updatedAt.getTime() - SEQUENCE_EPOCH_MS) / 60_000));
}

function episodeWeek(row: FeedRow): number | null {
  return row.type === "episode" && row.season === "Season 2" ? row.episodeNumber : null;
}

/** Anyone may attend live, versus a cohort working session the public watches. */
export function isPublicSession(row: FeedRow): boolean {
  if (row.type === "open") return true;
  const week = episodeWeek(row);
  return week != null && PUBLIC_EPISODE_WEEKS.includes(week);
}

/**
 * The body of the invite.
 *
 * The old feed built episode descriptions by hand instead of going through the
 * shared helper, so all thirteen Season 2 events shipped without the YouTube
 * link. Anyone subscribed had no way to find the livestream. One builder now,
 * and the audience decides which link leads.
 */
export function eventDescription(row: FeedRow): string {
  const body = (row.description ?? "").trim();
  const room = row.riversideRoomUrl ?? JOIN_URL;
  const watch = row.youtubeUrl ?? SEEDS_YOUTUBE_URL;
  const details = row.id != null ? `${SITE_ORIGIN}/events/${row.id}` : `${SITE_ORIGIN}/schedule`;

  const lines = [body, ""];
  if (isPublicSession(row)) {
    lines.push(`Join us live: ${room}`, `Watch live or catch the rerun on YouTube: ${watch}`);
  } else {
    lines.push(
      `Watch live or catch the rerun on YouTube: ${watch}`,
      `Cohort room (Season 2 projects): ${room}`,
    );
  }
  lines.push("", `Full details and any changes: ${details}`);
  return lines.join("\n").trim();
}

/**
 * LOCATION is that audience's primary way in: the room for open sessions, the
 * livestream for cohort weeks. Putting the cohort room here for a closed
 * working session would hand it to every public subscriber.
 */
export function eventLocation(row: FeedRow): string {
  if (isPublicSession(row)) return row.riversideRoomUrl ?? JOIN_URL;
  return row.youtubeUrl ?? SEEDS_YOUTUBE_URL;
}

function categories(row: FeedRow): string[] {
  if (row.type === "open") return ["ReGen Civics", "Open Access"];
  if (row.type === "episode") return ["ReGen Civics", "Season 2"];
  return ["ReGen Civics"];
}

export function toIcsEvent(row: FeedRow): IcsEvent {
  const end = row.endTime ?? new Date(row.startTime.getTime() + 2 * 3_600_000);
  return {
    uid: eventUid(row),
    start: row.startTime,
    end,
    summary: row.title,
    description: eventDescription(row),
    location: eventLocation(row),
    url: row.id != null ? `${SITE_ORIGIN}/events/${row.id}` : `${SITE_ORIGIN}/schedule`,
    sequence: eventSequence(row.updatedAt),
    dtstamp: row.updatedAt,
    // A cancelled session stays in the feed carrying STATUS:CANCELLED. Dropping
    // the row instead would leave it on every subscriber's calendar forever,
    // because a feed going quiet about a UID is not a cancellation.
    status: row.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
    categories: categories(row),
  };
}

export function selectForFeed(rows: FeedRow[], kind: FeedKind): FeedRow[] {
  if (kind === "all") return rows;
  if (kind === "season2") return rows.filter((r) => episodeWeek(r) != null);
  return rows.filter(isPublicSession);
}

const FEED_META: Record<FeedKind, { name: string; description: string }> = {
  all: {
    name: "ReGen Civics: All Sessions",
    description:
      "Every ReGen Civics session: the thirteen Season 2 incubator weeks and the monthly Open Access Sessions.",
  },
  "open-access": {
    name: "ReGen Civics: Open Sessions",
    description:
      "The monthly Open Access Sessions, plus Season 2 Selection Day. Every session on this calendar is open to anyone.",
  },
  season2: {
    name: "ReGen Civics: Season 2",
    description: "The thirteen weekly episodes of the Season 2 incubator.",
  },
};

/** How far back the feed carries. Recent history stays useful; ancient does not. */
const LOOKBACK_DAYS = 120;

/**
 * Catalog-derived rows, used only when the database is unreachable.
 *
 * A feed that 500s is a calendar that silently stops updating, and a feed that
 * returns an empty VCALENDAR is worse: some clients read that as "every event
 * was deleted". Falling back to the catalog serves the correct dates, times,
 * and titles, which is what the rows are seeded from anyway.
 */
export function catalogFallbackRows(now: Date): FeedRow[] {
  const stamp = new Date(Date.UTC(2026, 8, 7));
  const open: FeedRow[] = catalogOpenAccessRows().map((r) => ({
    id: null,
    title: OPEN_ACCESS_TITLE,
    description: openAccessDescription(r.date),
    type: "open",
    season: "Open",
    episodeNumber: null,
    startTime: r.startTime,
    endTime: r.endTime,
    status: "upcoming",
    riversideRoomUrl: null,
    youtubeUrl: null,
    updatedAt: stamp,
  }));
  const episodes: FeedRow[] = SEASON2_CURRICULUM.map((ep, i) => {
    const ymd = SEASON2_EPISODE_DATES[i];
    return {
      id: null,
      title: episodeTitle(ep),
      description: ep.description,
      type: "episode",
      season: "Season 2",
      episodeNumber: ep.week,
      startTime: sessionStartUtc(ymd),
      endTime: sessionEndUtc(ymd),
      status: "upcoming",
      riversideRoomUrl: null,
      youtubeUrl: null,
      updatedAt: stamp,
    };
  });
  const cutoff = now.getTime() - LOOKBACK_DAYS * 86_400_000;
  return [...open, ...episodes]
    .filter((r) => r.startTime.getTime() >= cutoff)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export async function loadFeedRows(now: Date = new Date()): Promise<FeedRow[]> {
  const database = await getDb();
  if (!database) return catalogFallbackRows(now);

  const cutoff = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  const rows = await database
    .select()
    .from(events)
    .where(gte(events.startTime, cutoff))
    .orderBy(asc(events.startTime));

  if (rows.length === 0) return catalogFallbackRows(now);

  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    season: e.season,
    episodeNumber: e.episodeNumber,
    startTime: new Date(e.startTime),
    endTime: e.endTime ? new Date(e.endTime) : null,
    status: e.status,
    riversideRoomUrl: e.riversideRoomUrl,
    youtubeUrl: e.youtubeUrl,
    updatedAt: new Date(e.updatedAt),
  }));
}

export function renderFeed(rows: FeedRow[], kind: FeedKind): string {
  const meta = FEED_META[kind];
  return buildIcsCalendar({
    name: meta.name,
    description: meta.description,
    prodId: "-//ReGen Civics//Sessions//EN",
    events: selectForFeed(rows, kind).map(toIcsEvent),
  });
}

export function renderSingleEvent(row: FeedRow): string {
  return buildIcsCalendar({
    name: row.title,
    description: (row.description ?? "").split("\n")[0] ?? row.title,
    prodId: "-//ReGen Civics//Sessions//EN",
    events: [toIcsEvent(row)],
  });
}
