import { describe, expect, it } from "vitest";
import { needClosesAt, needWindowPassed, shiftHasStarted, type NeedWindowLike } from "./needWindow";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

describe("needClosesAt", () => {
  it("a shift closes at its start", () => {
    expect(iso(needClosesAt({ kind: "shift", shiftStartsAt: new Date("2026-10-12T09:00:00Z"), neededUntil: "2026-12-01" })))
      .toBe("2026-10-12T09:00:00.000Z");
  });

  it("a legacy role row with a shift start but no kind is not a shift", () => {
    expect(iso(needClosesAt({ category: "role", shiftStartsAt: "2026-10-12 09:00:00" }))).toBeNull();
  });

  it("a shift with no start reads its window", () => {
    expect(iso(needClosesAt({ kind: "shift", neededUntil: "2026-10-20" }))).toBe("2026-10-21T00:00:00.000Z");
  });

  it("a thing with neededUntil closes at the end of that day in UTC", () => {
    expect(iso(needClosesAt({ kind: "item", neededFrom: "2026-10-01", neededUntil: "2026-10-31" }))).toBe("2026-11-01T00:00:00.000Z");
    expect(iso(needClosesAt({ kind: "item", neededUntil: "2026-12-31" }))).toBe("2027-01-01T00:00:00.000Z");
  });

  it("uses needDeadline's day when neededUntil is empty", () => {
    expect(iso(needClosesAt({ kind: "role", neededUntil: null, needDeadline: new Date("2026-10-15T18:30:00Z") })))
      .toBe("2026-10-16T00:00:00.000Z");
    // neededUntil wins when both are there.
    expect(iso(needClosesAt({ kind: "role", neededUntil: "2026-10-20", needDeadline: new Date("2026-10-15T18:30:00Z") })))
      .toBe("2026-10-21T00:00:00.000Z");
  });

  it("falls back to a legacy loan's loanWindowEnd", () => {
    expect(iso(needClosesAt({ kind: "loan", loanWindowEnd: new Date("2026-11-30T10:00:00Z") }))).toBe("2026-12-01T00:00:00.000Z");
    expect(iso(needClosesAt({ kind: "loan", needDeadline: "2026-11-01 00:00:00", loanWindowEnd: "2026-11-30 10:00:00" })))
      .toBe("2026-11-02T00:00:00.000Z");
  });

  it("is null when the need has no dates", () => {
    expect(needClosesAt({ kind: "item" })).toBeNull();
    expect(needClosesAt({ kind: "role", neededFrom: "2026-10-01" })).toBeNull();
    expect(needClosesAt({ kind: "shift" })).toBeNull();
    expect(needClosesAt({ kind: "item", neededUntil: "not a date", needDeadline: "nope" })).toBeNull();
  });

  it("reads a zone-less database string as UTC", () => {
    expect(iso(needClosesAt({ kind: "shift", shiftStartsAt: "2026-10-12 09:00:00" }))).toBe("2026-10-12T09:00:00.000Z");
    expect(iso(needClosesAt({ kind: "role", needDeadline: "2026-10-15 23:30:00" }))).toBe("2026-10-16T00:00:00.000Z");
    // A string that carries its zone keeps it.
    expect(iso(needClosesAt({ kind: "shift", shiftStartsAt: "2026-10-12T09:00:00-05:00" }))).toBe("2026-10-12T14:00:00.000Z");
  });
});

describe("needWindowPassed and shiftHasStarted", () => {
  const shift: NeedWindowLike = { kind: "shift", shiftStartsAt: "2026-10-12 09:00:00" };
  const thing: NeedWindowLike = { kind: "item", neededUntil: "2026-10-31" };

  it("a shift has started from the second it starts", () => {
    expect(shiftHasStarted(shift, new Date("2026-10-12T08:59:59Z"))).toBe(false);
    expect(shiftHasStarted(shift, new Date("2026-10-12T09:00:00Z"))).toBe(true);
    expect(shiftHasStarted(shift, new Date("2026-10-12T09:00:01Z"))).toBe(true);
    expect(needWindowPassed(shift, new Date("2026-10-12T08:59:59Z"))).toBe(false);
    expect(needWindowPassed(shift, new Date("2026-10-12T09:00:01Z"))).toBe(true);
  });

  it("a window passes at the end of its last day, one second either side", () => {
    expect(needWindowPassed(thing, new Date("2026-10-31T23:59:59Z"))).toBe(false);
    expect(needWindowPassed(thing, new Date("2026-11-01T00:00:00Z"))).toBe(true);
    expect(needWindowPassed(thing, new Date("2026-11-01T00:00:01Z"))).toBe(true);
  });

  it("only a shift starts", () => {
    expect(shiftHasStarted(thing, new Date("2027-01-01T00:00:00Z"))).toBe(false);
    expect(shiftHasStarted({ kind: "shift" }, new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("a need with no end never passes", () => {
    expect(needWindowPassed({ kind: "role" }, new Date("2099-01-01T00:00:00Z"))).toBe(false);
  });
});
