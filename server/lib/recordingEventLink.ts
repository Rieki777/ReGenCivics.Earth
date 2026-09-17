/**
 * Safe recording ↔ event linking for Schedule Historical / admin honesty.
 *
 * Prefer clear keys only (no fuzzy title matching):
 *   1. Exact YouTube video id (event.youtubeUrl ↔ recording youtube / edited / videoId)
 *   2. Unique ±4h session window (recording.sessionDate ↔ event.startTime)
 *
 * When linking: set event.recordingId; fill event.youtubeUrl from the recording
 * when the event is missing one. Never steal a recordingId already owned by
 * another event. Never pick when more than one candidate matches.
 */
import { getDb } from "../db";
import { recordings, events } from "../../drizzle/schema";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { extractYoutubeVideoId } from "../../shared/youtubeVideoId";
import { logger } from "../_core/logger";

const log = logger("recording-event-link");

/** Match window used by finalize (forum path) — keep identical. */
export const RECORDING_EVENT_LINK_WINDOW_MS = 4 * 3600_000;

export type LinkCandidateEvent = {
  id: number;
  startTime: Date | null;
  youtubeUrl: string | null;
  recordingId: number | null;
  forumThreadId: number | null;
  status: string | null;
};

export type LinkCandidateRecording = {
  id: number;
  sessionDate: Date | null;
  youtubeUrl: string | null;
  editedYoutubeUrl: string | null;
  youtubeVideoId: string | null;
  riversideUrl: string | null;
};

export type LinkDecision =
  | { action: "none"; reason: string }
  | {
      action: "link";
      eventId: number;
      recordingId: number;
      reason: "youtube_id" | "unique_session_window";
      fillYoutubeUrl: string | null;
    };

/** Collect every YouTube id we can assert for a recording. */
export function recordingYoutubeIds(rec: {
  youtubeUrl?: string | null;
  editedYoutubeUrl?: string | null;
  youtubeVideoId?: string | null;
}): string[] {
  const ids = new Set<string>();
  for (const raw of [rec.youtubeVideoId, rec.youtubeUrl, rec.editedYoutubeUrl]) {
    const id = extractYoutubeVideoId(raw);
    if (id) ids.add(id);
  }
  return [...ids];
}

