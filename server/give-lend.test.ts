/**
 * Give or lend, the server copying a need's value, the money rail, and
 * Returned (build spec 2026-09-25, sections 6.3 and 6.4).
 *
 * campaigns.submitContribution:
 *   - refuses a money offer while crowdpool.rails.accept_money is off;
 *   - takes only the modes a thing need accepts, and makes the contributor
 *     choose when it takes both;
 *   - a lend needs an until date, after today, after its own start, after
 *     the need's start, within five years;
 *   - stores the need's per-slot value times the slots, never the client's;
 *   - a lend's claim window counts from when the thing is available.
 * campaigns.markLoanReturned is a steward's stamp on a taken-on loan: no
 * status, no counter, no notice.
 *
 * The first block is pure. The rest runs against the SCRATCH database, never
 * production.
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
  realOffer,
  stewardCaller,
} from "./test-fixtures/crowdpool";

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

// Rails are read through getGameVariable. Tests set them here, per file,
// instead of writing game_variables that other suites read.
const rails = new Map<string, number>();
vi.mock("./game", async (orig) => {
  const real = await orig<typeof import("./game")>();
  return {
    ...real,
    getGameVariable: vi.fn(async (key: string) => (rails.has(key) ? rails.get(key)! : real.getGameVariable(key))),
  };
});

import { checkGiveOrLend, MONEY_RAIL_REFUSAL } from "./routes/campaigns";
import { todayUtc } from "../shared/crowdpoolNeedAction";

const skipIfNoDb = !process.env.DATABASE_URL;
const STEWARD = 986921;
const STRANGER = 986922;
const createdCampaignIds: number[] = [];

beforeEach(() => {
  rails.clear();
  rails.set("crowdpool.rails.accept_money", 0);
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

const TODAY = todayUtc();
function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

// ── Pure ─────────────────────────────────────────────────────────────────────

describe("checkGiveOrLend (pure)", () => {
  const both = { kind: "item", acceptsGift: 1, acceptsLoan: 1, neededFrom: "2030-02-01" };
  const base = { contributionType: "equipment", today: "2030-01-01" };

  it("makes the contributor choose when a thing takes both", () => {
    expect(() => checkGiveOrLend({ ...base, need: both })).toThrow("Choose give or lend for this need.");
    expect(checkGiveOrLend({ ...base, need: both, offerMode: "give", lendUntil: "2030-05-01", lendTerms: "x" }))
      .toEqual({ offerMode: "give", availableFrom: null, lendUntil: null, lendTerms: null });
  });

  it("checks a lend's dates in order", () => {
    const lend = { ...base, need: both, offerMode: "lend" as const };
    expect(() => checkGiveOrLend(lend)).toThrow("Add the date it needs to come back.");
    expect(() => checkGiveOrLend({ ...lend, lendUntil: "2029-12-31" })).toThrow("The loan can't end before it starts.");
    expect(() => checkGiveOrLend({ ...lend, availableFrom: "2030-03-10", lendUntil: "2030-03-01" }))
      .toThrow("The loan can't end before it starts.");
    expect(() => checkGiveOrLend({ ...lend, lendUntil: "2030-01-20" }))
      .toThrow("The loan ends before the project needs it. Pick a later date.");
    expect(() => checkGiveOrLend({ ...lend, lendUntil: "2035-01-02" })).toThrow(/up to five years/);
    expect(checkGiveOrLend({ ...lend, availableFrom: "2030-02-01", lendUntil: "2035-01-01", lendTerms: "  Keep it dry  " }))
      .toEqual({ offerMode: "lend", availableFrom: "2030-02-01", lendUntil: "2035-01-01", lendTerms: "Keep it dry" });
  });

  it("drops every loan field on roles, shifts and knowledge, and on freeform non-things", () => {
    const none = { offerMode: null, availableFrom: null, lendUntil: null, lendTerms: null };
    for (const kind of ["role", "shift", "knowledge"]) {
      expect(checkGiveOrLend({ ...base, need: { kind }, offerMode: "lend", lendUntil: "2020-01-01" })).toEqual(none);
    }
    expect(checkGiveOrLend({ ...base, contributionType: "knowledge", need: null, offerMode: "lend" })).toEqual(none);
    // A freeform thing may be lent, with the same checks.
    expect(() => checkGiveOrLend({ ...base, need: null, offerMode: "lend" })).toThrow("Add the date it needs to come back.");
    expect(checkGiveOrLend({ ...base, need: null })).toEqual(none);
  });
});

// ── Against the scratch database ────────────────────────────────────────────

type Needs = {
  campaignId: number;
  both: number;
  giftOnly: number;
  loanOnly: number;
  mappedLoan: number;
  role: number;
};

/** A live campaign with one need of each shape. Real unless told otherwise. */
async function liveCampaign(title: string, opts: { isDemo?: boolean; bothFrom?: string } = {}): Promise<Needs> {
  const applicationId = await createApprovedApplication(STEWARD);
  const { id } = await stewardCaller(STEWARD).campaigns.create({
    title: `Test GiveLend ${title}`,
    description: "Give or lend fixture",
    projectName: `Test GiveLend ${title}`,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: [
      {
        category: "equipment", kind: "item", equipmentName: "Chainsaw", quantityWanted: 2, estimatedValue: 900,
        acceptsGift: true, acceptsLoan: true, neededFrom: opts.bothFrom ?? addDays(TODAY, 30), neededUntil: addDays(TODAY, 90),
      },
      { category: "resource", resourceName: "Seed", resourceDescription: "Seed", quantityWanted: 4, estimatedValue: 1000 },
      { category: "equipment", kind: "item", equipmentName: "Trailer", estimatedValue: 5000, acceptsGift: false, acceptsLoan: true },
      { category: "equipment", kind: "loan", equipmentName: "Tractor", estimatedValue: 20000 },
      { category: "role", kind: "role", roleTitle: "Cook", hoursPerWeek: 10, estimatedValue: 2000 },
    ],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  if (opts.isDemo) {
    const database = await dbHelpers.getDb();
    await database!.update(campaigns).set({ isDemo: 1 }).where(eq(campaigns.id, id));
  }
  const items = await dbHelpers.getCampaignItems(id);
  const by = (name: string) => items.find((i) => i.equipmentName === name || i.resourceName === name || i.roleTitle === name)!.id;
  return { campaignId: id, both: by("Chainsaw"), giftOnly: by("Seed"), loanOnly: by("Trailer"), mappedLoan: by("Tractor"), role: by("Cook") };
}

function offer(campaignId: number, campaignItemId: number | undefined, extra: Record<string, unknown> = {}) {
  return {
    campaignId,
    ...(campaignItemId ? { campaignItemId } : {}),
    contributionType: "equipment" as const,
    title: "Test give-lend offer",
    estimatedValue: 99999,
    contributorName: "Lender",
    contributorEmail: "give.lend@example.com",
    ...extra,
  };
}

async function row(id: number) {
  return (await dbHelpers.getContributionById(id))!;
}

describe("need modes at create", () => {
  it.skipIf(skipIfNoDb)("stores kind loan as an item that takes loans only, and keeps the need window", async () => {
    const n = await liveCampaign("Create modes");
    const items = await dbHelpers.getCampaignItems(n.campaignId);
    const tractor = items.find((i) => i.id === n.mappedLoan)!;
    expect(tractor).toMatchObject({ kind: "item", acceptsGift: 0, acceptsLoan: 1 });
    const saw = items.find((i) => i.id === n.both)!;
    expect(saw).toMatchObject({ acceptsGift: 1, acceptsLoan: 1, neededFrom: addDays(TODAY, 30), neededUntil: addDays(TODAY, 90) });
    expect(items.find((i) => i.id === n.giftOnly)).toMatchObject({ acceptsGift: 1, acceptsLoan: 0, neededFrom: null, workMode: null });
    expect(items.every((i) => i.kind !== "loan")).toBe(true);
  });

  it.skipIf(skipIfNoDb)("refuses money needs, a thing with no mode, and a window that ends before it starts", async () => {
    const applicationId = await createApprovedApplication(STEWARD);
    const base = {
      title: "Test GiveLend refused", description: "x", projectName: "Test GiveLend refused",
      currency: "USD", financialTarget: 0, applicationId,
    };
    const caller = stewardCaller(STEWARD);
    for (const kind of ["crypto", "financial_link"] as const) {
      await expect(caller.campaigns.create({ ...base, items: [{ category: "resource", kind, resourceName: "Money", estimatedValue: 100 }] }))
        .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Money isn't added as a need. Set the money this project asks for, and add the routes it holds, in the Money step." });
    }
    await expect(caller.campaigns.create({ ...base, items: [{ category: "equipment", equipmentName: "Spade", estimatedValue: 10, acceptsGift: false, acceptsLoan: false }] }))
      .rejects.toMatchObject({ message: "Choose whether you'd take each thing as a gift, on loan, or both." });
    await expect(caller.campaigns.create({ ...base, items: [{ category: "equipment", equipmentName: "Spade", estimatedValue: 10, neededFrom: "2030-05-02", neededUntil: "2030-05-01" }] }))
      .rejects.toMatchObject({ message: "A need can't end before it starts." });
    await expect(caller.campaigns.create({ ...base, items: [{ category: "equipment", equipmentName: "Spade", estimatedValue: 10, neededFrom: "2030-02-30" }] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("submitContribution: give or lend", () => {
  it.skipIf(skipIfNoDb)("makes the contributor choose when a need takes both, and refuses a mode the need refuses", async () => {
    const n = await liveCampaign("Choose");
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both)))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Choose give or lend for this need." });
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.loanOnly, { offerMode: "give" })))
      .rejects.toMatchObject({ message: "This need takes loans only." });
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.giftOnly, { offerMode: "lend", lendUntil: addDays(TODAY, 40) })))
      .rejects.toMatchObject({ message: "This need takes gifts only." });
  });

  it.skipIf(skipIfNoDb)("applies the one mode a need takes when none is sent", async () => {
    const n = await liveCampaign("One mode");
    const gift = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.giftOnly, { contributionType: "resource" })));
    expect((await row(gift.id)).offerMode).toBe("give");
    const lend = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.loanOnly, { lendUntil: addDays(TODAY, 60) })));
    expect(await row(lend.id)).toMatchObject({ offerMode: "lend", lendUntil: addDays(TODAY, 60), availableFrom: null });
  });

  it.skipIf(skipIfNoDb)("a lend needs its until date, after the need starts", async () => {
    const n = await liveCampaign("Lend dates");
    const lend = (extra: Record<string, unknown>) =>
      anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, { offerMode: "lend", ...extra }));
    await expect(lend({})).rejects.toMatchObject({ message: "Add the date it needs to come back." });
    await expect(lend({ lendUntil: addDays(TODAY, 10) }))
      .rejects.toMatchObject({ message: "The loan ends before the project needs it. Pick a later date." });
    await expect(lend({ availableFrom: addDays(TODAY, 50), lendUntil: addDays(TODAY, 40) }))
      .rejects.toMatchObject({ message: "The loan can't end before it starts." });
    await expect(lend({ lendUntil: addDays(TODAY, -1) }))
      .rejects.toMatchObject({ message: "The loan can't end before it starts." });
    await expect(lend({ lendUntil: addDays(TODAY, 6 * 366) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(lend({ lendUntil: "2030-02-30" })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const ok = await realOffer(lend({ availableFrom: addDays(TODAY, 20), lendUntil: addDays(TODAY, 45), lendTerms: "<b>Keep it</b> dry" }));
    expect(await row(ok.id)).toMatchObject({
      offerMode: "lend",
      availableFrom: addDays(TODAY, 20),
      lendUntil: addDays(TODAY, 45),
      lendTerms: "Keep it dry",
      status: "pending",
    });
  });

  it.skipIf(skipIfNoDb)("a legacy kind loan need takes a lend only", async () => {
    const n = await liveCampaign("Legacy loan");
    // A row from before 0257's backfill: kind 'loan', columns never set.
    const database = await dbHelpers.getDb();
    await database!.update(campaignItems).set({ kind: "loan", acceptsGift: 1, acceptsLoan: 0 }).where(eq(campaignItems.id, n.mappedLoan));
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.mappedLoan, { offerMode: "give" })))
      .rejects.toMatchObject({ message: "This need takes loans only." });
    const lend = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.mappedLoan, { lendUntil: addDays(TODAY, 30) })));
    expect((await row(lend.id)).offerMode).toBe("lend");
  });

  it.skipIf(skipIfNoDb)("a gift drops the dates and terms; a role drops every loan field", async () => {
    const n = await liveCampaign("Drops");
    const gift = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, {
      offerMode: "give", availableFrom: addDays(TODAY, 40), lendUntil: addDays(TODAY, 50), lendTerms: "terms",
    })));
    expect(await row(gift.id)).toMatchObject({ offerMode: "give", availableFrom: null, lendUntil: null, lendTerms: null });
    const hours = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.role, {
      contributionType: "role", roleTitle: "Cook", hoursPerWeek: 4, offerMode: "lend", lendUntil: addDays(TODAY, 50), lendTerms: "x",
    })));
    expect(await row(hours.id)).toMatchObject({ offerMode: null, availableFrom: null, lendUntil: null, lendTerms: null });
  });
});

