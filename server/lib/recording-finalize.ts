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
import { eq } from "drizzle-orm";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { emailsAcceptedForInquiry } from "../emailTracking";
import { notifyRecordingReady } from "../_core/notify";
import { logger } from "../_core/logger";
import { audienceForTopic, managePreferencesUrl } from "./emailPrefs";
import { newsletterLegalFooterHtml } from "../../shared/letterHtml";
import { ENV } from "../_core/env";
import { linkBlocksPublish, linkRecordingToMatchingEvent, preferredRecordingYoutubeUrl } from "./recordingEventLink";
import { maybeAutoDraftPostSessionLetter } from "./postSessionLetter";
import { courseWeekFromRecording } from "@shared/sessionCourse";
import { automaticRecordingMail, priorLetterAlreadySent } from "../../shared/editedCut";
import { chaptersEmailSection } from "../../shared/editedCutEmail";
import { chaptersJumpMarkdown, coerceChapters, type YoutubeChapter } from "../../shared/youtubeChapters";
import { extractYoutubeVideoId } from "../../shared/youtubeVideoId";
import { chaptersForSend } from "./youtubeDescription";
import { sendPacedEmails } from "./pacedEmail";
import { sendSessionNotesEmail } from "./editedCutEmailSend";
import { isMissingSchema, recordingWithoutCaptionColumn, recordingWithoutEditedCutColumns, recordingWithoutPipelineRetryColumns } from "./schemaTolerance";
import { chaptersForRecap } from "./youtubeWatchMeta";

const log = logger("recording-finalize");

/**
 * Week 2's edited cut (recording 57, JS8YoJE1PUI) already went to 27 people
 * on 2026-10-07. Recording ready must not send for that video again.
 * Other recordings are covered by emailSent and email_logs.
 */
const PRIOR_LETTER_VIDEO_IDS = new Set(["JS8YoJE1PUI"]);

