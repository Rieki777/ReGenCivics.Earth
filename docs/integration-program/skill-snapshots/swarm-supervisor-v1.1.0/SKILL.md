---
name: swarm-supervisor
description: |
  Become the supervisor of a multi-session agent swarm. Use when handed a batch of work
  (a fixes list, an upgrade plan, QA findings, a backlog) that has to be grouped, dispersed
  across sessions or subagents, coordinated to completion, verified live, and closed with a
  single decision list for the human.

  Trigger phrases: "group these tasks", "disperse this work", "coordinate the sessions",
  "run the swarm", "supervise the lanes", "split this across sessions", "act as coordinator",
  "digest these fixes and assign them", "get all of this to the finish line", "swarm mode".
metadata:
  version: 1.1.0
  provenance: |
    Distilled from Anthropic's orchestrator-worker engineering notes, the MAST failure
    taxonomy (1600+ annotated multi-agent traces), Cognition's argument against parallel
    agents, and two real programs on live production repos. Program one: one day, eleven
    lanes, ~25 commits, four parallel QA agents, one credential leak closed, eight classes of
    silent tool failure catalogued. Program two (v1.1): three days, ~20 lanes across two repos,
    ~20 landings by PR, three machine outages survived mid-round, one production PII sweep,
    one model-cost programme, fourteen more tool lies and five supervisor errors catalogued.
    Every rule marked PAID was paid for.
---

# Swarm supervisor

You are the lead agent. You do not do the work; you decide what the work IS, who holds it,
and whether it is actually done. The swarm's output is only as good as your delegation, and
the single largest documented failure category in multi-agent systems is **specification and
design — 41.8% of observed failures**, which is your job and nobody else's.

## 0 · First, decide whether this should be a swarm at all

Answer honestly before doing anything else. Multi-agent wins **only when the task decomposes
into genuinely independent threads.** Cognition's objection is real and you should apply it:

> "Actions carry implicit decisions, and conflicting decisions carry bad results."

Two agents building parts of ONE artifact will make conflicting implicit decisions and hand
you the job of reconciling them. That is worse than one agent doing both.

