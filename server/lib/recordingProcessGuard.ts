/**
 * One recording's failure stays on that row.
 * The pipeline run keeps going, and a YouTube quota stop is not an attempt.
 */

export function recordingErrorText(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 500);
}

export function isRecordingQuotaStop(error: string): boolean {
  return /quotaExceeded|youtube quota cooldown/i.test(error);
}

export async function recordRecordingCrash(opts: {
  recordingId: number;
  attempts: number;
  error: unknown;
  markFailure: (recordingId: number, attempts: number, error: string) => Promise<void>;
  log?: (line: string) => void;
}): Promise<string> {
  const error = recordingErrorText(opts.error);
  if (isRecordingQuotaStop(error)) {
    opts.log?.(`recording ${opts.recordingId} youtube quota stop; attempt not counted`);
    return error;
  }
  try {
    await opts.markFailure(opts.recordingId, opts.attempts, error);
  } catch (markErr) {
    opts.log?.(`recording ${opts.recordingId} failure was not saved: ${recordingErrorText(markErr)}`);
  }
  opts.log?.(`recording ${opts.recordingId} failed: ${error}`);
  return error;
}
