# Failure catalogue

Four parts. The first is the published taxonomy of how multi-agent systems fail. The second is
the set of ways the *tools* lied across two real programs — which is what you brief discovery
agents with, because it is the difference between a report you can act on and a report you
have to re-verify line by line. The third is the discovery-brief shape. The fourth is how the
supervisor itself failed, because your errors cost lanes too.

---

## Part 1 · MAST: how multi-agent systems fail

From 1600+ annotated traces across 7 frameworks. Rates are the observed share of failures.

### Specification and design — 41.8%, the largest category and yours to prevent

(Sub-mode rates below are from an earlier draft of the paper and sum to 44.2, not 41.8; read
them for ordering, not arithmetic.)

| Mode | Rate | What it looks like | Your countermeasure |
|---|---|---|---|
| Step repetition | 15.7% | Two agents do the same work | Explicit boundaries in every brief; name what each does NOT touch |
| Unaware of termination conditions | 12.4% | Agent stops before the job is done, or never stops | Define "done" as a measurable state, not an activity |
| Disobey task specification | 11.8% | Output is not what you asked for | State the output format exactly; give an example |
| Loss of conversation history | 2.8% | Context truncates, work restarts | Externalise to the ledger early, do not wait for the window to fill |
| Disobey role specification | 1.5% | Agent acts outside its lane | Name the lane's surface and its neighbours' |

### Inter-agent misalignment — 36.9%

Communication breakdowns, conflicting objectives, coordination failures. The countermeasure is
the ledger plus Cognition's principle: **share context and full traces, not just conclusions.**
An agent that receives only "the map lane is done" cannot detect that its own assumption about
the map's API is now stale.

### Verification failures — 21.3%

Inadequate output validation, missing quality checks, error propagation down the chain.

**The number that should decide your architecture: uncoordinated multi-agent systems amplify
errors up to 17x. A centralised architecture with a validation bottleneck contains that to
about 4.4x.** You are the validation bottleneck. Be one on purpose.

---

## Part 2 · Twenty-two ways a tool reported a confident wrong answer

The first eight from a single day; fourteen more from a three-day program on two repos. Each
one **announced itself as a result, never as an error.**
This is the general law, and it is worth putting in every discovery brief verbatim:

> **A tool's blind spot does not announce itself as a blind spot. It announces itself as a
> result. Anything with a parse, resolve, or skip step must report what it could not handle,
> because silence is indistinguishable from success and reads as it.**

### The measurement lies

1. **Unparsed colour space.** A contrast checker parsed `rgb()` and silently skipped
   `oklch()`. It reported "0 failures" on a page whose `<h1>` measured 1.00:1.
   *Unmeasured became passed.*

2. **`background-image` invisible.** The same checker read `background-color` only. White text
   on a dark gradient reported as 1:1 — eleven times. *Readable became failed.*

3. **Alpha never composited.** Grey text on `bg-teal/5` (a five percent tint) read as grey on
   FULL teal: 1.12:1 reported, 4.54:1 actual. *Passing became failing.*

4. **The bail-out that looks like a pass.** Fixing #2 by treating "a gradient anywhere in the
   ancestor stack" as unmeasurable made the checker skip 57 nodes silently and report **0 FAIL
   on a page with a real failure in it.** *Zero-because-unmeasured and zero-because-passing are
   the same output and opposite facts.*

5. **Leaf-only selection.** A rule requiring `children.length === 0` never saw
   `<a><Icon/>Main Site</a>` — the label is a bare text node inside an element that has a
   child. Every icon-plus-label button on the site was unmeasured.

6. **The state diff blind to its own starting state.** "No focus ring" was reported by diffing
   focused vs unfocused computed style. The input carried `autoFocus`, so it was already
   focused when the "before" was read and the diff came back empty. *A state diff is blind to
   an element that starts in the state it diffs toward.*

7. **The viewport you never ran.** Every contrast pass ran at phone width, so `hidden lg:flex`
   never rendered. The worst offender was in the shared layout, therefore on every page.

8. **The gate rule that stopped firing.** A rule added to a linter fired correctly, then
   stopped entirely after an unrelated edit; a probe file containing the exact violation came
   back "clean across 335 files". Shipped as a separate script instead, because a gate rule
   that silently never runs is worse than no rule.

### The same shape outside the checkers

