/**
 * Historical Contribution Claims tRPC router.
 * Sprint 7: the 14-screen claim flow, admin review, contributors page, tools library, proposal parties.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import {
  historicalClaims,
  toolsLibraryEntries,
  proposalParties,
  forumCategories,
  users,
} from "../../drizzle/schema";
import { sanitizeInput } from "../_core/security";

const claimTypeEnum = z.enum(["individual", "organization"]);
const durationEnum = z.enum(["under_1_year", "1_3_years", "3_5_years", "5_10_years", "10_plus_years"]);
const overrideEnum = z.enum(["accept", "higher", "lower"]);

const capitalFormSchema = z.object({
  form: z.string(),
  example: z.string().optional().default(""),
});

const tangibleOutputSchema = z.object({
  type: z.string(),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

/** Partial step data, anything from the 14 screens. All optional because we save progressively. */
const stepDataSchema = z.object({
  claimType: claimTypeEnum.optional(),
  displayName: z.string().max(255).optional(),
  orgDescription: z.string().max(5000).optional(),
  formsOfCapital: z.array(capitalFormSchema).optional(),
  duration: durationEnum.optional(),
  reach: z.string().max(50).optional(),
  tangibleOutputs: z.array(tangibleOutputSchema).optional(),
  description: z.string().max(10000).optional(),
  evidenceLinks: z.array(z.string().max(1000)).optional(),
  whatsAlive: z.string().max(2000).optional(),
  suggestedTier: z.string().max(50).optional(),
  suggestedTierUsd: z.number().int().optional(),
  suggestedTierTokens: z.number().int().optional(),
  contributorOverride: overrideEnum.optional(),
  overrideReason: z.string().max(2000).optional(),
  routeToToolsLibrary: z.boolean().optional(),
  routeToLocalScale: z.boolean().optional(),
  routeToGovernance: z.boolean().optional(),
  routeToMentoring: z.boolean().optional(),
  routeToFundPathway: z.boolean().optional(),
  improvementSuggestion: z.string().max(5000).optional(),
});

function boolToTiny(v: boolean | undefined): number | undefined {
  if (v === undefined) return undefined;
  return v ? 1 : 0;
}

function tinyToBool(v: number | null | undefined): boolean {
  return v === 1;
}

function serializeClaim(row: any) {
  if (!row) return null;
  return {
    ...row,
    routeToToolsLibrary: tinyToBool(row.routeToToolsLibrary),
    routeToLocalScale: tinyToBool(row.routeToLocalScale),
    routeToGovernance: tinyToBool(row.routeToGovernance),
    routeToMentoring: tinyToBool(row.routeToMentoring),
    routeToFundPathway: tinyToBool(row.routeToFundPathway),
    improvementPostedToForum: tinyToBool(row.improvementPostedToForum),
  };
}

