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
  /** OPEN QUESTION: 1:1 with what? See docs/CROWDPOOL_MODEL.md section "Open". */
  pegNote: "1 token per 1 unit of contributed currency, currency itself unresolved",
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
