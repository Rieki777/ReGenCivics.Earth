import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  SEASON_2_SERIES_ICS_URL,
  wallTimeInZoneToUtc,
  sessionStartUtc,
  hourInZone,
  formatDualZoneStart,
  formatDualZoneRange,
  formatTimeInZone,
  season2EpisodeUid,
  openAccessUid,
  nextIcsSequence,
  buildIcsEvent,
  buildAllEventsIcs,
  ICS_SEQUENCE,
  ICS_SEQUENCE_OA_RESCHEDULE,
  sundayAfterSeason2Saturday,
  CALENDAR_SUBSCRIBE_WEBCAL,
  CALENDAR_FEED_PATH,
} from "./seasonEvents";

const PT = "America/Los_Angeles";
const ET = "America/New_York";

function decodeIcsDataUrl(url: string): string {
  return decodeURIComponent(url.replace(/^data:text\/calendar;charset=utf8,/, ""));
}

function googleDateRange(url: string): { start: string; end: string } {
  const match = url.match(/dates=(\d{8}T\d{6}Z)\/(\d{8}T\d{6}Z)/);
  if (!match) throw new Error(`No dates= range in ${url}`);
  return { start: match[1], end: match[2] };
}

function assertElevenPtTwoEt(start: Date, label: string) {
  const ptHour = hourInZone(start, PT);
  const etHour = hourInZone(start, ET);
  expect(ptHour, `${label} must not be 8:00 AM Pacific`).not.toBe(8);
  expect(etHour, `${label} must not be 8:00 AM Eastern`).not.toBe(8);
  expect(etHour, `${label} must not be 1:00 PM Eastern`).not.toBe(13);
  expect(ptHour, `${label} Pacific hour`).toBe(11);
  expect(etHour, `${label} Eastern hour`).toBe(14);
}

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

describe("wall-clock conversion (11:00 PT is 14:00 ET)", () => {
  it("maps 11:00 America/Los_Angeles on 2026-09-26 to 18:00 UTC and 14:00 ET", () => {
    const start = wallTimeInZoneToUtc("2026-09-26", 11, 0, PT);
    expect(start.toISOString()).toBe("2026-09-26T18:00:00.000Z");
    expect(hourInZone(start, PT)).toBe(11);
    expect(hourInZone(start, ET)).toBe(14);
    expect(formatTimeInZone(start, PT)).toBe("11:00 AM PDT");
    expect(formatTimeInZone(start, ET)).toBe("2:00 PM EDT");
  });

  it("maps the same instant from 14:00 America/New_York", () => {
    const fromEt = wallTimeInZoneToUtc("2026-09-26", 14, 0, ET);
    const fromPt = wallTimeInZoneToUtc("2026-09-26", 11, 0, PT);
    expect(fromEt.getTime()).toBe(fromPt.getTime());
  });

  it("keeps 11:00 PT after US DST ends (2026-11-07 is 19:00 UTC / 2:00 PM EST)", () => {
    const start = wallTimeInZoneToUtc("2026-11-07", 11, 0, PT);
    expect(start.toISOString()).toBe("2026-11-07T19:00:00.000Z");
    expect(hourInZone(start, PT)).toBe(11);
    expect(hourInZone(start, ET)).toBe(14);
    expect(formatTimeInZone(start, PT)).toBe("11:00 AM PST");
    expect(formatTimeInZone(start, ET)).toBe("2:00 PM EST");
  });
});