export const claimsRouter = router({
  /** Load the current user's draft claim (or most recent non-published claim). */
  getClaimDraft: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await getDb();
    if (!drizzle) return null;
    const rows = await drizzle
      .select()
      .from(historicalClaims)
      .where(and(eq(historicalClaims.userId, ctx.user.id), eq(historicalClaims.status, "draft")))
      .orderBy(desc(historicalClaims.updatedAt))
      .limit(1);
    return serializeClaim(rows[0] ?? null);
  }),

  /** Save one screen's worth of answers. Upserts the draft. */
  saveClaimStep: protectedProcedure
    .input(z.object({ step: z.number().int().min(1).max(14), data: stepDataSchema }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await drizzle
        .select()
        .from(historicalClaims)
        .where(and(eq(historicalClaims.userId, ctx.user.id), eq(historicalClaims.status, "draft")))
        .orderBy(desc(historicalClaims.updatedAt))
        .limit(1);

      const d = input.data;
      const patch: Record<string, any> = {
        currentStep: input.step,
      };
      if (d.claimType !== undefined) patch.claimType = d.claimType;
      if (d.displayName !== undefined) patch.displayName = sanitizeInput(d.displayName);
      if (d.orgDescription !== undefined) patch.orgDescription = sanitizeInput(d.orgDescription);
      if (d.formsOfCapital !== undefined) patch.formsOfCapital = d.formsOfCapital;
      if (d.duration !== undefined) patch.duration = d.duration;
      if (d.reach !== undefined) patch.reach = d.reach;
      if (d.tangibleOutputs !== undefined) patch.tangibleOutputs = d.tangibleOutputs;
      if (d.description !== undefined) patch.description = sanitizeInput(d.description);
      if (d.evidenceLinks !== undefined) patch.evidenceLinks = d.evidenceLinks;
      if (d.whatsAlive !== undefined) patch.whatsAlive = sanitizeInput(d.whatsAlive);
      if (d.suggestedTier !== undefined) patch.suggestedTier = d.suggestedTier;
      if (d.suggestedTierUsd !== undefined) patch.suggestedTierUsd = d.suggestedTierUsd;
      if (d.suggestedTierTokens !== undefined) patch.suggestedTierTokens = d.suggestedTierTokens;
      if (d.contributorOverride !== undefined) patch.contributorOverride = d.contributorOverride;
      if (d.overrideReason !== undefined) patch.overrideReason = sanitizeInput(d.overrideReason);
      if (d.routeToToolsLibrary !== undefined) patch.routeToToolsLibrary = boolToTiny(d.routeToToolsLibrary);
      if (d.routeToLocalScale !== undefined) patch.routeToLocalScale = boolToTiny(d.routeToLocalScale);
      if (d.routeToGovernance !== undefined) patch.routeToGovernance = boolToTiny(d.routeToGovernance);
      if (d.routeToMentoring !== undefined) patch.routeToMentoring = boolToTiny(d.routeToMentoring);
      if (d.routeToFundPathway !== undefined) patch.routeToFundPathway = boolToTiny(d.routeToFundPathway);
      if (d.improvementSuggestion !== undefined) patch.improvementSuggestion = sanitizeInput(d.improvementSuggestion);

      if (existing.length > 0) {
        await drizzle.update(historicalClaims).set(patch).where(eq(historicalClaims.id, existing[0].id));
        return { id: existing[0].id };
      }

      const insertValues: any = {
        userId: ctx.user.id,
        claimType: patch.claimType ?? "individual",
        displayName: patch.displayName ?? "",
        formsOfCapital: patch.formsOfCapital ?? [],
        tangibleOutputs: patch.tangibleOutputs ?? [],
        evidenceLinks: patch.evidenceLinks ?? [],
        currentStep: input.step,
        status: "draft",
        ...patch,
      };
      const result = await drizzle.insert(historicalClaims).values(insertValues);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId };
    }),

  /** Mark the claim as submitted. Validates required fields, creates tool library entries, optionally posts improvement to forum. */
  submitClaim: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await drizzle.select().from(historicalClaims).where(eq(historicalClaims.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const claim = rows[0];
      if (claim.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (claim.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Claim already submitted" });

      if (!claim.displayName || !claim.claimType || !claim.duration || !claim.reach || !claim.suggestedTier) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Claim is missing required fields" });
      }

      await drizzle
        .update(historicalClaims)
        .set({ status: "submitted", submittedAt: new Date() } as any)
        .where(eq(historicalClaims.id, input.id));

      // Create tools library entries for each tangible output that has a name
      const outputs = (claim.tangibleOutputs as any[]) || [];
      for (const out of outputs) {
        if (out && out.name && out.description) {
          const toolType = out.type ?? "other";
          try {
            await drizzle.insert(toolsLibraryEntries).values({
              claimId: claim.id,
              contributorUserId: ctx.user.id,
              toolName: String(out.name).slice(0, 255),
              toolDescription: String(out.description),
              toolType: toolType as any,
              capitalForm: out.capitalForm ?? null,
              status: "pending",
            } as any);
          } catch (err) {
            console.error("Failed to create tools library entry:", err);
          }
        }
      }

      // Optionally post improvement suggestion to forum
      if (claim.improvementSuggestion && claim.improvementSuggestion.trim().length > 10) {
        try {
          const [cat] = await drizzle
            .select({ id: forumCategories.id })
            .from(forumCategories)
            .where(eq(forumCategories.slug, "historical-contribution-accounting"))
            .limit(1);
          if (cat) {
            const summary = claim.improvementSuggestion.slice(0, 60).replace(/\n/g, " ");
            const tierLabel = claim.suggestedTier ?? "contributor";
            const body = `Submitted by ${claim.displayName} (${tierLabel} tier) during their contribution claim.\n\n${claim.improvementSuggestion}\n\n---\nThis idea was submitted through the Historical Contribution Claim Flow. If you think this would make the process better, build on it here. The best ideas become governance proposals.\n\nTag: Process Improvement`;
            const postId = await db.createForumPost({
              categoryId: cat.id,
              authorId: ctx.user.id,
              title: `[Improvement Idea] ${summary}`,
              content: sanitizeInput(body),
            });
            await drizzle
              .update(historicalClaims)
              .set({ improvementPostedToForum: 1, improvementForumPostId: postId } as any)
              .where(eq(historicalClaims.id, claim.id));
          }
        } catch (err) {
          console.error("Failed to post improvement suggestion to forum:", err);
        }
      }

      return { ok: true };
    }),

  /** Get the current user's claim status and review feedback. */
  getMyClaimStatus: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await getDb();
    if (!drizzle) return null;
    const rows = await drizzle
      .select()
      .from(historicalClaims)
      .where(eq(historicalClaims.userId, ctx.user.id))
      .orderBy(desc(historicalClaims.createdAt))
      .limit(1);
    return serializeClaim(rows[0] ?? null);
  }),

  /** Admin: list claims by status. */
  listClaims: adminProcedure
    .input(z.object({
      status: z.enum(["draft", "submitted", "under_review", "approved", "adjusted", "flagged", "ratified", "published"]).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return [];
      const conditions = [];
      if (input.status) conditions.push(eq(historicalClaims.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await drizzle
        .select()
        .from(historicalClaims)
        .where(where)
        .orderBy(desc(historicalClaims.submittedAt))
        .limit(input.limit);
      return rows.map(serializeClaim);
    }),

  /** Admin: get a single claim with full details. */
  getClaim: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return null;
      const rows = await drizzle.select().from(historicalClaims).where(eq(historicalClaims.id, input.id)).limit(1);
      if (rows.length === 0) return null;
      const claim = rows[0];
      const authorRows = await drizzle
        .select({ name: users.name, handle: users.handle, email: users.email })
        .from(users)
        .where(eq(users.id, claim.userId))
        .limit(1);
      return { ...serializeClaim(claim), author: authorRows[0] ?? null };
    }),

  /** Admin: review decision. */
  reviewClaim: adminProcedure
    .input(z.object({
      claimId: z.number().int().positive(),
      decision: z.enum(["confirmed", "adjusted", "flagged"]),
      note: z.string().max(5000).optional(),
      adjustedTier: z.string().max(50).optional(),
      adjustedTierUsd: z.number().int().optional(),
      adjustedTierTokens: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const statusMap: Record<string, "approved" | "adjusted" | "flagged"> = {
        confirmed: "approved",
        adjusted: "adjusted",
        flagged: "flagged",
      };
      await drizzle
        .update(historicalClaims)
        .set({
          status: statusMap[input.decision],
          reviewerId: ctx.user.id,
          reviewedAt: new Date(),
          reviewDecision: input.decision,
          reviewNote: input.note ?? null,
          adjustedTier: input.adjustedTier ?? null,
          adjustedTierUsd: input.adjustedTierUsd ?? null,
          adjustedTierTokens: input.adjustedTierTokens ?? null,
        } as any)
        .where(eq(historicalClaims.id, input.claimId));
      return { ok: true };
    }),

  /** Admin: ratify a claim after a proposal party. */
  ratifyClaim: adminProcedure
    .input(z.object({
      claimId: z.number().int().positive(),
      proposalPartyId: z.number().int().positive(),
      finalTier: z.string().max(50),
      finalTierUsd: z.number().int(),
      finalTierTokens: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await drizzle
        .update(historicalClaims)
        .set({
          status: "ratified",
          ratifiedAt: new Date(),
          proposalPartyId: input.proposalPartyId,
          finalTier: input.finalTier,
          finalTierUsd: input.finalTierUsd,
          finalTierTokens: input.finalTierTokens,
        } as any)
        .where(eq(historicalClaims.id, input.claimId));
      return { ok: true };
    }),

  /** Admin: publish a ratified claim. Also publishes its pending tools library entries. */
  publishClaim: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await drizzle
        .update(historicalClaims)
        .set({ status: "published", publishedAt: new Date() } as any)
        .where(eq(historicalClaims.id, input.id));
      await drizzle
        .update(toolsLibraryEntries)
        .set({ status: "published" } as any)
        .where(eq(toolsLibraryEntries.claimId, input.id));
      return { ok: true };
    }),

  /** Public: list published contributors. */
  listContributors: publicProcedure
    .input(z.object({
      tier: z.string().optional(),
      claimType: claimTypeEnum.optional(),
      limit: z.number().int().min(1).max(200).default(60),
    }).optional())
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return [];
      const conditions = [eq(historicalClaims.status, "published")];
      if (input?.tier) conditions.push(eq(historicalClaims.finalTier, input.tier));
      if (input?.claimType) conditions.push(eq(historicalClaims.claimType, input.claimType));
      const rows = await drizzle
        .select()
        .from(historicalClaims)
        .where(and(...conditions))
        .orderBy(desc(historicalClaims.publishedAt))
        .limit(input?.limit ?? 60);
      return rows.map(serializeClaim);
    }),

  /** Public: single contributor profile. */
  getContributor: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return null;
      const rows = await drizzle
        .select()
        .from(historicalClaims)
        .where(and(eq(historicalClaims.id, input.id), eq(historicalClaims.status, "published")))
        .limit(1);
      if (rows.length === 0) return null;
      const tools = await drizzle
        .select()
        .from(toolsLibraryEntries)
        .where(and(eq(toolsLibraryEntries.claimId, input.id), eq(toolsLibraryEntries.status, "published")));
      return { ...serializeClaim(rows[0]), tools };
    }),

  /** Public: list published tools library entries. */
  listToolsLibraryEntries: publicProcedure
    .input(z.object({
      toolType: z.string().optional(),
      capitalForm: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(60),
    }).optional())
    .query(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) return [];
      const conditions = [eq(toolsLibraryEntries.status, "published")];
      if (input?.toolType) conditions.push(eq(toolsLibraryEntries.toolType, input.toolType as any));
      if (input?.capitalForm) conditions.push(eq(toolsLibraryEntries.capitalForm, input.capitalForm));
      return drizzle
        .select()
        .from(toolsLibraryEntries)
        .where(and(...conditions))
        .orderBy(desc(toolsLibraryEntries.createdAt))
        .limit(input?.limit ?? 60);
    }),

  /** Public: list upcoming and past proposal parties. */
  listProposalParties: publicProcedure.query(async () => {
    const drizzle = await getDb();
    if (!drizzle) return [];
    return drizzle.select().from(proposalParties).orderBy(desc(proposalParties.scheduledAt));
  }),

  /** Admin: create a proposal party. */
  createProposalParty: adminProcedure
    .input(z.object({
      title: z.string().min(3).max(255),
      scheduledAt: z.string(),
      season: z.number().int().default(1),
      videoLink: z.string().max(1000).optional(),
      notes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input }) => {
      const drizzle = await getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await drizzle.insert(proposalParties).values({
        title: input.title,
        scheduledAt: new Date(input.scheduledAt),
        season: input.season,
        videoLink: input.videoLink ?? null,
        notes: input.notes ?? null,
        status: "scheduled",
      } as any);
      return { id: (result as any)[0]?.insertId ?? (result as any).insertId };
    }),
});
