# Hypha Bridge

The single module every ReGen Civics -> Hypha handoff flows through.

## Why this exists

Hypha runs on Base (Coinbase L2). Every time a player crosses from ReGen Civics into Hypha to act on-chain (formalize a forum decision, propose a contribution, redeem internal tokens, file an expense), the handoff has to:

1. Carry the player's context across so the Hypha form is pre-filled
2. Be matchable back to our database when the on-chain event lands
3. Survive the round-trip without losing the originating reference

The Hypha Bridge is that pattern. One module. One database table (`hyphaBridges`). One bridge page (`/bridge/hypha/[bridgeKey]`). One Alchemy webhook receiver (`/api/webhooks/hypha-alchemy`).

## The hard rule (enforced by CLAUDE.md)

**Never construct an `app.hypha.earth` URL outside this module.** Any code that needs to send a player to Hypha calls `bridgeToHypha(intentName, payload)` and uses the returned `bridgeUrl`. Adding a new touchpoint means adding a new intent in `intents.ts`, not hand-rolling another redirect.

## File map

| File | Responsibility |
|---|---|
| `index.ts` | Public API. `createHyphaBridge`, `bridgeToHypha`, `getBridge`, `buildHyphaTargetUrl`. The only place hypha.earth URLs are built. |
| `types.ts` | `HyphaBridgePayload`, `HyphaFormKind`, `HyphaBridgeStatus`, etc. |
| `intents.ts` | `KNOWN_INTENTS` registry. Add a new intent here when a new touchpoint ships. |
| `prefill.ts` | Player context loader, title marker helpers, `payloadToSearchParams`. |
| `webhook-receiver.ts` | Express handler for Alchemy webhooks. Matches events back to bridges via title marker (primary) or recipient + amount (fallback). |

## Lifecycle of a bridge

```
created  -->  handoff_sent  -->  on_chain_detected  -->  passed
                                                    \->  failed
                                                    \->  cancelled
```

1. **created.** A source system calls `bridgeToHypha`. Row inserted with `status='created'`.
2. **handoff_sent.** The user clicks Continue on the bridge page. We redirect them to Hypha. Status updates.
3. **on_chain_detected.** Alchemy fires `ProposalCreated`. We match the title marker back to our row, store the proposal ID and tx hash.
4. **passed.** Alchemy fires `ProposalExecuted`. We store the final amount, recipient, basescan URL, and the originating source page (forum thread, crowdpool card, contribution claim) gets a receipt reply.

## Adding a new touchpoint

1. Add an entry to `KNOWN_INTENTS` in `intents.ts`. Pick a `name`, `source`, and `formKind`.
2. In your source system, build a `HyphaBridgePayload` and call `bridgeToHypha(intentName, payload)`.
3. Redirect the user to the returned `bridgeUrl`.
4. That's it. The bridge page, the Alchemy webhook, and the database all already handle the rest.

## The 11 Hypha form kinds

The full list of Hypha agreement creation routes lives at `app.hypha.earth/[lang]/dho/[id]/agreements/create/[kind]`:

- `propose-contribution` (the most common one)
- `deploy-funds`
- `pay-for-expenses`
- `membership-exit`
- `buy-hypha-tokens`
- `redeem-tokens`
- `activate-spaces`
- `change-entry-method`
- `change-voting-method`
- `space-settings-transparency`
- `space-to-space-membership`

The bridge module's `formKind` enum mirrors these in underscore form. The URL converter in `index.ts` handles the kebab-case translation when constructing the redirect target.

## Token contracts on Base (Section 8 of the flow spec)

- `$REGEN`: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
- `$RCivics`: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`

These come from environment variables (`REGEN_TOKEN_ADDRESS_BASE`, `RCIVICS_TOKEN_ADDRESS_BASE`) so they can be swapped per environment. Source-system callers pass them as the `token` field on payouts.

## Three pre-fill strategies

In order of preference, per the FORUM_LOOMIO_HYPHA_FLOW_SPEC Section 3.1:

- **Path A:** Upstream PR to `hypha-dao/hypha-web` adding `searchParams` reading to the create page components. Cleanest long-term answer. The bridge already constructs URLs in this format via `payloadToSearchParams`.
- **Path B:** Use Hypha's existing `useResubmitProposalData` hook (read from localStorage). We seed localStorage on our side right before redirecting. Zero-change integration if the hook reads from a stable key.
- **Path C:** Our own formalization page at `/bridge/hypha/[bridgeKey]` with copy-to-clipboard fallback. This is the safety net and ships first regardless.

## Spec reference

Full design lives in `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` Section 3 (The Hypha Bridge). CLAUDE.md restates the rule for any future Claude instance.