describe("Open Access Sessions", () => {
  it("starts every session at 11:00 Pacific / 14:00 Eastern", () => {
    expect(NEW_MOON_SESSIONS.length).toBeGreaterThanOrEqual(5);
    for (const session of NEW_MOON_SESSIONS) {
      const start = parseCompactUtc(session.startUtc);
      assertElevenPtTwoEt(start, `Open Access ${session.date}`);
      const end = parseCompactUtc(session.endUtc);
      expect((end.getTime() - start.getTime()) / 3_600_000).toBe(2);
    }
  });

  it("keeps the Sep 10 2026 session at 11:00 PDT / 2:00 PM EDT", () => {
    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10");
    expect(sep10).toBeDefined();
    expect(sep10?.dayName).toBe("Thursday");
    expect(sep10?.startUtc).toBe("20260910T180000Z");
    expect(sep10?.endUtc).toBe("20260910T200000Z");
    expect(parseCompactUtc(sep10!.startUtc).toISOString()).toBe("2026-09-10T18:00:00.000Z");
    expect(formatDualZoneStart(parseCompactUtc(sep10!.startUtc))).toBe("11:00 AM PDT, 2:00 PM EDT");
    expect(formatDualZoneRange(parseCompactUtc(sep10!.startUtc), parseCompactUtc(sep10!.endUtc))).toBe(
      "11:00 AM to 1:00 PM PDT, 2:00 PM to 4:00 PM EDT",
    );
  });

  it("rejects the old 1:00 PM Eastern Open Access stamp", () => {
    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10")!;
    expect(sep10.startUtc).not.toBe("20260910T170000Z");
    expect(openAccessGoogleUrl(sep10)).not.toContain("20260910T170000Z");
  });

  it("encodes that same instant in Google and Apple/ICS links", () => {
    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10")!;
    const google = openAccessGoogleUrl(sep10);
    const range = googleDateRange(google);
    expect(google).toContain("calendar.google.com/calendar/render");
    expect(range.start).toBe("20260910T180000Z");
    expect(range.end).toBe("20260910T200000Z");
    expect(google).toContain(encodeURIComponent(OPEN_ACCESS_TITLE));

    const ics = decodeIcsDataUrl(openAccessIcsUrl(sep10));
    expect(ics).toContain("DTSTART:20260910T180000Z");
    expect(ics).toContain("DTEND:20260910T200000Z");
    expect(ics).toContain(`SUMMARY:${OPEN_ACCESS_TITLE}`);
    expect(ics).toContain(`UID:${openAccessUid(sep10.date)}`);
    expect(ics).toContain(`SEQUENCE:${ICS_SEQUENCE}`);

    assertElevenPtTwoEt(parseCompactUtc(range.start), "OA Google start");
    assertElevenPtTwoEt(parseCompactUtc(ics.match(/DTSTART:(\d{8}T\d{6}Z)/)![1]), "OA ICS start");
  });

  it("lists only sessions whose start is still in the future", () => {
    const before = upcomingOpenAccessSessions(Date.parse("2026-09-10T17:59:59.000Z"));
    expect(before[0]?.date).toBe("2026-09-10");

    const after = upcomingOpenAccessSessions(Date.parse("2026-09-10T18:00:01.000Z"));
    expect(after[0]?.date).toBe("2026-10-11");
    expect(after.some((s) => s.date === "2026-09-10")).toBe(false);
  });

  it("does not share a calendar day with any Season 2 episode", () => {
    const season2Dates = new Set(season2EpisodeEvents().map((e) => e.date));
    expect(season2Dates.has("2026-10-10")).toBe(true);
    for (const session of NEW_MOON_SESSIONS) {
      expect(season2Dates.has(session.date), `OA ${session.date} clashes with Season 2`).toBe(false);
    }
  });

  it("moves the Oct 10 clash to Sunday Oct 11 at 11:00 PT and keeps the original UID", () => {
    expect(sundayAfterSeason2Saturday("2026-10-10")).toBe("2026-10-11");
    const oct = NEW_MOON_SESSIONS.find((s) => s.publishedDate === "2026-10-10");
    expect(oct).toBeDefined();
    expect(oct?.date).toBe("2026-10-11");
    expect(oct?.dayName).toBe("Sunday");
    expect(oct?.startUtc).toBe("20261011T180000Z");
    expect(oct?.endUtc).toBe("20261011T200000Z");
    expect(oct?.sequence).toBe(ICS_SEQUENCE_OA_RESCHEDULE);
    expect(openAccessUid(oct!.publishedDate)).toBe("open-access-2026-10-10@regencivics.earth");
    assertElevenPtTwoEt(parseCompactUtc(oct!.startUtc), "OA Oct 11");

    const google = openAccessGoogleUrl(oct!);
    expect(google).toContain("dates=20261011T180000Z/20261011T200000Z");
    expect(google).not.toContain("20261010T180000Z");

    const ics = decodeIcsDataUrl(openAccessIcsUrl(oct!));
    expect(ics).toContain("UID:open-access-2026-10-10@regencivics.earth");
    expect(ics).toContain(`SEQUENCE:${ICS_SEQUENCE_OA_RESCHEDULE}`);
    expect(ics).toContain("DTSTART:20261011T180000Z");
    expect(ics).not.toContain("DTSTART:20261010T180000Z");
    expect(ics).not.toContain("UID:open-access-2026-10-11@regencivics.earth");
  });
});

