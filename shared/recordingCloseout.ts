/**
 * Admin Recording closeout queue — status / due / owner helpers.
 * Reuses Edited Cuts truth (`editedYoutubeUrl`) plus optional site_settings meta.
 * Never auto-sends email.
 */

export const RECORDING_CLOSEOUT_SETTING_KEY = "recording_closeout.v1";

/** Default due: session (or created) date + this many days. */
export const RECORDING_CLOSEOUT_DEFAULT_DUE_DAYS = 7;

export type RecordingCloseoutStatus =
  | "needs_cut"
  | "in_progress"
  | "ready_to_publish"
  | "done";

export const RECORDING_CLOSEOUT_STATUSES: RecordingCloseoutStatus[] = [
  "needs_cut",
  "in_progress",
  "ready_to_publish",
  "done",
];

export const RECORDING_CLOSEOUT_FILTERS = [
  "open",
  "needs_cut",
  "in_progress",
  "ready_to_publish",
  "done",
  "unassigned",
  "overdue",
  "all",
] as const;

export type RecordingCloseoutFilter = (typeof RECORDING_CLOSEOUT_FILTERS)[number];

export const CLOSEOUT_STATUS_LABELS: Record<RecordingCloseoutStatus, string> = {
  needs_cut: "Needs cut",
  in_progress: "In progress",
  ready_to_publish: "Ready to publish",
  done: "Done",
};

/** Per-recording operator fields persisted in site_settings JSON bag. */
export type RecordingCloseoutMeta = {
  /** Workflow override; ignored when edited cut URL is present (always Done). */
  status?: RecordingCloseoutStatus | null;
  /** Free-text owner name (or display label). */
  assignee?: string | null;
  /** Optional roleHolders.roleSlug when owner is a role seat. */
  roleSlug?: string | null;
  /** ISO date YYYY-MM-DD (date-only, operator local intent). */
  dueDate?: string | null;
};

export type RecordingCloseoutMetaBag = Record<string, RecordingCloseoutMeta>;

export type RecordingCloseoutRowLike = {
  id: number;
  title?: string | null;
  sessionDate?: string | Date | null;
  createdAt?: string | Date | null;
  editedYoutubeUrl?: string | null;
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
};

function nonEmpty(value: string | null | undefined): boolean {
  return Boolean((value ?? "").trim());
}

export function hasPublishedEditedCut(row: {
  editedYoutubeUrl?: string | null;
}): boolean {
  return nonEmpty(row.editedYoutubeUrl);
}

export function hasRawRecordingAsset(row: {
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
}): boolean {
  return (
    nonEmpty(row.youtubeVideoId) ||
    nonEmpty(row.youtubeUrl) ||
    nonEmpty(row.riversideUrl)
  );
}

export function isRecordingCloseoutStatus(
  value: unknown,
): value is RecordingCloseoutStatus {
  return (
    typeof value === "string" &&
    (RECORDING_CLOSEOUT_STATUSES as string[]).includes(value)
  );
}

export function isRecordingCloseoutFilter(
  value: unknown,
): value is RecordingCloseoutFilter {
  return (
    typeof value === "string" &&
    (RECORDING_CLOSEOUT_FILTERS as readonly string[]).includes(value)
  );
}

/** Parse site_settings JSON; corrupt/empty → {}. */
export function parseCloseoutMetaBag(raw: string | null | undefined): RecordingCloseoutMetaBag {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: RecordingCloseoutMetaBag = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d+$/.test(key)) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const v = value as Record<string, unknown>;
      const meta: RecordingCloseoutMeta = {};
      if (isRecordingCloseoutStatus(v.status)) meta.status = v.status;
      if (typeof v.assignee === "string") meta.assignee = v.assignee;
      else if (v.assignee === null) meta.assignee = null;
      if (typeof v.roleSlug === "string") meta.roleSlug = v.roleSlug;
      else if (v.roleSlug === null) meta.roleSlug = null;
      if (typeof v.dueDate === "string") meta.dueDate = v.dueDate;
      else if (v.dueDate === null) meta.dueDate = null;
      out[key] = meta;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeCloseoutMetaBag(bag: RecordingCloseoutMetaBag): string {
  return JSON.stringify(bag);
}

