# Bounty Valuation Engine (spec)

Date: 2026-07-01
Status: canonical design for how a bounty's token reward is determined. The Claude Code build prompt `CLAUDE_CODE_PROMPT_2026-07-01_BOUNTY_BOARD.md` Part 1 executes this.

## Purpose and principles

How much $ReGen a bounty is worth should be transparent, consistent, values-aligned, and tended by the community rather than decreed. Principles:

- Value, not hours. Rewards track the size and impact of the work, never time spent.
- Transparent by default. Every number is a public `game_variables` key with a plain-language description on the game mechanics page. Anyone can see how a task became an amount.
- Deterministic. The LLM does the one nondeterministic thing (read a transcript and classify the work). All money math is deterministic code driven by public weights.
- Self-learning. The engine watches what the community actually claims and completes, and what it ignores, and calibrates. Unclaimed bounties are the loudest signal that a reward is too low.
- Community-governed. Stewards tune within published bounds, the whole table is ratified each Season Festival, and structural changes go to a Hypha vote.
- Bounded and fair. Every factor has published min and max limits, budgets cap total emission, and an amount locks the moment a maintainer accepts it, so a later weight change never alters a deal someone already agreed to.
- No role status pricing. There is no multiplier for which role or band the work belongs to. Scarcity lives on the specific task, not on a class of person.

## The model, in one sentence

A bounty's reward is a base amount for its size, raised or lowered by how much it serves the movement and by what the community is actually claiming, then kept within the season's budget.

## The formula

```
base       = bounty.tier.{scopeTier}.base
impact     = bounty.impact.{impactLevel}                 // low 0.75 / normal 1.0 / high 1.5
priority   = taskFlaggedHardToFill ? bounty.priority.boost : 1   // 1.25
demand     = demandFactor[circle][scopeTier]             // learned, bounded, default 1.0
raw        = base * impact * priority * demand
anchored   = raw*(1 - bounty.anchor.weight) + precedentMedian(scopeTier, circle) * bounty.anchor.weight
capped     = min(anchored, bounty.max, seasonBudgetRemaining)    // seasonBudgetRemaining is Infinity when no cap is set
amount     = roundTo(capped, bounty.round_to)
```

- One token for now: everything pays `$ReGen`. The `tokenType` field stays so another token can be added later, but nothing branches on it yet.
- If there is no precedent yet for a `scopeTier` and circle, `anchored = raw`.
- The full breakdown (`base, impact, priority, demand, anchor, precedentMedian, token`) is stored on the bounty so every amount is explainable.

## Inputs: classify, then confirm

The extract-tasks pass outputs a classification, not a number: `{ scopeTier, impactLevel, roleSlug, urgency }`.

- scopeTier: trivial (a quick favor), small (one clear deliverable), medium (a real piece of work), large (a substantial build). Framed in outcomes, never hours.
- impactLevel, with public criteria so a rating can be contested:
  - high: directly serves a land project, unblocks a season, or heals a real relationship or system in the movement.
  - normal: moves the movement forward. Most work lands here.
  - low: internal polish or nice-to-have.
- The LLM proposes the classification from the transcript. The maintainer confirms or adjusts it at accept. The circle consents before any payout. The model never sets value alone.

## The self-learning loop (demand-aware calibration)

The daily flywheel (`coordinationFlywheel.ts`, already deterministic) recomputes two things per `(circle, scopeTier)` over a rolling window, and the valuation engine reads them:

1. precedentMedian: the median amount of completed bounties in the window. This calibrates toward what the community has actually honored.
2. demandFactor: a bounded multiplier that responds to whether bounties are being claimed.

Demand logic, asymmetric on purpose:

- Unclaimed signal. Count bounties that sat open past `bounty.learning.unclaimed_days` without a claimer, or expired unclaimed. A high unclaimed rate nudges the factor up: `factor *= 1 + bounty.learning.raise_sensitivity * unclaimedRate`. Underpricing means the work does not get done, which is the worst outcome for the movement, so this nudge is the bolder one.
- Fast-claim signal. If nothing is going unclaimed and the median time-to-claim is very short, nudge gently down toward 1: `factor *= 1 - bounty.learning.lower_sensitivity * fastClaimSignal`. Kept small, because a fast claim often just means good work, not overpayment.
- The factor moves in small steps each cycle (never a jump), is clamped to `[bounty.learning.factor_min, bounty.learning.factor_max]`, and ignores tiny samples (needs a minimum count before it moves). Learned factors are stored in a `bounty_demand_factors` table (`circle, scopeTier, factor, sampleSize, updatedAt`) and shown on the mechanics page grouped by circle, so the community can watch the economy adjust in real time (for example: "medium Storytelling bounties kept going unclaimed, so the reward rose 15 percent").

A season budget is optional and off by default. When Rye sets one from admin, it caps total emission. Even with no cap, the per-bounty `bounty.max` and the clamped demand factor keep amounts bounded, so learning changes per-bounty value without runaway.

## Locking and versioning

An amount is a suggestion until a maintainer accepts the bounty. At accept it locks, with the full breakdown stored. Changing a weight, a demand factor, or a base amount only affects bounties proposed afterward, never one already accepted. This protects trust: what you agreed to is what you get.

