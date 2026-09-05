# Crowdpooling: the money half, build plan

**Date:** 2026-09-05
**Status:** Rye ruled on the blockers 2026-09-05. This supersedes the "what to build"
section of `CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md`.
**Depends on:** four open questions in section 6. Rows marked BLOCKED do not start.

---

## 1. What Rye ruled, and what it means for the two standing decisions

### Locked decision #1 is narrowed, not deleted

The original ban: "no platform token credits for crowdpooling, ever. The
`campaign_contributions` -> `user_token_ledger` path does not exist and must not be
added."

Rye, 2026-09-05: *"decision one bans using one of the four platform tokens for this.
I would agree that we issue a new type of token for this mechanism, that it's campaign
financial contributions that we're tracking."*

**So the ban on crediting $ReGen, $RGVoice, $RCVoice and $RCivics for a crowdpool
pledge STANDS.** What changes is that a fifth, separate token type now exists for
recording campaign financial contributions. It is not in the four-token model, it does
not touch `user_token_ledger`, and it gets its own ledger.

`CROWDPOOLING_PLATFORM_SPEC.md` decision #1 and Part F need an amendment recording this
narrowing, with the date and the reason. Do not edit the original text; append.

### Founder ruling R92 loses its hard block, keeps its default

R92 (2026-08-29, ADR-52): "there is no pre-issued treasury... build nothing that
assumes one", enforced by `server/tokenMintModel.test.ts:113`, which fails the build if
`drizzle/schema.ts` declares a table named `treasury` or `treasury_balances`.

Rye, 2026-09-05: *"some projects would actually like to set a treasury cap and
allowance, so having a hard rule that blocks this would block those projects, let's
remove this, but stay with the default that no max or pre-issued treasury exists."*

**Action:** remove the schema-name assertion from `tokenMintModel.test.ts`. Keep the
default: no treasury exists and no cap is set unless a project opts in. Replace the
banned-name test with one that asserts the DEFAULT, which is the thing actually worth
protecting: a project with no treasury configuration has no treasury row, no cap, and
no pre-issued supply. That is a stronger guard than a name ban and it does not block
the projects that want a cap.

A new ADR supersedes ADR-52 rather than editing it.

### The percentage moved from 80/20 to 90/10

Rye, 2026-09-04: *"Lets make the default 80/20 now."*
Rye, 2026-09-05: *"right now, let's build out it so that it's ninety percent. so that
we're matching what the opportunity page is saying anyway and make sure they're
coherent consistent."*

**90% earmarkable is the current ruling.** The number changed inside 24 hours, which is
the argument for the first design decision below: it is a season-scoped game variable,
never a constant. `crowdpool.earmarkable_pct`, default 90.

---

## 2. The flow, as ruled

1. A contributor sends money to ReGen Civics. Not to a project. Ever.
2. The money enters **escrow**. ReGen Civics has not accepted it yet.
3. The contributor is credited **placement tokens**, the new type, at $1 per token, for
   90% of the contribution. The other 10% is not placeable (see open question 1).
4. The contributor **places** those tokens across the cohort's campaigns, in any split.
   Placement is **non-binding and movable** right up until a campaign closes.
5. A campaign **closes** when it passes BOTH its funding threshold AND its self-set time
   minimum (3 months typical, 9 months maximum).
6. On close: the project issues tokens on Base tied to its legal entity or whatever the
   agreement is; escrowed funds for the placements on that campaign flow to the project;
   ReGen Civics **fully accepts** those contributions and issues the contributor
   **equity in ReGen Civics**.
7. A campaign that does not close within 9 months does not join the index fund that
   season. Placements on it are refunded or re-placed (open question 3).

**The state of a contribution, plainly:** money in escrow, a placement token recording
it, a non-binding earmark saying where the contributor wants it to go, and no legal
stake in anything until a campaign closes. The token records what will be true
elsewhere later. Today it records only the financial commitment.

---

## 3. Design decisions that follow

**The split is a variable, not a constant.** `crowdpool.earmarkable_pct` in
`game_variables`, default 90, season-scoped. It moved once already. Any code that
hardcodes 90 is wrong.

**Escrow is a LEDGER, not a balance.** Append-only, source-tagged, in the shape
`user_token_ledger` already uses. Refunds, re-placements, partial closes and
reconciliation all need history, and a balance column cannot answer "why". The sibling
repo's whole economy is built this way and the one thing that never broke under attack
was conservation, precisely because the ledger is the record and the balance is a cache.

**Placement is a mutable allocation, and it must be snapshottable.** Rows of
(contributor, campaign, amount, placedAt). It changes freely until a campaign closes,
at which point the placements on that campaign freeze. Build it with the freeze in mind
now, because the village-os economics session raised the right flag: *"if placement is
non-binding it is fine; the day it influences an allocation it is a franchise, and it
will want the same treatment"* - say whose weight it is, snapshot it when it counts,
refuse to move it after the moment it decides. Rye has ruled it non-binding, so the
franchise treatment is not needed today. Making it cheap to add later costs nothing now.

