/**
 * Match a recording to a session by episode title, SxEy, or week, inside
 * 14 days. The ±4 hour linker stays in recordingEventLink. Two matches
 * is ambiguous: do not link, and do not publish a second forum post or email.
 */
import { SEASON2_CURRICULUM } from "./season2Curriculum";

export const SESSION_MATCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type SessionMatchEvent = {
  id: number;
  title: string;
  startTime: Date | null;
  recordingId?: number | null;
  episodeNumber?: number | null;
};

export type SessionMatchRecording = {
  id: number;
  title: string;
  sessionDate: Date | null;
};

export type SessionTitleDecision =
  | { action: "link"; eventId: number; recordingId: number; reason: "session_title" }
  | {
      action: "none";
      reason: "ambiguous_title" | "no_title_match" | "no_anchor" | "session_already_has_recording";
    };

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

function within(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= SESSION_MATCH_WINDOW_MS;
}

function eventWeek(event: SessionMatchEvent): number | null {
  return weekFromTitle(event.title) ?? (event.episodeNumber && event.episodeNumber > 0 ? event.episodeNumber : null);
}

function titleWeek(title: string): number | null {
  const fromLabel = weekFromTitle(title);
  if (fromLabel) return fromLabel;
  const fromCurriculum = curriculumHit(title)?.week ?? null;
  if (fromCurriculum) return fromCurriculum;
  const ep = seasonEpisode(title);
  if (ep?.season === 2) return ep.episode;
  return null;
}

export function sessionTitleAnchored(title: string): boolean {
  if (seasonEpisode(title)) return true;
  if (weekFromTitle(title)) return true;
  if (curriculumHit(title)) return true;
  return distinctive(title).length >= 8;
}

function titlesMatch(recordingTitle: string, event: SessionMatchEvent): boolean {
  const episode = seasonEpisode(recordingTitle);
  const evEpisode = seasonEpisode(event.title);
  if (episode && evEpisode && episode.season === evEpisode.season && episode.episode === evEpisode.episode) {
    return true;
  }
  const week = titleWeek(recordingTitle);
  const evWeek = eventWeek(event);
  if (week && evWeek === week) return true;
  return phrasesOverlap(recordingTitle, event.title);
}

function inWindow(recording: { sessionDate: Date | null }, event: SessionMatchEvent): boolean {
  if (!(recording.sessionDate instanceof Date) || !Number.isFinite(recording.sessionDate.getTime())) return false;
  if (!(event.startTime instanceof Date) || !Number.isFinite(event.startTime.getTime())) return false;
  return within(recording.sessionDate, event.startTime);
}

/**
 * One unlinked event in the 14-day window, or none.
 * A session that already has a different recording is not a second publish.
 */
export function matchRecordingToEvents(
  recording: { id: number; title: string; sessionDate: Date | null },
  events: SessionMatchEvent[],
): SessionTitleDecision {
  if (!sessionTitleAnchored(recording.title)) return { action: "none", reason: "no_anchor" };
  const hits = events.filter((event) => inWindow(recording, event) && titlesMatch(recording.title, event));
  const open = hits.filter((event) => event.recordingId == null);
  if (open.length === 1) {
    return { action: "link", eventId: open[0].id, recordingId: recording.id, reason: "session_title" };
  }
  if (open.length > 1) return { action: "none", reason: "ambiguous_title" };
  if (hits.length > 0) return { action: "none", reason: "session_already_has_recording" };
  return { action: "none", reason: "no_title_match" };
}

/** Reverse pass for Repair links. Two recordings for one event stay unlinked. */
export function matchEventToRecordings(
  event: SessionMatchEvent,
  recordings: SessionMatchRecording[],
): SessionTitleDecision {
  if (event.recordingId != null) return { action: "none", reason: "no_title_match" };
  const hits = recordings.filter(
    (rec) => sessionTitleAnchored(rec.title) && inWindow(rec, event) && titlesMatch(rec.title, event),
  );
  if (hits.length === 1) {
    return { action: "link", eventId: event.id, recordingId: hits[0].id, reason: "session_title" };
  }
  if (hits.length > 1) return { action: "none", reason: "ambiguous_title" };
  return { action: "none", reason: "no_title_match" };
}
