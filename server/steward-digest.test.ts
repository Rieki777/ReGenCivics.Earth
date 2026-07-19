/**
 * Tests for the weekly steward digest (Task 2).
 *
 * No database and no email: the composition is pure, and the campaign load, the
 * per-campaign data load, and the send are all injected. Covers a full digest
 * (standing in for demo campaign 79), the quiet-campaign skip, and the
 * "never" frequency opt-out.
 */

import { describe, it, expect } from "vitest";
import {
  composeStewardDigest,
  sendStewardWeeklyDigest,
  type StewardDigestData,
  type StewardCampaignRow,
} from "./jobs/stewardDigestJob";

const fullData = (over: Partial<StewardDigestData> = {}): StewardDigestData => ({
  campaignId: 79,
  campaignTitle: "Harmony Valley Ecovillage",
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
    // Every section links to the campaign manage page.
    expect(html).toContain("/campaign/79/manage");
    expect(html).toContain("Rye"); // greeting first name
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
});
