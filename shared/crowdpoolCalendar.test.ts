import { describe, expect, it } from "vitest";
import { defaultCrowdpoolOpening } from "./crowdpoolCalendar";

const at = (iso: string) => new Date(iso);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("defaultCrowdpoolOpening (the December solstice on the Year wheel)", () => {
  it("on 2026-09-27 gives 21 December 2026, Season 2, upcoming", () => {
    const o = defaultCrowdpoolOpening(at("2026-09-27T12:00:00Z"));
    expect(day(o.date)).toBe("2026-12-21");
    expect(o.seasonNumber).toBe(2);
    expect(o.state).toBe("upcoming");
  });

  it("in the Resource Season gives the day it opened, open", () => {
    const o = defaultCrowdpoolOpening(at("2027-01-10T00:00:00Z"));
    expect(day(o.date)).toBe("2026-12-21");
    expect(o).toMatchObject({ seasonNumber: 2, state: "open" });
    // The opening day itself is open.
    expect(defaultCrowdpoolOpening(at("2026-12-21T00:00:00Z"))).toMatchObject({ seasonNumber: 2, state: "open" });
  });

  it("in the Build or Rest Season gives the next cycle's solstice and season", () => {
    for (const iso of ["2027-05-01T00:00:00Z", "2027-08-01T00:00:00Z"]) {
      const o = defaultCrowdpoolOpening(at(iso));
      expect(day(o.date), iso).toBe("2027-12-21");
      expect(o, iso).toMatchObject({ seasonNumber: 3, state: "upcoming" });
    }
  });

  it("in the next Design Season gives that cycle's solstice", () => {
    const o = defaultCrowdpoolOpening(at("2027-10-01T00:00:00Z"));
    expect(day(o.date)).toBe("2027-12-21");
    expect(o).toMatchObject({ seasonNumber: 3, state: "upcoming" });
  });

  it("before Season 2 opened gives 21 December 2026, Season 2", () => {
    for (const iso of ["2026-06-01T00:00:00Z", "2026-09-21T23:59:59Z", "2024-01-01T00:00:00Z"]) {
      const o = defaultCrowdpoolOpening(at(iso));
      expect(day(o.date), iso).toBe("2026-12-21");
      expect(o, iso).toMatchObject({ seasonNumber: 2, state: "upcoming" });
    }
  });

  it("the day before the solstice is still upcoming", () => {
    expect(defaultCrowdpoolOpening(at("2026-12-20T23:59:59Z"))).toMatchObject({ seasonNumber: 2, state: "upcoming" });
  });
});
