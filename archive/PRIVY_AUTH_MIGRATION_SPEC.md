# Privy Auth Migration Spec

Complete spec for migrating ReGen Civics auth to Privy while keeping current auth as fallback. Written for Claude Code to execute.

Privy App ID: `cmnt8kp5i01bm0cjixnxsrlpw`

## Table of Contents

1. What Changes and What Stays
2. New Dependencies
3. Environment Variables
4. Database Migration
5. Server-Side: Privy Token Verification
6. Server-Side: Dual-Auth Context
7. Server-Side: Privy User Linking Endpoint
8. Client-Side: PrivyProvider Setup
9. Client-Side: AuthDialog Rewrite
10. Client-Side: useAuth Hook Update
11. Client-Side: Wallet UI for Hypha Bridge
12. Hypha Bridge Integration
13. LocalScale Integration Point
14. On-Chain Balance Reads via Privy Wallet
15. Migration Strategy for Existing Users
16. Fallback Toggle
17. File-by-File Change List
18. Done Criteria

---

## 1. What Changes and What Stays

### Stays the same (fallback auth)

All existing code stays in place behind a feature flag. Nothing is deleted.

- `server/_core/oauth.ts` (Google, Apple, email magic link routes)
- `server/_core/sdk.ts` (JWT session creation, verification)
- `shared/const.ts` (COOKIE_NAME = `app_session_id`, ONE_YEAR_MS)
- Database: `users.openId`, `users.loginMethod` columns remain populated
- All tRPC middleware (`publicProcedure`, `protectedProcedure`, `adminProcedure`) continue working

### Changes

- New `PrivyProvider` wraps the client app
- AuthDialog offers Privy-powered login (Google, Apple, email, wallet connect)
- Privy creates an embedded Base wallet automatically on signup
- Server validates Privy access tokens alongside existing JWT sessions
- `users.privyDid` and `users.baseWalletAddress` get populated automatically
- Hypha Bridge reads wallet address from Privy embedded wallet instead of manual input

---

## 2. New Dependencies

Install these packages:

```bash
npm install @privy-io/react-auth @privy-io/server-auth wagmi @tanstack/react-query viem
```

Note: `viem` is already installed (^2.21.58). The install command will skip it.

Packages and what they do:

- `@privy-io/react-auth` -- PrivyProvider, usePrivy, useWallets hooks for client
- `@privy-io/server-auth` -- verifyAuthToken for server-side Privy JWT validation
- `wagmi` -- React hooks for reading/writing to Base chain contracts
- `@tanstack/react-query` -- Required peer dependency of wagmi

---

## 3. Environment Variables

Add to Railway dashboard and `.env`:

```
# Privy
PRIVY_APP_ID=cmnt8kp5i01bm0cjixnxsrlpw
PRIVY_APP_SECRET=<from Privy dashboard -> Settings -> App secrets>
VITE_PRIVY_APP_ID=cmnt8kp5i01bm0cjixnxsrlpw

# Feature flag
VITE_AUTH_PROVIDER=privy
# Set to "legacy" to revert to old auth. Default: "privy"
```

### Update `server/_core/env.ts`

Add to the ENV object:

```typescript
// Privy
privyAppId: process.env.PRIVY_APP_ID ?? "",
privyAppSecret: process.env.PRIVY_APP_SECRET ?? "",
authProvider: process.env.VITE_AUTH_PROVIDER ?? "privy",
```

Do NOT add PRIVY_APP_SECRET to the REQUIRED block. The app should still boot if Privy is not configured (fallback mode).

---

## 4. Database Migration

Create `drizzle/0091_privy_auth_fields.sql`:

```sql
-- Add Privy auth fields to users table (if not already present)
-- privyDid and baseWalletAddress already exist from earlier migration.
-- This migration adds the privyAccessTokenHash for server-side session binding.
ALTER TABLE users ADD COLUMN IF NOT EXISTS privyAccessTokenHash VARCHAR(64) DEFAULT NULL;
```

Note: `privyDid` (varchar 120) and `baseWalletAddress` (varchar 60) already exist in schema.ts lines 33-35. No changes needed for those columns.

### Update `drizzle/schema.ts`

Add under `baseWalletAddress`:

```typescript
/** Hash of last Privy access token, used for session binding during dual-auth period. */
privyAccessTokenHash: varchar("privyAccessTokenHash", { length: 64 }),
```

