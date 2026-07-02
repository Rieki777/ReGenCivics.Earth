/**
 * churchDonations router - Church of the Regenerative Earth (CORE).
 *
 * Donations and tithes through hosted Stripe Checkout, plus the church-side
 * payout ledger and a Stewards reconciliation view.
 *
 * Security posture (see .ai/docs/security/BUILD-PLAYBOOK.md and
 * AI-AUTOMATION-RISKS.md):
 *  - Giving can be anonymous, so createCheckoutSession is public but rate limited.
 *  - Card data never touches our servers (Stripe hosts Checkout).
 *  - Amounts are validated server-side; the webhook is the source of truth for
 *    `succeeded`. We never trust a client-reported payment as successful.
 *  - recordPayout is a LEDGER ENTRY ONLY. It records intent and reconciliation;
 *    it never initiates an external transfer. Actual money movement is a human
 *    action by a Steward through the church bank + Stripe balance.
 */
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { churchDonations, churchPayouts } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { isZeffyConfigured, getZeffyEmbedUrl } from "../lib/zeffy";
import { assertCanAcceptPayments, assertCanMakePayments } from "../lib/church-permissions";
import { checkRateLimit } from "../rate-limit";

const MIN_CENTS = 100; // $1.00
const MAX_CENTS = 500_000_00; // $500,000, a sane upper bound to reject fat-finger / abuse

function appendSessionParam(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}session_id={CHECKOUT_SESSION_ID}`;
}

export const churchDonationsRouter = router({
  // Whether the Stripe fallback form should render live or show coming-soon.
  donationsEnabled: publicProcedure.query(() => ({ enabled: isStripeConfigured() })),

  // Whether the preferred Zeffy embed should render, and its embed URL if so.
  // The URL is a dashboard-generated share link, not a secret, so it is safe
  // to send to the client (same class of value as any other <iframe src>).
  zeffyEnabled: publicProcedure.query(() => ({
    enabled: isZeffyConfigured(),
    embedUrl: isZeffyConfigured() ? getZeffyEmbedUrl() : null,
  })),

  // Create a hosted Stripe Checkout Session and a pending donation row.
  // Returns the Checkout URL for the client to redirect to.
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        amountCents: z.number().int().min(MIN_CENTS).max(MAX_CENTS),
        interval: z.enum(["one_time", "monthly"]),
        donorEmail: z.string().email().max(320).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "church_donation");

      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Giving is not live yet. Please try again soon.",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const stripe = getStripe();
      const isMonthly = input.interval === "monthly";
      const donorUserId = ctx.user?.id ?? null;
      const email = ctx.user?.email ?? input.donorEmail ?? undefined;
      const metadata = {
        source: "core_donation",
        giftInterval: input.interval,
        donorUserId: donorUserId ? String(donorUserId) : "",
      };

      const session = await stripe.checkout.sessions.create({
        mode: isMonthly ? "subscription" : "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: input.amountCents,
              product_data: {
                name: isMonthly
                  ? "Monthly gift to the Church of the Regenerative Earth"
                  : "Gift to the Church of the Regenerative Earth",
              },
              ...(isMonthly ? { recurring: { interval: "month" as const } } : {}),
            },
          },
        ],
        success_url: appendSessionParam(ENV.coreDonationSuccessUrl),
        cancel_url: ENV.coreDonationCancelUrl,
        metadata,
        ...(email ? { customer_email: email } : {}),
        ...(isMonthly ? { subscription_data: { metadata } } : {}),
      });

      await db.insert(churchDonations).values({
        stripeSessionId: session.id,
        donorUserId,
        donorEmail: email ?? null,
        amountCents: input.amountCents,
        currency: "usd",
        giftInterval: input.interval,
        status: "pending",
      });

      return { url: session.url };
    }),

  // Lightweight status lookup for the thank-you page (public: keyed by the
  // opaque Stripe session id the user was redirected back with).
  getDonationStatus: publicProcedure
    .input(z.object({ sessionId: z.string().min(1).max(255) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select({
          amountCents: churchDonations.amountCents,
          currency: churchDonations.currency,
          giftInterval: churchDonations.giftInterval,
          status: churchDonations.status,
        })
        .from(churchDonations)
        .where(eq(churchDonations.stripeSessionId, input.sessionId))
        .limit(1);
      return row ?? null;
    }),

  // Ledger entry for a payment MADE by the church. Guarded by the make-payments
  // right. This does NOT move money; it records intent and reconciliation only.
  recordPayout: protectedProcedure
    .input(
      z.object({
        amountCents: z.number().int().min(1).max(MAX_CENTS),
        purpose: z.string().min(1).max(500),
        destinationRef: z.string().max(500).optional(),
        currency: z.string().length(3).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanMakePayments(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const [res] = await db.insert(churchPayouts).values({
        initiatedByUserId: ctx.user.id,
        amountCents: input.amountCents,
        currency: (input.currency ?? "usd").toLowerCase(),
        purpose: input.purpose,
        destinationRef: input.destinationRef ?? null,
        status: "recorded",
      });
      return { id: (res as { insertId?: number }).insertId ?? null };
    }),

  // Stewards reconciliation view: recent donations + payouts + totals.
  // Guarded by the accept-payments right.
  getReconciliation: protectedProcedure.query(async ({ ctx }) => {
    await assertCanAcceptPayments(ctx.user.id);
    const db = await getDb();
    if (!db) return { donations: [], payouts: [], totals: { succeededCents: 0, pendingCount: 0, payoutCents: 0 } };

    const donations = await db
      .select()
      .from(churchDonations)
      .orderBy(desc(churchDonations.createdAt))
      .limit(200);
    const payouts = await db
      .select()
      .from(churchPayouts)
      .orderBy(desc(churchPayouts.createdAt))
      .limit(200);

    const succeededCents = donations
      .filter((d) => d.status === "succeeded")
      .reduce((sum, d) => sum + d.amountCents, 0);
    const pendingCount = donations.filter((d) => d.status === "pending").length;
    const payoutCents = payouts
      .filter((p) => p.status !== "void")
      .reduce((sum, p) => sum + p.amountCents, 0);

    return { donations, payouts, totals: { succeededCents, pendingCount, payoutCents } };
  }),
});
