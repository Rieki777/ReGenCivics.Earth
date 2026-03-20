import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const skipIfNoDb = !process.env.DATABASE_URL;

// Mock notifications and emails to prevent real emails being sent during tests
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'test-email-id', trackingData: {} }),
  emailTemplates: {
    applicationReceived: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    landProjectAccepted: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    followUp: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    requestMoreInfo: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    investorWelcome: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    newsletterWelcome: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
  },
  testEmailConnection: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Application System", () => {
  // Use numeric IDs that match the database schema
  const testUserId = 999999;
  const adminUserId = 999998;

  describe("Application Creation and Management", () => {
    it.skipIf(skipIfNoDb)("should create a new application as authenticated user", async () => {
      const user: AuthenticatedUser = {
        id: testUserId,
        openId: String(testUserId),
        name: "Test User",
        email: "test@example.com",
        role: "user",
        loginMethod: "google",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = createTestContext(user);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.applications.create({
        projectName: "Test Regenerative Farm",
        projectType: "early_stage",
        location: "Test Location",
        vision: "A test vision for regenerative agriculture",
        landStatus: "owned",
        teamSize: 5,
        teamDescription: "A dedicated team of regenerative practitioners",
        regenerativePractices: "Permaculture, agroforestry, water harvesting",
        governanceApproach: "Sociocracy",
        communityEngagement: "Regular community meetings and workshops",
        timeCommitment: "Full-time commitment from core team",
        fundingNeeds: "$100,000 for infrastructure",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeTypeOf("number");
      expect(result.projectName).toBe("Test Regenerative Farm");
      expect(result.status).toBe("draft");
      expect(result.userId).toBe(testUserId);
    });

    it("should require authentication to create application", async () => {
      const ctx = createTestContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.applications.create({
          projectName: "Test Project",
          projectType: "early_stage",
          location: "Test",
          vision: "Test vision",
          landStatus: "owned",
          teamSize: 3,
          teamDescription: "Test team",
          regenerativePractices: "Test practices",
          governanceApproach: "Test governance",
          communityEngagement: "Test engagement",
          timeCommitment: "Test commitment",
          fundingNeeds: "Test funding",
        })
      ).rejects.toThrow();
    });

    it.skipIf(skipIfNoDb)("should list user's own applications", async () => {
      const user: AuthenticatedUser = {
        id: testUserId,
        openId: String(testUserId),
        name: "Test User",
        email: "test@example.com",
        role: "user",
        loginMethod: "google",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = createTestContext(user);
      const caller = appRouter.createCaller(ctx);

      // Create an application first
      await caller.applications.create({
        projectName: "My Project",
        projectType: "mature",
        location: "Test",
        vision: "Test vision",
        landStatus: "owned",
        teamSize: 3,
        teamDescription: "Test team",
        regenerativePractices: "Test practices",
        governanceApproach: "Test governance",
        communityEngagement: "Test engagement",
        timeCommitment: "Test commitment",
        fundingNeeds: "Test funding",
      });

      const result = await caller.applications.myApplications();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((app) => app.projectName === "My Project")).toBe(true);
    });
  });

  describe("Admin Permissions", () => {
    it.skipIf(skipIfNoDb)("should allow admin to list all applications", async () => {
      const adminUser: AuthenticatedUser = {
        id: adminUserId,
        openId: String(adminUserId),
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        loginMethod: "google",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = createTestContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.applications.list();

      expect(Array.isArray(result)).toBe(true);
      // Result may be empty or have applications depending on test order
    });

    it("should not allow non-admin to list all applications", async () => {
      const user: AuthenticatedUser = {
        id: testUserId,
        openId: String(testUserId),
        name: "Test User",
        email: "test@example.com",
        role: "user",
        loginMethod: "google",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = createTestContext(user);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.applications.list()).rejects.toThrow();
    });

    it("should not allow non-admin to create review", async () => {
      const user: AuthenticatedUser = {
        id: testUserId,
        openId: String(testUserId),
        name: "Test User",
        email: "test@example.com",
        role: "user",
        loginMethod: "google",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = createTestContext(user);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.reviews.create({
          applicationId: 999, // Dummy ID
          decision: "approve",
          comments: "Unauthorized review",
        })
      ).rejects.toThrow();
    });
  });

  describe("Application Workflow", () => {
    it.skipIf(skipIfNoDb)("should create, update, and submit an application", async () => {
      const user: AuthenticatedUser = {
        id: 999997,
        openId: "999997",
        name: "Workflow Test User",
        email: "workflow@example.com",
        role: "user",
        loginMethod: "google",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = createTestContext(user);
      const caller = appRouter.createCaller(ctx);

      // Create application
      const created = await caller.applications.create({
        projectName: "Workflow Test Project",
        projectType: "early_stage",
        location: "Test Location",
        vision: "Initial vision",
        landStatus: "owned",
        teamSize: 3,
        teamDescription: "Test team",
        regenerativePractices: "Test practices",
        governanceApproach: "Test governance",
        communityEngagement: "Test engagement",
        timeCommitment: "Test commitment",
        fundingNeeds: "Test funding",
      });

      expect(created.status).toBe("draft");

      // Update application
      const updated = await caller.applications.update({
        id: created.id,
        data: {
          vision: "Updated vision",
        },
      });

      expect(updated.vision).toBe("Updated vision");

      // Submit application
      const submitted = await caller.applications.submit({ id: created.id });

      expect(submitted.status).toBe("submitted");
      expect(submitted.submittedAt).toBeDefined();
    });
  });
});
