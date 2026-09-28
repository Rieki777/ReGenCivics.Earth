import { describe, expect, it } from "vitest";
import {
  CLOSE_LINES_MAX_ROWS,
  FINAL_STRETCH,
  MAX_WINDOW_DAYS,
  NUDGES,
  closeLinesFor,
  closeOutcome,
  finalStretchDue,
  isDueToClose,
  nudgeStepDue,
  offerHasStarted,
  otherNeedsLine,
  stillWaitingDue,
  type CloseRow,
} from "./campaignClose";
import { computeCampaignProgress, type ProgressCampaign, type ProgressItem, type ProgressRow } from "./campaignProgress";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const START = "2026-09-01T00:00:00.000Z";
// START + 90 days
const ENDS = new Date("2026-11-30T00:00:00.000Z");

const campaign = (over: Partial<ProgressCampaign & { id: number; closedAt: Date | string | null; finalStretchNoticedAt: unknown }> = {}) => ({
  id: 1,
  status: "active",
  isDemo: 0,
  financialTarget: 1000,
  currency: "USD",
  startedAt: START,
  publishedAt: START,
  durationDays: 90,
  closedAt: null,
  ...over,
});

describe("the constants", () => {
  it("hold the rulings", () => {
    expect(MAX_WINDOW_DAYS).toBe(273);
    expect(NUDGES).toEqual({ stewardFirstDays: 2, stewardSecondDays: 7, contributorNoteDays: 14, lookbackDays: 30 });
    expect(FINAL_STRETCH).toEqual({ daysBefore: 14, lastDaysBefore: 3, minLiveDays: 7, maxNeeds: 3 });
  });
});

describe("isDueToClose", () => {
  it("is due exactly at the close date and after, never before", () => {
    expect(isDueToClose(campaign(), ENDS)).toBe(true);
    expect(isDueToClose(campaign(), new Date(ENDS.getTime() + DAY))).toBe(true);
    expect(isDueToClose(campaign(), new Date(ENDS.getTime() - 1))).toBe(false);
  });
  it("never closes an example, a campaign already closed, or one that isn't live", () => {
    const later = new Date(ENDS.getTime() + DAY);
    expect(isDueToClose(campaign({ isDemo: 1 }), later)).toBe(false);
    expect(isDueToClose(campaign({ isDemo: true }), later)).toBe(false);
    expect(isDueToClose(campaign({ closedAt: "2026-11-30T00:00:00.000Z" }), later)).toBe(false);
    expect(isDueToClose(campaign({ closedAt: new Date(ENDS) }), later)).toBe(false);
    for (const status of ["draft", "pending_review", "rejected", "completed", "cancelled", "closed", "funded"]) {
      expect(isDueToClose(campaign({ status }), later), status).toBe(false);
    }
  });
  it("has no close date without a start, and reads publishedAt when startedAt is missing", () => {
    const later = new Date(ENDS.getTime() + DAY);
    expect(isDueToClose(campaign({ startedAt: null, publishedAt: null }), later)).toBe(false);
    expect(isDueToClose(campaign({ startedAt: null }), ENDS)).toBe(true);
    expect(isDueToClose(campaign({ durationDays: 0 }), later)).toBe(false);
  });
});

describe("closeOutcome", () => {
  const ROLE: ProgressItem = { id: 1, kind: "role", capacityUnit: "hours_per_week", roleTitle: "Farm hand", quantityWanted: 10, estimatedValue: 4000 };
  const filled: ProgressRow = { campaignItemId: 1, status: "accepted", contributionType: "role", offerMode: null, quantity: 10, value: 4000, financialValue: 0, count: 1 };
  const read = (over: Partial<ProgressCampaign>, rows: ProgressRow[], items: ProgressItem[] = [ROLE]) =>
    computeCampaignProgress({ campaign: campaign(over), items, rows, lends: [], routes: [] });

  it("is complete only when both halves landed", () => {
    expect(closeOutcome(read({ financialTarget: 0 }, [filled]))).toBe("complete");
    expect(read({ financialTarget: 0 }, [filled]).state).toBe("both_landed");
  });
  it("did not complete in every other state", () => {
    expect(closeOutcome(read({ financialTarget: 0 }, []))).toBe("did_not_complete"); // open
    expect(closeOutcome(read({ financialTarget: 500 }, [filled]))).toBe("did_not_complete"); // in-kind landed only
    expect(closeOutcome(read({ status: "cancelled" }, [filled]))).toBe("did_not_complete");
    expect(closeOutcome(read({ status: "draft" }, [filled]))).toBe("did_not_complete");
  });
  it("a campaign that asked for nothing at all did not complete", () => {
    const nothing = read({ financialTarget: 0 }, [], []);
    expect(nothing.state).toBe("both_landed");
    expect(closeOutcome(nothing)).toBe("did_not_complete");
  });
});

