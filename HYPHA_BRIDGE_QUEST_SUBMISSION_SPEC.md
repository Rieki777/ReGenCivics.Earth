# Hypha Bridge: Quest Submission Pre-fill Spec

**Date:** 2026-04-11
**Author:** Claude (CTO pass)
**Status:** Ready for PR work
**Companion docs:** `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md`, `COMMUNITY_AGREEMENTS_PLAN.md`

---

## What this solves

Right now players who complete a ReGen Civics quest land on a blank Hypha proposal creation form. They have to manually type the proposal title, description, token amounts, and paste in their deliverable link. Most drop off before finishing.

The bridge we've built (see `server/lib/hypha-bridge/`) handles all the data packaging. All we need from Hypha is for their `propose-contribution` creation page to read URL search params and use them as form defaults. The rest is already done on our side.

---

## What we've built on our side

### New intent and source type

- `server/lib/hypha-bridge/types.ts`: added `"quest_completion"` to `HyphaBridgeSource`
- `server/lib/hypha-bridge/intents.ts`: added `"quest-completion"` intent pointing to `propose_contribution` form kind

### New tRPC procedure: `hyphaBridge.createFromQuest`

`server/routes/hyphaBridge.ts` now has a `createFromQuest` mutation that:

1. Accepts `questId`, `questTitle`, `questDescription`, `questDeliverable`, `regenReward`, `deliverableUrl`, and optional `leadImageUrl`
2. Builds a description string that includes the quest context, deliverable, and the player's link
3. Packages a `HyphaBridgePayload` with payouts set to the quest's $ReGen reward against the token contract `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
4. Creates the bridge record and returns `bridgeKey + bridgeUrl`

### New UI component: `SubmitToDAOModal`

`client/src/components/SubmitToDAOModal.tsx`:

- Opens when a player clicks "Submit Proposal on DAO" on any quest card
- Asks for their video/article URL
- If they don't have one: shows a friendly message asking them to come back when they do
- If they have one: calls `createFromQuest`, then redirects to `/bridge/hypha/:key`

### Wired into two locations

1. **`client/src/pages/Quest.tsx`** - the main quest cards (both "How to complete" section button)
2. **`client/src/components/QuestDetailModal.tsx`** - the "Finish this Quest" footer button

### The bridge page

`/bridge/hypha/:key` (already built in `client/src/pages/BridgeHypha.tsx`) shows:
- Proposal title
- Description preview
- Token amounts
- One big "Continue to Hypha" button

That button redirects to:
```
https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution
  ?bridgeKey=abc12345
  &title=[rc:abc12345] Quest 5: Rites of Love
  &description=...full description...
  &payouts=[{"amount":"99","token":"0x4E617cd..."}]
  &attachments=[{"url":"https://youtube.com/...","filename":"My deliverable"}]
```

---

## PRs needed from the Hypha team

### PR 1 (highest priority): Add searchParams support to propose-contribution page

**File:** `apps/web/src/app/[lang]/dho/[id]/@aside/agreements/create/propose-contribution/page.tsx`

**Current state:** Page only reads route params `{ lang, id }`. No searchParams.

**Change needed:** Add `searchParams` to the page props and pass initial values down to `CreateProposeAContributionForm`.

```typescript
// Current
type Props = {
  params: Promise<{ lang: Locale; id: string }>;
};

// After PR
type Props = {
  params: Promise<{ lang: Locale; id: string }>;
  searchParams: Promise<{
    bridgeKey?: string;
    title?: string;
    description?: string;
    recipient?: string;
    payouts?: string;       // JSON-stringified HyphaPayout[]
    attachments?: string;   // JSON-stringified HyphaAttachment[]
    leadImage?: string;
  }>;
};
```

Then pass to the form component:
```typescript
const sp = await searchParams;
<CreateProposeAContributionForm
  ...existingProps
  initialValues={{
    title: sp.title,
    description: sp.description,
    leadImage: sp.leadImage,
    attachments: sp.attachments ? JSON.parse(sp.attachments) : undefined,
    payouts: sp.payouts ? JSON.parse(sp.payouts) : undefined,
  }}
  bridgeKey={sp.bridgeKey}
/>
```

---

### PR 2: Apply initialValues as form defaultValues

**File:** `packages/epics/src/agreements/components/create-agreement-base-fields.tsx` (and wherever `CreateProposeAContributionForm` is defined)

