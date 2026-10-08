/**
 * When a recording letter is allowed to go to subscribers.
 * Old backfills, numeric titles, and extra batches stop here, before send.
 */

export const RECORDING_MAIL_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
export const RECORDING_MAIL_BATCHES_PER_RUN = 1;
export const RECORDING_MAIL_BATCHES_PER_DAY = 2;
export const RECORDING_MAIL_TOO_OLD_LOG = "skipped: too old";
export const RECORDING_MAIL_TITLE_REVIEW = "needs review: title";
export const RECORDING_MAIL_CAP_REVIEW = "needs review: mail cap";

const FUTURE_SKEW_MS = 60 * 1000;

export type RecordingMailEffect =
  | { type: "skip_old"; log: typeof RECORDING_MAIL_TOO_OLD_LOG }
  | { type: "needs_review"; reason: "title" | "cap"; lastError: string }
  | { type: "send" };

export function recordingTitleNeedsReview(title: string | null | undefined): boolean {
  const name = (title ?? "").trim().replace(/^recording ready:\s*/i, "").trim();
  if (name.length < 4) return true;
  if (/^\d+$/.test(name)) return true;
  return false;
}

function toTime(value: Date | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Both clocks have to be inside the last 3 days.
 * sessionDate falls back to createdAt when the session date is empty.
 * A missing createdAt is not recent.
 */
export function recordingIsRecentEnough(opts: {
  sessionDate: Date | string | null;
  createdAt: Date | string | null;
  now: Date;
}): boolean {
  const created = toTime(opts.createdAt);
  if (created == null) return false;
  const session = toTime(opts.sessionDate) ?? created;
  const now = opts.now.getTime();
  const recent = (time: number) => time <= now + FUTURE_SKEW_MS && now - time <= RECORDING_MAIL_MAX_AGE_MS;
  return recent(session) && recent(created);
}

export function recordingMailEffect(opts: {
  title: string | null;
  sessionDate: Date | string | null;
  createdAt: Date | string | null;
  now: Date;
  batchesThisRun: number;
  batchesLast24h: number;
  automatic: boolean;
}): RecordingMailEffect {
  if (opts.automatic && !recordingIsRecentEnough(opts)) {
    return { type: "skip_old", log: RECORDING_MAIL_TOO_OLD_LOG };
  }
  if (recordingTitleNeedsReview(opts.title)) {
    return { type: "needs_review", reason: "title", lastError: RECORDING_MAIL_TITLE_REVIEW };
  }
  if (
    opts.automatic
    && (opts.batchesThisRun >= RECORDING_MAIL_BATCHES_PER_RUN
      || opts.batchesLast24h >= RECORDING_MAIL_BATCHES_PER_DAY)
  ) {
    return { type: "needs_review", reason: "cap", lastError: RECORDING_MAIL_CAP_REVIEW };
  }
  return { type: "send" };
}

export type RecordingMailApplyDeps = {
  send: () => Promise<{ accepted: number; dropped: number }>;
  markTooOld: () => Promise<void>;
  holdForReview: (lastError: string) => Promise<void>;
  /** True only when UPDATE … SET emailSent=1 WHERE emailSent=0 changed 1 row. */
  claim: () => Promise<boolean>;
  noteBatch: () => void;
};

export type RecordingMailApplyResult = {
  sent: boolean;
  accepted: number;
  dropped: number;
  held: "skip_old" | "needs_review" | "claimed" | null;
};

/**
 * Runs the effect. send() is called only after a successful claim.
 * skip_old and needs_review never call send.
 */
export async function applyRecordingMailEffect(
  effect: RecordingMailEffect,
  deps: RecordingMailApplyDeps,
): Promise<RecordingMailApplyResult> {
  if (effect.type === "skip_old") {
    await deps.markTooOld();
    return { sent: false, accepted: 0, dropped: 0, held: "skip_old" };
  }
  if (effect.type === "needs_review") {
    await deps.holdForReview(effect.lastError);
    return { sent: false, accepted: 0, dropped: 1, held: "needs_review" };
  }
  const claimed = await deps.claim();
  if (!claimed) {
    return { sent: false, accepted: 0, dropped: 0, held: "claimed" };
  }
  deps.noteBatch();
  const result = await deps.send();
  return { sent: true, accepted: result.accepted, dropped: result.dropped, held: null };
}