---

## 5. Server-Side: Privy Token Verification

Create `server/_core/privy.ts`:

```typescript
import { PrivyClient } from "@privy-io/server-auth";
import { ENV } from "./env";

let privyClient: PrivyClient | null = null;

/** Lazy-init so the app boots even without Privy credentials. */
export function getPrivyClient(): PrivyClient | null {
  if (privyClient) return privyClient;
  if (!ENV.privyAppId || !ENV.privyAppSecret) return null;
  privyClient = new PrivyClient(ENV.privyAppId, ENV.privyAppSecret);
  return privyClient;
}

export type PrivyAuthResult = {
  privyDid: string;
  /** Privy user ID (did:privy:...) */
};

/**
 * Verify a Privy access token from the Authorization header.
 * Returns the decoded DID or null if invalid/missing.
 */
export async function verifyPrivyToken(
  authHeader: string | undefined
): Promise<PrivyAuthResult | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = getPrivyClient();
  if (!client) return null;

  try {
    const claims = await client.verifyAuthToken(token);
    return { privyDid: claims.userId };
  } catch (err) {
    console.warn("[Privy] Token verification failed:", String(err));
    return null;
  }
}

/**
 * Fetch full Privy user profile (linked accounts, wallets, email).
 * Used during first-login linking.
 */
export async function getPrivyUser(privyDid: string) {
  const client = getPrivyClient();
  if (!client) return null;
  try {
    return await client.getUser(privyDid);
  } catch (err) {
    console.warn("[Privy] Failed to fetch user:", String(err));
    return null;
  }
}
```

---

## 6. Server-Side: Dual-Auth Context

Update `server/_core/context.ts` to try Privy auth first, fall back to legacy JWT:

```typescript
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyPrivyToken, getPrivyUser } from "./privy";
import * as db from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authMethod: "privy" | "legacy" | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authMethod: "privy" | "legacy" | null = null;

  // 1. Try Privy auth (Authorization: Bearer <privy-access-token>)
  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const privyResult = await verifyPrivyToken(authHeader);
    if (privyResult) {
      // Look up user by privyDid
      user = await db.getUserByPrivyDid(privyResult.privyDid);

      if (!user) {
        // First login via Privy: fetch Privy profile, create/link user
        const privyProfile = await getPrivyUser(privyResult.privyDid);
        if (privyProfile) {
          user = await db.linkOrCreatePrivyUser(privyResult.privyDid, privyProfile);
        }
      }

      if (user) {
        authMethod = "privy";
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      }
    }
  }

  // 2. Fall back to legacy JWT cookie
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
      if (user) authMethod = "legacy";
    } catch {
      user = null;
    }
  }

  return { req: opts.req, res: opts.res, user, authMethod };
}
```

### Add database functions to `server/db.ts`

