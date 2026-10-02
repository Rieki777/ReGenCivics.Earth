/**
 * playerProfiles.capitalScores: owner and admins only.
 *
 * It was a publicProcedure taking any userId until 2026-10-01, so anyone
 * could read anyone's Living Tree percentiles. Its one caller
 * (CapitalSnapshot, on the owner's own /profile) asks for the signed-in
 * user, so the procedure now refuses everyone else, before any database
 * read.
 *
 * DB-less: `getDb` is mocked. On the refusal paths it must never be called.
 * On the allowed paths it returns null, so the procedure stops at its
 * "Database unavailable" error, which proves the caller got past the gate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getDb: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";

const OWNER_USER_ID = 77;
const OTHER_USER_ID = 88;

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "GET",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const ANON = makeCtx(null);
const OWNER = makeCtx({ id: OWNER_USER_ID, role: "user" } as unknown as TrpcContext["user"]);
const ADMIN = makeCtx({ id: 1, role: "admin" } as unknown as TrpcContext["user"]);

const getDbMock = db.getDb as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  getDbMock.mockReset().mockResolvedValue(null);
});

describe("playerProfiles.capitalScores", () => {
  it("refuses an anonymous caller with UNAUTHORIZED, and never reads the database", async () => {
    await expect(
      appRouter.createCaller(ANON).playerProfiles.capitalScores({ userId: OWNER_USER_ID }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(appRouter.createCaller(ANON).playerProfiles.capitalScores()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("refuses a signed-in member asking for someone else with FORBIDDEN, before any database read", async () => {
    await expect(
      appRouter.createCaller(OWNER).playerProfiles.capitalScores({ userId: OTHER_USER_ID }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "You can only see your own Living Tree." });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("lets the owner through to their own scores", async () => {
    await expect(
      appRouter.createCaller(OWNER).playerProfiles.capitalScores({ userId: OWNER_USER_ID }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    expect(getDbMock).toHaveBeenCalledTimes(1);
  });

  it("reads the signed-in user when no userId is given", async () => {
    await expect(appRouter.createCaller(OWNER).playerProfiles.capitalScores()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(getDbMock).toHaveBeenCalledTimes(1);
  });

  it("lets an admin read another member's scores", async () => {
    await expect(
      appRouter.createCaller(ADMIN).playerProfiles.capitalScores({ userId: OTHER_USER_ID }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    expect(getDbMock).toHaveBeenCalledTimes(1);
  });
});
