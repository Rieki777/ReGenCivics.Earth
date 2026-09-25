/**
 * Campaign events reach the notification spine (2026-09-24).
 *
 * insertNotification is mocked, so every spine row a route writes is a call
 * this file can read: who gets it, what type, which dedupe key. Direct
 * email is mocked too: an account holder must get NO direct email (the
 * spine emails them by their prefs), and someone without an account gets
 * exactly one.
 *
 * Run against the SCRATCH database, never production.
 */
import { realOffer } from "./test-fixtures/crowdpool";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems, campaignUpdates, userFollows } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  createApprovedLandClaim,
  stewardCaller,
} from "./test-fixtures/crowdpool";

vi.mock("./lib/forum-notify", async (orig) => ({
  ...(await orig<typeof import("./lib/forum-notify")>()),
  insertNotification: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
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
import { sendEmail } from "./_core/email";

const skipIfNoDb = !process.env.DATABASE_URL;
const APPLICANT = 986501; // creates the campaign
const CO_STEWARD = 986502; // the application's stewardUserId
const CLAIMER = 986503; // approved land_project claim
const CONTRIBUTOR = 986504; // an account holder who offers
const FOLLOWER = 986505;

const createdCampaignIds: number[] = [];
const insertMock = vi.mocked(insertNotification);
const sendMock = vi.mocked(sendEmail);

type Row = { userId: number; type: string; dedupeKey: string; title: string; body?: string | null; link?: string | null };
const rows = (): Row[] => insertMock.mock.calls.map((c) => c[0] as Row);
const rowsOfType = (type: string) => rows().filter((r) => r.type === type);

async function campaignWithStewards(title: string, items?: any[]) {
  const applicationId = await createApprovedApplication(APPLICANT, { stewardUserId: CO_STEWARD });
  await createApprovedLandClaim(CLAIMER, applicationId);
  const { id } = await stewardCaller(APPLICANT).campaigns.create({
    title: `Test Wiring ${title}`,
    description: "Wiring fixture",
    projectName: `Test Wiring ${title}`,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: items ?? [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000, quantityWanted: 5 }],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const needs = await stewardCaller(APPLICANT).campaigns.getItems({ campaignId: id });
  return { campaignId: id, itemId: needs[0].id as number, applicationId };
}

function offerAsAccount(campaignId: number, itemId: number, title = "Seed offer") {
  return realOffer(stewardCaller(CONTRIBUTOR).campaigns.submitContribution({
    campaignId, campaignItemId: itemId, contributionType: "resource", title,
    contributorName: "Account Person", contributorEmail: "account.person@example.com", estimatedValue: 100,
  }));
}
function offerAnon(campaignId: number, itemId: number, title = "Anon seed offer") {
  return realOffer(anonCaller().campaigns.submitContribution({
    campaignId, campaignItemId: itemId, contributionType: "resource", title,
    contributorName: "No Account", contributorEmail: "no.account@example.com", estimatedValue: 100,
  }));
}
const status = (contributionId: number, s: "accepted" | "rejected" | "fulfilled" | "thanked" | "released", extra: Record<string, unknown> = {}) =>
  stewardCaller(CO_STEWARD).campaigns.updateContributionStatus({ contributionId, status: s, ...extra } as any);

beforeEach(() => {
  insertMock.mockClear();
  sendMock.mockClear();
});

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaignUpdates).where(inArray(campaignUpdates.campaignId, createdCampaignIds));
    await database!.delete(userFollows).where(inArray(userFollows.targetId, createdCampaignIds.map(String)));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

describe("an offer arrives", () => {
  it.skipIf(skipIfNoDb)("every steward gets new_contribution, keyed per person", async () => {
    const { campaignId, itemId } = await campaignWithStewards("Offer");
    insertMock.mockClear();
    const c = await offerAnon(campaignId, itemId);
    const got = rowsOfType("new_contribution");
    expect(got.map((r) => r.userId).sort()).toEqual([APPLICANT, CO_STEWARD, CLAIMER].sort());
    for (const r of got) {
      expect(r.dedupeKey).toBe(`cp:new:${c.id}:u${r.userId}`);
      expect(r.link).toMatch(new RegExp(String.raw`^/project/\d+-test-wiring-offer\?campaign=` + campaignId + '#review$'));
    }
  });
});

describe("a steward answers", () => {
  it.skipIf(skipIfNoDb)("an account holder hears on the spine only, for every answer", async () => {
    const { campaignId, itemId } = await campaignWithStewards("Account answers");
    const a = await offerAsAccount(campaignId, itemId, "Accepted one");
    const b = await offerAsAccount(campaignId, itemId, "Declined one");
    insertMock.mockClear();
    sendMock.mockClear();

    await status(a.id, "accepted", { ownerNotes: "Welcome aboard" });
    await status(b.id, "rejected", { ownerNotes: "Not this season" });
    await status(a.id, "fulfilled");
    await status(a.id, "thanked", { acknowledgedNote: "The seed is in the ground. Thank you." });

    const mine = rows().filter((r) => r.userId === CONTRIBUTOR);
    expect(mine.map((r) => r.type)).toEqual(["contribution_accepted", "contribution_rejected", "contribution_delivered", "contribution_thanked"]);
    expect(mine[0].dedupeKey).toBe(`cp:contrib:${a.id}:accepted`);
    expect(mine[0].body).toContain("Welcome aboard");
    expect(mine[1].dedupeKey).toBe(`cp:contrib:${b.id}:rejected`);
    expect(mine[2].dedupeKey).toBe(`cp:contrib:${a.id}:delivered`);
    expect(mine[3].dedupeKey).toBe(`cp:contrib:${a.id}:thanked`);
    expect(mine[3].body).toContain("The seed is in the ground");
    // Never the actor, and no direct email for an account holder.
    expect(rows().some((r) => r.userId === CO_STEWARD)).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it.skipIf(skipIfNoDb)("someone without an account gets exactly one direct email per answer, and no spine row", async () => {
    const { campaignId, itemId } = await campaignWithStewards("Anon answers");
    const a = await offerAnon(campaignId, itemId, "Anon accepted");
    insertMock.mockClear();
    sendMock.mockClear();
    await status(a.id, "accepted");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: "no.account@example.com", template: "contribution_accepted" });
    await status(a.id, "fulfilled");
    expect(sendMock).toHaveBeenCalledTimes(2);
    await status(a.id, "fulfilled"); // a repeat sends nothing
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(rows().filter((r) => r.type.startsWith("contribution_"))).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("a release tells the holder", async () => {
    const { campaignId, itemId } = await campaignWithStewards("Release");
    const a = await offerAsAccount(campaignId, itemId, "Released one");
    await status(a.id, "accepted");
    insertMock.mockClear();
    await status(a.id, "released", { ownerNotes: "Plans changed" });
    const got = rowsOfType("contribution_released");
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ userId: CONTRIBUTOR, dedupeKey: `cp:contrib:${a.id}:released` });
    expect(got[0].body).toContain("Plans changed");
  });

  it.skipIf(skipIfNoDb)("a role that fills tells its holders and the stewards", async () => {
    const { campaignId, itemId } = await campaignWithStewards("Role filled", [
      { category: "role", kind: "role", roleTitle: "Organiser", hoursPerWeek: 20, estimatedValue: 2000 },
    ]);
    const c = await realOffer(stewardCaller(CONTRIBUTOR).campaigns.submitContribution({
      campaignId, campaignItemId: itemId, contributionType: "role", title: "Organising",
      contributorName: "Account Person", contributorEmail: "account.person@example.com",
      hoursPerWeek: 20, estimatedValue: 0,
    }));
    insertMock.mockClear();
    await status(c.id, "accepted");
    const filled = rowsOfType("role_filled");
    expect(filled.map((r) => r.userId).sort()).toEqual([APPLICANT, CLAIMER, CONTRIBUTOR].sort());
    for (const r of filled) expect(r.dedupeKey).toBe(`cp:rolefilled:${itemId}:${c.id}:u${r.userId}`);
    const accepted = rowsOfType("contribution_accepted");
    expect(accepted[0].body).toContain("You're in for 20 hours a week as Organiser.");
  });
});

describe("updates and reviews", () => {
  it.skipIf(skipIfNoDb)("an update reaches account followers with cp:update keys, never the author", async () => {
    const { campaignId } = await campaignWithStewards("Update");
    await stewardCaller(FOLLOWER).campaigns.follow({ campaignId });
    await stewardCaller(CO_STEWARD).campaigns.follow({ campaignId });
    insertMock.mockClear();
    const { id, updateNumber } = await stewardCaller(CO_STEWARD).campaigns.createUpdate({
      campaignId, title: "Planting day", body: "We planted.",
    });
    const got = rowsOfType("campaign_update");
    expect(got.map((r) => r.userId)).toEqual([FOLLOWER]);
    expect(got[0]).toMatchObject({ dedupeKey: `cp:update:${id}:u${FOLLOWER}`, title: `Update #${updateNumber} from Test Wiring Update` });
  });

  it.skipIf(skipIfNoDb)("an update also reaches account contributors whose offer stands, once, even when they follow too", async () => {
    const { campaignId, itemId } = await campaignWithStewards("Update contributors");
    const c = await offerAsAccount(campaignId, itemId);
    await status(c.id, "accepted");
    const waiting = await offerAnon(campaignId, itemId, "Still waiting");
    void waiting;
    await stewardCaller(FOLLOWER).campaigns.follow({ campaignId });
    insertMock.mockClear();
    await stewardCaller(CO_STEWARD).campaigns.createUpdate({ campaignId, title: "Thank you", body: "Your seed went in." });
    expect(rowsOfType("campaign_update").map((r) => r.userId).sort()).toEqual([CONTRIBUTOR, FOLLOWER].sort());

    // Following too never doubles the notice.
    await stewardCaller(CONTRIBUTOR).campaigns.follow({ campaignId });
    insertMock.mockClear();
    await stewardCaller(CO_STEWARD).campaigns.createUpdate({ campaignId, title: "Again", body: "More." });
    expect(rowsOfType("campaign_update").map((r) => r.userId).sort()).toEqual([CONTRIBUTOR, FOLLOWER].sort());
  });

  it.skipIf(skipIfNoDb)("approval and a sent-back review carry the review notes to the stewards", async () => {
    const applicationId = await createApprovedApplication(APPLICANT, { stewardUserId: CO_STEWARD });
    const make = async (title: string) => {
      const { id } = await stewardCaller(APPLICANT).campaigns.create({
        title: `Test Wiring ${title}`, description: "Review fixture", projectName: `Test Wiring ${title}`,
        currency: "USD", financialTarget: 1000, applicationId,
        items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
      });
      createdCampaignIds.push(id);
      return id;
    };
    const live = await make("Approved");
    const back = await make("Sent back");
    insertMock.mockClear();
    await adminCaller().campaigns.updateStatus({ id: live, status: "active", reviewNotes: "Lovely pitch" });
    await adminCaller().campaigns.updateStatus({ id: back, status: "rejected", reviewNotes: "Add a budget" });
    const approved = rowsOfType("campaign_approved");
    expect(approved.map((r) => r.userId).sort()).toEqual([APPLICANT, CO_STEWARD].sort());
    expect(approved[0].body).toContain("Notes from the review: Lovely pitch");
    const declined = rowsOfType("campaign_declined");
    expect(declined.map((r) => r.userId).sort()).toEqual([APPLICANT, CO_STEWARD].sort());
    expect(declined[0].body).toBe("Add a budget");

    insertMock.mockClear();
    await adminCaller().campaigns.updateStatus({ id: live, status: "completed" });
    expect(rowsOfType("campaign_completed").map((r) => r.userId).sort()).toEqual([APPLICANT, CO_STEWARD].sort());
  });
});
