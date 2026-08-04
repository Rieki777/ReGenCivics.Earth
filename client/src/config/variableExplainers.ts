/**
 * Plain-language explanations for each simulator variable. Surfaced via
 * the inline ⓘ explainer popover next to each variable row.
 */
export type VariableExplainer = {
  why: string;
  learnMore?: string;
};

export const VARIABLE_EXPLAINERS: Record<string, VariableExplainer> = {
  questWeight: {
    why: "How much each completed quest counts toward a player's contribution score. Higher quest weight rewards questing over forum activity.",
    learnMore: "/bionomics#scoring",
  },
  forumWeight: {
    why: "How much each forum post counts toward score. The balance between this and quest weight tunes whether the system favors doers or talkers.",
  },
  trustMultiplierMin: {
    why: "The lowest score amplification a player can have. New players start near this floor.",
  },
  trustMultiplierMax: {
    why: "The highest score amplification trusted players reach. Tunes how much being a long-time contributor matters.",
  },
  compostingDecay: {
    why: "How fast old contributions fade in weight each season. Higher means recent activity matters more.",
  },
  harvestPoolSize: {
    why: "Total dollars distributed in the season's harvest. Players take a share based on their tier.",
    learnMore: "/tokenomics#harvest",
  },
  gratitudeBudget: {
    why: "How many gratitude points each player gets per lunar cycle to give away. It resets every cycle and never carries over.",
  },
  gratitudeRecipients: {
    why: "How many distinct players a sender acknowledges in one cycle. Below the full-power threshold the unused part of their budget is forfeited, not saved.",
  },
  streakCycles: {
    why: "Consecutive cycles of activity. Builds a small streak bonus on top of the base gratitude budget.",
  },
  regenDistributionPool: {
    why: "The ceiling on $ReGen the cycle can mint for gratitude. Recipients split it in proportion to the weighted gratitude they received.",
    learnMore: "/tokenomics#regen",
  },
  maxPayoutPerPerson: {
    why: "The most $ReGen one person can be credited from a single cycle, however much gratitude they were sent. This is what stops a small group acknowledging only each other from taking the whole pool: with a 1,000 cap, a two-person cycle mints 2,000 and the rest is never created. Set to 0 to remove the cap.",
    learnMore: "/tokenomics#regen",
  },
  claimThreshold: {
    why: "Minimum score required before a player can claim their season payout.",
  },
};
