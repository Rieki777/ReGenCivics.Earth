/**
 * PrivyAuthProvider: wraps the app with Privy when configured.
 * Falls back to rendering children without Privy if the app ID is missing.
 */
import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";
import type { ReactNode } from "react";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7dd87d",
          logo: "/images/logos/regencivics-logo-dark-transparent-rounded.webp",
        },
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        supportedChains: [base],
        defaultChain: base,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
