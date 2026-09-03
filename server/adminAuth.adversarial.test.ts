import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    authMethod: user ? "legacy" : null,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function makeUser(id: number, role: string): AuthenticatedUser {
  return {
    id,
    openId: `adv-${id}`,
    name: role,
    email: `${role}-${id}@example.com`,
    role,
    loginMethod: "google",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;
}

describe("adminProcedure adversarial", () => {
  it("rejects anonymous, player, and made-up privileged roles", async () => {
    const denied = [
      createTestContext(null),
      createTestContext(makeUser(42, "user")),
      createTestContext(makeUser(43, "moderator")),
      createTestContext(makeUser(44, "Admin")),
      createTestContext(makeUser(45, "owner")),
    ];
    for (const ctx of denied) {
      const caller = appRouter.createCaller(ctx);
      await expect(caller.applications.listEmailRecipients({ status: "approved" })).rejects.toThrow();
    }
  });

  it("lets admin and superadmin through the same lock", async () => {
    for (const role of ["admin", "superadmin"] as const) {
      const caller = appRouter.createCaller(createTestContext(makeUser(1, role)));
      const result = await caller.applications.listEmailRecipients({ status: "approved" });
      expect(Array.isArray(result)).toBe(true);
    }
  });
});

const skipIfNoDb = !process.env.DATABASE_URL;
const IDS = {
  founder: "adversarial-founder-upsert",
  lookalike: "adversarial-lookalike-upsert",
  payload: "adversarial-payload-upsert",
  plus: "adversarial-plus-upsert",
};

describe("upsertUser adversarial", () => {
  afterAll(async () => {
    if (skipIfNoDb) return;
    const database = await getDb();
    if (!database) return;
    for (const openId of Object.values(IDS)) {
      await database.delete(users).where(eq(users.openId, openId));
    }
  });

  it.skipIf(skipIfNoDb)("promotes the founder email and refuses lookalikes and payload roles", async () => {
    await db.upsertUser({
      openId: IDS.founder,
      email: "rieki.cordon@gmail.com",
      name: "Founder probe",
      loginMethod: "google",
    });
    const founder = await db.getUserByOpenId(IDS.founder);
    expect(founder?.role).toBe("admin");

    const database = await getDb();
    if (!database || !founder) throw new Error("db");
    await database.update(users).set({ role: "superadmin" }).where(eq(users.id, founder.id));
    await db.upsertUser({
      openId: IDS.founder,
      email: "rieki.cordon@gmail.com",
      lastSignedIn: new Date(),
    });
    expect((await db.getUserByOpenId(IDS.founder))?.role).toBe("superadmin");

    await db.upsertUser({
      openId: IDS.lookalike,
      email: "rieki.cordon@gmail.com.evil.com",
      name: "Lookalike",
      loginMethod: "google",
    });
    expect((await db.getUserByOpenId(IDS.lookalike))?.role).toBe("user");

    await db.upsertUser({
      openId: IDS.plus,
      email: "rieki.cordon+admin@gmail.com",
      name: "Plus tag",
      loginMethod: "google",
    });
    expect((await db.getUserByOpenId(IDS.plus))?.role).toBe("user");

    await db.upsertUser({
      openId: IDS.payload,
      email: "attacker@example.com",
      name: "Payload",
      loginMethod: "google",
      role: "admin",
    });
    expect((await db.getUserByOpenId(IDS.payload))?.role).toBe("user");
  });
});
