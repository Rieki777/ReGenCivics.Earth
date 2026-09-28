/**
 * The Network Grant Engine against a real database (funding engine Phase 5,
 * drizzle/0279): a steward saves a profile and gets matches and near misses,
 * a decision survives the next recompute, a pursued program gets its own
 * deadline ping, and deleting the profile removes the project's data.
 *
 * Runs in CI's integration job and only against a database on this machine:
 * it writes rows, and the regen-civics .env points at production.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { applications, fundingDeadlinePings, fundingPipeline, networkGrantMatches, projectFundingProfiles } from "../drizzle/schema";
import { deleteProfile, listMatches, saveProfile, setMatchStatus } from "./funding/projectFunding";
import { runFundingDeadlines } from "./funding/deadlines";

const url = process.env.DATABASE_URL ?? "";
const LOCAL = /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
const RUN = Date.now().toString(36);
const DAY = 86_400_000;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

describe.skipIf(!LOCAL)("network grant engine (integration)", () => {
  let db: Db;
  let applicationId = 0;
  const programIds: Record<string, number> = {};
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);

  beforeAll(async () => {
    const got = await getDb();
    if (!got) throw new Error("no database");
    db = got;
    const [app] = await db
      .insert(applications)
      .values({
        userId: 1,
        projectName: `Grant test farm ${RUN}`,
        projectType: "early_stage",
        location: "Ashland, Oregon",
        vision: "A test farm for the grant matcher.",
        landStatus: "owned",
        teamSize: 2,
        teamDescription: "Two stewards.",
        regenerativePractices: "Cover crops.",
        governanceApproach: "Consent.",
        communityEngagement: "Open days.",
        timeCommitment: "Full time.",
        fundingNeeds: "Equipment.",
      })
      .$returningId();
    applicationId = app.id;
    const programs = [
      { key: "sare", name: `SARE test ${RUN}`, applicantTypes: ["producer", "llc"], requiresTechnicalAdvisor: true, deadlineAt: new Date(now.getTime() + 6 * DAY) },
      { key: "open", name: `Open test ${RUN}`, applicantTypes: ["llc", "coop"], requiresTechnicalAdvisor: false, deadlineAt: new Date(now.getTime() + 30 * DAY) },
      { key: "abroad", name: `Abroad test ${RUN}`, applicantTypes: ["llc"], requiresTechnicalAdvisor: false, deadlineAt: null, geo: { countries: ["CR"] } },
    ];
    for (const p of programs) {
      const [row] = await db
        .insert(fundingPipeline)
        .values({
          name: p.name,
          category: "Land project program (grant)",
          audience: "project",
          programKey: `it-${p.key}-${RUN}`,
          applicantTypes: p.applicantTypes,
          geo: p.geo ?? { countries: ["US"] },
          programStatus: "active",
          requiresTechnicalAdvisor: p.requiresTechnicalAdvisor,
          deadlineAt: p.deadlineAt,
        })
        .$returningId();
      programIds[p.key] = row.id;
    }
  });

  afterAll(async () => {
    if (!db) return;
    await db.delete(fundingPipeline).where(inArray(fundingPipeline.id, Object.values(programIds)));
    if (applicationId) await db.delete(applications).where(eq(applications.id, applicationId));
  });

  const profile = {
    legalWrapper: "llc" as const,
    faithBased: false,
    isProducer: true,
    country: "US",
    region: "OR",
    activities: ["agriculture" as const],
    matchCapacity: "none" as const,
    technicalAdvisor: "none" as const,
    partnerCount: 0,
    eligibilityFlags: [],
  };

  it("stores matches and near misses, and leaves out programs the project cannot reach", async () => {
    await saveProfile(db, applicationId, profile, 1);
    const matches = await listMatches(db, applicationId);
    const byProgram = new Map(matches.map((m) => [m.pipelineId, m]));
    expect(byProgram.get(programIds.open)?.outcome).toBe("match");
    expect(byProgram.get(programIds.sare)?.outcome).toBe("near");
    expect(byProgram.get(programIds.sare)?.unmetCriterion).toBe("Needs a technical advisor who is independent of the project");
    expect(byProgram.has(programIds.abroad)).toBe(false);
    const [stored] = await db.select().from(projectFundingProfiles).where(eq(projectFundingProfiles.applicationId, applicationId));
    expect(stored.consentAt).toBeInstanceOf(Date);
  });

  it("keeps the project's decision when the profile changes", async () => {
    await setMatchStatus(db, { applicationId, pipelineId: programIds.sare, status: "pursuing" }, 1);
    await saveProfile(db, applicationId, { ...profile, technicalAdvisor: "independent" }, 1);
    const sare = (await listMatches(db, applicationId)).find((m) => m.pipelineId === programIds.sare);
    expect(sare?.status).toBe("pursuing");
    expect(sare?.outcome).toBe("match");
  });

  it("pings a program the project is pursuing, as that project's deadline", async () => {
    const sent: string[] = [];
    // Integration files run in parallel on one database: this run sees only this file's programs.
    const mineOnly = (r: { id: number }) => Object.values(programIds).includes(r.id);
    await runFundingDeadlines({ now: () => now, send: async (t) => (sent.push(t), true), rowFilter: mineOnly });
    const text = sent.join("\n");
    expect(text).toContain(`6 days: Grant test farm ${RUN}, SARE test ${RUN}, due `);
    expect(text).not.toContain(`Open test ${RUN}`);
    const pings = await db.select().from(fundingDeadlinePings).where(eq(fundingDeadlinePings.pipelineId, programIds.sare));
    expect(pings.map((p) => [p.applicationId, p.threshold])).toEqual([[applicationId, 7]]);
  });

  it("removes the profile and every match when the project deletes its data", async () => {
    await deleteProfile(db, applicationId);
    expect(await db.select().from(networkGrantMatches).where(eq(networkGrantMatches.applicationId, applicationId))).toEqual([]);
    expect(await db.select().from(projectFundingProfiles).where(eq(projectFundingProfiles.applicationId, applicationId))).toEqual([]);
  });
});