describe("submitContribution: the value comes from the need", () => {
  it.skipIf(skipIfNoDb)("stores the per-slot value times the slots and ignores the client's number", async () => {
    const n = await liveCampaign("Value copy");
    // Chainsaw: 900 over 2 slots = 450 a slot. Seed: 1000 over 4 = 250.
    const one = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, { offerMode: "give", estimatedValue: 99999 })));
    expect(Number((await row(one.id)).estimatedValue)).toBe(450);
    const seeds = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.giftOnly, {
      contributionType: "resource", quantityPledged: 3, estimatedValue: 1,
    })));
    expect(Number((await row(seeds.id)).estimatedValue)).toBe(750);
    // A loan counts at the listed value too.
    const lent = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.loanOnly, { lendUntil: addDays(TODAY, 20), estimatedValue: 3 })));
    expect(Number((await row(lent.id)).estimatedValue)).toBe(5000);
    // A freeform offer keeps its own estimate.
    const free = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, undefined, { estimatedValue: 321.5 })));
    expect(Number((await row(free.id)).estimatedValue)).toBe(321.5);
  });

  it.skipIf(skipIfNoDb)("bounds the numbers a client can send", async () => {
    const n = await liveCampaign("Bounds");
    for (const extra of [
      { estimatedValue: 10_000_001 },
      { financialAmount: -1 },
      { financialAmount: 10_000_001 },
      { quantityPledged: 100_001 },
      { durationMonths: 0 },
      { durationMonths: 121 },
      { durationMonths: 2.5 },
      { lendTerms: "x".repeat(301) },
    ]) {
      await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, undefined, extra)))
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });
});

