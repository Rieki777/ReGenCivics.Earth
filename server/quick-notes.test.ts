/**
 * Tests for the Harvest Phase 1 capture inbox:
 *  - ownerProcedure rejects non-owner (including admins) and fails closed
 *    when OWNER_USER_ID is unset
 *  - create + bridge since_id cursor + mark-processed idempotency
 *  - bridge token auth (wrong token 401, missing config 503)
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

// The composer's optional theme auto-tag must never hit a real model in tests.
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockRejectedValue(new Error("no llm in tests")),
  isLLMConfigured: () => false,
}));

// A fake owner id far outside real users; quick_notes has no FK on owner_id.
const TEST_OWNER_ID = 987_654_301;
const TEST_TOKEN = "harvest-test-token-0123456789abcdef";

const createMockContext = async (user: { id: number; role: string } | null = null) => {
  const mockReq = { cookies: {}, headers: {}, ip: "127.0.0.1" } as unknown as Request;
  const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
  const ctx = await createContext({ req: mockReq, res: mockRes } as unknown as Parameters<typeof createContext>[0]);
  if (user) (ctx as any).user = user;
  return ctx;
};

describe("ownerProcedure gate", () => {
  it("rejects a non-owner admin", async () => {
    const prev = ENV.ownerUserId;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
    try {
      const ctx = await createMockContext({ id: TEST_OWNER_ID + 1, role: "admin" });
      const caller = appRouter.createCaller(ctx);
      await expect(caller.quickNotes.status()).rejects.toThrow(/Owner access required/);
    } finally {
      (ENV as any).ownerUserId = prev;
    }
  });

  it("fails closed when OWNER_USER_ID is unset", async () => {
    const prev = ENV.ownerUserId;
    (ENV as any).ownerUserId = 0;
    try {
      const ctx = await createMockContext({ id: 5, role: "superadmin" });
      const caller = appRouter.createCaller(ctx);
      await expect(caller.quickNotes.status()).rejects.toThrow(/Owner access required/);
    } finally {
      (ENV as any).ownerUserId = prev;
    }
  });

  it("rejects unauthenticated callers", async () => {
    const ctx = await createMockContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.quickNotes.status()).rejects.toThrow();
  });
});

describe("capture + bridge round trip", () => {
  let server: Server;
  let base = "";
  let prevOwner: number;
  let prevToken: string;
  let prevNext: string;

  beforeAll(async () => {
    prevOwner = ENV.ownerUserId;
    prevToken = ENV.harvestBridgeToken;
    prevNext = ENV.harvestBridgeTokenNext;
    (ENV as any).ownerUserId = TEST_OWNER_ID;
    (ENV as any).harvestBridgeToken = TEST_TOKEN;
    (ENV as any).harvestBridgeTokenNext = "";

    const { registerHarvestBridgeRoutes } = await import("./webhooks/harvest-bridge");
    const app = express();
    app.use(express.json());
    registerHarvestBridgeRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    (ENV as any).ownerUserId = prevOwner;
    (ENV as any).harvestBridgeToken = prevToken;
    (ENV as any).harvestBridgeTokenNext = prevNext;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    // Clean the fake owner's rows out of quick_notes.
    if (!skipIfNoDb) {
      const { getDb } = await import("./db");
      const { quickNotes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) await db.delete(quickNotes).where(eq(quickNotes.ownerId, TEST_OWNER_ID));
    }
  });

  const authed = (path: string, init: RequestInit = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

  it("rejects a wrong bearer token with 401", async () => {
    const res = await fetch(`${base}/api/harvest/captures?since_id=0`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a missing token with 401", async () => {
    const res = await fetch(`${base}/api/harvest/captures?since_id=0`);
    expect(res.status).toBe(401);
  });

  it("fails closed with 503 when the token is not configured", async () => {
    (ENV as any).harvestBridgeToken = "";
    try {
      const res = await authed("/api/harvest/captures?since_id=0");
      expect(res.status).toBe(503);
    } finally {
      (ENV as any).harvestBridgeToken = TEST_TOKEN;
    }
  });

  it("rejects a bad since_id with 400", async () => {
    const res = await authed("/api/harvest/captures?since_id=abc");
    expect(res.status).toBe(400);
  });

  it.skipIf(skipIfNoDb)("create -> cursor pull -> mark-processed is idempotent", async () => {
    const ctx = await createMockContext({ id: TEST_OWNER_ID, role: "user" });
    const caller = appRouter.createCaller(ctx);

    const n1 = await caller.quickNotes.create({ body: "harvest test note one" });
    const n2 = await caller.quickNotes.create({ body: "harvest test note two" });
    const n3 = await caller.quickNotes.create({ body: "harvest test note three" });
    expect(n1.captureId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(n1.source).toBe("text");
    expect(n2.id).toBeGreaterThan(n1.id);

    // Full pull from 0 sees all three, oldest first.
    const pull1 = await authed(`/api/harvest/captures?since_id=0`).then((r) => r.json());
    const ids = pull1.captures.map((c: { capture_id: string }) => c.capture_id);
    expect(ids).toContain(n1.captureId);
    expect(ids).toContain(n3.captureId);
    expect(pull1.captures.some((c: { audio_key?: string }) => "audio_key" in c)).toBe(false);

    // Cursor pull after n2 sees only n3.
    const pull2 = await authed(`/api/harvest/captures?since_id=${n2.id}`).then((r) => r.json());
    const ids2 = pull2.captures.map((c: { capture_id: string }) => c.capture_id);
    expect(ids2).toContain(n3.captureId);
    expect(ids2).not.toContain(n1.captureId);
    expect(ids2).not.toContain(n2.captureId);
    expect(pull2.latestId).toBeGreaterThanOrEqual(n3.id);

    // Mark two processed; re-marking is a no-op.
    const mark1 = await authed("/api/harvest/mark-processed", {
      method: "POST",
      body: JSON.stringify({ capture_ids: [n1.captureId, n2.captureId] }),
    }).then((r) => r.json());
    expect(mark1.ok).toBe(true);
    expect(mark1.updated).toBe(2);

    const mark2 = await authed("/api/harvest/mark-processed", {
      method: "POST",
      body: JSON.stringify({ capture_ids: [n1.captureId, n2.captureId] }),
    }).then((r) => r.json());
    expect(mark2.ok).toBe(true);
    expect(mark2.updated).toBe(0);

    // The owner status view reflects the split.
    const status = await caller.quickNotes.status();
    expect(status.ready).toBe(true);
    expect(status.processed).toBeGreaterThanOrEqual(2);
    expect(status.inbox).toBeGreaterThanOrEqual(1);
  });

  it("rejects malformed capture_ids with 400", async () => {
    const res = await authed("/api/harvest/mark-processed", {
      method: "POST",
      body: JSON.stringify({ capture_ids: ["not-a-uuid"] }),
    });
    expect(res.status).toBe(400);
  });
});
