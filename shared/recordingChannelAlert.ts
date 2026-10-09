/**
 * Telegram and WhatsApp recording alerts use the same letter rules.
 * Old backfills, numeric titles, and extra batches do not ping chat.
 * The letter has to clear on this call too, so a later finalize does not ping again
 * and the chat path never claims the email flags itself.
 */
import type { RecordingMailEffect } from "./recordingMailGuard";

export type RecordingLetterOutcome = {
  held: "skip_old" | "needs_review" | "claimed" | null;
  kind: "recording_ready" | "session_notes" | "skip";
};

export function recordingChannelAlertAllowed(
  effect: RecordingMailEffect,
  letter: RecordingLetterOutcome | null,
): boolean {
  if (effect.type !== "send") return false;
  if (!letter) return false;
  if (letter.kind === "skip") return false;
  if (letter.held) return false;
  return true;
}
