/**
 * Read the recap for one week board. Select only. A failed read returns
 * an empty recap so the board still opens.
 */
import { eq, inArray, like, or } from "drizzle-orm";
import { episodeByWeek } from "@shared/season2Curriculum";
import { assembleWeekRecap, type WeekRecap, type WeekRecapRecording } from "@shared/weekRecap";
import { bounties, callInsights, events, recordings } from "../../drizzle/schema";
import { APP_BASE_URL } from "../_core/email";
import { logger } from "../_core/logger";
import { getDb } from "../db";

const log = logger("week-recap");

const OPEN_TASK = ["proposed", "accepted", "open"] as const;

export async function loadWeekRecap(week: number, origin = APP_BASE_URL): Promise<WeekRecap> {
  const title = episodeByWeek(week)?.title ?? `Week ${week}`;
  const empty = assembleWeekRecap({ week, title, origin, recordings: [] });
  const db = await getDb();
  if (!db) return empty;
  try {
    const rows = await db
      .select({
        id: recordings.id,
        title: recordings.title,
        aiSummary: recordings.aiSummary,
        overview: recordings.overview,
        actionItemsJson: recordings.actionItemsJson,
        youtubeUrl: recordings.youtubeUrl,
        youtubeVideoId: recordings.youtubeVideoId,
        editedYoutubeUrl: recordings.editedYoutubeUrl,
        editedYoutubeVideoId: recordings.editedYoutubeVideoId,
        eventTitle: events.title,
        season: events.season,
        episodeNumber: events.episodeNumber,
      })
      .from(recordings)
      .leftJoin(events, eq(events.recordingId, recordings.id))
      .where(or(
        like(recordings.title, `%S2E${week} %`),
        like(recordings.title, `%S2E${week}-%`),
        eq(events.episodeNumber, week),
        like(events.title, `%Week ${week}%`),
      ));

    const byId = new Map<number, WeekRecapRecording>();
    for (const row of rows) {
      const existing = byId.get(row.id);
      if (existing) {
        if (!existing.eventTitle && row.eventTitle) {
          existing.eventTitle = row.eventTitle;
          existing.season = row.season;
          existing.episodeNumber = row.episodeNumber;
        }
        continue;
      }
      byId.set(row.id, { ...row, insights: [], tasks: [] });
    }
    const ids = [...byId.keys()];
    if (ids.length === 0) return empty;

    const insightRows = await db
      .select({
        recordingId: callInsights.recordingId,
        kind: callInsights.kind,
        content: callInsights.content,
        speaker: callInsights.speaker,
        timestampSecs: callInsights.timestampSecs,
        status: callInsights.status,
      })
      .from(callInsights)
      .where(inArray(callInsights.recordingId, ids));
    for (const row of insightRows) {
      byId.get(row.recordingId)?.insights?.push(row);
    }

    const taskRows = await db
      .select({
        id: bounties.id,
        recordingId: bounties.recordingId,
        title: bounties.title,
        workStatus: bounties.workStatus,
      })
      .from(bounties)
      .where(inArray(bounties.recordingId, ids));
    const openTask = new Set<string>(OPEN_TASK);
    for (const row of taskRows) {
      if (row.recordingId == null || !openTask.has(row.workStatus)) continue;
      byId.get(row.recordingId)?.tasks?.push({ id: row.id, title: row.title, workStatus: row.workStatus });
    }

    return assembleWeekRecap({ week, title, origin, recordings: [...byId.values()] });
  } catch (err) {
    log.warn("week recap read failed", {
      week,
      message: err instanceof Error ? err.message : "unknown",
    });
    return empty;
  }
}
