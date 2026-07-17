/**
 * Tests for the Harvest Phase 2:
 *  - composeRipeness matches the deterministic v1 formula
 *  - the voice grader catches each hard-rule violation and passes clean copy
 *  - ownerProcedure guards the harvest router
 *  - develop creates a draft; upsert is write-once after an edit; getSource
 *    returns provenance (DB-backed, skipped without DATABASE_URL)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";
import type { Request, Response } from "express";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_OWNER_ID = 987_654_302;

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "t", created: 0, model: "mock",
    choices: [{ index: 0, message: { role: "assistant", content: "Food is our foundation. We plant seeds and the food forest feeds the village." }, finish_reason: "stop" }],
  }),
  isLLMConfigured: () => true,
}));

import { composeRipeness, isRefusalDraft } from "./lib/harvest";
import { gradeVoice } from "./lib/voice-grader";

const createMockContext = async (user: { id: number; role: string } | null = null) => {
  const mockReq = { cookies: {}, headers: {}, ip: "127.0.0.1" } as unknown as Request;
  const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
  const ctx = await createContext({ req: mockReq, res: mockRes } as unknown as Parameters<typeof createContext>[0]);
  if (user) (ctx as any).user = user;
  return ctx;
};

describe("composeRipeness", () => {
  it("matches the v1 formula weights", () => {
    expect(composeRipeness({ material: 1, recency: 1, cluster: 1, theme_focus: 1 })).toBe(1);
    expect(composeRipeness({ material: 1, recency: 0, cluster: 0, theme_focus: 0 })).toBe(0.35);
    expect(composeRipeness({ material: 0, recency: 1, cluster: 1, theme_focus: 0 })).toBe(0.5);
    expect(composeRipeness(null)).toBe(0);
  });

  it("clamps out-of-range components", () => {
    expect(composeRipeness({ material: 5, recency: -2, cluster: 0, theme_focus: 0 })).toBe(0.35);
  });
});

describe("gradeVoice", () => {
  it("passes clean copy", () => {
    expect(gradeVoice("Food is our foundation. We plant seeds and the forest feeds the village.")).toEqual([]);
  });
  it("flags an em-dash", () => {
    expect(gradeVoice("The fund — and the game — grows.").some((f) => f.rule === "no-em-dashes")).toBe(true);
  });
  it("flags contrast framing", () => {
    expect(gradeVoice("This is not just a fund, but a movement.").some((f) => f.rule === "no-contrast-framing")).toBe(true);
  });
  it("flags banned vocabulary", () => {
    expect(gradeVoice("We leverage seamless tools.").filter((f) => f.rule === "no-ai-vocabulary").length).toBeGreaterThanOrEqual(2);
  });
  it("flags a rhetorical opener but allows the brand question", () => {
    expect(gradeVoice("Have you ever wondered about soil?").some((f) => f.rule === "no-rhetorical-openers")).toBe(true);
    expect(gradeVoice("What if healing ourselves and our Earth is actually a fun and Infinite Game?")).toEqual([]);
  });
  it("flags passive inspiration", () => {
    expect(gradeVoice("Join us on this journey to the farm.").some((f) => f.rule === "no-passive-inspiration")).toBe(true);
  });
});

describe("isRefusalDraft", () => {
  it("catches refusal-shaped outputs (seen live on the first production run)", () => {
    expect(isRefusalDraft("I can't write this post. The source material is a technical prompt.")).toBe(true);
    expect(isRefusalDraft("I need to stop here and be direct with you.")).toBe(true);
    expect(isRefusalDraft("The source material you've provided isn't about ReGen Civics at all.")).toBe(true);
  });
  it("passes real drafts, including ones that mention sources", () => {
    expect(isRefusalDraft("Food is our foundation. We plant seeds and the forest feeds the village.")).toBe(false);
    expect(isRefusalDraft("Our source material for this piece is the land itself, and it is about ReGen.")).toBe(false);
  });
});

describe("harvest router owner gate", () => {
  it("rejects a non-owner admin", async () => {
    const prev = ENV.ownerUserId;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
    try {
      const ctx = await createMockContext({ id: TEST_OWNER_ID + 1, role: "admin" });
      const caller = appRouter.createCaller(ctx);
      await expect(caller.harvest.listFeed({ tier: "all" })).rejects.toThrow(/Owner access required/);
    } finally {
      (ENV as any).ownerUserId = prev;
    }
  });
});

describe("develop -> edit -> write-once -> provenance (DB)", () => {
  let prevOwner: number;

  beforeAll(() => {
    prevOwner = ENV.ownerUserId;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
  });

  afterAll(async () => {
    (ENV as any).ownerUserId = prevOwner;
    if (!skipIfNoDb) {
      const { getDb } = await import("./db");
      const { harvestIdeas, creationItems, sourceIndex } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(creationItems).where(eq(creationItems.ownerId, TEST_OWNER_ID));
        await db.delete(harvestIdeas).where(eq(harvestIdeas.ownerId, TEST_OWNER_ID));
        await db.delete(sourceIndex).where(eq(sourceIndex.ownerId, TEST_OWNER_ID));
      }
    }
  });

  // Remote DB latency: many sequential round trips need more than the 5s default.
  it.skipIf(skipIfNoDb)("runs the full loop against the real schema", { timeout: 60_000 }, async () => {
    const { getDb } = await import("./db");
    const { harvestIdeas, sourceIndex } = await import("../drizzle/schema");
    const { and, eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    await db.insert(sourceIndex).values({
      ownerId: TEST_OWNER_ID,
      refId: "sm-test-1",
      date: new Date("2026-04-02"),
      text: "Food is our foundation. Every regenerative economy roots in local food.",
      links: ["https://example.org/food"],
    });
    await db.insert(harvestIdeas).values({
      ownerId: TEST_OWNER_ID,
      ideaRef: "test-idea-food-foundation",
      title: "Food Is the Foundation (test)",
      summary: "Why every regenerative economy roots in local food.",
      themes: ["food-systems"],
      ripeness: 0.72,
      scoreComponents: { material: 0.8, recency: 0.7, cluster: 0.6, theme_focus: 1 },
      whyNow: "three notes cluster here",
      sourceRefs: ["sm-test-1"],
      status: "ripe",
    });
    const [idea] = await db.select().from(harvestIdeas)
      .where(and(eq(harvestIdeas.ownerId, TEST_OWNER_ID), eq(harvestIdeas.ideaRef, "test-idea-food-foundation")));

    const ctx = await createMockContext({ id: TEST_OWNER_ID, role: "user" });
    const caller = appRouter.createCaller(ctx);

    // Feed shows the idea.
    const feed = await caller.harvest.listFeed({ tier: "all" });
    expect(feed.ready).toBe(true);
    expect(feed.ideas.some((i) => i.id === idea.id)).toBe(true);

    // Develop drafts the chosen channel (LLM mocked).
    const dev = await caller.harvest.develop({ ideaId: idea.id, channels: ["linkedin"], angle: "the numbers" });
    expect(dev.items).toHaveLength(1);
    const item = dev.items[0];
    expect(item.channel).toBe("linkedin");
    expect(item.body).toContain("Food is our foundation");
    expect(item.aiBody).toBe(item.body);

    // Edit in place: body changes, ai_body stays, status flips to edited.
    await caller.harvest.editItem({ itemId: item.id, body: "My own words now." });
    const after = await caller.harvest.listFeed({ tier: "drafts" });
    const edited = after.drafts.find((d) => d.id === item.id)!;
    expect(edited.status).toBe("edited");
    expect(edited.body).toBe("My own words now.");
    expect(edited.aiBody).toContain("Food is our foundation");

    // Write-once: the worker-side upsert must refuse to overwrite an edited row.
    const { upsertDraft } = await import("./lib/harvest");
    const overwrite = await upsertDraft(idea, "linkedin", "worker tries to clobber");
    expect(overwrite).toBeNull();
    const still = await caller.harvest.listFeed({ tier: "drafts" });
    expect(still.drafts.find((d) => d.id === item.id)!.body).toBe("My own words now.");

    // Provenance returns the source row and its link tree.
    const prov = await caller.harvest.getSource({ itemId: item.id });
    expect(prov.sources.some((s) => s.refId === "sm-test-1")).toBe(true);
    expect(prov.linkTree).toContain("https://example.org/food");

    // markPosted flips to shipped and captures the final text.
    await caller.harvest.markPosted({ itemId: item.id, postedText: "Final as posted." });
    const shipped = await caller.harvest.listFeed({ tier: "drafts" });
    expect(shipped.drafts.find((d) => d.id === item.id)!.status).toBe("shipped");
  });
});
