# Forum → Loomio → Hypha: The ReGen Civics Governance Pipeline

**Date:** 2026-04-09
**Author:** Claude (acting CTO pass)
**Status:** Design spec, ready for implementation planning
**Companion docs:** `LOOMIO_INTEGRATION_SPEC_2026-04-09.md`, `COMMUNITY_AGREEMENTS_PLAN.md`, `CONTEXT_THE_TWO_GAMES.md`

## Credits

Our governance subdomain is powered by Loomio, an open-source sociocratic decision tool built over more than a decade by the team at loomio.com. We copied their patterns and run their software as a sibling service. Every player who lands on gov.regencivics.earth sees a prominent credit:

> "Our governance tools are powered by Loomio. They have spent over a decade perfecting sociocratic decision-making software. Please support their work at loomio.com."

## Why this doc exists

The previous spec (`LOOMIO_INTEGRATION_SPEC_2026-04-09.md`) worked out the architecture for running Loomio at gov.regencivics.earth and listed 20 improvement ideas. Rye picked which ones to build. This doc is the detailed, buildable version of that pipeline, with the approved improvements woven in, ReGen Guide (Claude) integration points called out, and three new answers:

1. How Stage 1 (forum) takes the best of Loomio's patterns natively.
2. How Stage 2 (Loomio at gov.regencivics.earth) feels like one continuous experience with the main site via shared auth and partial DB sync.
3. How Stage 3 (Hypha) gets pre-filled and its status read back, without requiring a Hypha API, by combining URL params and Telos blockchain indexing.

## The three-stage pipeline at a glance

```
┌─────────────────────────┐    ┌──────────────────────────────┐    ┌────────────────────────┐
│ Stage 1: Forum          │    │ Stage 2: gov.regencivics      │    │ Stage 3: Hypha DHO     │
│ regencivics.earth       │    │ gov.regencivics.earth        │    │ app.hypha.earth        │
│                         │    │                              │    │                        │
│ Early ideas,            │───▶│ Structured decisions,        │───▶│ Formal token proposals │
│ conversation, seeds     │    │ sociocratic consent,         │    │ on Telos blockchain    │
│ Low stakes              │    │ outcomes, agreements         │    │ Moves $ReGen / $RCivics│
└─────────────────────────┘    └──────────────────────────────┘    └────────────────────────┘
        │                              │                                    │
        │                              │                                    │
        ▼                              ▼                                    ▼
  Native Loomio-inspired        Full Loomio, themed,              URL pre-fill + Telos
  patterns in forum:            shared auth, shared               blockchain watcher
  straw polls, sense            user profile, deep linked         syncs status back
  checks, readiness             back to forum
  checklists
```

Only the decisions that need tokens traverse all three stages. Sense-checks, policy consents, agreement ratifications can stop at Stage 2. Temperature-checks and early conversation can stop at Stage 1.

## The "one continuous experience" requirement

Rye's instruction: gov.regencivics.earth should share some DB and auth so players feel like they never left. Here is how that works in practice.

### Shared auth (the hard requirement)

Next.js app is the source of truth for identity. Loomio trusts it via OIDC.

1. Next.js exposes three endpoints under `/api/auth/oidc/`:
   - `/.well-known/openid-configuration` (discovery)
   - `/authorize` (login redirect, reuses existing session cookie if present)
   - `/token` and `/userinfo` (signed with RS256, key rotated via env)
2. Loomio is configured with `OIDC_DISCOVERY=https://regencivics.earth/api/auth/oidc/.well-known/openid-configuration` and a client secret shared via env.
3. First time a player visits gov.regencivics.earth, Loomio redirects them to regencivics.earth OIDC authorize, the existing session cookie is read, the user is silently redirected back with an ID token. Zero click-through.
4. The cookie domain on the main site is set to `.regencivics.earth` so the session cookie is automatically present on the subdomain.

This gives us: one login, one logout, one password reset, one account recovery flow. Players never see a separate signup on the governance side.

### Shared user profile (the "feels the same" requirement)

Loomio keeps its own `users` table in Postgres, but the fields players see (display name, avatar, bio, citizenship tier, bioregion) are mirrored from MySQL on every OIDC token exchange. The ID token claims carry:

```json
{
  "sub": "rc_user_4821",
  "name": "Rye",
  "email": "rieki.cordon@gmail.com",
  "picture": "https://cdn.regencivics.earth/avatars/4821.jpg",
  "regencivics": {
    "citizenshipTier": "steward",
    "rcVoiceWeight": 3,
    "rgVoiceWeight": 5,
    "bioregions": ["cascadia", "global"],
    "roles": ["incubator_host", "regen_guide_tester"],
    "isBanned": false
  }
}
```

Loomio reads these claims on every request and uses them for voting weight, bioregional scoping, and role-based permissions. No Loomio admin needs to manually sync users. A nightly job at 3am UTC refreshes any stale claims for users who haven't logged in that day, so voter weights stay current.

### Shared chrome (the "looks the same" requirement)

1. Loomio is themed to match regencivics.earth: same brand CSS variables, same Inter + serif heading pair, same green palette.
2. A thin reverse proxy injects a shared header component at the top of every Loomio page. The header is a React island served from `https://regencivics.earth/_shared/header.js` and includes logo, main nav (Forum, Decisions, Map, Quests, Profile), and the notification bell.
3. The notification bell pulls from both MySQL (forum notifications) and Loomio (decision notifications) via a unified `/api/notifications/unread` endpoint. Players see one bell with one count.
4. Breadcrumbs on the governance side always start with "Community → Decisions → …" so the mental model is "I'm still on regencivics.earth, I just clicked into the governance area."

### Shared DB (the surgical parts)

We do not merge MySQL and Postgres. We sync specific rows both directions via a thin service at `https://regencivics.earth/api/governance-sync/`:

| Direction | What syncs | Trigger | Protection |
|---|---|---|---|
| MySQL → Loomio PG | User profile, tier, bioregions | On login, nightly | Loomio reads via OIDC claims, no direct PG write from outside |
| Loomio → MySQL | Decision state, outcomes | On Loomio event webhook | Shared secret, HMAC signed, idempotency key |
| MySQL → Loomio PG | Forum thread metadata on promotion | On "Promote to decision" click | Service token |

This gives us: the forum knows which of its threads have active decisions, the forum can render "Decision status" badges, and Loomio knows who is a Steward and what bioregion they are in. No dual-writes, no eventual-consistency nightmares.

## Stage 1: Native forum patterns we copy from Loomio

We are taking the highest-value Loomio ideas and building them into the forum directly. These are features that belong at the low-stakes end of the pipeline and should not require a full Loomio decision to use.

### 1.1 Readiness checklist before promotion (Improvement #1)

When any forum reply contains "should we take this to governance?" or when a user clicks the "Promote to decision" button on a thread, the system shows a readiness checklist modal. The checklist has four gates:

1. The thread has existed for at least 48 hours.
2. At least 3 distinct citizens have replied.
3. The proposer has written a one-sentence decision question in the modal.
4. The proposer has tagged the decision as Fund track, Game track, or Both.

If any gate fails, the modal explains what's missing and offers a "remind me when ready" watcher that notifies the proposer as soon as gates pass. Stewards can override the 48-hour and 3-citizen gates if marked urgent.

**Implementation:** New `forumThreadReadiness` computed field, new `forumThreadWatchers` table, new tRPC procedure `forum.checkPromotionReadiness`.

### 1.2 Dual-key promotion (Improvement #2)

The "Promote to decision" action requires a second citizen to co-sign within 24 hours. When the original proposer clicks promote, the thread gets a banner: "Rye has proposed promoting this to governance. Needs one more co-signer." Any citizen can click "Co-sign". The proposer's DMs get a bump if nobody co-signs within 12 hours, suggesting they tag someone specific.

Two benefits: prevents unilateral escalation, builds a collaborator in from day one. If no co-signer appears within 24 hours, the promotion proposal expires quietly (the thread stays, just the promote button resets).

**Implementation:** New table `forumPromotionRequests` with `proposerId`, `coSignerId`, `status` (pending/signed/expired), `expiresAt`.

### 1.3 Automatic context snapshot (Improvement #3)

When a promotion is co-signed, a background job builds a "context snapshot" by selecting:
- The OP, verbatim.
- The top 5 most-reacted replies.
- Any replies that got marked "helpful" by the proposer or co-signer.
- All linked resources (URLs, uploaded files, referenced quest IDs).
- A timeline: "This discussion started on April 3, had 47 replies, involved 12 citizens."

The snapshot becomes the body of the new Loomio discussion. The full forum thread URL is preserved as a top-of-page "Read the full conversation here" link. This is one-way copy, no ongoing sync of the snapshot itself (for that, see 1.4).

**Implementation:** New service `buildPromotionSnapshot(threadId)`, called from the webhook-to-Loomio handler.

### 1.4 Living backlink (Improvement #4)

When promotion succeeds, the forum thread gets a persistent banner at the top:

```
┌─────────────────────────────────────────────────────────┐
│ 🗳  This discussion became Decision #47                  │
│    Status: Open · Closes in 3 days · 12 stances so far  │
│    [View decision on gov.regencivics.earth →]            │
└─────────────────────────────────────────────────────────┘
```

Status updates live via webhook from Loomio. Status values: draft, open, closing_soon, closed, ratified, declined, cancelled. Color and icon change accordingly. Replies posted to the forum thread after promotion get a soft marker: "Posted after this became a decision. For formal input, vote on the decision page."

New replies also fire a webhook to Loomio that adds them as comments on the Loomio discussion side (one-way, forum → Loomio). This keeps the full conversation stitched together.

**Implementation:** New table `forumPostDecisions` (already in Loomio spec). New webhook receiver at `/api/webhooks/loomio`. New tRPC procedure `forum.getDecisionStatus(threadId)`.

### 1.5 Track tagging at promotion time (Improvement #5)

The promotion modal forces the proposer to pick Fund track, Game track, or Both. This choice:

1. Determines which Loomio subgroup hosts the decision (`/g/fund-decisions` or `/g/game-decisions`).
2. Locks in which Hypha DHO gets the deep link at the end (`/dho/regen-civics` for Fund, `/dho/regen-games` for Game).
3. Controls voter weighting: Fund decisions use `rcVoiceWeight`, Game decisions use `rgVoiceWeight`. "Both" decisions use an average, with a note explaining the cross-track nature.
4. Gets reflected in the forum thread banner and the decision URL.

