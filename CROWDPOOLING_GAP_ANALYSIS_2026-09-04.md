# Crowdpooling: the mechanic against the code

**Date:** 2026-09-04
**Method:** every clause of Rye's mechanic walked against `regen-civics` and `village-os`
by 14 readers, then each load-bearing verdict re-opened by a skeptic who had to
confirm the cited file and line. 122 agents, 108 verifications, 16 of which sent a
verdict back for correction. The arithmetic findings were then measured against a
real database rather than read.
**Scratch database:** `rc_qa_crowdpool` on the local MariaDB, built from
`drizzle/ci-baseline.sql` plus every migration since. Production was never written to.

---

## The one-line answer

The needs registry half of crowdpooling is genuinely built and good. The money half
does not exist, and the parts of it that have been described to the public describe a
different mechanic with different numbers. Separately, the money that IS handled
today is wrong on three counts, and one of them doubles the headline figure on the
public gallery.

---

## Part 1: the mechanic, clause by clause

| # | Clause | Verdict | Proof |
|---|---|---|---|
| 1 | Thirteen land projects prepared at the end of Season 2 | **not built** | Thirteen exists only as copy (`client/src/pages/Season2.tsx:500,508,519-531`). No table groups a cohort. `campaigns.seasonId` exists (`drizzle/schema.ts:1120`) and is never populated. |
| 2 | A project raises money AND roles, assets, equipment, time, networks | **built** | The 9-capital needs registry is real: `shared/crowdpoolingTaxonomy.ts`, `campaign_items.kind` + `capitalType` + the wanted/claimed/delivered meter. This is the strongest thing in the system. |
| 3 | A campaign succeeds only if BOTH halves land | **not built** | Nothing computes fundedness. `campaigns.updateStatus` (`server/routes/campaigns.ts:1048`) is a manual flip whose only check is `campaign.userId !== ctx.user.id` (`:1055-1057`). A steward marks their own campaign funded. |
| 4 | Money goes to ReGen Civics, not the project; the contributor gets a share of all thirteen | **not built, and contradicted** | Every money column in the schema is scoped to one campaign row. There is no pool balance, no fund-level ledger, no cross-campaign anything. `campaign_contributions.campaignId` is `NOT NULL` and singular, so a contribution structurally cannot reach thirteen projects. |
| 5 | 80% back as tokens to place across the thirteen | **not built, and forbidden** | No placement table, no per-contributor balance, no allocation of any kind. `CROWDPOOLING_PLATFORM_SPEC.md:12` and `:351` forbid exactly this, and the ban is restated in code at `server/routes/campaigns.ts:757-758`. See "the collision" below. |
| 6 | The other 20% goes to the community treasury | **not built, and blocked by a newer ruling** | No treasury table, account or ledger destination. `server/tokenMintModel.test.ts:113` fails the build if `drizzle/schema.ts` ever declares one. See "the collision". |
| 7 | The community chooses which projects progress | **not built** | No campaign carries a vote, quorum, signal count or `ratifiedAt`. The ratification engine is real but wired only to the `proposals` table; greps for `campaign` and `crowdpool` across `server/lib/ratification.ts`, `server/lib/evolution.ts` and `server/routes/assembly.ts` return nothing. |
| 8 | Minimum 10% non-dilutive stake to ReGen Civics | **not built** | Nothing in the repo models a stake, holding, equity position, cap table or portfolio position. No table name matches stake, equity, holding or portfolio. |
| 9 | The swap is value-for-value, ReGen Civics at $1 a token | **not built** | No valuation field anywhere. Site copy already describes a value-for-value swap to projects, with no code behind it. |
| 10 | The swap happens ONLY after the community says yes | **not built** | Not enforceable, because neither end exists as data. Today one person can self-serve the entire chain: create the campaign with their own `daoLink` (unvalidated, `campaigns.ts:474`), activate it themselves, accept their own contribution, mark it fulfilled, and call `formalizeOnHypha`. No guard on that path references a vote, quorum, signal or sign-off. |
| 11 | Non-cash contributions go to ONE project, not the pool | **built** | This is how the system already works, and it is the one clause the current data model gets right by accident. |

