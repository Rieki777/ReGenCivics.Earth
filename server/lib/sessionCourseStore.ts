/**
 * Read and write a week's course map.
 * The public board works from the week 2 seed when the tables are not applied yet.
 * Auto-map runs after a recording is ingested. It never replaces a time an admin saved.
 */
import { and, eq, like, or } from "drizzle-orm";
import { getDb } from "../db";
import { events, recordings, sessionCourseMaps, sessionCourseProgress, sessionCourseSpans } from "../../drizzle/schema";
import {
  LAST_BOARD_WEEK,
  SESSION_BOARD_SEASON,
  boardStages,
  hasSessionBoard,
} from "@shared/sessionBoard";
import {
  courseSideFromRecording,
  courseWeekFromRecording,
  emptySpan,
  publishedSpan,
  seedCourse,
  videoIdFor,
  type CourseConfidence,
  type CourseMap,
  type CourseSpan,
} from "@shared/sessionCourse";
import { extractYoutubeVideoId } from "@shared/youtubeVideoId";
import { mapStagesToSide, mergeMappedSide, type MapChapter, type MapSegment } from "@shared/sessionCourseMap";
import { fetchPublicChapters } from "./sessionCourseFetch";
import { loadYouTubeTranscript } from "./youtubeCaptions";
import { isMissingSchema } from "./schemaTolerance";
import { logger } from "../_core/logger";

const log = logger("session-course");

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function isMissingTable(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && cur && "code" in cur && (cur as { code?: string }).code === "ER_NO_SUCH_TABLE") return true;
    if (cur instanceof Error) {
      if (/session_course_/i.test(cur.message) && /doesn't exist|does not exist|ER_NO_SUCH_TABLE/i.test(cur.message)) return true;
      cur = cur.cause;
      continue;
    }
    break;
  }
  return false;
}

function asConfidence(value: string | null | undefined): CourseConfidence | null {
  return value === "high" || value === "low" ? value : null;
}

function rowToSpan(row: typeof sessionCourseSpans.$inferSelect): CourseSpan {
  const liveConfidence = asConfidence(row.liveConfidence);
  const editedConfidence = asConfidence(row.editedConfidence);
  const confidence = asConfidence(row.confidence) ?? "low";
  return {
    stageIndex: row.stageIndex,
    liveStart: row.liveStart,
    liveEnd: row.liveEnd,
    editedStart: row.editedStart,
    editedEnd: row.editedEnd,
    liveConfidence,
    editedConfidence,
    confidence,
    evidence: row.evidence ?? "",
    adminEdited: row.adminEdited === 1,
  };
}

function alignSpans(week: number, spans: CourseSpan[]): CourseSpan[] {
  const byIndex = new Map(spans.map((span) => [span.stageIndex, span]));
  return boardStages(week).map((_, index) => byIndex.get(index) ?? emptySpan(index));
}

async function readMap(db: Db, week: number): Promise<CourseMap | null> {
  const [map] = await db
    .select()
    .from(sessionCourseMaps)
    .where(and(eq(sessionCourseMaps.season, SESSION_BOARD_SEASON), eq(sessionCourseMaps.week, week)))
    .limit(1);
  if (!map) return null;
  const rows = await db
    .select()
    .from(sessionCourseSpans)
    .where(and(eq(sessionCourseSpans.season, SESSION_BOARD_SEASON), eq(sessionCourseSpans.week, week)));
  return {
    season: SESSION_BOARD_SEASON,
    week,
    liveVideoId: map.liveVideoId,
    editedVideoId: map.editedVideoId,
    spans: alignSpans(week, rows.map(rowToSpan)),
  };
}

export async function getCourseMap(week: number): Promise<CourseMap | null> {
  const seed = seedCourse(week);
  if (!seed) return null;
  const db = await getDb();
  if (!db) return seed;
  try {
    return (await readMap(db, week)) ?? seed;
  } catch (err) {
    if (isMissingTable(err)) return seed;
    throw err;
  }
}

/** Hide times that are not ready for the public player. */
export function presentCourse(map: CourseMap): CourseMap {
  return {
    ...map,
    liveVideoId: videoIdFor(map, "live"),
    editedVideoId: videoIdFor(map, "edited"),
    spans: map.spans.map((span) => {
      const live = publishedSpan(span, "live");
      const edited = publishedSpan(span, "edited");
      return {
        ...span,
        liveStart: live?.start ?? null,
        liveEnd: live ? live.end : null,
        editedStart: edited?.start ?? null,
        editedEnd: edited ? edited.end : null,
        liveConfidence: live ? (span.liveConfidence ?? "high") : null,
        editedConfidence: edited ? (span.editedConfidence ?? "high") : null,
        evidence: live || edited ? span.evidence : "",
      };
    }),
  };
}

