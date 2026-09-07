/**
 * The calendar feeds, tested against the bugs that were live on 2026-09-07.
 *
 * Each block here corresponds to something a real subscriber was holding: an
 * episode with no way to find the livestream, a tokenized studio URL, a feed
 * that no client would treat as updated, and a file that violated RFC 5545 in
 * four ways at once.
 */
import { describe, it, expect } from "vitest";
import {
  catalogFallbackRows,
  eventDescription,
  eventLocation,
  eventSequence,
  eventUid,
  isPublicSession,
  renderFeed,
  renderSingleEvent,
  roomUrl,
  selectForFeed,
  toIcsEvent,
  type FeedRow,
} from "./lib/calendarFeed";
import { escapeIcsText, foldIcsLine } from "@shared/ical";
import { JOIN_URL, RIVERSIDE_ROOM_URL, SEEDS_YOUTUBE_URL } from "@shared/sessionLinks";
import { SEASON2_CURRICULUM, episodeTitle } from "@shared/season2Curriculum";

const NOW = new Date("2026-09-07T12:00:00Z");

/** Undo RFC 5545 line folding, the way every real client does before parsing. */
function unfold(ics: string): string {
  return ics.split("\r\n ").join("");
}

function row(over: Partial<FeedRow> = {}): FeedRow {
  return {
    id: 3,
    title: "Week 1: Selection Day",
    description: "An overview of everything we are doing this season.",
    type: "episode",
    season: "Season 2",
    episodeNumber: 1,
    startTime: new Date("2026-09-26T18:00:00Z"),
    endTime: new Date("2026-09-26T20:00:00Z"),
    status: "upcoming",
    riversideRoomUrl: RIVERSIDE_ROOM_URL,
    youtubeUrl: null,
    updatedAt: new Date("2026-09-07T10:00:00Z"),
    ...over,
  };
}

const openRow = (over: Partial<FeedRow> = {}) =>
  row({
    id: 20,
    title: "ReGen Civics Open Access Session",
    type: "open",
    season: "Open",
    episodeNumber: null,
    startTime: new Date("2026-09-10T18:00:00Z"),
    endTime: new Date("2026-09-10T20:00:00Z"),
    ...over,
  });

describe("UIDs the existing subscribers already hold", () => {
  it("keeps season2-week-N so an update is not a duplicate", () => {
    expect(eventUid(row({ episodeNumber: 1 }))).toBe("season2-week-1@regencivics.earth");
    expect(eventUid(row({ episodeNumber: 13 }))).toBe("season2-week-13@regencivics.earth");
  });

  it("keys Open Access off the published new moon, not the date it runs", () => {
    // October's new moon is Saturday the 10th, which clashes with Week 3, so the
    // session runs Sunday the 11th. Subscribers hold the 10th. Emitting an
    // 11th UID would give all of them a second event instead of a move.
    const moved = openRow({ startTime: new Date("2026-10-11T18:00:00Z") });
    expect(eventUid(moved)).toBe("open-access-2026-10-10@regencivics.earth");
    expect(eventUid(openRow())).toBe("open-access-2026-09-10@regencivics.earth");
  });
});

describe("SEQUENCE", () => {
  it("advances with the row, and clears the 1 and 2 already published", () => {
    const early = eventSequence(new Date("2026-09-07T10:00:00Z"));
    const later = eventSequence(new Date("2026-09-07T10:05:00Z"));
    expect(later).toBeGreaterThan(early);
    // The static feed shipped SEQUENCE 1, and 2 for the rescheduled October
    // session. A client ignores an update that does not advance the number.
    expect(early).toBeGreaterThan(2);
  });
});

describe("Links in the invite", () => {
  it("gives every Season 2 episode the YouTube link", () => {
    // The old buildAllEventsIcs assembled episode descriptions by hand instead
    // of going through the shared helper, so all thirteen shipped without it.
    // Anyone subscribed had no way to find the livestream.
    // Unfold first: a 75-octet fold lands mid-URL, which is correct per spec
    // (clients unfold before parsing) but would make a naive substring check
    // pass or fail on line-length luck rather than on content.
    const ics = unfold(renderFeed(catalogFallbackRows(NOW), "all"));
    const events = ics.split("BEGIN:VEVENT").slice(1);
    expect(events).toHaveLength(25);
    for (const ev of events) {
      expect(ev).toContain("SEEDSRegenerativeEconomies");
    }
  });

  it("never puts the tokenized studio URL in an invite", () => {
    const ics = unfold(renderFeed([row(), openRow()], "all"));
    expect(ics).not.toContain("t=243a36b4d9fdbc785c4b");
    expect(ics).toContain(JOIN_URL);
    expect(roomUrl(row())).toBe(JOIN_URL);
    expect(roomUrl(row({ riversideRoomUrl: null }))).toBe(JOIN_URL);
  });

  it("passes a genuinely different per-event room straight through", () => {
    const custom = "https://riverside.com/studio/somewhere-else";
    expect(roomUrl(row({ riversideRoomUrl: custom }))).toBe(custom);
  });

  it("leads with the room for open sessions and the livestream for cohort weeks", () => {
    expect(isPublicSession(openRow())).toBe(true);
    expect(isPublicSession(row({ episodeNumber: 1 }))).toBe(true); // Selection Day
    expect(isPublicSession(row({ episodeNumber: 5 }))).toBe(false);

    expect(eventLocation(openRow())).toBe(JOIN_URL);
    // A cohort working session must not hand its room to every public
    // subscriber as the event's location.
    expect(eventLocation(row({ episodeNumber: 5 }))).toBe(SEEDS_YOUTUBE_URL);

    const cohort = eventDescription(row({ episodeNumber: 5 }));
    expect(cohort.indexOf("YouTube")).toBeLessThan(cohort.indexOf("Cohort room"));
  });
});

