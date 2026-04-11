# Privy Authentication Archive

Archived 2026-04-11. Privy was paused due to the $300/month cost for sharing data with LocalScale and Hypha. The legacy auth system (Google OAuth, Apple OAuth, Email Magic Links with JWT cookies) is the active auth method.

## What's here

These are the Privy-specific files and the dual-auth versions of shared files, preserved exactly as they were when Privy was active:

- `usePrivyAuth.ts` -- Client hook for Privy token management (window.__privyAccessToken pattern)
- `PrivyAuthProvider.tsx` -- React wrapper with PrivyProvider config (Base chain, embedded wallets)
- `privy.ts` -- Server-side PrivyClient, token verification, user fetching
- `context.ts.privy-version` -- Dual-auth tRPC context (tries Privy Bearer first, falls back to JWT cookie)
- `useAuth.ts.privy-version` -- Unified hook that delegates to Privy or legacy based on VITE_AUTH_PROVIDER env var
- `auth.ts.privy-version` -- Auth routes with syncEmail and linkPrivy mutations
- `db.ts.privy-version` -- DB layer with getUserByPrivyDid() and linkOrCreatePrivyUser()

## To restore Privy

1. Copy these files back to their original locations (see paths below)
2. Add `@privy-io/react-auth` and `@privy-io/server-auth` back to package.json
3. Set env vars: PRIVY_APP_ID, PRIVY_APP_SECRET, VITE_PRIVY_APP_ID, VITE_AUTH_PROVIDER=privy
4. The DB columns (privyDid, baseWalletAddress, privyAccessTokenHash) are still in the schema

## Original file locations

```
usePrivyAuth.ts           -> client/src/_core/hooks/usePrivyAuth.ts
PrivyAuthProvider.tsx      -> client/src/_core/providers/PrivyAuthProvider.tsx
privy.ts                   -> server/_core/privy.ts
context.ts.privy-version   -> server/_core/context.ts
useAuth.ts.privy-version   -> client/src/_core/hooks/useAuth.ts
auth.ts.privy-version      -> server/routes/auth.ts
db.ts.privy-version        -> server/db.ts
```

## Privy App ID

`cmnt8kp5i01bm0cjixnxsrlpw` (from PRIVY_AUTH_MIGRATION_SPEC.md)

## Related docs (still in repo root)

- PRIVY_AUTH_MIGRATION_SPEC.md -- Full implementation spec
- PRIVY_INTEGRATION_RECOMMENDATION.md -- Integration rationale
