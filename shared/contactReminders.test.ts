import { describe, expect, it } from "vitest";
import {
  buildReminderByContactId,
  dueReminderContactIds,
  formatReminderChip,
  getEarliestReminder,
  hasDueReminder,
  isReminderNote,
  parseReminderNote,
  todayISODate,
} from "./contactReminders";

describe("contactReminders parse-first", () => {
  it("detects ReminderPanel-prefixed notes", () => {
    expect(isReminderNote("⏰ Reminder [2026-09-17]: Follow up")).toBe(true);
    expect(isReminderNote("📋 Status → contacted")).toBe(false);
    expect(isReminderNote(null)).toBe(false);
  });

  it("parses date and message from ReminderPanel format", () => {
    expect(parseReminderNote("⏰ Reminder [2026-09-17]: Call back")).toEqual({
      date: "2026-09-17",
      message: "Call back",
    });
    expect(parseReminderNote("⏰ Reminder [2026-01-01]: Follow up")).toEqual({
      date: "2026-01-01",
      message: "Follow up",
    });
    expect(parseReminderNote("not a reminder")).toBeNull();
    expect(parseReminderNote("⏰ Reminder tomorrow")).toBeNull();
  });

  it("picks earliest reminder and marks due/overdue vs today", () => {
    const today = "2026-09-17";
    const notes = [
      { note: "⏰ Reminder [2026-09-20]: Later" },
      { note: "⏰ Reminder [2026-09-10]: Overdue" },
      { note: "📋 Status note" },
    ];
    const earliest = getEarliestReminder(notes, today);
    expect(earliest?.date).toBe("2026-09-10");
    expect(earliest?.isDue).toBe(true);
    expect(earliest?.isOverdue).toBe(true);
    expect(hasDueReminder(notes, today)).toBe(true);
    expect(hasDueReminder([{ note: "⏰ Reminder [2026-09-20]: Later" }], today)).toBe(false);
  });

  it("treats today as due but not overdue", () => {
    const today = "2026-09-17";
    const info = getEarliestReminder([{ note: "⏰ Reminder [2026-09-17]: Ping" }], today);
    expect(info).toMatchObject({ date: "2026-09-17", isDue: true, isOverdue: false });
    expect(formatReminderChip(info!)).toBe("Due today");
  });

  it("formats upcoming chip with date", () => {
    const info = getEarliestReminder([{ note: "⏰ Reminder [2026-09-20]: Ping" }], "2026-09-17");
    expect(formatReminderChip(info!)).toBe("Reminder 2026-09-20");
  });

  it("builds per-contact map and due id set", () => {
    const today = "2026-09-17";
    const map = buildReminderByContactId(
      [
        { contactId: 1, note: "⏰ Reminder [2026-09-10]: A" },
        { contactId: 1, note: "⏰ Reminder [2026-09-20]: B" },
        { contactId: 2, note: "⏰ Reminder [2026-09-25]: Future" },
        { contactId: 3, note: "plain note" },
      ],
      today,
    );
    expect(map.get(1)?.date).toBe("2026-09-10");
    expect(map.get(2)?.isDue).toBe(false);
    expect(map.has(3)).toBe(false);
    expect([...dueReminderContactIds(map)].sort()).toEqual([1]);
  });

  it("todayISODate returns YYYY-MM-DD", () => {
    expect(todayISODate(new Date("2026-09-17T15:00:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
