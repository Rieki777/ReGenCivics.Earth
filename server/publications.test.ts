/**
 * Tests for Compose to Publish (Harvest Phase 5):
 *  - a publication groups its per-surface targets and drafted items
 *  - nothing publishes without per-surface approval
 *  - the article goes out as a hidden preview first, then public
 *  - publishing an already-published target is a no-op (idempotent)
 *  - the preview token gates the hidden article; public articles list openly
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";
import type { Request, Response } from "express";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_OWNER_ID = 987_654_305;

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "t", created: 0, model: "mock",
    choices: [{ index: 0, message: { role: "assistant", content: "Test Article Title Here\n\nFood is our foundation. We plant seeds and the forest feeds the village. The work continues season after season." }, finish_reason: "stop" }],
  }),
  isLLMConfigured: () => true,
}));

const createMockContext = async (user: { id: number; role: string } | null = null) => {
  const mockReq = { cookies: {}, headers: {}, ip: "127.0.0.1" } as unknown as Request;
  const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
  const ctx = await createContext({ req: mockReq, res: mockRes } as unknown as Parameters<typeof createContext>[0]);
  if (user) (ctx as any).user = user;
  return ctx;
};

describe("compose to publish (DB)", () => {
  let prevOwner: number;

  async function cleanup() {
    const { getDb } = await import("./db");
    const schema = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return;
    const pubs = await db.select({ id: schema.publications.id }).from(schema.publications)
      .where(eq(schema.publications.ownerId, TEST_OWNER_ID));
    for (const pub of pubs) {
      await db.delete(schema.publicationTargets).where(eq(schema.publicationTargets.publicationId, pub.id));
    }
    await db.delete(schema.publicationImages).where(eq(schema.publicationImages.ownerId, TEST_OWNER_ID));
    await db.delete(schema.publishedArticles).where(eq(schema.publishedArticles.ownerId, TEST_OWNER_ID));
    await db.delete(schema.publications).where(eq(schema.publications.ownerId, TEST_OWNER_ID));
    await db.delete(schema.creationItems).where(eq(schema.creationItems.ownerId, TEST_OWNER_ID));
    await db.delete(schema.harvestIdeas).where(eq(schema.harvestIdeas.ownerId, TEST_OWNER_ID));
  }

  beforeAll(async () => {
    prevOwner = ENV.ownerUserId;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
    if (!skipIfNoDb) await cleanup();
  }, 60_000);

  afterAll(async () => {
    (ENV as any).ownerUserId = prevOwner;
    if (!skipIfNoDb) await cleanup();
  }, 60_000);

  it("rejects a non-owner", async () => {
    const ctx = await createMockContext({ id: TEST_OWNER_ID + 1, role: "admin" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.harvest.compose({ text: "an idea worth composing today" })).rejects.toThrow(/Owner access required/);
  });

  it.skipIf(skipIfNoDb)("compose -> approve -> hidden preview -> public -> idempotent", { timeout: 120_000 }, async () => {
    const ctx = await createMockContext({ id: TEST_OWNER_ID, role: "user" });
    const caller = appRouter.createCaller(ctx);

    // Compose creates the publication with all six surface targets + items.
    const { publicationId } = await caller.harvest.compose({
      text: "Food forests as the base layer of a regenerative economy\n\nEvery bioregion can feed itself from layered perennial systems.",
    });
    const review = await caller.harvest.publicationReview({ publicationId });
    expect(review.targets).toHaveLength(6);
    expect(new Set(review.targets.map((t) => t.surface))).toEqual(new Set(["site", "linkedin", "facebook", "instagram", "threads_x", "email"]));
    expect(review.items.length).toBeGreaterThanOrEqual(5);
    for (const target of review.targets) expect(target.status).toBe("draft");

    // Nothing publishes without approval.
    await expect(caller.harvest.publishTarget({ publicationId, surface: "site" }))
      .rejects.toThrow(/not approved/);

    // Approve + first publish = hidden preview, not public.
    await caller.harvest.approveTarget({ publicationId, surface: "site" });
    const first = await caller.harvest.publishTarget({ publicationId, surface: "site" });
    expect(first.previewToken).toBeTruthy();
    expect(first.status).toBe("approved");

    // The hidden preview is token-gated on the public blog endpoint.
    const after = await caller.harvest.publicationReview({ publicationId });
    expect(after.article?.status).toBe("preview");
    const slug = after.article!.slug;
    const anon = appRouter.createCaller(await createMockContext(null));
    expect(await anon.blog.getPublished({ slug })).toBeNull();
    const withToken = await anon.blog.getPublished({ slug, previewToken: first.previewToken! });
    expect(withToken).not.toBeNull();
    expect((withToken as { isPreview?: boolean }).isPreview).toBe(true);
    expect(await anon.blog.listPublished()).not.toContainEqual(expect.objectContaining({ slug }));

    // Second publish with makePublic goes live (voice grader passes on the
    // mocked draft), and the article serves publicly without a token.
    const second = await caller.harvest.publishTarget({ publicationId, surface: "site", makePublic: true });
    expect(second.status).toBe("published");
    expect(second.externalUrl).toContain(`/blog/${slug}`);
    const publicRead = await anon.blog.getPublished({ slug });
    expect(publicRead).not.toBeNull();
    expect((await anon.blog.listPublished()).some((a) => a.slug === slug)).toBe(true);

    // Idempotent: publishing again fires nothing and says so.
    const again = await caller.harvest.publishTarget({ publicationId, surface: "site", makePublic: true });
    expect(again.status).toBe("published");
    expect(again.note).toMatch(/Already published/);

    // The unpublish window pulls it back.
    await caller.harvest.unpublishArticle({ publicationId });
    expect(await anon.blog.getPublished({ slug })).toBeNull();

    // Social without a Buffer connection fails safe with a clear message.
    await caller.harvest.approveTarget({ publicationId, surface: "linkedin" });
    await expect(caller.harvest.publishTarget({ publicationId, surface: "linkedin", profileId: "p1" }))
      .rejects.toThrow(/Buffer/);

    // Email never publishes from here; it routes to the hardened send.
    await caller.harvest.approveTarget({ publicationId, surface: "email" });
    const email = await caller.harvest.publishTarget({ publicationId, surface: "email" });
    expect(email.note).toMatch(/hardened send/);
  });

  it.skipIf(skipIfNoDb)("images require alt text at the schema level", { timeout: 60_000 }, async () => {
    const { getDb } = await import("./db");
    const { publicationImages } = await import("../drizzle/schema");
    const db = (await getDb())!;
    await expect(db.insert(publicationImages).values({
      ownerId: TEST_OWNER_ID,
      publicationId: 999_999,
      slot: "hero",
      r2Key: "k",
      url: "https://example.org/x.png",
      altText: null as unknown as string,
    })).rejects.toThrow();
  });
});
