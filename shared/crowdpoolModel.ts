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
 * until the cooperative is a legal entity and counsel has ruled. See
 * `CROWDPOOL_PLAN.md` section 8; the legal research itself is kept out of the repo.
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
 * Where the cooperative lives. Ruled 2026-09-14. Liechtenstein uses the Swiss franc
 * through a currency union, so the CHF peg below is unchanged by the choice.
 */
export const JURISDICTION = {
  country: "Liechtenstein",
  form: "registered cooperative (PGR Art. 428 ff.)",
  currency: "CHF",
  /** The cooperative IS the fund. There is no second vehicle. */
  cooperativeIsTheFund: true,
  ruled: "2026-09-14",
} as const;

/**
 * The price of a seat. Ruled 2026-09-14.
 *
 * Every financial contribution through a campaign is at least the fund minimum,
 * and each one makes the contributor a member with exactly one seat. The number
 * is a setting; the shape is not. Money below the minimum never enters the fund:
 * it goes to the partner platform (MONEY_CHANNELS.partnerPlatform), which is why
 * nobody in the fund can be voiceless and no lesser class of vote exists.
 */
export const FUND_ENTRY = {
  /** game_variables: crowdpool.fund_minimum_chf */
  minimumChf: 250_000,
  seatsPerContribution: 1,
  /** A second contribution by the same member buys more $RCivics, never a second seat. */
  seatsPerMember: 1,
} as const;

/**
 * Three channels into every campaign, and the campaign page counts all three so a
 * project sees one total. Only the first is the fund.
 */
export const MONEY_CHANNELS = {
  fund: {
    minimumChf: FUND_ENTRY.minimumChf,
    recipient: "the cooperative",
    /** Never on the cooperative's own account. */
    heldBy: "licensed custodian, until close",
    gives: ["$RCivics one per franc", "one seat", "routing"] as const,
    countedOnCampaign: true,
  },
  partnerPlatform: {
    /** A platform we partner with. We do not operate it and never touch its money. */
    operatedByUs: false,
    /** OPEN. Recommended: the project directly, on the platform's terms. */
    recipient: "open; recommended: the project directly",
    gives: ["whatever the platform offers", "a voice through the crowd circle"] as const,
    fundTokens: false,
    directSeat: false,
    voice: "crowd circle",
    countedOnCampaign: true,
    /** game_variables: crowdpool.rails.partner_platform (off), crowdpool.partner_platform.url */
    rail: "crowdpool.rails.partner_platform",
  },
  inKind: {
    recipient: "one project, through the needs registry",
    /** The Game side (RGVoice, $ReGen), never the Fund side. */
    side: "game",
    fundTokens: false,
    directSeat: false,
    /** OPEN: whether in-kind counts toward crowd-circle delegate seats. */
    voice: "crowd circle, if in-kind counts",
    countedOnCampaign: true,
  },
} as const;

/**
 * The routing share: how much of a money contribution the contributor gets to
 * direct at projects of their choosing. Configurable per season within the range.
 * The remainder goes to the community treasury. Fund channel only.
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
 *
 * RECOMMENDED CHANGE, not yet ruled (research of 2026-09-14): default to refund.
 * Under Liechtenstein fund law the core-team default is the one design element
 * that most strengthens the reading that this is a managed fund, and it names
 * the core team as the manager. CROWDPOOL_PLAN.md section 9 carries it.
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
 * Governance of the fund. Ruled 2026-09-14. This replaces the ruling of 2026-09-05
 * that both one member one vote and one franc one vote be supported.
 *
 * ONE SEAT, ONE VOTE. The fund assembly has three kinds of seat, and each seat
 * carries exactly one vote:
 *   - every land project organisation
 *   - every investor who has put in at least CHF 250,000
 *   - every steward on the operational council
 * The assembly decides overall governance, how the fund is run, and above all how
 * money is disbursed. The operational council carries those decisions out and is
 * empowered within its roles.
 *
 * Land projects vote on the disbursement slate as a whole. They do not vote on
 * individual awards, their own included.
 *
 * Every financial member paid at least the fund minimum (FUND_ENTRY), so every
 * stake in the fund is a direct seat. Below the minimum the voice is collective:
 * the CROWD CIRCLE. Everyone who contributed to the season below the minimum is
 * in it, one person one vote, and the circle elects delegates to the assembly,
 * one delegate seat for every CHF 250,000 the crowd contributed together. A
 * delegate votes like any other seat. Rye's principle, 2026-09-14: everyone has
 * a voice relative to their contribution, the fund is infrastructure for the
 * whole network, and no single person or small group holds disproportionate
 * value. That is also why no member ever holds more than one seat.
 *
 * One vote per member is the Liechtenstein default and the floor under any
 * weighting (PGR Art. 172 para. 5). Delegates' and section assemblies exist in
 * the PGR at any size (Art. 166), which is the hook the circle hangs on.
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
  votesPerSeat: 1,
  seats: {
    land_project: { votes: 1, who: "every land project organisation" },
    investor: { votes: 1, minimumInvestedChf: FUND_ENTRY.minimumChf },
    steward: { votes: 1, who: "every steward on the operational council" },
  },
  assemblyDecides: ["overall governance", "how the fund is run", "disbursements"] as const,
  operationalCouncil: { executesDecisions: true, empoweredWithinRoles: true },
  /** Projects vote on the whole disbursement slate, never on a single award. */
  projectsVoteOnDisbursements: "whole_slate",
  /** Nobody holds more than one seat, whatever they contribute. */
  maxSeatsPerMember: 1,
  /**
   * The collective voice below the minimum. Delegates are elected by the circle
   * and vote like any other seat.
   */
  crowdCircle: {
    votesPerPersonInCircle: 1,
    /** One delegate seat per this much contributed by the crowd together, per season. */
    delegateSeatPerChf: FUND_ENTRY.minimumChf,
    delegateVotes: 1,
    /**
     * OPEN: whether in-kind contributions, at their recorded value, count toward
     * seats. Research of 2026-09-14 recommends not in season one.
     */
    inKindCountsTowardSeats: null,
    /**
     * OPEN. Research of 2026-09-14 recommends: the circle lives OUTSIDE the
     * cooperative (an association, or the platform's own body), because only
     * members may elect a cooperative's council and making the whole crowd
     * nominal members would put retail investors inside the fund. How a
     * delegate is then seated is for counsel: as a member with a nominal share,
     * or as a non-member with a statutory vote (PGR Art. 169 para. 5). The
     * adversarial check found a nominal share may be a fund unit for a delegate
     * exactly as for the crowd, so the non-member seat may be the shape that
     * keeps delegates out of fund law. A floor of one delegate and a cap on the
     * crowd's share of seats are design choices, not law.
     */
    legalShape: null,
  },
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
  jurisdiction: typeof JURISDICTION;
  fundEntry: typeof FUND_ENTRY;
  moneyChannels: typeof MONEY_CHANNELS;
  routing: typeof ROUTING;
  projectStake: typeof PROJECT_STAKE;
  closeConditions: typeof CLOSE_CONDITIONS;
  missedWindow: typeof MISSED_WINDOW;
  refunds: typeof REFUNDS;
  routingSignal: typeof ROUTING_SIGNAL;
};
