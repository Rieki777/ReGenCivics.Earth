/**
 * The ReGen Tools Library end to end against a real database (ADR-73): an
 * Alliance Partner brings tools on the application, they queue for review,
 * approving the partner lists the ticked ones under the partner's name, the
 * owner can edit a listing and nobody else can, land projects say what they
 * use, and /tools/submit cleans links and never lists one twice.
 * Runs only with a local DATABASE_URL (server/test-db-guard.ts).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import { getDb } from "./db";
import {
  allianceApplicationEvents,
  allianceApplications,
  allianceApplicationTools,
  eventSignups,
  interopTools,
  organisations,
  regenToolProjectUsage,
  regenTools,
} from "../drizzle/schema";
import { adminCaller, cleanupFixtureApplications, createApprovedApplication, ctxFor } from "./test-fixtures/crowdpool";
import { appRouter } from "./routers";

const skipIfNoDb = !process.env.DATABASE_URL;

vi.mock("./_core/email", async () => {
  const actual = await vi.importActual<typeof import("./_core/email")>("./_core/email");
  return { ...actual, sendEmail: vi.fn(async () => ({ id: "test", status: "sent" })) };
});
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));

const STAMP = Date.now();
const PARTNER = 986_500 + (STAMP % 400);
const STRANGER = PARTNER + 1;
const FOUNDER = PARTNER + 2;
const host = `fixture-tools-${STAMP}.example`;
const url = (p: string) => `https://${host}/${p}`;
const caller = (id: number) => appRouter.createCaller(ctxFor(id, "user"));

async function cleanup() {
  const d = await getDb();
  if (!d) return;
  const tools = await d.select({ id: regenTools.id }).from(regenTools).where(like(regenTools.websiteUrl, `%${host}%`));
  const toolIds = tools.map((t) => t.id);
  const apps = await d.select({ id: allianceApplications.id }).from(allianceApplications).where(eq(allianceApplications.contactEmail, `fixture${PARTNER}@example.com`));
  const appIds = apps.map((a) => a.id);
  if (toolIds.length) {
    await d.delete(regenToolProjectUsage).where(inArray(regenToolProjectUsage.toolId, toolIds));
    await d.delete(allianceApplicationTools).where(inArray(allianceApplicationTools.toolId, toolIds));
    await d.delete(regenTools).where(inArray(regenTools.id, toolIds));
  }
  if (appIds.length) {
    await d.delete(allianceApplicationEvents).where(inArray(allianceApplicationEvents.allianceApplicationId, appIds));
    await d.delete(allianceApplicationTools).where(inArray(allianceApplicationTools.allianceApplicationId, appIds));
    await d.delete(allianceApplications).where(inArray(allianceApplications.id, appIds));
    await d.delete(organisations).where(inArray(organisations.orgId, appIds.map((i) => `alliance-app-${i}`)));
  }
  await d.delete(interopTools).where(eq(interopTools.email, `fixture${PARTNER}@example.com`));
  await d.delete(eventSignups).where(eq(eventSignups.email, `fixture${PARTNER}@example.com`));
  await cleanupFixtureApplications();
}

beforeAll(async () => { if (!skipIfNoDb) await cleanup(); });
afterAll(async () => { if (!skipIfNoDb) await cleanup(); });

describe.skipIf(skipIfNoDb)("the tools library fills in from the applications", () => {
  let appId = 0;
  let existingId = 0;
  let treasuryId = 0;
  let kitId = 0;

  it("a link already in the library is linked, never listed twice", async () => {
    const d = (await getDb())!;
    const res: any = await d.insert(regenTools).values({
      name: `Fixture Existing ${STAMP}`, slug: `fixture-existing-${STAMP}`, websiteUrl: url("existing"), status: "approved",
    });
    existingId = Number(res?.[0]?.insertId ?? res?.insertId);
  });

  it("tools save with the draft and must each have a link and a sentence before sending", async () => {
    const me = caller(PARTNER);
    await me.allianceApplications.save({
      organizationName: `Fixture Tools Org ${STAMP}`,
      contactName: "Fixture Partner",
      roles: ["Technology"],
      supportDescription: "We build open tools for land trusts and their stewards.",
      tools: [
        { url: url("treasury"), name: "Fixture Treasury", description: "A shared treasury template for land projects.", kind: "software", isOpenSource: true },
        { url: url("kit"), description: "short", kind: "physical" },
        { url: `HTTP://WWW.${host.toUpperCase()}/existing/`, description: "The thing everyone already uses.", kind: "software" },
      ],
    });
    await expect(me.allianceApplications.submit()).rejects.toThrow(/a sentence on what it does for tool 2/);
    const [mine] = await me.allianceApplications.mine();
    appId = mine.id;
    expect(JSON.parse(mine.tools ?? "[]")).toHaveLength(3);
    expect(mine.libraryTools).toEqual([]);
  });

  it("sending puts new tools in the review queue and links the existing one", async () => {
    const me = caller(PARTNER);
    await me.allianceApplications.save({
      tools: [
        { url: url("treasury"), name: "Fixture Treasury", description: "A shared treasury template for land projects.", kind: "software", isOpenSource: true },
        { url: url("kit"), description: "A printable storytelling kit for markets.", kind: "physical" },
        { url: `HTTP://WWW.${host.toUpperCase()}/existing/`, description: "The thing everyone already uses.", kind: "software" },
      ],
    });
    await me.allianceApplications.submit();
    const [mine] = await me.allianceApplications.mine();
    const byName = Object.fromEntries(mine.libraryTools.map((t) => [t.name, t]));
    expect(mine.libraryTools).toHaveLength(3);
    expect(byName["Fixture Treasury"]).toMatchObject({ status: "pending", createdByApplication: true, toolKind: "software" });
    expect(mine.libraryTools.find((t) => t.toolId === existingId)).toMatchObject({ createdByApplication: false, status: "approved" });
    treasuryId = byName["Fixture Treasury"].toolId;
    kitId = mine.libraryTools.find((t) => t.websiteUrl === url("kit"))!.toolId;

    const queue = await adminCaller().tools.listPending();
    const row = queue.find((q) => q.id === treasuryId);
    expect(row?.allianceOrganization).toBe(`Fixture Tools Org ${STAMP}`);
    // Pending tools are not public.
    expect(await caller(STRANGER).tools.getBySlug({ slug: byName["Fixture Treasury"].slug })).toBeNull();
  });

  it("an edit to a sent application keeps the queue in step", async () => {
    const me = caller(PARTNER);
    await me.allianceApplications.save({
      tools: [
        { url: url("treasury"), name: "Fixture Treasury", description: "A shared treasury template land projects adopt together.", kind: "software", isOpenSource: true },
        { url: url("kit"), description: "A printable storytelling kit for markets.", kind: "physical" },
        { url: `https://${host}/existing`, description: "The thing everyone already uses.", kind: "software" },
      ],
    });
    const d = (await getDb())!;
    const [t] = await d.select({ shortSummary: regenTools.shortSummary }).from(regenTools).where(eq(regenTools.id, treasuryId));
    expect(t.shortSummary).toBe("A shared treasury template land projects adopt together.");
  });

  it("approving the partner lists only the ticked tools, under the partner's name", async () => {
    const res = await adminCaller().allianceApplications.updateStatus({ id: appId, status: "approved", toolIds: [treasuryId] });
    expect(res.handoff?.tools).toBe(1);
    const d = (await getDb())!;
    const rows = await d.select({ id: regenTools.id, status: regenTools.status }).from(regenTools).where(inArray(regenTools.id, [treasuryId, kitId]));
    expect(Object.fromEntries(rows.map((r) => [r.id, r.status]))).toEqual({ [treasuryId]: "approved", [kitId]: "pending" });

    const list = await caller(STRANGER).tools.list({ limit: 50, sort: "newest" });
    const listed = list.find((t: any) => t.id === treasuryId);
    expect(listed).toMatchObject({ partnerName: `Fixture Tools Org ${STAMP}`, toolKind: "software" });
    expect(listed).not.toHaveProperty("contactEmail");
    // The unticked tool waits in the queue on its own.
    expect((await adminCaller().tools.listPending()).some((q) => q.id === kitId)).toBe(true);
  });

  it("the owner edits their listing, nobody else can, and links stay http or https", async () => {
    const mine = await caller(PARTNER).tools.mine();
    expect(mine.map((t) => t.id)).toEqual(expect.arrayContaining([treasuryId, kitId]));
    expect(mine.map((t) => t.id)).not.toContain(existingId);
    await caller(PARTNER).tools.updateMine({ toolId: treasuryId, shortSummary: "Pool and steward funds together, in an afternoon." });
    await expect(caller(PARTNER).tools.updateMine({ toolId: treasuryId, websiteUrl: "javascript:alert(1)" })).rejects.toThrow(/link/);
    await expect(caller(STRANGER).tools.updateMine({ toolId: treasuryId, name: "Hijacked" })).rejects.toThrow(/your own/);
    await expect(caller(PARTNER).tools.updateMine({ toolId: existingId, name: "Not mine" })).rejects.toThrow(/your own/);
  });

  it("land projects say what they use; only accepted projects count publicly", async () => {
    const accepted = await createApprovedApplication(FOUNDER, { status: "approved" });
    const draft = await createApprovedApplication(FOUNDER, { status: "draft" });
    const founder = caller(FOUNDER);
    await founder.tools.setProjectTools({ applicationId: accepted, toolIds: [treasuryId, kitId] });
    await founder.tools.setProjectTools({ applicationId: draft, toolIds: [treasuryId] });
    // Only approved library tools can be picked.
    expect(await founder.tools.projectTools({ applicationId: accepted })).toEqual([treasuryId]);
    await expect(caller(STRANGER).tools.setProjectTools({ applicationId: accepted, toolIds: [treasuryId] })).rejects.toThrow(/not your project/);
    const listed = (await caller(STRANGER).tools.list({ limit: 50, sort: "newest" })).find((t: any) => t.id === treasuryId);
    expect(listed?.usedByProjects).toBe(1);
  });

  it("/tools/submit cleans links, points to an existing entry, and never collides on a name", async () => {
    const me = caller(STRANGER);
    await expect(me.tools.submitTool({ name: "Bad", websiteUrl: "javascript:alert(1)" })).rejects.toThrow(/link/);
    const dup = await me.tools.submitTool({ name: "Again", websiteUrl: `${host}/existing` });
    expect(dup.existing?.approved).toBe(true);
    const a = await me.tools.submitTool({ name: `Fixture Same Name ${STAMP}`, websiteUrl: url("same-1") });
    const b = await me.tools.submitTool({ name: `Fixture Same Name ${STAMP}`, websiteUrl: url("same-2") });
    expect(a.existing).toBeNull();
    expect(b.existing).toBeNull();
    const d = (await getDb())!;
    const slugs = (await d.select({ slug: regenTools.slug }).from(regenTools).where(like(regenTools.websiteUrl, `%${host}/same-%`))).map((r) => r.slug).sort();
    expect(slugs).toEqual([`fixture-same-name-${STAMP}`, `fixture-same-name-${STAMP}-2`]);
  });

  it("the prefill refuses to read an internal address", async () => {
    const res = await caller(STRANGER).tools.analyzeUrl({ url: "http://169.254.169.254/latest/meta-data" });
    expect(res.name).toBe("");
  });
});
