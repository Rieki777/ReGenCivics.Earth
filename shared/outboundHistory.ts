/**
 * Outbound History helpers: subject cleaning, audience summary, Pacific times,
 * and Resend/email_logs stats rollup. Pure so client, server, and tests share
 * one implementation.
 */

export const HISTORY_TZ = "America/Los_Angeles";
export const HISTORY_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export const HISTORY_VISIBLE_STATUSES = [
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled",
] as const;

export type HistoryVisibleStatus = (typeof HISTORY_VISIBLE_STATUSES)[number];

export type HistoryAudience = {
  sources: string[];
  activeOnly: boolean;
};

export type DeliveryLogRow = {
  id: number;
  status: string;
  openedAt: Date | string | null;
  clickedAt: Date | string | null;
  bounceReason?: string | null;
  deliveredAt?: Date | string | null;
  sentAt?: Date | string | null;
};

export type HistoryRecipientInput = {
  email: string;
  status: string;
  emailLogId: number | null;
};

export type DeliveryStats = {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  total: number;
  openPercent: number | null;
  clickPercent: number | null;
  bounceFailCount: number;
};

export type HistoryIssueInput = {
  id: number;
  subject: string;
  status: string;
  layout?: string | null;
  audience?: unknown;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: Date | string | null;
  scheduledFor?: Date | string | null;
  createdAt: Date | string;
};

export type HistoryListItem = HistoryIssueInput & {
  subjectDisplay: string;
  audienceSummary: string;
  statusLabel: string;
  stats: DeliveryStats;
  when: Date | string | null;
};

export type HistoryRecipientRow = {
  email: string;
  status: string;
  statusLabel: string;
  opened: boolean;
  clicked: boolean;
  error: string | null;
};

export type HistoryTimelineEvent = {
  at: Date | string;
  label: string;
};

export type HistoryBanner =
  | { kind: "problems"; count: number }
  | { kind: "upcoming"; at: Date | string }
  | { kind: "last"; at: Date | string; openPercent: number | null; subject: string }
  | { kind: "empty" };

function sourceLabel(source: string): string {
  return source.replace(/_/g, " ");
}

export function parseHistoryAudience(raw: unknown): HistoryAudience {
  if (!raw || typeof raw !== "object") return { sources: [], activeOnly: true };
  const rec = raw as Record<string, unknown>;
  const sources = Array.isArray(rec.sources)
    ? rec.sources.filter((s): s is string => typeof s === "string" && s.length > 0 && s !== "all")
    : [];
  return { sources, activeOnly: rec.activeOnly !== false };
}

export function summarizeAudience(raw: unknown): string {
  const { sources } = parseHistoryAudience(raw);
  if (sources.length === 0) return "All active subscribers";
  const labels = sources.map(sourceLabel);
  if (labels.length === 1) return `Active ${labels[0]} subscribers`;
  if (labels.length === 2) return `Active ${labels[0]} and ${labels[1]} subscribers`;
  return `Active ${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]} subscribers`;
}

export function audienceToWriteSource(raw: unknown): string {
  const { sources } = parseHistoryAudience(raw);
  return sources.length === 1 ? sources[0] : "all";
}

/**
 * Strip composer/LLM leftovers such as `**Subject:** Spring letter` so the
 * History list shows the letter title, not markdown chrome.
 */
