/**
 * Server-side derivation of SEEDS claim money figures.
 *
 * Client-supplied USD / $ReGen numbers are untrusted. For accounts we have
 * contribution records for, claimed $ReGen is recomputed from those records
 * minus what the claimant says they spent. Dispute claims for accounts with
 * no records are stored as submitted (pending, never auto-credited) so an
 * admin can see the amount, explanation, and evidence.
 */

export type SeedsClaimAmountInput = {
  isDispute: boolean;
  contributionTotalUsd: number;
  spentUsdAmount: number;
  claimedUsdAmount: number;
  regenPerUsd: number;
};

export type SeedsClaimAmountResult =
  | {
      ok: true;
      originalUsdTotal: number;
      spentUsdAmount: number;
      claimedUsdAmount: number;
      regenAmount: number;
    }
  | { ok: false; message: string };

export function deriveSeedsClaimAmounts(
  input: SeedsClaimAmountInput,
): SeedsClaimAmountResult {
  const contributionTotalUsd = Number(input.contributionTotalUsd) || 0;
  const regenPerUsd = Number(input.regenPerUsd) || 0;
  const spentIn = Number(input.spentUsdAmount) || 0;
  const claimedIn = Number(input.claimedUsdAmount) || 0;

  if (contributionTotalUsd <= 0) {
    if (!input.isDispute) {
      return {
        ok: false,
        message: "No SEEDS contributions are on record for that account.",
      };
    }
    if (claimedIn <= 0) {
      return {
        ok: false,
        message: "Dispute claims need a USD amount to review.",
      };
    }
    return {
      ok: true,
      originalUsdTotal: 0,
      spentUsdAmount: 0,
      claimedUsdAmount: claimedIn,
      regenAmount: claimedIn * regenPerUsd,
    };
  }

  const spentUsdAmount = Math.min(Math.max(spentIn, 0), contributionTotalUsd);
  const maxClaimable = contributionTotalUsd - spentUsdAmount;
  const claimedUsdAmount = Math.min(Math.max(claimedIn, 0), maxClaimable);
  return {
    ok: true,
    originalUsdTotal: contributionTotalUsd,
    spentUsdAmount,
    claimedUsdAmount,
    regenAmount: claimedUsdAmount * regenPerUsd,
  };
}
