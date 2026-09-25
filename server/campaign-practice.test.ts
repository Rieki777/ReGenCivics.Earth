/**
 * Practice receipts on example campaigns (Rye, 2026-09-24, decision B12c):
 * "Sending on an example campaign gives a practice receipt".
 *
 * campaigns.submitContribution on an isDemo campaign runs every check a real
 * offer runs, then returns { id: null, success: true, practice: true } and
 * writes nothing: no campaign_contributions row, no counter or total, no
 * notification, no email.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  stewardCaller,
} from "./test-fixtures/crowdpool";

vi.mock("./lib/forum-notify", async (orig) => {
  const real = await orig<typeof import("./lib/forum-notify")>();
  return { ...real, insertNotification: vi.fn(real.insertNotification) };
});
vi.mock("./lib/campaign-notify", async (orig) => {
  const real = await orig<typeof import("./lib/campaign-notify")>();
  return { ...real, notifyProposalReceived: vi.fn(real.notifyProposalReceived) };
});
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./notify-with-prefs", () => ({
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

import { insertNotification } from "./lib/forum-notify";
import { notifyProposalReceived } from "./lib/campaign-notify";
import { notifyIfEnabled } from "./notify-with-prefs";
import { sendEmail } from "./_core/email";

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986801;
const createdCampaignIds: number[] = [];

/** Forget what setup did (publishing a campaign tells its stewards). */
function clearSpies() {
  vi.mocked(insertNotification).mockClear();
  vi.mocked(notifyProposalReceived).mockClear();
  vi.mocked(notifyIfEnabled).mockClear();
  vi.mocked(sendEmail).mockClear();
}

beforeEach(clearSpies);

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

