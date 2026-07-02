import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * Guard tests for the churchRoles router. These assert the permission wiring
 * only: every rejection path throws in procedure middleware BEFORE the resolver
 * (and before any getDb call), so these run without touching the database.
 * "Never trust the client": an anonymous or non-admin caller must be turned away.
 */
function makeCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      cookies: {}, // no session_id -> CSRF middleware is a no-op for mutations
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

function user(role: "user" | "admin" | "superadmin", id = 42): AuthenticatedUser {
  return {
    id,
    openId: `open-${id}`,
    email: `u${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "google",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;
}

describe("churchRoles guards", () => {
  it("getMyChurchRoles rejects an anonymous caller", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.churchRoles.getMyChurchRoles()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("listRoleHolders rejects a non-admin caller", async () => {
    const caller = appRouter.createCaller(makeCtx(user("user")));
    await expect(caller.churchRoles.listRoleHolders()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("grantRole rejects a non-admin caller", async () => {
    const caller = appRouter.createCaller(makeCtx(user("user")));
    await expect(
      caller.churchRoles.grantRole({ userId: 7, role: "steward", canAcceptPayments: true, canMakePayments: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("revokeRole rejects a non-admin caller", async () => {
    const caller = appRouter.createCaller(makeCtx(user("user")));
    await expect(caller.churchRoles.revokeRole({ holderId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("grantRole validates input (rejects an invalid role)", async () => {
    const caller = appRouter.createCaller(makeCtx(user("admin")));
    await expect(
      // @ts-expect-error deliberately invalid role to exercise zod validation
      caller.churchRoles.grantRole({ userId: 7, role: "bishop" }),
    ).rejects.toBeTruthy();
  });
});
