/**
 * Campaign notices: every row of the event catalogue (spec 6.2), built by the
 * pure builders in server/lib/campaign-notify.ts. No database.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildCampaignApproved,
  buildCampaignCancelled,
  buildCampaignCompleted,
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
  buildThanked,
  buildUpdatePosted,
  deliver,
  recipientsOf,
} from "./lib/campaign-notify";
import { toNotificationRow } from "./lib/forum-notify";

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
      body: '"Soil testing" is on the record, and it now grows on your Living Tree.',
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
    expect(rows[0]).toMatchObject({ type: "claim_expired", title: "Your claim expired", link: `${P}#your-contributions` });
    expect(rows[1]).toMatchObject({ title: "A claim expired", link: `${P}#review` });
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
