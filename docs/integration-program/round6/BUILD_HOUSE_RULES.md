# Round 6 · house rules for every build lane

Written by the coordinator 2026-08-29 against game-amora `origin/main` = **`b5bed01`**.
Read this file AND your own brief. Both are binding.

---

## 0 · RE-VERIFY EVERY CLAIM IN THIS FILE AND IN YOUR BRIEF

**Every line number in every spec is certainly wrong.** Anchor by content: a route string, a function
name, a comment. In round 5, **seventeen premises the coordinator relayed were stale or wrong**, and
several changed the shape of the work.

**Every root cause named in your brief is a HYPOTHESIS. Measure it first.** Three round-5 lanes
measured instead of accepting a handed-down cause and each found a better one: a tap failure that was
geometry rather than `pointer-events`; a "write order" bug where the repo had been sorted for months
and the real gap was that join order cannot be searched; a cache bug that was latent rather than live
because a pool pinned UTC.

**If an item in your brief turns out to be wrong, do not do it. Say which and why.** The strongest
work in round 5 came from lanes that refused part of their brief with evidence: seven of eight
conversions because the eighth had no gate to convert, so a flag would have been "a claim with
nothing under it"; eight transferable keys instead of seventeen because the others could not carry
the escape hatch and flipping one would have refused an admin with no way back. **A refusal is the
best kind of report.**

## 1 · Where you work

- Your worktree and branch are named in your brief. Each is cut from `origin/main` at `b5bed01`,
  `pnpm install --frozen-lockfile` has been run, and `.env` is present with `TEST_DATABASE_URL`
  pointing at local MySQL on port **3307** (up as of 18:40 UTC 2026-08-29).
- **THE PRIMARY CHECKOUT `C:/Users/taren/Desktop/Amora/game-amora` IS OFF LIMITS.** It is parked on
  `voice-sweep-2026-08-01`, runs far behind main, and has seventeen dirty files. Read `origin/main`
  with `git show origin/main:PATH`, never its working tree.
- **Commit at every milestone with `git add <explicit paths>`. NEVER `git add -A`** — other sessions
  land in these trees. **Do not push until the coordinator says so.** A background agent dies with
  the machine's sleep; a committed worktree costs minutes to resume, an uncommitted one costs the
  lane.
- Your zone is listed in your brief. **`server/index.ts` is 28,650 lines and is shared by three
  lanes this round.** Anchor by route string, keep diffs local, **never reformat**, and if you need a
  hunk outside your zone, send the coordinator a written request rather than taking it.

## 2 · The gate set, enumerated from `.github/workflows/ci.yml` at `b5bed01`

**Do not trust this list. Enumerate the workflow's `run:` steps yourself before you report** — this
set grew twice during round 5, once while lanes were running, and the ledger's copy was three gates
out of date when this round opened. In CI order:

```
pnpm install --frozen-lockfile
pnpm check
npx tsc -p tsconfig.tests.json --noEmit          # run COLD: rm -f node_modules/typescript/tsbuildinfo
node scripts/check-brand-refs.mjs                # ratchet; read $?, never the last line, never --update-baseline
node scripts/check-voice.mjs
node scripts/check-hyphen-dash.mjs
node scripts/check-auth-fetch.mjs
node scripts/check-admin-reach.mjs
node scripts/check-save-honesty.mjs               # NEW in PR #90
node scripts/check-repo-payloads.mjs              # an insert omitting a NOT NULL column. `int` is NOT exempt; only bool and defaultNow
node scripts/check-mirror-annotations.mjs         # a hand-kept map holding exactly a shared/ union
node scripts/check-upload-strip.mjs               # multer.diskStorage anywhere in server/, and any write into the uploads volume outside server/lib/uploads.ts
node scripts/check-artifact-budget.mjs
node scripts/check-doc-links.mjs
node scripts/check-route-reachability.mjs
node scripts/check-map-routes.mjs                 # SITE_PAGES drifting from the router, in either direction
node scripts/check-image-budget.mjs               # WebP-only rasters, 400 KB/file, total ratchet
pnpm build
pnpm test
# bundle budget:  MAX_MAIN_JS_KB=700   MAX_TOTAL_DIST_KB=6600
pnpm audit --prod --audit-level high
```

