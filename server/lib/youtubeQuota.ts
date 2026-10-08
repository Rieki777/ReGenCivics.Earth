/**
 * YouTube Data API budget for one server process.
 * A quotaExceeded response stops Data API calls until the next midnight
 * Pacific. Caption downloads are also capped per pipeline run.
 */

export const YOUTUBE_CAPTION_DOWNLOADS_PER_RUN = 2;
export const YOUTUBE_QUOTA_STOP_ERROR = "youtube quota cooldown";

const PACIFIC = "America/Los_Angeles";

let captionDownloads = 0;
let stoppedThisRun = false;
let cooldownUntilMs = 0;

export function resetYoutubeQuotaForTests(): void {
  captionDownloads = 0;
  stoppedThisRun = false;
  cooldownUntilMs = 0;
}

export function beginYoutubeQuotaRun(): void {
  captionDownloads = 0;
  stoppedThisRun = false;
}

export function endYoutubeQuotaRun(): void {
  captionDownloads = 0;
  stoppedThisRun = false;
}

function pacificOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return wallAsUtc - instant.getTime();
}

/** The next 00:00 America/Los_Angeles strictly after `now`. */
export function nextMidnightPacific(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wallMidnight = Date.UTC(value("year"), value("month") - 1, value("day") + 1, 0, 0, 0);
  const offset = pacificOffsetMs(new Date(wallMidnight));
  return new Date(wallMidnight - offset);
}

export function isYoutubeQuotaExceeded(status: number, body: string): boolean {
  return status === 403 && /quotaExceeded/i.test(body);
}

export function isYoutubeQuotaStop(error: string): boolean {
  return /quotaExceeded/i.test(error) || error.includes(YOUTUBE_QUOTA_STOP_ERROR);
}

export function noteYoutubeQuotaExceeded(now = new Date()): void {
  stoppedThisRun = true;
  cooldownUntilMs = nextMidnightPacific(now).getTime();
}

/** Null when a Data API call is allowed. Otherwise the reason to skip it. */
export function youtubeDataApiBlocked(now = Date.now()): string | null {
  if (stoppedThisRun || now < cooldownUntilMs) return YOUTUBE_QUOTA_STOP_ERROR;
  return null;
}

/** True when this run may spend one caption-download against the Data API. */
export function takeCaptionDownloadSlot(): boolean {
  if (youtubeDataApiBlocked()) return false;
  if (captionDownloads >= YOUTUBE_CAPTION_DOWNLOADS_PER_RUN) return false;
  captionDownloads += 1;
  return true;
}

export function youtubeCaptionDownloadsThisRun(): number {
  return captionDownloads;
}
