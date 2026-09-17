/**
 * Operator Pulse — daily "needs a human" stack for Admin Overview.
 * Pure helpers so server counts and client tests share one vocabulary.
 */

export type OperatorPulseSeverity = "high" | "medium" | "low";

export type OperatorPulseItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  severity: OperatorPulseSeverity;
};

export type OperatorPulseDeferred = {
  id: string;
  reason: string;
};

export type OperatorPulseResult = {
  generatedAt: string;
  items: OperatorPulseItem[];
  deferred: OperatorPulseDeferred[];
};

export const SEVERITY_RANK: Record<OperatorPulseSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Stuck outbound: still "sending" longer than this. */
export const OUTBOUND_STUCK_SENDING_MS = 60 * 60 * 1000;

const OPEN_CALL_TASK_STATUSES = [
  "proposed",
  "open",
  "accepted",
  "claimed",
  "in_review",
] as const;

const TERMINAL_CALL_TASK_STATUSES = ["completed", "declined", "expired"] as const;

export function nonEmptyUrl(value: string | null | undefined): boolean {
  return Boolean((value ?? "").trim());
}

/** Same watch resolution as Schedule Historical cards (edited → raw → riverside → event). */
export function eventHasWatchPath(sources: {
  eventYoutubeUrl?: string | null;
  recordingId?: number | null;
  editedYoutubeUrl?: string | null;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
}): boolean {
  if (nonEmptyUrl(sources.editedYoutubeUrl)) return true;
  if (nonEmptyUrl(sources.youtubeUrl)) return true;
  if (nonEmptyUrl(sources.riversideUrl)) return true;
  if (nonEmptyUrl(sources.eventYoutubeUrl)) return true;
  return false;
}

export function recordingNeedsCut(row: { editedYoutubeUrl?: string | null }): boolean {
  return !nonEmptyUrl(row.editedYoutubeUrl);
}

export function isApplicationWaitingReview(status: string | null | undefined): boolean {
  const s = (status || "").toLowerCase();
  return s === "submitted" || s === "pending" || s === "under_review";
}

export function isInvestorNeedsActionStatus(status: string | null | undefined): boolean {
  const s = (status || "new").toLowerCase();
  return s === "new" || s === "pending";
}

export type OutboundIssueLike = {
  status: string;
  failedCount?: number | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  sentAt?: string | Date | null;
};

export function isOutboundFailedOrStuck(
  issue: OutboundIssueLike,
  nowMs: number = Date.now(),
): boolean {
  const status = (issue.status || "").toLowerCase();
  if (status === "failed") return true;
  if (status === "sent" && Number(issue.failedCount ?? 0) > 0) return true;
  if (status === "sending") {
    const anchor = issue.updatedAt ?? issue.createdAt ?? issue.sentAt;
    if (!anchor) return true;
    const ms = new Date(anchor).getTime();
    if (!Number.isFinite(ms)) return true;
    return nowMs - ms >= OUTBOUND_STUCK_SENDING_MS;
  }
  return false;
}

export type CallTaskLike = {
  sourceType?: string | null;
  workStatus?: string | null;
  expiresAt?: string | Date | null;
  roleSlug?: string | null;
};

/**
 * Open / overdue call tasks that need a human (role-holder queue).
 * Includes proposed + in-flight work, plus anything past expiresAt that is not terminal.
 */
export function isOpenOrOverdueCallTask(
  task: CallTaskLike,
  nowMs: number = Date.now(),
): boolean {
  if ((task.sourceType || "") !== "call_task") return false;
  const status = (task.workStatus || "").toLowerCase();
  if ((OPEN_CALL_TASK_STATUSES as readonly string[]).includes(status)) return true;
  if ((TERMINAL_CALL_TASK_STATUSES as readonly string[]).includes(status)) return false;
  if (!task.expiresAt) return false;
  const exp = new Date(task.expiresAt).getTime();
  return Number.isFinite(exp) && exp < nowMs;
}

export type OperatorPulseCounts = {
  pastEventsNoWatch: number;
  recordingsNeedCut: number;
  investorsNeedsAction: number;
  applicationsWaitingReview: number;
  outboundFailedOrStuck: number;
  callTasksOpenOrOverdue: number;
};