type RecordingRow = typeof recordings.$inferSelect;
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Full row when 0290 is applied. Otherwise the pre-migration columns, with the new fields empty. */
async function loadRecordingRow(database: Database, recordingId: number): Promise<RecordingRow | null> {
  try {
    const [recording] = await database
      .select()
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    return recording ?? null;
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
    try {
      const [recording] = await database
        .select(recordingWithoutCaptionColumn())
        .from(recordings)
        .where(eq(recordings.id, recordingId))
        .limit(1);
      if (!recording) return null;
      log.warn(`recording ${recordingId} loaded without caption source; migration 0292 is not applied`);
      return { ...recording, transcriptSource: null };
    } catch (captionErr) {
      if (!isMissingSchema(captionErr)) throw captionErr;
    }
    try {
      const [recording] = await database
        .select(recordingWithoutPipelineRetryColumns())
        .from(recordings)
        .where(eq(recordings.id, recordingId))
        .limit(1);
      if (!recording) return null;
      log.warn(`recording ${recordingId} loaded without retry columns; migration 0291 is not applied`);
      return {
        ...recording,
        processAttempts: 0,
        lastError: null,
        nextRetryAt: null,
        transcriptSource: null,
      };
    } catch (retryErr) {
      if (!isMissingSchema(retryErr)) throw retryErr;
    }
    log.warn(`recording ${recordingId} loaded without edited-cut columns; migration 0290 is not applied`);
    const [recording] = await database
      .select(recordingWithoutEditedCutColumns())
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    if (!recording) return null;
    return {
      ...recording,
      editedYoutubeVideoId: null,
      editedCutAttachedAt: null,
      editedCutMatch: null,
      editedEmailSent: 0,
      descriptionChaptersJson: null,
      processAttempts: 0,
      lastError: null,
      nextRetryAt: null,
      transcriptSource: null,
    };
  }
}

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
  const recording = await loadRecordingRow(database, recordingId);
  if (!recording) {
    log.warn(`finalizeRecording: recording ${recordingId} not found`);
    return;
  }

  // Link first. An ambiguous match, or a session that already has another
  // recording, must not create a forum post or send email.
  let link;
  try {
    link = await linkRecordingToMatchingEvent(recordingId);
  } catch (err) {
    log.error("recording event link failed:", err);
    link = { action: "none" as const, reason: "link_failed" };
  }
  if (linkBlocksPublish(link)) {
    log.info(`recording ${recordingId} not published (${link.reason})`);
    return;
  }

  await refreshDescriptionChapters(database, recording);
  const chapterMd = await chapterMarkdown(recording);

  // ── 1. Forum thread: reply on the linked event, or a fresh post when nothing matched ──
  if (!recording.forumPostId) {
    try {
      const [owner] = await database
        .select({ forumThreadId: events.forumThreadId, id: events.id })
        .from(events)
        .where(eq(events.recordingId, recordingId))
        .limit(1);

      let forumPostId: number | null = null;

      if (owner?.forumThreadId) {
        const sessionDateStr = formatSessionDate(recording.sessionDate);
        const summarySection = recording.aiSummary ? `\n\n**What we covered**\n\n${recording.aiSummary}` : "";
        const replyContent = `The recording from ${sessionDateStr} is ready.\n\n${watchLinkMd(recording)}${summarySection}${chapterMd ? `\n\n${chapterMd}` : ""}\n\nDrop any follow-up thoughts below.`;

        const replyId = await db
          .createForumReply({ postId: owner.forumThreadId, authorId: 1, content: replyContent })
          .catch(() => null);
        forumPostId = owner.forumThreadId;
        if (replyId) log.info(`Replied to forum thread ${owner.forumThreadId} for recording ${recordingId}`);
      } else if (!owner) {
        forumPostId = await createRecordingForumPost(recording, chapterMd);
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
  // The edited-cut letter already said the recording is up. This step then
  // either waits, or sends one different "Session notes" letter when a summary exists.
  // Week 2's edited cut already went out before editedEmailSent existed.
  if (
    priorLetterAlreadySent(
      recording.youtubeVideoId,
      recording.youtubeUrl,
      recording.editedYoutubeVideoId,
      recording.editedYoutubeUrl,
    ) && !recording.emailSent
  ) {
    await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, recordingId));
    recording.emailSent = 1;
    log.info(`recording ${recordingId} already has the Week 2 edited letter; skipping another send`);
  }
  if (!recording.emailSent && (recording.youtubeUrl || recording.riversideUrl || recording.editedYoutubeUrl)) {
    try {
      const outcome = await deliverSubscriberMail(recording, {
        chapters: descriptionOrAiChapters(recording),
      });
      if (outcome.kind !== "skip" && outcome.dropped === 0) {
        await database.update(recordings).set({ emailSent: 1 }).where(eq(recordings.id, recordingId));
        log.info(`Email sent for recording ${recordingId} (${outcome.kind})`);
      } else if (outcome.kind !== "skip") {
        log.info(`Recording ${recordingId} email incomplete: ${outcome.accepted} accepted, ${outcome.dropped} not sent`);
      }
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

  // ── 4. Outbound draft (never auto-send) when overview/summary exists ──
  await maybeAutoDraftPostSessionLetter(recordingId);
}

// ── Forum post creation (fallback when no event thread matches) ──

async function chapterMarkdown(recording: RecordingRow): Promise<string> {
  const videoId =
    recording.youtubeVideoId ||
    extractYoutubeVideoId(preferredRecordingYoutubeUrl(recording));
  const chapters = await chaptersForRecap({
    videoId,
    descriptionChapters: recording.descriptionChaptersJson,
    aiChapters: recording.chaptersJson,
  });
  return chaptersJumpMarkdown(chapters, videoId);
}

async function createRecordingForumPost(recording: RecordingRow, chapterMd = ""): Promise<number | null> {
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
  const chaptersSection = chapterMd ? `\n\n${chapterMd}` : "";
  const content = `Recording from ${sessionDateStr}${durationStr ? ` (${durationStr})` : ""}.${watchLink}${summarySection}${chaptersSection}\n\nWhat stood out to you? What questions came up? Drop your thoughts below.`;

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

type SubscriberRecording = {
  id?: number;
  title: string;
  sessionDate: Date | null;
  youtubeUrl: string | null;
  youtubeVideoId?: string | null;
  editedYoutubeUrl?: string | null;
  editedYoutubeVideoId?: string | null;
  editedEmailSent?: number | null;
  emailSent?: number | null;
  riversideUrl: string | null;
  aiSummary: string | null;
  overview?: string | null;
  forumPostId: number | null;
  descriptionChaptersJson?: unknown;
  chaptersJson?: unknown;
};

/**
 * Recording-ready, or session notes when the edited letter already went out.
 * `resend` lets an admin send to people who were not in the first pass.
 * It still will not send a second "recording is up" after the edited letter.
 */
export async function deliverSubscriberMail(
  recording: SubscriberRecording,
  opts?: { resend?: boolean; chapters?: YoutubeChapter[] },
): Promise<{ accepted: number; dropped: number; kind: "recording_ready" | "session_notes" | "skip" }> {
  if (priorLetterAlreadySent(
    recording.youtubeVideoId,
    recording.youtubeUrl,
    recording.editedYoutubeVideoId,
    recording.editedYoutubeUrl,
  )) {
    return { accepted: 0, dropped: 0, kind: "skip" };
  }
  const plan = automaticRecordingMail({
    editedEmailSent: Boolean(recording.editedEmailSent),
    emailSent: opts?.resend ? false : Boolean(recording.emailSent),
    hasSummary: Boolean((recording.aiSummary || recording.overview || "").trim()),
    hasWatchUrl: Boolean(recording.youtubeUrl || recording.riversideUrl || recording.editedYoutubeUrl),
  });
  if (plan === "skip") return { accepted: 0, dropped: 0, kind: "skip" };
  if (plan === "session_notes" && recording.id == null) return { accepted: 0, dropped: 1, kind: "session_notes" };
  if (plan === "session_notes" && recording.id != null) {
    const sent = await sendSessionNotesEmail({
      id: recording.id,
      title: recording.title,
      youtubeUrl: recording.youtubeUrl,
      youtubeVideoId: recording.youtubeVideoId ?? null,
      editedYoutubeUrl: recording.editedYoutubeUrl ?? null,
      editedYoutubeVideoId: recording.editedYoutubeVideoId ?? null,
      editedCutMatch: null,
      aiSummary: recording.aiSummary,
      overview: recording.overview ?? null,
      descriptionChaptersJson: recording.descriptionChaptersJson,
      chaptersJson: recording.chaptersJson,
    }, { chapters: opts?.chapters });
    return { ...sent, kind: "session_notes" };
  }
  const sent = await sendRecordingEmail(recording, opts?.chapters);
  return { ...sent, kind: "recording_ready" };
}

export async function sendRecordingEmail(
  recording: SubscriberRecording,
  chapters?: YoutubeChapter[],
): Promise<{ accepted: number; dropped: number }> {
  const subscribers = await audienceForTopic("recordings");
  if (!subscribers.length) {
    log.info("No recording subscribers, skipping email");
    return { accepted: 0, dropped: 0 };
  }

  let already = new Set<string>();
  if (recording.id != null) {
    try {
      already = await emailsAcceptedForInquiry("recording_summary", "recording", recording.id);
    } catch (err) {
      log.error("recording prior-send lookup failed", err);
    }
  }

  const forumUrl = recording.forumPostId ? `${APP_BASE_URL}/community/post/${recording.forumPostId}` : null;
  const courseLink = await courseUrlForRecording(recording);
  const videoId = extractYoutubeVideoId(recording.youtubeVideoId)
    || extractYoutubeVideoId(recording.youtubeUrl)
    || extractYoutubeVideoId(recording.editedYoutubeVideoId)
    || extractYoutubeVideoId(recording.editedYoutubeUrl);
  let chapterList = chapters;
  if (!chapterList && videoId) {
    const fresh = await chaptersForSend({ videoId, stored: recording.descriptionChaptersJson });
    if (fresh.fromDescription && recording.id != null) {
      const database = await getDb();
      if (database) {
        try {
          await database
            .update(recordings)
            .set({ descriptionChaptersJson: fresh.chapters })
            .where(eq(recordings.id, recording.id));
        } catch (err) {
          if (!isMissingSchema(err)) log.error("description chapters persist failed", err);
        }
      }
    }
    chapterList = fresh.chapters.length ? fresh.chapters : coerceChapters(recording.chaptersJson);
  }
  chapterList = chapterList ?? descriptionOrAiChapters(recording);
  const result = await sendPacedEmails({
    recipients: subscribers.map((row) => row.email),
    alreadyAccepted: already,
    sendOne: async (email) => {
      const prefsUrl = await managePreferencesUrl(email, { mute: "recordings" });
      const html = buildEmailHtml({
        title: recording.title,
        sessionDate: formatSessionDate(recording.sessionDate),
        youtubeUrl: recording.youtubeUrl,
        riversideUrl: recording.riversideUrl,
        aiSummary: recording.aiSummary,
        forumUrl,
        courseUrl: courseLink?.href ?? null,
        courseLabel: courseLink?.label ?? null,
        prefsUrl,
        chaptersHtml: videoId ? chaptersEmailSection(chapterList ?? [], videoId) : "",
      });
      return sendEmail({
        to: email,
        subject: `Recording ready: ${recording.title}`,
        html,
        template: "recording_summary",
        inquiryType: "recording",
        inquiryId: recording.id,
      });
    },
  });
  log.info(`Recording email accepted ${result.accepted}, not sent ${result.dropped}, of ${subscribers.length}`);
  return { accepted: result.accepted, dropped: result.dropped };
}

// ── Helpers ──

function descriptionOrAiChapters(recording: {
  descriptionChaptersJson?: unknown;
  chaptersJson?: unknown;
}): YoutubeChapter[] {
  const fromDescription = coerceChapters(recording.descriptionChaptersJson);
  if (fromDescription.length) return fromDescription;
  return coerceChapters(recording.chaptersJson);
}

async function refreshDescriptionChapters(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  recording: RecordingRow,
): Promise<void> {
  const videoId = extractYoutubeVideoId(recording.editedYoutubeVideoId)
    || extractYoutubeVideoId(recording.editedYoutubeUrl)
    || extractYoutubeVideoId(recording.youtubeVideoId)
    || extractYoutubeVideoId(recording.youtubeUrl);
  if (!videoId) return;
  try {
    const fresh = await chaptersForSend({ videoId, stored: recording.descriptionChaptersJson });
    if (!fresh.fromDescription) return;
    recording.descriptionChaptersJson = fresh.chapters;
    await database
      .update(recordings)
      .set({ descriptionChaptersJson: fresh.chapters })
      .where(eq(recordings.id, recording.id));
  } catch (err) {
    log.error("description chapters failed", err);
  }
}

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

async function courseUrlForRecording(recording: { id?: number; title: string }): Promise<{ href: string; label: string } | null> {
  let season: string | null = null;
  let episodeNumber: number | null = null;
  let eventTitle: string | null = null;
  if (recording.id != null) {
    try {
      const database = await getDb();
      if (database) {
        const [event] = await database
          .select({ season: events.season, episodeNumber: events.episodeNumber, title: events.title })
          .from(events)
          .where(eq(events.recordingId, recording.id))
          .limit(1);
        season = event?.season ?? null;
        episodeNumber = event?.episodeNumber ?? null;
        eventTitle = event?.title ?? null;
      }
    } catch (err) {
      log.error("course link lookup failed", err);
    }
  }
  const week = courseWeekFromRecording({ title: recording.title, eventTitle, season, episodeNumber });
  return week ? { href: `${APP_BASE_URL}/season2/week/${week}`, label: `Week ${week} board` } : null;
}

function buildEmailHtml(opts: {
  title: string;
  sessionDate: string;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
  aiSummary?: string | null;
  forumUrl?: string | null;
  courseUrl?: string | null;
  courseLabel?: string | null;
  prefsUrl: string;
  chaptersHtml?: string;
}): string {
  const watchBtn = opts.youtubeUrl
    ? `<a href="${opts.youtubeUrl}" style="display:inline-block;background:#FF0000;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">▶ Watch Recording</a>`
    : "";
  const forumBtn = opts.forumUrl
    ? `<a href="${opts.forumUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin:0 8px 8px 0;">💬 Join the Discussion</a>`
    : "";
  const courseBtn = opts.courseUrl
    ? `<a href="${opts.courseUrl}" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;margin:0 8px 8px 0;">${opts.courseLabel || "Week board"}</a>`
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
          ${courseBtn}
        </div>
        ${opts.chaptersHtml ?? ""}
      </div>

      <div style="background: #f0f7f0; padding: 20px 24px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        ${newsletterLegalFooterHtml(opts.prefsUrl, ENV.harvestPostalAddress)}
      </div>
    </div>
  `;
}
