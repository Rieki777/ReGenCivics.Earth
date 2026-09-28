/**
 * Tests for the weekly steward digest (Task 2).
 *
 * No database and no email: the composition is pure, and the campaign load, the
 * per-campaign data load, and the send are all injected. Covers a full digest
 * (standing in for demo campaign 79), the quiet-campaign skip, and the
 * "never" frequency opt-out.
 */

import { describe, it, expect, vi } from "vitest";

// The DB-backed block at the end creates campaigns; keep it quiet and offline.
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));
import {
  composeStewardDigest,
  sendStewardWeeklyDigest,
  waitingLine,
  wholeDaysWaited,
  type StewardDigestData,
  type StewardCampaignRow,
} from "./jobs/stewardDigestJob";

const fullData = (over: Partial<StewardDigestData> = {}): StewardDigestData => ({
  campaignId: 79,
  campaignTitle: "Harmony Valley Ecovillage",
  projectPath: "/project/42-harmony-valley-ecovillage",
  stewardName: "Rye Cordon",
  unfilledNeeds: [
    { title: "Land Steward", wanted: 1, claimed: 0 },
    { title: "Fruit tree saplings", wanted: 40, claimed: 12 },
  ],
  expiringClaims: [{ title: "Barn raising shift", contributorName: "Maya", whenLabel: "due July 20" }],
  newFollowers: 3,
  pendingReviews: [
    { title: "A tractor", contributorName: "Sam" },
    { title: "Permaculture design sessions", contributorName: "Ada" },
  ],
  ...over,
});

describe("composeStewardDigest", () => {
  it("composes every section with manage links and the campaign title", () => {
    const out = composeStewardDigest(fullData());
    expect(out).not.toBeNull();
    const { subject, html } = out!;
    expect(subject).toBe("Harmony Valley Ecovillage: your pool this week");
    // Each section is present.
    expect(html).toContain("waiting on you"); // pending reviews
    expect(html).toContain("Claims to deliver soon");
    expect(html).toContain("Needs still open");
    expect(html).toContain("New followers");
    // Real content shows through.
    expect(html).toContain("Land Steward");
    expect(html).toContain("Fruit tree saplings: 12 of 40 filled");
    expect(html).toContain("due July 20");
    expect(html).toContain("3 people started following");
    expect(html).toContain("Sam");
    // Every section links to the project page's steward tools, by anchor.
    expect(html).not.toContain("/campaign/79/manage");
    for (const anchor of ["review", "claims", "needs", "followers", "steward-tools"]) {
      expect(html).toContain(`/project/42-harmony-valley-ecovillage?utm_source=email&utm_medium=steward-digest&utm_campaign=weekly#${anchor}`);
    }
    expect(html).toContain("Rye"); // greeting first name
  });

  it("falls back to the campaign key when no project path is given", () => {
    const { html } = composeStewardDigest(fullData({ projectPath: undefined }))!;
    expect(html).toContain("/project/c79-harmony-valley-ecovillage?");
  });

  it("reads an hours need in hours a week", () => {
    const { html } = composeStewardDigest(fullData({
      unfilledNeeds: [{ title: "Soil scientist", wanted: 40, claimed: 10, unit: "hours_per_week" }],
    }))!;
    expect(html).toContain("Soil scientist: 10 of 40 hours a week filled.");
  });

  it("keeps the copy free of em-dashes", () => {
    const { html } = composeStewardDigest(fullData())!;
    expect(html).not.toMatch(/—/); // em-dash
  });

  it("caps long lists and notes the remainder", () => {
    const manyPending = Array.from({ length: 9 }, (_v, i) => ({
      title: `Contribution ${i}`,
      contributorName: `Person ${i}`,
    }));
    const { html } = composeStewardDigest(fullData({ pendingReviews: manyPending }))!;
    expect(html).toContain("9 contributions are waiting on you");
    expect(html).toContain("and 3 more."); // 9 total, 6 shown
  });

  it("returns null when a campaign has nothing to report", () => {
    expect(
      composeStewardDigest(
        fullData({ unfilledNeeds: [], expiringClaims: [], newFollowers: 0, pendingReviews: [] }),
      ),
    ).toBeNull();
  });
});

