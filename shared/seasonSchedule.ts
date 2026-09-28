/**
 * The Season Schedule: when a numbered Season's weekly sessions meet, and the
 * vote the land projects use to pick it (Rye, 2026-09-28).
 *
 * Reusable for every Season. Each Season is one entry in SEASON_SCHEDULES: the
 * weeks it runs, the time it opened on, the times on offer, and when the vote
 * starts steering the schedule. The page (/season-schedule), the
 * seasonSchedule router, the events sync (server/lib/seasonSchedule.ts), the
 * admin panel, and the pages that print the Season's time all read this
 * module, so they cannot drift.
 *
 * How the vote decides (ADR-65, which revised ADR-64 the same day). The
 * Season follows its vote the way the Interoperability Circle does (ADR-56),
 * after one quiet first round:
 *   - Until `followsFrom`, sessions keep the time they have, so the first few
 *     hands cannot move Week 3 back and forth before most projects have voted.
 *   - From then on, the time with the most hands becomes the Season's time
 *     once it has held the lead for SEASON_LEAD_SETTLE_HOURS, and every
 *     session more than SEASON_FREEZE_HOURS out moves to it. Voting never
 *     closes: people change their hands as their weeks change.
 *   - A tie that includes the current time keeps it: an even split is no
 *     reason to move a cohort. An admin pin overrides the vote.
 *
 * Times are Pacific wall-clock hours, like every other session on the site
 * (shared/sessionClock.ts). Much of the cohort lives where clocks never change
 * (Hawaii, Central America, Brazil), and Europe changes a week before the US,
 * so local times move mid-Season. clockShift() and clockBlip() work that out
 * from the real session dates rather than assuming it.
 */
import {
  SEASON2_EPISODE_DATES,
  SESSION_DURATION_HOURS,
  SESSION_TIME_ZONE,
  wallTimeInZoneToUtc,
} from "./sessionClock";
import {
  INTEROP_SLOT_KEYS,
  circleWeekKey,
  isInteropSlotKey,
  pacificYmd,
  parseSlots,
  serializeSlots,
  type InteropSlotKey,
} from "./interopCircle";

/*
 * The weekday vocabulary and the Pacific week are the Circle's, imported
 * rather than copied, so the two votes cannot disagree about what a week is.
 */
export type SeasonSlotKey = InteropSlotKey;
export const SEASON_SLOT_KEYS = INTEROP_SLOT_KEYS;
export const isSeasonSlotKey = isInteropSlotKey;
/** A stored comma list ("tue,thu"), reduced to known weekdays in week order. */
export const parseSeasonSlots = parseSlots;
/** The canonical comma list for a set of weekdays. */
export const serializeSeasonSlots = serializeSlots;

/** A weekday and the Pacific hour a Season meets on it. */
export interface SeasonSlotTime {
  key: SeasonSlotKey;
  /** Pacific wall-clock hour, 24h. */
  hourPT: number;
}

export interface SeasonSlot extends SeasonSlotTime {
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
  /** "Wednesday" */
  day: string;
  /** "Wednesdays" */
  days: string;
  /** "10am" */
  hour: string;
  /** "Wednesdays at 10am Pacific" */
  label: string;
  weekend: boolean;
}

export interface SeasonScheduleConfig {
  /** Matches events.season on the Season's episode rows. */
  season: string;
  /** What copy calls it: "Season Two". */
  name: string;
  /**
   * The date each week was first published for, week 1 first. A session stays
   * inside its own Monday-to-Sunday week (Pacific) whatever day it moves to,
   * so the Season keeps its length and its last week lands where it always did.
   */
  weeks: readonly string[];
  /** The time the Season opened on, before any vote. */
  opening: SeasonSlotTime;
  /** The times on offer until an admin changes them. */
  offered: readonly SeasonSlotTime[];
  /**
   * When the vote starts steering the schedule, until an admin changes it.
   * Before this, sessions keep their time; after it, they follow the vote.
   */
  followsFrom: Date;
  /** Session length in minutes. */
  minutes: number;
  /**
   * Days a session must not land on, each mapped to the day it meets instead,
   * at the same time. Pacific calendar dates, "YYYY-MM-DD".
   */
  reschedule?: Readonly<Record<string, string>>;
  /** What the page says about those days, so nobody is surprised. */
  rescheduleNote?: string;
  /**
   * Whether the page starts out asking projects who missed Selection Day for
   * their 3 to 5 minute video, so the session can go public with every project
   * in it. An admin turns the note off once it has (setting "selection_videos").
   */
  selectionVideos: boolean;
}