describe("offerHasStarted", () => {
  const today = "2026-10-15";
  const now = new Date("2026-10-15T12:00:00.000Z");
  const offer = (over: Partial<{ status: string; offerMode: "give" | "lend" | null; availableFrom: string | null }> = {}) => ({
    status: "accepted",
    offerMode: null as "give" | "lend" | null,
    availableFrom: null as string | null,
    ...over,
  });
  const need = (kind: string, over: Partial<{ shiftStartsAt: Date | string | null; neededFrom: string | null }> = {}) => ({
    kind,
    shiftStartsAt: null as Date | string | null,
    neededFrom: null as string | null,
    ...over,
  });

  it("delivered and thanked are started; waiting and ended offers are not", () => {
    expect(offerHasStarted(offer({ status: "fulfilled" }), need("item"), today, now)).toBe(true);
    expect(offerHasStarted(offer({ status: "thanked" }), null, today, now)).toBe(true);
    for (const status of ["pending", "rejected", "withdrawn", "released", "cancelled", "expired"]) {
      expect(offerHasStarted(offer({ status }), need("role"), today, now), status).toBe(false);
    }
  });
  it("a lend has started once its available-from day is here, or when it has none", () => {
    expect(offerHasStarted(offer({ offerMode: "lend", availableFrom: "2026-10-15" }), need("item"), today, now)).toBe(true);
    expect(offerHasStarted(offer({ offerMode: "lend", availableFrom: "2026-10-01" }), need("item"), today, now)).toBe(true);
    expect(offerHasStarted(offer({ offerMode: "lend", availableFrom: null }), need("item"), today, now)).toBe(true);
    expect(offerHasStarted(offer({ offerMode: "lend", availableFrom: "2026-10-16" }), need("item"), today, now)).toBe(false);
    // A legacy loan need reads as a lend.
    expect(offerHasStarted(offer({ availableFrom: null }), need("loan"), today, now)).toBe(true);
  });
  it("a shift has started once its start time has passed", () => {
    expect(offerHasStarted(offer(), need("shift", { shiftStartsAt: "2026-10-15T12:00:00.000Z" }), today, now)).toBe(true);
    expect(offerHasStarted(offer(), need("shift", { shiftStartsAt: new Date("2026-10-10T09:00:00.000Z") }), today, now)).toBe(true);
    expect(offerHasStarted(offer(), need("shift", { shiftStartsAt: "2026-10-15T12:00:01.000Z" }), today, now)).toBe(false);
    expect(offerHasStarted(offer(), need("shift"), today, now)).toBe(false);
  });
  it("a role has started once its start date is here, or when it has none", () => {
    expect(offerHasStarted(offer(), need("role"), today, now)).toBe(true);
    expect(offerHasStarted(offer(), need("role", { neededFrom: "2026-10-15" }), today, now)).toBe(true);
    expect(offerHasStarted(offer(), need("role", { neededFrom: "2026-11-01" }), today, now)).toBe(false);
  });
  it("a gift of a thing, a knowledge session and a freeform offer have not started", () => {
    expect(offerHasStarted(offer({ offerMode: "give" }), need("item"), today, now)).toBe(false);
    expect(offerHasStarted(offer(), need("knowledge"), today, now)).toBe(false);
    expect(offerHasStarted(offer(), null, today, now)).toBe(false);
  });
});

