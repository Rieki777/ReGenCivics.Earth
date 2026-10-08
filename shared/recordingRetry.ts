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

/**
 * Written when a finished livestream still had lengthSeconds 0, so the old
 * ended check said it was not over. That delay should not keep the row waiting.
 */
export const FALSE_NOT_ENDED_ERROR = "stream has not ended (none)";

export function falseStreamNotEnded(lastError: string | null | undefined): boolean {
  return (lastError ?? "").trim() === FALSE_NOT_ENDED_ERROR;
}

/** A false "not ended" miss sorts with the rows that have never been tried. */
export function effectiveRetryAttempts(row: {
  processAttempts?: number | null;
  lastError?: string | null;
}): number {
  if (falseStreamNotEnded(row.lastError)) return 0;
  return row.processAttempts ?? 0;
}

/** Next time to try, or null when automatic retries are finished. */
export function nextProcessRetry(attemptCount: number, now: Date): Date | null {
  const delay = CAPTION_RETRY_DELAYS_MS[attemptCount - 1];
  if (delay == null) return null;
  return new Date(now.getTime() + delay);
}

/**
 * A saved recording already made it into the table, so a missing watch page
 * is a bot wall, not a reason to skip captions. Wait only when YouTube still
 * says the stream is live or upcoming.
 */
export function captionRetryDespiteWatch(meta: {
  status: "unknown" | "ok";
  liveBroadcastContent?: "live" | "upcoming" | "none";
}): "fetch" | "wait" {
  if (
    meta.status === "ok" &&
    (meta.liveBroadcastContent === "live" || meta.liveBroadcastContent === "upcoming")
  ) {
    return "wait";
  }
  return "fetch";
}

/** Never-tried rows first, then the newest recording. Matches the retry sweep. */
export function compareRetryQueue(
  a: { id: number; processAttempts?: number | null },
  b: { id: number; processAttempts?: number | null },
): number {
  const attempts = (a.processAttempts ?? 0) - (b.processAttempts ?? 0);
  if (attempts !== 0) return attempts;
  return b.id - a.id;
}

export function recordingNeedsAutoRetry(
  row: {
    youtubeVideoId?: string | null;
    transcript?: string | null;
    overview?: string | null;
    aiSummary?: string | null;
    processAttempts?: number | null;
    nextRetryAt?: Date | string | null;
    lastError?: string | null;
  },
  now: Date,
): boolean {
  if (!(row.youtubeVideoId ?? "").trim()) return false;
  if ((row.transcript ?? "").trim()) return false;
  if ((row.overview ?? "").trim() || (row.aiSummary ?? "").trim()) return false;
  const attempts = row.processAttempts ?? 0;
  if (attempts >= MAX_PROCESS_ATTEMPTS) return false;
  if (falseStreamNotEnded(row.lastError)) return true;
  if (row.nextRetryAt) {
    const at = row.nextRetryAt instanceof Date ? row.nextRetryAt : new Date(row.nextRetryAt);
    if (Number.isFinite(at.getTime()) && at.getTime() > now.getTime()) return false;
  }
  return true;
}