/** A session starting inside this window never moves. People have planned around it. */
export const SEASON_FREEZE_HOURS = 72;

/**
 * A new leader has to hold the lead this long before sessions move to it, so a
 * vote that flips back and forth does not move the Season, and email the
 * cohort, on every flip. The Circle's number (INTEROP_LEAD_SETTLE_HOURS).
 */
export const SEASON_LEAD_SETTLE_HOURS = 24;

const WEEKDAY_OF: Record<SeasonSlotKey, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const DAYS: Record<SeasonSlotKey, string> = {
  sun: "Sundays", mon: "Mondays", tue: "Tuesdays", wed: "Wednesdays",
  thu: "Thursdays", fri: "Fridays", sat: "Saturdays",
};

/**
 * The Seasons that use the Season Schedule. A new Season adds its entry here
 * and points ACTIVE_SEASON at it; the page, the vote and the sync follow.
 *
 * Season 2's times come from Rye's asks on 2026-09-28: one weekend day and
 * three weekdays with good hours from Hawaii across the Americas, then "one
 * more time that also works" for the two projects in Italy and Spain (Friday).
 * Every start sits between 10am and 2pm Pacific, which keeps Hawaii at 7am or
 * later and Brazil's finish at 9pm or earlier all Season, on either side of
 * the November clock change. Wednesday and Friday at 10am are 6pm to 7pm in
 * Central Europe. None overlaps a slot the Circle offers or an Open Access
 * session. Saturday is the time the Season opened on, so keeping it on the
 * ballot means "no change" is a real option.
 */
export const SEASON_SCHEDULES: Readonly<Record<string, SeasonScheduleConfig>> = {
  "Season 2": {
    season: "Season 2",
    name: "Season Two",
    weeks: SEASON2_EPISODE_DATES,
    opening: { key: "sat", hourPT: 11 },
    offered: [
      { key: "tue", hourPT: 14 },
      { key: "wed", hourPT: 10 },
      { key: "thu", hourPT: 12 },
      { key: "fri", hourPT: 10 },
      { key: "sat", hourPT: 11 },
    ],
    // Thursday, October 1 at 5pm Pacific: long enough after the invitation
    // for every project to answer, early enough that Week 3 can still move.
    followsFrom: wallTimeInZoneToUtc("2026-10-01", 17, 0, SESSION_TIME_ZONE),
    minutes: SESSION_DURATION_HOURS * 60,
    // Thanksgiving and the day after: Week 10 meets the Monday of that week
    // instead, at the same time (Rye, 2026-09-28).
    reschedule: { "2026-11-26": "2026-11-23", "2026-11-27": "2026-11-23" },
    rescheduleNote:
      "Thanksgiving week: if the Season lands on Thanksgiving or the day after, Week 10 meets Monday, November 23 at the same time.",
    // Selection Day stays private until the projects who missed the call have
    // sent their videos in and been added to it (Rye, 2026-09-28).
    selectionVideos: true,
  },
};

/** The Season /season-schedule shows. */
export const ACTIVE_SEASON = "Season 2";

export function seasonConfig(season: string): SeasonScheduleConfig | null {
  return Object.prototype.hasOwnProperty.call(SEASON_SCHEDULES, season) ? SEASON_SCHEDULES[season] : null;
}

export function seasonNames(): string[] {
  return Object.keys(SEASON_SCHEDULES);
}

function clampHour(hour: number): number {
  return Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour))) : 0;
}

/** "10am", "12pm", "2pm". */
export function hourLabel(hour: number): string {
  const h = clampHour(hour);
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
}