describe("nudgeStepDue", () => {
  const now = new Date("2026-10-20T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const offer = (waited: number, nudge1At: unknown = null, nudge2At: unknown = null) => ({ submittedAt: ago(waited), nudge1At, nudge2At });

  it("waits two whole days for the first nudge", () => {
    expect(nudgeStepDue(offer(DAY + 23 * HOUR), now)).toBeNull();
    expect(nudgeStepDue(offer(2 * DAY), now)).toBe(1);
    expect(nudgeStepDue(offer(6 * DAY), now)).toBe(1);
  });
  it("sends the second at seven days, once, and nothing after", () => {
    expect(nudgeStepDue(offer(6 * DAY, now), now)).toBeNull();
    expect(nudgeStepDue(offer(7 * DAY, now), now)).toBe(2);
    expect(nudgeStepDue(offer(8 * DAY, now), now)).toBe(2);
    expect(nudgeStepDue(offer(8 * DAY, now, now), now)).toBeNull();
    expect(nudgeStepDue(offer(20 * DAY, "2026-10-01T00:00:00Z", "2026-10-05T00:00:00Z"), now)).toBeNull();
  });
  it("gives an offer first found at day 8 one nudge, the second", () => {
    expect(nudgeStepDue(offer(8 * DAY), now)).toBe(2);
  });
  it("never reaches past the look-back", () => {
    expect(nudgeStepDue(offer(30 * DAY), now)).toBe(2);
    expect(nudgeStepDue(offer(30 * DAY + 1), now)).toBeNull();
  });
  it("reads a string submit time, and nothing for a bad one", () => {
    expect(nudgeStepDue({ submittedAt: "2026-10-18T12:00:00.000Z", nudge1At: null, nudge2At: null }, now)).toBe(1);
    expect(nudgeStepDue({ submittedAt: "not a date", nudge1At: null, nudge2At: null }, now)).toBeNull();
  });
});

describe("stillWaitingDue", () => {
  const now = new Date("2026-10-20T12:00:00.000Z");
  const row = (waitedDays: number, userId: number | null, waitNoteAt: unknown = null) => ({
    submittedAt: new Date(now.getTime() - waitedDays * DAY),
    userId,
    waitNoteAt,
  });
  it("is due at 14 days for someone with an account, once", () => {
    expect(stillWaitingDue(row(13.9, 5), now)).toBe(false);
    expect(stillWaitingDue(row(14, 5), now)).toBe(true);
    expect(stillWaitingDue(row(20, 5, now), now)).toBe(false);
  });
  it("needs an account, and stays inside the look-back", () => {
    expect(stillWaitingDue(row(20, null), now)).toBe(false);
    expect(stillWaitingDue(row(31, 5), now)).toBe(false);
  });
});

describe("finalStretchDue", () => {
  const due = (now: Date, over: Parameters<typeof campaign>[0] = {}, open = 2) => finalStretchDue(campaign(over), open, now);
  const before = (days: number) => new Date(ENDS.getTime() - days * DAY);

  it("is due between 14 and 3 days before the close date", () => {
    expect(due(before(14.01))).toBe(false);
    expect(due(before(14))).toBe(true);
    expect(due(before(8))).toBe(true);
    expect(due(before(3))).toBe(true);
    expect(due(before(2.99))).toBe(false);
  });
  it("waits until the campaign has been live a week", () => {
    // A 20-day campaign: 14 days before close is day 6.
    const short = { durationDays: 20 };
    const shortEnds = new Date(new Date(START).getTime() + 20 * DAY);
    expect(finalStretchDue(campaign(short), 2, new Date(shortEnds.getTime() - 14 * DAY))).toBe(false);
    expect(finalStretchDue(campaign(short), 2, new Date(new Date(START).getTime() + 7 * DAY))).toBe(true);
  });
  it("is not due with every need filled, once sent, on an example, or off a live campaign", () => {
    expect(due(before(8), {}, 0)).toBe(false);
    expect(due(before(8), { finalStretchNoticedAt: new Date() })).toBe(false);
    expect(due(before(8), { isDemo: 1 })).toBe(false);
    expect(due(before(8), { status: "completed" })).toBe(false);
    expect(due(before(8), { startedAt: null, publishedAt: null })).toBe(false);
  });
});

describe("closeLinesFor", () => {
  const today = "2026-11-30";
  const row = (status: string, title: string, over: Partial<CloseRow> = {}): CloseRow => ({
    status,
    title,
    offerMode: null,
    lendUntil: null,
    ...over,
  });

  it("writes one line per row in the ruled order", () => {
    const lines = closeLinesFor(
      [
        row("thanked", "Cedar posts"),
        row("accepted", "Farm hand"),
        row("accepted", "Pickup truck", { offerMode: "lend", lendUntil: "2026-12-20" }),
        row("cancelled", "Seed garlic"),
        row("released", "Water tank", { closeReleasedAt: new Date() }),
      ],
      "Harmony Valley",
      today,
    );
    // Five rows: the four with their own line come first in the ruled order, and the gift (last in the order) is counted.
    expect(lines).toEqual([
      'Your offer of "Water tank" hadn\'t started, so it\'s released with our thanks.',
      'Your offer of "Seed garlic" was still waiting, so it\'s closed with our thanks.',
      "Your Pickup truck goes home on 20 Dec, or sooner if you ask the stewards.",
      "Your place in Farm hand stays with the stewards, who will mark it delivered or release it.",
      "And 1 more offer is on your contributions page.",
    ]);
    // With four rows, the gift gets its own line, last.
    expect(
      closeLinesFor([row("thanked", "Cedar posts"), row("cancelled", "Seed garlic"), row("accepted", "Farm hand")], "Harmony Valley", today),
    ).toEqual([
      'Your offer of "Seed garlic" was still waiting, so it\'s closed with our thanks.',
      "Your place in Farm hand stays with the stewards, who will mark it delivered or release it.",
      'What you gave for "Cedar posts" stays recorded in Harmony Valley\'s token.',
    ]);
  });

  it("caps at four rows and counts the rest", () => {
    const lines = closeLinesFor(
      [
        row("cancelled", "A"),
        row("cancelled", "B"),
        row("cancelled", "C"),
        row("cancelled", "D"),
        row("fulfilled", "E"),
        row("thanked", "F"),
      ],
      "Harmony Valley",
      today,
    );
    expect(CLOSE_LINES_MAX_ROWS).toBe(4);
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe("And 2 more offers are on your contributions page.");
    const one = closeLinesFor([...["A", "B", "C", "D"].map((t) => row("cancelled", t)), row("fulfilled", "E")], "Harmony Valley", today);
    expect(one[4]).toBe("And 1 more offer is on your contributions page.");
  });

  it("says what was given stays recorded in the project's token, and decodes names", () => {
    expect(closeLinesFor([row("fulfilled", "Seeds &amp; soil")], "Hill &amp; Dale", today)).toEqual([
      'What you gave for "Seeds & soil" stays recorded in Hill & Dale\'s token.',
    ]);
  });

  it("dates a lend with its year when it isn't this year, and has a line for a lend with no date", () => {
    expect(closeLinesFor([row("accepted", "Chipper", { offerMode: "lend", lendUntil: "2027-01-05" })], "P", today)).toEqual([
      "Your Chipper goes home on 5 Jan 2027, or sooner if you ask the stewards.",
    ]);
    expect(closeLinesFor([row("accepted", "Chipper", { offerMode: "lend" })], "P", today)).toEqual([
      "Your Chipper goes home when you and the stewards agree, or sooner if you ask.",
    ]);
  });

  it("gives no line for rows the close didn't touch", () => {
    expect(
      closeLinesFor(
        [row("released", "Earlier release"), row("rejected", "No"), row("withdrawn", "Gone"), row("expired", "Old")],
        "P",
        today,
      ),
    ).toEqual([]);
  });

  it("never says earned, claim, pledge or funded", () => {
    const lines = closeLinesFor(
      [
        row("released", "A", { closeReleasedAt: "2026-11-30" }),
        row("cancelled", "B"),
        row("accepted", "C", { offerMode: "lend", lendUntil: "2026-12-01" }),
        row("accepted", "D"),
        row("thanked", "E"),
      ],
      "Harmony Valley",
      today,
    );
    for (const l of lines) expect(l).not.toMatch(/\bearn|\bclaim|\bpledg|\bfunded\b|\u2014|undefined|null/i);
  });
});

describe("otherNeedsLine", () => {
  it("names up to two other needs, or invites a follow when there are none", () => {
    expect(
      otherNeedsLine(
        [
          { verb: "Apply", title: "Grazing hand", projectName: "Terra Nova" },
          { verb: "Offer", title: "Seed &amp; bulbs", projectName: "Pachamama" },
          { verb: "Sign up", title: "Planting day", projectName: "Rewild Britain" },
        ],
        "Harmony Valley",
      ),
    ).toBe("These could use you now: Apply Grazing hand at Terra Nova; Offer Seed & bulbs at Pachamama.");
    expect(otherNeedsLine([], "Harmony Valley")).toBe("Follow Harmony Valley to hear when it asks again.");
  });
});