describe("Which sessions are in which feed", () => {
  it("puts Selection Day in the open feed and keeps the other twelve out", () => {
    const rows = catalogFallbackRows(NOW);
    const open = selectForFeed(rows, "open-access");
    const titles = open.map((r) => r.title);
    expect(titles).toContain(episodeTitle(SEASON2_CURRICULUM[0]!));
    expect(titles).not.toContain(episodeTitle(SEASON2_CURRICULUM[4]!));
    expect(open.filter((r) => r.type === "open").length).toBeGreaterThan(0);
  });

  it("gives the Season 2 feed all thirteen weeks", () => {
    expect(selectForFeed(catalogFallbackRows(NOW), "season2")).toHaveLength(13);
  });
});

describe("Cancellations", () => {
  it("keeps a cancelled session in the feed carrying STATUS:CANCELLED", () => {
    // Dropping the row would leave it on every subscriber's calendar forever:
    // a feed going quiet about a UID is not a cancellation.
    const ics = unfold(renderSingleEvent(row({ status: "cancelled" })));
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("UID:season2-week-1@regencivics.earth");
    expect(toIcsEvent(row()).status).toBe("CONFIRMED");
  });
});

describe("RFC 5545", () => {
  const ics = renderFeed(catalogFallbackRows(NOW), "all");

  it("ends every line with CRLF", () => {
    // The static file it replaces had 0 CRLF and 256 bare LF.
    const bareLf = ics.split("\n").length - 1;
    const crlf = ics.split("\r\n").length - 1;
    expect(crlf).toBe(bareLf);
    expect(crlf).toBeGreaterThan(0);
  });

  it("folds every content line to 75 octets", () => {
    // The static file had 25 unfolded DESCRIPTION lines, the longest 307 octets.
    const overlong = ics
      .split("\r\n")
      .filter((l) => Buffer.byteLength(l, "utf8") > 75 && !l.startsWith(" "));
    expect(overlong).toEqual([]);
  });

  it("never splits a multi-byte character across a fold", () => {
    const folded = foldIcsLine("DESCRIPTION:" + "é".repeat(120));
    for (const part of folded.split("\r\n")) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(76);
    }
    expect(folded.replace(/\r\n /g, "")).toBe("DESCRIPTION:" + "é".repeat(120));
  });

  it("escapes in spec order, backslash first", () => {
    expect(escapeIcsText("a,b;c")).toBe("a\\,b\\;c");
    expect(escapeIcsText("line\nbreak")).toBe("line\\nbreak");
    // A literal backslash must not turn its neighbour into an escape.
    expect(escapeIcsText("back\\slash")).toBe("back\\\\slash");
  });

  it("carries the calendar-level properties the old file was missing", () => {
    expect(ics).toContain("CALSCALE:GREGORIAN");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
    expect(ics).toContain("X-PUBLISHED-TTL:PT1H");
    expect(unfold(ics)).toContain("X-WR-CALNAME:ReGen Civics: All Sessions");
  });

  it("gives every event a URL back to its page", () => {
    // 0 of 25 events in the old file had one.
    expect(unfold(ics)).toContain("URL:https://regencivics.earth/schedule");
  });

  it("keeps every DTSTART in UTC so no VTIMEZONE is needed", () => {
    const starts = [...ics.matchAll(/DTSTART:(\S+)/g)].map((m) => m[1]);
    expect(starts).toHaveLength(25);
    for (const s of starts) expect(s).toMatch(/^\d{8}T\d{6}Z$/);
    expect(ics).not.toContain("BEGIN:VTIMEZONE");
  });
});

describe("Curriculum", () => {
  it("renders the canonical titles, not the ones the feed used to carry", () => {
    const ics = unfold(renderFeed(catalogFallbackRows(NOW), "season2"));
    expect(ics).toContain("Week 6: Growing Your Village");
    expect(ics).toContain("Week 7: The ReGen Civics Ecosystem & the Fund");
    expect(ics).toContain("Week 13: Crowd Pooling & Resourcing Our Projects");
    // The three variants that were live at once.
    expect(ics).not.toContain("Intro to the ReGen Civics DHO");
    expect(ics).not.toContain("Community Building");
    expect(ics).not.toContain("Season Overview & Project Updates");
    expect(ics).not.toContain("Demo Day");
  });

  it("schedules all thirteen weeks at 11:00 Pacific", () => {
    for (const r of selectForFeed(catalogFallbackRows(NOW), "season2")) {
      const hour = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        hourCycle: "h23",
      }).format(r.startTime);
      expect(Number(hour), r.title).toBe(11);
    }
  });
});