Rye's six answers add five more clauses. **Escrow, the self-set time minimum, the
9-month window, moving an earmark before close, and irrevocability after close are
all not built.** The `campaigns` table has `durationDays` and `startedAt` and no
threshold, no minimum duration, and no `fundedAt`. The word "escrow" appears three
times in the repo and all three are a different subsystem explicitly denying it holds
escrow (`shared/modulePool.ts:54`, `server/routes/modulePool.ts:322`,
`server/jobs/moduleBuildersPool.ts:363`).

---

## Part 2: the collision that needs Rye

Two standing rulings block the money half, and **both are newer than the crowdpooling
spec they would have to override.**

**Locked decision #1** (`CROWDPOOLING_PLATFORM_SPEC.md:12`, and Part F at `:351`):
"no platform token credits for crowdpooling, ever. The `campaign_contributions` ->
`user_token_ledger` path does not exist and must not be added." Enforced by comment
at the exact site the credit would go (`server/routes/campaigns.ts:757-758`), not by
a test.

**Founder ruling R92** (2026-08-29, ADR-52, `.ai/docs/STEERING.md:93-102`): "there is
no pre-issued treasury... build nothing that assumes one." Enforced for real:
`server/tokenMintModel.test.ts:113` scans the schema source and fails the build if a
table named `treasury` or `treasury_balances` is ever declared.

**The reading that dissolves most of this.** Rye said the placement token's job is
"just tracking what is otherwise true another way", and that placement is "actually
just a signalling tool" that "doesn't bind". That is not a $ReGen-family platform
token and it is not a claim on supply. It is a per-contributor signalling ledger
scoped to one season's cohort. Decision #1 bans crediting the four platform tokens
for a pledge, which this would not do. R92 bans a pre-issued token treasury, and the
20% community share is dollars, not token supply.

**So the likely answer is that they do not truly conflict, and both documents should
say so explicitly before anyone builds.** That is a ruling only Rye can make, and it
is the first thing on the list, because every other piece of money work sits on top
of it. The risk of guessing is a build that a green CI gate tears out later.

---

## Part 3: what is already wrong with the money that IS handled

These are not gaps. They are live defects in shipped code, found by attacking it and
then measured on a real database. All four reproduce 100% of the time.

### 3.1 A financial pledge is counted twice, including in the public headline

`getCampaignPledgedTotals` adds every contribution to `totals.total`
(`server/db.ts:1215`, unconditional) and then adds financial ones again to
`totals.financial` (`:1230`). Three surfaces then sum the two columns:

- `client/src/components/CampaignProgressTracker.tsx:62` drives the progress bar
- `client/src/pages/CrowdPoolingProjects.tsx:593` drives every gallery card
- `client/src/pages/CrowdPoolingProjects.tsx:511` drives the site-wide "total pooled"

**Measured:** a $10,000 crypto pledge stores `pledgedTotal = 10000` and
`pledgedFinancial = 10000`, and every one of those surfaces shows **$20,000**.

**Why it survived review, which is the useful part.** Look at
`CampaignProgressTracker.tsx` lines 61 and 62, adjacent:

```js
const totalGoal   = totalValue  + financialTarget;   // correct: disjoint
const totalRaised = pledgedTotal + pledgedFinancial; // wrong: overlapping
```

Two identical-looking sums, one right and one a double count. On the goal side
`totalValue` is derived from item values grouped by category (`server/db.ts:897`)
and `financialTarget` is entered separately by the steward (`:906`), so they are
siblings and adding them is correct. On the raised side `pledgedFinancial` is a
subset of `pledgedTotal`, so adding them counts the same money twice. The
legitimate line above is doing the work of making the wrong line look fine. Any
guard against this has to name the fields, because the shape is valid one line up.

### 3.2 Delivering a pledge deletes its value from the campaign total

