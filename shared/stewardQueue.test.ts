import { describe, expect, it } from "vitest";
import {
  buildStewardQueue,
  contributorStatusLabel,
  groupOffersByNeed,
  offerTabForStatus,
  hoursDialogNumbers,
  stewardActionDescription,
  CLOSED_STATUSES,
  REOPEN_NOTICE_IF_OPENED,
  REOPEN_NOTICE_ON_RAISE,
  PUBLIC_NAME_LINE,
  ANONYMOUS_NAME_LINE,
  stewardBarLabel,
  readyTickedCount,
  stewardWaitingTotal,
  READINESS_STATUSES,
  STEWARD_BAR_FALLBACK,
  type QueueItem,
} from "./stewardQueue";
import { CROWDPOOL_READINESS } from "./crowdpoolReadiness";

// Bundle 1, section 16.3 (A5-03): the steward bar's pill read "0 waiting on
// you" for about 2.4 seconds on a phone before the real count arrived.
describe("stewardBarLabel", () => {
  it("says Checking... until the count is known, never 0", () => {
    expect(stewardBarLabel(null)).toBe("Checking...");
  });
  it("says the count once it is known, 0 included", () => {
    expect(stewardBarLabel(0)).toBe("0 waiting on you");
    expect(stewardBarLabel(5)).toBe("5 waiting on you");
  });
  it("names the steward tools when the offers could not be read, instead of checking forever", () => {
    expect(stewardBarLabel(null, { failed: true })).toBe(STEWARD_BAR_FALLBACK);
    expect(STEWARD_BAR_FALLBACK).toBe("Steward tools");
  });
});

