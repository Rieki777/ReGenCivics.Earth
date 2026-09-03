import { describe, expect, it } from "vitest";
import {
  catalogOpenAccessRows,
  sessionStartUtc,
  SESSION_EASTERN_ZONE,
  SESSION_TIME_ZONE,
} from "./sessionClock";

function hourIn(d: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" })
      .formatToParts(d)
      .find((p) => p.type === "hour")?.value,
  );
}

describe("session clock", () => {
  it("starts every Open Access session at 11:00 Pacific", () => {
    const rows = catalogOpenAccessRows();
    expect(rows.length).toBe(12);
    for (const row of rows) {
      expect(hourIn(row.startTime, SESSION_TIME_ZONE)).toBe(11);
      expect(hourIn(row.startTime, SESSION_EASTERN_ZONE)).toBe(14);
    }
  });

  it("holds April 6 2027 at 11:00 PDT / 2:00 PM EDT, not 1:00 PM Eastern", () => {
    const april = catalogOpenAccessRows().find((r) => r.publishedDate === "2027-04-06");
    expect(april).toBeDefined();
    expect(april!.date).toBe("2027-04-06");
    expect(april!.startTime.toISOString()).toBe("2027-04-06T18:00:00.000Z");
    expect(hourIn(april!.startTime, SESSION_EASTERN_ZONE)).toBe(14);
    expect(sessionStartUtc("2027-04-06").toISOString()).not.toBe("2027-04-06T17:00:00.000Z");
  });

  it("moves the Oct 10 2026 clash to Sunday Oct 11 at 11:00 Pacific", () => {
    const oct = catalogOpenAccessRows().find((r) => r.publishedDate === "2026-10-10");
    expect(oct!.date).toBe("2026-10-11");
    expect(oct!.startTime.toISOString()).toBe("2026-10-11T18:00:00.000Z");
  });
});