/** A full slot from its weekday and Pacific hour. Every label is derived, never written by hand. */
export function seasonSlot(key: SeasonSlotKey, hourPT: number): SeasonSlot {
  const hour = clampHour(hourPT);
  return {
    key,
    hourPT: hour,
    weekday: WEEKDAY_OF[key],
    day: DAYS[key].slice(0, -1),
    days: DAYS[key],
    hour: hourLabel(hour),
    label: `${DAYS[key]} at ${hourLabel(hour)} Pacific`,
    weekend: key === "sat" || key === "sun",
  };
}

// ─── Stored settings ─────────────────────────────────────────────────────────

export type SeasonSettingPart = "offered" | "follows_from" | "pinned" | "applied" | "leader" | "selection_videos";

/** A stored "on" or "off", or the fallback when the setting was never written. */
export function parseToggle(raw: string | null | undefined, fallback: boolean): boolean {
  if (raw === "on") return true;
  if (raw === "off") return false;
  return fallback;
}

/** site_settings key for one Season's setting: "season_schedule:season-2:offered". */
export function seasonSettingKey(season: string, part: SeasonSettingPart): string {
  const slug = season.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `season_schedule:${slug}:${part}`;
}

/**
 * The offered times, from the stored setting, falling back to the Season's
 * defaults. Anything unreadable falls back rather than throwing: this feeds a
 * public page, and a bad paste into a settings field should not take the vote
 * down. One time per weekday, always in week order.
 */
export function parseOfferedTimes(raw: string | null | undefined, fallback: readonly SeasonSlotTime[]): SeasonSlot[] {
  let parsed: unknown = null;
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const byKey = new Map<SeasonSlotKey, number>();
  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const key = (row as { key?: unknown }).key;
      const hour = Number((row as { hourPT?: unknown }).hourPT);
      if (!isSeasonSlotKey(key) || !Number.isFinite(hour) || hour < 0 || hour > 23) continue;
      byKey.set(key, Math.trunc(hour));
    }
  }
  if (byKey.size === 0) for (const d of fallback) byKey.set(d.key, d.hourPT);
  return SEASON_SLOT_KEYS.filter((k) => byKey.has(k)).map((k) => seasonSlot(k, byKey.get(k)!));
}

export function serializeOfferedTimes(slots: readonly SeasonSlotTime[]): string {
  const seen = new Set<SeasonSlotKey>();
  const rows: SeasonSlotTime[] = [];
  for (const key of SEASON_SLOT_KEYS) {
    const s = slots.find((x) => x.key === key);
    if (!s || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, hourPT: clampHour(s.hourPT) });
  }
  return JSON.stringify(rows);
}

/** A stored {"key":"wed","hourPT":10}, or null when missing or unreadable. */
export function parseSlotTime(raw: string | null | undefined): SeasonSlotTime | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const v = JSON.parse(raw) as { key?: unknown; hourPT?: unknown };
    const hour = Number(v?.hourPT);
    if (!isSeasonSlotKey(v?.key) || !Number.isFinite(hour) || hour < 0 || hour > 23) return null;
    return { key: v.key, hourPT: Math.trunc(hour) };
  } catch {
    return null;
  }
}

export function serializeSlotTime(slot: SeasonSlotTime): string {
  return JSON.stringify({ key: slot.key, hourPT: clampHour(slot.hourPT) });
}

/** A stored instant (the "follows_from" setting), or the Season's default when missing or unreadable. */
export function parseInstant(raw: string | null | undefined, fallback: Date): Date {
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    if (Number.isFinite(d.getTime())) return d;
  }
  return fallback;
}

// ─── The vote ────────────────────────────────────────────────────────────────

export interface SeasonVoteRow {
  slots: string;
  displayName: string | null;
  projectName: string | null;
  projectUrl?: string | null;
}

export interface SeasonSlotTally {
  key: SeasonSlotKey;
  /** People with a hand up for this time. */
  hands: number;
  /** Distinct projects named among those hands. A hand with no project adds none. */
  projects: number;
  /** "Rainbow Bridge Hawaii (Maya)", one line per person, capped. */
  names: string[];
}

