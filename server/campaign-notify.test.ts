/**
 * Campaign notices: every row of the event catalogue (spec 6.2), built by the
 * pure builders in server/lib/campaign-notify.ts. No database (notifyRoleReopened
 * reads a fake one).
 */
import { describe, expect, it, vi } from "vitest";

// notifyRoleReopened reads the role's offers through getDb. A fake database
// hands it rows, so the flag's effect is read without a real one.
const fakeDb = vi.hoisted(() => ({ rows: [] as Array<{ userId: number; status: string }> }));
vi.mock("./db", async (orig) => ({
  ...(await orig<typeof import("./db")>()),
  getDb: vi.fn(async () => ({
    select: () => ({ from: () => ({ where: async () => fakeDb.rows }) }),
  })),
}));

import {
  buildCampaignApproved,
  buildContributorReply,
  buildCampaignCancelled,
  buildCampaignClosed,
  buildCampaignCompleted,
  buildCampaignOpened,
  buildFinalStretch,
  buildOfferClosedAtCompletion,
  buildStewardNudge,
  buildStillWaiting,
  buildCampaignDeclined,
  buildChainConfirmed,
  buildClaimExpired,
  buildDelivered,
  buildHoursChanged,
  buildProposalAccepted,
  buildProposalDeclined,
  buildProposalReceived,
  buildReleased,
  buildRoleFilled,
  buildRoleReopened,
  buildThanked,
  buildUpdatePosted,
  deliver,
  notifyRoleReopened,
  recipientsOf,
  ROLE_REOPENED_REACHES_DECLINED,
  waitedAgo,
} from "./lib/campaign-notify";
import { toNotificationRow } from "./lib/forum-notify";
import { ARRIVAL } from "../shared/crowdpoolCopy";

const campaign = { id: 7, title: "Plant 400 trees", projectName: "Seeds &amp; Soil", applicationId: 42, userId: 1 };
const noAppCampaign = { id: 9, title: "Build the barn", projectName: "Harmony Valley", applicationId: null, userId: 1 };
// Every notice opens the project page focused on its campaign (?campaign=).
const P = "/project/42-seeds-soil?campaign=7";

const roleItem = { id: 50, kind: "role", capacityUnit: "hours_per_week", quantityWanted: 40, roleTitle: "Soil scientist" };
const countItem = { id: 51, kind: "item", capacityUnit: "count", quantityWanted: 3, equipmentName: "Chainsaw" };
const contribution = {
  id: 300, campaignId: 7, userId: 20, title: "Soil testing", contributorName: "Ada",
  quantityPledged: 10, hoursPerWeek: 12, roleTitle: null, campaignItemId: 50,
};

describe("recipientsOf", () => {
  it("dedupes, drops non-positive ids and excludes the actor", () => {
    expect(recipientsOf([3, 3, null, 0, -1, 4, 5], [5])).toEqual([3, 4]);
  });
});

