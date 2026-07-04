/**
 * Feed ranking constants, shared by the server scorer (forum.feed), the
 * nightly affinity job, and the client's "why am I seeing this" tooltip.
 * One source of truth keeps the explanation honest and the tuning in one
 * place. Runtime overrides can move to game_variables later; these are the
 * defaults.
 *
 * score = base × freshness × relevance × unreadBoost
 *   base      = ln(1 + replyCount + 2×reactionCount)  (+1 so a fresh post scores)
 *   freshness = 0.5^(hoursSinceLastActivity / HALF_LIFE_HOURS)
 *   relevance = 1 + Σ fired boosts below
 *   unread    = UNREAD_NEVER if never read, UNREAD_NEW_REPLIES if new replies
 */

export const FEED_WEIGHTS = {
  /** Freshness half-life: activity this many hours old scores half. */
  HALF_LIFE_HOURS: 48,
  /** Relevance boosts (added to 1). */
  CATEGORY_AFFINITY: 1.5,
  AUTHOR_AFFINITY: 1.0,
  TAG_AFFINITY: 0.75,
  SAME_BIOREGION: 1.25,
  FOLLOWED: 1.0,
  /** Gated: fires only when posts carry a capital value (composer picker,
   * Phase 3.3) AND the viewer has capital percentiles computed. */
  CAPITAL_MATCH: 0.75,
  SENSING_CAN_ACT: 0.5,
  /** Unread multipliers. */
  UNREAD_NEVER: 1.5,
  UNREAD_NEW_REPLIES: 1.2,
} as const;

/** Candidate window: score only posts active in this window, capped. Older
 * posts stay reachable via Latest, search, and category pages. */
export const FEED_CANDIDATE_DAYS = 90;
export const FEED_CANDIDATE_CAP = 500;

/** Newcomer mode: account younger than this or fewer interactions than this
 * gets seed + bioregion blending so a cold-start For You never feels empty. */
export const NEWCOMER_ACCOUNT_DAYS = 14;
export const NEWCOMER_MIN_INTERACTIONS = 3;

/** Affinity computation (nightly job). Event weights + recency decay. */
export const AFFINITY_WEIGHTS = {
  POST: 5,
  REPLY: 3,
  REACTION: 1,
  GRATITUDE_SENT: 4,
  /** user-dimension: interacting with an author */
  USER_REPLY: 3,
  USER_GRATITUDE: 5,
  USER_REACTION: 1,
  /** weight × 0.5^(ageDays / DECAY_HALF_LIFE_DAYS) */
  DECAY_HALF_LIFE_DAYS: 30,
  LOOKBACK_DAYS: 90,
  /** Rows below this score are deleted, keeps the table lean. */
  MIN_SCORE: 0.05,
} as const;

/** Human labels for the why-am-I-seeing-this tooltip. */
export const FEED_REASON_LABELS: Record<string, string> = {
  category_affinity: "You spend time in this category",
  author_affinity: "You interact with this author",
  tag_affinity: "You engage with this tag",
  same_bioregion: "In your bioregion",
  followed: "You follow this",
  capital_match: "Asks for a capital you carry",
  sensing_can_act: "In Sensing, your perspective counts",
  unread_never: "New to you",
  unread_new_replies: "New replies since your last visit",
};

export type FeedTab = "for_you" | "latest" | "following" | "my_threads";
