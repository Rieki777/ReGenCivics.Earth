/**
 * The Network Grant Engine's matcher (shared/grantMatcher.ts; funding engine
 * Phase 5). Pure. Program fixtures follow the private grant-sources seed.
 */
import { describe, expect, it } from "vitest";
import { matchAll, matchProgram, type FundingProfile, type ProgramForMatch } from "./grantMatcher";

const FARM: FundingProfile = {
  legalWrapper: "llc",
  faithBased: false,
  isProducer: true,
  country: "US",
  region: "OR",
  activities: ["agriculture", "agroforestry"],
  matchCapacity: "under_10k",
  technicalAdvisor: "none",
  partnerCount: 0,
  eligibilityFlags: [],
};

function program(over: Partial<ProgramForMatch>): ProgramForMatch {
  return {
    id: 1,
    name: "A program",
    audience: "project",
    applicantTypes: null,
    geo: null,
    eligibility: null,
    programStatus: "active",
    matchRequiredPct: null,
    requiresTechnicalAdvisor: null,
    minPartners: null,
    callOpen: true,
    deadlineAt: null,
    ...over,
  };
}

const WSARE = program({
  id: 10,
  name: "Western SARE Farmer/Rancher",
  applicantTypes: ["producer", "individual", "llc"],
  geo: { countries: ["US"], states: ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"] },
  requiresTechnicalAdvisor: true,
  deadlineAt: "2026-10-28T06:00:00.000Z",
});
const COMMUNITY_FOREST = program({
  id: 11,
  name: "Community Forest Program",
  applicantTypes: ["public_body", "tribe", "nonprofit_501c3"],
  geo: { countries: ["US"], scope: "national" },
  matchRequiredPct: 50,
  deadlineAt: "2026-10-13T07:00:00.000Z",
});
const CLIF = program({
  id: 12,
  name: "Clif Family Foundation",
  applicantTypes: ["nonprofit_501c3", "fiscal_sponsored"],
  geo: { countries: ["US"] },
  eligibility: { excludes: ["faith_based"] },
});
const PSA = program({ id: 13, name: "Costa Rica PSA", applicantTypes: ["individual", "llc", "coop"], geo: { countries: ["CR"] } });
const BIPOC_ICC = program({ id: 14, name: "BIPOC ICC regrants", applicantTypes: ["coop", "unincorporated_collective", "nonprofit_501c3"], eligibility: { requiresFlags: ["bipoc_led"] } });

describe("matchProgram", () => {
  it("matches on who can apply first, and names a producer route", () => {
    const r = matchProgram({ ...FARM, technicalAdvisor: "independent" }, WSARE);
    expect(r.outcome).toBe("match");
    expect(r.met[0]).toBe("Open to an LLC or company");
    const producerOnly = matchProgram({ ...FARM, legalWrapper: "coop", technicalAdvisor: "independent" }, WSARE);
    expect(producerOnly.outcome).toBe("match");
    expect(producerOnly.met[0]).toBe("Open to farm and ranch producers");
  });

  it("names the one fixable criterion a project misses", () => {
    const r = matchProgram(FARM, WSARE);
    expect(r.outcome).toBe("near");
    expect(r.unmetCriterion).toBe("Needs a technical advisor who is independent of the project");
  });

  it("treats a wrong applicant type as a near miss with a partner or sponsor route", () => {
    const r = matchProgram(FARM, COMMUNITY_FOREST);
    expect(r.outcome).toBe("near");
    expect(r.unmetCriterion).toBe("Open only to public bodies, tribes and nonprofits: apply with a partner or sponsor who is one");
  });

  it("never calls geography or a faith-based exclusion a near miss", () => {
    expect(matchProgram(FARM, PSA).outcome).toBe("no");
    expect(matchProgram(FARM, PSA).unmet).toEqual(["Only for land in CR"]);
    const church = { ...FARM, legalWrapper: "nonprofit_501c3" as const, faithBased: true };
    expect(matchProgram(church, CLIF).outcome).toBe("no");
    expect(matchProgram({ ...church, faithBased: false }, CLIF).outcome).toBe("match");
  });

  it("checks the state list for US programs, and asks for the state when it is missing", () => {
    expect(matchProgram({ ...FARM, region: "TX", technicalAdvisor: "independent" }, WSARE).unmet).toEqual(["Only in AK, AZ, CA, CO, HI, ID, MT, NV, NM, OR, UT, WA and WY"]);
    expect(matchProgram({ ...FARM, region: null, technicalAdvisor: "independent" }, WSARE).unmet).toEqual(["Only in some states: add your state to the profile"]);
  });

  it("asks a project to share an identity flag rather than assuming it", () => {
    const coop = { ...FARM, legalWrapper: "coop" as const };
    const r = matchProgram(coop, BIPOC_ICC);
    expect(r.outcome).toBe("near");
    expect(r.unmetCriterion).toBe("Only for BIPOC-led groups: add it to the profile if it applies");
    expect(matchProgram({ ...coop, eligibilityFlags: ["bipoc_led"] }, BIPOC_ICC).outcome).toBe("match");
  });

  it("needs a match only when the program asks for one, and partners only when counted", () => {
    const nonprofit = { ...FARM, legalWrapper: "nonprofit_501c3" as const };
    expect(matchProgram({ ...nonprofit, matchCapacity: "none" }, COMMUNITY_FOREST).unmetCriterion).toBe("Needs a 50% match in cash or in kind");
    const partnership = program({ applicantTypes: ["llc"], minPartners: 3 });
    expect(matchProgram({ ...FARM, partnerCount: 2 }, partnership).unmetCriterion).toBe("Needs at least 3 partner producers");
    expect(matchProgram({ ...FARM, partnerCount: 3 }, partnership).outcome).toBe("match");
  });

  it("reports a program that is paused, dead or in litigation as closed", () => {
    for (const programStatus of ["paused", "dead", "litigation"]) {
      expect(matchProgram(FARM, program({ programStatus })).outcome).toBe("closed");
    }
  });

  it("counts two unmet criteria as no match, even when both are fixable", () => {
    const r = matchProgram({ ...FARM, legalWrapper: "nonprofit_501c3", isProducer: false }, WSARE);
    expect(r.unmet).toHaveLength(2);
    expect(r.outcome).toBe("no");
  });
});

describe("matchAll", () => {
  it("offers matches first, then near misses, each soonest deadline first, and never platform programs", () => {
    const platform = program({ id: 99, audience: "platform", applicantTypes: ["llc"] });
    const soonMatch = program({ id: 20, applicantTypes: ["llc"], deadlineAt: "2026-10-05T07:00:00.000Z" });
    const laterMatch = program({ id: 21, applicantTypes: ["llc"], deadlineAt: "2026-12-01T08:00:00.000Z" });
    const results = matchAll(FARM, [laterMatch, WSARE, platform, COMMUNITY_FOREST, soonMatch, PSA]);
    expect(results.map((r) => [r.programId, r.outcome])).toEqual([
      [20, "match"],
      [21, "match"],
      [11, "near"],
      [10, "near"],
      [13, "no"],
    ]);
  });

  it("never exposes the fit number in any text", () => {
    for (const r of matchAll(FARM, [WSARE, COMMUNITY_FOREST, CLIF, PSA])) {
      for (const line of [...r.met, ...r.unmet]) expect(line).not.toMatch(/\d+\s*%?\s*(fit|score)/i);
    }
  });
});