/**
 * Effective queue status.
 * Published edited cut always wins → Done.
 * Else meta.status if set; else Needs cut.
 */
export function resolveCloseoutStatus(
  row: { editedYoutubeUrl?: string | null },
  meta?: RecordingCloseoutMeta | null,
): RecordingCloseoutStatus {
  if (hasPublishedEditedCut(row)) return "done";
  if (meta?.status && meta.status !== "done") return meta.status;
  if (meta?.status === "done" && !hasPublishedEditedCut(row)) {
    // Operator marked done without URL — treat as ready_to_publish so it stays visible.
    return "ready_to_publish";
  }
  return "needs_cut";
}

function toDateOnlyMs(value: string | Date | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const ms = Date.UTC(y, m - 1, d);
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function formatCloseoutDueDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Anchor = sessionDate else createdAt; due = anchor + DEFAULT_DUE_DAYS (UTC date). */
export function defaultCloseoutDueDate(
  row: Pick<RecordingCloseoutRowLike, "sessionDate" | "createdAt">,
  dueDays: number = RECORDING_CLOSEOUT_DEFAULT_DUE_DAYS,
): string | null {
  const anchor = toDateOnlyMs(row.sessionDate ?? null) ?? toDateOnlyMs(row.createdAt ?? null);
  if (anchor == null) return null;
  const dueMs = anchor + dueDays * 24 * 60 * 60 * 1000;
  return formatCloseoutDueDate(dueMs);
}

export function resolveCloseoutDueDate(
  row: Pick<RecordingCloseoutRowLike, "sessionDate" | "createdAt">,
  meta?: RecordingCloseoutMeta | null,
): string | null {
  const explicit = (meta?.dueDate ?? "").trim();
  if (explicit) return explicit.slice(0, 10);
  return defaultCloseoutDueDate(row);
}

export function resolveCloseoutAssignee(meta?: RecordingCloseoutMeta | null): {
  assignee: string | null;
  roleSlug: string | null;
  unassigned: boolean;
} {
  const assignee = nonEmpty(meta?.assignee) ? (meta!.assignee as string).trim() : null;
  const roleSlug = nonEmpty(meta?.roleSlug) ? (meta!.roleSlug as string).trim() : null;
  return {
    assignee,
    roleSlug,
    unassigned: !assignee && !roleSlug,
  };
}

export function isCloseoutOverdue(
  dueDate: string | null | undefined,
  status: RecordingCloseoutStatus,
  nowMs: number = Date.now(),
): boolean {
  if (status === "done") return false;
  if (!dueDate) return false;
  const dueMs = toDateOnlyMs(dueDate);
  if (dueMs == null) return false;
  // Overdue when calendar due day is before today's UTC calendar day.
  const today = formatCloseoutDueDate(nowMs);
  const todayMs = toDateOnlyMs(today);
  if (todayMs == null) return false;
  return dueMs < todayMs;
}

/** Open = anything not Done (still needs operator attention). */
export function isCloseoutOpen(status: RecordingCloseoutStatus): boolean {
  return status !== "done";
}

export type ResolvedCloseoutRow = {
  recordingId: number;
  status: RecordingCloseoutStatus;
  assignee: string | null;
  roleSlug: string | null;
  unassigned: boolean;
  dueDate: string | null;
  overdue: boolean;
  editedHref: string;
  eventsHref: string;
};

export function buildCloseoutDeepLinks(recordingId: number, eventId?: number | null): {
  editedHref: string;
  eventsHref: string;
} {
  const editedHref = `/admin?tab=edited-cuts&recording=${recordingId}`;
  const eventsHref =
    eventId != null && eventId > 0
      ? `/admin?tab=events&filter=past&open=${eventId}`
      : `/admin?tab=events&filter=past`;
  return { editedHref, eventsHref };
}

export function resolveCloseoutRow(
  row: RecordingCloseoutRowLike,
  meta: RecordingCloseoutMeta | null | undefined,
  opts?: { eventId?: number | null; nowMs?: number },
): ResolvedCloseoutRow {
  const status = resolveCloseoutStatus(row, meta);
  const owner = resolveCloseoutAssignee(meta);
  const dueDate = resolveCloseoutDueDate(row, meta);
  const overdue = isCloseoutOverdue(dueDate, status, opts?.nowMs);
  const links = buildCloseoutDeepLinks(row.id, opts?.eventId);
  return {
    recordingId: row.id,
    status,
    assignee: owner.assignee,
    roleSlug: owner.roleSlug,
    unassigned: owner.unassigned,
    dueDate,
    overdue,
    editedHref: links.editedHref,
    eventsHref: links.eventsHref,
  };
}

export function closeoutFilterMatch(
  resolved: Pick<
    ResolvedCloseoutRow,
    "status" | "unassigned" | "overdue"
  >,
  filter: RecordingCloseoutFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "open":
      return isCloseoutOpen(resolved.status);
    case "needs_cut":
      return resolved.status === "needs_cut";
    case "in_progress":
      return resolved.status === "in_progress";
    case "ready_to_publish":
      return resolved.status === "ready_to_publish";
    case "done":
      return resolved.status === "done";
    case "unassigned":
      return resolved.unassigned && isCloseoutOpen(resolved.status);
    case "overdue":
      return resolved.overdue;
    default:
      return false;
  }
}

