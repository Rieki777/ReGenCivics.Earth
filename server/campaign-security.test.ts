/**
 * Campaign security regressions, 2026-09-24. Each block pins a hole that was
 * open in production and fails if it reopens:
 *
 *   1. campaigns.updateStatus let an owner set ANY status (publish past
 *      review, mark their own campaign complete).
 *   2. campaigns.create checked nothing: any signed-in user, any
 *      applicationId, behind a shared client-side password ("222").
 *   3. applicantsForCampaign.list gave every signed-in user every
 *      submitted/approved/active application.
 *   4. Steward checks compared campaign.userId inline, so the rule for who
 *      may act lived in eight places (now server/lib/project-steward.ts).
 *   5. Children of an unpublished campaign (needs, activity, updates) were
 *      readable by id even though getById hid the campaign.
 *   6. Contribution emails interpolated names and steward notes raw.
 *
 * Run against the SCRATCH database, never production.
 */
import { realOffer } from "./test-fixtures/crowdpool";
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, playerProfiles, userFollows } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  createApprovedLandClaim,
  stewardCaller,
} from "./test-fixtures/crowdpool";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));

// Real templates (section 6 tests them), no real sends.
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

const skipIfNoDb = !process.env.DATABASE_URL;

const OWNER = 986201;
const OTHER = 986202;
const APPLICANT = 986203;
const CLAIMER = 986204;
const STRANGER = 986205;
const CO_STEWARD = 986206;

const createdCampaignIds: number[] = [];

const baseCampaign = (title: string) => ({
  title: `Test Security ${title}`,
  description: "Security fixture",
  projectName: `Test Security ${title}`,
  currency: "USD",
  financialTarget: 1000,
  items: [
    { category: "resource" as const, resourceName: "Seed", resourceDescription: "Seed", estimatedValue: 1000 },
  ],
});

/** A campaign OWNER created for their own approved application, in pending_review. */
async function ownersCampaign(title: string) {
  const applicationId = await createApprovedApplication(OWNER);
  const { id } = await stewardCaller(OWNER).campaigns.create({ ...baseCampaign(title), applicationId });
  createdCampaignIds.push(id);
  return { id, applicationId };
}

async function statusOf(id: number) {
  return (await dbHelpers.getCampaignById(id))!.status;
}

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  for (const id of createdCampaignIds) {
    await database!.delete(campaignContributions).where(eq(campaignContributions.campaignId, id));
    await database!.delete(campaigns).where(eq(campaigns.id, id));
  }
  await cleanupFixtureApplications();
});

