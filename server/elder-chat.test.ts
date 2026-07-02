import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { parseCanon, estimateTokens } from "./lib/elder-corpus";
import { cosineSimilarity, topKByEmbedding } from "./lib/elder-retrieval";
import { detectCrisis } from "./lib/elder-safety";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, cookies: {}, socket: { remoteAddress: "10.0.0.9" } } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}
void ({} as AuthenticatedUser);

describe("elder corpus parsing", () => {
  const md = [
    "# THE CANON",
    "",
    "intro that should be ignored (no book yet)",
    "",
    "# BOOK 1: ANASTASIA",
    "",
    "## The meeting",
    "",
    "She was standing at the edge of a glade. " + "word ".repeat(50),
    "",
    "## The ray",
    "",
    "A thread of light. " + "cedar ".repeat(40),
    "",
    "# BOOK 2: THE SPACE OF LOVE",
    "",
    "## The dolmens",
    "",
    "Stone and memory. " + "kin ".repeat(30),
  ].join("\n");

  it("splits into book/section chunks and ignores pre-book front matter", () => {
    const chunks = parseCanon(md);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => c.book.startsWith("BOOK"))).toBe(true);
    expect(chunks.some((c) => c.section === "The meeting")).toBe(true);
    expect(chunks.some((c) => c.book.includes("SPACE OF LOVE"))).toBe(true);
    // front matter before the first BOOK is not emitted
    expect(chunks.some((c) => c.content.includes("should be ignored"))).toBe(false);
    // chunkIndex is monotonic
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });

  it("estimates tokens roughly by length", () => {
    expect(estimateTokens("aaaa")).toBe(1);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("retrieval math", () => {
  it("cosineSimilarity handles identical, orthogonal, and opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
  });

  it("topKByEmbedding ranks by similarity, skips null embeddings, respects k", () => {
    const chunks = [
      { id: 1, embedding: [1, 0, 0] },
      { id: 2, embedding: [0, 1, 0] },
      { id: 3, embedding: [0.9, 0.1, 0] },
      { id: 4, embedding: null },
    ];
    const top = topKByEmbedding([1, 0, 0], chunks, 2);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe(1);
    expect(top[1].id).toBe(3);
    expect(top.every((t) => t.id !== 4)).toBe(true);
  });
});

describe("crisis detection", () => {
  it("flags self-harm / suicidal expressions", () => {
    expect(detectCrisis("I want to kill myself")).toBe(true);
    expect(detectCrisis("I feel suicidal tonight")).toBe(true);
    expect(detectCrisis("there is no reason to live")).toBe(true);
  });
  it("does not flag ordinary questions", () => {
    expect(detectCrisis("How do I plant a cedar in the Space of Love?")).toBe(false);
    expect(detectCrisis("What does Anastasia say about the ray?")).toBe(false);
  });
});

describe("elderChat guards", () => {
  it("elderChatEnabled reports not-ready without an API key / corpus", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.elderChat.elderChatEnabled()).resolves.toEqual({ enabled: false });
  });

  it("ask returns the crisis fallback out of persona (no model call)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const res = await caller.elderChat.ask({ sessionId: "session-abcdef12", question: "I want to kill myself" });
    expect(res.isCrisis).toBe(true);
    expect(res.answer).toMatch(/988|crisis|not alone/i);
  });

  it("ask refuses a normal question when the model is not configured", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.elderChat.ask({ sessionId: "session-99887766", question: "What is the Space of Love?" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
