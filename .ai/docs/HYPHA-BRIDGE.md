# Hypha Bridge (ReGen Civics to Hypha on Base)

Canonical reference for the ReGen Civics -> Hypha handoff. Summarized as a hard constraint in `STEERING.md` section 6; this file holds the full operational detail. Referenced from `/CLAUDE.md`.

Hypha runs on Base (Coinbase L2, chain ID 8453). Anytime a player moves from ReGen Civics to Hypha to act on-chain (formalizing a forum decision as a DHO proposal, bringing a crowdpool contribution proposal to a land project DHO, submitting a historical contribution claim, buying Hypha tokens through our flow, etc.), the handoff MUST go through the Hypha Bridge module.

The Hypha Bridge module lives at `apps/web/src/lib/hypha-bridge/` and is responsible for:

1. Collecting player context from our MySQL ledger (internal token balance, citizenship tier, bioregion, recent quests, contribution history, Harvest/Gratitude pool state)
2. Packaging that context into the field names Hypha's create-proposal forms expect (title, description, leadImage, attachments, spaceId, creatorId, recipient, payouts, label, etc.)
3. Generating a signed, short-lived pre-fill token keyed to a bridge key (title marker plus fuzzy match fallback) so Hypha can pick the context up on arrival
4. Redirecting the player to the correct Hypha route for the intent (the 11 creation routes: activate-spaces, buy-hypha-tokens, change-entry-method, change-voting-method, deploy-funds, membership-exit, pay-for-expenses, propose-contribution, redeem-tokens, space-settings-transparency, space-to-space-membership)
5. Watching Base via Alchemy webhooks for on-chain execution and writing events back to our ledger so claim thresholds, storyteller triggers, and citizenship tier updates all flow

Three pre-fill strategies are used in order of preference: (A) upstream PR to hypha-dao adding searchParams support to the creation forms, (B) our own `useResubmitProposalData` style hook wrapped around Hypha's form, (C) our own formalization page that renders the same fields and posts through the bridge.

## Token contracts on Base (chain id 8453)

- `$REGEN`: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
- `$RCivics`: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`
- `RGVoice`: `0x4d848B3f2D74D1D2f6c75c55d0751DAB8FC7D707`
- `RCVoice`: not yet deployed

## Railway env var names

Server reads these at startup, falls back to the hard-coded defaults in `server/blockchain.ts` if unset:

- `REGEN_TOKEN_CONTRACT`
- `RCIVICS_TOKEN_CONTRACT`
- `RGVOICE_TOKEN_CONTRACT`
- `RCVOICE_TOKEN_CONTRACT` (optional; RCVoice reads are skipped if unset)

Relevant DHO slugs: `regen-games`, `regen-civics`. Hypha app base URL: `https://app.hypha.earth`.

## Rule for any future Claude Code instance

If the task involves moving a player or their data from ReGen Civics to Hypha for any reason, use the Hypha Bridge. Do not hand-roll new redirect logic. Extend the bridge with the new intent type instead. The full flow spec lives in `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`.
