/**
 * Investor form localStorage draft helpers.
 *
 * Contact / profile fields may restore for returning visitors.
 * Accredited + risk disclosure attestations must NEVER restore from storage —
 * they always start unchecked so the person re-affirms this session.
 */

export const INVESTOR_FORM_DRAFT_KEY = "investor_form_draft";

/** Keys that must not be restored from a saved draft. */
export const INVESTOR_ATTESTATION_KEYS = [
  "isAccreditedInvestor",
  "understandsRisks",
  "hasReadDisclosures",
] as const;

export type InvestorAttestationKey = (typeof INVESTOR_ATTESTATION_KEYS)[number];

/**
 * Strip attestation booleans from a parsed draft object.
 * Returns a shallow copy safe to merge into form state.
 */
export function stripInvestorAttestations<T extends Record<string, unknown>>(
  draft: T | null | undefined,
): Partial<T> {
  if (!draft || typeof draft !== "object") return {};
  const next: Record<string, unknown> = { ...draft };
  for (const key of INVESTOR_ATTESTATION_KEYS) {
    delete next[key];
  }
  return next as Partial<T>;
}

/**
 * Parse raw localStorage JSON and return a draft with attestations removed.
 * Corrupt JSON → null (caller keeps empty defaults).
 */
export function loadInvestorDraftFromStorage(
  raw: string | null,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return stripInvestorAttestations(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}