## Governance (hybrid)

Three levels, trading legitimacy against speed:

- Stewards tune within published bounds for day-to-day health (every factor has a min and max the tuning cannot cross).
- The whole table is reviewed and ratified together by the community at each Season Festival (the existing "Choose" movement).
- Structural changes go to a Hypha weighted vote. Changing the published min and max bounds themselves is structural and always goes to a Hypha vote.

The mechanics page shows every `bounty.*` variable with its live value, its description, when it last changed and by whom, and a "propose a change" link that opens the governance path.

## Transparency: the game mechanics page section

Add a "How Bounties Are Valued" `CollapsibleSection` to `client/src/pages/GameMechanics.tsx`, matching the existing sections (live values from `game_variables`, descriptions from the `VARIABLE_DESCRIPTIONS` map, a simulator like the existing Game Simulator).

At the top of the section, a short governance explainer (use close to this wording):

> How these values are set. Every number here is public and lives in the game's shared settings. Stewards can make small adjustments within published limits to keep the board healthy day to day. The engine also learns on its own: when a kind of bounty keeps going unclaimed, it raises the reward, and it calibrates toward what the community has actually paid for similar work. Larger or structural changes go to a community vote on Hypha, and the whole table is reviewed and ratified together at each Season Festival. Nothing here is fixed by decree; it is tended by the community and by the movement's real activity.

Then the section shows: the one-sentence model; the four tier base amounts and what each tier means; the three impact multipliers with their criteria; the priority boost; the anchor weight; the learning sensitivities and window; the learned demand factors per circle; and a per-circle budget readout (committed versus available this season, which doubles as the "transparent funds" value made visible). A valuation simulator lets anyone pick a tier and an impact level and watch the $ReGen compute.

## Anti-gaming and integrity

- Every LLM-proposed task must carry an exact transcript quote or it is dropped.
- The maintainer override is logged with a reason.
- Payout still requires circle consent and passes the season-budget guard.
- Every multiplier is bounded, so a bad or malicious edit cannot multiply the economy.
- The learning loop uses aggregate statistics over a window, which is hard for any individual to game, and moves in small clamped steps.
- Amounts lock at accept and round to clean numbers.

## Data and variables

New: a `bounty_demand_factors` table (`circle`, `scopeTier`, `factor`, `sampleSize`, `updatedAt`); a `valuationBreakdown` JSON column on `bounties`; the classification fields already flow from extract-tasks.

`game_variables` catalog (each also gets a `VARIABLE_DESCRIPTIONS` entry):

- `bounty.tier.{trivial|small|medium|large}.base`, the base $ReGen reward for a bounty of that size. Defaults 25 / 75 / 250 / 750.
- `bounty.impact.{low|normal|high}`, how much serving the movement raises or lowers the reward. Defaults 0.75 / 1.0 / 1.5.
- `bounty.priority.boost`, the nudge a specific hard-to-fill bounty gets to attract someone. Default 1.25.
- `bounty.anchor.weight`, how strongly a reward is pulled toward what similar work has actually paid. Default 0.25.
- `bounty.learning.window_days`, how far back the engine looks when it learns. Default 45.
- `bounty.learning.unclaimed_days`, how long a bounty sits open before it counts as an unclaimed signal. Default 14.
- `bounty.learning.raise_sensitivity`, how boldly the reward rises when a kind of bounty keeps going unclaimed. Default 0.15.
- `bounty.learning.lower_sensitivity`, how gently the reward falls when bounties are claimed instantly. Default 0.05.
- `bounty.learning.factor_min` / `bounty.learning.factor_max`, the floor and ceiling on how far learning can move a reward. Defaults 0.9 / 1.4.
- `bounty.max`, a safety ceiling in $ReGen on any single bounty.
- `bounty.round_to`, rounds rewards to clean numbers. Default 25.
- `bounty.season_budget` and optional `bounty.season_budget.{circle}`, an optional cap on total emission. Off by default (null means no cap); Rye sets it from admin only when the community wants one.

## Integration and migration

- `runExtractTasksPass`: return the classification, drop the raw `bountyAmount`. Keep the evidence-quote requirement.
- Pipeline and `bounties.propose`: call `computeBountyAmount` to set the amount and store the breakdown.
- `bounties.accept`: show the suggested amount and breakdown, allow a logged override, then lock.
- `coordinationFlywheel.ts`: add the demand and precedent recompute step, writing `bounty_demand_factors`.
- `GameMechanics.tsx`: add the section, descriptions, simulator, budget readout, and governance explainer.
- Existing proposals keep their amounts, or are reclassified on next touch.

## Decisions (locked)

- One token: everything in this system pays $ReGen. The `tokenType` field stays in the schema so another token can be added later; do not use $RCivics yet.
- Base amounts: $ReGen 25 / 75 / 250 / 750.
- Impact is proposed by the LLM and confirmed by the maintainer at accept.
- No season or circle cap by default. Both are optional `bounty.season_budget` variables Rye can set from admin later. The per-bounty `bounty.max` and the clamped demand factor keep amounts bounded meanwhile.
- The detail view is a shareable `/bounties/:id` route.
- Changing the published bounds is a Hypha vote.
