/**
 * tRPC router for the Hypha Bridge.
 *
 * Public surface for source systems and the bridge page client. Source-system
 * callers (forum decision webhook, crowdpool, contribution claim) call
 * `hyphaBridge.create`. The bridge page calls `hyphaBridge.get`.
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createHyphaBridge,
  getBridge,
  markBridgeHandoffSent,
  buildHyphaTargetUrl,
  KNOWN_INTENTS,
} from "../lib/hypha-bridge";
import type { HyphaBridgePayload, HyphaFormKind, HyphaBridgeSource } from "../lib/hypha-bridge/types";

const formKindSchema = z.enum([
  "propose_contribution",
  "deploy_funds",
  "pay_for_expenses",
  "membership_exit",
  "buy_hypha_tokens",
  "redeem_tokens",
  "activate_spaces",
  "change_entry_method",
  "change_voting_method",
  "space_settings_transparency",
  "space_to_space_membership",
]) as z.ZodType<HyphaFormKind>;

const sourceSchema = z.enum([
  "loomio_decision",
  "crowdpool",
  "contribution_claim",
  "fund_grant",
  "expense",
  "exit",
  "redeem_tokens",
  "other",
]) as z.ZodType<HyphaBridgeSource>;

const payoutSchema = z.object({
  amount: z.string(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const payloadSchema = z.object({
  source: sourceSchema,
  sourceId: z.string().min(1).max(80),
  targetDhoSlug: z.string().min(1).max(80),
  formKind: formKindSchema,
  title: z.string().min(1).max(280),
  description: z.string().min(1),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  payouts: z.array(payoutSchema).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        contentType: z.string().optional(),
      }),
    )
    .optional(),
  leadImageUrl: z.string().url().optional(),
  initiatorUserId: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const hyphaBridgeRouter = router({
  /** Create a new Hypha bridge. Source systems call this. */
  create: protectedProcedure
    .input(payloadSchema)
    .mutation(async ({ ctx, input }) => {
      // Force initiatorUserId to the authenticated user, ignore client claims.
      // Cast through unknown because Zod validates the 0x prefix at runtime
      // but the literal-type cast doesn't survive the schema parse.
      const payload = { ...input, initiatorUserId: ctx.user.id } as unknown as HyphaBridgePayload;
      return createHyphaBridge(payload);
    }),

  /** Read a bridge by its short key. Used by the bridge page on the client. */
  get: publicProcedure
    .input(z.object({ bridgeKey: z.string().min(6).max(16) }))
    .query(async ({ input }) => {
      const bridge = await getBridge(input.bridgeKey);
      if (!bridge) throw new TRPCError({ code: "NOT_FOUND", message: "Bridge not found" });
      return bridge;
    }),

  /** Build the redirect URL for the bridge page. Returned as a string the
   * client never has to construct itself. */
  buildRedirectUrl: publicProcedure
    .input(z.object({ bridgeKey: z.string().min(6).max(16), lang: z.string().max(8).optional() }))
    .query(async ({ input }) => {
      const bridge = await getBridge(input.bridgeKey);
      if (!bridge) throw new TRPCError({ code: "NOT_FOUND", message: "Bridge not found" });
      return { url: buildHyphaTargetUrl(bridge as any, input.lang ?? "en") };
    }),

  /** Mark the bridge as handoff_sent when the user clicks Continue. */
  markHandoffSent: protectedProcedure
    .input(z.object({ bridgeKey: z.string().min(6).max(16) }))
    .mutation(async ({ input }) => {
      await markBridgeHandoffSent(input.bridgeKey);
      return { ok: true };
    }),

  /** List the available intents. Useful for admin / debug surfaces. */
  listIntents: publicProcedure.query(() => Object.values(KNOWN_INTENTS)),
});
