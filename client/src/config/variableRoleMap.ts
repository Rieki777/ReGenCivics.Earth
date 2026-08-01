/**
 * Which player roles each simulator variable touches. Used to render
 * "Who does this affect?" chips next to each impact summary.
 */
export const VARIABLE_ROLE_MAP: Record<string, string[]> = {
  questWeight: ["explorer", "co-creator"],
  forumWeight: ["co-creator", "steward"],
  trustMultiplierMin: ["all"],
  trustMultiplierMax: ["sage", "steward"],
  compostingDecay: ["all"],
  harvestPoolSize: ["all"],
  gratitudeBudget: ["all"],
  gratitudeRecipients: ["all"],
  streakCycles: ["steward", "sage"],
  regenDistributionPool: ["all"],
  maxPayoutPerPerson: ["all"],
  claimThreshold: ["explorer", "co-creator"],
};