describe("how long offers have waited (build spec 2026-09-27, section 8.4)", () => {
  it("each waiting offer says how long it has waited, oldest first as loaded", () => {
    const { html } = composeStewardDigest(fullData({
      pendingReviews: [
        { title: "A tractor", contributorName: "Sam", waitingDays: 9 },
        { title: "Seeds", contributorName: "Ada", waitingDays: 1 },
        { title: "Hands", contributorName: "Bo", waitingDays: 0 },
      ],
    }))!;
    expect(html).toContain("<strong>Sam</strong> offered A tractor, waiting 9 days.");
    expect(html).toContain("<strong>Ada</strong> offered Seeds, waiting 1 day.");
    // Under a day: no suffix.
    expect(html).toContain("<strong>Bo</strong> offered Hands.");
    expect(html).toContain("1 of these has waited more than 2 days. The oldest has waited 9 days.");
    expect(html.indexOf("1 of these has waited")).toBeLessThan(html.indexOf("<strong>Sam</strong>"));
  });

  it("the line counts offers over 2 days, in the singular and plural", () => {
    expect(waitingLine([{ title: "a", contributorName: "x", waitingDays: 2 }])).toBeNull();
    expect(waitingLine([{ title: "a", contributorName: "x", waitingDays: 3 }])).toBe(
      "1 of these has waited more than 2 days. The oldest has waited 3 days.",
    );
    expect(waitingLine([
      { title: "a", contributorName: "x", waitingDays: 3 },
      { title: "b", contributorName: "y", waitingDays: 12 },
      { title: "c", contributorName: "z" },
    ])).toBe("2 of these have waited more than 2 days. The oldest has waited 12 days.");
  });

  it("counts whole days in UTC from the submit time", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    expect(wholeDaysWaited(new Date("2026-09-27T01:00:00Z"), now)).toBe(0);
    expect(wholeDaysWaited(new Date("2026-09-26T11:00:00Z"), now)).toBe(1);
    expect(wholeDaysWaited("2026-09-17T12:00:00Z", now)).toBe(10);
    expect(wholeDaysWaited(null, now)).toBe(0);
    expect(wholeDaysWaited(new Date("2026-09-28T12:00:00Z"), now)).toBe(0);
  });
});

describe("sendStewardWeeklyDigest", () => {
  const campaigns: StewardCampaignRow[] = [
    { id: 79, title: "Harmony Valley Ecovillage", userId: 1, email: "steward79@example.com", name: "Rye Cordon", digestFrequency: "weekly" },
    { id: 80, title: "Quiet Meadow", userId: 2, email: "steward80@example.com", name: "Jo", digestFrequency: "weekly" },
    { id: 81, title: "Opted Out Farm", userId: 3, email: "steward81@example.com", name: "Lee", digestFrequency: "never" },
  ];

  const dataFor = (_db: any, c: StewardCampaignRow): Promise<StewardDigestData> => {
    if (c.id === 79) return Promise.resolve(fullData());
    // 80 is quiet, 81 would be skipped before we get here anyway.
    return Promise.resolve(fullData({ campaignId: c.id, campaignTitle: c.title, unfilledNeeds: [], expiringClaims: [], newFollowers: 0, pendingReviews: [] }));
  };

  it("dry-run composes a correct digest for campaign 79", async () => {
    const r = await sendStewardWeeklyDigest(null, {
      dryRun: true,
      onlyCampaignId: 79,
      loadCampaigns: async () => campaigns,
      loadDigestData: dataFor,
    });
    expect(r.composed).toBe(1);
    expect(r.sent).toBe(0);
    expect(r.digests).toHaveLength(1);
    expect(r.digests[0].campaignId).toBe(79);
    expect(r.digests[0].subject).toBe("Harmony Valley Ecovillage: your pool this week");
    expect(r.digests[0].html).toContain("Land Steward");
  });

  it("sends only to active campaigns with content, skipping quiet and opted-out stewards", async () => {
    const sentTo: string[] = [];
    const r = await sendStewardWeeklyDigest(null, {
      loadCampaigns: async () => campaigns,
      loadDigestData: dataFor,
      sendEmailImpl: async (p) => {
        sentTo.push(p.to);
        return { id: "x" };
      },
    });
    expect(sentTo).toEqual(["steward79@example.com"]);
    expect(r).toMatchObject({ campaigns: 3, composed: 1, sent: 1, skippedQuiet: 1, skippedFrequency: 1 });
  });

  it("emails every steward of a campaign, loading its data once", async () => {
    const rows: StewardCampaignRow[] = [
      { id: 79, title: "Harmony Valley Ecovillage", userId: 1, email: "creator@example.com", name: "Rye Cordon", digestFrequency: "weekly" },
      { id: 79, title: "Harmony Valley Ecovillage", userId: 4, email: "applicant@example.com", name: "Ada Lane", digestFrequency: "weekly" },
    ];
    let loads = 0;
    const sent: Array<{ to: string; html: string }> = [];
    const r = await sendStewardWeeklyDigest(null, {
      loadCampaigns: async () => rows,
      loadDigestData: async () => { loads++; return fullData(); },
      sendEmailImpl: async (p) => { sent.push({ to: p.to, html: p.html }); return { id: "x" }; },
    });
    expect(loads).toBe(1);
    expect(sent.map((s) => s.to)).toEqual(["creator@example.com", "applicant@example.com"]);
    expect(sent[1].html).toContain("Hi Ada");
    expect(r.sent).toBe(2);
  });
});