function cleanId(value: string | null | undefined): string | null {
  const id = extractYoutubeVideoId(value);
  return id;
}

function cleanSeconds(value: number | null): number | null {
  if (value == null || !Number.isInteger(value) || value < 0 || value > 24 * 3600) return null;
  return value;
}

export type CourseSpanInput = {
  stageIndex: number;
  liveStart: number | null;
  liveEnd: number | null;
  editedStart: number | null;
  editedEnd: number | null;
  evidence: string;
};

function confidenceOf(span: CourseSpan): CourseConfidence {
  const low = (span.liveStart != null && span.liveConfidence === "low")
    || (span.editedStart != null && span.editedConfidence === "low");
  const any = span.liveStart != null || span.editedStart != null;
  if (!any) return "low";
  return low ? "low" : "high";
}

function applyAdminSpan(prev: CourseSpan | undefined, input: CourseSpanInput): CourseSpan {
  const base = prev ?? emptySpan(input.stageIndex);
  const liveStart = cleanSeconds(input.liveStart);
  const editedStart = cleanSeconds(input.editedStart);
  const liveEndRaw = cleanSeconds(input.liveEnd);
  const editedEndRaw = cleanSeconds(input.editedEnd);
  const liveEnd = liveStart != null && liveEndRaw != null && liveEndRaw > liveStart ? liveEndRaw : null;
  const editedEnd = editedStart != null && editedEndRaw != null && editedEndRaw > editedStart ? editedEndRaw : null;
  const liveChanged = base.liveStart !== liveStart || base.liveEnd !== liveEnd;
  const editedChanged = base.editedStart !== editedStart || base.editedEnd !== editedEnd;
  const evidence = input.evidence.replace(/\s+/g, " ").trim().slice(0, 500);
  const evidenceChanged = (base.evidence || "") !== evidence;
  const touched = liveChanged || editedChanged || evidenceChanged;
  const next: CourseSpan = {
    stageIndex: input.stageIndex,
    liveStart,
    liveEnd,
    editedStart,
    editedEnd,
    liveConfidence: liveStart == null ? null : liveChanged ? "high" : (base.liveConfidence ?? (base.confidence === "high" ? "high" : "low")),
    editedConfidence: editedStart == null ? null : editedChanged ? "high" : (base.editedConfidence ?? (base.confidence === "high" ? "high" : "low")),
    confidence: "low",
    evidence: evidence || base.evidence,
    adminEdited: touched ? true : base.adminEdited,
  };
  next.confidence = confidenceOf(next);
  return next;
}

async function writeMap(db: Db, map: CourseMap): Promise<void> {
  await db
    .insert(sessionCourseMaps)
    .values({
      season: map.season,
      week: map.week,
      liveVideoId: map.liveVideoId,
      editedVideoId: map.editedVideoId,
    })
    .onDuplicateKeyUpdate({
      set: { liveVideoId: map.liveVideoId, editedVideoId: map.editedVideoId },
    });
  for (const span of map.spans) {
    await db
      .insert(sessionCourseSpans)
      .values({
        season: map.season,
        week: map.week,
        stageIndex: span.stageIndex,
        liveStart: span.liveStart,
        liveEnd: span.liveEnd,
        editedStart: span.editedStart,
        editedEnd: span.editedEnd,
        liveConfidence: span.liveConfidence,
        editedConfidence: span.editedConfidence,
        confidence: span.confidence,
        evidence: span.evidence.slice(0, 500),
        adminEdited: span.adminEdited ? 1 : 0,
      })
      .onDuplicateKeyUpdate({
        set: {
          liveStart: span.liveStart,
          liveEnd: span.liveEnd,
          editedStart: span.editedStart,
          editedEnd: span.editedEnd,
          liveConfidence: span.liveConfidence,
          editedConfidence: span.editedConfidence,
          confidence: span.confidence,
          evidence: span.evidence.slice(0, 500),
          adminEdited: span.adminEdited ? 1 : 0,
        },
      });
  }
}