const CATALOG: Array<{
  id: OperatorPulseItem["id"];
  label: string;
  severity: OperatorPulseSeverity;
  href: string;
  countKey: keyof OperatorPulseCounts;
}> = [
  {
    id: "outbound-failed",
    label: "Failed or stuck Outbound sends",
    severity: "high",
    href: "/admin?tab=outbound&surface=history",
    countKey: "outboundFailedOrStuck",
  },
  {
    id: "call-tasks",
    label: "Open or overdue call tasks",
    severity: "high",
    href: "/admin?tab=call-tasks",
    countKey: "callTasksOpenOrOverdue",
  },
  {
    id: "applications",
    label: "Applications waiting review",
    severity: "medium",
    href: "/admin?tab=applications&view=reviews",
    countKey: "applicationsWaitingReview",
  },
  {
    id: "investors",
    label: "Investors need action",
    severity: "medium",
    href: "/admin?tab=investors&filter=needs_action",
    countKey: "investorsNeedsAction",
  },
  {
    id: "recordings-need-cut",
    label: "Recordings need cut",
    severity: "medium",
    href: "/admin?tab=edited-cuts",
    countKey: "recordingsNeedCut",
  },
  {
    id: "past-events-no-watch",
    label: "Past events with no Watch path",
    severity: "low",
    href: "/admin?tab=events&filter=past",
    countKey: "pastEventsNoWatch",
  },
];

/** Build pulse rows with count > 0, sorted by severity then catalog order. */
export function buildOperatorPulseItems(counts: OperatorPulseCounts): OperatorPulseItem[] {
  const items: OperatorPulseItem[] = [];
  for (const row of CATALOG) {
    const count = Number(counts[row.countKey] ?? 0);
    if (!Number.isFinite(count) || count <= 0) continue;
    items.push({
      id: row.id,
      label: row.label,
      count,
      href: row.href,
      severity: row.severity,
    });
  }
  return items.sort((a, b) => {
    const d = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (d !== 0) return d;
    return a.label.localeCompare(b.label);
  });
}

export function emptyOperatorPulse(generatedAt = new Date().toISOString()): OperatorPulseResult {
  return { generatedAt, items: [], deferred: [] };
}

// ── Morning ping (phase 2 of Operator Pulse) ─────────────────────────────────
// Cron: hourly POST /api/cron/operator-pulse-ping. Fires once per Pacific day
// at/after 08:00 America/Los_Angeles when items.length > 0.

export const OPERATOR_PULSE_PING_HOUR_PT = 8;
export const OPERATOR_PULSE_PING_ZONE = "America/Los_Angeles";
/** site_settings key storing last Pacific YYYY-MM-DD the ping was attempted. */
export const OPERATOR_PULSE_PING_LAST_DAY_KEY = "operator_pulse_ping.last_day";

/** Calendar day (YYYY-MM-DD) and 0-23 hour of an instant in Rye's zone. */
export function operatorPulsePtDayHour(at: Date): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATOR_PULSE_PING_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/**
 * True on the first tick at or after 08:00 PT on a day that has not yet been
 * marked (lastDay is the Pacific YYYY-MM-DD already handled, or null).
 */
export function operatorPulseMorningDue(now: Date, lastDay: string | null): boolean {
  const here = operatorPulsePtDayHour(now);
  if (here.hour < OPERATOR_PULSE_PING_HOUR_PT) return false;
  if (!lastDay) return true;
  return lastDay !== here.day;
}

/** Short Markdown-ish summary for Telegram / WhatsApp / email. */
export function formatOperatorPulsePingMessage(
  items: OperatorPulseItem[],
  baseUrl: string,
): { title: string; body: string } {
  const root = baseUrl.replace(/\/$/, "");
  const overview = `${root}/admin`;
  const total = items.reduce((n, i) => n + i.count, 0);
  const lines = items.map((i) => `• ${i.count} ${i.label}\n  ${root}${i.href}`);
  const title = `Needs you today — ${items.length} item${items.length === 1 ? "" : "s"} (${total})`;
  const body =
    `*Needs you today*\n\n` +
    `${items.length} open stack${items.length === 1 ? "" : "s"} · ${total} total\n\n` +
    lines.join("\n") +
    `\n\nOverview: ${overview}`;
  return { title, body };
}
