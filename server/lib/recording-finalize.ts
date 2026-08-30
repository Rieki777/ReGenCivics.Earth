/**
 * Shared "finalize a recording" path.
 *
 * Matches or creates the community forum thread, links the matching event,
 * emails subscribers, and announces on channels. Called by BOTH ingest paths:
 *   - the Riverside webhook (server/webhooks/riverside.ts), and
 *   - the YouTube-poll coordination pipeline (server/jobs/coordinationPipeline.ts),
 * so a recording is published to the community exactly once regardless of how
 * it was ingested.
 *
 * Idempotent via the recording's own guards: `forumPostId` (forum/event step)
 * and `emailSent` (email step). Safe to call repeatedly on the same recording.
 */
import { getDb } from "../db";
import * as db from "../db";
import { recordings, events, forumCategories } from "../../drizzle/schema";
import { eq, gte, lte, isNotNull, and } from "drizzle-orm";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { notifyRecordingReady } from "../_core/notify";
import { logger } from "../_core/logger";

const log = logger("recording-finalize");

type RecordingRow = typeof recordings.$inferSelect;

/**
 * Run the community-publish + event-link steps for a recording that is already
 * ingested (row exists). Forum thread, subscriber email, and channel notify.
 */
export async function finalizeRecording(recordingId: number): Promise<void> {
  const database = await getDb();
  if (!database) {
    log.error("Database unavailable");
    return;
  }
  const [recording] = await database
    .select()
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);
  if (!recording) {
    log.warn(`finalizeRecording: recording ${recordingId} not found`);
    return;
  }

  // ── 1. Forum thread: reply to a matched event thread, or create a fresh post ──
  if (!recording.forumPostId) {
    try {
      const recordingTime = recording.sessionDate instanceof Date ? recording.sessionDate : new Date();
      const windowStart = new Date(recordingTime.getTime() - 4 * 3600000);
      const windowEnd = new Date(recordingTime.getTime() + 4 * 3600000);

      const [matchedEvent] = await database
        .select({ forumThreadId: events.forumThreadId, id: events.id })
        .from(events)
        .where(and(
          gte(events.startTime, windowStart),
          lte(events.startTime, windowEnd),
          isNotNull(events.forumThreadId),
        ))
        .limit(1);

      let forumPostId: number | null = null;

      if (matchedEvent?.forumThreadId) {
        // Reply to the pre-event thread with the recording link.
        const sessionDateStr = formatSessionDate(recording.sessionDate);
        const summarySection = recording.aiSummary ? `\n\n**What we covered**\n\n${recording.aiSummary}` : "";
        const replyContent = `The recording from ${sessionDateStr} is ready.\n\n${watchLinkMd(recording)}${summarySection}\n\nDrop any follow-up thoughts below.`;

        const replyId = await db
          .createForumReply({ postId: matchedEvent.forumThreadId, authorId: 1, content: replyContent })
          .catch(() => null);
        forumPostId = matchedEvent.forumThreadId;
        if (replyId) log.info(`Replied to forum thread ${matchedEvent.forumThreadId} for recording ${recordingId}`);

        // Link recording to event for the Schedule page replay button; mirror
        // youtubeUrl onto the event so the Historical card renders without a join.
        await database
          .update(events)
          .set({
            recordingId,
            status: "completed",
            ...(recording.youtubeUrl ? { youtubeUrl: recording.youtubeUrl } : {}),
          })
          .where(eq(events.id, matchedEvent.id));
        log.info(`Linked recording ${recordingId} to event ${matchedEvent.id}`);
      } else {
        forumPostId = await createRecordingForumPost(recording);
      }

      if (forumPostId) {
        await database.update(recordings).set({ forumPostId }).where(eq(recordings.id, recordingId));
        recording.forumPostId = forumPostId;
        log.info(`Forum post/reply set to ${forumPostId} for recording ${recordingId}`);
      }
    } catch (err) {
      log.error("Forum post creation failed:", err);
    }
  }

  // ── 2. Email subscribers (once per recording) ──
  if (!recording.emailSent && (recording.youtubeUrl || recording.riversideUrl)) {
    try {
      await sendRecordingEmail(recording);
      await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, recordingId));
      log.info(`Email sent for recording ${recordingId}`);
    } catch (err) {
      log.error("Email send failed:", err);
    }
  }

  // ── 3. Channel announcements (Telegram + WhatsApp), fire-and-forget ──
  notifyRecordingReady({
    title: recording.title,
    youtubeUrl: recording.youtubeUrl,
    riversideUrl: recording.riversideUrl,
    forumPostId: recording.forumPostId,
  }).catch((err) => log.error("notify error:", err));
}

// ── Forum post creation (fallback when no event thread matches) ──

