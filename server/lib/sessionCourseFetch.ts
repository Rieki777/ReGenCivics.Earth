/**
 * Public description chapters for a YouTube video.
 * Owner captions are a separate connect flow. This path uses the watch page
 * only, and returns nothing when YouTube does not include the description.
 */
import { parseLooseChapters, type MapChapter } from "@shared/sessionCourseMap";

function unescapeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw.replace(/\\n/g, "\n").replace(/\\"/g, "\"");
  }
}

export async function fetchPublicChapters(videoId: string): Promise<MapChapter[]> {
  if (!/^[\w-]{11}$/.test(videoId)) return [];
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ReGenCivicsBot/1.0)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
    if (!match) return [];
    return parseLooseChapters(unescapeJsonString(match[1]));
  } catch {
    return [];
  }
}
