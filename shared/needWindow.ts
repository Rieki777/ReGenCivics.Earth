/**
 * When a need stops taking offers (crowdpool bundle 1, 2026-10-01). Pure,
 * shared by the server (sign-ups, the Needs tab, the daily example roll) and
 * the client (need cards, the ?offer= link).
 *
 *   - A shift stops at its start: sign-ups close when it starts.
 *   - Any other need stops at the end of the last day of its window, in UTC:
 *     neededUntil, else the day of needDeadline, else the day of a legacy
 *     loan's loanWindowEnd. A shift with no start reads its window the same
 *     way.
 *   - A need with none of these never stops on its own.
 *
 * Reading a value: a Date is used as it is. A string with no zone
 * ('YYYY-MM-DD HH:mm:ss', as raw SQL returns a TIMESTAMP) is read as UTC,
 * unlike NeedCard's toLocalDate, which reads it as local time for display.
 * "Today" for a window is the UTC day, as for every other date rule on a need
 * (shared/crowdpoolNeedAction.ts todayUtc).
 */
import { kindForItem, toDay, type NeedLike } from "./crowdpoolNeedAction";

export type NeedWindowLike = NeedLike & {
  needDeadline?: Date | string | null;
  loanWindowEnd?: Date | string | null;
};

const ZONELESS = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A moment from a Date or a string, reading a zone-less string as UTC. Null when it does not parse. */
function toInstant(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  const d = new Date(ZONELESS.test(s) ? `${s.replace(" ", "T")}Z` : DAY_ONLY.test(s) ? `${s}T00:00:00Z` : s);
  return isNaN(d.getTime()) ? null : d;
}

/** The UTC day of a timestamp value, 'YYYY-MM-DD', or null. */
function utcDayOf(value: Date | string | null | undefined): string | null {
  if (typeof value === "string" && DAY_ONLY.test(value.trim())) return value.trim();
  const d = toInstant(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

/** The end of a 'YYYY-MM-DD' day in UTC: midnight at the start of the next day. */
function endOfUtcDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1));
}

/**
 * When a need stops taking offers: a shift at its start (sign-ups close when
 * it starts); any other need at the end of the last day of its window, in UTC
 * (neededUntil, else needDeadline's day, else a legacy loan's loanWindowEnd
 * day). Null when it has no end.
 */
export function needClosesAt(need: NeedWindowLike): Date | null {
  if (kindForItem(need) === "shift") {
    const start = toInstant(need.shiftStartsAt ?? null);
    if (start) return start;
  }
  const day = toDay(need.neededUntil ?? null) ?? utcDayOf(need.needDeadline ?? null) ?? utcDayOf(need.loanWindowEnd ?? null);
  return day ? endOfUtcDay(day) : null;
}

/** The shift has started (kind shift with a start at or before now). */
export function shiftHasStarted(need: NeedWindowLike, now: Date = new Date()): boolean {
  if (kindForItem(need) !== "shift") return false;
  const start = toInstant(need.shiftStartsAt ?? null);
  return !!start && start.getTime() <= now.getTime();
}

/** needClosesAt is at or before now. */
export function needWindowPassed(need: NeedWindowLike, now: Date = new Date()): boolean {
  const closes = needClosesAt(need);
  return !!closes && closes.getTime() <= now.getTime();
}
