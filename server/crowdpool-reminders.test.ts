/**
 * The nightly reminders in expireCrowdpoolClaims (server/routes/batchJobs.ts,
 * build spec 2026-09-25, section 10.5): a place about to pass its delivery
 * window, and a shift coming up. The words say delivery window and place
 * (claim belongs to the token bridge), and both links open the project page
 * focused on the campaign; /campaign/:id only redirects there now.
 *
 * Runs against the SCRATCH database, never production. insertNotification
 * never writes during tests, so it is replaced with a spy here and the
 * reminders are read from its calls.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

const inserted: Array<{ userId: number; title: string; body?: string; link?: string | null; dedupeKey?: string }> = [];
vi.mock("./lib/forum-notify", async (orig) => ({
  ...(await orig<typeof import("./lib/forum-notify")>()),
  insertNotification: vi.fn(async (input: (typeof inserted)[number]) => {
    inserted.push(input);
    return true;
  }),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
import { expireCrowdpoolClaims } from "./routes/batchJobs";
import { adminCaller, cleanupFixtureApplications, createApprovedApplication, stewardCaller } from "./test-fixtures/crowdpool";

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986941;
const CONTRIBUTOR = 986942;
const createdCampaignIds: number[] = [];

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

describe("expireCrowdpoolClaims reminders", () => {
  it.skipIf(skipIfNoDb)("say delivery window and place, and link to the project page", async () => {
    const database = await dbHelpers.getDb();
    expect(database).toBeTruthy();

    const applicationId = await createApprovedApplication(STEWARD, { name: `Test Fixture Reminder Farm ${Date.now()}` });
    const created = await stewardCaller(STEWARD).campaigns.create({
      applicationId,
      title: "Test Reminder Campaign",
      description: "Testing the reminder words and links",
      projectName: "Test Reminder Farm",
      currency: "USD",
      financialTarget: 0,
      items: [{ category: "equipment", equipmentName: "Chainsaw", equipmentQuantity: 1, estimatedValue: 500 }],
    });
    createdCampaignIds.push(created.id);
    await adminCaller().campaigns.updateStatus({ id: created.id, status: "active" });
    const [row] = await database!.select().from(campaigns).where(eq(campaigns.id, created.id));
    const items = await database!.select().from(campaignItems).where(eq(campaignItems.campaignId, created.id));

    // A shift three days out, added straight to the table.
    const shiftAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const shiftInsert: any = await database!.insert(campaignItems).values({
      campaignId: created.id,
      category: "role",
      kind: "shift",
      roleTitle: "Planting day",
      quantityWanted: 5,
      estimatedValue: 0,
      shiftStartsAt: shiftAt,
    });
    const shiftItemId = Number(shiftInsert?.[0]?.insertId ?? shiftInsert?.insertId);

    // An accepted place whose delivery window closes tomorrow, and an accepted shift sign-up.
    const placeId = await dbHelpers.createContribution({
      campaignId: created.id,
      campaignItemId: items[0].id,
      userId: CONTRIBUTOR,
      contributorName: "Reminder Tester",
      contributorEmail: "reminder-tester@example.com",
      contributionType: "equipment",
      title: "Chainsaw",
      status: "accepted",
      quantityPledged: 1,
      claimExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } as any);
    const shiftId = await dbHelpers.createContribution({
      campaignId: created.id,
      campaignItemId: shiftItemId,
      userId: CONTRIBUTOR,
      contributorName: "Reminder Tester",
      contributorEmail: "reminder-tester@example.com",
      contributionType: "role",
      title: "Planting day",
      status: "accepted",
      quantityPledged: 1,
    } as any);

    await expireCrowdpoolClaims(database);

    const projectPath = `/project/${applicationId}-`;
    const focus = `?campaign=${created.id}`;
    expect(row.applicationId).toBe(applicationId);

    const place = inserted.find((n) => n.dedupeKey === `claimrem:${placeId}:expiry`);
    expect(place).toMatchObject({
      userId: CONTRIBUTOR,
      title: "Your delivery window is closing",
      body: `"Chainsaw" on Test Reminder Campaign needs to be delivered soon, or the place closes and the need opens again.`,
    });
    expect(place!.link).toMatch(new RegExp(`^${projectPath}[a-z0-9-]*\\${focus}$`));

    const shift = inserted.find((n) => n.dedupeKey === `claimrem:${shiftId}:shift7`);
    expect(shift).toMatchObject({ userId: CONTRIBUTOR, title: "Your shift is coming up" });
    expect(shift!.link).toBe(place!.link);

    for (const n of [place!, shift!]) {
      expect(n.link).not.toContain("/campaign/");
      expect(`${n.title} ${n.body}`).not.toMatch(/\bclaim/i);
    }
  }, 60_000);
});

describe("a loan marked Returned", () => {
  it.skipIf(skipIfNoDb)("is never swept as a place that passed its window, and gets no reminder", async () => {
    const database = (await dbHelpers.getDb())!;
    const applicationId = await createApprovedApplication(STEWARD, { name: `Test Fixture Returned Farm ${Date.now()}` });
    const created = await stewardCaller(STEWARD).campaigns.create({
      applicationId,
      title: "Test Returned Loan Campaign",
      description: "A loan that went back before it was marked delivered",
      projectName: "Test Returned Farm",
      currency: "USD",
      financialTarget: 0,
      items: [{ category: "equipment", kind: "item", equipmentName: "Excavator", equipmentQuantity: 3, estimatedValue: 900, acceptsGift: false, acceptsLoan: true }],
    });
    createdCampaignIds.push(created.id);
    await adminCaller().campaigns.updateStatus({ id: created.id, status: "active" });
    const [need] = await database.select().from(campaignItems).where(eq(campaignItems.campaignId, created.id));
    const lend = (over: Record<string, unknown>) => dbHelpers.createContribution({
      campaignId: created.id,
      campaignItemId: need.id,
      userId: CONTRIBUTOR,
      contributorName: "Returned Tester",
      contributorEmail: "returned-tester@example.com",
      contributionType: "equipment",
      title: "Excavator",
      status: "accepted",
      quantityPledged: 1,
      offerMode: "lend",
      availableFrom: "2026-10-01",
      lendUntil: "2026-12-15",
      ...over,
    } as any);
    const day = 24 * 60 * 60 * 1000;
    // Returned, and its window passed long ago.
    const returnedOverdue = await lend({ claimExpiresAt: new Date(Date.now() - 5 * day), returnedAt: new Date(Date.now() - 6 * day) });
    // Returned, and its window closes tomorrow.
    const returnedSoon = await lend({ claimExpiresAt: new Date(Date.now() + day), returnedAt: new Date() });
    // Not returned, window passed: the control, which the sweep does close.
    const overdue = await lend({ claimExpiresAt: new Date(Date.now() - 5 * day) });
    await database.update(campaignItems).set({ quantityClaimed: 3 }).where(eq(campaignItems.id, need.id));

    await expireCrowdpoolClaims(database);

    const status = async (id: number) =>
      (await database.select({ s: campaignContributions.status }).from(campaignContributions).where(eq(campaignContributions.id, id)))[0]?.s;
    expect(await status(returnedOverdue)).toBe("accepted");
    expect(await status(returnedSoon)).toBe("accepted");
    expect(await status(overdue)).toBe("expired");
    // Only the control released its place.
    const [after] = await database.select({ q: campaignItems.quantityClaimed }).from(campaignItems).where(eq(campaignItems.id, need.id));
    expect(after.q).toBe(2);
    expect(inserted.some((n) => n.dedupeKey === `claimrem:${returnedSoon}:expiry`)).toBe(false);
    expect(inserted.some((n) => n.dedupeKey === `claimrem:${returnedOverdue}:expiry`)).toBe(false);
  }, 60_000);
});
