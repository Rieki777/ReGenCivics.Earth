# Artifact templates

Copy-ready. Adapt the headings, keep the shapes — each one exists because its absence cost
something.

---

## 1 · The ledger

One file. Everyone reads before acting, writes after landing. Path convention:
`SWARM_LEDGER.md` at the root of a git-tracked home that is NOT a lane's code worktree — a
docs-only branch of the repo worked best in program two: it survived three outages and let a
second coordinator take over from the files alone. Commit it at every state change; a ledger
that lives only in a context window dies with it.

~~~markdown
# Swarm ledger — <project>, <date>
Long-lived, committed, spans rounds. Volatile session state lives in the HANDOFF file.

## THE PROTOCOL
Every claim carries the ref it was measured at. "Tests pass" is unusable.
"874 pass at a1b2c3d, 0 skipped, 61 min" is actionable and falsifiable.
CODED (lane committed, gates green locally at a SHA) / VERIFIED (supervisor confirmed CI green
on that exact SHA and merged) / DONE (CI green on that SHA + live build marker matches + live
probe by someone who did not write it).

## 0 · State, measured <timestamp>
trunk = <sha> · live build = <sha> · open PRs = <n> · in flight = <lanes> · last outage = <when>
(Rewrite this block at every session open. Never inherit it.)

## 1 · Rules
1. One lane owns a file. Contamination is per-HUNK, not per-file: disjoint hunks are safe.
2. Content attributes a commit. Never timing, never topic.
3. `git merge-base --is-ancestor <sha> <trunk>` before declaring work missing.
4. A green covers only the steps that actually reached. Read skip counts and durations.
5. Land in queue order (§4). Rebase, never delete another lane's work.
6. Lanes commit at every milestone (`git add -p`); push only when told.
7. Never re-dispatch over a worktree with dirty files; resume it.
8. Hazards are per-repo. Anything about "the CI" names which CI.

## 2 · Lane registry
| Lane | Session / agent handle | Worktree · branch · base ref · scratch dir | Brief path · transcript path | Owns (files, surfaces) | Status | Last ref |
|---|---|---|---|---|---|---|

## 3 · Resource registry
Globally unique things. Check ALL FOUR holding mechanisms before claiming one:
remote refs · local refs in other worktrees · untracked files on disk · other sessions' scratch worktrees.
| Resource | Held by | Where it lives | Verified at |
|---|---|---|---|

## 4 · Landing queue
| # | Lane | What | Blocked by | Gate status |
|---|---|---|---|---|

## 5 · Gate set
The exact commands, kept current. ENUMERATE the CI file's steps at every session open; this
list has grown while lanes were running.
```
<command>   # what it protects
```

## 6 · Open blockers
| # | Blocker | On whom | Since | Needs |
|---|---|---|---|---|

## 7 · Changelog
Every landing: ref, one line, and what was measured to prove it.

## 8 · Rulings
Append-only, numbered; the human's words verbatim in brackets; lane deviations you ratified
go here too; a change is a new ruling citing the old.
- **R1** (<date>): ...

## 9 · Paid lessons
Anything that cost a session — a lane's or YOURS, at the same prominence. Write it the day
it happens or it is lost.

## 10 · Decision list for the human — regenerated <date>
Sorted by what only they can do. Each item: the question, the default you take if they say
nothing, what it costs to defer.
~~~

---

## 2 · The lane brief

Send this, not a summary of it. All six numbered sections from SKILL.md §3 every time
(CONTEXT AND SOURCES is item 4), plus WORKING RULES and WHEN YOU ARE DONE.