```typescript
/** Look up a user by their Privy DID (did:privy:...). */
export async function getUserByPrivyDid(privyDid: string): Promise<User | null> {
  const rows = await connection
    .select()
    .from(users)
    .where(eq(users.privyDid, privyDid))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Link a Privy identity to an existing user (by email match) or create a new user.
 * Called on first Privy login when no user has this privyDid yet.
 */
export async function linkOrCreatePrivyUser(
  privyDid: string,
  privyProfile: any
): Promise<User | null> {
  // Extract email from Privy linked accounts
  const emailAccount = privyProfile.linkedAccounts?.find(
    (a: any) => a.type === "email"
  );
  const googleAccount = privyProfile.linkedAccounts?.find(
    (a: any) => a.type === "google_oauth"
  );
  const appleAccount = privyProfile.linkedAccounts?.find(
    (a: any) => a.type === "apple_oauth"
  );
  const walletAccount = privyProfile.linkedAccounts?.find(
    (a: any) => a.type === "wallet" || a.type === "smart_wallet"
  );
  const embeddedWallet = privyProfile.linkedAccounts?.find(
    (a: any) => a.walletClientType === "privy"
  );

  const email = emailAccount?.address
    ?? googleAccount?.email
    ?? appleAccount?.email
    ?? privyProfile.email?.address
    ?? null;

  // Try to find existing user by email match
  let existingUser: User | null = null;
  if (email) {
    const rows = await connection
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    existingUser = rows[0] ?? null;
  }

  // Also try matching by Google openId
  if (!existingUser && googleAccount?.subject) {
    const googleOpenId = `google:${googleAccount.subject}`;
    existingUser = await getUserByOpenId(googleOpenId);
  }

  // Also try matching by Apple openId
  if (!existingUser && appleAccount?.subject) {
    const appleOpenId = `apple:${appleAccount.subject}`;
    existingUser = await getUserByOpenId(appleOpenId);
  }

  const baseWallet = embeddedWallet?.address ?? walletAccount?.address ?? null;

  if (existingUser) {
    // Link Privy DID and wallet to existing user
    await connection
      .update(users)
      .set({
        privyDid,
        baseWalletAddress: baseWallet ?? existingUser.baseWalletAddress,
        lastSignedIn: new Date(),
      })
      .where(eq(users.id, existingUser.id));
    return getUserById(existingUser.id);
  }

  // No existing user found: create new
  const name = googleAccount?.name
    ?? appleAccount?.name
    ?? privyProfile.name
    ?? null;

  // Generate an openId that won't collide with legacy format
  const openId = `privy:${privyDid.replace("did:privy:", "")}`;

  await upsertUser({
    openId,
    name,
    email: email?.toLowerCase().trim() ?? null,
    loginMethod: "privy",
    lastSignedIn: new Date(),
  });

  // Get the created user, then update privyDid and wallet
  const newUser = await getUserByOpenId(openId);
  if (newUser) {
    await connection
      .update(users)
      .set({ privyDid, baseWalletAddress: baseWallet })
      .where(eq(users.id, newUser.id));
  }

  return newUser ? getUserById(newUser.id) : null;
}
```

---

## 7. Server-Side: Privy User Linking Endpoint

Add a tRPC procedure that lets an already-logged-in legacy user link their Privy identity.

Add to `server/routes/auth.ts`:

```typescript
/** Link a Privy identity to the current legacy-auth user. */
linkPrivy: protectedProcedure
  .input(z.object({
    privyDid: z.string().min(1),
    baseWalletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Check no other user already has this privyDid
    const existing = await db.getUserByPrivyDid(input.privyDid);
    if (existing && existing.id !== ctx.user.id) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Privy identity is already linked to another account.",
      });
    }

    await db.updateUser(ctx.user.id, {
      privyDid: input.privyDid,
      baseWalletAddress: input.baseWalletAddress ?? ctx.user.baseWalletAddress,
    });

    return { success: true };
  }),
```

If `db.updateUser` does not exist, add it to `server/db.ts`:

```typescript
export async function updateUser(
  userId: number,
  data: Partial<InsertUser>
): Promise<void> {
  await connection.update(users).set(data).where(eq(users.id, userId));
}
```

---

## 8. Client-Side: PrivyProvider Setup

Create `client/src/_core/providers/PrivyAuthProvider.tsx`:

```tsx
import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";
import type { ReactNode } from "react";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    // Privy not configured, render children without provider
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7dd87d",
          logo: "/images/regen-civics-logo.webp",
        },
        loginMethods: ["email", "google", "apple", "wallet"],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        supportedChains: [base],
        defaultChain: base,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

### Wrap the app

In `client/src/main.tsx` (or wherever the app root is), wrap with PrivyAuthProvider:

```tsx
// Add this import
import { PrivyAuthProvider } from "./_core/providers/PrivyAuthProvider";

// Wrap the existing app tree
<PrivyAuthProvider>
  {/* existing providers and Router */}
</PrivyAuthProvider>
```

Place `PrivyAuthProvider` OUTSIDE the tRPC/QueryClient providers so it initializes first.

---

## 9. Client-Side: AuthDialog Rewrite

Replace `client/src/components/AuthDialog.tsx` with a version that uses Privy when available, falls back to legacy.

```tsx
/**
 * AuthDialog -- Unified auth modal.
 * Uses Privy when VITE_AUTH_PROVIDER=privy, otherwise legacy Google/Apple/email.
 */
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGoogleLoginUrl } from "@/const";

const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER ?? "privy";
const HAS_PRIVY = Boolean(import.meta.env.VITE_PRIVY_APP_ID);

