# Round 6 · house rules for the three QA passes

Written by the coordinator 2026-08-29 against game-amora `origin/main` = **`b5bed01`**.
Read this file AND your own brief (`briefs/QA_1_MEMBERS_EYES.md`, `QA_2_ADVERSARY.md`,
`QA_3_OPERATOR_AND_FORK.md`). Both are binding.

---

## 0 · RE-VERIFY EVERY CLAIM IN THIS FILE AND IN YOUR BRIEF

This is not a courtesy line. In round 5, **seventeen premises the coordinator relayed were stale or
wrong**, and several changed the shape of the work: a file that did not exist, a refusal list nobody
had written, a gate that had never existed. **Every root cause named here or in your brief is a
HYPOTHESIS.** Measure it first. If an item in your brief turns out to be wrong, **do not do it — say
which and why.** A lane that corrects the coordinator is the lane working properly, and the strongest
reports in round 5 were the ones that refused part of their brief with evidence.

Already corrected once today, as an example of the standard: the coordinator's own handoff said the
investor packet's document links are "cached one-year-immutable". **They are not.** The immutable
branch in `GET /api/uploads/:filename` applies only to `image/`, `font/` and `audio/`; PDFs and
unknown types get `Cache-Control: private, no-cache`. The leak is real, the cache claim was wrong.

---

## 1 · What you are QA-ing

**Round 5 of this program merged twenty-nine PRs, #62 through #90, in about a day, and shipped
with NO QA round over any of it.** Three QA lanes were dispatched at the close and were killed
within minutes by a weekly usage limit, so nothing was reported and nothing was fixed. That is the
largest open risk on this platform and you are the pass that closes it.

Your scope is **everything those twenty-nine PRs built and touched**, plus anything they plausibly
broke on their way past. The list, by merge branch:

| PR | Branch | What it claims to do |
|---|---|---|
| 62 | wt/r5-vote | Draw a vote as a moon and a field of silhouettes |
| 63 | wt/r5-mask | One room for how the village looks to you, reachable on a phone |
| 64 | wt/r5-photos | Every place on the map gets photographs contributed by the village |
| 65 | wt/r5-gov | A quiet week no longer kills a proposal; a vote can be called off; a village can practise |
| 66 | wt/r5-org | R57: the village's people are public by default, with one lock |
| 67 | wt/r5-strip | Every image reaching the uploads volume is stripped, and a gate says so |
| 68 | wt/r5-adminsweep | Members list in one order; field names stop reading as paragraphs |
| 69 | wt/r5-trail | The decisions rail reads as one thought; it says when a vote binds |
| 70 | wt/r5-hypha | The Hypha bridge becomes a module; claims become checks |
| 71 | wt/r5-waiting | A proposal that missed quorum stops reading like one the village turned down |
| 72 | wt/r5-copybook | The Circles members line has a third case |
| 73 | wt/r5-doorgate | Catch the living map's route list drifting from the router |
| 74 | wt/r5-docs2 | Stop citing a gate that was never written |
| 75 | wt/r5-gb | G-B: the gate names its holder |
| 76 | wt/r5-onsite | The village opens its own vote from the page it decides on |
| 77 | wt/r5-clock | Two clocks became one: the balance cache and the voting window |
| 78 | wt/r5-gate | The sign-in wall says what is behind it |
| 79 | wt/r5-works | The investor vault saves a document; the packet form captures a lead |
| 80 | wt/r5-byte | calendar.ts is invisible to every ripgrep sweep |
| 81 | wt/r5-mirror | A page reads a value it has not been taught instead of guessing or going blank |
| 82 | wt/r5-payload | Two gates: the route that could never save, and the map the compiler could check |
| 83 | wt/r5-gc | G-C: the village asks to hold a power, and holds it by its own vote |
| 84 | wt/r5-orphans | A founder can see the files nothing points at, and remove them |
| 85 | wt/r5-runway | The village can start a handover, and it can end one |
| 86 | wt/r5-meter | Measure module use, and send the platform's own share back |
| 87 | wt/r5-eight | Seven of the last eight powers get an escape hatch |
| 88 | wt/r5-glass | Build the handle on the break-glass; make the record wait for the act |
| 89 | wt/r5-saved | Every surface that says "saved" asks the server first |
| 90 | wt/r5-tidy2 | The decline toast, a save-honesty gate, a register path on four cards |

Read the diffs you need: `git log --oneline b5bed01 -60`, `git show <sha>`, `git diff 18aa121..b5bed01`.
Do NOT read all twenty-nine end to end before starting — walk the product first, and go to the diff
when something looks wrong.

---