describe("submitContribution: a lend's claim window", () => {
  it.skipIf(skipIfNoDb)("counts from when the thing is available", async () => {
    const n = await liveCampaign("Expiry", { bothFrom: addDays(TODAY, 1) });
    const later = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, {
      offerMode: "lend", availableFrom: addDays(TODAY, 60), lendUntil: addDays(TODAY, 120),
    })));
    const now = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, {
      offerMode: "lend", lendUntil: addDays(TODAY, 120),
    })));
    const startMs = Date.parse(`${addDays(TODAY, 60)}T00:00:00.000Z`);
    const laterExpiry = (await row(later.id)).claimExpiresAt!.getTime();
    const nowExpiry = (await row(now.id)).claimExpiresAt!.getTime();
    // The loan window (crowdpool.claim_expiry_days_loan, 14 when unset) is
    // added to the later of now and availableFrom.
    expect(laterExpiry).toBeGreaterThan(startMs);
    expect(laterExpiry - startMs).toBeLessThanOrEqual(400 * 86_400_000);
    expect(nowExpiry).toBeLessThan(startMs);
    expect(nowExpiry).toBeGreaterThan(Date.now());
    expect(laterExpiry - nowExpiry).toBeGreaterThan(55 * 86_400_000);
  });
});

describe("submitContribution: money", () => {
  it.skipIf(skipIfNoDb)("refuses a money offer while the rail is off, on real and example campaigns", async () => {
    const real = await liveCampaign("Money real");
    const example = await liveCampaign("Money example", { isDemo: true });
    for (const campaignId of [real.campaignId, example.campaignId]) {
      await expect(anonCaller().campaigns.submitContribution(offer(campaignId, undefined, {
        contributionType: "financial", financialAmount: 50, estimatedValue: 50,
      }))).rejects.toMatchObject({ code: "BAD_REQUEST", message: MONEY_RAIL_REFUSAL });
    }
    const database = await dbHelpers.getDb();
    const rows = await database!.select({ id: campaignContributions.id }).from(campaignContributions)
      .where(inArray(campaignContributions.campaignId, [real.campaignId, example.campaignId]));
    expect(rows).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("takes it once the rail is on", async () => {
    rails.set("crowdpool.rails.accept_money", 1);
    const n = await liveCampaign("Money rail on");
    const r = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, undefined, {
      contributionType: "financial", financialAmount: 50, estimatedValue: 50,
    })));
    expect(await row(r.id)).toMatchObject({ contributionType: "financial", offerMode: null });
  });
});

