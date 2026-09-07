/**
 * Keep the events table aligned with the shared catalog.
 *
 * Two jobs:
 *   1. The recurring skeleton. Open Access sessions land on new moons at 11:00
 *      Pacific, Season 2 runs thirteen Saturdays. Seed used to run only on an
 *      empty table and never wrote the monthly series, so a leftover 1:00 PM
 *      Eastern stamp could sit forever.
 *   2. The Season 2 titles and descriptions, from shared/season2Curriculum.ts.
 *      Until 2026-09-07 the curriculum lived in four places that had drifted:
 *      /seasons, /season2 + the ICS feed, the seed list, and these rows. Weeks
 *      3 through 13 said three different things at once. Now the curriculum is
 *      defined once and this is what carries it into the database, which is
 *      what /schedule, /events/:id and the calendar feeds all read.
 *
 * `manualOverride` is the escape hatch. events.update sets it, and a row
 * carrying it is skipped entirely: an admin who moves an episode or rewrites a
 * description is not reverted on the next public events.list call. /schedule
 * warns that episode times may shift after week 1, so this matters in practice.
 *
 * Idempotent. Safe to call from public list and admin list.
 */
import { and, eq, like, or, sql } from "drizzle-orm";
import { events } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  catalogOpenAccessRows,
  OPEN_ACCESS_TITLE,
  sessionEndUtc,
  sessionStartUtc,
  SEASON2_EPISODE_DATES,
  zoneName,
  SESSION_TIME_ZONE,
} from "@shared/sessionClock";
import { SEASON2_CURRICULUM, episodeTitle } from "@shared/season2Curriculum";
import { openAccessDescription } from "@shared/openAccess";

function sameInstant(a: Date | string | null | undefined, b: Date): boolean {
  if (!a) return false;
  return new Date(a).getTime() === b.getTime();
}

export async function syncCatalogEvents(): Promise<{ updated: number; inserted: number }> {
  const database = await getDb();
  if (!database) return { updated: 0, inserted: 0 };

  let updated = 0;
  let inserted = 0;

  for (const row of catalogOpenAccessRows()) {
    // Per-date, so a session with a topic set carries it into the invite. A
    // topic change therefore lands as a row update, which bumps updatedAt,
    // which bumps the ICS SEQUENCE, which is what makes subscribers re-read it.
    const description = openAccessDescription(row.date);
    const existing = await database
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        manualOverride: events.manualOverride,
      })
      .from(events)
      .where(
        and(
          eq(events.type, "open"),
          like(events.title, "%Open Access%"),
          or(
            sql`DATE(${events.startTime}) = ${row.date}`,
            sql`DATE(${events.startTime}) = ${row.publishedDate}`,
          ),
        ),
      )
      .limit(1);

    const current = existing[0];
    if (!current) {
      await database.insert(events).values({
        title: OPEN_ACCESS_TITLE,
        description,
        type: "open",
        startTime: row.startTime,
        endTime: row.endTime,
        timezone: row.timezone,
        season: "Open",
        status: "upcoming",
      });
      inserted += 1;
      continue;
    }

    if (current.manualOverride) continue;

    const drifted =
      !sameInstant(current.startTime, row.startTime) ||
      current.timezone !== row.timezone ||
      current.title !== OPEN_ACCESS_TITLE ||
      current.description !== description;

    if (drifted) {
      await database
        .update(events)
        .set({
          startTime: row.startTime,
          endTime: row.endTime,
          timezone: row.timezone,
          title: OPEN_ACCESS_TITLE,
          description,
        })
        .where(eq(events.id, current.id));
      updated += 1;
    }
  }

  for (let i = 0; i < SEASON2_EPISODE_DATES.length; i++) {
    const ymd = SEASON2_EPISODE_DATES[i];
    const episode = SEASON2_CURRICULUM[i];
    if (!episode) continue;
    const startTime = sessionStartUtc(ymd);
    const endTime = sessionEndUtc(ymd);
    const timezone = zoneName(startTime, SESSION_TIME_ZONE);
    const title = episodeTitle(episode);

    const existing = await database
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        timezone: events.timezone,
        manualOverride: events.manualOverride,
      })
      .from(events)
      .where(
        and(
          eq(events.season, "Season 2"),
          eq(events.type, "episode"),
          eq(events.episodeNumber, episode.week),
        ),
      )
      .limit(1);

    const current = existing[0];
    if (!current) continue;
    if (current.manualOverride) continue;

    const drifted =
      !sameInstant(current.startTime, startTime) ||
      current.timezone !== timezone ||
      current.title !== title ||
      current.description !== episode.description;

    if (drifted) {
      await database
        .update(events)
        .set({ startTime, endTime, timezone, title, description: episode.description })
        .where(eq(events.id, current.id));
      updated += 1;
    }
  }

  return { updated, inserted };
}
