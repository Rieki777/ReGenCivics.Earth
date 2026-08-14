# Addendum to the Master Integrator Coordinator prompt

Paste this into the coordinator session if it is already running. If you have not started it yet, the
main prompt file has the entity section already updated and you only need the rest of this.

---

## 1. The literal reading was checked and it breaks. Here is the settled three-way split.

Grepping the ReGen Civics hub for `requireModule|ModuleDef|module_settings` returns **zero matches**.
`server/lib/secrets.ts` and `shared/capabilities.ts` do not exist there. There is no admin Integrations
page; all vendor credentials in the hub are flat env vars with no per-tenant slot. Most decisively, the
hub has **no village-member model**, so `forgetMember` and `exportMember` have nothing to hang on.

So:

- **The coordinator, the ledger, the handoff and the program documents** live committed in a hub
  worktree.
- **The module framework code** stays in game-amora worktrees.
- **A third piece nobody named yet also lives in the hub**: the hub side of a Managed listing. The
  shared vendor account, the per-fork roster, the billing line item, and the contracting entity block.
  That is real work and it belongs on the landing queue.

Two supporting facts. `.claude/` is tracked in the hub and holds roughly 200 skills; game-amora's
holds two. A coordinator in a hub worktree inherits the whole library. And the previous coordinator
already flagged loose-on-disk artifacts as at risk in `SWARM_LEDGER.md`, so committing the program
documents fixes a named, already-paid problem.

**Committing is a prerequisite, not a step.** `git worktree add` carries tracked content only, and the
seven program documents are outside git entirely. Commit them into the hub first, then branch.

**Use the hub's own script rather than raw git:** `scripts/new-worktree.sh integration` fetches, branches
from `origin/main`, copies `.env` and runs install. This matters because the primary hub checkout is on
`ship-rite-truth` and local `main` is behind `origin/main`, so what Rye sees in his editor will not match
your worktree. Record the fetch SHA in ledger §0.

**One document already disagrees with itself.** `MODULE_LIBRARY_CONTRACT.md` names its own destination as
a game-amora path, because it was written before the worktree instruction. Split it deliberately rather
than relocating it silently: the vendor-facing contract goes to the hub where the entity and the money
are; the module framework spec goes to game-amora's docs beside its siblings.

## 2. The Managed credential reverses a locked decision. It needs an ADR before any code.

`CUSTOM_GAMES_MASTER_PLAN.md` locked decision 1 reads: **"API keys post-acceptance only, entered by the
client into their own instance. Never at intake, never stored in ReGen Civics systems."** It is enforced
in code in `shared/customGameBlueprint.ts`.

The Managed tier's platform-held env-only credential is a direct reversal of that. Hub `CLAUDE.md`
requires a new ADR appended to `.ai/docs/DECISIONS.md` and forbids editing an old one.

**Your first hub artifact is that ADR proposing the scoped exception, not a spec that assumes it.**

The precedent to build on is already shipped: **ADR-46** runs one platform-held vendor account serving
every fork, with a per-fork relay registry, secrets masked to last4 on read, and the rationale recorded
as "one account, one signing key, one place to watch health." That is the Managed argument, already
accepted in this repo. Its stated trade-off, fork secrets held in plaintext in the hub database with an
explicit revisit flag, must be answered in your ADR rather than inherited.

Also register new terms in `.ai/docs/DOMAIN-LANGUAGE.md`, which the hub's CLAUDE.md makes mandatory:
Included, Connected, Managed, vendor lapse, module listing, domain driver.

## 3. The ledger is two files, not one.

`INTEGRATION_LEDGER.md` is long-lived, committed, and spans rounds. `HANDOFF_NEXT_COORDINATOR.md` is
regenerated at every session close and after every ruling, and holds only volatile state. The proven
local convention is one ledger per round with a new file each round, which does not survive a standing
program, so durable state moves into the ledger and only volatile state is regenerated.

Sections, in order:

**§0 State, measured \<date time\>.** One row per repo: checkout path, trunk ref, when last fetched,
deployed marker, the SHA of the CI file the gate set was read from, coordinator worktree. Plus a base
ref per lane. Everything here is re-measured at session open and never inherited.

