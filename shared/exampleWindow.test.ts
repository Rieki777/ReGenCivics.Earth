import { describe, expect, it } from "vitest";
import {
  DAY_SECONDS,
  EXAMPLE_WINDOW,
  exampleClosesAt,
  exampleKeepDays,
  exampleRollBelowDays,
  exampleShiftDays,
  movedDay,
  movedStamp,
  type ExampleWindowCampaign,
} from "./exampleWindow";
import { campaignEndsAt, formatCloseDate } from "./campaignProgress";

const DAY_MS = DAY_SECONDS * 1000;

function example(startedAt: string | null, durationDays: number, over: Partial<ExampleWindowCampaign> = {}): ExampleWindowCampaign {
  return { isDemo: 1, status: "active", startedAt, publishedAt: startedAt, durationDays, ...over };
}

/** An example whose close date is `leftSeconds` after `now`. */
function exampleLeft(now: Date, durationDays: number, leftSeconds: number): ExampleWindowCampaign {
  const start = new Date(now.getTime() + leftSeconds * 1000 - durationDays * DAY_MS);
  return example(start.toISOString(), durationDays);
}

// Production's four examples, as the live site read them on 2026-09-27 (Rewild after 0263's 270 days).
const HARMONY = example("2026-06-07T13:30:07Z", 120);
const TERRA_NOVA = example("2026-06-02T13:30:13Z", 160);
const PACHAMAMA = example("2026-06-17T13:30:17Z", 180);
const REWILD = example("2026-05-18T13:30:21Z", 270);

describe("the rule's numbers", () => {
  it("keeps about 60% of the window, in whole days, rounded half up", () => {
    expect(exampleKeepDays(120)).toBe(72);
    expect(exampleKeepDays(160)).toBe(96);
    expect(exampleKeepDays(180)).toBe(108);
    expect(exampleKeepDays(270)).toBe(162);
    expect(exampleKeepDays(273)).toBe(164); // 163.8
    expect(exampleKeepDays(1)).toBe(1); // 0.6
    expect(exampleKeepDays(2)).toBe(1); // 1.2
  });

  it("rolls under 30 days left, or at 30% left for a window shorter than 100 days", () => {
    expect(EXAMPLE_WINDOW.rollBelowDays).toBe(30);
    for (const d of [100, 120, 160, 180, 270, 273]) expect(exampleRollBelowDays(d)).toBe(30);
    expect(exampleRollBelowDays(99)).toBe(30); // 29.7 rounds to 30
    expect(exampleRollBelowDays(90)).toBe(27);
    expect(exampleRollBelowDays(20)).toBe(6);
    expect(exampleRollBelowDays(5)).toBe(2); // 1.5 rounds half up, as MySQL's integer DIV form does
    expect(exampleRollBelowDays(1)).toBe(0);
  });

  it("never rolls below more days than it keeps, so a moved example is never due again", () => {
    for (let d = 1; d <= 273; d++) expect(exampleRollBelowDays(d)).toBeLessThanOrEqual(exampleKeepDays(d));
  });
});

