# Claude Code Build Prompt: Bounty Board + Valuation Engine

Date: 2026-07-01
Scope: move the open-bounties board off the investor page onto a dedicated, beautiful `/bounties` page in the Game section; redesign it; add a deterministic bounty valuation engine; add gratitude top-ups on completed bounties; wire it into every menu. Build in phases with the ship gate between each.

## Read first

- `CLAUDE.md`, `.ai/docs/STEERING.md` (section 1 writing rules, section 5 token model, section 11 deterministic-first).
- `.ai/docs/security/AI-AUTOMATION-RISKS.md` (the LLM classifies, humans consent).
- `BOUNTY_VALUATION_ENGINE_SPEC.md` (canonical engine spec that Part 1 builds), `BOUNTY_BOARD_REDESIGN_PLAN.md` (the design brief), `GRATITUDE_SYSTEM_SPEC.md`, `BOUNTY_ENGINE_SPEC.md`, `COORDINATION_ENGINE_WORKFLOW.md`.
- Skills: `regen-database-sql`, `regen-deterministic-first`, `regen-fixes-handoff`, `regen-ship-gate`.

## Ground rules

- Writing rules in all copy: zero em-dashes, no contrast framing, no AI-tell words.
- Token model (STEERING 5): every payout and every gratitude credit goes through `db.creditPrivateTokens` with a source tag. Reads use total, writes touch private only, one-way private to public. Never write public balances directly.
- Deterministic-first: the money math is deterministic code driven by `game_variables`. The one nondeterministic step stays the LLM reading a transcript. Do not add new LLM calls.
- Consent gates stay: maintainer accept, then consent-before-payout. Gratitude is a gift from a bounded budget, not a payout, but it still credits tokens and must be source-tagged and budget-checked.
- One token for now: everything in this system pays $ReGen. The schema keeps a token field so another token can be added later, but do not use $RCivics yet. No USD anywhere; show $ReGen amounts only.

---

## Part 1: The bounty valuation engine

Build this to the canonical spec `BOUNTY_VALUATION_ENGINE_SPEC.md`. Read that file; it holds the full formula, factor bounds, the game_variables catalog with defaults and descriptions, and the mechanics-page copy. Summary of the work:

- Replace the LLM's raw `bountyAmount` (`runExtractTasksPass`, used in `coordinationPipeline.ts` ~568/681) with a classification `{ scopeTier, impactLevel, roleSlug, urgency }`. Keep the evidence-quote requirement.
- Add `computeBountyAmount()` in a new `server/db/bountyValuation.ts`: `base(scopeTier) * impact * priority * demandFactor`, anchored to the precedent median, capped by `bounty.max` and, when a season budget is set, the remaining budget, rounded to `bounty.round_to`. Everything is $ReGen for now. There is no role-band multiplier; scarcity is a task-level priority boost only. Store the full breakdown on the bounty (new `valuationBreakdown` JSON column).
- Self-learning: in `coordinationFlywheel.ts`, recompute per `(circle, scopeTier)` over a rolling window the precedent median and a bounded `demandFactor` that rises when bounties go unclaimed (the bolder nudge) and falls gently when they are claimed instantly. Store in a new `bounty_demand_factors` table. This is the loudest signal we have: an unclaimed bounty means the reward is too low.
- Lock the amount and its breakdown at accept; later weight or factor changes never touch an accepted bounty.
- `bounties.accept` shows the suggested amount and the breakdown and allows a logged override (the human consent on value). Consent-before-payout is unchanged.
- Governance is hybrid: every `bounty.*` weight is a `game_variable`; stewards tune within published bounds, the Season Festival ratifies the table, and Hypha votes structural changes. Changing the published bounds themselves is a Hypha vote.
- Transparency: add a "How Bounties Are Valued" `CollapsibleSection` to `client/src/pages/GameMechanics.tsx`, matching the existing weight sections. Put the governance explainer paragraph (verbatim from the spec) at the top of the section. Render live values from `game_variables`, add a `VARIABLE_DESCRIPTIONS` entry for every `bounty.*` key, show the learned demand factors per circle and the per-circle budget (committed versus available), and add a valuation simulator (tier plus impact yields the computed reward) in the style of the existing Game Simulator.

Decisions (locked): everything pays $ReGen (the `tokenType` field stays for the future, do not use $RCivics); base amounts $ReGen 25 / 75 / 250 / 750; impact proposed by the LLM and confirmed by the maintainer; no season or circle cap by default (optional `bounty.season_budget` variables Rye sets from admin later); the detail view is a shareable `/bounties/:id` route; changing the bounds is a Hypha vote. Full defaults are in the spec.

---

## Part 2: Backend for the board

