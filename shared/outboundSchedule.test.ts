import { describe, expect, it } from "vitest";
import {
  defaultScheduleLocal,
  formatPacificSchedule,
  isScheduledIssueDue,
  pacificDatetimeLocalToUtc,
  parseScheduleInstant,
  utcToPacificDatetimeLocal,
  validateScheduleWindow,
} from "./outboundSchedule";

describe("pacificDatetimeLocalToUtc", () => {
  it("maps 9:00 PDT in September to 16:00 UTC", () => {
    expect(pacificDatetimeLocalToUtc("2026-09-10T09:00").toISOString())
      .toBe("2026-09-10T16:00:00.000Z");
  });

  it("maps 9:00 PST in December to 17:00 UTC", () => {
    expect(pacificDatetimeLocalToUtc("2026-12-10T09:00").toISOString())
      .toBe("2026-12-10T17:00:00.000Z");
  });

  it("rejects a malformed local string", () => {
    expect(() => pacificDatetimeLocalToUtc("tonight")).toThrow(/Pacific time/);
  });
});

describe("utcToPacificDatetimeLocal", () => {
  it("round-trips a PDT morning", () => {
    const utc = pacificDatetimeLocalToUtc("2026-09-10T09:00");
    expect(utcToPacificDatetimeLocal(utc)).toBe("2026-09-10T09:00");
  });

  it("round-trips a PST morning", () => {
    const utc = pacificDatetimeLocalToUtc("2026-12-10T09:00");
    expect(utcToPacificDatetimeLocal(utc)).toBe("2026-12-10T09:00");
  });
});

describe("formatPacificSchedule", () => {
  it("names the Pacific offset", () => {
    const text = formatPacificSchedule(pacificDatetimeLocalToUtc("2026-09-10T09:00"));
    expect(text).toContain("PDT");
    expect(text).toContain("2026");
  });
});

describe("validateScheduleWindow", () => {
  const now = new Date("2026-09-10T16:00:00.000Z");

  it("rejects a time less than a minute away", () => {
    expect(() => validateScheduleWindow(new Date(now.getTime() + 10_000), now))
      .toThrow(/one minute/);
  });

  it("rejects more than 90 days ahead", () => {
    expect(() => validateScheduleWindow(new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000), now))
      .toThrow(/90 days/);
  });

  it("accepts a time an hour from now", () => {
    expect(() => validateScheduleWindow(new Date(now.getTime() + 60 * 60 * 1000), now))
      .not.toThrow();
  });
});

describe("isScheduledIssueDue", () => {
  const now = new Date("2026-09-10T16:00:00.000Z");

  it("is due when scheduled_for has passed", () => {
    expect(isScheduledIssueDue({
      status: "scheduled",
      scheduledFor: new Date("2026-09-10T15:59:00.000Z"),
    }, now)).toBe(true);
  });

  it("is not due while still in the future", () => {
    expect(isScheduledIssueDue({
      status: "scheduled",
      scheduledFor: new Date("2026-09-10T16:01:00.000Z"),
    }, now)).toBe(false);
  });

  it("ignores drafts and cancelled letters", () => {
    expect(isScheduledIssueDue({
      status: "draft",
      scheduledFor: new Date("2026-09-10T15:00:00.000Z"),
    }, now)).toBe(false);
    expect(isScheduledIssueDue({
      status: "cancelled",
      scheduledFor: new Date("2026-09-10T15:00:00.000Z"),
    }, now)).toBe(false);
  });
});

describe("parseScheduleInstant", () => {
  it("accepts an ISO timestamp", () => {
    expect(parseScheduleInstant("2026-09-10T16:00:00.000Z").toISOString())
      .toBe("2026-09-10T16:00:00.000Z");
  });

  it("rejects garbage", () => {
    expect(() => parseScheduleInstant("not-a-date")).toThrow(/valid date/);
  });
});

describe("defaultScheduleLocal", () => {
  it("is one hour ahead in Pacific wall time", () => {
    const now = new Date("2026-09-10T16:00:00.000Z");
    expect(defaultScheduleLocal(now)).toBe("2026-09-10T10:00");
  });
});
