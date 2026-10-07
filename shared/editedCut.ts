/**
 * Decide whether a newly polled YouTube upload is the edited cut of a
 * session we already have, instead of a second recording.
 *
 * The ±4h event linker stays as it is. An edit uploaded the next day is
 * outside that window, so this matcher uses 14 days and the session title.
 */
import { SEASON2_CURRICULUM } from "./season2Curriculum";
import { extractYoutubeVideoId } from "./youtubeVideoId";

export const EDITED_CUT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** A raw livestream publish should sit near the event. The edit can land later. */
const RAW_NEAR_EVENT_MS = 48 * 60 * 60 * 1000;

export type CutVideo = {
  videoId: string;
  title: string;
  publishedAt: Date;
};

export type CutRecording = {
  id: number;
  title: string;
  sessionDate: Date | null;
  youtubeVideoId: string | null;
  editedYoutubeVideoId: string | null;
};

export type CutEvent = {
  id: number;
  title: string;
  startTime: Date;
  recordingId: number | null;
  episodeNumber?: number | null;
};

export type CutMatch = {
  recordingId: number;
  eventId: number | null;
  reason: string;
};

export function isEditedMarker(title: string): boolean {
  return /\b(clean|edited|cut)\b/i.test(title);
}

/** A livestream title. CLEAN / EDITED / CUT wins, so an edit is never treated as live. */
export function isLiveUploadTitle(title: string): boolean {
  if (isEditedMarker(title)) return false;
  return /\blive\b/i.test(title);
}

