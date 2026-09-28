/**
 * The Network Grant Engine's server side (funding engine Phase 5): the steward
 * gate on every project procedure, the profile's input rules, the program
 * seed's planning, and the rule that no fee is recorded anywhere near a match
 * or an award (plan 11.4). No database: the vitest env has no DATABASE_URL.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { networkGrantMatches, projectFundingProfiles } from "../drizzle/schema";
import { profileInput } from "./funding/projectFunding";
import { planProgramRow, validateProgramSeed, type GrantProgramSeed } from "./funding/kitSeed";

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const PLAYER = { id: 9, role: "user" } as unknown as TrpcContext["user"];

const PROFILE = {
  legalWrapper: "llc" as const,
  faithBased: false,
  isProducer: true,
  country: "US",
  region: "OR",
  activities: ["agriculture" as const],
  matchCapacity: "under_10k" as const,
  technicalAdvisor: "none" as const,
  partnerCount: 0,
  eligibilityFlags: [],
};

describe("profile input", () => {
  it("accepts the seven-field form", () => {
    expect(profileInput.safeParse(PROFILE).success).toBe(true);
  });

  it("refuses codes it cannot match on", () => {
    expect(profileInput.safeParse({ ...PROFILE, country: "USA" }).success).toBe(false);
    expect(profileInput.safeParse({ ...PROFILE, region: "oregon" }).success).toBe(false);
    expect(profileInput.safeParse({ ...PROFILE, legalWrapper: "church" }).success).toBe(false);
    expect(profileInput.safeParse({ ...PROFILE, activities: ["mining"] }).success).toBe(false);
    expect(profileInput.safeParse({ ...PROFILE, partnerCount: -1 }).success).toBe(false);
  });
});

describe("projectFunding router", () => {
  it("refuses anonymous callers at the sign-in gate", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.projectFunding.get({ applicationId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.projectFunding.save({ applicationId: 1, ...PROFILE, consent: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses a signed-in member who does not steward the project", async () => {
    const caller = appRouter.createCaller(makeCtx(PLAYER));
    await expect(caller.projectFunding.get({ applicationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.projectFunding.save({ applicationId: 1, ...PROFILE, consent: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.projectFunding.setStatus({ applicationId: 1, pipelineId: 2, status: "pursuing" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.projectFunding.remove({ applicationId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.projectFunding.overview()).rejects.toMatchObject({ code: expect.stringMatching(/^(UNAUTHORIZED|FORBIDDEN)$/) });
  });

  it("requires consent on every save", async () => {
    const caller = appRouter.createCaller(makeCtx(PLAYER));
    await expect(caller.projectFunding.save({ applicationId: 1, ...PROFILE, consent: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("no fee, anywhere near a match or an award", () => {
  it("has no fee, commission or percentage column on matches or profiles", () => {
    for (const table of [networkGrantMatches, projectFundingProfiles]) {
      const names = getTableConfig(table).columns.map((c) => c.name);
      expect(names.filter((n) => /fee|commission|percent|cut|share|take/i.test(n)), getTableConfig(table).name).toEqual([]);
    }
  });

  it("keeps the migration's match table free of fee columns too", () => {
    const sql = readFileSync(path.resolve(__dirname, "..", "drizzle", "0279_network_grant_engine.sql"), "utf8");
    const table = sql.slice(sql.indexOf("CREATE TABLE IF NOT EXISTS `network_grant_matches`"));
    const body = table.slice(0, table.indexOf(");"));
    expect(body).not.toMatch(/`[^`]*(fee|commission|percent)[^`]*`/i);
  });
});

describe("program seed planning", () => {
  const CFP: GrantProgramSeed = {
    key: "usda-fs-community-forest-2026",
    name: "Community Forest and Open Space Conservation Program (FY2026)",
    url: "https://www.fs.usda.gov/managing-land/private-land/community-forest/program",
    audience: "project",
    instrument: "grant",
    applicant_types: ["public_body", "tribe", "nonprofit_501c3"],
    geo: { countries: ["US"], scope: "national" },
    amount_max: 600000,
    currency: "USD",
    match_required_pct: 50,
    requires_technical_advisor: false,
    min_partners: 0,
    next_deadline: "2026-10-13",
    call_open: true,
    program_status: "active",
    status_verified_at: "2026-09-27",
    verification: "VERIFIED",
    eligibility: null,
  };

  it("validates keys, audience and dates", () => {
    expect(validateProgramSeed([CFP])).toEqual([]);
    expect(validateProgramSeed([{ ...CFP, audience: "platform" }]).join(" ")).toContain("audience must be project or both");
    expect(validateProgramSeed([{ ...CFP, next_deadline: "Oct 13" }]).join(" ")).toContain("YYYY-MM-DD");
    expect(validateProgramSeed([CFP, CFP]).join(" ")).toContain("duplicate key");
  });

  it("writes research facts, a Pacific start-of-day deadline, and none of Rye's columns", () => {
    const row = planProgramRow(CFP);
    expect(row).toMatchObject({
      programKey: "usda-fs-community-forest-2026",
      audience: "project",
      track: "grant",
      matchRequiredPct: 50,
      typicalSize: "up to $600,000",
      geography: "US",
      statusVerifiedAt: "2026-09-27",
    });
    expect(row.deadlineAt?.toISOString()).toBe("2026-10-13T07:00:00.000Z");
    for (const key of ["appStatus", "stage", "owner", "nextAction", "notes", "priority"]) expect(row).not.toHaveProperty(key);
    expect(planProgramRow({ ...CFP, instrument: "loan" }).track).toBeNull();
    expect(planProgramRow({ ...CFP, eligibility: { excludes: ["faith_based"] } }).eligibilityRules).toEqual({ excludes: ["faith_based"], requiresFlags: [] });
  });
});
