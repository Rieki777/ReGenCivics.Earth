/**
 * Match a week's board stages to moments in a recording.
 * Chapters win when they exist. A transcript fills stages the chapters missed.
 * Low scores stay low-confidence so an admin can review them.
 */
import type { BoardStage } from "./sessionBoard";
import type { CourseSpan } from "./sessionCourse";
import { parseDescriptionChapters } from "./youtubeChapters";

export type MapChapter = { tSeconds: number; title: string };
export type MapSegment = { start: number; text: string };

const STOP = new Set([
  "this", "that", "with", "from", "your", "each", "what", "when", "have", "into",
  "over", "them", "they", "will", "just", "also", "more", "some", "only", "than",
  "then", "here", "there", "about", "after", "before", "where", "which", "their",
  "today", "people", "board", "name", "room", "time", "start", "show", "leave",
  "week", "session", "stage", "building", "healthy", "making", "clear", "first",
  "help", "work", "shared", "future", "getting", "involved", "every", "needs",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP.has(word));
}

function stageTokens(stage: BoardStage): string[] {
  return tokens([stage.name, stage.short, stage.line, ...stage.cues].join(" "));
}

function hits(stageWord: string, textWords: Set<string>): boolean {
  const prefix = stageWord.slice(0, Math.min(stageWord.length, Math.max(4, stageWord.length - 1)));
  for (const word of textWords) {
    if (word === stageWord) return true;
    if (prefix.length >= 4 && word.startsWith(prefix)) return true;
  }
  return false;
}

function scoreText(stageWords: string[], text: string): number {
  const words = new Set(tokens(text));
  let score = 0;
  for (const word of stageWords) {
    if (hits(word, words)) score += 1;
  }
  const title = text.toLowerCase();
  if (title.includes("village os") && stageWords.includes("village")) score += 3;
  return score;
}

function blank(stageIndex: number, evidence: string): CourseSpan {
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

type Assignment = { stageIndex: number; start: number; score: number; title: string };

function assignChapters(stages: BoardStage[], chapters: MapChapter[]): Assignment[] {
  const prepared = stages.map((stage) => stageTokens(stage));
  const out: Assignment[] = [];
  let previous = 0;
  for (const chapter of chapters) {
    let best = -1;
    let bestScore = 0;
    let second = 0;
    prepared.forEach((words, index) => {
      let score = scoreText(words, chapter.title);
      if (index === previous) score += 0.25;
      if (score > bestScore) {
        second = bestScore;
        bestScore = score;
        best = index;
      } else if (score > second) {
        second = score;
      }
    });
    if (best < 0 || bestScore < 1) continue;
    out.push({ stageIndex: best, start: chapter.tSeconds, score: bestScore, title: chapter.title });
    previous = best;
  }
  return out;
}

function spansFromAssignments(
  stages: BoardStage[],
  assignments: Assignment[],
  duration: number | null,
  side: "live" | "edited",
): CourseSpan[] {
  return stages.map((stage, stageIndex) => {
    const mine = assignments.filter((row) => row.stageIndex === stageIndex);
    if (mine.length === 0) return blank(stageIndex, `No ${side} chapter matched ${stage.name}.`);
    const start = Math.min(...mine.map((row) => row.start));
    const later = assignments
      .map((row) => row.start)
      .filter((t) => t > start)
      .sort((a, b) => a - b);
    const nextOther = later.find((t) => {
      const owner = assignments.find((row) => row.start === t);
      return owner && owner.stageIndex !== stageIndex;
    });
    const end = nextOther ?? (duration != null && duration > start ? duration : null);
    const best = mine.reduce((a, b) => (b.score > a.score ? b : a));
    const confidence = best.score >= 2 ? "high" : "low";
    const span = blank(stageIndex, best.title);
    span.confidence = confidence;
    if (side === "live") {
      span.liveStart = start;
      span.liveEnd = end;
      span.liveConfidence = confidence;
    } else {
      span.editedStart = start;
      span.editedEnd = end;
      span.editedConfidence = confidence;
    }
    return span;
  });
}

function windowsFromTranscript(segments: MapSegment[]): MapChapter[] {
  const buckets = new Map<number, string[]>();
  for (const segment of segments) {
    const key = Math.floor(segment.start / 30) * 30;
    const list = buckets.get(key) ?? [];
    list.push(segment.text);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tSeconds, lines]) => ({ tSeconds, title: lines.join(" ") }));
}

