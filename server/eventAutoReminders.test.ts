import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

function makeTestUser(id: number, role: "user" | "admin" = "user"): AuthenticatedUser {
  return {
    id,
    openId: String(id),
    name: role === "admin" ? "Admin User" : "Test User",
    email: `${role}-${id}@example.com`,
    role,
    loginMethod: "google",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;
}

const sampleInput = {
  eventId: 1,
  enabled: true,
  audienceMode: "custom" as const,
  audienceConfig: {},
  offsetsMinutes: [60],
};

describe("events auto-reminder procedures", () => {
  it("rejects unauthenticated callers on set, list, and preview", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(caller.events.setAutoReminder(sampleInput)).rejects.toThrow();
    await expect(caller.events.listAutoReminders()).rejects.toThrow();
    await expect(caller.events.previewAutoReminderAudience({
      eventId: 1,
      audienceMode: "open_access",
    })).rejects.toThrow();
  });

  it("rejects non-admin callers", async () => {
    const caller = appRouter.createCaller(createTestContext(makeTestUser(42)));
    await expect(caller.events.setAutoReminder(sampleInput)).rejects.toThrow();
    await expect(caller.events.previewAutoReminderAudience({
      eventId: 1,
      audienceMode: "season2_approved",
    })).rejects.toThrow();
  });
});