export async function saveCourseMap(input: {
  week: number;
  liveVideoId: string | null;
  editedVideoId: string | null;
  spans: CourseSpanInput[];
}): Promise<CourseMap> {
  if (!hasSessionBoard(input.week)) throw new Error("That week has no board.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let existing: CourseMap | null = null;
  try {
    existing = await readMap(db, input.week);
  } catch (err) {
    if (isMissingTable(err)) throw new Error("Apply drizzle/0289_session_course.sql");
    throw err;
  }
  const base = existing ?? seedCourse(input.week);
  if (!base) throw new Error("That week has no board.");
  const byIndex = new Map(base.spans.map((span) => [span.stageIndex, span]));
  const spans = boardStages(input.week).map((_, index) => {
    const row = input.spans.find((span) => span.stageIndex === index);
    if (!row) return byIndex.get(index) ?? emptySpan(index);
    return applyAdminSpan(byIndex.get(index), row);
  });
  const map: CourseMap = {
    season: SESSION_BOARD_SEASON,
    week: input.week,
    liveVideoId: cleanId(input.liveVideoId),
    editedVideoId: cleanId(input.editedVideoId),
    spans,
  };
  try {
    await writeMap(db, map);
  } catch (err) {
    if (isMissingTable(err)) throw new Error("Apply drizzle/0289_session_course.sql");
    throw err;
  }
  return map;
}

export async function courseProgress(userId: number, week: number): Promise<number[]> {
  const db = await getDb();
  if (!db || !hasSessionBoard(week)) return [];
  try {
    const rows = await db
      .select({ stageIndex: sessionCourseProgress.stageIndex })
      .from(sessionCourseProgress)
      .where(and(
        eq(sessionCourseProgress.userId, userId),
        eq(sessionCourseProgress.season, SESSION_BOARD_SEASON),
        eq(sessionCourseProgress.week, week),
      ));
    return rows.map((row) => row.stageIndex);
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

export async function markCourseWatched(userId: number, week: number, stageIndex: number): Promise<boolean> {
  const stages = hasSessionBoard(week) ? boardStages(week) : [];
  if (!stages.length || stageIndex < 0 || stageIndex >= stages.length) return false;
  const db = await getDb();
  if (!db) return false;
  try {
    await db
      .insert(sessionCourseProgress)
      .values({ userId, season: SESSION_BOARD_SEASON, week, stageIndex })
      .onDuplicateKeyUpdate({ set: { watchedAt: new Date() } });
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

function chaptersFromJson(raw: unknown): MapChapter[] {
  if (!Array.isArray(raw)) return [];
  const out: MapChapter[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const tSeconds = Number((row as { tSeconds?: unknown }).tSeconds);
    const title = String((row as { title?: unknown }).title ?? "").trim();
    if (!Number.isFinite(tSeconds) || !title) continue;
    out.push({ tSeconds, title: title.slice(0, 200) });
  }
  return out;
}

function segmentsFromJson(raw: unknown): MapSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: MapSegment[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const start = Number((row as { start?: unknown }).start);
    const text = String((row as { text?: unknown }).text ?? "").trim();
    if (!Number.isFinite(start) || !text) continue;
    out.push({ start, text: text.slice(0, 500) });
  }
  return out;
}

/**
 * After ingest or reprocess: map this recording onto its week's board.
 * High-confidence matches are what the public player shows. Low ones stay
 * on the row for an admin to review. A hand-saved time is left as it is.
 */
export async function mapRecordingOntoCourse(recordingId: number): Promise<{ updated: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { updated: false, reason: "no_db" };
  const [rec] = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      youtubeVideoId: recordings.youtubeVideoId,
      youtubeUrl: recordings.youtubeUrl,
      editedYoutubeUrl: recordings.editedYoutubeUrl,
      recordingKind: recordings.recordingKind,
      transcriptJson: recordings.transcriptJson,
      chaptersJson: recordings.chaptersJson,
      durationSeconds: recordings.durationSeconds,
    })
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);
  if (!rec) return { updated: false, reason: "not_found" };

  const [event] = await db
    .select({ season: events.season, episodeNumber: events.episodeNumber, title: events.title })
    .from(events)
    .where(eq(events.recordingId, recordingId))
    .limit(1);

  const week = courseWeekFromRecording({
    title: rec.title,
    eventTitle: event?.title,
    season: event?.season,
    episodeNumber: event?.episodeNumber,
  });
  if (week == null) return { updated: false, reason: "no_week" };

  const side = courseSideFromRecording(rec);
  const videoId = side === "edited"
    ? extractYoutubeVideoId(rec.editedYoutubeUrl) ?? extractYoutubeVideoId(rec.youtubeVideoId) ?? extractYoutubeVideoId(rec.youtubeUrl)
    : extractYoutubeVideoId(rec.youtubeVideoId) ?? extractYoutubeVideoId(rec.youtubeUrl);
  if (!videoId) return { updated: false, reason: "no_video" };

  let chapters: MapChapter[] = [];
  try {
    chapters = await fetchPublicChapters(videoId);
  } catch {
    chapters = [];
  }
  if (chapters.length === 0) chapters = await readDescriptionChapters(db, recordingId);
  if (chapters.length === 0) chapters = chaptersFromJson(rec.chaptersJson);

  let segments = segmentsFromJson(rec.transcriptJson);
  if (segments.length === 0) {
    try {
      const loaded = await loadYouTubeTranscript(videoId);
      if (loaded.ok && loaded.segments.length) {
        segments = loaded.segments.map((row) => ({ start: row.start, text: row.text }));
      }
    } catch {
      segments = [];
    }
  }
  if (chapters.length === 0 && segments.length === 0) return { updated: false, reason: "no_captions" };

  let existing: CourseMap | null = null;
  try {
    existing = await readMap(db, week);
  } catch (err) {
    if (isMissingTable(err)) return { updated: false, reason: "migration" };
    throw err;
  }
  const base = existing ?? seedCourse(week);
  if (!base) return { updated: false, reason: "no_board" };

  const mapped = mapStagesToSide(boardStages(week), side, {
    chapters,
    segments,
    durationSeconds: rec.durationSeconds,
  });
  const spans = mergeMappedSide(base.spans, mapped, side);
  const map: CourseMap = {
    season: SESSION_BOARD_SEASON,
    week,
    liveVideoId: side === "live" ? (base.liveVideoId ?? videoId) : base.liveVideoId,
    editedVideoId: side === "edited" ? (base.editedVideoId ?? videoId) : base.editedVideoId,
    spans,
  };
  try {
    await writeMap(db, map);
  } catch (err) {
    if (isMissingTable(err)) return { updated: false, reason: "migration" };
    throw err;
  }
  log.info(`Course map week ${week} ${side} from recording ${recordingId}`);
  return { updated: true };
}

async function readDescriptionChapters(db: Db, recordingId: number): Promise<MapChapter[]> {
  try {
    const [row] = await db
      .select({ descriptionChaptersJson: recordings.descriptionChaptersJson })
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    return chaptersFromJson(row?.descriptionChaptersJson);
  } catch (err) {
    if (isMissingSchema(err)) return [];
    throw err;
  }
}

/**
 * Re-map recordings whose live side has a video and no published times.
 * Used after the channel owner connects, and from the admin "Map times now" button.
 * Missing course tables return without throwing so the OAuth redirect can finish.
 */
export async function remapUnmappedLiveCourses(): Promise<{ updated: number; reason?: string }> {
  const db = await getDb();
  if (!db) return { updated: 0, reason: "no_db" };
  let updated = 0;
  try {
    for (let week = 2; week <= LAST_BOARD_WEEK; week++) {
      if (!hasSessionBoard(week)) continue;
      const map = await getCourseMap(week);
      const videoId = map?.liveVideoId ?? "";
      if (!map || !/^[\w-]{11}$/.test(videoId)) continue;
      if (map.spans.some((span) => publishedSpan(span, "live"))) continue;
      const rows = await db
        .select({
          id: recordings.id,
          title: recordings.title,
          youtubeVideoId: recordings.youtubeVideoId,
          youtubeUrl: recordings.youtubeUrl,
          editedYoutubeUrl: recordings.editedYoutubeUrl,
          recordingKind: recordings.recordingKind,
        })
        .from(recordings)
        .where(or(eq(recordings.youtubeVideoId, videoId), like(recordings.youtubeUrl, `%${videoId}%`)))
        .limit(5);
      const live = rows.find((row) => courseSideFromRecording(row) === "live");
      if (!live) continue;
      const result = await mapRecordingOntoCourse(live.id);
      if (result.reason === "migration") return { updated, reason: "migration" };
      if (result.updated) updated += 1;
    }
  } catch (err) {
    if (isMissingTable(err) || isMissingSchema(err)) return { updated, reason: "migration" };
    throw err;
  }
  return { updated };
}
