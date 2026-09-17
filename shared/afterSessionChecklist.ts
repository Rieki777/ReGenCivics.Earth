/**
 * After-session checklist for Admin Events (past / completed sessions).
 * Pure status helpers — UI + localStorage overrides live in the client component.
 */

import { postSessionLetterIdempotencyKey } from "./postSessionLetter";

export type ChecklistItemId =
  | "watch"
  | "edited_cut"
  | "post_session_letter"
  | "recording_email"
  | "mark_completed";

export type ChecklistItemStatus =
  | "done"
  | "pending"
  | "optional"
  | "action"
  | "na";

export type AfterSessionChecklistItem = {
  id: ChecklistItemId;
  label: string;
  status: ChecklistItemStatus;
  /** Deep link into admin (or null when N/A). */
  href: string | null;
  /** Short scannable hint. */
  detail: string;
  /** When true, UI may render a primary action (draft letter / mark completed). */
  canAct: boolean;
};

export type AfterSessionRecordingLike = {
  id: number;
  youtubeUrl?: string | null;
  editedYoutubeUrl?: string | null;
  riversideUrl?: string | null;
  youtubeVideoId?: string | null;
  /** 0/1 or boolean — present on recordings rows. */
  emailSent?: number | boolean | null;
  overview?: string | null;
  aiSummary?: string | null;
};

export type AfterSessionEventLike = {
  id: number;
  status?: string | null;
  recordingId?: number | null;
  youtubeUrl?: string | null;
};

export type AfterSessionLetterLike = {
  /** newsletter_issues.id when a post-session draft/sent row exists */
  issueId?: number | null;
  status?: string | null;
};

function nonEmpty(value: string | null | undefined): boolean {
  return Boolean((value ?? "").trim());
}

export function hasWatchLinked(
  event: AfterSessionEventLike,
  recording: AfterSessionRecordingLike | null | undefined,
): boolean {
  if (recording) {
    if (nonEmpty(recording.editedYoutubeUrl)) return true;
    if (nonEmpty(recording.youtubeUrl)) return true;
    if (nonEmpty(recording.riversideUrl)) return true;
    if (nonEmpty(recording.youtubeVideoId)) return true;
  }
  if (nonEmpty(event.youtubeUrl)) return true;
  if (event.recordingId != null && event.recordingId > 0) return true;
  return false;
}

export function hasRawRecording(
  recording: AfterSessionRecordingLike | null | undefined,
): boolean {
  if (!recording) return false;
  return (
    nonEmpty(recording.youtubeUrl) ||
    nonEmpty(recording.riversideUrl) ||
    nonEmpty(recording.youtubeVideoId)
  );
}

export function hasEditedCut(
  recording: AfterSessionRecordingLike | null | undefined,
): boolean {
  return nonEmpty(recording?.editedYoutubeUrl);
}

export function isRecordingEmailSent(
  recording: AfterSessionRecordingLike | null | undefined,
): boolean | null {
  if (!recording || recording.emailSent == null) return null;
  return Number(recording.emailSent) === 1 || recording.emailSent === true;
}

export function isUpcomingButPast(
  event: AfterSessionEventLike,
  isPast: boolean,
): boolean {
  if (!isPast) return false;
  const status = (event.status || "").toLowerCase();
  return status === "upcoming" || status === "live";
}

export function letterExists(
  letter: AfterSessionLetterLike | null | undefined,
): boolean {
  return letter != null && letter.issueId != null && letter.issueId > 0;
}

/**
 * Build the five checklist rows for one past/completed event.
 * `isPast` should already be true (caller filters); still used for mark-completed.
 */
