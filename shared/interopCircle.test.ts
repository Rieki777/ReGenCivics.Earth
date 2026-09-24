import { describe, expect, it } from "vitest";
import {
  INTEROP_LEAD_SETTLE_HOURS,
  buildSlot,
  circleWeekKey,
  interopSlot,
  leadingSlot,
  parseOfferedSlots,
  parseSlots,
  resolveCircleSlot,
  serializeOfferedSlots,
  serializeSlots,
  upcomingSlotStarts,
} from "./interopCircle";

describe("interop slot lists", () => {
  it("parses a single legacy slot", () => {
    expect(parseSlots("wed")).toEqual(["wed"]);
  });

  it("parses a comma list in canonical order and drops unknown keys", () => {
    // Every weekday is a valid key now that the offered set is a setting, so
    // "fri" parses; only genuine nonsense is dropped.
    expect(parseSlots("thu, tue,,")).toEqual(["tue", "thu"]);
    expect(parseSlots("thu, tue,fri,,")).toEqual(["tue", "thu", "fri"]);
    expect(parseSlots("thu,xyz,tue,123")).toEqual(["tue", "thu"]);
  });

  it("treats empty and null as no slots", () => {
    expect(parseSlots("")).toEqual([]);
    expect(parseSlots(null)).toEqual([]);
  });

  it("serializes deduplicated, ordered, and within the column width", () => {
    const stored = serializeSlots(["thu", "tue", "wed", "tue"]);
    expect(stored).toBe("tue,wed,thu");
    expect(stored.length).toBeLessThanOrEqual(24);
  });
});

describe("leadingSlot", () => {
  it("has no leader with no hands", () => {
    expect(leadingSlot({ tue: 0, wed: 0, thu: 0 })).toBeNull();
  });
  it("picks the most hands and breaks ties toward the earlier slot", () => {
    expect(leadingSlot({ tue: 1, wed: 3, thu: 2 })).toBe("wed");
    expect(leadingSlot({ tue: 2, wed: 1, thu: 2 })).toBe("tue");
  });
});

describe("resolveCircleSlot", () => {
  const now = Date.UTC(2026, 8, 23, 12);
  const hour = 3_600_000;

  it("honours the admin pin over everything", () => {
    expect(resolveCircleSlot({ pinned: "thu", leader: "tue", leaderSince: 0, applied: "wed", nowMs: now })).toBe("thu");
  });
  it("applies the first leader straight away", () => {
    expect(resolveCircleSlot({ pinned: null, leader: "wed", leaderSince: now, applied: null, nowMs: now })).toBe("wed");
  });
  it("holds the applied slot until a new leader has settled", () => {
    const base = { pinned: null, leader: "thu" as const, applied: "tue" as const, nowMs: now };
    expect(resolveCircleSlot({ ...base, leaderSince: now - (INTEROP_LEAD_SETTLE_HOURS - 1) * hour })).toBe("tue");
    expect(resolveCircleSlot({ ...base, leaderSince: now - INTEROP_LEAD_SETTLE_HOURS * hour })).toBe("thu");
  });
  it("keeps the applied slot when every hand is withdrawn", () => {
    expect(resolveCircleSlot({ pinned: null, leader: null, leaderSince: null, applied: "wed", nowMs: now })).toBe("wed");
  });
  it("defaults to the first slot with nothing to go on", () => {
    expect(resolveCircleSlot({ pinned: null, leader: null, leaderSince: null, applied: null, nowMs: now })).toBe("tue");
  });
});