export interface SeasonTally {
  slots: SeasonSlotTally[];
  counts: Partial<Record<SeasonSlotKey, number>>;
  /** People who voted for at least one time on offer. */
  voters: number;
}

/**
 * Count hands, projects and names per offered time. `clean` sanitises the
 * free-text fields (the server passes cleanDisplayName), so this stays pure.
 * Votes for a time no longer on offer are ignored, not deleted, so putting
 * that time back restores them.
 */
export function tallySeasonVotes(
  rows: readonly SeasonVoteRow[],
  offered: readonly SeasonSlotTime[],
  clean: (raw: string | null | undefined) => string | null,
  namesPerSlot = 40,
): SeasonTally {
  const onOffer = new Set(offered.map((o) => o.key));
  const bucket = new Map<SeasonSlotKey, { hands: number; projects: Set<string>; names: string[]; seen: Set<string> }>();
  for (const key of SEASON_SLOT_KEYS) {
    if (onOffer.has(key)) bucket.set(key, { hands: 0, projects: new Set(), names: [], seen: new Set() });
  }
  let voters = 0;
  for (const row of rows) {
    const keys = parseSeasonSlots(row.slots).filter((k) => onOffer.has(k));
    if (!keys.length) continue;
    voters += 1;
    const project = clean(row.projectName);
    const name = clean(row.displayName);
    const line = project && name ? `${project} (${name})` : project ?? name;
    for (const key of keys) {
      const b = bucket.get(key)!;
      b.hands += 1;
      if (project) b.projects.add(project.toLowerCase());
      // One line per person: a wall of the same name is the cheapest way to
      // deface a public list.
      if (line && b.names.length < namesPerSlot && !b.seen.has(line.toLowerCase())) {
        b.seen.add(line.toLowerCase());
        b.names.push(line);
      }
    }
  }
  const slots: SeasonSlotTally[] = [];
  const counts: Partial<Record<SeasonSlotKey, number>> = {};
  for (const [key, b] of bucket) {
    slots.push({ key, hands: b.hands, projects: b.projects.size, names: b.names });
    counts[key] = b.hands;
  }
  return { slots, counts, voters };
}

export interface SeasonRegisterEntry {
  project: string | null;
  /** The people who named this project, joined: "Maya, Kai". */
  names: string | null;
  url: string | null;
}

/**
 * The projects in the room: one entry per project, with the link it chose to
 * share, so the cohort can open each other's work. The Season's version of the
 * Circle's register. A person with neither a project nor a link is already in
 * the tally and adds nothing here. Pure: the server passes the cleaners, and
 * `cleanUrl` must return only http or https links (cleanRepoUrl).
 */