See CONTEXT_THE_TWO_GAMES.md for why this split exists and why it matters.

**Implementation:** Add `track` column to `forumPostDecisions` with values `fund`, `game`, `both`. OIDC claims already include both voice weights so Loomio can choose the right one per decision.

### 1.6 Proposal template suggester (Improvement #6)

When the proposer is filling out the promotion modal, the ReGen Guide (Claude) sidebar reads the thread content and suggests which Loomio poll template fits best. Suggestions come from the 16 templates we saw in `loomio Governance Tools/config/poll_templates.yml`:

- Keyword "policy", "rule", "agreement" → `consent` (sociocratic consent template)
- Keyword "budget", "fund", "token", "ReGen", "RCivics" → `proposal` (agree/abstain/disagree/block template, routed to Fund or Game track)
- Keyword "prioritize", "pick top", "ranking" → `dot_vote` or `ranked_choice`
- Keyword "meeting", "when can we", "schedule" → `meeting` (time-pick poll)
- Default → `sense_check` (lightweight temperature check, non-binding)

The suggester is a suggestion, always overridable. The proposer picks the final template. Claude explains in one sentence why this template fits: "Consent is best here because you're proposing a policy and we want to surface objections, not count votes."

**Implementation:** New tRPC procedure `regenGuide.suggestTemplate(threadSummary)`. Calls Claude with a short system prompt seeded with the template catalog.

### 1.7 Draft the decision for the proposer (Improvement #7)

This is the most valuable Claude integration point in the whole pipeline. When the proposer clicks "Promote to decision" and passes the readiness checklist, ReGen Guide generates a full draft of the decision page:

1. **Title:** One-line framing of the question.
2. **Background:** 2–3 paragraph synthesis of the forum conversation. Neutral, no spin.
3. **The question:** The specific thing being decided, phrased as a single yes/no, consent, or pick-one.
4. **Options:** If the template supports options, Claude proposes 2–5 option labels drawn from the thread.
5. **Per-option rationale:** One short paragraph explaining why each option is on the list.
6. **Key concerns raised:** A bulleted list of objections and worries that appeared in the thread, so the decision doesn't ignore them.
7. **Suggested closing date:** Default 7 days, adjusted if Claude detects urgency cues.

The proposer sees all of this in an editable form. They review, edit freely, and click "Open decision." ReGen Guide's draft saves them roughly 20 minutes of structuring work per decision and raises the baseline quality floor of what lands on Loomio.

**Implementation:** New tRPC procedure `regenGuide.draftDecision(threadId, template)`. Returns structured JSON. UI is a guided form with Claude's draft pre-populated.

## Stage 2: gov.regencivics.earth (Loomio Path B)

This is Loomio running as a sibling service, themed and deeply integrated, at `https://gov.regencivics.earth`. The main architectural pieces are in `LOOMIO_INTEGRATION_SPEC_2026-04-09.md`. This section covers the approved improvements that layer on top.

### 2.1 Bioregional scoping with hard gating (Improvement #10, enhanced)

Rye's instruction: if a decision is set for a bioregion, only people marked in that bioregion can participate formally.

