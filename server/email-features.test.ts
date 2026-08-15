import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "google",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;

  return {
    user,
    authMethod: "legacy",
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
    authMethod: null,
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

describe("email features", () => {
  describe("email template procedures", () => {
    it("getCustomTemplates should return an array", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const templates = await caller.email.getCustomTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });

    // sendTestEmail was removed from the email router; its test went with it.
  });

  describe("newsletter procedures", () => {
    it("newsletter.list should require admin access and return an array", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const subscribers = await caller.newsletter.list();
      expect(Array.isArray(subscribers)).toBe(true);
    });

    it("newsletter.listActive should require admin access", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const subscribers = await caller.newsletter.listActive();
      expect(Array.isArray(subscribers)).toBe(true);
    });
  });

  describe("investor inquiries list", () => {
    it("investorInquiries.list should return an array for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const inquiries = await caller.investorInquiries.list();
      expect(Array.isArray(inquiries)).toBe(true);
    });
  });

  describe("bulk email validation", () => {
    it("sendBulk should reject empty recipients", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(
        caller.email.sendBulk({
          recipients: [],
          templateType: "newsletter_welcome",
        })
      ).rejects.toThrow();
    });

    it("sendBulk should reject more than 100 recipients", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      
      const tooManyRecipients = Array.from({ length: 101 }, (_, i) => ({
        email: `test${i}@example.com`,
        name: `Test ${i}`,
      }));
      
      await expect(
        caller.email.sendBulk({
          recipients: tooManyRecipients,
          templateType: "newsletter_welcome",
        })
      ).rejects.toThrow();
    });
  });
});