export function seasonRegister(
  rows: readonly SeasonVoteRow[],
  clean: (raw: string | null | undefined) => string | null,
  cleanUrl: (raw: string | null | undefined) => string | null,
  limit = 60,
): SeasonRegisterEntry[] {
  const byKey = new Map<string, { project: string | null; names: string[]; url: string | null }>();
  for (const row of rows) {
    const project = clean(row.projectName);
    const url = cleanUrl(row.projectUrl ?? null);
    if (!project && !url) continue;
    const name = clean(row.displayName);
    const key = project ? `p:${project.toLowerCase()}` : `u:${url}`;
    const entry = byKey.get(key) ?? { project, names: [], url: null };
    if (!entry.url && url) entry.url = url;
    if (name && !entry.names.some((n) => n.toLowerCase() === name.toLowerCase())) entry.names.push(name);
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .slice(0, limit)
    .map((e) => ({ project: e.project, names: e.names.length ? e.names.join(", ") : null, url: e.url }));
}

/** The week of the next session that has not started yet, or null once the Season is over. */
export function nextSessionWeek(
  rows: readonly { week: number | null; start: Date; status: string }[],
  now: Date,
): number | null {
  let best: { week: number; at: number } | null = null;
  for (const r of rows) {
    if (r.week == null || r.status === "cancelled" || r.status === "completed") continue;
    const at = r.start.getTime();
    if (at <= now.getTime()) continue;
    if (!best || at < best.at) best = { week: r.week, at };
  }
  return best?.week ?? null;
}

/** How long a feedback note may be. Long enough to say something real. */
export const SEASON_TOPIC_MAX = 1000;
export const SEASON_FACILITATION_MAX = 2000;

/**
 * Characters that let text hide or disguise itself on a public page: control
 * characters other than tab and line breaks, zero-width characters, bidi
 * overrides and the byte-order mark. Built from code points at runtime, so no
 * escape sequence can land in this file as the character itself.
 */
const HIDDEN_TEXT = new RegExp(
  "[" +
    [[0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]]
      .map(([a, b]) => (a === b ? String.fromCodePoint(a) : `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`))
      .join("") +
    "]",
  "gu",
);

/**
 * A note as it may be stored and shown: hidden characters out, line breaks
 * kept (at most one blank line in a row), trimmed and cut to `max`. React
 * renders it as text, so no markup survives either way.
 */
export function cleanNoteText(raw: string | null | undefined, max: number): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(HIDDEN_TEXT, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
  return text ? text : null;
}

/**
 * The time with the most hands, or null with none. Ties go to the earlier day
 * of the week, except that a tie including the current time keeps it.
 */
export function seasonLeader(
  counts: Partial<Record<SeasonSlotKey, number>>,
  offered: readonly SeasonSlotTime[],
  current: SeasonSlotKey | null,
): SeasonSlotKey | null {
  const onOffer = new Set(offered.map((o) => o.key));
  let best: SeasonSlotKey | null = null;
  let top = 0;
  for (const key of SEASON_SLOT_KEYS) {
    if (!onOffer.has(key)) continue;
    const n = counts[key] ?? 0;
    if (n > top) {
      best = key;
      top = n;
    }
  }
  if (!best) return null;
  if (current && current !== best && onOffer.has(current) && (counts[current] ?? 0) === top) return current;
  return best;
}

/**
 * Which time the Season's sessions follow right now. Pure, so the rules above
 * are testable. The pin wins. Before the vote starts steering, the time stays
 * whatever was last applied (or the opening time). After, the leader takes
 * over once it has held the lead for SEASON_LEAD_SETTLE_HOURS; a leader on the
 * current day takes over at once, since only its hour can differ.
 */
export function resolveSeasonSlot(opts: {
  pinned: SeasonSlotKey | null;
  leader: SeasonSlotKey | null;
  /** When the current leader took the lead, ms since epoch. */
  leaderSince: number | null;
  /** Whether the vote is steering the schedule yet (now >= followsFrom). */
  following: boolean;
  applied: SeasonSlotTime | null;
  opening: SeasonSlotTime;
  offered: readonly SeasonSlotTime[];
  nowMs: number;
}): SeasonSlotTime {
  const onOffer = (key: SeasonSlotKey | null): SeasonSlotTime | null => {
    const o = key ? opts.offered.find((s) => s.key === key) : undefined;
    return o ? { key: o.key, hourPT: o.hourPT } : null;
  };
  const pinned = onOffer(opts.pinned);
  if (pinned) return pinned;
  const current = opts.applied ?? opts.opening;
  if (!opts.following) return current;
  const lead = onOffer(opts.leader);
  if (!lead) return current;
  if (lead.key === current.key) return lead;
  const settled =
    opts.leaderSince != null && opts.nowMs - opts.leaderSince >= SEASON_LEAD_SETTLE_HOURS * 3_600_000;
  return settled ? lead : current;
}

/** The stored leader record: which time led, and since when. */
export function parseLeaderRecord(raw: string | null | undefined): { slot: SeasonSlotKey; since: number } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const v = JSON.parse(raw) as { slot?: unknown; since?: unknown };
    return isSeasonSlotKey(v?.slot) && typeof v.since === "number" && Number.isFinite(v.since)
      ? { slot: v.slot, since: v.since }
      : null;
  } catch {
    return null;
  }
}

// ─── Weeks and sessions ──────────────────────────────────────────────────────

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

/**
 * When week `week` (1-based) meets on `slot`: that weekday inside the week's
 * own Monday-to-Sunday (Pacific), at the slot's Pacific hour. DST-correct. A
 * day the Season must not meet on (config.reschedule) gives way to its
 * replacement day, at the same hour.
 */
