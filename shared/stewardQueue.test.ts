import { describe, expect, it } from "vitest";
import {
  buildStewardQueue,
  contributorStatusLabel,
  groupOffersByNeed,
  offerTabForStatus,
  hoursDialogNumbers,
  stewardActionDescription,
  CLOSED_STATUSES,
  type QueueItem,
} from "./stewardQueue";

const role = (over: Partial<QueueItem> = {}): QueueItem => ({
  id: 1,
  kind: "role",
  capacityUnit: "hours_per_week",
  quantityWanted: 40,
  quantityClaimed: 0,
  quantityDelivered: 0,
  estimatedValue: 8000,
  ...over,
});

const tool = (over: Partial<QueueItem> = {}): QueueItem => ({
  id: 2,
  kind: "item",
  capacityUnit: "count",
  quantityWanted: 2,
  quantityClaimed: 2,
  quantityDelivered: 0,
  estimatedValue: 500,
  ...over,
});

const c = (id: number, status: string, campaignItemId: number | null = 1) => ({ id, status, campaignItemId, quantityPledged: 10 });

describe("offerTabForStatus", () => {
  it("puts each status in its tab", () => {
    expect(offerTabForStatus("pending")).toBe("waiting");
    expect(offerTabForStatus("accepted")).toBe("accepted");
    expect(offerTabForStatus("fulfilled")).toBe("delivered");
    expect(offerTabForStatus("thanked")).toBe("thanked");
  });
  it("closes rejected, expired, released, cancelled and withdrawn", () => {
    for (const s of CLOSED_STATUSES) expect(offerTabForStatus(s)).toBe("closed");
    expect(offerTabForStatus("something-new")).toBe("closed");
  });
});

describe("buildStewardQueue", () => {
  it("counts offers to answer, deliveries and thanks", () => {
    const q = buildStewardQueue({
      contributions: [c(1, "pending"), c(2, "pending"), c(3, "accepted"), c(4, "fulfilled"), c(5, "thanked"), c(6, "rejected")],
      items: [role()],
      campaignStatus: "active",
    });
    expect(q.toAnswer).toEqual([1, 2]);
    expect(q.toDeliver).toEqual([3]);
    expect(q.toThank).toEqual([4]);
    expect(q.sendForReview).toBe(false);
    expect(q.total).toBe(4);
  });

  it("asks a draft to be sent for review and counts it once", () => {
    const q = buildStewardQueue({ contributions: [], items: [], campaignStatus: "draft" });
    expect(q.sendForReview).toBe(true);
    expect(q.total).toBe(1);
    expect(buildStewardQueue({ contributions: [], items: [], campaignStatus: "pending_review" }).sendForReview).toBe(false);
  });

  it("flags pending offers on an hours role that reads filled", () => {
    const q = buildStewardQueue({
      contributions: [c(1, "pending", 1), c(2, "pending", 2), c(3, "pending", null)],
      items: [role({ quantityClaimed: 40 }), tool()],
      campaignStatus: "active",
    });
    expect(q.pendingOnFilledRoles).toEqual([1]);
    // They are still offers to answer, counted once.
    expect(q.total).toBe(3);
  });

  it("does not flag an open role, or a count need that is fully claimed", () => {
    const q = buildStewardQueue({
      contributions: [c(1, "pending", 1), c(2, "pending", 2)],
      items: [role({ quantityClaimed: 39 }), tool({ quantityClaimed: 2 })],
      campaignStatus: "active",
    });
    expect(q.pendingOnFilledRoles).toEqual([]);
  });

  it("treats a legacy role still on count as a count need", () => {
    const q = buildStewardQueue({
      contributions: [c(1, "pending", 1)],
      items: [role({ capacityUnit: "count", quantityWanted: 1, quantityClaimed: 1 })],
      campaignStatus: "active",
    });
    expect(q.pendingOnFilledRoles).toEqual([]);
  });
});

describe("groupOffersByNeed", () => {
  it("groups by need in the needs' order, with other offers last", () => {
    const groups = groupOffersByNeed(
      [c(1, "pending", 2), c(2, "accepted", 1), c(3, "released", 1), c(4, "pending", null), c(5, "pending", 99)],
      [role(), tool(), { ...tool(), id: 3 }],
    );
    expect(groups.map((g) => g.key)).toEqual(["need-1", "need-2", "other"]);
    expect(groups[0].byTab.accepted.map((x) => x.id)).toEqual([2]);
    expect(groups[0].byTab.closed.map((x) => x.id)).toEqual([3]);
    expect(groups[0].total).toBe(2);
    expect(groups[1].byTab.waiting.map((x) => x.id)).toEqual([1]);
    // A freeform offer and one on a need that no longer exists land in Other.
    expect(groups[2].item).toBeNull();
    expect(groups[2].byTab.waiting.map((x) => x.id)).toEqual([4, 5]);
  });

  it("leaves out needs with no offers and returns nothing for no offers", () => {
    expect(groupOffersByNeed([], [role(), tool()])).toEqual([]);
  });
});