## 2 · Where you work, and what you may touch

- **Your worktree** is named in your brief. It is **detached at `b5bed01`**, `node_modules` is
  installed, and `.env` is present and carries `TEST_DATABASE_URL` (local MySQL, port **3307**, and
  it is up as of 18:40 UTC 2026-08-29).
- **THE PRIMARY CHECKOUT `C:/Users/taren/Desktop/Amora/game-amora` IS OFF LIMITS.** It is parked on
  `voice-sweep-2026-08-01`, runs far behind main, and has seventeen dirty files. Read `origin/main`
  with `git show origin/main:PATH`, never its working tree.
- **YOU ARE READ-ONLY ON THE PRODUCT. FIX NOTHING.** Not a one-line typo, not an obvious import.
  Three lanes editing the same files fight, and a QA pass that starts fixing stops looking. The
  coordinator dispatches the fix wave with disjoint zones after all three of you report.
- You MAY write, inside your own worktree: probe scripts under a directory named in your brief, and
  scratch files. Commit them with `git add <explicit paths>` at every milestone. **NEVER `git add -A`.**
- You MAY write your report into the hub at
  `C:/Users/taren/Downloads/regen-integration/docs/integration-program/round6/qa/qa-N/`.
  **Write the files; do NOT run any git command in the hub.** The coordinator commits it.
- **Do not push anything.** Commit locally so a machine sleep costs minutes rather than the lane.

## 3 · Your scratch database, and the trap in the shipped script

`scripts/qa-scratch-db.mjs` **hardcodes `SCHEMA = "village_qa"`**, so if all three of you ran it you
would drop each other's database mid-run. Do not run it as shipped.

Copy it to your own scratch directory (outside the repo tree), change `SCHEMA` to the name in your
brief, and run your copy. **Drop only your exact schema name. Never a `LIKE` or `%` pattern** — a
lane once ate a sibling's leftover with `village_drive%`.

Your scratch directory is named in your brief. **The session scratchpad is NOT lane-isolated**, so
put nothing shared there.

## 4 · Live versus local, and why there are no live tokens this round

- **Live is `https://amora.regencivics.earth`.** `/health` reported build
  `2026-07-28-wave1-b5bed01` at 18:35 UTC on 2026-08-29, which **matches the tip exactly**. Record
  the build marker at the start AND at the end of your run; if it moved, state both.
- **On live you are signed out, and you render and read only.** No accounts, no forms submitted, no
  settings changed, no writes of any kind. The public lead-capture form in particular is a live
  email cannon — do not submit it.
- **Anything needing a signed-in member, an admin, or a write runs against a LOCAL build of
  `b5bed01` with your own scratch schema.** The coordinator is deliberately not minting production
  tokens this round: it would require pulling `AUTH_TOKEN_SECRET` out of Railway, and a local build
  at the identical SHA answers the same questions without a production credential in play.
- **Every finding states where it was seen: LIVE or LOCAL.** A finding seen only locally is still a
  finding; it is just labelled.

## 5 · How to rank, and what a report must contain

**Rank by WHAT THE USER LOSES, never by how hard the defect was to find.** A one-character typo on
the exit-policy page outranks a subtle race nobody will hit.

- **HIGH** — blocks the goal, loses data, states something FALSE, or gives someone power or value
  they were not given.
- **MED** — degrades or confuses, or makes a true thing hard to find.
- **LOW** — cosmetic.

Every report carries all seven:

1. **Ranked findings.** Each one: severity, route, LIVE or LOCAL, viewport, the element chain, a
   one-line repro anyone can follow, a screenshot path where it is visual, and **one sentence in the
   voice of the person you are being** ("I was told my report was sent and nobody ever saw it").
2. **What you checked and found CLEAN, stated explicitly.** A category you omit reads as a category
   that passed. This is not optional padding; it is half the value of the pass.
3. **A count of what you could NOT measure, and why.** This is the single most important line in
   any QA report. Report it even when it is zero.
4. **Two numbers, not one: how many things you examined in each class, and how many were defects.**
   Round 5's sweeps found more than the reports that triggered them every single time (13 named →
   16 fixed; 114 sites found → 9 real). And **classify the safe cases rather than padding the
   list** — one round-5 lane correctly left fourteen alone and said why for each.
5. **Every negative proved against a known-present control IN THE SAME COMMAND.** See §6.
6. **No causes.** Do not diagnose why something is broken. Describe what happens. A cause handed
   down from a QA pass is a hypothesis, and seventeen relayed premises were stale in a single round.
7. **A refusal list.** Anything in your brief you decided was wrong, with the evidence. This is the
   best kind of report, and it is explicitly wanted.