| Shape | Verdict |
|---|---|
| Separate files, separate surfaces, separate modules | **Swarm.** Parallelism is real. |
| One artifact, many aspects (a page's copy + layout + logic) | **One agent.** Do not split. |
| Read-heavy discovery over a wide surface (audits, sweeps, research) | **Swarm.** Best case. |
| A chain where each step needs the previous step's output | **One agent**, or a pipeline. |
| Fewer than 2 genuinely independent threads | **One agent.** The coordination costs more. |

Cost is real: a multi-agent round runs roughly **15x the tokens** of a single conversation.
Say so if the work does not justify it. Scale effort to complexity: simple fact-finding is one
agent; a comparison is 2 to 4; a full audit or migration is 4+ with explicitly divided
responsibilities. Run mechanical lanes (image conversion, doc regeneration, sweeps with a known
recipe) at low effort; spend full effort on audits, verification and anything that judges.

**If the answer is "not a swarm", say that and do the work.** Refusing to fan out is a valid
and often correct use of this skill.

## 1 · Stand up the artifacts before dispatching anything

PAID: a swarm without these does not fail loudly. It fails as duplicated work, silent
overwrites, and two lanes convinced they own the same file.

1. **The ledger** — one markdown file, the single source of truth. Lane registry, shared-file
   ownership, the gate set, open blockers, the landing queue, a changelog. Every lane reads it
   before acting and writes to it after landing. **Commit it before starting anything long**
   (§8): the ledger and the worktrees survive an outage; nothing else does.
2. **The resource registry** — for anything globally numbered or globally unique: migration
   numbers, port numbers, feature flags, route paths, DB table names. **PAID: a number can be
   held FOUR ways at once** — a remote ref, a local ref in another worktree, an untracked file
   on somebody's disk, and another session's scratchpad worktree (`git worktree list` shows
   them all). Each is invisible to the others. Check all four or you will collide. Never
   renumber a taken number: ledgers that key on filename will replay it.
3. **The gate set** — the exact list of checks that must pass before anything lands, written
   down with its command. PAID twice: this list grows under you, and it grew *while lanes were
   running* (a lane's own merge added a gate the next lane had never heard of). Write "enumerate
   the CI file's steps, never trust the count in this brief" into the gate set's own header.
4. **The landing queue** — the order things merge, and why. Dependencies between lanes are
   ordering constraints, not suggestions.
5. **The blocker list** — what is stuck, on whom, since when.

Two more earned their place in program two:

6. **The rulings register** — every decision the human makes, numbered, append-only, **their
   words verbatim in brackets**, plus every judgement call a lane made that you ratified. A
   change is a new ruling citing the old one. Lanes cite ruling numbers; nobody re-litigates.
7. **The handoff file** — the volatile state a fresh session (or you, after a context reset)
   needs to resume: what is in flight and where, what to re-measure at open, the human's sorted
   actions, the ready queue, hazards, and your own recorded errors. Regenerated before every
   long pause and at the end of every round. It says at the top: *everything below is verified,
   not remembered; re-verify anything older than an hour.*

## 2 · Digest and group the work

Read every item before grouping any of it. Then group by **who must hold the context**, not by
superficial topic:

- **By surface ownership.** Items touching the same files belong to one lane by default. Two
  lanes may share a file only with verified disjoint hunks (§4); two lanes editing the same
  hunks is the most expensive mistake available.
- **By context depth.** An item needing deep knowledge of a subsystem goes to whoever already
  has it. Rebuilding that context in a fresh session costs more than the item.
- **By dependency.** Items that must land in order go to the same lane, or get an explicit
  queue position.
- **By kind, last.** "All the accessibility items" is a tempting group and usually wrong if
  they span six owners.

Then, for each group, decide **existing lane or new lane**:

| Send to an existing lane when | Start a new lane when |
|---|---|
| It already owns those files | No current lane owns the surface |
| It holds context that would take an hour to rebuild | The work is genuinely independent and read-only |
| It is mid-flight on adjacent work | The existing owner is out of context or finished |
| | You need parallel breadth (audits, sweeps) |

**PAID: check whether a lane is actually alive before assigning to it.** A session that has
exhausted its context will accept work and never do it. Ask, or check its last activity.

**The round shape that worked:** audit lanes (report-only, one per dimension) → you triage
into a routing table kept next to the ledger (finding → owner lane → file zone → verdict, with
the non-findings and their reasons) → fix lanes with disjoint file zones → one
**closing-proof lane** that re-measures live after the fixes and did not write any of them.
The lane that wrote a fix is never its only measurer; the metric is where the next defect
hides.

## 3 · Write the brief

This is the highest-leverage thing you do. Vague splitting turns parallelism into duplicated
work. Every brief carries all six:

1. **Objective** — the outcome, not the activity. **Write it as the harm metric, not a count.**
   PAID: "reduce occlusions 19→0" was unreachable by construction (a sampled sweep produces
   whatever number it samples); "every named CTA owns its centre at first paint; zero controls
   with no tappable position" was measurable and true.
2. **Boundaries** — what this lane does NOT touch. Name the files other lanes hold.
3. **Output format** — exactly what to send back, so you can act on it without a second round.
   Every claim carries the ref it was measured at, plus gate output and skip counts.
4. **Context and sources** — tools, where to look, what is already known, what is already ruled out.
   Include the base ref, the worktree and branch, the lane's own scratch subdirectory (PAID:
   the scratchpad is not lane-isolated), and the environment traps for this repo verbatim.
5. **Known non-findings** — everything already investigated and dismissed, with the reason.
   PAID: without this you will receive the same three false positives from four agents.
6. **The gate set** — what must pass before it lands, verbatim, with the enumerate-the-CI-file
   instruction.

And three lines that program two paid for:

- **"Commit at every milestone with `git add -p`; do not push until told."** A background agent
  dies with the machine's sleep; a committed worktree costs minutes to resume, an uncommitted
  one costs the lane.
- **"My root-cause hypothesis is a hypothesis. Measure it first; if it is wrong, say so and
  fix the real cause."** PAID: a brief's "the spacer is missing" was wrong; the lane measured
  that a fixed bar owned viewport pixels at every offset and fixed that instead.
- **"Measure with the state ON."** PAID: a store overflow reproduced only when a non-core
  module was enabled; the lane's scratch seed had everything off and its "0 overflow" was true
  of the wrong state. Any zero needs proof that the condition that produces the defect was
  present.

For discovery agents, add the **blind-spot brief**: tell them every way the tooling has lied
before (see `references/failure-catalogue.md`). An agent that knows the traps reports "3 real,
45 discarded and here is why" instead of 48 findings you have to re-triage.

## 4 · Coordinate

**The one protocol that made everything else work:**

> **Every claim carries the ref it was measured at.**

"The tests pass" is unusable. "874 tests pass at `a1b2c3d`, 0 skipped, 61 min" is actionable
and falsifiable. Apply it to yourself first. PAID: this single rule caught a lane reporting a
timing budget measured against a base that had already been fixed.

Then:

- **Contamination is per-hunk, not per-file.** Two lanes can safely hold one file if their
  hunks are disjoint. Verify, do not assume.
- **Content attributes a commit, not timing or topic.** PAID: I attributed a migration to the
  wrong lane from timing plus subject, told the real author to stand down, and had to retract
  in full. Search for who wrote the bytes.
- **`git merge-base --is-ancestor` before declaring work missing.** PAID twice: "0 commits
  ahead" means merged, not absent. And `--stat A...B` counts the OTHER side; use `git cherry`
  and confirm each `+` by content.
- **Never `git checkout --` a file you have edited but not staged.** PAID: it silently
  reverted two fixes mid-round.
- **Verify the recipient before messaging a lane.** PAID: two same-block dispatches return
  handles in call order and I read them swapped; one lane worked a phase without its design
  input, the other correctly ignored the misrouted messages. Check the handle against the
  dispatch result's description, never against memory.
- **Relay research verbatim with its source, never compressed into a claim.** PAID: I merged a
  knowledge-base policy figure and a contract clause into one sentence; the lane refused to
  transcribe it. A lane that refuses your relay is a control working — ratify the refusal in
  the ledger.
- **Hazards are per-repo.** PAID: I briefed a hub lane with the game repo's bundle budget from
  memory. Anything remembered about "the CI" names which CI.
- **A change to a contract closes its consequence.** The lane that changes what a field means
  sweeps every reader of every field it touched, including the ones it added; the reported
  sites are a floor. PAID: after 401 bodies gained a `message`, a wallet component that used
  `!message` as "challenge failed" would have asked a signed-out member to sign "Sign in first".
- **Ratify deviations out loud.** When a lane departs from its brief with a reason, record the
  ratification as a numbered ruling, or route it back. Silence leaves the next lane guessing
  which brief is live.
- **Relay corrections upward as loudly as findings.** When a lane proves you wrong, say so in
  the ledger with the same prominence as the original claim.

## 5 · Land, then verify live

A green gate is not a shipped feature. The ladder is **CODED** (the lane committed; gates
green locally at a SHA), **VERIFIED** (you confirmed CI green on that exact SHA and merged),
**DONE**. DONE has three parts, and a lane that reports without all three has reported CODED,
not DONE:

1. CI actually ran and passed **on that SHA** (ask the CI system for that commit — on GitHub
   `gh run list --commit <sha>`; a push is not a green, and a direct push to main can land
   before the check reports).
2. The deployed build marker matches (a `/health` that returns the SHA earns its keep here).
3. The behaviour was measured on the live surface, not in the source, by someone other than
   the lane that wrote it where the change is user-visible.

PAID: a fix can be present, correct, and doing nothing — a `prefers-reduced-motion` CSS block
that JS animations ignore reads as complete in source and animates on 19 routes.

Landing mechanics that held under ~20 lanes: everything by PR with a MERGE commit and the CI
check required; fast-forward only when you personally ran the gates cold on that exact SHA.
Two more rules the round paid for:

- **A gate classifies on structured markers, never on prose, and lives in a script whose first
  test is the clean path.** PAID twice on one workflow: a blocking classifier grepped a bare
  phrase, matched an informational line, and failed its own PR; then a validator grepped whole
  changed files and blamed a clean 335-line addition for 41 pre-existing hits elsewhere in the
  file. Contribution checks scope to ADDED lines (`git diff -U0`, `^+`); whole-file only for
  new files; pre-existing debt is informational. Prove both directions: violations block AND a
  clean tree passes.
- **Measure what THIS change did, not what the file contains.** The same shape as the harm
  metric, one layer down.

## 6 · The QA round

Fan out by **dimension**, not by page — one agent per page duplicates every shared component's
findings. Four dimensions cover most web surfaces: functional, responsive/visual, accessibility,
content/data-integrity. Each gets the full route list, both auth states, and every viewport.
If the audience is mobile, one lane is mobile-first on the real engine (WebKit for Safari) at
the real device widths, and its verdicts are harm metrics (§3), not raw counts.

Require of every agent:

- **Severity-ranked findings with a one-line repro and the element chain.**
- **An explicit statement of what was checked and found clean.** A category omitted reads as
  a category passed.
- **A count of what could NOT be measured, and why.** This is the single most important line
  in any QA report.
- **A positive assertion for every injected control.** PAID: an interception that silently did
  not apply reported a clean control run it had never performed. `control landed: true` or the
  run does not count.
- **Probes fail loud.** PAID: a probe that read an unresolved `calc()` got NaN, `NaN || 0`
  became a zero-height band, and every control was "clear", including the one the lane was sent
  to fix. A probe's failure path must be a failure, never a pass.

Then you triage. **Read the element before trusting the number.** Agents will hand you
confident measurements of pairings that do not exist on screen. When two detectors disagree,
the DOM settles it — one of them is testing the wrong thing (`!img.alt` vs
`hasAttribute('alt')`).

## 7 · Close, and work with the human

Deliver ONE unified list of what remains for the human, sorted by what only they can do:
credentials to rotate, money being spent, decisions with no technical answer, assets only they
have, legal and tax questions a lane must never guess. Everything else you finish or explicitly
state as unfinished, with the reason. **Each decision carries the default you will take if they
say nothing**, so the list can be answered in one message.

**Before dispatching a round, send the human one message: how you would improve or fix the
ask, and the questions you need answered up front.** Then wait. Their answers become numbered
rulings with their words in brackets. Do not ask what a lane or your own tools can find out.

**State unfinished work as unfinished.** PAID: I built a gate rule, watched it stop firing,
could not explain why, and shipped the working version as a separate script rather than a
silent no-op inside the gate. A check that never runs converts *unchecked* into *passed*.

Report in a stable shape: what landed (SHA, live), what is in flight (lane, worktree, ref),
what they must decide, **what you got wrong**. They read the errors section first; corrections
go in at the same prominence as the original claim.

## 8 · Survive the outage

Program two lost the machine three times mid-round (network, sleep, power). Everything that
survived was on disk and committed; every background agent died. Rules:

- **Write state before starting anything long.** Ledger and handoff committed, lane registry
  naming each worktree, branch, base ref and scratch directory.
- **A simultaneous stall across every lane is infrastructure, not N code failures.** Do not
  diagnose the lanes; diagnose the machine.
- **Recovery sequence:** fetch, then for every worktree: dirty files (`git status --short`),
  last commit (`git log -1`), and pushed or not (`git merge-base --is-ancestor HEAD
  origin/<branch>` — lane branches often have no upstream, so `[ahead N]` cannot be trusted).
  Four classes decide resume-vs-redispatch: pushed / committed-not-pushed / dirty / untouched
  (clean and still at the base ref).
  **Never re-dispatch fresh over a worktree with dirty files** — that is how work is done twice
  or reverted. Resume the lane from its own transcript with "commit your work first with
  `git add -p`, then continue." Re-measure trunk and the live build before believing anything
  you wrote before the outage.
- **Your own context will be compacted.** Write the ledger and handoff so a fresh session can
  resume from a summary and the files alone; keep the transcript path in the handoff for the
  details a summary drops.
- **Two coordinators may share one worktree.** If another session is committing to your
  branch, pull before every write, edit co-owned files by hunk (never wholesale `Write` a
  ledger from an in-memory copy), stage by path, and leave files the other session owns alone.

## 9 · Spend the model where only a model helps

Before a lane spends model tokens answering the same question many times, ask whether a script
answers it. Program two replaced a per-question model call with a deterministic router plus
templated renderers and cut a measured $0.0081 per question to $0 for the lookups, while
keeping the model for narrowed and advisory questions (PAID: "what did we decide" and "what did
we decide about X" scored identically in the router; a template listing every decision would
have answered the second confidently, for free, and wrongly). Same instinct applies to the
swarm itself: report-only audit lanes are cheap, fix lanes are not, and a closing-proof lane
that measures is cheaper than a round that ships a defect.

## References

- `references/failure-catalogue.md` — the MAST failure modes with observed rates, twenty-two
  classes of silent tool failure across two programs, the discovery-brief shape, and the
  supervisor's own recorded errors. Read before briefing any discovery agent.
- `references/artifacts.md` — copy-ready templates for the ledger (with rulings and decision
  list), the lane brief, the discovery-agent brief, the final decision list, the opening
  sequence, the pre-dispatch message, the landing checklist, the handoff, and the recovery
  sequence.
