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
import { heartbeatState, HEARTBEAT_CADENCE_MIN, startOfWeek } from "./routes/brain";

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

describe("startOfWeek", () => {
  it("lands on Monday 00:00 so the week matches the Monday morning message", () => {
    // A Wednesday, a Monday, and a Sunday all resolve to the same Monday.
    const wed = startOfWeek(new Date(2026, 7, 26, 14, 30));
    const mon = startOfWeek(new Date(2026, 7, 24, 9, 0));
    const sun = startOfWeek(new Date(2026, 7, 30, 23, 59));
    expect(wed.getDay()).toBe(1);
    expect(wed.getHours()).toBe(0);
    expect(wed.getTime()).toBe(mon.getTime());
    expect(sun.getTime()).toBe(mon.getTime());
  });

  it("treats Monday 00:00 itself as the start of its own week, not the previous one", () => {
    const monday = new Date(2026, 7, 24, 0, 0, 0, 0);
    expect(startOfWeek(monday).getTime()).toBe(monday.getTime());
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
