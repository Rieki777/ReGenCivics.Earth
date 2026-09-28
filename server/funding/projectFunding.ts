/**
 * Land projects' funding profiles and their matched grant programs (funding
 * engine Phase 5, plan v1.3 section 11; the matcher is shared/grantMatcher.ts).
 *
 * A steward fills the profile on the project page; the matcher runs over every
 * project-facing program in funding_pipeline; matches and near misses are kept
 * in network_grant_matches so the project's own decisions (pursuing, drafting,
 * submitted, awarded, passed) survive the next recompute. The met and unmet
 * sentences are recomputed on every read, so they always reflect the program
 * data as it stands.
 *
 * The project owns its application. Nothing here applies, drafts or submits,
 * and nothing records a fee: ReGen never takes a share of what a project wins.
 */
import { z } from "zod";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  applications,
  fundingPipeline,
  networkGrantMatches,
  projectFundingProfiles,
  type FundingPipelineRow,
  type NetworkGrantMatchRow,
  type ProjectFundingProfileRow,
} from "../../drizzle/schema";
import {
  ACTIVITIES,
  ADVISOR_OPTIONS,
  ELIGIBILITY_FLAGS,
  LEGAL_WRAPPERS,
  MATCH_CAPACITY,
  matchAll,
  type FundingProfile,
  type MatchResult,
  type ProgramForMatch,
} from "../../shared/grantMatcher";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const MATCH_STATUSES = ["suggested", "pursuing", "drafting", "submitted", "awarded", "declined", "passed"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** The steward form. The eligibility flags are optional and opt-in. */
export const profileInput = z.object({
  legalWrapper: z.enum(LEGAL_WRAPPERS),
  faithBased: z.boolean(),
  isProducer: z.boolean(),
  country: z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code, like US"),
  region: z
    .string()
    .regex(/^[A-Z]{2,3}$/, "Use a two-letter state code, like OR")
    .nullable(),
  activities: z.array(z.enum(ACTIVITIES)).max(ACTIVITIES.length),
  matchCapacity: z.enum(MATCH_CAPACITY),
  technicalAdvisor: z.enum(ADVISOR_OPTIONS),
  partnerCount: z.number().int().min(0).max(1000),
  eligibilityFlags: z.array(z.enum(ELIGIBILITY_FLAGS)).max(ELIGIBILITY_FLAGS.length).default([]),
});
export type ProfileInput = z.infer<typeof profileInput>;

export function toFundingProfile(row: ProjectFundingProfileRow): FundingProfile {
  return {
    legalWrapper: row.legalWrapper as FundingProfile["legalWrapper"],
    faithBased: row.faithBased,
    isProducer: row.isProducer,
    country: row.country,
    region: row.region,
    activities: (row.activities ?? []) as FundingProfile["activities"],
    matchCapacity: row.matchCapacity as FundingProfile["matchCapacity"],
    technicalAdvisor: row.technicalAdvisor as FundingProfile["technicalAdvisor"],
    partnerCount: row.partnerCount,
    eligibilityFlags: (row.eligibilityFlags ?? []) as FundingProfile["eligibilityFlags"],
  };
}

export function toProgram(row: FundingPipelineRow): ProgramForMatch {
  return {
    id: row.id,
    name: row.name,
    audience: row.audience,
    applicantTypes: row.applicantTypes ?? null,
    geo: row.geo ?? null,
    eligibility: row.eligibilityRules ?? null,
    programStatus: row.programStatus,
    matchRequiredPct: row.matchRequiredPct,
    requiresTechnicalAdvisor: row.requiresTechnicalAdvisor,
    minPartners: row.minPartners,
    callOpen: row.callOpen,
    deadlineAt: row.deadlineAt,
  };
}

/** What a steward sees of a program: never the internal fit number. */
function programView(row: FundingPipelineRow) {
  return {
    id: row.id,
    name: row.name,
    instrument: row.instrument,
    link: row.link,
    deadlineAt: row.deadlineAt,
    deadline: row.deadline,
    callOpen: row.callOpen,
    amountMin: row.amountMin,
    amountMax: row.amountMax,
    currency: row.currency,
    statusVerifiedAt: row.statusVerifiedAt,
  };
}

async function projectPrograms(db: Db): Promise<FundingPipelineRow[]> {
  return db.select().from(fundingPipeline).where(ne(fundingPipeline.audience, "platform")).orderBy(asc(fundingPipeline.id));
}

export async function getProfile(db: Db, applicationId: number): Promise<ProjectFundingProfileRow | null> {
  const [row] = await db.select().from(projectFundingProfiles).where(eq(projectFundingProfiles.applicationId, applicationId)).limit(1);
  return row ?? null;
}

/**
 * Recompute a project's matches. New matches and near misses arrive as
 * suggestions; existing rows get fresh outcomes; a suggestion that no longer
 * matches is removed, and a program the project already acted on is kept
 * with its new outcome, so a decision is never silently lost.
 */
export async function refreshMatches(db: Db, applicationId: number): Promise<MatchResult[]> {
  const profileRow = await getProfile(db, applicationId);
  if (!profileRow) return [];
  const programs = await projectPrograms(db);
  const results = matchAll(toFundingProfile(profileRow), programs.map(toProgram));
  const existing = await db.select().from(networkGrantMatches).where(eq(networkGrantMatches.applicationId, applicationId));
  const byProgram = new Map(existing.map((m) => [m.pipelineId, m]));
  const now = new Date();

  for (const r of results) {
    const row = byProgram.get(r.programId);
    const offered = r.outcome === "match" || r.outcome === "near";
    if (row) {
      if (!offered && row.status === "suggested") {
        await db.delete(networkGrantMatches).where(eq(networkGrantMatches.id, row.id));
      } else {
        await db
          .update(networkGrantMatches)
          .set({ outcome: r.outcome, unmetCriterion: r.unmetCriterion, fitScore: r.fit, computedAt: now })
          .where(eq(networkGrantMatches.id, row.id));
      }
    } else if (offered) {
      await db.insert(networkGrantMatches).values({
        applicationId,
        pipelineId: r.programId,
        outcome: r.outcome,
        unmetCriterion: r.unmetCriterion,
        fitScore: r.fit,
        computedAt: now,
      });
    }
  }
  return results;
}

export async function saveProfile(db: Db, applicationId: number, input: ProfileInput, userId: number | null) {
  const values = {
    legalWrapper: input.legalWrapper,
    faithBased: input.faithBased,
    isProducer: input.isProducer,
    country: input.country,
    region: input.country === "US" ? input.region : null,
    activities: input.activities,
    matchCapacity: input.matchCapacity,
    technicalAdvisor: input.technicalAdvisor,
    partnerCount: input.partnerCount,
    eligibilityFlags: input.eligibilityFlags,
    updatedBy: userId,
  };
  const existing = await getProfile(db, applicationId);
  if (existing) {
    await db.update(projectFundingProfiles).set(values).where(eq(projectFundingProfiles.applicationId, applicationId));
  } else {
    // The steward's consent is part of the input schema (z.literal(true)); it
    // is stamped once, when the profile is first saved.
    await db.insert(projectFundingProfiles).values({ applicationId, ...values, consentAt: new Date() });
  }
  await refreshMatches(db, applicationId);
}

/** The project's matches and near misses with their sentences, soonest deadline first. */
export async function listMatches(db: Db, applicationId: number) {
  const profileRow = await getProfile(db, applicationId);
  if (!profileRow) return [];
  const stored = await db.select().from(networkGrantMatches).where(eq(networkGrantMatches.applicationId, applicationId));
  if (!stored.length) return [];
  const programs = await db.select().from(fundingPipeline).where(inArray(fundingPipeline.id, stored.map((m) => m.pipelineId)));
  const programById = new Map(programs.map((p) => [p.id, p]));
  const live = new Map(matchAll(toFundingProfile(profileRow), programs.map(toProgram)).map((r) => [r.programId, r]));

  const rank = (m: NetworkGrantMatchRow) => (m.status !== "suggested" ? 0 : m.outcome === "match" ? 1 : m.outcome === "near" ? 2 : 3);
  const deadline = (m: NetworkGrantMatchRow) => {
    const d = programById.get(m.pipelineId)?.deadlineAt;
    return d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
  };
  return stored
    .filter((m) => programById.has(m.pipelineId))
    .sort((a, b) => rank(a) - rank(b) || deadline(a) - deadline(b))
    .map((m) => {
      const result = live.get(m.pipelineId);
      return {
        pipelineId: m.pipelineId,
        status: m.status,
        outcome: result?.outcome ?? m.outcome,
        unmetCriterion: result?.unmetCriterion ?? m.unmetCriterion,
        met: result?.met ?? [],
        unmet: result?.unmet ?? [],
        amountAwarded: m.amountAwarded,
        awardedAt: m.awardedAt,
        program: programView(programById.get(m.pipelineId)!),
      };
    });
}

export async function setMatchStatus(
  db: Db,
  input: { applicationId: number; pipelineId: number; status: MatchStatus; amountAwarded?: number | null },
  userId: number | null,
) {
  const [row] = await db
    .select()
    .from(networkGrantMatches)
    .where(and(eq(networkGrantMatches.applicationId, input.applicationId), eq(networkGrantMatches.pipelineId, input.pipelineId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "That program is not matched to this project" });
  const awarded = input.status === "awarded";
  await db
    .update(networkGrantMatches)
    .set({
      status: input.status,
      statusChangedBy: userId,
      amountAwarded: awarded ? (input.amountAwarded ?? row.amountAwarded ?? null) : row.amountAwarded,
      awardedAt: awarded ? (row.awardedAt ?? new Date()) : row.awardedAt,
    })
    .where(eq(networkGrantMatches.id, row.id));
}

/** A project removes its funding data: the profile and every match (plan 11.4). */
export async function deleteProfile(db: Db, applicationId: number) {
  await db.delete(networkGrantMatches).where(eq(networkGrantMatches.applicationId, applicationId));
  await db.delete(projectFundingProfiles).where(eq(projectFundingProfiles.applicationId, applicationId));
}

/** Admin: every profiled project with its counts, for the Project matches view. */
export async function adminOverview(db: Db) {
  const profiles = await db
    .select({ applicationId: projectFundingProfiles.applicationId, updatedAt: projectFundingProfiles.updatedAt, projectName: applications.projectName })
    .from(projectFundingProfiles)
    .innerJoin(applications, eq(applications.id, projectFundingProfiles.applicationId));
  const matches = profiles.length
    ? await db
        .select()
        .from(networkGrantMatches)
        .where(inArray(networkGrantMatches.applicationId, profiles.map((p) => p.applicationId)))
    : [];
  const programs = await projectPrograms(db);
  return {
    programs: programs.length,
    openPrograms: programs.filter((p) => p.programStatus === "active").length,
    projects: profiles.map((p) => {
      const mine = matches.filter((m) => m.applicationId === p.applicationId);
      return {
        applicationId: p.applicationId,
        projectName: p.projectName,
        updatedAt: p.updatedAt,
        matches: mine.filter((m) => m.outcome === "match").length,
        nearMisses: mine.filter((m) => m.outcome === "near").length,
        pursuing: mine.filter((m) => m.status !== "suggested" && m.status !== "passed").length,
        awarded: mine.filter((m) => m.status === "awarded").length,
      };
    }),
  };
}
