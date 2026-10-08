/**
 * Public description chapters for a YouTube video, live or edited.
 *
 * A bot user agent gets a consent wall with no shortDescription, which is
 * why the livestream Timestamps block was missed. This uses the same browser
 * watch fetch as the recording poll, then the shared chapter parser
 * (parenthesized stamps, a Timestamps heading, minutes past 59).
 */
import { fetchYouTubeWatchMeta } from "./youtubeWatchMeta";
import type { MapChapter } from "@shared/sessionCourseMap";

export async function fetchPublicChapters(videoId: string): Promise<MapChapter[]> {
  if (!/^[\w-]{11}$/.test(videoId)) return [];
  try {
    const meta = await fetchYouTubeWatchMeta(videoId);
    if (meta.status !== "ok" || meta.chapters.length === 0) return [];
    return meta.chapters.map(({ tSeconds, title }) => ({ tSeconds, title }));
  } catch {
    return [];
  }
}
