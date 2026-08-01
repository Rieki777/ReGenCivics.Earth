/**
 * Tests for the voyage-week grid arithmetic.
 *
 * The cases that matter are the boundary ones. Snapping is the only thing
 * standing between a four-night Outdoorsy booking and a half-open voyage week
 * that our booking page cannot represent, and getting the Monday boundary wrong
 * by one day silently consumes an extra week (or, worse, leaves a paid night
 * for sale).
 */

import { describe, it, expect } from "vitest";
import {
  addDaysYmd,
  daysBetween,
  snapRangeToVoyageWeeks,
  voyageWeekIndex,
  voyageWeekStart,
  VOYAGE_WEEK_DAYS,
} from "./shipVoyageGrid";

/** The real anchor: SHIP_SEASON_START_YMD, a Monday. */
const SEASON = "2026-07-27";

const snap = (startDate: string, endDate: string) =>
  snapRangeToVoyageWeeks({ seasonStart: SEASON, startDate, endDate });

describe("date helpers", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysYmd("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("subtracts days across a year boundary", () => {
    expect(addDaysYmd("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("crosses a leap day correctly", () => {
    expect(addDaysYmd("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysYmd("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("does not shift across a US DST transition", () => {
    // 2026-11-01 is the autumn fallback in the US. A local-time implementation
    // drifts an hour here and lands on the wrong calendar day.
    expect(addDaysYmd("2026-10-31", 2)).toBe("2026-11-02");
    expect(daysBetween("2026-10-25", "2026-11-08")).toBe(14);
  });

  it("counts days in both directions", () => {
    expect(daysBetween(SEASON, "2026-08-03")).toBe(7);
    expect(daysBetween("2026-08-03", SEASON)).toBe(-7);
  });
});

describe("voyageWeekIndex / voyageWeekStart", () => {
  it("puts the season start in week zero", () => {
    expect(voyageWeekIndex(SEASON, SEASON)).toBe(0);
    expect(voyageWeekStart(SEASON, SEASON)).toBe(SEASON);
  });

  it("keeps every day of a week in the same week", () => {
    for (let d = 0; d < VOYAGE_WEEK_DAYS; d++) {
      expect(voyageWeekStart(SEASON, addDaysYmd(SEASON, d))).toBe(SEASON);
    }
  });

  it("rolls to the next week exactly on the Monday", () => {
    expect(voyageWeekStart(SEASON, "2026-08-02")).toBe(SEASON);
    expect(voyageWeekStart(SEASON, "2026-08-03")).toBe("2026-08-03");
  });

  it("goes negative before the season, staying on the same Monday grid", () => {
    expect(voyageWeekIndex(SEASON, "2026-07-26")).toBe(-1);
    expect(voyageWeekStart(SEASON, "2026-07-20")).toBe("2026-07-20");
  });
});

describe("snapRangeToVoyageWeeks", () => {
  it("leaves a range already on the grid untouched", () => {
    const r = snap("2026-08-03", "2026-08-10");
    expect(r.startDate).toBe("2026-08-03");
    expect(r.endDate).toBe("2026-08-10");
    expect(r.snapped).toBe(true);
  });

  it("is idempotent: snapping a snapped range changes nothing", () => {
    const once = snap("2026-08-06", "2026-08-10");
    const twice = snap(once.startDate, once.endDate);
    expect(twice.startDate).toBe(once.startDate);
    expect(twice.endDate).toBe(once.endDate);
  });

  it("expands a four-night Thursday-to-Monday trip to its whole voyage week", () => {
    // Thu 2026-08-06 through Mon 2026-08-10 exclusive: four nights inside one week.
    const r = snap("2026-08-06", "2026-08-10");
    expect(r.startDate).toBe("2026-08-03");
    expect(r.endDate).toBe("2026-08-10");
  });

  it("expands a trip straddling a Monday to two whole weeks", () => {
    // Sat 2026-08-08 to Wed 2026-08-12: crosses the 08-10 boundary.
    const r = snap("2026-08-08", "2026-08-12");
    expect(r.startDate).toBe("2026-08-03");
    expect(r.endDate).toBe("2026-08-17");
  });

  it("does not consume an extra week when the range ends exactly on a Monday", () => {
    // The regression that costs a week: endDate is exclusive, so 08-10 means
    // the last occupied night is 08-09, which is still the 08-03 week.
    const r = snap("2026-08-03", "2026-08-10");
    expect(r.endDate).toBe("2026-08-10");
  });

  it("covers a three-week booking exactly", () => {
    const r = snap("2026-08-05", "2026-08-25");
    expect(r.startDate).toBe("2026-08-03");
    expect(r.endDate).toBe("2026-08-31");
    expect(daysBetween(r.startDate, r.endDate)).toBe(28);
  });

  it("always produces whole weeks from the anchor", () => {
    for (let offset = 0; offset < 40; offset++) {
      for (let len = 1; len < 20; len++) {
        const start = addDaysYmd(SEASON, offset);
        const r = snap(start, addDaysYmd(start, len));
        expect(daysBetween(SEASON, r.startDate) % VOYAGE_WEEK_DAYS).toBe(0);
        expect(daysBetween(SEASON, r.endDate) % VOYAGE_WEEK_DAYS).toBe(0);
      }
    }
  });

  it("never snaps inward: the result always covers the input", () => {
    for (let offset = 0; offset < 40; offset++) {
      for (let len = 1; len < 20; len++) {
        const start = addDaysYmd(SEASON, offset);
        const end = addDaysYmd(start, len);
        const r = snap(start, end);
        expect(r.startDate <= start).toBe(true);
        expect(r.endDate >= end).toBe(true);
      }
    }
  });

  it("leaves a range entirely before the season start alone", () => {
    const r = snap("2026-06-01", "2026-06-08");
    expect(r.snapped).toBe(false);
    expect(r.startDate).toBe("2026-06-01");
    expect(r.endDate).toBe("2026-06-08");
  });

  it("still snaps a range that straddles the season start", () => {
    const r = snap("2026-07-25", "2026-07-29");
    expect(r.snapped).toBe(true);
    expect(r.startDate).toBe("2026-07-20");
    expect(r.endDate).toBe("2026-08-03");
  });

  it("treats an inverted range as a single day rather than blocking nothing", () => {
    const r = snap("2026-08-06", "2026-08-01");
    expect(r.startDate).toBe("2026-08-03");
    expect(r.endDate).toBe("2026-08-10");
  });

  it("treats a zero-length range as a single day", () => {
    const r = snap("2026-08-06", "2026-08-06");
    expect(r.startDate).toBe("2026-08-03");
    expect(r.endDate).toBe("2026-08-10");
  });
});