describe("1. status transitions", () => {
  it.skipIf(skipIfNoDb)("an owner cannot publish, complete, fund or reject their own campaign", async () => {
    const { id } = await ownersCampaign("No self publish");
    const owner = stewardCaller(OWNER);
    for (const status of ["active", "completed", "funded", "rejected"] as const) {
      await expect(owner.campaigns.updateStatus({ id, status }), status).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(await statusOf(id)).toBe("pending_review");

    // Once an admin publishes it, the owner still cannot mark it complete.
    await adminCaller().campaigns.updateStatus({ id, status: "active", reviewNotes: "Looks good" });
    await expect(owner.campaigns.updateStatus({ id, status: "completed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(owner.campaigns.updateStatus({ id, status: "funded" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const row = await dbHelpers.getCampaignById(id);
    expect(row!.status).toBe("active");
    expect(row!.reviewedAt).toBeTruthy();
    expect(row!.adminNotes).toBe("Looks good");
  });

  it.skipIf(skipIfNoDb)("an owner can send a draft for review, and can cancel", async () => {
    const { id } = await ownersCampaign("Draft to review");
    await adminCaller().campaigns.updateStatus({ id, status: "draft" });
    await stewardCaller(OWNER).campaigns.submitForReview({ id });
    expect(await statusOf(id)).toBe("pending_review");

    await adminCaller().campaigns.updateStatus({ id, status: "draft" });
    await stewardCaller(OWNER).campaigns.updateStatus({ id, status: "pending_review" });
    expect(await statusOf(id)).toBe("pending_review");

    await stewardCaller(OWNER).campaigns.updateStatus({ id, status: "cancelled" });
    expect(await statusOf(id)).toBe("cancelled");
    // Cancelled is terminal, even for an admin.
    await expect(adminCaller().campaigns.updateStatus({ id, status: "active" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.skipIf(skipIfNoDb)("a stranger cannot move a campaign at all", async () => {
    const { id } = await ownersCampaign("Stranger status");
    await expect(stewardCaller(STRANGER).campaigns.updateStatus({ id, status: "cancelled" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stewardCaller(STRANGER).campaigns.submitForReview({ id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("2. who can start a campaign", () => {
  it.skipIf(skipIfNoDb)("a non-admin needs an approved application they applied for or steward", async () => {
    const me = stewardCaller(OTHER);
    // No application at all.
    await expect(me.campaigns.create(baseCampaign("No app"))).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Someone else's approved application.
    const theirs = await createApprovedApplication(OWNER);
    await expect(me.campaigns.create({ ...baseCampaign("Theirs"), applicationId: theirs }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    // My own, still under review.
    const submitted = await createApprovedApplication(OTHER, { status: "submitted" });
    await expect(me.campaigns.create({ ...baseCampaign("Submitted"), applicationId: submitted }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    // My own, approved.
    const mine = await createApprovedApplication(OTHER);
    const ok = await me.campaigns.create({ ...baseCampaign("Mine"), applicationId: mine });
    createdCampaignIds.push(ok.id);
    // An approved application where I am the stewardUserId.
    const stewarded = await createApprovedApplication(OWNER, { stewardUserId: OTHER, status: "active" });
    const ok2 = await me.campaigns.create({ ...baseCampaign("Stewarded"), applicationId: stewarded });
    createdCampaignIds.push(ok2.id);
  });

  it.skipIf(skipIfNoDb)("an admin can start one without an application", async () => {
    const { id } = await adminCaller().campaigns.create(baseCampaign("Admin made"));
    createdCampaignIds.push(id);
    expect(id).toBeGreaterThan(0);
  });

  it.skipIf(skipIfNoDb)("the shared-password procedure is gone", () => {
    const procedures = (appRouter as any)._def.procedures as Record<string, unknown>;
    expect(procedures["campaigns.verifyCampaignAccess"]).toBeUndefined();
    expect(procedures["campaigns.create"]).toBeDefined();
  });

  it.skipIf(skipIfNoDb)("stores a role's hours as its capacity, and refuses a role with none", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const role = {
      category: "role" as const, kind: "role" as const, roleTitle: "Soil scientist",
      quantityWanted: 3, estimatedValue: 8000,
    };
    await expect(stewardCaller(OWNER).campaigns.create({ ...baseCampaign("Role no hours"), applicationId, items: [role] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Each role needs the hours a week it asks for." });
    const { id } = await stewardCaller(OWNER).campaigns.create({
      ...baseCampaign("Role hours"), applicationId, items: [{ ...role, hoursPerWeek: 120 }],
    });
    createdCampaignIds.push(id);
    const [need] = await dbHelpers.getCampaignItems(id);
    expect(need).toMatchObject({ kind: "role", capacityUnit: "hours_per_week", quantityWanted: 120, hoursPerWeek: 120 });
  });

  it.skipIf(skipIfNoDb)("sanitizes the campaign title and project name", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const { id } = await stewardCaller(OWNER).campaigns.create({
      ...baseCampaign("x"), applicationId,
      title: "Test <img src=x onerror=alert(1)>Trees", projectName: "Test <b>Farm</b>",
    });
    createdCampaignIds.push(id);
    const row = await dbHelpers.getCampaignById(id);
    expect(row!.title).not.toContain("<img");
    expect(row!.projectName).not.toContain("<b>");
  });
});

describe("3. the applicant list", () => {
  it.skipIf(skipIfNoDb)("gives a non-admin only their own approved or active applications, with no contactName", async () => {
    const mineApproved = await createApprovedApplication(APPLICANT);
    const mineSubmitted = await createApprovedApplication(APPLICANT, { status: "submitted" });
    const stewarded = await createApprovedApplication(OWNER, { stewardUserId: APPLICANT, status: "active" });
    const someoneElse = await createApprovedApplication(OWNER);

    const rows = await stewardCaller(APPLICANT).applicantsForCampaign.list({});
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(mineApproved);
    expect(ids).toContain(stewarded);
    expect(ids).not.toContain(mineSubmitted);
    expect(ids).not.toContain(someoneElse);
    for (const r of rows) expect(r).not.toHaveProperty("contactName");
    expect(rows.find((r) => r.id === mineApproved)!.governanceModel).toBe("Fixture governance");

    const adminRows = await adminCaller().applicantsForCampaign.list({});
    expect(adminRows.map((r) => r.id)).toEqual(expect.arrayContaining([mineApproved, mineSubmitted, someoneElse]));
  });
});

describe("4. project stewards act through one gate", () => {
  /** A live campaign OWNER created, with one pending offer. */
  async function liveWithOffer(title: string) {
    const applicationId = await createApprovedApplication(APPLICANT, { stewardUserId: APPLICANT });
    await createApprovedLandClaim(CLAIMER, applicationId, "approved");
    // OWNER is not the applicant here: an admin starts it with OWNER's name on it.
    const { id } = await adminCaller().campaigns.create({ ...baseCampaign(title), applicationId });
    createdCampaignIds.push(id);
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ userId: OWNER }).where(eq(campaigns.id, id));
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    const offer = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: id,
      contributionType: "resource",
      title: "Test offer",
      estimatedValue: 100,
      contributorName: "Test Offerer",
      contributorEmail: `offer-${Date.now()}@example.com`,
    }));
    return { id, offerId: offer.id };
  }

  it.skipIf(skipIfNoDb)("a stranger is refused on accept, updates, cancel and the offer list", async () => {
    const { id, offerId } = await liveWithOffer("Stranger refused");
    const s = stewardCaller(STRANGER);
    await expect(s.campaigns.updateContributionStatus({ contributionId: offerId, status: "accepted" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(s.campaigns.createUpdate({ campaignId: id, title: "Hi", body: "Hi" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(s.campaigns.updateStatus({ id, status: "cancelled" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(s.campaigns.getContributionsForOwner({ campaignId: id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(s.campaigns.getAnalytics({ campaignId: id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await statusOf(id)).toBe("active");
  });

  it.skipIf(skipIfNoDb)("the application's applicant, who did not create the campaign, can answer offers", async () => {
    const { id, offerId } = await liveWithOffer("Applicant accepts");
    const applicant = stewardCaller(APPLICANT);
    const list = await applicant.campaigns.getContributionsForOwner({ campaignId: id });
    expect(list.map((c) => c.id)).toContain(offerId);
    await applicant.campaigns.updateContributionStatus({ contributionId: offerId, status: "accepted" });
    expect((await dbHelpers.getContributionById(offerId))!.status).toBe("accepted");
  });

  it.skipIf(skipIfNoDb)("an approved claim holder can post an update", async () => {
    const { id } = await liveWithOffer("Claimer posts");
    const res = await stewardCaller(CLAIMER).campaigns.createUpdate({ campaignId: id, title: "Test note", body: "Rain came." });
    expect(res.updateNumber).toBe(1);
  });

  it.skipIf(skipIfNoDb)("a co-steward can delete a photo someone else uploaded; a stranger cannot", async () => {
    const applicationId = await createApprovedApplication(OWNER, { stewardUserId: CO_STEWARD });
    const { id } = await stewardCaller(OWNER).campaigns.create({ ...baseCampaign("Photo"), applicationId });
    createdCampaignIds.push(id);
    const imageId = await dbHelpers.addCampaignImage({
      campaignId: id, uploadedByUserId: OWNER, url: "https://example.test/a.jpg", fileKey: "test/a.jpg", category: "land",
    });
    await expect(stewardCaller(STRANGER).campaigns.deleteImage({ imageId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await stewardCaller(CO_STEWARD).campaigns.deleteImage({ imageId });
    expect(await dbHelpers.getCampaignImageById(imageId)).toBeNull();
  });
});

describe("5. unpublished campaigns keep their children private", () => {
  it.skipIf(skipIfNoDb)("needs, activity and updates of a draft read [] to a stranger and to visitors", async () => {
    const { id } = await ownersCampaign("Draft children");
    await adminCaller().campaigns.updateStatus({ id, status: "draft" });
    await dbHelpers.createContribution({
      campaignId: id, contributorName: "Test Hidden", contributorEmail: "hidden@example.com",
      contributionType: "resource", title: "Test hidden offer", status: "accepted",
    });
    await stewardCaller(OWNER).campaigns.createUpdate({ campaignId: id, title: "Test draft note", body: "Private" });

    for (const caller of [stewardCaller(STRANGER), anonCaller()]) {
      expect(await caller.campaigns.getById({ id })).toBeNull();
      expect(await caller.campaigns.getItems({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getActivity({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.listUpdates({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getImages({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getContributions({ campaignId: id })).toEqual([]);
      expect(await caller.campaigns.getPartnerLinks({ campaignId: id })).toEqual([]);
    }

    const owner = stewardCaller(OWNER);
    expect((await owner.campaigns.getItems({ campaignId: id })).length).toBe(1);
    expect((await owner.campaigns.getActivity({ campaignId: id })).length).toBe(1);
    expect((await owner.campaigns.listUpdates({ campaignId: id })).length).toBe(1);
  });

  it.skipIf(skipIfNoDb)("a live campaign's children stay public", async () => {
    const { id } = await ownersCampaign("Live children");
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    expect((await anonCaller().campaigns.getItems({ campaignId: id })).length).toBe(1);
  });
});

describe("6. contribution emails escape what they print", () => {
  it("escapes names, titles and the steward's note", async () => {
    const { emailTemplates } = await vi.importActual<typeof import("./_core/email")>("./_core/email");
    const args = {
      recipientName: '<script>alert("x")</script>Ada',
      contributionTitle: "Seeds &amp; soil",
      campaignTitle: "Plant <b>trees</b>",
      projectName: "Farm",
      projectUrl: "https://regencivics.earth/project/42-farm",
      ownerNotes: '<a href="https://evil.test">claim your prize</a>',
      signUpUrl: "https://regencivics.earth/sign-in?returnTo=%2Fproject%2F42-farm",
    };
    for (const t of [emailTemplates.contributionAccepted, emailTemplates.contributionRejected, emailTemplates.contributionFulfilled]) {
      const { html } = t(args);
      expect(html).not.toContain("<script>");
      expect(html).not.toContain('<a href="https://evil.test">');
      expect(html).not.toContain("<b>trees</b>");
      expect(html).not.toContain("&amp;amp;");
      expect(html).toContain("Make your account");
      expect(html).not.toContain("@");
    }
    const cancelled = emailTemplates.campaignCancelled({
      recipientName: "Ada",
      campaignTitle: "Plant <i>trees</i>",
      projectName: "Farm",
      message: "<img src=x onerror=alert(1)>",
      suggestions: [{ title: "Other <u>camp</u>", place: "Lisbon", url: "https://regencivics.earth/project/c3" }],
      browseUrl: "https://regencivics.earth/campaigns",
      signUpUrl: "https://regencivics.earth/sign-in",
    });
    expect(cancelled.html).not.toContain("<img");
    expect(cancelled.html).not.toContain("<i>trees</i>");
    expect(cancelled.html).not.toContain("<u>camp</u>");
    expect(cancelled.subject).toBe("Plant <i>trees</i> has been cancelled");
  });
});

describe("7. review fixes, 2026-09-24", () => {
  it.skipIf(skipIfNoDb)("an approval refused with CONFLICT leaves the claim pending, so the claimant gets no steward tools", async () => {
    const applicationId = await createApprovedApplication(APPLICANT, { stewardUserId: APPLICANT });
    const { id } = await adminCaller().campaigns.create({ ...baseCampaign("Claim conflict"), applicationId });
    createdCampaignIds.push(id);
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: id, contributionType: "resource", title: "Test offer", estimatedValue: 10,
      contributorName: "Real Person", contributorEmail: `real-${Date.now()}@example.com`, contributorPhone: "+1 555 0100",
    }));
    const claimId = await createApprovedLandClaim(STRANGER, applicationId, "pending");
    await expect(adminCaller().orgClaims.approve({ id: claimId })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await dbHelpers.getOrgClaimById(claimId))!.status).toBe("pending");
    await expect(stewardCaller(STRANGER).campaigns.getContributionsForOwner({ campaignId: id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.skipIf(skipIfNoDb)("the public offer list carries no private notes or account ids, and only offers that stand", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const { id } = await stewardCaller(OWNER).campaigns.create({ ...baseCampaign("Public offers"), applicationId });
    createdCampaignIds.push(id);
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    const offer = (title: string) => realOffer(stewardCaller(CO_STEWARD).campaigns.submitContribution({
      campaignId: id, contributionType: "resource", title, estimatedValue: 10, isAnonymous: true,
      contributorName: "Signed In", contributorEmail: "signed.in@example.com",
    }));
    const declined = await offer("Test declined");
    const accepted = await offer("Test accepted");
    await offer("Test waiting");
    const owner = stewardCaller(OWNER);
    await owner.campaigns.updateContributionStatus({ contributionId: declined.id, status: "rejected", ownerNotes: "PRIVATE: your references did not check out" });
    await owner.campaigns.updateContributionStatus({ contributionId: accepted.id, status: "accepted", ownerNotes: "PRIVATE: see you Tuesday" });

    const rows = await anonCaller().campaigns.getContributions({ campaignId: id });
    expect(rows.map((r) => r.id)).toEqual([accepted.id]);
    for (const r of rows) {
      for (const k of ["ownerNotes", "userId", "referredBy", "hyphaBridgeKey", "playerContributionId", "contributorEmail", "contributorPhone"]) {
        expect(r).not.toHaveProperty(k);
      }
      expect(r.contributorName).toBe("A contributor");
    }
    expect(JSON.stringify(rows)).not.toContain("PRIVATE");
    expect(await anonCaller().campaigns.getContributions({ campaignId: id, status: "rejected" })).toEqual([]);
    // Stewards still see every offer on the public read (and everything on the owner read).
    expect((await owner.campaigns.getContributions({ campaignId: id })).length).toBe(3);
  });

  it.skipIf(skipIfNoDb)("nobody can follow a campaign they cannot see", async () => {
    const { id } = await ownersCampaign("Secret follow");
    await expect(stewardCaller(STRANGER).campaigns.follow({ campaignId: id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(anonCaller().campaigns.subscribeByEmail({ campaignId: id, email: "stranger@example.com" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    // The owner can, and anyone can once it is live.
    await expect(stewardCaller(OWNER).campaigns.follow({ campaignId: id })).resolves.toMatchObject({ success: true });
    await adminCaller().campaigns.updateStatus({ id, status: "active" });
    await expect(stewardCaller(STRANGER).campaigns.follow({ campaignId: id })).resolves.toMatchObject({ success: true });
    const database = await dbHelpers.getDb();
    await database!.delete(userFollows).where(eq(userFollows.targetId, String(id)));
  });

  it.skipIf(skipIfNoDb)("saving email choices without a player profile says so instead of 'Saved'", async () => {
    const NO_PROFILE = 986299;
    const caller = stewardCaller(NO_PROFILE);
    const database = await dbHelpers.getDb();
    await database!.delete(playerProfiles).where(eq(playerProfiles.userId, NO_PROFILE));
    expect((await caller.notifications.prefs.get()).hasProfile).toBe(false);
    await expect(caller.notifications.prefs.set({ campaignsEmail: "daily" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    await dbHelpers.createPlayerProfile({ userId: NO_PROFILE, displayName: "Prefs Tester" });
    try {
      await expect(caller.notifications.prefs.set({ campaignsEmail: "daily" })).resolves.toMatchObject({ success: true });
      // Saving the same value again still reads as saved.
      await expect(caller.notifications.prefs.set({ campaignsEmail: "daily" })).resolves.toMatchObject({ success: true });
      expect((await caller.notifications.prefs.get()).campaignsEmail).toBe("daily");
    } finally {
      await database!.delete(playerProfiles).where(eq(playerProfiles.userId, NO_PROFILE));
    }
  });
});
