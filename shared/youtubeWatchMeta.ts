/**
 * Read live / ended state from a YouTube watch page.
 * A stream is ready to save when liveBroadcastContent is none and a duration exists.
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

function videoTitle(html: string): string | null {
  const fromDetails = html.match(/"videoDetails":\{"videoId":"[^"]+","title":"((?:\\.|[^"\\])*)"/);
  if (fromDetails?.[1]) {
    return fromDetails[1]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\n/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
  }
  return extractJsonString(html, "title");
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

  const ended =
    liveBroadcastContent === "none" &&
    durationSeconds != null &&
    durationSeconds > 0 &&
    !isLiveNow &&
    !isUpcoming;

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
