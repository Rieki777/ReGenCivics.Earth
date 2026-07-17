/**
 * Tests for the Harvest Phase 3 learning loop:
 *  - large rewrites are forced to content (never learned)
 *  - hard-rule-contradicting and entity-referencing candidates are rejected
 *  - style/content routing: only style edits extract rules
 *  - weight increments on recurrence; bodies purged after extraction
 *  - only top-N rules load into a drafting prompt
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { ENV } from "./_core/env";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_OWNER_ID = 987_654_303;

const invokeLLMMock = vi.fn();
vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLMMock(...args),
  isLLMConfigured: () => true,
}));

import {
  isLargeRewrite, validateCandidateRule, processEdit, storeRules, loadTopRules,
} from "./lib/voice-learning";

function llmReturns(rules: Array<{ category: string; rule: string }>) {
  invokeLLMMock.mockResolvedValue({
    id: "t", created: 0, model: "mock",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ rules }) }, finish_reason: "stop" }],
  });
}

describe("isLargeRewrite", () => {
  it("passes a small style tweak", () => {
    expect(isLargeRewrite(
      "We plant seeds and the forest feeds the village over many years.",
      "We plant seeds, and the forest feeds the village over many years!",
    )).toBe(false);
  });
  it("catches a full rewrite", () => {
    expect(isLargeRewrite(
      "We plant seeds and the forest feeds the village.",
      "Announcing our Q3 investor call on Tuesday at noon, register through the portal.",
    )).toBe(true);
  });
});

describe("validateCandidateRule", () => {
  it("accepts a clean taxonomy rule", () => {
    expect(validateCandidateRule("word_swap", "Prefer the word gift over the word donation.")).toBeNull();
    expect(validateCandidateRule("sentence_length", "Break sentences over 25 words into two.")).toBeNull();
  });
  it("rejects unknown categories", () => {
    expect(validateCandidateRule("topic", "Write more about farming.")).toMatch(/unknown category/);
  });
  it("rejects hard-rule contradictions", () => {
    expect(validateCandidateRule("punctuation", "Use an em-dash to join related clauses.")).toMatch(/hard publishing rule/);
    expect(validateCandidateRule("word_swap", "Use the word leverage for financial topics.")).toMatch(/hard publishing rule/);
  });
  it("rejects named entities and topics", () => {
    expect(validateCandidateRule("opener", "Open posts about Amora Village with the founding story.")).toMatch(/named entity/);
    expect(validateCandidateRule("closer", "End with a link about the fundraising campaign.")).toMatch(/specific topic/);
  });
});

describe("edit processing (DB)", () => {
  let prevOwner: number;
  beforeAll(() => {
    prevOwner = ENV.ownerUserId;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
  });
  afterAll(async () => {
    (ENV as any).ownerUserId = prevOwner;
    if (!skipIfNoDb) {
      const { getDb } = await import("./db");
      const { voiceEdits, voiceRules } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.delete(voiceEdits).where(eq(voiceEdits.ownerId, TEST_OWNER_ID));
        await db.delete(voiceRules).where(eq(voiceRules.ownerId, TEST_OWNER_ID));
      }
    }
  });

  it.skipIf(skipIfNoDb)("routes style edits to extraction, purges bodies, reinforces on recurrence", { timeout: 60_000 }, async () => {
    const { getDb } = await import("./db");
    const { voiceEdits } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    // A content edit never calls the model.
    invokeLLMMock.mockClear();
    await processEdit({
      ownerId: TEST_OWNER_ID, itemId: 1, channel: "linkedin",
      aiVersion: "We plant seeds and the forest feeds the village.",
      editedVersion: "We plant seeds and the forest feeds the town.",
      editKind: "content",
    });
    expect(invokeLLMMock).not.toHaveBeenCalled();

    // A style edit extracts; a hard-rule-contradicting candidate is dropped.
    llmReturns([
      { category: "word_swap", rule: "Prefer the word gift over the word donation." },
      { category: "punctuation", rule: "Use an em-dash for asides." },
    ]);
    await processEdit({
      ownerId: TEST_OWNER_ID, itemId: 2, channel: "linkedin",
      aiVersion: "Your donation helps the village forest grow strong.",
      editedVersion: "Your gift helps the village forest grow strong.",
      editKind: "style",
    });
    expect(invokeLLMMock).toHaveBeenCalledTimes(1);

    let rules = await loadTopRules(TEST_OWNER_ID);
    expect(rules.some((r) => r.rule.includes("gift"))).toBe(true);
    expect(rules.some((r) => r.rule.toLowerCase().includes("em-dash"))).toBe(false);

    // Recurrence: the same rule from another edit increments weight, no new row.
    llmReturns([{ category: "word_swap", rule: "Prefer the word gift over donation." }]);
    await processEdit({
      ownerId: TEST_OWNER_ID, itemId: 3, channel: "facebook",
      aiVersion: "A donation to the fund plants trees.",
      editedVersion: "A gift to the fund plants trees.",
      editKind: "style",
    });
    rules = await loadTopRules(TEST_OWNER_ID);
    const giftRules = rules.filter((r) => r.rule.toLowerCase().includes("gift"));
    expect(giftRules).toHaveLength(1);
    expect(giftRules[0].weight).toBeGreaterThan(1.5);

    // A style-tagged large rewrite is forced to content: no new extraction.
    invokeLLMMock.mockClear();
    await processEdit({
      ownerId: TEST_OWNER_ID, itemId: 4, channel: "linkedin",
      aiVersion: "We plant seeds and the forest feeds the village.",
      editedVersion: "Quarterly report: twelve applications reviewed, four accepted, onboarding begins in September at the coastal site.",
      editKind: "style",
    });
    expect(invokeLLMMock).not.toHaveBeenCalled();

    // Every edit body is purged.
    const edits = await db.select().from(voiceEdits).where(eq(voiceEdits.ownerId, TEST_OWNER_ID));
    expect(edits.length).toBeGreaterThanOrEqual(4);
    for (const edit of edits) {
      expect(edit.aiVersion).toBeNull();
      expect(edit.editedVersion).toBeNull();
    }
  });

  it.skipIf(skipIfNoDb)("bounded context: only top-N rules load", { timeout: 60_000 }, async () => {
    const candidates = Array.from({ length: 8 }, (_, n) => ({
      category: "formatting" as const,
      rule: `Keep paragraphs under ${n + 2} lines for pattern number ${n} readability.`,
    }));
    await storeRules(TEST_OWNER_ID, candidates);
    const top3 = await loadTopRules(TEST_OWNER_ID, 3);
    expect(top3).toHaveLength(3);
    const all = await loadTopRules(TEST_OWNER_ID, 200);
    expect(all.length).toBeGreaterThan(3);
    // Weightiest first.
    expect(top3[0].weight).toBeGreaterThanOrEqual(top3[2].weight);
  });
});
