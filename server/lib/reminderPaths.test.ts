import { describe, expect, it } from "vitest";
import { scheduledReminderDonePatch, scheduledReminderStillDue } from "./reminderPaths";

describe("scheduledReminderStillDue", () => {
  const now = new Date("2026-09-19T18:05:00Z");

  it("stays due after the 24h blast has set reminderSent", () => {
    expect(scheduledReminderStillDue({
      reminderSent: 1,
      reminderScheduledFor: new Date("2026-09-19T18:00:00Z"),
      now,
    })).toBe(true);
  });

  it("is not due before the scheduled time", () => {
    expect(scheduledReminderStillDue({
      reminderSent: 0,
      reminderScheduledFor: new Date("2026-09-19T19:00:00Z"),
      now,
    })).toBe(false);
  });

  it("is not due when nothing was scheduled", () => {
    expect(scheduledReminderStillDue({
      reminderSent: 0,
      reminderScheduledFor: null,
      now,
    })).toBe(false);
  });
});

describe("scheduledReminderDonePatch", () => {
  it("clears the schedule and leaves the signup-blast flag alone", () => {
    expect(scheduledReminderDonePatch()).toEqual({ reminderScheduledFor: null });
    expect(scheduledReminderDonePatch()).not.toHaveProperty("reminderSent");
  });
});
