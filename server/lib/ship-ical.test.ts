import { describe, expect, it } from "vitest";
import {
  addDays,
  blockUid,
  buildBlocksFromWeeks,
  buildShipCalendar,
  escapeIcalText,
  foldLine,
  ymdCompact,
  type IcalBlock,
} from "./ship-ical";
import type { VoyageWeek } from "./ship-logic";

/**
 * Outbound iCal feed tests (Phase 1, Outdoorsy sync).
 *
 * The feed is what stops a channel selling a week we have already given away,
 * so the cases that matter most are the ones where it must fail CLOSED: an
 * empty grid, the partially-elapsed current week, and everything past the
 * horizon. A feed that wrongly opens a date is a double booking; a feed that
 * wrongly closes one is an email.
 */

const NOW = new Date("2026-08-01T15:23:45.000Z");

/** Minimal VoyageWeek fixture; only the fields the block builder reads matter. */
function week(startDate: string, state: VoyageWeek["state"], migration = false): VoyageWeek {
  return {
    startDate,
    returnDate: addDays(startDate, 7),
    endDate: addDays(startDate, 7),
    isYear2: false,
    state,
    bioregion: "Rogue & Southern Cascadia",
    migration,
    selectable: state === "open" || state === "requested",
    priceMultiplier: 1,
    price: {
      nights: 7,
      multiplier: 1,
      anchorTotal: 4200,
      rentalTotal: 1050,
      offeringTotal: 1050,
      total: 2100,
    },
    windowLabel: null,
  };
}

describe("date helpers", () => {
  it("adds days across a month boundary in UTC", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-08-03", 7)).toBe("2026-08-10");
  });

  it("survives a DST transition without shifting the day", () => {
    // US DST ends 2026-11-01. A naive local-time implementation lands on 11-01.
    expect(addDays("2026-10-26", 7)).toBe("2026-11-02");
  });

  it("compacts to the iCal DATE form", () => {
    expect(ymdCompact("2026-08-03")).toBe("20260803");
  });
});

describe("buildBlocksFromWeeks", () => {
  it("fails closed when the grid is empty", () => {
    const blocks = buildBlocksFromWeeks({ weeks: [], today: "2026-08-01" });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("unavailable");
    expect(blocks[0].startDate).toBe("2026-08-01");
    // Years, not days: an empty grid must not quietly reopen next month.
    expect(blocks[0].endDate > "2029-01-01").toBe(true);
  });

  it("blocks from today to the first bookable Monday", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-08-03", "open")],
      today: "2026-08-01",
    });
    const lead = blocks[0];
    expect(lead.startDate).toBe("2026-08-01");
    expect(lead.endDate).toBe("2026-08-03");
    expect(lead.summary).toContain("in progress");
  });

  it("emits nothing for open weeks", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-08-03", "open"), week("2026-08-10", "open")],
      today: "2026-08-03",
    });
    // Only the trailing bookend; no lead block because today is the first Monday.
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startDate).toBe("2026-08-17");
  });

  it("merges contiguous booked weeks into one block", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [
        week("2026-08-03", "booked"),
        week("2026-08-10", "booked"),
        week("2026-08-17", "open"),
      ],
      today: "2026-08-03",
    });
    const booked = blocks.filter((b) => b.summary.includes("sailing"));
    expect(booked).toHaveLength(1);
    expect(booked[0].startDate).toBe("2026-08-03");
    expect(booked[0].endDate).toBe("2026-08-17");
  });

  it("does not merge across a different reason", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-08-03", "booked"), week("2026-08-10", "migration", true)],
      today: "2026-08-03",
    });
    expect(blocks.filter((b) => b.summary.includes("sailing"))).toHaveLength(1);
    expect(blocks.filter((b) => b.summary.includes("on passage"))).toHaveLength(1);
  });

  it("blocks migration passages even with no blackout row", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-09-21", "migration", true)],
      today: "2026-09-21",
    });
    const passage = blocks.find((b) => b.summary.includes("on passage"));
    expect(passage).toBeDefined();
    expect(passage!.kind).toBe("unavailable");
  });

  it("sends requested weeks as soft holds, not hard blocks", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-08-03", "requested")],
      today: "2026-08-03",
    });
    const hold = blocks.find((b) => b.kind === "hold");
    expect(hold).toBeDefined();
    expect(hold!.summary).toContain("held");
  });

  it("closes everything past the horizon", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-08-03", "open")],
      today: "2026-08-03",
    });
    const tail = blocks[blocks.length - 1];
    expect(tail.startDate).toBe("2026-08-10");
    expect(tail.endDate > "2029-01-01").toBe(true);
  });

  it("tolerates an unsorted grid", () => {
    const blocks = buildBlocksFromWeeks({
      weeks: [week("2026-08-10", "booked"), week("2026-08-03", "booked")],
      today: "2026-08-03",
    });
    const booked = blocks.filter((b) => b.summary.includes("sailing"));
    expect(booked).toHaveLength(1);
    expect(booked[0].startDate).toBe("2026-08-03");
  });
});

