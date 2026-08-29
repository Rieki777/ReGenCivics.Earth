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
   down with its command. **ENUMERATE THE WORKFLOWS DIRECTORY, NEVER ONE FILE IN IT.** PAID in
   round 6: I read the main CI file's steps, corrected a three-gates-stale list, and called the
   result authoritative. Beside it sat two more `pull_request` workflows, **path-gated and
   therefore required checks** for anything touching one directory. Found only because one PR
   showed two extra green checks and I chased the difference. The repo's own facts script read
   the same single file and inherited the same hole. PAID twice: this list grows under you, and it grew *while lanes were
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

## 1a · Fixes outrank features

**Default order: broken before new.** When the queue holds both, the fix ships first — a defect is a
promise the product already made and is failing to keep, while a feature is a promise not yet made.
Rank within the fixes by whose trust is being spent: something a member is told worked and did not
(a report into a void, a claim that never reached the server, an admin's afternoon written into a
store nothing reads) outranks a rough edge, and a safety or money defect outranks both.

Three standing exceptions, and they are about pacing rather than preference:

- **The founder says otherwise.** Their call, recorded as a ruling; do not re-litigate it lane by lane.
- **The schedule genuinely favours the feature.** A blocked fix (waiting on a decision, a device, a
  key, a sibling lane's merge) must not idle a lane that could be building. Dispatch the feature and
  come back — the rule orders the queue, it does not hold the swarm still.
- **The fix is cheaper as part of the feature.** A surface being rebuilt anyway is the right moment
  to close its defects, and splitting that into two lanes contending for one file costs more than it
  saves.

PAID, repeatedly: every audit round on this program found the engines built and the *moments*
missing — a settlement with no button, an editor writing into a void, a report nobody could read.
Those were all cheaper than the features queued ahead of them and worth more per hour, because each
one restored something the product already claimed to do.

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
2a. **RE-VERIFY EVERY CLAIM IN THIS BRIEF.** Not a courtesy line: seventeen premises a coordinator
   relayed in one round were stale or wrong, several changing the shape of the work (a file that did
   not exist, a refusal list nobody had written, a gate that had never existed). **Say explicitly
   that a cause handed down from another lane is a HYPOTHESIS**, and that a lane correcting you is
   the lane working properly. Add: *if an item turns out to be wrong, do not do it - say which and
   why.* The best work in that round came from lanes that refused part of their brief with evidence.
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
- **"A test proves a behaviour is INTENDED, never that it is CORRECT."** PAID three times in one
  round, by three lanes: a suite expected a member to be told a roll had frozen when they were
  excluded for another reason, expected a legacy row to vanish **silently** from a settlement,
  and expected a mint far over the cap to succeed. Brief every lane whose job is to refuse
  something previously allowed: **if a test blocks your fix, read what it actually asserts
  before assuming your fix is wrong.**
- **"Run the migration. Do not review it."** PAID: a rename migration passed reading and
  collapsed two periods onto one id on its first run, because MySQL `LPAD` truncates as well as
  pads — the exact collision its own header promised could not happen. **Run it against seeded
  rows in every format it claims to handle, twice, and prove the second run a no-op.** And
  before changing any identifier's format, **grep for idempotency, cache and occurrence keys
  that embed it**: one lane found seat payments keyed on the value being renamed, where a
  rename would have re-paid every already-paid seat.
- **"Measure with the state ON."** PAID: a store overflow reproduced only when a non-core
  module was enabled; the lane's scratch seed had everything off and its "0 overflow" was true
  of the wrong state. Any zero needs proof that the condition that produces the defect was
  present.

For discovery agents, add the **blind-spot brief**: tell them every way the tooling has lied
before (see `references/failure-catalogue.md`). An agent that knows the traps reports "3 real,
45 discarded and here is why" instead of 48 findings you have to re-triage.

For any lane that will **write or trust a gate**, add the measurement brief from
`references/measurement.md` §5. Three lines of it prevent the most expensive failure available to
a swarm: a lane that measures itself and is wrong. PAID: one item took **five passes**, each
closing the defect the previous metric could not see.

**Brief the reviewer to widen the axis the builder just fixed.** A builder cannot see past its own
instrument, so a reviewer sweeping the same axes only confirms it. Every rejection worth having in
that round came from a reviewer that swept wider (288 frames against 90), measured a quantity the
builder never defined, or drove a surface the builder never drove.

## 4 · Coordinate

**Two protocols carry the round. This is the first:**

> **New work in a file goes to the lane already holding it, as a numbered brief addendum.**

Founder-ruled as the norm, not the exception. When something new lands mid-round and it touches a
surface a lane is already inside, you send that lane an addendum naming it — you do not open a second
lane into the same files, and you do not queue it behind the round. The owning lane has the context,
the file open, and the discipline already loaded; a second lane has none of that and will contend for
the same bytes. Say plainly in the addendum why it came to them ("you are already in this file") so
the lane can weigh it against what it is holding.

The exceptions are narrow and both are about the lane, never about convenience: the lane is finishing
and adding to it would delay a landing that matters more, or the addition is genuinely a different
subsystem that merely shares a directory. Neither is "it felt cleaner to start fresh."

PAID: the artifact in this program was shared by two lanes once and cost an entire regeneration
cycle, and every artifact PR afterwards had to be replayed rather than merged.

**And the second:**

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
- **A CORRECTION THE CORRECTED PARTY HAS NOT BEEN TOLD IS HALF A CORRECTION.** PAID twice in one
  round, both times free by luck. A lane disclosed crossing its zone into five files and I
  relayed only the one nearest the boundary, so a sibling wrote into a file it believed was
  unassigned. And I overturned a lane's refusal into the ledger and the triage table while
  leaving that lane asserting the withdrawn claim in the shared record for hours. **Recording a
  correction is not delivering it. When a lane reports crossing its zone, the relay to every
  sibling names EVERY file, not the nearest one.**
- **Ratify deviations out loud.** When a lane departs from its brief with a reason, record the
  ratification as a numbered ruling, or route it back. Silence leaves the next lane guessing
  which brief is live.
- **Relay corrections upward as loudly as findings.** When a lane proves you wrong, say so in
  the ledger with the same prominence as the original claim.

## 4a · Measure the baseline before you judge anybody

**PAID, and it invalidated a whole round of lane self-assessments.** A gate suite was RED on
pristine trunk and nobody had measured it. Every lane reported itself green against a baseline that
did not exist, and I reported "all eight gates green" from a run that was **not reproducible**.

> **The landing criterion is not "green". It is NO WORSE THAN BASELINE, measured in the same
> session, under the same load.**

- **Measure the baseline yourself**, from the pristine blob, in your session. A remembered green is
  a sample, never a proof.
- **Compare failure SETS, not counts.** `LANE \ CTRL` is the only thing that blocks. Five reps of
  the same bytes ran 107/5, 112/0, 107/5, 106/6, 105/7.
- **n>=5 paired ALTERNATING reps.** Alternating cancels machine load, which matters when a dozen
  agents share one box. Sample size lies in BOTH directions: at n=3 a control looked deterministic
  and a lane looked regressed; at n=7 both arms wandered.
- **A control that did not run is not a control.** Twice in one round a control produced zero checks
  and was nearly read as a comparison: once from a `/tmp` path a browser could not resolve, once
  from a crash a `^FAIL`-only grep turned into "SUBSET". Assert a non-zero check count first.

Full discipline, including the seven-shape silent-zero class, in `references/measurement.md`.


## 4b · Do not pay for work the graph already blocked

(§10 holds the sibling coordinator's twelve mechanical lessons; read the two sections as one list.)

Most of a swarm's wasted money is spent by the COORDINATOR, not the lanes. In one round about
20M subagent tokens bought roughly 1.5M of pure loss, and every item was a harness error while
the lanes themselves were working. `references/measurement.md` Part 6 has the full accounting.
The three that recur:

1. **A barrier nobody needed.** `await pipeline(...)` above a `parallel([...])` whose prompts
   read nothing from the pipeline. Three reviews sat behind four unrelated agents, one parked
   at zero tool calls. Before writing `await X` above `Y`, ask what value of `X` the prompt for
   `Y` reads. "None" means they belong in one `parallel`, or `Y` belongs in its own stage.
2. **De-serializing a RUNNING workflow.** Re-dispatching to unblock does not cancel the pending
   phase, so it runs twice. Serialization costs wall-clock; the repair costs tokens. Once it is
   running, prefer waiting.
3. **A fleet dispatched into a quota wall.** Five agents, 929K tokens, all dead before a single
   tool call. Near a ceiling, spend ONE canary and read its result before committing a wave.

And when ranking what to review next, rank by **the tier of defect the review could find**. A
third review of a lane that already passed twice costs the same as a first review of an
unreviewed one, and is not worth the same. Watch for the real signal of a healthy multi-pass
lane: strictly fewer findings each pass, and a brief that requires a COUNT rather than
permitting "the class is closed".

Two sharpenings from the sibling coordinator (round 4, Sonnet), same class of waste:

4. **Waiting is armed, never polled.** "Prefer waiting" means a completion notification or a
   single `until`-loop background waiter, then silence. A recurring self-wake cron "just in
   case" fires a full coordinator prompt every interval; keep one long-delay one-shot as the
   silent-death fallback and delete pollers the moment the fleet shrinks.
5. **The cheapest fleet is the one you did not dispatch.** Before a wave, ask what single
   measurement would make half of it unnecessary (one scout read, one `gh pr view` from the
   RIGHT directory, one health probe), and take that measurement inline first. Round 4's
   near-misses were all coordinator reads skipped or misdirected, never lane work.


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
ask, and the questions you need answered up front.** Then wait **only on the lanes that question
actually gates, and keep every unblocked lane running while you wait.** PAID: asking for a ruling and
then idling the whole swarm cost a program hours of wall-clock while four independent lanes sat
undispatched behind a question that gated one of them. A question is a dependency on ONE lane, never a
stop on the round. The same rule governs reporting: report progress *while* the next wave builds, never
instead of dispatching it. A round is finished when the work is finished, not when you have written a
good summary of it — do not wind down, close out, or archive a session while lanes are running or the
queue is non-empty. Their answers become numbered
rulings with their words in brackets. Do not ask what a lane or your own tools can find out.

**State unfinished work as unfinished.** PAID: I built a gate rule, watched it stop firing,
could not explain why, and shipped the working version as a separate script rather than a
silent no-op inside the gate. A check that never runs converts *unchecked* into *passed*.

Report in a stable shape: what landed (SHA, live), what is in flight (lane, worktree, ref),
what they must decide, **what you got wrong**. They read the errors section first; corrections
go in at the same prominence as the original claim.

### 7a · Every session ends the same four ways. Founder-ruled, not optional.

A round is not closed by the last merge. It is closed by leaving the next person - the founder, or
the next coordinator, or you tomorrow with none of this in context - able to pick it straight up.
**Do all four, in this order, every time.**

0. **THREE COMPLEMENTARY QA PASSES OVER EVERYTHING THE SESSION BUILT AND TOUCHED, AND THE SESSION
   CLOSES ONLY WHEN THEIR FINDINGS ARE FIXED.** Founder-ruled. Not one review at three efforts and
   not three reviewers reading the same diff: **three DIFFERENT PERSPECTIVES that see different
   defects.** The set that fits most products:
   - **The member's eyes.** Drive the running product as a person, on a phone and on a desk. Is every
     sentence TRUE, does every control do what it says, does any promise dead-end? **This is the pass
     that catches the class code review cannot see** - six times in one round a fully green surface
     said something false and a screenshot caught it.
   - **The adversary.** Attack the invariants as an ordinary member, not as an admin: make value
     appear, change a frozen decision, hold a power nobody gave you, act without leaving the record,
     get more out of a public surface than it means to give. **An honest "I tried X, Y and Z and it
     held" is a real result**, so ask for the survived-attacks list too.
   - **The operator and the fork.** Does every control an operator is offered actually save, and does
     anything READ what it saved? Does a fresh fork with nothing configured get an honest product?
     **The worst defect in this class is a save that lands where nothing reads** - no error anywhere,
     and the founder's work silently gone.
   **Run them READ-ONLY and in parallel**, each with its own scratch schema, each forbidden from
   fixing: three lanes editing the same files fight, and a QA pass that fixes stops looking. **Then
   dispatch the fix wave with disjoint zones.** Tell each pass to rank by WHAT THE USER LOSES rather
   than by how hard the find was, to prove every negative it claims, to say what it could not reach,
   and **not to diagnose causes** - a cause handed down from a QA pass is a hypothesis, and seventeen
   relayed premises were stale in a single round.

1. **REPORT WHAT SHIPPED.** One pass over the whole session, not a list of the last hour: every PR
   with its number and what it actually changed **in the founder's own terms**, the merge SHA the
   tree now sits on, and the count. Lead with anything live and user-visible. **Then the decisions
   only they can make**, each with the default you will take if they say nothing, and **what you got
   wrong**, at the same prominence as the original claim. If a claim you made earlier turned out
   false, the correction goes in this report even if nobody asked.
2. **TEACH THE SKILL WHAT THE ROUND COST.** Write the lessons into this file **before the session
   ends**, while the evidence is still in front of you. The test for inclusion is not "was this
   interesting" but **"would a lane in the next round have paid for this again"**. Each lesson gets
   the paid evidence attached - the actual number, the actual sentence that lied, the actual command
   that silently matched nothing - because a lesson without its evidence reads as an opinion and gets
   ignored. Amend the sections it belongs in as well as appending a field-lessons list; a rule that
   only lives in a numbered list at the bottom will not reach a brief. **Also update durable memory
   for traps that are about the MACHINE rather than the program** (a tool that lies, a shell that
   mangles, a build that returns zero while failing) - those outlive the repo.
3. **WRITE THE NEXT SWARM'S PROMPT.** A standalone file, not a diff against this session: it will be
   read by someone with none of this in context. It carries the state (the SHA, what is live, what is
   in flight and where), the unbuilt specs with their adopted paths, **everything found and not
   fixed with the reason it was left**, the founder's open decisions, the standing rulings, the traps
   that would otherwise be re-paid, and the first three things to do. **Anything a lane refused, with
   the refusal's reasoning, goes in it** - a refusal rediscovered from scratch costs the same as the
   first time. Say plainly what is a spec, what is a hypothesis, and what has been measured.

**None of the three is finished until it is committed and pushed.** An excellent close-out that dies
with the session is worth nothing, and a background waiter holding the only copy is the same failure
in a different coat.

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

## 10 · Field lessons from the round-4 program (2026-08, Amora), each paid for once

(§4b holds the sibling coordinator's token-waste accounting; read the two sections as one list.)

1. **cd and act in the same command.** The shell's cwd resets between calls; a bare `gh pr view/merge N`
   answered about the WRONG REPO three times in one day and once nearly merged a stranger's PR (saved
   only by a moved base). Every `gh`/`git` starts with `cd <repo-worktree> &&` in the same command, and
   you never merge from a listing older than the command you are in.
2. **MERGEABLE is a cached opinion.** A PR read MERGEABLE minutes after main moved, then refused the
   merge. Re-read mergeability in the same breath as the merge; when two lanes touch one file, expect
   the second to need a resolve pass and route it back to the lane that owns the semantics.
3. **Never print a captured pipeline's output on failure.** An error trace echoed the secret that was
   piped through it; a truncated JSON fallback printed credentials. Debug secret pipelines with
   presence/length only; the fallback branch obeys the same redaction as the happy path; mint tokens in
   ONE process (parse + HMAC + print token only).
4. **A guard nobody's data exercises is not a guard.** The SSRF-pinned dialer was broken for every real
   outbound call for weeks; four consumers stayed green by short-circuiting on empty data. Any wrapper
   whose job is to talk out ships a test that actually dials a fixture, and a scheduled job's first live
   tick is part of DONE.
5. **Price static bytes against EVERY size gate, in each gate's own unit.** 18 images priced against the
   byte ratchet tripped the dist ceiling because ext4 counts 28 KB blocks. Enumerate the CI file's size
   gates before an asset lane is briefed.
6. **Background waiters die silently with the session.** After any outage or session-limit window,
   re-measure everything a waiter was watching (its empty output file looks like "still waiting").
   Resume dead agents from their transcripts with the exact measured state; their pushed commits are
   never lost, their unreported local results are.
7. **Session limits kill agents mid-report; the work usually survives.** Check `git log` + `git status`
   in the lane worktree before assuming loss; a clean pushed tree plus a missing report means resume
   with "report only, do not rework".
8. **Landing rhythm that worked:** lane reports → verify green on THAT tip (re-checked, right repo) →
   merge with a merge commit → background deploy-wait → live probe → DONE row + changelog in one write.
   Standing landing authorization (record it as a ruling) removes a full round-trip per lane.
9. **Mid-flight scope additions go to the lane that owns the zone** as a numbered brief addendum plus a
   SendMessage naming it; never a second lane into the same files. Cross-lane function handoffs are
   named on BOTH briefs (exporter and consumer) or they will not exist.
10. **An advisory gate that is wrong for first-party code taxes every lane.** 71 waivers across two
    lanes before the scanner got scoped. When a gate misreads the house pattern twice, fixing the gate
    outranks the next feature lane.
11. **Delegate the read, keep the conclusion.** Grounding a five-ask round = parallel read-only scouts
    over the code + research agents over the web, then ONE proposal document with the founder's words
    verbatim, numbered questions, and a default per question so a one-word reply dispatches everything.
12. **The hourly self-wake is usually waste.** Completion notifications cover the happy path; keep one
    long-delay one-shot as the silent-death fallback and delete recurring pollers the moment the fleet
    shrinks.

## 11 · Field lessons from the round-5 program (2026-08, Amora), each paid for once

Twenty-nine PRs, fourteen lanes, one night. Read §10 and §4b with this as one list.

1. **A FALLBACK IS A CLAIM, and it is worse than a crash.** An unguarded lookup crashes loudly and
   gets fixed within the hour. A guarded one that invents a value **lies quietly forever and passes
   every gate**: a decision the village CARRIED read "Did not carry" to every member, because the
   fallback was `failed`. In one sweep of 114 sites, ONE was crash-shaped and FOUR were guarded and
   stating something false. Brief every lane that touches a fallback: **every sentence must come from
   what happened, never from a default.**
2. **Look at the screenshot. Do not only assert about the DOM.** Six times in one round a fully green
   surface said something false, and screenshots caught most of them: a button nobody could press
   (`elementFromPoint` returned the sheet covering it, while display/opacity/rectangle all passed),
   rows crushed below their content painting over their neighbours **while all 34 assertions stayed
   green**, a moderation card rendering a grey placeholder, and a panel reading "This village does not
   carry write an agreement by vote today". **Overlap, nonsense and covered controls are not questions
   a probe asks.**
3. **A brief older than an hour is a hypothesis, not a fact.** SEVENTEEN premises the coordinator
   relayed were stale or wrong in one round, and several changed the shape of the work: a file that
   did not exist, a refusal list that had never been written, a "gate" that had never existed, an
   exemption rule that would have half-blinded a new gate. **Put RE-VERIFY EVERY CLAIM at the top of
   every brief, and treat a lane that corrects you as the lane working properly.**
4. **The coordinator's diagnosis is a hypothesis too, and lanes that refused it were right.** Three
   times a lane measured instead and found a better cause: a tap failure that was geometry rather than
   pointer-events (17px of art above a 45px hit box); a "write order" bug where the repo had been
   sorted for months and the real gap was that join order cannot be SEARCHED; a two-clock cache that
   was latent rather than live because a pool pinned UTC. **A cause handed down from another lane is a
   hypothesis. Say so in the brief.**
5. **A DOCUMENTED GATE THAT DOES NOT EXIST IS WORSE THAN NO GATE**, because it stops anyone looking.
   Three documents cited a QA gate by filename, one listing "45 checks" it was holding. It had never
   existed on any ref. The thing it claimed to watch had drifted four routes, shipping three dead
   doors. **When a doc names a gate, run it.**
6. **Ask "enumerate every door into this room", never "is my door safe".** A lane briefed to fix one
   leaking upload path enumerated all five writers and found a SECOND public leak nobody had reported.
   The same instruction found a route that had never once succeeded, and a public lead-capture form
   that had 500'd since it shipped.
7. **A dormant column is an ARMED column, and the feature that first reads it is the detonator.**
   `gratitude` sat `transferable = 1` for eighty-five migrations while nothing read it; the build that
   closed the economy's loop was the build that would have made recognition sellable. **Grep for what
   else is seeded and unread before shipping the reader.**
8. **A check that silently sees nothing is indistinguishable from a check that passes.** Five shapes in
   one round: `git grep` matching nothing on a leading slash; `window.JWALK` always `undefined` so its
   guard never fired; ripgrep silently omitting a file with a NUL byte **from directory searches with
   no message**; a Windows main-module guard that never matched so a script printed into its
   importers; and `Win32_Process | Where CommandLine -like` **always matching the process asking**, so
   every "is a sibling still running" count read one too high. **Prove every negative against a
   known-present control IN THE SAME COMMAND.**
9. **A falsification can be vacuous. Read what the red output SAYS.** Three lanes watched a guard "go
   red" that proved nothing: a spawn error with empty output, a union the gate states it cannot see,
   and a stale `dist` (the build had crashed in libuv teardown **and still returned exit 0**). **The
   only honest build check is the SHA embedded in the artifact.**
10. **Ask for found-versus-fixed as TWO NUMBERS.** Every sweep in this round found more than the report
    that triggered it: 13 named to 16 fixed, 114 found to 9 fixed, 41 windows to 12 crossing, 165
    routes to 2 broken, 17 dishonest saves. **And require the safe cases to be classified rather than
    padded** - one lane correctly left 14 alone and said why for each.
11. **A REFUSAL IS THE BEST KIND OF REPORT, AND A REFUSAL IS ITSELF A CLAIM, SO IT NEEDS A
    FINDING'S EVIDENCE.** (Second half added in round 6, in the words of the lane that got it
    wrong: *"A refusal needs evidence at least as strong as a finding, and mine had a file
    listing."* It declined a brief item because 1,943 of a PR's 2,072 lines sat under
    `docs/prototypes/`, a directory that holds the PRODUCTION page. Its other three refusals
    each measured something and found the premise wrong; this one measured nothing.) The
    strongest work in round 5 was lanes declining part of the brief with evidence: 7 of 8 conversions because the eighth had no gate to convert so a flag
    would be "a claim with nothing under it"; 8 transferable keys instead of 17 because the others
    could not carry the escape hatch and flipping one **would refuse an admin with no way back**; two
    cards kept instead of merged because one also renders where the merged card would dwarf the page.
    **Brief for it: "if an item turns out to be wrong, do not do it, say which and why."**
12. **Record what you MEASURED AND REJECTED in the artifact's own header.** Two gates shipped carrying
    the costed alternatives that were turned down (`noUncheckedIndexedAccess`: 282 errors and it does
    not flag the shape that actually crashed). **A rejected approach with its cost written down is
    worth as much as the gate**, and it stops the next person rebuilding it.
13. **A gate whose FIRST RUN catches a real violation is the standard**, and a new gate must be watched
    going red on the defect it was built for, then green after the fix. One caught a sibling's write on
    its first run; one found a hole in ITSELF during its own silent-pass probes (the payload pass
    reused the spec pass's file list, so a repo written from an unscanned file would have been checked
    by nothing while printing green).
14. **A permission check used for VISIBILITY writes false records.** A gate that reads a break-glass
    override is not a drop-in for a "can this person see it" test: an admin merely LOOKING at a page
    with an override in the request wrote "acted on a power this village holds" to a public feed.
    Found three times in two days. **Make every lane classify each call site as an ACT or a LOOK.**
15. **AUDIT THE WORK AFTER IT PASSES EVERY GATE.** Four lanes did this unprompted and every one found
    something: a meter that counted a 404 as a use, a registry naming two routes that do not gate on
    it, a success handler wiping a concurrent failure's message. **Green is where the next defect
    hides.** Put it in the brief.

16. **An orphaned background job keeps its chip ticking forever, and reads as running work.** The
    founder pointed at three progress chips showing "15h59m" and "12h51m" and asked whether they were
    stalled. The processes behind them had been started **two and seven days earlier** by lanes whose
    work had merged long before; the agents finished, the jobs did not, and the chips kept counting.
    **The tells: an elapsed time longer than the session, several chips sharing one start time, and
    near-zero CPU.** Sweep them by CREATION DATE, never by name or command line - and note that on
    Windows a `CommandLine` filter always matches the query's own process, so every "is a sibling
    still running" count reads one too high. They leak ports too: a finished screenshot lane's server
    was still holding one. **Add a process sweep to the close-out; a swarm that runs for a day will
    leave these behind every time.**

## 12 · Field lessons from the round-6 program (2026-08, Amora), each paid for once

Ten lanes and three QA passes in one night, six PRs green. Read §10, §4b and §11 with this as one
list. **Four of these are the coordinator's own errors, which is the point: most of a round's waste
is spent above the lanes.**

1. **A CORRECTION THE CORRECTED PARTY HAS NOT BEEN TOLD IS HALF A CORRECTION.** Twice in one round I
   held information, recorded it faithfully in the ledger, and did not deliver it to whoever was
   still acting on the old version. A lane disclosed crossing its zone into five files; **I relayed
   the one that looked closest to the boundary and not the other four**, so a sibling wrote into a
   file it reasonably believed was unassigned. And I overturned a lane's refusal, wrote it into the
   ledger and the triage table, and **left the lane asserting the withdrawn claim in the shared
   record for hours.** Both were free by luck. **The rule is not "record the correction", it is
   "deliver it to whoever is still acting on the old version" — and when a lane reports crossing its
   zone, the relay names EVERY file, not the nearest one.**
2. **ENUMERATE THE WORKFLOWS DIRECTORY, NEVER ONE FILE IN IT.** I opened the round by enumerating
   `ci.yml`'s `run:` steps, correcting a three-gates-stale list, and calling the result authoritative.
   It was authoritative about `ci.yml` and silent about the other three files beside it: two more
   `pull_request` workflows, **path-gated and therefore required checks** for anything touching the
   module framework. Found only because one PR showed two extra green checks and I chased the
   difference. **The repo's own facts script read the same single file and inherited the same blind
   spot.** A gate list that names a file rather than a directory has a hole by construction.
3. **A DIRECTORY NAME IS NOT A LIFECYCLE.** `docs/prototypes/grounds-v0.html` is the live map: 5.69 MB,
   served content-hashed and immutable ahead of the SPA catch-all. A QA lane loaded that page four
   times, live and local, at two widths, **and never searched it**, because the path had already
   decided the answer. Its own generalisation is the rule: **any lane doing scope triage from
   `git show --stat` is one directory name away from this, and the defence is that a claim about a
   USER-FACING feature must be tested on the SURFACE, never on the diff.**
4. **A TEST CAN ASSERT A DEFECT AS ITS CONTRACT, AND THE SUITE STAYS GREEN FOR IT.** Three found in
   one round, by three lanes: one expected a member to be told the roll "froze" when they were
   actually excluded by their own stage; one expected a legacy row to vanish **silently** from a
   settlement, which is the harm written down as the specification; one expected a mint of 9000 to
   succeed. **A test proves a behaviour is INTENDED, never that it is CORRECT.** Brief every lane
   whose job is to refuse something that used to be allowed: **if a test blocks your fix, read what
   it actually asserts before assuming your fix is wrong.**
5. **RUN THE MIGRATION. DO NOT REVIEW IT.** A lane's identifier-rename migration passed reading and
   collapsed two cycles onto one id on its first run, **because MySQL `LPAD` truncates as well as
   pads** — the exact collision its own header promised could not happen. The lane's words: *"A
   reading would not have found this."* **Every migration is RUN against seeded rows in every format
   it claims to handle, twice, with the second run proved a no-op.**
6. **A RENAME CAN MINT.** The same lane found what its brief had not: seat payments are keyed on an
   idempotency string **containing the value being renamed**, and an hourly job re-runs them, so
   renaming without migrating those keys makes every already-paid seat look unpaid and pays it again.
   **The brief warned about the opposite direction.** Before changing any identifier's format, grep
   for idempotency keys, cache keys and occurrence keys that embed it.
7. **AN EMPTY STATE AND A REAL ZERO ARE DIFFERENT FACTS, AND CODE GUARDING ON FALSINESS CANNOT TELL
   THEM APART.** My relayed diagnosis was "an empty state chosen for a record that has entries". The
   lane measured and found worse: the mark function returned "none" for **any** value of zero, so
   0% agreement, the strongest disagreement the engine can measure, was drawn as an **absence**.
   This is the fallback-is-a-claim rule one layer down, and it reaches instructions too: **the
   most-rendered card in that product told every reader to turn a module on by proposal, and nothing
   in the product does that.** A sentence telling somebody what to do next is a claim about the
   product.
8. **A GATE THAT PASSES A NEIGHBOURING LANE'S QUERY IS WORTHLESS UNTIL YOU HAVE PROVED IT CAN SEE
   THAT QUERY.** Told two lanes had touched one file, a lane reproduced the merge itself, read the
   seam, enumerated both lanes' new identifiers to prove them disjoint, **and then found that the
   sibling queried the exact table its new gate polices.** It refused to clear that by reading: it
   ran the gate over the MERGED tree and watched the count go **12 to 13** (proving the sibling's
   query was seen rather than skipped), then mutated that query into the violating shape and watched
   the gate go red. **Standard practice whenever a new gate and a sibling's work land in one round.**
9. **PROVE WHICH DATABASE YOU READ, BY LIVE CROSS-CHECK, NEVER BY VARIABLE NAME.** A lane reported a
   vault empty "against the live Railway DB", which retracted an alarm I had already raised with the
   founder. I could not reproduce it — **no `DATABASE_URL` exists in any `.env` on that machine** —
   and on being asked it corrected itself precisely: it had reached a remote host **stored under a
   variable named `TEST_DATABASE_URL`** and had labelled it production on inference. It then
   volunteered a second correction nobody asked for: **a `COUNT` of 0 says the store is empty NOW,
   never that nothing was ever in it.** A later lane did it properly, matching the schema's rules
   table against the LIVE public feed and its cycle number against the LIVE cycle endpoint. **Two
   independent live cross-checks beat a variable name.** And the coordinator's rule underneath:
   **a claim you are about to carry to the founder gets verified BEFORE you carry it.**
10. **THE HONEST RE-COUNT IS THE DELIVERABLE.** A QA pass reported "47 routes in this shape". The fix
    lane counted five ways and found **25**, then reported its own sweep as **218 examined, 4
    defective, from 240 candidates with 22 dropped as not signposts AND THE DROP REPORTED**, plus two
    negative sweeps proved rather than asserted. **A count from one sweep is a hypothesis. Brief the
    fix lane to size the class honestly BEFORE fixing, and say that an accurate list with the safe
    cases classified is a better outcome than a handful of fixed strings and an unknown remainder.**
11. **THE TEST MUTEX FAILED TWICE IN ONE EVENING, FROM TWO DIFFERENT LANES, SO THE CONVENTION IS WHAT
    BROKE.** One lane's guard printed "LOCK BUSY" and ran the full suite anyway, then an unconditional
    `rm -f` **deleted a third lane's line**; another **overwrote** a sibling's line 99 seconds after
    it was taken. Both disclosed it themselves, which is the only reason it cost nothing. The rule
    that held afterwards: **read the lock before taking it, never overwrite a line already there,
    release only a lock you acquired, and treat a full suite that overlapped a sibling as evidence in
    NEITHER direction.** Contention produces false reds, not false greens, so targeted suites on a
    quiet tree beat a contended full run. **A convention that has failed under load in two consecutive
    rounds is not a convention. It belongs in the harness.**
12. **THE LIBUV BUILD ABORT IS LIVE AND IT IS NOT RARE.** Two sightings in one evening from different
    lanes: `pnpm build` returning **exit 0** while printing an assertion failure, with the artifact
    still carrying the previous commit. **`grep -c "$(git rev-parse --short HEAD)" dist/index.js` is
    the only honest check**, and a lane that skips it will falsify a fix against a stale bundle,
    which happened and produced a vacuous 68/68 green with the guard removed.
13. **ASK FOR THE SURVIVED ATTACKS, AND THE CLEAN CATEGORIES, BY NAME.** The adversary pass's most
    valuable half was what held: the snapshot law surviving eight attacks, a handover ceremony that
    could not be subverted five ways, **and a 220-route signed-out sweep for ten strings known to be
    in the database returning zero leaks with a control proving the sweep ran.** It also
    **self-disproved eight of its own hits** rather than shipping them. None of that appears unless
    the brief asks for it, and without it a founder learns only what is broken and never what is
    solid.
14. **A DOCUMENT NAMING A SPECIFICATION IS NOT EVIDENCE THE SPECIFICATION EXISTS.** I briefed a lane
    to "find the build doc that specified this and follow it". Searching the whole tree, the only
    thing specifying it was **the handoff note asking for it**. The lane followed the one comparable
    mechanism the codebase had already built, which is better than inventing and better than
    stalling. Same class as round 5's documented-gate-that-never-existed.
15. **RANK BY WHAT THE USER LOSES, THEN RE-RANK THE LANES' OWN SEVERITIES YOURSELF.** Two passes
    independently filed as LOW that a called-off vote was counted against the village's turnout. That
    is arithmetic, not copy: it makes a village look less engaged than it is, on a number it did not
    earn. **The lanes rank within their own frame; the coordinator holds the only view across all
    three, and re-ranking is part of triage rather than second-guessing.**

## References

- `references/failure-catalogue.md` — the MAST failure modes with observed rates, twenty-eight
  classes of silent tool failure across three programs, the seven silent zeros of one gate, the
  discovery-brief shape, and the supervisor's own recorded errors. Read before briefing any
  discovery agent.
- `references/artifacts.md` — copy-ready templates for the ledger (with rulings and decision
  list), the lane brief, the discovery-agent brief, the final decision list, the opening
  sequence, the pre-dispatch message, the landing checklist, the handoff, and the recovery
  sequence.
- `references/measurement.md` — **the silent-zero class in seven shapes**, why a pass cannot see
  past its own metric, baselines and paired reps, controls that never ran, and the copy-ready
  measurement brief. Read before briefing any lane that will write or trust a gate, and before
  believing any lane's report of its own numbers.
