/**
 * Upsert an Outbound newsletter draft summarizing a finalized recording.
 * Never sends. Idempotent via newsletter_issues.idempotency_key.
 */
import { getDb } from "../db";
import { recordings, events, newsletterIssues } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  buildPostSessionLetter,
  postSessionLetterIdempotencyKey,
} from "../../shared/postSessionLetter";
import { preferredRecordingYoutubeUrl } from "./recordingEventLink";
import { logger } from "../_core/logger";

const log = logger("post-session-letter");

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function draftPostSessionLetter(opts: {
  recordingId: number;
  createdBy: number;
  /** When true, refresh subject/body on an existing draft. Default true for admin button. */
  refreshDraft?: boolean;
}): Promise<{
  id: number;
  created: boolean;
  subject: string;
  body: string;
  layout: "announcement" | string;
  writeHref: string;
}> {
  const database = await getDb();
  if (!database) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }

  const [rec] = await database
    .select()
    .from(recordings)
    .where(eq(recordings.id, opts.recordingId))
    .limit(1);
  if (!rec) throw new TRPCError({ code: "NOT_FOUND", message: "Recording not found" });

  const [linkedEvent] = await database
    .select({
      id: events.id,
      type: events.type,
      season: events.season,
      title: events.title,
      youtubeUrl: events.youtubeUrl,
    })
    .from(events)
    .where(eq(events.recordingId, opts.recordingId))
    .limit(1);

  const watchUrl =
    preferredRecordingYoutubeUrl(rec) ||
    (linkedEvent?.youtubeUrl ?? "").trim() ||
    (rec.riversideUrl ?? "").trim() ||
    null;

  const letter = buildPostSessionLetter({
    recordingId: rec.id,
    title: rec.title,
    sessionDate: rec.sessionDate,
    overview: rec.overview,
    aiSummary: rec.aiSummary,
    actionItems: parseJsonArray(rec.actionItemsJson),
    chapters: parseJsonArray(rec.chaptersJson),
    watchUrl,
    event: linkedEvent
      ? { type: linkedEvent.type, season: linkedEvent.season, title: linkedEvent.title }
      : { title: rec.title },
  });

  const key = postSessionLetterIdempotencyKey(rec.id);
  const [existing] = await database
    .select()
    .from(newsletterIssues)
    .where(eq(newsletterIssues.idempotencyKey, key))
    .limit(1);

  const writeHref = `/admin?tab=outbound&surface=write`;

  if (existing) {
    if (existing.status !== "draft") {
      // Already scheduled/sent — do not spawn a duplicate.
      log.info(`post-session letter for recording ${rec.id} already ${existing.status} (issue ${existing.id})`);
      return {
        id: existing.id,
        created: false,
        subject: existing.subject,
        body: existing.body,
        layout: existing.layout,
        writeHref,
      };
    }
    if (opts.refreshDraft !== false) {
      await database
        .update(newsletterIssues)
        .set({
          subject: letter.subject,
          body: letter.body,
          layout: letter.layout,
          templateKey: letter.templateKey,
        })
        .where(eq(newsletterIssues.id, existing.id));
      return {
        id: existing.id,
        created: false,
        subject: letter.subject,
        body: letter.body,
        layout: letter.layout,
        writeHref,
      };
    }
    return {
      id: existing.id,
      created: false,
      subject: existing.subject,
      body: existing.body,
      layout: existing.layout,
      writeHref,
    };
  }

  const inserted = await database.insert(newsletterIssues).values({
    subject: letter.subject,
    body: letter.body,
    layout: letter.layout,
    templateKey: letter.templateKey,
    audience: { sources: [], activeOnly: true },
    status: "draft",
    idempotencyKey: key,
    createdBy: opts.createdBy,
  });
  const id = Number((inserted as Array<{ insertId: number }>)[0]?.insertId);
  log.info(`Created post-session draft ${id} for recording ${rec.id}`);
  return {
    id,
    created: true,
    subject: letter.subject,
    body: letter.body,
    layout: letter.layout,
    writeHref,
  };
}

/**
 * Best-effort auto-draft after finalize when overview/summary exists.
 * Never throws to callers; never sends.
 */
export async function maybeAutoDraftPostSessionLetter(
  recordingId: number,
  createdBy = 1,
): Promise<void> {
  try {
    const database = await getDb();
    if (!database) return;
    const [rec] = await database
      .select({
        id: recordings.id,
        overview: recordings.overview,
        aiSummary: recordings.aiSummary,
      })
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    if (!rec) return;
    const hasSummary = !!(rec.overview ?? "").trim() || !!(rec.aiSummary ?? "").trim();
    if (!hasSummary) return;
    await draftPostSessionLetter({ recordingId, createdBy, refreshDraft: false });
  } catch (err) {
    log.error(`auto draft post-session letter failed for ${recordingId}:`, err);
  }
}
