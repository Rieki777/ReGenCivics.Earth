/**
 * Send the edited-recording letter, or the later session-notes letter.
 * The description is fetched here, at send time, so a chapter edit made
 * after upload is the list people receive.
 */
import { eq } from "drizzle-orm";
import { guardRecordingSubscriberMail } from "./recordingMailGate";
import { getDb } from "../db";
import { events, recordingCutEvents, recordings } from "../../drizzle/schema";
import { APP_BASE_URL, sendEmail } from "../_core/email";
import { loadRecapDigest } from "./recapForEmail";
import { emailsAcceptedForInquiry } from "../emailTracking";
import { audienceForTopic, managePreferencesUrl } from "./emailPrefs";
import { sendPacedEmails, type PaceResult } from "./pacedEmail";
import { chaptersForSend } from "./youtubeDescription";
import { logger } from "../_core/logger";
import { extractYoutubeVideoId } from "../../shared/youtubeVideoId";
import { priorLetterAlreadySent } from "../../shared/editedCut";
import { isMissingSchema } from "./schemaTolerance";
import { sessionLabelForCut } from "../../shared/editedCut";
import {
  buildEditedRecordingEmailHtml,
  buildSessionNotesEmailHtml,
  editedRecordingSubject,
  sessionNotesSubject,
} from "../../shared/editedCutEmail";
import { coerceChapters, type YoutubeChapter } from "../../shared/youtubeChapters";

const log = logger("edited-cut-email");

type RecordingMailRow = {
  id: number;
  title: string;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  editedYoutubeUrl: string | null;
  editedYoutubeVideoId: string | null;
  editedCutMatch: string | null;
  aiSummary: string | null;
  overview: string | null;
  descriptionChaptersJson: unknown;
  chaptersJson: unknown;
  sessionDate?: Date | string | null;
  createdAt?: Date | string | null;
};

function decodeStoredLabel(raw: string | null): { week: number | null; title: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { week?: unknown; title?: unknown };
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    if (!title) return null;
    const week = typeof parsed.week === "number" && parsed.week > 0 ? parsed.week : null;
    return { week, title };
  } catch {
    return null;
  }
}

export function encodeCutMatch(label: { week: number | null; title: string }, reason: string): string {
  return JSON.stringify({ week: label.week, title: label.title, reason }).slice(0, 255);
}

function watchVideoId(rec: {
  editedYoutubeVideoId?: string | null;
  editedYoutubeUrl?: string | null;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
}, preferEdited: boolean): string | null {
  const edited = extractYoutubeVideoId(rec.editedYoutubeVideoId) || extractYoutubeVideoId(rec.editedYoutubeUrl);
  const raw = extractYoutubeVideoId(rec.youtubeVideoId) || extractYoutubeVideoId(rec.youtubeUrl);
  return preferEdited ? (edited || raw) : (raw || edited);
}

async function labelFor(rec: RecordingMailRow, cutTitle?: string): Promise<{ week: number | null; title: string }> {
  const database = await getDb();
  let eventTitle: string | null = null;
  if (database) {
    const [event] = await database
      .select({ title: events.title })
      .from(events)
      .where(eq(events.recordingId, rec.id))
      .limit(1);
    eventTitle = event?.title ?? null;
  }
  if (eventTitle || cutTitle) {
    return sessionLabelForCut({
      cutTitle: cutTitle || rec.title,
      eventTitle,
      recordingTitle: rec.title,
    });
  }
  return decodeStoredLabel(rec.editedCutMatch) ?? sessionLabelForCut({ cutTitle: rec.title, recordingTitle: rec.title });
}

async function rememberChapters(recordingId: number, fresh: { chapters: YoutubeChapter[]; fromDescription: boolean }) {
  if (!fresh.fromDescription) return;
  const database = await getDb();
  if (!database) return;
  try {
    await database
      .update(recordings)
      .set({ descriptionChaptersJson: fresh.chapters })
      .where(eq(recordings.id, recordingId));
  } catch (err) {
    if (!isMissingSchema(err)) throw err;
  }
}

