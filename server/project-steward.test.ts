/**
 * The project steward gate (server/lib/project-steward.ts), against a real
 * database: each of the four steward sources, admins, and strangers.
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns } from "../drizzle/schema";
import {
  canStewardApplication,
  canStewardCampaign,
  canViewCampaign,
  getApplicationStewardIds,
  getCampaignStewardIds,
} from "./lib/project-steward";
import {
  cleanupFixtureApplications,
  createApprovedApplication,
  createApprovedLandClaim,
  ctxFor,
} from "./test-fixtures/crowdpool";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));

const skipIfNoDb = !process.env.DATABASE_URL;

const CREATOR = 986101;
const APPLICANT = 986102;
const STEWARD_USER = 986103;
const CLAIM_HOLDER = 986104;
const PENDING_CLAIM = 986105;
const STRANGER = 986106;

const user = (id: number, role: "user" | "admin" | "superadmin" = "user") => ctxFor(id, role).user;

const createdCampaignIds: number[] = [];

async function insertCampaign(userId: number, applicationId: number | null, status: "draft" | "active" = "draft") {
  const database = await dbHelpers.getDb();
  const result: any = await database!.insert(campaigns).values({
    userId,
    applicationId,
    status,
    title: "Test Steward Campaign",
    description: "Steward fixture",
    projectName: "Test Steward Project",
  });
  const id = Number(result?.[0]?.insertId);
  createdCampaignIds.push(id);
  return (await dbHelpers.getCampaignById(id))!;
}

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  for (const id of createdCampaignIds) await database!.delete(campaigns).where(eq(campaigns.id, id));
  await cleanupFixtureApplications();
});

describe("project stewards", () => {
  it.skipIf(skipIfNoDb)("counts the creator, applicant, stewardUserId and approved land_project claim holders", async () => {
    const appId = await createApprovedApplication(APPLICANT, { stewardUserId: STEWARD_USER });
    await createApprovedLandClaim(CLAIM_HOLDER, appId, "approved");
    await createApprovedLandClaim(PENDING_CLAIM, appId, "pending");
    const campaign = await insertCampaign(CREATOR, appId);

    const ids = await getCampaignStewardIds(campaign);
    expect(ids.sort()).toEqual([CREATOR, APPLICANT, STEWARD_USER, CLAIM_HOLDER].sort());
    expect(await getApplicationStewardIds(appId)).not.toContain(CREATOR);

    for (const id of [CREATOR, APPLICANT, STEWARD_USER, CLAIM_HOLDER]) {
      expect(await canStewardCampaign(user(id), campaign), `user ${id}`).toBe(true);
    }
    expect(await canStewardCampaign(user(PENDING_CLAIM), campaign)).toBe(false);
    expect(await canStewardCampaign(user(STRANGER), campaign)).toBe(false);
    expect(await canStewardCampaign(null, campaign)).toBe(false);

    expect(await canStewardApplication(user(CLAIM_HOLDER), appId)).toBe(true);
    expect(await canStewardApplication(user(CREATOR), appId)).toBe(false);
  });

  it.skipIf(skipIfNoDb)("lets admins and superadmins in without putting them on recipient lists", async () => {
    const appId = await createApprovedApplication(APPLICANT);
    const campaign = await insertCampaign(CREATOR, appId);
    expect(await canStewardCampaign(user(STRANGER, "admin"), campaign)).toBe(true);
    expect(await canStewardCampaign(user(STRANGER, "superadmin"), campaign)).toBe(true);
    expect(await canStewardApplication(user(STRANGER, "superadmin"), appId)).toBe(true);
    expect(await getCampaignStewardIds(campaign)).not.toContain(STRANGER);
  });

  it.skipIf(skipIfNoDb)("does not count a claim on another kind of org with the same id", async () => {
    const appId = await createApprovedApplication(APPLICANT);
    const database = await dbHelpers.getDb();
    const { orgClaims } = await import("../drizzle/schema");
    const res: any = await database!.insert(orgClaims).values({
      userId: STRANGER, orgType: "alliance_org", orgId: String(appId), orgName: "Test Fixture Land alliance", status: "approved",
    });
    try {
      expect(await canStewardApplication(user(STRANGER), appId)).toBe(false);
    } finally {
      await database!.delete(orgClaims).where(eq(orgClaims.id, Number(res?.[0]?.insertId)));
    }
  });

  it.skipIf(skipIfNoDb)("shows a draft to its stewards only, and a live campaign to everyone", async () => {
    const appId = await createApprovedApplication(APPLICANT);
    await createApprovedLandClaim(CLAIM_HOLDER, appId, "approved");
    const draft = await insertCampaign(CREATOR, appId, "draft");
    expect(await canViewCampaign(user(CLAIM_HOLDER), draft)).toBe(true);
    expect(await canViewCampaign(user(APPLICANT), draft)).toBe(true);
    expect(await canViewCampaign(user(STRANGER), draft)).toBe(false);
    expect(await canViewCampaign(null, draft)).toBe(false);

    const live = await insertCampaign(CREATOR, null, "active");
    expect(await canViewCampaign(null, live)).toBe(true);
    // No application: only the creator (and admins) steward it.
    expect(await getCampaignStewardIds(live)).toEqual([CREATOR]);
  });
});