`getCampaignPledgedTotals` filters `status = 'accepted'` and nothing else
(`server/db.ts:1200-1203`). `fulfilled` and `thanked` are later states in the same
lifecycle, so confirming a delivery removes that value. The recompute is only called
from the accepted/rejected branch (`campaigns.ts:722`), never from the fulfilled or
thanked branch, so the drop is deferred and lands later when an unrelated
contribution is accepted.

**Measured:** accept $10,000, deliver it, then accept $5,000. The campaign reports
**$5,000**. The honest number is $15,000. The bar goes backwards at the moment of
success.

This one crosses the repo boundary: village-os reads `pledgedTotal / totalValue` as
its progress ring (`server/lib/crowdpool.ts:330`), so the village sees the same
collapse.

### 3.3 The slot guard checks a counter that nothing has incremented yet

`submitContribution` guards on `quantityClaimed + quantityPledged > quantityWanted`
(`campaigns.ts:625`), but `quantityClaimed` only moves when a steward accepts
(`:712-718`). Every pending claim reads 0 and passes. The accept path then increments
with no ceiling check of its own.

**Measured, with no concurrency at all:** six people claim a one-slot need and all six
are accepted. `quantityClaimed` lands on 6 against a `quantityWanted` of 1, and
`quantityDelivered` follows it past the cap.

The existing test only proves the ordered case: `server/contributions.test.ts:466-469`
accepts the first claim before submitting the second, so it asserts the guard works
after acceptance and never covers the pending pile-up.

**The UI invites it, for the same root cause.** `CampaignDetail.tsx:1247` computes
`const filled = claimed >= wanted` and `:1363` disables the Claim button on it. That
reads correctly, and it keys off `quantityClaimed`, which does not move until a
steward accepts. So a one-slot need with five pending claims still shows
`claimed = 0`, still reads Claim rather than Filled, and still invites a sixth
person. The member-visible path into the overclaim is the button, not an API call.

Two smaller things in the same path. `ContributionModal.tsx:135-137` computes
`Math.max(1, wanted - claimed)`, so the floor is one slot rather than zero: the
quantity field's `max` (`:449`) and its "up to N" label (`:444`) can never offer
zero, even on a need with nothing left. And `:359` renders
`{quantityDelivered} of {quantityWanted} filled`, which prints "2 of 1 filled" once
the payoff race in 3.4 has fired.

**We do not share the disappearing-need bug the village side found.** Their filters
split on delivered versus wanted, so an over-delivered need left the shelf entirely.
Our needs stay on the page, greyed and labelled Filled. Worth keeping that way: any
future filter here that splits on `delivered < wanted` reintroduces it.

### 3.4 The payoff block is not idempotent, and its comment says it is

`campaigns.ts:725-726` reads "Idempotent: the whole payoff block is skipped when
fulfilledAt is already set." `firstFulfillment` is computed from a row read at line
691, long before the write at 740, with no transaction and no lock. Nothing in
crowdpooling runs in a transaction: a repo-wide grep for `transaction(`, `FOR UPDATE`
and `LOCK IN SHARE` across `server/` returns exactly one hit, in
`server/db/tokens.ts:109`, and crowdpooling has none.

**Measured over 10 trials, two stewards acting at the same instant:**

| | correct | actual |
|---|---|---|
| `quantityClaimed` after two accepts | 1 | **2**, in 10 of 10 |
| `quantityDelivered` after two fulfils | 1 | **2**, in 10 of 10 |
| Living Tree rows written | 10 | **20** |
| Score events fired | 10 | **20** |

Every contributor is credited twice.

**What over-delivery does downstream, which is worse than a cosmetic overflow.**
`quantityDelivered` passing `quantityWanted` is not just a number that reads oddly.
Measured by the village-os session on their own page with a need at wanted 1,
claimed 1, delivered 2: **the need vanishes from the shelf.** Their open-needs
filter takes delivered below wanted and their met-needs filter takes delivered at
or above it, so an over-delivered need fails the first, passes the second, and
becomes one silent tick in a completed count. A villager looking for something to
help with sees one card fewer and nothing saying why. Any filter here that splits
on `delivered < wanted` has the same hole, so check ours when this is fixed.

