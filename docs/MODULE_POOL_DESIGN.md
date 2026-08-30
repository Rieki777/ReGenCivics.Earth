# The $ReGen builders' pool

Status: proposed, awaiting Rye's decisions in section 10.
Date: 2026-08-15.
Owner: hub (`regen-civics`). Fork side: `game-amora`.

> **Section 6 is superseded. Read ADR-51 first** (`.ai/docs/DECISIONS.md`).
>
> The share formula below splits by how many VILLAGES run a module and excludes
> the platform's own. Both were replaced on 2026-08-29 under founder rulings R64
> and R72: the weight is REACH, the share of each village's active members who
> opened the module, capped at one per village and summed; the platform's own
> modules are in the denominator on the same footing as anybody else's; and what
> they earn goes to the ReGen Civics gratitude pool to be given out.
>
> Decision D3 (a module must be listed a full cycle before it is eligible) was
> never built and is not built now. Decision D6's three-cycle accrual escrow was
> never built either, and `PROPOSED_ACCRUAL_CYCLES` remains a number nothing
> reads. The rest of this document, including the reasoning for the roster, the
> dust floor, the carry rule and the no-signing posture, still describes the
> shipped design.
>
> The rest of the file is kept as the record of how the first version was
> argued, not as a description of what runs.

## 1. What Rye asked for

Verbatim:

> for someone to be able to do our building a module route and to have a default
> option that ReGen Civics pays $ReGen monthly (every lunar cycle) to the most
> used modules. Similar to the gratitude module that pays out a pool based on the
> flows of gratitude this pays out a pool of $ReGen based on the modules most
> used. This is the default and only goes away if the builder chooses to have
> their module paid (so if a module comes with a cost it's not included in the
> $ReGen distribution) we hope this would encourage all builders to just use the
> $ReGen distribution as economic incentive and keep all their modules free to
> use.

And, on identity:

> for lane P in order for builders to get paid $ReGen they need a regen civics
> account and a Hypha account with their base address linked (the same thing we
> encourage in profile setup in ReGen civics)

The mechanism this describes has one moving part: a pool of $ReGen, split each
lunar cycle across the free third-party modules villages are actually running.
A builder who charges for a module is already paid by the villages running it,
so they are out of the pool. Free is the default and the default is what pays.

## 2. The shape of the thing

```
  each village                the hub                       a human
  ────────────                ───────                       ───────
  /api/platform/info   ──▶  read the roster's module lists
  (already public,           ↓
   already consented)       count villages per module
                             ↓
  the registry         ──▶  drop the paid, the platform's own,
  (poolStatus)               the withdrawn, the core
                             ↓
  member profiles      ──▶  resolve builder handle → Base address
                             ↓
                            write ONE cycle statement          ──▶ reads it
                             ↓                                     ↓
                            export JSON + CSV                  ──▶ executes the
                             ↓                                     transfers on
                            publish counts on a public page        Hypha / Base
```

Nothing in that diagram signs anything. The hub computes a statement; a human
executes it. That is not a temporary state of the implementation, it is the
design (section 7).

## 3. Eligibility

Eligibility is DERIVED from registry fields the module entry already carries,
by one pure function, and is never stored. A stored `eligible` flag would be a
fourth fact that can disagree with `pricing`, `builtBy` and `withdrawn`, and the
day it disagrees it pays somebody the wrong amount.

Fork side: `game-amora` `shared/modulePool.ts`, `poolStatus(def)`.

| Verdict | Reason | Rule |
|---|---|---|
| out | `core` | the game the platform is born playing |
| out | `platform-built` | `builtBy` absent or blank |
| out | `withdrawn` | `withdrawn` set |
| out | `paid` | `isPaid(def)`, i.e. `pricing.amount > 0` |
| **in** | `free-third-party` | everything else |

Checks run in that order, most structural first, so a module that is several of
these at once reports the reason a builder can act on.

Two rulings inside that table are worth stating out loud:

**Zero is free.** The test is `isPaid`, not "carries a pricing record". A listing
that declares `amount: 0` is free out loud and `priceLine` already renders it as
`Free`. Charging nothing is not charging.

**Platform-built is excluded so the pool does not pay CORE out of CORE's own
treasury.** All eighteen modules shipped today are the platform's own, so the
pool is empty on the day it ships and the treasury owes nothing. That is a
feature: the machine can be built, tested and published before a single
third-party module exists, and the first statement with a line in it will be the
first real one.

On top of the registry verdict, a module earns for a cycle only where a roster
village is RUNNING it at lifecycle `members` or higher. That is per-village
state and lives in the village, not in the registry.

