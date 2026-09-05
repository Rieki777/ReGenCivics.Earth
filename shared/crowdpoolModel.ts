/**
 * Crowdpooling: the model, in one place.
 *
 * The machine-readable half of `docs/CROWDPOOL_MODEL.md`. That file explains the
 * model to a person; this one is what code reads, so the two can never drift into
 * describing different mechanics. Same reason `shared/fund.ts` exists: the fund's
 * story lived in twenty-one places and none of them agreed.
 *
 * Every number here is a DEFAULT. The ones marked configurable are held in
 * `game_variables` and can move season to season without a deploy. The split moved
 * from 80/20 to 90/10 inside a single day in September 2026, which is why none of
 * these is a constant in a component.
 *
 * Nothing in this file accepts value. The pooling surfaces are built and gated off
 * until the Fund is a legal entity and counsel has ruled. See
 * `docs/legal/CROWDPOOL_LEGAL_DD_2026-09-05_all-dimensions.md`.
 */

/** What a player brings. Money is one resource among nine, and usually the smaller part. */
export const RESOURCE_KINDS = [
  "money",
  "land",
  "equipment",
  "role",
  "shift",
  "loan",
  "knowledge",
  "materials",
  "network",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/**
 * The routing share: how much of a money contribution the contributor gets to
 * direct at projects of their choosing. Configurable per season within the range.
 * The remainder goes to the community treasury.
 */
export const ROUTING = {
  /** game_variables: crowdpool.routing_share_pct */
  defaultSharePct: 90,
  minSharePct: 50,
  maxSharePct: 90,
  /** What the contributor does NOT direct. Derived, never stored separately. */
  treasuryPctFromShare: (sharePct: number) => 100 - sharePct,
} as const;

/**
 * The minimum stake a project returns to ReGen Civics to take part. Non-dilutive:
 * the project keeps its assets whole and converts a slice into a holding across
 * every other project. Value for value.
 */
export const PROJECT_STAKE = {
  /** game_variables: crowdpool.project_stake_min_pct */
  minPct: 10,
  /**
   * The backing instrument varies per project and is never assumed to be a token.
   * Some of these are real equity in a real legal entity.
   */
  backingInstruments: ["recorded_agreement", "hypha_onchain", "llp_equity"] as const,
} as const;

/**
 * A campaign closes only when BOTH halves land and the clock has run. The clock is
 * one fixed date set at publication, not a range: moving a close date or a threshold
 * after publication reopens the whole question of consent for everyone who already
 * committed.
 */
export const CLOSE_CONDITIONS = {
  /** Both must be true. Money alone is not a successful campaign. */
  requires: ["money_threshold_met", "in_kind_threshold_met", "close_date_reached"] as const,
  /** Set once at publication. Write-once at the database level. */
  closeDateIsWriteOnce: true,
  /** The outer bound on any campaign's window. */
  maxWindowMonths: 9,
} as const;

/**
 * When a campaign misses its window, the contributor who routed to it chooses.
 * Silence has a consequence, so the consent for it is captured separately at
 * contribution time rather than folded into a general terms tick.
 */
export const MISSED_WINDOW = {
  choices: ["reroute", "refund", "regen_civics_chooses"] as const,
  responseWindowDays: 7,
  defaultOnSilence: "regen_civics_chooses",
  /** Its own checkbox. Never bundled into "I agree to the terms". */
  requiresSeparateConsent: true,
} as const;

/** Nobody's money comes back smaller than it went in. Fees, if any, only on release. */
export const REFUNDS = {
  alwaysGross: true,
  feeAtContribution: false,
  /** game_variables: crowdpool.release_fee_pct. Deferred; zero until Rye sets it. */
  releaseFeePctDefault: 0,
} as const;

/**
 * Signalling only. It records where a contributor wants their share routed and it
 * carries no rights of its own. It cannot be transferred or sold, by ruling: it is a
 * message to ReGen Civics, not a thing to hold.
 */
export const ROUTING_SIGNAL = {
  transferable: false,
  sellable: false,
  /** Movable between projects right up until a campaign closes. */
  movableUntilClose: true,
  /** Its own tables and its own ledger. Never the four-token model. */
  sharesLedgerWithPlatformTokens: false,
} as const;

/**
 * The four platform tokens are documented in STEERING.md section 5. $RCivics is the
 * only one this model touches, and only at the point a contribution is recognised.
 * The routing signal above is NOT one of them and must never be credited through
 * `creditPrivateTokens`.
 */
export const RCIVICS = {
  /** Deployed on Base, chain 8453. */
  contract: "0x72e9B17a2F93A923D63666eC0a1c096B1443ef26",

  /**
   * One token per Swiss franc. CHF is the unit of account at launch, until the
   * market prices the token itself. Contributions in any other currency convert
   * at the contribution-time rate, and BOTH the original amount+currency and the
   * CHF amount used for issuance are stored, because a contributor asked why they
   * hold what they hold must be answerable years later.
   */
  unitOfAccount: "CHF",
  tokensPerUnit: 1,

  /**
   * Two schema facts that the CHF peg runs into, both measured on production
   * 2026-09-05.
   *
   * 1. `user_token_ledger.amount` is `int`. Whole tokens only. At one token per
   *    franc that means a contribution cannot carry centimes, and every campaign
   *    money column is `int` too. Someone contributing 100,000.50 CHF either
   *    loses the fifty or the write fails. Decide the unit before the first
   *    contribution, because changing a token's scale later is not a migration,
   *    it is a sweep of every caller that posts to the ledger.
   *
   * 2. Production campaigns are ALREADY multi-currency: USD, EUR and GBP all
   *    exist today, and `campaigns.currency` is a free varchar with no rate
   *    stored anywhere. Pegging issuance to CHF means every contribution needs
   *    its original amount, its original currency, the rate used, the rate's
   *    source and its timestamp all persisted. Storing only the converted figure
   *    makes "why do I hold this number" unanswerable later.
   */
  knownSchemaGaps: ["ledger_amount_is_integer", "no_fx_rate_recorded"] as const,

  /**
   * Issued at contribution as a RESTRICTED balance, claimed at close.
   *
   * Stage 1, at contribution: credited privately so the contributor sees their
   * standing immediately. NOT spendable and NOT tradable on the platform, and
   * removable if the contribution is refunded. It is a record, not yet a holding.
   *
   * Stage 2, at close: once deals complete, projects hold their own tokens and
   * refund is no longer possible, the contributor claims the real tokens on Base
   * through Hypha. Same one-way claim bridge the four-token model already uses.
   *
   * WARNING for whoever builds this, measured rather than assumed.
   *
   * `players.requestClaim` (server/routes/players.ts:645) takes a LIST OF TOKEN
   * TYPES and no amount. It claims the WHOLE private balance for each type. So a
   * contributor holding restricted crowdpool $RCivics alongside any other
   * $RCivics would sweep both to Base in one claim, including the part that is
   * still refundable and whose campaigns have not closed. That breaks the refund
   * promise on-chain, where it cannot be undone: the bridge is one-way by design.
   *
   * So the private $RCivics balance needs a claimable part and a restricted part,
   * and requestClaim must claim only the first. A source tag alone will not do
   * it, because the balance is a single cached column.
   *
   * Note the related risk is currently theoretical rather than live: no spend
   * surface reads a private balance today, so "not spendable" is satisfied by
   * accident. It stops being satisfied the day one is built, so the restriction
   * belongs in the data, not in the absence of a caller.
   */
  issuance: {
    stage1: "restricted_private_at_contribution",
    stage2: "claim_to_base_at_close",
    spendableBeforeClaim: false,
    tradableBeforeClaim: false,
    removableOnRefund: true,
    /** All must hold before a claim may be requested. */
    claimPreconditions: [
      "campaigns_routed_to_have_closed",
      "project_tokens_issued",
      "refund_window_passed",
    ],
  },
} as const;

/**
 * The community treasury holds; it does not merely spend. The unrouted share is a
 * real asset the contributor's $RCivics has a claim on. Drawdown for roles and
 * running costs is a governance decision, not an operator one.
 *
 * Note this is exactly what founder ruling R92 used to forbid, and why R92's hard
 * block was lifted on 2026-09-05. The DEFAULT it protected still stands: a project
 * with no treasury configuration has no treasury, no cap and no pre-issued supply.
 */
export const TREASURY = {
  held: true,
  spentDirectly: false,
  drawdownIsGoverned: true,
  defaultExists: false,
  defaultCap: null,
} as const;

/**
 * Governance of the cooperative. Ruled 2026-09-05.
 *
 * TWO WEIGHTINGS, both supported, chosen rather than assumed. One member one vote
 * is the Swiss cooperative default and the shape that most clearly reads as a
 * membership rather than an investment vehicle. One franc one vote is capital
 * weighted. Which applies is a setting, because the answer may differ by decision
 * type and because Swiss counsel has not ruled yet.
 *
 * THE ELECTORATE IS NOT ONLY PEOPLE. Voting weight also goes to projects,
 * organisations and other actors, so the cooperative is governed by the whole
 * ecosystem rather than by individual contributors alone. That has a consequence
 * worth stating before anything is built: "member" cannot be a synonym for "user".
 * A voter is an ACTOR, which may be a person, a land project, a partner
 * organisation, or something not yet named. Any schema that hangs governance off
 * `userId` will have to be torn out the first time a project votes.
 *
 * RCVoice is the governance token. Note it is the only one of the four with no
 * contract deployed on Base (STEERING.md section 5), so this is currently
 * platform-side only.
 */
export const GOVERNANCE = {
  token: "rcvoice",
  /** game_variables: crowdpool.governance.weighting */
  weightings: ["one_member_one_vote", "one_franc_one_vote"] as const,
  defaultWeighting: "one_member_one_vote",
  /** May vary by what is being decided, not only by season. */
  weightingIsPerDecisionType: true,
  /** A voter is an actor, never assumed to be a person. */
  actorKinds: ["person", "project", "organisation", "other"] as const,
  rcvoiceDeployedOnBase: false,
} as const;

/** Words we do not use, and what we say instead. Enforced by a repo guard. */
export const BANNED_TERMS: Record<string, string> = {
  // "Earmarking" is the exact term of art in Rev. Rul. 63-252 for what destroys
  // deductibility when funds route to foreign organisations, and this cohort is
  // international. Renamed on legal advice, and the game language is truer anyway.
  earmark: "route / routing",
  earmarking: "routing",
  earmarked: "routed",
  // A contribution here is not a gift and never produces a receipt.
  donation: "contribution",
  donor: "contributor",
  "tax deductible": "(never say this)",
  charitable: "(never say this)",
};

export type CrowdpoolModel = {
  routing: typeof ROUTING;
  projectStake: typeof PROJECT_STAKE;
  closeConditions: typeof CLOSE_CONDITIONS;
  missedWindow: typeof MISSED_WINDOW;
  refunds: typeof REFUNDS;
  routingSignal: typeof ROUTING_SIGNAL;
};