describe("circle dates", () => {
  it("keys a week by its Pacific Monday", () => {
    // Tuesday 2026-09-29 10:00 PDT
    expect(circleWeekKey(new Date("2026-09-29T17:00:00Z"))).toBe("2026-09-28");
    // Sunday 2026-10-04 23:30 PDT is still the week of the 28th, though UTC says Monday.
    expect(circleWeekKey(new Date("2026-10-05T06:30:00Z"))).toBe("2026-09-28");
  });

  it("lists the next starts after now, on the right wall clock across the DST change", () => {
    const starts = upcomingSlotStarts(interopSlot("tue"), new Date("2026-10-20T18:00:00Z"), 3);
    expect(starts.map((d) => d.toISOString())).toEqual([
      "2026-10-27T17:00:00.000Z", // 10:00 PDT
      "2026-11-03T18:00:00.000Z", // 10:00 PST
      "2026-11-10T18:00:00.000Z",
    ]);
  });

  it("includes this week's session when it is still ahead", () => {
    const starts = upcomingSlotStarts(interopSlot("thu"), new Date("2026-09-23T12:00:00Z"), 1);
    expect(starts[0].toISOString()).toBe("2026-09-25T01:00:00.000Z"); // Thu 24th 18:00 PDT
  });
});

describe("offered slots are a setting, not a deploy", () => {
  it("falls back to the original three when nothing is stored", () => {
    const slots = parseOfferedSlots(null);
    expect(slots.map((s) => s.key)).toEqual(["tue", "wed", "thu"]);
    expect(slots.map((s) => s.hourPT)).toEqual([10, 16, 18]);
  });

  it("reads a stored set, including a weekday the Circle never offered before", () => {
    const slots = parseOfferedSlots('[{"key":"mon","hourPT":9},{"key":"fri","hourPT":14}]');
    expect(slots.map((s) => s.key)).toEqual(["mon", "fri"]);
    expect(slots.map((s) => s.hourPT)).toEqual([9, 14]);
  });

  it("always returns weekday order, whatever order was stored", () => {
    const slots = parseOfferedSlots('[{"key":"sat","hourPT":9},{"key":"mon","hourPT":9},{"key":"thu","hourPT":9}]');
    expect(slots.map((s) => s.key)).toEqual(["mon", "thu", "sat"]);
  });

  it("collapses a duplicated key rather than offering it twice", () => {
    const slots = parseOfferedSlots('[{"key":"tue","hourPT":9},{"key":"tue","hourPT":15}]');
    expect(slots).toHaveLength(1);
    expect(slots[0].hourPT).toBe(15);
  });

  it("falls back rather than throwing on anything unreadable", () => {
    // This feeds a public page: a bad paste into a settings field must not
    // take the vote down.
    for (const bad of ["", "   ", "not json", "{}", "[]", '[{"key":"xyz"}]', '[{"key":"tue","hourPT":99}]', "null"]) {
      const slots = parseOfferedSlots(bad);
      expect(slots.length, bad).toBeGreaterThan(0);
    }
  });

  it("derives the label and the other-zone line from the hour", () => {
    const slot = buildSlot("mon", 9);
    expect(slot.label).toBe("Mondays, 9:00am PT");
    expect(slot.weekday).toBe(1);
    // Eastern is a fixed three hours ahead; the line must agree with the hour.
    expect(slot.zones).toContain("9:00am PT");
    expect(slot.zones).toContain("12:00pm ET");
  });

  it("names midnight and noon without going to 0 or 13", () => {
    expect(buildSlot("tue", 0).label).toBe("Tuesdays, 12:00am PT");
    expect(buildSlot("tue", 12).label).toBe("Tuesdays, 12:00pm PT");
    expect(buildSlot("tue", 13).label).toBe("Tuesdays, 1:00pm PT");
  });

  it("round-trips through the stored shape", () => {
    const chosen = [{ key: "wed" as const, hourPT: 8 }, { key: "sun" as const, hourPT: 20 }];
    const slots = parseOfferedSlots(serializeOfferedSlots(chosen));
    expect(slots.map((s) => [s.key, s.hourPT])).toEqual([["wed", 8], ["sun", 20]]);
  });

  it("still labels a slot that has been taken off the offer", () => {
    // A vote cast before a day was retired still renders somewhere.
    const offered = parseOfferedSlots('[{"key":"mon","hourPT":9}]');
    expect(interopSlot("thu", offered).label).toBe("Thursdays, 6:00pm PT");
  });
});