// ─── DB-backed: who the default loader emails (scratch database only) ────────

describe("the default loader", () => {
  const skipIfNoDb = !process.env.DATABASE_URL;

  it.skipIf(skipIfNoDb)("emails every steward of a live campaign and skips demo campaigns", async () => {
    const { getDb } = await import("./db");
    const { users, campaigns, campaignItems } = await import("../drizzle/schema");
    const { inArray } = await import("drizzle-orm");
    const fx = await import("./test-fixtures/crowdpool");
    const database = await getDb();
    const stamp = Date.now();
    const openIds = [`digest-owner-${stamp}`, `digest-co-${stamp}`];
    const made: number[] = [];
    for (const [i, openId] of openIds.entries()) {
      const r: any = await database!.insert(users).values({ openId, email: `digest${i}.${stamp}@example.com`, name: i ? "Co Steward" : "Owner Steward", loginMethod: "email", role: "user" });
      made.push(Number(r?.[0]?.insertId));
    }
    const [owner, co] = made;
    const campaignIds: number[] = [];
    try {
      const applicationId = await fx.createApprovedApplication(owner, { stewardUserId: co });
      const make = async (title: string) => {
        const { id } = await fx.stewardCaller(owner).campaigns.create({
          title, description: "Digest fixture", projectName: title, currency: "USD", financialTarget: 100, applicationId,
          items: [{ category: "role", kind: "role", roleTitle: "Organiser", hoursPerWeek: 40, estimatedValue: 100 }],
        });
        campaignIds.push(id);
        await fx.adminCaller().campaigns.updateStatus({ id, status: "active" });
        return id;
      };
      const live = await make("Test Digest Live");
      const demo = await make("Test Digest Demo");
      await database!.update(campaigns).set({ isDemo: 1 }).where(inArray(campaigns.id, [demo]));

      const out = await sendStewardWeeklyDigest(database, { dryRun: true, onlyCampaignId: live });
      expect(out.digests).toHaveLength(2);
      expect(out.digests[0].html).toContain(`/project/${applicationId}-test-digest-live?`);
      // Focused on the campaign, so a project with several campaigns opens on this one.
      expect(out.digests[0].html).toContain(`/project/${applicationId}-test-digest-live?campaign=${live}&utm_source=email`);
      expect(out.digests[0].html).toContain("Organiser: 0 of 40 hours a week filled.");
      const html = out.digests.map((d) => d.html).join("\n");
      expect(html).toContain("Hi Owner");
      expect(html).toContain("Hi Co");

      const none = await sendStewardWeeklyDigest(database, { dryRun: true, onlyCampaignId: demo });
      expect(none.campaigns).toBe(0);

      // A waiting offer reads its days, oldest first; a project follow is a
      // new follower (build spec 2026-09-27, sections 8.4 and 12.2).
      const { campaignContributions, userFollows } = await import("../drizzle/schema");
      const { sql } = await import("drizzle-orm");
      const offer = await fx.realOffer(fx.anonCaller().campaigns.submitContribution({
        campaignId: live, contributionType: "role", title: "An offer of hands", estimatedValue: 10,
        contributorName: "Waiting Wren", contributorEmail: `digest.wait.${stamp}@example.com`,
      }));
      await database!.execute(sql`UPDATE campaign_contributions SET submittedAt = NOW() - INTERVAL 4 DAY - INTERVAL 1 HOUR WHERE id = ${offer.id}`);
      await fx.stewardCaller(owner + 100000).campaigns.followProject({ key: String(applicationId) });
      try {
        const later = await sendStewardWeeklyDigest(database, { dryRun: true, onlyCampaignId: live });
        expect(later.digests[0].html).toContain("<strong>Waiting Wren</strong> offered An offer of hands, waiting 4 days.");
        expect(later.digests[0].html).toContain("1 of these has waited more than 2 days. The oldest has waited 4 days.");
        expect(later.digests[0].html).toContain("1 person started following this campaign this week.");
      } finally {
        await database!.delete(campaignContributions).where(inArray(campaignContributions.campaignId, [live]));
        await database!.delete(userFollows).where(inArray(userFollows.userId, [owner + 100000]));
      }
    } finally {
      if (campaignIds.length) {
        await database!.delete(campaignItems).where(inArray(campaignItems.campaignId, campaignIds));
        await database!.delete(campaigns).where(inArray(campaigns.id, campaignIds));
      }
      await database!.delete(users).where(inArray(users.openId, openIds));
      await fx.cleanupFixtureApplications();
    }
  }, 30_000);
});