// The pill and the "Waiting on you" card it jumps to count the same rows: a
// campaign in review with unticked items used to read "0 waiting on you"
// above a card listing the ticks row.
describe("the pill counts the Ready to crowdpool row", () => {
  const keys = (n: number) => CROWDPOOL_READINESS.slice(0, n).map((item) => ({ itemKey: item.key }));

  it("counts ticks only while the list is open, and only known keys", () => {
    expect(READINESS_STATUSES).toEqual(["draft", "pending_review", "rejected"]);
    expect(readyTickedCount("pending_review", keys(3))).toBe(3);
    expect(readyTickedCount("draft", [...keys(2), { itemKey: "not-an-item" }])).toBe(2);
    expect(readyTickedCount("active", keys(3))).toBeNull();
    expect(readyTickedCount("pending_review", undefined)).toBeNull();
  });

  it("adds one while items are unticked, none once all are or when unknown", () => {
    expect(stewardWaitingTotal({ total: 0 }, 3)).toBe(1);
    expect(stewardWaitingTotal({ total: 2 }, 0)).toBe(3);
    expect(stewardWaitingTotal({ total: 0 }, CROWDPOOL_READINESS.length)).toBe(0);
    expect(stewardWaitingTotal({ total: 4 }, null)).toBe(4);
  });
});

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

  it("asks a campaign sent back under the old Reject to be sent for review again", () => {
    const q = buildStewardQueue({ contributions: [], items: [], campaignStatus: "rejected" });
    expect(q.sendForReview).toBe(true);
    expect(q.total).toBe(1);
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
  it("reads Returned once a loan is back with its owner, whatever the status", () => {
    expect(contributorStatusLabel("accepted", null, "2026-09-20T10:00:00Z")).toBe("Returned");
    expect(contributorStatusLabel("fulfilled", null, new Date("2026-09-20T10:00:00Z"))).toBe("Returned");
    expect(contributorStatusLabel("thanked", 0, null)).toBe("Thanked");
    expect(contributorStatusLabel("accepted", 10, undefined)).toBe("Accepted for 10 hours a week");
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

describe("the reopen lines (ruling 2026-09-27: people you didn't pick hear too)", () => {
  it("say both groups hear, in the words the dialogs show", () => {
    expect(REOPEN_NOTICE_IF_OPENED).toBe(
      "If this opens the role again, people with an account who are waiting on it or weren't picked hear that it has opened up. Anyone without an account won't hear, so let them know yourself.",
    );
    expect(REOPEN_NOTICE_ON_RAISE).toBe(
      "People with an account who are waiting on this role or weren't picked hear that it has opened up. Anyone without an account won't hear, so let them know yourself.",
    );
  });
  it("say only account holders hear, since the notice rides the spine (review 2026-09-28)", () => {
    for (const line of [REOPEN_NOTICE_IF_OPENED, REOPEN_NOTICE_ON_RAISE]) {
      expect(line.toLowerCase()).toContain("people with an account");
      expect(line).toContain("Anyone without an account won't hear, so let them know yourself.");
    }
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
        + "If this opens the role again, people with an account who are waiting on it or weren't picked hear that it has opened up. Anyone without an account won't hear, so let them know yourself.",
    );
    expect(stewardActionDescription({ action: "hours", hoursNeed: true, hasAccount: false, name: "Rosa", roleTitle: "Farm Manager", roleFilled: true }))
      .toContain("people with an account who are waiting on it or weren't picked hear that it has opened up");
    // A role that is not filled cannot reopen, so the line stays as it was.
    expect(stewardActionDescription({ action: "release", hoursNeed: true, hasAccount: true, name: "Kai", heldHours: 30, roleFilled: false }))
      .not.toContain("waiting");
    expect(stewardActionDescription({ action: "hours", hoursNeed: true, hasAccount: true, name: "Rosa", roleTitle: "Farm Manager" }))
      .not.toContain("waiting");
    // Count-based needs send no reopened notice.
    expect(stewardActionDescription({ action: "release", hoursNeed: false, hasAccount: true, name: "Kai", roleFilled: true }))
      .not.toContain("waiting");
  });
  it("says what a returned loan records, and that nothing else changes", () => {
    expect(stewardActionDescription({ action: "returned", hoursNeed: false, hasAccount: true, name: "Kai", title: "Wood chipper" }))
      .toBe("This records that Wood chipper is back with Kai. Nothing else changes.");
    expect(stewardActionDescription({ action: "returned", hoursNeed: false, hasAccount: false, name: "Kai" }))
      .toBe("This records that it is back with Kai. Nothing else changes.");
  });
  it("words delivery as a record: confirmed value already decided what counts", () => {
    expect(stewardActionDescription({ action: "deliver", hoursNeed: true, hasAccount: false, name: "Rosa" }))
      .toBe("This marks that Rosa has served the hours they committed to.");
    expect(stewardActionDescription({ action: "deliver", hoursNeed: false, hasAccount: false, name: "Rosa" }))
      .toBe("Confirm this contribution arrived.");
    expect(stewardActionDescription({ action: "deliver", hoursNeed: false, hasAccount: true, name: "Rosa" }))
      .toBe("Confirm this contribution arrived. It grows on their Living Tree too.");
    for (const hoursNeed of [true, false]) {
      expect(stewardActionDescription({ action: "deliver", hoursNeed, hasAccount: true, name: "Rosa" })).not.toMatch(/counts/);
    }
  });
  it("keeps the release and thanks branches", () => {
    expect(stewardActionDescription({ action: "release", hoursNeed: true, hasAccount: false, name: "Kai", heldHours: 30 }))
      .toBe("This frees the 30 hours a week Kai holds, so someone else can take them. Kai has no account here yet, so let them know yourself.");
    expect(stewardActionDescription({ action: "thanks", hoursNeed: false, hasAccount: false, name: "Kai" })).toContain("share it with them yourself");
  });

  // P8: before a yes, the steward reads what it makes public. A named offer's
  // name shows on the campaign's public timeline; an anonymous one shows as
  // "A contributor" there (campaigns.getActivity).
  describe("the accept line says what a yes makes public", () => {
    it("a count need, named", () => {
      expect(stewardActionDescription({ action: "accept", hoursNeed: false, hasAccount: true, name: "Rosa" }))
        .toBe("This holds their place on the need. Once you accept, Rosa's name shows on this campaign's public timeline.");
    });
    it("a count need, anonymous", () => {
      expect(stewardActionDescription({ action: "accept", hoursNeed: false, hasAccount: false, name: "Rosa", isAnonymous: true }))
        .toBe('This holds their place on the need. They asked to stay anonymous, so the public timeline shows "A contributor".');
    });
    it("an hours need, named", () => {
      expect(stewardActionDescription({ action: "accept", hoursNeed: true, hasAccount: true, name: "Kai", roleTitle: "Farm Manager" }))
        .toBe("Accept Kai for a share of Farm Manager. Once you accept, Kai's name shows on this campaign's public timeline.");
    });
    it("an hours need, anonymous", () => {
      expect(stewardActionDescription({ action: "accept", hoursNeed: true, hasAccount: true, name: "Kai", roleTitle: "Farm Manager", isAnonymous: true }))
        .toBe('Accept Kai for a share of Farm Manager. They asked to stay anonymous, so the public timeline shows "A contributor".');
    });
    it("uses the exported lines, so the dialog and the tests share one wording", () => {
      expect(PUBLIC_NAME_LINE("Kai")).toBe("Once you accept, Kai's name shows on this campaign's public timeline.");
      expect(ANONYMOUS_NAME_LINE).toBe('They asked to stay anonymous, so the public timeline shows "A contributor".');
    });
  });
});
