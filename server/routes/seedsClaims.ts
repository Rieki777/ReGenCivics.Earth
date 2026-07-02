// server/routes/seedsClaims.ts
import { publicProcedure, adminProcedure, rateLimited, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, and, like, or, desc, sql, count } from "drizzle-orm";
import { seedsClaims, seedsContributions } from "../../drizzle/schema";

import { getGameVariable } from "../game";
import { SEEDS_REGEN_PER_USD as SEEDS_REGEN_PER_USD_FALLBACK } from "@shared/gameMechanics";

// $ReGen credited per $1 USD of SEEDS contribution. Read from the
// `seeds.regen_per_usd` game variable (tunable in the admin UI) so the claim
// page and the credit path share one source of truth. The claim amount is
// ALWAYS derived server-side as authoritative USD * this rate; it is never
// taken from client input (that was the unauthenticated minting hole).
async function getSeedsRegenPerUsd(): Promise<number> {
  try {
    return await getGameVariable("seeds.regen_per_usd");
  } catch {
    return SEEDS_REGEN_PER_USD_FALLBACK;
  }
}

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
   * PUBLIC: Submit or update a SEEDS claim.
   *
   * Security model: guests may RECORD a claim (stored for the post-window
   * batch mint Rye runs after on-chain verification), but the private-ledger
   * auto-credit only fires for an AUTHENTICATED user and credits that user,
   * never an email lookup. Every monetary figure is recomputed server-side
   * from the authoritative `seeds_contributions` table; client-supplied USD
   * and $ReGen amounts are treated as untrusted and ignored. The claim is
   * bound to the first authenticated submitter (`userId`) so it cannot be
   * resubmitted by another account and credited twice.
   */
  submit: publicProcedure
    .use(rateLimited({ windowMs: 60 * 1000, max: 5 }))
    .input(
      z.object({
        seedsAccount: seedsAccountSchema,
        email: emailSchema,
        // The USD/regen numbers below are advisory only. The server derives
        // the real values from seeds_contributions and ignores these for any
        // money movement; spentUsdAmount is the one genuine user input.
        originalUsdTotal: z.number().positive("Original USD must be positive"),
        spentUsdAmount: z.number().min(0, "Spent amount cannot be negative"),
        claimedUsdAmount: z.number().positive("Claimed USD must be positive"),
        regenAmount: z.number().positive("Regen amount must be positive"),
        baseWalletAddress: ethereumAddressSchema,
        isDispute: z.boolean().default(false),
        disputeReason: z.string().max(5000).optional(),
        evidenceUrls: z.string().max(5000).optional(), // JSON array string
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

      // AUTHORITATIVE USD: recompute from our contribution records. Never
      // trust the client's originalUsdTotal. An account with no recorded
      // contributions cannot claim anything.
      const contributions = await db
        .select()
        .from(seedsContributions)
        .where(eq(seedsContributions.recipientAccount, input.seedsAccount));
      if (contributions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No SEEDS contributions are on record for that account.",
        });
      }
      const serverTotalUsd = contributions.reduce((sum, c) => sum + c.usdValue, 0);

      // spentUsdAmount is the one honest user input (what they sold/spent).
      // Clamp it into [0, serverTotalUsd]; claimed is derived, not trusted.
      const spentUsdAmount = Math.min(Math.max(input.spentUsdAmount, 0), serverTotalUsd);
      const maxClaimable = serverTotalUsd - spentUsdAmount;
      // Claimed amount is clamped to what they're actually entitled to.
      const claimedUsdAmount = Math.min(Math.max(input.claimedUsdAmount, 0), maxClaimable);
      // $ReGen is DERIVED from the live rate, never taken from input.
      const regenPerUsd = await getSeedsRegenPerUsd();
      const regenAmount = claimedUsdAmount * regenPerUsd;

      const currentUserId: number | null = ctx.user?.id ?? null;

      // Check for existing claim
      const existing = await db
        .select()
        .from(seedsClaims)
        .where(eq(seedsClaims.seedsAccount, input.seedsAccount))
        .limit(1);

      const now = new Date();

      // Auto-approve only when: the user accepts the full entitled amount,
      // isn't disputing, there's something to claim, AND they're signed in
      // (so we know who to credit). Guests get a stored pending claim.
      const acceptsShownAmount =
        !input.isDispute && claimedUsdAmount === maxClaimable && maxClaimable > 0;
      const canAutoCredit = acceptsShownAmount && currentUserId != null;
      const autoStatus: "approved" | "pending" = canAutoCredit ? "approved" : "pending";

      let claimId: number;
      let wasUpdate = false;

      if (existing.length > 0) {
        // UPDATE existing claim
        await db
          .update(seedsClaims)
          .set({
            email: input.email,
            originalUsdTotal: serverTotalUsd,
            spentUsdAmount,
            claimedUsdAmount,
            regenAmount,
            baseWalletAddress: input.baseWalletAddress,
            isDispute: input.isDispute,
            disputeReason: input.disputeReason || null,
            evidenceUrls: input.evidenceUrls || null,
            updatedAt: now,
            status: autoStatus,
            reviewedAt: canAutoCredit ? now : null,
          })
          .where(eq(seedsClaims.seedsAccount, input.seedsAccount));

        claimId = existing[0].id;
        wasUpdate = true;
      } else {
        // INSERT new claim
        const result = await db.insert(seedsClaims).values({
          seedsAccount: input.seedsAccount,
          email: input.email,
          originalUsdTotal: serverTotalUsd,
          spentUsdAmount,
          claimedUsdAmount,
          regenAmount,
          baseWalletAddress: input.baseWalletAddress,
          isDispute: input.isDispute,
          disputeReason: input.disputeReason || null,
          evidenceUrls: input.evidenceUrls || null,
          status: autoStatus,
          reviewedAt: canAutoCredit ? now : null,
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

      // Auto-credit the AUTHENTICATED user's private $ReGen ledger.
      let autoCredited = false;
      let privateBalanceAfter: number | null = null;
      if (canAutoCredit && currentUserId != null) {
        try {
          const { creditPrivateTokens, getUserTokenLedger } = await import("../db");
          const { getDb: getRawDb } = await import("../db");

          // Ownership check WITHOUT a schema column: has this claim already
          // been credited to a DIFFERENT user? If so, refuse. This blocks
          // account-B from resubmitting account-A's SEEDS claim and being
          // credited a second time for the same claim.
          const rawDb = await getRawDb();
          const priorCredits = rawDb
            ? await rawDb.execute(sql`
                SELECT DISTINCT userId FROM user_token_ledger
                WHERE source = 'seeds_claim' AND sourceId = ${claimId}
              `).then((r: any) => (r?.[0] ?? []) as Array<{ userId: number }>)
            : [];
          const creditedToOther = priorCredits.some((row) => row.userId !== currentUserId);
          if (creditedToOther) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "This SEEDS claim has already been credited to another member. Contact support if this is an error.",
            });
          }

          // How much we already credited to THIS user for this exact claim,
          // so a resubmit only tops up the delta (no double-dip).
          const existingEntries = await getUserTokenLedger(currentUserId, 200);
          const alreadyCredited = existingEntries
            .filter((e: any) => e.source === "seeds_claim" && e.sourceId === claimId)
            .reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
          const wantedCredit = Math.round(regenAmount);
          const delta = wantedCredit - alreadyCredited;
          if (delta !== 0) {
            privateBalanceAfter = await creditPrivateTokens({
              userId: currentUserId,
              tokenType: "regen",
              amount: delta,
              source: "seeds_claim",
              sourceId: claimId,
              description: `SEEDS claim auto-approved (${input.seedsAccount})`,
            });
            autoCredited = true;
          }
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.error("[seedsClaims.submit] auto-credit failed for user", currentUserId, err);
          // Don't fail the whole submit if the credit failed; admin can
          // retry. The claim row is still written.
        }
      }

      return {
        claimId,
        regenAmount,
        isUpdate: wasUpdate,
        autoApproved: canAutoCredit,
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