export function seasonEpisode(title: string): { season: number; episode: number } | null {
  const match = title.match(/\bS(\d+)\s*E(\d+)\b/i);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

export function weekFromTitle(title: string): number | null {
  const match = title.match(/\bweek\s*(\d+)\b/i);
  if (!match) return null;
  const week = Number(match[1]);
  return week > 0 ? week : null;
}

export function normTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distinctive(title: string): string {
  return normTitle(title)
    .replace(/\bweek\s+\d+\b/g, " ")
    .replace(/\bs\s*\d+\s*e\s*\d+\b/g, " ")
    .replace(/\b(clean|edited|cut|live)\b/g, " ")
    .replace(/\bregen civics\b/g, " ")
    .replace(/\bopen session\b/g, " ")
    .replace(/\bjourney to regenerative civilization\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function curriculumHit(title: string): { week: number; title: string } | null {
  const n = normTitle(title);
  let best: { week: number; title: string; len: number } | null = null;
  for (const episode of SEASON2_CURRICULUM) {
    const name = normTitle(episode.title);
    if (name.length < 8 || !n.includes(name)) continue;
    if (!best || name.length > best.len) best = { week: episode.week, title: episode.title, len: name.length };
  }
  return best ? { week: best.week, title: best.title } : null;
}

function phrasesOverlap(a: string, b: string): boolean {
  const da = distinctive(a);
  const db = distinctive(b);
  if (da.length >= 8 && normTitle(b).includes(da)) return true;
  if (db.length >= 8 && normTitle(a).includes(db)) return true;
  return false;
}

function within(a: Date, b: Date, windowMs: number): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= windowMs;
}

function eventWeek(event: CutEvent): number | null {
  return weekFromTitle(event.title) ?? (event.episodeNumber && event.episodeNumber > 0 ? event.episodeNumber : null);
}

function cutWeek(title: string): number | null {
  const fromLabel = weekFromTitle(title);
  if (fromLabel) return fromLabel;
  const fromCurriculum = curriculumHit(title)?.week ?? null;
  if (fromCurriculum) return fromCurriculum;
  const ep = seasonEpisode(title);
  if (ep?.season === 2) return ep.episode;
  return null;
}

export function cleanCutTitle(title: string): string {
  return title
    .replace(/\bS\d+\s*E\d+\b/gi, " ")
    .replace(/\b(clean|edited|cut|live)\b/gi, " ")
    .replace(/journey to regenerative civilization/gi, " ")
    .replace(/\s*[-–—|:]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Session name for the email subject. Prefer the event or curriculum title over the raw upload title. */
export function sessionLabelForCut(input: {
  cutTitle: string;
  eventTitle?: string | null;
  recordingTitle?: string | null;
}): { week: number | null; title: string } {
  const eventTitle = (input.eventTitle ?? "").trim();
  const eventWeekNum = weekFromTitle(eventTitle);
  const eventRest = eventTitle.replace(/^week\s*\d+\s*:\s*/i, "").trim();
  if (eventWeekNum && eventRest.length >= 3) return { week: eventWeekNum, title: eventRest };

  const fromCut = curriculumHit(input.cutTitle);
  if (fromCut) return fromCut;
  const fromEvent = eventTitle ? curriculumHit(eventTitle) : null;
  if (fromEvent) return fromEvent;
  const fromRecording = input.recordingTitle ? curriculumHit(input.recordingTitle) : null;
  if (fromRecording) return fromRecording;

  const week = cutWeek(input.cutTitle) ?? (eventTitle ? eventWeekNum : null);
  const cleaned = cleanCutTitle(input.cutTitle);
  return { week, title: cleaned || input.cutTitle.trim() || "Community session" };
}

function recordingUsable(rec: CutRecording, cut: CutVideo, week: number | null): boolean {
  if (rec.youtubeVideoId === cut.videoId) return false;
  if (rec.editedYoutubeVideoId === cut.videoId) return false;
  const recEp = seasonEpisode(rec.title);
  const cutEp = seasonEpisode(cut.title);
  if (cutEp && recEp && (recEp.season !== cutEp.season || recEp.episode !== cutEp.episode)) return false;
  const recWeek = weekFromTitle(rec.title) ?? curriculumHit(rec.title)?.week ?? null;
  if (week && recWeek && recWeek !== week) return false;
  return true;
}

/**
 * Attach target for this upload, or null when it should be ingested as its own recording.
 * Live uploads are never edits. A match needs a shared episode, week, or title inside 14 days.
 */
export function matchEditedCut(
  cut: CutVideo,
  recordings: CutRecording[],
  events: CutEvent[],
): CutMatch | null {
  if (isLiveUploadTitle(cut.title)) return null;
  const week = cutWeek(cut.title);
  const phrase = distinctive(cut.title);
  const episode = seasonEpisode(cut.title);
  const anchored = Boolean(episode || week || phrase.length >= 8);
  if (!anchored && !isEditedMarker(cut.title)) return null;
  if (!anchored) return null;

  const eventHits = events.filter((event) => {
    if (!within(event.startTime, cut.publishedAt, EDITED_CUT_WINDOW_MS)) return false;
    const evEpisode = seasonEpisode(event.title);
    if (episode && evEpisode && episode.season === evEpisode.season && episode.episode === evEpisode.episode) {
      return true;
    }
    const evWeek = eventWeek(event);
    if (week && evWeek === week) return true;
    return phrasesOverlap(cut.title, event.title);
  });

  type Choice = { recordingId: number; eventId: number | null; distance: number; reason: string };
  const choices: Choice[] = [];

  for (const rec of recordings) {
    if (!recordingUsable(rec, cut, week) || !rec.sessionDate) continue;
    if (!within(rec.sessionDate, cut.publishedAt, EDITED_CUT_WINDOW_MS)) continue;
    const sameEpisode = episode && seasonEpisode(rec.title)
      && seasonEpisode(rec.title)!.season === episode.season
      && seasonEpisode(rec.title)!.episode === episode.episode;
    const sameWeek = week != null && (weekFromTitle(rec.title) === week || curriculumHit(rec.title)?.week === week);
    const samePhrase = phrasesOverlap(cut.title, rec.title);
    if (!sameEpisode && !sameWeek && !samePhrase) continue;
    const linked = eventHits.find((event) => event.recordingId === rec.id);
    choices.push({
      recordingId: rec.id,
      eventId: linked?.id ?? null,
      distance: Math.abs(rec.sessionDate.getTime() - cut.publishedAt.getTime()),
      reason: "title",
    });
  }

  for (const event of eventHits) {
    if (event.recordingId) {
      const linked = recordings.find((rec) => rec.id === event.recordingId);
      if (!linked || !recordingUsable(linked, cut, week)) continue;
      choices.push({
        recordingId: linked.id,
        eventId: event.id,
        distance: Math.abs(event.startTime.getTime() - cut.publishedAt.getTime()),
        reason: "event-link",
      });
      continue;
    }
    const near = recordings
      .filter((rec) => {
        if (!recordingUsable(rec, cut, week) || !rec.sessionDate) return false;
        return within(rec.sessionDate, event.startTime, RAW_NEAR_EVENT_MS);
      })
      .map((rec) => ({
        rec,
        distance: Math.abs(rec.sessionDate!.getTime() - event.startTime.getTime()),
      }))
      .sort((a, b) => a.distance - b.distance);
    if (!near[0]) continue;
    choices.push({
      recordingId: near[0].rec.id,
      eventId: event.id,
      distance: Math.abs(event.startTime.getTime() - cut.publishedAt.getTime()),
      reason: "event-nearby",
    });
  }

  if (!choices.length) return null;
  choices.sort((a, b) => a.distance - b.distance);
  const best = choices[0];
  return {
    recordingId: best.recordingId,
    eventId: best.eventId,
    reason: `${best.reason}${best.eventId ? ` event ${best.eventId}` : ""}`.slice(0, 80),
  };
}

/**
 * What the automatic recording-ready step should do once an edited letter
 * may already have gone out.
 *
 * The edited letter already tells people the recording is up, so that step
 * does not send "Recording ready" for the same session. A later summary is
 * a different letter, "Session notes", sent once.
 * No summary yet: leave the summary flag unset so a later pass can send notes.
 */
/**
 * Week 2's edited cut (recording 57, JS8YoJE1PUI) already went to 27 people
 * on 2026-10-07. Recording ready and the edited letter must not send for
 * that video again. Other recordings use emailSent and email_logs.
 */
export const PRIOR_LETTER_VIDEO_IDS = new Set(["JS8YoJE1PUI"]);

export function priorLetterAlreadySent(...ids: Array<string | null | undefined>): boolean {
  for (const raw of ids) {
    const id = extractYoutubeVideoId(raw);
    if (id && PRIOR_LETTER_VIDEO_IDS.has(id)) return true;
  }
  return false;
}

export function automaticRecordingMail(input: {
  editedEmailSent: boolean;
  emailSent: boolean;
  hasSummary: boolean;
  hasWatchUrl: boolean;
}): "session_notes" | "recording_ready" | "skip" {
  if (input.emailSent) return "skip";
  if (input.editedEmailSent) return input.hasSummary ? "session_notes" : "skip";
  return input.hasWatchUrl ? "recording_ready" : "skip";
}
