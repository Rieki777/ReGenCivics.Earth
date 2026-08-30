/**
 * Tests for the second-brain command center:
 *  - heartbeatState is a pure never/ok/late decision
 *  - brain.status is owner-gated (ownerProcedure), not merely admin-gated
 *
 * DB-backed item tests live alongside these once brain_items exists; they skip
 * without DATABASE_URL the way server/harvest.test.ts does.
 */
import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import type { Request, Response } from "express";
import { heartbeatState, HEARTBEAT_CADENCE_MIN } from "./routes/brain";

const createMockContext = async (user: { id: number; role: string } | null = null) => {
  const mockReq = { cookies: {}, headers: {}, ip: "127.0.0.1" } as unknown as Request;
  const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
  const ctx = await createContext({ req: mockReq, res: mockRes } as unknown as Parameters<typeof createContext>[0]);
  if (user) (ctx as any).user = user;
  return ctx;
};

describe("heartbeatState", () => {
  const now = new Date("2026-08-30T12:00:00Z");

  it("is never when the signal has no last run", () => {
    expect(heartbeatState(null, 60, now)).toBe("never");
  });

  it("is ok inside twice the cadence", () => {
    expect(heartbeatState(new Date("2026-08-30T11:30:00Z"), 60, now)).toBe("ok");
    expect(heartbeatState(new Date("2026-08-30T10:01:00Z"), 60, now)).toBe("ok");
  });

  it("is late past twice the cadence", () => {
    expect(heartbeatState(new Date("2026-08-30T09:00:00Z"), 60, now)).toBe("late");
  });

  it("treats a weekly signal as late only after a fortnight", () => {
    const weekly = HEARTBEAT_CADENCE_MIN.digest;
    expect(heartbeatState(new Date("2026-08-22T12:00:00Z"), weekly, now)).toBe("ok");
    expect(heartbeatState(new Date("2026-08-10T12:00:00Z"), weekly, now)).toBe("late");
  });
});

describe("brain.status", () => {
  it("refuses a non-owner admin", async () => {
    const caller = appRouter.createCaller(await createMockContext({ id: 424_242, role: "admin" }));
    await expect(caller.brain.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses anonymous callers", async () => {
    const caller = appRouter.createCaller(await createMockContext(null));
    await expect(caller.brain.status()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
