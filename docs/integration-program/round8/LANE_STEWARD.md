# Lane STEWARD — the founder role ends at launch, and the village may vote in a steward or nobody

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r8-steward`, branch `wt/r8-steward`, from `origin/main`,
deps installed, `.env` present. **Migration `0120` if you need one. Only 0120.**

---

## 1 · The ruling

**R90**, the founder, asked whether a village can decide who its admins are:

[**Yes, eventually a village will be able to vote the "Game Steward" role or choose to not vote for
this role at all. The founder role disappears once the game starts and a minimum of 3 people vote the
game to start. After that they can optionally vote in a steward role and give various powers to this
steward to immediately act, and when the game is mature enough they may not even need to vote this
role in.**]

**Three things, and the first is the one with teeth:**

1. **The founder role ENDS at launch.** Launch was already the moment issuance turns on (R67, R74).
   It is now also the moment the founder stops existing as a standing power.
2. **A Game Steward is OPTIONAL and the village votes it in.** It may be given powers to act
   immediately without a further vote. **A village may choose never to have one.**
3. **A mature village may need no steward at all.** So the steward is a stage on a path rather than a
   destination, and nothing may be built that assumes one exists.

**R90 SUPERSEDES R85.** R85 said named founders keep a back door until a second handover event.
**There is no second event.** Read R85 in the ledger for the history and then ignore its rule.

## 2 · What this contradicts, which shipped hours before the ruling

**Lane RULES landed a post-launch founder key on the mint route**, built to satisfy R85, in PR #109.
It reads `actorUser?.role === "founder"` directly and never passes through the capability gate. **It
is now exactly the thing R90 removes**, and removing it is part of your lane.

**And it is not alone. There are 26 branches in `server/index.ts` reading `role === "founder"`**,
measured by the coordinator at `f254d3d`. **Nearly all of them treat founder as a synonym for admin**,
and not one of them consults whether the village has launched.

**Enumerate all 26 yourself and classify each**, because they are not the same thing wearing one
name:

- **A synonym for admin** in a check that should simply keep working before launch and stop after.
- **A genuine founder-only power** somebody deliberately fenced off, for example the guard that stops
  a non-founder demoting a founder.
- **Bootstrap and recovery**, which may need to survive because a village with nobody able to sign in
  is a different failure from a village with too much admin.

**That classification is the real work of this lane. Report it as a table.**

## 3 · What to build

### a. The founder role ends at launch

**Decide the mechanism and justify it.** Two obvious shapes:

- **The role column changes at launch**, so the 26 branches keep working unchanged and simply stop
  matching. Simple, and irreversible in a way you must think about.
- **Every branch consults launch state**, which is honest and touches 26 places.

**Read `server/lib/gameStart.ts` first.** It already answers "has this village started" from the
database inside the caller's transaction, and its header explains at length why it is not a cached
flag. **Whatever you build should use it rather than inventing a second answer to the same question.**

**The one thing that must not happen: a village that cannot be administered and cannot be governed.**
Before launch the founder builds alone. After launch the village governs. **Between the two there
must be no moment where nobody can act.** Say how you guarantee that.

### b. A Game Steward the village votes in

**Build it as a role the village can vote into existence and give powers to.**

**The nearest existing machinery is not a guess:** `power_grant` is one of five ballot subjects with a
real executor, and it already **writes a role's capabilities from a carried ballot**. That is a
village giving a role a power with no admin involved, and it is the template.

**So the steward may be almost entirely composition rather than new machinery.** Work out honestly
what is genuinely missing: a role that does not exist until voted in, a way to vote somebody into it,
a way to vote them out, and whatever the ballot subjects cannot express today.

**Three properties from the ruling that must hold:**

- **Optional.** A village with no steward works completely. **Test that.**
- **Revocable.** Voted in means voteable out.
- **It can act immediately** on the powers it holds, without a further vote each time. That is the
  point of having one.

### c. Say what is left

**Do not build the whole handover.** R89's end state is a village that needs no steward, and this
lane is the mechanism rather than the journey. **Report what remains**, especially anything you found
that still assumes a standing personal power after launch.

## 4 · What is NOT yours

- **The admin page becoming member-visible and staging into one proposal** (R91). A design workflow
  is running on it now. **You will collide with it later; you are not building it.**
- **The forms-submit allowlist and the self-serve vote** (Lane ROLL, in flight, around
  `server/index.ts:7261` and `hasMembership` near `:3749`). **Those line numbers sit inside your
  sweep. Read `origin/main` fresh, and if your change touches either, tell me before editing.**
- **The capability keys over the 95 unkeyed routes.** Queued as its own lane. **If your steward work
  needs a key that does not exist, name it and tell me rather than adding a general set.**

## 5 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself. **Capture each exit code directly, never
after a pipe.** `jq` is not installed. `git grep` matches nothing on a leading slash. A green gate
that ran zero checks is not green. **`grep -c <short-sha> dist/index.js` cannot detect a failed
rebuild during an uncommitted probe; use `md5sum` before and after.** Never `git checkout --` a file
with unstaged work.

**Write the tests first and watch them fail.** The ones that matter: **a founder has no standing power
after launch**; **a village with no steward works**; **a voted-in steward can act immediately on the
powers it was given**; **a steward can be voted out**; and **`ballots.test.ts` is untouched and
green.**

Report in the house-rules block, plus **the table of all 26 founder branches and what you did with
each**, **the mechanism you chose and why**, and **what still assumes a standing personal power after
launch.** Status stops at **CODED**. Nothing pushed or merged without me.
