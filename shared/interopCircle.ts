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

/**
 * The vocabulary is every weekday, so adding a fourth option is a setting
 * rather than a deploy. Which days are actually offered, and at what Pacific
 * hour, lives in site_settings under INTEROP_SLOTS_SETTING; the keys stay a
 * fixed union so zod, the database column and the types cannot drift from each
 * other the way a free-form slot id would.
 */
export type InteropSlotKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const INTEROP_SLOT_KEYS: [InteropSlotKey, ...InteropSlotKey[]] = [
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
];

/** 0 = Sunday, matching Date#getDay. */
const WEEKDAY_OF: Record<InteropSlotKey, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const DAY_NAME: Record<InteropSlotKey, string> = {
  sun: "Sundays", mon: "Mondays", tue: "Tuesdays", wed: "Wednesdays",
  thu: "Thursdays", fri: "Fridays", sat: "Saturdays",
};

export interface InteropSlot {
  key: InteropSlotKey;
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
  label: string;
  /** Pacific wall-clock hour, 24h. */
  hourPT: number;
  zones: string;
}

/** site_settings key holding the offered slots as JSON: [{ "key": "tue", "hourPT": 10 }]. */
export const INTEROP_SLOTS_SETTING = "interop_circle_offered_slots";

/** What the Circle offered before the set became configurable. */
export const DEFAULT_SLOT_HOURS: { key: InteropSlotKey; hourPT: number }[] = [
  { key: "tue", hourPT: 10 },
  { key: "wed", hourPT: 16 },
  { key: "thu", hourPT: 18 },
];

function hour12(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00${hour < 12 ? "am" : "pm"}`;
}

/**
 * The other-timezone line, derived rather than written by hand so it cannot
 * contradict the hour beside it. Eastern is a fixed three hours ahead of
 * Pacific; the UK is not, so it is asked of Intl rather than assumed.
 */
function zonesFor(hourPT: number, at: Date = new Date()): string {
  const pt = `${hour12(hourPT)} PT`;
  const et = `${hour12((hourPT + 3) % 24)} ET`;
  let uk = "";
  try {
    const utc = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), hourPT + 7, 0, 0));
    const ukHour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hour12: false }).format(utc),
    );
    if (Number.isFinite(ukHour)) uk = ` · ${hour12(ukHour)} UK`;
  } catch {
    // No Intl data for London: the PT and ET halves still stand on their own.
  }
  return `${pt} · ${et}${uk}`;
}

/** A full slot from its key and Pacific hour. Label and zones are derived. */
export function buildSlot(key: InteropSlotKey, hourPT: number): InteropSlot {
  const hour = Number.isFinite(hourPT) ? Math.min(23, Math.max(0, Math.trunc(hourPT))) : 0;
  return {
    key,
    weekday: WEEKDAY_OF[key],
    hourPT: hour,
    label: `${DAY_NAME[key]}, ${hour12(hour)} PT`,
    zones: zonesFor(hour),
  };
}

export function isInteropSlotKey(v: unknown): v is InteropSlotKey {
  return typeof v === "string" && (INTEROP_SLOT_KEYS as readonly string[]).includes(v);
}

/**
 * The offered slots, from the stored setting, falling back to the defaults.
 *
 * Anything unreadable falls back rather than throwing: this feeds a public
 * page, and a bad paste into a settings field should not take the vote down.
 * Duplicate keys collapse, and the result is always in weekday order so the
 * page and the tally agree without either sorting.
 */
export function parseOfferedSlots(raw: string | null | undefined): InteropSlot[] {
  let parsed: unknown = null;
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const rows = Array.isArray(parsed) ? parsed : DEFAULT_SLOT_HOURS;
  const byKey = new Map<InteropSlotKey, number>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const key = (row as { key?: unknown }).key;
    const hourPT = (row as { hourPT?: unknown }).hourPT;
    if (!isInteropSlotKey(key)) continue;
    const hour = typeof hourPT === "number" ? hourPT : Number(hourPT);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
    byKey.set(key, Math.trunc(hour));
  }
  const chosen = byKey.size > 0 ? byKey : new Map(DEFAULT_SLOT_HOURS.map((d) => [d.key, d.hourPT] as const));
  return INTEROP_SLOT_KEYS.filter((k) => chosen.has(k)).map((k) => buildSlot(k, chosen.get(k)!));
}

/** Serialise an offered set back to the setting's shape. */
export function serializeOfferedSlots(slots: readonly { key: InteropSlotKey; hourPT: number }[]): string {
  const seen = new Set<InteropSlotKey>();
  const rows = INTEROP_SLOT_KEYS
    .map((k) => slots.find((s) => s.key === k))
    .filter((s): s is { key: InteropSlotKey; hourPT: number } => {
      if (!s || seen.has(s.key)) return false;
      seen.add(s.key);
      return true;
    })
    .map((s) => ({ key: s.key, hourPT: Math.min(23, Math.max(0, Math.trunc(s.hourPT))) }));
  return JSON.stringify(rows.length ? rows : DEFAULT_SLOT_HOURS);
}

/** The default offered set, for callers with no settings access (tests, fallbacks). */
export const INTEROP_SLOTS: readonly InteropSlot[] = parseOfferedSlots(null);

/** A stored comma list ("tue,thu"), reduced to known slots in canonical order. */
export function parseSlots(stored: string | null | undefined): InteropSlotKey[] {
  const parts = new Set((stored ?? "").split(",").map((p) => p.trim()));
  return INTEROP_SLOT_KEYS.filter((s) => parts.has(s));
}

/** The canonical comma list for a set of slots, deduplicated and ordered. */
export function serializeSlots(slots: readonly string[]): string {
  return parseSlots(slots.join(",")).join(",");
}

/**
 * A slot by key, from an offered set when one is to hand.
 *
 * Never returns undefined: a vote cast for a slot that has since been retired
 * still has to render its own label somewhere, so an unknown key falls back to
 * its default hour rather than crashing the page that reads it.
 */
export function interopSlot(key: InteropSlotKey, offered?: readonly InteropSlot[]): InteropSlot {
  const found = (offered ?? INTEROP_SLOTS).find((s) => s.key === key);
  if (found) return found;
  const fallback = DEFAULT_SLOT_HOURS.find((d) => d.key === key);
  return buildSlot(key, fallback ? fallback.hourPT : 10);
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
