/**
 * A filled role that opens up again tells the people who offered to it
 * (2026-09-24).
 *
 * A role measured in hours a week reads filled once its accepted hours reach
 * the hours it needs. It opens up again on a release, on lowered hours, or on
 * more hours needed. Each of those sends one role_reopened notice to account
 * holders still waiting on the role (pending). People a steward declined hear
 * nothing (ROLE_REOPENED_REACHES_DECLINED is off).
 * Never the person released or changed, never anyone already holding hours
 * on the role, never the steward who acted, never someone without an account.
 *
 * insertNotification is mocked, so every spine row is a call this file reads.
 * Run against the SCRATCH database, never production.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
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
const APPLICANT = 986511; // creates the campaign (a steward)
const CO_STEWARD = 986512; // the steward who acts
const HOLDER = 986513; // accepted, then released or lowered
const HOLDER_TWO = 986514; // keeps their hours
const WAITING = 986515; // offer still pending
const NOT_TAKEN = 986516; // offer declined
const BOTH = 986517; // one pending offer and one declined offer

const createdCampaignIds: number[] = [];
const insertMock = vi.mocked(insertNotification);
const sendMock = vi.mocked(sendEmail);

type Row = { userId: number; type: string; dedupeKey: string; title: string; body?: string | null; link?: string | null };
const rows = (): Row[] => insertMock.mock.calls.map((c) => c[0] as Row);
const reopened = () => rows().filter((r) => r.type === "role_reopened");
const reopenedTo = () => reopened().map((r) => r.userId).sort();

async function roleCampaign(title: string, hours: number) {
  const applicationId = await createApprovedApplication(APPLICANT, { stewardUserId: CO_STEWARD });
  const { id } = await stewardCaller(APPLICANT).campaigns.create({
    title: `Test Reopen ${title}`,
    description: "Reopen fixture",
    projectName: `Test Reopen ${title}`,
    currency: "USD",
    financialTarget: 1000,
    applicationId,
    items: [{ category: "role", kind: "role", roleTitle: "Seed keeper", hoursPerWeek: hours, estimatedValue: 4000 }],
  });
  createdCampaignIds.push(id);
  await adminCaller().campaigns.updateStatus({ id, status: "active" });
  const needs = await stewardCaller(APPLICANT).campaigns.getItems({ campaignId: id });
  return { campaignId: id, itemId: needs[0].id as number };
}

function offer(campaignId: number, itemId: number, userId: number, hours: number) {
  return realOffer(stewardCaller(userId).campaigns.submitContribution({
    campaignId, campaignItemId: itemId, contributionType: "role", title: `Offer from ${userId}`,
    contributorName: `Person ${userId}`, contributorEmail: `person.${userId}@example.com`,
    hoursPerWeek: hours, roleTitle: "Seed keeper", estimatedValue: 0,
  }));
}
function offerAnon(campaignId: number, itemId: number, hours: number) {
  return realOffer(anonCaller().campaigns.submitContribution({
    campaignId, campaignItemId: itemId, contributionType: "role", title: "Anon offer",
    contributorName: "No Account", contributorEmail: "no.account.reopen@example.com",
    hoursPerWeek: hours, roleTitle: "Seed keeper", estimatedValue: 0,
  }));
}
const steward = () => stewardCaller(CO_STEWARD).campaigns;
const status = (contributionId: number, s: "accepted" | "rejected" | "released", extra: Record<string, unknown> = {}) =>
  steward().updateContributionStatus({ contributionId, status: s, ...extra } as any);

/**
 * A 40-hour role, filled by HOLDER (30) and HOLDER_TWO (10). Waiting on it:
 * WAITING, BOTH, an anonymous offer, and a second offer from each holder.
 * Not taken: NOT_TAKEN and BOTH's other offer.
 */
async function filledRole(title: string) {
  const { campaignId, itemId } = await roleCampaign(title, 40);
  const holder = await offer(campaignId, itemId, HOLDER, 30);
  const holderTwo = await offer(campaignId, itemId, HOLDER_TWO, 10);
  await offer(campaignId, itemId, HOLDER, 5); // the released person's other offer
  await offer(campaignId, itemId, HOLDER_TWO, 5); // someone who still holds hours
  await offer(campaignId, itemId, WAITING, 10);
  await offer(campaignId, itemId, BOTH, 8);
  await offerAnon(campaignId, itemId, 12);
  const declined = await offer(campaignId, itemId, NOT_TAKEN, 20);
  const declinedToo = await offer(campaignId, itemId, BOTH, 4);
  await status(declined.id, "rejected");
  await status(declinedToo.id, "rejected");
  await status(holder.id, "accepted");
  await status(holderTwo.id, "accepted");
  const need = (await dbHelpers.getCampaignItemById(itemId))!;
  expect(need.quantityClaimed).toBe(40);
  return { campaignId, itemId, holder, holderTwo };
}

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
    await database!.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await cleanupFixtureApplications();
});

