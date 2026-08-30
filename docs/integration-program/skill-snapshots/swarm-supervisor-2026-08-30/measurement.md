# Measurement discipline

Everything here was paid for in one round: 17 UI items, ~14 lanes, 5 landings. It is the half of
coordination that nobody writes down, and it is where that round actually spent its money.

The one-line version:

> **A check that CANNOT run reports what a check that PASSED reports.** Every finding below is that
> sentence wearing different clothes.

---

## Part 1 · The silent-zero class

One gate produced a confident zero **seven times**, in four different instruments, and **each fix
exposed the next one**. This is not a list of bugs. It is one defect with seven surfaces, and the
reason it kept recurring is that every fix closed an INSTANCE.

| # | Shape | What it reported | What was true |
|---|---|---|---|
| 1 | A guard naming a function that does not exist (`showVitalDrop` for `openVitalDrop`) | `CAP {els: 0}` | 3 surfaces never rendered; real count 20 |
| 2 | A poisoner that planted nothing | `ALL GREEN, exit 0` | replaced whole function with `return J;` and it still passed |
| 3 | A payload that unhooked its own reader | `elements 0, cap 0` | rewrote one key, 11 other fields still named the old one, so the reader was never called |
| 4 | A renderer the gate never drove | 0 elements | a 50-element sink sat under it |
| 5 | A surface whose declared host is filled by one part while its sink writes another | host filled, pass | `renderLoom` fills `#loomLeft` synchronously, then rAFs `drawLoomWires`, which returns at its first line when the Loom is closed |
| 6 | A host check satisfied by markup a PREVIOUS pass left behind | host non-empty, pass | `refreshBadges` rendered nothing for the gate's entire life; `#badges` still held what boot drew |
| 7 | **A gate measuring a SCRATCH surface instead of the real one** | 38 of 38 green | two satellites were invisible on screen, occluded by a DOM sprite over the canvas |

**The rule that closes it, and the one to write into every brief:**

> Fixing the instance is not fixing the class. When you close a silent skip, ask what ELSE in the
> same instrument can quietly do nothing, and make the instrument **prove it did its own work**
> before you read its verdict.

Concretely, a gate you can trust has all four of these:

1. **Names resolve or FAIL.** Resolve against `Object.getOwnPropertyNames(window)`, never a grep.
   An unresolvable name is a gate defect, not a lane boundary.
2. **The fixture proves it landed.** Every field the payload claims to plant is declared, planted
   with a token unique to that field, and then FOUND again. A declared field nothing planted fails;
   a planted field nothing declared fails, so the declaration cannot rot behind the code.
3. **Coverage is enumerated from the code, not from a list.** Ask the artifact what renderers it
   HAS, compare against what the gate drives, and fail on any it has never driven.
4. **WRITING is the measure, not calling.** A function called every run that returns at its first
   line looks identical to one doing its job. Instrument the write.

And the acceptance test for the gate itself: **break the thing it guards and watch it go red.**
A gate that has never failed is not yet a gate.

---

## Part 2 · The metric is where the next defect hides

A pass that authors both the fix AND its measurement cannot see past its own instrument. One item
took **five passes**, and the shape repeated every time:

| pass | fixed | new defect, and where it hid |
|---|---|---|
| 1 | — | optimised distance-to-ANCHOR; the complaint was gap-to-the-BUILDING |
| 2 | the metric, honestly | **nothing had a viewport term** — not placement, not metric, not gate. An off-screen plate scored a perfect 0.0 |
| 3 | added viewport + a camera axis | a not-drawn plate was **dropped from every population**; added `cam.y` and never moved `cam.x` |
| 4 | both | a declared global still existed **by declaration** (`function f(){}` at column 0 in a classic script) |

**The reliable tell: a column computed, saved, and never printed.** It appeared three passes in a
row. Open the probe's saved JSON and diff its keys against the report's columns — that one check
found a hidden regression every single time.

**So brief the reviewer to widen an axis the builder just fixed**, and never accept a builder's own
metric as evidence that the builder's own fix worked.

---

## Part 3 · Baselines, controls and sample size

