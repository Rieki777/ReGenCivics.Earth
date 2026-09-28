/**
 * projectFunding router: a land project's funding profile and its matched
 * grant programs (funding engine Phase 5, plan v1.3 section 11).
 *
 * Security posture (BUILD-PLAYBOOK: new procedures):
 *  - Every project procedure is protectedProcedure plus the one steward gate,
 *    canStewardApplication (ADR-61): the project's applicant, its steward,
 *    holders of an approved org claim, and admins. Anyone else gets FORBIDDEN,
 *    and a project with no application has no profile.
 *  - The user id comes from ctx.user.id, never from input; every input is
 *    zod-bounded.
 *  - The eligibility flags are opt-in and self-reported, and no procedure here
 *    returns them to anyone but the project's stewards and admins. The internal
 *    fit number never leaves the server.
 *  - No LLM runs, nothing is submitted, and no fee is recorded anywhere.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { canStewardApplication } from "../lib/project-steward";
import {
  MATCH_STATUSES,
  adminOverview,
  deleteProfile,
  getProfile,
  listMatches,
  profileInput,
  saveProfile,
  setMatchStatus,
} from "../funding/projectFunding";
import type { TrpcContext } from "../_core/context";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function assertSteward(user: TrpcContext["user"], applicationId: number) {
  if (!(await canStewardApplication(user, applicationId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only this project's stewards can see or change its funding profile." });
  }
}

const applicationIdSchema = z.number().int().positive();

/** The profile the steward form reads, without the audit columns. */
function profileView(row: Awaited<ReturnType<typeof getProfile>>) {
  if (!row) return null;
  return {
    legalWrapper: row.legalWrapper,
    faithBased: row.faithBased,
    isProducer: row.isProducer,
    country: row.country,
    region: row.region,
    activities: row.activities ?? [],
    matchCapacity: row.matchCapacity,
    technicalAdvisor: row.technicalAdvisor,
    partnerCount: row.partnerCount,
    eligibilityFlags: row.eligibilityFlags ?? [],
    consentAt: row.consentAt,
    updatedAt: row.updatedAt,
  };
}

export const projectFundingRouter = router({
  /** The project's profile and its matches, for its stewards. */
  get: protectedProcedure.input(z.object({ applicationId: applicationIdSchema })).query(async ({ input, ctx }) => {
    await assertSteward(ctx.user, input.applicationId);
    const db = await requireDb();
    const profile = profileView(await getProfile(db, input.applicationId));
    return { profile, matches: profile ? await listMatches(db, input.applicationId) : [] };
  }),

  /** Save the profile and recompute matches. Consent is required on every save. */
  save: protectedProcedure
    .input(profileInput.extend({ applicationId: applicationIdSchema, consent: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await requireDb();
      const { applicationId, consent: _consent, ...profile } = input;
      await saveProfile(db, applicationId, profile, ctx.user.id);
      return { profile: profileView(await getProfile(db, applicationId)), matches: await listMatches(db, applicationId) };
    }),

  /** The project decides: pursue, draft, submitted, awarded, declined, or pass. */
  setStatus: protectedProcedure
    .input(
      z.object({
        applicationId: applicationIdSchema,
        pipelineId: z.number().int().positive(),
        status: z.enum(MATCH_STATUSES),
        amountAwarded: z.number().int().min(0).max(100_000_000).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await requireDb();
      await setMatchStatus(db, input, ctx.user.id);
      return { matches: await listMatches(db, input.applicationId) };
    }),

  /** Remove the profile and every match: the project's data is the project's. */
  remove: protectedProcedure.input(z.object({ applicationId: applicationIdSchema })).mutation(async ({ input, ctx }) => {
    await assertSteward(ctx.user, input.applicationId);
    await deleteProfile(await requireDb(), input.applicationId);
    return { ok: true as const };
  }),

  /** Admin: every profiled project with its match counts. */
  overview: adminProcedure.query(async () => adminOverview(await requireDb())),
});
