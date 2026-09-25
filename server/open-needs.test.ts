/**
 * campaigns.listOpenNeeds, the Needs tab read (build spec 2026-09-25,
 * section 9.1): open in-kind needs on live public campaigns, least covered
 * first, examples apart, money routes beside them. Filled, money and
 * unpublished needs are left out, and a row carries no contact data, no
 * names and no dates from anyone's loan.
 *
 * Run against the SCRATCH database, never production. The scratch database
 * holds many live test campaigns from other suites, and the list stops at
 * 300 real needs, so this file pins its own open needs to rank near the top.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems, campaignPartnerLinks } from "../drizzle/schema";
import {
  adminCaller,
  anonCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  realOffer,
  stewardCaller,
} from "./test-fixtures/crowdpool";
import { buildOpenNeeds } from "../shared/openNeeds";

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

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986951;
const createdCampaignIds: number[] = [];

const SECRET_NAME = "Opal Quietwater";
const SECRET_EMAIL = "opal.quietwater@example.com";

/** The exact row shape. Adding a field is a deliberate change to this list. */
const ROW_KEYS = [
  "campaignId", "campaignTitle", "capitalType", "chip", "detail", "isDemo", "kind", "location", "needId",
  "noOffersYet", "path", "place", "projectName", "status", "title", "verb",
];

type Fixture = {
  real: number;
  draft: number;
  example: number;
  open: number;
  role: number;
  filled: number;
  money: number;
  draftNeed: number;
  exampleNeed: number;
  verifiedRoute: number;
  pendingRoute: number;
  exampleRoute: number;
};
let fx: Fixture;