export function preferredRecordingYoutubeUrl(rec: {
  youtubeUrl?: string | null;
  editedYoutubeUrl?: string | null;
  youtubeVideoId?: string | null;
}): string | null {
  const edited = (rec.editedYoutubeUrl ?? "").trim();
  if (edited) return edited;
  const raw = (rec.youtubeUrl ?? "").trim();
  if (raw) return raw;
  const id = extractYoutubeVideoId(rec.youtubeVideoId);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

/**
 * Pure matcher: pick at most one unlinked event for this recording.
 * `events` should be unlinked (recordingId null) candidates the caller loaded.
 */
export function decideRecordingEventLink(
  recording: LinkCandidateRecording,
  candidates: LinkCandidateEvent[],
): LinkDecision {
  const unlinked = candidates.filter((e) => e.recordingId == null);
  if (unlinked.length === 0) {
    return { action: "none", reason: "no_unlinked_candidates" };
  }

  const recIds = recordingYoutubeIds(recording);
  if (recIds.length > 0) {
    const byYt = unlinked.filter((e) => {
      const eid = extractYoutubeVideoId(e.youtubeUrl);
      return !!eid && recIds.includes(eid);
    });
    if (byYt.length === 1) {
      return {
        action: "link",
        eventId: byYt[0].id,
        recordingId: recording.id,
        reason: "youtube_id",
        fillYoutubeUrl: byYt[0].youtubeUrl?.trim()
          ? null
          : preferredRecordingYoutubeUrl(recording),
      };
    }
    if (byYt.length > 1) {
      return { action: "none", reason: "ambiguous_youtube_match" };
    }
  }

  const session = recording.sessionDate;
  if (!(session instanceof Date) || !Number.isFinite(session.getTime())) {
    return { action: "none", reason: "no_session_date" };
  }
  const windowStart = session.getTime() - RECORDING_EVENT_LINK_WINDOW_MS;
  const windowEnd = session.getTime() + RECORDING_EVENT_LINK_WINDOW_MS;
  const byTime = unlinked.filter((e) => {
    if (!(e.startTime instanceof Date) || !Number.isFinite(e.startTime.getTime())) return false;
    const t = e.startTime.getTime();
    return t >= windowStart && t <= windowEnd;
  });
  if (byTime.length === 1) {
    return {
      action: "link",
      eventId: byTime[0].id,
      recordingId: recording.id,
      reason: "unique_session_window",
      fillYoutubeUrl: byTime[0].youtubeUrl?.trim()
        ? null
        : preferredRecordingYoutubeUrl(recording),
    };
  }
  if (byTime.length > 1) {
    return { action: "none", reason: "ambiguous_session_window" };
  }
  return { action: "none", reason: "no_match" };
}

/**
 * Pure reverse matcher: given an event with no recordingId, pick a unique recording.
 */
export function decideEventRecordingLink(
  event: LinkCandidateEvent,
  recordingsList: LinkCandidateRecording[],
  alreadyLinkedRecordingIds: Set<number>,
): LinkDecision {
  if (event.recordingId != null) {
    return { action: "none", reason: "already_linked" };
  }
  const free = recordingsList.filter((r) => !alreadyLinkedRecordingIds.has(r.id));

  const eventYt = extractYoutubeVideoId(event.youtubeUrl);
  if (eventYt) {
    const byYt = free.filter((r) => recordingYoutubeIds(r).includes(eventYt));
    if (byYt.length === 1) {
      return {
        action: "link",
        eventId: event.id,
        recordingId: byYt[0].id,
        reason: "youtube_id",
        fillYoutubeUrl: event.youtubeUrl?.trim()
          ? null
          : preferredRecordingYoutubeUrl(byYt[0]),
      };
    }
    if (byYt.length > 1) {
      return { action: "none", reason: "ambiguous_youtube_match" };
    }
  }

  if (!(event.startTime instanceof Date) || !Number.isFinite(event.startTime.getTime())) {
    return { action: "none", reason: "no_start_time" };
  }
  const windowStart = event.startTime.getTime() - RECORDING_EVENT_LINK_WINDOW_MS;
  const windowEnd = event.startTime.getTime() + RECORDING_EVENT_LINK_WINDOW_MS;
  const byTime = free.filter((r) => {
    if (!(r.sessionDate instanceof Date) || !Number.isFinite(r.sessionDate.getTime())) return false;
    const t = r.sessionDate.getTime();
    return t >= windowStart && t <= windowEnd;
  });
  if (byTime.length === 1) {
    return {
      action: "link",
      eventId: event.id,
      recordingId: byTime[0].id,
      reason: "unique_session_window",
      fillYoutubeUrl: event.youtubeUrl?.trim()
        ? null
        : preferredRecordingYoutubeUrl(byTime[0]),
    };
  }
  if (byTime.length > 1) {
    return { action: "none", reason: "ambiguous_session_window" };
  }
  return { action: "none", reason: "no_match" };
}

async function applyLink(decision: Extract<LinkDecision, { action: "link" }>): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;

  // Refuse if another event already owns this recordingId.
  const [owner] = await database
    .select({ id: events.id })
    .from(events)
    .where(eq(events.recordingId, decision.recordingId))
    .limit(1);
  if (owner && owner.id !== decision.eventId) {
    log.warn(
      `skip link recording ${decision.recordingId} → event ${decision.eventId}: owned by event ${owner.id}`,
    );
    return false;
  }

  const [target] = await database
    .select({ id: events.id, recordingId: events.recordingId, youtubeUrl: events.youtubeUrl })
    .from(events)
    .where(eq(events.id, decision.eventId))
    .limit(1);
  if (!target) return false;
  if (target.recordingId != null && target.recordingId !== decision.recordingId) {
    log.warn(`skip link: event ${decision.eventId} already has recording ${target.recordingId}`);
    return false;
  }

  const patch: {
    recordingId: number;
    status?: "completed";
    youtubeUrl?: string;
  } = { recordingId: decision.recordingId, status: "completed" };
  if (decision.fillYoutubeUrl && !(target.youtubeUrl ?? "").trim()) {
    patch.youtubeUrl = decision.fillYoutubeUrl;
  }

  await database.update(events).set(patch).where(eq(events.id, decision.eventId));
  log.info(
    `Linked recording ${decision.recordingId} → event ${decision.eventId} (${decision.reason})`,
  );
  return true;
}

