"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";

export function useAuth() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
    walletAddress: embeddedWallet?.address ?? null,
  };
}

export function useRequireAuth() {
  const { ready, authenticated, login } = useAuth();

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  return { ready, authenticated };
}
