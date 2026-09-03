import { describe, expect, it } from "vitest";
import {
  catalogOpenAccessRows,
  sessionStartUtc,
  SESSION_EASTERN_ZONE,
  SESSION_TIME_ZONE,
  sundayAfterSeason2Saturday,
  wallTimeInZoneToUtc,
} from "./sessionClock";

function hourIn(d: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" })
      .formatToParts(d)
      .find((p) => p.type === "hour")?.value,
  );
}

describe("session clock adversarial", () => {
  it("holds 11:00 Pacific across the 2026 DST spring and fall", () => {
    const beforeSpring = sessionStartUtc("2026-03-07");
    const afterSpring = sessionStartUtc("2026-03-08");
    const beforeFall = sessionStartUtc("2026-10-31");
    const afterFall = sessionStartUtc("2026-11-01");

    expect(hourIn(beforeSpring, SESSION_TIME_ZONE)).toBe(11);
    expect(hourIn(afterSpring, SESSION_TIME_ZONE)).toBe(11);
    expect(hourIn(beforeFall, SESSION_TIME_ZONE)).toBe(11);
    expect(hourIn(afterFall, SESSION_TIME_ZONE)).toBe(11);

    expect(beforeSpring.toISOString()).toBe("2026-03-07T19:00:00.000Z");
    expect(afterSpring.toISOString()).toBe("2026-03-08T18:00:00.000Z");
    expect(beforeFall.toISOString()).toBe("2026-10-31T18:00:00.000Z");
    expect(afterFall.toISOString()).toBe("2026-11-01T19:00:00.000Z");
  });

  it("keeps winter Open Access at 11am PST (7pm UTC), not 1pm Eastern", () => {
    const jan = catalogOpenAccessRows().find((r) => r.publishedDate === "2027-01-07");
    expect(jan?.startTime.toISOString()).toBe("2027-01-07T19:00:00.000Z");
    expect(hourIn(jan!.startTime, SESSION_TIME_ZONE)).toBe(11);
    expect(hourIn(jan!.startTime, SESSION_EASTERN_ZONE)).toBe(14);
  });

  it("does not treat a 1pm Eastern stamp as a valid April 2027 start", () => {
    const forgedEastern1pm = "2027-04-06T17:00:00.000Z";
    expect(sessionStartUtc("2027-04-06").toISOString()).not.toBe(forgedEastern1pm);
    expect(hourIn(new Date(forgedEastern1pm), SESSION_EASTERN_ZONE)).toBe(13);
    expect(hourIn(sessionStartUtc("2027-04-06"), SESSION_EASTERN_ZONE)).toBe(14);
  });

  it("moves only a Season 2 Saturday clash, not a later Saturday", () => {
    expect(sundayAfterSeason2Saturday("2026-10-10")).toBe("2026-10-11");
    const feb = catalogOpenAccessRows().find((r) => r.publishedDate === "2027-02-06");
    expect(feb?.date).toBe("2027-02-06");
    expect(hourIn(feb!.startTime, SESSION_TIME_ZONE)).toBe(11);
  });

  it("converges wall-time conversion instead of drifting an hour", () => {
    const pdt = wallTimeInZoneToUtc("2026-07-14", 11, 0, SESSION_TIME_ZONE);
    const pst = wallTimeInZoneToUtc("2027-01-07", 11, 0, SESSION_TIME_ZONE);
    expect(hourIn(pdt, SESSION_TIME_ZONE)).toBe(11);
    expect(hourIn(pst, SESSION_TIME_ZONE)).toBe(11);
    expect(pdt.getUTCHours()).not.toBe(pst.getUTCHours());
  });
});
