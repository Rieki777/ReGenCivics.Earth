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
  | "decision-to-contribution"
  | "crowdpool-to-contribution"
  | "claim-historical-contribution"
  | "fund-grant-to-deploy-funds"
  | "expense-reimbursement"
  | "membership-exit"
  | "redeem-internal-tokens";

export interface IntentDescriptor {
  name: IntentName;
  source: HyphaBridgeSource;
  formKind: HyphaFormKind;
  /** Human-readable description for the bridge page header. */
  description: string;
}

export const KNOWN_INTENTS: Record<IntentName, IntentDescriptor> = {
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
};
