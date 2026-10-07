/**
 * YouTube description chapters.
 *
 * Accepts the two shapes creators actually paste:
 *   (00:00) Title
 *   00:00 Title
 * and HH:MM:SS. A two-part stamp may use minutes past 59, which is how
 * YouTube writes an hour-plus mark: 64:00 is 3840 seconds, the same moment
 * as 1:04:00.
 */

export type YoutubeChapter = {
  tSeconds: number;
  title: string;
  /** Stamp as written in the description, when we have one. */
  stamp?: string;
};

const HEADING = /^(?:#{1,6}\s+)?chapters:?\s*$/i;
const STAMP = "(\\d{1,3}:\\d{2}(?::\\d{2})?)";
const MD_LINE = new RegExp(`^(?:[-*]\\s+)?\\[${STAMP}\\]\\([^)]*\\)\\s+(.+)$`);
const PAREN_LINE = new RegExp(`^(?:[-*]\\s+)?\\(${STAMP}\\)\\s+(.+)$`);
const PLAIN_LINE = new RegExp(`^(?:[-*]\\s+)?${STAMP}\\s+(.+)$`);

/** MM:SS (minutes may exceed 59) or HH:MM:SS. Returns null when the stamp is not a time. */
export function timestampToSeconds(stamp: string): number | null {
  const parts = stamp.trim().split(":").map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return null;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds > 59) return null;
    return minutes * 60 + seconds;
  }
  const [hours, minutes, seconds] = parts;
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatChapterStamp(tSeconds: number): string {
  const total = Math.max(0, Math.floor(tSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function chapterWatchUrl(videoId: string, tSeconds: number): string {
  const t = Math.max(0, Math.floor(tSeconds));
  return `https://youtu.be/${videoId}?t=${t}`;
}

export function chapterStamp(chapter: { tSeconds: number; stamp?: string }): string {
  const written = chapter.stamp?.trim();
  return written || formatChapterStamp(chapter.tSeconds);
}

function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/^[-–—]\s+/, "").trim();
}

/**
 * Pull chapter lines out of a video description.
 * A lone "Chapters" heading is skipped. Lines that are not timestamps stay out.
 */
export function parseDescriptionChapters(description: string): YoutubeChapter[] {
  const out: YoutubeChapter[] = [];
  const seen = new Set<number>();
  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || HEADING.test(line)) continue;
    const match = line.match(MD_LINE) || line.match(PAREN_LINE) || line.match(PLAIN_LINE);
    if (!match) continue;
    const stamp = match[1];
    const tSeconds = timestampToSeconds(stamp);
    const title = cleanTitle(match[2] ?? "");
    if (tSeconds == null || !title || seen.has(tSeconds)) continue;
    seen.add(tSeconds);
    out.push({ tSeconds, title, stamp });
  }
  return out;
}

export function coerceChapters(raw: unknown): YoutubeChapter[] {
  if (!Array.isArray(raw)) return [];
  const out: YoutubeChapter[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const tSeconds = Number((row as { tSeconds?: unknown }).tSeconds);
    const title = String((row as { title?: unknown }).title ?? "").trim();
    if (!Number.isFinite(tSeconds) || tSeconds < 0 || !title) continue;
    const stampRaw = (row as { stamp?: unknown }).stamp;
    const stamp = typeof stampRaw === "string" && stampRaw.trim() ? stampRaw.trim() : undefined;
    out.push(stamp ? { tSeconds: Math.floor(tSeconds), title, stamp } : { tSeconds: Math.floor(tSeconds), title });
  }
  return out;
}

/** Description chapters when the upload has them. AI chapters only fill the gap. */
export function preferredChapters(descriptionChapters: unknown, aiChapters: unknown): YoutubeChapter[] {
  const fromDescription = coerceChapters(descriptionChapters);
  if (fromDescription.length > 0) return fromDescription;
  return coerceChapters(aiChapters);
}

export function chaptersJumpMarkdown(chapters: YoutubeChapter[], videoId: string | null): string {
  if (!chapters.length) return "";
  const lines = ["## Jump to a moment", ""];
  for (const chapter of chapters) {
    const stamp = chapterStamp(chapter);
    const title = chapter.title.replace(/[\[\]]/g, "").trim() || "Chapter";
    if (videoId) lines.push(`- [${stamp} ${title}](${chapterWatchUrl(videoId, chapter.tSeconds)})`);
    else lines.push(`- ${stamp} ${title}`);
  }
  return lines.join("\n");
}