## 6 · The traps. Every one of these has already been paid for once

- **`git grep` matches NOTHING when the pattern starts with `/`.** `git grep -F "/api/auth/login"`
  returns 0; `git grep "api/auth/login"` returns 10. An audit once declared all 492 routes uncalled
  on this alone. **Prove every negative against a known-present control in the same command.**
- **ripgrep silently omits a file containing a NUL byte from directory searches, with no message.**
  `server/lib/calendar.ts` was invisible to every sweep for weeks.
- **`pnpm build` can return exit 0 while the libuv abort fires.** Vite ticks green, the log carries
  `ELIFECYCLE 3221226505`, the harness sees success, and `dist/index.js` still embeds the PREVIOUS
  commit. The only honest check is
  `grep -c "$(git rev-parse --short HEAD)" dist/index.js`.
- **A worktree with no `.env` SKIPS the DB suites and still prints a green summary.** Read the skip
  count and the duration, not the word "passed". (Yours has `.env`; check it anyway.)
- **`.test-lock` at `C:/Users/taren/Desktop/Amora/.test-lock` is a convention nothing enforces.** If
  you run the full suite, TAKE it, say so, and release it in the same run. It was free at dispatch.
- **The sibling-process check lies on Windows.** Filtering `Win32_Process` by `CommandLine` ALWAYS
  matches the process asking, so a count that never reaches zero is that self-match. Filter on
  `Name = 'node.exe'`.
- **A probe that reads an unresolved `calc()` gets NaN, and `NaN || 0` becomes a clean pass.**
  **A probe's failure path must be a FAILURE, never a pass.** Assert every numeric band finite
  before comparing. NaN, undefined and unparsed are NOT MEASURABLE, printed, never passed.
- **A control that did not run is not a control.** Assert a non-zero check count before believing a
  comparison.
- **A probe can pass on a button nobody can press.** Display, opacity and the bounding rectangle all
  pass on a COVERED control. Ask whether the browser would deliver the tap
  (`document.elementFromPoint` at the control's own centre, and check the element it returns is
  yours or your descendant).
- **LOOK AT THE SCREENSHOT.** Six times in round 5 a fully green surface said something false and
  only a screenshot caught it: a button nobody could press, rows crushed below their content
  painting over their neighbours while all 34 assertions stayed green, a panel reading "This village
  does not carry write an agreement by vote today". **Overlap, nonsense and covered controls are not
  questions a DOM probe asks.**
- **Playwright hazards:** `networkidle` never fires here — use `domcontentloaded` plus ~3.5s.
  Safe-area insets read 0 on WebKit for Windows (that is NOT MEASURABLE, not zero). Force
  `scroll-behavior: auto`.
- **`docs/modules/*.md` is a live retrieval corpus.** A prose edit there is a behaviour change. You
  are read-only, so this only matters if you are tempted.

## 7 · Things already known. Do NOT re-report these

Each was measured by a round-5 lane that could not reach it, or is a deliberate design decision with
reasoning worth more than the finding. If you find one of these, a **one-line confirmation** is
welcome; a full write-up is duplicated work. **If you find one is WRONG, that is a real finding.**

1. **`member.vouch` gates nothing anywhere.** Declared in `shared/capabilities.ts`, present in no
   route, helper or query. Known, named in `NOT_YET_WIRED`.
2. **`ballot.vote` cannot be transferred, and the refusal is CORRECT.** No route refuses on that
   key, so there is no gate to convert; marking it transferable would be a claim with nothing under
   it, and an admin dropped off a village-held roll had two silent ways back.
3. **A village cannot create a role, seat anyone by vote, or take a power off a role.** The last is
   design: a ballot that stripped a capability would manufacture by vote the exact state
   `moveCapabilityToVillage` refuses to create.
4. ~~**`mayAct` writes the public "acted on a power" line before the route runs.**~~ **CORRECTED
   2026-08-29 by QA-2, which drove it rather than inheriting it: break-glass plus a 400 wrote ZERO
   public rows, and break-glass plus a valid body wrote EXACTLY ONE.** The class looks closed on this
   build. It was measured on one key rather than all of them, so a NEW instance on a different key is
   still a finding, but do not report the general claim as open. **This is the third inherited claim
   this round that measurement moved in the product's favour.**
5. **The READER half of the payload class has no gate** — a route that saves fine while the
   renderer addresses fields that are not columns. Known class. **A NEW INSTANCE IS A FINDING.**
6. **`ProjectHistory.tsx`'s "Discussion topics" and per-item status overrides are localStorage
   only.** Known.
