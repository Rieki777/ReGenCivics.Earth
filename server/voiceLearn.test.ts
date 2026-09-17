import { describe, it, expect, vi, beforeEach } from "vitest";

const extractRules = vi.fn();
const storeRules = vi.fn();
const isLargeRewrite = vi.fn();

vi.mock("./lib/voice-learning", () => ({
  extractRules: (...args: unknown[]) => extractRules(...args),
  storeRules: (...args: unknown[]) => storeRules(...args),
  isLargeRewrite: (...args: unknown[]) => isLargeRewrite(...args),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerUserId: 42 },
}));

vi.mock("./_core/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

describe("learnFromOutboundEdit", () => {
  beforeEach(() => {
    extractRules.mockReset();
    storeRules.mockReset();
    isLargeRewrite.mockReset();
    isLargeRewrite.mockReturnValue(false);
  });

  it("skips when AI draft equals final", async () => {
    const { learnFromOutboundEdit } = await import("./lib/voiceLearn");
    const r = await learnFromOutboundEdit({
      ownerId: 7,
      aiDraftBody: "Hello friends.",
      finalBody: "Hello friends.",
    });
    expect(r).toEqual({ ok: false, skipped: "no_diff" });
    expect(extractRules).not.toHaveBeenCalled();
  });

  it("skips large content rewrites", async () => {
    isLargeRewrite.mockReturnValue(true);
    const { learnFromOutboundEdit } = await import("./lib/voiceLearn");
    const r = await learnFromOutboundEdit({
      ownerId: 7,
      aiDraftBody: "Short AI draft about seeds.",
      finalBody: "Completely different letter with many new words about land and governance and ships and funds.",
    });
    expect(r).toEqual({ ok: false, skipped: "content_edit" });
    expect(extractRules).not.toHaveBeenCalled();
  });

  it("extracts and stores style rules", async () => {
    extractRules.mockResolvedValue([
      { category: "word_swap", rule: "Prefer gift over donation." },
    ]);
    storeRules.mockResolvedValue(1);
    const { learnFromOutboundEdit } = await import("./lib/voiceLearn");
    const r = await learnFromOutboundEdit({
      ownerId: 7,
      aiDraftBody: "Please make a donation today.",
      finalBody: "Please offer a gift today.",
    });
    expect(r).toEqual({ ok: true, stored: 1 });
    expect(extractRules).toHaveBeenCalledOnce();
    expect(storeRules).toHaveBeenCalledWith(7, [
      { category: "word_swap", rule: "Prefer gift over donation." },
    ]);
  });

  it("fail-softs on extract errors", async () => {
    extractRules.mockRejectedValue(new Error("llm down"));
    const { learnFromOutboundEdit } = await import("./lib/voiceLearn");
    const r = await learnFromOutboundEdit({
      ownerId: 7,
      aiDraftBody: "A",
      finalBody: "B with more words here for a small tweak.",
    });
    expect(r).toEqual({ ok: false, skipped: "error" });
  });
});