describe("a filled role opens up again", () => {
  it.skipIf(skipIfNoDb)("a release tells people still waiting, once each, never the person released or anyone declined", async () => {
    const { campaignId, itemId, holder } = await filledRole("Release");
    insertMock.mockClear();
    sendMock.mockClear();

    await status(holder.id, "released");

    // NOT_TAKEN was declined and hears nothing; BOTH also has a waiting offer.
    expect(reopenedTo()).toEqual([BOTH, WAITING].sort());
    const got = reopened();
    for (const r of got) {
      expect(r.title).toBe("A role you offered to has opened up");
      expect(r.body).toContain("Seed keeper at Test Reopen Release has 30 hours a week open again.");
      expect(r.link).toMatch(new RegExp(String.raw`^/project/\d+-test-reopen-release\?campaign=` + campaignId + "#needs$"));
      expect(r.dedupeKey).toMatch(new RegExp(`^cp:rolereopened:${itemId}:o30:\\d+:u${r.userId}$`));
    }
    expect(got.find((r) => r.userId === WAITING)!.body).toContain("Your offer is still with the stewards.");
    expect(got.find((r) => r.userId === BOTH)!.body).toContain("Your offer is still with the stewards.");
    for (const r of got) expect(r.body).not.toContain("offer again");
    // The released person hears their own notice, nothing more.
    expect(rows().filter((r) => r.userId === HOLDER).map((r) => r.type)).toEqual(["contribution_released"]);
    // No direct email: account holders hear on the spine, the anonymous offer hears nothing.
    expect(sendMock).not.toHaveBeenCalled();

    // A repeat release changes nothing and tells nobody again.
    insertMock.mockClear();
    const again = await status(holder.id, "released");
    expect(again).toMatchObject({ changed: false });
    expect(reopened()).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("lowering someone's hours on a filled role tells the same people, once", async () => {
    const { holder } = await filledRole("Lower");
    insertMock.mockClear();

    await steward().setAcceptedHours({ contributionId: holder.id, hours: 20 });
    expect(reopenedTo()).toEqual([BOTH, WAITING].sort());
    for (const r of reopened()) expect(r.body).toContain("has 10 hours a week open again.");
    // The person whose hours changed hears only their hours notice.
    expect(rows().filter((r) => r.userId === HOLDER).map((r) => r.type)).toEqual(["contribution_accepted"]);

    // The same hours again change nothing and tell nobody.
    insertMock.mockClear();
    const again = await steward().setAcceptedHours({ contributionId: holder.id, hours: 20 });
    expect(again.changed).toBe(false);
    expect(reopened()).toHaveLength(0);

    // Lowering further: the role was already open, so no new notice.
    insertMock.mockClear();
    await steward().setAcceptedHours({ contributionId: holder.id, hours: 15 });
    expect(reopened()).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("two stewards lowering the same person at once announce the reopening once", async () => {
    // Both requests read HOLDER at 30 before either commits. The one that goes
    // second must read the hours again under the lock, see the role is
    // already open, and stay quiet.
    for (let round = 0; round < 3; round++) {
      const { holder } = await filledRole(`Race ${round}`);
      insertMock.mockClear();
      const results = await Promise.allSettled([
        steward().setAcceptedHours({ contributionId: holder.id, hours: 20 }),
        stewardCaller(APPLICANT).campaigns.setAcceptedHours({ contributionId: holder.id, hours: 25 }),
      ]);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      // One reopening, so one notice each for WAITING and BOTH.
      expect(reopenedTo()).toEqual([BOTH, WAITING].sort());
    }
  });

  it.skipIf(skipIfNoDb)("raising the hours a filled role needs tells the same people, once", async () => {
    const { itemId } = await filledRole("Raise");
    insertMock.mockClear();

    await steward().setNeedHours({ itemId, hoursNeeded: 60 });
    expect(reopenedTo()).toEqual([BOTH, WAITING].sort());
    for (const r of reopened()) expect(r.body).toContain("has 20 hours a week open again.");
    expect(reopened().some((r) => [HOLDER, HOLDER_TWO, CO_STEWARD, APPLICANT].includes(r.userId))).toBe(false);

    // The same figure again, then a higher one: the role was already open.
    insertMock.mockClear();
    await steward().setNeedHours({ itemId, hoursNeeded: 60 });
    await steward().setNeedHours({ itemId, hoursNeeded: 80 });
    expect(reopened()).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("a role that was not filled sends nothing, whichever way it changes", async () => {
    const { campaignId, itemId } = await roleCampaign("Not filled", 40);
    const a = await offer(campaignId, itemId, HOLDER, 20);
    const b = await offer(campaignId, itemId, HOLDER_TWO, 10);
    await offer(campaignId, itemId, WAITING, 10);
    await status(a.id, "accepted");
    await status(b.id, "accepted");
    insertMock.mockClear();

    await steward().setAcceptedHours({ contributionId: a.id, hours: 15 });
    await steward().setNeedHours({ itemId, hoursNeeded: 50 });
    await status(b.id, "released");
    expect(reopened()).toHaveLength(0);
  });

  it.skipIf(skipIfNoDb)("a role that fills again and reopens again is a new notice", async () => {
    const { campaignId, itemId, holder } = await filledRole("Twice");
    await status(holder.id, "released");
    const first = reopened().map((r) => r.dedupeKey);
    expect(first).toHaveLength(2);

    // Fill it again with WAITING's 10 plus a fresh 20, then release WAITING.
    const database = await dbHelpers.getDb();
    const onRole = await database!.select().from(campaignContributions)
      .where(inArray(campaignContributions.campaignItemId, [itemId]));
    const waitingOffer = onRole.find((r) => r.userId === WAITING && r.status === "pending")!;
    const fresh = await offer(campaignId, itemId, 986518, 20);
    await status(waitingOffer.id, "accepted");
    await status(fresh.id, "accepted");
    expect((await dbHelpers.getCampaignItemById(itemId))!.quantityClaimed).toBe(40);
    insertMock.mockClear();

    await status(waitingOffer.id, "released");
    const second = reopened();
    // WAITING was just released, so they hear nothing this time. HOLDER was
    // released last time and still has a 5-hour offer waiting, so they hear.
    expect(second.map((r) => r.userId).sort()).toEqual([BOTH, HOLDER].sort());
    for (const r of second) expect(r.body).toContain("has 10 hours a week open again.");
    for (const key of second.map((r) => r.dedupeKey)) expect(first).not.toContain(key);
  });
});
