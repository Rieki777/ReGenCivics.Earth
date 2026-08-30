# Lane RULES — the village votes on the rules that mint, which today it cannot reach at all

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds. **Then read `INTEGRATION_LEDGER.md` §8
rulings R81, R84 and R85**, which are the whole reason this lane exists.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-rules`, branch `wt/r7-rules`, cut from `origin/main` at
**`86c8242`**, deps installed, `.env` present.
**Migration `0117` if you need one. Only 0117.**

---

## 1 · What the audit found, and why it makes this lane the keystone

A 25-agent read-only audit swept every path in this codebase that creates value.
**92 paths. 44 discretionary, 20 member-initiated, 20 claimed automatic, 8 ambiguous.**

**Then an adversarial pass tried to refute every one of the 20 automatic claims. It refuted all
twenty.** Not one path that looked rule-driven actually is, and **the reason is nearly always the
same sentence**: the rule behind it is edited by one admin through a route gated on `isAdmin` alone,
and **no vote in this product can reach it.**

The concrete form, which you verify before building on it:

- **`mint_rules` is its own table**, edited by `PATCH /api/admin/economy/rules/:id`
  (`server/index.ts` near 23373) through `queueRuleChange` (`server/lib/economy.ts` near 1119).
  **The gate is `isAdmin` and nothing else.**
- **`validateChangeSet` (`server/lib/mechanics.ts:53`) refuses any key not in `VARIABLES_BY_KEY`.**
  Mint rules are not dials, so a mechanics proposal cannot name one. **There is no escape hatch, no
  free-form key and no action kind.** A change set is an array of key, from and to, and nothing
  else, capped at 12 changes.
- So **R84's "the village votes on the rules" is not merely unbuilt, it is unreachable.** The seat
  payment of 20 gratitude and 50 village-voice per moon, the quest completion reward, every amount
  the settlement job pays: **all of them are numbers one admin types, in a table no ballot can
  address.**

**The audit's own headline, which is the shape of your work:** *R81 does not need new machinery to be
true. It needs one new entry in machinery that already exists, plus two doors closed.*

## 2 · The machinery you are extending, measured at `855075a`

**Re-verify every line of this. It is a relay from an audit, which makes it a hypothesis.**

- **Six subject types reach `openBallot`. Five have executors** in `SUBJECT_CLOSERS`
  (`server/index.ts:25747`): mechanics, power_transfer, power_grant, power_return, village_launch.
  **The advisory type deliberately has none.**
- **`ballotBinds()` (`server/index.ts:26343`) is a `hasOwnProperty` read on that same table**, so
  "does this vote bind" and "does this vote execute" are one sentence and cannot drift.
  **Absence is the fail-safe direction**: a subject added without an executor conducts a completely
  real vote and changes nothing.
- **`closeBallot` (`server/lib/ballots.ts:544`) takes one guarded status transition** on the ballot
  row, conditional on it still being open. **Zero rows affected means somebody else closed it first
  and nothing executes.** That is your idempotency-under-concurrent-dispatch answer already solved,
  and you should reuse it rather than invent one.
- **`shared/ballotSubjects.ts` holds `SUBJECT_THRESHOLDS` with exactly one entry**, village_launch at
  100 unity and 100 quorum with an electorate floor of 3. **The numbers are FLOORS, not overrides**,
  so a village that set everything to 100 is never quietly lowered.
- **THE TRAP: the threshold seam is not a chokepoint.** Of the six open routes, **exactly one calls
  `dialsForSubject`. The other five call `dialsForMethod` and never see the registry.** A mint route
  that does not opt in **silently inherits the ordinary 20/80** and nobody will notice.
- `WIZARD_TYPES` (`server/lib/proposalDrafts.ts:46`) lists eight types of which four are conductable;
  **`quest_payout` is already there as advisory-only.** Read it before designing: somebody has
  already imagined a vote on a payout, and you should either use that shape or say why not.

## 3 · What to build

### a. A carried ballot can change a minting rule

**Design it and justify the design.** Two shapes are obvious and you may find a better one:

- **A new subject type** with its own executor in `SUBJECT_CLOSERS`, carrying a mint-rule payload.
- **Making mint rules addressable as dials** so the existing change set reaches them.

**Whichever you choose, these are requirements rather than preferences:**

- **The payload validates at RAISE and again at EXECUTION**, and is idempotent under concurrent
  dispatch. That is a standing rule in this codebase, and the guarded transition in `closeBallot` is
  how the existing subjects satisfy it.
- **It opts into `dialsForSubject`.** See the trap above.
- **The snapshot law holds.** A ballot freezes its electorate and weights at open. **Gratitude is the
  default `governance.weight_token`, so a carried mint changes voting weight.** Work out whether a
  carried mint can change the electorate of a ballot that is still open, and **say plainly whether
  that is a problem.** Run `ballots.test.ts` unmodified and green.
- **Say what threshold a mint should carry, and do not invent a number.** Report what the seam
  supports and what comparable acts use. Launch is 100/100 because it is irreversible; a mint is not.

### b. Close the door, and leave the founder's key

**After launch, `PATCH /api/admin/economy/rules/:id` may no longer be an ordinary admin act.**
Before launch it stays exactly as it is, because R67 says the founder builds the whole Game alone.

**But R85 is live and it constrains you:** [**all named founders have this back door ability until it
is taken away**]. There is a second handover event after which the back door is removed, and **that
event does not exist yet.**

So: **close the door to ordinary admins post-launch, keep it open to named founders, and make the
founder's use of it VISIBLE.** R68 already rules that after launch every admin action is seen by all
members, and **an unseen back door would contradict it directly.**

**Do not build the handover event.** Say in your report exactly what it would need. A named TODO is
worth more here than a half-built ceremony.

### c. Say what R84 still needs after you land

R84 wants the admin section to become a **proposal composer**: somebody stages a batch of changes and
submits the whole list as ONE proposal that applies automatically if it carries.

**You are building the payload and the executor, not the composer.** But you will learn things the
composer lane needs, and **the change-set cap of 12 is the first of them**, because an admin section
batch could easily exceed it. **Report what the composer will run into.**

## 4 · Two findings that are NOT yours, so you do not spend the lane on them

Both are queued for other lanes. **Read them so you do not duplicate the work, and tell me if your
design touches either.**

1. **A script bypasses the launch gate entirely.** The audit found one path that writes the ledger
   directly rather than through `postTransfer`, so the gate never sees it.
2. **The self-consent window is open in a launched village.** `quest.self_consent_until_members`
   defaults to 6 and the launch floor is 3, so **in a launched village of three to five living
   members an admin may consent their own quest claims and mint themselves voice with no witness**,
   and `ledger.admin_mint_cycle_cap` does not cover the voice faucet.

## 5 · Your zone

**Yours:** `server/lib/economy.ts`, the economy admin routes in `server/index.ts`,
`server/lib/mechanics.ts`, `shared/ballotSubjects.ts`, `SUBJECT_CLOSERS` and the ballot executors,
`drizzle/0117_*.sql` if needed.

**Live lanes:** GUARDS holds `shared/capabilities.ts` and two other regions of `server/index.ts` (the
visit-config link validation and the seat-history route). TESTRUN holds `JourneyToLaunch.tsx`, the
job registry and cycle-driving code, and **is reading `server/lib/economy.ts` closely**. DOORS holds
the module cards and the proposal wizard UI. DIALS holds `GameMechanics.tsx`.

**`server/index.ts` has three lanes in it right now. Your hunks must be disjoint from theirs. Tell me
what regions you are touching as soon as you know**, and I will route around you.

## 6 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself.

**Write the tests first and watch them fail.** The ones that matter: **a carried mint-rule ballot
actually changes the rule**; **an ordinary admin cannot change a mint rule after launch**; **a named
founder still can, and it is recorded**; **`ballots.test.ts` is untouched and green.**

Report in the house-rules block, plus: **the design you chose and why**, **the threshold you
recommend and the precedent for it**, **whether a carried mint can disturb an open ballot's
electorate**, and **what the R84 composer will run into.** Status stops at **CODED**. Nothing pushed
or merged without me.