- `vitest` exiting 0 with "1 failed" in the log.
- `tsc | head` returning `head`'s exit status, not the compiler's. Program two paid for it
  again in a gate script: `$?` after `cmd | tail` reported `tail`'s exit for every gate.
  Capture before the pipe (`PIPESTATUS[0]`, `set -o pipefail`).
- `pnpm install --frozen-lockfile` exiting 0 over a dangling symlink.
- `grep` aborting at exit 134 and the empty result read as absence. `rg` missing from PATH
  (exit 127) reads the same way, and an indexed search returned 1 file when a bounded search
  proved 7 contained the string. **Before trusting any negative, prove the same pipeline returns
  matches on a known-present pattern**, and prefer shape-based searches (the credential's
  format) over name-based ones (the variable you guessed).
- A green test suite that **skipped every DB test** because `.env` was missing, while still
  printing a pass count. Read the skip count and the duration, never the badge. Two of every
  three "hollow green" incidents in program two were a missing or BOM'd `.env`.

### Fourteen more, from program two (three days, two repos)

Same law, new shapes. Each announced itself as a result.

9. **The probe that fails open.** A harness read a CSS variable off the root and got the
   UNRESOLVED string `calc(4rem + 1px + env(...))`; `parseFloat` → NaN → `NaN || 0` → a
   zero-height exclusion band → every control "clear", including the one the lane was sent to
   fix. *A probe's failure path must be a failure.* Also: the emulator read safe-area insets as
   0, so every measured band was the optimistic edge.

10. **Ancestor ownership.** `hit.contains(el)` accepts an ancestor, so `<body>` "owned" every
    `elementFromPoint` probe and every hit area measured the whole viewport. Ownership is
    `hit === el || el.contains(hit)`.

11. **The stale rect.** `scrollIntoView` is async under `scroll-behavior: smooth`; a rect read
    right after is stale, and 36 of 46 landing-page controls were flagged unreachable (true: 0).
    Force `scroll-behavior:auto` in the harness; never flag a control that got zero probe points.

12. **The control that never applied.** Under one browser engine, request interception fired
    zero handlers while the request still went out; the "control payload" run reported clean.
    The other engine was unaffected, which made it plausible. Every injected control needs a
    positive assertion that it landed.

13. **The truthiness test that inverts the standard.** `!img.alt` cannot tell "attribute
    absent" from "present and empty", and `alt=""` is the REQUIRED markup for a decorative
    image. Two detectors disagreed (0 vs 6 missing); `hasAttribute('alt')` settled it.

14. **The data-gated zero.** A store overflow reproduced only when a non-core module was
    enabled; the fix lane's scratch seed had everything off and its "0 overflow" was true of
    the wrong state. Prove the condition that produces the defect was present before believing
    a zero.

15. **The classifier that grepped prose.** A blocking-stage classifier grepped the bare phrase
    `clause 14`; an informational validator line contained it; the workflow failed its own PR.
    Deeper: the logic lived in YAML, so it only ran when a PR ran it — proof that violations
    block, no proof that a clean tree passes, same author for gate and measurement. Extract to a
    script; first test is the clean path; decide on structured output.

16. **The whole-file blame.** Security greps ran over every file a diff touched, so 335 clean
    added lines were blamed for 41 pre-existing hits elsewhere in an 18k-line file; every
    server PR would have blocked. Scope tracked-file greps to `git diff -U0` `^+` lines.

17. **The poll that charged the budget.** A daily-cap check called a helper that INSERTS a
    rate-hit row — right for a request, wrong for a timer running 288×/day against a 600 cap;
    the job would have eaten half the day's budget by ticking. Gate on a read; charge per
    submitted request. *A read path with a side effect is a write path.*

18. **`networkidle` that never fires.** A pulse endpoint and a poller keep the connection busy,
    so every navigation awaiting `networkidle` burned its full timeout on every route. Use
    `domcontentloaded` + a fixed settle, write results incrementally per viewport, and never
    read a missing results file as a clean pass.

19. **The BOM'd `.env`.** A worktree's `.env` carried the PRODUCTION database URL behind a
    UTF-8 BOM; a `^[A-Za-z_]` key-grep missed it. The test runner not loading `.env` was the
    only reason the DB suites skipped instead of running against production. Strip the BOM in
    the grep; print which host the URL names before any DB suite runs.

20. **The lock that deletes another lane's lock.** A mutex helper ran `rmdir` unconditionally
    after a timed-out poll. Track acquisition; release only then; write your own marker inside
    the lock directory so a stranger's rmdir fails.

