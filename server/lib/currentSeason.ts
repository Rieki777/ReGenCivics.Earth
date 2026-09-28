/**
 * Current-season helper for Sage (and any other season-window checks).
 *
 * Reuses shared/regenYear.ts — the single definition of the ReGen Civics Year
 * (Design / Resource / Build / Rest). Sage evaluates daily contribution
 * snapshots inside the current season's [start, end) window.
 */
import {
  regenSeasonSpan,
  type RegenSeasonSpan,
} from "@shared/regenYear";

export type CurrentSeasonWindow = RegenSeasonSpan;

/** Current Game season span (key, number, start, end, progress). */
export function getCurrentSeason(now: Date = new Date()): CurrentSeasonWindow {
  return regenSeasonSpan(now);
}

/** Inclusive start / exclusive end of the current season as Date objects. */
export function getCurrentSeasonDateRange(now: Date = new Date()): {
  start: Date;
  end: Date;
  season: CurrentSeasonWindow;
} {
  const season = regenSeasonSpan(now);
  return { start: season.start, end: season.end, season };
}

/**
 * Format a Date as YYYY-MM-DD in UTC for snapshotDate comparisons.
 * Snapshots are stored as UTC calendar days.
 */
export function toUtcDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
