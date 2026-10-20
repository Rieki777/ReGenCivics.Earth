/**
 * Village profile tRPC router (ADR-77): a land project's Village OS 1.0,
 * gathered from every page and weekly board, for its stewards to confirm.
 *
 * WHO SEES IT. A project's stewards (server/lib/project-steward.ts: the
 * applicant, the application's steward, approved land-project claim holders)
 * and admins. The profile carries every answer the project's people gave on
 * the boards, already public there, plus its stewards' own words, which are
 * not; so nothing here is public, and nothing widens what the boards show.
 *
 * Nothing here writes to Village OS. The stewards download their 1.0 file and
 * load it into their village (the Village OS lane's "Start from your ReGen
 * Civics profile").
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { adminProcedure, protectedProcedure, rateLimited, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import { applications, orgClaims } from "../../drizzle/schema";
import { SESSION_BOARD_SEASON } from "@shared/sessionBoard";
import { DECISION_KEY_RE } from "@shared/villageDecisions";
import { toVillageFile } from "@shared/villageFile";
import { canStewardApplication } from "../lib/project-steward";
import {
  PROFILE_APPLICATION_SEASON,
  PROFILE_STATUSES,
  answerDecision,
  claimCard,
  clearDecision,
  confirmDecision,
  listVillageProfiles,
  readVillageProfile,
  unclaimCard,
} from "../lib/villageProfile";
import type { Db } from "../lib/sessionBoard";

const READ_LIMIT = { windowMs: 60_000, max: 60 };
const WRITE_LIMIT = { windowMs: 60_000, max: 40 };
const CLAIM_LIMIT = { windowMs: 60_000, max: 10 };
const ADMIN_LIMIT = { windowMs: 60_000, max: 10 };

const idInput = z.number().int().positive();
const keyInput = z.string().max(48).regex(DECISION_KEY_RE);
/** A typed answer: words, a whole number, "none", or a list of choices. Checked per decision on the server. */
const valueInput = z.union([z.string().max(8000), z.number().int(), z.array(z.string().max(40)).max(40)]);

export const PROFILE_COPY = {
  notYours: "Only this project's stewards can open its Village profile.",
  notFound: "That project has no Village profile. Season 2 projects that have applied have one.",
} as const;

async function database(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db;
}

async function assertSteward(user: TrpcContext["user"], applicationId: number) {
  if (!(await canStewardApplication(user, applicationId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: PROFILE_COPY.notYours });
  }
}

export const villageProfileRouter = router({
  /** Signed in: the Season 2 projects this person stewards, each with a Village profile. */
  mine: protectedProcedure.use(rateLimited(READ_LIMIT)).query(async ({ ctx }) => {
    const db = await database();
    const claims = await db
      .select({ orgId: orgClaims.orgId })
      .from(orgClaims)
      .where(and(eq(orgClaims.userId, ctx.user.id), eq(orgClaims.orgType, "land_project"), eq(orgClaims.status, "approved")));
    const claimed = claims.map((c) => Number(c.orgId)).filter((n) => Number.isInteger(n) && n > 0);
    const owns = or(eq(applications.userId, ctx.user.id), eq(applications.stewardUserId, ctx.user.id));
    const rows = await db
      .select({ id: applications.id, projectName: applications.projectName, status: applications.status })
      .from(applications)
      .where(and(
        eq(applications.season, PROFILE_APPLICATION_SEASON),
        inArray(applications.status, [...PROFILE_STATUSES]),
        claimed.length ? or(owns, inArray(applications.id, claimed)) : owns,
      ))
      .orderBy(desc(applications.id));
    return { projects: rows.map((r) => ({ applicationId: r.id, projectName: r.projectName, status: r.status })) };
  }),

  /** A project's stewards and admins: its whole profile, its 1.0 file, and the earlier cards it can claim. */
  get: protectedProcedure
    .use(rateLimited(READ_LIMIT))
    .input(z.object({ applicationId: idInput }))
    .query(async ({ ctx, input }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await database();
      const read = await readVillageProfile(db, { season: SESSION_BOARD_SEASON, applicationId: input.applicationId });
      if (!read) throw new TRPCError({ code: "NOT_FOUND", message: PROFILE_COPY.notFound });
      return { ...read, file: toVillageFile(read.profile) };
    }),

  /** Stewards: give the project's own answer to a decision. */
  answer: protectedProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(z.object({ applicationId: idInput, key: keyInput, value: valueInput }))
    .mutation(async ({ ctx, input }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await database();
      await answerDecision(db, { applicationId: input.applicationId, key: input.key, value: input.value, userId: ctx.user.id });
      return { ok: true as const };
    }),

  /** Stewards: keep what the pages and boards suggest, exactly as the page showed it (`seen` is its stamp). */
  confirm: protectedProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(z.object({ applicationId: idInput, key: keyInput, seen: z.string().max(40) }))
    .mutation(async ({ ctx, input }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await database();
      await confirmDecision(db, { season: SESSION_BOARD_SEASON, applicationId: input.applicationId, key: input.key, seen: input.seen, userId: ctx.user.id });
      return { ok: true as const };
    }),

  /** Stewards: take the project's answer back. */
  clear: protectedProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(z.object({ applicationId: idInput, key: keyInput }))
    .mutation(async ({ ctx, input }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await database();
      await clearDecision(db, { applicationId: input.applicationId, key: input.key });
      return { ok: true as const };
    }),

  /** Stewards: tie an earlier week's card, with no application, to this project. */
  claimCard: protectedProcedure
    .use(rateLimited(CLAIM_LIMIT))
    .input(z.object({ applicationId: idInput, cardId: idInput }))
    .mutation(async ({ ctx, input }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await database();
      const r = await claimCard(db, { season: SESSION_BOARD_SEASON, applicationId: input.applicationId, cardId: input.cardId, userId: ctx.user.id });
      return { ok: true as const, week: r.week };
    }),

  /** Stewards: give back a card this project claimed from its profile. */
  unclaimCard: protectedProcedure
    .use(rateLimited(CLAIM_LIMIT))
    .input(z.object({ applicationId: idInput, cardId: idInput }))
    .mutation(async ({ ctx, input }) => {
      await assertSteward(ctx.user, input.applicationId);
      const db = await database();
      await unclaimCard(db, { applicationId: input.applicationId, cardId: input.cardId });
      return { ok: true as const };
    }),

  /** Admin: every Season 2 project's profile at a glance. */
  adminList: adminProcedure.use(rateLimited(ADMIN_LIMIT)).query(async () => {
    const db = await database();
    return { profiles: await listVillageProfiles(db, SESSION_BOARD_SEASON) };
  }),
});
