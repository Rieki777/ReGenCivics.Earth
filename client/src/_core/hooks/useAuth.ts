import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER ?? "privy";
const HAS_PRIVY = Boolean(import.meta.env.VITE_PRIVY_APP_ID);

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Unified auth hook. Delegates to Privy when configured, otherwise legacy.
 * Both paths return the same shape so consumers stay unchanged.
 */
export function useAuth(options?: UseAuthOptions) {
  if (AUTH_PROVIDER === "privy" && HAS_PRIVY) {
    return usePrivyAuthWrapper(options);
  }
  return useLegacyAuth(options);
}

// ─── Privy path ─────────────────────────────────────────────────────────────

function usePrivyAuthWrapper(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};

  // Dynamic require so the Privy bundle is only loaded when needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { usePrivyAuth } = require("./usePrivyAuth") as typeof import("./usePrivyAuth");
  const auth = usePrivyAuth();

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (auth.loading) return;
    if (auth.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, auth.loading, auth.user]);

  return {
    user: auth.user,
    loading: auth.loading,
    error: auth.error,
    isAuthenticated: auth.isAuthenticated,
    refresh: auth.refresh,
    logout: auth.logout,
    // Privy-specific extras (ignored by legacy consumers)
    privyUser: auth.privyUser,
    embeddedWallet: auth.embeddedWallet,
  };
}

// ─── Legacy path ────────────────────────────────────────────────────────────

function useLegacyAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    privyUser: null,
    embeddedWallet: null,
  };
}
