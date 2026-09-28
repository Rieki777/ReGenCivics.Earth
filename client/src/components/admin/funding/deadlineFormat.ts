/**
 * Deadlines in the funding admin, always shown and entered in Pacific time
 * (the funders' portals and Rye's calendar both run on it). Stored instants
 * are UTC; shared/fundingDeadlines.ts converts, daylight time included.
 */
import { zonedToUtc } from "@shared/fundingDeadlines";

const PT = "America/Los_Angeles";
const DAY_MS = 86_400_000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The Pacific date and time of an instant, for date and time inputs. */
export function pacificParts(value: string | Date | null | undefined): { date: string; time: string } | null {
  const d = toDate(value);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** A Pacific date and time from inputs, as an ISO instant; a date alone is the start of that day. */
export function pacificInputToIso(date: string, time: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return null;
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  const at = zonedToUtc(PT, Number(m[1]), Number(m[2]), Number(m[3]), t ? Number(t[1]) : 0, t ? Number(t[2]) : 0);
  return at.toISOString();
}

export type DeadlineTone = "past" | "urgent" | "soon" | "later";

/** "Nov 2, 8:00 PM PT", the whole days left, and how loudly to show it. */
export function describeDeadline(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): { label: string; daysLeft: number; tone: DeadlineTone } | null {
  const d = toDate(value);
  if (!d) return null;
  const label = `${new Intl.DateTimeFormat("en-US", { timeZone: PT, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d)} PT`;
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / DAY_MS);
  const tone: DeadlineTone = daysLeft < 0 ? "past" : daysLeft <= 2 ? "urgent" : daysLeft <= 7 ? "soon" : "later";
  return { label, daysLeft, tone };
}

export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  past: "bg-slate-100 text-slate-800 border-slate-300",
  urgent: "bg-rose-100 text-rose-900 border-rose-400",
  soon: "bg-amber-100 text-amber-900 border-amber-400",
  later: "bg-emerald-100 text-emerald-900 border-emerald-400",
};

export function daysLeftText(daysLeft: number): string {
  if (daysLeft < 0) return `${-daysLeft} day${daysLeft === -1 ? "" : "s"} ago`;
  if (daysLeft === 0) return "today";
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}
