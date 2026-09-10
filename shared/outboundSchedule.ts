/**
 * Outbound letter scheduling. Wall clock is America/Los_Angeles (the owner's
 * timezone). This is newsletter_issues only. Event auto-reminders live on
 * Events and must not use these helpers.
 */
import { SESSION_TIME_ZONE, wallTimeInZoneToUtc } from "./sessionClock";

export const OUTBOUND_SCHEDULE_TZ = SESSION_TIME_ZONE;
export const MIN_SCHEDULE_AHEAD_MS = 60_000;
export const MAX_SCHEDULE_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function pacificDatetimeLocalToUtc(local: string): Date {
  const m = LOCAL_RE.exec(local.trim());
  if (!m) {
    throw new Error("Pick a date and time in Pacific time.");
  }
  const ymd = `${m[1]}-${m[2]}-${m[3]}`;
  return wallTimeInZoneToUtc(ymd, Number(m[4]), Number(m[5]), OUTBOUND_SCHEDULE_TZ);
}

export function utcToPacificDatetimeLocal(when: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OUTBOUND_SCHEDULE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(when);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatPacificSchedule(when: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: OUTBOUND_SCHEDULE_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(when);
}

export function defaultScheduleLocal(now = new Date()): string {
  return utcToPacificDatetimeLocal(new Date(now.getTime() + 60 * 60 * 1000));
}

export function parseScheduleInstant(iso: string): Date {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) {
    throw new Error("That send time is not a valid date.");
  }
  return when;
}

export function validateScheduleWindow(when: Date, now = new Date()): void {
  const delta = when.getTime() - now.getTime();
  if (delta < MIN_SCHEDULE_AHEAD_MS) {
    throw new Error("Pick a time at least one minute from now.");
  }
  if (delta > MAX_SCHEDULE_AHEAD_MS) {
    throw new Error("Schedule at most 90 days ahead.");
  }
}

export function isScheduledIssueDue(issue: {
  status: string;
  scheduledFor: Date | string | null;
}, now = new Date()): boolean {
  if (issue.status !== "scheduled" || !issue.scheduledFor) return false;
  const due = issue.scheduledFor instanceof Date
    ? issue.scheduledFor
    : new Date(issue.scheduledFor);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() <= now.getTime();
}
