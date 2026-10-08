/**
 * Fetch a YouTube watch page and read live state, start time, and description chapters.
 */
import {
  coerceChapters,
  parseDescriptionChapters,
  type YoutubeChapter,
} from "../../shared/youtubeChapters";
import { oembedTitle, ownerSnippetMeta, parseYouTubeWatchHtml, type YoutubeWatchMeta } from "../../shared/youtubeWatchMeta";
import { getYoutubeOwnerAccessToken } from "./youtubeOwnerAuth";
import {
  isYoutubeQuotaExceeded,
  noteYoutubeQuotaExceeded,
  youtubeDataApiBlocked,
} from "./youtubeQuota";

const WATCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchYouTubeWatchMeta(
  videoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<YoutubeWatchMeta> {
  if (!/^[\w-]{11}$/.test(videoId)) return { status: "unknown" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      signal: ctrl.signal,
      headers: WATCH_HEADERS,
    });
    if (!res.ok) return { status: "unknown" };
    const html = await res.text();
    return parseYouTubeWatchHtml(html);
  } catch {
    return { status: "unknown" };
  } finally {
    clearTimeout(timer);
  }
}

/** Owner snippet when the watch page is a bot wall. No token in the result. */
export async function fetchYouTubeOwnerSnippet(
  videoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ title: string | null; chapters: YoutubeChapter[] } | null> {
  if (!/^[\w-]{11}$/.test(videoId)) return null;
  if (youtubeDataApiBlocked()) return null;
  const token = await getYoutubeOwnerAccessToken();
  if (!token.ok) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`,
      {
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${token.token}`, Accept: "application/json" },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      if (isYoutubeQuotaExceeded(res.status, body)) noteYoutubeQuotaExceeded();
      return null;
    }
    return ownerSnippetMeta(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Public video title. Works when the watch page is a bot wall. */
export async function fetchYouTubeOembedTitle(
  videoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!/^[\w-]{11}$/.test(videoId)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const page = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetchImpl(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(page)}&format=json`,
      { signal: ctrl.signal, headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    return oembedTitle(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYouTubeDescription(
  videoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const meta = await fetchYouTubeWatchMeta(videoId, fetchImpl);
  if (meta.status !== "ok") return null;
  return meta.description;
}

/**
 * Description chapters fetched now, then chapters stored from an earlier poll,
 * then AI chapters. A failed fetch keeps what we already saved.
 */
export async function chaptersForRecap(opts: {
  videoId: string | null;
  descriptionChapters: unknown;
  aiChapters: unknown;
  fetchDescription?: (videoId: string) => Promise<string | null>;
}): Promise<YoutubeChapter[]> {
  const stored = coerceChapters(opts.descriptionChapters);
  let fromDescription = stored;
  if (opts.videoId) {
    const fetchDescription = opts.fetchDescription ?? fetchYouTubeDescription;
    const fresh = await fetchDescription(opts.videoId);
    if (fresh != null) {
      const parsed = parseDescriptionChapters(fresh);
      if (parsed.length > 0) fromDescription = parsed;
    }
  }
  if (fromDescription.length > 0) return fromDescription;
  return coerceChapters(opts.aiChapters);
}
