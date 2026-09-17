/**
 * Parse-first helpers for free-text contact reminders.
 *
 * ReminderPanel stores notes as: `⏰ Reminder [YYYY-MM-DD]: …`
 * No dedicated reminder column — list chips + filters parse these notes.
 */

export const REMINDER_NOTE_PREFIX = "⏰ Reminder";

/** Captures date + message from a ReminderPanel note. */
export const REMINDER_NOTE_RE = /^⏰ Reminder \[(\d{4}-\d{2}-\d{2})\]:\s*(.*)$/s;

export type ParsedReminder = {
  date: string; // YYYY-MM-DD
  message: string;
};

export type ReminderDueInfo = ParsedReminder & {
  /** date <= today (action needed today or earlier) */
  isDue: boolean;
  /** date < today */
  isOverdue: boolean;
};

export function isReminderNote(note: string | null | undefined): boolean {
  return typeof note === "string" && note.startsWith(REMINDER_NOTE_PREFIX);
}

export function parseReminderNote(note: string | null | undefined): ParsedReminder | null {
  if (!note) return null;
  const m = note.match(REMINDER_NOTE_RE);
  if (!m) return null;
  return { date: m[1], message: (m[2] || "").trim() };
}

/** Calendar today in local timezone as YYYY-MM-DD. */
export function todayISODate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export function isReminderDateDue(date: string, today: string = todayISODate()): boolean {
  return date <= today;
}

export function isReminderDateOverdue(date: string, today: string = todayISODate()): boolean {
  return date < today;
}

export function toReminderDueInfo(
  parsed: ParsedReminder,
  today: string = todayISODate(),
): ReminderDueInfo {
  return {
    ...parsed,
    isDue: isReminderDateDue(parsed.date, today),
    isOverdue: isReminderDateOverdue(parsed.date, today),
  };
}

/**
 * Earliest reminder by date (most urgent: oldest overdue, else soonest upcoming).
 * Returns null when no parseable reminder notes exist.
 */
export function getEarliestReminder(
  notes: Array<{ note?: string | null }>,
  today: string = todayISODate(),
): ReminderDueInfo | null {
  let best: ParsedReminder | null = null;
  for (const row of notes) {
    const parsed = parseReminderNote(row.note);
    if (!parsed) continue;
    if (!best || parsed.date < best.date) best = parsed;
  }
  return best ? toReminderDueInfo(best, today) : null;
}

/** True when any reminder date is due today or overdue. */
export function hasDueReminder(
  notes: Array<{ note?: string | null }>,
  today: string = todayISODate(),
): boolean {
  for (const row of notes) {
    const parsed = parseReminderNote(row.note);
    if (parsed && isReminderDateDue(parsed.date, today)) return true;
  }
  return false;
}

/**
 * Build contactId → earliest reminder info from a flat list of reminder notes.
 * Only includes contacts that have at least one parseable reminder.
 */
export function buildReminderByContactId(
  notes: Array<{ contactId: number; note?: string | null }>,
  today: string = todayISODate(),
): Map<number, ReminderDueInfo> {
  const best = new Map<number, ParsedReminder>();
  for (const row of notes) {
    const parsed = parseReminderNote(row.note);
    if (!parsed) continue;
    const prev = best.get(row.contactId);
    if (!prev || parsed.date < prev.date) best.set(row.contactId, parsed);
  }
  const out = new Map<number, ReminderDueInfo>();
  for (const [id, parsed] of best) {
    out.set(id, toReminderDueInfo(parsed, today));
  }
  return out;
}

/** Contact ids whose earliest (or any) reminder is due today or overdue. */
export function dueReminderContactIds(
  reminderById: Map<number, ReminderDueInfo>,
): Set<number> {
  const ids = new Set<number>();
  for (const [id, info] of reminderById) {
    if (info.isDue) ids.add(id);
  }
  return ids;
}

/** Compact chip label for list rows. */
export function formatReminderChip(info: ReminderDueInfo): string {
  if (info.isOverdue) return `Due ${info.date}`;
  if (info.isDue) return "Due today";
  return `Reminder ${info.date}`;
}
