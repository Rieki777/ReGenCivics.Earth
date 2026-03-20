/**
 * ProfileContributions
 * Wrapper for the ContributionsTab section in PlayerProfile.
 * The actual ContributionsTab function (with its own local state) is defined
 * in PlayerProfile.tsx. This component serves as the named export for
 * the contributions section, passing necessary props down.
 */
import React from "react";

interface ProfileContributionsProps {
  walletAddress?: string | null;
  onLinkWallet?: () => void;
  rgenBalance?: number | null;
  rvoiceBalance?: number | null;
  lastTokenSync?: string | null;
  ContributionsTabComp: React.ComponentType<{
    walletAddress?: string | null;
    onLinkWallet?: () => void;
    rgenBalance?: number | null;
    rvoiceBalance?: number | null;
    lastTokenSync?: string | null;
  }>;
}

export function ProfileContributions({
  walletAddress,
  onLinkWallet,
  rgenBalance,
  rvoiceBalance,
  lastTokenSync,
  ContributionsTabComp,
}: ProfileContributionsProps) {
  return (
    <ContributionsTabComp
      walletAddress={walletAddress}
      onLinkWallet={onLinkWallet}
      rgenBalance={rgenBalance}
      rvoiceBalance={rvoiceBalance}
      lastTokenSync={lastTokenSync}
    />
  );
}
