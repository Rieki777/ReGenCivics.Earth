# Lane PROVENANCE — provenance travels with the module, and every fork inherits the ability to count

**Read `../round6/BUILD_HOUSE_RULES.md` first.** Both files bind.
**Then read `../GAME_GOVERNANCE_AND_ECONOMICS.md` §7**, which is the whole economic picture this
lane sits inside.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-provenance`, branch `wt/r7-provenance`, from
`origin/main` at **`6b44084`**, deps installed, `.env` present.
**Migration `0111` if you need one. Only 0111.**

**This is the village half. A sibling lane, PAYOUT, is doing the hub half in the other repo.** You
define the interface; it consumes it. Where you two must agree, the contract in §5 is the agreement.

---

## 1 · The ruling

**R72.** Rye: [**we need to build the flow for builders to get paid and also build in now the cycling
so that the use of regen civics built modules start directing $regen to the gratidue bucket in regen
civics and we need to build this all out so that when we fork this code all future games come with
this ability to track module use and provenance across the ecosystem.**]

**The third clause is the one that changes the shape.** Today the hub keeps a hand-maintained builder
list and asks one roster village for a manifest. **A fork cannot inherit a list it is not on.**
Provenance has to travel with the module, and usage has to be reportable by any village to whoever is
counting.

And R64, which this serves: [**these tools and currency aren't the governance domain of a single
organisation, but very quickly to form a network of them**]. **Nothing you build may assume ReGen
Civics is permanently the centre.**

## 2 · What is already right, and must not be broken

**The measurement is finished and good.** A use is a signed-in member getting a response under 400
from a route under a non-core module's prefix. **It saturates**: one member, one module, one lunar
cycle counts 1, however often they open it. Enforced twice, by a three-column primary key and by an
in-process set. Admin routes excluded, refused requests excluded.

**Keep every one of those properties.** They are what make the number un-gameable: noise earns
nothing, nagging earns nothing, and only more different people move it.

**And keep the seal.** After a cycle closes, per-member rows are deleted and only aggregates survive,
so the platform cannot say afterwards which member opened which module. **That is a privacy property,
not a storage optimisation. Do not weaken it to make counting easier.**

## 3 · What to build

### Provenance that travels

A module's registry entry already carries `builtBy` and `builtByAccount`. **Make that the source of
truth for who built it, and make it survive a fork**, so a village running a module knows who wrote
it without asking any central list. Consider what a fork needs that a first-party install does not:
a module written by someone outside this repo, arriving in a fork, still needs to be attributable.

**Design the identifier deliberately and say why.** A handle is asserted by the person being paid; an
address in a file is asserted by whoever edits the file. The existing code chose the handle for that
reason. **Do not replace it with a wallet address in the registry.**

### Usage reportable to whoever is counting

`GET /api/platform/module-usage` exists on every village and **the hub has never called it.** Make it
the real interface:

- **Report reach, not installation.** The hub currently counts "does this village list the module",
  which throws away everything migration 0101 measures. Clause 14 promises payment proportional to
  how many members open it. **Serve what the contract promises.**
- **A village reports its own aggregate, per cycle, per module**, with enough for a counter to verify
  it: the cycle, the module, members reached, active members, and the seal time.
- **It must work for a fork with no relationship to ReGen Civics.** A village should be able to point
  its reporting at any counter, or at none, and still function. **A village that reports to nobody
  must still keep its own honest numbers.**

### The recycling, made mechanical

**R64 and R72 together:** use of ReGen Civics built modules directs $ReGen **into the ReGen Civics
gratitude pool**, to be given out through the gratitude system. Platform-built modules earn on the
same footing as anyone else and their share **returns to the pool rather than being retained.**

**Your half is making a platform-built module's share identifiable and reportable as recycled.** The
village-side pool computation already includes platform modules and recycles them; **make the
recycling visible in what the village publishes**, because R59 says the visibility is the point
rather than a nicety.

### The contract

`docs/MODULE_LIBRARY_CONTRACT.md` and the version constant in `shared/modules.ts` are **yours**, taken
from Lane HONEST because R72 changes what the contract says rather than only its number.

**Fix the promise the code does not keep.** Clause 14 promises member reach; the hub splits by village
count. **Say what will actually happen, bump the version, and record in the contract's own history
what changed for an outside builder.** Do not soften it: their share now depends on how many members
open their module rather than on how many villages installed it, and platform modules compete on the
same footing.

**The two versions must agree** and that agreement is itself checked.

## 4 · Say plainly what is still not built

**Today a builder cannot be paid, and there are three hard stops.** You are removing some of them and
you will not remove all of them. **The one thing this lane must not do is leave the product claiming
otherwise.** Round 6 found an admin page telling an operator that setting a value would start
payments, when there is no row to set. **Every sentence the product says about builder payment must
be true on the day you ship.**

## 5 · The interface contract with Lane PAYOUT

You define, they consume. **Write it down in the code as the authority, not in a document.** They
need, per cycle and per module: **members reached**, **active members**, **the module id**, **the
builder handle**, **whether the module is platform-built**, and **the seal time**. Anything else you
add, tell me and I will relay it.

**If you need to change that shape, tell me before you ship it.** Two lanes agreeing a wire format by
guessing is how a whole round gets replayed.

## 6 · Your zone

**Yours:** `shared/modules.ts`, `docs/MODULE_LIBRARY_CONTRACT.md`, `shared/modulePoolShares.ts`,
`server/lib/moduleUsage.ts`, `server/repos/moduleUsage.ts`, the `/api/platform/*` and
`/api/modules/pool` routes, `drizzle/0111_*.sql` if needed.

**Touching `shared/modules.ts`, `shared/capabilities.ts`, `server/lib/modules.ts` or `docs/modules/**`
fires two extra path-gated CI workflows.** Run both locally before pushing. **And `docs/modules/*.md`
is a live retrieval corpus: a prose edit there is a behaviour change and can turn a knowledge test
red.**

**Live lanes:** HONEST (GameMechanics, ObjectionPanel, investor-summary, badge display), VOICE
(capabilities.ts, badges.ts, electorate), CAPS (gameVariables gratitude dials, gratitude.ts,
economy.ts), GAMESTART (launch requirements and the launch route). **Ask before crossing.**

## 7 · Gates and reporting

Standard set plus the two path-gated workflows. **Write the tests first.** The saturation property
and the seal are the two things a regression would be most expensive on: **pin both.**

Report in the house-rules block, plus: **what a fork inherits that it did not before**, stated as a
sequence somebody could follow; and **what is still not built in the payment path**, so the founder
knows what remains after this lands. Status stops at CODED.
