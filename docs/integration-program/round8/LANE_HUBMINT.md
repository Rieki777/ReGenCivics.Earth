# Lane HUBMINT — ReGen Civics mints on transfer, and the bridge that carries it

**Read `../round6/BUILD_HOUSE_RULES.md` first** for the working discipline. It binds.

**THIS LANE IS IN THE HUB REPO, NOT game-amora.** Worktree:
`C:/Users/taren/Downloads/regen-r8-hubmint`, branch `wt/r8-hubmint`, from the hub's `origin/main` at
**`c6d8e11`**, deps installed, `.env` present.
**Migration `0230` if you need one. Only 0230.**

**The hub's gate set is DIFFERENT from game-amora's and you must enumerate it yourself** from
`.github/workflows/` — **the whole directory.** Known hub facts to re-verify: `pnpm gate` runs a
truncation audit plus the typecheck; `pnpm check` is the typecheck and there is no `pnpm typecheck`;
**the hub has NO bundle-budget gate**, that belongs to game-amora only. **And one measured baseline
you should not rediscover: `contrast-audit.yml` has FAILED on every branch it has ever run on**,
including automated dependency bumps. It is red at baseline, so it is not yours and not a blocker.

**PUSH TO THE HUB'S `main` AUTO-DEPLOYS TO regencivics.earth. Nothing lands without the coordinator.**

---

## 1 · The ruling

**R92**, the founder, answering the question neither codebase could:

[**ReGen Civics mints on transfer with all actions and so do these Games. We may add a different
function later to mint from a treasury but that will be a future optional setting This needs an agent
to go and fix on that codebase if not already like this and to set up the minting bridges (like for
sending the tokens for module use).**]

**Three things.**

1. **There is no pre-issued treasury. A token comes into existence at the moment it is transferred.**
2. **A treasury holding already-issued tokens is a LATER, OPTIONAL setting.** Build nothing that
   assumes it, and do not build it now.
3. **Paying a module builder IS minting**, which settles the last open branch of the R81 audit.

## 2 · What the audit measured, which you re-verify before building on

A 25-agent audit read this repo at `fb32af1` and found:

- **The builders pool creates nothing.** The cron computes a document and stops. Proven with a
  control: the whole of `server/jobs/moduleBuildersPool.ts` contains zero occurrences of the
  crediting helpers while `settleCycle` and `modulePoolShares` each matched twice in the same
  command. **Migration 0227's own header says these tables hold statements and never transactions.**
- **Value moves when a human reads a CSV and makes transfers on Hypha.** `markExecuted` writes a note
  and verifies nothing on chain.
- **`server/blockchain.ts` declares itself read-only, no wallet, no signing.** A later reader found it
  is 138 lines that hand-encode calldata and POST a raw JSON body through `fetch`, **and that it
  never imports viem despite viem being a hub dependency.** Check that yourself.
- **`pool.regen_per_cycle` is set by one admin through an `adminProcedure` with no proposal**, and it
  decides how much is issued every moon. **The live value is 333** and the row is named
  "Custom Game Module Creators Pool".

## 3 · What to build

### a. Minting on transfer, as the hub's actual model

**Establish first what the hub does today when it credits somebody**, end to end: the private-balance
credit, the `user_token_ledger` source tags, the claim bridge to public, and what `syncTokens` reads.
**Then say plainly whether the hub already mints on transfer or whether it assumes a supply.**

**If it already works this way, say so with evidence and do not rebuild it.** The founder's own words
are "fix on that codebase **if not already like this**", so confirming it is a legitimate outcome and
a valuable one.

**If it does not, make it so.** And whatever you find, **write down the model in the code** where the
next reader meets it, because this question cost an audit and a founder's time to answer.

### b. The bridge for module use

**The named example: sending $ReGen for module use.** Today the trail ends at a statement and a CSV.

**Read `server/lib/hypha-bridge/` before designing anything.** The standing rule in this repo is that
any handoff to an on-chain action goes through the bridge as a new intent type and **nothing
hand-rolls a redirect.** Extend it.

**Two constraints from the existing design that you keep:**

- **A builder's Base address is resolved from that builder's own profile**, never from a config file,
  because a handle is asserted by the person being paid and an address in a file is asserted by
  whoever edits the file.
- **The statement carries a hash of every input so a third party can recompute it.** Whatever you
  build keeps that property.

**And the honest-limits rule, which this program enforces harder than any other:** if the furthest
you can get is a signed intent a human still confirms, **build that and say exactly where it stops,
as a sequence somebody could follow.** Do not leave the product claiming it can pay somebody if it
cannot. Round 6 found an admin page promising a payment nothing could perform, and that defect class
has cost this program more than any other.

### c. What you must not do

- **Do not build the treasury.** It is explicitly a later, optional setting.
- **Do not invent a wallet address in a config file.**
- **Do not put a signing key anywhere it can be committed.** If your work needs one, **stop and tell
  the coordinator** rather than choosing a home for it. The coordinator does not touch production
  credentials either, so this is a founder decision.
- **Do not let a share owed to an unlinked builder silently vanish.**

## 4 · The identity question that sits underneath, and is NOT yours to build

**R88** says a ReGen Civics account should work as an account in any custom game, on the same Base
account, so a member of both can receive hub-minted $ReGen. **Two products, two databases, two auth
systems.** A red team found the hub has **zero signature-recovery matches** against a control that
matched, so **nothing today verifies that a claimed Base address belongs to the person claiming it.**

**That is a separate lane and you are not building it.** But your payout path will need it, so
**report what your work assumes about address ownership and what would have to be true for that
assumption to hold.**

## 5 · Gates and reporting

**Enumerate the hub's workflow directory yourself and report the list you found.** `pnpm gate` finds
a working Python itself; do not hand-run `python3` on Windows, where it resolves to a Store stub that
prints an advert and exits **without running the audit**. **Capture each gate's exit code directly,
never after a pipe.** `jq` is not installed.

**Migrations do not run on the hub deploy.** If you add one, the coordinator applies it by hand.

Report in the house-rules §9 shape, plus:

- **Whether the hub mints on transfer today**, answered with evidence either way.
- **Whether a builder can now actually be paid end to end**, and if not, **exactly where it stops**,
  as a sequence a person could follow.
- **Every sentence the product says about builder payment, and whether each is true.**

Status stops at **CODED**. **Nothing is pushed or merged without the coordinator.**
