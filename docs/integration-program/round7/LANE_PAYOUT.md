# Lane PAYOUT — the hub half: pay by reach, recycle the platform's share, and stop claiming what is not true

**Read `../round6/BUILD_HOUSE_RULES.md` first** for the working discipline, **and
`../GAME_GOVERNANCE_AND_ECONOMICS.md` §7** for the whole economic picture. Both bind.

**THIS LANE IS IN THE HUB REPO, NOT game-amora.** Worktree:
`C:/Users/taren/Downloads/regen-r7-payout`, branch `wt/r7-payout`, from the hub's `origin/main` at
**`fb32af1`**, deps installed, `.env` present.

**The hub's gate set is DIFFERENT from game-amora's and you must enumerate it yourself** from
`.github/workflows/` — **the whole directory, not one file in it.** The house rules' gate list
describes game-amora. Known hub facts, to be re-verified: `pnpm gate` runs a truncation audit plus
the typecheck, `pnpm check` is the typecheck (there is no `pnpm typecheck`), `check-migration-numbers`
and `check-env-example` are blocking in CI and omitted by CLAUDE.md, and **the hub has NO bundle-budget
gate** — that belongs to game-amora only. **Push to the hub's `main` auto-deploys to
regencivics.earth, so nothing lands without the coordinator.**

---

## 1 · The ruling, and what it rules out

**R72.** Rye: [**we need to build the flow for builders to get paid and also build in now the cycling
so that the use of regen civics built modules start directing $regen to the gratidue bucket in regen
civics and we need to build this all out so that when we fork this code all future games come with
this ability to track module use and provenance across the ecosystem.**]

**R64**, the model underneath it: [**regen civics built modules pay out regen civics but have it go to
the regen civics gratitude pool as the Game tokens $ReGen - it's intentional so that outside module
builders are treated the same as regen civics core team acting on equal footing. One day a new
organisation could spin up and have created more modules in the Games than groups are using than us
and get more of the revenue.**]

**The model is designed to be LOSABLE.** Another organisation out-earning us is a success condition.
**Build nothing that assumes ReGen Civics is permanently the centre.**

## 2 · The contradiction you are here to settle

**There are two pools, computed from two different numbers, and they disagree with each other and
with the contract.**

- **The village side** (game-amora) splits by **member reach**, saturating, capped at 1.0 per village,
  and **includes platform modules and recycles their share.** Its own header says why: excluding them
  *"would be splitting a fixed sum among whoever remained, which quietly pays third-party builders
  for the platform's usage as well as their own."*
- **The hub side — yours** — splits by **how many villages run the module**, a binary count, and
  **drops any module without a builder record before computing the denominator**, so platform modules
  never enter it. **That is precisely the failure the village side names.**
- **Clause 14 promises payment proportional to how many MEMBERS open it.** `GET /api/platform/module-usage`
  exists on every village and **the hub has never called it.**

**R64 settles this in the village side's favour. Fix the hub.**

## 3 · What to build

1. **Split by reach, not by installation.** Consume the per-cycle, per-module aggregate every village
   already computes. **Lane PROVENANCE in game-amora is making that the real interface**; the shape it
   will serve, per cycle and per module, is: **members reached, active members, module id, builder
   handle, platform-built flag, seal time.** If you need a different shape, **tell the coordinator
   before building against a guess.**
2. **Platform-built modules earn on the same footing, and their share recycles.** Do not exclude them
   from the denominator. **Their share flows to the ReGen Civics gratitude pool**, to be given out
   through the gratitude system, and **the recycling must be visible** in whatever reports the pool.
   R59 says the visibility is the point rather than a nicety.
3. **The payout flow.** Today the trail ends at a CSV and an admin button whose own docstring reads
   *"This is a NOTE, not an action... Nothing behind it can move a token."* **Build the flow.** Read
   the Hypha Bridge module first (`server/lib/hypha-bridge/`) — the standing rule is that any handoff
   to an on-chain action goes through the bridge as a new intent type, and **nothing hand-rolls a
   redirect.** Ring 0 still says the platform never mints, moves or prices; **if paying a builder
   cannot be done inside that constraint, say so and build the furthest honest step instead.**
4. **A builder list a fork can inherit.** `MODULE_BUILDERS` is a hand-edited frozen array, currently
   empty. **A fork cannot inherit a list it is not on.** Provenance travels with the module in the
   registry; make the hub read that rather than a private list, or say clearly why it cannot.

## 4 · The three hard stops, measured on production 2026-08-29

Do not rediscover these:

1. **There are no builders.** The list is empty on purpose, so the machinery ships owing nothing.
2. **The pool amount has no row.** `game_variables` on the production database holds **one row in
   total** and it is not this one. `pool.regen_per_cycle` defaults to 0, and **the only non-test
   writer to that table is an UPDATE**, so there is nothing to update. **The admin page currently
   tells an operator the machinery "starts paying the cycle after somebody sets this in the admin
   UI". That is false today.** Either make it true or make the page honest. **Do not leave it
   claiming something it cannot do** — round 6 found exactly that shape and it is the defect class
   this program spends most of its time on.
3. **Nothing transfers.** See §3.3.

## 5 · What you must not do

- **Do not invent a wallet address in a config file.** The existing design deliberately resolves a
  builder's Base address from **that builder's own profile**, because a handle is asserted by the
  person being paid and an address in a file is asserted by whoever edits the file. **Keep that
  property.**
- **Do not pay without a record anyone can rebuild.** The existing statement carries a hash of every
  input so a third party can recompute and check it. **Whatever you build keeps that.**
- **Do not let a share owed to an unlinked builder silently vanish.** Today it rolls into the next
  cycle and is re-split, so a builder who links late loses what accrued in their name. **If you
  cannot build a claim path, say so; do not quietly keep the current behaviour without naming it.**

## 6 · Hub-specific hazards

- **`/ship` before any push to main** per `docs/GOLDEN_RULE.md`, and **the coordinator does the push.**
- **Migrations do not run on deploy.** If you add one, the coordinator applies it with the runner.
- **`pnpm gate` finds a working Python itself.** Do not hand-run `python3` on Windows: it resolves to
  a Store stub that prints an ad and exits **without running the audit**, which is a green gate that
  checked nothing.
- **The hub deploys to production on merge to main.** Treat every change as customer-facing.

## 7 · Gates and reporting

**Enumerate the hub's workflow directory yourself and report the list you found**, because the
coordinator's own gate list had a blind spot this round from reading one file instead of the
directory.

Report in the house-rules §9 shape, plus:

- **Whether a builder can now actually be paid, end to end**, and if not, **exactly where it stops.**
  Answer it as a sequence a person could follow.
- **What a fork inherits**, and what it still cannot do.
- **Every sentence the product now says about builder payment**, and whether each is true.

Status stops at CODED. **Nothing is pushed or merged without the coordinator.**
