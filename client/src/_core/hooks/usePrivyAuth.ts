/**
 * usePrivyAuth: auth hook that uses Privy as the primary provider.
 * Sends the Privy access token to the server on every tRPC request by
 * setting window.__privyAccessToken which the httpBatchLink reads.
 * Falls back to legacy cookie auth if Privy is not ready.
 */
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";

export function usePrivyAuth() {
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout: privyLogout,
    getAccessToken,
  } = usePrivy();
  const { wallets } = useWallets();
  const utils = trpc.useUtils();
  const tokenRef = useRef<string | null>(null);

  // Keep a fresh access token in a ref + window global for the tRPC link
  useEffect(() => {
    if (!authenticated) {
      tokenRef.current = null;
      (window as any).__privyAccessToken = null;
      return;
    }
    const refresh = async () => {
      const token = await getAccessToken();
      tokenRef.current = token;
      (window as any).__privyAccessToken = token;
    };
    refresh();
    // Refresh every 50 minutes (tokens expire in 60)
    const interval = setInterval(refresh, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authenticated, getAccessToken]);

  // Query server for the user record (populated by the dual-auth context)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: ready,
  });

  const logout = useCallback(async () => {
    try {
      await privyLogout();
    } catch { /* swallow */ }
    (window as any).__privyAccessToken = null;
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [privyLogout, utils]);

  // Get the embedded Privy wallet (Base chain)
  const embeddedWallet = useMemo(() => {
    return wallets.find((w) => w.walletClientType === "privy") ?? null;
  }, [wallets]);

  return {
    user: meQuery.data ?? null,
    loading: !ready || meQuery.isLoading,
    error: meQuery.error ?? null,
    isAuthenticated: ready && authenticated && Boolean(meQuery.data),
    login,
    logout,
    refresh: () => meQuery.refetch(),
    privyUser,
    embeddedWallet,
    getAccessToken: () => tokenRef.current,
  };
}