## 4. The usage metric, and why it cannot be farmed

**v1 metric: the number of KNOWN villages running the module.** One village, one
count, whatever its size or activity.

The input is each village's own `/api/platform/info`, which already publishes
`{ id, lifecycle }` for every module at rank `members` or higher, keyed to a
permanent `instanceId`. It is already public, already consented, already the
document the fork smoke test reads. The pool adds no new telemetry, asks no
village for anything, and learns nothing about people.

**Gaming resistance rests entirely on the roster, not on the counting.** Counting
is trivially forgeable: anybody can stand up a deployment, switch a module on,
and serve a `platform/info` that says so. So the count is only ever taken over
villages the hub already knows, and knowing is a human act.

The roster is `shared/networkRegistry.ts` `NETWORK_GAMES`, filtered to
`listed: true` and `status: "live"`. That file is deterministic on purpose
(STEERING section 11), edited by hand per launch, reviewed in git, and already
serves as the fetch allowlist for `/network` (BUILD-PLAYBOOK: no server-side
fetch of a URL that did not come from us). A fork that is not in it counts zero,
however many modules it claims to run and however loudly it claims it. Adding a
village to the roster is a pull request with a human on it, and one village per
launch is the actual rate.

That leaves one honest hole, and it is worth naming rather than hiding: a roster
village could switch on a friend's module purely to move the friend's share.
Nothing in software detects that; the defence is that the roster is small, named,
and public, and that the statement publishes per-module counts so an anomaly is
visible to everyone before value moves. The human who executes the statement is
the check, which is the same posture the whole payout path takes.

## 5. The cycle boundary

**The pool reuses `shared/lunar.ts`, the clock the gratitude system already runs
on**: the mean synodic month of 29.53058867 days anchored to the Meeus reference
new moon, 2000-01-06 18:14 UTC. Its `cycleNumber` is already the natural key for
`gratitude_cycles.cycleNumber`, and `game-amora` `shared/lunar.ts` is a verbatim
port of it, so one cycle number names the same lunation in the hub, in every
village, and in a pool statement. No third calendar, and no new constants.

The pool needed two functions that file did not have, and they are added to it
rather than kept anywhere else: `cycleBoundsByNumber` (the inverse of the
existing `cycleBoundsFor`) and `lastClosedCycle`. Nothing existing changed.

### The trap next door

There is a SECOND lunar implementation in this repository, `server/lib/lunar.ts`,
anchored on 2025-01-29 12:36 UTC. **It has no callers anywhere**, which is the
only reason it has never caused a problem.

Its epoch is not a whole number of lunations from the Meeus reference: measured,
the two are 310.0096 lunations apart, which puts their boundaries **6.79 hours**
out of step. Anything that imported it, reaching for the more conveniently named
module, would silently disagree with gratitude and with every village about which
lunation an event belongs to. `game-amora` `shared/lunar.ts` names that exact
failure in its own header: "the kind of divergence you discover months later in a
distribution dispute."

I have not deleted it, because deleting a file is not this lane's call and it
carries a `moonPhase` helper somebody may have meant to use. The number is pinned
in a test so it is written down, and D7 asks Rye whether it should go.

A cycle is settled after its `endsAt`. The job runs on the first tick after a new
moon and settles the cycle that just closed, never the one in progress.

## 6. The share formula

**This copies `computePoolShares` in `server/lib/gratitude-cycles.ts`.** Rye's
instruction was to reuse the hub's existing distribution mechanics, and the hub
already runs a proportional pool on a lunar cycle: gratitude splits
`gratitude.pool_per_cycle` across recipients in proportion to weighted gratitude
received, floors each share, and settles on cycle close. The builders' pool is
the same arithmetic with villages-running in place of gratitude-received.

Inputs: `usage[m]` (roster villages running module `m`), and a new game variable
`pool.regen_per_cycle`.

```
total       = Σ usage[m]                     over eligible modules with usage > 0
rawShare[m] = pool * usage[m] / total
amount[m]   = floor(rawShare[m])             whole $ReGen
```

**Whole tokens, floored**, for the same two reasons gratitude floors: the ledger
holds integers, and a statement a human re-types into a treasury tool should not
carry eighteen decimal places. Flooring also guarantees `Σ amount ≤ pool`, so the
pool can never overpay by a rounding error.

**Dust floor: 1 $ReGen.** A share below the floor is not paid. A transfer smaller
than its own gas costs the treasury money to make.

