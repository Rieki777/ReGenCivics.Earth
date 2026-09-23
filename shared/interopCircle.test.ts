import { describe, expect, it } from "vitest";
import {
  INTEROP_LEAD_SETTLE_HOURS,
  circleWeekKey,
  interopSlot,
  leadingSlot,
  parseSlots,
  resolveCircleSlot,
  serializeSlots,
  upcomingSlotStarts,
} from "./interopCircle";

describe("interop slot lists", () => {
  it("parses a single legacy slot", () => {
    expect(parseSlots("wed")).toEqual(["wed"]);
  });

  it("parses a comma list in canonical order and drops unknown keys", () => {
    expect(parseSlots("thu, tue,fri,,")).toEqual(["tue", "thu"]);
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