### Establish the baseline BEFORE judging any lane

A gate suite was **red on pristine trunk** and nobody had measured it. Every lane judged itself
against a baseline that did not exist, and the coordinator reported "all eight gates green" from a
run that was **not reproducible**.

> **The landing criterion is not "green". It is "no worse than baseline, measured in the same
> session, under the same load."**

Measure the baseline yourself, from the pristine blob, in the same session. Then compare **failure
SETS, not counts**: `LANE \ CTRL` is the only thing that blocks. A raw count moves with the weather.

### n=1 is not a measurement on an intermittent suite

Same bytes, five reps: `107/5 · 112/0 · 107/5 · 106/6 · 105/7`. Anything inside that band is
noise in both directions.

Worse, sample size lies in BOTH directions. At n=3 a control looked deterministic (`10 10 10`)
and a lane looked regressed (`10 10 13`). At n=7 **both arms wandered** — the control threw a `7`.
The "deterministic control" was itself an artifact of too few samples.

**Use n>=5 paired ALTERNATING reps.** Alternating is what cancels machine load, which matters
enormously when a dozen agents share one box.

### A control that did not run is not a control

Two separate instances in one round:

- A coordinator staged a control under `/tmp`, which **does not resolve for a browser on Windows**.
  Three reps returned `0 PASS / 0 FAIL` and were nearly read as a comparison.
- A suite derived its shell path by replacing a trailing `grounds-v0.html`, so a control named
  anything else loaded the artifact as its own shell, found no frame, and **died at check 3 of 31**.
  The comparison script grepped `^FAIL` only, so **a crash contributed an empty set and printed
  "SUBSET"**. Five reps on each of two independent passes, all of them vacuous.

> **Assert your control produced a NON-ZERO check count before you compare anything to it.**

### Measure under the conditions the number will fire in

A boot deadline was sized from a **solo** 25.9s measurement, cut to 60s, and failed immediately:
four suites running together on a loaded box could not boot in 60s. A number that only ever fires
under contention must be sized under contention.

---

## Part 3a · The command that enumerates configuration PRINTS configuration

**PAID, and it is the most expensive single mistake in this catalogue.** Cleaning up after myself on a
production platform, I could not reach the database because its connection string pointed at a private
hostname. Looking for a public one, I ran the platform CLI's variables listing **with no filter.** It
renders a table of every variable **and its value**, so five live production secrets went into the
session transcript: the session-signing secret, a database root password, a billable API key, an admin
password and part of a shared webhook secret.

The rule I had written into every lane brief that same night was **"never print secret values, presence
and length only."** I broke it in my own tooling, in the course of tidying, while under no pressure.

> **Before running any command that LISTS configuration, secrets, environment or credentials, assume it
> prints values.** Ask for the one key you need and pipe it through something that cannot show it
> (`| cut -d= -f1` for names, `| sha256sum` for a comparison). If the tool has no filtered form,
> **you cannot see it: say so and hand the task to the human.**

Two things that made the recovery correct, and are the reusable part:

- **Rotate through a path that never echoes the value.** A `--set-from-stdin` style flag keeps the new
  secret out of the command line, the process table and the output. Pipe the setting command's output to
  `/dev/null` too, since many of them print the full table back at you as confirmation.
- **Verify by hash, never by reading.** Generate, set, then compare
  `sha256` prefixes of what you sent and what the platform now holds. That proves the write without
  ever rendering the secret, and it also proves you did not set it on the wrong service.

**And the judgement half.** Do not rotate what you cannot rotate completely. A shared secret with a
second system, a database password that lives in two places, a key that only a vendor console can
reissue: **rotating one half breaks the pair.** Rotate what you own end to end, and hand over the rest
with the precise reason, because a half-rotation is an outage the human did not choose.

## Part 3b · Four ways a real measurement answers the wrong question

All four were paid for in one night on the same program, by the COORDINATOR rather than by a lane,
and every one produced a confident pass. They are siblings of the silent zero: the command ran, the
data was real, and the answer was about something else.

### The borrowed green: a list-wide match reads a neighbour's row

