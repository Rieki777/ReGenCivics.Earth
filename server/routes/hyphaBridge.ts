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

/** $ReGen token contract address on Base. */
const REGEN_TOKEN_ADDRESS = "0x4E617cd113364193d215d107AdD6fa50418AA2E4" as const;

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

  /**
   * Create a Hypha bridge pre-filled from a quest completion.
   *
   * The client sends quest metadata and the player's deliverable URL.
   * The server builds a full bridge payload and returns bridgeKey + bridgeUrl.
   * The player is then redirected to /bridge/hypha/:bridgeKey where they
   * review and click through to Hypha with all fields pre-filled via URL params.
   */
  createFromQuest: protectedProcedure
    .input(
      z.object({
        /** e.g. "quest-5" */
        questId: z.string().min(1).max(40),
        /** e.g. "Quest 5: Rites of Love" */
        questTitle: z.string().min(1).max(200),
        /** Short description of the quest */
        questDescription: z.string().min(1).max(2000),
        /** e.g. "A written or recorded reflection on a rite you designed" */
        questDeliverable: z.string().min(1).max(500),
        /** How many $ReGen tokens this quest awards */
        regenReward: z.number().int().positive().max(10000),
        /** The player's video, article, or other deliverable URL */
        deliverableUrl: z.string().url(),
        /** Optional quest card image URL to use as lead image on the proposal */
        leadImageUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const description = [
        input.questDescription,
        "",
        `Deliverable: ${input.questDeliverable}`,
        "",
        `My work: ${input.deliverableUrl}`,
        "",
        `Requesting ${input.regenReward} $ReGen tokens + 1 RGVoice for completing ${input.questTitle} in the ReGen Civics Game.`,
      ].join("\n");

      const payload: HyphaBridgePayload = {
        source: "quest_completion",
        sourceId: input.questId,
        targetDhoSlug: "regen-games",
        formKind: "propose_contribution",
        title: input.questTitle,
        description,
        payouts: [
          { amount: String(input.regenReward), token: REGEN_TOKEN_ADDRESS },
        ],
        attachments: [
          {
            url: input.deliverableUrl,
            filename: "My deliverable",
            contentType: "text/html",
          },
        ],
        ...(input.leadImageUrl ? { leadImageUrl: input.leadImageUrl } : {}),
        initiatorUserId: ctx.user.id,
        metadata: {
          questId: input.questId,
          questTitle: input.questTitle,
          regenReward: input.regenReward,
          deliverableUrl: input.deliverableUrl,
        },
      };

      return createHyphaBridge(payload);
    }),
});