`node scripts/module-facts.mjs` prints this list straight from `ci.yml` and **is the authority over
any prose, including this file.**

## 3 · The traps. Every one has been paid for once

- **`pnpm build` CAN RETURN EXIT 0 WHILE THE LIBUV ABORT FIRES.** Vite ticks green, the log carries
  `ELIFECYCLE 3221226505`, the harness sees exit 0, and `dist/index.js` still embeds the PREVIOUS
  commit. A round-5 lane falsified a fix against that stale bundle and watched it go red for the
  wrong reason. **The only honest check:**
  `grep -c "$(git rev-parse --short HEAD)" dist/index.js`
- **A worktree with no `.env` SKIPS the DB suites and still prints a green summary.** Read the skip
  count AND the duration, never the word "passed". Yours has `.env`; check it anyway.
- **`.test-lock` at `C:/Users/taren/Desktop/Amora/.test-lock` is a convention nothing enforces.**
  If you run the full suite, TAKE the lock, say so in your report, and release it in the same run —
  never across a gap. A lane held it 52 minutes and a sibling had to step around it. It was free at
  dispatch. **A multi-suite cascade is a sibling's load until you have checked for one**, and the
  Windows check lies: filtering `Win32_Process` by `CommandLine` always matches the process asking,
  so filter on `Name = 'node.exe'`.
- **`git grep` matches NOTHING when the pattern starts with `/`.** `git grep -F "/api/auth/login"`
  returns 0; `git grep "api/auth/login"` returns 10. **Prove every negative against a known-present
  control IN THE SAME COMMAND.**
- **ripgrep silently omits a file containing a NUL byte from directory searches, with no message.**
- **`Record<Union, T>` types a lookup as TOTAL**, so `pnpm check` asserts a claim about the server
  instead of checking one. Any hand-kept mirror of a database enum is wrong until checked against the
  migration. One shipped as a page-killing crash for every member. `check-mirror-annotations.mjs`
  now catches the declared shape; it cannot catch a wrong value.
- **`docs/modules/*.md` IS A LIVE RETRIEVAL CORPUS.** One stray word flipped which module the
  assistant retrieved and turned `knowledge.test.ts` red. **A prose edit there is a behaviour change.**
- **A copy change breaks tests by capitalization alone.** Grep the tests case-sensitively first.
- **A push green is not a merge green.** When the two CI runs disagree, the answer is on main.
- **A falsification can be vacuous. Read what the red output SAYS.** Three round-5 lanes watched a
  guard "go red" that proved nothing: a spawn error with empty output, a union the gate states it
  cannot see, and a stale `dist`.
- **Never `git checkout --` a file you have edited but not staged.** It silently reverted two fixes
  mid-round.

## 4 · Migration numbers are allocated by the coordinator. Do not scan

Your number, if you have one, is in your brief. **Do not go looking for a free number** — a number
can be held on a remote ref, on a local ref invisible to your worktree, and as an untracked file on
disk, each invisible to the other two. Two round-5 lanes collided on 0090 and both four-way scans
were correct at the moment they ran.

**NEVER RENUMBER A MIGRATION.** The applied-migrations ledger keys on filename, so a renumber
re-runs the file, and an `ADD COLUMN` then bricks boot.

Hand-written `drizzle/NNNN_description.sql` plus types in `server/db/schema.ts`. Run it with the
project's runner. Do not run `drizzle-kit generate`/`migrate`.

## 5 · The standing judgements every lane inherits

