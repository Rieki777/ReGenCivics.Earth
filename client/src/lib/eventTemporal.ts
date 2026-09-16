/**
 * Admin Events temporal phase from wall-clock start/end — not only DB status.
 * Cron/sweep can lag or miss events without endTime, leaving past rows "upcoming".
 */

export type EventTemporalPhase = "upcoming" | "live" | "past";

export type EventTemporalInput = {
  startTime?: string | Date | number | null;
  endTime?: string | Date | number | null;
  /** When status is cancelled, phase still follows timestamps for grouping. */
  status?: string | null;
  /** Occasional alternate shapes from serializers / joins. */
  start_time?: string | Date | number | null;
  end_time?: string | Date | number | null;
};

/**
 * Coerce common DB / JSON / epoch shapes to epoch ms.
 * Returns null when unparseable (caller treats as upcoming).
 */
export function toMs(value: string | Date | number | null | undefined): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Epoch seconds vs milliseconds
    const ms = value > 0 && value < 1e12 ? value * 1000 : value;
    return Number.isFinite(ms) ? ms : null;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Numeric string (epoch sec or ms)
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return toMs(Number(trimmed));
    }

    // Date-only: treat as UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const ms = new Date(`${trimmed}T00:00:00.000Z`).getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    // MySQL DATETIME / TIMESTAMP without zone: "YYYY-MM-DD HH:MM:SS[.fff]"
    // Treat as UTC so admin grouping matches stored UTC columns.
    let normalized = trimmed;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)) {
      normalized = normalized.replace(" ", "T");
      // Allow HH:MM without seconds
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
        normalized = `${normalized}:00`;
      }
      if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
        normalized = `${normalized}Z`;
      }
    }

    const ms = new Date(normalized).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}

/** Prefer camelCase startTime; fall back to snake_case if present. */
export function resolveEventStart(event: EventTemporalInput): string | Date | number | null | undefined {
  return event.startTime ?? event.start_time;
}

export function resolveEventEnd(event: EventTemporalInput): string | Date | number | null | undefined {
  return event.endTime ?? event.end_time;
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
  const start = toMs(resolveEventStart(event));
  const end = toMs(resolveEventEnd(event));
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
  if (event.status === "completed") return "completed";
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
  const startMs = (e: T) => toMs(resolveEventStart(e)) ?? 0;
  upcoming.sort((a, b) => startMs(a) - startMs(b));
  past.sort((a, b) => startMs(b) - startMs(a));
  return { upcoming, past };
}