/**
 * After ingest/finalize: link this recording to a uniquely matching unlinked event.
 * Safe to call repeatedly. Independent of forumPostId.
 */
export async function linkRecordingToMatchingEvent(recordingId: number): Promise<LinkDecision> {
  const database = await getDb();
  if (!database) return { action: "none", reason: "no_db" };

  const [rec] = await database
    .select({
      id: recordings.id,
      sessionDate: recordings.sessionDate,
      youtubeUrl: recordings.youtubeUrl,
      editedYoutubeUrl: recordings.editedYoutubeUrl,
      youtubeVideoId: recordings.youtubeVideoId,
      riversideUrl: recordings.riversideUrl,
    })
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);
  if (!rec) return { action: "none", reason: "recording_not_found" };

  // Already linked somewhere?
  const [existing] = await database
    .select({ id: events.id })
    .from(events)
    .where(eq(events.recordingId, recordingId))
    .limit(1);
  if (existing) {
    // Still fill youtubeUrl if missing on that event.
    const [ev] = await database
      .select({ id: events.id, youtubeUrl: events.youtubeUrl })
      .from(events)
      .where(eq(events.id, existing.id))
      .limit(1);
    const fill = preferredRecordingYoutubeUrl(rec);
    if (ev && fill && !(ev.youtubeUrl ?? "").trim()) {
      await database.update(events).set({ youtubeUrl: fill }).where(eq(events.id, ev.id));
      log.info(`Filled youtubeUrl on already-linked event ${ev.id} from recording ${recordingId}`);
    }
    return { action: "none", reason: "recording_already_linked" };
  }

  const session = rec.sessionDate instanceof Date ? rec.sessionDate : null;
  const recIds = recordingYoutubeIds(rec);

  // Load a bounded set of unlinked events, then filter in memory by exact keys.
  const rows = await database
    .select({
      id: events.id,
      startTime: events.startTime,
      youtubeUrl: events.youtubeUrl,
      recordingId: events.recordingId,
      forumThreadId: events.forumThreadId,
      status: events.status,
    })
    .from(events)
    .where(and(isNull(events.recordingId), ne(events.status, "cancelled")))
    .orderBy(sql`${events.startTime} DESC`)
    .limit(200);

  const candidates = rows.filter((e) => {
    if (e.recordingId != null) return false;
    const inWindow =
      !!session &&
      e.startTime instanceof Date &&
      e.startTime.getTime() >= session.getTime() - RECORDING_EVENT_LINK_WINDOW_MS &&
      e.startTime.getTime() <= session.getTime() + RECORDING_EVENT_LINK_WINDOW_MS;
    const eid = extractYoutubeVideoId(e.youtubeUrl);
    const ytMatch = !!eid && recIds.includes(eid);
    return inWindow || ytMatch;
  });

  const decision = decideRecordingEventLink(rec, candidates);
  if (decision.action === "link") {
    await applyLink(decision);
  }
  return decision;
}

/**
 * Backfill: for past/unlinked events, link unique matches. Returns counts.
 */
