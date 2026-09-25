/**
 * Roles measured in hours a week (2026-09-24, crowdpool contract 3).
 *
 * A role need with capacityUnit 'hours_per_week' counts hours: people offer
 * the hours they can give, a steward accepts each person at a number of
 * hours, and the role reads filled when accepted hours reach the hours it
 * needs. Offers are never refused while the role is open; accepts can never
 * pass the hours needed, even when five land at once.
 *
 * Run against the SCRATCH database, never production.
 */
import { realOffer } from "./test-fixtures/crowdpool";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
import { expireCrowdpoolClaims } from "./routes/batchJobs";
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
const STEWARD = 986301;
const createdCampaignIds: number[] = [];

async function hoursCampaign(title: string, hours = 40, value = 8000) {
  const applicationId = await createApprovedApplication(STEWARD);
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Hours ${title}`,
    description: "Hours fixture",
    projectName: `Test Hours ${title}`,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: [{ category: "role", kind: "role", roleTitle: "Soil scientist", hoursPerWeek: hours, estimatedValue: value }],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const items = await stewardCaller(STEWARD).campaigns.getItems({ campaignId: id });
  return { campaignId: id, itemId: items[0].id as number };
}

function offer(campaignId: number, itemId: number, hours: number | undefined, name: string) {
  return realOffer(anonCaller().campaigns.submitContribution({
    campaignId,
    campaignItemId: itemId,
    contributionType: "role",
    title: `${name} offers help`,
    contributorName: name,
    contributorEmail: `${name.toLowerCase()}@example.com`,
    ...(hours !== undefined ? { hoursPerWeek: hours } : {}),
    roleTitle: "Soil scientist",
    estimatedValue: 999999, // the server prices role offers itself
  }));
}

const steward = () => stewardCaller(STEWARD);
const item = async (id: number) => (await dbHelpers.getCampaignItemById(id))!;
const contribution = async (id: number) => (await dbHelpers.getContributionById(id))!;
const accept = (contributionId: number, acceptedHours?: number) =>
  steward().campaigns.updateContributionStatus({ contributionId, status: "accepted", ...(acceptedHours ? { acceptedHours } : {}) });

beforeAll(async () => {
  if (skipIfNoDb) return;
  const profile = await dbHelpers.getPlayerProfileByUserId(STEWARD);
  if (!profile) await dbHelpers.createPlayerProfile({ userId: STEWARD, displayName: "Hours Steward" });
});

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

describe("creating a role", () => {
  it.skipIf(skipIfNoDb)("stores the hours a week as the role's capacity", async () => {
    const { itemId } = await hoursCampaign("Create", 120, 24000);
    const row = await item(itemId);
    expect(row.capacityUnit).toBe("hours_per_week");
    expect(row.quantityWanted).toBe(120);
    expect(row.hoursPerWeek).toBe(120);
  });

  it.skipIf(skipIfNoDb)("an Other Needs item with kind 'role' (Wellness, Arts...) stays a count need and needs no hours", async () => {
    // The exact shape CreateCampaign's Other Needs step sends (CreateCampaign.tsx otherNeeds.map).
    const applicationId = await createApprovedApplication(STEWARD);
    const { id } = await stewardCaller(STEWARD).campaigns.create({
      title: "Test Hours Other needs",
      description: "Other needs fixture",
      projectName: "Test Hours Other needs",
      currency: "USD",
      financialTarget: 1000,
      applicationId,
      items: [
        { category: "resource", kind: "role", capitalType: "health", resourceName: "Yoga classes", resourceQuantity: 1, resourceUnit: "wellness", estimatedValue: 500 },
      ],
    });
    createdCampaignIds.push(id);
    const [row] = await stewardCaller(STEWARD).campaigns.getItems({ campaignId: id });
    expect(row.kind).toBe("role");
    expect(row.capacityUnit).toBe("count");
    expect(row.quantityWanted).toBe(1);
  });
});

describe("offering hours", () => {
  it.skipIf(skipIfNoDb)("an open role takes a 10-hour offer and a 50-hour offer; neither is blocked", async () => {
    const { campaignId, itemId } = await hoursCampaign("Open offers");
    const small = await offer(campaignId, itemId, 10, "Ten");
    const big = await offer(campaignId, itemId, 50, "Fifty");
    const a = await contribution(small.id);
    const b = await contribution(big.id);
    expect(a.status).toBe("pending");
    expect(a.quantityPledged).toBe(10);
    expect(a.hoursPerWeek).toBe(10);
    expect(a.claimExpiresAt).toBeNull();
    // Priced by the server: a quarter of an $8,000, 40-hour role.
    expect(a.estimatedValue).toBe(2000);
    expect(b.quantityPledged).toBe(50);
    expect(b.estimatedValue).toBe(8000); // capped at the whole role's value
    expect((await item(itemId)).quantityClaimed).toBe(0); // offers reserve nothing
  });

  it.skipIf(skipIfNoDb)("asks for whole hours when the offer has none", async () => {
    const { campaignId, itemId } = await hoursCampaign("No hours");
    await expect(offer(campaignId, itemId, undefined, "Vague")).rejects.toThrow(/how many hours a week/);
  });
});

describe("accepting at hours", () => {
  it.skipIf(skipIfNoDb)("accepts, caps at the hours needed, fills, closes to new offers, and reopens on release", async () => {
    const { campaignId, itemId } = await hoursCampaign("Fill");
    const ten = await offer(campaignId, itemId, 10, "Ana");
    const fifty = await offer(campaignId, itemId, 50, "Bo");

    await accept(ten.id);
    let need = await item(itemId);
    expect(need.quantityClaimed).toBe(10);
    expect((await contribution(ten.id)).estimatedValue).toBe(2000);
    expect((await dbHelpers.getCampaignById(campaignId))!.pledgedTotal).toBe(2000);

    // 50 would pass the 40 the role needs.
    await expect(accept(fifty.id)).rejects.toThrow("Only 30 hours a week are still open on this role. Lower the hours to 30 or fewer, or raise the hours the role needs.");
    expect((await contribution(fifty.id)).status).toBe("pending");

    // Accept Bo at 30 instead: the role fills.
    const res = await accept(fifty.id, 30);
    expect(res).toMatchObject({ acceptedHours: 30, roleFilled: true });
    need = await item(itemId);
    expect(need.quantityClaimed).toBe(40);
    const bo = await contribution(fifty.id);
    expect(bo.quantityPledged).toBe(30);
    expect(bo.hoursPerWeek).toBe(50); // the original offer is kept
    expect(bo.estimatedValue).toBe(6000);

    // Filled: a new offer is refused.
    await expect(offer(campaignId, itemId, 5, "Late")).rejects.toThrow(/filled right now/);

    // Release Bo: 30 hours go back and the role opens again.
    await steward().campaigns.updateContributionStatus({ contributionId: fifty.id, status: "released" });
    expect((await contribution(fifty.id)).status).toBe("released");
    expect((await item(itemId)).quantityClaimed).toBe(10);
    expect((await dbHelpers.getCampaignById(campaignId))!.pledgedTotal).toBe(2000);
    await expect(offer(campaignId, itemId, 5, "Welcome")).resolves.toMatchObject({ success: true });
  });

  it.skipIf(skipIfNoDb)("tightens the transitions: no decline after accept, no re-accept after delivery", async () => {
    const { campaignId, itemId } = await hoursCampaign("Transitions");
    const c = await offer(campaignId, itemId, 10, "Cy");
    await accept(c.id);
    await expect(steward().campaigns.updateContributionStatus({ contributionId: c.id, status: "rejected" }))
      .rejects.toThrow("This place is already accepted. Use Release to free it up.");
    await steward().campaigns.updateContributionStatus({ contributionId: c.id, status: "fulfilled" });
    await expect(accept(c.id)).rejects.toThrow(/Only an offer that is waiting can be accepted/);
    expect((await item(itemId)).quantityClaimed).toBe(10);
  });

  it.skipIf(skipIfNoDb)("five accepts at once on a 40-hour role never pass 40", async () => {
    const { campaignId, itemId } = await hoursCampaign("Race");
    const ids: number[] = [];
    for (const name of ["R1", "R2", "R3", "R4", "R5"]) ids.push((await offer(campaignId, itemId, 10, name)).id);
    const results = await Promise.allSettled(ids.map((id) => stewardCaller(STEWARD).campaigns.updateContributionStatus({ contributionId: id, status: "accepted" })));
    const accepted = results.filter((r) => r.status === "fulfilled").length;
    const need = await item(itemId);
    expect(need.quantityClaimed).toBeLessThanOrEqual(40);
    expect(need.quantityClaimed).toBe(accepted * 10);
    expect(accepted).toBe(4);
    const rows = await Promise.all(ids.map(contribution));
    expect(rows.filter((r) => r.status === "accepted")).toHaveLength(4);
  });
});

describe("changing hours", () => {
  it.skipIf(skipIfNoDb)("setAcceptedHours lowers and raises within the open hours", async () => {
    const { campaignId, itemId } = await hoursCampaign("Adjust");
    const a = await offer(campaignId, itemId, 30, "Adj1");
    const b = await offer(campaignId, itemId, 10, "Adj2");
    await accept(a.id);
    await accept(b.id);
    expect((await item(itemId)).quantityClaimed).toBe(40);
    await steward().campaigns.setAcceptedHours({ contributionId: a.id, hours: 20 });
    expect((await item(itemId)).quantityClaimed).toBe(30);
    expect((await contribution(a.id)).estimatedValue).toBe(4000);
    await expect(steward().campaigns.setAcceptedHours({ contributionId: a.id, hours: 35 }))
      .rejects.toThrow(/Only 30 hours a week are still open/);
    await steward().campaigns.setAcceptedHours({ contributionId: a.id, hours: 30 });
    expect((await item(itemId)).quantityClaimed).toBe(40);
  });

  it.skipIf(skipIfNoDb)("setNeedHours never drops below the accepted hours, and scales the value", async () => {
    const { campaignId, itemId } = await hoursCampaign("Need hours");
    const a = await offer(campaignId, itemId, 30, "Nh1");
    await accept(a.id);
    await expect(steward().campaigns.setNeedHours({ itemId, hoursNeeded: 20 }))
      .rejects.toThrow("30 hours a week are already accepted. Release someone or lower their hours first.");
    await steward().campaigns.setNeedHours({ itemId, hoursNeeded: 60 });
    const need = await item(itemId);
    expect(need.quantityWanted).toBe(60);
    expect(need.hoursPerWeek).toBe(60);
    expect(need.estimatedValue).toBe(12000);
    const c = (await dbHelpers.getCampaignById(campaignId))!;
    expect(c.totalValue).toBe(12000);
    expect(c.rolesValue).toBe(12000);
  });

  it.skipIf(skipIfNoDb)("a stranger cannot change hours", async () => {
    const { campaignId, itemId } = await hoursCampaign("Stranger hours");
    const a = await offer(campaignId, itemId, 10, "Sh1");
    await accept(a.id);
    await expect(stewardCaller(986399).campaigns.setNeedHours({ itemId, hoursNeeded: 80 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stewardCaller(986399).campaigns.setAcceptedHours({ contributionId: a.id, hours: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("delivery and the sweep", () => {
  it.skipIf(skipIfNoDb)("delivered equals the holder's hours, and a repeated fulfil changes nothing", async () => {
    const { campaignId, itemId } = await hoursCampaign("Deliver");
    const a = await offer(campaignId, itemId, 15, "Del1");
    await accept(a.id);
    const first = await steward().campaigns.updateContributionStatus({ contributionId: a.id, status: "fulfilled" });
    expect(first).toMatchObject({ changed: true });
    const second = await steward().campaigns.updateContributionStatus({ contributionId: a.id, status: "fulfilled" });
    expect(second).toMatchObject({ changed: false });
    const need = await item(itemId);
    expect(need.quantityDelivered).toBe(15);
    expect(need.quantityClaimed).toBe(15);
  });

  it.skipIf(skipIfNoDb)("the nightly sweep leaves an accepted hours holder alone, even with a past expiry", async () => {
    const { campaignId, itemId } = await hoursCampaign("Sweep");
    const a = await offer(campaignId, itemId, 10, "Sw1");
    await accept(a.id);
    const database = await dbHelpers.getDb();
    await database!.update(campaignContributions)
      .set({ claimExpiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) })
      .where(eq(campaignContributions.id, a.id));
    await expireCrowdpoolClaims(database);
    expect((await contribution(a.id)).status).toBe("accepted");
    expect((await item(itemId)).quantityClaimed).toBe(10);
  });
});

describe("a legacy role still on 'count'", () => {
  it.skipIf(skipIfNoDb)("behaves as one slot until 0251 converts it", async () => {
    const { campaignId } = await hoursCampaign("Legacy");
    const database = await dbHelpers.getDb();
    const inserted: any = await database!.insert(campaignItems).values({
      campaignId,
      category: "role",
      kind: "role",
      capitalType: "social",
      capacityUnit: "count",
      roleTitle: "Legacy organiser",
      hoursPerWeek: 20,
      quantityWanted: 1,
      estimatedValue: 4000,
    });
    const legacyId = Number(inserted?.[0]?.insertId);
    const first = await realOffer(anonCaller().campaigns.submitContribution({
      campaignId,
      campaignItemId: legacyId,
      contributionType: "role",
      title: "Legacy slot",
      contributorName: "Leg",
      contributorEmail: "leg@example.com",
      quantityPledged: 1,
      estimatedValue: 4000,
    }));
    const row = await contribution(first.id);
    expect(row.quantityPledged).toBe(1);
    expect(row.estimatedValue).toBe(4000); // client value, as before
    expect(row.claimExpiresAt).not.toBeNull(); // count claims still expire
    await accept(first.id);
    expect((await item(legacyId)).quantityClaimed).toBe(1);
    await expect(anonCaller().campaigns.submitContribution({
      campaignId,
      campaignItemId: legacyId,
      contributionType: "role",
      title: "Legacy second",
      contributorName: "Leg2",
      contributorEmail: "leg2@example.com",
      quantityPledged: 1,
      estimatedValue: 4000,
    })).rejects.toThrow(/fully claimed/);
  });
});
