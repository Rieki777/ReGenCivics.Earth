# Privy Integration Recommendation for ReGen Civics

## What Privy Is

Privy is wallet infrastructure for apps that need to give users blockchain wallets without making them deal with seed phrases, browser extensions, or gas fees. It handles key management, embedded wallet creation, and transaction signing through a single SDK. Over 50 million accounts use Privy-powered wallets in production.

The core product: when a user logs in (via email, social, passkey, or external wallet), Privy can auto-create an embedded wallet for them. The wallet keys are split across secure enclaves so no single party holds the full key. Users can sign transactions, hold tokens, and interact with smart contracts without ever leaving your app.

Privy supports all EVM chains (Ethereum, Base, Arbitrum, etc.) and Solana. Base support is native, which matters because our token contracts ($REGEN and $RCivics) live on Base.

## Why This Matters for ReGen Civics

Three things converge here:

1. Hypha and Localscale both use Privy for identity. When our players bridge to Hypha to formalize proposals, they currently land in Hypha's auth system cold. If we share Privy as the identity layer, the handoff becomes a recognized session rather than a new login.

2. We store `baseWalletAddress` and `walletAddress` in our database already, but players have to bring their own wallet and paste the address manually. Privy would let us create a wallet for every player at signup, so every account is wallet-ready from day one.

3. The $RCivics and $ReGen token flows (contribution claims, crowdpool payouts, gratitude distributions) all need a wallet to land in. Right now those flows dead-end at "paste your wallet address." With Privy embedded wallets, the tokens go straight to the player's in-app wallet.

## Current Auth System (What We Have)

ReGen Civics uses a custom OAuth setup:

- Google OAuth and Apple OAuth for social login
- Email magic links as fallback
- JWT sessions signed with `jose`, stored in httpOnly cookies
- User identity keyed on `openId` (e.g., `google:12345`, `apple:67890`, `email:rye@example.com`)
- No wallet libraries installed (no ethers, wagmi, or viem)
- Wallet addresses stored as plain strings in the DB, not used for signing

The auth code lives in `server/_core/oauth.ts` (route handlers), `server/_core/sdk.ts` (JWT creation/verification), and `server/_core/context.ts` (tRPC context).

## Two Integration Pathways

### Pathway A: Privy as Auth Provider (Full Replace)

Replace Google/Apple/Email auth entirely with Privy's login modal. Privy handles all authentication and creates an embedded wallet automatically on first login.

What this gives you: one SDK handles both auth and wallets. Privy supports Google, Apple, email OTP, SMS, passkey, and external wallet login, so you keep all existing login methods plus gain new ones.

What it costs: every existing user session breaks on deploy. All `openId` values in the database need remapping to Privy user IDs. The auth flow changes completely. The custom OAuth code gets deleted.

Risk level: high. This is a full auth migration with no rollback path.

### Pathway B: Privy as Wallet Layer Only (Custom Auth)

Keep your existing Google/Apple/email auth exactly as-is. Add Privy alongside it using their "custom auth provider" integration. Your server mints JWTs that Privy trusts, and Privy creates embedded wallets for authenticated users without replacing the login flow.

What this gives you: embedded wallets for every player, shared identity layer with Hypha, zero disruption to existing auth.

What it costs: Privy's custom auth integration is an Enterprise feature (requires contacting their sales team for pricing). Setup is more complex because you configure Privy to accept your existing JWTs.

Risk level: low. Existing auth stays untouched. Privy is additive.

## Recommendation: Pathway B (Custom Auth + Wallets)

Pathway B is the right call for three reasons:

Your auth system works. Google, Apple, and email magic links are stable, tested, and handle the non-crypto audience well. Ripping that out creates risk with no upside for existing users.

The wallet layer is what you actually need. The gap in the current system is wallets, specifically embedded wallets that work without MetaMask or Coinbase Wallet. Privy fills exactly that gap.

Hypha alignment happens through the wallet, not the login. When a player bridges to Hypha, what matters is that they arrive with a recognized wallet address. Privy's embedded wallet on Base gives them that. The login method (Google vs. Privy modal) is irrelevant to the bridge.

## Integration Architecture

Here's what the build looks like, broken into phases.

### Phase 1: Foundation (can ship independently)

Install `@privy-io/react-auth` and `@privy-io/server-auth`. Create a Privy app on their dashboard. Register your existing JWT issuer as a custom auth provider in the Privy dashboard (you provide your JWKS endpoint or public verification key so Privy trusts your tokens).