export function cleanLetterSubject(raw: string | null | undefined): string {
  let s = (raw ?? "").replace(/^\uFEFF/, "").trim();
  if (!s) return "";
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim()
      .replace(/^\*{0,2}\s*Subject\s*:\s*(?:\*{1,2}(?=\s))?\s*/i, "")
      .replace(/^\*{1,2}([\s\S]+?)\*{1,2}$/, "$1")
      .trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

export function toTimeMs(input: Date | string | null | undefined): number | null {
  if (input == null || input === "") return null;
  const d = input instanceof Date ? input : new Date(input);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function formatPacificDateTime(input: Date | string | null | undefined): string {
  const ms = toTimeMs(input);
  if (ms == null) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: HISTORY_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(ms));
}

export function ratePercent(count: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((count / denominator) * 1000) / 10;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "n/a";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function isComplaint(log: DeliveryLogRow): boolean {
  return (log.bounceReason ?? "").toLowerCase().startsWith("complaint:");
}

export function rollupDeliveryStats(
  logs: DeliveryLogRow[],
  extras?: { recipientTotal?: number; sendFailedCount?: number },
): DeliveryStats {
  let delivered = 0;
  let opened = 0;
  let clicked = 0;
  let bounced = 0;
  let complained = 0;
  let failed = 0;
  for (const log of logs) {
    if (log.status === "delivered") delivered += 1;
    if (log.status === "bounced") bounced += 1;
    if (isComplaint(log)) complained += 1;
    else if (log.status === "failed") failed += 1;
    if (log.openedAt) opened += 1;
    if (log.clickedAt) clicked += 1;
  }
  const sendFailed = extras?.sendFailedCount ?? 0;
  return {
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    failed,
    total: extras?.recipientTotal ?? logs.length,
    openPercent: ratePercent(opened, delivered),
    clickPercent: ratePercent(clicked, delivered),
    bounceFailCount: bounced + complained + failed + sendFailed,
  };
}

export function historyStatusLabel(status: string, failedCount = 0): string {
  if (status === "sent" && failedCount > 0) return "Partial";
  if (status === "sent") return "Sent";
  if (status === "scheduled") return "Scheduled";
  if (status === "sending") return "Sending";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  if (status === "draft") return "Draft";
  return status;
}

export function recipientStatusLabel(recipientStatus: string, log?: DeliveryLogRow | null): string {
  if (recipientStatus === "skipped_unsub") return "Skipped";
  if (recipientStatus === "pending") return "Pending";
  if (recipientStatus === "failed") return "Failed";
  if (log?.status === "delivered") return "Delivered";
  if (log?.status === "bounced") return "Bounced";
  if (log && isComplaint(log)) return "Complained";
  if (log?.status === "failed") return "Failed";
  if (recipientStatus === "sent") return "Sent";
  return recipientStatus;
}

export function historyWhen(issue: Pick<HistoryIssueInput, "status" | "sentAt" | "scheduledFor" | "createdAt">): Date | string | null {
  if (issue.status === "scheduled" && issue.scheduledFor) return issue.scheduledFor;
  if (issue.sentAt) return issue.sentAt;
  if (issue.scheduledFor) return issue.scheduledFor;
  return issue.createdAt;
}

export function isHistoryVisibleStatus(status: string): status is HistoryVisibleStatus {
  return (HISTORY_VISIBLE_STATUSES as readonly string[]).includes(status);
}

export function attachHistoryStats(
  issues: HistoryIssueInput[],
  recipients: Array<{ issueId: number; emailLogId: number | null; status: string }>,
  logs: DeliveryLogRow[],
): HistoryListItem[] {
  const logsById = new Map(logs.map((log) => [log.id, log]));
  const recipsByIssue = new Map<number, Array<{ emailLogId: number | null; status: string }>>();
  for (const row of recipients) {
    const list = recipsByIssue.get(row.issueId) ?? [];
    list.push(row);
    recipsByIssue.set(row.issueId, list);
  }
  return issues.filter((issue) => isHistoryVisibleStatus(issue.status)).map((issue) => {
    const recips = recipsByIssue.get(issue.id) ?? [];
    const issueLogs = recips
      .map((row) => (row.emailLogId != null ? logsById.get(row.emailLogId) : undefined))
      .filter((log): log is DeliveryLogRow => Boolean(log));
    const stats = rollupDeliveryStats(issueLogs, {
      recipientTotal: issue.recipientCount || recips.length,
      sendFailedCount: issue.failedCount,
    });
    return {
      ...issue,
      subjectDisplay: cleanLetterSubject(issue.subject),
      audienceSummary: summarizeAudience(issue.audience),
      statusLabel: historyStatusLabel(issue.status, issue.failedCount),
      stats,
      when: historyWhen(issue),
    };
  });
}

export function buildRecipientRows(
  recipients: HistoryRecipientInput[],
  logs: DeliveryLogRow[],
): HistoryRecipientRow[] {
  const logsById = new Map(logs.map((log) => [log.id, log]));
  return recipients.map((row) => {
    const log = row.emailLogId != null ? logsById.get(row.emailLogId) : undefined;
    return {
      email: row.email,
      status: row.status,
      statusLabel: recipientStatusLabel(row.status, log),
      opened: Boolean(log?.openedAt),
      clicked: Boolean(log?.clickedAt),
      error: log?.bounceReason?.trim() || (row.status === "failed" ? "Send failed" : null),
    };
  });
}

function earliest(values: Array<Date | string | null | undefined>): Date | string | null {
  let best: Date | string | null = null;
  let bestMs = Number.POSITIVE_INFINITY;
  for (const value of values) {
    const ms = toTimeMs(value);
    if (ms == null || ms >= bestMs) continue;
    bestMs = ms;
    best = value ?? null;
  }
  return best;
}

export function buildHistoryTimeline(
  issue: Pick<HistoryIssueInput, "createdAt" | "scheduledFor" | "sentAt">,
  logs: DeliveryLogRow[],
): HistoryTimelineEvent[] {
  const events: HistoryTimelineEvent[] = [{ at: issue.createdAt, label: "Created" }];
  if (issue.scheduledFor) events.push({ at: issue.scheduledFor, label: "Scheduled" });
  if (issue.sentAt) events.push({ at: issue.sentAt, label: "Sent" });
  const firstDelivered = earliest(logs.map((log) => log.deliveredAt ?? null));
  if (firstDelivered) events.push({ at: firstDelivered, label: "First delivery" });
  const firstOpen = earliest(logs.map((log) => log.openedAt));
  if (firstOpen) events.push({ at: firstOpen, label: "First open" });
  const firstClick = earliest(logs.map((log) => log.clickedAt));
  if (firstClick) events.push({ at: firstClick, label: "First click" });
  events.sort((a, b) => (toTimeMs(a.at) ?? 0) - (toTimeMs(b.at) ?? 0));
  return events;
}

function isProblemRow(row: Pick<HistoryListItem, "status" | "failedCount" | "stats">): boolean {
  if (row.status === "failed") return true;
  if (row.status === "sent" && row.failedCount > 0) return true;
  return row.stats.bounceFailCount > 0;
}

export function pickHistoryBanner(rows: HistoryListItem[], nowMs: number): HistoryBanner {
  const weekAgo = nowMs - HISTORY_LOOKBACK_MS;
  const problems = rows.filter((row) => {
    const t = toTimeMs(row.sentAt ?? row.createdAt);
    return t != null && t >= weekAgo && isProblemRow(row);
  });
  if (problems.length > 0) return { kind: "problems", count: problems.length };

  const upcoming = rows
    .filter((row) => row.status === "scheduled" && toTimeMs(row.scheduledFor) != null && (toTimeMs(row.scheduledFor) ?? 0) > nowMs)
    .sort((a, b) => (toTimeMs(a.scheduledFor) ?? 0) - (toTimeMs(b.scheduledFor) ?? 0));
  if (upcoming[0]?.scheduledFor) return { kind: "upcoming", at: upcoming[0].scheduledFor };

  const sent = rows
    .filter((row) => row.sentAt && (row.status === "sent" || row.status === "failed" || row.status === "sending"))
    .sort((a, b) => (toTimeMs(b.sentAt) ?? 0) - (toTimeMs(a.sentAt) ?? 0));
  if (sent[0]?.sentAt) {
    return {
      kind: "last",
      at: sent[0].sentAt,
      openPercent: sent[0].stats.openPercent,
      subject: sent[0].subjectDisplay,
    };
  }
  return { kind: "empty" };
}
