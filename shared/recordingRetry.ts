/**
 * Backoff while YouTube captions are still missing.
 * Auto-captions often appear a while after upload, so the waits are
 * 15 minutes, 1 hour, 6 hours, and 24 hours. The fifth miss stops
 * automatic retries. Admin reprocess can still run after that.
 */

export const CAPTION_RETRY_DELAYS_MS = [
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
] as const;

/** Four scheduled waits, then one last try that marks the row finished. */
export const MAX_PROCESS_ATTEMPTS = CAPTION_RETRY_DELAYS_MS.length + 1;

/** Next time to try, or null when automatic retries are finished. */
export function nextProcessRetry(attemptCount: number, now: Date): Date | null {
  const delay = CAPTION_RETRY_DELAYS_MS[attemptCount - 1];
  if (delay == null) return null;
  return new Date(now.getTime() + delay);
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