- Enrich `bounties.listBoard`: also return the source recording `title` (join on `recordingId`), the role display `name` and `circle` (join `roles` on `roleSlug`), the `evidenceQuote` and `evidenceTs`, `createdAt`, `expiresAt`, and the valuation breakdown. Add optional `roleSlug` and `circle` filters and a `sort` param (newest, reward, closing).
- `bounties.get`: return the `sociocraticOverview` (purpose, whyThisRole, steps, definitionOfDone, consentCircle) and the valuation breakdown for the detail view.
- Recently completed: a `bounties.recentCompleted` query returning paid bounties with the doer (name, handle, avatar), amount, and the gratitude tally attached to each.
- Gratitude top-up: reuse the existing gratitude flow (`server/routes/gratitude.ts` / `game.sendGratitude`, `gratitude_budgets`). Add a way to attach a gratitude gift to a completed bounty: pass the bounty id so the ledger `sourceRef` is `bounty:{id}` and the receiver defaults to the bounty's doer. It draws from the sender's season gratitude budget (bounded, no minting), credits the doer's private tokens with the gratitude source, and records the score events. Add a query for the gratitude total per bounty. Do not modify the bounty's paid amount; the gratitude is additive and shown alongside.
- Return `valuationBreakdown` on every query that surfaces a reward (`listBoard`, `get`, `listMine`, `adminQueue`, `recentCompleted`), so the reward tooltip can explain any amount wherever it appears.

---

## Part 3: The `/bounties` page and components

Create `client/src/pages/Bounties.tsx` and route `/bounties` in `client/src/App.tsx` (lazy). Refactor the guts of `OpenToCircleCallTasks` into a `BountyBoard` the page renders. Components and features:

- Hero and live stats strip: "N open bounties, X $ReGen available, C circles need help." Recruiting empty state when the board is empty (explain bounties are born from community sessions, invite people to attend or host, link to Quests and to Propose a bounty). The board is empty in production today, so the empty state is the first thing most people see; make it warm and clear.
- Filters and sort: type (session task or code contribution), role or circle, tier; sort newest / reward / closing soon.
- My work rail (signed in): "You are working on N" linking to Profile then Call Tasks, so the board is also a re-entry point.
- Propose a bounty CTA: surface the existing `bounties.propose` mutation so the community can add needs directly, not only the engine. Keep it behind the same approval gate.
- `BountyCard`: title; provenance chip "From: {session}" deep-linking to the recording on the Schedule page at `&t={evidenceTs}s`, with the evidence quote; the reward rendered through the `RewardAmount` component (below) with a coin motif; role and circle badge, color-coded by circle; effort in human terms from the tier; freshness ("opened 2 days ago") and, when `expiresAt` is set, "closes in N days"; for signed-in users a "For your role" badge when it matches a role they hold; Claim button (existing `claimRole`).
- Reward transparency everywhere, a reusable `RewardAmount` component (`client/src/components/bounty/RewardAmount.tsx`): renders any reward as "250 $ReGen" with a small info affordance beside it; clicking or focusing it opens a popover that explains that exact amount in plain language from the stored `valuationBreakdown` (for example: base for a medium task 250, impact serves a land project times 1.5, community demand times 1.0, rounded to 375), with a link to the full model on the game mechanics page. Use it in every place a reward is shown: the board cards, the detail view, the recently-completed strip, the Profile Call Tasks tab (`ProfileCallTasksTab`), and the admin Tasks queue (`AdminTasksTab`). Reuse the existing tooltip and popover primitives and make it keyboard-accessible.
- `BountyDetail` at a shareable `/bounties/:id` route (a facilitator can drop the link in the forum or a chat to recruit): the sociocratic overview (purpose, why this role, steps, definition of done, consent circle), the evidence quote and source session, the valuation breakdown ("valued as: medium base times high impact"), the claim action, and a clear next-steps panel (do the work, submit an artifact, consent, get paid) linking to Profile then Call Tasks. Set the page title and OpenGraph meta from the bounty (title and summary) so a shared link previews well.
- Recently completed strip with gratitude: show recent paid bounties, who did each, the amount, and a running gratitude tally. Each row has a "Send gratitude" button that opens the existing `SendGratitudeModal` pre-filled with that doer and the bounty reference, drawing from the sender's gratitude budget. This lets an excited community add on to what a task earned. Show the sender's remaining gratitude budget (`myGratitudeBudget`) so the ask is grounded.
- Subscribe (follow-up, see the scope note below): a "notify me when a {role or circle} bounty opens" control, using the existing notification preferences, so people do not have to keep checking.
- Design: follow `DESIGN_SYSTEM.md` and the game's forest aesthetic (deep greens, `--font-display`, the soft `#7dd87d` glow already in the current card). Card grid, not one column. Circle color-coding, coin iconography for rewards, real hover states, skeleton loaders with no layout shift. Mobile-first and accessible (contrast, keyboard claim, aria labels).
- Integrity, state it in code comments so it is not lost: claim limits so no one hoards claims, the flywheel already releases and expires stale claims, and payout still needs consent. The board surfaces open work, it does not bypass any gate.

