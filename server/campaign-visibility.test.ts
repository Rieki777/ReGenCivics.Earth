/**
 * A campaign cancelled before it ever went live stays hidden
 * (server/lib/project-steward.ts isPublicCampaign, 2026-09-24).
 *
 * Cancelled is public only when the campaign was published once (it has a
 * startedAt or publishedAt). Cancelled from draft or review, it stays with
 * its stewards and admins through getById, list, projects.getPublic and
 * global search. Cancelled after going live, it stays public.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems, campaignUpdates } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  stewardCaller,
} from "./test-fixtures/crowdpool";

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

const skipIfNoDb = !process.env.DATABASE_URL;
const OWNER = 986901;
const CO_STEWARD = 986902;
const STRANGER = 986903;
const createdCampaignIds: number[] = [];

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaignUpdates).where(inArray(campaignUpdates.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

async function makeCampaign(applicationId: number, title: string, publish: boolean) {
  const { id } = await stewardCaller(OWNER).campaigns.create({
    title,
    description: "Visibility fixture",
    projectName: title,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
  });
  createdCampaignIds.push(id);
  if (publish) await adminCaller().campaigns.updateStatus({ id, status: "active" });
  return id;
}

describe("a cancelled campaign's visibility", () => {
  it.skipIf(skipIfNoDb)("cancelled from draft stays hidden from a stranger, visible to its stewards", async () => {
    const stamp = Date.now();
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const title = `Test Visibility Draftcancel ${stamp}`;
    const id = await makeCampaign(applicationId, title, false);
    await stewardCaller(OWNER).campaigns.cancel({ id });
    const row = await dbHelpers.getCampaignById(id);
    expect(row!.status).toBe("cancelled");
    expect(row!.startedAt).toBeNull();
    expect(row!.publishedAt).toBeNull();

    for (const caller of [anonCaller(), stewardCaller(STRANGER)]) {
      expect(await caller.campaigns.getById({ id })).toBeNull();
      expect((await caller.campaigns.list()).map((c) => c.id)).not.toContain(id);
      expect((await caller.campaigns.list({ status: "cancelled" })).map((c) => c.id)).not.toContain(id);
      expect(await caller.campaigns.getItems({ campaignId: id })).toEqual([]);
      // Every child read follows the campaign.
      expect(await caller.campaigns.getActivity({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getPartnerLinks({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.listUpdates({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getImages({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getContributions({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.suggestAlternatives({ campaignId: id })).toEqual([]);
      await expect(caller.campaigns.subscribeByEmail({ campaignId: id, email: `vis.${stamp}@example.com` }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      // The approved application still has a page; the campaign is not on it,
      // even when asked for by ?campaign= or by its own campaign key.
      const page = await caller.projects.getPublic({ key: String(applicationId) });
      expect(page.campaigns.map((c) => c.id)).not.toContain(id);
      expect(page.front?.id).not.toBe(id);
      const focused = await caller.projects.getPublic({ key: String(applicationId), campaign: id });
      expect(focused.front?.id).not.toBe(id);
      expect(focused.campaigns.map((c) => c.id)).not.toContain(id);
      const byKey = await caller.projects.getPublic({ key: `c${id}` });
      expect(byKey.campaigns.map((c) => c.id)).not.toContain(id);
      expect(byKey.front?.id).not.toBe(id);
      const found = await caller.globalSearch.query({ q: `Draftcancel ${stamp}` });
      expect(found.campaigns.map((c) => c.id)).not.toContain(id);
    }
    await expect(stewardCaller(STRANGER).campaigns.follow({ campaignId: id }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    // Those who could see it before still can.
    expect((await stewardCaller(CO_STEWARD).campaigns.getItems({ campaignId: id })).length).toBe(1);
    expect((await stewardCaller(OWNER).campaigns.getById({ id }))?.id).toBe(id);
    expect((await stewardCaller(CO_STEWARD).campaigns.getById({ id }))?.id).toBe(id);
    expect((await adminCaller().campaigns.getById({ id }))?.id).toBe(id);
    expect((await stewardCaller(OWNER).campaigns.list({ status: "cancelled" })).map((c) => c.id)).toContain(id);
    const stewardPage = await stewardCaller(CO_STEWARD).projects.getPublic({ key: String(applicationId) });
    expect(stewardPage.campaigns.map((c) => c.id)).toContain(id);
  });

  it.skipIf(skipIfNoDb)("a campaign with no application, cancelled from draft, has no public page", async () => {
    const { id } = await adminCaller().campaigns.create({
      title: `Test Visibility Solo ${Date.now()}`,
      description: "Visibility fixture",
      projectName: "Test Visibility Solo",
      currency: "USD",
      financialTarget: 1000,
      items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
    });
    createdCampaignIds.push(id);
    await adminCaller().campaigns.cancel({ id });
    await expect(anonCaller().projects.getPublic({ key: `c${id}` })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(stewardCaller(STRANGER).projects.getPublic({ key: `c${id}` })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await adminCaller().projects.getPublic({ key: `c${id}` })).campaigns.map((c) => c.id)).toEqual([id]);
  });

  it.skipIf(skipIfNoDb)("cancelled after going live stays public", async () => {
    const stamp = Date.now();
    const applicationId = await createApprovedApplication(OWNER);
    const title = `Test Visibility Livecancel ${stamp}`;
    const id = await makeCampaign(applicationId, title, true);
    await stewardCaller(OWNER).campaigns.cancel({ id });
    const row = await dbHelpers.getCampaignById(id);
    expect(row!.status).toBe("cancelled");
    expect(row!.startedAt).not.toBeNull();

    const anon = anonCaller();
    expect((await anon.campaigns.getById({ id }))?.id).toBe(id);
    expect((await anon.campaigns.list({ status: "cancelled" })).map((c) => c.id)).toContain(id);
    expect((await anon.campaigns.getItems({ campaignId: id })).length).toBe(1);
    expect((await stewardCaller(STRANGER).campaigns.getById({ id }))?.id).toBe(id);
    const page = await anon.projects.getPublic({ key: String(applicationId) });
    expect(page.campaigns.map((c) => c.id)).toContain(id);
    expect(page.front?.id).toBe(id);
    const found = await anon.globalSearch.query({ q: `Livecancel ${stamp}` });
    expect(found.campaigns.map((c) => c.id)).toContain(id);
  });
});