Watching a deploy, a monitor collapsed four lines of a deployment listing into one string with
`tr '
' ' '` and tested it with `case "$s" in *SUCCESS*)`. The newest deployment was `BUILDING`.
A deployment from nine days earlier was `SUCCESS`, in the same flattened string. **The monitor
announced a landing that had not happened.**

> **When a command returns a LIST and you want a fact about ONE row, extract that row before you
> test it.** Parse the newest line, assert you parsed something (an empty parse is an instrument
> problem and must say so rather than sleeping quietly), and only then read its status.

### A check that prints is not a check

`node -e '...' && git add … && git commit` where the script ended in
`console.log("amended:", s.includes(...))`. **It printed `false` and exited 0**, so the chain
committed a message claiming a change the file did not contain.

> **A verification inside a chained command must `process.exit(1)` on failure**, or it is
> decoration. And **when a replacement is the whole point of a script, a zero-match replace is an
> ERROR, never a no-op** — `String.replace` with no match returns the original and reports nothing.
> Assert every target was found and name the ones that were not.

### The parser that was never installed

A monitor piped `gh pr checks --json` into `jq`. `gh` returned real JSON so the not-empty guard
passed; `jq` was absent so every extraction was empty; an empty string never differs from the
previous empty string, so nothing printed; and the completion test also ran through `jq`, so it
never fired. **Twenty minutes of silence over checks that had been green throughout.** A lane had
reported `jq` missing an hour earlier.

> **A poll loop must assert that its EXTRACTOR produced something, not only that its FETCH did.**
> And **a tool a lane reports missing goes into the hazards list the moment it is reported**, because
> the next use is usually the coordinator's and usually within the hour.

### The build marker that cannot move

A lane falsified a fix by disabling it and re-running, and the probe passed. `pnpm build` had died
with `ELIFECYCLE`, the old bundle was still on disk, and the suite tested unmodified code. **The
usual `grep -c <short-sha> dist/index.js` check cannot catch this, because that marker comes from
git HEAD and does not move for an uncommitted probe.**

> **Take an `md5sum` of the artifact before and after any rebuild you rely on, and assert it
> changed.** A SHA marker proves which commit built it, never that a build happened.

## Part 4 · Things that are not what they look like

**A value with a fallback cannot fail visibly.** A CSS var whose fallback is the old hard-coded
literal renders identically whether it was set or never published. A verification probe reported
"NO CHANGE, the fix did nothing" against a fix that works. **Assert on the VAR, not only on the
rendered result**, and report an unset var as UNMEASURED rather than as no-change.

**A synthetic drive bypasses the real opener.** Setting `style.display` directly skips whatever the
app's own entry point triggers. Drive through the real path, or say plainly that you did not.

**A sort key is not a cost.** An off-screen candidate ordered last still wins when the search
short-circuits on `cost === 0`. Ordering expresses preference; only a cost expresses a penalty.

**Guard coverage is not test coverage.** One lane was rejected three times for the same shape. A
reviewer reverted **six** previously-fixed defects — deleted a honeypot, deleted a rate limit,
removed a capability gate, put identity on an uncredentialed route — and ran everything:
**1327 tests, 0 skipped, not one moved.** `grep -rn "/api/housing" --include=*.test.ts` returned
nothing. **Revert the fix and run the gates**; if everything stays green, the fix is unprotected and
that is a rejection on its own.

**Infrastructure masquerades as code.** A "test suite is too slow" crisis was a `TEST_DATABASE_URL`
pointing at a remote database: 47ms round trip, 408-836ms per connect. A local engine took one suite
from **168s to 16s** and the full suite from **72 minutes with 313 skipped** to **9 minutes with 0
skipped**. Before optimising tests, measure where their dependencies live.

**Benchmark the way the code runs.** The first measurement of that same change spawned a fresh
client process per file and reported a misleading 3x, because it was timing process startup. The
real code used one pooled connection.

---

## Part 5 · What to put in a brief

Copy this shape into any brief for a lane that will write or trust a gate:

