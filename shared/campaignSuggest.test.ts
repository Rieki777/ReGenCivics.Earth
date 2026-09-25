import { describe, expect, it } from "vitest";
import { countryOf, rankAlternatives, type CampaignSuggestion } from "./campaignSuggest";

let nextId = 100;
const camp = (over: Partial<CampaignSuggestion> = {}): CampaignSuggestion => {
  const id = over.id ?? nextId++;
  return {
    id,
    title: `Campaign ${id}`,
    projectName: null,
    location: null,
    country: null,
    lat: null,
    lng: null,
    isDemo: false,
    status: "active",
    startedAt: new Date("2026-09-01"),
    path: `/project/c${id}`,
    ...over,
  };
};

const target = { id: 1, location: "Asheville, NC, USA", country: "USA", lat: 35.6, lng: -82.5 };

describe("rankAlternatives", () => {
  it("excludes the target and anything not active", () => {
    const out = rankAlternatives(target, [
      camp({ id: 1 }),
      camp({ id: 2, status: "cancelled" }),
      camp({ id: 3, status: "draft" }),
      camp({ id: 4 }),
    ]);
    expect(out.map((c) => c.id)).toEqual([4]);
  });

  it("uses demos only when no real campaign is live", () => {
    const demoOnly = rankAlternatives(target, [camp({ id: 5, isDemo: 1 }), camp({ id: 6, isDemo: true })]);
    expect(demoOnly.map((c) => c.id).sort()).toEqual([5, 6]);
    const mixed = rankAlternatives(target, [camp({ id: 5, isDemo: 1 }), camp({ id: 7 })]);
    expect(mixed.map((c) => c.id)).toEqual([7]);
  });

  it("puts the same country first, then the nearer one", () => {
    const out = rankAlternatives(target, [
      camp({ id: 10, country: "Brazil", lat: 35.6, lng: -82.5 }),
      camp({ id: 11, location: "Portland, OR, usa", lat: 45.5, lng: -122.7 }),
      camp({ id: 12, country: "USA", lat: 36.0, lng: -83.0 }),
    ]);
    expect(out.map((c) => c.id)).toEqual([12, 11, 10]);
  });

  it("puts candidates without coordinates after those with them, then the newest", () => {
    const out = rankAlternatives(target, [
      camp({ id: 20, country: "USA", startedAt: new Date("2026-01-01") }),
      camp({ id: 21, country: "USA", startedAt: new Date("2026-06-01") }),
      camp({ id: 22, country: "USA", lat: 40, lng: -100 }),
    ]);
    expect(out.map((c) => c.id)).toEqual([22, 21, 20]);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) => camp({ id: 30 + i }));
    expect(rankAlternatives(target, many)).toHaveLength(3);
    expect(rankAlternatives(target, many, 5)).toHaveLength(5);
  });
});

describe("countryOf", () => {
  it("prefers the application country, else the last part of the place", () => {
    expect(countryOf({ country: "Portugal", location: "Lisbon, Spain" })).toBe("portugal");
    expect(countryOf({ country: null, location: "Lisbon, Portugal" })).toBe("portugal");
    expect(countryOf({ country: null, location: "Lisbon" })).toBeNull();
  });
});