- **A FALLBACK IS A CLAIM, and it is worse than a crash.** An unguarded lookup crashes loudly and
  gets fixed within the hour. A guarded one that invents a value lies quietly forever and passes
  every gate: a decision the village CARRIED read **"Did not carry"** to every member, because the
  fallback was `failed`. **Every sentence your code causes the product to say must come from what
  happened, never from a default.**
- **Classify every permission call site as an ACT or a LOOK.** A permission check used for
  VISIBILITY writes false records: an admin merely LOOKING at a page with a break-glass override in
  the request wrote "acted on a power this village holds" to a public feed. Found three times in two
  days.
- **A change to a contract closes its consequence.** If you change what a field means, sweep every
  reader of every field you touched, including the ones you add. The sites your brief names are a
  floor, never a ceiling.
- **A dormant column is an ARMED column.** Before shipping the first reader of a column, grep for
  what else is seeded and unread.
- **AUDIT YOUR OWN WORK AFTER IT PASSES EVERY GATE.** Four round-5 lanes did this unprompted and
  every one found something: a meter that counted a 404 as a use, a registry naming two routes that
  do not gate on it, a success handler wiping a concurrent failure's message. **Green is where the
  next defect hides.**
- **Report found-versus-fixed as TWO NUMBERS**, and classify the safe cases rather than padding the
  list.

## 6 · The rulings your design must obey

- **R51** — new work in a file goes to the lane already holding it, as a numbered addendum.
- **R52** — motion that ANSWERS the person is alive; motion that INTERRUPTS is noise. Celebration is
  for **rare** things. A first vote is a `whisper`. A power crossing to the village is a `moment`,
  and it is the **only** addition to the moment ration; anything else needs an argued edit to
  `docs/modules/natural-interface.md`.
- **R53** — the mask and the truth are separate layers. When a feature is personal, check what it
  WRITES, not only what it shows.
- **R54** — admin is scaffolding, not a tier. **Test: does this move a power toward the village, or
  entrench the scaffolding?**
- **R55** — the handover is a journey to celebrate, never a scorecard to fail. **No
  percentage-incomplete, no ranking, no countdown, no nagging, no cross-village comparison.** Test:
  would a two-week-old village and a two-year-old village both feel good opening this?
- **R56** — state what is true, then get out of the way. A count is a fact; a warning is an
  argument. Villages set their own dials, including a 1% quorum. **Test for any cautionary sentence:
  is this telling them something they cannot see, or telling them what to want?**
- **R57** — a village's people are public by default, with a village-set lock (`org.public_people`).
- **R58/R59** — every module is free in v1.0 and earns $ReGen on usage; platform-built modules earn
  and their share recycles back into the pool, **visibly**.

## 7 · Voice

No em-dashes. No "not X but Y" contrast framing. Plain words, written for community members rather
than developers. `check-voice.mjs` and `check-hyphen-dash.mjs` enforce part of this on `shared/` and
`client/`; the rule applies to your commit messages and your report too.

## 8 · Do not end your turn while a background job is the only thing holding your result

This cost four lanes in one round, twice with the fix sitting UNCOMMITTED while the dangerous old tip
was still on the remote. **Wait your suite out inside the turn, or poll it to completion.**

## 9 · How you report

```
Lane <name>. Tip SHA: <sha>. Branch: <branch>.
Built: <what, in one sentence per item>.
Refused: <brief items I judged wrong, with evidence>.
Found vs fixed: <n> found, <n> fixed, <n> left alone and why.
Gates: every step above with its output. pnpm test: <passed>/<skipped>, duration.
dist SHA check: grep -c "<short sha>" dist/index.js = <n>.
Self-audit after green: <what I looked for, what I found>.
Status: CODED (gates green locally at <sha>) — the coordinator takes it to VERIFIED and DONE.
```

**Status is CODED when your gates are green.** VERIFIED means the coordinator confirmed CI green on
that exact SHA and merged; DONE means the deployed `/health` marker matches and the behaviour was
measured live by someone who did not write it. Do not claim VERIFIED or DONE.