describe("offer received", () => {
  it("goes to every steward except the actor and the contributor", () => {
    const rows = buildProposalReceived({ campaign, contribution, item: roleItem, stewardIds: [1, 2, 20, 2] });
    expect(rows.map((r) => r.userId)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({
      type: "new_contribution",
      title: "New offer for Plant 400 trees",
      body: 'Ada offered "Soil testing" for 12 hours a week.',
      link: `${P}#review`,
      campaignId: 7,
      contributionId: 300,
      dedupeKey: "cp:new:300:u1",
    });
  });
  it("says Someone and leaves hours out on a count need", () => {
    const rows = buildProposalReceived({
      campaign, contribution: { ...contribution, userId: null, contributorName: "" }, item: countItem, stewardIds: [1],
    });
    expect(rows[0].body).toBe('Someone offered "Soil testing".');
  });
});

describe("offer accepted and declined", () => {
  it("accepted on an hours need names the hours and role, plus the note", () => {
    const [row] = buildProposalAccepted({ campaign, contribution, item: roleItem, note: "See you Monday", actorId: 1 });
    expect(row).toMatchObject({
      userId: 20,
      type: "contribution_accepted",
      title: "Seeds & Soil accepted your offer",
      body: "You're in for 10 hours a week as Soil scientist. Note from the stewards: See you Monday",
      link: `${P}#your-contributions`,
      dedupeKey: "cp:contrib:300:accepted",
    });
  });
  it("accepted on a count need quotes the offer", () => {
    const [row] = buildProposalAccepted({ campaign, contribution, item: countItem });
    expect(row.body).toBe('"Soil testing" is accepted.');
  });
  it("says the stewards left an arrival note when one resolves at accept time (section 11.4)", () => {
    const [withNote] = buildProposalAccepted({ campaign, contribution, item: countItem, hasArrivalNote: true });
    expect(withNote.body).toBe(`"Soil testing" is accepted. ${ARRIVAL.noticeLine}`);
    const [withSteward] = buildProposalAccepted({ campaign, contribution, item: countItem, note: "Bring gloves", hasArrivalNote: true });
    expect(withSteward.body).toBe(`"Soil testing" is accepted. Note from the stewards: Bring gloves ${ARRIVAL.noticeLine}`);
    const [without] = buildProposalAccepted({ campaign, contribution, item: countItem, hasArrivalNote: false });
    expect(without.body).toBe('"Soil testing" is accepted.');
  });
  it("nobody to tell when the contributor has no account or is the actor", () => {
    expect(buildProposalAccepted({ campaign, contribution: { ...contribution, userId: null } })).toEqual([]);
    expect(buildProposalAccepted({ campaign, contribution, actorId: 20 })).toEqual([]);
  });
  it("declined points to other campaigns", () => {
    const [row] = buildProposalDeclined({ campaign, contribution, note: "Full up" });
    expect(row).toMatchObject({
      type: "contribution_rejected",
      title: "An update on your offer to Seeds & Soil",
      body: 'The stewards can\'t take "Soil testing" right now. Note from the stewards: Full up Other campaigns could use this offer, have a look.',
      dedupeKey: "cp:contrib:300:rejected",
    });
  });
});

describe("role filled", () => {
  it("thanks holders and tells stewards the role is closed, once each, never the actor", () => {
    const rows = buildRoleFilled({
      campaign, item: roleItem, holderIds: [20, 21, 1], stewardIds: [1, 2], triggerContributionId: 300, actorId: 2,
    });
    expect(rows.map((r) => r.userId).sort()).toEqual([1, 20, 21]);
    const holder = rows.find((r) => r.userId === 20)!;
    expect(holder).toMatchObject({
      type: "role_filled",
      title: "Soil scientist is filled",
      body: "Seeds & Soil now has all 40 hours a week this role asked for. Thank you for being part of it.",
      link: `${P}#needs`,
      dedupeKey: "cp:rolefilled:50:300:u20",
    });
    expect(rows.find((r) => r.userId === 1)!.body).toBe(
      "Every hour this role needs is accepted. New offers for it are closed until you release someone or raise the hours.",
    );
  });
});

describe("role reopened", () => {
  const at = new Date("2026-09-24T10:00:00Z");
  const live = { ...campaign, status: "active" };
  it("tells people still waiting and people not taken, once each, with the open hours", () => {
    const rows = buildRoleReopened({
      campaign: live, item: roleItem, openHours: 30, waitingIds: [21, 22, 21], notSelectedIds: [23, 22],
      reopenedAt: at, actorId: 2,
    });
    expect(rows.map((r) => r.userId)).toEqual([21, 22, 23]);
    expect(rows[0]).toMatchObject({
      type: "role_reopened",
      title: "A role you offered to has opened up",
      body: "Soil scientist at Seeds & Soil has 30 hours a week open again. Your offer is still with the stewards.",
      link: `${P}#needs`,
      campaignId: 7,
      actorId: 2,
      dedupeKey: `cp:rolereopened:50:o30:${at.getTime()}:u21`,
    });
    // Someone with a waiting offer and a declined one hears the waiting copy only.
    expect(rows.find((r) => r.userId === 22)!.body).toContain("Your offer is still with the stewards.");
    expect(rows.find((r) => r.userId === 23)!.body).toBe(
      "Soil scientist at Seeds & Soil has 30 hours a week open again. If you'd still like to give your time, you're welcome to offer again.",
    );
  });
  it("never the actor, never the person released or anyone excluded", () => {
    const rows = buildRoleReopened({
      campaign: live, item: roleItem, openHours: 10, waitingIds: [2, 20, 21], notSelectedIds: [24],
      excludeIds: [20, 24, null], reopenedAt: at, actorId: 2,
    });
    expect(rows.map((r) => r.userId)).toEqual([21]);
  });
  it("says 1 hour a week in the singular", () => {
    const [row] = buildRoleReopened({ campaign: live, item: roleItem, openHours: 1, waitingIds: [21], notSelectedIds: [], reopenedAt: at });
    expect(row.body).toContain("has 1 hour a week open again.");
  });
  it("sends nothing with no open hours or on a campaign that isn't live", () => {
    const base = { item: roleItem, waitingIds: [21], notSelectedIds: [23], reopenedAt: at };
    expect(buildRoleReopened({ ...base, campaign: live, openHours: 0 })).toEqual([]);
    for (const status of ["draft", "pending_review", "rejected", "cancelled", "completed", "funded", "closed", "paused"]) {
      expect(buildRoleReopened({ ...base, campaign: { ...campaign, status }, openHours: 10 }), status).toEqual([]);
    }
  });
  it("the same reopening keys the same; a later reopening is a new notice", () => {
    const args = { campaign: live, item: roleItem, openHours: 30, waitingIds: [21], notSelectedIds: [], reopenedAt: at };
    expect(buildRoleReopened(args)[0].dedupeKey).toBe(buildRoleReopened(args)[0].dedupeKey);
    const later = buildRoleReopened({ ...args, reopenedAt: new Date(at.getTime() + 1) });
    expect(later[0].dedupeKey).not.toBe(buildRoleReopened(args)[0].dedupeKey);
    expect(buildRoleReopened(args)[0].dedupeKey.length).toBeLessThanOrEqual(191);
  });
});

describe("role reopened reaches the people a steward declined (ruling 2026-09-27)", () => {
  const at = new Date("2026-09-27T10:00:00Z");
  const live = { ...campaign, status: "active" };

  it("the flag is on", () => {
    expect(ROLE_REOPENED_REACHES_DECLINED).toBe(true);
  });

  it("declined people hear with the offer-again copy; never the actor, holders or excluded ids", async () => {
    fakeDb.rows = [
      { userId: 21, status: "pending" },
      { userId: 23, status: "rejected" },
      { userId: 22, status: "rejected" },
      { userId: 22, status: "pending" },
      // A holder who was once declined is in, and hears nothing.
      { userId: 30, status: "accepted" },
      { userId: 30, status: "rejected" },
      // The steward who acted, and the person just released.
      { userId: 2, status: "rejected" },
      { userId: 25, status: "rejected" },
    ];
    const insert = vi.fn().mockResolvedValue(true);
    const sent = await notifyRoleReopened(
      { campaign: live, item: roleItem, openHours: 20, excludeUserIds: [25], actorId: 2, at },
      { insert },
    );
    const rows = insert.mock.calls.map((c) => c[0]);
    expect(sent).toBe(3);
    expect(rows.map((r) => r.userId)).toEqual([21, 22, 23]);
    expect(rows.find((r) => r.userId === 22)!.body).toContain("Your offer is still with the stewards.");
    expect(rows.find((r) => r.userId === 23)!.body).toBe(
      "Soil scientist at Seeds & Soil has 20 hours a week open again. If you'd still like to give your time, you're welcome to offer again.",
    );
    for (const r of rows) expect(r.dedupeKey).toBe(`cp:rolereopened:50:o20:${at.getTime()}:u${r.userId}`);
  });

  it("only on a live campaign", async () => {
    fakeDb.rows = [{ userId: 23, status: "rejected" }];
    for (const status of ["cancelled", "completed", "closed"]) {
      const insert = vi.fn().mockResolvedValue(true);
      expect(await notifyRoleReopened({ campaign: { ...campaign, status }, item: roleItem, openHours: 10, at }, { insert }), status).toBe(0);
      expect(insert).not.toHaveBeenCalled();
    }
  });
});

describe("hours changed, released, delivered, thanked", () => {
  it("hours changed", () => {
    const at = new Date("2026-09-24T10:00:00Z");
    const [row] = buildHoursChanged({ campaign, contribution, item: roleItem, hours: 8, at });
    expect(row).toMatchObject({
      type: "contribution_accepted",
      title: "Your hours for Soil scientist changed",
      body: "The stewards of Seeds & Soil set your place at 8 hours a week.",
      dedupeKey: `cp:contrib:300:hours:8:${Math.floor(at.getTime() / 60000)}`,
    });
  });
  it("released", () => {
    const [row] = buildReleased({ campaign, contribution, item: roleItem, note: "Thanks anyway" });
    expect(row).toMatchObject({
      type: "contribution_released",
      title: "Your place in Soil scientist is freed up",
      body: "The stewards of Seeds & Soil released your place. Note from the stewards: Thanks anyway",
      dedupeKey: "cp:contrib:300:released",
    });
  });
  it("delivered", () => {
    const [row] = buildDelivered({ campaign, contribution });
    expect(row).toMatchObject({
      type: "contribution_delivered",
      title: "Seeds & Soil marked your contribution delivered",
      body: '"Soil testing" is delivered. Seeds & Soil records it in its own token. Thank you for showing up for this land.',
      dedupeKey: "cp:contrib:300:delivered",
    });
  });
  it("thanked carries the note, excerpted to 500", () => {
    const [row] = buildThanked({ campaign, contribution, note: "x".repeat(900) });
    expect(row.type).toBe("contribution_thanked");
    expect(row.title).toBe("A thank-you from Seeds & Soil");
    expect(Array.from(row.body!).length).toBeLessThanOrEqual(500);
    expect(row.dedupeKey).toBe("cp:contrib:300:thanked");
  });
});

describe("update posted", () => {
  it("goes to followers minus the author", () => {
    const rows = buildUpdatePosted({
      campaign, update: { id: 11, updateNumber: 3, title: "First &amp; frost" }, followerIds: [1, 5, 6, 5], authorId: 1,
    });
    expect(rows.map((r) => r.userId)).toEqual([5, 6]);
    expect(rows[0]).toMatchObject({
      type: "campaign_update",
      title: "Update #3 from Plant 400 trees",
      body: "First & frost",
      link: `${P}#updates`,
      dedupeKey: "cp:update:11:u5",
    });
  });
});

describe("review outcomes", () => {
  const reviewedAt = new Date("2026-09-24T12:00:00Z");
  it("approved carries the review notes, one row per steward with its own key", () => {
    const rows = buildCampaignApproved({ campaign, stewardIds: [1, 2], reviewNotes: "Lovely", reviewedAt, actorId: 99 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: "campaign_approved",
      title: "Plant 400 trees is live",
      body: "Your campaign passed review and is open for offers. Notes from the review: Lovely",
      link: `${P}#steward-tools`,
      dedupeKey: `cp:status:7:active:${reviewedAt.getTime()}:u1`,
    });
    expect(new Set(rows.map((r) => r.dedupeKey)).size).toBe(2);
  });
  it("declined falls back to the default copy", () => {
    const [row] = buildCampaignDeclined({ campaign, stewardIds: [1], reviewedAt });
    expect(row).toMatchObject({
      type: "campaign_declined",
      title: "Review notes on Plant 400 trees",
      body: "The review team sent this campaign back. Reach out to the team through the Connect page at regencivics.earth/connect for next steps.",
      dedupeKey: `cp:status:7:rejected:${reviewedAt.getTime()}:u1`,
    });
    expect(buildCampaignDeclined({ campaign, stewardIds: [1], reviewedAt, reviewNotes: "Add photos" })[0].body).toBe("Add photos");
  });
  it("completed thanks stewards and contributors once each", () => {
    const rows = buildCampaignCompleted({ campaign, stewardIds: [1, 2], contributorIds: [2, 20], actorId: 99 });
    expect(rows.map((r) => r.userId)).toEqual([1, 2, 20]);
    expect(rows[0]).toMatchObject({
      type: "campaign_completed",
      title: "Plant 400 trees is complete",
      body: "Thank you to everyone who brought this one home.",
      link: P,
      dedupeKey: "cp:status:7:completed:u1",
    });
  });
});

describe("cancelled", () => {
  it("names up to three campaigns, dedupes recipients and skips the actor", () => {
    const rows = buildCampaignCancelled({
      campaign,
      recipientIds: [1, 2, 20, 20, 21],
      message: "We lost the lease.",
      suggestions: [{ title: "A" }, { title: "B" }, { title: "C" }, { title: "D" }],
      actorId: 1,
    });
    expect(rows.map((r) => r.userId)).toEqual([2, 20, 21]);
    expect(rows[0]).toMatchObject({
      type: "campaign_cancelled",
      title: "Plant 400 trees has been cancelled",
      body: "We lost the lease. These campaigns could use your energy: A, B, C.",
      link: `${P}#cancelled`,
      dedupeKey: "cp:cancel:7:u2",
    });
  });
  it("points to the gallery when nothing is live", () => {
    const [row] = buildCampaignCancelled({ campaign: noAppCampaign, recipientIds: [5], suggestions: [] });
    expect(row.body).toBe("Browse live campaigns at regencivics.earth/campaigns.");
    expect(row.link).toBe("/project/c9-harmony-valley?campaign=9#cancelled");
  });
});

describe("sweep and chain notices", () => {
  it("claim expired tells the contributor and every steward", () => {
    const rows = buildClaimExpired({ campaign, contribution, stewardIds: [1, 2] });
    expect(rows.map((r) => [r.userId, r.dedupeKey])).toEqual([
      [20, "cp:claimexp:300:contributor"],
      [1, "cp:claimexp:300:u1"],
      [2, "cp:claimexp:300:u2"],
    ]);
    // The enum value and the dedupe keys stay; the words say place, never claim.
    expect(rows[0]).toMatchObject({
      type: "claim_expired",
      title: "Your place closed",
      body: 'Your place for "Soil testing" on Plant 400 trees passed its delivery window, so the need is open again. You can offer again any time.',
      link: `${P}#your-contributions`,
    });
    expect(rows[1]).toMatchObject({
      type: "claim_expired",
      title: "A place closed",
      body: 'The place for "Soil testing" on Plant 400 trees passed its delivery window, so it is open again.',
      link: `${P}#review`,
    });
    for (const r of rows) expect(`${r.title} ${r.body}`).not.toMatch(/\bclaim/i);
  });
  it("claim expired on a campaign that ended never says the need is open again", () => {
    // Review 2026-09-28: the nightly sweep ignores campaign status, and a
    // completed or closed campaign takes no offers.
    for (const status of ["completed", "closed", "cancelled"]) {
      const rows = buildClaimExpired({ campaign: { ...campaign, status }, contribution, stewardIds: [1] });
      expect(rows[0].body).toBe('Your place for "Soil testing" on Plant 400 trees passed its delivery window, so it\'s closed with our thanks.');
      expect(rows[1].body).toBe('The place for "Soil testing" on Plant 400 trees passed its delivery window, so it\'s closed.');
      for (const r of rows) expect(r.body).not.toMatch(/open again|offer again/);
    }
    // Live, the old words stay.
    const live = buildClaimExpired({ campaign: { ...campaign, status: "active" }, contribution, stewardIds: [1] });
    expect(live[0].body).toContain("so the need is open again");
  });
  it("chain confirmed", () => {
    const rows = buildChainConfirmed({ campaign, contribution, stewardIds: [1, 20], txLink: "https://basescan.org/tx/0xabc" });
    expect(rows.map((r) => r.userId)).toEqual([20, 1]);
    expect(rows[0]).toMatchObject({
      type: "campaign_milestone",
      title: "Your contribution is confirmed on chain",
      dedupeKey: "cp:chain:300:u20",
    });
    expect(rows[0].body).toContain("View on Basescan: https://basescan.org/tx/0xabc");
    expect(rows[1].dedupeKey).toBe("cp:chain:300:u1");
  });
});

describe("delivery", () => {
  it("clamps a long title to the column and keeps going when one insert throws", async () => {
    const long = { ...campaign, title: "🌱".repeat(400) };
    const rows = buildCampaignCompleted({ campaign: long, stewardIds: [1, 2], contributorIds: [] });
    expect(Array.from(toNotificationRow(rows[0]).title).length).toBe(255);

    const insert = vi.fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue(true);
    const sent = await deliver(rows, { insert });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(sent).toBe(1);
  });
  it("carries campaignId and contributionId onto the row", () => {
    const [row] = buildDelivered({ campaign, contribution });
    expect(toNotificationRow(row)).toMatchObject({ campaignId: 7, contributionId: 300 });
  });
});

// ─── Build spec 2026-09-27: nudges, the opening, the final stretch, the close ─

const waiting = { id: 410, title: "Seed &amp; tools", userId: 20, contributorName: "Ada", isAnonymous: 0 };
type Notice = { title: string; body?: string | null };
const noticeText = (rows: Notice[]) => rows.map((r) => `${r.title} ${r.body ?? ""}`).join("\n");
/** Words no campaign notice uses (scripts/check-banned-terms.mjs holds the full list). */
function expectOurWords(rows: Notice[]) {
  const text = noticeText(rows);
  expect(text).not.toMatch(/\b(claim|claims|claimed|pledge|pledged|funded|donation|earmark|unlock)\b/i);
  expect(text).not.toContain(String.fromCharCode(0x2014));
  expect(text).not.toMatch(/\bearn(ed|s)?\b/i);
}

describe("steward nudges (offer_waiting)", () => {
  it("step 1 at 2 days goes to every steward, never the contributor, with its own key", () => {
    const rows = buildStewardNudge({ campaign, contribution: waiting, stewardIds: [1, 2, 20, 2], step: 1 });
    expect(rows.map((r) => r.userId)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({
      type: "offer_waiting",
      title: "Ada's offer is waiting on you",
      body: 'Ada offered "Seed & tools" to Plant 400 trees 2 days ago. A yes, a no or a question keeps it moving.',
      link: `${P}#review`,
      contributionId: 410,
      campaignId: 7,
      dedupeKey: "cp:nudge:410:s1:u1",
    });
    expect(rows[1].dedupeKey).toBe("cp:nudge:410:s1:u2");
    expectOurWords(rows);
  });
  it("step 2 at a week", () => {
    const [row] = buildStewardNudge({ campaign, contribution: waiting, stewardIds: [1], step: 2 });
    expect(row).toMatchObject({
      title: "Ada has waited a week to hear back",
      body: 'Ada offered "Seed & tools" to Plant 400 trees a week ago. If it isn\'t a fit, a kind no frees them to offer somewhere else.',
      dedupeKey: "cp:nudge:410:s2:u1",
    });
  });
  it("says Someone for an anonymous offer or a missing name", () => {
    const [anon] = buildStewardNudge({ campaign, contribution: { ...waiting, isAnonymous: 1 }, stewardIds: [1], step: 1 });
    expect(anon.title).toBe("Someone's offer is waiting on you");
    expect(String(anon.body).startsWith('Someone offered "Seed & tools"')).toBe(true);
    const [nameless] = buildStewardNudge({ campaign, contribution: { ...waiting, contributorName: "  " }, stewardIds: [1], step: 2 });
    expect(nameless.title).toBe("Someone has waited a week to hear back");
  });
  it("no stewards, no rows", () => {
    expect(buildStewardNudge({ campaign, contribution: waiting, stewardIds: [], step: 1 })).toEqual([]);
  });
  it("says how long the offer really waited (review 2026-09-28)", () => {
    // The daily run: day 2 and day 7 keep the spec's words.
    expect(buildStewardNudge({ campaign, contribution: waiting, stewardIds: [1], step: 1, waitedDays: 2 })[0].body)
      .toBe('Ada offered "Seed & tools" to Plant 400 trees 2 days ago. A yes, a no or a question keeps it moving.');
    expect(buildStewardNudge({ campaign, contribution: waiting, stewardIds: [1], step: 2, waitedDays: 7 })[0].title)
      .toBe("Ada has waited a week to hear back");
    // After a pause, or a first run over a backlog.
    const [five] = buildStewardNudge({ campaign, contribution: waiting, stewardIds: [1], step: 1, waitedDays: 5 });
    expect(five.body).toBe('Ada offered "Seed & tools" to Plant 400 trees 5 days ago. A yes, a no or a question keeps it moving.');
    const [twenty] = buildStewardNudge({ campaign, contribution: waiting, stewardIds: [1], step: 2, waitedDays: 20 });
    expect(twenty.title).toBe("Ada has waited 20 days to hear back");
    expect(twenty.body).toBe('Ada offered "Seed & tools" to Plant 400 trees 20 days ago. If it isn\'t a fit, a kind no frees them to offer somewhere else.');
    expect(`${twenty.title} ${twenty.body}`).not.toContain("week");
    // The dedupe key never depends on the words.
    expect(twenty.dedupeKey).toBe("cp:nudge:410:s2:u1");
  });
  it("words the wait in days", () => {
    expect(waitedAgo(2)).toBe("2 days ago");
    expect(waitedAgo(7)).toBe("a week ago");
    expect(waitedAgo(8)).toBe("8 days ago");
    expect(waitedAgo(1)).toBe("yesterday");
  });
});

describe("the contributor's note at 14 days (offer_still_waiting)", () => {
  it("goes to the account holder only, once", () => {
    const [row, ...rest] = buildStillWaiting({ campaign, contribution: waiting });
    expect(rest).toEqual([]);
    expect(row).toMatchObject({
      userId: 20,
      type: "offer_still_waiting",
      title: "Your offer to Seeds & Soil is still waiting",
      body: 'The stewards of Seeds & Soil haven\'t answered your offer of "Seed & tools" yet. It stays open until they do, and you can withdraw it from Your contributions if your plans change.',
      link: `${P}#your-contributions`,
      dedupeKey: "cp:wait:410:u20",
    });
    expectOurWords([row]);
  });
  it("nobody without an account", () => {
    expect(buildStillWaiting({ campaign, contribution: { ...waiting, userId: null } })).toEqual([]);
  });
});

describe("crowdpooling opens (campaign_opened)", () => {
  it("reaches followers, never stewards or the actor, with the open line and the close date", () => {
    const rows = buildCampaignOpened({
      campaign, followerIds: [1, 30, 31, 31, 99], stewardIds: [1, 2], actorId: 99,
      openLine: "12 needs still open. 5 roles, 4 things, 3 shifts.", closes: "Closes 21 March 2027",
    });
    expect(rows.map((r) => r.userId)).toEqual([30, 31]);
    expect(rows[0]).toMatchObject({
      type: "campaign_opened",
      title: "Crowdpooling is open at Seeds & Soil",
      body: "Seeds & Soil is asking for help. 12 needs still open. 5 roles, 4 things, 3 shifts. Closes 21 March 2027.",
      link: `${P}#needs`,
      dedupeKey: "cp:opened:7:u30",
    });
    expectOurWords(rows);
  });
  it("leaves out what it doesn't have", () => {
    const [row] = buildCampaignOpened({ campaign, followerIds: [30], stewardIds: [] });
    expect(row.body).toBe("Seeds & Soil is asking for help.");
  });
});

describe("two weeks before the close (campaign_final_stretch)", () => {
  it("names up to three open needs and the close date", () => {
    const rows = buildFinalStretch({
      campaign, recipientIds: [30, 31, 30],
      needLines: ["Farm manager, 20 hrs a week", "Planting day, 12 places", "Tractor, 1 Mar to 30 Jun", "Seed"],
      closesOn: "21 March 2027",
    });
    expect(rows.map((r) => r.userId)).toEqual([30, 31]);
    expect(rows[0]).toMatchObject({
      type: "campaign_final_stretch",
      title: "These needs are still open at Seeds & Soil",
      body: "Farm manager, 20 hrs a week; Planting day, 12 places; Tractor, 1 Mar to 30 Jun. Crowdpooling at Seeds & Soil closes on 21 March 2027.",
      link: `${P}#needs`,
      dedupeKey: "cp:stretch:7:u30",
    });
    expectOurWords(rows);
    // No countdown words.
    expect(noticeText(rows)).not.toMatch(/\b(hurry|last chance|only \d+ days|countdown)\b/i);
  });
  it("sends nothing when no need is open", () => {
    expect(buildFinalStretch({ campaign, recipientIds: [30], needLines: [], closesOn: "21 March 2027" })).toEqual([]);
  });
});

describe("a close that didn't complete (campaign_closed)", () => {
  const others = "These could use you now: Apply Farm manager at Green Hill; Offer Tractor at Blue River.";
  const args = {
    campaign,
    closedOn: "21 March 2027",
    stewardIds: [1, 2],
    releasedCount: 3,
    contributors: [
      { userId: 20, lines: ['Your offer of "Seed" hadn\'t started, so it\'s released with our thanks.'] },
      { userId: 2, lines: ["A steward who also offered hears as a steward."] },
      { userId: 21, lines: [] },
    ],
    followerIds: [1, 20, 30],
    otherNeedsLine: others,
  };
  it("stewards hear how many offers were released and what stays with them", () => {
    const rows = buildCampaignClosed(args);
    const steward = rows.find((r) => r.userId === 1)!;
    expect(steward).toMatchObject({
      type: "campaign_closed",
      title: "Plant 400 trees closed without completing",
      body: "Crowdpooling closed on 21 March 2027. 3 offers that hadn't started were released with a thank-you. Offers already underway stay with you to mark delivered or release. Help already given stays recorded in the project's token.",
      link: `${P}#steward-tools`,
      dedupeKey: "cp:close:7:u1",
    });
    expect(buildCampaignClosed({ ...args, releasedCount: 1 })[0].body).toContain(" 1 offer that hadn't started was released with a thank-you.");
    expect(buildCampaignClosed({ ...args, releasedCount: 0 })[0].body).toBe(
      "Crowdpooling closed on 21 March 2027. Offers already underway stay with you to mark delivered or release. Help already given stays recorded in the project's token.",
    );
    expectOurWords(rows);
  });
  it("each contributor hears their own lines then other needs; followers a short note; everyone once", () => {
    const rows = buildCampaignClosed(args);
    expect(rows.map((r) => r.userId)).toEqual([1, 2, 20, 21, 30]);
    expect(new Set(rows.map((r) => r.dedupeKey)).size).toBe(rows.length);
    const ada = rows.find((r) => r.userId === 20)!;
    expect(ada.body).toBe(`Your offer of "Seed" hadn't started, so it's released with our thanks. ${others}`);
    expect(ada.link).toBe(`${P}#your-contributions`);
    // A contributor with no line of their own still hears that it closed.
    expect(rows.find((r) => r.userId === 21)!.body).toBe(`Crowdpooling at Seeds & Soil closed on 21 March 2027 without completing. ${others}`);
    const follower = rows.find((r) => r.userId === 30)!;
    expect(follower.body).toBe("Crowdpooling at Seeds & Soil closed on 21 March 2027 without completing. You still follow Seeds & Soil, so you'll hear when it asks again.");
    expect(follower.link).toBe(P);
  });
  it("cuts a long body to 500", () => {
    const long = buildCampaignClosed({ ...args, contributors: [{ userId: 40, lines: ["x".repeat(700)] }], stewardIds: [], followerIds: [] });
    expect(String(long[0].body).length).toBeLessThanOrEqual(500);
  });
});

describe("a completion that closed waiting offers (campaign_closed)", () => {
  it("one notice per person, worded for one offer or several", () => {
    const rows = buildOfferClosedAtCompletion({
      campaign,
      recipients: [
        { userId: 20, titles: ["Seed"] },
        { userId: 21, titles: ["Seed", "Tools"] },
        { userId: 22, titles: ["A", "B", "C", "D"] },
        { userId: 20, titles: ["Again"] },
        { userId: 23, titles: [] },
      ],
      otherNeedsLine: "Follow Seeds & Soil to hear when it asks again.",
    });
    expect(rows.map((r) => r.userId)).toEqual([20, 21, 22]);
    expect(rows[0]).toMatchObject({
      type: "campaign_closed",
      title: "Plant 400 trees is complete",
      body: 'It completed before the stewards answered your offer of "Seed", so your offer is closed with our thanks. Follow Seeds & Soil to hear when it asks again.',
      link: `${P}#your-contributions`,
      dedupeKey: "cp:close:7:u20",
    });
    expect(String(rows[1].body).startsWith('It completed before the stewards answered your offers of "Seed" and "Tools", so they\'re closed with our thanks.')).toBe(true);
    expect(String(rows[2].body).startsWith('It completed before the stewards answered your offers of "A", "B" and 2 more,')).toBe(true);
    expectOurWords(rows);
  });
});

describe("a note from an offer status link (contributor_reply)", () => {
  const offer = { id: 301, title: "Trailer", contributorName: "Bea", userId: null, isAnonymous: 0 };
  it("goes to every steward once, keyed per note and person, and links to the review list", () => {
    const rows = buildContributorReply({ campaign, contribution: offer, messageId: 88, message: "Can I bring it on Friday?", stewardIds: [1, 2, 2, 0] });
    expect(rows.map((r) => r.userId)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({
      type: "contributor_reply",
      title: "Bea sent a note about their offer",
      body: "Can I bring it on Friday?",
      link: `${P}#review`,
      actorId: null,
      campaignId: 7,
      contributionId: 301,
      dedupeKey: "cp:reply:88:u1",
    });
    expect(rows[1].dedupeKey).toBe("cp:reply:88:u2");
    expectOurWords(rows);
  });
  it("says Someone for an anonymous offer, decodes the stored note once and keeps 300 characters", () => {
    const [anon] = buildContributorReply({ campaign, contribution: { ...offer, isAnonymous: 1 }, messageId: 89, message: "Tea &amp; biscuits", stewardIds: [1] });
    expect(anon.title).toBe("Someone sent a note about their offer");
    expect(anon.body).toBe("Tea & biscuits");
    const [long] = buildContributorReply({ campaign, contribution: offer, messageId: 90, message: "a ".repeat(400), stewardIds: [1] });
    expect(String(long.body).length).toBeLessThanOrEqual(300);
  });
  it("sends nothing for an empty note or when there is no steward", () => {
    expect(buildContributorReply({ campaign, contribution: offer, messageId: 91, message: "   ", stewardIds: [1] })).toEqual([]);
    expect(buildContributorReply({ campaign, contribution: offer, messageId: 92, message: "Hello", stewardIds: [] })).toEqual([]);
  });
});
