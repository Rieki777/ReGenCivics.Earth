/**
 * Series chip for the public recordings library.
 */
import { curriculumHit, seasonEpisode } from "./recordingSessionMatch";

export type RecordingSeries = "season2" | "open" | "seeds" | "other";

export function recordingSeries(input: {
  title?: string | null;
  eventTitle?: string | null;
  eventSeason?: string | null;
}): RecordingSeries {
  const title = `${input.title ?? ""} ${input.eventTitle ?? ""}`.trim();
  const season = (input.eventSeason ?? "").toLowerCase();
  const episode = seasonEpisode(title);
  if (season.includes("2") || episode?.season === 2 || curriculumHit(title) || /\bweek\s+\d+\b/i.test(input.eventTitle ?? "")) {
    return "season2";
  }
  if (/open session|open access/i.test(title)) return "open";
  if (/\bseeds\b/i.test(title)) return "seeds";
  return "other";
}
