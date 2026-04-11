/**
 * useBaseWallet: returns the user's Base chain wallet address
 * from the database (user.baseWalletAddress).
 */
import { useAuth } from "./useAuth";

export function useBaseWallet(): {
  address: string | null;
  isEmbedded: boolean;
  loading: boolean;
} {
  const auth = useAuth();

  return {
    address: (auth.user as any)?.baseWalletAddress ?? null,
    isEmbedded: false,
    loading: auth.loading,
  };
}