The correct pattern already exists in this
codebase at `server/routes/batchJobs.ts:460-464`, which does
`UPDATE ... WHERE id = ? AND status = ?` and checks `affectedRows`. `campaigns.ts`
does not use it. `updateContributionStatus` also has no rate limit, so the number of
concurrent attempts is unbounded.

### What held up

Worth saying plainly, because it is real work that survived being attacked: twelve
simultaneous claimants on a twelve-slot need all succeeded and the counter landed on
exactly twelve, with none of the deadlock the sibling repo measured. Errors reaching a
contributor leak no SQL, no driver text and no stack frames. The public read strips
PII. Email subscription does not reveal whether an address is already known. Negative
pledges, oversized pledges and absurd slot counts are all refused. A zero-target
campaign produces no NaN. `updateCampaignPledgedTotals` recomputes from scratch rather
than incrementing, which is why the money total self-heals instead of drifting.

---

## Part 4: the copy already says a different mechanic

`client/src/components/AllocationCalculator.tsx:299-302`, live on `/opportunity`,
tells investors they may **"Direct up to 90% of your capital to a project you choose
(10% stays in diversified fund)"**, plus a **3% due-diligence fee capped at $20,000**
if the chosen project fails council review.

That is 90/10 with a fee. Rye's mechanic is 80/20 with no fee. The same page also uses
the literal string "80/20" for something else entirely: the carried-interest split of
profits above an 8% hurdle (`client/src/pages/Opportunity.tsx:872,888`). So an
investor reading the page today is given two numbers, both wrong for this mechanic,
one of which is the right digits attached to the wrong noun.

`shared/fund.ts` carries a third: `allocation: "60 / 30 / 10, land / alliance /
innovation"`. It carries no contribution split at all, which is where one belongs,
because `scripts/check-fund-claims.mjs` runs in CI and requires every surface
describing the fund to read from that file.

**Recommendation: do not write the new numbers onto any live page yet.** The fund is
in formation, `FUND.hasLegalEntity` is `false`, and the statement every surface
renders says "no capital is accepted and no money moves". Publishing "80% of your
investment is earmarkable" describes a mechanism that does not exist, which is the
exact failure `shared/fund.ts` and its CI gate were built to stop. The copy lands when
the mechanic does.

---

## Part 5: what to build, in order

1. **Rye rules on the collision in Part 2.** Nothing below is safe until he does.
2. **Fix the four live defects in Part 3.** Finding out the arithmetic is already
   wrong changes what gets built on top of it, and 3.1 and 3.2 are both visible to a
   member and to village-os today.
3. **Fundedness as a computed thing**, covering both halves: cash target plus delivered
   in-kind against wanted. This is the spine clause 3 needs and it unblocks the
   threshold, the time minimum and the 9-month window.
4. **The cohort.** A season's thirteen as an addressable set, which is a `seasonId`
   backfill and a query, not a new subsystem.
5. **The contribution, the split and the escrow balance.** One fund-level ledger with
   a source tag, in the shape `user_token_ledger` already uses.
6. **Placement**, as a mutable per-contributor allocation across the cohort that sums
   to the placeable balance and can be moved until a project closes.
7. **The stake.** Model it as a HOLDING with a `backingInstrument` of
   `recorded_agreement | hypha_onchain | llp_equity`, never as a token. Rye was
   explicit that each deal is unique and some are equity in a real legal entity. Any
   design that assumes a token will have to be torn out for the first LLP.
8. **The gate**, last, because it is the constraint that orders everything else: no
   swap row may be written before the campaign carries a community decision.

---

## Appendix: how to re-run the adversarial pass

```bash
DATABASE_URL="mysql://root:<pw>@127.0.0.1:3307/rc_qa_crowdpool" npx vitest run server/crowdpool-adversarial.test.ts
```

Tests whose subject is a known unfixed defect are marked `it.fails(...)`. They pass
while the bug is present and **fail the build the day someone fixes it**, which is
the signal to delete them. A plain assertion on the buggy number would bless the bug
forever.

Never point that suite at `.env`. `DATABASE_URL` there is Railway production.
