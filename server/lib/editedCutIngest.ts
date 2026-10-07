/**
 * Poll hook: a non-live upload that matches a session we already have
 * becomes that recording's edited cut. It does not insert a second row,
 * and it does not wait on a transcript.
 */
import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { events, recordingCutEvents, recordings } from "../../drizzle/schema";
import {
  encodeCutMatch,
  sendEditedRecordingEmail,
} from "./editedCutEmailSend";
import {
  matchEditedCut,
  priorLetterAlreadySent,
  sessionLabelForCut,
  type CutEvent,
  type CutRecording,
} from "../../shared/editedCut";
import type { RssEntry } from "../jobs/coordinationPipeline";

type Db = NonNullable<Awaited<ReturnType<typeof import("../db").getDb>>>;

type CacheRecording = CutRecording & { editedEmailSent: number };

export type EditedCutCache = {
  recordings: CacheRecording[];
  events: CutEvent[];
};

const POOL_MS = 21 * 24 * 60 * 60 * 1000;

export async function loadEditedCutCache(db: Db): Promise<EditedCutCache> {
  const since = new Date(Date.now() - POOL_MS);
  const recRows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      sessionDate: recordings.sessionDate,
      youtubeVideoId: recordings.youtubeVideoId,
      editedYoutubeVideoId: recordings.editedYoutubeVideoId,
      editedEmailSent: recordings.editedEmailSent,
    })
    .from(recordings)
    .where(gte(recordings.createdAt, since));

  const eventRows = await db
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      recordingId: events.recordingId,
      episodeNumber: events.episodeNumber,
    })
    .from(events)
    .where(gte(events.startTime, since));

  const have = new Set(recRows.map((row) => row.id));
  const missingIds = eventRows
    .map((row) => row.recordingId)
    .filter((id): id is number => id != null && !have.has(id));
  const extra = missingIds.length
    ? await db
      .select({
        id: recordings.id,
        title: recordings.title,
        sessionDate: recordings.sessionDate,
        youtubeVideoId: recordings.youtubeVideoId,
        editedYoutubeVideoId: recordings.editedYoutubeVideoId,
        editedEmailSent: recordings.editedEmailSent,
      })
      .from(recordings)
      .where(inArray(recordings.id, missingIds))
    : [];

  return {
    recordings: [...recRows, ...extra].map((row) => ({
      id: row.id,
      title: row.title,
      sessionDate: row.sessionDate,
      youtubeVideoId: row.youtubeVideoId,
      editedYoutubeVideoId: row.editedYoutubeVideoId,
      editedEmailSent: row.editedEmailSent,
    })),
    events: eventRows.map((row) => ({
      id: row.id,
      title: row.title,
      startTime: row.startTime,
      recordingId: row.recordingId,
      episodeNumber: row.episodeNumber,
    })),
  };
}

export type EditedCutPollResult =
  | { action: "none" }
  | { action: "already"; emailError?: string }
  | { action: "attached"; emailError?: string };

export async function handleEditedCutPoll(
  db: Db,
  entry: RssEntry,
  cache: EditedCutCache,
): Promise<EditedCutPollResult> {
  if (priorLetterAlreadySent(entry.videoId)) return { action: "already" };

  const rows = cache.recordings;
  const already = rows.find((row) => row.editedYoutubeVideoId === entry.videoId);
  if (already) {
    if (!already.editedEmailSent) {
      try {
        const sent = await sendEditedRecordingEmail(already.id, { cutTitle: entry.title });
        if (sent.dropped === 0) already.editedEmailSent = 1;
        if (sent.dropped > 0) {
          return { action: "already", emailError: `edited email incomplete for ${entry.videoId}: dropped ${sent.dropped}` };
        }
      } catch (err) {
        return { action: "already", emailError: `edited email ${entry.videoId}: ${(err as Error).message}` };
      }
    }
    return { action: "already" };
  }

  const publishedAt = new Date(entry.publishedAt);
  if (Number.isNaN(publishedAt.getTime())) return { action: "none" };
  const match = matchEditedCut(
    { videoId: entry.videoId, title: entry.title, publishedAt },
    cache.recordings,
    cache.events,
  );
  if (!match) return { action: "none" };

  const target = rows.find((row) => row.id === match.recordingId);
  const event = match.eventId ? cache.events.find((row) => row.id === match.eventId) : undefined;
  const label = sessionLabelForCut({
    cutTitle: entry.title,
    eventTitle: event?.title,
    recordingTitle: target?.title,
  });
  const editedYoutubeUrl = `https://www.youtube.com/watch?v=${entry.videoId}`;
  await db
    .update(recordings)
    .set({
      editedYoutubeUrl,
      editedYoutubeVideoId: entry.videoId,
      editedCutAttachedAt: new Date(),
      editedCutMatch: encodeCutMatch(label, match.reason),
    })
    .where(eq(recordings.id, match.recordingId));

  await db.insert(recordingCutEvents).values({
    recordingId: match.recordingId,
    action: "attached",
    youtubeVideoId: entry.videoId,
    detail: `${match.reason} ${entry.title}`.slice(0, 500),
  });

  if (match.eventId) {
    await db
      .update(events)
      .set({
        recordingId: match.recordingId,
        youtubeUrl: editedYoutubeUrl,
        status: "completed",
      })
      .where(and(
        eq(events.id, match.eventId),
        or(isNull(events.recordingId), eq(events.recordingId, match.recordingId)),
      ));
    const cached = cache.events.find((row) => row.id === match.eventId);
    if (cached && (cached.recordingId == null || cached.recordingId === match.recordingId)) {
      cached.recordingId = match.recordingId;
    }
  }

  if (target) {
    target.editedYoutubeVideoId = entry.videoId;
    target.editedEmailSent = 0;
  } else {
    rows.push({
      id: match.recordingId,
      title: entry.title,
      sessionDate: publishedAt,
      youtubeVideoId: null,
      editedYoutubeVideoId: entry.videoId,
      editedEmailSent: 0,
    });
  }

  let emailError: string | undefined;
  try {
    const sent = await sendEditedRecordingEmail(match.recordingId, { cutTitle: entry.title });
    if (sent.dropped === 0 && target) target.editedEmailSent = 1;
    if (sent.dropped > 0) emailError = `edited email incomplete for ${entry.videoId}: dropped ${sent.dropped}`;
  } catch (err) {
    emailError = `edited email ${entry.videoId}: ${(err as Error).message}`;
  }
  return emailError ? { action: "attached", emailError } : { action: "attached" };
}