7. **`investor_docs.requiresRequest` is written as a literal `false` and read by nothing**, and
   `description` is hardcoded null on upload. Known; a fix lane holds it this round.
8. **`Decisions`, `Propose` and `Introductions` read only `user` from `useAuth()` and ignore
   `loading`**, so a signed-in member is briefly told to sign in. Known and deliberately left.
9. **`/register` takes no `next`** (also in `SignInToSee`), because `Register.tsx` sends new members
   into the first-run character walk. Deliberate.
10. **The four core modules are not metered** — they do not mount behind `requireModule`. Known.
11. **A neighbour's badge can take a building's roof tap on the map.** `.bhit` is 44x44 over a 22px
    badge and `#badges` sits above `#icons`. **Left deliberately: 44px is the accessibility floor.**
12. **The pocket fan is undiscoverable** — on a phone the first tap on a building carrying two or
    more marks fans them, and nothing says to tap again. Known.
13. **A module at `preview` lifecycle reads as "not enabled" to a member, BY DESIGN**, so what a
    village is trying out never leaks. Open decision with the founder; not a bug to report.
14. **`governance`, `crowdpool`, `resources` and `introductions` all ship OFF on live.** A public
    surface for one of these being absent on live is expected, not a finding. Turn them on in your
    LOCAL scratch build to test them.
15. **One `verify_door_routes.js` citation survives inside `grounds-v0.html`.** Known.

## 8 · The rulings your judgement must obey

You are judging a product built to these. A finding that contradicts one of them is probably a
misread; a finding that catches the product breaking one is a good finding.

- **R51** — new work in a file goes to the lane already holding it.
- **R52** — motion that ANSWERS the person is alive; motion that INTERRUPTS is noise. Celebration is
  for rare things.
- **R53** — the mask and the truth are separate layers. Anyone re-skins their own view; only
  builders move buildings and boundaries. **When a feature is meant to be personal, check what it
  WRITES, not only what it shows.**
- **R54** — admin is scaffolding, not a tier. The destination is an electorate that can vote to
  enlarge its own powers. Test: does this move a power toward the village, or entrench the
  scaffolding?
- **R55** — the handover is a journey to celebrate, never a scorecard to fail. **No
  percentage-incomplete, no ranking, no countdown, no nagging, no cross-village comparison.** Test:
  would a two-week-old village and a two-year-old village both feel good opening this?
- **R56** — state what is true, then get out of the way. A count is a fact; a warning is an
  argument. Villages set their own dials, including a 1% quorum. **Test for any cautionary sentence:
  is this telling them something they cannot see, or telling them what to want?**
- **R57** — a village's people are public by default, with a village-set lock (`org.public_people`).
- **R58/R59** — every module is free in v1.0 and earns $ReGen on usage; platform-built modules earn
  and **their share recycles back into the pool, and the recycling must be VISIBLE.**

**And the one that is not numbered but governs everything you are looking for:**

> **A FALLBACK IS A CLAIM, and it is worse than a crash.** An unguarded lookup crashes loudly and
> gets fixed within the hour. A guarded one that invents a value **lies quietly forever and passes
> every gate.** A decision the village CARRIED read **"Did not carry"** to every member, because the
> fallback was `failed`. **Every sentence the product says must come from what happened, never from
> a default.**

## 9 · Do not end your turn while a background job is the only thing holding your result

This cost four lanes in one round. If you start a suite, a build or a probe run in the background,
**wait it out inside your turn or poll it to completion.** "The monitors will report" is not a
report, and twice that mid-state was collected as a lane's final answer.

## 10 · Report format

Write to `.../round6/qa/qa-N/` in the hub:

- `REPORT_2026-08-29.md` — the prose report in the shape of §5.
- `findings.json` — `[{id, severity, category, surface: "live"|"local", route, viewport,
  buildMarker, elementChain, repro, screenshot, personaLine}]`
- `checked-clean.md` — §5 item 2.
- `unmeasured.json` — §5 item 3, with the reason per entry.
- `screenshots/` — one per visual finding per viewport.

Close your final message to the coordinator with:

```
QA-N <perspective>. Live build start/end: <marker> / <marker>. Base SHA: b5bed01.
Findings: HIGH <n> / MED <n> / LOW <n>. Examined <n> in class X, <n> defects.
Checked clean: <list>. Could NOT measure: <n>, listed.
Refusals (brief items I judged wrong): <n>, listed.
Writes to live: NONE. Local scratch schema: <name>, dropped: yes/no.
Paths: <hub paths>.
```

**No em-dashes. No "not X but Y" framing. Plain words.** Hub reports sit outside `check-voice`, and
the rule still applies.
