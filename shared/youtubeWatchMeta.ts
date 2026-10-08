/**
 * Read live / ended state from a YouTube watch page.
 * A stream has ended when liveBroadcastContent is none.
 * A finished livestream often leaves lengthSeconds at 0, so duration is not required.
 * sessionDate uses the scheduled or actual start, never the publish time.
 */
import { parseDescriptionChapters, type YoutubeChapter } from "./youtubeChapters";

export type YoutubeWatchMeta =
  | { status: "unknown" }
  | {
      status: "ok";
      ended: boolean;
      liveBroadcastContent: "live" | "upcoming" | "none";
      durationSeconds: number | null;
      /** Actual or scheduled start. Null when the page has no startTimestamp. */
      startTimestamp: Date | null;
      title: string | null;
      description: string | null;
      chapters: YoutubeChapter[];
    };

/** Unescape the JSON string YouTube embeds as shortDescription. */
export function extractJsonString(html: string, key: string): string | null {
  const marker = `"${key}":"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  let i = start + marker.length;
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
      else if (next === "/") out += "/";
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

export function parseIsoDuration(iso: string): number | null {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : null;
}

function parseStart(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

function decodeTitle(raw: string): string {
  return raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** A bare number is a player field, not the video name. The retry must not store it. */
export function usableVideoTitle(raw: string | null | undefined): string | null {
  const title = raw ? decodeTitle(raw) : "";
  if (!title || /^\d+$/.test(title)) return null;
  return title;
}

function usableTitle(raw: string | null | undefined): string | null {
  return usableVideoTitle(raw);
}

/**
 * A stored "3" is the like-button title, not the video. Replace it only
 * when the candidate is a real name. A good stored title stays put.
 */
export function replacementVideoTitle(
  stored: string | null | undefined,
  candidate: string | null | undefined,
): string | null {
  if (usableVideoTitle(stored)) return null;
  const next = usableVideoTitle(candidate);
  return next ? next.slice(0, 255) : null;
}

/** Title field from a YouTube oEmbed JSON body. */
export function oembedTitle(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const title = (payload as { title?: unknown }).title;
  return usableVideoTitle(typeof title === "string" ? title : null);
}

/** Title and description chapters from videos.list snippet. */
export function ownerSnippetMeta(payload: unknown): { title: string | null; chapters: YoutubeChapter[] } {
  const empty = { title: null, chapters: [] as YoutubeChapter[] };
  if (!payload || typeof payload !== "object") return empty;
  const snippet = (payload as {
    items?: Array<{ snippet?: { title?: unknown; description?: unknown } }>;
  }).items?.[0]?.snippet;
  if (!snippet) return empty;
  const description = typeof snippet.description === "string" ? snippet.description : "";
  return {
    title: usableVideoTitle(typeof snippet.title === "string" ? snippet.title : null),
    chapters: description ? parseDescriptionChapters(description) : [],
  };
}

function videoTitle(html: string): string | null {
  const og = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1]
    ?? html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/i)?.[1];
  const fromOg = usableTitle(og);
  if (fromOg) return fromOg;
  const fromDetails = html.match(/"videoDetails":\{"videoId":"[^"]+","title":"((?:\\.|[^"\\])*)"/);
  const details = usableTitle(fromDetails?.[1]);
  if (details) return details;
  // A consent wall still embeds the watch title here. The like button's "title":"3" is not it.
  const primary = html.match(/"videoPrimaryInfoRenderer":\{"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/);
  const fromPrimary = usableTitle(primary?.[1]);
  if (fromPrimary) return fromPrimary;
  const overlay = html.match(/"playerOverlayVideoDetailsRenderer":\{"title":\{"simpleText":"((?:\\.|[^"\\])*)"/);
  const fromOverlay = usableTitle(overlay?.[1]);
  if (fromOverlay) return fromOverlay;
  const doc = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const fromDoc = usableTitle(doc?.replace(/\s+-\s+YouTube\s*$/i, ""));
  if (fromDoc) return fromDoc;
  return null;
}

/**
 * Parse a watch-page HTML snapshot. A bot wall with no player fields is unknown,
 * so the caller skips this cycle and tries again later.
 */
export function parseYouTubeWatchHtml(html: string): YoutubeWatchMeta {
  const liveRaw = html.match(/"liveBroadcastContent":"(live|upcoming|none)"/)?.[1] as
    | "live"
    | "upcoming"
    | "none"
    | undefined;
  const isLiveNow = /"isLiveNow":true/.test(html);
  const isUpcoming = /"isUpcoming":true/.test(html);
  const lengthRaw = html.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? html.match(/"lengthSeconds":(\d+)/)?.[1];
  const lengthSeconds = lengthRaw != null ? Number(lengthRaw) : null;
  const itemprop = html.match(/itemprop="duration"\s+content="([^"]+)"/)?.[1];
  const fromItemprop = itemprop ? parseIsoDuration(itemprop) : null;
  const durationSeconds =
    lengthSeconds != null && lengthSeconds > 0 ? lengthSeconds : fromItemprop;
  const description = extractJsonString(html, "shortDescription");
  const title = videoTitle(html);
  const hasPlayer =
    !!liveRaw || isLiveNow || isUpcoming || durationSeconds != null || description != null || !!title;
  if (!hasPlayer) return { status: "unknown" };

  let liveBroadcastContent: "live" | "upcoming" | "none";
  if (liveRaw === "live" || isLiveNow) liveBroadcastContent = "live";
  else if (liveRaw === "upcoming" || isUpcoming) liveBroadcastContent = "upcoming";
  else liveBroadcastContent = "none";

  // "none" is the finished state. lengthSeconds stays "0" on many ended livestreams.
  const ended =
    liveBroadcastContent === "none" &&
    !isLiveNow &&
    !isUpcoming &&
    (liveRaw === "none" || (durationSeconds != null && durationSeconds > 0));

  const startTimestamp = parseStart(html.match(/"startTimestamp":"([^"]+)"/)?.[1] ?? null);

  return {
    status: "ok",
    ended,
    liveBroadcastContent,
    durationSeconds,
    startTimestamp,
    title,
    description,
    chapters: description ? parseDescriptionChapters(description) : [],
  };
}
