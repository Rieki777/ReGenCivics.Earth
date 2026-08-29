/**
 * Intent definitions: every kind of handoff the bridge supports.
 *
 * An intent is a (source, formKind) pair that maps a ReGen Civics user action
 * to a specific Hypha form. Source-specific callers (server/routes/forum.ts,
 * crowdpool routers, contribution claim routers) construct one of these,
 * pass it to bridgeToHypha(), and get a bridgeKey + URL back.
 *
 * To add a new touchpoint, add a new entry to KNOWN_INTENTS and a new caller
 * in the source system. The bridge module itself does not need to change.
 */
import type { HyphaBridgeSource, HyphaFormKind } from "./types";

export type IntentName =
  | "assembly-proposal-to-contribution"
  | "decision-to-contribution"
  | "crowdpool-to-contribution"
  | "claim-historical-contribution"
  | "fund-grant-to-deploy-funds"
  | "expense-reimbursement"
  | "membership-exit"
  | "redeem-internal-tokens"
  | "quest-completion"
  | "module-pool-payout";

export interface IntentDescriptor {
  name: IntentName;
  source: HyphaBridgeSource;
  formKind: HyphaFormKind;
  /** Human-readable description for the bridge page header. */
  description: string;
}

export const KNOWN_INTENTS: Record<IntentName, IntentDescriptor> = {
  "assembly-proposal-to-contribution": {
    name: "assembly-proposal-to-contribution",
    source: "other",
    formKind: "propose_contribution",
    description: "Launch the binding vote on an Assembly proposal in the ReGen Games DHO",
  },
  "decision-to-contribution": {
    name: "decision-to-contribution",
    source: "loomio_decision",
    formKind: "propose_contribution",
    description: "Formalize a ratified governance decision as a Hypha contribution proposal",
  },
  "crowdpool-to-contribution": {
    name: "crowdpool-to-contribution",
    source: "crowdpool",
    formKind: "propose_contribution",
    description: "Bring a crowdpool contribution proposal to a land project DHO",
  },
  "claim-historical-contribution": {
    name: "claim-historical-contribution",
    source: "contribution_claim",
    formKind: "propose_contribution",
    description: "Claim a historical contribution for recognition or compensation",
  },
  "fund-grant-to-deploy-funds": {
    name: "fund-grant-to-deploy-funds",
    source: "fund_grant",
    formKind: "deploy_funds",
    description: "Deploy fund tokens to a project from the ReGen Civics Fund DHO",
  },
  "expense-reimbursement": {
    name: "expense-reimbursement",
    source: "expense",
    formKind: "pay_for_expenses",
    description: "Submit a receipt for expense reimbursement",
  },
  "membership-exit": {
    name: "membership-exit",
    source: "exit",
    formKind: "membership_exit",
    description: "Leave a Hypha space",
  },
  "redeem-internal-tokens": {
    name: "redeem-internal-tokens",
    source: "redeem_tokens",
    formKind: "redeem_tokens",
    description: "Redeem accumulated internal tokens for on-chain Hypha tokens",
  },
  "quest-completion": {
    name: "quest-completion",
    source: "quest_completion",
    formKind: "propose_contribution",
    description: "Submit a completed quest as a contribution proposal to the ReGen Games DHO",
  },
  /*
   * A builders' pool share, on its way to the person who built the module.
   *
   * `deploy_funds` and not `propose_contribution`: the share is already earned
   * and already computed by a published statement, so what the treasury space
   * is being asked is whether to send it, not whether the work happened. That
   * is the deploy-funds question.
   *
   * This is where the payout flow ENDS on this side. The bridge carries the
   * recipient, the amount and the $ReGen contract address to a Hypha form, a
   * human presses create, and the treasury space's own members carry it from
   * there. Nothing in this repository signs, mints, moves or prices anything,
   * and this intent does not change that: it is the furthest honest step.
   */
  "module-pool-payout": {
    name: "module-pool-payout",
    source: "module_pool",
    formKind: "deploy_funds",
    description: "Send a builder their share of this cycle's $ReGen builders' pool",
  },
};
