/**
 * Crowdpooling: the model, in one place.
 *
 * The machine-readable half of `docs/CROWDPOOL_MODEL.md`. That file explains the
 * model to a person; this one is what code reads, so the two can never drift into
 * describing different mechanics.
 *
 * Every number here is a DEFAULT. The ones marked configurable are held in
 * `game_variables` and can move season to season without a deploy.
 *
 * Nothing in this file accepts value, and nothing moves money on or through the
 * site. The fund channel is being redesigned with counsel as a member-owned
 * cooperative; its terms are not set. The fund-side mechanics this file used to
 * carry (a jurisdiction, a seat price, routing shares, a token rate against a
 * currency, a treasury and fund governance) are held pending counsel (v1.2,
 * 2026-09-27) and kept outside the repo. See `CROWDPOOL_PLAN.md` sections 1, 2a
 * and 8.
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
 * The ways into a campaign, and the campaign page counts them together so a project
 * sees one reading. None of them passes money through ReGen Civics.
 */
export const MONEY_CHANNELS = {
  /** Being redesigned with counsel as a member-owned cooperative. Not open. */
  fund: {
    open: false,
    countedOnCampaign: false,
  },
  /**
   * A route the project holds outside ReGen Civics: Ma Earth for gifts, Steward
   * for loans. A project steward adds it and a ReGen Civics admin verifies it
   * (campaign_partner_links). Each follows its own terms.
   */
  moneyRoutes: {
    operatedByUs: false,
    recipient: "the project, through a route it holds",
    fundTokens: false,
    countedOnCampaign: true,
    /** game_variables: crowdpool.rails.loan_routes (off until counsel rules). */
    loanRail: "crowdpool.rails.loan_routes",
  },
  inKind: {
    recipient: "one project, through the needs registry",
    /**
     * Ruled 2026-09-24: in-kind is recorded in that project's own token, never
     * RGVoice or $ReGen and never $RCivics. ReGen Civics sets no hours-to-token
     * rate; each project's entity decides how it credits labor (2026-09-27).
     */
    recordedIn: "the project's own token",
    fundTokens: false,
    countedOnCampaign: true,
  },
} as const;

/**
 * A campaign is complete only when BOTH halves land by its close date. The close
 * date is one fixed date set at publication: moving it or a threshold after
 * publication reopens the question of consent for everyone who already offered.
 */
export const CLOSE_CONDITIONS = {
  /** Both must be true by the close date. Money alone is not a complete campaign. */
  requires: ["money_half_landed", "in_kind_half_landed", "close_date_reached"] as const,
  /** Set once at publication. */
  closeDateIsWriteOnce: true,
  /** The outer bound on any campaign's window (273 days in code, MAX_WINDOW_DAYS). */
  maxWindowMonths: 9,
} as const;

/**
 * How much of a campaign's whole ask is money. Ruled 2026-09-24: campaigns
 * usually ask for 10 to 30 percent in money, the wizard suggests 20, and none
 * of it is enforced. A share outside the band gets a soft note for stewards and
 * admins only (moneyShareNote in shared/campaignProgress.ts); nothing blocks,
 * and 0 ("This project asks for no money") is allowed.
 *
 * game_variables: crowdpool.cash_share_min_pct, crowdpool.cash_share_max_pct,
 * crowdpool.cash_share_default_pct (migration 0257), served to pages by
 * campaigns.crowdpoolSettings. These values are the fallbacks.
 */
export const CASH_SHARE = {
  softMinPct: 10,
  softMaxPct: 30,
  defaultPct: 20,
  enforced: false,
  zeroAllowed: true,
} as const;

/**
 * Words we do not use, and what we say instead. Enforced on the campaign
 * surfaces by scripts/check-banned-terms.mjs (gate 1f and CI), which reads
 * these keys from this object, so the list lives here and only here. The
 * guard scans an explicit file list, not the whole repo.
 */
export const BANNED_TERMS: Record<string, string> = {
  // "Earmarking" is the exact term of art in Rev. Rul. 63-252 for what destroys
  // deductibility when funds route to foreign organisations, and this cohort is
  // international. Renamed on legal advice, and the game language is truer anyway.
  earmark: "route / routing",
  earmarking: "routing",
  earmarked: "routed",
  // ReGen Civics takes no money, so a contribution here is never a gift to it and
  // never produces a receipt. Gifts made through a project's own route follow
  // that route's terms.
  donation: "contribution",
  donor: "contributor",
  "tax deductible": "(never say this)",
  charitable: "(never say this)",
};

export type CrowdpoolModel = {
  moneyChannels: typeof MONEY_CHANNELS;
  closeConditions: typeof CLOSE_CONDITIONS;
  cashShare: typeof CASH_SHARE;
};
