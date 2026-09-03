/**
 * Keep Season 2 and Open Access rows on the events table aligned with
 * the shared 11:00 Pacific catalog. Seed used to run only on an empty
 * table and never wrote the monthly Open Access series, so a leftover
 * 1:00 PM Eastern stamp could sit forever.
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
    const existing = await database
      .select({
        id: events.id,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
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
        description:
          "Open community session for the ReGenerative Renaissance. Drop in, meet the community, ask questions, no commitment required.",
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

    if (!sameInstant(current.startTime, row.startTime) || current.timezone !== row.timezone) {
      await database
        .update(events)
        .set({
          startTime: row.startTime,
          endTime: row.endTime,
          timezone: row.timezone,
          title: OPEN_ACCESS_TITLE,
        })
        .where(eq(events.id, current.id));
      updated += 1;
    }
  }

  for (let i = 0; i < SEASON2_EPISODE_DATES.length; i++) {
    const ymd = SEASON2_EPISODE_DATES[i];
    const startTime = sessionStartUtc(ymd);
    const endTime = sessionEndUtc(ymd);
    const timezone = zoneName(startTime, SESSION_TIME_ZONE);
    const existing = await database
      .select({
        id: events.id,
        startTime: events.startTime,
        timezone: events.timezone,
      })
      .from(events)
      .where(
        and(
          eq(events.season, "Season 2"),
          eq(events.type, "episode"),
          eq(events.episodeNumber, i + 1),
        ),
      )
      .limit(1);
    const current = existing[0];
    if (!current) continue;
    if (!sameInstant(current.startTime, startTime) || current.timezone !== timezone) {
      await database
        .update(events)
        .set({ startTime, endTime, timezone })
        .where(eq(events.id, current.id));
      updated += 1;
    }
  }

  return { updated, inserted };
}
