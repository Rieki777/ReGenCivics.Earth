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
import { resolveQuestRegenReward } from "@shared/quest-rewards";
import { canSeeFullRecord, pickPublic } from "../lib/public-projection";

/**
 * What a bridge looks like to someone who merely holds a key.
 *
 * Bridge keys are 16 characters drawn from a 40-bit space and they are
 * published in `activityFeed.list` metadata, so "you need the key" is not a
 * control. Withheld here: `initiatorUserId` (which member started it),
 * `hyphaRecipientWallet` and `hyphaTxHash` and `basescanUrl` (who got paid,
 * and the on-chain trail that ties a wallet to that person), and inside the
 * payload, `recipient`, `payouts` and `metadata`.
 *
 * What survives is what the bridge page shows a visitor: the intent, the
 * proposal's own title and description, its images, and its status.
 */
export const PUBLIC_BRIDGE_FIELDS = [
  "bridgeKey",
  "source",
  "sourceId",
  "targetDhoSlug",
  "formKind",
  "status",
  "hyphaProposalId",
  "hyphaPassedAt",
  "hyphaTokenAmount",
  "hyphaTokenSymbol",
  "createdAt",
  "updatedAt",
] as const;

export const PUBLIC_BRIDGE_PAYLOAD_FIELDS = [
  "source",
  "sourceId",
  "targetDhoSlug",
  "formKind",
  "title",
  "description",
  "attachments",
  "leadImageUrl",
] as const;

type BridgeRow = Awaited<ReturnType<typeof getBridge>>;

export function toPublicBridge(bridge: NonNullable<BridgeRow>) {
  const payload = bridge.payload
    ? pickPublic(bridge.payload as Record<string, unknown>, PUBLIC_BRIDGE_PAYLOAD_FIELDS)
    : null;
  return {
    ...pickPublic(bridge as Record<string, unknown>, PUBLIC_BRIDGE_FIELDS),
    payload,
  };
}

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

  /**
   * Read a bridge by its short key. Used by the bridge page on the client.
   *
   * Public projection. The bridge key is short (16 chars, and the generator
   * draws from a 40-bit space) and keys are published in `activityFeed.list`
   * metadata, so this is not a secret URL. The row it keys carries the
   * recipient's wallet address, the on-chain transaction hash, the
   * initiating member's user id, and a payload whose `recipient` and
   * `payouts[]` name who is being paid what. None of that belongs to a
   * passer-by holding a key.
   *
   * The signed-in initiator, and admins, still get the whole row.
   */
  get: publicProcedure
    .input(z.object({ bridgeKey: z.string().min(6).max(16) }))
    .query(async ({ ctx, input }) => {
      const bridge = await getBridge(input.bridgeKey);
      if (!bridge) throw new TRPCError({ code: "NOT_FOUND", message: "Bridge not found" });
      if (canSeeFullRecord(ctx.user, bridge.initiatorUserId)) return bridge;
      return toPublicBridge(bridge);
    }),

  /** Build the redirect URL for the bridge page. Returned as a string the
   * client never has to construct itself.
   *
   * Gated to the initiator and admins. The URL carries the whole payload as
   * Hypha prefill query parameters, recipient wallet and payouts included,
   * so leaving this open would have handed back through a URL exactly what
   * `get` above stops handing back through a row. `markHandoffSent` is
   * already protectedProcedure, so the handoff flow was signed-in anyway.
   */
  buildRedirectUrl: publicProcedure
    .input(z.object({ bridgeKey: z.string().min(6).max(16), lang: z.string().max(8).optional() }))
    .query(async ({ ctx, input }) => {
      const bridge = await getBridge(input.bridgeKey);
      if (!bridge) throw new TRPCError({ code: "NOT_FOUND", message: "Bridge not found" });
      if (!canSeeFullRecord(ctx.user, bridge.initiatorUserId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sign in as the person who started this bridge to continue to Hypha.",
        });
      }
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
        /**
         * Client-displayed reward, accepted for backward compatibility and
         * NEVER used for the payout. The server resolves the real amount from
         * the canonical quest reward table (shared/quest-rewards.ts).
         */
        regenReward: z.number().int().positive().max(10000).optional(),
        /** The player's video, article, or other deliverable URL */
        deliverableUrl: z.string().url(),
        /** Optional quest card image URL to use as lead image on the proposal */
        leadImageUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // The payout amount comes from the canonical reward table, never from
      // the client. An unknown quest id cannot request a payout at all.
      const resolved = resolveQuestRegenReward(input.questId, input.regenReward);
      if (!resolved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown quest "${input.questId}"`,
        });
      }
      if (resolved.mismatch) {
        console.warn(
          `[hyphaBridge] createFromQuest reward mismatch for ${input.questId}: client sent ${input.regenReward}, using canonical ${resolved.regen} (user ${ctx.user.id})`,
        );
      }
      const regenReward = resolved.regen;

      const description = [
        input.questDescription,
        "",
        `Deliverable: ${input.questDeliverable}`,
        "",
        `My work: ${input.deliverableUrl}`,
        "",
        `Requesting ${regenReward} $ReGen tokens + 1 RGVoice for completing ${input.questTitle} in the ReGen Civics Game.`,
      ].join("\n");

      const payload: HyphaBridgePayload = {
        source: "quest_completion",
        sourceId: input.questId,
        targetDhoSlug: "regen-games",
        formKind: "propose_contribution",
        title: input.questTitle,
        description,
        payouts: [
          { amount: String(regenReward), token: REGEN_TOKEN_ADDRESS },
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
          regenReward,
          deliverableUrl: input.deliverableUrl,
        },
      };

      return createHyphaBridge(payload);
    }),
});
