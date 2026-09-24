import { describe, expect, it } from "vitest";
import {
  REGEN_SEASONS,
  REGEN_SEASON_ORDER,
  nextRegenSeason,
  previousRegenSeason,
  regenSeasonOn,
  regenSeasonSpan,
} from "./regenYear";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("regenSeasonOn", () => {
  it("keeps Season 1 in winter until Season 2 opens", () => {
    expect(regenSeasonOn(at("2026-03-01"))).toBe("winter");
    expect(regenSeasonOn(at("2026-09-21"))).toBe("winter");
    expect(regenSeasonSpan(at("2026-09-21")).seasonNumber).toBe(1);
  });

  it("puts the week of Selection Day in Season 2's winter", () => {
    const span = regenSeasonSpan(at("2026-09-24"));
    expect(span.season).toBe("winter");
    expect(span.seasonNumber).toBe(2);
    expect(span.progress).toBeGreaterThan(0);
    expect(span.progress).toBeLessThan(0.05);
  });

  it("turns at the solstices and equinoxes, one season ahead of the calendar", () => {
    expect(regenSeasonOn(at("2026-12-19"))).toBe("winter"); // week 13, crowdpool launch
    expect(regenSeasonOn(at("2026-12-21"))).toBe("spring");
    expect(regenSeasonOn(at("2027-01-15"))).toBe("spring");
    expect(regenSeasonOn(at("2027-03-19"))).toBe("spring");
    expect(regenSeasonOn(at("2027-03-20"))).toBe("summer");
    expect(regenSeasonOn(at("2027-06-20"))).toBe("summer");
    expect(regenSeasonOn(at("2027-06-21"))).toBe("fall");
    expect(regenSeasonOn(at("2027-09-21"))).toBe("fall");
    expect(regenSeasonOn(at("2027-09-22"))).toBe("winter");
  });

  it("keeps one Season number for a cohort's whole year", () => {
    expect(regenSeasonSpan(at("2027-01-15")).seasonNumber).toBe(2);
    expect(regenSeasonSpan(at("2027-09-21")).seasonNumber).toBe(2);
    expect(regenSeasonSpan(at("2027-09-22")).seasonNumber).toBe(3);
  });

  it("reports a span that contains the moment", () => {
    for (const iso of ["2026-10-30", "2027-02-02", "2027-05-05", "2027-08-08"]) {
      const d = at(iso);
      const span = regenSeasonSpan(d);
      expect(span.start.getTime()).toBeLessThanOrEqual(d.getTime());
      expect(span.end.getTime()).toBeGreaterThan(d.getTime());
    }
  });
});

describe("the wheel", () => {
  it("goes winter, spring, summer, fall, and back to winter", () => {
    expect(REGEN_SEASON_ORDER).toEqual(["winter", "spring", "summer", "fall"]);
    expect(nextRegenSeason("fall")).toBe("winter");
    expect(previousRegenSeason("winter")).toBe("fall");
  });

  it("calls the incubator winter", () => {
    expect(REGEN_SEASONS.winter.happens.join(" ")).toMatch(/incubator/);
    for (const key of ["spring", "summer", "fall"] as const) {
      expect(REGEN_SEASONS[key].happens.join(" ")).not.toMatch(/incubator/);
    }
  });

  it("keeps the copy inside the writing rules", () => {
    const banned = [
      "\u2014", // em-dash
      "journey",
      "vibrant",
      "unlock",
      "empower",
      "leverage",
      "foster",
      "seamless",
      "crucial",
    ];
    for (const s of Object.values(REGEN_SEASONS)) {
      const text = [s.headline, s.summary, s.opensWith, s.gathering, ...s.happens].join(" ").toLowerCase();
      for (const word of banned) expect(text).not.toContain(word);
    }
  });
});
