/**
 * Applies the recording-letter guards against the database, then sends.
 * The claim update runs before send so a retry cannot double-send.
 */
import { and, eq } from "drizzle-orm";
import { recordings } from "../../drizzle/schema";
import {
  RECORDING_MAIL_BATCHES_PER_DAY,
  RECORDING_MAIL_TOO_OLD_LOG,
  applyRecordingMailEffect,
  recordingMailEffect,
  type RecordingMailApplyResult,
} from "../../shared/recordingMailGuard";
import { logger } from "../_core/logger";
import { getDb } from "../db";
import { countRecordingMailBatchesSince } from "../emailTracking";
import { noteRecordingMailBatch, recordingMailBatchesThisRun } from "./recordingMailBudget";

const log = logger("recording-mail");
const DAY_MS = 24 * 60 * 60 * 1000;

function affectedRows(result: unknown): number {
  const row = result as { affectedRows?: number; 0?: { affectedRows?: number } } | null;
  return Number(row?.[0]?.affectedRows ?? row?.affectedRows ?? 0);
}

export async function guardRecordingSubscriberMail(opts: {
  id: number;
  title: string | null;
  sessionDate: Date | string | null;
  createdAt: Date | string | null;
  automatic: boolean;
  claim: "emailSent" | "editedEmailSent";
  alreadySent?: boolean;
  send: () => Promise<{ accepted: number; dropped: number }>;
}): Promise<RecordingMailApplyResult> {
  const database = await getDb();
  if (!database) {
    log.error(`recording ${opts.id} mail skipped: database unavailable`);
    return { sent: false, accepted: 0, dropped: 1, held: "needs_review" };
  }

  let batchesLast24h = 0;
  if (opts.automatic) {
    try {
      batchesLast24h = await countRecordingMailBatchesSince(new Date(Date.now() - DAY_MS));
    } catch (err) {
      log.error("recording mail cap lookup failed", err);
      batchesLast24h = RECORDING_MAIL_BATCHES_PER_DAY;
    }
  }

  const effect = recordingMailEffect({
    title: opts.title,
    sessionDate: opts.sessionDate,
    createdAt: opts.createdAt,
    now: new Date(),
    batchesThisRun: recordingMailBatchesThisRun(),
    batchesLast24h,
    automatic: opts.automatic,
  });

  return applyRecordingMailEffect(effect, {
    send: opts.send,
    markTooOld: async () => {
      await database
        .update(recordings)
        .set({ emailSent: 1, editedEmailSent: 1 })
        .where(eq(recordings.id, opts.id));
      log.info(`recording ${opts.id} ${RECORDING_MAIL_TOO_OLD_LOG}`);
    },
    holdForReview: async (lastError) => {
      await database
        .update(recordings)
        .set({ lastError: lastError.slice(0, 500) })
        .where(eq(recordings.id, opts.id));
      log.info(`recording ${opts.id} ${lastError}`);
    },
    claim: async () => {
      if (opts.alreadySent && !opts.automatic) return true;
      const flag = opts.claim === "editedEmailSent" ? recordings.editedEmailSent : recordings.emailSent;
      const patch = opts.claim === "editedEmailSent" ? { editedEmailSent: 1 } : { emailSent: 1 };
      const result = await database
        .update(recordings)
        .set(patch)
        .where(and(eq(recordings.id, opts.id), eq(flag, 0)));
      return affectedRows(result) === 1;
    },
    noteBatch: () => {
      if (opts.automatic) noteRecordingMailBatch();
    },
  });
}
