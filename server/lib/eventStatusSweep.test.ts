import { describe, expect, it } from "vitest";
import { shouldMarkEventCompleted, shouldMarkEventLive } from "./eventStatusSweep";

describe("eventStatusSweep predicates", () => {
  const start = new Date("2026-09-20T18:00:00Z");
  const end = new Date("2026-09-20T20:00:00Z");

  it("marks live only while start <= now < endTime", () => {
    expect(shouldMarkEventLive({
      status: "upcoming",
      startTime: start,
      endTime: end,
      now: new Date("2026-09-20T19:00:00Z"),
    })).toBe(true);
    expect(shouldMarkEventLive({
      status: "upcoming",
      startTime: start,
      endTime: end,
      now: new Date("2026-09-20T20:00:00Z"),
    })).toBe(false);
  });

  it("does not mark live when endTime is missing (complete via start fallback instead)", () => {
    expect(shouldMarkEventLive({
      status: "upcoming",
      startTime: start,
      endTime: null,
      now: new Date("2026-09-20T18:30:00Z"),
    })).toBe(false);
  });

  it("completes when endTime is past", () => {
    expect(shouldMarkEventCompleted({
      status: "upcoming",
      startTime: start,
      endTime: end,
      now: new Date("2026-09-20T20:00:01Z"),
    })).toBe(true);
  });

  it("completes start-only events once start has passed", () => {
    expect(shouldMarkEventCompleted({
      status: "upcoming",
      startTime: start,
      endTime: null,
      now: new Date("2026-09-20T18:00:01Z"),
    })).toBe(true);
    expect(shouldMarkEventCompleted({
      status: "live",
      startTime: start,
      endTime: null,
      now: new Date("2026-09-20T17:59:59Z"),
    })).toBe(false);
  });
});
