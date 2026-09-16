/**
 * Relative "last run" labels and stale warnings for admin standing routines.
 * A routine with no lastRunAt, or one older than `staleAfterDays`, is stale.
 */

export const DEFAULT_STALE_AFTER_DAYS = 7;

export type FreshnessInfo = {
  /** Human label, e.g. "2d ago", "Never", "just now" */
  relativeLabel: string;
  /** True when never run or older than the stale threshold */
  isStale: boolean;
  /** Days since last run (Infinity when never) */
  daysSince: number;
  /** Full UI line: "Last run 2d ago" / "Last run Never · stale" */
  displayLine: string;
};

function daysBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / 86_400_000;
}

/** Format a past timestamp as a short relative phrase. */
export function formatRelativeAge(
  at: string | Date | null | undefined,
  nowMs: number = Date.now(),
): { relativeLabel: string; daysSince: number } {
  if (at == null || at === "") {
    return { relativeLabel: "Never", daysSince: Number.POSITIVE_INFINITY };
  }
  const ms = new Date(at).getTime();
  if (Number.isNaN(ms)) {
    return { relativeLabel: "Never", daysSince: Number.POSITIVE_INFINITY };
  }
  const days = daysBetween(ms, nowMs);
  if (days < 0) {
    // Clock skew / future timestamp — treat as fresh
    return { relativeLabel: "just now", daysSince: 0 };
  }
  if (days < 1 / 24) {
    const mins = Math.max(1, Math.round(days * 24 * 60));
    return { relativeLabel: mins <= 1 ? "just now" : `${mins}m ago`, daysSince: days };
  }
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return { relativeLabel: `${hours}h ago`, daysSince: days };
  }
  const wholeDays = Math.floor(days);
  if (wholeDays < 30) {
    return { relativeLabel: `${wholeDays}d ago`, daysSince: days };
  }
  const months = Math.floor(wholeDays / 30);
  return {
    relativeLabel: months === 1 ? "1mo ago" : `${months}mo ago`,
    daysSince: days,
  };
}

export function getRunFreshness(
  lastRunAt: string | Date | null | undefined,
  opts?: { nowMs?: number; staleAfterDays?: number },
): FreshnessInfo {
  const nowMs = opts?.nowMs ?? Date.now();
  const staleAfterDays = opts?.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const { relativeLabel, daysSince } = formatRelativeAge(lastRunAt, nowMs);
  const isStale =
    !Number.isFinite(daysSince) || daysSince > staleAfterDays;
  const displayLine = isStale
    ? `Last run ${relativeLabel} · stale`
    : `Last run ${relativeLabel}`;
  return { relativeLabel, isStale, daysSince, displayLine };
}
