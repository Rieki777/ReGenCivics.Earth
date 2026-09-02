import { describe, it, expect } from "vitest";
import {
  APPLICATIONS_CLOSE,
  NEW_MOON_SESSIONS,
  OPEN_ACCESS_TITLE,
  openAccessGoogleUrl,
  openAccessIcsUrl,
  parseCompactUtc,
  season2EpisodeEvents,
  upcomingOpenAccessSessions,
  SEASON_2_SERIES_GOOGLE_URL,
} from "./seasonEvents";

describe("Season 2 application close", () => {
  it("is 23:59:59 on 2026-09-11 in America/Los_Angeles", () => {
    expect(APPLICATIONS_CLOSE.getTime()).toBe(Date.parse("2026-09-12T06:59:59.000Z"));

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(APPLICATIONS_CLOSE);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    expect(get("year")).toBe("2026");
    expect(get("month")).toBe("09");
    expect(get("day")).toBe("11");
    expect(get("hour")).toBe("23");
    expect(get("minute")).toBe("59");
    expect(get("second")).toBe("59");
  });

  it("is still open at 23:59:58 PT on Sep 11", () => {
    expect(Date.parse("2026-09-12T06:59:58.000Z")).toBeLessThan(APPLICATIONS_CLOSE.getTime());
  });

  it("is closed at midnight PT on Sep 12", () => {
    expect(Date.parse("2026-09-12T07:00:00.000Z")).toBeGreaterThan(APPLICATIONS_CLOSE.getTime());
  });
});

describe("Open Access Sessions", () => {
  const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10");

  it("keeps the Sep 10 2026 session at 1:00-3:00 PM EDT", () => {
    expect(sep10).toBeDefined();
    expect(sep10?.dayName).toBe("Thursday");
    expect(sep10?.timezone).toBe("EDT");
    expect(sep10?.startUtc).toBe("20260910T170000Z");
    expect(sep10?.endUtc).toBe("20260910T190000Z");
    expect(parseCompactUtc(sep10!.startUtc).toISOString()).toBe("2026-09-10T17:00:00.000Z");
  });

  it("builds Google and Apple calendar links from that same session", () => {
    const google = openAccessGoogleUrl(sep10!);
    expect(google).toContain("calendar.google.com/calendar/render");
    expect(google).toContain("dates=20260910T170000Z/20260910T190000Z");
    expect(google).toContain(encodeURIComponent(OPEN_ACCESS_TITLE));

    const ics = decodeURIComponent(openAccessIcsUrl(sep10!).replace(/^data:text\/calendar;charset=utf8,/, ""));
    expect(ics).toContain("DTSTART:20260910T170000Z");
    expect(ics).toContain("DTEND:20260910T190000Z");
    expect(ics).toContain(`SUMMARY:${OPEN_ACCESS_TITLE}`);
  });

  it("lists only sessions whose start is still in the future", () => {
    const before = upcomingOpenAccessSessions(Date.parse("2026-09-10T16:59:59.000Z"));
    expect(before[0]?.date).toBe("2026-09-10");

    const after = upcomingOpenAccessSessions(Date.parse("2026-09-10T17:00:01.000Z"));
    expect(after[0]?.date).toBe("2026-10-10");
    expect(after.some((s) => s.date === "2026-09-10")).toBe(false);
  });
});

describe("Season 2 weekly episodes", () => {
  it("exports all 13 incubator episodes with the same calendar stamps as /schedule", () => {
    const episodes = season2EpisodeEvents();
    expect(episodes).toHaveLength(13);
    expect(episodes[0]?.title).toBe("Week 1: Selection Day");
    expect(episodes[0]?.date).toBe("2026-09-26");
    expect(episodes[0]?.time).toBe("11:00 AM");
    expect(episodes[0]?.timezone).toBe("EDT");
    expect(episodes[0]?.googleCalendarUrl).toContain("dates=20260926T150000Z/20260926T170000Z");
    expect(episodes[12]?.title).toBe("Week 13: Season Overview & Project Updates");
    expect(episodes[12]?.timezone).toBe("EST");
    expect(episodes[12]?.googleCalendarUrl).toContain("dates=20261219T160000Z/20261219T180000Z");
  });

  it("keeps the add-all-13 series link on the first weekly episode", () => {
    expect(SEASON_2_SERIES_GOOGLE_URL).toContain("dates=20260926T150000Z/20260926T170000Z");
    expect(SEASON_2_SERIES_GOOGLE_URL).toContain("RRULE:FREQ=WEEKLY;COUNT=13");
  });
});