**The pool is a ceiling on issuance, never a promise to issue.** This is the
gratitude module's rule, quoted from its own source: the difference between the
pool and what is actually paid "is never minted and does not roll forward". The
builders' pool inherits it. With zero eligible modules the treasury pays nothing
and nothing accumulates anywhere.

**An unpaid builder's share is a different thing from a remainder, and is the one
thing that does roll.** Flooring dust and sub-floor shares are arithmetic leftovers
that belong to nobody. A share computed for a named builder who has no ReGen
Civics account or no linked Base address was earned by somebody, and the statement
names who. That amount is carried into the NEXT cycle's pool, on top of it, and
the statement prints the carry-in it received and the accrual it produced so
consecutive statements chain by addition.

**What v1 does NOT do, said plainly: it is not an escrow.** The carried amount
joins the next cycle's pool and is re-split by that cycle's usage. A builder who
links an address in month three earns fully from month three onward; they do not
receive the specific amounts their silence contributed in months one and two.

Holding a share for a named builder until they claim it is what D6 proposes, and
it is deliberately not built. It needs a claim path, a way to pay somebody for a
cycle whose statement a human already executed, and an answer for what happens
when a module changes hands. Those are three decisions for Rye, and guessing at
all three inside a first version would put a wrong answer into a table that money
is later reconciled against. `modulePoolShares.accruedSinceCycle` records when a
line first went unpaid, so the escrow rule can be built later against real history.

The distinction in one line: **remainders evaporate, accruals go back in the pot.**

Two properties worth stating:

- **Every cycle's numbers are reproducible from its snapshot.** No dependence on
  when the job happened to run, and re-running a settled cycle produces the same
  statement or fails.
- With one eligible module the whole pool goes to one builder. With none, no
  statement line exists and no value moves.

## 7. Who is paid, and how a human executes it

**The registry never holds a wallet address.** Rye's ruling, and it is the
security of the whole feature. An address in `shared/modules.ts` would be
asserted by whoever edits that file, in a public repository that every fork is
legally entitled to edit, for a payment somebody else receives. A pull request
would be able to redirect money.

Instead the registry carries `builtByAccount`: the builder's ReGen Civics handle,
a lookup key and nothing more. The builder asserts their own identity, on the hub,
by holding an account and linking their Hypha account and Base address in their
own profile setup, which is the linkage `PlayerProfile.tsx` already asks every
player for. The hub resolves handle → address at statement time.

Resolution, and the three states it can end in:

| State | What the statement says | Amount |
|---|---|---|
| handle resolves, profile has a Base address | payable, with the address | paid this cycle |
| handle resolves, no linked address | `accrued: no Base address linked` | rolls |
| handle does not resolve, or absent | `accrued: no ReGen Civics account` | rolls |

The two accrued states are reported separately and never merged, because they
have different fixes: one builder needs to link an address they already have, the
other needs to open an account. Merging them would tell both of them the wrong
thing at the moment they are owed money.

Resolution reads `users.handle` → `player_profiles`, taking
`COALESCE(walletAddress, baseAccountName)` in that order, which is the fallback
order every existing consumer uses. `users.baseWalletAddress` is deliberately not
read: it has had zero writers since Privy was removed.

**Addresses in that column are self-asserted and have never been format-checked
on the write path** (`linkBaseAccount` validates `z.string().min(1)` and nothing
else). So the statement re-checks the shape itself, `^0x[0-9a-fA-F]{40}$`, and an
address that fails is reported as accrued rather than passed to a human as if it
were payable. A malformed address is treated as a missing one.

### The invariant, restated

`server/blockchain.ts` opens with:

> Read-only Base blockchain queries, no wallet, no signing.

That holds, unchanged, byte-identical. Nothing in this feature signs, sends,
approves, or holds a key. The pool computes a statement and stops. Value moves
because a person reads the statement and acts, which is the same rule the whole
token model already runs on: ReGen Civics writes private balances, and real
public tokens move through Hypha votes executed by humans (ADR-42, part 2).
Settlement releases value and is a human act.

### The execution checklist

1. Open the cycle statement in the admin view. Confirm the cycle number and that
   its `endsAt` is in the past.
2. Read the roster line. Confirm every village that failed to answer is one you
   expected, and that the flagged ones are flagged (section 8).
3. Read the per-module counts. A count that jumped without a launch is the signal
   the roster defence relies on a human to catch. Stop if one has.
4. Confirm the statement balances. It prints all five terms and they satisfy
   `pool + carryIn = paid + accrued + unallocated`, where `unallocated` is the
   flooring dust and sub-floor shares that evaporate, and `accrued` becomes the
   next cycle's `carryIn`.