21. **The mechanical sweep that changed the operator.** `d.error || "..."` sites used a falsy
    fallback; a mechanical `d.message ?? d.error` returned `""` for an empty-string body — a
    blank toast where the call site's own words used to be. Read the operator you are replacing,
    not just the field.

22. **The lookup that answered a narrower question.** A deterministic router scored "what did
    we decide" and "what did we decide about quiet hours" identically; a template listing every
    decision would have answered the second confidently, for free, and wrongly — and it was
    live in two e2e fixtures. Deterministic answers must detect scope narrowing and hand the
    narrowed question to the model with the data prefetched; an advisory question is not a
    lookup at all.

Also from program two, about the harness rather than the app: an in-app browser pane whose
`resize_window` silently stays at desktop width and whose ref-clicks on a hidden pane report
success and fire nothing. Verify with a script in the page; for real viewport proof drive the
browser engine directly.

### Five structural traps that no tool catches

- **A loader whose failure path returns its initial state cannot fail visibly.**
  `useState(null)` means both "not fetched yet" and "the fetch failed", so the component has
  one value for two facts and renders the optimistic one forever. Found four times in one day
  in four unrelated files. The check costs nothing: load the page with the request failing and
  wait twenty seconds.

- **A guarantee covers the pairings it enumerates, never the pairings you compose.** A design
  system measured six colour pairings by name and was correct about all six; the client used a
  seventh, assembled in JSX, at 2.53:1. Three separate systems reported clean on that defect
  and each was correct about its own scope.

- **A comment is not a measurement.** A token documented as "6.2:1 contrast vs white" measured
  4.55. A lane read the comment, used the token in good faith, and shipped a regression while
  believing it had fixed one. Stale comments are authoritative claims that outlive the code
  they described, and the person least able to notice is the one who wrote them.

- **A caller list from one app is blind to the others.** A monorepo's second app called the
  first app's API through a fetch helper; a grep of the first app's client alone would have
  hidden a field those pages depended on. Before withholding or renaming a field, enumerate
  callers across every app that reaches the endpoint.

- **A seed fix and a volume fix are halves of one finding.** Copying assets into the live
  volume fixes LIVE (rows already carry the paths); setting the seed to null is what keeps a
  FRESH fork from inheriting dead paths. Neither replaces the other; a report that lists one
  as "fixed" has fixed half.

---

## Part 3 · What to put in a discovery brief

Copy this shape:

```
CRITICAL, so you do not report false positives. The tooling here has produced confident
wrong answers in these specific ways: [list the relevant ones above].

ALWAYS count and print what you could NOT measure. Silence about an unmeasurable node
reads exactly like a pass.

KNOWN AND NOT FINDINGS, do not report these: [everything already triaged, with reasons].

Read the element before trusting the measurement. A measurement is evidence about what
the tool could see, never about what is true.
```

Agents given this brief return "5 real, 1948 discarded and here is the mechanism" instead of
1953 findings. Two of four agents on the day this was written overturned their own large
false-positive batches before reporting — because the brief told them the batches were likely.

---

## Part 4 · How the supervisor failed (program two, all self-recorded)

Your own errors go in the ledger at the same prominence as a lane's. These are the five that
cost something:

| Error | Cost | Rule it produced |
|---|---|---|
| Sent two mid-flight messages to the wrong lane (handles from two same-block dispatches read swapped) | One lane worked a phase without its design input; the other spent time refusing | Verify the handle against the dispatch result's description before every message |
| Compressed a research relay so a knowledge-base policy figure and a contract clause became one sentence | The lane refused to transcribe it (correctly) | Relay verbatim with source; a lane's refusal is a control working — ratify it |
| Wrote a brief whose root-cause hypothesis was wrong and whose target was a raw count a sampled sweep cannot reach | The lane had to disprove the brief before it could fix anything | Label hypotheses as hypotheses; targets are harm metrics |
| Applied a memory about one repo's CI to the other repo's lane | A brief citing a gate that does not exist | Hazards are per-repo; anything remembered about "the CI" names which CI |
| Let a lane report "eleven gates" after CI had grown to twelve under it | Caught by the lane, not by me | The gate set's header says "enumerate the CI file"; never trust a count in a brief |

Also observed, not costly only because a lane caught it: a memory that said "the CI has two
gates the docs omit" was true of one repo and was about to be applied to the other. Memories
about infrastructure carry the name of the infrastructure.
