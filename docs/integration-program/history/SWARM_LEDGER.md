# SWARM LEDGER

**Canonical coordination record for every Claude session working in Amora.**
Owned by the governor session (*Amora session coordination*). Established 2026-08-11.

Read this before you write. Update your own row after you write. Do not edit another
lane's row; if you need something from another lane, say so in **Blockers** and the
governor will route it.

Session titles remain the at-a-glance status line. This file is the source of truth.

---

### ⚡ CI IS READABLE NOW — this retires a standing fact repeated all day

`gh` is installed and authenticated (v2.97.0, `Rieki777`, HTTPS, sharing git's credential
manager). **"No session can read the Actions result" is no longer true.**

```
"C:\Program Files\GitHub CLI\gh.exe" run list --repo Rieki777/Amora-Game --branch main --limit 10
"C:\Program Files\GitHub CLI\gh.exe" run view <id> --repo Rieki777/Amora-Game
"C:\Program Files\GitHub CLI\gh.exe" run view <id> --repo Rieki777/Amora-Game --log-failed
```

**Two traps, both of which cost the finding lane time immediately:**

1. **A running shell keeps the PATH it started with.** Sessions open before the install
   cannot find `gh` by name and will conclude it is not installed. **Use the full quoted
   path.** This is almost certainly why it has been installed more than once: the installing
   session cannot see its own install, reports failure, and the next session repeats it.
2. **`--log-failed` is mostly MySQL container noise** — InnoDB startup and teardown, not the
   failure. Filter: `grep -aiE "FAIL |AssertionError|Test Files"`.

**A push still lands before CI reports, so a successful push is still not a green — but the
verdict now arrives about 2m30s later.** Read your own run after pushing to `main`. A
bypassed push is only safe if someone reads it afterwards; that was unenforceable this
morning and is enforceable now.

*(Installed and verified by the prototypes lane, who then used it to find main red.)*

---

### The one protocol that made everything else work

**Every claim carries the ref it was measured at. A claim without one is unverifiable, no
matter how recent it feels.**

`main` moves between any two messages by construction, so **nobody in this swarm can be
current** — not the lanes, not the governor, not this file. Being current was never
available. The only thing that works is making a stale fact **visibly** stale instead of
silently wrong.

Every genuine save today came from this and nothing else: a lane stating the SHA it measured
against, another noticing the mismatch, and the gap being checked rather than argued.
Governor claims corrected by lanes on 2026-08-11: the migration registry high-water, the
`draftKinds` direction, the `embed_sprites` scope, the CI gate count, the "0 ahead means no
work" reading, the Group B deletion order, the byte-identity triage, and the strict
migration slotting. **Eight.** Each was caught because a ref was attached to something.

*(Articulated by the foundation lane, as a protocol rather than a rule about counts.)*

---

## 1 · The rules

1. **Never `git add .`** — commit with explicit pathspecs, always. Multiple lanes share a
   working tree; a wholesale add steals another lane's in-flight work and a wholesale
   write silently reverts it.

   1a. **An explicit pathspec does not protect you when the contamination is per-HUNK.**
   The rule above assumes two lanes touch different *files*. In `ga-map` two lanes were
   editing the same file at the same time, so `git add <that one file>` would have swept
   the other lane's in-flight prose into the commit under the wrong message — the exact
   failure the rule exists to stop. When two lanes are inside one file, **stage filtered
   hunks**: `git diff -- <file>`, split on `^@@`, drop hunks containing the other lane's
   marker, `git apply --cached --recount`. Two traps: rebuild the patch with an explicit
   trailing newline or `git apply` reports "corrupt patch at line N", and verify afterwards
   with `git show <sha>:<file> | grep -c "<their marker>"` returning 0.
   *(Established by the map/vocabulary lane, who used it for all four of their commits.)*

   1b. **Byte-identical duplicates in a shared tree are not inert, and deleting them is not
   safe on its own.** The shared `game-amora` tree's *uncommitted* `server/index.ts` imports
   `knowledge`, `villageBrain`, `drafts`, `villageBrief`, `villageReaders` and `assistant`
   at lines 222–235. The "duplicate" libs and the index.ts hunks that import them are **one
   interlocking set**, so removing half red-lines `pnpm check` for every lane in the tree.
   One session deleted 14 such files, broke the tree for six live lanes, and restored them
   within about ninety seconds. **The tree wants a rebase, which dissolves the duplication
   in one move — not a delete.** If a delete is needed it happens inside that single atomic
   operation with nothing else in flight.
2. **Migration numbers come from the registry in §3**, never from `ls drizzle/`. A number
   can be held three ways and **each is invisible to the other two**:
   - *remote refs* — a `git fetch` sees these;
   - *local refs on other worktrees* — only `git for-each-ref refs/heads` sees these;
   - *untracked files on disk* — only listing `drizzle/` per worktree sees these.

   Sweep all three before claiming. And before calling anything pushed, check
   `git branch -r --contains <sha>` — a local branch name that matches a remote one
   proves nothing about whether the commit reached the remote.
3. **A shipped migration file is never edited.** A part-applied file resumes at its
   recorded statement offset. Fix forward with a new file.

   3d. **TIMING AND TOPIC ARE NOT ATTRIBUTION EITHER — the governor broke rule 3a three
   times in one day, the last time at the very end.** A lane said "pushing in ten minutes";
   a commit fixing that exact line landed shortly after; the governor credited them. **It was
   a different lane's work.** Verified three ways after they objected:

   | | |
   |---|---|
   | their commit `03021bb` | **one** file, **on no remote**, rebase aborted, never pushed |
   | the landed `c9efaef` | **six** files — migration, client, docs, +50 lines of tests |
   | transcript search | the *other* lane holds the **Write** of the migration; this one holds only a **diff stat** |

   **Who wrote a file, not who was working near it.** The lane that was misattributed *to*
   is the one that caught it, and said plainly they would "rather say so than let a green
   land under the wrong name at the end of a long day."

   3a. **Content is the only thing that attributes a commit in this repo.** A commit's
   branch does not identify its author when the tree is shared, and git identity never
   does anywhere here — **every commit in this repo is authored by Rye**, so
   `git show --format=%an` cannot separate sessions. Three lanes misattributed `0063` from
   branch residency alone before content settled it. When attribution matters, read what
   the commit *does*, and check who **wrote** a file rather than who has it in
   `git status` — authoring and noticing look identical in a transcript search otherwise.

   3b. **"0 ahead" means MERGED, not absent — and ahead/behind counts cannot tell you
   which.** The governor read two lanes as having "no commits of their own" when both had
   landed four commits each; the branch showed 0 ahead *because* the work reached main.
   Combined with rule 3a (every commit here is authored by Rye), branch arithmetic is the
   wrong instrument entirely. **Verify per candidate SHA:**

   ```
   git merge-base --is-ancestor <sha> origin/main && echo "landed"
   ```

   *(Established by the Maia lane after the governor twice mistook merged work for missing
   work.)*

   3c. **The gate set is a function of how far behind you are.** `check-auth-fetch.mjs`
   landed at `7b0e73e` and became CI-blocking at `ef04f43`. A lane behind those commits
   does not have the script, so "run all nine gates" is impossible until it rebases. **Pull
   first, then count your gates.** The governor told three lanes to run nine gates when at
   least one of them physically could not.
4. **Shared files (§4) have one owner.** If you need to touch someone else's, request it
   through the governor rather than editing in place.
5. **All nine gates before you call anything done** (§5). `CLAUDE.md` lists five; CI blocks
   on nine, and no local `pnpm test` reproduces the last three.

   5a. **A green is only a green for the steps that reached.** CI stops at the first failing
   step, so when `Test` fails, **Bundle budget and Dependency audit never run at all** and
   report nothing. Main sat red for five commits behind one assertion, and for all five of
   them two of the nine gates had simply not executed. Read which steps ran, not just the
   colour. *(Established by the mobile map lane, who bisected the red.)*

   5b. **An e2e suite boots the BUILT `dist/index.js`. Run `pnpm build` first, every time.**
   The governor diagnosed the red main correctly, edited `server/lib/examples.ts`, re-ran
   the suite without rebuilding, watched it fail identically, and briefly concluded the
   correct diagnosis was wrong. The rule is in `CLAUDE.md` and was still walked into.

   5c. **HOUSE TRAP — a migration that seeds a platform-owned row into a module's own table
   silently disables that module's example seeding.** `server/lib/examples.ts` decides "has
   this village made its own content?" by counting non-example rows in the module's tables
   *before* the seeder runs. `0063` shipped the `cartographer` badge via `INSERT IGNORE` at
   migration time with `is_example = 0`, so every fresh database read as already-populated
   and seeded no example badges at all. Invisible from the migration, and invisible from the
   module. The fix is to add the table to `NOT_EVIDENCE_OF_REAL_CONTENT`, which already
   carried this exact story for `health_events` and `tokens`.
6. **`pnpm check` does not typecheck tests** (`tsconfig` excludes `**/*.test.ts`). A stale
   call site surfaces ~30 minutes into the suite as an assertion error, not as a type
   error. Grep call sites by hand when you change a signature.
