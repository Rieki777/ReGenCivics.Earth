// server/routes/seedsClaims.ts
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, and, like, or, desc, sql, count } from "drizzle-orm";
import { seedsClaims, seedsContributions } from "../../drizzle/schema";

// Validation schemas
const seedsAccountSchema = z
  .string()
  .min(1, "SEEDS account required")
  .max(12, "SEEDS account must be 12 chars or less")
  .regex(/^[a-z0-9.]*$/, "SEEDS account must be lowercase alphanumeric and dots only");

const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format");

const emailSchema = z.string().email("Invalid email format");

export const seedsClaimsRouter = router({
  /**
   * PUBLIC: Look up SEEDS account and check for existing claim
   */
  lookup: publicProcedure
    .input(
      z.object({
        seedsAccount: seedsAccountSchema,
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      // Find all contributions for this account
      const contributions = await db
        .select()
        .from(seedsContributions)
        .where(eq(seedsContributions.recipientAccount, input.seedsAccount));

      const found = contributions.length > 0;
      const totalUsd = contributions.reduce((sum, c) => sum + c.usdValue, 0);

      const transactions = contributions.map((c) => ({
        transactionId: c.transactionId,
        date: c.date,
        usdValue: c.usdValue,
      }));

      // Check for existing claim
      const existingClaim = await db
        .select()
        .from(seedsClaims)
        .where(eq(seedsClaims.seedsAccount, input.seedsAccount))
        .limit(1);

      return {
        found,
        totalUsd,
        transactions,
        existingClaim: existingClaim.length > 0 ? existingClaim[0] : undefined,
      };
    }),

  /**
   * PUBLIC: Submit or update a SEEDS claim
   */
  submit: publicProcedure
    .input(
      z.object({
        seedsAccount: seedsAccountSchema,
        email: emailSchema,
        originalUsdTotal: z.number().positive("Original USD must be positive"),
        spentUsdAmount: z.number().min(0, "Spent amount cannot be negative"),
        claimedUsdAmount: z.number().positive("Claimed USD must be positive"),
        regenAmount: z.number().positive("Regen amount must be positive"),
        baseWalletAddress: ethereumAddressSchema,
        isDispute: z.boolean().default(false),
        disputeReason: z.string().optional(),
        evidenceUrls: z.string().optional(), // JSON array string
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      // Validate: spentUsdAmount cannot exceed originalUsdTotal
      if (input.spentUsdAmount > input.originalUsdTotal) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Spent amount cannot exceed original USD total",
        });
      }

      // Validate: claimedUsdAmount must be reasonable (original - spent, or custom)
      const maxClaimable = input.originalUsdTotal - input.spentUsdAmount;
      if (input.claimedUsdAmount > input.originalUsdTotal) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Claimed amount cannot exceed original total",
        });
      }

      // Check for existing claim
      const existing = await db
        .select()
        .from(seedsClaims)
        .where(eq(seedsClaims.seedsAccount, input.seedsAccount))
        .limit(1);

      const now = new Date();

      // Auto-approve: when the user accepts the shown amount (claim
      // equals original minus what they've already spent) AND isn't
      // disputing, the claim is auto-approved and the matching $ReGen
      // lands on their private ledger immediately. Disputed or partial
      // claims stay pending for admin review.
      const maxClaimable = input.originalUsdTotal - input.spentUsdAmount;
      const acceptsShownAmount = !input.isDispute && input.claimedUsdAmount === maxClaimable;
      const autoStatus: "approved" | "pending" = acceptsShownAmount ? "approved" : "pending";

      let claimId: number;
      let wasUpdate = false;

      if (existing.length > 0) {
        // UPDATE existing claim
        await db
          .update(seedsClaims)
          .set({
            email: input.email,
            originalUsdTotal: input.originalUsdTotal,
            spentUsdAmount: input.spentUsdAmount,
            claimedUsdAmount: input.claimedUsdAmount,
            regenAmount: input.regenAmount,
            baseWalletAddress: input.baseWalletAddress,
            isDispute: input.isDispute,
            disputeReason: input.disputeReason || null,
            evidenceUrls: input.evidenceUrls || null,
            updatedAt: now,
            status: autoStatus,
            reviewedAt: acceptsShownAmount ? now : null,
            reviewedBy: acceptsShownAmount ? null : null, // auto, not a reviewer
          })
          .where(eq(seedsClaims.seedsAccount, input.seedsAccount));

        claimId = existing[0].id;
        wasUpdate = true;
      } else {
        // INSERT new claim
        const result = await db.insert(seedsClaims).values({
          seedsAccount: input.seedsAccount,
          email: input.email,
          originalUsdTotal: input.originalUsdTotal,
          spentUsdAmount: input.spentUsdAmount,
          claimedUsdAmount: input.claimedUsdAmount,
          regenAmount: input.regenAmount,
          baseWalletAddress: input.baseWalletAddress,
          isDispute: input.isDispute,
          disputeReason: input.disputeReason || null,
          evidenceUrls: input.evidenceUrls || null,
          status: autoStatus,
          reviewedAt: acceptsShownAmount ? now : null,
          createdAt: now,
          updatedAt: now,
        });

        const insertId = (result[0] as any)?.insertId;
        if (!insertId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create claim",
          });
        }
        claimId = insertId;
      }

      // If auto-approved and the email maps to a known user, credit
      // their private $ReGen ledger with the claim amount. On a resubmit
      // we only credit the *delta* versus what's already been credited
      // for this claim, so users can't double-dip by resubmitting.
      let autoCredited = false;
      let privateBalanceAfter: number | null = null;
      if (acceptsShownAmount) {
        try {
          const { creditPrivateTokens } = await import("../db");
          const { getUserByEmail, getUserTokenLedger } = await import("../db");
          const user = await getUserByEmail(input.email.toLowerCase().trim());
          if (user?.id) {
            // How much we already credited for this exact claim (sums to a
            // non-negative integer). regenAmount in schema is a float of
            // ReGen tokens; the private ledger stores integer tokens so we
            // round to nearest int.
            const existingEntries = await getUserTokenLedger(user.id, 200);
            const alreadyCredited = existingEntries
              .filter((e: any) => e.source === "seeds_claim" && e.sourceId === claimId)
              .reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
            const wantedCredit = Math.round(input.regenAmount);
            const delta = wantedCredit - alreadyCredited;
            if (delta !== 0) {
              privateBalanceAfter = await creditPrivateTokens({
                userId: user.id,
                tokenType: "regen",
                amount: delta,
                source: "seeds_claim",
                sourceId: claimId,
                description: `SEEDS claim auto-approved (${input.seedsAccount})`,
              });
              autoCredited = true;
            }
          }
        } catch (err) {
          console.error("[seedsClaims.submit] auto-credit failed for", input.email, err);
          // Don't fail the whole submit if the credit failed; admin can
          // retry. The claim row is still written.
        }
      }

      return {
        claimId,
        regenAmount: input.regenAmount,
        isUpdate: wasUpdate,
        autoApproved: acceptsShownAmount,
        autoCredited,
        privateBalanceAfter,
      };
    }),

  /**
   * ADMIN: List all claims with pagination and filtering
   */
  adminList: adminProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "approved", "denied", "flagged"])
          .optional(),
        isDispute: z.boolean().optional(),
        search: z.string().optional(), // Search by seedsAccount or email
        page: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      // Build WHERE conditions
      const conditions = [];

      if (input.status) {
        conditions.push(eq(seedsClaims.status, input.status));
      }

      if (input.isDispute !== undefined) {
        conditions.push(eq(seedsClaims.isDispute, input.isDispute));
      }

      if (input.search) {
        conditions.push(
          or(
            like(seedsClaims.seedsAccount, `%${input.search}%`),
            like(seedsClaims.email, `%${input.search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(seedsClaims)
        .where(where);
      const total = countResult[0]?.count || 0;

      // Get paginated results
      const offset = input.page * input.limit;
      const claims = await db
        .select()
        .from(seedsClaims)
        .where(where)
        .orderBy(desc(seedsClaims.createdAt))
        .limit(input.limit)
        .offset(offset);

      return {
        claims,
        total,
        page: input.page,
        limit: input.limit,
        pages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * ADMIN: Review and update a claim status
   */
  adminReview: adminProcedure
    .input(
      z.object({
        claimId: z.number().int(),
        status: z.enum(["approved", "denied", "flagged"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      // Verify claim exists
      const existing = await db
        .select()
        .from(seedsClaims)
        .where(eq(seedsClaims.id, input.claimId))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Claim not found",
        });
      }

      const now = new Date();
      await db
        .update(seedsClaims)
        .set({
          status: input.status,
          adminNotes: input.adminNotes || null,
          reviewedAt: now,
          reviewedBy: ctx.user.id,
          updatedAt: now,
        })
        .where(eq(seedsClaims.id, input.claimId));

      return { ok: true };
    }),

  /**
   * ADMIN: Get aggregated statistics
   */
  adminStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const all = await db.select().from(seedsClaims);

    const stats = {
      totalClaims: all.length,
      pendingCount: all.filter((c) => c.status === "pending").length,
      approvedCount: all.filter((c) => c.status === "approved").length,
      deniedCount: all.filter((c) => c.status === "denied").length,
      flaggedCount: all.filter((c) => c.status === "flagged").length,
      disputeCount: all.filter((c) => c.isDispute).length,
      totalRegenCommitted: all.reduce((sum, c) => sum + c.regenAmount, 0),
      totalUsdClaimed: all.reduce((sum, c) => sum + c.claimedUsdAmount, 0),
    };

    return stats;
  }),

  /**
   * ADMIN: Export all approved claims for CSV
   */
  adminExport: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const approvedClaims = await db
      .select()
      .from(seedsClaims)
      .where(eq(seedsClaims.status, "approved"));

    return approvedClaims;
  }),
});
