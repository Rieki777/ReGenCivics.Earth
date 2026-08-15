/**
 * Tests for the inbound iCalendar reader.
 *
 * The feed this parses was verified empty on 2026-08-01, so its exact shape
 * once bookings exist is unknown. That is precisely why these tests cover both
 * whole-day DATE events and timed DATE-TIME ones, folded lines, escaped text,
 * and the malformed cases: the parser has to be right the first time a real
 * booking arrives, without anyone watching.
 */

import { describe, it, expect } from "vitest";
import {
  parseIcalEvents,
  parseContentLine,
  parseIcalDate,
  unescapeIcalText,
  unfoldIcal,
} from "./ical-parse";

const wrap = (body: string) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Outdoorsy//Calendar//EN", body, "END:VCALENDAR"]
    .join("\r\n");

const vevent = (lines: string[]) =>
  wrap(["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n"));

describe("unfoldIcal", () => {
  // RFC 5545 3.1: a folder inserts CRLF followed by ONE whitespace character,
  // and unfolding removes both. The whitespace is part of the fold marker, not
  // content, so "hello\r\n world" is the word "helloworld" split in two. Any
  // space that belongs in the text sits before the CRLF.
  it("rejoins a line folded with a space, consuming the marker space", () => {
    expect(unfoldIcal("SUMMARY:hello\r\n world")).toEqual(["SUMMARY:helloworld"]);
  });

  it("rejoins a line folded with a tab", () => {
    expect(unfoldIcal("SUMMARY:hello\r\n\tworld")).toEqual(["SUMMARY:helloworld"]);
  });

  it("keeps a space that belongs to the content", () => {
    expect(unfoldIcal("SUMMARY:hello \r\n world")).toEqual(["SUMMARY:hello world"]);
  });

  it("accepts bare LF as well as CRLF", () => {
    expect(unfoldIcal("A:1\nB:2")).toEqual(["A:1", "B:2"]);
  });

  it("drops blank lines", () => {
    expect(unfoldIcal("A:1\r\n\r\nB:2")).toEqual(["A:1", "B:2"]);
  });
});

describe("unescapeIcalText", () => {
  it("restores escaped separators and newlines", () => {
    expect(unescapeIcalText("a\\, b\\; c\\nd")).toBe("a, b; c\nd");
  });

  it("restores a literal backslash", () => {
    expect(unescapeIcalText("a\\\\b")).toBe("a\\b");
  });

  it("accepts an uppercase \\N as a newline", () => {
    expect(unescapeIcalText("a\\Nb")).toBe("a\nb");
  });
});

describe("parseContentLine", () => {
  it("splits name and value at the first colon", () => {
    const r = parseContentLine("SUMMARY:Trip: Ashland");
    expect(r?.name).toBe("SUMMARY");
    expect(r?.value).toBe("Trip: Ashland");
  });

  it("reads parameters", () => {
    const r = parseContentLine("DTSTART;VALUE=DATE:20260803");
    expect(r?.name).toBe("DTSTART");
    expect(r?.params.VALUE).toBe("DATE");
    expect(r?.value).toBe("20260803");
  });

  it("does not split on a colon inside a quoted parameter", () => {
    const r = parseContentLine('DTSTART;TZID="Weird:Zone":20260803T170000');
    expect(r?.value).toBe("20260803T170000");
  });

  it("returns null for a line with no colon", () => {
    expect(parseContentLine("GARBAGE")).toBeNull();
  });
});

describe("parseIcalDate", () => {
  it("reads a whole-day DATE", () => {
    expect(parseIcalDate("20260803")).toEqual({ ymd: "2026-08-03", hasTime: false, hour: 0 });
  });

  it("reads a floating DATE-TIME, keeping its literal date", () => {
    expect(parseIcalDate("20260803T170000")).toEqual({
      ymd: "2026-08-03", hasTime: true, hour: 17,
    });
  });

  it("reads a UTC DATE-TIME", () => {
    expect(parseIcalDate("20260803T170000Z")).toEqual({
      ymd: "2026-08-03", hasTime: true, hour: 17,
    });
  });

  it("rolls a UTC DATE-TIME over midnight into the next date", () => {
    expect(parseIcalDate("20260803T233000Z")?.ymd).toBe("2026-08-03");
    expect(parseIcalDate("20260804T003000Z")?.ymd).toBe("2026-08-04");
  });

  it("rejects nonsense", () => {
    expect(parseIcalDate("not-a-date")).toBeNull();
    expect(parseIcalDate("2026-08-03")).toBeNull();
  });
});