describe("escapeIcalText", () => {
  it("escapes backslash before the characters that use it", () => {
    expect(escapeIcalText("a\\b;c,d")).toBe("a\\\\b\\;c\\,d");
  });

  it("turns newlines into the literal \\n sequence", () => {
    expect(escapeIcalText("one\ntwo")).toBe("one\\ntwo");
    expect(escapeIcalText("one\r\ntwo")).toBe("one\\ntwo");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds at 75 octets with CRLF and a leading space", () => {
    const folded = foldLine("SUMMARY:" + "x".repeat(200));
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(Buffer.from(parts[0], "utf8").length).toBeLessThanOrEqual(75);
    for (const p of parts.slice(1)) expect(p.startsWith(" ")).toBe(true);
    // Unfolding must recover the original exactly.
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(
      "SUMMARY:" + "x".repeat(200),
    );
  });

  it("never splits a multi-byte character", () => {
    const folded = foldLine("SUMMARY:" + "é".repeat(80));
    for (const part of folded.split("\r\n")) {
      expect(part.includes("�")).toBe(false);
    }
    const unfolded = folded
      .split("\r\n")
      .map((p, i) => (i === 0 ? p : p.slice(1)))
      .join("");
    expect(unfolded).toBe("SUMMARY:" + "é".repeat(80));
  });
});

describe("blockUid", () => {
  it("is stable for the same range", () => {
    const b: IcalBlock = {
      startDate: "2026-08-03",
      endDate: "2026-08-10",
      kind: "unavailable",
      summary: "x",
    };
    expect(blockUid(b)).toBe(blockUid({ ...b, summary: "different" }));
    expect(blockUid(b)).toContain("@regencivics.earth");
  });

  it("differs between a hold and a hard block on the same range", () => {
    const base = { startDate: "2026-08-03", endDate: "2026-08-10", summary: "x" };
    expect(blockUid({ ...base, kind: "hold" })).not.toBe(
      blockUid({ ...base, kind: "unavailable" }),
    );
  });
});

describe("buildShipCalendar", () => {
  const blocks: IcalBlock[] = [
    {
      startDate: "2026-08-03",
      endDate: "2026-08-10",
      kind: "unavailable",
      summary: "ReGen Ship — sailing",
    },
    {
      startDate: "2026-08-17",
      endDate: "2026-08-24",
      kind: "hold",
      summary: "ReGen Ship — held (awaiting the covenant)",
    },
  ];

  it("uses CRLF throughout and terminates with one", () => {
    const ics = buildShipCalendar({ blocks, now: NOW });
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("opens and closes the calendar exactly once", () => {
    const ics = buildShipCalendar({ blocks, now: NOW });
    expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(ics.match(/END:VCALENDAR/g)).toHaveLength(1);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2);
  });

  it("writes DTEND exclusive, matching our half-open ranges", () => {
    const ics = buildShipCalendar({ blocks, now: NOW });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260803");
    expect(ics).toContain("DTEND;VALUE=DATE:20260810");
  });

  it("marks holds TENTATIVE and blocks CONFIRMED", () => {
    const ics = buildShipCalendar({ blocks, now: NOW });
    expect(ics.match(/STATUS:CONFIRMED/g)).toHaveLength(1);
    expect(ics.match(/STATUS:TENTATIVE/g)).toHaveLength(1);
  });

  it("stamps every event with the same DTSTAMP", () => {
    const ics = buildShipCalendar({ blocks, now: NOW });
    expect(ics.match(/DTSTAMP:20260801T152345Z/g)).toHaveLength(2);
  });

  it("leaks no guest data", () => {
    const ics = buildShipCalendar({ blocks, now: NOW });
    expect(ics).not.toMatch(/@(?!regencivics\.earth)/); // no stray email addresses
    expect(ics).not.toContain("ATTENDEE");
    expect(ics).not.toContain("ORGANIZER");
    expect(ics).not.toContain("DESCRIPTION");
  });
});
