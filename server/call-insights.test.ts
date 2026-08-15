/**
 * Tests for Stage 7 call intelligence:
 *  - the redaction gate catches emails, phones, and secret-shaped strings
 *  - extraction is cached (one LLM pass per recording, ever) and drops
 *    invalid kinds and flagged content
 *  - the bridge recordings leg is token-authed, delivers only extracted
 *    calls, and its cursor waits on pending extractions but skips
 *    material-less recordings
 *  - accept/dismiss records judgment; the admin gate holds
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";
import type { Request, Response } from "express";

const skipIfNoDb = !process.env.DATABASE_URL;
const TEST_OWNER_ID = 987_654_306;
const TEST_TOKEN = "call-intel-test-token-0123456789abcd";

const invokeLLMMock = vi.fn();
vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLMMock(...args),
  isLLMConfigured: () => true,
}));

import { isRedactionFlagged, extractCallInsights } from "./lib/call-insights";

function llmReturns(insights: unknown[]) {
  invokeLLMMock.mockResolvedValue({
    id: "t", created: 0, model: "mock",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ insights }) }, finish_reason: "stop" }],
  });
}

const createMockContext = async (user: { id: number; role: string } | null = null) => {
  const mockReq = { cookies: {}, headers: {}, ip: "127.0.0.1" } as unknown as Request;
  const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
  const ctx = await createContext({ req: mockReq, res: mockRes } as unknown as Parameters<typeof createContext>[0]);
  if (user) (ctx as any).user = user;
  return ctx;
};

describe("redaction gate", () => {
  it("flags emails, phones, and secret shapes", () => {
    expect(isRedactionFlagged("Reach me at sam@example.org for the seeds")).toBe(true);
    expect(isRedactionFlagged("Call me on +1 541 555 0134 tomorrow")).toBe(true);
    expect(isRedactionFlagged("the key is sk-abc123def456ghi789jkl")).toBe(true);
    expect(isRedactionFlagged("We decided to plant the north field in September")).toBe(false);
    expect(isRedactionFlagged("Budget is 12,000 dollars over 3 years")).toBe(false);
  });
});

describe("admin gate", () => {
  it("rejects a non-admin user", async () => {
    const ctx = await createMockContext({ id: 42, role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.callIntelligence.list({ status: "all", limit: 5 })).rejects.toThrow();
  });
});

describe("extraction + bridge + judgment (DB)", () => {
  let server: Server;
  let base = "";
  let prevOwner: number;
  let prevToken: string;
  const recordingIds: number[] = [];

  async function cleanup() {
    const { getDb } = await import("./db");
    const { callInsights, recordings, sourceIndex } = await import("../drizzle/schema");
    const { eq, like } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return;
    for (const id of recordingIds) {
      await db.delete(callInsights).where(eq(callInsights.recordingId, id));
      await db.delete(recordings).where(eq(recordings.id, id));
    }
    await db.delete(sourceIndex).where(eq(sourceIndex.ownerId, TEST_OWNER_ID));
    await db.delete(recordings).where(like(recordings.riversideId, "call-test-%"));
  }

  beforeAll(async () => {
    prevOwner = ENV.ownerUserId;
    prevToken = ENV.harvestBridgeToken;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
    (ENV as any).harvestBridgeToken = TEST_TOKEN;
    if (!skipIfNoDb) await cleanup();

    const { registerHarvestBridgeRoutes } = await import("./webhooks/harvest-bridge");
    const app = express();
    app.use(express.json());
    registerHarvestBridgeRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60_000);

  afterAll(async () => {
    (ENV as any).ownerUserId = prevOwner;
    (ENV as any).harvestBridgeToken = prevToken;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    if (!skipIfNoDb) await cleanup();
  }, 60_000);

  it.skipIf(skipIfNoDb)("extracts once, filters junk, serves the bridge, records judgment", { timeout: 120_000 }, async () => {
    const { getDb } = await import("./db");
    const { recordings, callInsights } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = (await getDb())!;

    // Three recordings: one with a transcript, one material-less (cursor must
    // skip it), one with a transcript but no extraction yet (cursor must wait).
    const insert = async (riversideId: string, transcript: string | null) => {
      await db.insert(recordings).values({
        riversideId,
        title: `Call intel test ${riversideId}`,
        sessionDate: new Date("2026-07-15"),
        transcript,
        youtubeUrl: "https://youtube.com/watch?v=test",
      });
      const [row] = await db.select({ id: recordings.id }).from(recordings).where(eq(recordings.riversideId, riversideId));
      recordingIds.push(row.id);
      return row.id;
    };
    const extractedId = await insert("call-test-a", "Sam said we should plant the north field in September. Jo committed to drafting the grant by Friday. Someone said email me at leak@example.org.");
    const emptyId = await insert("call-test-b", null);
    const pendingId = await insert("call-test-c", "More material that has not been extracted yet.");

    // Extraction: valid kinds stored, junk kind and redaction-flagged dropped.
    llmReturns([
      { kind: "decision", content: "Plant the north field in September, agreed by the circle.", speaker: "Sam", timestamp_secs: 120 },
      { kind: "commitment", content: "Jo drafts the grant application by Friday.", speaker: "Jo", timestamp_secs: 300 },
      { kind: "wisdom", content: "The land teaches patience: plant on its schedule, never on ours.", speaker: "Sam", timestamp_secs: 0 },
      { kind: "gossip", content: "An invalid kind that must be dropped.", speaker: "", timestamp_secs: 0 },
      { kind: "idea", content: "Reach the funder at leak@example.org about seeds.", speaker: "", timestamp_secs: 0 },
    ]);
    const stored = await extractCallInsights(extractedId);
    expect(stored).toBe(3);

    // Cached: a second call never touches the model.
    invokeLLMMock.mockClear();
    expect(await extractCallInsights(extractedId)).toBe(0);
    expect(invokeLLMMock).not.toHaveBeenCalled();

    // Bridge: token gate + delivery + cursor semantics.
    const unauth = await fetch(`${base}/api/harvest/recordings?since_id=0`);
    expect(unauth.status).toBe(401);

    const authed = await fetch(`${base}/api/harvest/recordings?since_id=${extractedId - 1}`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    }).then((r) => r.json());
    const delivered = authed.recordings.find((r: { id: number }) => r.id === extractedId);
    expect(delivered).toBeTruthy();
    expect(delivered.insights).toHaveLength(3);
    expect(delivered.source_ref).toBe(`call-${extractedId}`);
    // The cursor skipped the material-less recording but stopped BEFORE the
    // pending one, so it can never be lost.
    expect(authed.latestId).toBe(emptyId);
    expect(authed.recordings.some((r: { id: number }) => r.id === pendingId)).toBe(false);

    // Provenance row exists for the feed to trace to.
    const { sourceIndex } = await import("../drizzle/schema");
    const { and } = await import("drizzle-orm");
    const [prov] = await db.select().from(sourceIndex)
      .where(and(eq(sourceIndex.ownerId, TEST_OWNER_ID), eq(sourceIndex.refId, `call-${extractedId}`)));
    expect(prov).toBeTruthy();

    // Judgment: an admin accepts the commitment; nothing else changes.
    const ctx = await createMockContext({ id: 43, role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const listed = await caller.callIntelligence.list({ status: "all", limit: 10 });
    const call = listed.calls.find((c) => c.recordingId === extractedId)!;
    const commitment = call.insights.find((i) => i.kind === "commitment")!;
    await caller.callIntelligence.setStatus({ insightId: commitment.id, status: "accepted" });
    const open = await caller.callIntelligence.openSuggestions();
    expect(open.suggestions.some((s) => s.id === commitment.id)).toBe(false);
    const [row] = await db.select().from(callInsights).where(eq(callInsights.id, commitment.id));
    expect(row.status).toBe("accepted");
  });
});
