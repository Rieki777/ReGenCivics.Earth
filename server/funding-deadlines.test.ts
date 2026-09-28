/**
 * Funding deadline pings (funding engine Phase 2): which window a deadline is
 * in, which pings are due, the message, and the runner's hook. Pure; the
 * database half is in server/funding-deadlines.integration.test.ts.
 */
import { describe, expect, it } from "vitest";
import { currentThreshold, pingKey, pingMessage, planPings, type DeadlineRow } from "./funding/deadlines";
import { automationDue, FUNDING_DEADLINES_TYPE } from "./routes/adminAutomations";
import { lintProse } from "../shared/g5Rules.mjs";

const DAY = 86_400_000;
const NOW = new Date("2026-09-28T16:00:00.000Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

describe("currentThreshold", () => {
  it("returns the tightest window a deadline is in", () => {
    expect(currentThreshold(at(22), NOW)).toBeNull();
    expect(currentThreshold(at(21), NOW)).toBe(21);
    expect(currentThreshold(at(8), NOW)).toBe(21);
    expect(currentThreshold(at(7), NOW)).toBe(7);
    expect(currentThreshold(at(2.5), NOW)).toBe(7);
    expect(currentThreshold(at(2), NOW)).toBe(2);
    expect(currentThreshold(at(0.1), NOW)).toBe(2);
    expect(currentThreshold(at(0), NOW)).toBeNull();
    expect(currentThreshold(at(-1), NOW)).toBeNull();
  });
});

describe("planPings", () => {
  const row = (over: Partial<DeadlineRow>): DeadlineRow => ({ id: 1, name: "PearX", cycle: "W27", appStatus: "preparing", deadlineAt: at(6), ...over });

  it("pings each open row once for its current window, soonest first", () => {
    const plan = planPings([row({ id: 1, deadlineAt: at(6) }), row({ id: 2, name: "500 Global", cycle: "Batch 37", deadlineAt: at(1.5) }), row({ id: 3, deadlineAt: at(30) })], new Set(), NOW);
    expect(plan.map((p) => [p.pipelineId, p.threshold])).toEqual([
      [2, 2],
      [1, 7],
    ]);
  });

  it("skips a ping already sent and sends the next window when it opens", () => {
    const r = row({ id: 1, deadlineAt: at(6) });
    const sent = new Set([pingKey(1, r.deadlineAt, 7)]);
    expect(planPings([r], sent, NOW)).toEqual([]);
    // Four days later the 2-day window opens: a new key, a new ping.
    const later = new Date(NOW.getTime() + 4.5 * DAY);
    expect(planPings([r], sent, later).map((p) => p.threshold)).toEqual([2]);
  });

  it("starts over when the deadline moves", () => {
    const moved = row({ id: 1, deadlineAt: at(5) });
    const sent = new Set([pingKey(1, at(6), 7)]);
    expect(planPings([moved], sent, NOW).map((p) => p.threshold)).toEqual([7]);
  });

  it("never pings a row that is submitted, in review, decided or parked", () => {
    for (const appStatus of ["submitted", "in_review", "awarded", "declined", "parked"]) {
      expect(planPings([row({ appStatus })], new Set(), NOW), appStatus).toEqual([]);
    }
  });
});

describe("pingMessage", () => {
  it("names each program, its Pacific deadline and what is left in its packet", () => {
    const pings = planPings(
      [
        { id: 2, name: "500 Global", cycle: "Batch 37", appStatus: "preparing", deadlineAt: new Date("2026-10-02T07:00:00.000Z") },
        { id: 1, name: "PearX", cycle: "W27", appStatus: "preparing", deadlineAt: new Date("2026-10-05T06:59:00.000Z") },
      ],
      new Set(),
      NOW,
    );
    const packets = new Map([[2, { questions: 66, required: 48, answered: 41, requiredMissing: 7, overLimit: 2, withErrors: 3, withWarnings: 9 }]]);
    const text = pingMessage(pings, packets, NOW);
    expect(text).toContain("4 days: 500 Global Batch 37, due Fri, Oct 2, 12:00 AM PT.");
    expect(text).toContain("Packet: 41 of 66 answered, 7 required still empty, 3 to fix.");
    expect(text).toContain("7 days: PearX W27, due Sun, Oct 4, 11:59 PM PT.");
    expect(text).toContain("Submitting stays with you.");
    expect(lintProse(text)).toEqual([]);
    expect(text).not.toMatch(/[–—]/);
  });
});

describe("automation hook", () => {
  it("is due on every tick, whatever its cadence or last run", () => {
    expect(automationDue(FUNDING_DEADLINES_TYPE, "hourly", new Date(NOW.getTime() - 60_000), NOW)).toBe(true);
    expect(automationDue(FUNDING_DEADLINES_TYPE, "daily", NOW, NOW)).toBe(true);
    expect(automationDue("briefing_digest", "daily", NOW, NOW)).toBe(false);
  });
});
