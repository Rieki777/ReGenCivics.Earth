/**
 * Tests for form submission procedures
 * - Investor inquiries
 * - General inquiries (catch-all routing form)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import type { Request, Response } from "express";

const skipIfNoDb = !process.env.DATABASE_URL;

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Create a mock context for public procedures
const createMockContext = async (user: { id: number; role: string } | null = null) => {
  const mockReq = {
    cookies: {},
    headers: {},
  } as unknown as Request;
  const mockRes = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;
  
  // info is unused by our createContext; the adapter type requires it.
  const ctx = await createContext({ req: mockReq, res: mockRes } as unknown as Parameters<typeof createContext>[0]);
  if (user) {
    (ctx as any).user = user;
  }
  return ctx;
};

describe("Investor Inquiry Procedures", () => {
  const validInvestorData = {
    fullName: "Test Investor",
    email: "investor@example.com",
    phone: "+1234567890",
    organization: "Test Fund LLC",
    role: "Managing Partner",
    location: "San Francisco, CA",
    investorType: "family_office" as const,
    investmentRange: "250k_1m" as const,
    investmentTimeline: "3_months" as const,
    primaryInterest: "both" as const,
    geographicPreference: "North America, Europe",
    sectorInterests: JSON.stringify(["regenerative_agriculture", "renewable_energy"]),
    investmentExperience: "15 years in impact investing",
    motivations: "Seeking to support regenerative land projects",
    impactGoals: "Carbon sequestration and community development",
    questionsForTeam: "What is the expected timeline for returns?",
    referralSource: "Web search",
    documentsUrl: "https://example.com/docs",
    additionalNotes: "Looking forward to connecting",
    preferredContact: "video_call" as const,
    newsletterOptIn: true,
  };

  it.skipIf(skipIfNoDb)("should submit investor inquiry with valid data", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.investorInquiries.submit(validInvestorData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it.skipIf(skipIfNoDb)("should submit investor inquiry with minimal required data", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const minimalData = {
      fullName: "Minimal Investor",
      email: "minimal@example.com",
      investorType: "individual" as const,
      investmentRange: "under_250k" as const,
      investmentTimeline: "exploring" as const,
      primaryInterest: "land_projects" as const,
    };
    
    const result = await caller.investorInquiries.submit(minimalData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should reject investor inquiry with invalid email", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const invalidData = {
      ...validInvestorData,
      email: "not-an-email",
    };
    
    await expect(caller.investorInquiries.submit(invalidData)).rejects.toThrow();
  });

  it("should reject investor inquiry with invalid investor type", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const invalidData = {
      ...validInvestorData,
      investorType: "invalid_type" as any,
    };
    
    await expect(caller.investorInquiries.submit(invalidData)).rejects.toThrow();
  });
});

describe("General Inquiry Procedures (Catch-All Form)", () => {
  const validCreateWithRegensData = {
    pathType: "create_with_regens" as const,
    email: "creator@example.com",
    fullName: "Creative Partner",
    allianceOrganizations: JSON.stringify(["hypha", "maptio"]),
    additionalNotes: "Interested in collaboration",
    newsletterOptIn: true,
  };

  const validAllianceData = {
    pathType: "alliance" as const,
    email: "alliance@example.com",
    fullName: "Alliance Org Rep",
    organizationUrl: "https://alliance-org.com",
    partnershipDescription: "We provide sustainable building materials",
    newsletterOptIn: false,
  };

  const validLiveData = {
    pathType: "live" as const,
    email: "resident@example.com",
    fullName: "Future Resident",
    landProjects: JSON.stringify(["liminal", "tdf"]),
    additionalNotes: "Looking to join a community in Europe",
  };

  const validRoleData = {
    pathType: "role" as const,
    email: "applicant@example.com",
    fullName: "Role Applicant",
    roleArchetypes: JSON.stringify(["builder", "connector"]),
    roleInterest: "Interested in community coordination role",
  };

  const validSomethingElseData = {
    pathType: "something_else" as const,
    email: "unique@example.com",
    fullName: "Unique Contributor",
    uniqueContribution: "I have a unique skill in permaculture design",
  };

  it.skipIf(skipIfNoDb)("should submit create_with_regens inquiry", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.generalInquiries.submit(validCreateWithRegensData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it.skipIf(skipIfNoDb)("should submit alliance inquiry", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.generalInquiries.submit(validAllianceData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it.skipIf(skipIfNoDb)("should submit live inquiry", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.generalInquiries.submit(validLiveData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it.skipIf(skipIfNoDb)("should submit role inquiry", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.generalInquiries.submit(validRoleData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it.skipIf(skipIfNoDb)("should submit something_else inquiry", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.generalInquiries.submit(validSomethingElseData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it.skipIf(skipIfNoDb)("should submit inquiry with minimal data (just email and path)", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const minimalData = {
      pathType: "something_else" as const,
      email: "minimal@example.com",
    };
    
    const result = await caller.generalInquiries.submit(minimalData);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("should reject inquiry with invalid email", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const invalidData = {
      pathType: "alliance" as const,
      email: "not-valid-email",
    };
    
    await expect(caller.generalInquiries.submit(invalidData)).rejects.toThrow();
  });

  it("should reject inquiry with invalid path type", async () => {
    const ctx = await createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const invalidData = {
      pathType: "invalid_path" as any,
      email: "test@example.com",
    };
    
    await expect(caller.generalInquiries.submit(invalidData)).rejects.toThrow();
  });
});

describe("Admin Inquiry Procedures", () => {
  it("should reject non-admin access to investor inquiry list", async () => {
    const ctx = await createMockContext({ id: 1, role: "user" });
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.investorInquiries.list()).rejects.toThrow("Admin access required");
  });

  it("should reject non-admin access to general inquiry list", async () => {
    const ctx = await createMockContext({ id: 1, role: "user" });
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.generalInquiries.list()).rejects.toThrow("Admin access required");
  });

  it.skipIf(skipIfNoDb)("should allow admin access to investor inquiry list", async () => {
    const ctx = await createMockContext({ id: 1, role: "admin" });
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.investorInquiries.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it.skipIf(skipIfNoDb)("should allow admin access to general inquiry list", async () => {
    const ctx = await createMockContext({ id: 1, role: "admin" });
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.generalInquiries.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