// Lazy-import Privy hook only when needed
let usePrivyHook: (() => { login: () => void; ready: boolean; authenticated: boolean }) | null = null;
if (HAS_PRIVY && AUTH_PROVIDER === "privy") {
  import("@privy-io/react-auth").then((mod) => {
    usePrivyHook = mod.usePrivy;
  });
}

interface AuthDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function AuthDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: AuthDialogProps) {
  const usePrivy = AUTH_PROVIDER === "privy" && HAS_PRIVY ? usePrivyHook : null;

  // For Privy path: call Privy's login() which opens their own modal
  if (usePrivy) {
    return (
      <PrivyAuthDialog
        open={open}
        onLogin={onLogin}
        onOpenChange={onOpenChange}
        onClose={onClose}
      />
    );
  }

  // Legacy path: existing Google/Apple/email dialog
  return (
    <LegacyAuthDialog
      title={title}
      logo={logo}
      open={open}
      onLogin={onLogin}
      onOpenChange={onOpenChange}
      onClose={onClose}
    />
  );
}

/** Privy auth: opens Privy's modal directly, no custom dialog needed. */
function PrivyAuthDialog({
  open,
  onLogin,
  onOpenChange,
  onClose,
}: Pick<AuthDialogProps, "open" | "onLogin" | "onOpenChange" | "onClose">) {
  // This component will use the usePrivy hook from react-auth
  // The actual implementation uses the hook at render time
  const { login, ready, authenticated } = (usePrivyHook ?? (() => ({
    login: () => {},
    ready: false,
    authenticated: false,
  })))();

  useEffect(() => {
    if (open && ready && !authenticated) {
      login();
    }
  }, [open, ready, authenticated, login]);

  useEffect(() => {
    if (authenticated && open) {
      onLogin();
      onOpenChange?.(false);
      onClose?.();
    }
  }, [authenticated, open, onLogin, onOpenChange, onClose]);

  // Privy renders its own modal, so return nothing
  return null;
}