/**
 * Build spans for one side of a recording. Chapters are preferred.
 * Transcript windows fill stages that chapters left empty, and those fills
 * stay low-confidence.
 */
export function mapStagesToSide(
  stages: BoardStage[],
  side: "live" | "edited",
  input: { chapters?: MapChapter[]; segments?: MapSegment[]; durationSeconds?: number | null },
): CourseSpan[] {
  const duration = input.durationSeconds ?? null;
  const chapters = [...(input.chapters ?? [])].filter((c) => Number.isFinite(c.tSeconds)).sort((a, b) => a.tSeconds - b.tSeconds);
  if (chapters.length > 0) {
    const fromChapters = spansFromAssignments(stages, assignChapters(stages, chapters), duration, side);
    const missing = fromChapters.filter((span) => (side === "live" ? span.liveStart : span.editedStart) == null);
    if (missing.length === 0 || !input.segments?.length) return fromChapters;
    const fromTranscript = spansFromAssignments(
      stages,
      assignChapters(stages, windowsFromTranscript(input.segments)),
      duration,
      side,
    );
    return fromChapters.map((span, index) => {
      const start = side === "live" ? span.liveStart : span.editedStart;
      if (start != null) return span;
      const fill = fromTranscript[index];
      if (!fill) return span;
      const fillStart = side === "live" ? fill.liveStart : fill.editedStart;
      if (fillStart == null) return span;
      return {
        ...fill,
        confidence: "low",
        liveConfidence: side === "live" && fill.liveStart != null ? "low" : fill.liveConfidence,
        editedConfidence: side === "edited" && fill.editedStart != null ? "low" : fill.editedConfidence,
        evidence: `Transcript: ${fill.evidence}`.slice(0, 500),
      };
    });
  }
  if (input.segments?.length) {
    const spans = spansFromAssignments(
      stages,
      assignChapters(stages, windowsFromTranscript(input.segments)),
      duration,
      side,
    );
    return spans.map((span) => ({
      ...span,
      confidence: "low" as const,
      liveConfidence: span.liveStart != null ? "low" as const : span.liveConfidence,
      editedConfidence: span.editedStart != null ? "low" as const : span.editedConfidence,
    }));
  }
  return stages.map((stage, index) => blank(index, `No ${side} captions for ${stage.name}.`));
}

function withSide(
  prev: CourseSpan,
  side: "live" | "edited",
  start: number,
  end: number | null,
  sideConfidence: "high" | "low",
  evidence: string,
): CourseSpan {
  const next: CourseSpan = side === "live"
    ? { ...prev, liveStart: start, liveEnd: end, liveConfidence: sideConfidence }
    : { ...prev, editedStart: start, editedEnd: end, editedConfidence: sideConfidence };
  const low = (next.liveStart != null && next.liveConfidence === "low")
    || (next.editedStart != null && next.editedConfidence === "low");
  next.confidence = low ? "low" : "high";
  if (!prev.adminEdited && sideConfidence === "high") next.evidence = evidence;
  return next;
}

/**
 * Merge a freshly mapped side into existing spans.
 * A time an admin saved stays. An empty side on that row takes a high-confidence
 * match only. A fresh map with no start leaves the previous time in place.
 */
export function mergeMappedSide(
  existing: CourseSpan[],
  mapped: CourseSpan[],
  side: "live" | "edited",
): CourseSpan[] {
  const byIndex = new Map(existing.map((span) => [span.stageIndex, span]));
  return mapped.map((fresh) => {
    const prev = byIndex.get(fresh.stageIndex);
    const freshStart = side === "live" ? fresh.liveStart : fresh.editedStart;
    const freshEnd = side === "live" ? fresh.liveEnd : fresh.editedEnd;
    const freshConfidence = (side === "live" ? fresh.liveConfidence : fresh.editedConfidence) ?? fresh.confidence;
    if (!prev) return fresh;
    if (freshStart == null) return prev;
    if (prev.adminEdited) {
      const prevStart = side === "live" ? prev.liveStart : prev.editedStart;
      if (prevStart != null || freshConfidence !== "high") return prev;
      return withSide(prev, side, freshStart, freshEnd, "high", prev.evidence);
    }
    return withSide(prev, side, freshStart, freshEnd, freshConfidence === "high" ? "high" : "low", fresh.evidence);
  });
}

/** Same rules as the description parser: Timestamps heading, (MM:SS), minutes past 59. */
export function parseLooseChapters(description: string): MapChapter[] {
  return parseDescriptionChapters(description).map(({ tSeconds, title }) => ({ tSeconds, title }));
}
