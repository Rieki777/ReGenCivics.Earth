/**
 * Read a YouTube description at send time.
 * Chapters are edited after upload, so a description saved on the first poll
 * is not the one the letter should use.
 */
import {
  coerceChapters,
  parseDescriptionChapters,
  type YoutubeChapter,
} from "../../shared/youtubeChapters";

const WATCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Unescape the JSON string YouTube embeds as shortDescription. */
export function extractShortDescription(html: string): string | null {
  const key = '"shortDescription":"';
  const start = html.indexOf(key);
  if (start < 0) return null;
  let i = start + key.length;
  let out = "";
  while (i < html.length) {
    const ch = html[i];
    if (ch === '"') return out;
    if (ch === "\\") {
      const next = html[i + 1];
      if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === '"') out += '"';
      else if (next === "\\") out += "\\";
      else if (next === "/" ) out += "/";
      else if (next === "u" && /^[0-9a-fA-F]{4}/.test(html.slice(i + 2, i + 6))) {
        out += String.fromCharCode(parseInt(html.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      } else if (next) out += next;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return null;
}

export async function fetchYouTubeDescription(
  videoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!/^[\w-]{11}$/.test(videoId)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      signal: ctrl.signal,
      headers: WATCH_HEADERS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const description = extractShortDescription(html);
    return description;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type FreshChapters = {
  chapters: YoutubeChapter[];
  /** True when a description was fetched on this call. Empty means the description has no chapters. */
  fromDescription: boolean;
};

/**
 * Prefer the description fetched now. A failed fetch keeps the last stored list.
 */
export async function chaptersForSend(opts: {
  videoId: string | null;
  stored: unknown;
  fetchDescription?: (videoId: string) => Promise<string | null>;
}): Promise<FreshChapters> {
  const stored = coerceChapters(opts.stored);
  if (!opts.videoId) return { chapters: stored, fromDescription: false };
  const fetchDescription = opts.fetchDescription ?? fetchYouTubeDescription;
  const fresh = await fetchDescription(opts.videoId);
  if (fresh == null) return { chapters: stored, fromDescription: false };
  return { chapters: parseDescriptionChapters(fresh), fromDescription: true };
}
