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
    why: "How many gratitude points each player can spend per lunar cycle on thanking other players.",
  },
  gratitudeRecipients: {
    why: "How many distinct players a single sender can thank in one cycle.",
  },
  streakCycles: {
    why: "Consecutive cycles of activity. Builds a small streak bonus on top of the base gratitude budget.",
  },
  regenDistributionPool: {
    why: "Total $ReGen tokens distributed in the cycle for game-side activity rewards.",
    learnMore: "/tokenomics#regen",
  },
  claimThreshold: {
    why: "Minimum score required before a player can claim their season payout.",
  },
};
