/**
 * A week's board as a self-paced course: one clip per stage, on the live
 * recording and on the edited cut. Public. Progress in the browser, and on
 * the server when someone is signed in.
 */
import { boardStages, hasSessionBoard, SESSION_BOARD_SEASON } from "./sessionBoard";
import { extractYoutubeVideoId } from "./youtubeVideoId";

export type CourseMode = "live" | "edited";
export type CourseConfidence = "high" | "low";

export type CourseSpan = {
  stageIndex: number;
  liveStart: number | null;
  liveEnd: number | null;
  editedStart: number | null;
  editedEnd: number | null;
  /** Confidence of the live times. Null when that side has no time. */
  liveConfidence: CourseConfidence | null;
  /** Confidence of the edited times. Null when that side has no time. */
  editedConfidence: CourseConfidence | null;
  /** Low when any stored side still needs a look. */
  confidence: CourseConfidence;
  evidence: string;
  /** An admin saved this row. Auto-map must not replace a time they set. */
  adminEdited: boolean;
};

export type CourseMap = {
  season: string;
  week: number;
  liveVideoId: string | null;
  editedVideoId: string | null;
  spans: CourseSpan[];
};

export type CourseLocalProgress = {
  mode: CourseMode;
  stage: number;
  watched: number[];
};

export function courseStorageKey(season: string, week: number): string {
  return `regen-course:${season}:${week}`;
}

export function emptySpan(stageIndex: number, evidence = ""): CourseSpan {
  return {
    stageIndex,
    liveStart: null,
    liveEnd: null,
    editedStart: null,
    editedEnd: null,
    liveConfidence: null,
    editedConfidence: null,
    confidence: "low",
    evidence,
    adminEdited: false,
  };
}

/** A clip is shown when that side is high confidence, or an admin saved the row. */
export function publishedSpan(span: CourseSpan | undefined, mode: CourseMode): { start: number; end: number | null } | null {
  if (!span) return null;
  const start = mode === "live" ? span.liveStart : span.editedStart;
  const end = mode === "live" ? span.liveEnd : span.editedEnd;
  const side = mode === "live" ? span.liveConfidence : span.editedConfidence;
  const confidence = side ?? span.confidence;
  if (confidence !== "high" && !span.adminEdited) return null;
  if (start == null || start < 0) return null;
  if (end != null && end <= start) return { start, end: null };
  return { start, end: end ?? null };
}

