// server/routes/offerStatus.ts
/**
 * The offer status link's three procedures (build spec 2026-09-27, section
 * 10.2), mounted as `offerStatus`. For someone who offered without an
 * account, holding the private link from their success screen or from an
 * accepted or declined email.
 *
 * All three are public MUTATIONS, so the token travels in a POST body and
 * never in a query string or an access log. Each is rate limited per IP
 * before any database work (offer_status_view 60, offer_status_write 10, per
 * 15 minutes). A wrong, unknown or expired token answers the same NOT_FOUND,
 * with the same words, so a guess learns nothing. The token is never logged
 * or echoed back.
 *
 * Once an offer is linked to an account (userId set), the link is read-only:
 * the account holder withdraws from Your contributions instead.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { checkRateLimit } from "../rate-limit";
import * as db from "../db";
import {
  buildOfferStatusView,
  recordContributorNote,
  resolveOfferStatusToken,
  sanitizeCapped,
  withdrawPendingOffer,
} from "../lib/offer-status";
import { notifyContributorReply } from "../lib/campaign-notify";
import { LINK } from "../../shared/crowdpoolCopy";

/** Room for the 43-character token and nothing silly. Shape is checked in resolve, so a bad one reads as NOT_FOUND. */
const tokenZ = z.string().max(200);

function badLink(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: LINK.bad });
}

async function resolveOrThrow(token: string) {
  const hit = await resolveOfferStatusToken(token);
  if (!hit) throw badLink();
  return hit;
}

export const offerStatusRouter = router({
  view: publicProcedure
    .input(z.object({ token: tokenZ }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "offer_status_view");
      const { contribution, expiresAt } = await resolveOrThrow(input.token);
      const view = await buildOfferStatusView(contribution, expiresAt);
      if (!view) throw badLink();
      return view;
    }),

  withdraw: publicProcedure
    .input(z.object({ token: tokenZ }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "offer_status_write");
      const { contribution } = await resolveOrThrow(input.token);
      if (contribution.userId != null) {
        throw new TRPCError({ code: "FORBIDDEN", message: LINK.linkedAction });
      }
      if (contribution.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: LINK.notPendingHere });
      }
      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) throw badLink();
      if (campaign.isDemo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: LINK.replyExample });
      }
      // Conditional on it still waiting: a steward's answer in between wins.
      const changed = await withdrawPendingOffer(contribution.id);
      if (!changed) throw new TRPCError({ code: "BAD_REQUEST", message: LINK.notPendingHere });
      return { ok: true as const };
    }),

  reply: publicProcedure
    .input(z.object({
      token: tokenZ,
      message: z.string().trim().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "offer_status_write");
      const { contribution } = await resolveOrThrow(input.token);
      if (contribution.userId != null) {
        throw new TRPCError({ code: "FORBIDDEN", message: LINK.linkedAction });
      }
      if (contribution.status === "withdrawn") {
        throw new TRPCError({ code: "BAD_REQUEST", message: LINK.replyWithdrawn });
      }
      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) throw badLink();
      // Example campaigns keep their example records: nothing is written.
      if (campaign.isDemo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: LINK.replyExample });
      }
      const body = sanitizeCapped(input.message, 1000);
      if (!body) throw new TRPCError({ code: "BAD_REQUEST", message: LINK.replyEmpty });
      const stored = await recordContributorNote(contribution.id, body);
      if (stored === "limit") {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LINK.replyLimit });
      }
      // Every steward hears on the notification spine. Never throws.
      await notifyContributorReply({
        campaign,
        contribution: {
          id: contribution.id,
          userId: null,
          title: contribution.title,
          contributorName: contribution.contributorName,
          isAnonymous: contribution.isAnonymous,
        },
        messageId: stored.id,
        message: body,
      });
      return { ok: true as const };
    }),
});