describe("Season 2 weekly episodes", () => {
  it("exports all 13 incubator episodes at 11:00 PT / 14:00 ET", () => {
    const episodes = season2EpisodeEvents();
    expect(episodes).toHaveLength(13);
    expect(episodes[0]?.title).toBe("Week 1: Selection Day");
    expect(episodes[0]?.date).toBe("2026-09-26");
    expect(episodes[0]?.time).toBe("11:00 AM");
    expect(episodes[12]?.title).toBe("Week 13: Season Overview & Project Updates");

    for (const episode of episodes) {
      const range = googleDateRange(episode.googleCalendarUrl);
      const start = parseCompactUtc(range.start);
      assertElevenPtTwoEt(start, episode.title);
      expect(episode.time).not.toMatch(/8:00/);
      expect(episode.googleCalendarUrl).not.toContain("T150000Z");
      expect(decodeIcsDataUrl(episode.appleCalendarUrl)).not.toContain("T150000Z");
    }
  });

  it("locks Week 1 Google and ICS stamps to 11:00 PDT (18:00 UTC)", () => {
    const week1 = season2EpisodeEvents()[0]!;
    expect(week1.googleCalendarUrl).toContain("dates=20260926T180000Z/20260926T200000Z");
    expect(week1.googleCalendarUrl).not.toContain("20260926T150000Z");
    expect(formatDualZoneStart(parseCompactUtc("20260926T180000Z"))).toBe("11:00 AM PDT, 2:00 PM EDT");

    const ics = decodeIcsDataUrl(week1.appleCalendarUrl);
    expect(ics).toContain("DTSTART:20260926T180000Z");
    expect(ics).toContain("DTEND:20260926T200000Z");
    expect(ics).toContain(`UID:${season2EpisodeUid(1)}`);
    expect(ics).toContain(`SEQUENCE:${ICS_SEQUENCE}`);
  });

  it("locks Week 13 (standard time) to 11:00 PST / 2:00 PM EST", () => {
    const week13 = season2EpisodeEvents()[12]!;
    expect(week13.googleCalendarUrl).toContain("dates=20261219T190000Z/20261219T210000Z");
    expect(formatDualZoneStart(parseCompactUtc("20261219T190000Z"))).toBe("11:00 AM PST, 2:00 PM EST");
    expect(decodeIcsDataUrl(week13.appleCalendarUrl)).toContain("DTSTART:20261219T190000Z");
  });

  it("matches the events-seed UTC instants so DB fallback cannot drift", () => {
    const seedIsos = [
      "2026-09-26T18:00:00.000Z",
      "2026-10-03T18:00:00.000Z",
      "2026-10-10T18:00:00.000Z",
      "2026-10-17T18:00:00.000Z",
      "2026-10-24T18:00:00.000Z",
      "2026-10-31T18:00:00.000Z",
      "2026-11-07T19:00:00.000Z",
      "2026-11-14T19:00:00.000Z",
      "2026-11-21T19:00:00.000Z",
      "2026-11-28T19:00:00.000Z",
      "2026-12-05T19:00:00.000Z",
      "2026-12-12T19:00:00.000Z",
      "2026-12-19T19:00:00.000Z",
    ];
    const dates = season2EpisodeEvents().map((e) => e.date);
    expect(dates).toHaveLength(13);
    dates.forEach((date, i) => {
      expect(sessionStartUtc(date).toISOString(), `seed week ${i + 1}`).toBe(seedIsos[i]);
    });
  });

  it("keeps the add-all series Google link on Week 1's corrected instant", () => {
    expect(SEASON_2_SERIES_GOOGLE_URL).toContain("dates=20260926T180000Z/20260926T200000Z");
    expect(SEASON_2_SERIES_GOOGLE_URL).not.toContain("20260926T150000Z");
  });
});

