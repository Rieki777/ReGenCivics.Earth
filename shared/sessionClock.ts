/**
 * Canonical wall clock for Season 2 episodes and Open Access sessions.
 * 11:00 America/Los_Angeles. Shared so the site calendar, ICS, and the
 * events-table sync cannot drift.
 */

export const SESSION_TIME_ZONE = "America/Los_Angeles";
export const SESSION_EASTERN_ZONE = "America/New_York";
export const SESSION_START_HOUR_PT = 11;
export const SESSION_DURATION_HOURS = 2;
export const OPEN_ACCESS_TITLE = "ReGen Civics Open Access Session";

export function wallTimeInZoneToUtc(ymd: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utc));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asZone = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    const delta = wanted - asZone;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
}

export function sessionStartUtc(ymd: string): Date {
  return wallTimeInZoneToUtc(ymd, SESSION_START_HOUR_PT, 0, SESSION_TIME_ZONE);
}

export function sessionEndUtc(ymd: string): Date {
  return new Date(sessionStartUtc(ymd).getTime() + SESSION_DURATION_HOURS * 3_600_000);
}

export function zoneName(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "";
}

function ymdWeekdayUtc(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function addUtcDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0)).toISOString().slice(0, 10);
}

/** Move a same-day clash off a Season 2 Saturday onto Sunday. */
export function sundayAfterSeason2Saturday(clashDate: string): string {
  const name = ymdWeekdayUtc(clashDate);
  if (name === "Saturday") return addUtcDays(clashDate, 1);
  const tomorrow = addUtcDays(clashDate, 1);
  if (ymdWeekdayUtc(tomorrow) === "Sunday") return tomorrow;
  let cursor = tomorrow;
  while (ymdWeekdayUtc(cursor) !== "Sunday") {
    cursor = addUtcDays(cursor, 1);
  }
  return cursor;
}

export type CatalogOpenAccess = {
  publishedDate: string;
  date: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
};

/** First-published / new-moon dates. A clash with Season 2 Saturday moves the session. */
export const OPEN_ACCESS_PUBLISHED_DATES: Array<{ date: string; dayName: string }> = [
  { date: "2026-05-16", dayName: "Saturday" },
  { date: "2026-06-14", dayName: "Sunday" },
  { date: "2026-07-14", dayName: "Tuesday" },
  { date: "2026-08-12", dayName: "Wednesday" },
  { date: "2026-09-10", dayName: "Thursday" },
  { date: "2026-10-10", dayName: "Saturday" },
  { date: "2026-11-09", dayName: "Monday" },
  { date: "2026-12-08", dayName: "Tuesday" },
  { date: "2027-01-07", dayName: "Thursday" },
  { date: "2027-02-06", dayName: "Saturday" },
  { date: "2027-03-08", dayName: "Monday" },
  { date: "2027-04-06", dayName: "Tuesday" },
];

export const SEASON2_EPISODE_DATES = [
  "2026-09-26",
  "2026-10-03",
  "2026-10-10",
  "2026-10-17",
  "2026-10-24",
  "2026-10-31",
  "2026-11-07",
  "2026-11-14",
  "2026-11-21",
  "2026-11-28",
  "2026-12-05",
  "2026-12-12",
  "2026-12-19",
] as const;

const SEASON2_DATE_SET = new Set<string>(SEASON2_EPISODE_DATES);

export function catalogOpenAccessRows(): CatalogOpenAccess[] {
  return OPEN_ACCESS_PUBLISHED_DATES.map((row) => {
    const clashes = SEASON2_DATE_SET.has(row.date);
    const date = clashes ? sundayAfterSeason2Saturday(row.date) : row.date;
    const startTime = sessionStartUtc(date);
    return {
      publishedDate: row.date,
      date,
      startTime,
      endTime: sessionEndUtc(date),
      timezone: zoneName(startTime, SESSION_TIME_ZONE),
    };
  });
}