---

## Part 4: Wire "Bounties" into every menu, right under Quests (Game section)

- `client/src/components/Navigation.tsx`: add a "Bounties" item to the "Play the Game" dropdown immediately after "Explore Quests"; add `/bounties` to the `isPlayGameActive` check; add it to the lazy prefetch map and the dropdown `onMouseEnter` prefetch; add it to the mobile "Play the Game" section in the same file.
- `client/src/components/CommandPalette.tsx`: add a Bounties command in the Play or Game group.
- `client/src/components/NavCustomizeSheet.tsx`: add `{ path: "/bounties", icon: ..., label: "Bounties", category: "Game" }`.
- Mobile menus: `client/src/components/mobile/MenuCard.tsx`, `WizardRadialMenu.tsx`, and any mobile nav list get a Bounties entry near Quests.
- `client/src/components/ProgressMap/mapData.ts`: add a "Bounties" landmark on the Play path near the Quests node.
- `client/src/components/StructuredData.tsx` and the JsonLD sitemap: add the `/bounties` URL.
- Footer and `client/src/components/FooterSearch.tsx`: add Bounties to the game links.

## Part 5: Remove it from the investor page

Delete `<OpenToCircleCallTasks />` and its import from `client/src/pages/Opportunity.tsx`. The investor page carries no bounties. You may keep the `OpenToCircleCallTasks.tsx` file if `BountyBoard` reuses it, otherwise fold it in and remove it.

---

## Correctness, data, and testing

Data and migrations. Follow the repo convention: hand-written numbered `drizzle/NNNN_*.sql` run through `scripts/run-migration.ts`, with `schema.ts` updated as the type source. No ad-hoc SQL scripts. New schema: a `valuationBreakdown` JSON column, a `sociocraticOverviewJson` column, and a `priorityBoost` boolean on `bounties`; a `bounty_demand_factors` table; and the `game_variables` seed for every `bounty.*` key. Rye runs migrations against production.

Persist the sociocratic overview. `runExtractTasksPass` already generates `sociocraticOverview` (purpose, whyThisRole, steps, definitionOfDone, consentCircle) and the pipeline currently throws it away. Store it on the bounty at insert so the detail view can show it. Player-proposed bounties have none; the detail view falls back to the body.

Priority (hard to fill). The `priority` factor reads the `priorityBoost` boolean on the bounty, never a guess inside `computeBountyAmount`. Set it two ways: a maintainer toggle at accept, and automatically in the flywheel when a bounty's role is unfilled and the bounty has sat open past `bounty.learning.unclaimed_days`.

Demand data source. The flywheel computes demand from the existing `bounty_events` (claimed, released, expired) and `bountyRoles`, so no new event logging is needed.

Graceful legacy. Bounties created before this ships have no breakdown. `RewardAmount` shows the amount with a tooltip saying the breakdown was not recorded, never an error.

For your role match. Fetch the viewer's held roles (`roleHolders` by userId) and compute the match client-side to badge bounties for a role they hold.

Testing, part of each phase's evidence:

- Unit test `computeBountyAmount`: base times impact times priority times demand, the precedent anchor, the max and budget caps, and rounding, including edge cases (no precedent yet, a factor at its bound, budget nearly exhausted).
- Unit test the demand recompute: it raises on an unclaimed rate, lowers gently on fast claims, clamps to the bounds, ignores samples below the minimum, and moves in steps.
- Test the gratitude-on-bounty guard: it debits the sender's season budget, credits the doer's private tokens with the correct source, and refuses when the budget is insufficient.
- Keep the existing bounty-lifecycle tests green.
- For local testing, seed a handful of example bounties across tiers and circles with a dev-only script (never run in production), or reprocess a real session to generate proposals.

Scope for the first ship. Parts 1 to 5. The Subscribe control is a follow-up that needs a `bounty_subscriptions` table and a notify hook in `accept`; build it after the board lands and do not let it hold the first ship.

## Integration notes (do not miss these)

These are places the existing code will bite if you assume the obvious. Verify each against the real files first.