describe("an example campaign", () => {
  it.skipIf(skipIfNoDb)("checks give or lend exactly as a real one and writes no row", async () => {
    const n = await liveCampaign("Example", { isDemo: true });
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both)))
      .rejects.toMatchObject({ message: "Choose give or lend for this need." });
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, { offerMode: "lend" })))
      .rejects.toMatchObject({ message: "Add the date it needs to come back." });
    await expect(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.giftOnly, { offerMode: "lend", lendUntil: addDays(TODAY, 40) })))
      .rejects.toMatchObject({ message: "This need takes gifts only." });
    const practice = await anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, {
      offerMode: "lend", lendUntil: addDays(TODAY, 60),
    }));
    expect(practice).toEqual({ id: null, success: true, practice: true });
    const database = await dbHelpers.getDb();
    const rows = await database!.select({ id: campaignContributions.id }).from(campaignContributions)
      .where(eq(campaignContributions.campaignId, n.campaignId));
    expect(rows).toHaveLength(0);
  });
});

describe("markLoanReturned", () => {
  it.skipIf(skipIfNoDb)("is a steward's stamp on a taken-on loan: no status or counter moves", async () => {
    const n = await liveCampaign("Returned");
    const steward = stewardCaller(STEWARD);
    const lend = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.loanOnly, { lendUntil: addDays(TODAY, 30) })));
    const gift = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.giftOnly, { contributionType: "resource" })));

    // Waiting loans and gifts are refused.
    await expect(steward.campaigns.markLoanReturned({ contributionId: lend.id }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Only a loan the stewards took on can be marked returned." });
    await steward.campaigns.updateContributionStatus({ contributionId: gift.id, status: "accepted" });
    await expect(steward.campaigns.markLoanReturned({ contributionId: gift.id }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Only a loan can be marked returned." });

    await steward.campaigns.updateContributionStatus({ contributionId: lend.id, status: "accepted" });
    // A stranger is refused.
    await expect(stewardCaller(STRANGER).campaigns.markLoanReturned({ contributionId: lend.id }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anonCaller().campaigns.markLoanReturned({ contributionId: lend.id }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const itemBefore = await dbHelpers.getCampaignItemById(n.loanOnly);
    const campaignBefore = await dbHelpers.getCampaignById(n.campaignId);
    expect(await steward.campaigns.markLoanReturned({ contributionId: lend.id })).toEqual({ success: true, changed: true });
    const after = await row(lend.id);
    expect(after.status).toBe("accepted");
    expect(after.returnedAt).toBeInstanceOf(Date);
    const itemAfter = await dbHelpers.getCampaignItemById(n.loanOnly);
    expect({ c: itemAfter!.quantityClaimed, d: itemAfter!.quantityDelivered })
      .toEqual({ c: itemBefore!.quantityClaimed, d: itemBefore!.quantityDelivered });
    expect((await dbHelpers.getCampaignById(n.campaignId))!.pledgedTotal).toBe(campaignBefore!.pledgedTotal);

    // A repeat changes nothing.
    expect(await steward.campaigns.markLoanReturned({ contributionId: lend.id })).toEqual({ success: true, changed: false });
    expect((await row(lend.id)).returnedAt!.getTime()).toBe(after.returnedAt!.getTime());

    // A delivered loan qualifies too, and an admin may stamp it.
    const lend2 = await realOffer(anonCaller().campaigns.submitContribution(offer(n.campaignId, n.both, {
      offerMode: "lend", lendUntil: addDays(TODAY, 60),
    })));
    await steward.campaigns.updateContributionStatus({ contributionId: lend2.id, status: "accepted" });
    await steward.campaigns.updateContributionStatus({ contributionId: lend2.id, status: "fulfilled" });
    expect(await adminCaller().campaigns.markLoanReturned({ contributionId: lend2.id })).toEqual({ success: true, changed: true });
    expect((await row(lend2.id)).status).toBe("fulfilled");
  });

  it.skipIf(skipIfNoDb)("leaves an example campaign's records alone", async () => {
    const n = await liveCampaign("Returned example", { isDemo: true });
    const id = await dbHelpers.createContribution({
      campaignId: n.campaignId, campaignItemId: n.loanOnly, contributionType: "equipment", title: "Example loan",
      contributorName: "Example", contributorEmail: "example.loan@example.com", status: "accepted",
      offerMode: "lend", lendUntil: addDays(TODAY, 30),
    });
    await expect(stewardCaller(STEWARD).campaigns.markLoanReturned({ contributionId: id }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Example campaigns keep their example records." });
    expect((await row(id)).returnedAt).toBeNull();
  });
});