7. **Report state honestly in your row.** A lane that says "green" and isn't costs the
   whole train a cycle.

   7a. **A fresh worktree has no `.env`, so a full suite can pass hollowly.** Without
   `TEST_DATABASE_URL` every DB-backed suite **skips**, and the summary still prints a pass
   count. One lane got **"585 passed" in 25 seconds with 13 files and 219 tests skipped** —
   including every suite it actually cared about — and nearly took it. **Copy `.env` into
   the worktree first, and read the SKIP count, not the pass count.** This is the most
   likely trap to recur, because every lane is now using throwaway worktrees.

   7b. **HOUSE TRAP — on Git Bash, MSYS mangles `origin/main:path` and `2>/dev/null`
   hides it.** MSYS path conversion rewrites the argument to `origin\main;path`: forward
   slashes to backslashes **and the colon to a semicolon**. git rejects it as an invalid
   object name. Suppress stderr and pipe to `grep`, and you get empty input — so a
   `|| echo "not found"` fallback prints a confident false negative that reads exactly like
   a real answer. One lane concluded `ci.yml` contained no `check-*` steps this way; the
   governor hit the identical bug an hour earlier and escaped it **only** because stderr
   was not suppressed and the `fatal: ambiguous argument` was visible.

   ```
   MSYS_NO_PATHCONV=1 git cat-file -p "origin/main:.github/workflows/ci.yml"
   ```

   **THE WINDOWS QUIRK IS NOT THE BUG.** MSYS fails loudly; it printed
   `fatal: ambiguous argument`. The bug is **`2>/dev/null` paired with a `|| echo` that
   asserts a fact** — that shape converts *any* broken command into a confident negative,
   on any platform, for whatever anyone greps.

   **Rule: never let a fallback echo assert something the command did not prove.** Write
   `|| echo "CHECK FAILED"`, never `|| echo "not found"`. The first is honest about not
   knowing; the second invents an answer. *(Reframed by the renumber lane, who had the bug
   and diagnosed past their own instance of it.)*

   7j. **LOCAL `main` LAGS `origin/main`. Never base or reset from the local ref.**
   Verified 2026-08-11: local `main` sat at `13cc2f6` while `origin/main` was `18f0c2f`, and
   `git branch --contains 18f0c2f` returned only the one lane that had explicitly based on
   the SHA. Nothing pulls local `main` forward — no lane checks it out — so it drifts
   silently and forever. **Base on `origin/main` by SHA, after a fetch.**
   *(Found by the override lane, who based explicitly by SHA for exactly this reason.)*

   7k. **THIS MACHINE RUNS NODE 25; CI RUNS NODE 22. A dependency change can build green
   here and break there.** `ci.yml` pins `node-version: 22` and `.node-version` says `22`;
   local is `v25.8.0`. The two differ in `require(esm)` support, so **an ESM-only package
   pulled in transitively passes locally and throws in CI.**

   Concretely: a global `nanoid: >=3.3.17` override resolves to **nanoid@6.0.1, which is
   ESM-only**, while `postcss` does `require('nanoid/non-secure')`. The `engines` field is a
   red herring — it allows `^22` — the break is the CJS/ESM interop difference between the
   two Node versions. That override was proposed, tested, and **abandoned because of this**;
   it would have been a latent CI break that every local gate called green.

   **Any dependency or override change must be reasoned about at Node 22, not at the local
   version.** *(Found by the override lane, by testing rather than reasoning.)*

   7t. **`git worktree remove` can deregister WITHOUT deleting the directory, and it looks
   like a failure.** On Windows, when `node_modules` pushes a path past the 260-char limit,
   the command reports **"Filename too long"** — but the worktree is **already gone from
   git's list**. Re-running it fails differently, and the obvious reading is that the removal
   did not happen. Finish with a long-path delete, then `git worktree prune`. *(Found by the
   renumber lane while cleaning up.)*

   7u. **The migration-number discipline held under pressure, tested by a lane outside the
   original collision.** `0073_messaging_time_precision` correctly **skipped** foundation's
   unlanded `0069`–`0072` rather than taking the next number visible in `ls drizzle/` on
   main. That is rule 2 working in the case it was written for: a number held on another
   worktree, invisible to a fetch, respected anyway.

   7r. **"Beneath" and "above" are backwards from how they feel. The runner sorts by
   FILENAME, so a HIGHER number applies LAST.** The governor asked a lane to verify with
   `0073` "beneath" them; `0073` is numerically above `0069`–`0072` and therefore applies
   **after** all four. That made the run stronger than requested, not weaker — a `MODIFY` of
   populated timestamp columns landing *after* four ALTERs on `users`, `tokens`,
   `quest_claims` and `gratitude_log` is the riskier order, and it is the interleaving
   nobody had proven. **Say "applies first/last", never "beneath/above".**

   7s. **An amend moves the SHA, so a build marker stamped before it describes a commit that
   no longer exists.** `scripts/build-server.mjs` stamps the marker from the git SHA. A lane
   amended a merge message *after* building, which silently left `dist/index.js` claiming a
   commit that had been replaced. **Rebuild after any amend, rebase or squash, and verify the
   marker matches `HEAD` rather than assuming it rebuilt.** *(Caught by the foundation lane
   on themselves.)*

   7o. **`scripts/verify-migration-on-data.mjs` is the only thing that proves an apply
   ORDER.** Static reasoning about column-disjointness says a migration *should* be safe;
   the verifier applies the real sequence to **populated** tables and says whether it is. Run
   it with every pending migration beneath you, not just your own.

   Proven on `9645381`: `verify-migration-on-data.mjs 0066 0067 0068` exits 0 — 63 migrations
   applied to the cut, rows seeded so the new ones meet real data, no seeded row lost.

   **The risk it actually retires**, worth knowing so the run is not treated as ceremony:
   `0068` is `ALTER TABLE ADD COLUMN` against a `quests` table that already has rows, and the
   classic failures are exactly that shape — **NOT NULL without a default, UNIQUE over
   existing duplicates, a MODIFY that narrows past what is stored.** Every column it adds is
   nullable, which is why it survives. `0067` is `CREATE TABLE IF NOT EXISTS` throughout and
   was never at risk. *(Gap identified by the foundation lane about their own run, closed by
   the quests lane.)*

   7n. **A red run at the top of `gh run list` names the LAST PUSHER, not the cause.**
   When `main` is already red, every subsequent lane inherits the failure and CI shows *their*
   SHA at the top of a failing run. Anyone reading the list afterwards sees the newest lane
   against a red mark and reasonably assumes they broke it.

   On 2026-08-11 the red began at `13cc2f6` (messaging, whole-second timestamps) and was
   inherited by `18f0c2f` and by every lane landing behind it — **including a 22-commit
   foundation round whose four migrations had nothing to do with it.** Last green: `f4c85ff`.

   **Before blaming the newest commit, find the FIRST red run and bisect from there** — the
   list is ordered by push time, not by causation. And when landing onto a known-red main,
   **say so in the commit body**, so the next person does not spend an hour in migrations
   that were never involved. *(Flagged pre-emptively by the foundation lane, about their own
   landing.)*

   7l. **"794 passed" cannot distinguish a deterministic pass from a lucky one.**
   `0066` declares `created_at` and `last_message_at` as plain `timestamp` — **MySQL stores
   whole seconds** — and `messaging.ts:521` orders on both with no unique tie-breaker. Two
   conversations messaged in the same second tie twice and MySQL returns either order. The
   messaging lane's local suite passed 52 files / 794 tests / 0 skipped; CI failed the same
   test. **Neither run was wrong: it is a coin flip on whether two inserts straddle a second
   boundary.**

   **A green suite tells you the assertions held ONCE, on that scheduling, on that clock.**
   For anything whose correctness depends on ordering, timing or concurrency, a pass is a
   sample, not a proof. *(Self-identified by the lane whose suite got lucky.)*

   7p. **A STABLE tie-break is not a CORRECT one, and the wrong one fails deterministically
   half the time while looking like a fix.** `messaging.test.ts` asserts a **semantic** order
   — `toEqual([newer.id, older.id])` — not merely a repeatable one. So appending any unique
   column would have made the sort total and the test deterministic, while **moving the coin
   flip from the clock to id generation**: deterministically wrong on about half of all id
   pairs. Worse than the bug, and green on a re-run.

   `c.id DESC` is correct **only** because `newId` in `messaging.ts` is
   `` `${prefix}-${Date.now()}-${random}` ``: the epoch-ms segment is 13 digits and stays
   fixed-width until **2286-11-20**, so lexicographic DESC *is* numeric DESC on creation
   time. **That fact lives ~400 lines from the query and is invisible at the call site.**

   **And it is not portable.** `server/lib/orgChart.ts` defines its own `newId` as
   `` `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}` `` — same name, different
   format. **Two `newId` implementations exist with different sort properties**, so "ids sort
   by creation time" must be re-checked per module, never assumed.

   This is the argument for `0073`: `last_message_seq` depends on a monotonic column, not on
   a coincidence of id formatting that a future refactor could silently remove.
   *(Near-miss caught by the messaging lane before shipping; the second `newId` found while
   verifying it.)*

   7q. **Repeating a test on the condition where the bug HIDES is a regression check, not
   proof of a fix.** The governor suggested five consecutive local passes as "stronger
   evidence" for the ordering fix. **That was wrong in kind, not degree**: the *old* code
   also passes on a quiet host — that is exactly what the split verdict on one SHA proved.
   More passes on the easy condition add confidence about nothing in doubt.

   **The argument for a fix like this is STRUCTURAL, not statistical.** A total sort means
   the comparator can never reach "engine's choice" for any input, at any precision, under
   any load: determinism becomes a property of the query rather than of the scheduling. Then
   the verdict that matters is the condition where it actually failed — here, CI.
   *(The governor's suggestion, corrected by the lane it was given to.)*

   7m. **HOUSE TRAP — narrowing a race is worse than leaving it, if it stops failing
   honestly.** The governor recommended `timestamp(3)` for the above. **That is the wrong
   fix**, and a lane argued it down: precision narrows the tie window from 1000ms to 1ms
   **without closing it**. The sort is still not total, so the production bug survives in a
   narrower window while the test starts passing reliably — converting a coin flip that
   fails half the time into **a rare flake that fails once a fortnight with no
   reproduction**, which is strictly harder to diagnose than what it replaced.

   **Make the sort TOTAL — append a unique column — rather than making the tie rarer.**
   And note `0066`'s own header had already rejected timestamps for this exact reason:
   *"messages carry `seq` … it never turns on a timestamp tie or on the ordering of a random
   id suffix."* The table already had a tie-free ordering source; read state used it and
   inbox ordering did not. **The document that describes the feature had the answer before
   anyone looked.**

   7i. **A gate that cannot observe your change produces a number that is not evidence.
   Declare the skip; do not run it for the look of it.** A markdown-only commit ran no
   tests: `check-voice` scans `client/src`, `server`, `shared`, `docs/knowledge` and reports
   0 files for `docs/`; brand-refs treats `docs/` as a declared home; no test references the
   file; `tsc` and `build` cannot see it. Running the suite would have produced a pass count
   that proved nothing about the change — **the same failure shape as the
   585-passed-219-skipped run**, arrived at from the opposite direction. The lane listed
   which gates it skipped and why **in the commit body**. That is the honest form.

   7g. **A PIPE REPLACES THE EXIT CODE YOU ARE READING. Three times tonight a shell said
   green when the truth was red.** `$?` is the *last* command in a pipeline, not the one you
   care about:

   ```
   npx tsc -p tsconfig.tests.json | head -8   # $? is HEAD's. Prints 0. tsc exited 2.
   pnpm audit ... | tail                      # $? is TAIL's.
   cmd 2>/dev/null || echo "not found"        # error swallowed, fallback asserts a fact
   ```

   Plus a fourth shape with no pipe at all: **vitest reported exit 0 with `1 failed` in the
   log.** So neither the exit code nor the summary line is sufficient on its own.

   **Run the command bare, read `$?` immediately, and read the LOG as well.** Where both are
   available and disagree, the log wins. *(Two instances self-caught by the foundation lane,
   one by the renumber lane.)*

   7x. **`pnpm install --frozen-lockfile` exiting 0 does NOT mean `node_modules` is intact.**
   It means the lockfile matches `package.json`. A **dangling symlink inside `.pnpm`** —
   observed as `sharp@0.35.3/node_modules/@img/colour` pointing at a target that was not
   there — passes gate 1 cleanly and then fails a suite forty minutes later with
   `Cannot find module .../@img/colour/index.cjs`, which reads like a missing package.
   **`pnpm install --force` is the repair.** Fourth distinct instance today of *a green that
   covers only what the check actually examined*, and the first at the package-manager layer.
   *(Found by the foundation lane.)*

   7z-b. **A CHECKER THAT CAN SKIP MUST REPORT WHAT IT SKIPPED.** The governor's contrast
   script parsed only `rgb()`. This design system is **`oklch()`/`oklab()` throughout**, so
   `parse()` returned null on every heading and **silently skipped them** — then reported
   **"0 contrast failures" on a page whose `<h1>` measured 1.00:1**, identical luminance to
   its background.

   **The tool did not say "I cannot read this." It said "there is nothing wrong."** That is
   the whole defect, and it is the same shape as every other trap today, one layer down at
   the *measurement* layer.

   Two fixes, and the second is the general one:
   - **Normalise any CSS colour through a canvas** before measuring
     (`ctx.fillStyle = css; getImageData()`), which resolves `oklch`, `oklab`, `hsl` and
     named colours to sRGB alike.
   - **Any checker with a parse step must count and surface its skips.** A silent skip
     converts "unmeasured" into "passed", which is worse than an error.

   *(Rule articulated by the foundation lane, about the governor's tool, and rated by them
   above the defect it hid.)*

   7z-c. **Building against a theme the site does not have produces a defect AND a layout,
   and they look unrelated.** One page was built imagining near-black cards; the site renders
   a light parchment skin. That single wrong mental picture produced *both* cream text at
   1.00:1 *and* a dark-screen hero placed below a large pale heading. Fixed as one cause
   rather than four symptoms. **When several findings on one surface look independent, check
   whether they share a wrong assumption about the environment.**

   7z. **A rule can exist, be written down, and still be broken — because nobody read the
   doc it was in.** `SITE_HANDOFF_ROUND2_2026-08-08.md` contained, three days before tonight's
   collision: *"next free migration number re-checked against origin/main at that moment
   (parallel sessions push; 0059 was yours, do not assume 0060 is free)."* **That is exactly
   rule 2, written in advance, in a doc on the deletion candidate list.**

   The failure was never that the rule was unknown. It was that it lived in a handoff nobody
   opens. **A rule is only as good as its distance from the work** — which is the argument
   for one ledger read before every write, over a pile of documents each true in its moment.

   7z-a. **"Marginal" is worse than "broken", because it passes when you check it.**
   `messaging.routes.e2e` PASSES alone at rest — provisioning fits and the `/health` wait
   still has room. It fails only under concurrent load. So it is **not reliably red; it is
   reliably red when something else is running**, which reads as flake and, worse, means
   *the owner will see it pass locally and disbelieve the report.* The computed floor is
   still the fix. *(Refined by the foundation lane after reproducing it clean.)*

   7y. **HOUSE TRAP — an e2e hook budget must exceed provisioning PLUS 180s, and one suite
   does not. CI cannot catch it.** `vitest.config.ts` states the rule in its own comment: the
   hook does two slow things *in series*, provisioning a scratch schema and then waiting for
   `/health`, and **the second has its own 180s deadline inside the file**. So
   `hookTimeout > provisioning + 180s`.

   | suite | budget |
   |---|---|
   | `server/messaging.routes.e2e.test.ts:159` | **180_000** — the `/health` deadline alone, zero for provisioning |
   | `server/quest-share.e2e.test.ts` | 300_000 |
   | `examples.routes.e2e`, `mapPromise.routes.e2e`, `loop.e2e` | no override — inherit **600_000** |

   At **67 migration files × ~1.25s = ~84s** of provisioning, today's floor is ~264s. The
   messaging suite has been below it since it landed in `13cc2f6`.

   **CI passes it and the hosted database fails it** — CI runs MySQL as a local service
   container where provisioning is fast, so the usual asymmetry is REVERSED and green CI
   cannot protect anyone from this class. **Provisioning grows with every migration and never
   shrinks**; four landed tonight. *(Surfaced by the foundation lane as a suspected contention
   timeout; the budget is the cause and contention only the trigger.)*

   7v. **HOUSE TRAP — `tsc` is INCREMENTAL here, so a local run can report an error that no
   longer exists, and by symmetry miss one that does.** `tsconfig.json` sets
   `"incremental": true` with a shared `tsBuildInfoFile` under `node_modules/typescript`. A
   **warm** run does not re-check files whose dependencies did not change — **even after a
   `compilerOptions` change.** Observed: run 1 cold found 8 errors; run 2 warm reported a
   phantom TS2802 in a file that had not been touched and was already fixed; run 3 cold was
   clean.

   **Delete `node_modules/typescript/tsbuildinfo` before trusting any local typecheck, or
   trust only a cold run.** CI is safe because it always starts cold — which means **the
   local answer and the CI answer can disagree in either direction.**
   *(Found by the renumber lane while clearing the test config.)*

   7w. **`tsconfig.json` sets no `target` at all**, so typechecking runs at the ES5 default
   and refuses to iterate a `Set` or `Map` (TS2802). The test config sets `target: es2022`
   for itself alone, deliberately, so `pnpm check` behaviour is untouched. **The base config
   having no target is the actual gap** — fixing it there moves the main gate and is a
   separate change. Queued, not done.

   7h-RESOLVED. **`tsconfig.tests.json` is CLEAN as of `f8d4815` — and clearing it found a
   real production bug that no gate could see.** `exit=0, 0 errors` verified on main.

   Seven of the eight were test factories fallen behind their types: `OrgRole` gained six
   recruitment-pack fields in `0049` and `OrgAssignment` gained `isExample` in `0046`, but
   the missing keys arrived only through a spread of `Partial<T>`, so each typed as possibly
   `undefined` rather than failing loudly.

   **The eighth was not a test problem.** `SHELF_BUDGET` is `as const`, so `SectionQuery`'s
   `budget?: Partial<typeof SHELF_BUDGET>` typed every override as **the literal default it
   was meant to replace** — `{ maxTokens: 400 }` rejected as not assignable to type `2500`.
   **A configuration option that structurally could not be configured, at any call site**,
   and invisible to every gate because the only caller exercising it is a test. Fixed as
   `Partial<Record<keyof typeof SHELF_BUDGET, number>>`: keys stay tied to `SHELF_BUDGET` so
   a misspelling still errors, values become numbers.

   Also: the test config sets `target` explicitly, because `tsconfig.json` omits it and the
   ES5 default refuses to iterate a `Set` or `Map` (TS2802). Set there alone so `pnpm check`
   is untouched.

   **The lesson is the one the file was written for:** `pnpm check` excludes `**/*.test.ts`,
   so the only code path exercising an option can be the one nothing typechecks. Debt in a
   gate nobody runs is not dormant — it grew from 3 to 8 while unwired, and it was hiding a
   live defect.

   *(Cleared by the renumber lane, from a closed lane offering spare capacity.)*

   7h-ORIGINAL. **`tsconfig.tests.json` exists on `main`, is OPT-IN, and is RED — and its own header
   understates by more than half.** It typechecks `**/*.test.ts`, closing exactly the gap
   rule 6 describes. It is wired into **neither** `ci.yml` nor `package.json`, so it blocks
   nothing. Its header says it reports *"three pre-existing errors in
   `server/lib/knowledge.test.ts`"*. Measured on `origin/main` 2026-08-11: **7 errors across
   4 files** — `knowledge.test.ts`, `orgJournal.test.ts`, `orgLoad.test.ts`,
   `seatLapse.test.ts`, mostly `undefined` not assignable to `string | null` / `boolean` on
   `OrgRole`.

   **The debt more than doubled while nothing ran it**, which is simultaneously the argument
   for wiring it and the reason it cannot be wired today: four lanes are mid-landing and a
   new blocking gate would stop all of them. **Governor decision: do NOT wire during the
   landing round.** Wire it after the queue drains, with the four owning files cleared
   first — exactly as its own header instructs.

   7f-CORRECTED. **CONCURRENT SUITES ARE SAFE BY DESIGN. The governor serialised them
   against a collision the code already prevents.** Verified on `origin/main`:

   ```
   testDb.ts:31   process.env.TEST_SCHEMA || `village_test_${RUN_STAMP}_${++provisionSeq}`
   testDb.ts:8    "It used to be a fixed `village_test`"        <- documented as HISTORY
   loop.e2e:13    const PORT = 3781 + (process.pid % 2000)      <- was fixed 3781
   ```

   The scratch schema is **unique per provision** (`village_test_<epoch>_<pid>_<n>`), stale
   siblings are reaped by embedded epoch rather than by DROP/CREATE so *"a parallel run's
   schema, minutes old, is never touched"*, the loop-test port is derived from the pid, and
   test-user emails are port-suffixed. **Schema, port and identity all fail to collide.**
   Both fixes postdate the incidents their own comments record.

   **What survives, and it is only half:** concurrent suites remain **slower**, because they
   share one MySQL server's I/O. Provisioning costs roughly 1.25s per migration file and the
   count only grows, so **a hook timeout under concurrency is arithmetic, not corruption.**

   **So: run suites concurrently. A timeout under load is a load symptom — re-running solo
   is a diagnostic, not a repair.** Do not hold a lane for schema safety; that cost real time
   tonight, most visibly foundation waiting on quests.

   **`docs/ARCHITECTURE.md:1323` is stale and is where both of us got it** — it still says
   the schema is "`village_test` — fixed, brand-free" and "DROP/CREATEs it every run". Fix it
   in the doc-cleanup pass. *(Caught by the override lane, who also declined to kill the two
   live suites once they knew.)*

   7f-ORIGINAL, kept for the reasoning that was right:
   **SERIALISE THE SUITE, NOT THE PUSH. The governor locked the wrong resource.**
   The landing queue serialised *pushes*, which take seconds, while leaving *suites* — which
   take an hour — to run concurrently against one shared MySQL host. Two lanes ran full
   vitest runs simultaneously (started 10:42 and 10:53) and both crawled: `mapPromise.routes.e2e`
   at **193,645 ms**, `orgForget` at **98,197 ms**. That contention is the documented cause
   of hook and boot timeouts here, so each lane could have taken a **false red from the
   other's load**, then re-run to clear it *under the same contention* and chased it for
   hours.

   **Standing rule: one suite at a time against the shared host. And any red reported while
   another suite is running is SUSPECT until re-run quietly** — contention produces false
   reds, never false greens, so a green under contention is trustworthy and a red is not.
   Known shapes: hook timeouts, boot timeouts, and the S33-S35 exchange ceiling (38s, 61s
   and >120s on *identical* code against a 120s limit).

   **Do not kill a run to fix this.** `TaskStop` does not stop vitest here — it kills the
   wrapper while `vitest.mjs`, the tinypool workers and any booted `dist/index.js` keep
   going. You lose the progress and keep the load. Enumerate survivors by **command line**,
   never by process name. *(Contention spotted by the messaging lane, from the process list.)*

   7d. **`check-auth-fetch.mjs` exits 1 in any worktree without `node_modules`** — it
   imports `typescript`, so the failure is `ERR_MODULE_NOT_FOUND`, not a real gate failure.
   **Every lane is now building in throwaway worktrees on the governor's instruction**, so
   a lane running gates before `pnpm install` will read a red gate and chase it. Install
   first, and read *why* a gate failed rather than only its exit code.

   7e. **Topic-matching is not attribution, and it is the third way the governor got
   ownership wrong.** Rule 3a says branch residency does not identify a lane and git
   authorship cannot (every commit here is `Rye`). Add: **a commit that solves your
   lane's problem is not therefore your lane's commit.** The governor attributed `d3ba57e`
   (the nanoid fix) to the nanoid lane purely because the subject matched — that session
   had authored **zero commits in any tree**, and `d3ba57e` predates it by hours
   (authored 2026-08-10 22:29:28). Two independent lanes solved the same advisory three
   days apart, neither aware of the other. **Ask the lane. Do not infer from the topic.**

   7c. **A byte-identity triage sorts NEW files correctly and silently mis-sorts MODIFIED
   ones.** The governor classified the shared tree by "is this identical to main", which is
   the right question for untracked files and the wrong one for tracked ones whose base is
   stale. `server/index.ts` in that tree is **2685 lines behind main**; a lane following the
   classification literally would have deleted that much landed work inside a commit that
   looked like a feature addition. **Transplant your own hunks onto main's version; never
   copy a modified shared file wholesale.** *(Caught by the quests lane.)*

---

## 2 · Lane registry

Worktree assignment is **inferred from session titles and working-tree contents** — every
Amora session's `cwd` is the parent directory, not its worktree. Correct your own row if
this is wrong.

| # | Lane (session title) | Worktree | Branch | vs origin/main | State |
|---|---|---|---|---|---|
| 1 | Foundation build: characters, profile, economy | `scratchpad/ga-foundation` | `wt/foundation-economy` | **0 behind, 18 ahead** (merged `00c1cfa`) | active — 8 of 9 gates green on the merged tree, full suite running. Capability sets IDENTICAL by `diff`, not by count. Migrations `0069`–`0072`. See blocker 6 |
| 2 | Living Map mount and Events module | isolated, off clean `origin/main` | — | **merged** | **MERGED — nothing to land.** `34a51f0`, `d7c718f`, `fd83aa3`, `7b0e73e`, `ef04f43` on main and deployed. Needs no migration number. Left `ga-map`. |
| 3 | Mobile map UX/UI fixes | `wt-roundE` *(own, detached)* | detached from `origin/main` | 0 ahead — **landed** | active — shipped `29d689b` + `37213df` to main, both deployed |
| 4 | Group messaging substrate | isolated, off `origin/main` | `msg-last-seq` @ `3d31c89` (rebased) | **0 behind, 1 ahead — HELD, awaiting your release** | **ON MAIN:** substrate `13cc2f6`, write-up `18f0c2f`, ordering fix `c9efaef`, audit + id-format notes `8bf3408` / `15de5c3`, hook budget `ea6cd44`. Migrations `0066` + `0073`. **HELD:** one commit, `0074_messaging_last_message_seq` — the seq key you and lane 5 argued for. REBASED onto `47e5cd0` clean (zero conflicts over 46 commits; nothing outside messaging touches those files). Re-verified on the new base: install --frozen-lockfile, check, tests typecheck, brand, voice, build all green; messaging + client **63/63**; **loop.e2e 58/58**. `0074` re-swept at rebase time, still free. **Release me and I push; say no and I drop it** — it is an improvement, not a fix. See blocker 0 (lane 4) |
| 5 | Messaging merge / draftKinds tsc break | `scratchpad/rebase-messaging` *(isolated, retained)* | `voice-sweep-rebased` — **merged, 0 ahead** | — | ✅ **COMPLETE. Landed `13cc2f6` and nothing else.** Capability surface **20/20/20** verified on main after the push. Ordering defect it carried was fixed by the substrate lane in `c9efaef` + `0073` — **NOT by this lane** (see 3d). Worktree kept for QA follow-up; branch is fully merged, so ignore it in sweeps. |
| 6 | Renumber 0054_quest_story.sql | `game-amora` *(shared)* | `voice-sweep-2026-08-01` | 67 behind, 2 ahead | **done** — 0054 → 0068 |
| 7 | Quests technical digest | `game-amora` *(shared)* | `voice-sweep-2026-08-01` | 67 behind, 2 ahead | active |
| 8 | Grounds prototype camera and badges | `ga-map` / prototypes | `wt/map-events` | — | idle |
| 9 | Living map page plan review (D8 publish round, `0063`) | `ga-map-integrate` *(own, isolated)* | `wt/publish-clean` @ `88fb568` | 0 ahead — **LANDED + DEPLOYED** | **DONE. Nothing unlanded.** `88fb568` on main; `/health` reports `2026-07-28-wave1-88fb568`; the served artifact `/grounds/grounds-a1d87aa9f562.html` carries `BUILD_VERSION='v0.8-publish'`. Verified byte-identical: all 9 of my files match `origin/main` exactly, and `aa34666`'s artifact blob **is** main's blob (`556808c`). `wt/publish-integrate` is now BEHIND main and holds no unlanded content of mine. **Lane 5: rebase onto `88fb568`, expect 20 keys vs 20 union members.** |
| 10 | Maia custom game database | `scratchpad/replay` | `claude/maia-brain` | 2 behind, 0 ahead | idle |
| 11 | CI dependency-audit gate (nanoid) | `.claude/worktrees/intelligent-…` | `claude/intelligent-…-74112a` | 13 behind, 0 ahead | active — gates the train |

**Four lanes (4, 6, 7 — and formerly 5) share one working tree** on
`voice-sweep-2026-08-01`, which is where the 54 uncommitted files come from. That is now
the highest-collision surface in the swarm; rules 1 and 4 exist for it.

**Two lanes have escaped shared trees, and both did it the same way.** Lane 5 moved to an
isolated worktree to rebase; lane 2 moved out of `ga-map` mid-round and rebuilt on a clean
`origin/main`. Lane 2's reason is the one worth generalizing: **pathspec discipline stops
working once the collision moves inside the files.** Another lane was editing
`scripts/import-map-scene.ts`, `client/src/pages/LivingMap.tsx`, `server/index.ts` and
`shared/capabilities.ts` while lane 2 had uncommitted work in all four. Staging by name
cannot separate two lanes' edits to the same file.

**Standing guidance: if you and another lane have uncommitted work in the same file, do
not negotiate pathspecs — move to an isolated worktree off a clean `origin/main` and
rebuild.** It costs a rebase and it is the only thing that actually works.

**✅ `0063` ownership RESOLVED — lane 9 claimed it.** Lane 2 and lane 3 both moved out of
`ga-map`; lane 9 works in `ga-map-integrate` and is landing `19842af` + `983f761` as one
squashed commit. Three lanes disclaimed it and two misattributed it from branch residency
before content settled it (rule 3a). It was one `git clean` from lost before being backed
up to `origin/backup/map-events-0063-2026-08-11`.

**Landing order is fixed: lane 9 first, then lane 5.** Both modify `shared/capabilities.ts`
and `shared/draftKinds.ts`; `CAPABILITY_CONSEQUENCE` is exhaustive, so simultaneous landing
reds `main` on `tsc`. Lane 9 is mid-flight, lane 5 is parked, so lane 9 goes first and
lane 5 rebases onto their SHA. Lane 5's 18-against-18 becomes 20-against-20 once
`map.edit` and `map.publish` arrive.

---

## 3 · Migration registry

`origin/main` high-water mark: **0062**. True swarm-wide high-water across all three
holding mechanisms: **0072**. Verified 2026-08-11 after fetch, by remote ref, local ref,
and on-disk sweep.

| Number | File | Lane | Status |
|---|---|---|---|
| 0063 | `map_scene_publish` | **9 (scene-storage / D8 publish round)** — confirmed 2026-08-11 | ✅ **ON MAIN** in `88fb568`. Claim is now visible to every fetch. `origin/main` high-water moves 0062 → 0063 |
| 0064 | — | — | **FREE** |
| 0065 | — | — | **FREE** |
| 0066 | `messaging` | 4 (group messaging) | committed + pushed on `voice-sweep-2026-08-01` |
| 0067 | `quest_crews` | 7 (quests) | untracked on disk in `game-amora` |
| 0068 | `quest_story` | 6 (renumber) | untracked on disk — renumbered from 0054 ✅ |
| 0073 | `messaging_time_precision` | 4 (group messaging) | ✅ **ON MAIN** in `c9efaef`. Fix-forward for 0066: `timestamp` → `timestamp(3)` on `messages.created_at`, `conversations.created_at`, `conversations.last_message_at`. Swept immediately before writing: 0072 was the high-water across every ref, 0067 held untracked on disk |
| 0069 | `characters` | 1 (foundation) | pushed on `origin/wt/foundation-economy` |
| 0070 | `profile_body` | 1 (foundation) | pushed on `origin/wt/foundation-economy` |
| 0071 | `economy_core` | 1 (foundation) | pushed on `origin/wt/foundation-economy` |
| 0072 | `voice_claims` | 1 (foundation) | pushed on `origin/wt/foundation-economy` |

**Next free number: 0073.** Claim it here before you create the file.
0064 and 0065 are free but out of sequence; prefer 0073+ unless you have a reason.

`0052_village_brain.sql` and `0053_assistant_drafts.sql` sit untracked in `game-amora` and
are **byte-identical to the copies already on `origin/main`**. They are harmless as
content but will block `git merge origin/main` ("untracked working tree files would be
overwritten"). Delete the local copies before that merge; do not commit them.

---

## 4a · Capability surface registry

> **⚠ CORRECTION 2026-08-11 — an earlier version of this section was recorded INVERTED and
> acting on it would have broken `main`.** It said "main's `draftKinds` is missing four
> entries relative to the shared tree's copy". **The opposite is true.** Verified:
>
> ```
> origin/main   capabilities 19   consequences 19   gap: none, balanced and healthy
> shared tree   main has and the tree LACKS: event.manage, event.rsvp, map.edit, map.publish
>               tree has and main lacks:     message.send
> ```
>
> The obvious action on "main is missing four" is to copy the tree's file over main's. That
> would **delete four live entries** from `CAPABILITY_CONSEQUENCE` while `Capability` still
> declares them, and since the type is exhaustive, `tsc` fails immediately. The shared
> tree's `draftKinds.ts` is a stale 16-entry snapshot with `message.send` hand-added — it is
> not the authoritative copy of anything.
>
> **Never quote a capability count from this file. Check it.** Every lane that adds a
> capability moves it, and every number here is stale on arrival — including the one a lane
> gave in good faith earlier the same evening:
>
> ```
> git show origin/main:shared/capabilities.ts | grep -oE '"[a-z]+\.[a-zA-Z_]+"' | sort -u
> git show origin/main:shared/draftKinds.ts | sed -n '/CAPABILITY_CONSEQUENCE/,/^};/p' | grep -oE '"[a-z]+\.[a-zA-Z_]+"' | sort -u
> ```
>
> The two lists must be **identical**. Comparing the lists is the check; a count is not.
> *(Caught by the Maia lane, who also retired their own earlier 17/17 figure as stale.)*
>
> **⚠ THERE IS A THIRD LIST, AND IT IS THE ONLY ONE THAT FAILS SILENTLY.**
> `ALL_CAPABILITIES` in `shared/capabilities.ts` is a hand-maintained **value array**.
> `Record<Capability, string>` constrains `draftKinds.ts`, so `tsc` catches a mismatch
> there — but **nothing constrains the array**. A union member missing from it is silently
> **ungrantable by badges**, with no type error, no test failure and no gate. Set-compare
> **all three**:
>
> ```
> union members  ==  CAPABILITY_CONSEQUENCE keys  ==  ALL_CAPABILITIES
> ```
>
> *(Found by the messaging lane while doing the two-way check I asked for, and adding the
> third of their own accord.)*
>
> **Every count quoted in this file has been wrong at least once**, including by the
> governor. On 2026-08-11 three lanes measured 18, 19 and 20 within the same hour — all
> three correct for their own base. **Do not quote a number. Run the diff.**

`shared/capabilities.ts` and `shared/draftKinds.ts` must stay in lockstep:
`CAPABILITY_CONSEQUENCE` is `Record<Capability, string>`, so it is **exhaustive in both
directions**. A union member with no consequence entry is TS2739; a consequence key with no
union member is TS2353. Two lanes are adding keys right now, which makes this the sharpest
collision surface in the swarm after migration numbers.

Measured against `origin/main` @ `a945c92`, by comparing **key sets, not counts**:

| Source | Keys | Delta |
|---|---|---|
| `origin/main` | 17 | — |
| lane 9 (`19842af`) | 19 | `+ map.edit`, `+ map.publish` |
| lane 5 (`8341cb4`) | 18 | `+ message.send` |
| **projected after both land** | **20** | — |

**If either lane measures anything other than 20/20 after the second rebase, the conflict
resolution dropped something.** Stop and escalate rather than pushing. Resolution in both
files is keep-all, the same shape as the earlier `event.rsvp` / `event.manage` resolution.

**Count the sets, not the totals.** Lane 5's file was stale in a way a count could not see:
it had the right *number* while missing `event.rsvp` and `event.manage` and adding one of
its own. Lane 9's, despite being based on a superseded cut, carries main's full set — the
same check cleared one and condemned the other.

---

## 4 · Shared-file ownership

Serialize through the governor. One owner per file.

| File | Owner | Note |
|---|---|---|
| `server/db/schema.ts` | governor | every lane wants it; queue changes |
| `client/src/App.tsx` | governor | route registry, three lanes touching it |
| `shared/capabilities.ts` | governor | ONE capability gate; never gate elsewhere |
| `shared/draftKinds.ts` | lane 5 **and** lane 9 | **State differs by worktree.** TRACKED from main with the `message.send` line added on BOTH `voice-sweep-rebased` and `voice-sweep-2026-08-01` @ `33db103` (both now balance 20 union / 20 consequence keys, all five of `message.send`, `map.edit`, `map.publish`, `event.rsvp`, `event.manage` present — verified by `git show` on each ref). Still UNTRACKED in the shared `game-amora` tree, where it is STALE: it carries `message.send` but is missing all four of the others, so committing that copy from the shared tree deletes live entries and reds tsc in the opposite direction. **Do not commit it from the shared tree, and do not delete it there either** — `server/index.ts`, `server/lib/drafts.ts` and `server/lib/drafts.test.ts` all import it, so deleting breaks tsc for the lane that owns those. It is replaced by main's version on the next pull. Two pockets, one exhaustive list — see blocker 4. |
| `docs/prototypes/grounds-v0.html` | **the patch scripts, not the file** | 5.4 MB generated artifact carrying two lanes' uncommitted work. Do not commit it directly: pushing a shared generated file publishes every lane's edits inside it. Own the *scripts* and replay them — lanes 2 and 3 independently replayed onto the same base and got byte-identical output (sha256 `86408222b7bf…`). Generalizes to any generated file two lanes touch. |
| `shared/gameVariables.ts` | lane 1 | behaviour plane |
| `server/lib/events.ts` | lane 2 | the events spine |
| `drizzle/*` | governor (numbers) | content by lane, number by registry |

---

## 5 · The gate set

Read from `.github/workflows/ci.yml` on `origin/main`, **re-read at `f4c85ff`**.
**These TEN block CI, in this order:**

```
pnpm install --frozen-lockfile
pnpm check                            # tsc --noEmit (does NOT cover *.test.ts)
node scripts/check-brand-refs.mjs     # brand ratchet — read $?, last line is blank on fail
node scripts/check-voice.mjs          # house writing rules
node scripts/check-auth-fetch.mjs     # auth guard — wired into CI at ef04f43
node scripts/check-artifact-budget.mjs  # living map artifact — wired in at f48ec0f
pnpm build                            # vite client + esbuild server -> dist/
pnpm test                             # vitest run — build FIRST, never -t
#   bundle budget        (inline step, total dist size)
pnpm audit --prod --audit-level high
```

> **This said "nine" for most of 2026-08-11 and the governor quoted nine to four lanes.**
> `check-artifact-budget.mjs` became a CI step at `f48ec0f` and was never added to the
> count. It surfaced only when a lane challenged the CI claim from the opposite direction —
> asserting there were *no* `check-*` steps, from a `origin/main` ref 81 commits stale.
> Re-reading `ci.yml` to refute that found the missing tenth.
>
> **Count the steps in `ci.yml` against a fresh fetch. Do not quote this block from memory,
> including this one.** It is the same failure as the capability counts in §4a, one level up.

The auth guard was a house rule with no CI teeth for about twelve minutes; `ef04f43`
("The auth guard becomes a gate, instead of a line in a document") closed that. **Any lane
more than a few commits behind `origin/main` does not have the script yet and will fail CI
without a local signal.** Pull before you push.

**Two limits on the gates, so a green is read for what it means:**

- `check-auth-fetch.mjs` stays **silent rather than guessing** when it cannot resolve a
  call — headers arriving as a prop, or spread from an undeclared name — and it reads
  `client/src` only. A clean run means "nothing provably tokenless", not "every call
  verified". It does resolve `headers: headers()` when the helper is declared in the same
  file. *(Established by lane 5.)*
- `check-examples.mjs` **requires a live database** — it exits 2 with "need `--url`,
  `DATABASE_URL`, or a `.demo-db-url` file". It is not a static check a lane can just run.
  Do not point it at `TEST_DATABASE_URL`: that shares production's MySQL server, and only
  a separate schema is real isolation. Choosing its target is a governor call.
  *(Established by lane 5, who correctly declined to pick a target unilaterally.)*

`server/loop.e2e.test.ts` boots the **built** `dist/index.js`. Run `pnpm build` first or
you are testing stale code. It is order-dependent: run whole files, never `vitest -t`.

`server/loop.e2e.test.ts` boots the **built** `dist/index.js`. Run `pnpm build` first or
you are testing stale code. It is order-dependent: run whole files, never `vitest -t`.

---

## 6 · Open blockers

6. **Lane 1 / foundation build. Nothing broken-but-unfixed that I know of. Six things live
   QA should know, five of them by design and one a genuine open decision for Rye.**

   a. **Nothing in this lane has been browser-verified.** Every claim I have made is
      static gates plus tests. `/profile/characters`, `/profile`, `/profile/:handle` and
      the new profile sections have never been rendered by me, because they need a seeded
      database and a signed-in session. Treat all four surfaces as unseen, and expect the
      first QA pass to find layout problems no gate can catch.

   b. **The economy write paths are inert until the rules are seeded, by design.**
      `economyReady()` refuses every mint while `mint_rules` is empty, and
      `POST /api/gratitude` answers 404 in that state. The boot seed fills the rules, so a
      normal deployment is fine; a tester who empties the table and sees gratitude
      "disappear" is seeing the guard, not a break. A flag alone was deliberately not
      enough: a village with the flag on and no rules mints nothing while believing it is
      running, and that failure only ever shows up as an absence.

   c. **Two paths write `gratitude_log` and they cap differently. This is the one real
      open decision.** `/api/game/gratitude/send` is the older acknowledgement flow: a
      stage-scaled budget of 100 and `gratitude.max_per_recipient_per_cycle` counting
      SENDS, default 1. `/api/gratitude` is the Hearts economy:
      `economy.giving_allowance_per_moon` 30 and `economy.hearts_per_recipient_per_moon`
      10, both counting HEARTS. Both sum into the same table, so the new route already
      counts what the old one spent, which makes it the stricter of the two and never the
      looser. Safe direction, still an overlap. **Retiring one is Rye's call, not a
      cleanup.** QA will see two different refusal messages for what looks like the same
      action.

   d. **The village voice token rides in thousandths.** `token_ledger.amount` is an INT
      and `postTransfer` truncates, so a rule of 0.1 voice posts 100 with
      `tokens.decimals = 3`. Anything reading a raw balance sees 100 where the chip says
      0.1. `fromLedgerUnits` is the only correct converter. A QA report of "voice is a
      thousand times too big" is a surface reading the raw row.

   e. **Attendance mints nothing, on purpose.** `POST /api/events/:id/checkin` is
      steward-only, refuses self-check-in, and grants badge progress with no currency.
      "Checked in and got no Hearts" is the design.

   f. **P6, P7 and P8 are NOT built.** No Mint admin, no voice-claim bridge, no Hypha
      webhook or poller, no class tags on live quests and roles, and no Inventory or Moon
      Ledger section on the profile. `voice_claims` (0072) is schema and guards only:
      nothing raises an intent yet, and **no Hypha secret is wired** — deliberately not
      the shared `governance_hub_secret`, since anything that can sign a mechanics
      callback could otherwise confirm a value-bearing claim. Do not QA a claim flow;
      there is not one.

   *Resolved, recorded because the hazard is invisible to every gate:* renaming an
   already-pushed migration is safe only while no environment has applied the OLD name,
   and "no environment" includes every scratch schema on the shared test host, not just
   production. Two of mine held stale filenames and would have replayed
   `0069`/`0070`/`0071` into a duplicate-column boot failure. Swept, dropped, re-proved
   (`66 applied / 0 failed`, then `0 applied, 66 previously applied` on a re-run).
   `railway` was never exposed: it stops at `0063` and this branch has never deployed.

0. **Lane 9 / D8 publish round: nothing broken-but-unfixed. Four things live QA should
   know before testing it**, none of them defects:

   a. **The publish UI is desktop-only.** `body.pocket` hides `#buildBtn` outright in
      `grounds-v0.html`, so build mode, the draft bar, Publish, View as visitor and
      Discard are all unreachable on a phone. Pre-existing and not introduced by this
      round, but it means the whole D8 surface cannot be QA'd on mobile. Testing it on a
      phone will look like "the feature is missing".

   b. **A Cartographer badge grants nothing while the badges module is off.** The `0063`
      row is seeded but the gate never consults badges until the module is on, so on a
      default deployment only admins and founders can publish (they outrank every gate).
      A tester awarding the badge and seeing no change is the module being off, not the
      badge failing.

   c. **`GET /api/map/config` now carries the whole published scene**, so its response
      grows with the map (null until a village publishes). Worth knowing for any
      payload-size or cold-boot timing check.

   d. **Publishing is inert until someone holds `map.publish`.** Fresh villages have no
      published scene, so the map draws the artifact's own seed and `liveVersion` is 0.
      That is the designed state, not a failed migration.

0. **Lane 4 / group messaging: MERGED. Nothing broken-but-unfixed. Six things live QA
   should know, five by design and one an open decision for Rye.**

   **Main was red on this lane's test from `13cc2f6` until `c9efaef`, and it was a real
   schema bug rather than a flake.** 0066 declared every timestamp without precision, and
   MySQL stores those as WHOLE SECONDS, so two conversations messaged in the same second
   tied on `last_message_at`, fell through to a `created_at` that was also whole-second and
   equal, and ran out of tiebreakers. The engine returned either order. `0073` gives the
   columns `timestamp(3)` (including `messages.created_at`, the source the cache derives
   from) and the ORDER BY gained `c.id DESC` as a backstop. QA note: this was never only a
   test problem — the same ambiguity reorders a real member's inbox between two loads.
   Diagnosis came from lane 8, who read CI and correctly left 0066 alone as another lane's
   table.

   State: `origin/voice-sweep-2026-08-01` @ `33db103`, **0 behind main, 4 ahead**, merged
   (not rebased) and pushed. All five gates green on the merged tree plus
   `pnpm audit --prod` exit 0, `install --frozen-lockfile` clean, main JS 501 KB of 700,
   `dist/public` 3771 KB of 6000. Tests on the merged tree: `loop.e2e` **58/58**,
   `messaging.test.ts` 32/32, `messaging.routes.e2e` 12/12, client lib 23/23.

   **Do not land both this and lane 5's `voice-sweep-rebased`.** They are byte-identical
   except `docs/SECURITY_ADVISORIES.md` (`git diff` between them is that one file, 26
   insertions). Landing either is correct; landing both double-lands. This branch is the
   same content plus that doc and plus the loop test, so it is the cheaper one to take.

   a. **The module ships OFF.** Absent `module_settings` row = off, so every route answers
      `404 {"error":"module_disabled"}` until an admin enables `messaging` in Admin →
      Modules. A QA pass that skips that step will find the whole surface missing and be
      seeing the framework working, not a break.

   b. **A non-member gets 404, never 403, and that includes admins.** Module off, no such
      conversation, never a member, and left the conversation all answer with the identical
      body. An admin reading a thread they are not in gets it too: admin is the operator's
      key to the deployment and deliberately not a key to private conversations through the
      member API. Moderation reaches bodies through `GET /api/admin/messages/reports`.
      If QA reads 404 as "broken route", that is the designed answer.

   c. **One notification per unread RUN, not per message.** The dedupe key carries the
      recipient's `last_read_seq`, so twenty messages into an unread thread produce ONE
      row, and reading it re-arms the next. Twenty messages producing one bell is correct.
      Muted threads produce none and are excluded from the badge total on both sides.

   d. **No UI for add member / remove member / transfer ownership.** The routes exist,
      are capability-gated and are covered by tests; the thread view exposes only rename,
      mute, leave, delete-own and report. Not broken, just unbuilt.

   e. **Message editing is not built.** `messages.edited_at` exists and nothing writes it.
      Either wire an edit path with a visible marker or drop the column in a later
      migration.

   f. **The open decision for Rye: any member may open a direct thread with any other
      member, and there is no per-member "who may start a conversation with me" control.**
      The remedies are per-conversation mute, leave, the report path, and a warning badge's
      deny suspending `message.send`. The map's `contactable` toggle was deliberately NOT
      overloaded for this, because its own label says "Contactable through the Village Map
      (role holders only)" and silently widening a setting somebody chose under one
      description is the worse surprise. Related: leaving a DM is archiving rather than
      blocking, since the other person writing again reopens it for both. A real block is a
      separate feature.

   Crews (lane 7) consume `createGroup` / `addMembers` / `leaveConversation` behind
   `effectiveLifecycle("messaging") !== "off"`. Those signatures are stable; if they ever
   move, that lane gets a ping.

1. **`.gitattributes` diverges between worktrees, and line endings follow it.**
   `ga-map` carries one version, `ga-map-integrate` and `wt-roundE` carry another, and
   `core.autocrlf=true` everywhere. The same committed file (`0063_map_scene_publish.sql`
   at `19842af`) is **LF in one worktree and CRLF in another**. Consequence: the brand
   ratchet and voice guard can return different answers for the same commit depending on
   which worktree ran them, and merges produce whole-file spurious diffs.

   **Resolution: a canonical gate worktree, not a repo-wide normalization.** With `main`
   taking ~23 commits a day (blocker 5), a normalization commit touching every file would
   conflict with every active lane and be obsolete on arrival. Instead one clean worktree
   cut from `origin/main` is the only place gate results are authoritative. A lane's local
   green is advisory; the canonical worktree's is binding. Repo-wide normalization gets
   done later, when the swarm is quiet, as its own deliberate change.

   Corollary already paid for: lane 5 initially read `0052`/`0053` as differing from
   `origin/main` because `git show … > $tmp` in PowerShell applies CRLF conversion on
   redirect. `git cat-file -p` gives the verbatim blob. **Do not measure file identity
   through a PowerShell redirect.**

   **CRLF-rewrite trap — RESOLVED on main, still live in stale trees.** Corrected twice:
   it was reported as one file (`embed_sprites.py`), the governor relayed it as one file to
   three lanes, and it was actually **six**. Rather than fix the file named, the prototypes
   lane enumerated every python writer of the artifact: `embed_paint.py`, `embed_plate.py`,
   `embed_sprites.py`, `patch_badges_p1.py`, `patch_walklog_atindex.py`,
   `patch_walklog_post.py` — all six read *and* write in text mode, so the translation
   happens twice. Measured on the real artifact with no edit at all: **5438429 bytes in,
   5443660 bytes out, +5231 bytes and a different content hash for changing nothing.**

   **All six are fixed on `origin/main`** (`a945c92`, "Six writers stop rewriting all 5.4 MB
   to say one thing", which also added `patch_newline_safety.py`). Verified: three
   `newline=""` sites in each. **The stale `ga-map` copy sits at `19842af`, before the fix,
   so that tree still has all six live.** Do not warn about `embed_sprites.py` alone —
   a lane that fixes only the file named still has five.

   Note for the canonical worktree: `qa/env.sh` derives `GROUNDS_FILE` from its own
   location, so map suites correctly run against whichever tree invoked them.
   *Owner: governor.*

2. ~~**`message.send` needs its `CAPABILITY_CONSEQUENCE` entry**~~ — **RESOLVED 2026-08-11
   by lane 5.** Rebased as `voice-sweep-rebased` @ `a51a1bd` onto `origin/main` `7b0e73e`:
   one commit, 0 behind, `capabilities.ts` and `draftKinds.ts` in the SAME commit, verified
   18 union members against 18 consequence keys. Unpushed — the branch is a new ref because
   `voice-sweep-2026-08-01` is checked out in the shared tree and cannot be force-moved.

   Two things the original framing got wrong, worth keeping:
   - The untracked `draftKinds.ts` was **stale, not merely missing an entry** — an older copy
     of main's file with `message.send` added and main's `event.rsvp` / `event.manage`
     *absent*. Committing it wholesale would have deleted two live entries. Both directions
     are hard `tsc` failures (TS2739 missing label, TS2353 label with no capability), which
     is why the two files must travel together whichever way the change runs.
   - `af75515` ("Colour carries its own ink") was **already on main** by another path and was
     skipped. `git cherry` did not detect it — 66 commits of drift break patch-id matching.
     Verify duplicates by content.

   Also resolved in passing: main replaced the hand-written nav with `client/src/config/nav.ts`,
   so the messaging nav entry moved there rather than into `Layout.tsx`. *Owner: lane 5.*

3. **Local `main` is behind `origin/main`**, and the `game-amora` checkout sits on
   `voice-sweep-2026-08-01` which is 69 behind. Every lane rebasing off the local checkout
   is building on a stale base. Note `voice-sweep` itself is 0/0 with *its own* remote —
   it is only behind `main`. *Owner: governor.*

4. **`wt/map-events` local diverged from its remote, the remote won, and half the pocket
   is already shipped.** `origin/wt/map-events` was moved onto `main`'s line (`a79bf17`);
   local is 2 ahead of it. Both commits existed on **no remote at all** until 2026-08-11.
   Preserved as `origin/backup/map-events-0063-2026-08-11` and
   `origin/backup/publish-integrate-2026-08-11`.

   **Verified by content, file by file, not by patch-id:**
   - `a1d0028` ("A promise made on the map…") — **all 9 files byte-identical to
     `origin/main`.** It is a superseded earlier cut of `34a51f0`, which lane 2 shipped
     with the client and server wiring this one lacks. **Do not land it.** Landing it
     re-applies shipped work.
   - `19842af` (`0063`) — **genuinely unlanded.** New: `drizzle/0063_map_scene_publish.sql`,
     `server/lib/mapScene.ts`, `shared/mapScene.ts` + tests, the D8 prototype patches,
     `qa/verify_publish.js`. Also modifies `LivingMap.tsx`, `server/index.ts`,
     `import-map-scene.ts`, `FORK_RUNBOOK.md`, `village-map.md`.

   **⚠ Pocket collision:** `19842af` also modifies `shared/capabilities.ts` and
   `shared/draftKinds.ts` — the exact two files lane 5's messaging commit modifies, and the
   pair that must stay consistent because `CAPABILITY_CONSEQUENCE` is exhaustive. It adds
   `map.edit` / `map.publish`. **Whichever of pocket 1 and pocket 2 lands second must be
   rebased on the first and have its union-vs-consequence-keys count re-verified.** Landing
   them independently reds `main` on `tsc` in one direction or the other.
   *Owner: governor.*

5. **`origin/main` is moving fast, and that is the defining fact of this swarm.**
   23 commits since 2026-08-10 noon, timestamped 21:42, 21:54, 21:55, 22:06, 22:07 — lanes
   are pushing to trunk minutes apart. It gained four commits during this session's recon
   alone (`a79bf17`, `7b0e73e`, `ef04f43`, `37213df`).

   Two consequences. **Re-fetch before trusting any divergence number, including every one
   in this file** — they are stale on arrival. And the integration problem is not a queue
   of long-lived branches: most work already lands on trunk directly. What actually needs
   governing is the small set of pockets that *cannot* reach trunk on their own (§7).
   *Owner: everyone.*

6. **The largest thing this site serves to a phone is outside every budget.**
   `docs/prototypes/grounds-v0.html` is the living map: **5.4 MB**, served whole to every
   mobile visitor at `/map`, and no gate watches it. The bundle budget measures
   `dist/public`, and the artifact is served directly from `docs/prototypes` and never
   copied into `dist`, so all three thresholds (main JS 700 KB, total dist 6000 KB,
   per-image 400 KB) look straight past it. CI passed `37213df` on exactly that basis.

   This is the blind spot the budget's own comment describes: *"178 KB of CSS and 1.7 MB of
   images grew entirely unwatched … A gate that cannot see the thing you are adding is not
   a gate."* The artifact is thirteen times the main JS bundle.

   Round F nearly demonstrated it. A second sprite set at generated weight would have added
   **2.7 MB** to a 4.6 MB file, a 59% jump, with nothing to stop it. Quantizing to 256
   colours brought it to **+668 KB** and the difference is not visible at sprite size, but
   that was a lane choosing to measure, not a gate. *(`optimize_wip_sprites.py` carries the
   numbers, and records that resolution is NOT the lever: the sprites are already
   under-resolved at full zoom on a 3x screen.)*

   Suggested shape, deliberately a ratchet and not a cap, since the artifact grows for good
   reasons: a CI step asserting `grounds-v0.html` has not grown more than N% since `main`,
   which fails loudly on a doubling and stays quiet for a round of art. Cheap, and it does
   not need the file in `dist`. *Owner: unclaimed — governor to route. Raised by lane 3.*

7. **Mobile map defects that are real and unfixed**, logged rather than fixed silently, for
   folding into the QA pass:
   - **Light streaks over water**, reported from iOS Safari, seemingly from some icons. Not
     reproduced on desktop Chromium in any zoom or camera I tried. Needs a real device, and
     the useful detail from Rye would be *which zoom* and whether the lines move with the
     land or stay fixed on the screen. The one existing candidate is the surround plate's
     healed capture boundary in the far south-west, which is a known straight edge rather
     than streaks. *Owner: lane 3, blocked on a repro.*
   - **Between zoom 1.0 and 1.6, three to four of fifty map doors sit closer together than
     their own ink width**, so a thumb lands between two marks and can open the neighbour.
     Perfect from 1.7 up and zero elsewhere. No rotation budget clears the low end: fifty
     doors converge and the screen does not hold fifty exclusion zones, so a zoom gate would
     have hidden fifty to fix four. Shipped as a ratchet at its measured size
     (`D2 A1: the crowded low-zoom bands stay within budget`), red if it gets meaningfully
     worse. The cheap lever, if Rye wants it gone, is the `.bmid` boundary: the seal ink
     grows at zoom 1.45 before the ring does. *Owner: lane 3, awaiting a product call.*

8. **The shared test database is the swarm's largest infrastructure risk.**
   `TEST_DATABASE_URL` is remote at ~240ms a round trip and **shares production's MySQL
   server**, with four lanes on it at once. Measured consequences, all real today:
   - `loop.e2e` "S33-S35: the exchange" measured at **38s, 61s and over 120s on identical
     code** against a 120s `testTimeout`. Not a broken test: a ceiling with no margin, which
     fails whenever the shared server is slow. Lane 2 deliberately did **not** raise the
     timeout to make their own push green, which is the right call and the reason we know
     the number.
   - An earlier hook-timeout failure from the same contention.
   - **Eight leaked `village_test_*` schemas** from teardowns that could not run because the
     connection was already gone.

   Only a separate server, or at minimum a separate schema on separate infrastructure, is
   real isolation. Until then no acceptance-suite red is trustworthy on its own — re-run
   before believing it, and never "fix" it by raising a timeout.

   **The leaks are not a missing hook, and the reaper cannot catch up on its own.**
   Lane 5 read `server/db/testDb.ts` and every DB-backed suite: 7 files call
   `provisionTestDb()`, 7 call `.drop()`. Nothing is unbalanced. So the leaks are runs that
   **died before `afterAll` ran** — crash, timeout, or kill under shared-server load — and
   no hook can fix that. Three properties of `sweepStaleSchemas` explain why they persist:
   1. It runs **only inside `provisionTestDb`**. There is no periodic reaper, so if nobody
      runs a DB-backed suite, orphans sit forever.
   2. It matches `village\_test\_%` **only**. `village_qa`, `village_probe` and
      `village_examples` are outside the pattern and can never be reaped automatically —
      three of the eight counted are hand-made, not harness leaks.
   3. It drops only schemas older than 2 hours (deliberate, to protect live parallel runs),
      and the whole sweep is wrapped in a catch that swallows everything so hygiene cannot
      fail the suite. **A permissions problem on `information_schema` would therefore make
      the reaper silently do nothing, forever, with no signal.**

   **Nobody drops a schema unilaterally.** `village_test_*` schemas may hold `0066`/`0067`/
   `0068` mid-run and are not a passing lane's to reap. Lane 5 and the foundation lane both
   declined; that was right.
   *Owner: needs an infrastructure decision from Rye. Raised by lane 2, diagnosed by lane 5.*

9. **Synthetic data — RESOLVED 2026-08-11. Signed-in browser coverage still open.**

   **`walk_log` is cleaned.** The contamination was larger than reported: not one run of
   three rows but **7 rows across 3 sessions** — `live-smoke-1`, `w-msnd3hlr-wpizwl` (the
   one lane 2 knew about), and `w-msnglcr7-ijou4p`. `GROUP BY source` returned exactly one
   row: `source='live'` was the *only* value in the table, so **the entire table was test
   residue with no real visitor data in it**. Lane 2's correctly-scoped delete would have
   removed their own session and left four synthetic rows still poisoning the first report.

   All three deleted, **scoped by explicit `session_key`** — never `WHERE source='live'`,
   which becomes a footgun the moment a real visitor walks the map. Table is now empty, so
   any row that appears from here is real. Rye cleared use of the live database for this;
   the site is not in production yet.

   *Generalizable: a lane reporting its own contamination reports only what it created.
   Nobody was in a position to see all three but the governor.*
   - **One synthetic `walk_log` run is in PRODUCTION** from lane 2's live verification:
     three rows, one run, abandoned at `w2`, `source: 'live'`. It will appear as one
     abandoned walk in the first report anyone runs. Known noise, not a bug — but it must
     be either cleaned or annotated before the numbers are shown to anyone.
   - **Nothing drives a signed-in member through a real shell.** The auth guard closes the
     static half — it proves no client call is provably tokenless — but the live half needs
     a browser test that signs in and drives `/map`. That needs Playwright as a real
     dependency. Until it exists, the signed-in path is covered by nobody, which is exactly
     the shape of the gap that produced the auth guard in the first place: ten route tests
     and none exercising the path the client takes.
     *Owner: governor, folded into the QA pass.*

---

## 6a · `ga-map` — abandoned tree, two files that must never be committed

`ga-map` sits on `wt/map-events`, 21 behind `origin/main` and 2 ahead, and those 2 commits
are superseded versions of work already on main under different SHAs (`19842af` → `88fb568`,
`a1d0028` → `34a51f0`). Three-way divergence on a branch no lane owns. **Treat as
abandoned. Do not push it anywhere.** Preserved at `origin/backup/map-events-0063-…`.

Cleaned 2026-08-11 from 22 dirty files to 2. The mobile map lane removed 17 of its own after
re-verifying each against what shipped, and **stopped when one came back non-identical** —
`qa/_shot_e_pocket.js` had changed hands to the prototypes lane, who made it tree-portable
and landed it as `681bb07`. Deleting on a stale check would have been the exact mistake the
whole ledger warns about. The governor then discarded the remaining four whose content was
already on main.

*Precision, so the record is honest: those four had main's newer content in the working tree
while the abandoned branch's HEAD held older versions, so `git checkout --` moved them
backwards rather than "discarding duplicates". Harmless — nothing ships from this tree and
every version is on main — and it achieves the real goal, which is a tree where an
accidental `git add .` sweeps nothing.*

**The two that remain, both confirmed superseded by their own authors:**

| File | Why it stays dirty and must not be committed |
|---|---|
| `MAP_LANE_HANDOFF_2026-08-10.md` | The site lane's **earlier draft**, superseded by `d7c718f`. Measured: 31 of its 36 non-blank added lines appear nowhere in main's copy, while main already carries `map_key`, the promise route, `0062` and unclaim. Landing it puts a stale second account of the promise round beside the current one. |
| `grounds-v0.html` | `v0.8-roundE` with D8 markers and **no round F**, while main is `v0.8-publish` with round E, F and D8 all in it. **Not any lane's current work and not main's either — a state that no longer exists anywhere on purpose.** |

---

## 6b · THE LANDING ORDER — 2026-08-11, active

> **⚠ REVISED — the strict numeric slotting below was NOT required, and was checked rather
> than kept.** The governor imposed it from the general principle that a lower-numbered
> migration should not land after higher ones touch the same tables. Verified against the
> **live** `quests` table, that principle does not bind these four:
>
> | | |
> |---|---|
> | `0067` | creates `quest_crews`, `quest_crew_members` — touches nothing existing, fully disjoint |
> | `0068` | adds `subtitle`, `story`, `first_step` to `quests`; its only deps are `AFTER title` and `AFTER impact`, **both already present live** |
> | `0069` | adds `archetypes`, `archetypes_suggested` to `quests` — **different columns**, no reference to `0068`'s |
>
> **All four sets are order-independent.** The remaining reason to serialise is only that
> two simultaneous pushes race. **Revised rule: one lane at a time, whoever is ready goes
> next, in any order.**
>
> A general principle is not evidence about specific files. `scripts/verify-migration-on-data.mjs`
> exists on `origin/main` and proves the real apply sequence against populated tables — it
> answers what a column check cannot. *(Verifier surfaced by the foundation lane, who
> proposed testing the ordering claim instead of accepting it.)*

**Original rationale, kept for the reasoning:** `origin/main` is at `0063`; landing out of
order would make the live database apply migrations out of numeric order, and nothing
*generally* guarantees a lower-numbered migration is safe after higher ones have touched the
same tables.

| Slot | Lane | Carries | State |
|---|---|---|---|
| 1 | messaging | `0066_messaging` | `13cc2f6` on `f4c85ff`, 0 behind, three capability sets identical at 20, suite running |
| 2 | quests | `0067_quest_crews` + ~20 source files | commits from a throwaway worktree at main |
| 3 | renumber | `0068_quest_story` | **already committed** as `79b6636`; cherry-pick it |
| 4 | foundation | `0069`–`0072` | 18 ahead; must re-merge, three lanes land before it |
| — | nanoid | `SECURITY_ADVISORIES.md` only | off the critical path, land any time |

**Protocol for every slot:** `git fetch` immediately before pushing → if not 0 behind,
rebase and **re-run the gates on the new base** (a green measured on the old base does not
carry over) → push → report the SHA → governor releases the next slot.

**`voice-sweep-2026-08-01` must never be merged into `main`.** It is 81 behind and carries
three lanes' commits. Classified by content:

| Commit | Lane | Verdict |
|---|---|---|
| `837454c` | messaging | **SUPERSEDED** by `13cc2f6` — must not land twice |
| `d3ba57e` | nanoid | `package.json` + `pnpm-lock.yaml` **byte-identical to main**; the fix already landed by another path. Only the docs diff is new |
| `79b6636` | renumber | **genuinely unlanded** — the one thing on that branch that must reach main |

Its working tree holds **121 untracked files: 52 already byte-identical to main** (stale
duplicates, delete, and they block `git merge`) and **68 genuinely new**, of which 30 sprites
and 10 qa-evidence files under `docs/prototypes` belong to a *different* lane than the quest
source. Nobody sweeps a directory in that tree.

---

## 7 · Landing queue

Not a merge train. Most lanes already push to trunk directly (blocker 5), so this is the
short list of **pockets that cannot reach trunk on their own** — every one of them existed
on a single disk until 2026-08-11 and is now backed up. Ordered by readiness. Gates run in
the canonical worktree (blocker 1); each pocket rebases on a freshly fetched `origin/main`
immediately before landing, because main will have moved.

| # | Pocket | What it carries | State |
|---|---|---|---|
| 1 | `voice-sweep-rebased` @ `8341cb4` | messaging module, `0066`, `capabilities.ts` + `draftKinds.ts` together | Rebased onto `37213df`. 4 static gates green. **Needs**: build, test, bundle, audit in the canonical worktree. Backed up. |
| 2 | `19842af` **only**, from `backup/map-events-0063-…` | `0063` map scene draft/publish, `mapScene.ts` + tests, D8 prototype patches | **CLAIMED by lane 9** (2026-08-11). Not orphaned. Collides with pocket 1 on `capabilities.ts`/`draftKinds.ts`: land second → rebase on first → re-verify union vs consequence keys. Lane 9 is landing it squashed, so `a1d0028` (twin of `34a51f0`) never enters main. |
| 3 | ~~`983f761`~~ **NOT a pocket** | — | **Retired: `983f761` is lane 9's MERGE COMMIT**, not new work. `Admin.tsx`, `INTAKE_TO_BRIEF.md`, `villageBrain.test.ts` appear in its diff because a merge brings in what it merged (`5d01b59` and its ancestors, already on main). Nothing here needs landing separately. |
| 4 | `wt/foundation-economy` | `0069`–`0072`, characters/profile/economy/voice-claims | 15 ahead, pushed to its own remote, not merged to main. Watch the economy invariants. |
| 5 | shared tree dirty files | `0067` quest_crews, `0068` quest_story, QuestCard/Crews/Detail | 54 uncommitted files across lanes 4/6/7. Triage into scoped commits **by those lanes**, not by the governor. |

**DROPPED from the queue: `a1d0028`.** All 9 of its files are byte-identical to
`origin/main` — a superseded earlier cut of `34a51f0`. Verified file by file, because
`git cherry` cannot see this at 66 commits of drift. It is retained in the backup ref and
must not be landed.

### Landing procedure for pocket 2 (`19842af`) — mandatory

**`19842af` reintroduces an auth bug that main fixed today.** Verified directly:

| | `client/src/pages/LivingMap.tsx` |
|---|---|
| `19842af` | `await fetch("/api/map/promise", …)` — **plain fetch, no token** |
| `origin/main` | `await gameFetch("/api/map/promise", …)` |

This deployment authenticates by `Authorization: Bearer` alone with **no cookie fallback**,
so that call arrives as a stranger: every signed-in member on the map is told they are
anonymous and offered a sign-in they do not need. **Nothing throws and nothing logs.**

Not carelessness — mechanical inheritance. `19842af`'s parent is `a1d0028`, the superseded
cut, which predates the `gameFetch` fix. The branch inherited the broken relay and never
saw the correction. Its own new calls are correct: draft and publish both use `gameFetch`.

**`node scripts/check-auth-fetch.mjs` catches it**, failing on `LivingMap.tsx` and naming
`/api/map/promise`. This is the first real case that guard has caught that nobody planted,
about twelve hours after being wired into CI. Run it after every rebase of this pocket.

Conflict rule, from the lane that wrote the code being merged over — three files will
conflict (`server/index.ts`, `client/src/pages/LivingMap.tsx`,
`scripts/import-map-scene.ts`): **take main's version of anything belonging to lane 2, then
re-apply the scene draft/publish additions on top.** The relay must end on `gameFetch`.
Everything else in the commit is lane 9's alone and comes across whole. Because the parent
is lane 2's cut, the tree already contains their work, so landing it reverts nothing.

Then:

6. **Retire** branches sitting at 0 ahead (`nav-tree-a`, `claude/nav-explore`,
   `wt/publish-surface`, `wt/roles-model`, `claude/plan-doc`,
   `audit-2026-07-30-batches-b1-b18`) and the very stale `claude/auth-token-signing`
   (198 behind). Remove the empty `ga-finish` orphan. Keep every `backup/*` ref until
   its pocket has landed and been verified on the deployed site.
7. **Deploy** to Railway, then run `QA_PROMPTS_2026-08-11.md` against
   `https://amora.regencivics.earth` — mobile first, then desktop.

---

## 8 · Change log

- **2026-08-11** — Ledger established. Migration registry reconciled against `origin/main`
  (high-water 0062). Confirmed the apparent `0063` duplicate is line-ending drift, not two
  migrations. Confirmed lane 6 already renumbered `0054` → `0068`.
- **2026-08-11, later** — Lane 5 reported cross-lane migration state; verified against the
  remote. **Registry corrected: true high-water is 0072, not 0062** — foundation's
  0069–0072 are pushed on `origin/wt/foundation-economy`, which a check against
  `origin/main` alone does not see. An earlier draft of this file said "next free 0069"
  and would have caused a real collision. Next free is now **0073**.
  `0063` confirmed local-only and backed up to remote. Gate set re-read from `ci.yml`:
  eight CI-blocking gates, plus `check-auth-fetch.mjs` and `check-examples.mjs` which are
  required by house rules but absent from CI.
- **2026-08-11, later still** — Lane 5 resolved blocker 2 and independently confirmed the
  CI reading and the `0052`/`0053` finding, correcting their own earlier report of a
  difference (a PowerShell redirect artifact). Their unpushed `voice-sweep-rebased` was
  preserved as `origin/backup/voice-sweep-rebased-2026-08-11`.

  **Three things changed under the swarm during one session.** `origin/main` went
  `23f1381` → `a79bf17` → `7b0e73e` → `ef04f43` → `37213df`. `ef04f43` wired the auth
  guard into CI, so the gate set is **nine, not eight**, and the house-rule gap documented
  an hour earlier is closed. Measured pace: 23 commits since 2026-08-10 noon.

  Two strategy changes follow. Blocker 1 is resolved by a **canonical gate worktree**
  rather than a repo-wide line-ending normalization, which at this commit rate would
  conflict with every lane and be obsolete on arrival. And §7 is reframed from a merge
  train to a **landing queue**: work reaches trunk on its own here, so what needs
  governing is the handful of pockets that cannot.

---

## 9 · CLOSE OF THE ROUND — 2026-08-11, measured at `c5b8992`

**Every lane is idle and every lane's work is on `main`.** This was proved by content and
not by ancestry, because §1 rule 3a exists for a reason: nine branches were checked for
anything `main` lacked, and every one came back with either nothing or a stale older variant.

    wt/foundation-economy          merged
    wt/map-events                  merged
    wt/map-qa-env                  env.sh byte-identical to main's
    voice-sweep-2026-08-01         zero net additions vs main
    claude/sad-dewdney-85cdd8      its one real change landed as 251a3c2
    backup/map-events-0063         only a stale SITE_LANE_HANDOFF
    backup/publish-integrate       only a stale SITE_LANE_HANDOFF
    backup/voice-sweep-rebased x2  only the pre-0063 import-map-scene.ts

All nine are retired. **`origin/main` is now the only branch on the remote.** Every tip was
recorded as a one-line restore command before deletion; they are in the session transcript.

The shared `game-amora` checkout carries 51 uncommitted files and every one of them is a
stale working copy. Checked file by file against `main` by blob hash: five docs differ only
by line ending, and every code change in it (the pool redial handler, the S74 actorKind, the
assistant-own-key launch requirement, crews, villageBrain, 0067) is already on `main`.
**Nothing in that tree needs saving.** It is checked out on a branch that no longer exists,
which is now an honest signal.

### What this session landed directly

    235590a  two marketing pages stop sliding sideways    (a stuck reveal transform)
    251a3c2  the dead nanoid override comes out           (the last unlanded lane work)
    2069f32  twelve finished worklists come out           (409 KB, reference graph clean)
    b5f3020  an old forum link stops saying "Loading..."  (404 had no state)

### Round 2 QA, all 56 routes, signed in, both widths

    horizontal overflow      0 of 56   (3 before: characters, co-creators-guide, master-plan)
    broken images            0
    HTTP errors              0
    page errors              only the two 404s above, both now handled

Two findings that are NOT defects, recorded so nobody re-raises them:
  - `/map` reports 0 characters of text because it is an iframe holding a canvas. The frame
    renders 2456 nodes, 46 images, zero broken, and 400px of internal overflow that
    `overflow-x: hidden` on both `html` and `body` makes unreachable by touch.
  - `/events` and `/messages` return the 404 page because both modules are OFF, which is the
    designed response and the correct default for a non-core module.

### 7z-d · THE LIMIT OF STATIC CHECKING, in the foundation lane's own words

> The page was INTERNALLY CONSISTENT AND CONSISTENTLY WRONG ABOUT THE SURFACE IT WOULD LAND ON.

Every class resolved, nothing was misspelled, and `tsc`, voice and brand all passed on a page
whose heading measured 1.00:1. Static checks verify a system against itself. Every one of
today's worst findings was an assumption about the ENVIRONMENT: a dark background that was
not there, a migration number another lane held, a shell exit code describing a different
command, a dangling symlink the lockfile could not see.

**7z-e, one layer down: a comment is not a measurement.** `index.css` documented
`--color-gold` as "6.2:1 contrast vs white". Computed from the hex it is 4.55 on white and
4.07 on the `#f2f2f2` body, and the header above it describes the block as BACKGROUNDS for
white text, so even the accurate number was about the opposite pairing. A lane read that
comment, moved two headings onto gold in good faith, and took them from 4.30:1 to 4.07:1.
The fix was landed WITH the corrected comment, because the stale line was the actual defect.

### 9a · The contrast checker had FOUR blind spots, and each one produced a confident wrong number

Every one was found by someone doubting a number rather than by the tool noticing.

    1  oklch/oklab unparsed        v1 reported "0 failures" on a page whose h1 was 1.00:1
    2  background-IMAGE unread     white on a dark gradient reported as 1:1, eleven times
    3  ALPHA never composited      gray-500 on `bg-teal-deep/5` read as gray on FULL teal:
                                   1.12:1 reported, 4.54:1 actual. Found by the foundation lane.
    4  SIBLING layers invisible    an ancestor walk cannot see an absolutely positioned photo
                                   behind the text, so hero copy reads as white on white

Blind spot 3 also made "Guest" read 1.01:1 when it was 4.21:1, and I sent that number to a
lane before it was checked. v3 canvas-normalises every colour AND flattens the ancestor stack
including alpha, stopping at the first fully opaque layer, checking background-IMAGE before
background-colour at every step.

**The rule that came out of it: a checker must COUNT AND PRINT what it could not measure.**
The first cut of v3 treated a gradient anywhere in the stack as unmeasurable, silently, and
reported 0 FAIL on a page with a real failure. Zero-because-unmeasured and
zero-because-passing are the same output and opposite facts.

### 9b · Final measured state, `3f27eeb`, live

    56 routes, signed in, Pixel 5 and 1440px desktop
      horizontal overflow  0     broken images  0     HTTP errors  0     page errors  0

    contrast, alpha-composited, both engines
      /profile              0 FAIL      /profile/characters   0 FAIL
      /profile/qa-governor  0 FAIL      /circles /roles /login /register  0 FAIL
      /                     4 flagged, all four verified hero-photo false positives
      /quests              14 flagged, all verified poster-gradient false positives by
                              screenshot, plus "Advanced" at 4.21 and "Show all 9" at 4.30
      /gratitude            1 flagged, text-white/80 on teal, which is parked Q1

The QA principal, its character, its handle and all 23 rows it created are gone; the two
`module_settings` rows it touched were REATTRIBUTED rather than deleted, because deleting them
would have reset a module. Verified by re-querying every varchar column in the schema: zero
rows anywhere mention it.

### 9c · The fifth blind spot, and the one the brand system could not have caught

After the profile area measured clean, a STATIC grep over classNames found 72 apparent
failures the RENDERED checker had reported as passing. One of the two had to be wrong, and
both were, in different directions.

**The static grep over-reported.** It pairs any `bg-*/N` with any `text-*` on the same LINE,
so a `hover:` state, a ternary branch, or two elements on one JSX line all read as one
pairing. Most of the 72 were not real.

**The renderer under-reported, structurally.** Two limits, and the first is blind spot #5:

    LEAF-ONLY   v3 required el.children.length === 0. `<a><Icon/>Main Site</a>` has a child
                and keeps its label in a bare TEXT NODE with no element of its own, so every
                icon-plus-label button on the site was invisible to it. v4 measures any
                element holding a non-empty DIRECT text node.
    MOBILE ONLY every contrast pass ran at phone width, so `hidden lg:flex` never rendered.
                The worst offender was in the SHARED LAYOUT and therefore on every page.

Between them they hid `bg-amber text-teal-deep` at **2.53:1**, in twelve places.

**AND THE BRAND SYSTEM COULD NOT HAVE CAUGHT IT EITHER, WHICH IS THE REAL FINDING.**
`shared/brandTokens.ts` derives each village's palette and measures six pairings BY NAME:
white on brand, ink on background, ink on card, ink on accent, muted on muted, white on
brand-mid. Its emitted variables agree: `--secondary` is the sun tone and
`--secondary-foreground` is ink. The client was writing BRAND on ACCENT, a pairing that
appears nowhere in the derivation. A system whose header says "every pairing WCAG-measured
before it ships" was telling the truth: it measures the pairings IT DERIVES, and this one was
assembled in JSX.

The fix was `text-foreground`, which IS the ink token, so it lands on the one accent pairing
the contract covers and stays correct for a themed village. A dark hex would have fixed the
number and broken the white-label promise.

**7z-f: a guarantee covers the pairings it enumerates, never the pairings you compose.**
Three separate systems all reported clean on the same defect: tsc, the brand derivation, and
a rendered contrast checker. Each was correct about its own scope.

### 9d · Where the fixing stopped, and why

Three colour families still fail and all three were REPORTED rather than changed, because
each one is a decision about the brand's visual language:

    text-white/50..80 on teal   22 uses   3.67:1   Q1, already parked by Rye
    text-amber eyebrows on teal 15 uses   2.53:1   below even the 3:1 large floor
    bg-white/10 chips on teal   28 uses   4.02:1   the tint lifts its own backdrop

The middle one has no size or weight that rescues it, so the accent colour itself has to move,
and among existing tones only white clears. The better answer is architectural and belongs to
Rye: the brand derivation has no "accent ink on the brand surface" pairing, and deriving one
would fix all fifteen at once and keep them correct for any village that themes its seed.

The self-tint shape has its own detector now, `scratchpad/selftint.mjs`: same colour token as
both a tinted background and a foreground in one className. It over-reports and says so.

### 9e · The theme guarantee, built rather than reported (734e1ef)

Rye's answer to the open architectural question was that **any village, Amora included, uses
whatever theme it wants**. That converts one unmeasured pairing into a load-bearing one.

`shared/brandTokens.ts` derived six pairings and every one was correct. `ink on accent` is the
accent as a SURFACE with ink on top. The client did the OPPOSITE fifteen times: the accent as
TEXT, on the brand band, at 2.53:1 on the shipped pair, which is below even the 3:1 large-text
floor, so no size or weight could rescue it.

**Neither colour can carry the fix alone, and the simulation said so before any code changed.**
72 seed x card combinations:

    lift the accent only    `brand` is already derived so WHITE only just clears 4.5 on it, so
                            no saturated colour clears above it without BECOMING white.
                            34 of 72 washed past L 0.92.
    darken the band only    a navy seed drove its band to L 0.02. Not navy. Black.
    both, one step each     0 washed, 0 blacked out, worst 4.51:1, deviation <= 0.185 L per
                            side, white on the deepened band never below 5.36:1.

So `--tone-brand-band` and `--tone-sun-on-band` derive as a PAIR and are measured as one.
**Amendment A3 applied to a relationship rather than to a colour**: the hues stay the
village's, the legibility is non-negotiable, and the cost is SPLIT so neither hue stops being
recognisable. Amora unthemed: `#157f7d` -> `#105e5d`, accent `#ecb163` -> `#f0c285`, 4.59:1.

**The test asserts both halves, and the second is the one that is easy to omit.** Legibility
alone is trivially satisfiable by painting the accent white, which is what the rejected
approach did. So it also requires the accent to still be a colour (L <= 0.94) and the band to
still not be black (L >= 0.02), over nine seeds and six cards. NEGATIVE CONTROL RUN: forcing
the pair to stop deepening fails three tests. A guarantee nobody has watched fail is a wish.

**An unplanned win.** Deepening the bands lifted white on them from 4.81 to 7.55, so
`text-white/80` on those same sections now clears AA by itself. Two instances of the parked Q1
family disappeared without Q1 being decided, because the fix was to the SURFACE and not to
the ink.

**And a latent trap removed on the way through.** Every `ContrastPair` now carries the floor
it was judged against. `worst` inferred it by sniffing the pair's NAME for "large" or
"accent", which was correct for the six pairings that existed and wrong for the first one
added whose name contains "accent" and is judged at AA body. It was dead code today. It would
not have stayed dead.

### 9f · 7z-g: A LOADER WHOSE FAILURE PATH RETURNS ITS INITIAL STATE CANNOT FAIL VISIBLY

Four instances found in one day, in four unrelated files, by three different people:

    /forum/:id       404 returned null into `d && setThread(d)`; 20s and still "Loading..."
    /visit           the catch was an empty comment; 14s and still "Loading..."
    /messages/:id    404 handled, everything else returned null. NOT reachable today,
                     because the module gate answers 404 first. Reachable the moment
                     messaging is switched on, which is one admin toggle.
    /profile/characters  the same shape earlier in the round

The mechanism is always identical. `useState(null)` is both "not fetched yet" and "the
fetch failed", so the component has one value for two facts and renders the optimistic one
forever. Every one of these passed review, because the happy path is correct and the failure
path is a line that looks like caution: `.catch(() => {})`, or `r.ok ? r.json() : null`.

**The check that finds them costs nothing: load the page with the request failing and wait
twenty seconds.** No unit test catches it, because the bug is a state that never changes.

### 9g · The unauthenticated feed that narrated admin values

`/api/game/pulse` is public by design and renders on the home page. The settings handler
wrote `${key} is now ${result.value}` into it, so every game variable's VALUE was village
news. QA found the home page publishing an Alchemy RPC credential to signed-out readers,
where it had sat for eleven days.

Fixed by removing the value from the line, not by redacting patterns. **A redaction list needs
to know what looks secret, and a URL carrying a key in its path defeats most such lists:**
nothing in `tokens.base_rpc_url` reads as a secret. The audit trail already keeps before and
after behind auth, which is where a value belongs.

The general form, which is the same one as 7z-f: a value's SENSITIVITY is not a property of
the value, it is a property of the audience it reaches. Anything that crosses from an
authenticated surface to an unauthenticated one has to be re-judged at the crossing, and this
one crossed inside a template string.

### 9h · The sixth checker blind spot, from the accessibility round

    A STATE DIFF IS BLIND TO AN ELEMENT THAT STARTS IN THE STATE IT DIFFS TOWARD.

The a11y sweep reported the /admin sign-in inputs as having no focus indicator, measured by
diffing focused against unfocused computed style. The email input carries `autoFocus`, so it
was ALREADY focused when the "before" was read, the diff came back empty, and "no change on
focus" was reported as "no focus ring". The ring is there. Verified from rendered styles
before changing anything, and nothing was changed.

That is six for the day, and every one of them announced itself as a result:
oklch unparsed, background-image unread, alpha uncomposited, gradient-anywhere bailout,
leaf-only text selection, and now the autofocus state diff.

### 9i · A hyphen is not a dash, and the gate that should catch it could not

The voice profile's rule 1 sends an author from an em-dash to "a comma, a period, a colon,
or a rewrite". A sweep took a fifth path nobody offered: **delete the dash, keep the hyphen.**
That passes `check-voice.mjs`, because the CHARACTER is legal, and it shipped fourteen glued
compounds onto public pages:

    a heartfelt covenant-a living agreement
    we don't just sustain-we heal
    a role that still matters-not a golf course

All fourteen are repaired. One of them could not take a comma: "This is not about
judgment-it's about safety" becomes a CONTRAST FRAME the moment the hyphen becomes a comma,
and the gate caught that on the next run. The negation went instead.

**THE CHECK SHIPPED AS A SEPARATE SCRIPT AND THAT IS THE FINDING.** I added the rule inside
`check-voice.mjs` first. It fired correctly. Then, after adding a compound allowlist (needed
because the rule found its own counterexample immediately: `thank-you` is a real compound), it
STOPPED FIRING ENTIRELY — a probe file containing both broken constructions came back "clean
across 335 files", while a planted em-dash in the same file was caught. I could not explain
that in the time available.

So it lives in `scripts/check-hyphen-dash.mjs`, where negative controls pass both ways, and
`check-voice.mjs` is reverted untouched. **A gate rule that silently never runs is worse than
no rule: it converts UNCHECKED into PASSED**, which is the failure this entire round
catalogued seven times over. Shipping it would have been the eighth, authored by the person
writing the list.

### 9j · Close of the QA round

Four parallel agents, each briefed with the five blind spots known at the time. Two of them
overturned their own large false-positive batches before reporting, which is the behaviour
worth keeping:

    1953 of 2683 controls "under 44px"  ->  5 real, once the ::after tap expander is counted
    45 text collisions on /village-health  ->  0 real, on full z-order adjudication
    332 unlabelled form controls  ->  real, and up from 168 once <select> option text was
                                      correctly refused as a label

Fixed and verified live this round: an Alchemy key on the public home page, four loaders that
could not fail visibly, reduce-motion honoured in JS rather than only in CSS, a skip link,
footer heading levels on 42 routes, sixteen unnamed icon buttons, an unreadable internal tool
on phones, 320px overflow on three routes, fourteen glued compounds, and an acreage that
contradicted itself on the page an investor reads first.

---

## 10 · HANDOVER — 2026-08-13, at `e8e8dc9`

The swarm passes to session **"SWARM COORDINATOR"** (`local_b20d0683`). This ledger stays the
record; the method it was written from is now a skill.

### What the incoming coordinator was given

    ~/.claude/skills/swarm-supervisor/       the method, installed globally
      SKILL.md                               swarm-or-not gate, five artifacts, the six-part
                                             brief, coordination protocol, QA fan-out, close
      references/failure-catalogue.md        MAST rates + the eight silent-failure classes
      references/artifacts.md                copy-ready ledger, briefs, decision list

    SWARM_HANDOFF_NEXT_COORDINATOR.md        state snapshot, every fact measured not remembered
    FOR_RYE_2026-08-11.md                    the human's decision list, §0 still live
    docs/FOUNDATION_HANDOFF_2026-08-11.md    routed as itself, not as a summary

### State at handover, verified

    main       e8e8dc9      deployed wave1-e8e8dc9      branches: origin/main ONLY
    migrations 73 files, highest 0075, next free 0076 after checking all three holders
    lanes      Foundation and Gratitude RUNNING; Messaging idle-but-recent; Quests exhausted

### The three things carried forward by name

1. **§0 of the decision list is live**: an Alchemy RPC key rendered on the public home page for
   eleven days. Leak closed, row redacted, key NOT rotated. Only Rye can do that.
2. **"Amora Credits" is unguessed on purpose.** It could name the stay/library credits, rename
   the voice token, or be a third thing. `tokens`.`name` is village data: one admin edit once
   Rye says which.
3. **The feed heart keeps its name.** Gratitude is the name and "Hearts" in copy is a leftover,
   but the heart you TAP on a feed post is a different gesture with its own variable. A sweep
   for "Hearts" would collapse two things this build worked to keep apart. Flagged as a trap.

### What this round proved about running a swarm

The literature is about spawning agents. **The hard part is not believing them.** Eight times
in one day a tool reported a confident wrong answer, and every one announced itself as a
RESULT rather than an error — which is why the failure catalogue, not the orchestration
pattern, is the part of the skill worth reading twice.

The rule that made everything else work, and the one to apply to yourself first:

> **Every claim carries the ref it was measured at.**

It caught a lane's timing budget measured against a base that had already been fixed. It caught
me relaying that number to Rye before checking it. It is the whole protocol in one line.

### 10a · Both open questions answered by Rye, 2026-08-13, routed

**"Amora Credits" becomes "AMORA CURRENCY".** Rye's reason is the answer: it must not be called
credits BECAUSE stay credits and library credits already exist and would collide. That resolves
Foundation's three-way question to the third branch, a distinct thing. Stay credits, library
credits and the Gratitude recognition token all keep their names. One admin edit on
`tokens`.`name`, no code change. Left for Foundation to name rather than inferred by me: WHICH
token row, since their own copy on `gratitude.pool_token` draws the line the rename must respect
— "recognition is the signal, this is the value, and keeping them apart is what stops
appreciation from becoming a price."

**Neither gratitude route is retired.** Foundation framed it as "retire one"; the answer is
keep both, make them complementary, and put both settings in Admin so a founder can design
their own gratitude with their own caps. Flexibility is the stated principle for this build.

**What checking the code changed about that work.** All four knobs are ALREADY admin variables,
so adjustability was never the gap:

    /api/game/gratitude/send   gratitude.base_budget (100, stage-scaled)
                               gratitude.max_per_recipient_per_cycle    default 1,  min 1, max 100
    /api/gratitude             economy.giving_allowance_per_moon         default 30, min 0, max 100000
                               economy.hearts_per_recipient_per_moon     default 10, min 1, max 100000

Four knobs, two pairs, ONE `gratitude_log`. Raising one cap silently changes what the other
route refuses, and none of the four descriptions mentions the other pair exists. **The defect is
documentation and surfacing, not architecture.** No migration required.

**A relay is worth more when it is checked.** Reading the variables before passing the answer on
turned "make both adjustable in admin" — which was already true — into the actual work: say the
relationship out loud in each description, group the four in Admin as one surface, and reconcile
the defaults. 1 versus 10 per recipient is the divergence a fresh village meets first, and it is
what produces two different refusal messages for one apparent action.

### 10b · The full remainder handed to the incoming coordinator, 2026-08-13

Everything outstanding was inventoried and sent to SWARM COORDINATOR (`local_b20d0683`) as a
work request, verified at `e8e8dc9` rather than recalled. Six groups: answered-but-unexecuted
(the Amora Currency rename, the two gratitude routes), the largest unfixed QA finding (332 of
366 form controls with no programmatic label), my own unfinished work stated as unfinished, the
infrastructure items, what is at risk of being lost, and the Rye-only set.

**One item was corrected in the act of handing it over, and that is the point of re-verifying.**
I was about to pass the amora.cr favicon on as open. Reading `client/index.html` at `e8e8dc9`
instead of my own notes showed it already fixed: a neutral platform favicon, swapped by the
client from the brand overlay. Only the Home page images remain. **A stale item costs a lane more
than a missing one, because the lane spends its first hour proving the coordinator wrong.**

Two things flagged as AT RISK rather than as work, because nobody owns them and they vanish
quietly:

  - the QA tooling (`contrast-v4.mjs` and five others) lives in an ephemeral scratchpad and dies
    with the session that wrote it. It is the reason the last round found what it did.
  - `SWARM_LEDGER.md` and the decision lists live outside the repo, on one disk.