/** Legacy auth dialog (current implementation, preserved as fallback). */
function LegacyAuthDialog({
  title,
  logo,
  open = false,
  onOpenChange,
  onClose,
}: AuthDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!onOpenChange) setInternalOpen(open);
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) {
      onClose?.();
      setEmail("");
      setEmailSent(false);
      setEmailError("");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailLoading(true);
    setEmailError("");
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const isOpen = onOpenChange ? open : internalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="py-5 bg-[#0d2818] rounded-[20px] w-[400px] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.4)] border border-[#7dd87d]/20 p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-6 pt-10">
          {logo ? (
            <div className="w-14 h-14 bg-[#1a472a] rounded-xl border border-[#7dd87d]/20 flex items-center justify-center mb-1">
              <img src={logo} alt="Dialog graphic" className="w-9 h-9 rounded-md" width={36} height={36} loading="lazy" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-[#1a472a] rounded-full border border-[#7dd87d]/30 flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#7dd87d]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          {title && (
            <DialogTitle className="text-xl font-semibold text-white leading-snug">
              {title}
            </DialogTitle>
          )}
          <DialogDescription className="text-sm text-white/50">
            Sign in to continue
          </DialogDescription>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-3">
          {emailSent ? (
            <div className="rounded-xl bg-[#1a472a]/60 border border-[#7dd87d]/30 p-4 text-center">
              <p className="text-[#7dd87d] font-semibold mb-1">Check your email!</p>
              <p className="text-white/60 text-sm">
                A login link was sent to <strong className="text-white/80">{email}</strong>. It expires in 15 minutes.
              </p>
            </div>
          ) : (
            <>
              <a
                href={getGoogleLoginUrl()}
                className="flex items-center justify-center gap-3 w-full h-11 rounded-xl bg-white text-[#1a1a19] font-medium text-sm hover:bg-white/90 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285f4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34a853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fbbc05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ea4335"/>
                </svg>
                Continue with Google
              </a>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/55 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 rounded-xl bg-[#1a472a]/40 border border-[#7dd87d]/20 text-white placeholder-white/55 px-4 text-sm focus:outline-none focus:border-[#7dd87d]/50"
                />
                {emailError && (
                  <p className="text-red-400 text-xs text-left">{emailError}</p>
                )}
                <Button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full h-11 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl text-sm"
                >
                  {emailLoading ? "Sending..." : "Send login link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

IMPORTANT: The above is the full replacement. The PrivyAuthDialog component triggers Privy's built-in modal (which handles Google, Apple, email, and wallet connect). The LegacyAuthDialog is the current code preserved exactly.

---

## 10. Client-Side: useAuth Hook Update

Create `client/src/_core/hooks/usePrivyAuth.ts`:

```tsx
/**
 * usePrivyAuth -- Auth hook that uses Privy as the primary auth provider.
 * Sends the Privy access token to the server on every tRPC request.
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

  // Keep a fresh access token in a ref for the tRPC link to read
  useEffect(() => {
    if (!authenticated) {
      tokenRef.current = null;
      return;
    }
    const refresh = async () => {
      const token = await getAccessToken();
      tokenRef.current = token;
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
    } catch {}
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
```

### Update the main useAuth hook to delegate

Update `client/src/_core/hooks/useAuth.ts`:

```typescript
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

export function useAuth(options?: UseAuthOptions) {
  // If Privy is the auth provider, delegate to usePrivyAuth
  if (AUTH_PROVIDER === "privy" && HAS_PRIVY) {
    // Dynamic import handled at module level
    return usePrivyAuthWrapper(options);
  }
  return useLegacyAuth(options);
}

function usePrivyAuthWrapper(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};

  // Import the hook
  const { usePrivyAuth } = require("./usePrivyAuth");
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
```

### tRPC Link: Attach Privy Token to Requests

The tRPC client with `httpBatchLink` is created in `client/src/main.tsx` (lines ~108-123), not in `trpc.ts`. The headers function already reads the CSRF token. Update it to also attach the Privy access token.

In `client/src/main.tsx`, find the `httpBatchLink` headers function and add the Privy token:

```typescript
// In main.tsx, update the httpBatchLink headers function:
httpBatchLink({
  url: "/api/trpc",
  headers: () => {
    const headers: Record<string, string> = {};

    // Attach Privy access token if available
    if (typeof window !== "undefined" && (window as any).__privyAccessToken) {
      headers["Authorization"] = `Bearer ${(window as any).__privyAccessToken}`;
    }

    // CSRF token (existing logic -- preserve getCsrfToken() call)
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }

    return headers;
  },
}),
```

In the `usePrivyAuth` hook, set the global token so the link can read it:

```typescript
// Inside the useEffect that refreshes the token:
useEffect(() => {
  if (!authenticated) {
    (window as any).__privyAccessToken = null;
    return;
  }
  const refresh = async () => {
    const token = await getAccessToken();
    (window as any).__privyAccessToken = token;
  };
  refresh();
  const interval = setInterval(refresh, 50 * 60 * 1000);
  return () => clearInterval(interval);
}, [authenticated, getAccessToken]);
```

NOTE: A cleaner alternative is to use a shared ref or React context. The window global approach is simpler and works reliably across the tRPC link boundary. If you prefer, create a `tokenStore.ts` singleton module instead.

---

## 11. Client-Side: Wallet UI for Hypha Bridge

The ClaimSeeds page currently collects `baseWalletAddress` manually. With Privy, the embedded wallet is created automatically. Update the relevant pages to read the wallet from Privy.

Create `client/src/_core/hooks/useBaseWallet.ts`:

```typescript
/**
 * useBaseWallet -- Returns the user's Base chain wallet address.
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
    address: auth.user?.baseWalletAddress ?? null,
    isEmbedded: false,
    loading: auth.loading,
  };
}
```

### Update BridgeHypha page

In `client/src/pages/BridgeHypha.tsx`, import and use `useBaseWallet()` to auto-populate the recipient wallet address instead of requiring manual input:

```typescript
import { useBaseWallet } from "@/_core/hooks/useBaseWallet";

// Inside the component:
const { address: walletAddress, isEmbedded } = useBaseWallet();
// Use walletAddress as the recipient when creating bridge payloads
```

### Update ClaimSeeds page

In `client/src/pages/ClaimSeeds.tsx`, if the user has an embedded Privy wallet, pre-fill the wallet address field and show a note that it was auto-detected:

```typescript
import { useBaseWallet } from "@/_core/hooks/useBaseWallet";

// Inside the component:
const { address: detectedWallet, isEmbedded } = useBaseWallet();

// In the wallet input section:
// If isEmbedded, show the address as read-only with a green checkmark
// If not, show the existing manual input field
```

---

## 12. Hypha Bridge Integration

The Hypha Bridge at `server/lib/hypha-bridge/` already reads `users.baseWalletAddress` to populate the recipient field in bridge payloads. With Privy, this address gets auto-populated from the embedded wallet on first login (via `linkOrCreatePrivyUser` in section 6).

No changes needed to the bridge module itself. The flow is:

1. User signs up via Privy -> embedded wallet created on Base
2. `linkOrCreatePrivyUser()` extracts the embedded wallet address and writes it to `users.baseWalletAddress`
3. When the user later triggers a bridge action, `buildPlayerContext()` in `prefill.ts` reads `users.baseWalletAddress` as before
4. The bridge payload goes to Hypha with the correct recipient address

### Signing Hypha Proposals

When Privy is active, the user can sign transactions directly through the embedded wallet. Add a helper to `client/src/lib/hypha-bridge-client.ts`:

```typescript
import { useWallets } from "@privy-io/react-auth";
import { base } from "viem/chains";

/**
 * Get an EIP-1193 provider from the Privy embedded wallet for Base chain.
 * Used when the bridge page needs the user to sign a transaction.
 */
export async function getBaseProvider() {
  const { wallets } = useWallets();
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  if (!embedded) return null;
  await embedded.switchChain(base.id);
  return embedded.getEthereumProvider();
}
```

This is used when the bridge needs the user to sign on-chain. Currently the bridge redirects to Hypha's UI for signing, so this is a forward-looking addition for when we build Path A (direct on-chain submission from our UI).

---

## 13. LocalScale Integration Point

LocalScale (localscale.org) is referenced as a partner for bioregional economic tools. The connection point is:

- Users have a LocalScale profile URL (stored via quest deliverables)
- Users participate in Rainbow Seeds Protocol experiments via LocalScale

With Privy, the same embedded wallet that works on Base can be used to interact with LocalScale if they adopt Base or any EVM chain. The integration path:

1. Store the user's LocalScale profile URL in `playerProfiles` (already happening via quests)
2. If LocalScale adds on-chain functionality on Base, the user's embedded Privy wallet is ready
3. No code changes needed now. When LocalScale provides an API or chain integration, extend the Hypha Bridge pattern: create a `localscale-bridge` module following the same architecture

---

## 14. On-Chain Balance Reads via Privy Wallet

The existing `server/blockchain.ts` uses raw `eth_call` via viem to read $REGEN and $RCivics balances. This continues working unchanged.

For client-side balance reads (useful for showing users their token balances in the UI), add a hook:

Create `client/src/_core/hooks/useTokenBalances.ts`:

```typescript
import { trpc } from "@/lib/trpc";
import { useBaseWallet } from "./useBaseWallet";

/**
 * Fetch on-chain $REGEN and $RCivics balances for the current user's wallet.
 * Delegates to the server's blockchain.ts which does the actual RPC calls.
 */
export function useTokenBalances() {
  const { address } = useBaseWallet();

  const balanceQuery = trpc.wallet.balances.useQuery(
    { walletAddress: address! },
    {
      enabled: Boolean(address),
      refetchInterval: 60_000, // refresh every minute
      retry: 1,
    }
  );

  return {
    regen: balanceQuery.data?.regen ?? null,
    rcivics: balanceQuery.data?.rcivics ?? null,
    loading: balanceQuery.isLoading,
    error: balanceQuery.error,
  };
}
```

Add the server-side tRPC route in a new `server/routes/wallet.ts`:

```typescript
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { fetchTokenBalances } from "../blockchain";

export const walletRouter = router({
  balances: publicProcedure
    .input(z.object({
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }))
    .query(async ({ input }) => {
      const balances = await fetchTokenBalances(input.walletAddress);
      return balances;
    }),
});
```

Register this router in `server/routers.ts` alongside the existing routers:

```typescript
import { walletRouter } from "./routes/wallet";

// In the appRouter definition, add:
wallet: walletRouter,
```

---

## 15. Migration Strategy for Existing Users

### Automatic just-in-time migration

When an existing user logs in via Privy for the first time:

1. Privy authenticates them (email, Google, or Apple)
2. Server receives the Privy access token in the Authorization header
3. `createContext()` calls `verifyPrivyToken()` -> gets `privyDid`
4. `getUserByPrivyDid()` returns null (first time)
5. `linkOrCreatePrivyUser()` is called:
   - Fetches Privy profile with linked accounts
   - Extracts email from Privy
   - Searches for existing user by email match
   - If found: links `privyDid` + `baseWalletAddress` to existing user
   - If not found: tries Google openId match, then Apple openId match
   - If still not found: creates a new user with `openId: privy:...`
6. All subsequent requests use the Privy token and resolve to the same user

### No batch migration needed

Because we match by email, Google subject, and Apple subject, existing users will be automatically linked on their next login. No batch import is required.

### Edge cases

**Same email, different providers**: If a user signed up with Google (email: alice@example.com) and now logs in via Privy with email magic link (same email), the linking function matches by email and links the accounts.

**Multiple accounts with same email**: The `users.email` column is not unique (unlike `openId`). The linking function takes the first match. If there are multiple users with the same email (shouldn't happen, but defensive), it links to the oldest one.

**User has no email**: If a user signed up with Apple and declined to share email, they have no email in the database. The linking function falls back to matching by Apple subject ID through Privy's linked accounts.

---

## 16. Fallback Toggle

To revert to legacy auth at any time:

1. Set `VITE_AUTH_PROVIDER=legacy` in Railway env vars
2. Redeploy

This causes:
- Client: `useAuth` delegates to `useLegacyAuth`, AuthDialog shows Google/Apple/email
- Server: `createContext` still tries Privy first (for users who already linked), but new logins go through legacy OAuth routes
- No data loss. `privyDid` and `baseWalletAddress` stay in the database

To fully disable Privy:
1. Remove `VITE_PRIVY_APP_ID` from env vars
2. The PrivyProvider renders children without wrapping
3. All auth goes through legacy

---

## 17. File-by-File Change List

### New files

| File | Purpose |
|------|---------|
| `server/_core/privy.ts` | Privy client init, token verification, user fetch |
| `client/src/_core/providers/PrivyAuthProvider.tsx` | PrivyProvider wrapper component |
| `client/src/_core/hooks/usePrivyAuth.ts` | Privy-based auth hook |
| `client/src/_core/hooks/useBaseWallet.ts` | Base wallet address hook (Privy or manual) |
| `client/src/_core/hooks/useTokenBalances.ts` | On-chain balance read hook |
| `client/src/lib/hypha-bridge-client.ts` | Client-side bridge helpers (provider access) |
| `server/routes/wallet.ts` | Wallet balance tRPC route |
| `drizzle/0091_privy_auth_fields.sql` | DB migration for privyAccessTokenHash |

### Modified files

| File | Changes |
|------|---------|
| `server/_core/env.ts` | Add privyAppId, privyAppSecret, authProvider to ENV |
| `server/_core/context.ts` | Dual-auth: try Privy Bearer token, fall back to JWT cookie. Add authMethod to context type. |
| `server/db.ts` | Add getUserByPrivyDid(), linkOrCreatePrivyUser(), updateUser() |
| `server/routes/auth.ts` | Add linkPrivy mutation |
| `drizzle/schema.ts` | Add privyAccessTokenHash column |
| `client/src/main.tsx` | Wrap app with PrivyAuthProvider |
| `client/src/_core/hooks/useAuth.ts` | Delegate to usePrivyAuth when VITE_AUTH_PROVIDER=privy |
| `client/src/components/AuthDialog.tsx` | Privy modal path + legacy fallback |
| `client/src/main.tsx` | Wrap with PrivyAuthProvider + attach Authorization Bearer header in httpBatchLink headers |
| `client/src/pages/BridgeHypha.tsx` | Use useBaseWallet() for auto wallet detection |
| `client/src/pages/ClaimSeeds.tsx` | Pre-fill wallet from Privy embedded wallet |
| `server/routers.ts` | Register walletRouter in the app router |
| `package.json` | Add @privy-io/react-auth, @privy-io/server-auth, wagmi, @tanstack/react-query |

### Unchanged files (explicitly preserved)

| File | Why |
|------|-----|
| `server/_core/oauth.ts` | Legacy auth routes stay active |
| `server/_core/sdk.ts` | JWT session logic stays active |
| `server/_core/trpc.ts` | Middleware unchanged, user comes from context |
| `server/lib/hypha-bridge/*` | Bridge module unchanged, reads baseWalletAddress as before |
| `server/blockchain.ts` | Raw viem RPC calls unchanged |
| `shared/const.ts` | Cookie name, constants unchanged |

---

## 18. Done Criteria

### Must pass before shipping

- [ ] `npm install` succeeds with new dependencies
- [ ] `npm run check` (tsc --noEmit) passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Migration 0091 applied to Railway DB
- [ ] With `VITE_AUTH_PROVIDER=privy`: clicking "Sign In" opens Privy modal
- [ ] Privy modal shows Google, Apple, email, and wallet connect options
- [ ] Signing in via Privy Google creates/links user with correct email
- [ ] Signing in via Privy email magic link creates/links user
- [ ] After Privy login, `auth.me` tRPC query returns the user object
- [ ] `users.privyDid` is populated after first Privy login
- [ ] `users.baseWalletAddress` is populated from embedded wallet
- [ ] Existing user logging in via Privy (same email) gets linked to same account (not duplicated)
- [ ] Protected tRPC routes work with Privy auth (Bearer token in header)
- [ ] Admin routes work for Privy-authenticated admin users
- [ ] With `VITE_AUTH_PROVIDER=legacy`: old Google/Apple/email dialog appears
- [ ] Legacy JWT sessions still work when Privy token is absent
- [ ] BridgeHypha page reads wallet address from embedded wallet
- [ ] ClaimSeeds page pre-fills wallet from embedded wallet
- [ ] Token balance query returns $REGEN and $RCivics balances
- [ ] `npm run test` passes (existing tests should not break)
- [ ] No console errors on page load
- [ ] CSRF protection still works for legacy sessions

### Stretch (not blocking ship)

- [ ] Profile page shows linked Privy accounts
- [ ] Profile page shows Base wallet address with copy button
- [ ] Admin can see which users have linked Privy in the admin panel
- [ ] Privy webhook configured for wallet creation events
- [ ] LocalScale profile URL linked to Privy identity

---

## Execution Order for Claude Code

1. Install dependencies (`npm install`)
2. Create `drizzle/0091_privy_auth_fields.sql` and apply migration
3. Update `drizzle/schema.ts`
4. Create `server/_core/privy.ts`
5. Update `server/_core/env.ts`
6. Add db functions to `server/db.ts`
7. Update `server/_core/context.ts`
8. Add linkPrivy to `server/routes/auth.ts`
9. Create `server/routes/wallet.ts` and register in app router
10. Create `client/src/_core/providers/PrivyAuthProvider.tsx`
11. Create `client/src/_core/hooks/usePrivyAuth.ts`
12. Create `client/src/_core/hooks/useBaseWallet.ts`
13. Create `client/src/_core/hooks/useTokenBalances.ts`
14. Update `client/src/_core/hooks/useAuth.ts`
15. Update `client/src/components/AuthDialog.tsx`
16. Update `client/src/lib/trpc.ts`
17. Update `client/src/main.tsx`
18. Update `client/src/pages/BridgeHypha.tsx`
19. Update `client/src/pages/ClaimSeeds.tsx`
20. Run `npm run check` and fix type errors
21. Run `npm run build` and fix build errors
22. Run `npm run test` and fix failing tests

## Handoff Breakdown

### Claude Code can do autonomously

| # | Task |
|---|------|
| 1 | Install npm dependencies |
| 2 | Create migration SQL file |
| 3 | Update schema.ts |
| 4-9 | All server-side file creation and modifications |
| 10-19 | All client-side file creation and modifications |
| 20-22 | Type checking, build, and test runs |

### Rye must do

| # | Task | Why |
|---|------|-----|
| 1 | Copy PRIVY_APP_SECRET from Privy dashboard (Settings > App secrets) and add to Railway env vars | Secret is only visible in the Privy dashboard UI |
| 2 | Add VITE_PRIVY_APP_ID=cmnt8kp5i01bm0cjixnxsrlpw to Railway env vars | Railway env var access |
| 3 | Add VITE_AUTH_PROVIDER=privy to Railway env vars | Railway env var access |
| 4 | Run migration 0091 in Railway DB (or use `npx tsx scripts/run-migration.ts drizzle/0091_privy_auth_fields.sql`) | DB access required |
| 5 | Git push after Claude Code commits | Git push access |
| 6 | Test login flow on deployed site | Browser verification |
| 7 | Verify Privy dashboard shows connected users | Privy dashboard access |