async function audit(recordingId: number, action: string, videoId: string | null, detail: string) {
  const database = await getDb();
  if (!database) return;
  try {
    await database.insert(recordingCutEvents).values({
      recordingId,
      action: action.slice(0, 40),
      youtubeVideoId: videoId,
      detail: detail.slice(0, 500),
    });
  } catch (err) {
    if (!isMissingSchema(err)) log.error("cut audit failed", err);
  }
}

async function pacedToRecordings(opts: {
  recordingId: number;
  template: string;
  subject: string;
  htmlFor: (prefsUrl: string) => string;
}): Promise<PaceResult> {
  const subscribers = await audienceForTopic("recordings");
  let already = new Set<string>();
  try {
    already = await emailsAcceptedForInquiry(opts.template, "recording", opts.recordingId);
  } catch (err) {
    log.error("prior-send lookup failed", err);
  }
  return sendPacedEmails({
    recipients: subscribers.map((row) => row.email),
    alreadyAccepted: already,
    sendOne: async (email) => {
      const prefsUrl = await managePreferencesUrl(email, { mute: "recordings" });
      return sendEmail({
        to: email,
        subject: opts.subject,
        html: opts.htmlFor(prefsUrl),
        template: opts.template,
        inquiryType: "recording",
        inquiryId: opts.recordingId,
        skipBrandedWrap: true,
      });
    },
  });
}

export async function sendEditedRecordingEmail(
  recordingId: number,
  opts?: {
    cutTitle?: string;
    fetchDescription?: (videoId: string) => Promise<string | null>;
    automatic?: boolean;
    alreadySent?: boolean;
  },
): Promise<{ accepted: number; dropped: number; chapters: number; held: "skip_old" | "needs_review" | "claimed" | null }> {
  const database = await getDb();
  if (!database) return { accepted: 0, dropped: 1, chapters: 0, held: null };
  const [rec] = await database.select().from(recordings).where(eq(recordings.id, recordingId)).limit(1);
  if (!rec) return { accepted: 0, dropped: 1, chapters: 0, held: null };
  const videoId = watchVideoId(rec, true);
  if (priorLetterAlreadySent(videoId, rec.youtubeVideoId, rec.youtubeUrl, rec.editedYoutubeVideoId, rec.editedYoutubeUrl)) {
    try {
      await database.update(recordings).set({ editedEmailSent: 1 }).where(eq(recordings.id, recordingId));
    } catch (err) {
      if (!isMissingSchema(err)) log.error("editedEmailSent flag failed", err);
    }
    log.info(`recording ${recordingId} already received the Week 2 edited letter; not sending again`);
    return { accepted: 0, dropped: 0, chapters: 0, held: null };
  }
  if (!videoId || !rec.editedYoutubeUrl) return { accepted: 0, dropped: 1, chapters: 0, held: null };

  let chapterCount = 0;
  const guarded = await guardRecordingSubscriberMail({
    id: recordingId,
    title: rec.title,
    sessionDate: rec.sessionDate ?? null,
    createdAt: rec.createdAt ?? null,
    automatic: opts?.automatic !== false,
    claim: "editedEmailSent",
    alreadySent: opts?.automatic === false ? Boolean(rec.editedEmailSent) : Boolean(opts?.alreadySent),
    send: () => deliverEditedLetter(rec, videoId, opts, (count) => {
      chapterCount = count;
    }),
  });
  if (guarded.sent || guarded.held === "skip_old" || guarded.held === "claimed") {
    await audit(
      recordingId,
      guarded.sent && guarded.dropped === 0 ? "email_sent" : "email_held",
      videoId,
      `${guarded.held ?? "sent"} accepted ${guarded.accepted} dropped ${guarded.dropped} chapters ${chapterCount}`,
    );
  }
  log.info(`Edited recording email for ${recordingId}: accepted ${guarded.accepted}, dropped ${guarded.dropped}, held ${guarded.held ?? "no"}`);
  return { accepted: guarded.accepted, dropped: guarded.dropped, chapters: chapterCount, held: guarded.held };
}

