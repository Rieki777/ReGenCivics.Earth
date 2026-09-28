/**
 * No need at 0 (ruling 2026-09-27; build spec 2026-09-27, section 5), and the
 * nine-month cap on new campaigns (section 5.3, question Q5).
 *
 * db.createCampaign refuses any need whose value is not above 0, naming it,
 * before anything is written, so "confirmed value reaches the in-kind ask"
 * and "every need filled" always agree. campaigns.create refuses a campaign
 * longer than 273 days.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { inArray, like } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignItems } from "../drizzle/schema";
import { cleanupFixtureApplications, createApprovedApplication, stewardCaller } from "./test-fixtures/crowdpool";
import { DURATION, ZERO_VALUE } from "../shared/crowdpoolCopy";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986611;
const TITLE = "Test Zero Value";

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  const rows = await database!.select({ id: campaigns.id }).from(campaigns).where(like(campaigns.title, `${TITLE}%`));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, ids));
    await database!.delete(campaigns).where(inArray(campaigns.id, ids));
  }
  await cleanupFixtureApplications();
});

type Need = Record<string, unknown> & { estimatedValue: number };

async function create(title: string, items: Need[], extra: Record<string, unknown> = {}) {
  const applicationId = await createApprovedApplication(STEWARD);
  return stewardCaller(STEWARD).campaigns.create({
    title: `${TITLE} ${title}`,
    description: "Zero value fixture",
    projectName: `${TITLE} ${title}`,
    currency: "USD",
    financialTarget: 0,
    applicationId,
    items: items as any,
    ...extra,
  });
}

async function campaignsTitled(title: string): Promise<number> {
  const database = await dbHelpers.getDb();
  const rows = await database!.select({ id: campaigns.id }).from(campaigns).where(like(campaigns.title, `${TITLE} ${title}`));
  return rows.length;
}

const seeds = { category: "resource", resourceName: "Seed kit", resourceDescription: "Seeds", estimatedValue: 400 };

describe("a need can't be listed at 0", () => {
  it.skipIf(skipIfNoDb)("refuses a need at 0, naming it, and writes nothing", async () => {
    await expect(create("Zero", [seeds, { category: "equipment", equipmentName: "Wood chipper", equipmentQuantity: 1, estimatedValue: 0 }]))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: ZERO_VALUE.server("Wood chipper") });
    expect(ZERO_VALUE.server("Wood chipper")).toBe('"Wood chipper" is listed at 0. Give it a value above 0 so it counts toward the whole ask.');
    expect(await campaignsTitled("Zero")).toBe(0);
  });

  it.skipIf(skipIfNoDb)("names a role by its title and a need with no name as A need, decoded and cut to 80", async () => {
    await expect(create("Role", [{ category: "role", kind: "role", roleTitle: "Seed &amp; soil keeper", hoursPerWeek: 10, estimatedValue: 0 }]))
      .rejects.toMatchObject({ message: ZERO_VALUE.server("Seed & soil keeper") });
    await expect(create("Nameless", [{ category: "resource", estimatedValue: 0 }]))
      .rejects.toMatchObject({ message: ZERO_VALUE.server("A need") });
    const long = "L".repeat(120);
    await expect(create("Long", [{ category: "resource", resourceName: long, estimatedValue: 0 }]))
      .rejects.toMatchObject({ message: ZERO_VALUE.server("L".repeat(80)) });
    for (const t of ["Role", "Nameless", "Long"]) expect(await campaignsTitled(t)).toBe(0);
  });

  it.skipIf(skipIfNoDb)("refuses a negative value too, and writes nothing", async () => {
    // Through the procedure, Zod's min(0) refuses it first.
    await expect(create("Negative", [{ ...seeds, estimatedValue: -5 }])).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await campaignsTitled("Negative")).toBe(0);
    // Any other caller of db.createCampaign meets the rule itself.
    await expect(dbHelpers.createCampaign(STEWARD, {
      title: `${TITLE} Negative direct`,
      description: "Zero value fixture",
      projectName: `${TITLE} Negative direct`,
      financialTarget: 0,
      items: [{ category: "resource", resourceName: "Seed kit", estimatedValue: -5 }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST", message: ZERO_VALUE.server("Seed kit") });
    expect(await campaignsTitled("Negative direct")).toBe(0);
  });

  it.skipIf(skipIfNoDb)("accepts a need at 0.01", async () => {
    const { id } = await create("Penny", [{ ...seeds, estimatedValue: 0.01 }]);
    const items = await dbHelpers.getCampaignItems(id);
    expect(items).toHaveLength(1);
    expect(Number(items[0].estimatedValue)).toBeCloseTo(0.01, 2);
  });
});

describe("a campaign runs nine months at most", () => {
  it.skipIf(skipIfNoDb)("refuses 274 days with the plain line; 273 is fine", async () => {
    await expect(create("Too long", [seeds], { durationDays: 274 }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining(DURATION.tooLong) });
    expect(DURATION.tooLong).toBe("A campaign runs nine months at most, 273 days.");
    expect(await campaignsTitled("Too long")).toBe(0);
    const { id } = await create("Nine months", [seeds], { durationDays: 273 });
    expect((await dbHelpers.getCampaignById(id))!.durationDays).toBe(273);
  });
});