```
THE BASELINE IS <measured, or: MEASURE IT YOURSELF FIRST>. Your target is NO WORSE THAN BASELINE
over n>=5 paired ALTERNATING reps. "Green" is not available. n=1 is not a measurement. Report
failures as a SUBSET or SUPERSET of the control's, never as a raw count. Assert your control
produced a non-zero check count before comparing anything to it.

A CHECK THAT CANNOT RUN REPORTS WHAT A CHECK THAT PASSED REPORTS. Before you trust a gate you
wrote, break the thing it guards and watch it go red. Assert on the REAL surface a person sees,
never a scratch buffer and never a function's return value.

EVERY COLUMN YOU COMPUTE GETS PRINTED. A column computed, saved and not printed has hidden a
regression three times in this project.
```

---

## Part 6 · Where a swarm burns tokens without producing anything

Measured across ~18 waves and roughly 20M subagent tokens in one round. Every item below is a
loss that produced **zero** artifact, and every one of them is a coordinator error, not a lane
error. Lanes were working; the harness around them wasted the money.

### The barrier that nobody needed (cost: wall-clock, then tokens)

This shape was written **twice in one session**, the second time after the first was diagnosed:

```js
const built = await pipeline(LANES, build, refute)   // two lanes + their reviews
phase('Confirm')
await parallel([L8, ESC, L1])                        // <- INDEPENDENT of everything above
```

The three reviews in `parallel` have no data dependency on `built`. They sat behind **four
agents** of unrelated work, one of them parked at literally 0 tool calls. Nothing was being
computed on their behalf; they were queued because of where the `await` was typed.

The trap is that the obvious repair makes it worse. Dispatching the three separately to unblock
them does not cancel the pending `Confirm` phase, so when the pipeline finally drains they
**run again**. That is how one round paid ~600K for a duplicate review set.

> **Serialization costs wall-clock. De-serializing a running workflow costs tokens.** Only the
> second one is recoverable by spending more. So get the dependency graph right at authoring
> time, and once a workflow is running, **prefer waiting over re-dispatching**.

The authoring rule: before writing `await X` above `Y`, ask what value of `X` the prompt for `Y`
actually reads. If the answer is "none", they belong in the same `parallel`, or `Y` belongs in
its own `pipeline` stage keyed by `opts.phase`.

### Dispatching into a quota wall

One wave: **929K tokens, five agents, all five dead on the weekly limit before any tool call.**
Total output: nothing. A swarm near a usage ceiling should dispatch **one** agent and read its
result before committing a fleet, because the failure mode is not "slower", it is "billed for
zero".

> Before a wave of n>3, spend one agent as a canary. A dead canary saves the other four.

### Reviewing a thing that already passed

One lane was reviewed **three times**; two of those reviews called the artifact sound, and the
third's findings were about the lane's GATES rather than its code. That is a real finding at a
strictly lower tier than the open security defect sitting on trunk the whole time.

> Rank by **tier of the defect the review could find**, not by how uncertain you feel. A third
> review of a passing lane and a first review of an unreviewed one cost the same and are not
> worth the same.

### Telling convergence from grinding

A lane that ran **five passes** looked like the worst offender and was in fact the healthiest,
because the numbers fell monotonically:

```
CAP (elements / executions)   934/649  →  309/42  →  0/0   → closed one sink, found 2
```

Strictly fewer each pass is convergence. The diagnostic that separates the two cases is cheap:

> **Does each pass find strictly less than the last, and does the brief require a COUNT?**
> A pass permitted to report "the class is closed" will report it. A pass required to report a
> number cannot, which is what turns a fifth pass into evidence instead of reassurance.

### Auditing the swarm without paying swarm prices

Checking whether running agents are alive is a **local** operation. Read the transcripts:

```bash
# tool-call count, last few calls, and repeated-identical-call detection
node -e '...' agent-*.jsonl        # see the audit snippet in artifacts.md
```

A `find` across worktrees times out at two minutes on `node_modules` and tells you less. And
note what "repeated identical calls" does and does not mean: **16 Edits to one file is normal**
(that is one file being written), while the same Bash command with the same arguments five times
is a loop. An agent with 138 tool calls and a moving edit target is working; one with 0 is
queued, and the queue is usually the coordinator's own barrier.
