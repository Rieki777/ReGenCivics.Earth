/**
 * useTokenBalances: fetch on-chain $REGEN and $RCivics balances.
 * Delegates to the server's blockchain.ts which does the actual RPC calls.
 */
import { trpc } from "@/lib/trpc";
import { useBaseWallet } from "./useBaseWallet";

export function useTokenBalances() {
  const { address } = useBaseWallet();

  const balanceQuery = trpc.wallet.balances.useQuery(
    { walletAddress: address! },
    {
      enabled: Boolean(address),
      refetchInterval: 60_000,
      retry: 1,
    },
  );

  return {
    regen: balanceQuery.data?.regen ?? null,
    rcivics: balanceQuery.data?.rcivics ?? null,
    loading: balanceQuery.isLoading,
    error: balanceQuery.error,
  };
}