- One token for now. Everything pays $ReGen. The pipeline already sets `tokenType: "regen"`; leave the field in place so another token can be added later, but do not branch on role kind yet.
- Budgets are optional and off by default. Keep the existing single `bounty.season_budget` game variable, where null or zero means no cap, and also read an optional per-circle `bounty.season_budget.{circle}` when set. Both are empty by default; Rye sets them from admin only when the community wants a cap. Even with no cap, `bounty.max` and the clamped demand factor keep amounts bounded. A bounty with no circle (some player proposals) falls back to a `general` circle for demand keying.
- The accept UI shows the value. Extend the admin Tasks queue (`AdminTasksTab`) so accepting a bounty shows the suggested amount and its breakdown and lets the maintainer adjust scope and impact, toggle the priority boost, or override the amount with a logged reason, then lock. This is the human consent on value in a real UI.
- Player-proposed bounties go through the engine too. `bounties.propose` takes a `scopeTier` from the proposer; impact defaults to `normal`; the maintainer confirms or adjusts scope and impact at accept, then the amount locks. Do not leave player proposals on the old tier-or-zero path.
- The simulator is a server query, not client math. Add `bounties.simulateValuation({ scopeTier, impactLevel, circle })` that runs the real `computeBountyAmount`, and have the mechanics-page simulator call it, so the shown math can never drift from the engine.
- Extract-tasks output and both insert sites change. Update the `ProposedTaskDraft` interface and the parse to carry `scopeTier` and `impactLevel` instead of `bountyAmount`, and update both insert call sites (around lines 568 and 681 in `coordinationPipeline.ts`) to call `computeBountyAmount`, set `tokenType` from the role kind, and store the breakdown and the sociocratic overview.
- Gratitude targets the worker, not the proposer. For a contribution bounty with multiple paid roles, the top-up goes to the shipper.
- `RewardAmount` inside a clickable card must stop click propagation so opening the tooltip does not also open the detail, and the popover must open on tap for touch, not hover only.
- Match the existing menu category. In `NavCustomizeSheet.tsx` and the nav dropdowns, use the same category and grouping the Quests and Play entries already use; do not invent a new label.
- The reward tooltip's "see the full model" link points to the mechanics-page section anchor (for example `/game-mechanics#how-bounties-are-valued`).

## Definition of done (end to end)

Reprocess a real session or a seeded fixture and confirm the whole loop: a proposal appears with a computed amount and a stored breakdown; it renders on `/bounties` with the reward tooltip explaining the math; a claim, artifact submit, consent, and pay move it to completed; it appears in the recently-completed strip; a gratitude top-up debits the sender and raises the doer's tally; `/game-mechanics` shows the live weights, the per-circle budget, and the simulator; the menus link to `/bounties` under Quests on desktop and mobile; and the investor page shows no bounties.

---

## Build order

1. Part 1 valuation engine per `BOUNTY_VALUATION_ENGINE_SPEC.md`: the `valuationBreakdown` column and `bounty_demand_factors` table, the game_variables seed with `VARIABLE_DESCRIPTIONS` entries, `computeBountyAmount`, the extract-tasks classification change, the flywheel demand-and-precedent learning step, and the "How Bounties Are Valued" section on `GameMechanics.tsx`. Ship gate.
2. Part 2 backend (listBoard enrichment and filters, `bounties.get` overview, `recentCompleted`, gratitude-on-bounty). Ship gate.
3. Part 3 the page and components. Ship gate.
4. Part 4 menu wiring, then Part 5 removal. Ship gate.

## Ship gate (each phase)

```
python3 scripts/audit-truncation.py
rg -g '*.css' '<any-new-className>' client/src/
pnpm typecheck
```

Also run the test suite (`pnpm test`) and add the new unit tests below. Provide evidence per phase (typecheck exit 0, the new tests passing, changed files, a screenshot of the new page).

## Handoff Breakdown

### YOU (Rye)

| # | Task | Where |
|---|------|-------|
| 1 | Optional and later: set a `bounty.season_budget` from admin if the community wants a cap | admin game variables |
| 2 | Run the new migrations (breakdown column, any gratitude-on-bounty column) and the game_variables seed | `npx tsx scripts/run-migration.ts ...` on your machine |
| 3 | Decide modal vs `/bounties/:id` for the detail view | reply on this doc |
| 4 | Verify the live page and menus after deploy | production |

### CLAUDE CODE

| # | Task | Status target |
|---|------|--------------|
| 1 | Valuation engine (classify then compute, breakdown, governance vars) | CODED, ship gate green |
| 2 | Board backend (listBoard, get, recentCompleted, gratitude-on-bounty) | CODED |
| 3 | `/bounties` page and components | CODED |
| 4 | Menu wiring across all surfaces, removal from Opportunity | CODED |

## Decisions (locked)

- One token: everything pays $ReGen. `tokenType` stays in the schema for the future; do not use $RCivics.
- Base amounts: $ReGen 25 / 75 / 250 / 750.
- Impact: LLM proposes, maintainer confirms at accept.
- Budgets: no season or circle cap by default; both are optional `bounty.season_budget` game variables Rye sets from admin when needed.
- Detail view: a shareable `/bounties/:id` route with OpenGraph meta.
- Changing the published bounds is a Hypha vote.
- Gratitude top-up draws from the sender's existing season gratitude budget (no new token source).
