import { afterAll, describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as dbHelpers from "./db";
import { applications } from "../drizzle/schema";
import { lockedApplicationMessage, updateOpenApplication } from "./routes/applications";
import { cleanupFixtureApplications, createApprovedApplication, stewardCaller } from "./test-fixtures/crowdpool";

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

// submit backfills map coordinates from the typed location through Nominatim;
// tests never reach the network for it.
vi.mock("./lib/geocode", () => ({ geocodeLocation: vi.fn().mockResolvedValue(null) }));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    authMethod: user ? "legacy" : null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

/** Minimal user fixture; the cast tolerates schema columns tests don't use. */
function makeTestUser(id: number, role: "user" | "admin" = "user", name = "Test User"): AuthenticatedUser {
  return {
    id,
    openId: String(id),
    name,
    email: `${role}-${id}@example.com`,
    role,
    loginMethod: "google",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;
}

describe("Application System", () => {
  // Use numeric IDs that match the database schema
  const testUserId = 999999;
  const adminUserId = 999998;

  describe("Application Creation and Management", () => {
    it.skipIf(skipIfNoDb)("should create a new application as authenticated user", async () => {
      const ctx = createTestContext(makeTestUser(testUserId));
      const caller = appRouter.createCaller(ctx);

      // applications.create now takes only the seed trio; everything else
      // arrives via applications.update as the draft grows.
      const result = await caller.applications.create({
        projectName: "Test Regenerative Farm",
        projectType: "early_stage",
        location: "Test Location",
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
        })
      ).rejects.toThrow();
    });

    it.skipIf(skipIfNoDb)("should list user's own applications", async () => {
      const ctx = createTestContext(makeTestUser(testUserId));
      const caller = appRouter.createCaller(ctx);

      // Create an application first
      await caller.applications.create({
        projectName: "My Project",
        projectType: "mature",
        location: "Test",
      });

      const result = await caller.applications.myApplications();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // The create handler enforces one-application-per-user (returns the
      // existing row if any). On a clean DB the new "My Project" row will
      // win. On a re-run where the prior "Test Regenerative Farm" row from
      // the earlier test still exists, we get that one back. Either way,
      // myApplications must surface at least one row owned by this user.
      expect(result.every((app) => app.userId === testUserId)).toBe(true);
    });
  });

  describe("Admin Permissions", () => {
    it.skipIf(skipIfNoDb)("should allow admin to list all applications", async () => {
      const ctx = createTestContext(makeTestUser(adminUserId, "admin", "Admin User"));
      const caller = appRouter.createCaller(ctx);

      const result = await caller.applications.list();

      expect(Array.isArray(result)).toBe(true);
      // Result may be empty or have applications depending on test order
    });

    it("should not allow non-admin to list all applications", async () => {
      const ctx = createTestContext(makeTestUser(testUserId));
      const caller = appRouter.createCaller(ctx);

      await expect(caller.applications.list()).rejects.toThrow();
    });

    it("should not allow non-admin to create review", async () => {
      const ctx = createTestContext(makeTestUser(testUserId));
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
      const ctx = createTestContext(makeTestUser(999997, "user", "Workflow Test User"));
      const caller = appRouter.createCaller(ctx);

      // Create application
      const created = await caller.applications.create({
        projectName: "Workflow Test Project",
        projectType: "early_stage",
        location: "Test Location",
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

// Bundle 1, section 16.3 (A4-M1, A4-M02): one application per account stays,
// so filling /apply again used to overwrite the accepted application behind
// a founder's project page and send it back to submitted.
// Fixture accounts 986961 to 986963 and 986971 to 986975 belong to this suite
// alone: CI runs the DB suites in parallel on one database.
describe("An accepted application is locked to the /apply form", () => {
  afterAll(async () => {
    if (!skipIfNoDb) await cleanupFixtureApplications();
  });

  /** A fixture application in any status (the fixture's own type lists only some). */
  async function applicationIn(userId: number, status: string): Promise<number> {
    const id = await createApprovedApplication(userId, { name: `Test Fixture Land Locked ${status} ${userId}` });
    const database = await dbHelpers.getDb();
    await database!.update(applications).set({ status: status as never }).where(eq(applications.id, id));
    return id;
  }

  for (const [i, status] of ["approved", "active", "inactive"].entries()) {
    it.skipIf(skipIfNoDb)(`refuses update and submit on an ${status} application and changes nothing`, async () => {
      const userId = 986961 + i;
      const id = await applicationIn(userId, status);
      const before = await dbHelpers.getApplicationById(id);
      const name = before!.projectName;
      const caller = stewardCaller(userId);
      await expect(caller.applications.update({ id, data: { vision: "Overwritten vision", projectName: "Overwritten name" } }))
        .rejects.toMatchObject({ code: "FORBIDDEN", message: lockedApplicationMessage(name) });
      await expect(caller.applications.submit({ id }))
        .rejects.toMatchObject({ code: "FORBIDDEN", message: lockedApplicationMessage(name) });
      const after = await dbHelpers.getApplicationById(id);
      expect(after).toMatchObject({
        status,
        projectName: name,
        vision: before!.vision,
        submittedAt: before!.submittedAt,
        season: before!.season,
        stewardUserId: before!.stewardUserId,
      });
    });
  }

  // The status condition is in the UPDATE itself, so an application an admin
  // accepts between the read and the write is never overwritten.
  it.skipIf(skipIfNoDb)("the write itself refuses an accepted application, without the read before it", async () => {
    const id = await applicationIn(986974, "approved");
    const before = await dbHelpers.getApplicationById(id);
    await expect(updateOpenApplication(id, { status: "submitted", vision: "Overwritten vision" }))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: lockedApplicationMessage(before!.projectName) });
    const after = await dbHelpers.getApplicationById(id);
    expect(after).toMatchObject({ status: "approved", vision: before!.vision });
  });

  it.skipIf(skipIfNoDb)("the write lets an open application save the same answers twice", async () => {
    const id = await applicationIn(986975, "draft");
    await updateOpenApplication(id, { vision: "Same answer" });
    await expect(updateOpenApplication(id, { vision: "Same answer" })).resolves.toBeUndefined();
    expect((await dbHelpers.getApplicationById(id))!.vision).toBe("Same answer");
  });

  it("names the project and the way to bring another one", () => {
    expect(lockedApplicationMessage("Hill Farm")).toBe(
      "Hill Farm is already accepted, so this form can't change it. To bring another land project, write to us at regencivics.earth/connect.",
    );
  });

  for (const [i, status] of ["draft", "changes_requested", "rejected"].entries()) {
    it.skipIf(skipIfNoDb)(`lets update and submit go ahead on a ${status} application, as before`, async () => {
      const userId = 986971 + i;
      const id = await applicationIn(userId, status);
      const caller = stewardCaller(userId);
      const updated = await caller.applications.update({ id, data: { vision: "A new vision" } });
      expect(updated.vision).toBe("A new vision");
      const submitted = await caller.applications.submit({ id });
      expect(submitted.status).toBe("submitted");
    });
  }
});