export function seasonSessionStart(config: SeasonScheduleConfig, week: number, slot: SeasonSlotTime): Date | null {
  const anchor = config.weeks[week - 1];
  if (!anchor) return null;
  const monday = circleWeekKey(wallTimeInZoneToUtc(anchor, 12, 0, SESSION_TIME_ZONE));
  const ymd = addDaysYmd(monday, (WEEKDAY_OF[slot.key] + 6) % 7);
  const day = config.reschedule?.[ymd] ?? ymd;
  return wallTimeInZoneToUtc(day, clampHour(slot.hourPT), 0, SESSION_TIME_ZONE);
}

export interface SeasonSessionTime {
  week: number;
  start: Date;
  end: Date;
}

/** Every week on one time. What the pages show before the live rows arrive. */
export function seasonSessionsOn(config: SeasonScheduleConfig, slot: SeasonSlotTime): SeasonSessionTime[] {
  const out: SeasonSessionTime[] = [];
  for (let week = 1; week <= config.weeks.length; week++) {
    const start = seasonSessionStart(config, week, slot);
    if (start) out.push({ week, start, end: new Date(start.getTime() + config.minutes * 60_000) });
  }
  return out;
}

export interface SeasonRowLike {
  id: number;
  week: number | null;
  start: Date;
  status: string;
  manualOverride: boolean;
}

export interface SeasonMove {
  id: number;
  week: number;
  from: Date;
  to: Date;
}

/**
 * Which episode rows move onto `slot`, and where to. A row never moves when an
 * admin edited it (manualOverride), when it is cancelled, live or done, or
 * when either its current start or its new one falls inside the freeze window.
 */
export function planSeasonMoves(
  config: SeasonScheduleConfig,
  rows: readonly SeasonRowLike[],
  slot: SeasonSlotTime,
  now: Date,
  freezeHours = SEASON_FREEZE_HOURS,
): SeasonMove[] {
  const freezeUntil = now.getTime() + freezeHours * 3_600_000;
  const moves: SeasonMove[] = [];
  for (const row of rows) {
    if (row.week == null || row.manualOverride) continue;
    if (row.status !== "upcoming") continue;
    const to = seasonSessionStart(config, row.week, slot);
    if (!to || to.getTime() === row.start.getTime()) continue;
    if (row.start.getTime() <= freezeUntil || to.getTime() <= freezeUntil) continue;
    moves.push({ id: row.id, week: row.week, from: row.start, to });
  }
  return moves;
}

/**
 * Reminder offsets (minutes before start) already due at a moved session's new
 * start. The reminder job would send each of these late with its original
 * wording ("In 7 days" for a session five days out), so the sync marks them
 * handled instead. Later offsets still go out on time, with the new time.
 */
export function overdueOffsets(offsets: readonly number[], newStart: Date, now: Date): number[] {
  return offsets.filter((m) => Number.isFinite(m) && m > 0 && now.getTime() >= newStart.getTime() - m * 60_000);
}

// ─── Time zones ──────────────────────────────────────────────────────────────

/**
 * The zones the cohort lives in, west to east. Central Europe joined when Rye
 * asked for a time that also works for the projects in Italy and Spain
 * (2026-09-28); the page adds each visitor's own time for everyone else.
 */
export const SEASON_ZONES: readonly { label: string; timeZone: string }[] = [
  { label: "Hawaii", timeZone: "Pacific/Honolulu" },
  { label: "Pacific", timeZone: SESSION_TIME_ZONE },
  { label: "Central America", timeZone: "America/Guatemala" },
  { label: "US Central", timeZone: "America/Chicago" },
  { label: "Brazil", timeZone: "America/Sao_Paulo" },
  { label: "Central Europe", timeZone: "Europe/Rome" },
];

/** Minutes past local midnight, for comparing one session's clock across dates. */
function minutesIn(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value);
}