async function createRecordingForumPost(recording: RecordingRow): Promise<number | null> {
  const SYSTEM_AUTHOR_ID = 1;
  const database = await getDb();
  if (!database) return null;

  const [recordingsCategory] = await database
    .select()
    .from(forumCategories)
    .where(eq(forumCategories.slug, "session-recordings"))
    .limit(1);
  const categoryId = recordingsCategory?.id ?? 1; // fall back to General

  const sessionDateStr = formatSessionDate(recording.sessionDate);
  const durationStr = recording.durationSeconds ? `${Math.floor(recording.durationSeconds / 60)} min` : "";
  const watchLink = recording.youtubeUrl
    ? `\n\n**[Watch the recording on YouTube](${recording.youtubeUrl})**`
    : recording.riversideUrl
      ? `\n\n**[Watch the recording](${recording.riversideUrl})**`
      : "";
  const summarySection = recording.aiSummary ? `\n\n## What we covered\n\n${recording.aiSummary}` : "";
  const content = `Recording from ${sessionDateStr}${durationStr ? ` (${durationStr})` : ""}.${watchLink}${summarySection}\n\nWhat stood out to you? What questions came up? Drop your thoughts below.`;

  const postId = await db.createForumPost({
    categoryId,
    authorId: SYSTEM_AUTHOR_ID,
    title: recording.title,
    content,
    tags: ["recording", "session"],
    postType: "discussion",
  });
  return postId ?? null;
}

// ── Email sending (exported so the admin resend route can reuse it) ──

export async function sendRecordingEmail(recording: {
  title: string;
  sessionDate: Date | null;
  youtubeUrl: string | null;
  riversideUrl: string | null;
  aiSummary: string | null;
  forumPostId: number | null;
}): Promise<void> {
  const subscribers = await db.getRecordingSubscribers();
  if (!subscribers.length) {
    log.info("No recording subscribers, skipping email");
    return;
  }

  const forumUrl = recording.forumPostId ? `${APP_BASE_URL}/community/post/${recording.forumPostId}` : null;
  const html = buildEmailHtml({
    title: recording.title,
    sessionDate: formatSessionDate(recording.sessionDate),
    youtubeUrl: recording.youtubeUrl,
    riversideUrl: recording.riversideUrl,
    aiSummary: recording.aiSummary,
    forumUrl,
  });

  const emails = subscribers.map((s) => s.email);
  const BATCH = 50;
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    await sendEmail({ to: batch, subject: `Recording ready: ${recording.title}`, html, template: "recording_summary" });
    log.info(`Sent email batch ${Math.floor(i / BATCH) + 1} (${batch.length} recipients)`);
  }
}

// ── Helpers ──

function formatSessionDate(d: Date | null): string {
  return d
    ? d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "Recent session";
}

function watchLinkMd(r: { youtubeUrl: string | null; riversideUrl: string | null }): string {
  return r.youtubeUrl
    ? `**[Watch the recording on YouTube](${r.youtubeUrl})**`
    : r.riversideUrl
      ? `**[Watch the recording](${r.riversideUrl})**`
      : "";
}

function buildEmailHtml(opts: {
  title: string;
  sessionDate: string;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
  aiSummary?: string | null;
  forumUrl?: string | null;
}): string {
  const watchBtn = opts.youtubeUrl
    ? `<a href="${opts.youtubeUrl}" style="display:inline-block;background:#FF0000;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">▶ Watch Recording</a>`
    : "";
  const forumBtn = opts.forumUrl
    ? `<a href="${opts.forumUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin:0 8px 8px 0;">💬 Join the Discussion</a>`
    : "";
  const summaryBlock = opts.aiSummary
    ? `<div style="background:#f0f7f0;border-left:4px solid #7dd87d;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p style="color:#1a472a;font-weight:bold;margin:0 0 8px 0;">What we covered</p>
        <p style="color:#2d5a3d;margin:0;line-height:1.7;">${opts.aiSummary}</p>
       </div>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a472a; background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #7dd87d; margin: 0; font-size: 22px;">ReGen Civics</h1>
        <p style="color: #a8e6a8; margin: 6px 0 0 0; font-size: 12px;">Recording ready</p>
      </div>

      <div style="padding: 30px 24px; background: #fff; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #1a472a; margin: 0 0 6px 0; font-size: 20px;">${opts.title}</h2>
        <p style="color: #888; font-size: 13px; margin: 0 0 20px 0;">${opts.sessionDate}</p>

        ${summaryBlock}

        <p style="color: #444; line-height: 1.7; margin: 20px 0;">
          The recording from our latest community session is ready. Watch it back, share it, or drop a reply in the forum.
        </p>

        <div style="margin: 24px 0;">
          ${watchBtn}
          ${forumBtn}
        </div>
      </div>

      <div style="background: #f0f7f0; padding: 20px 24px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          You're receiving this because you opted into recording updates in your profile.<br/>
          <a href="${APP_BASE_URL}/settings" style="color: #7dd87d;">Update email preferences</a>
        </p>
      </div>
    </div>
  `;
}