```
LANE: <name>          OWNS: <files / surfaces>          QUEUE POSITION: <n>
WORKTREE: <path>  BRANCH: <branch>  BASE: <sha of trunk at dispatch>
SCRATCH: <scratchpad>/<lane>/   (the scratchpad is shared; stay in your subdirectory)

OBJECTIVE
<The outcome as a HARM METRIC, not a count. Not "look at X" — "X does Y, proven by Z".>
<If I state a root cause here, it is a hypothesis. Measure it first; if it is wrong, say
so and fix the real cause.>

BOUNDARIES
You do NOT touch: <files>, held by <lane>.
If you need a change there, say so and I will route it.

OUTPUT
<Exactly what to send back. Give the shape: a table, a list of file:line, a diff.>
Every claim carries the ref you measured it at, the gate output, and the skip count.

CONTEXT AND SOURCES
<What is already known. What is already ruled out and why. Where to look first.>
<Environment traps for THIS repo, verbatim (the failure catalogue entries that apply).>
<If a defect is data-gated: the exact state that must be ON before a zero counts.>

KNOWN NON-FINDINGS, do not report these
<Everything already triaged, each with its reason.>

GATES  (all must pass before you land)
<the exact commands>
Enumerate the CI file's steps yourself; this list may have grown since I wrote it.

WORKING RULES
Commit at every milestone with `git add -p`; do not push until told.
Skip counts and durations in every gate report, never the badge.
<mutex / shared-resource rules; release only locks you acquired>

WHEN YOU ARE DONE
<How to report. Who to tell. What the next lane is waiting on.>
Report CODED (committed, gates green locally at <sha>) — I decide VERIFIED and DONE.
```

---

## 3 · The discovery-agent brief

For audits, sweeps, and research fan-outs. Everything in the lane brief, plus:

```
SEVERITY DEFINITIONS
HIGH  = broken, data-losing, or unusable
MED   = degraded or confusing
LOW   = cosmetic

REQUIRED IN YOUR REPORT
- Findings ranked, each with route/file, element or request, and a ONE-LINE repro.
- An explicit statement of every category you checked and found CLEAN.
  A category you omit reads as a category that passed.
- A count of what you could NOT measure, and why. This is the most important
  line in the report.
- Verdicts as HARM metrics (what a user cannot do), with raw counts as context only.
- For every injected control or intercept: the positive assertion that it landed.
- Your harness's own defects, found and fixture-covered BEFORE any zero was trusted.

HARNESS RULES
- Every probe fails loud: a NaN, an unresolved value, or a missing results file is a
  harness bug, never a pass. Validate detectors against fixtures with negative controls.
- Write results incrementally (per route / per viewport) so a stall costs one unit.
- If a defect is data-gated, prove the gating state was ON in your run.

THE TOOLING HAS LIED IN THESE WAYS BEFORE
<paste the relevant entries from failure-catalogue.md Part 2>

Read the element before trusting the measurement. A measurement is evidence about
what the tool could see, never about what is true.
```

---

## 4 · The unified decision list

The single artifact the human reads. Sorted by what only they can do, never by your effort.

```markdown
# Everything left for you, in one list
Measured at <ref>, live at <url>. <one line on overall state>
Nothing below is blocking / <what is>.

## 0 · Do this first
<Security, money, or anything with a clock on it. One item if possible.>

## 1 · Costs money right now
## 2 · Needs a human with access or assets
## 3 · Decisions only you can make
   <Each with: what the options are, what you would pick, and what it costs to defer.>
## 4 · Infrastructure
## 5 · Sessions / lanes to close
## 6 · What changed, so you can see where it went
   | ref | one line |
```

Rules for this document:

- **Say what you could not finish and why.** Unfinished stated as unfinished is worth more
  than finished-looking work.
- **Give each decision a recommendation.** "Here are three options" without a lean is work
  handed back.
- **Every claim carries its ref.** Same protocol, applied to the person paying for it.
- **Corrections go in as prominently as the original claim.** If you told them a number and it
  was wrong, the correction goes at the same heading level, not in a footnote.

---

## 5 · Standing up a swarm: the opening sequence

1. Read every item before grouping any of it.
2. Decide swarm vs single agent (SKILL.md §0). Say the answer out loud.
3. Write the ledger with the lane registry empty.
4. Survey what exists: which lanes are alive, what they own, what is in flight, what is
   already landed. **Verify by content, never by report.**
5. Group the work (SKILL.md §2). Write the groups into the ledger before dispatching.
6. Fill the resource registry for anything globally unique.
7. Write the gate set down, verified against the current CI config, not from memory.
8. **Send the human the pre-dispatch message (§6) and wait for rulings.**
9. Set the landing order; every brief carries its queue position.
10. Write the briefs to files next to the ledger; write the handoff (§8) with the registry as
    it will be at dispatch.
11. Commit the ledger, briefs and handoff.
12. Dispatch. Existing lanes first (they have context), new lanes second. Record each handle
    and transcript path in the registry as it returns; commit again.

---

## 6 · The pre-dispatch message to the human

One message before every round. It is where the 41.8% gets prevented.

