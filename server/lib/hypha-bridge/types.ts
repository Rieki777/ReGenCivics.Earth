/**
 * Hypha Bridge type definitions.
 *
 * Every handoff from ReGen Civics to Hypha on Base flows through this module.
 * Add new source types and form kinds here. Never construct a Hypha URL outside
 * the bridge module. See `apps/web/src/lib/hypha-bridge/README.md` for the rule.
 */

/** The 11 Hypha agreement creation form kinds. Names use the underscore form
 * the database enum stores. The bridge converts to the kebab-case Hypha URL
 * segment when constructing the redirect target. */
export type HyphaFormKind =
  | "propose_contribution"
  | "deploy_funds"
  | "pay_for_expenses"
  | "membership_exit"
  | "buy_hypha_tokens"
  | "redeem_tokens"
  | "activate_spaces"
  | "change_entry_method"
  | "change_voting_method"
  | "space_settings_transparency"
  | "space_to_space_membership";

/** Source systems inside ReGen Civics that hand off to Hypha. */
export type HyphaBridgeSource =
  // "loomio_decision" is a leftover from the removed Loomio integration
  // (ADR-23), kept to avoid a live enum migration. Safe to rename to a
  // gov-neutral value when the gov app is rebuilt; see ADR-23 + memory.
  | "loomio_decision"
  | "crowdpool"
  | "contribution_claim"
  | "fund_grant"
  | "expense"
  | "exit"
  | "redeem_tokens"
  | "quest_completion"
  | "other";

/** Status of a single bridge instance as it moves through the lifecycle. */
export type HyphaBridgeStatus =
  | "created"
  | "handoff_sent"
  | "on_chain_detected"
  | "passed"
  | "failed"
  | "cancelled";

/** Token payout entry on a Hypha proposal. The token field holds a Base
 * contract address. Symbols are looked up from a static address->symbol map. */
export interface HyphaPayout {
  amount: string; // decimal as string to avoid float drift
  token: `0x${string}`;
}

export interface HyphaAttachment {
  url: string;
  filename: string;
  contentType?: string;
}

/** The payload a source system hands to the bridge. The bridge persists this
 * verbatim into the hyphaBridges.payload JSON column and serves it back to the
 * bridge page that pre-fills the Hypha form. */
export interface HyphaBridgePayload {
  source: HyphaBridgeSource;
  /** ID of the originating record in our system (decision id, claim id, etc.) */
  sourceId: string;
  /** DHO slug on app.hypha.earth, e.g. "regen-games", "regen-civics", or a land project slug */
  targetDhoSlug: string;
  formKind: HyphaFormKind;
  title: string;
  description: string;
  recipient?: `0x${string}`;
  payouts?: HyphaPayout[];
  attachments?: HyphaAttachment[];
  leadImageUrl?: string;
  initiatorUserId: number;
  /** Free-form metadata captured at bridge creation. Used for fuzzy matching
   * the on-chain ProposalCreated event back to the bridge. */
  metadata?: Record<string, unknown>;
}

export interface CreateBridgeResult {
  bridgeKey: string;
  bridgeUrl: string;
}

/** Metadata stored in HyphaBridgePayload.metadata for quest_completion bridges. */
export interface QuestBridgeMetadata {
  questId: string;
  questTitle: string;
  regenReward: number;
  deliverableUrl: string;
}
