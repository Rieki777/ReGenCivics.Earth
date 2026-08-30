# Lane MEND — two member paths still spend a gift that never arrives

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-mend`, branch `wt/r7-mend`, from `origin/main`, deps
installed, `.env` present. **No migration.** If you find you need one, tell me first.

**This is a small lane with a live defect in it. Do not widen it.**

---

## 1 · The defect, and how much of it is already fixed

**Lane TESTRUN found it while working out how to isolate a dry run. Lane RULES verified it, fixed one
of the three paths, and told me plainly that the other two are still open.** That refusal to let a
half-fix read as done is why this lane exists.

**The shape:** the gratitude note and the spent allowance are committed to the database **before** the
ledger is asked to create the tokens. When the ledger refuses, the note and the spend stay. **Before a
village launches, the ledger always refuses.**

So on any un-launched village, and under R67 that is every village until its launch ballot carries:
**a member spends their allowance, a permanent record says they gave something, and the recipient
receives nothing.**

**Already fixed and merged (or in flight as PR #109): `give()` in `server/lib/economy.ts`.** RULES
took that one because it owned the file. **Do not touch it.** Read it first, because it is the model
you are copying.

**Still broken: `sendGratitude` in `server/lib/gratitude.ts`, on two live routes.** RULES reported
them as `server/index.ts:8705` (forum hearts) and `server/index.ts:23300` (gratitude by email).
**Verify both line numbers yourself; they have moved several times tonight.**

## 2 · What to build

**Copy the shape RULES chose, do not invent a second one.** Its reasoning, which I agree with:
**ask whether issuance is possible BEFORE taking the note, and refuse the whole act with the gate's
own sentence.** Unwinding afterwards is worse, because losing somebody's written words because an
accounting system said no is its own kind of wrong.

RULES states the patch is roughly:

```
const closed = await issuanceRefusal(deps.pool);
if (closed) return { ok: false, status: 409, error: closed };
```

immediately before the log write, around line 185 of `server/lib/gratitude.ts`.

**Treat that as a hypothesis and check it.** In particular: **confirm the return shape matches what
both callers actually do with it.** A refusal that the forum route renders as a success, or as a
blank, is a different defect wearing the same clothes. **Follow the value all the way to what a member
sees on each of the two routes, and say what they see.**

**One property RULES established that you should preserve:** the gate only ever moves one way, closed
to open, so the worst race costs one refused send and never a lost note.

## 3 · The test that matters

**Write it first and watch it fail.** The assertion that separates broken from fixed is **not** the
status code, because the status is arguably right either way.

**It is the row count.** RULES' own test asserts *"a refused give writes nothing and spends nothing"*
and measures `gratitude_log` rows plus the allowance. **Do the same for both routes.** A test that
only checks the response is a test that would have passed against the broken code.

**And falsify it**: disable your check and watch the test go red naming the count.

**One trap RULES hit and reported, which is now a house lesson.** Its first falsification was
**vacuous**: `pnpm build` failed with an `ELIFECYCLE` error, `dist/index.js` was never rebuilt, and
the probe therefore ran the OLD bundle and passed. **The usual `grep -c <short-sha> dist/index.js`
check cannot catch this**, because that marker comes from git HEAD and does not move for an
uncommitted probe. **Take an `md5sum` of `dist/index.js` before and after any rebuild you rely on,
and assert it changed.**

## 4 · One line that comes with the lane

`client/src/components/governance/wizardConfig.ts` has a `SUBJECT_NOUN` map with no entry for the new
minting subject type, so a minting ballot's chip reads the generic "Decision" where every other kind
gets a name. **Add `mint_rule: "Minting change"`** or whatever the map's own convention is.

**`wizardConfig.test.ts` near line 67 asserts the fallback behaviour deliberately.** Read it before
you change anything, and if your addition makes that test wrong, **say so rather than editing the
test to match**. RULES left this alone because the file belonged to another lane; that lane has
merged, so it is free.

## 5 · Your zone

**Yours:** `server/lib/gratitude.ts`, the two calling routes in `server/index.ts` if they need
anything, `client/src/components/governance/wizardConfig.ts`, and your tests.

**Live lanes:** PHOTOS holds the places-photos region of `server/index.ts` (near 21455 to 21960).
RULES has just landed across several regions of that file between 23449 and 27621 and is in CI.
**Rebase onto `origin/main` before you start and again before you report.**

## 6 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself. **Capture each gate's exit code
directly, never through a pipe.**

**Machine hazards:** `jq` is not installed; `git grep` matches nothing on a leading slash; a green
gate that ran zero checks is not green; e2e failures tonight are usually contention across a shared
MySQL, so re-run the file alone before diagnosing and say which you did.

Report in the house-rules block, plus **what a member sees on each of the two routes when the send is
refused**, quoted. Status stops at **CODED**. Nothing pushed or merged without me.
