"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        supportedChains: [base],
        defaultChain: base,
        appearance: {
          theme: "dark",
          accentColor: "#7dd87d",
          logo: "/regen-gov-icon.svg",
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "google", "wallet"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
