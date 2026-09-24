/**
 * The Interoperability Circle: the weekly tools working group.
 *
 * One definition of the candidate slots, the session shape, and the rules for
 * picking the slot, shared by /interop-sessions, the interopSessions router,
 * the events-table sync (server/lib/interopCircle.ts), the calendar feed and
 * the admin panel, so they cannot drift.
 *
 * Each week's Circle is an ordinary `events` row (type "special", season
 * INTEROP_CIRCLE_SEASON). That is what puts it on /schedule, in the calendar
 * feeds, in Admin > Events, and in the auto-reminder job alongside every other
 * session.
 */
import { wallTimeInZoneToUtc, SESSION_TIME_ZONE } from "./sessionClock";

export type InteropSlotKey = "tue" | "wed" | "thu";

export interface InteropSlot {
  key: InteropSlotKey;
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
  label: string;
  /** Pacific wall-clock hour, 24h. */
  hourPT: number;
  zones: string;
}

export const INTEROP_SLOTS: readonly InteropSlot[] = [
  { key: "tue", weekday: 2, label: "Tuesdays, 10:00am PT", hourPT: 10, zones: "10:00am PT · 1:00pm ET · 6:00pm UK" },
  { key: "wed", weekday: 3, label: "Wednesdays, 4:00pm PT", hourPT: 16, zones: "4:00pm PT · 7:00pm ET" },
  { key: "thu", weekday: 4, label: "Thursdays, 6:00pm PT", hourPT: 18, zones: "6:00pm PT · 9:00pm ET" },
];

export const INTEROP_SLOT_KEYS = INTEROP_SLOTS.map((s) => s.key) as [InteropSlotKey, ...InteropSlotKey[]];

export function isInteropSlotKey(v: unknown): v is InteropSlotKey {
  return v === "tue" || v === "wed" || v === "thu";
}

/** A stored comma list ("tue,thu"), reduced to known slots in canonical order. */
export function parseSlots(stored: string | null | undefined): InteropSlotKey[] {
  const parts = new Set((stored ?? "").split(",").map((p) => p.trim()));
  return INTEROP_SLOT_KEYS.filter((s) => parts.has(s));
}

/** The canonical comma list for a set of slots, deduplicated and ordered. */
export function serializeSlots(slots: readonly string[]): string {
  return parseSlots(slots.join(",")).join(",");
}

export function interopSlot(key: InteropSlotKey): InteropSlot {
  return INTEROP_SLOTS.find((s) => s.key === key)!;
}

export const INTEROP_CIRCLE_TITLE = "Interoperability Circle";
export const INTEROP_CIRCLE_SEASON = "Interop Circle";
export const INTEROP_CIRCLE_MINUTES = 90;
export const INTEROP_CIRCLE_DESCRIPTION =
  "The weekly tools working group. We bring our repos, bots and agents into one room and build the " +
  "shared foundation the plays coming out of Season Two run on. Pick the time and sign up at " +
  "https://regencivics.earth/interop-sessions";

/** How many weeks of Circle rows the sync keeps on the calendar ahead of today. */
export const INTEROP_CIRCLE_WEEKS_AHEAD = 4;

/**
 * A session starting inside this window never moves, whatever the vote does.
 * People have planned around it and may already have had the 24h reminder.
 */
export const INTEROP_FREEZE_HOURS = 72;

/**
 * A new leader has to hold the lead this long before sessions move to it, so a
 * vote that flips back and forth does not send a "the Circle moved" email on
 * every flip.
 */
export const INTEROP_LEAD_SETTLE_HOURS = 24;

/** Reminder offsets for each week: the day before, an hour before, and the pre-call ping. */
export const INTEROP_REMINDER_OFFSETS = [24 * 60, 60, 33];

/** site_settings keys. */
export const INTEROP_PIN_SETTING = "interop_circle_pinned_slot";
export const INTEROP_APPLIED_SETTING = "interop_circle_applied_slot";
export const INTEROP_LEADER_SETTING = "interop_circle_leader";

/**
 * The leading slot from per-slot hand counts. Ties go to the earlier slot in
 * the week so the answer is stable; no hands at all means no leader.
 */
export function leadingSlot(counts: Partial<Record<InteropSlotKey, number>>): InteropSlotKey | null {
  let best: InteropSlotKey | null = null;
  for (const s of INTEROP_SLOTS) {
    const n = counts[s.key] ?? 0;
    if (n > 0 && (best == null || n > (counts[best] ?? 0))) best = s.key;
  }
  return best;
}

/**
 * Which slot sessions should run in, given the admin pin, the live leader,
 * when that leader took the lead, and the slot currently applied.
 * Pure, so the settle rule is testable.
 */
export function resolveCircleSlot(opts: {
  pinned: InteropSlotKey | null;
  leader: InteropSlotKey | null;
  leaderSince: number | null;
  applied: InteropSlotKey | null;
  nowMs: number;
}): InteropSlotKey {
  if (opts.pinned) return opts.pinned;
  const fallback = opts.applied ?? opts.leader ?? INTEROP_SLOTS[0].key;
  if (!opts.leader) return fallback;
  if (opts.applied == null) return opts.leader;
  if (opts.leader === opts.applied) return opts.applied;
  const settled =
    opts.leaderSince != null && opts.nowMs - opts.leaderSince >= INTEROP_LEAD_SETTLE_HOURS * 3_600_000;
  return settled ? opts.leader : opts.applied;
}

/** YYYY-MM-DD of an instant, in Pacific. */
export function pacificYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SESSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days, 12));
  return t.toISOString().slice(0, 10);
}

function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** The Monday (Pacific) that starts the week an instant falls in. Keys one Circle per week. */
export function circleWeekKey(d: Date): string {
  const ymd = pacificYmd(d);
  const back = (weekdayOfYmd(ymd) + 6) % 7;
  return addDaysYmd(ymd, -back);
}

/** Start instant of the slot in the week that begins on Monday `weekKey`, DST-correct. */
export function slotStartInWeek(slot: InteropSlot, weekKey: string): Date {
  const ymd = addDaysYmd(weekKey, (slot.weekday + 6) % 7);
  return wallTimeInZoneToUtc(ymd, slot.hourPT, 0, SESSION_TIME_ZONE);
}

/** The next `count` starts of a slot after `from`. */
export function upcomingSlotStarts(slot: InteropSlot, from: Date, count: number): Date[] {
  const out: Date[] = [];
  let week = circleWeekKey(from);
  while (out.length < count) {
    const start = slotStartInWeek(slot, week);
    if (start.getTime() > from.getTime()) out.push(start);
    week = addDaysYmd(week, 7);
  }
  return out;
}