Add `PrivyProvider` to the React component tree, wrapping it around the app in `client/src/main.tsx`. Configure it with:

```typescript
<PrivyProvider
  appId={import.meta.env.VITE_PRIVY_APP_ID}
  config={{
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
    supportedChains: [base],
    defaultChain: base,
    appearance: {
      theme: 'dark',
      accentColor: '#your-brand-color',
      logo: '/your-logo.png',
      showWalletLoginFirst: false,
    },
  }}
>
```

With custom auth, you do NOT use Privy's login modal. Your existing login flow stays. After a user authenticates through Google/Apple/email, the Privy SDK syncs automatically because it trusts your JWT.

On the server side, add `@privy-io/server-auth` to verify Privy access tokens when needed (e.g., when a user initiates a bridge transaction or signs something).

Environment variables needed: `VITE_PRIVY_APP_ID`, `PRIVY_APP_SECRET`.

### Phase 2: Wallet Creation and Display

After a user logs in, check if they have a Privy embedded wallet. If not, create one automatically using `usePrivy().createWallet()`. Store the wallet address in the existing `baseWalletAddress` field on the users table.

Build a simple wallet display component for the player profile: show the Base address, copy button, and a link to view on Basescan. No send/receive UI yet, just visibility.

Update the Hypha Bridge payload builder (`server/lib/hypha-bridge/prefill.ts`) to pull the Privy embedded wallet address as the default `baseWallet` instead of requiring manual entry.

### Phase 3: Transaction Signing

This is where the real value lands. With `useSendTransaction` and `useSignMessage` from Privy's SDK, you can:

- Let players sign contribution claims in-app (no MetaMask popup)
- Execute token transfers for crowdpool payouts
- Sign Hypha proposal pre-fill tokens cryptographically

The bridge handoff to Hypha becomes: player clicks "Formalize on Hypha" -> bridge creates the payload -> Privy signs a verification message -> player arrives at Hypha already authenticated with their wallet.

### Phase 4: Smart Wallets (Optional, Future)

Privy supports smart contract wallets (account abstraction) with gas sponsorship. This means players could execute on-chain actions without holding ETH for gas. Worth exploring after the base integration is stable, especially for onboarding non-crypto players who should never have to think about gas.

## What Changes in the Codebase

Files that get new code:

- `client/src/main.tsx` or a new `client/src/providers/PrivyProvider.tsx`: wrap app with PrivyProvider
- `client/src/components/WalletDisplay.tsx` (new): shows embedded wallet address on profile
- `server/lib/hypha-bridge/prefill.ts`: use Privy wallet address as default
- `server/_core/env.ts`: add PRIVY_APP_ID and PRIVY_APP_SECRET
- `package.json`: add `@privy-io/react-auth`, `@privy-io/server-auth`

Files that stay untouched:

- `server/_core/oauth.ts`: existing auth flow unchanged
- `server/_core/sdk.ts`: JWT signing unchanged (Privy reads your JWTs, you don't change them)
- `server/_core/context.ts`: tRPC context unchanged
- `server/routes/auth.ts`: login/logout flow unchanged

## Enterprise Pricing Note

The custom auth provider feature (Pathway B) requires Privy's Enterprise plan. Their Developer plan (free, 50K monthly signatures) only supports Privy-native login. You'll need to contact Privy's sales team to get Enterprise pricing. Given that Hypha and Localscale are already Privy customers, there may be partner pricing or a warm intro available.

If Enterprise pricing is prohibitive, Pathway A (full auth replace) works on the Developer plan. The tradeoff is the auth migration effort and user disruption.

## Steps for Rye

1. Create a Privy account at dashboard.privy.io and set up an app
2. Contact Privy sales about Enterprise pricing for custom auth (mention Hypha/Localscale partnership)
3. If Enterprise is accessible: proceed with Pathway B (wallet-only integration)
4. If Enterprise is too expensive: evaluate Pathway A (full auth replace) against the migration cost
5. Share the Privy App ID so Claude Code can wire up Phase 1

## Steps Claude Code Can Do

Once Rye provides the Privy App ID:

1. Install packages (`@privy-io/react-auth`, `@privy-io/server-auth`)
2. Add PrivyProvider wrapper to the React app
3. Build the WalletDisplay component
4. Update Hypha Bridge prefill to use embedded wallet
5. Add environment variable scaffolding
6. Write the migration to backfill wallet addresses for existing users who connect
