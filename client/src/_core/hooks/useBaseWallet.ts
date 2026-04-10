/**
 * useBaseWallet: returns the user's Base chain wallet address.
 * Privy mode: reads from embedded wallet.
 * Legacy mode: reads from user.baseWalletAddress in the database.
 */
import { useAuth } from "./useAuth";

const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER ?? "privy";
const HAS_PRIVY = Boolean(import.meta.env.VITE_PRIVY_APP_ID);

export function useBaseWallet(): {
  address: string | null;
  isEmbedded: boolean;
  loading: boolean;
} {
  const auth = useAuth();

  if (AUTH_PROVIDER === "privy" && HAS_PRIVY && auth.embeddedWallet) {
    return {
      address: auth.embeddedWallet.address,
      isEmbedded: true,
      loading: false,
    };
  }

  return {
    address: (auth.user as any)?.baseWalletAddress ?? null,
    isEmbedded: false,
    loading: auth.loading,
  };
}
