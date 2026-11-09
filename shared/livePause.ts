/**
 * Pausing a live session series (Rye, 2026-11-09; ADR in .ai/docs/DECISIONS.md).
 *
 * Season 2 and the monthly Open Access calls each get the same pause the
 * Interoperability Circle has (shared/interopCircle.ts, INTEROP_PAUSED_SETTING):
 * one switch per series on Admin > Events. While a series is paused:
 *
 *   - every upcoming session in it is cancelled and its auto-reminders are
 *     switched off (server/lib/livePause.ts), so no reminder email goes out;
 *   - the calendar feeds send those sessions as STATUS:CANCELLED, which takes
 *     them off every subscriber's calendar;
 *   - the site shows the pause notice in place of the next session, and hides
 *     the subscribe and add-to-calendar buttons;
 *   - its upcoming sessions are removed from the public Google Calendar.
 *
 * Resume reopens exactly the sessions the pause cancelled (their ids are kept
 * in the setting), reminders included. A session an admin cancelled by hand
 * stays cancelled. Each row keeps its calendar UID, so a reopened session comes
 * back onto subscribers' calendars as an update.
 */

export const LIVE_SERIES = ["season2", "open_access"] as const;
export type LiveSeries = (typeof LIVE_SERIES)[number];

export const LIVE_SERIES_LABEL: Record<LiveSeries, string> = {
  season2: "Season 2",
  open_access: "Open Access sessions",
};

/** site_settings key per series. The value is LivePauseState JSON, or "" when running. */
export const LIVE_PAUSE_SETTING: Record<LiveSeries, string> = {
  season2: "live_pause_season2",
  open_access: "live_pause_open_access",
};

export type LivePauseState = {
  /** ISO time the series was paused. */
  pausedAt: string;
  /** Event ids the pause cancelled; resume reopens exactly these. */
  cancelledIds: number[];
};

export function parseLivePause(raw: string | null | undefined): LivePauseState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LivePauseState>;
    if (!v || typeof v !== "object" || typeof v.pausedAt !== "string") return null;
    const ids = Array.isArray(v.cancelledIds)
      ? v.cancelledIds.filter((n): n is number => Number.isInteger(n) && n > 0)
      : [];
    return { pausedAt: v.pausedAt, cancelledIds: ids };
  } catch {
    return null;
  }
}

/** Which paused-able series an events row belongs to, if any. */
export function liveSeriesOf(row: {
  title?: string | null;
  type?: string | null;
  season?: string | null;
}): LiveSeries | null {
  if (row.season === "Season 2" && row.type === "episode") return "season2";
  if (row.type === "open" && /open access/i.test(row.title ?? "")) return "open_access";
  return null;
}

/** Which series a Google Calendar summary names, if any. */
export function liveSeriesOfSummary(summary: string | null | undefined): LiveSeries | null {
  const s = summary ?? "";
  if (/open access/i.test(s)) return "open_access";
  if (/season 2/i.test(s) || /^week \d+\s*:/i.test(s)) return "season2";
  return null;
}

/** Public pause state, as events.livePause returns it. */
export type LivePauseStatus = Record<LiveSeries, boolean>;

/** The words the site shows in place of the next session and calendar links. */
export const LIVE_PAUSE_NOTICE = {
  heading: "Live sessions are on pause",
  body:
    "Thank you to everyone who came to Season 2 and the Open Access calls. We learned a ton. Rye is recording how-to videos for each part of what we built, and they will arrive by email so you can keep building your economies together.",
  recordingsLabel: "Watch the Season 2 recordings",
  recordingsHref: "/recordings",
} as const;