function ymdIn(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "7am", "12:30pm", with "next day" or "day before" when the zone's date differs from Pacific's. */
export function clockIn(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toLowerCase().replace(/\./g, "");
  const clock = minute === "00" ? `${hour}${period}` : `${hour}:${minute}${period}`;
  const here = ymdIn(d, timeZone);
  const pacific = pacificYmd(d);
  if (here > pacific) return `${clock} next day`;
  if (here < pacific) return `${clock} day before`;
  return clock;
}

export interface ZoneTime {
  label: string;
  time: string;
}

/** One session's start across the cohort's zones. */
export function zoneTimes(start: Date): ZoneTime[] {
  return SEASON_ZONES.map((z) => ({ label: z.label, time: clockIn(start, z.timeZone) }));
}

export interface ClockShift {
  /** The first session already on the new local time. */
  from: Date;
  /** Zones where the time moves for good. */
  zones: string[];
  /** Whether the session lands later (true) or earlier in those zones. */
  later: boolean;
}

/**
 * Whether a run of sessions ends on a different local time than it started,
 * somewhere. Sessions keep their Pacific time, so the shift shows up in the
 * zones that change their clocks on a different day from the US, or never.
 * A zone whose time wobbles and comes back (Europe, a week early) is not a
 * shift; clockBlip() reports that.
 */
export function clockShift(starts: readonly Date[]): ClockShift | null {
  if (starts.length < 2) return null;
  const first = starts[0];
  const last = starts[starts.length - 1];
  const zones: string[] = [];
  let later = false;
  let from: Date | null = null;
  for (const z of SEASON_ZONES) {
    if (z.timeZone === SESSION_TIME_ZONE) continue;
    const before = minutesIn(first, z.timeZone);
    const after = minutesIn(last, z.timeZone);
    if (before === after) continue;
    zones.push(z.label);
    later = after > before;
    const landed = starts.find((s) => minutesIn(s, z.timeZone) === after);
    if (landed && (!from || landed < from)) from = landed;
  }
  return zones.length && from ? { from, zones, later } : null;
}

export interface ClockBlip {
  /** The Monday (Pacific) of the week where the time is off. */
  weekOf: Date;
  zones: string[];
  /** Whether that week's session lands earlier (true) or later in those zones. */
  earlier: boolean;
}

/**
 * A week whose local time differs from both the first and the last session's
 * somewhere: Europe changes its clocks a week before the US, so for one week a
 * Pacific-anchored session is an hour off there, then lands back where it was.
 */
export function clockBlip(starts: readonly Date[]): ClockBlip | null {
  if (starts.length < 3) return null;
  const first = starts[0];
  const last = starts[starts.length - 1];
  for (const start of starts.slice(1, -1)) {
    const zones: string[] = [];
    let earlier = false;
    for (const z of SEASON_ZONES) {
      if (z.timeZone === SESSION_TIME_ZONE) continue;
      const here = minutesIn(start, z.timeZone);
      const a = minutesIn(first, z.timeZone);
      const b = minutesIn(last, z.timeZone);
      if (here !== a && here !== b) {
        zones.push(z.label);
        earlier = here < a;
      }
    }
    if (zones.length) {
      const weekOf = wallTimeInZoneToUtc(circleWeekKey(start), 12, 0, SESSION_TIME_ZONE);
      return { weekOf, zones, earlier };
    }
  }
  return null;
}

/**
 * The first Pacific calendar day between two instants whose clock differs
 * from the day before (the US change), as noon Pacific on that day. Null when
 * the clocks do not change in between.
 */
export function pacificClockChange(from: Date, to: Date): Date | null {
  const offsetAt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: SESSION_TIME_ZONE, timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  let ymd = pacificYmd(from);
  const last = pacificYmd(to);
  let before = offsetAt(wallTimeInZoneToUtc(ymd, 12, 0, SESSION_TIME_ZONE));
  while (ymd < last) {
    ymd = addDaysYmd(ymd, 1);
    const noon = wallTimeInZoneToUtc(ymd, 12, 0, SESSION_TIME_ZONE);
    const now = offsetAt(noon);
    if (now !== before) return noon;
    before = now;
  }
  return null;
}

/** "Hawaii, Central America and Brazil". */
export function listJoin(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