describe("exampleShiftDays", () => {
  it("moves Harmony Valley to about 60% left, and leaves the other three alone, on 2026-09-28", () => {
    const now = new Date("2026-09-28T18:30:00Z");
    expect(formatCloseDate(campaignEndsAt(HARMONY as any)!)).toBe("5 October 2026");
    const shift = exampleShiftDays(HARMONY, now);
    expect(shift).toBe(66);
    expect(formatCloseDate(exampleClosesAt(HARMONY, shift)!)).toBe("10 December 2026");
    expect(exampleShiftDays(TERRA_NOVA, now)).toBe(0); // 9 Nov, 41 days away
    expect(exampleShiftDays(PACHAMAMA, now)).toBe(0); // 14 Dec
    expect(exampleShiftDays(REWILD, now)).toBe(0); // 12 Feb 2027
  });

  it("gives the next day at Harmony Valley's close time: before 13:30:07 UTC one day, after it the next", () => {
    expect(exampleShiftDays(HARMONY, new Date("2026-09-29T13:30:06Z"))).toBe(66);
    expect(exampleShiftDays(HARMONY, new Date("2026-09-29T13:30:07Z"))).toBe(66);
    expect(exampleShiftDays(HARMONY, new Date("2026-09-29T13:30:08Z"))).toBe(67);
  });

  it("rolls Terra Nova the first second it is under 30 days from its close", () => {
    expect(exampleShiftDays(TERRA_NOVA, new Date("2026-10-10T13:30:13Z"))).toBe(0); // exactly 30 days left
    const shift = exampleShiftDays(TERRA_NOVA, new Date("2026-10-10T13:30:14Z"));
    expect(shift).toBe(67);
    expect(formatCloseDate(exampleClosesAt(TERRA_NOVA, shift)!)).toBe("15 January 2027");
  });

  it("is 0 exactly at 30 days left and moves one second under it", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(exampleShiftDays(exampleLeft(now, 120, 30 * DAY_SECONDS), now)).toBe(0);
    expect(exampleShiftDays(exampleLeft(now, 120, 30 * DAY_SECONDS - 1), now)).toBe(43);
    expect(exampleShiftDays(exampleLeft(now, 120, 40 * DAY_SECONDS), now)).toBe(0);
  });

  it("brings a past close date back: a close 10 days gone moves to about 60% left", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const c = exampleLeft(now, 90, -10 * DAY_SECONDS);
    const shift = exampleShiftDays(c, now);
    expect(shift).toBe(54 + 10);
    expect(exampleClosesAt(c, shift)!.getTime() - now.getTime()).toBe(54 * DAY_MS);
  });

  it("uses publishedAt when startedAt is missing", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const c = exampleLeft(now, 120, 5 * DAY_SECONDS);
    expect(exampleShiftDays({ ...c, startedAt: null }, now)).toBe(67);
    expect(exampleShiftDays({ ...c, startedAt: null, publishedAt: null }, now)).toBe(0);
  });

  it("never moves a real campaign, one that isn't live, or one with no window", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const near = exampleLeft(now, 120, 3 * DAY_SECONDS);
    expect(exampleShiftDays(near, now)).toBeGreaterThan(0);
    expect(exampleShiftDays({ ...near, isDemo: 0 }, now)).toBe(0);
    expect(exampleShiftDays({ ...near, isDemo: null }, now)).toBe(0);
    expect(exampleShiftDays({ ...near, isDemo: false }, now)).toBe(0);
    for (const status of ["draft", "pending_review", "completed", "closed", "cancelled", null]) {
      expect(exampleShiftDays({ ...near, status }, now), String(status)).toBe(0);
    }
    expect(exampleShiftDays({ ...near, durationDays: 0 }, now)).toBe(0);
    expect(exampleShiftDays({ ...near, durationDays: null }, now)).toBe(0);
    expect(exampleShiftDays({ ...near, startedAt: "not a date", publishedAt: null }, now)).toBe(0);
  });

  it("a short window rolls at 30% left instead of every day", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(exampleShiftDays(exampleLeft(now, 20, 10 * DAY_SECONDS), now)).toBe(0); // 10 of 20 left
    expect(exampleShiftDays(exampleLeft(now, 20, 5 * DAY_SECONDS), now)).toBe(7); // back to 12 of 20
  });

  it("a moved example is not due again, whatever its window and however late it is found", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    for (let d = 1; d <= 273; d += 7) {
      for (const left of [-400 * DAY_SECONDS, -1, 0, 1, 3600, 5 * DAY_SECONDS + 17, 29 * DAY_SECONDS + 86399]) {
        const c = exampleLeft(now, d, left);
        const shift = exampleShiftDays(c, now);
        if (shift === 0) continue;
        const moved = { ...c, startedAt: new Date(new Date(c.startedAt as string).getTime() + shift * DAY_MS).toISOString() };
        const newLeft = (exampleClosesAt(moved)!.getTime() - now.getTime()) / 1000;
        expect(newLeft, `d=${d} left=${left}`).toBeGreaterThanOrEqual(exampleKeepDays(d) * DAY_SECONDS);
        expect(newLeft, `d=${d} left=${left}`).toBeLessThan((exampleKeepDays(d) + 1) * DAY_SECONDS);
        expect(exampleShiftDays(moved, now), `d=${d} left=${left}`).toBe(0);
      }
    }
  });

  it("reads whole seconds, as the SQL's TIMESTAMPDIFF(SECOND, ...) does", () => {
    const now = new Date("2026-10-01T12:00:00.999Z");
    const c = exampleLeft(new Date("2026-10-01T12:00:00Z"), 120, 30 * DAY_SECONDS);
    expect(exampleShiftDays(c, now)).toBe(0);
  });
});

describe("moving a date", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("moves a planned date by the whole interval, even into the future", () => {
    expect(movedStamp("2026-09-30T09:00:00Z", 66, now, false)!.toISOString()).toBe("2026-12-05T09:00:00.000Z");
  });

  it("moves a stamp of what happened, but never past now", () => {
    expect(movedStamp("2026-07-01T09:00:00Z", 66, now, true)!.toISOString()).toBe("2026-09-05T09:00:00.000Z");
    expect(movedStamp("2026-09-30T09:00:00Z", 66, now, true)!.toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("keeps the order of stamps it caps", () => {
    const a = movedStamp("2026-09-20T09:00:00Z", 66, now, true)!;
    const b = movedStamp("2026-09-25T09:00:00Z", 66, now, true)!;
    expect(a.getTime()).toBeLessThanOrEqual(b.getTime());
  });

  it("leaves a missing date missing", () => {
    expect(movedStamp(null, 66, now, true)).toBeNull();
    expect(movedDay(null, 66)).toBeNull();
  });

  it("moves a day by whole days across months, years and clock changes", () => {
    expect(movedDay("2026-09-11", 66)).toBe("2026-11-16");
    expect(movedDay("2026-10-24", 8)).toBe("2026-11-01"); // across both autumn clock changes
    expect(movedDay("2026-12-20", 43)).toBe("2027-02-01");
    expect(movedDay("2028-02-28", 1)).toBe("2028-02-29");
  });
});