```markdown
# Before I dispatch round <n>

## How I would improve or fix the ask
<Numbered. Each: what you asked → what I would change → why (one line) → the default I take
if you say nothing.>

## Questions I need answered up front
<Numbered. Only what a lane or my own tools cannot find out: access, money, external assets,
taste, legal. Each with a default.>

## What I will NOT do without a ruling
<Anything irreversible, outward-facing, or spending money.>

Reply with numbers; your words go into the ledger as rulings verbatim.
```

---

## 7 · The landing checklist (per PR / per lane)

```
[ ] Branch cherry-checked against trunk: `git cherry trunk branch`, each + confirmed by content
[ ] Gates enumerated from the CI file TODAY, run cold on the tip SHA (skip count, duration read)
[ ] Contract changes: every reader of every touched field swept (grep the whole monorepo)
[ ] PR opened; required check green ON THE TIP SHA
[ ] Merged with a merge commit; merge SHA recorded
[ ] CI run for <merge-sha> green (GitHub: `gh run list --commit <merge-sha>`)   ← a push is not a green
[ ] Live build marker == merge SHA
[ ] Live probe by someone who did not write the fix (curl / script / screenshot), ref recorded
[ ] Ledger §0/§2/§4/§7 updated; DONE written with all three refs
```

---

## 8 · The handoff file

Regenerate before every long pause and at the end of every round. It exists so a fresh session
(or you after a context reset or an outage) resumes from files, not from memory.

```markdown
# HANDOFF — next coordinator session
**Everything below is verified, not remembered. Re-verify anything older than an hour.**
Regenerated <timestamp>.

## 1 · Where you are
<home worktree, branch, which skill to invoke, which ledger sections to read first, in order>

## 2 · State at handoff (<timestamp>)
trunk(s) = <sha>, live = <sha>. What is merged. What is in flight:
- <lane> — worktree <path>, branch <name>, last commit <sha>, pushed? <y/n>, dirty files <n>.
  If dead: <resume from transcript / re-dispatch from brief X>. <what to tell the human when
  it lands>
Dormant worktrees safe to prune once `git branch -r --merged trunk` confirms them.
Ready queue (not dispatched, in order): <queue ids and one line each>

## 3 · What waits on the human (sorted by what only they can do)

## 4 · Re-measure at open (do not inherit)
1. fetch trunk(s); curl live build; rewrite ledger §0
2. list open PRs in every repo (GitHub: `gh pr list`) — anything open is a lane's unlanded work
3. fetch, then for each in-flight worktree: `git status --short`, `git log -1`,
   `git merge-base --is-ancestor HEAD origin/<branch>` (pushed?)
4. resource scan (all four holding places) before allocating anything

## 5 · Known hazards in this exact state
<per-repo; name the repo on every line>

## 6 · What I got wrong since the last handoff
<same prominence as findings; each with the rule it produced>

## 7 · The protocol
<one paragraph: claims carry refs; CODED/VERIFIED/DONE; DONE's three parts>

Transcript of the session that wrote this: <path>
```

---

## 9 · The recovery sequence (after sleep, power loss, network loss, or a context reset)

```
1. Do NOT touch any worktree yet. Do NOT re-dispatch anything.
2. `git fetch` every repo, then for every worktree in `git worktree list`:
     git -C <wt> status --short      # any line = dirty
     git -C <wt> log -1 --oneline    # last commit; compare with the base ref in the registry
     git -C <wt> rev-parse -q --verify origin/<branch> >/dev/null \
       && git -C <wt> merge-base --is-ancestor HEAD origin/<branch> && echo pushed
   (Lane branches often have no upstream, so `git status -sb`'s `[ahead N]` cannot be trusted.)
3. Classify each lane: dirty (any status line) / pushed (HEAD is an ancestor of the remote
   branch) / committed-not-pushed (clean, not pushed, HEAD past the base ref) / untouched
   (clean and HEAD == base ref).
4. Re-measure trunk and the live build; rewrite ledger §0.
5. Resume dirty lanes from their own transcript (path in the lane registry): "commit your
   work first with git add -p, then continue from <last milestone>". Resume committed lanes
   with "continue". Re-dispatch only untouched lanes, from the brief file in the registry.
6. Record the outage and what survived in ledger §9.
```

A simultaneous stall across every lane is infrastructure. Diagnose the machine, not the lanes.