export type CloseoutFilterCounts = Record<RecordingCloseoutFilter, number>;

export function countCloseoutFilters(
  rows: Array<Pick<ResolvedCloseoutRow, "status" | "unassigned" | "overdue">>,
): CloseoutFilterCounts {
  const counts = {
    open: 0,
    needs_cut: 0,
    in_progress: 0,
    ready_to_publish: 0,
    done: 0,
    unassigned: 0,
    overdue: 0,
    all: rows.length,
  } satisfies CloseoutFilterCounts;
  for (const row of rows) {
    for (const filter of RECORDING_CLOSEOUT_FILTERS) {
      if (filter === "all") continue;
      if (closeoutFilterMatch(row, filter)) counts[filter] += 1;
    }
  }
  return counts;
}

/** Merge patch into bag for one recording; empty fields clear. */
export function applyCloseoutMetaPatch(
  bag: RecordingCloseoutMetaBag,
  recordingId: number,
  patch: RecordingCloseoutMeta,
): RecordingCloseoutMetaBag {
  const key = String(recordingId);
  const prev = bag[key] ?? {};
  const next: RecordingCloseoutMeta = { ...prev };

  if ("status" in patch) {
    if (patch.status == null) delete next.status;
    else if (isRecordingCloseoutStatus(patch.status)) next.status = patch.status;
  }
  if ("assignee" in patch) {
    const a = patch.assignee;
    if (a == null || !String(a).trim()) delete next.assignee;
    else next.assignee = String(a).trim().slice(0, 120);
  }
  if ("roleSlug" in patch) {
    const r = patch.roleSlug;
    if (r == null || !String(r).trim()) delete next.roleSlug;
    else next.roleSlug = String(r).trim().slice(0, 64);
  }
  if ("dueDate" in patch) {
    const d = patch.dueDate;
    if (d == null || !String(d).trim()) delete next.dueDate;
    else next.dueDate = String(d).trim().slice(0, 10);
  }

  const out = { ...bag };
  if (
    next.status == null &&
    next.assignee == null &&
    next.roleSlug == null &&
    next.dueDate == null
  ) {
    delete out[key];
  } else {
    out[key] = next;
  }
  return out;
}