describe("parseIcalEvents", () => {
  it("reads a whole-day booking with an exclusive DTEND", () => {
    const ics = vevent([
      "UID:trip-1@outdoorsy.com",
      "DTSTART;VALUE=DATE:20260803",
      "DTEND;VALUE=DATE:20260810",
      "SUMMARY:Booked",
    ]);
    const [e] = parseIcalEvents(ics);
    expect(e.uid).toBe("trip-1@outdoorsy.com");
    expect(e.startDate).toBe("2026-08-03");
    expect(e.endDate).toBe("2026-08-10");
    expect(e.hasTime).toBe(false);
  });

  it("treats a Monday 11am checkout as exclusive, not consuming that Monday", () => {
    // The real shape of an Outdoorsy trip: boards 5pm, returns 11am. The voyage
    // grid shares its Monday, so an 11am return leaves that Monday bookable.
    // Reading it as inclusive would eat the following week.
    const ics = vevent([
      "UID:trip-2@outdoorsy.com",
      "DTSTART:20260803T170000",
      "DTEND:20260810T110000",
      "SUMMARY:Booked",
    ]);
    const [e] = parseIcalEvents(ics);
    expect(e.startDate).toBe("2026-08-03");
    expect(e.endDate).toBe("2026-08-10");
    expect(e.hasTime).toBe(true);
  });

  it("treats an end past boarding time as consuming that day", () => {
    const ics = vevent([
      "UID:trip-3@outdoorsy.com",
      "DTSTART:20260803T170000",
      "DTEND:20260810T200000",
      "SUMMARY:Booked",
    ]);
    const [e] = parseIcalEvents(ics);
    expect(e.endDate).toBe("2026-08-11");
  });

  it("reads several events in one document", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT", "UID:a@x", "DTSTART;VALUE=DATE:20260803",
        "DTEND;VALUE=DATE:20260810", "END:VEVENT",
        "BEGIN:VEVENT", "UID:b@x", "DTSTART;VALUE=DATE:20260817",
        "DTEND;VALUE=DATE:20260824", "END:VEVENT",
      ].join("\r\n"),
    );
    const events = parseIcalEvents(ics);
    expect(events.map((e) => e.uid)).toEqual(["a@x", "b@x"]);
  });

  it("reads a folded SUMMARY", () => {
    const ics = vevent([
      "UID:trip-4@outdoorsy.com",
      "DTSTART;VALUE=DATE:20260803",
      "DTEND;VALUE=DATE:20260810",
      // Trailing space before the fold is content; the space after it is the marker.
      "SUMMARY:A very long summary that the exporter had to ",
      " fold across two lines",
    ]);
    const [e] = parseIcalEvents(ics);
    expect(e.summary).toBe("A very long summary that the exporter had to fold across two lines");
  });

  it("defaults a missing DTEND to one day", () => {
    const ics = vevent(["UID:trip-5@x", "DTSTART;VALUE=DATE:20260803"]);
    const [e] = parseIcalEvents(ics);
    expect(e.endDate).toBe("2026-08-04");
  });

  it("honours a DURATION when DTEND is absent", () => {
    const ics = vevent(["UID:trip-6@x", "DTSTART;VALUE=DATE:20260803", "DURATION:P7D"]);
    const [e] = parseIcalEvents(ics);
    expect(e.endDate).toBe("2026-08-10");
  });

  it("honours a week-valued DURATION", () => {
    const ics = vevent(["UID:trip-7@x", "DTSTART;VALUE=DATE:20260803", "DURATION:P1W"]);
    const [e] = parseIcalEvents(ics);
    expect(e.endDate).toBe("2026-08-10");
  });

  it("skips an event with no UID rather than inventing one", () => {
    const ics = vevent(["DTSTART;VALUE=DATE:20260803", "DTEND;VALUE=DATE:20260810"]);
    expect(parseIcalEvents(ics)).toHaveLength(0);
  });

  it("skips an event with no DTSTART", () => {
    const ics = vevent(["UID:trip-8@x", "DTEND;VALUE=DATE:20260810"]);
    expect(parseIcalEvents(ics)).toHaveLength(0);
  });

  it("skips an event whose DTSTART will not parse", () => {
    const ics = vevent(["UID:trip-9@x", "DTSTART:garbage", "DTEND;VALUE=DATE:20260810"]);
    expect(parseIcalEvents(ics)).toHaveLength(0);
  });

  it("never emits an inverted range", () => {
    const ics = vevent([
      "UID:trip-10@x",
      "DTSTART;VALUE=DATE:20260810",
      "DTEND;VALUE=DATE:20260803",
    ]);
    const [e] = parseIcalEvents(ics);
    expect(e.endDate > e.startDate).toBe(true);
  });

  it("returns nothing for the empty calendar Outdoorsy serves today", () => {
    const ics = wrap("X-WR-CALNAME:Outdoorsy Bookings");
    expect(parseIcalEvents(ics)).toEqual([]);
  });

  it("returns nothing for an HTML error page", () => {
    expect(parseIcalEvents("<html><body>502 Bad Gateway</body></html>")).toEqual([]);
  });

  it("flags a recurring event instead of silently blocking one occurrence", () => {
    const ics = vevent([
      "UID:trip-11@x",
      "DTSTART;VALUE=DATE:20260803",
      "DTEND;VALUE=DATE:20260810",
      "RRULE:FREQ=WEEKLY;COUNT=4",
    ]);
    const [e] = parseIcalEvents(ics);
    expect(e.hasRrule).toBe(true);
  });

  it("ignores properties outside a VEVENT", () => {
    const ics = wrap(
      ["UID:not-an-event@x", "BEGIN:VEVENT", "UID:real@x",
       "DTSTART;VALUE=DATE:20260803", "END:VEVENT"].join("\r\n"),
    );
    const events = parseIcalEvents(ics);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe("real@x");
  });
});