**§1 Rules.** The five house rules verbatim, plus three for this program: no lane commits to both repos
(a cross-repo item is two items with an ordering constraint); no listing advances past a stage whose
exit-gate artifact cell in §3a is blank; commit by pathspec, never `git add -A`.

**§2 Lane registry.** Lane, repo, worktree and branch, session id, what it owns, status, last ref,
**liveness verified at** as a timestamp rather than a belief. Carry the standing warning: a session that
has exhausted its context will accept an assignment and never do it.

**§3 Resource registry.** Migration numbers per repo, module ids, capability names, domain names, ADR
numbers, env vars, branch names. A number can be held four ways here: a remote ref, a local ref in
another worktree, an untracked file on disk, and another session's scratchpad. Entries written from a
handoff rather than from disk are marked GUESS until confirmed.

**§3a Vendor and listing registry.** New. One row per listing: listing id, vendor legal name,
jurisdiction, named human and email, product URL, terms URL, status page, current stage 0 to 10, **the
artifact that satisfied the last exit gate**, tier sought, who bills, dataClass, the domain it provides,
write surface, DPA state, contract version accepted under, withdrawal terms recorded. **A blank cell is
a hard stop, not a TODO.** Saberra and Orbit both start here, Orbit frozen at stage 1.

**§3b Credential registry.** New. Per secret: key name, platform-held or village-held, which plane it
lives in, rotation owner, lastSuccessAt, lastFailureAt, and the ADR that authorised platform-holding it.

**§3c Contracting entity block.** New. Contracting party, EIN, jurisdiction, registered address,
signatory and the authority they sign under, plus the open counsel questions and, for each, exactly
which stages or listings are blocked behind it. Most cells read UNRESOLVED today and that is the point.

**§4 Landing queue.** Ordered, dependencies as constraints. Cross-repo pairs appear as two adjacent
items with the direction written out.

**§5 Gate set.** Two blocks, one per repo, verbatim and copy-pasteable, each stamped with the SHA of the
CI file it was read from and the date. Standing line: do not take this list from anyone's memory,
including mine. Both CI configs moved recently, so any inherited list is suspect.

**§6 Open blockers.** What, on whom, since when as a date, what it blocks.

**§7 Changelog.** Every landing: the ref, one line of what changed, what was measured to prove it.
Append forward.

**§8 Coordinator rulings.** Numbered and dated, written whenever two lanes contend, a stage is waived or
refused, or a doc home is chosen. Corrections to earlier rulings are inline and loud: "**CORRECTION:**
this ledger first said X..."

**§9 Paid lessons.** One general rule per specific loss, written the day it happens. Seed it with: a
worktree's name says nothing about its ref; a registry entry written from a handoff is a guess; a
migration number has a fourth holding place; a green suite is a sample.

**§10 Decision list for Rye.** Regenerated each session, sorted by what only he can do, every item
tagged with an owner, a priority and a "Done when" criterion.

`HANDOFF_NEXT_COORDINATOR.md` mirrors the seven-section shape already proven in
`SWARM_HANDOFF_NEXT_COORDINATOR.md`, opens with "everything below is verified, not remembered, re-verify
anything older than an hour", and adds one section the original lacks: **what I got wrong since the last
handoff.**

## 3a. The diagnostic path. New scope, and it changes the build order.

Rye's decision: **a villager diagnoses by asking Maia**, and she identifies what is wrong and who to
contact. This replaces a support-routing policy with a support-routing mechanism, and it is what makes
"route complaints to the module owner" workable, because a villager cannot attribute a fault on their
own.

**The rule that makes it safe: diagnosis is deterministic, and Maia renders it rather than deciding
it.** She must never reason her way to a conclusion about whose fault something is. The attribution
comes from recorded facts: module lifecycle, credential presence, last success and last failure per
integration, the HTTP outcome, and the module's tier and vendor record. Maia's job is to say it in
plain language and hand over the right address. Copy the map concierge's posture: deterministic first,
the model only phrases, and any refusal falls back to the deterministic answer.

**Four outcomes, not two.** The two-bucket version routes configuration problems to vendors, which
wastes their time and damages the relationship, and configuration is the most common failure by a
wide margin.

