/**
 * Admin Call Tasks board — filter / stuck helpers shared by server + client.
 * Reuses call_task bounty vocabulary (workStatus, expiresAt, doer assignment).
 */

export type CallTaskBoardFilter =
  | "needs_people"
  | "open"
  | "overdue"
  | "unassigned"
  | "done";

/** Morning / default: stuck OR unassigned — work that needs a human owner. */
export const CALL_TASK_BOARD_DEFAULT_FILTER: CallTaskBoardFilter = "needs_people";

export const CALL_TASK_BOARD_FILTERS: CallTaskBoardFilter[] = [
  "needs_people",
  "open",
  "overdue",
  "unassigned",
  "done",
];

const OPEN_STATUSES = [
  "proposed",
  "accepted",
  "open",
  "claimed",
  "in_review",
] as const;

const DONE_STATUSES = ["completed"] as const;

const TERMINAL_STATUSES = ["completed", "declined", "expired"] as const;

/** Stuck: overdue, or open+unassigned > 3d, or in_review > 7d. */
export const STUCK_UNASSIGNED_MS = 3 * 24 * 60 * 60 * 1000;
export const STUCK_IN_REVIEW_MS = 7 * 24 * 60 * 60 * 1000;

export type CallTaskBoardRowLike = {
  sourceType?: string | null;
  workStatus?: string | null;
  expiresAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  /** Doer user id when assigned; null/undefined = unassigned. */
  ownerUserId?: number | null;
};

function statusOf(row: CallTaskBoardRowLike): string {
  return (row.workStatus || "").toLowerCase();
}

function toMs(value: string | Date | null | undefined): number | null {
  if (value == null || value === "") return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isCallTaskRow(row: CallTaskBoardRowLike): boolean {
  return (row.sourceType || "") === "call_task";
}

export function isCallTaskDone(row: CallTaskBoardRowLike): boolean {
  return (DONE_STATUSES as readonly string[]).includes(statusOf(row));
}

export function isCallTaskOpen(row: CallTaskBoardRowLike): boolean {
  if (!isCallTaskRow(row)) return false;
  return (OPEN_STATUSES as readonly string[]).includes(statusOf(row));
}

export function isCallTaskUnassigned(row: CallTaskBoardRowLike): boolean {
  if (!isCallTaskRow(row)) return false;
  if (isCallTaskDone(row)) return false;
  if ((TERMINAL_STATUSES as readonly string[]).includes(statusOf(row))) return false;
  return row.ownerUserId == null;
}

export function isCallTaskOverdue(
  row: CallTaskBoardRowLike,
  nowMs: number = Date.now(),
): boolean {
  if (!isCallTaskRow(row)) return false;
  if ((TERMINAL_STATUSES as readonly string[]).includes(statusOf(row))) return false;
  const exp = toMs(row.expiresAt ?? null);
  if (exp == null) return false;
  return exp < nowMs;
}

export function isCallTaskStuck(
  row: CallTaskBoardRowLike,
  nowMs: number = Date.now(),
): boolean {
  if (!isCallTaskRow(row)) return false;
  if ((TERMINAL_STATUSES as readonly string[]).includes(statusOf(row))) return false;

  if (isCallTaskOverdue(row, nowMs)) return true;

  const status = statusOf(row);
  if (status === "in_review") {
    const anchor = toMs(row.updatedAt ?? row.createdAt ?? null);
    if (anchor != null && nowMs - anchor >= STUCK_IN_REVIEW_MS) return true;
  }

  if (isCallTaskUnassigned(row) && isCallTaskOpen(row)) {
    const created = toMs(row.createdAt ?? null);
    if (created != null && nowMs - created >= STUCK_UNASSIGNED_MS) return true;
  }

  return false;
}

/** Stuck or unassigned — morning queue / "needs people". */
export function isCallTaskNeedsPeople(
  row: CallTaskBoardRowLike,
  nowMs: number = Date.now(),
): boolean {
  if (!isCallTaskRow(row)) return false;
  return isCallTaskStuck(row, nowMs) || isCallTaskUnassigned(row);
}

/** Which board filters a row belongs to (a row may match several). */
export function callTaskBoardFilterMatch(
  row: CallTaskBoardRowLike,
  filter: CallTaskBoardFilter,
  nowMs: number = Date.now(),
): boolean {
  if (!isCallTaskRow(row)) return false;
  switch (filter) {
    case "needs_people":
      return isCallTaskNeedsPeople(row, nowMs);
    case "open":
      return isCallTaskOpen(row);
    case "overdue":
      return isCallTaskOverdue(row, nowMs);
    case "unassigned":
      return isCallTaskUnassigned(row);
    case "done":
      return isCallTaskDone(row);
    default:
      return false;
  }
}

export function filterCallTaskBoardRows<T extends CallTaskBoardRowLike>(
  rows: T[],
  filter: CallTaskBoardFilter,
  nowMs: number = Date.now(),
): T[] {
  return rows.filter((r) => callTaskBoardFilterMatch(r, filter, nowMs));
}

export type CallTaskBoardCounts = Record<CallTaskBoardFilter, number> & {
  stuck: number;
};

export function countCallTaskBoard(
  rows: CallTaskBoardRowLike[],
  nowMs: number = Date.now(),
): CallTaskBoardCounts {
  const callTasks = rows.filter(isCallTaskRow);
  return {
    needs_people: callTasks.filter((r) => isCallTaskNeedsPeople(r, nowMs)).length,
    open: callTasks.filter((r) => isCallTaskOpen(r)).length,
    overdue: callTasks.filter((r) => isCallTaskOverdue(r, nowMs)).length,
    unassigned: callTasks.filter((r) => isCallTaskUnassigned(r)).length,
    done: callTasks.filter((r) => isCallTaskDone(r)).length,
    stuck: callTasks.filter((r) => isCallTaskStuck(r, nowMs)).length,
  };
}

export function emptyCallTaskBoardCounts(): CallTaskBoardCounts {
  return {
    needs_people: 0,
    open: 0,
    overdue: 0,
    unassigned: 0,
    done: 0,
    stuck: 0,
  };
}
