/**
 * Backoff for a recording that still has no transcript and no summary.
 * Hourly for 48 attempts, then daily for 7, then stop. Admin reprocess
 * can still run after the window.
 */

export const HOURLY_ATTEMPTS = 48;
export const DAILY_ATTEMPTS = 7;
export const MAX_PROCESS_ATTEMPTS = HOURLY_ATTEMPTS + DAILY_ATTEMPTS;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Next time to try, or null when automatic retries are finished. */
export function nextProcessRetry(attemptCount: number, now: Date): Date | null {
  if (attemptCount <= HOURLY_ATTEMPTS) {
    return new Date(now.getTime() + HOUR_MS);
  }
  if (attemptCount <= MAX_PROCESS_ATTEMPTS) {
    return new Date(now.getTime() + DAY_MS);
  }
  return null;
}

export function recordingNeedsAutoRetry(
  row: {
    youtubeVideoId?: string | null;
    transcript?: string | null;
    overview?: string | null;
    aiSummary?: string | null;
    processAttempts?: number | null;
    nextRetryAt?: Date | string | null;
  },
  now: Date,
): boolean {
  if (!(row.youtubeVideoId ?? "").trim()) return false;
  if ((row.transcript ?? "").trim()) return false;
  if ((row.overview ?? "").trim() || (row.aiSummary ?? "").trim()) return false;
  const attempts = row.processAttempts ?? 0;
  if (attempts >= MAX_PROCESS_ATTEMPTS) return false;
  if (row.nextRetryAt) {
    const at = row.nextRetryAt instanceof Date ? row.nextRetryAt : new Date(row.nextRetryAt);
    if (Number.isFinite(at.getTime()) && at.getTime() > now.getTime()) return false;
  }
  return true;
}
