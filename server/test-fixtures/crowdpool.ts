/**
 * Crowdpool test fixtures.
 *
 * Since 2026-09-24 a non-admin can only start a campaign for an application
 * they steward that has passed review, and only admins publish a campaign.
 * Tests that used to create and publish as the same plain user now:
 *   - create with `applicationId: await createApprovedApplication(userId)`;
 *   - publish with `adminCaller().campaigns.updateStatus(...)`.
 *
 * Fixture applications are named "Test Fixture Land ...", which
 * server/test-global-teardown.ts removes (projectName LIKE '%Test%'), and
 * cleanupFixtureApplications() removes the ones this process created.
 */
import { inArray } from "drizzle-orm";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { applications, orgClaims } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";

type Role = "user" | "admin" | "superadmin";

export const FIXTURE_ADMIN_ID = 987900;

const createdApplicationIds: number[] = [];
const createdClaimIds: number[] = [];

let ipCounter = 0;
/** A fresh IP per caller, so the in-memory rate limiter never trips across tests. */
export function nextFixtureIp(): string {
  ipCounter++;
  return `10.77.${Math.floor(ipCounter / 250) % 250}.${(ipCounter % 250) + 1}`;
}

export function ctxFor(userId: number, role: Role = "user", ip = nextFixtureIp()): TrpcContext {
  const user = {
    id: userId,
    openId: `fixture-open-${userId}`,
    email: `fixture${userId}@example.com`,
    name: `Fixture ${userId}`,
    loginMethod: "google",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as NonNullable<TrpcContext["user"]>;
  return {
    user,
    authMethod: "legacy",
    req: { protocol: "https", headers: { "x-forwarded-for": ip } } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

export function anonCtx(ip = nextFixtureIp()): TrpcContext {
  return { ...ctxFor(0, "user", ip), user: null } as unknown as TrpcContext;
}

export function adminCaller(ip?: string) {
  return appRouter.createCaller(ctxFor(FIXTURE_ADMIN_ID, "admin", ip));
}

export function stewardCaller(userId: number, ip?: string) {
  return appRouter.createCaller(ctxFor(userId, "user", ip));
}

export function anonCaller(ip?: string) {
  return appRouter.createCaller(anonCtx(ip));
}

/** Insert an application owned by `userId`, approved unless told otherwise. Returns its id. */
export async function createApprovedApplication(
  userId: number,
  opts: { status?: "draft" | "submitted" | "under_review" | "approved" | "active" | "rejected"; stewardUserId?: number | null; name?: string } = {},
): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("createApprovedApplication needs DATABASE_URL");
  const result: any = await database.insert(applications).values({
    userId,
    status: opts.status ?? "approved",
    projectName: opts.name ?? `Test Fixture Land ${userId}-${Date.now()}-${createdApplicationIds.length}`,
    projectType: "early_stage",
    location: "Test Valley, Portugal",
    country: "Portugal",
    vision: "Fixture vision",
    landStatus: "owned",
    teamSize: 3,
    teamDescription: "Fixture team",
    regenerativePractices: "Fixture practices",
    governanceApproach: "Fixture governance",
    communityEngagement: "Fixture engagement",
    timeCommitment: "Fixture time",
    fundingNeeds: "Fixture needs",
    stewardUserId: opts.stewardUserId ?? null,
  });
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  createdApplicationIds.push(id);
  return id;
}

/** An approved land_project org claim for `userId` on the application. */
export async function createApprovedLandClaim(userId: number, applicationId: number, status: "pending" | "approved" | "rejected" = "approved"): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("createApprovedLandClaim needs DATABASE_URL");
  const result: any = await database.insert(orgClaims).values({
    userId,
    orgType: "land_project",
    orgId: String(applicationId),
    orgName: `Test Fixture Land ${applicationId}`,
    status,
  });
  const id = Number(result?.[0]?.insertId ?? result?.insertId);
  createdClaimIds.push(id);
  return id;
}

/** Remove the applications and claims this process created. */
export async function cleanupFixtureApplications(): Promise<void> {
  const database = await getDb();
  if (!database) return;
  if (createdClaimIds.length) {
    await database.delete(orgClaims).where(inArray(orgClaims.id, createdClaimIds.splice(0)));
  }
  if (createdApplicationIds.length) {
    await database.delete(applications).where(inArray(applications.id, createdApplicationIds.splice(0)));
  }
}

/**
 * Await a submitContribution on a real campaign and narrow its id to a
 * number. An example campaign answers with a practice run and id null
 * (PRACTICE_CONTRIBUTION_RESULT), which would mean a fixture is wrongly a
 * demo, so this throws.
 */
export async function realOffer<T extends { id: number | null; practice: boolean }>(
  pending: Promise<T>,
): Promise<T & { id: number }> {
  const result = await pending;
  if (result.id === null || result.practice) throw new Error("submitContribution answered with a practice run: the fixture campaign is an example");
  return result as T & { id: number };
}
