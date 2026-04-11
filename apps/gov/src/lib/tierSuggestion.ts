/**
 * Client-side tier suggestion algorithm for historical contribution claims.
 * Runs after Screens 4-7. Input: capital forms, duration, reach, tangible outputs.
 * Output: suggested tier with USD + token amounts, plus an aboveTier flag for Fund-pathway routing.
 */
import { ClaimType, individualTiers, orgTiers, TierDef } from "./tierConfig";

export interface TierSuggestion {
  tier: string;
  tierLabel: string;
  usdValue: number;
  tokenAmount: number;
  aboveTier: boolean;
  tierDef: TierDef;
}

const durationScores: Record<string, number> = {
  under_1_year: 1,
  "1_3_years": 2,
  "3_5_years": 3,
  "5_10_years": 4,
  "10_plus_years": 5,
};

const individualReachScores: Record<string, number> = {
  under_50: 1,
  "50_200": 2,
  "200_1000": 3,
  "1000_plus": 4,
  generational: 5,
};

const orgReachScores: Record<string, number> = {
  under_500: 1,
  "500_5000": 2,
  "5000_plus": 3,
};

function outputScore(outputs: unknown[], claimType: ClaimType): number {
  const count = outputs.length;
  if (claimType === "organization") {
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    return 3;
  }
  if (count === 0) return 1;
  if (count === 1) return 2;
  if (count <= 3) return 3;
  if (count <= 5) return 4;
  return 5;
}

function capitalBreadthScore(forms: unknown[], claimType: ClaimType): number {
  const count = forms.length;
  if (claimType === "organization") {
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  }
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 3;
  if (count <= 6) return 4;
  return 5;
}

export function suggestTier(
  claimType: ClaimType,
  formsOfCapital: unknown[],
  duration: string,
  reach: string,
  tangibleOutputs: unknown[],
): TierSuggestion {
  const tiers = claimType === "individual" ? individualTiers : orgTiers;
  const maxScore = claimType === "individual" ? 5 : 3;

  const scores = [
    capitalBreadthScore(formsOfCapital, claimType),
    durationScores[duration] ?? 1,
    claimType === "individual" ? (individualReachScores[reach] ?? 1) : (orgReachScores[reach] ?? 1),
    outputScore(tangibleOutputs, claimType),
  ];

  const cappedScores = claimType === "organization" ? scores.map((s) => Math.min(s, 3)) : scores;
  const avg = cappedScores.reduce((a, b) => a + b, 0) / cappedScores.length;
  const tierIndex = Math.min(Math.round(avg) - 1, tiers.length - 1);
  const clampedIndex = Math.max(0, tierIndex);
  const selected = tiers[clampedIndex];

  const aboveTier = avg >= maxScore && claimType === "individual" && clampedIndex === tiers.length - 1;

  return {
    tier: selected.tier,
    tierLabel: selected.label,
    usdValue: selected.usd,
    tokenAmount: selected.tokens,
    aboveTier,
    tierDef: selected,
  };
}