describe("contributorStatusLabel", () => {
  it("speaks plainly", () => {
    expect(contributorStatusLabel("pending")).toBe("Waiting on the stewards");
    expect(contributorStatusLabel("accepted")).toBe("Accepted");
    expect(contributorStatusLabel("accepted", 10)).toBe("Accepted for 10 hours a week");
    expect(contributorStatusLabel("fulfilled")).toBe("Delivered");
    expect(contributorStatusLabel("thanked")).toBe("Thanked");
    expect(contributorStatusLabel("released")).toBe("Released");
    expect(contributorStatusLabel("cancelled")).toBe("Closed");
    expect(contributorStatusLabel("rejected")).toBe("Closed");
    expect(contributorStatusLabel("expired")).toBe("Closed");
  });
});

describe("hoursDialogNumbers", () => {
  it("counts every accepted hour against a new offer", () => {
    const n = hoursDialogNumbers(role({ quantityClaimed: 10 }), { status: "pending", quantityPledged: 50 });
    expect(n).toEqual({ needed: 40, standingExcludingThis: 10, maxHours: 30, openNow: 30 });
  });
  it("leaves out the person's own hours when changing them", () => {
    const n = hoursDialogNumbers(role({ quantityWanted: 120, quantityClaimed: 40 }), { status: "accepted", quantityPledged: 10 });
    expect(n).toEqual({ needed: 120, standingExcludingThis: 30, maxHours: 90, openNow: 80 });
  });
  it("never goes below zero on an over-filled legacy row", () => {
    const n = hoursDialogNumbers(role({ quantityClaimed: 50 }), { status: "pending", quantityPledged: 5 });
    expect(n.maxHours).toBe(0);
    expect(n.openNow).toBe(0);
  });
});

describe("stewardActionDescription", () => {
  it("tells the steward to reach someone without an account when their hours change", () => {
    expect(stewardActionDescription({ action: "hours", hoursNeed: true, hasAccount: false, name: "Rosa", roleTitle: "Farm Manager" }))
      .toBe("Set how many hours a week Rosa holds on Farm Manager. Rosa has no account here yet, so let them know yourself.");
    expect(stewardActionDescription({ action: "hours", hoursNeed: true, hasAccount: true, name: "Rosa", roleTitle: "Farm Manager" }))
      .toContain("They hear about it in their notifications.");
  });
  it("says who else hears when a release or lower hours can open a filled role", () => {
    const release = stewardActionDescription({ action: "release", hoursNeed: true, hasAccount: true, name: "Kai", heldHours: 30, roleFilled: true });
    expect(release).toBe(
      "This frees the 30 hours a week Kai holds, so someone else can take them. Kai hears about it in their notifications. "
        + "If this opens the role, people still waiting on it hear that it has opened up.",
    );
    expect(stewardActionDescription({ action: "hours", hoursNeed: true, hasAccount: false, name: "Rosa", roleTitle: "Farm Manager", roleFilled: true }))
      .toContain("people still waiting on it hear that it has opened up");
    // A role that is not filled cannot reopen, so the line stays as it was.
    expect(stewardActionDescription({ action: "release", hoursNeed: true, hasAccount: true, name: "Kai", heldHours: 30, roleFilled: false }))
      .not.toContain("waiting");
    expect(stewardActionDescription({ action: "hours", hoursNeed: true, hasAccount: true, name: "Rosa", roleTitle: "Farm Manager" }))
      .not.toContain("waiting");
    // Count-based needs send no reopened notice.
    expect(stewardActionDescription({ action: "release", hoursNeed: false, hasAccount: true, name: "Kai", roleFilled: true }))
      .not.toContain("waiting");
  });
  it("keeps the release and thanks branches", () => {
    expect(stewardActionDescription({ action: "release", hoursNeed: true, hasAccount: false, name: "Kai", heldHours: 30 }))
      .toBe("This frees the 30 hours a week Kai holds, so someone else can take them. Kai has no account here yet, so let them know yourself.");
    expect(stewardActionDescription({ action: "thanks", hoursNeed: false, hasAccount: false, name: "Kai" })).toContain("share it with them yourself");
  });
});