describe("ICS UID + SEQUENCE", () => {
  it("uses stable UIDs per Open Access date and Season 2 week", () => {
    expect(openAccessUid("2026-09-10")).toBe("open-access-2026-09-10@regencivics.earth");
    expect(season2EpisodeUid(1)).toBe("season2-week-1@regencivics.earth");
    expect(season2EpisodeUid(13)).toBe("season2-week-13@regencivics.earth");
  });

  it("keeps the UID and increments SEQUENCE when the start moves", () => {
    const uid = season2EpisodeUid(1);
    const before = buildIcsEvent({
      uid,
      summary: "Week 1: Selection Day",
      startUtc: "20260926T150000Z",
      endUtc: "20260926T170000Z",
      sequence: 0,
    });
    const afterSeq = nextIcsSequence(0, "20260926T150000Z", "20260926T180000Z");
    const after = buildIcsEvent({
      uid,
      summary: "Week 1: Selection Day",
      startUtc: "20260926T180000Z",
      endUtc: "20260926T200000Z",
      sequence: afterSeq,
    });

    expect(before).toMatch(/UID:season2-week-1@regencivics.earth/);
    expect(after).toMatch(/UID:season2-week-1@regencivics.earth/);
    expect(before).toContain("SEQUENCE:0");
    expect(after).toContain("SEQUENCE:1");
    expect(afterSeq).toBeGreaterThan(0);
    expect(nextIcsSequence(1, "20260926T180000Z", "20260926T180000Z")).toBe(1);
  });

  it("publishes SEQUENCE 1 on the live feed after the 11am PT correction", () => {
    expect(ICS_SEQUENCE).toBe(1);
    const ics = buildAllEventsIcs();
    expect(ics).toContain("SEQUENCE:1");
    expect(ics).not.toMatch(/SEQUENCE:0/);
    expect(ics).toContain("UID:open-access-2026-09-10@regencivics.earth");
    expect(ics).toContain("UID:season2-week-1@regencivics.earth");
    expect(ics).toContain("DTSTART:20260910T180000Z");
    expect(ics).toContain("DTSTART:20260926T180000Z");
    expect(ics).not.toContain("DTSTART:20260926T150000Z");
    expect(ics).not.toContain("DTSTART:20260910T170000Z");
  });

  it("keeps the Oct 10 Open Access UID and points DTSTART at Sunday", () => {
    const ics = buildAllEventsIcs();
    const vevents = ics.split("BEGIN:VEVENT").slice(1);
    const oaOct = vevents.find((v) => v.includes("UID:open-access-2026-10-10@regencivics.earth"));
    expect(oaOct).toBeDefined();
    expect(oaOct).toContain("DTSTART:20261011T180000Z");
    expect(oaOct).toContain(`SEQUENCE:${ICS_SEQUENCE_OA_RESCHEDULE}`);
    expect(oaOct).not.toContain("DTSTART:20261010T180000Z");
    expect(ics).not.toContain("UID:open-access-2026-10-11@regencivics.earth");

    const week3 = vevents.find((v) => v.includes("UID:season2-week-3@regencivics.earth"));
    expect(week3).toContain("DTSTART:20261010T180000Z");
  });

  it("keeps client/public/regen-civics-all-events.ics in lockstep with the generator", () => {
    const file = readFileSync(resolve(__dirname, "../../public/regen-civics-all-events.ics"), "utf8");
    expect(file.replace(/\r\n/g, "\n")).toBe(buildAllEventsIcs());
  });
});

describe("Subscribe feed", () => {
  it("points Subscribe at the hosted all-events ICS", () => {
    expect(CALENDAR_FEED_PATH).toBe("/regen-civics-all-events.ics");
    expect(CALENDAR_SUBSCRIBE_WEBCAL).toBe("webcal://regencivics.earth/regen-civics-all-events.ics");
  });

  it("encodes every feed event at 11:00 PT", () => {
    const ics = decodeIcsDataUrl(SEASON_2_SERIES_ICS_URL);
    const starts = [...ics.matchAll(/DTSTART:(\d{8}T\d{6}Z)/g)].map((m) => m[1]);
    expect(starts.length).toBe(13);
    for (const stamp of starts) {
      assertElevenPtTwoEt(parseCompactUtc(stamp), `series ICS ${stamp}`);
    }
  });
});