5. Export CSV (or JSON) from the admin view.
6. Make the transfers through Hypha, from the treasury, to the addresses in the
   export. The hub is not involved and cannot be.
7. Mark the statement executed, pasting the transaction hashes. The hub records
   what a human says happened; it does not verify it on chain in v1.

Step 6 is the only step that moves value and it is entirely outside this
codebase. There is no button anywhere in the hub that performs it, and adding one
would be a different ADR with a different security posture.

## 8. A village that is down on statement night

A village that does not answer inside the timeout is not a village that turned
its modules off, and treating the two the same would silently cut a builder's
share for somebody else's outage.

**The rule: a village that fails to answer contributes its LAST KNOWN snapshot,
once, and the statement flags it.** Once means once: a village that has already
had a snapshot carried forward for one cycle contributes nothing on the next
failure, and keeps contributing nothing until it answers again.

Recorded per village per cycle as `ok`, `carried` (answered before, not now,
counted from the stored snapshot), or `absent` (no usable snapshot, counted as
zero). The distinction is in the statement because a builder whose share moved is
entitled to know whether it moved because a village switched something off or
because a village was down.

Bounds on the fetch, copied from `server/lib/network-feed.ts` rather than
reinvented: registry origins only, `assertSafeExternalUrl`, a short timeout,
`redirect: "error"`, a response size cap, and one log line per failure.

## 8b. How the job runs

The hub has no scheduler library. It has two mechanisms and this uses the first:
a Railway cron service running `curlimages/curl` POSTs to `/api/cron/<name>` with
`Authorization: Bearer $CRON_SECRET`, checked by `cronAuthOk` (byte-length
compare then `timingSafeEqual`, per `server/_core/cronAuth.ts`). Thirteen
endpoints already follow this shape; the pool is the fourteenth and copies it
exactly, including `await import()` of the job module inside the `try`, a missing
secret answering 500 and a wrong one answering 401, and the job's report object
spread into the 200 body.

`POST /api/cron/module-pool-statement`, daily. Daily rather than monthly because
a lunation is 29.53 days and no cron expression lands on a new moon; the job asks
whether an unsettled closed cycle exists and does nothing on the ~28 days it does
not. `{ job, ok, count?, error? }` is the report shape, matching
`server/jobs/governanceJobs.ts`.

Concurrency and idempotency copy `closeDueCycles`, including the part that was
learned the hard way:

- One statement row per cycle, `UNIQUE(cycleNumber)`.
- The row latches `open → computing` with a conditional UPDATE, so a second
  runner finds nothing to do.
- **A throw un-latches it back to `open`.** The gratitude module records why in
  its own source: a cycle latched to `distributing` that then threw became
  unreachable forever, some recipients paid and the rest not, while the hourly
  cron reported `{closed: 0}` and the alarm vanished within the hour.
- The statement is only ever written once and is never recomputed after it
  reaches `computed`. A settled cycle is history; re-running produces the same
  bytes or an error, never a quiet overwrite.

A hand-run script (`npx tsx scripts/module-pool-statement.ts`) settles a named
cycle or dry-runs one to stdout, following the repo's dominant script idiom
(`import "dotenv/config"`, a `main()` with `.catch(err => { process.exit(1) })`).

## 9. What is published, and what is not

**A public hub page shows: the cycle, the pool, and per-module counts and shares.
Module ids and numbers. It never says which village runs what.**

The distinction matters even though each village already publishes its own module
list at `/api/platform/info` and `/.well-known/village.json`. A village
publishing its own document is a village speaking for itself. The hub joining
twelve of those documents into one table is a different object: a cross-village
map of who runs what, published by a party none of them asked to speak for them.
So the hub aggregates to counts and publishes the counts.

Also never published: the builder's Base address, the builder's handle-to-address
resolution, and which builders are unpaid. The public page names the module and
the count. The admin view carries the rest.

> Noticed while tracing the resolution path, and out of scope for this lane:
> `playerProfiles.list` and `playerProfiles.getByHandle` are `publicProcedure`s
> that spread whole profile rows, so `email`, `walletAddress`, `baseAccountName`
> and `locationLat`/`locationLng` are already served to unauthenticated callers
> (`server/routes/players.ts`). This feature does not make that worse, and does
> not fix it, but a payout flow makes those addresses more valuable and it should
> be fixed on its own.

## 10. Decisions for Rye

Each row is a default I have built to. Every one is overrulable; nothing here is
load-bearing on the code shape except D7.