/** A live campaign with one slot need and one hours role. Example unless told otherwise. */
async function liveCampaign(title: string, isDemo = true) {
  const applicationId = await createApprovedApplication(STEWARD);
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Practice ${title}`,
    description: "Practice fixture",
    projectName: `Test Practice ${title}`,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: [
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 },
      { category: "role", kind: "role", roleTitle: "Soil scientist", hoursPerWeek: 10, estimatedValue: 2000 },
    ],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  if (isDemo) {
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
  }
  const items = await dbHelpers.getCampaignItems(id);
  const slot = items.find((i) => i.kind !== "role")!;
  const role = items.find((i) => i.kind === "role")!;
  return { campaignId: id, slotId: slot.id, roleId: role.id };
}

/** Everything a submit could move: the campaign row, its needs, its offers. */
async function snapshot(campaignId: number) {
  const database = await dbHelpers.getDb();
  const campaign = await dbHelpers.getCampaignById(campaignId);
  const items = await dbHelpers.getCampaignItems(campaignId);
  const rows = await database!.select().from(campaignContributions).where(eq(campaignContributions.campaignId, campaignId));
  return JSON.stringify({ campaign, items, rows });
}

function slotOffer(campaignId: number, campaignItemId?: number) {
  return {
    campaignId,
    ...(campaignItemId ? { campaignItemId } : {}),
    contributionType: "resource" as const,
    title: "Test practice seeds",
    estimatedValue: 100,
    contributorName: "Visitor",
    contributorEmail: "practice.visitor@example.com",
  };
}

describe("submitContribution on an example campaign", () => {
  it.skipIf(skipIfNoDb)("returns a practice result and writes, moves and tells nothing", async () => {
    const { campaignId, slotId, roleId } = await liveCampaign("Nothing written");
    const before = await snapshot(campaignId);
    clearSpies();

    // A claim on a need, a freeform offer, an hours offer, signed out and signed in.
    const results = [
      await anonCaller().campaigns.submitContribution(slotOffer(campaignId, slotId)),
      await anonCaller().campaigns.submitContribution(slotOffer(campaignId)),
      await stewardCaller(986802).campaigns.submitContribution({
        campaignId, campaignItemId: roleId, contributionType: "role", title: "Test practice hours",
        roleTitle: "Soil scientist", hoursPerWeek: 4, estimatedValue: 1,
        contributorName: "Member", contributorEmail: "practice.member@example.com",
      }),
    ];
    for (const r of results) expect(r).toEqual({ id: null, success: true, practice: true });

    expect(await snapshot(campaignId)).toBe(before);
    const database = await dbHelpers.getDb();
    const rows = await database!.select({ id: campaignContributions.id }).from(campaignContributions)
      .where(eq(campaignContributions.campaignId, campaignId));
    expect(rows).toHaveLength(0);
    expect(vi.mocked(notifyProposalReceived)).not.toHaveBeenCalled();
    expect(vi.mocked(insertNotification)).not.toHaveBeenCalled();
    expect(vi.mocked(notifyIfEnabled)).not.toHaveBeenCalled();
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it.skipIf(skipIfNoDb)("still gives a bad input its real error", async () => {
    const { campaignId, roleId } = await liveCampaign("Real errors");
    const other = await liveCampaign("Real errors other");

    await expect(anonCaller().campaigns.submitContribution(slotOffer(campaignId, other.slotId)))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "That need does not belong to this campaign" });
    await expect(anonCaller().campaigns.submitContribution({ ...slotOffer(campaignId, roleId), contributionType: "role" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("how many hours a week") });
    await expect(anonCaller().campaigns.submitContribution({ ...slotOffer(campaignId), contributorEmail: "not-an-email" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });

    // A closed example refuses exactly as a closed real campaign does.
    await adminCaller().campaigns.updateStatus({ id: campaignId, status: "completed" });
    await expect(anonCaller().campaigns.submitContribution(slotOffer(campaignId)))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Campaign is not accepting contributions" });
  });

  it.skipIf(skipIfNoDb)("checks give or lend like a real campaign, then practises a loan without writing", async () => {
    // A thing the example takes as a gift or on loan (build spec 2026-09-25, 6.3).
    const applicationId = await createApprovedApplication(STEWARD);
    const { id: campaignId } = await stewardCaller(STEWARD).campaigns.create({
      title: "Test Practice Give or lend",
      description: "Practice fixture",
      projectName: "Test Practice Give or lend",
      currency: "USD",
      financialTarget: 0,
      applicationId,
      items: [{ category: "equipment", equipmentName: "Trailer", estimatedValue: 3000, acceptsGift: true, acceptsLoan: true }],
    });
    createdCampaignIds.push(campaignId);
    await adminCaller().campaigns.updateStatus({ id: campaignId, status: "active" });
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, campaignId));
    const [trailer] = await dbHelpers.getCampaignItems(campaignId);
    const before = await snapshot(campaignId);
    clearSpies();

    const lendOffer = (extra: Record<string, unknown>) =>
      anonCaller().campaigns.submitContribution({ ...slotOffer(campaignId, trailer.id), contributionType: "equipment", ...extra });
    await expect(lendOffer({})).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Choose give or lend for this need." });
    await expect(lendOffer({ offerMode: "lend" })).rejects.toMatchObject({ message: "Add the date it needs to come back." });
    await expect(lendOffer({ contributionType: "financial", financialAmount: 10 }))
      .rejects.toMatchObject({ message: expect.stringContaining("Money doesn't move through this site yet.") });

    const until = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    expect(await lendOffer({ offerMode: "lend", lendUntil: until, lendTerms: "Return it clean" }))
      .toEqual({ id: null, success: true, practice: true });
    expect(await lendOffer({ offerMode: "give" })).toEqual({ id: null, success: true, practice: true });

    expect(await snapshot(campaignId)).toBe(before);
    expect(vi.mocked(notifyProposalReceived)).not.toHaveBeenCalled();
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it.skipIf(skipIfNoDb)("a real campaign still takes the offer and says it is not practice", async () => {
    const { campaignId, slotId } = await liveCampaign("Real one", false);
    clearSpies();
    const r = await anonCaller().campaigns.submitContribution(slotOffer(campaignId, slotId));
    expect(r.practice).toBe(false);
    expect(typeof r.id).toBe("number");
    const row = await dbHelpers.getContributionById(r.id as number);
    expect(row).toMatchObject({ campaignId, status: "pending" });
    expect(vi.mocked(notifyProposalReceived)).toHaveBeenCalledTimes(1);
  });
});
