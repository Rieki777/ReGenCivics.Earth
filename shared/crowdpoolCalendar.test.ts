import { describe, expect, it } from "vitest";
import { defaultCrowdpoolOpening } from "./crowdpoolCalendar";

const at = (iso: string) => new Date(iso);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("defaultCrowdpoolOpening (the March equinox on the Year wheel)", () => {
  it("on 2026-09-27 gives 20 March 2027, Season 2, upcoming", () => {
    const o = defaultCrowdpoolOpening(at("2026-09-27T12:00:00Z"));
    expect(day(o.date)).toBe("2027-03-20");
    expect(o.seasonNumber).toBe(2);
    expect(o.state).toBe("upcoming");
  });

  it("through the Resource Season the launch is still the coming March equinox", () => {
    const o = defaultCrowdpoolOpening(at("2027-01-10T00:00:00Z"));
    expect(day(o.date)).toBe("2027-03-20");
    expect(o).toMatchObject({ seasonNumber: 2, state: "upcoming" });
    expect(defaultCrowdpoolOpening(at("2027-03-19T23:59:59Z"))).toMatchObject({ seasonNumber: 2, state: "upcoming" });
  });

  it("on the March equinox, and through the Build Season, the round is open", () => {
    for (const iso of ["2027-03-20T00:00:00Z", "2027-05-01T00:00:00Z"]) {
      const o = defaultCrowdpoolOpening(at(iso));
      expect(day(o.date), iso).toBe("2027-03-20");
      expect(o, iso).toMatchObject({ seasonNumber: 2, state: "open" });
    }
  });

  it("in the Rest Season and the next Design Season it looks ahead to the next March", () => {
    for (const iso of ["2027-08-01T00:00:00Z", "2027-10-01T00:00:00Z"]) {
      const o = defaultCrowdpoolOpening(at(iso));
      expect(day(o.date), iso).toBe("2028-03-20");
      expect(o, iso).toMatchObject({ seasonNumber: 3, state: "upcoming" });
    }
  });

  it("before Season 2 opened gives 20 March 2027, Season 2", () => {
    for (const iso of ["2026-06-01T00:00:00Z", "2026-09-21T23:59:59Z", "2024-01-01T00:00:00Z"]) {
      const o = defaultCrowdpoolOpening(at(iso));
      expect(day(o.date), iso).toBe("2027-03-20");
      expect(o, iso).toMatchObject({ seasonNumber: 2, state: "upcoming" });
    }
  });
});