**Change needed:** Accept an `initialValues` prop and use it to initialize the React Hook Form `defaultValues`.

The field names our bridge targets:

| Bridge field | Hypha form field | Notes |
|---|---|---|
| `title` | `title` | String, max 280 chars |
| `description` | `description` | Rich text, we send plain text |
| `leadImage` | `leadImage` | URL string for the quest card image |
| `attachments` | `attachments` | Array of `{ url, filename }` objects |
| `payouts` | Wherever token amounts are set | Array of `{ amount, token }` |

The existing `sessionStorage.getItem('resubmitFormData')` pattern in `create-agreement-base-fields.tsx` already handles `leadImage` and `attachments`. The PR just needs to extend it to cover `title`, `description`, and `payouts` as well, and also accept them as a prop (not just from sessionStorage, since sessionStorage doesn't transfer cross-origin).

A clean way to do this is to accept an `initialValues` prop that merges with whatever sessionStorage has, with `initialValues` taking priority.

---

### PR 3 (optional but nice): Echo the bridgeKey back on proposal creation

**File:** Wherever `ProposalCreated` events are emitted or wherever the form submits

**Change needed:** If a `bridgeKey` was passed in via searchParams, include it in the proposal title using the `[rc:bridgeKey]` marker format we already use.

Our bridge module (via `buildTitleWithMarker`) prepends `[rc:abc12345]` to the title before passing it to Hypha. This lets our Alchemy webhook receiver match the on-chain `ProposalCreated` event back to the bridge record and update the status automatically.

If the bridge key is already embedded in the title string we pass via searchParams, and Hypha just uses the title as-is, this PR isn't needed. But if Hypha strips or modifies the title, we'd need to pass `bridgeKey` separately and have Hypha re-embed it.

---

### PR 4 (longer term): Payout field pre-fill

The `payouts` field (which sets the token amount and type on the proposal) has a more complex UI than title/description. If Hypha's form reads `payouts` from searchParams, we can pre-fill the exact token amounts. Without this, players still see the right numbers on our bridge page and can type them in manually.

---

## The current fallback while PRs are pending

Before any Hypha PRs land:

1. Player clicks "Submit Proposal on DAO"
2. Gives us their deliverable URL
3. We create a bridge record and redirect to `/bridge/hypha/:key`
4. Bridge page shows them exactly what the proposal will say (title, description, token amounts)
5. They click "Continue to Hypha" which opens Hypha with all the URL params already in the URL
6. Hypha doesn't read those params yet, so the form is blank
7. Player can see our bridge page in the other tab and copy-paste

This is not ideal but it's still meaningfully better than what we have now (zero context, player has to remember everything themselves). And the moment PR 1 and 2 land, the form auto-fills and the copy-paste step goes away entirely.

---

## Token contract addresses (Base chain, ID 8453)

```
$ReGen:    0x4E617cd113364193d215d107AdD6fa50418AA2E4
$RCivics:  0x72e9B17a2F93A923D63666eC0a1c096B1443ef26
```

## Hypha DHO slugs

```
regen-games   (the game DHO, where quest proposals go)
regen-civics  (the fund DHO)
```

## Proposal creation URL pattern

```
https://app.hypha.earth/en/dho/{dho-slug}/agreements/create/propose-contribution
```

---

## Testing the full flow

Once the Hypha PRs land, the e2e test is:

1. Go to regencivics.earth/quest
2. Find any quest card and click "Submit Proposal on DAO"
3. Enter a video URL (e.g. any YouTube link)
4. Click "Continue to Hypha"
5. On the bridge page, verify: title, description, token amounts all look correct
6. Click "Continue to Hypha"
7. Verify Hypha form has title, description, token amounts pre-filled
8. Add any required fields (Hypha may require a wallet connection, space membership, etc.)
9. Click Publish
10. Check that the bridge record status updates to `on_chain_detected` via Alchemy webhook

---

## Files changed in this sprint

```
server/lib/hypha-bridge/types.ts        added "quest_completion" source type
server/lib/hypha-bridge/intents.ts      added "quest-completion" intent
server/routes/hyphaBridge.ts            added createFromQuest procedure
client/src/components/SubmitToDAOModal.tsx   NEW component
client/src/pages/Quest.tsx              wired Submit Proposal button to modal
client/src/components/QuestDetailModal.tsx  wired Finish this Quest to modal
```