| # | Decision | Default I built to | Why |
|---|---|---|---|
| D1 | **Pool amount per cycle** — a money decision | **5,000 $ReGen** (`pool.regen_per_cycle`) | Anchored to the pool that already exists: `gratitude.pool_per_cycle` defaults to 10,000 $ReGen a cycle. Half of that says builders matter and members matter more, which is the right order for a village platform. At the 2026-07-02 valuation of $0.10 ($ReGen/USD via `SEEDS_REGEN_PER_USD = 10`) it is $500 a cycle, about $6,500 a year over 13 lunations: enough that a builder running in a handful of villages sees a real number, small enough to pay every cycle without a fundraise. With one eligible module it is $500 to that builder; with ten it is $50 each. This is the number I have least standing to pick. |
| D2 | **Roster definition** | `NETWORK_GAMES` with `listed: true` and `status: "live"` | Already the fetch allowlist, already human-reviewed per launch, already git-auditable. Today that is exactly one village (Amora). |
| D3 | **Minimum cycles listed before eligibility** | one full cycle | A module that appeared mid-cycle has not been used for a cycle. It also removes the incentive to switch something on the day before settlement. |
| D4 | **Does Amora's own village count?** | yes | It is a real village with real members running real modules. Excluding it would mean the metric ignores the only live deployment. |
| D5 | **Dust floor** | 1 $ReGen | Below this a transfer can cost more than it carries. |
| D6 | **Unclaimed shares: roll, escrow, or lapse?** | **BUILT: rolls into the next cycle's pool and is re-split.** Not an escrow. | The built behaviour needs no decision and cannot go wrong: nothing is lost, nothing is owed to anybody in perpetuity, and every cycle's numbers close. What is NOT built is holding a share for the builder who earned it until they claim it, which is the version that most rewards a builder for showing up late. It needs three answers first: how does a builder claim, how do you pay for a cycle a human already executed and signed off, and who owns the accrual when a module changes hands. If Rye wants the escrow, those are the questions; if not, v1 is already coherent and the row can be closed. |
| D7 | **The orphan lunar clock** (section 5) | left in place, untouched | `server/lib/lunar.ts` has no callers and an epoch 6.79 hours off the one everything real uses. Deleting dead code is not this lane's call, and it holds a `moonPhase` helper somebody may have intended to use. My recommendation is to delete it: a second file named `lunar` that silently disagrees is a trap that only ever fires as a distribution dispute. |
| D8 | **Zero-priced listings** | eligible | Charging nothing is not charging. If Rye wants "declares any pricing record at all ⇒ out", it is a one-line change and one test. |
| D9 | **Who executes the statement** | Rye, or whoever holds the treasury | There is no code path; this is a name on a checklist. |

## 11. v2, design only: activity weighting

Not built. Recorded so the v1 metric is understood as a floor rather than the
final answer.

v1 counts villages. It cannot tell a module twelve people use every day from one
that is switched on and forgotten. The obvious fix is to weight by activity, and
the obvious implementation is the wrong one: asking villages for usage data
creates exactly the cross-village surveillance the publication rule in section 9
exists to prevent.

The shape that would be acceptable:

- **Opt-in, per village, by the village.** Silence is a valid answer and counts as
  the v1 weight of 1.
- **Counts, never people.** A summary carries `{ moduleId, actions, activeMembers }`
  as integers for a closed cycle. No member ids, no handles, no timestamps, no
  content. A count that could identify one person (an `activeMembers` of 1 or 2)
  is reported as a floor rather than a number.
- **Over the relay that already exists.** ADR-46/47 gave the hub a per-fork
  registered callback with a shared secret, in the hub→fork direction. A
  fork→hub summary would ride the same registration and the same secret rather
  than minting new credentials.
- **Bounded weight.** Something like `weight = 1 + log(1 + actions)`, capped, so a
  large village cannot dominate and a small one is never worth zero. Publishing
  the weight function is part of it; a metric people cannot compute themselves is
  a metric they cannot trust.

The reason to defer: v1 has one village on the roster, and no weighting function
is meaningful over n=1. Build it when the roster has enough members that the
difference between counting and weighting is a number somebody can look at.

## 12. Related decisions

- ADR-42 — internal credit versus public tokens; public tokens move by human
  Hypha votes, never by an automated ladder.
- ADR-46, ADR-47 — the governance fork relay and marker links; the existing
  hub↔fork channel a v2 activity summary would reuse.
- STEERING section 5 — the token model: reads use total, writes touch private
  only, one-way private → public.
- STEERING section 11 — deterministic-first, which is why the roster is a
  reviewed file rather than a table with an admin screen.
