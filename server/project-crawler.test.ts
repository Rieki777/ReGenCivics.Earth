/**
 * What crawlers and the sitemap see of a project page (build spec
 * 2026-09-25, section 8.8): /project/:key content from the same read as
 * projects.getPublic, the two-line reading and the open needs in words, and
 * one sitemap entry per project with a live public campaign. /campaign/:id
 * has no crawler content any more: a public one answers a 301.
 *
 * Run against the SCRATCH database, never production.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as dbHelpers from "./db";
import { applications, campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
import { adminCaller, cleanupFixtureApplications, createApprovedApplication, stewardCaller } from "./test-fixtures/crowdpool";
import { projectPathForApplication } from "../shared/projectKey";

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
const OWNER = 987211;
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

async function campaignFor(applicationId: number, title: string, live: boolean) {
  const { id } = await stewardCaller(OWNER).campaigns.create({
    title: `Test Crawler ${title}`,
    description: "We are planting a food forest. It needs hands and tools, and we need $20,000 for a well.",
    projectName: `Test Crawler ${title}`,
    currency: "USD",
    financialTarget: 500,
    applicationId,
    items: [{ category: "resource", resourceName: "Fence posts", resourceDescription: "Posts", quantityWanted: 2, estimatedValue: 1000 }],
  });
  createdCampaignIds.push(id);
  if (live) await adminCaller().campaigns.updateStatus({ id, status: "active" });
  return id;
}

describe("crawler content for /project/:key", () => {
  it.skipIf(skipIfNoDb)("reads the project page: name, place, the two lines and the open needs in words", async () => {
    const name = `Test Crawler Hill & <b>Orchard</b> ${Date.now()}`;
    const applicationId = await createApprovedApplication(OWNER, { name });
    await campaignFor(applicationId, "Live", true);
    const path = projectPathForApplication(applicationId, name);

    const { resolveCrawlerContent } = await import("./_core/crawler-content");
    const content = await resolveCrawlerContent(`/project/${applicationId}-old-slug`);
    expect(content).not.toBeNull();
    expect(content!.title).toBe(`Contribute to ${name} | ReGen Civics`);
    // An old slug names the real page as canonical.
    expect(content!.canonicalPath).toBe(path);
    const body = content!.bodyHtml;
    expect(body).toContain("In-kind: 0 of 1 needs met ($0 of $1,000 confirmed)");
    expect(body).toContain("Money: $0 of $500");
    expect(body).toContain("1 need still open. 1 thing.");
    expect(body).toContain("<h2>What this project needs</h2>");
    expect(body).toContain("<li>Offer: Fence posts (No one has offered yet)</li>");
    // The name is escaped, never markup.
    expect(body).toContain("Test Crawler Hill &amp; &lt;b&gt;Orchard&lt;/b&gt;");
    expect(body).not.toContain("<b>Orchard</b>");
    expect(content!.description!.startsWith("1 need still open. 1 thing. We are planting a food forest.")).toBe(true);
    expect(content!.description!.length).toBeLessThanOrEqual(160);
    expect(content!.jsonld).toMatchObject({ "@type": "Project", name, url: `https://regencivics.earth${path}` });
  });

  it.skipIf(skipIfNoDb)("a project with no public page has no content, and /campaign/:id has none either", async () => {
    const applicationId = await createApprovedApplication(OWNER);
    const draftId = await campaignFor(applicationId, "Draft", false);
    // Back in review with nothing live: no public page.
    const database = await dbHelpers.getDb();
    await database!.update(applications).set({ status: "submitted" }).where(eq(applications.id, applicationId));
    const { resolveCrawlerContent } = await import("./_core/crawler-content");
    expect(await resolveCrawlerContent(`/project/${applicationId}-anything`)).toBeNull();
    expect(await resolveCrawlerContent(`/campaign/${draftId}`)).toBeNull();
  });
});

describe("sitemap project paths", () => {
  it.skipIf(skipIfNoDb)("lists each project with a live public campaign once, and never an unpublished one", async () => {
    const liveName = `Test Crawler Sitemap Live ${Date.now()}`;
    const liveApp = await createApprovedApplication(OWNER, { name: liveName });
    await campaignFor(liveApp, "Sitemap A", true);
    await campaignFor(liveApp, "Sitemap B", true);
    const draftName = `Test Crawler Sitemap Draft ${Date.now()}`;
    const draftApp = await createApprovedApplication(OWNER, { name: draftName });
    await campaignFor(draftApp, "Sitemap Draft", false);

    const { publicProjectPaths } = await import("./lib/project-page");
    const paths = await publicProjectPaths();
    const livePath = projectPathForApplication(liveApp, liveName);
    expect(paths.filter((p) => p === livePath)).toHaveLength(1);
    expect(paths).not.toContain(projectPathForApplication(draftApp, draftName));
    expect(paths.every((p) => p.startsWith("/project/"))).toBe(true);
  });
});
