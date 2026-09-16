/**
 * Admin Events temporal phase from wall-clock start/end — not only DB status.
 * Cron/sweep can lag or miss events without endTime, leaving past rows "upcoming".
 */

export type EventTemporalPhase = "upcoming" | "live" | "past";

export type EventTemporalInput = {
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  /** When status is cancelled, phase still follows timestamps for grouping. */
  status?: string | null;
};

function toMs(value: string | Date | null | undefined): number | null {
  if (value == null || value === "") return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Derive upcoming / live / past from timestamps.
 * - endTime present: live between start and end; past after end.
 * - no endTime: past once start has passed (reminders are pre-event only).
 */
export function deriveEventTemporalPhase(
  event: EventTemporalInput,
  nowMs: number = Date.now(),
): EventTemporalPhase {
  const start = toMs(event.startTime);
  const end = toMs(event.endTime);
  if (start == null) return "upcoming";
  if (end != null) {
    if (nowMs < start) return "upcoming";
    if (nowMs < end) return "live";
    return "past";
  }
  return nowMs < start ? "upcoming" : "past";
}

export function isEventPastForAdmin(
  event: EventTemporalInput,
  nowMs: number = Date.now(),
): boolean {
  return deriveEventTemporalPhase(event, nowMs) === "past";
}

/** Badge label for the admin list: honour cancelled; otherwise show derived phase. */
export function adminEventStatusLabel(
  event: EventTemporalInput,
  nowMs: number = Date.now(),
): string {
  if (event.status === "cancelled") return "cancelled";
  const phase = deriveEventTemporalPhase(event, nowMs);
  if (phase === "past") return "completed";
  return phase;
}

export function partitionEventsByTemporal<T extends EventTemporalInput>(
  events: T[],
  nowMs: number = Date.now(),
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const ev of events) {
    if (isEventPastForAdmin(ev, nowMs)) past.push(ev);
    else upcoming.push(ev);
  }
  const startMs = (e: T) => toMs(e.startTime) ?? 0;
  upcoming.sort((a, b) => startMs(a) - startMs(b));
  past.sort((a, b) => startMs(b) - startMs(a));
  return { upcoming, past };
}
