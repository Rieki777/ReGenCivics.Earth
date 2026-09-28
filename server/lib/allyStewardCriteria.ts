/**
 * Pure Ally Steward criterion (QUEST_PAGE_AND_PATH_PROGRESSION_SPEC §3.3).
 *
 * Met only when the member has at least one confirmed resource swap AND one
 * confirmed token swap with ReGen Civics. Empty log / either half missing = unmet.
 */

export type AllyStewardEvidence = {
  hasConfirmedResourceSwap: boolean;
  hasConfirmedTokenSwap: boolean;
};

export type AllyStewardResult = {
  met: boolean;
  note: string;
  evidence: AllyStewardEvidence;
};

export function evaluateAllySteward(
  evidence: AllyStewardEvidence,
): AllyStewardResult {
  const { hasConfirmedResourceSwap, hasConfirmedTokenSwap } = evidence;
  const met = hasConfirmedResourceSwap && hasConfirmedTokenSwap;
  return {
    met,
    note: met
      ? "Confirmed resource swap and token swap with ReGen Civics"
      : `Resource swap: ${hasConfirmedResourceSwap ? "yes" : "no"}, Token swap: ${hasConfirmedTokenSwap ? "yes" : "no"}`,
    evidence,
  };
}