**The stake is a HOLDING, never a token.** `backingInstrument` is
`recorded_agreement | hypha_onchain | llp_equity`. Rye was explicit that each deal is
unique and some are equity in a real legal entity. Any model that assumes a token has
to be torn out for the first LLP.

**The refund path ships with the contribution path, not after it.** Escrow without a
tested refund is the worst possible half-built state: money in, no way out. This is the
one sequencing rule in the plan that is not negotiable.

**The disclaimer has to be structural, not decorative.** Rye: *"we just need to have a
disclaimer saying that they're not the legal stake in the organization yet and won't be
until and if these campaigns close."* A disclaimer that says "not a legal stake" while
the UI calls it your stake, shows a portfolio and renders a valuation is decorative. The
product language has to match the legal claim: a placement token is a **recorded
contribution**, not a holding, until close. The legal lane is checking how much weight a
disclaimer can actually carry; the early read is that disclaiming security status
generally does not work, and what a disclaimer does well is discharge a disclosure duty
rather than change a characterisation. Build for that.

**Nothing on-chain yet.** Rye: *"the finality of it will exist off our platform on the
base blockchain, which we can then pull data from once we have that, once the project's
clear, but that will come later."* The Base and Hypha side is a later phase. When it
comes it goes through the Hypha Bridge with a new intent type, never a hand-rolled
redirect (`STEERING.md` section 6).

---

## 4. Copy, and the one number that may appear

Rye: *"we do not put the numbers on the live page yet. We just mention that they're
able to earmark a large percentage of their contribution."*

So: campaign and fund surfaces say a contributor can earmark **a large percentage** of
their contribution to the projects they choose. No percentage, no treasury share, no
mechanics that do not exist yet.

**The exception is `/opportunity`, which already says 90%.** It is live, it has said 90%
for some time, and the ruling is to be consistent with it. Leave that number where it
is. Do not replicate it elsewhere until the mechanic ships.

**Three things on that page still need Rye.** The allocation explorer's earmark toggle
says *"Direct up to 90% of your capital to a project you choose (10% stays in
diversified fund)"* and attaches a **3% due-diligence fee capped at $20,000** when a
chosen project fails council review. The destination of the 10% and the survival of the
fee are open questions 1 and 2. Until they are answered that copy stays exactly as it
is, because changing it would be guessing at terms.

`shared/fund.ts` still carries no contribution split, which is where one belongs, and
`scripts/check-fund-claims.mjs` runs in CI requiring every surface describing the fund to
read from that file. When a number is real, it goes there first.

---

## 5. Build order

Rows 1 to 3 can start now. Rows 4 onward are BLOCKED on the open questions.

| # | Work | Notes |
|---|---|---|
| 1 | Amend the spec and write the two ADRs: decision #1 narrowed (including the close-time $RCivics credit, per 6.4), ADR-52 superseded. Replace the treasury name-ban test with a default-holds test. | start here, it unblocks reviewers |
| 2 | The remaining three measured defects: the slot guard and its Claim button, the non-idempotent payoff, and the unbounded money inputs. | the payoff race is the one that pays people twice |
| 3 | Fundedness computed across both halves, plus the threshold, the self-set time minimum and the 9-month window. The cohort as an addressable set. | the spine; everything below needs "closed" to mean something |
| 4 | The escrow ledger, the contribution path, and the refund path, in one change. | includes the zero-default configurable fee (6.2) |
| 5 | The placement token, its ledger, the 90/10 split as a game variable, and the placement UI. | 10% to the $RCivics treasury (6.1) |
| 6 | Close: freeze placements, release escrow, credit private $RCivics, mark accepted. | reuses the existing claim-bridge shape (6.4) |
| 7 | The decision windows: partial close, total failure, the seven-day default, and the consent that authorises it. | notification flow + nightly job + audit trail (6.1, 6.3) |
| 8 | The 10% stake as a holding with a varying backing instrument, gated on the community decision. | after 3 |
| 9 | Redemption: $RCivics claim to real equity on Base through the Hypha bridge, and the reconciliation back. | later, by Rye's ruling |

**Copy edits that need Rye's eye before they ship:** the `/opportunity` earmark toggle
currently says the 10% "stays in diversified fund", which 6.1 makes wrong, and it
carries the 3% and $20,000 fee that 6.2 defers. Both sentences change. Neither should be
rewritten without him reading the replacement.

---

## 6. The four answers, 2026-09-05

All four are ruled. Nothing in section 5 is blocked any more.

### 6.1 The 10% goes to the $RCivics community treasury

Rye: *"Goes to the community treasury of RCivics (not ReGen) that's governed as
discussed in the /opportunity page. This is to pay roles and other platform costs."*