1. **Not broken.** Empty because there is no data yet. A new village's memory panel is correctly empty.
   Distinguish this first or the first week generates vendor tickets for a working system.
2. **Your configuration.** No credential entered, credential expired, module enabled without its
   dependency, module switched off. Routes to the village's own admin, not outward.
3. **The vendor.** Routes to the vendor's support address with the evidence packet.
4. **Us.** Routes to ReGen Civics. Includes the case where the platform itself is degraded, which
   outranks every per-module answer, because when the database is slow every module looks broken.

**Two answer tiers.** Most of what diagnosis reads is admin-tier: credential state, failure detail,
config. A member gets "the village memory is not answering right now, a steward has been told, here is
what still works." An admin gets the vendor, the last success, the error and the support link. Do not
leak operational detail to every account.

**Maia can be the thing that is down.** Her budget is a deployment-global daily bucket, so a village
that has spent it has no diagnosis exactly when it needs one. The deterministic layer must therefore be
reachable **without a model call**: the failure panel renders the same four-outcome answer inline, and
Maia is the friendly front door rather than the only one.

**Discovery is the difference between this working and not.** Nobody thinks to ask an assistant when
something is broken; they re-click, then message the founder. So the 503 body and the failed panel
carry the diagnosis inline and offer the handoff, rather than waiting to be asked.

**Build dependencies, which are the real cost.** The diagnostic reader needs the `integration_calls`
incident log and the tier/vendor registry (both Lane C) and the tool loop (Lane A). It cannot ship
before both. Put it on the landing queue as its own item after Lane A and Lane C phase 1, and move the
incident log **ahead of the first Connected listing** rather than leaving it at "by the second
listing", because without it every attribution is an assertion.

**Draft the sentences deliberately, once.** All of this is shipped copy through `check-voice.mjs`, and
it is copy that would otherwise be written at 2am by someone annoyed. Four outcomes times two tiers is
eight sentences. Write them before the code.

## 4. Use the house done-vocabulary. It already exists.

`regen-ship-gate` defines it: **CODED** (the edit is in the file, read back), **VERIFIED** (behaviour
confirmed, all gates green, evidence attached), **DONE** (observed live). The hub's CLAUDE.md states the
rule: **no evidence means the status stays CODED, never VERIFIED.** "Agent reported success" is not
evidence. A lane report carries file:line, the literal gate output line, and the ref it was measured at.

## 5. Seven failure modes with their guards. Put these in §1 or §9.

- **Stale-base re-dispatch.** You read a worktree, see a feature missing, and re-brief a lane that
  already built it. Measured today: `wt-integrate` sits at a different ref from five sibling worktrees.
  Guard: no dispatch and no "not implemented" claim without `git fetch origin` then a grep against
  `origin/main` at a named SHA, written into §0 with a timestamp.
- **Coordinator becomes a lane.** Guard: you may write exactly three paths, all inside your own
  worktree: the ledger, the handoff, and the dated decision list. Every other write is a rule violation
  you log in §9. Deciding to do the work yourself instead of fanning out is legitimate under the skill's
  section 0, but it is a declared mode change announced to Rye, never a drift.
- **Evidence-free done.** Guard: the vocabulary and report template above.
- **State loss on compact or restart.** Guard: the ledger is committed, and the handoff is regenerated
  at session close and immediately after any ruling.
- **Reverting another lane.** This has already happened twice on record, once swallowing 12 files from a
  parallel session. Scale today: 29 worktrees off game-amora, 11 off the hub, and the hub working tree
  is dirty in `CustomGamesApply.tsx`, which is the exact funnel a module-library line item would sell
  through. Guard: the Owns column, per-hunk contamination, `git add <paths>` only, and ask who owns that
  file before planning any change to it.
- **Vendor conversation outruns its gate.** Guard: §3a's stage column with the artifact that satisfied
  each exit gate. Refuse to schedule build work for any listing whose stage 1 and stage 3 cells are
  empty, and say so to Rye in writing rather than silently sequencing around it.
- **Stale gate set.** Guard: §5's two SHA-stamped blocks, re-read at every session open.
