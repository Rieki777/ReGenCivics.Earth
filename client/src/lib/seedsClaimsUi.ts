/**
 * Shared mapping between the public SEEDS claim form, the stored row, and
 * the admin list/detail UI. The form, schema, and admin tab drifted onto
 * different field names; these helpers are the contract that keeps them
 * aligned so a submitted answer cannot vanish between submit and review.
 */

export type SeedsClaimEvidenceFile = {
  name: string;
  url: string;
  size?: number;
  type?: string;
};

export type SeedsClaimFormSnapshot = {
  seedsAccount: string;
  totalUsd: number;
  adjustedUsd: number;
  spentAmount: number;
  baseWalletAddress: string;
  email: string;
  disputeExplanation: string;
  disputeEvidence: SeedsClaimEvidenceFile[];
  isOnDisputePath: boolean;
};

/** Payload `seedsClaims.submit` expects. Amounts on the dispute path come
 *  from the "USD Amount Claiming" field (stored in `spentAmount` on the form). */
export function buildSeedsClaimSubmitInput(
  form: SeedsClaimFormSnapshot,
  regenPerUsd: number,
) {
  const claimedUsdAmount = form.isOnDisputePath ? form.spentAmount : form.adjustedUsd;
  const spentUsdAmount = form.isOnDisputePath ? 0 : form.spentAmount;
  return {
    seedsAccount: form.seedsAccount,
    email: form.email,
    originalUsdTotal: form.totalUsd,
    spentUsdAmount,
    claimedUsdAmount,
    regenAmount: claimedUsdAmount * regenPerUsd,
    baseWalletAddress: form.baseWalletAddress,
    isDispute: form.isOnDisputePath,
    disputeReason: form.disputeExplanation || undefined,
    evidenceUrls:
      form.disputeEvidence.length > 0
        ? JSON.stringify(form.disputeEvidence.map((f) => f.url))
        : undefined,
  };
}

/**
 * The admin list UI is 1-indexed ("Page 1 of N"). The tRPC procedure is
 * 0-indexed (`offset = page * limit`). Sending the UI page through unchanged
 * skipped the first page of claims.
 */
export function adminListPageToApiPage(uiPage: number): number {
  if (!Number.isFinite(uiPage) || uiPage < 1) return 0;
  return Math.floor(uiPage) - 1;
}

export function formatClaimUsd(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatClaimTokens(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

/**
 * `evidenceUrls` is stored as a JSON array of URL strings. Older rows and
 * failed writes may hold a bare URL or an array of `{ url }` objects.
 */
export function parseEvidenceUrls(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];

  const fromValue = (value: unknown): string[] => {
    if (typeof value === "string") {
      const s = value.trim();
      return s ? [s] : [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => fromValue(item));
    }
    if (value && typeof value === "object" && "url" in value) {
      const url = (value as { url: unknown }).url;
      return typeof url === "string" && url.trim() ? [url.trim()] : [];
    }
    return [];
  };

  try {
    return fromValue(JSON.parse(trimmed));
  } catch {
    return trimmed.startsWith("http") || trimmed.startsWith("/") ? [trimmed] : [];
  }
}