So it is a real treasury share, not undirected exposure the contributor keeps. It funds
roles and platform costs and is governed collectively. **The `/opportunity` wording
"10% stays in diversified fund" is therefore wrong** and has to change to say what it
actually is. That is a live copy edit and it needs Rye's eye on the sentence before it
ships.

**The total-failure case has a choice, and it is new.** Rye: *"If NONE of their selected
projects pass we offer them a refund or for ReGen Civics to choose how to direct their
funds and accept it all."* So when nothing a contributor placed on closes, they are
offered: take the money back, or let ReGen Civics direct the whole contribution and
accept it. That is a decision point with two outcomes, and it needs the same
seven-day default as 6.3 (see below), because a contributor who never answers cannot
leave money in limbo.

### 6.2 The due-diligence fee is deferred, and its number comes off the page

Rye chose: keep the idea, decide the number later.

Build the refund path with an **optional fee that defaults to zero**, configurable, so
the mechanic supports one without committing to 3%. **Remove the 3% and the $20,000 cap
from `/opportunity`** until a number is settled, because the page is currently offering
terms we have decided not to commit to.

### 6.3 Partial close: re-place, refund, or let the core team choose

Rye: *"Re-place or refund (with a 3rd option of letting regen civics core team choose
the best project) and we need to add to the terms and conditions and one of the boxes
they select that if they don't respond to the re-place or refund window within 7 days
then they automatically default to regen-civics choosing the replacement."*

Three options at the moment a campaign misses its window: re-place into a still-open
campaign, refund, or hand the choice to the ReGen Civics core team. **A seven-day
window, and silence defaults to the core team choosing.**

That default has to be consented to in advance, not assumed. It goes in the terms and
conditions AND as **its own checkbox at contribution time**, not bundled into a general
"I agree to the terms" tick. A default that moves someone's money on silence is exactly
the kind of term that has to be surfaced separately, and the legal lane is checking what
disclosure that carries.

**Build implication:** this is a notification flow with a deadline and an automatic
action, so it needs the nightly job, an auditable record of which of the three outcomes
happened and why, and a record of the consent that authorised the default.

### 6.4 Equity is $RCivics on platform, redeemed for real equity on Base

Rye: *"Credit $RCivics on the platform which will be redeemed for REAL EQUITY on the
Hypha Base blockchain. So this needs to follow the redemption path we built for amora
where they're immediately issued platform tokens but these are just accounting, the real
equity tokens will be issued on Base Blockchain using Hypha and we can bridge back
numbers on-chain to show users in our platform when they redeem for the real deal."*

**This reuses architecture that already exists**, which makes it the cheapest of the
four answers to build. The four-token model is already private-first with a one-way
claim bridge to public (`STEERING.md` section 5): `db.creditPrivateTokens` writes the
private balance, `playerProfiles.requestClaim` debits it at request time,
`webhook-receiver.cascadeClaimPassed` reconciles the on-chain confirmation,
`cancelStaleClaimBridges` refunds a claim that never lands, and
`game_variables.governance.claim_threshold_rcivics` already exists.

So the shape is: on close, credit **private $RCivics** at $1 per unit. That balance is
accounting. The contributor redeems through the existing claim bridge, Hypha issues the
real equity on Base, and the confirmation bridges the number back.

**One thing to record carefully.** This means the four-token model IS used, at close,
which sits close to locked decision #1. It does not violate it: decision #1 bans
crediting the four tokens **for a crowdpool pledge**, and this credit happens at close,
for issued equity, after the community decision and after a campaign met its threshold
and its time minimum. The pledge itself still credits only the new placement token. The
amendment in row 1 of the build order must state that distinction in those terms, or a
future session will read the credit as a violation and remove it.

**Checked, 2026-09-05: $RCivics is deployed** on Base at
`0x72e9B17a2F93A923D63666eC0a1c096B1443ef26` (`STEERING.md` section 5). RCVoice is the
only one of the four that is not. So there is a real contract behind the redemption
path, and this answer builds on shipped architecture rather than proposed architecture.

One inconsistency to fix while in here: `STEERING.md` section 6 gives the bridge path as
`apps/web/src/lib/hypha-bridge/` while the module actually lives at
`server/lib/hypha-bridge/`, which is what `/CLAUDE.md` says. Correct STEERING.

---

## 7. Naming hazard, recorded

Two unrelated tens sit next to each other in this mechanic:

- the contributor's **10% non-earmarkable** portion
- the project's minimum **10% non-dilutive stake** to ReGen Civics

They have nothing to do with each other. Do not let a variable, a column or a piece of
copy called `tenPercent` or `TEN_PCT` exist. Name them for what they are:
`nonEarmarkablePct` and `stakePct`. Add both to `.ai/docs/DOMAIN-LANGUAGE.md` with the
placement token and the escrow ledger when they are built.