export async function repairPastEventRecordingLinks(opts?: {
  limit?: number;
}): Promise<{ examined: number; linked: number; filledYoutubeOnly: number }> {
  const database = await getDb();
  if (!database) return { examined: 0, linked: 0, filledYoutubeOnly: 0 };
  const limit = opts?.limit ?? 100;

  const unlinked = await database
    .select({
      id: events.id,
      startTime: events.startTime,
      youtubeUrl: events.youtubeUrl,
      recordingId: events.recordingId,
      forumThreadId: events.forumThreadId,
      status: events.status,
    })
    .from(events)
    .where(and(isNull(events.recordingId), ne(events.status, "cancelled")))
    .orderBy(sql`${events.startTime} DESC`)
    .limit(limit);

  const allRecs = await database
    .select({
      id: recordings.id,
      sessionDate: recordings.sessionDate,
      youtubeUrl: recordings.youtubeUrl,
      editedYoutubeUrl: recordings.editedYoutubeUrl,
      youtubeVideoId: recordings.youtubeVideoId,
      riversideUrl: recordings.riversideUrl,
    })
    .from(recordings)
    .limit(500);

  const linkedOwners = await database
    .select({ recordingId: events.recordingId })
    .from(events)
    .where(sql`${events.recordingId} IS NOT NULL`);
  const owned = new Set(
    linkedOwners.map((r) => r.recordingId).filter((id): id is number => id != null),
  );

  let linked = 0;
  let filledYoutubeOnly = 0;
  for (const ev of unlinked) {
    const decision = decideEventRecordingLink(ev, allRecs, owned);
    if (decision.action === "link") {
      const ok = await applyLink(decision);
      if (ok) {
        linked += 1;
        owned.add(decision.recordingId);
      }
    }
  }

  // Second pass: events that already have recordingId but missing youtubeUrl.
  const linkedMissingYt = await database
    .select({
      id: events.id,
      recordingId: events.recordingId,
      youtubeUrl: events.youtubeUrl,
    })
    .from(events)
    .where(
      and(
        sql`${events.recordingId} IS NOT NULL`,
        or(isNull(events.youtubeUrl), eq(events.youtubeUrl, "")),
      ),
    )
    .limit(limit);

  for (const ev of linkedMissingYt) {
    if (ev.recordingId == null) continue;
    const rec = allRecs.find((r) => r.id === ev.recordingId);
    const fill = rec ? preferredRecordingYoutubeUrl(rec) : null;
    if (!fill) continue;
    await database.update(events).set({ youtubeUrl: fill }).where(eq(events.id, ev.id));
    filledYoutubeOnly += 1;
  }

  return { examined: unlinked.length, linked, filledYoutubeOnly };
}

/**
 * Public Schedule helper: resolve recording for an event by recordingId, else
 * unique YouTube id match (read-only — does not write links).
 */
export async function findRecordingForEventPublic(eventId: number): Promise<{
  id: number;
  title: string;
  youtubeUrl: string | null;
  editedYoutubeUrl: string | null;
  riversideUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  overview: string | null;
  aiSummary: string | null;
  forumPostId: number | null;
} | null> {
  const database = await getDb();
  if (!database) return null;

  const [event] = await database
    .select({
      recordingId: events.recordingId,
      youtubeUrl: events.youtubeUrl,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return null;

  const selectCols = {
    id: recordings.id,
    title: recordings.title,
    youtubeUrl: recordings.youtubeUrl,
    editedYoutubeUrl: recordings.editedYoutubeUrl,
    riversideUrl: recordings.riversideUrl,
    thumbnailUrl: recordings.thumbnailUrl,
    durationSeconds: recordings.durationSeconds,
    overview: recordings.overview,
    aiSummary: recordings.aiSummary,
    forumPostId: recordings.forumPostId,
    youtubeVideoId: recordings.youtubeVideoId,
  };

  if (event.recordingId) {
    const [recording] = await database
      .select(selectCols)
      .from(recordings)
      .where(eq(recordings.id, event.recordingId))
      .limit(1);
    if (recording) {
      const { youtubeVideoId: _vid, ...publicFields } = recording;
      return publicFields;
    }
  }

  const eventYt = extractYoutubeVideoId(event.youtubeUrl);
  if (!eventYt) return null;

  // Soft match: only when exactly one recording shares this video id.
  const rows = await database.select(selectCols).from(recordings).limit(300);
  const matches = rows.filter((r) => recordingYoutubeIds(r).includes(eventYt));
  if (matches.length !== 1) return null;
  const { youtubeVideoId: _vid, ...publicFields } = matches[0];
  return publicFields;
}