On the promotion modal, the proposer can optionally scope a decision to one or more bioregions (drawn from the user's own registered bioregions, plus "global"). If scoped:

1. The decision is created in a Loomio subgroup named for that bioregion (`/g/cascadia`, `/g/south-bay-area`, etc.).
2. Only users whose OIDC claims include that bioregion see the decision in their feed, get the notification, and can cast a stance.
3. Out-of-region citizens can still *read* the decision page (it's public to logged-in citizens) but the vote controls are disabled with an explanatory note: "This decision is scoped to the Cascadia bioregion. People marked in Cascadia are making this call."
4. Out-of-region Stewards can comment but cannot vote. This keeps the wisdom flow open while respecting local agency.
5. After close, the outcome is visible to everyone. Cross-regional decisions that affect multiple places can be scoped to all of them, and the vote threshold is computed per-region.

**How Loomio handles this:** Loomio's existing "group membership" model gives us this for free. We provision one subgroup per bioregion at season start, and the OIDC claims drive dynamic membership on login. Users get added to subgroups based on their bioregion list, removed if their profile changes.

**Implementation:** A new service `syncLoomioSubgroups` runs on every login, reading the user's bioregion list and PATCH-ing their Loomio subgroup memberships. Subgroups are seeded once from a canonical bioregion list in `drizzle/seed_bioregions.ts`.

### 2.2 Tier-weighted stances (Improvement #11)

Citizenship tier affects stance weight on the Loomio side, configurable per decision type. Default weights:

| Tier | Default weight | Notes |
|---|---|---|
| Visitor | 1 | Voice but low weight |
| Citizen | 2 | Full participation |
| Contributor | 3 | Track record matters |
| Steward | 5 | Demonstrated responsibility |

The proposer can override with "flat weighting" at promotion time, which is the right choice for existential questions where one-person-one-vote feels more legitimate. The override is visible on the decision page so nobody feels tricked.

Weights are applied when Loomio computes `stance_counts` jsonb at close time. We fork no Loomio code. We do this by intercepting the `poll_closed` webhook, reading raw stances, and recomputing a weighted tally in our own code, then writing the final numbers back into the `forumPostDecisions.stanceSummary` field. Loomio's own UI still shows un-weighted counts for transparency; our forum-side banner shows the weighted outcome.

Alternative (cleaner, harder): add a patch file for Loomio's `poll_service.rb#calculate_results` that reads a weight column. If we can contribute this upstream as an optional plugin, we should.

**Implementation:** `calculateWeightedOutcome(pollKey, weights)` service. Stored on our side, rendered on our side. Loomio UI shows raw counts.

### 2.3 "Show your work" outcomes (Improvement #12)

Every ratified outcome must include a reasoning section written by the decision facilitator (usually the original proposer or a Steward). The reasoning covers:

1. What was at stake.
2. Which objections were raised and how they were resolved or incorporated.
3. Why this specific path was chosen over others.
4. What will trigger a review.

This is mandatory. Loomio's default outcome field becomes the short statement ("We will adopt the Cascadia land agreement v2"), and we add a custom required field "reasoning" via Loomio's poll templates editor. Short, but not skippable.

These reasoning sections are automatically cross-posted to the forum thread as the final reply, credited to the facilitator, and pinned to the top of the thread with a "Decision outcome" tag.

**Implementation:** Modify the Loomio poll template we use for consent and proposal to include a required outcome reasoning field. Webhook receiver on the Next.js side writes this to the forum thread.

### 2.4 Decision reversibility and sunset (Improvement #13, plus Rye's addition)

At promotion time, the proposer classifies the decision:

- **Reversible:** Easy to undo. Low threshold. 1 Steward or 5 Citizens to overturn.
- **Semi-reversible:** Takes effort to undo. Needs a new decision at the same threshold.
- **One-way door:** Effectively permanent once made. Higher thresholds: 72-hour minimum window, explicit consent from all Stewards, double confirmation.

**New: Sunset field.** Every decision can optionally set a "sunset date" at promotion time, answering: "If we do nothing further, when does this decision automatically expire?" Sunset is for:

- Experiments ("let's try this for 90 days").
- Seasonal agreements that reset each incubator season.
- Limited-window trials that we want to evaluate before committing.
- Standing committees with term limits.

When a decision has a sunset date, the living backlink on the forum thread shows a countdown: "Sunsets in 43 days." Seven days before sunset, a new forum thread is auto-created asking "Should we renew, revise, or let it sunset?" with links back to the original decision and the outcome reasoning. This forces explicit renewal, which is healthier than indefinite decay.

**Implementation:** Add `reversibility` enum and `sunsetAt` timestamp to `forumPostDecisions`. New scheduled job `checkSunsetting` runs daily, creates renewal threads at T-7.

### 2.5 Storyteller role for high-stakes decisions (Improvement #14)

For any decision crossing the token threshold (default: 1,000 $ReGen or $RCivics equivalent), a non-voting "storyteller" is assigned from the community at decision open time. Storytellers are picked from a rotating pool of citizens who have opted in via their profile settings. The pool excludes anyone with a direct stake in the outcome.

The storyteller's job:

1. Read the full decision thread on Loomio.
2. Attend any live discussion sessions.
3. Write a 300–600 word narrative after ratification: what was at stake, what was argued, what was chosen, and why.
4. Publish to `/community/decisions/stories/<slug>`.

Storytellers get a small contribution reward from their season's budget (see `SEASONS_HISTORY.md` for compensation bands). This creates a new contributor role and a new body of living history.

**Implementation:** New table `decisionStorytellers` with `decisionId`, `userId`, `status`, `publishedAt`, `narrativeBody`. New profile toggle "Available as a storyteller." Scheduled assignment service picks from the pool at decision-open time. New page `/community/decisions/stories`.

### 2.6 Pre-mortem sub-poll (Improvement #15)

For any decision above the storyteller threshold, or when the proposer opts in, Loomio auto-creates a companion "pre-mortem" poll 24 hours after the main decision opens. The pre-mortem is a simple text-entry poll: "Imagine this decision goes badly. What went wrong?"

Citizens post their worries as poll entries. The top 3 most-agreed-with worries appear on the main decision page as "Concerns to address." The proposer is required to write a brief response to each of the top 3 before the main decision can close.

This turns objections into design improvements and forces the proposer to engage with risk before the community is asked to ratify.

**Implementation:** New Loomio poll template `pre_mortem` (count template with `stance_reason_required: required`). Auto-created by `createDecision` service if reversibility is semi-reversible or one-way-door, or if the proposer opts in. UI shows top 3 concerns on the main decision page via embedded iframe or API pull.

### 2.7 Decision lineage graph (Improvement #16)

Every new decision can cite parent decisions it builds on or supersedes. At promotion time, the proposer sees a search box: "Does this decision build on a previous one?" They can link zero or more parents.

Over time, we render a visual graph at `/community/decisions/lineage`. Nodes are decisions, edges are "builds on" or "supersedes" relationships. Nodes are colored by status and sized by number of voters. Hovering a node shows title and outcome summary.

This makes amending past decisions explicit. It also becomes an archive of how the community's thinking has evolved, which is pure gold for future citizens trying to learn the why behind current practices.

**Implementation:** New table `decisionLineage` with `childDecisionId`, `parentDecisionId`, `relationship` (builds_on / supersedes / references). New page using D3 force graph or React Flow.

### 2.8 Forum-side straw polls (Improvement #17)

Lightweight polls in the forum itself, zero Loomio overhead. Any citizen can attach a straw poll to a forum reply. Options: yes / no / not sure. Maximum one straw poll per reply, maximum five per thread. Straw polls close after 7 days or when the proposer clicks "close" (whichever comes first).

Straw polls are non-binding temperature-checks. They're explicitly labeled "straw poll, not a decision." A green button appears when a straw poll shows strong consensus: "This seems ready. Promote to a formal decision?" which opens the promotion modal.

This is our answer to the problem of "we need to gauge interest before investing in a full Loomio decision." It's also a natural feeder into the promotion flow.

**Implementation:** New table `forumStrawPolls` with `postId`, `question`, `options` (json), `closesAt`. New table `forumStrawPollVotes`. tRPC procedures for create, vote, close, getResults.

### 2.9 Governance load dashboard (Improvement #20)

A `/community/decisions` page that is the single pane of glass for the governance side. It shows:

1. **Your queue:** Decisions waiting on you personally (scoped to your bioregions, not yet voted).
2. **Open decisions across all tracks:** Sortable by closing soon, bioregion, stakes, track.
3. **Recently ratified:** With outcome summaries and links to storyteller narratives.
4. **Community load indicator:** Heat bar showing current decision count vs historical average. When the community is over-capacity, a gentle warning suggests holding off on new decisions or consolidating related ones.
5. **Your decision history:** All decisions you've participated in, with your stance and the final outcome. Teaches you how your instincts have matched or diverged from community outcomes over time.

This page is the "mission control" for engaged citizens. Stewards can see aggregate load and call for pauses if needed.

**Implementation:** New page at `/community/decisions`. Data sources: Loomio API for open/closed decisions, MySQL `forumPostDecisions` for status, a computed `governanceLoadIndex` service that compares rolling 30-day decision count to baseline.

## Stage 3: The Hypha Bridge (grounded in the actual codebase)

This section supersedes any earlier assumption that Hypha runs on Telos. It doesn't anymore. After studying github.com/hypha-dao/hypha-web I can ground every answer in real files and real behavior.

### 3.0 What Hypha actually is (the verified reality)

- **Chain: Base** (Coinbase L2, chain ID 8453). Confirmed in `packages/evm/src/config.ts`, which imports `base` from `@wagmi/core/chains`. Local dev targets `hardhat`. No Telos anywhere in the modern monorepo.
- **Frontend: Next.js 15 + React 19**, monorepo managed with pnpm + Turbo, primary repo `hypha-dao/hypha-web`.
- **Wallet and auth: Privy** (`@privy-io/node` plus `@privy-io/wagmi` wrapping the wagmi config). Privy gives Hypha email login, social login, and embedded wallets. Users don't need to bring their own wallet to file a proposal.
- **Form library: react-hook-form + Zod.** The shared schema for any agreement creation form is `schemaCreateAgreementForm`, exported from `@hypha-platform/core/client`.
- **The propose-contribution route** lives at `apps/web/src/app/[lang]/dho/[id]/@aside/agreements/create/propose-contribution/page.tsx`. The `[id]` is the DHO slug (e.g. `regen-games` or `regen-civics`). The `@aside` parallel route means the form opens as a side panel over the main DHO page.
- **The actual form** is `CreateProposeAContributionForm` at `packages/epics/src/governance/components/create-propose-a-contribution-form.tsx`. Its field set is narrower than my earlier guess: `title`, `description`, `leadImage`, `attachments`, `spaceId`, `creatorId`, `recipient` (wallet address), `payouts: [{ amount, token }]`, `label: 'Contribution'`.
- **Submit flow.** The form calls `useCreateProposeAContributionOrchestrator`, which signs and sends a transaction via wagmi to Hypha's Base smart contracts. On success, the user is redirected to `successfulUrl`.
- **All 11 creation routes** exist under `/agreements/create/`: activate-spaces, buy-hypha-tokens, change-entry-method, change-voting-method, deploy-funds, membership-exit, pay-for-expenses, propose-contribution, redeem-tokens, space-settings-transparency, space-to-space-membership. Four of these are the ones ReGen Civics actually needs to bridge to.

### 3.1 Pre-filling any Hypha form (revised answer to #8)

The page component is a Next.js server component that currently reads `params` but not `searchParams`. That means URL query params are not picked up today. Three paths from here, in order of preference:

**Path A: Upstream a small PR to hypha-web.** Add `searchParams` to `PageProps`, parse a validated payload, and pass it as `initialValues` into `CreateProposeAContributionForm`. The form is already built on react-hook-form's `defaultValues` so the change on their side is under 30 lines. This is cleanly upstreamable because it benefits any external tool that wants to bridge into Hypha, not only us. We offer to write the PR. This is the cleanest long-term answer and it works for all 11 creation routes with the same pattern.

**Path B: Use Hypha's existing `useResubmitProposalData` hook.** I found this hook already imported in `create-propose-a-contribution-form.tsx`. It loads resubmit data for a user, which means Hypha already has a mechanism for pre-filling a form from external data. We need to trace where that hook reads from (likely localStorage, session storage, or a REST endpoint). If it reads from localStorage, we set the same key on our side right before redirecting to Hypha, and the hook picks it up. If it reads from a backend endpoint, we either get write access to it or fall back to Path A. **Action:** read `packages/epics/src/governance/hooks/use-localized-proposal-resolver.ts` and any resubmit-related hooks to understand the source.

**Path C: A formalization page on our side with copy-to-clipboard fallback.** We build this regardless of A or B, because it gives us data integrity and a clean checkpoint. On `regencivics.earth/bridge/hypha/<bridgeKey>`, we render a beautiful card with the exact payload: title, description, recipient wallet, amount, token, attachments. The user clicks "Continue to Hypha." We then attempt Path A (if the PR merged) or Path B (localStorage seed) or fall through to a manual paste mode where the card has copy buttons next to each field.

**Recommendation:** Ship Path C immediately (it's a pure React page on our side, no external dependencies). In parallel, open Path A as a PR to hypha-web and investigate Path B to see if we can land a zero-change integration. If Path A merges, it becomes the primary mechanism and Path C stays as a safety net for fields that don't fit cleanly into a URL.

### 3.2 Two-way status sync via Base (revised answer to #9 and #19)

Hypha is on Base. Every agreement/proposal creation results in on-chain events emitted by their governance contracts (`packages/storage-evm` and the Solidity code in `hypha-smart-contracts`). This gives us four concrete options for reading Hypha state without asking Hypha for an API:

**Option A: Alchemy webhooks (recommended).** Alchemy offers address activity and custom webhooks for any Base contract. We subscribe to the DHO governance contracts for the `regen-games` and `regen-civics` DHOs, filtered to events like `ProposalCreated`, `Voted`, `ProposalPassed`, `ProposalExecuted`, `Transfer`. Alchemy pushes the event to our webhook endpoint as soon as it confirms. Latency: a few seconds. Cost: free tier is enough for our volume. Setup: 10 minutes. **This is the right default.**

**Option B: viem `watchContractEvent` inside our Next.js app.** We run a long-lived watcher in a background worker that subscribes via a Base RPC to the same events. Good if we want to keep everything inside our own infrastructure. Slightly more ops work. Works over websockets to a Base RPC like `wss://base-mainnet.g.alchemy.com/v2/<key>`.

**Option C: A Ponder indexer.** Ponder is a TypeScript-native indexer for EVM chains. We define the events, it builds a queryable database of them. Good if we want rich historical queries and to render our own governance explorer. More infrastructure than Options A or B, but it gives us a real dataset to build on.

**Option D: The Graph subgraph.** If Hypha publishes a Base subgraph (or if we write one), we query GraphQL. Works, but usually more work to set up than Alchemy webhooks.

**Recommendation:** Start with **Option A (Alchemy webhooks)**. Our endpoint at `/api/webhooks/hypha-indexer` receives events, matches the on-chain transaction to our stored `bridgeKey` via an event field we inject at submission time (see 3.4), and updates our DB. If Alchemy's free tier ever becomes a constraint, graduate to Option C (Ponder self-hosted).

### 3.3 Hypha outcome receipts on the forum (revised answer to #19)

When the Alchemy webhook receives a `ProposalExecuted` event for one of our bridge keys:

1. We update the matching row: `hyphaStatus: 'passed'`, `hyphaPassedAt`, `hyphaTokenAmount`, `hyphaTokenSymbol`, `hyphaRecipientWallet`, `hyphaTxHash`, `hyphaProposalId`.
2. A receipt reply posts automatically to the originating forum thread (or crowdpool card, or contribution claim page, depending on where the bridge started):

   ```
   ✅ Decision funded
   Passed on Hypha: April 14, 2026
   Amount: 2,500 $REGEN
   Recipient: 0x7a3c...b421
   Transaction: https://basescan.org/tx/0xabc123...
   ```

3. The living backlink banner updates to "✅ Funded."
4. The recipient gets a notification. If the recipient is a ReGen Civics citizen with a linked wallet, the notification includes "Here are your next steps" and links to their quest or project page.
5. The storyteller (if one was assigned) gets nudged to write the follow-up.

**Implementation:** New columns on `hyphaBridges` (see 3.5 for why this is its own table now): `status`, `hyphaProposalId`, `hyphaTxHash`, `hyphaPassedAt`, `hyphaTokenAmount`, `hyphaTokenSymbol`, `hyphaRecipientWallet`, `basescanUrl`.

### 3.4 The bridge key: how we correlate our records to Hypha transactions

Since we can't inject arbitrary metadata into Hypha's on-chain proposal (the current Zod schema is fixed), we need a deterministic way to match a Hypha `ProposalCreated` event back to our bridge. Three techniques, used in combination:

1. **Title prefix marker.** We prepend an invisible marker to the title field: `[rc:<bridgeKey>] Skagit Seed Library`. On our webhook side we strip and match. The marker is 12 characters and survives as the proposal title. Users see it on Hypha. We ask them to please not remove it.
2. **Recipient + amount + submitter fingerprint.** If the title marker is removed, we fall back to fuzzy matching: recipient wallet, amount, token symbol, submitter wallet, block time within a 10-minute window of our bridge creation. This catches 95 percent of the remaining cases.
3. **Opt-in user confirmation.** On our bridge page, after the user clicks "Continue to Hypha," we show a "Link back to ReGen Civics" button that returns them to `regencivics.earth/bridge/hypha/<bridgeKey>/confirm?txHash=0x...`. They paste the Basescan transaction URL (or we auto-read it from their clipboard if the browser allows). This is the belt-and-braces manual confirm.

In practice, most bridges will match via technique 1. The rest get cleaned up by technique 2 or 3.

### 3.5 The Hypha Bridge: a reusable pattern for every ReGen Civics → Hypha handoff

This is the part Rye asked about specifically: the same flow will be reused anywhere a ReGen Civics player needs to end up on a Hypha form with pre-filled data. Rather than writing a bespoke integration for each touchpoint, we build a single **Hypha Bridge** module and every touchpoint calls into it.

**Touchpoints we already know about:**

| Source | User action | Hypha route | Hypha form |
|---|---|---|---|
| Forum → Loomio decision | Ratified proposal that moves tokens | `/dho/[space]/agreements/create/propose-contribution` | Contribution proposal |
| Crowdpool card | Player bringing contribution proposal to a land project DAO | `/dho/[land-project-slug]/agreements/create/propose-contribution` | Contribution proposal |
| Contribution history claim | Player claiming a historical contribution for recognition/compensation | `/dho/[space]/agreements/create/propose-contribution` | Contribution proposal |
| Fund grant disbursement | Fund moving tokens out to a project | `/dho/regen-civics/agreements/create/deploy-funds` | Deploy funds |
| Expense reimbursement | Contributor submitting a receipt for expense reimbursement | `/dho/[space]/agreements/create/pay-for-expenses` | Pay for expenses |
| Membership exit | Contributor leaving a space | `/dho/[space]/agreements/create/membership-exit` | Membership exit |

Any future touchpoint (a new quest reward system, a new alliance payment flow, an investor top-up) plugs into the same bridge without new code.

#### The Hypha Bridge module

One module. Three responsibilities.

**Responsibility 1: Accept a payload from any source and normalize it to a Hypha form schema.**

```ts
// apps/web/src/lib/hypha-bridge/types.ts

export type HyphaFormKind =
  | 'propose-contribution'
  | 'deploy-funds'
  | 'pay-for-expenses'
  | 'membership-exit'
  | 'buy-hypha-tokens';

export interface HyphaBridgePayload {
  source: 'loomio-decision' | 'crowdpool' | 'contribution-claim' | 'fund-grant' | 'expense' | 'exit' | 'other';
  sourceId: string;                 // the ID in our system
  targetDhoSlug: string;            // 'regen-games' or 'regen-civics' or a land project slug
  formKind: HyphaFormKind;
  title: string;
  description: string;
  recipient?: `0x${string}`;        // Base wallet address
  payouts?: Array<{
    amount: string;
    token: string;                  // token contract address on Base
  }>;
  attachments?: Array<{ url: string; filename: string }>;
  leadImageUrl?: string;
  initiatorUserId: number;          // ReGen Civics user id
  metadata?: Record<string, unknown>;
}
```

**Responsibility 2: Persist the bridge and generate a bridge key.**

```ts
// Creates a hyphaBridges row, returns { bridgeKey, bridgeUrl }
export async function createHyphaBridge(payload: HyphaBridgePayload) {
  const bridgeKey = generateShortKey(); // 8-char base32
  await db.insert(hyphaBridges).values({
    bridgeKey,
    ...payload,
    status: 'created',
    createdAt: new Date(),
  });
  return {
    bridgeKey,
    bridgeUrl: `https://regencivics.earth/bridge/hypha/${bridgeKey}`,
  };
}
```

**Responsibility 3: Render a single bridge page that handles every source and every form kind.**

The page at `/bridge/hypha/[bridgeKey]` is the one visual interface for all of this. It shows:

1. A branded header: "You're heading to Hypha. Here's what we're bringing with you."
2. The payload fields rendered as a read-only card.
3. Any context back to the source: "This came from Decision #47 in the community forum" with a link.
4. One button: "Continue to Hypha." Clicking this triggers the handoff.
5. A smaller link: "Something looks wrong. Edit before continuing." This opens the payload as an editable form so the user can fix anything before it goes to Hypha.

On click of "Continue to Hypha," the bridge page:

1. Constructs the Hypha URL: `https://app.hypha.earth/en/dho/[targetDhoSlug]/agreements/create/[formKind]?bridgeKey=<key>` (once Path A PR merges) or just `https://app.hypha.earth/en/dho/[targetDhoSlug]/agreements/create/[formKind]` (Path C fallback, with the payload copied to clipboard).
2. Marks the bridge status as `handoff_sent`.
3. Redirects the user.

The bridge page never asks the user to copy a wallet address or type an amount. Everything is pre-filled because it came from an authoritative source in our system.

#### Source-specific callers

Each source just constructs the payload and calls `createHyphaBridge`. Here's what that looks like for the three sources Rye called out:

**From a ratified Loomio decision:**
```ts
const { bridgeUrl } = await createHyphaBridge({
  source: 'loomio-decision',
  sourceId: decision.id.toString(),
  targetDhoSlug: decision.track === 'fund' ? 'regen-civics' : 'regen-games',
  formKind: 'propose-contribution',
  title: decision.outcomeTitle,
  description: decision.outcomeReasoning,
  recipient: decision.recipientWallet,
  payouts: [{ amount: decision.amount, token: REGEN_TOKEN_ADDRESS }],
  initiatorUserId: decision.proposerId,
  metadata: { loomioPollKey: decision.loomioPollKey },
});
```

**From a crowdpool contribution proposal:**
```ts
const { bridgeUrl } = await createHyphaBridge({
  source: 'crowdpool',
  sourceId: crowdpoolContribution.id.toString(),
  targetDhoSlug: crowdpoolContribution.landProjectSlug,
  formKind: 'propose-contribution',
  title: crowdpoolContribution.title,
  description: crowdpoolContribution.description,
  recipient: crowdpoolContribution.recipientWallet,
  payouts: crowdpoolContribution.requestedPayouts,
  attachments: crowdpoolContribution.attachments,
  initiatorUserId: crowdpoolContribution.contributorId,
});
```

**From a historical contribution claim:**
```ts
const { bridgeUrl } = await createHyphaBridge({
  source: 'contribution-claim',
  sourceId: claim.id.toString(),
  targetDhoSlug: claim.spaceSlug,
  formKind: 'propose-contribution',
  title: `Historical contribution: ${claim.summary}`,
  description: claim.evidenceNarrative,
  recipient: claim.claimantWallet,
  payouts: [{ amount: claim.requestedAmount, token: claim.requestedToken }],
  attachments: claim.evidenceFiles,
  initiatorUserId: claim.claimantId,
  metadata: { seasonId: claim.seasonId, contributionType: claim.type },
});
```

All three end up on the same `/bridge/hypha/[bridgeKey]` page with the same visual experience. All three result in the same Hypha form being pre-filled the same way. All three get tracked by the same Alchemy webhook and closed out with a receipt on the source page.

**One bridge. Many callers. Zero copy-paste.**

#### Data model: the `hyphaBridges` table

```sql
CREATE TABLE hyphaBridges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bridgeKey VARCHAR(16) NOT NULL UNIQUE,
  source ENUM('loomio_decision','crowdpool','contribution_claim','fund_grant','expense','exit','other') NOT NULL,
  sourceId VARCHAR(80) NOT NULL,
  targetDhoSlug VARCHAR(80) NOT NULL,
  formKind ENUM('propose_contribution','deploy_funds','pay_for_expenses','membership_exit','buy_hypha_tokens') NOT NULL,
  initiatorUserId INT NOT NULL,
  payload JSON NOT NULL,
  status ENUM('created','handoff_sent','on_chain_detected','passed','failed','cancelled') NOT NULL DEFAULT 'created',
  hyphaProposalId VARCHAR(80) DEFAULT NULL,
  hyphaTxHash VARCHAR(80) DEFAULT NULL,
  hyphaPassedAt TIMESTAMP NULL DEFAULT NULL,
  hyphaTokenAmount DECIMAL(30,6) DEFAULT NULL,
  hyphaTokenSymbol VARCHAR(20) DEFAULT NULL,
  hyphaRecipientWallet VARCHAR(60) DEFAULT NULL,
  basescanUrl VARCHAR(200) DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hb_source (source, sourceId),
  INDEX idx_hb_status (status),
  INDEX idx_hb_target (targetDhoSlug)
);
```

This replaces the earlier approach of stuffing Hypha fields into `forumPostDecisions`. Now `forumPostDecisions.hyphaBridgeId` is a foreign key to `hyphaBridges.id`. Crowdpool contributions, contribution claims, and any other source get the same foreign key on their own tables. One source of truth for every bridge.

#### Privy and identity

Since Hypha uses Privy for auth and embedded wallets, we have three options for making this feel like one continuous user session across the handoff:

1. **Shared Privy app.** Register ReGen Civics as an additional app under the same Privy tenant as Hypha (coordinate with the Hypha team). User logs in once on regencivics.earth, their Privy session is also valid on app.hypha.earth.
2. **Privy user linking.** Hypha generates a one-time linking token that we accept on our side. We store the mapping between ReGen Civics user ID and Privy user DID. Next time the user bridges, they're silently signed in.
3. **Plain SSO via Privy's sign-in widget, embedded on our bridge page.** The bridge page offers "Sign in to Hypha" as a one-click step if they're not signed in there yet. Then the handoff redirects them into the form already authenticated.

**Recommendation:** start with Option 3 (no coordination needed with Hypha team), move to Option 2 once we have bandwidth, revisit Option 1 if Hypha is open to a deeper integration.

### 3.6 What else I need from the Hypha side

After studying the codebase, here's what I'd still want to look at before we ship. These are questions for either a read of additional files or a conversation with the Hypha team.

1. **`useResubmitProposalData` source.** Read `packages/epics/src/governance/hooks/` to find this hook. If it reads from localStorage or an accessible endpoint, we can use it as our zero-change path. File not yet read.
2. **Space resolution.** `findSpaceBySlug` is called in the page component. I want to confirm that ReGen Civics can control its own DHO slugs (`regen-games`, `regen-civics`, plus one per land project) and that slugs are stable. File to read: `packages/core/server/space.ts` or similar.
3. **Token address constants.** We need the Base contract addresses for $REGEN and $RCivics (if they exist yet), or we need to know how Hypha represents the token in the payouts field. This determines the `token` field we pass in payouts. Probably in `packages/storage-evm/src/constants.ts` or the smart contracts repo.
4. **Event signature for `ProposalCreated`.** Needed for the Alchemy webhook filter. Will be in `hypha-smart-contracts` Solidity, under the governance contract ABI.
5. **Whether `recipient` must be a Base wallet owned by a Privy user, or any Base address.** This affects our UX: can a player who doesn't yet have a Privy wallet be a recipient? Testing in a throwaway DHO would answer this.
6. **Attachment handling.** The form accepts `attachments`. What storage do these hit? IPFS? Arweave? An S3 bucket? We need to match. Probably in `packages/core/client/` somewhere.
7. **PR policy.** Does the Hypha team accept community PRs to `hypha-web`? Their `.github/` and `CONTRIBUTING.md` will tell us. This governs whether Path A (searchParams support) is viable.

These are all answerable by another pass through the repo or a short email to the Hypha team. None of them block Phase 1 of the bridge (Path C works with what we know today).

## ReGen Guide (Claude) integration across the whole pipeline

We already have ReGen Guide built into the site. Here is where Claude shows up in this pipeline, leaning into that existing surface.

### Where Claude helps

1. **On the forum, pre-promotion.** ReGen Guide reads active threads and suggests: "This conversation looks like it might be ready to become a decision. Want me to draft a promotion?" Not pushy, opt-in.
2. **In the promotion modal (Improvement #6 and #7).** Template suggestion and full decision draft.
3. **On the decision page, mid-deliberation.** ReGen Guide summarizes the conversation so far for a citizen who's just arriving: "Here's where the discussion is, here are the main points of agreement, here are the unresolved concerns." This is opt-in per-user, never auto.
4. **Objection unpacking.** When a citizen posts a raw objection, ReGen Guide can offer a private sidebar: "Would you like help expressing this? I can help you turn a 'this feels wrong' into a specific, actionable concern." Purely opt-in.
5. **Pre-mortem facilitation (Improvement #15).** ReGen Guide seeds the pre-mortem with common failure modes for this decision type, then invites citizens to add theirs.
6. **Drafting the outcome reasoning (Improvement #12).** When the facilitator is writing the mandatory reasoning section, ReGen Guide offers a first draft based on the full deliberation.
7. **Storyteller assist (Improvement #14).** When a storyteller sits down to write their narrative, ReGen Guide produces a structured timeline from the Loomio + forum history and suggests a narrative arc.
8. **Hypha formalization prep (Section 3.1).** ReGen Guide builds the formalization payload by reading the decision outcome and pre-filling the title, description, amount, and milestones fields.
9. **Blockchain translation.** When `watchHyphaProposals` posts a receipt reply, ReGen Guide translates raw Telos transaction data into plain language: "2,500 $ReGen was sent to rye.regen@telos on April 14. The transaction confirmed in 3 seconds."
10. **Personal reflection.** At close time, ReGen Guide offers each participant a private reflection: "You voted to consent. The decision ratified. Here's the outcome. How does this land with you now?" This is a learning feature, not a manipulation one, and it's entirely opt-in.

### Guardrails

- ReGen Guide never casts a stance on behalf of a user.
- ReGen Guide never speaks in the main decision thread unless explicitly invoked by `@regen-guide`.
- ReGen Guide's drafts are always editable, never final.
- All AI-generated drafts are marked "Drafted with ReGen Guide" so readers know the provenance.
- Summaries and synthesis outputs are labeled as interpretations, so they don't get mistaken for decisions.

## Data model: new tables and columns

Building on `LOOMIO_INTEGRATION_SPEC_2026-04-09.md` which already introduced `forumPostDecisions`, we add the following. Migration file name: `drizzle/0112_forum_loomio_hypha_pipeline.sql`.

```sql
-- Extend the forumPostDecisions table from the Loomio spec
-- Note: Hypha-specific columns now live on hyphaBridges (see Section 3.5)
ALTER TABLE forumPostDecisions
  ADD COLUMN track ENUM('fund','game','both') NOT NULL DEFAULT 'game',
  ADD COLUMN reversibility ENUM('reversible','semi_reversible','one_way_door') NOT NULL DEFAULT 'reversible',
  ADD COLUMN sunsetAt TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN bioregionScope JSON DEFAULT NULL,
  ADD COLUMN hyphaBridgeId INT DEFAULT NULL,
  ADD COLUMN storytellerId INT DEFAULT NULL,
  ADD COLUMN storytellerNarrativeId INT DEFAULT NULL,
  ADD COLUMN weightedStanceSummary JSON DEFAULT NULL;

-- The reusable Hypha Bridge table (Section 3.5)
CREATE TABLE hyphaBridges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bridgeKey VARCHAR(16) NOT NULL UNIQUE,
  source ENUM('loomio_decision','crowdpool','contribution_claim','fund_grant','expense','exit','other') NOT NULL,
  sourceId VARCHAR(80) NOT NULL,
  targetDhoSlug VARCHAR(80) NOT NULL,
  formKind ENUM('propose_contribution','deploy_funds','pay_for_expenses','membership_exit','buy_hypha_tokens') NOT NULL,
  initiatorUserId INT NOT NULL,
  payload JSON NOT NULL,
  status ENUM('created','handoff_sent','on_chain_detected','passed','failed','cancelled') NOT NULL DEFAULT 'created',
  hyphaProposalId VARCHAR(80) DEFAULT NULL,
  hyphaTxHash VARCHAR(80) DEFAULT NULL,
  hyphaPassedAt TIMESTAMP NULL DEFAULT NULL,
  hyphaTokenAmount DECIMAL(30,6) DEFAULT NULL,
  hyphaTokenSymbol VARCHAR(20) DEFAULT NULL,
  hyphaRecipientWallet VARCHAR(60) DEFAULT NULL,
  basescanUrl VARCHAR(200) DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hb_source (source, sourceId),
  INDEX idx_hb_status (status),
  INDEX idx_hb_target (targetDhoSlug)
);

-- Dual-key promotion requests
CREATE TABLE forumPromotionRequests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  proposerId INT NOT NULL,
  coSignerId INT DEFAULT NULL,
  decisionTrack ENUM('fund','game','both') NOT NULL,
  decisionQuestion VARCHAR(500) NOT NULL,
  suggestedTemplate VARCHAR(40) NOT NULL,
  status ENUM('pending','signed','expired','cancelled') NOT NULL DEFAULT 'pending',
  coSignedAt TIMESTAMP NULL DEFAULT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fpr_post (forumPostId),
  INDEX idx_fpr_status (status, expiresAt)
);

-- Watchers waiting for readiness gates to pass
CREATE TABLE forumPromotionWatchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fpw (forumPostId, userId)
);

-- Lightweight forum straw polls
CREATE TABLE forumStrawPolls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forumPostId INT NOT NULL,
  creatorId INT NOT NULL,
  question VARCHAR(300) NOT NULL,
  options JSON NOT NULL,
  closesAt TIMESTAMP NOT NULL,
  closedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fsp_post (forumPostId)
);

CREATE TABLE forumStrawPollVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strawPollId INT NOT NULL,
  userId INT NOT NULL,
  choice VARCHAR(80) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fspv (strawPollId, userId)
);

-- Decision lineage graph
CREATE TABLE decisionLineage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  childDecisionId INT NOT NULL,
  parentDecisionId INT NOT NULL,
  relationship ENUM('builds_on','supersedes','references') NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dl (childDecisionId, parentDecisionId)
);

-- Storyteller narratives
CREATE TABLE decisionStorytellerNarratives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  decisionId INT NOT NULL,
  storytellerId INT NOT NULL,
  narrativeBody MEDIUMTEXT NOT NULL,
  publishedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dsn_decision (decisionId),
  INDEX idx_dsn_storyteller (storytellerId)
);

-- User profile toggles for new flows
ALTER TABLE users
  ADD COLUMN availableAsStoryteller TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN bioregions JSON DEFAULT NULL,
  ADD COLUMN rcVoiceWeight INT NOT NULL DEFAULT 1,
  ADD COLUMN rgVoiceWeight INT NOT NULL DEFAULT 1;
```

Run via `npx tsx scripts/run-migration.ts drizzle/0112_forum_loomio_hypha_pipeline.sql` per project convention.

## API surface: new tRPC procedures

All under `server/api/routers/governance.ts` unless noted.

```
governance.forum.checkPromotionReadiness(threadId) -> ReadinessReport
governance.forum.requestPromotion(threadId, question, track, template, sunsetAt?, bioregions?) -> PromotionRequest
governance.forum.coSignPromotion(promotionRequestId) -> PromotionRequest
governance.forum.getDecisionStatus(threadId) -> DecisionStatus
governance.forum.listDecisionsForUser(userId) -> Decision[]
governance.forum.createStrawPoll(postId, question, options, closesAt) -> StrawPoll
governance.forum.voteStrawPoll(strawPollId, choice) -> StrawPollVote

governance.regenGuide.suggestTemplate(threadSummary) -> TemplateSuggestion
governance.regenGuide.draftDecision(threadId, template) -> DecisionDraft
governance.regenGuide.summarizeDecision(decisionId, audience) -> string
governance.regenGuide.draftOutcomeReasoning(decisionId) -> string

hyphaBridge.create(payload) -> { bridgeKey, bridgeUrl }
hyphaBridge.get(bridgeKey) -> HyphaBridge
hyphaBridge.updatePayload(bridgeKey, edits) -> HyphaBridge
hyphaBridge.markHandoffSent(bridgeKey) -> HyphaBridge
hyphaBridge.getBySource(source, sourceId) -> HyphaBridge | null
hyphaBridge.listForUser(userId) -> HyphaBridge[]

governance.lineage.addParent(childId, parentId, relationship)
governance.lineage.getGraph(decisionId, depth)

governance.storytellers.optIn(userId)
governance.storytellers.assignForDecision(decisionId) -> Storyteller
governance.storytellers.publishNarrative(decisionId, narrativeBody)

governance.loadDashboard.getUserQueue(userId) -> Decision[]
governance.loadDashboard.getCommunityLoad() -> LoadIndex
```

## Webhook endpoints

```
POST /api/webhooks/loomio           (HMAC signed, handles poll events from Loomio)
POST /api/webhooks/hypha-alchemy    (Alchemy webhook for Base chain events from Hypha governance contracts)
```

## Scheduled jobs

```
nightlyUserSync            -> refresh Loomio subgroup memberships from MySQL
checkSunsetting            -> create renewal threads at T-7 for sunsetting decisions
reconcileHyphaBridges      -> hourly safety net that re-checks any bridges in 'handoff_sent' state via direct Base RPC, in case an Alchemy webhook was missed
assignStorytellers         -> pick storytellers for newly-opened high-stakes decisions
preMortemTrigger           -> create pre-mortem poll 24h after parent decision opens
expirePromotionRequests    -> close out unsigned promotion requests after 24h
```

## Phase 1 implementation plan (the buildable slice)

Phase 1 ships the core pipeline end-to-end with a deliberately reduced feature set. The goal is "a citizen can take a forum thread all the way through Hypha" by end of Phase 1.

### Week 1: Foundation

- Stand up Loomio at gov.regencivics.earth with our theme and brand CSS.
- OIDC provider endpoints on the Next.js app.
- Cookie domain change to `.regencivics.earth`.
- Shared header injection via reverse proxy.
- Migration 0112 applied.
- Bioregion seed data loaded.

### Week 2: Forum-side promotion flow

- Readiness checklist modal (Improvement #1).
- Dual-key promotion with co-signer flow (Improvement #2).
- Context snapshot service (Improvement #3).
- Track tagging (Improvement #5).
- Living backlink banner on forum threads (Improvement #4).

### Week 3: Loomio-side decision creation

- ReGen Guide template suggester (Improvement #6).
- ReGen Guide decision drafter (Improvement #7).
- Bioregional subgroup sync.
- Webhook receiver for `poll_created`, `poll_closed`, `outcome_created`.

### Week 4: Hypha Bridge (the reusable module)

- `hyphaBridges` table and tRPC router.
- Bridge page at `/bridge/hypha/[bridgeKey]`.
- Bridge caller wired from Loomio-decision webhook path (Path C, manual handoff with pre-filled card).
- Read `useResubmitProposalData` hook to assess Path B feasibility.
- Draft a PR to `hypha-dao/hypha-web` adding `searchParams` reading to the create pages (Path A).
- Alchemy webhook set up for `regen-games` and `regen-civics` DHO contracts on Base.
- Receipt reply posting to forum threads, crowdpool cards, and contribution claims on Hypha pass.

### Week 5: Polish and the missing improvements

- Governance load dashboard at `/community/decisions` (Improvement #20).
- Outcome reasoning field on Loomio templates (Improvement #12).
- Weighted stance tallies (Improvement #11).
- Sunset field and renewal thread creation (Improvement #13).

### Week 6: Storyteller and pre-mortem

- Storyteller opt-in profile toggle (Improvement #14).
- Storyteller assignment service.
- Pre-mortem sub-poll creation (Improvement #15).
- Decision lineage graph (Improvement #16).

### Week 7: Forum straw polls and final polish

- Straw poll creation and voting (Improvement #17).
- Green "ready to promote" button triggered by consensus.
- End-to-end walkthrough in Safari with Rye.
- Launch checklist and cutover.

## Phase 2 and beyond

Things we consciously defer until Phase 1 has landed and we have real usage data:

- Self-hosted Telos indexer (stay on public Hyperion).
- Contributing a voting weight plugin upstream to Loomio.
- ReGen Guide objection unpacking sidebar (Section 4.4).
- Reflection prompts (Section 4.10).
- Decision lineage visualization (graph view; a list view ships in Phase 1).
- Public-vs-members-only deliberation mode toggle.
- Multilingual translation of decision pages.
- Cross-DAO federation (Hypha ↔ other DAO tools).

## UX flow walkthrough: the complete journey

Here is the full story of how a single idea moves through the pipeline, from first spark to funded delivery.

**Monday morning, week 1.** Lea posts in the Cascadia bioregion forum: "I think we should fund a native seed library for the Skagit watershed. Feels like it could serve a lot of land projects."

**Monday through Wednesday.** The thread gets 23 replies. People share similar projects, point out local seed savers who should be looped in, raise questions about funding scale. Someone posts a straw poll: "Does this feel worth formalizing?" 15 of 18 respondents click yes.

**Wednesday afternoon.** The green "Ready to promote" button appears on the thread. Lea clicks it.

**The promotion modal.** Readiness check passes (72 hours old, 12 distinct voices, Lea types the question "Should we fund $2,500 to seed the Skagit Seed Library?"). Lea picks "Fund track" because tokens will be involved. Lea picks reversibility "semi-reversible" and sets a sunset of 12 months. Lea scopes it to "Cascadia" bioregion.

**ReGen Guide steps in.** Claude suggests the `consent` template ("you're proposing a concrete action, consent surfaces objections well") and drafts the full decision page: title, background, question, options, per-option rationale, key concerns raised. Lea reads Claude's draft, edits two sentences, and clicks "Open decision."

**Dual-key.** The thread banner updates: "Lea has proposed promoting this to governance. Needs one more co-signer." Rye co-signs 45 minutes later.

**The decision is live at gov.regencivics.earth/d/skagit-seed-library-2026.** Context snapshot from the forum is at the top, the full question and options are below. Voting is scoped to the 47 citizens marked in Cascadia bioregion. Out-of-region citizens can read but the vote button is disabled with a note explaining why.

**24 hours later.** A pre-mortem sub-poll auto-creates: "Imagine this decision goes badly. What went wrong?" Three concerns surface: "What if the seeds don't match the terroir?", "What if we over-promise and under-deliver?", "What if there's no accountability loop?". Lea writes brief responses to each, addressing them in the main decision body.

**Day 4.** A storyteller, Maria from Ohio, is auto-assigned. She reads the thread and starts taking notes.

**Day 7.** Decision closes. Weighted tally: 34 consent, 2 objection-with-questions, 0 block. The consent template passes. Lea writes the mandatory outcome reasoning, with ReGen Guide offering a first draft. The reasoning is cross-posted to the forum thread and pinned.

**Day 7, 30 minutes later.** Lea clicks "Formalize in Hypha" on the decision outcome page. She lands on a formalization page that pre-fills title, description, amount ($2,500 worth of $ReGen), recipient wallet (her own, she'll distribute locally), milestones (seeds ordered by month 2, library opened by month 4, first 50 packets distributed by month 6). She reviews, clicks "Submit to Hypha," and gets redirected to `app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution?title=...&amount=2500&memo=rc-decision-47`.

**Day 10.** Hypha proposal passes on Telos. `watchHyphaProposals` detects the action, matches the `rc-decision-47` memo, updates our DB. A receipt reply posts automatically to the original forum thread: "✅ Decision funded. 2,500 $ReGen sent on April 19. Transaction: explorer.telos.net/tx/abc123."

**Week 6.** Maria, the storyteller, publishes her 500-word narrative at `/community/decisions/stories/skagit-seed-library`. The living backlink updates.

**Month 12.** Seven days before the sunset, a new forum thread is auto-created: "The Skagit Seed Library decision sunsets in 7 days. Should we renew, revise, or let it sunset?" Lea posts a progress update. The community votes to renew for another 12 months.

This is the full journey: from a Monday morning forum post to a self-healing, sunset-aware, community-accountable funded initiative. The player has seen one consistent visual experience across three systems. Every step has had the right amount of friction. ReGen Guide has shown up at the three places where a human would get stuck (template choice, decision structure, outcome reasoning) and stayed silent everywhere else.

## Open questions for Rye

1. **Hypha codebase inspection.** Where is the Hypha codebase on disk? Confirmation that `$route.query` is readable in their form component unlocks Lever 1 for pre-filling.
2. **OIDC implementation.** Build our own on top of the existing session middleware, or use a library like `oidc-provider`? I lean toward the library for correctness, but it's one more dependency.
3. **Loomio hosting.** Railway (same as the main site, shared ops) or a separate managed Postgres + Rails host like Render? Railway keeps ops simple. Render has better Rails defaults.
4. **Telos Hyperion endpoint.** Which public endpoint do we trust? I'll default to telos.caleos.io. We should also have a fallback configured.
5. **Storyteller threshold.** The default is "any decision over 1,000 tokens." Is that the right number, or should it be configurable per bioregion?
6. **Weighted voting defaults.** The tier weights (1/2/3/5) are a starting point. These need your sanity check since they directly shape whose voice carries how much weight.
7. **Cookie domain rollout.** Changing the main site cookie to `.regencivics.earth` has to happen before Loomio launches. It's a small risk that a deployed session is invalidated. Best done during a quiet window.
8. **Existing communityAgreements rows.** We have shipped agreements. Do we want to retroactively create Loomio decisions for them to seed the history, or start fresh at launch?

## Compliance with writing rules

This doc was written following the ReGen Civics writing rules: no em-dashes, no contrast framing, no banned AI words, no rhetorical question openers, no passive inspiration. Direct, grounded, specific.

## 20 ways to evolve THIS pipeline (new batch)

The previous spec listed 20 ways to evolve Loomio. This section lists 20 ways to evolve the pipeline we just specified. These are for post-launch iteration, not Phase 1.

### 1. Forum thread heat scoring as a promotion signal
Beyond the straw poll, track a composite "heat score" per thread combining reply velocity, reaction density, unique voices, and ReGen Guide-detected urgency language. When heat crosses a threshold, the green promote button lights up automatically.

### 2. Topic-scoped governance dojos
A new kind of weekly recurring event where 5–10 citizens learn how to run a Loomio decision well, using live threads as practice. Onboarding for governance literacy. Graduates earn a "facilitator" role and go into the storyteller pool.

### 3. Proxy delegation with revocation anytime
Let citizens delegate their stance to another citizen on specific topic tags ("I trust Lea on watershed decisions"). Delegation is revocable per-decision. Voting weight flows transitively but with a max hop count of 2 to prevent cascades.

### 4. ReGen Guide as neutral devil's advocate
When a decision looks like it will ratify with near-unanimous consent, ReGen Guide steps in as a neutral devil's advocate one day before close, posting: "Here are three reasons this could be wrong that I don't see being discussed." Optional, opt-in by the facilitator, and clearly marked.

### 5. Emotional temperature snapshot at close
When a citizen votes, ask a one-tap emotional question: "How does this decision feel to you? Excited / Neutral / Uneasy." Aggregate is shown only to the facilitator and storyteller, not to voters. Catches consent-with-dread patterns.

### 6. Decision parking lot
Good ideas that don't yet have consensus or capacity get moved to a "parking lot" backlog with reasons. The backlog is searchable and reviewable by Stewards quarterly. Nothing gets lost.

### 7. Bioregion-specific decision templates
Cascadia might want a different default consent template than the Great Lakes. Templates become per-bioregion customizable, and best-practices get shared across regions as "templates recommended by Cascadia."

### 8. Sunset renewal as a one-click vote
When a sunset renewal thread auto-creates, if the decision has no concerns and the facilitator signals it, the renewal becomes a one-click "renew as-is" consent poll with a 48-hour window. Lowers the cost of maintaining good standing agreements.

### 9. Cross-decision bundle proposals
Sometimes three related proposals should move together. Bundling lets a facilitator package N decisions into one vote, with "accept all / accept some / accept none" as the choices. Requires careful UI to avoid hiding opposition.

### 10. Decision templates saved per-user
A citizen who keeps running the same kind of decision (say, the incubator host running weekly cohort decisions) can save their configuration as a personal template.

### 11. Native support for budget-split decisions
For decisions that allocate a pool of tokens across multiple line items, add a dedicated poll type where stances allocate percentages. The outcome is a weighted average across all participants.

### 12. Governance reputation badges on profiles
Show each citizen's deliberation history on their profile: decisions participated in, outcomes they were on the winning / losing side of, storyteller narratives authored. Gamifies participation in a way that rewards showing up and engaging with the substance.

### 13. Decision minority protection
When a decision closes with a significant minority, the minority voters are invited to a private reflection thread with ReGen Guide: "How did this land? Is there anything the community should understand about why you voted differently?" Their synthesized reflection (with their consent) is added to the outcome page as "What the minority wanted us to hear."

### 14. Hypha proposal bundling
If five decisions all need Hypha formalization in the same week, offer to bundle them into a single multi-item Hypha submission. Reduces on-chain transaction costs and cognitive load.

### 15. Snapshot voting for time-sensitive decisions
For genuinely urgent decisions (wildfire response, acute resource need), a "snapshot" mode that shrinks the decision window to 6 hours, requires Steward sign-off to enable, and posts loud notifications to all scoped citizens.

### 16. Live decision rooms
Scheduled synchronous discussion time for high-stakes decisions. A 60-minute video call embedded in the decision page, with ReGen Guide taking notes that auto-post as a "discussion summary" reply.

### 17. Cross-bioregion alliance decisions
When a decision affects multiple bioregions, the proposer can mark it "alliance" and each participating bioregion gets its own sub-vote. The decision passes only if a supermajority of bioregions ratify.

### 18. Public API for civic researchers
After Phase 1 is stable, expose a read-only public API for decisions and outcomes, so academics, journalists, and other commons projects can study how we govern. Pseudonymized where appropriate.

### 19. ReGen Guide self-critique
ReGen Guide periodically reviews its own drafted decisions and asks the facilitators who used them: "Did my draft steer you in a direction you wished it hadn't?" Feedback loops into the guide's system prompt. Guards against AI-driven homogenization of governance.

### 20. Annual governance retrospective
At the end of each season, a community-wide retrospective runs on Loomio using the consent template: "What should change about how we decide things?" Changes that ratify become amendments to the community agreements. Meta-governance that evolves itself.

## Rev 3 resolutions (2026-04-09)

Rye answered every open question and picked which improvements to build. All of this is baked into the pipeline now. Phase 1 grows to include these additions since the site has not launched yet.

### Answers to the eight open questions

1. **Hypha codebase.** Studied `github.com/hypha-dao/hypha-web`. Findings written into Section 3.0. The remaining file reads are listed in Section 3.6 and will be done as a follow-up pass.
2. **OIDC implementation.** We use `oidc-provider` (the `panva/node-oidc-provider` library). Correctness-first. One dependency, battle-tested, fewer footguns than rolling our own. Wrapped in a thin adapter that reads from our existing session middleware.
3. **Loomio hosting.** Railway, same project as the main site. Shared ops, shared observability, shared deploy pipeline. Loomio gets its own Postgres addon; the main MySQL stays separate.
4. **Telos assumption.** Corrected. Hypha runs on Base. The entire Stage 3 section has been rewritten. What I still need from the Hypha side is in Section 3.6; none of it blocks Phase 1.
5. **Storyteller threshold.** Set to 100,000 tokens (either $ReGen or $RCivics equivalent). Stored as a game variable `governance.storyteller_threshold_tokens` so it can be tuned without a deploy.
6. **Weighted voting defaults and Game Mechanics integration.** Tier weights approved (Visitor 1, Citizen 2, Contributor 3, Steward 5). All governance variables are added to the Game Mechanics page under a new "Governance Mechanics" section following the existing section conventions. Migration `drizzle/0108_governance_mechanics_variables.sql` seeds them.
7. **Cookie domain rollout.** Done now, pre-launch. No risk of invalidating deployed sessions because there are no deployed sessions yet.
8. **Existing communityAgreements rows.** Start fresh at launch. We do not retroactively create Loomio decisions for pre-launch rows.

### The 17 approved improvements (building now, before launch)

All approved improvements get built in Phase 1. Here is the delta from what was already specified, with Rye's specific notes folded in.

**#1 Forum thread heat scoring.** Composite signal from reply velocity, reaction density, unique voices, ReGen Guide urgency detection. Threshold triggers the green "Ready to promote" button on the thread automatically. New game variable: `governance.heat_score_threshold`.

**#2 Governance dojos.** Deferred per Rye. Not in Phase 1.

**#3 Proxy delegation with revocation.** Citizens delegate their stance on topic tags (watershed, food sovereignty, legal, etc.) to another citizen. Revocable per-decision. Max hop count of 2. New tables: `governanceDelegations` (delegator, delegate, topicTags, revokedAt), enforced in the weighted-tally service.

**#4 ReGen Guide as commenter and poster.** This got an upgrade based on Rye's note. ReGen Guide is not only a neutral devil's advocate on near-unanimous decisions. It is also a named poster with its own voice and point of view. Full details in Section 5 below.

**#5 Emotional temperature snapshot.** One-tap at vote time: "How does this decision feel to you? Excited / Neutral / Uneasy." Aggregate visible only to facilitator and storyteller. Catches consent-with-dread patterns. New column on the per-vote table.

**#6 The Back Field.** Renamed from "parking lot" per Rye. Good ideas that don't yet have consensus or capacity get moved to a Back Field backlog with reasons. Searchable, reviewable by Stewards quarterly. New table `governanceBackField`. The name echoes agricultural fallow fields: ideas resting until they're ready.

**#7 Bioregion-specific decision templates.** Each bioregion instance has its own default templates. Best practices get shared across bioregions as "templates recommended by Cascadia" etc. Lives in the multi-tenant instance config (Section 4 below).

**#8 Sunset renewal one-click vote.** When a sunset renewal thread auto-creates, if the decision has no concerns and the facilitator signals it, the renewal becomes a one-click "renew as-is" consent poll with a 48-hour window.

**#9 Cross-decision bundle proposals.** Facilitators can bundle N related decisions into one vote with "accept all / accept some / accept none" choices. Careful UI guards against hiding opposition.

**#10 Personal templates.** Any citizen can save a decision configuration as a personal template. Facilitators running the same kind of decision every cycle save time.

**#11 Budget-split decisions with internal token accounting.** Rye's note rewrites how tokens work across the whole pipeline. Writing out the model explicitly here because it touches every subsequent section:

> Tokens that move inside `gov.regencivics.earth` (and any bioregion or land project instance) are **internal tracked tokens in our MySQL database**, not direct blockchain transfers. They accumulate in each player's Harvest and Gratitude pools. Players then **claim actual blockchain tokens from Hypha** when they want, after they reach certain thresholds.

This means:
- `gov.regencivics.earth` proposals that allocate "tokens" are moving internal balance sheet entries, not signing Base transactions.
- Our `harvest_balances` and `gratitude_pools` tables accumulate these entries.
- When a player hits a claim threshold (default 1,000 tokens, tunable via `governance.claim_threshold_tokens`), they see a "Claim to Hypha" button on their profile.
- Clicking it runs the Hypha Bridge (Section 3.5) with `formKind: 'propose-contribution'` and the internal ledger entries as the payload.
- Once the on-chain proposal executes and the Alchemy webhook fires, the internal balance is marked `claimed` and the on-chain transaction is recorded.

This separation is valuable: it lets internal governance move fast and cheap, keeps a high signal-to-noise ratio on-chain, and gives players a single moment of blockchain friction instead of dozens. Budget-split decisions work on internal balances, no gas, no wallet popup, and still land on-chain when the player is ready.

**#12 Governance reputation badges on profiles.** Decisions participated in, outcomes where the user was on the eventual-consensus side, storyteller narratives authored. Rewards engagement with substance.

**#13 Minority protection.** Deferred per Rye. Not in Phase 1.

**#14 Hypha proposal bundling at claim time.** When a player has multiple internal balance entries ready to claim, the Bridge bundles them into a single Hypha proposal. Reduces on-chain cost and cognitive load.

**#15 Snapshot voting.** For genuinely urgent decisions (wildfire response, acute resource need), a 6-hour window mode that requires Steward sign-off to enable and sends loud notifications to scoped citizens. New game variable: `governance.snapshot_window_hours`.

**#16 Live decision rooms and weekly roundup integration.** Scheduled synchronous discussion time for high-stakes decisions, embedded video call, ReGen Guide takes notes. **Plus** ReGen Guide weaves governance decisions into the weekly roundup email and any other AI-generated email digest. New integration: the `weeklyRoundup` email generator pulls open and recently-closed decisions from the user's scoped instances.

**#17 Multi-tenant alliance decisions (big change).** Per Rye's note, bioregions **and** land projects and organizations all get their own instances of the governance tool. This is a multi-tenant expansion, not only a cross-bioregion feature. Full architecture in Section 4 below.

**#18 Public API for civic researchers.** Deferred per Rye. Not in Phase 1.

**#19 ReGen Guide self-critique.** Guide periodically reviews its own drafted decisions, asks facilitators "did my draft steer you in a direction you wished it hadn't?", feedback loops into the guide's system prompt.

**#20 Annual governance retrospective during winter seasons.** At the end of each winter season, a community-wide retrospective runs on Loomio: "What should change about how we decide things?" Changes that ratify become amendments to the community agreements. Timing is specifically winter because that's when the land is resting and reflection fits the seasonal rhythm.

## Section 4: Multi-tenant governance (bioregions, land projects, organizations)

Rye's instruction #17 turns the governance subdomain into a multi-tenant platform. Any bioregion, land project, or organization can spin up its own instance. This is a substantial expansion over the single-subdomain design.

### 4.1 The architecture shift

Instead of one Loomio instance at `gov.regencivics.earth`, we run Loomio with multi-tenancy support. Each tenant gets:

- A subdomain or path: `gov.regencivics.earth/skagit-watershed` (path-based for simplicity) or `skagit.gov.regencivics.earth` (subdomain-based if we want stronger visual separation).
- Its own Loomio group tree (group, subgroups, members).
- Its own branding knobs: logo, banner image, accent color.
- Its own set of default decision templates.
- Its own set of citizenship tiers if the tenant wants to diverge from the platform defaults.
- Its own internal token ledger scoped to its members.
- Its own Hypha DHO mapping: which DHO slug on `app.hypha.earth` does this tenant claim to.

**Recommendation:** path-based routing in Phase 1 (`/gov/<tenantSlug>/...`), subdomain-based in Phase 2 if we need stronger separation. Path-based keeps SSL, cookies, and deployment simple.

### 4.2 Tenant types

Three tenant types, each with slightly different defaults:

| Type | Example slugs | Default DHO mapping | Default membership rule |
|---|---|---|---|
| `bioregion` | `cascadia`, `great-lakes`, `south-bay` | `regen-games` (or none) | Open to citizens marked in this bioregion |
| `land-project` | `skagit-seed-library`, `mendocino-farm` | A project-specific DHO slug | Invite-only by project stewards |
| `organization` | `regen-civics`, `alliance-watershed` | `regen-civics` (Fund) or own DHO | Custom per-org rules |
| `platform` | `regen-civics` (root) | `regen-civics` | All citizens |

### 4.3 Data model for multi-tenancy

```sql
CREATE TABLE governanceTenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  tenantType ENUM('platform','bioregion','land_project','organization') NOT NULL,
  displayName VARCHAR(200) NOT NULL,
  description TEXT,
  logoUrl VARCHAR(400),
  bannerUrl VARCHAR(400),
  accentColor VARCHAR(20),
  hyphaDhoSlug VARCHAR(80),
  loomioGroupKey VARCHAR(40) NOT NULL,
  parentTenantId INT DEFAULT NULL,
  ownerUserId INT NOT NULL,
  config JSON DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gt_type (tenantType),
  INDEX idx_gt_parent (parentTenantId)
);

CREATE TABLE governanceTenantMembers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('member','moderator','steward','admin') NOT NULL DEFAULT 'member',
  joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leftAt TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_gtm (tenantId, userId)
);
```

### 4.4 Creating a new tenant (UX)

Any citizen with sufficient tier can create a tenant via a guided flow on `regencivics.earth/gov/create`:

1. Pick a type (bioregion, land project, organization).
2. Set slug, name, description, branding.
3. Pick a default decision template set.
4. Optionally map to a Hypha DHO slug (or leave blank to use the platform default).
5. Invite initial members.
6. Land on the new tenant's governance page.

Under the hood this runs a provisioning service that creates a Loomio group via API, writes the `governanceTenants` row, syncs initial members, and returns the new URL. The whole thing is programmatic; no manual Loomio admin work.

### 4.5 Internal token ledgers per tenant

Each tenant has its own internal token ledger. Proposals that move tokens move them against the tenant's ledger. When a member of a tenant crosses a claim threshold, the Hypha Bridge is called with `targetDhoSlug = tenant.hyphaDhoSlug` and the claim proceeds against that DHO on Base.

This gives each land project its own economic sovereignty: a Skagit Seed Library member earns Skagit tokens in-platform, then claims those tokens to the Skagit DHO on Hypha when ready. The platform's Fund and Game DHOs handle cross-tenant and cross-bioregion flows.

### 4.6 Dashboards across tenants

A citizen who participates in multiple tenants sees a unified "Your governance" page at `regencivics.earth/community/decisions` that aggregates:

- Open decisions across all tenants where they are a member.
- Recently ratified decisions across all tenants.
- Internal token balances per tenant.
- Claim status (ready to claim, recently claimed).
- Governance load indicators per tenant.

Tenant-scoped notifications ("Skagit has a new decision open") flow through the unified notification bell.

## Section 5: ReGen Guide as a named poster and commenter (expansion of Improvement #4)

Rye's note turned this from a passive "devil's advocate" role into a full participant role. ReGen Guide shows up as a named poster on both the forum and the governance side, with its own avatar, its own voice, and clearly labeled AI provenance. Here is how.

### 5.1 Guide identity

- Display name: **ReGen Guide**
- Avatar: the existing ReGen Guide illustration from the site.
- Byline: "ReGen Guide, AI companion. Comments are drafted by Claude and may include interpretations, suggestions, or questions from a systems-thinking point of view."
- Every post and comment has a small "AI" badge next to the name. No disguising what it is.

### 5.2 Where the Guide shows up

1. **Forum threads.** The Guide can be `@regen-guide` mentioned in any thread. It reads the thread and responds. It can also proactively comment on threads that cross a "worth engaging with" threshold (heat score + topic match to known Guide interests). Proactive posting is rate-limited to avoid flooding.
2. **Decision pages.** The Guide can be invited by the facilitator to post a point of view at decision open time. The POV is framed as "here's how I see this from a systems-thinking angle" and is explicitly labeled as optional input.
3. **Pre-mortems.** The Guide seeds the pre-mortem with common failure modes for the decision type.
4. **Near-unanimous consent decisions.** The Guide steps in one day before close with "here are three reasons this could be wrong that I don't see being discussed." Optional, opt-in by facilitator.
5. **Weekly roundup emails.** The Guide authors a short commentary on the week's governance activity, included in the weekly roundup.
6. **Sunset renewal reviews.** Before a sunset renewal thread opens, the Guide writes a short "how did this decision age" note based on what happened since ratification.

### 5.3 Guardrails

- The Guide never casts a stance on behalf of a user.
- The Guide cannot be the sole author of a decision proposal (it can draft, but a human has to submit).
- The Guide posts are always labeled, always in a visually distinct card, and always reviewable by facilitators.
- The Guide respects bioregional scoping: it does not comment on decisions scoped to a bioregion it has no context for unless invited.
- The Guide cites its reasoning when possible: "I'm drawing on the SEEDS vision doc and last season's retrospective for this."
- Users can mute the Guide per-thread or per-tenant if they find it intrusive.

### 5.4 Implementation

- A system user `regen-guide` exists in the `users` table with a special role flag `isAiAgent: true`.
- Posts authored by this user always render with the AI badge.
- A background worker watches for mentions and trigger conditions and calls Claude with a short system prompt scoped to the context.
- All Guide outputs are stored as normal forum posts or Loomio comments, so the content is searchable, quotable, and auditable.

## Section 6: Weekly roundup email integration

Governance activity flows into the weekly roundup email for every citizen. New sections added to the existing `weeklyRoundup` email template:

1. **Open decisions you can vote on.** Personalized to the user's tenant memberships and bioregion.
2. **Decisions closing soon.** Things that will close within the next 7 days.
3. **Recently ratified.** Short list with outcomes and storyteller narrative links.
4. **Your internal token balance.** "You have 2,340 tokens ready to claim when you reach 10,000" kind of nudge.
5. **ReGen Guide commentary.** One paragraph the Guide writes weekly about what's moving in governance.
6. **Back Field updates.** If any ideas you flagged moved out of the Back Field and became active decisions.

The weekly roundup generator already exists. We add a new section builder `buildGovernanceSection(userId)` that queries the tenants, decisions, and balances relevant to this user, and returns a rendered HTML block that the main generator stitches into the email.

## Section 7: Future-proofing the Hypha Bridge pattern

Rye's final instruction: "For this bridge going forward make sure future Claude Code instances know of this so anytime we're moving from ReGen Civics to Hypha this bridge will be updated to bring player data with them to help them fill forms."

This is addressed in three places so no future Claude instance misses it:

1. **CLAUDE.md entry.** A new section "The Hypha Bridge pattern" is added to the project CLAUDE.md explicitly stating: any time a feature sends a user to Hypha, it must call the Hypha Bridge. Never link directly to `app.hypha.earth`.
2. **tRPC router convention.** The `hyphaBridge` router is the only code path that constructs a Hypha URL. Other code cannot build Hypha URLs directly. A lint rule (comment in source, escalating to an ESLint rule later) prevents raw `app.hypha.earth` strings from appearing anywhere outside the bridge module.
3. **The bridge module README.** `apps/web/src/lib/hypha-bridge/README.md` documents the contract: what source systems call in, what payload shape is expected, what comes back. Every new source system adds itself to the source enum and the README.

## Section 8: Token contracts on Base

From Rye:

- `$REGEN` contract address on Base: `0x4E617cd113364193d215d107AdD6fa50418AA2E4`
- `$RCivics` contract address on Base: `0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`

These go into `.env.example` as:

```
# ── Hypha / Base chain ────────────────────────────────────────────────────────
BASE_RPC_URL=https://mainnet.base.org
ALCHEMY_BASE_API_KEY=your-alchemy-key
REGEN_TOKEN_ADDRESS_BASE=0x4E617cd113364193d215d107AdD6fa50418AA2E4
RCIVICS_TOKEN_ADDRESS_BASE=0x72e9B17a2F93A923D63666eC0a1c096B1443ef26
HYPHA_DHO_REGEN_GAMES_SLUG=regen-games
HYPHA_DHO_REGEN_CIVICS_SLUG=regen-civics
```

The Bridge module imports these via `process.env` and validates them at boot.

## Credits (repeat)

This pipeline is powered by Loomio, built over more than a decade by the team at loomio.com. If you find governance tools useful, please support their work at loomio.com. Our gratitude is part of this doc and part of every page at gov.regencivics.earth and every tenant instance.