async function deliverEditedLetter(
  rec: RecordingMailRow,
  videoId: string,
  opts: { cutTitle?: string; fetchDescription?: (videoId: string) => Promise<string | null> } | undefined,
  rememberCount: (count: number) => void,
): Promise<{ accepted: number; dropped: number }> {
  const fresh = await chaptersForSend({
    videoId,
    stored: rec.descriptionChaptersJson,
    fetchDescription: opts?.fetchDescription,
  });
  await rememberChapters(rec.id, fresh);
  const chapters = fresh.chapters.length ? fresh.chapters : coerceChapters(rec.chaptersJson);
  rememberCount(chapters.length);
  const label = await labelFor(rec, opts?.cutTitle);
  const subject = editedRecordingSubject(label.week, label.title);
  const weekBoardHref = label.week ? `${APP_BASE_URL}/season2/week/${label.week}` : null;
  const digest = await loadRecapDigest({
    recordingId: rec.id,
    summary: rec.aiSummary || rec.overview,
    videoId,
    weekBoardHref,
    origin: APP_BASE_URL,
  });
  return pacedToRecordings({
    recordingId: rec.id,
    template: "recording_edited",
    subject,
    htmlFor: (prefsUrl) => buildEditedRecordingEmailHtml({
      week: label.week,
      title: label.title,
      videoId,
      chapters,
      summary: rec.aiSummary || rec.overview,
      gist: digest.gist,
      insights: digest.insights,
      steps: digest.steps,
      prefsUrl,
      origin: APP_BASE_URL,
    }),
  });
}

export async function sendSessionNotesEmail(
  rec: RecordingMailRow,
  opts?: {
    fetchDescription?: (videoId: string) => Promise<string | null>;
    chapters?: YoutubeChapter[];
    automatic?: boolean;
    alreadySent?: boolean;
  },
): Promise<{ accepted: number; dropped: number; held: "skip_old" | "needs_review" | "claimed" | null }> {
  const videoId = watchVideoId(rec, true);
  if (!videoId) return { accepted: 0, dropped: 1, held: null };
  return guardRecordingSubscriberMail({
    id: rec.id,
    title: rec.title,
    sessionDate: rec.sessionDate ?? null,
    createdAt: rec.createdAt ?? null,
    automatic: opts?.automatic !== false,
    claim: "emailSent",
    alreadySent: Boolean(opts?.alreadySent),
    send: () => deliverSessionNotes(rec, videoId, opts),
  });
}

async function deliverSessionNotes(
  rec: RecordingMailRow,
  videoId: string,
  opts?: { fetchDescription?: (videoId: string) => Promise<string | null>; chapters?: YoutubeChapter[] },
): Promise<{ accepted: number; dropped: number }> {
  const fresh = opts?.chapters
    ? { chapters: opts.chapters, fromDescription: false }
    : await chaptersForSend({
      videoId,
      stored: rec.descriptionChaptersJson,
      fetchDescription: opts?.fetchDescription,
    });
  if (!opts?.chapters) await rememberChapters(rec.id, fresh);
  const chapters = fresh.chapters.length ? fresh.chapters : coerceChapters(rec.chaptersJson);
  const summary = (rec.aiSummary || rec.overview || "").trim();
  const label = await labelFor(rec);
  const weekBoardHref = label.week ? `${APP_BASE_URL}/season2/week/${label.week}` : null;
  const digest = await loadRecapDigest({
    recordingId: rec.id,
    summary,
    videoId,
    weekBoardHref,
    origin: APP_BASE_URL,
  });
  return pacedToRecordings({
    recordingId: rec.id,
    template: "recording_notes",
    subject: sessionNotesSubject(label.title),
    htmlFor: (prefsUrl) => buildSessionNotesEmailHtml({
      week: label.week,
      title: label.title,
      videoId,
      summary,
      gist: digest.gist,
      insights: digest.insights,
      steps: digest.steps,
      chapters,
      prefsUrl,
      origin: APP_BASE_URL,
    }),
  });
}
