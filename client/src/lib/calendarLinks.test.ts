/**
 * Times, per timezone, with the zone passed explicitly so these assertions do
 * not depend on the machine the suite happens to run on.
 *
 * The bug being pinned here was live on 2026-09-07: the event rows rendered the
 * DATE in the reader's zone and the CLOCK in Pacific. A reader in Sydney was
 * shown "Sunday, September 27, 2026" beside "11:00 AM PDT" for a session that
 * runs on Saturday the 26th. Both halves were individually defensible and the
 * pair was wrong, which is why no single-zone test caught it.
 */
import { describe, it, expect } from "vitest";
import {
  CALENDAR_FEEDS,
  eventFeed,
  formatLocalDate,
  formatLocalRange,
  formatLocalTime,
  formatRangeWithReference,
  formatSessionWhen,
  formatStartWithReference,
  pacificReference,
  resolveRoomUrl,
  viewerIsPacific,
} from "./calendarLinks";
import { JOIN_URL, RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";

/** Week 1, 11:00 Pacific on Saturday 2026-09-26. */
const WEEK1_START = new Date("2026-09-26T18:00:00Z");
const WEEK1_END = new Date("2026-09-26T20:00:00Z");

describe("date and clock come from one zone", () => {
  it("moves the date with the clock for a reader past the dateline", () => {
    // The event is Saturday 11:00 in Pacific. In Sydney it is Sunday 4:00 AM.
    // Both parts of the rendered line must say Sunday.
    expect(formatLocalDate(WEEK1_START, "Australia/Sydney")).toBe("Sunday, September 27, 2026");
    expect(formatLocalTime(WEEK1_START, "Australia/Sydney")).toBe("4:00 AM GMT+10");

    const line = formatSessionWhen(WEEK1_START, WEEK1_END, "Australia/Sydney");
    expect(line).toContain("Sunday, September 27, 2026");
    expect(line).toContain("4:00 AM to 6:00 AM GMT+10");
    // The Pacific reference is present, but as a reference, not as the clock
    // sitting next to a Sydney date.
    expect(line).toContain("(11:00 AM PDT)");
    expect(line.indexOf("Sunday")).toBeLessThan(line.indexOf("4:00 AM"));
  });

  it("keeps Saturday for a reader west of the dateline", () => {
    expect(formatLocalDate(WEEK1_START, "Europe/Berlin")).toBe("Saturday, September 26, 2026");
    expect(formatLocalRange(WEEK1_START, WEEK1_END, "Europe/Berlin")).toBe(
      "8:00 PM to 10:00 PM GMT+2",
    );
  });
});

describe("the Pacific reference", () => {
  it("is suppressed for a reader whose clock already reads Pacific", () => {
    expect(viewerIsPacific(WEEK1_START, "America/Los_Angeles")).toBe(true);
    expect(pacificReference(WEEK1_START, "America/Los_Angeles")).toBeNull();
    expect(formatStartWithReference(WEEK1_START, "America/Los_Angeles")).toBe("11:00 AM PDT");
  });

  it("is suppressed for Arizona in summer, which shares Pacific's offset", () => {
    // Phoenix is MST year round; in September that is the same offset as PDT.
    // Comparing zone abbreviations rather than offsets would print a redundant
    // reference here.
    expect(viewerIsPacific(WEEK1_START, "America/Phoenix")).toBe(true);
    expect(formatStartWithReference(WEEK1_START, "America/Phoenix")).toBe("11:00 AM MST");
  });

  it("is shown for everyone else", () => {
    expect(formatStartWithReference(WEEK1_START, "America/New_York")).toBe(
      "2:00 PM EDT (11:00 AM PDT)",
    );
    expect(formatStartWithReference(WEEK1_START, "Asia/Kolkata")).toBe(
      "11:30 PM GMT+5:30 (11:00 AM PDT)",
    );
    expect(formatRangeWithReference(WEEK1_START, WEEK1_END, "America/Chicago")).toBe(
      "1:00 PM to 3:00 PM CDT (11:00 AM PDT)",
    );
  });

  it("follows the Pacific DST change rather than a fixed offset", () => {
    // Week 7 is after the November change: still 11:00 Pacific, now PST.
    const week7 = new Date("2026-11-07T19:00:00Z");
    expect(formatStartWithReference(week7, "America/New_York")).toBe("2:00 PM EST (11:00 AM PST)");
  });
});

describe("Feed URLs", () => {
  it("gives Google an https deep link carrying the encoded webcal URL", () => {
    for (const feed of Object.values(CALENDAR_FEEDS)) {
      expect(feed.googleUrl.startsWith("https://calendar.google.com/calendar/render?cid=")).toBe(true);
      expect(decodeURIComponent(feed.googleUrl)).toContain(feed.webcalUrl);
      expect(feed.webcalUrl.startsWith("webcal://")).toBe(true);
      expect(feed.httpsUrl.startsWith("https://regencivics.earth/")).toBe(true);
      // /u/0/ pins the flow to the wrong account for anyone signed into two.
      expect(feed.googleUrl).not.toContain("/u/0/");
    }
  });

  it("addresses a single session by its row id", () => {
    expect(eventFeed(20).httpsUrl).toBe("https://regencivics.earth/calendar/event/20.ics");
    expect(eventFeed(20).webcalUrl).toBe("webcal://regencivics.earth/calendar/event/20.ics");
  });
});

describe("resolveRoomUrl", () => {
  it("swaps the default studio URL for the durable /join redirect", () => {
    expect(resolveRoomUrl(RIVERSIDE_ROOM_URL)).toBe(JOIN_URL);
    expect(resolveRoomUrl(null)).toBe(JOIN_URL);
    expect(resolveRoomUrl("  ")).toBe(JOIN_URL);
  });

  it("leaves a genuine per-event room alone", () => {
    expect(resolveRoomUrl("https://riverside.com/studio/other")).toBe(
      "https://riverside.com/studio/other",
    );
  });
});