export function videoIdFor(map: CourseMap, mode: CourseMode): string | null {
  const id = mode === "live" ? map.liveVideoId : map.editedVideoId;
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Both recordings present: a toggle. One recording: that side only. */
export function courseModes(map: CourseMap): CourseMode[] {
  const modes: CourseMode[] = [];
  if (videoIdFor(map, "live")) modes.push("live");
  if (videoIdFor(map, "edited")) modes.push("edited");
  return modes;
}

/** True when at least one stage has a published clip on this side. */
export function sideHasTimes(map: CourseMap, mode: CourseMode): boolean {
  return map.spans.some((span) => publishedSpan(span, mode) != null);
}

/**
 * Prefer the side the player last chose when that side has times.
 * An empty side stays unselected so the board opens on a clip.
 */
export function defaultCourseMode(map: CourseMap, preferred: CourseMode): CourseMode {
  const modes = courseModes(map);
  if (modes.length === 0) return preferred;
  if (modes.includes(preferred) && sideHasTimes(map, preferred)) return preferred;
  const ready = modes.find((mode) => sideHasTimes(map, mode));
  if (ready) return ready;
  return modes.includes(preferred) ? preferred : modes[0];
}

export function readCourseProgress(raw: string | null, stageCount: number): CourseLocalProgress {
  const fallback: CourseLocalProgress = { mode: "edited", stage: 0, watched: [] };
  if (!raw) return fallback;
  try {
    const data = JSON.parse(raw) as Partial<CourseLocalProgress>;
    const stage = Number.isInteger(data.stage) ? Math.max(0, Math.min(stageCount - 1, data.stage as number)) : 0;
    const watched = Array.isArray(data.watched)
      ? [...new Set(data.watched.filter((n) => Number.isInteger(n) && n >= 0 && n < stageCount))]
      : [];
    const mode: CourseMode = data.mode === "live" ? "live" : "edited";
    return { mode, stage, watched };
  } catch {
    return fallback;
  }
}

/** Week number for a recording, from its linked episode or from the title. */
export function courseWeekFromRecording(input: {
  title?: string | null;
  eventTitle?: string | null;
  season?: string | null;
  episodeNumber?: number | null;
}): number | null {
  const episode = input.episodeNumber;
  if (episode != null && /2/.test(input.season ?? "") && hasSessionBoard(episode)) return episode;
  const titles = [input.title, input.eventTitle].filter((part) => !!part).join("\n");
  const s2e = titles.match(/S2E(\d+)/i);
  if (s2e) {
    const n = Number(s2e[1]);
    if (hasSessionBoard(n)) return n;
  }
  const week = titles.match(/week\s*(\d+)/i);
  if (week) {
    const n = Number(week[1]);
    if (hasSessionBoard(n)) return n;
  }
  return null;
}

/** Edited cut vs the livestream. One known edited id, then the title. */
export function courseSideFromRecording(input: {
  title?: string | null;
  recordingKind?: string | null;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  editedYoutubeUrl?: string | null;
}): CourseMode {
  const ids = [input.youtubeVideoId, input.youtubeUrl, input.editedYoutubeUrl].map((value) => extractYoutubeVideoId(value));
  if (ids.includes("JS8YoJE1PUI")) return "edited";
  if (input.recordingKind === "edited") return "edited";
  const blob = `${input.title ?? ""} ${input.youtubeUrl ?? ""} ${input.editedYoutubeUrl ?? ""}`;
  if (/clean|edit|cut/i.test(blob)) return "edited";
  return "live";
}

export function formatClipClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Week 2 edited times follow the description chapters checked on 2026-10-07
 * (shared/youtubeChapters.test.ts). Live times are the livestream description
 * chapters on 23cRivDtorQ. Confidence high. Source: livestream description chapters.
 * Drop-in has a live chapter and no edited chapter.
 * Closing is the last live chapter, so that side stays open.
 * Community tools sits before closing in the livestream.
 */
export const WEEK2_COURSE_SEED: CourseMap = {
  season: SESSION_BOARD_SEASON,
  week: 2,
  liveVideoId: "23cRivDtorQ",
  editedVideoId: "JS8YoJE1PUI",
  spans: [
    reviewed(0, 0, 59, "Welcome: the open incubator model", { start: 0, end: 149 }),
    reviewed(1, null, null, "Livestream description chapters: Drop in. No edited chapter names a breath or a drop-in.", { start: 149, end: 474 }),
    reviewed(2, 59, 448, "Crowd pooling, shared equity, and collective fundraising", { start: 474, end: 1070 }),
    reviewed(3, 448, 1447, "Introducing Village OS", { start: 1070, end: 2126 }),
    reviewed(4, 1447, 1559, "Coaching opportunities for regenerative communities", { start: 2126, end: 2258 }),
    reviewed(5, 1559, 2485, "Project roundtable: surfacing community needs", { start: 2258, end: 3847 }),
    reviewed(6, 2485, 2672, "Shared opportunities and priorities for the season", { start: 3847, end: 4104 }),
    reviewed(7, 2672, 3161, "Defining what success looks like", { start: 4104, end: 4770 }),
    reviewed(8, 3161, 3840, "Choosing the sessions that best support each project", { start: 4770, end: 5271 }),
    reviewed(9, 4300, null, "Closing", { start: 5922, end: null }),
    reviewed(10, 3840, 4300, "Community tools, project profiles, and getting involved", { start: 5271, end: 5922 }),
  ],
};

function reviewed(
  stageIndex: number,
  editedStart: number | null,
  editedEnd: number | null,
  evidence: string,
  live: { start: number; end: number | null },
): CourseSpan {
  return {
    stageIndex,
    liveStart: live.start,
    liveEnd: live.end,
    editedStart,
    editedEnd,
    liveConfidence: "high",
    editedConfidence: editedStart == null ? null : "high",
    confidence: "high",
    evidence,
    adminEdited: true,
  };
}

export function seedCourse(week: number): CourseMap | null {
  if (!hasSessionBoard(week)) return null;
  if (week === 2) return WEEK2_COURSE_SEED;
  return {
    season: SESSION_BOARD_SEASON,
    week,
    liveVideoId: null,
    editedVideoId: null,
    spans: boardStages(week).map((_, i) => emptySpan(i)),
  };
}