export function buildAfterSessionChecklist(opts: {
  event: AfterSessionEventLike;
  recording?: AfterSessionRecordingLike | null;
  letter?: AfterSessionLetterLike | null;
  isPast: boolean;
}): AfterSessionChecklistItem[] {
  const { event, recording = null, letter = null, isPast } = opts;
  const recId = recording?.id ?? event.recordingId ?? null;
  const watchOk = hasWatchLinked(event, recording);
  const rawOk = hasRawRecording(recording);
  const cutOk = hasEditedCut(recording);
  const emailSent = isRecordingEmailSent(recording);
  const status = (event.status || "").toLowerCase();
  const alreadyCompleted = status === "completed";
  const needsMarkCompleted = isUpcomingButPast(event, isPast);

  const watch: AfterSessionChecklistItem = {
    id: "watch",
    label: "Recording / Watch linked",
    status: watchOk ? "done" : "pending",
    href: recId
      ? `/admin?tab=recordings`
      : `/admin?tab=events&filter=past`,
    detail: watchOk
      ? recId
        ? `Recording #${recId}`
        : "Event YouTube linked"
      : "No Watch path yet",
    canAct: false,
  };

  const editedCut: AfterSessionChecklistItem = {
    id: "edited_cut",
    label: "Edited cut",
    status: !rawOk && !cutOk ? "na" : cutOk ? "done" : "optional",
    href: recId ? `/admin?tab=edited-cuts` : `/admin?tab=edited-cuts`,
    detail: !rawOk && !cutOk
      ? "Optional until raw exists"
      : cutOk
        ? "Edited YouTube published"
        : "Raw exists — cut optional",
    canAct: false,
  };

  const letterItem: AfterSessionChecklistItem = {
    id: "post_session_letter",
    label: "Draft post-session letter",
    status: !recId
      ? "na"
      : letterExists(letter)
        ? "done"
        : "action",
    href: letterExists(letter)
      ? `/admin?tab=outbound&surface=write`
      : recId
        ? `/admin?tab=outbound&surface=write`
        : null,
    detail: !recId
      ? "Needs a linked recording"
      : letterExists(letter)
        ? `Letter #${letter!.issueId}${letter?.status ? ` (${letter!.status})` : ""}`
        : "Create Outbound draft (never auto-sends)",
    canAct: Boolean(recId),
  };

  const emailItem: AfterSessionChecklistItem = {
    id: "recording_email",
    label: "Recording email sent",
    status:
      emailSent == null
        ? recording
          ? "pending"
          : "na"
        : emailSent
          ? "done"
          : "pending",
    href: recId ? `/admin?tab=recordings` : null,
    detail:
      emailSent == null
        ? recording
          ? "emailSent field unknown"
          : "No recording — N/A"
        : emailSent
          ? "Summary email marked sent"
          : "Not sent yet",
    canAct: false,
  };

  const markCompleted: AfterSessionChecklistItem = {
    id: "mark_completed",
    label: "Mark completed",
    status: alreadyCompleted
      ? "done"
      : needsMarkCompleted
        ? "action"
        : status === "cancelled"
          ? "na"
          : isPast
            ? "pending"
            : "na",
    href: `/admin?tab=events&filter=past`,
    detail: alreadyCompleted
      ? "Status is completed"
      : needsMarkCompleted
        ? `Still "${status}" but wall-clock past`
        : status === "cancelled"
          ? "Cancelled"
          : "Status OK",
    canAct: needsMarkCompleted,
  };

  return [watch, editedCut, letterItem, emailItem, markCompleted];
}

/** localStorage key for per-event manual checkbox overrides (v1). */
export function afterSessionOverrideStorageKey(eventId: number): string {
  return `admin:after-session-overrides:v1:${eventId}`;
}

export type AfterSessionOverrides = Partial<Record<ChecklistItemId, boolean>>;

export function applyChecklistOverrides(
  items: AfterSessionChecklistItem[],
  overrides: AfterSessionOverrides | null | undefined,
): AfterSessionChecklistItem[] {
  if (!overrides) return items;
  return items.map((item) => {
    if (overrides[item.id] === true) {
      return { ...item, status: "done", detail: `${item.detail} · checked off` };
    }
    if (overrides[item.id] === false && item.status === "done") {
      return { ...item, status: "pending", detail: `${item.detail} · unchecked` };
    }
    return item;
  });
}

export function postSessionLetterKeyForRecording(recordingId: number): string {
  return postSessionLetterIdempotencyKey(recordingId);
}

/** Overall progress for a scannable header chip. */
export function checklistProgress(items: AfterSessionChecklistItem[]): {
  done: number;
  total: number;
  pendingAction: number;
} {
  const actionable = items.filter((i) => i.status !== "na");
  const done = actionable.filter((i) => i.status === "done").length;
  const pendingAction = actionable.filter(
    (i) => i.status === "pending" || i.status === "action",
  ).length;
  return {
    done,
    total: actionable.length,
    pendingAction,
  };
}
