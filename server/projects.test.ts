/**
 * The public project page read: projects.getPublic (server/routes/projects.ts),
 * and the getById refactor it shares (buildCampaignView).
 *
 * Pins: getById's output key set (villages read it: crowdpool hub contract),
 * how keys resolve and canonicalize, what visitors and stewards each see,
 * and that no private application column leaves the server.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { applications, campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
import { PUBLIC_CAMPAIGN_FIELDS } from "./routes/campaigns";
import { pickFrontCampaign } from "./routes/projects";
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
const OWNER = 986701;
const CO_STEWARD = 986702;
const STRANGER = 986703;
const createdCampaignIds: number[] = [];

async function makeCampaign(applicationId: number | undefined, title: string, publish = true) {
  const caller = applicationId ? stewardCaller(OWNER) : adminCaller();
  const { id } = await caller.campaigns.create({
    title: `Test Project ${title}`,
    description: "Project page fixture",
    projectName: `Test Project ${title}`,
    currency: "USD",
    financialTarget: 1000,
    ...(applicationId ? { applicationId } : {}),
    items: [{ category: "resource", resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 }],
  });
  createdCampaignIds.push(id);
  if (publish) await adminCaller().campaigns.updateStatus({ id, status: "active" });
  return id;
}

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

describe("getById keeps its shape (hub contract)", () => {
  it.skipIf(skipIfNoDb)("returns exactly the public fields plus the view extras", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const id = await makeCampaign(applicationId, "Shape");
    const view = await anonCaller().campaigns.getById({ id });
    const expected = [...PUBLIC_CAMPAIGN_FIELDS, "items", "images", "coverImage", "contributorsCount", "isFollowing"].sort();
    expect(Object.keys(view!).sort()).toEqual(expected);
    // Same object the project page leads with.
    const page = await anonCaller().projects.getPublic({ key: String(applicationId) });
    expect(Object.keys(page.front!).sort()).toEqual(expected);
    expect(page.front!.id).toBe(id);
  });
});

describe("keys", () => {
  it.skipIf(skipIfNoDb)("an application key opens the project with its live campaign in front", async () => {
    const applicationId = await createApprovedApplication(OWNER, { name: "Test Fixture Land Río Verde" });
    const id = await makeCampaign(applicationId, "Front");
    const page = await anonCaller().projects.getPublic({ key: `${applicationId}-anything-at-all` });
    expect(page.canonicalPath).toBe(`/project/${applicationId}-test-fixture-land-rio-verde`);
    expect(page.project).toEqual({
      applicationId,
      name: "Test Fixture Land Río Verde",
      location: "Test Valley, Portugal",
      country: "Portugal",
      isDemo: false,
    });
    expect(page.front!.id).toBe(id);
    expect(page.isSteward).toBe(false);
    expect(page.campaigns.map((c) => c.id)).toEqual([id]);
    expect(page.campaigns[0].path).toMatch(new RegExp(`^/project/${applicationId}-`));
  });

  it.skipIf(skipIfNoDb)("a campaign key for a campaign with an application canonicalizes to the application", async () => {
    const applicationId = await createApprovedApplication(OWNER, { name: "Test Fixture Land Canon" });
    const id = await makeCampaign(applicationId, "Canon");
    const page = await anonCaller().projects.getPublic({ key: `c${id}-old-name` });
    expect(page.canonicalPath).toBe(`/project/${applicationId}-test-fixture-land-canon`);
    expect(page.project.applicationId).toBe(applicationId);
  });

  it.skipIf(skipIfNoDb)("a demo campaign with no application has its own c-key page", async () => {
    const id = await makeCampaign(undefined, "Demo");
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
    const page = await anonCaller().projects.getPublic({ key: `c${id}` });
    expect(page.canonicalPath).toBe(`/project/c${id}-test-project-demo`);
    expect(page.project).toMatchObject({ applicationId: null, name: "Test Project Demo", isDemo: true });
    expect(page.front!.id).toBe(id);
    // An example takes practice runs (decision B12c): a receipt, no row.
    await expect(anonCaller().campaigns.submitContribution({
      campaignId: id, contributionType: "resource", title: "Test real offer", estimatedValue: 10,
      contributorName: "Visitor", contributorEmail: "visitor@example.com",
    })).resolves.toEqual({ id: null, success: true, practice: true });
    expect(await dbHelpers.getContributionsByCampaign(id)).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("?campaign= puts any of the project's campaigns in front, and stewards see what waits in each", async () => {
    const applicationId = await createApprovedApplication(OWNER, { name: "Test Fixture Land Two Camps" });
    const older = await makeCampaign(applicationId, "Older");
    const newer = await makeCampaign(applicationId, "Newer");
    await anonCaller().campaigns.submitContribution({
      campaignId: older, contributionType: "resource", title: "Test offer on the older one", estimatedValue: 10,
      contributorName: "Someone", contributorEmail: "someone@example.com",
    });
    // Without a focus the newest live one leads; with one, that campaign does.
    expect((await anonCaller().projects.getPublic({ key: String(applicationId) })).front!.id).toBe(newer);
    expect((await anonCaller().projects.getPublic({ key: String(applicationId), campaign: older })).front!.id).toBe(older);
    // A campaign from another project is ignored.
    const otherApp = await createApprovedApplication(OWNER);
    const elsewhere = await makeCampaign(otherApp, "Elsewhere");
    expect((await anonCaller().projects.getPublic({ key: String(applicationId), campaign: elsewhere })).front!.id).toBe(newer);
    // Past-campaign links carry the focus.
    const page = await stewardCaller(OWNER).projects.getPublic({ key: String(applicationId) });
    expect(page.campaigns.find((c) => c.id === older)!.path.endsWith(`?campaign=${older}`)).toBe(true);
    expect(page.stewardWaiting[older]).toBe(1);
    expect(page.stewardWaiting[newer]).toBe(0);
    // Visitors get no counts.
    expect((await anonCaller().projects.getPublic({ key: String(applicationId) })).stewardWaiting).toEqual({});
  });

  it.skipIf(skipIfNoDb)("junk keys and missing projects are NOT_FOUND", async () => {
    for (const key of ["", "abc", "c", "999999998-", "-12", "c0", "999999999-nope", "12;drop", "C12", "12-Upper"]) {
      await expect(anonCaller().projects.getPublic({ key }), key).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });
});

describe("who sees what", () => {
  it.skipIf(skipIfNoDb)("a draft is hidden from visitors and shown to a steward who did not create it", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const id = await makeCampaign(applicationId, "Draft", false); // stays pending_review

    const visitor = await anonCaller().projects.getPublic({ key: String(applicationId) });
    expect(visitor.front).toBeNull();
    expect(visitor.campaigns).toEqual([]);
    expect(visitor.isSteward).toBe(false);

    const stranger = await stewardCaller(STRANGER).projects.getPublic({ key: String(applicationId) });
    expect(stranger.front).toBeNull();

    const steward = await stewardCaller(CO_STEWARD).projects.getPublic({ key: String(applicationId) });
    expect(steward.isSteward).toBe(true);
    expect(steward.front!.id).toBe(id);
    expect(steward.front!.status).toBe("pending_review");
    // And the same steward can open it by getById (canViewCampaign).
    expect(await stewardCaller(CO_STEWARD).campaigns.getById({ id })).not.toBeNull();
    expect(await anonCaller().campaigns.getById({ id })).toBeNull();
  });

  it.skipIf(skipIfNoDb)("an application still in review with nothing live has no public page", async () => {
    const applicationId = await createApprovedApplication(OWNER, { status: "submitted" });
    await expect(anonCaller().projects.getPublic({ key: String(applicationId) })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const own = await stewardCaller(OWNER).projects.getPublic({ key: String(applicationId) });
    expect(own.isSteward).toBe(true);
    expect(own.front).toBeNull();
  });

  it.skipIf(skipIfNoDb)("no private application column leaves the server", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const database = await dbHelpers.getDb();
    await database!.update(applications)
      .set({ companionTranscript: "PRIVATE-TRANSCRIPT", documentsUrl: "https://private.example/docs", fundingNeeds: "PRIVATE-FUNDING" } as any)
      .where(eq(applications.id, applicationId));
    await makeCampaign(applicationId, "Private");
    for (const caller of [anonCaller(), stewardCaller(OWNER)]) {
      const page = await caller.projects.getPublic({ key: String(applicationId) });
      expect(Object.keys(page.project).sort()).toEqual(["applicationId", "country", "isDemo", "location", "name"]);
      const json = JSON.stringify(page);
      for (const secret of ["PRIVATE-TRANSCRIPT", "private.example", "PRIVATE-FUNDING", "Fixture governance", "Fixture time"]) {
        expect(json).not.toContain(secret);
      }
      expect(json).not.toContain("adminNotes");
    }
  });

  it.skipIf(skipIfNoDb)("a cancelled front campaign comes with suggestions", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const id = await makeCampaign(applicationId, "Cancelled front");
    const live = await makeCampaign(undefined, "Somewhere live");
    await stewardCaller(OWNER).campaigns.cancel({ id });
    const page = await anonCaller().projects.getPublic({ key: String(applicationId) });
    expect(page.front!.status).toBe("cancelled");
    expect(page.suggestions.length).toBeGreaterThan(0);
    expect(page.suggestions.every((s) => s.id !== id)).toBe(true);
    for (const s of page.suggestions) {
      expect(Object.keys(s).sort()).toEqual(["country", "id", "isDemo", "location", "path", "projectName", "title"]);
    }
    void live;
  });
});

describe("small steward reads", () => {
  it.skipIf(skipIfNoDb)("canSteward, followerCounts and suggestAlternatives answer only what they should", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const live = await makeCampaign(applicationId, "Small reads");
    const draft = await makeCampaign(applicationId, "Small reads draft", false);

    expect(await stewardCaller(CO_STEWARD).campaigns.canSteward({ campaignId: live })).toBe(true);
    expect(await stewardCaller(STRANGER).campaigns.canSteward({ campaignId: live })).toBe(false);
    expect(await stewardCaller(STRANGER).campaigns.canSteward({ campaignId: 999999999 })).toBe(false);

    await stewardCaller(STRANGER).campaigns.follow({ campaignId: live });
    await anonCaller().campaigns.subscribeByEmail({ campaignId: live, email: `small.reads.${Date.now()}@example.com` });
    expect(await stewardCaller(CO_STEWARD).campaigns.followerCounts({ campaignId: live })).toEqual({ accounts: 1, emails: 1 });
    await expect(stewardCaller(STRANGER).campaigns.followerCounts({ campaignId: live })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await stewardCaller(STRANGER).campaigns.unfollow({ campaignId: live });
    const database = await dbHelpers.getDb();
    const { campaignFollowers } = await import("../drizzle/schema");
    await database!.delete(campaignFollowers).where(eq(campaignFollowers.campaignId, live));

    // A draft is invisible to visitors, so its suggestions are too.
    expect(await anonCaller().campaigns.suggestAlternatives({ campaignId: draft })).toEqual([]);
    const forLive = await anonCaller().campaigns.suggestAlternatives({ campaignId: live });
    for (const s of forLive) {
      expect(s.id).not.toBe(live);
      expect(Object.keys(s).sort()).toEqual(["country", "id", "isDemo", "location", "path", "projectName", "title"]);
    }
  });
});

describe("pickFrontCampaign", () => {
  const c = (id: number, status: string, day: number) => ({ id, status, createdAt: new Date(2026, 0, day) }) as any;
  it("prefers the newest live campaign, then (for stewards) one in review, then the newest past one", () => {
    const list = [c(1, "completed", 1), c(2, "active", 2), c(3, "active", 3), c(4, "draft", 4), c(5, "cancelled", 5)];
    expect(pickFrontCampaign(list, false)!.id).toBe(3);
    expect(pickFrontCampaign(list.filter((x) => x.status !== "active"), true)!.id).toBe(4);
    expect(pickFrontCampaign(list.filter((x) => x.status !== "active"), false)!.id).toBe(5);
    expect(pickFrontCampaign([], true)).toBeNull();
  });
});
