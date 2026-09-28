/**
 * Funding engine Phase 1 shared rules: stages by track (shared/fundingStages.ts)
 * and free-text deadlines (shared/fundingDeadlines.ts). Pure.
 */
import { describe, expect, it } from "vitest";
import {
  FUNDING_TRACKS,
  STAGES_BY_TRACK,
  coarseStatusFor,
  isValidStage,
  validateStageWrite,
} from "./fundingStages";
import { parseDeadlineText, zonedToUtc } from "./fundingDeadlines";

describe("fundingStages", () => {
  it("gives every track at least one stage, each mapped to a real coarse status", () => {
    const coarse = ["not_started", "researching", "preparing", "cultivating", "submitted", "in_review", "awarded", "declined", "parked"];
    for (const track of FUNDING_TRACKS) {
      expect(STAGES_BY_TRACK[track].length).toBeGreaterThan(0);
      for (const s of STAGES_BY_TRACK[track]) expect(coarse).toContain(s.status);
    }
  });

  it("keeps stages track-specific", () => {
    expect(isValidStage("grant", "loi")).toBe(true);
    expect(isValidStage("accelerator", "loi")).toBe(false);
    expect(isValidStage("accelerator", "interview")).toBe(true);
    expect(isValidStage("investor", "diligence")).toBe(true);
  });

  it("derives the coarse funnel from the stage", () => {
    expect(coarseStatusFor("accelerator", "drafting")).toBe("preparing");
    expect(coarseStatusFor("accelerator", "interview")).toBe("in_review");
    expect(coarseStatusFor("grant", "reporting")).toBe("awarded");
    expect(coarseStatusFor("investor", "passed")).toBe("declined");
    expect(coarseStatusFor("grant", "interview")).toBeNull();
  });

  it("refuses a stage without a track, or one the track does not have", () => {
    expect(validateStageWrite(null, "drafting")).toMatchObject({ ok: false });
    expect(validateStageWrite("public_goods", "drafting")).toMatchObject({ ok: false });
    expect(validateStageWrite("public_goods", "voting")).toEqual({ ok: true });
    expect(validateStageWrite("grant", null)).toEqual({ ok: true });
  });
});

describe("zonedToUtc", () => {
  it("handles Pacific daylight and standard time", () => {
    expect(zonedToUtc("America/Los_Angeles", 2026, 10, 2).toISOString()).toBe("2026-10-02T07:00:00.000Z");
    expect(zonedToUtc("America/Los_Angeles", 2026, 11, 18, 23, 59).toISOString()).toBe("2026-11-19T07:59:00.000Z");
    expect(zonedToUtc("America/New_York", 2026, 11, 2, 20, 0).toISOString()).toBe("2026-11-03T01:00:00.000Z");
  });
});

describe("parseDeadlineText", () => {
  it("reads exact dates, a date with no time as the start of the day Pacific", () => {
    const d = parseDeadlineText("Batch 37 Deadline: October 2, 2026");
    expect(d.kind).toBe("date");
    expect(d.hasTime).toBe(false);
    expect(d.at?.toISOString()).toBe("2026-10-02T07:00:00.000Z");
    expect(parseDeadlineText("Aug 24, 2026 (confirmed)").at?.toISOString()).toBe("2026-08-24T07:00:00.000Z");
    expect(parseDeadlineText("Jul 27, 2026 / next batch").kind).toBe("date");
  });

  it("reads a stated time and zone", () => {
    const t = parseDeadlineText("Nov 18 2026 Final Deadline. Applications close at 11:59pm PST on the listed date.");
    expect(t.kind).toBe("date");
    expect(t.hasTime).toBe(true);
    expect(t.at?.toISOString()).toBe("2026-11-19T07:59:00.000Z");
    expect(parseDeadlineText("2026-11-02T20:00:00-08:00").at?.toISOString()).toBe("2026-11-03T04:00:00.000Z");
    expect(parseDeadlineText("Dec 1, 2026 at 5 p.m. ET").at?.toISOString()).toBe("2026-12-01T22:00:00.000Z");
  });

  it("never writes an approximate date", () => {
    for (const text of ["Target Mar 1, 2027", "Unverified (3rd-party says ~Aug 1)", "Opens ~late Jul 2026"]) {
      const p = parseDeadlineText(text);
      expect(p.kind, text).toBe("approximate");
      expect(p.at, text).toBeNull();
    }
  });

  it("classifies the research pass's non-dates so the report can say why", () => {
    expect(parseDeadlineText("Rolling").kind).toBe("rolling");
    expect(parseDeadlineText("Round-based").kind).toBe("rolling");
    expect(parseDeadlineText("Epoch-based").kind).toBe("rolling");
    expect(parseDeadlineText("Cultivate (top target)").kind).toBe("relationship");
    expect(parseDeadlineText("Warm intro").kind).toBe("relationship");
    expect(parseDeadlineText("Watch (late 2026)").kind).toBe("watch");
    expect(parseDeadlineText("Verify").kind).toBe("watch");
    expect(parseDeadlineText("2027 cycle").kind).toBe("year_only");
    expect(parseDeadlineText("n/a").kind).toBe("none");
    expect(parseDeadlineText(null).kind).toBe("none");
    expect(parseDeadlineText("The Regular Deadline is October 4th at 11:59PM PST.").kind).toBe("unparsed");
    expect(parseDeadlineText("Feb 30, 2027").kind).toBe("unparsed");
  });
});