async function makeCampaign(title: string, items: Parameters<ReturnType<typeof stewardCaller>["campaigns"]["create"]>[0]["items"]) {
  const applicationId = await createApprovedApplication(STEWARD);
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test Needs ${title}`,
    description: "Open needs fixture",
    projectName: `Test Needs ${title}`,
    location: "Test Valley, Portugal",
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items,
  });
  createdCampaignIds.push(id);
  return id;
}

beforeAll(async () => {
  if (skipIfNoDb) return;
  const database = (await dbHelpers.getDb())!;

  const real = await makeCampaign("Real", [
    { category: "equipment", kind: "item", equipmentName: "Test open truck", estimatedValue: 5000, acceptsGift: true, acceptsLoan: true },
    { category: "role", kind: "role", roleTitle: "Test open cook", hoursPerWeek: 20, estimatedValue: 8000, workMode: "remote" },
    { category: "equipment", kind: "item", equipmentName: "Test filled spade", estimatedValue: 50 },
  ]);
  await adminCaller().campaigns.updateStatus({ id: real, status: "active" });
  const draft = await makeCampaign("Draft", [{ category: "equipment", equipmentName: "Test draft saw", estimatedValue: 10 }]);
  const example = await makeCampaign("Example", [{ category: "equipment", equipmentName: "Test example hoe", estimatedValue: 10 }]);
  await adminCaller().campaigns.updateStatus({ id: example, status: "active" });
  await database.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, example));

  const items = await dbHelpers.getCampaignItems(real);
  const by = (name: string) => items.find((i) => i.equipmentName === name || i.roleTitle === name)!.id;
  const open = by("Test open truck");
  const role = by("Test open cook");
  const filled = by("Test filled spade");
  // A money need from before 0257 (create refuses new ones).
  const moneyInsert: any = await database.insert(campaignItems).values({
    campaignId: real, category: "resource", kind: "crypto", capitalType: "financial", resourceName: "Test USDC", estimatedValue: 400,
  });
  const money = Number(moneyInsert?.[0]?.insertId ?? moneyInsert?.insertId);
  await database.update(campaignItems).set({ priorityPinned: 1 }).where(inArray(campaignItems.id, [open, role, money]));
  const draftNeed = (await dbHelpers.getCampaignItems(draft))[0].id;
  const exampleNeed = (await dbHelpers.getCampaignItems(example))[0].id;
  await database.update(campaignItems).set({ priorityPinned: 1 }).where(inArray(campaignItems.id, [draftNeed, exampleNeed]));

  // Fill the spade: an offer, accepted. A lend offered on the truck, with dates.
  const spade = await realOffer(anonCaller().campaigns.submitContribution({
    campaignId: real, campaignItemId: filled, contributionType: "equipment", title: "Test spade",
    estimatedValue: 1, contributorName: SECRET_NAME, contributorEmail: SECRET_EMAIL, contributorPhone: "555-0100",
  }));
  await stewardCaller(STEWARD).campaigns.updateContributionStatus({ contributionId: spade.id, status: "accepted" });

  const routes: any[] = [];
  for (const row of [
    { campaignId: real, partner: "maearth" as const, label: "Give through Ma Earth", url: "https://maearth.com/projects/test-needs", status: "verified" as const },
    { campaignId: real, partner: "gosteward" as const, label: "Lend through Steward", url: "https://gosteward.com/projects/test-needs", status: "pending" as const },
    { campaignId: example, partner: "maearth" as const, label: "Give through Ma Earth", url: "https://maearth.com/projects/test-example", status: "example" as const },
  ]) {
    const r: any = await database.insert(campaignPartnerLinks).values(row);
    routes.push(Number(r?.[0]?.insertId ?? r?.insertId));
  }

  fx = {
    real, draft, example, open, role, filled, money, draftNeed, exampleNeed,
    verifiedRoute: routes[0], pendingRoute: routes[1], exampleRoute: routes[2],
  };
});

afterAll(async () => {
  if (skipIfNoDb) return;
  const database = await dbHelpers.getDb();
  if (createdCampaignIds.length) {
    await database!.delete(campaignPartnerLinks).where(inArray(campaignPartnerLinks.campaignId, createdCampaignIds));
    await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

describe("campaigns.listOpenNeeds", () => {
  it.skipIf(skipIfNoDb)("lists open needs on live campaigns and leaves out filled, money and unpublished ones", async () => {
    const out = await anonCaller().campaigns.listOpenNeeds();
    const ids = out.needs.map((n) => n.needId);
    expect(ids).toContain(fx.open);
    expect(ids).toContain(fx.role);
    for (const gone of [fx.filled, fx.money, fx.draftNeed, fx.exampleNeed]) expect(ids).not.toContain(gone);
    expect(out.needs.every((n) => !n.isDemo)).toBe(true);
    expect(out.needs.length).toBeLessThanOrEqual(300);
    expect(out.realCampaignCount).toBeGreaterThanOrEqual(1);

    const truck = out.needs.find((n) => n.needId === fx.open)!;
    expect(truck).toMatchObject({
      campaignId: fx.real,
      projectName: "Test Needs Real",
      campaignTitle: "Test Needs Real",
      location: "Test Valley, Portugal",
      verb: "Offer",
      chip: "things",
      title: "Test open truck",
      detail: "Give or lend.",
      noOffersYet: true,
      status: { key: "none", text: "No one has offered yet" },
      place: "land",
      capitalType: "material",
    });
    expect(truck.path).toMatch(new RegExp(`^/project/\\d+-test-needs-real\\?campaign=${fx.real}&offer=${fx.open}#need-${fx.open}$`));
    expect(out.needs.find((n) => n.needId === fx.role)).toMatchObject({ verb: "Apply", chip: "role", place: "remote" });
  });

  it.skipIf(skipIfNoDb)("puts example needs in their own list", async () => {
    const out = await anonCaller().campaigns.listOpenNeeds();
    expect(out.examples.map((n) => n.needId)).toContain(fx.exampleNeed);
    expect(out.examples.every((n) => n.isDemo)).toBe(true);
    expect(out.examples.length).toBeLessThanOrEqual(100);
  });

  it.skipIf(skipIfNoDb)("pins the row shape: no contact data, no names, no loan dates", async () => {
    // A lend on the truck, with dates only its lender and the stewards should see.
    await realOffer(anonCaller().campaigns.submitContribution({
      campaignId: fx.real, campaignItemId: fx.open, contributionType: "equipment", title: "Test truck loan",
      estimatedValue: 1, contributorName: SECRET_NAME, contributorEmail: SECRET_EMAIL,
      offerMode: "lend", availableFrom: "2031-04-05", lendUntil: "2031-06-07", lendTerms: "Test secret terms",
    }));
    const out = await anonCaller().campaigns.listOpenNeeds();
    for (const row of [...out.needs, ...out.examples]) expect(Object.keys(row).sort()).toEqual(ROW_KEYS);
    for (const row of [...out.routes, ...out.exampleRoutes]) {
      expect(Object.keys(row).sort()).toEqual(["campaignId", "isDemo", "label", "partner", "path", "projectName"]);
    }
    const blob = JSON.stringify(out);
    for (const secret of [SECRET_NAME, SECRET_EMAIL, "555-0100", "2031-04-05", "2031-06-07", "Test secret terms", "maearth.com/projects"]) {
      expect(blob).not.toContain(secret);
    }
    // The truck now has an offer, so it reads as waiting. On a busy database
    // it can drop below the 300 needs with no offers at all, so the status is
    // read from the same builder over this campaign's own rows, always.
    const [realCampaign] = (await dbHelpers.listCampaigns("active")).filter((c) => c.id === fx.real);
    expect(realCampaign).toBeDefined();
    const own = buildOpenNeeds({
      campaigns: [realCampaign],
      inputs: await dbHelpers.getCampaignProgressInputs([fx.real]),
      routes: [],
    });
    const truck = own.needs.find((n) => n.needId === fx.open);
    expect(truck).toBeDefined();
    expect(truck).toMatchObject({ noOffersYet: false, status: { key: "waiting", text: "Offered, waiting on the stewards" } });
    expect(Object.keys(truck!).sort()).toEqual(ROW_KEYS);
    // Wherever the list shows it, it shows the same.
    const listed = out.needs.find((n) => n.needId === fx.open);
    if (listed) expect(listed).toEqual(truck);
  });

  it.skipIf(skipIfNoDb)("shows verified routes on real campaigns and example routes on example campaigns", async () => {
    const out = await anonCaller().campaigns.listOpenNeeds();
    const mine = out.routes.filter((r) => r.campaignId === fx.real);
    expect(mine).toEqual([{
      campaignId: fx.real, projectName: "Test Needs Real", partner: "maearth", label: "Give through Ma Earth",
      path: expect.stringMatching(new RegExp(`\\?campaign=${fx.real}#money$`)), isDemo: false,
    }]);
    expect(out.exampleRoutes.filter((r) => r.campaignId === fx.example).map((r) => r.partner)).toEqual(["maearth"]);
    expect(out.routes.some((r) => r.campaignId === fx.example)).toBe(false);
  });
});
