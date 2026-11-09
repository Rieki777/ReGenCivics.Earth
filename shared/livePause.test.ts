import { describe, expect, it } from "vitest";
import { liveSeriesOf, liveSeriesOfSummary, parseLivePause } from "./livePause";
import { OPEN_ACCESS_TITLE } from "./sessionClock";
import { INTEROP_CIRCLE_SEASON } from "./interopCircle";

describe("liveSeriesOf", () => {
  it("knows a Season 2 episode and an Open Access session", () => {
    expect(liveSeriesOf({ season: "Season 2", type: "episode", title: "Week 8: Anything" })).toBe("season2");
    expect(liveSeriesOf({ season: "Open", type: "open", title: OPEN_ACCESS_TITLE })).toBe("open_access");
  });

  it("leaves the Interoperability Circle and one-off events alone", () => {
    expect(liveSeriesOf({ season: INTEROP_CIRCLE_SEASON, type: "open", title: "Interoperability Circle" })).toBeNull();
    expect(liveSeriesOf({ season: null, type: "special", title: "Harvest" })).toBeNull();
    expect(liveSeriesOf({ season: "Season 3", type: "episode", title: "Week 1: Start" })).toBeNull();
  });
});

describe("liveSeriesOfSummary", () => {
  it("matches the titles the Google Calendar push writes", () => {
    expect(liveSeriesOfSummary(OPEN_ACCESS_TITLE)).toBe("open_access");
    expect(liveSeriesOfSummary("Week 8: Governing the commons")).toBe("season2");
    expect(liveSeriesOfSummary("Season 2 Harvest")).toBe("season2");
    expect(liveSeriesOfSummary("Interoperability Circle")).toBeNull();
    expect(liveSeriesOfSummary(undefined)).toBeNull();
  });
});

describe("parseLivePause", () => {
  it("reads running as null and keeps only valid ids", () => {
    expect(parseLivePause("")).toBeNull();
    expect(parseLivePause(null)).toBeNull();
    expect(parseLivePause("not json")).toBeNull();
    expect(parseLivePause('{"cancelledIds":[1]}')).toBeNull();
    expect(parseLivePause('{"pausedAt":"2026-11-09T17:00:00Z","cancelledIds":[4,"x",-1,5]}')).toEqual({
      pausedAt: "2026-11-09T17:00:00Z",
      cancelledIds: [4, 5],
    });
  });
});
