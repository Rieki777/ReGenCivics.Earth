import { describe, expect, it } from "vitest";
import {
  REGEN_SEASONS,
  REGEN_SEASON_ORDER,
  nextRegenSeason,
  previousRegenSeason,
  regenSeasonOn,
  regenSeasonSpan,
} from "./regenYear";
import { APPLY_ANYTIME_LINE, applicationCopy, intakeStatus } from "./applicationWindow";
import { REGEN_LANDS, guessLandFromTimeZone } from "./regenYear";

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
      const text = [
        s.headline,
        s.summary,
        s.opensWith,
        s.gathering,
        ...s.happens,
        ...s.play.flatMap((m) => [m.who, m.what, m.label]),
      ]
        .join(" ")
        .toLowerCase();
      for (const word of banned) expect(text).not.toContain(word);
    }
    for (const iso of ["2026-09-24", "2027-07-15"]) {
      const copy = applicationCopy(intakeStatus(at(iso)));
      const status = [copy.status, copy.headline, copy.buttonLabel, APPLY_ANYTIME_LINE].join(" ").toLowerCase();
      for (const word of banned) expect(status).not.toContain(word);
    }
    for (const land of Object.values(REGEN_LANDS)) {
      for (const word of banned) expect(land.guidance.toLowerCase()).not.toContain(word);
    }
  });

  it("names each season for what it is for, and keeps the wheel-of-the-year pattern", () => {
    expect(REGEN_SEASON_ORDER.map((k) => REGEN_SEASONS[k].title)).toEqual([
      "Design Season",
      "Resource Season",
      "Build Season",
      "Rest Season",
    ]);
    expect(REGEN_SEASON_ORDER.map((k) => REGEN_SEASONS[k].pattern)).toEqual([
      "Winter",
      "Spring",
      "Summer",
      "Fall",
    ]);
  });

  it("opens the Design Season with the Handoff Festival and every other turn with a recap and passoff", () => {
    expect(REGEN_SEASONS.winter.gathering).toMatch(/Handoff Festival/);
    for (const key of ["spring", "summer", "fall"] as const) {
      expect(REGEN_SEASONS[key].gathering).toMatch(/^Recap and passoff/);
    }
  });

  it("gives every season three ways to play, each an internal link", () => {
    for (const s of Object.values(REGEN_SEASONS)) {
      expect(s.play).toHaveLength(3);
      for (const move of s.play) {
        expect(move.href.startsWith("/")).toBe(true);
        expect(move.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("the intake follows the wheel", () => {
  it("holds applications quietly between intakes: Season 2 closed, apply anytime, no email until the next season is close", () => {
    const s = intakeStatus(at("2026-09-24"));
    expect(s).toMatchObject({ reviewing: false, closedSeason: 2, openSeason: 3 });
    const copy = applicationCopy(s);
    expect(copy.status).toMatch(/Season 2 applications are closed\./);
    expect(copy.status).toMatch(/apply anytime for the next season/);
    expect(copy.status).toMatch(/won't get emails about it until we get closer/);
    expect(copy.buttonLabel).toBe("Apply for the next season");
    expect(copy.short).toBe("Season 2 applications are closed; apply anytime for the next season");
  });

  it("stays held through the Design, Resource and Build seasons", () => {
    expect(intakeStatus(at("2027-01-15"))).toMatchObject({ reviewing: false, closedSeason: 2, openSeason: 3 });
    expect(intakeStatus(at("2027-06-20"))).toMatchObject({ reviewing: false, closedSeason: 2, openSeason: 3 });
  });

  it("opens review for the next Season in the Rest Season, until about eleven days before Selection Day", () => {
    const s = intakeStatus(at("2027-06-21"));
    expect(s).toMatchObject({ reviewing: true, closedSeason: 2, openSeason: 3 });
    expect(applicationCopy(s).headline).toBe(
      "Season 3 applications are open until September 10. We review them as they come in and email you as we go.",
    );
    expect(applicationCopy(s).buttonLabel).toBe("Apply for Season 3");
    expect(applicationCopy(s).short).toBe("Season 3 applications are open until September 10");
    expect(intakeStatus(at("2027-09-10")).reviewing).toBe(true);
  });

  it("rolls over to the next Season by itself once review closes", () => {
    expect(intakeStatus(at("2027-09-12"))).toMatchObject({ reviewing: false, closedSeason: 3, openSeason: 4 });
    expect(applicationCopy(intakeStatus(at("2027-10-01"))).closedLine).toBe("Season 3 applications are closed.");
  });
});

describe("one wheel, many lands", () => {
  it("guesses a visitor's land from the time zone, defaulting to northern", () => {
    expect(guessLandFromTimeZone("Australia/Sydney")).toBe("southern");
    expect(guessLandFromTimeZone("America/Santiago")).toBe("southern");
    expect(guessLandFromTimeZone("America/Argentina/Buenos_Aires")).toBe("southern");
    expect(guessLandFromTimeZone("Africa/Johannesburg")).toBe("southern");
    expect(guessLandFromTimeZone("America/Costa_Rica")).toBe("equatorial");
    expect(guessLandFromTimeZone("America/Guayaquil")).toBe("equatorial");
    expect(guessLandFromTimeZone("Africa/Nairobi")).toBe("equatorial");
    expect(guessLandFromTimeZone("America/Los_Angeles")).toBe("northern");
    expect(guessLandFromTimeZone("Europe/Lisbon")).toBe("northern");
    expect(guessLandFromTimeZone(undefined)).toBe("northern");
  });

  it("runs the northern calendar one season behind the Game, and the southern one opposite it", () => {
    expect(REGEN_LANDS.northern.natural).toEqual({ winter: "autumn", spring: "winter", summer: "spring", fall: "summer" });
    expect(REGEN_LANDS.southern.natural).toEqual({ winter: "spring", spring: "summer", summer: "autumn", fall: "winter" });
    expect(REGEN_LANDS.equatorial.natural).toBeNull();
  });

  it("shares the online seasons and times the land seasons locally", () => {
    expect(REGEN_SEASONS.winter.scope).toBe("shared");
    expect(REGEN_SEASONS.spring.scope).toBe("shared");
    expect(REGEN_SEASONS.summer.scope).toBe("local");
    expect(REGEN_SEASONS.fall.scope).toBe("local");
  });

  it("gives every season its own organizer", () => {
    expect(REGEN_SEASON_ORDER.map((k) => REGEN_SEASONS[k].organizer.character)).toEqual([
      "The Lantern-Keeper",
      "The Rainmaker",
      "The Barn-Raiser",
      "The Hearth-Keeper",
    ]);
  });
});
