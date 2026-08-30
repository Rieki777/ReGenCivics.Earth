# Lane ROLL — one request buys a permanent vote

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-roll`, branch `wt/r7-roll`, from `origin/main` at
**`f254d3d`**, deps installed, `.env` present. **Migration `0119` if you need one. Only 0119.**

**This is a live governance-integrity defect. It is the highest-priority item in the program.**

---

## 1 · The chain, verified link by link by the coordinator at `f254d3d`

**Re-verify every link yourself before building. All six are hypotheses, and the whole point of this
lane is that somebody checked instead of assuming.**

1. **`POST /api/forms/submit`** (`server/index.ts:7261`) reads `const { type, data, hp } = req.body`.
   **The type comes from the request body and there is no allowlist anywhere in the handler.**
   It is gated on nothing but being signed in, and it stamps `entry.userId = submitter.id`.
2. **`hasMembership(user)`** (`:3749`) returns true when any submission has
   `type === "membership-508"` and `userId === user.id`.
3. **The `member` stage rule is `{ type: "membership" }`** (`shared/gameConfig.ts:296`).
4. **`computeStage`** (`:3770`) takes the MAX of every satisfied rule.
5. **`ballot.vote` requires stage `member`** (`shared/capabilities.ts:212`).
6. **`buildElectorate`** (`:26055` area) admits every non-example user with a `passwordHash` for whom
   `hasCapability("ballot.vote")` answers true.

**So a signed-in account posts one request naming its own type and is on every ballot opened
afterwards, permanently.** The rate limit of six per ten minutes per IP does not help: one is enough.
The honeypot does not help: it only catches a filled hidden field.

**And membership is load-bearing far past the vote.** It is a stage, so it moves the gratitude
multiplier and everything else keyed on the ladder. **Sweep for other readers before you decide the
shape of the fix.**

## 2 · What to build

**Two things, and the first is the actual fix.**

### a. A submitted form cannot name its own type

`type` is caller-controlled input reaching a field that grants standing. **Allowlist it.**

**Derive the allowlist from what the product actually uses rather than from a guess**: find every
real submission type in the codebase and in the live data shape, and say what you found. **A type not
on the list is refused with a plain sentence.**

**Then decide the harder half and justify it: is `membership-508` a type a member may submit at all?**
Two readings, and I want your reasoning rather than a coin flip:

- **It stays submittable and stops conferring membership by itself.** Signing the letter is something
  a person does; being admitted is something the village does. **`member.vouch` already exists in
  `ALL_CAPABILITIES`** and the file says of it that it is gated by nothing at all, so the vouching
  step was anticipated and never built. That is the nearest existing thing.
- **It becomes admin or village-only**, and the member-facing form writes something that is not the
  thing standing is computed from.

**R89 says the end state has no admins**, so a fix that routes this through an admin is a step
sideways unless it is explicitly temporary. **Say which you built and what it would take to make it a
village act.**

### b. Do not break the people who are already members

**Existing rows matter.** Somebody who legitimately signed is a member today, and a fix that
invalidates them takes away standing that was honestly earned, which is the thing R65 and R66 forbid
in a different costume.

**Measure the live data before you choose**: how many `membership-508` submissions exist, how many
carry a `userId`, and whether any look self-issued. **Report the numbers.** If the honest answer is
that nothing can distinguish a legitimate row from a self-issued one, say so plainly, because that
changes what the founder should do rather than what you should build.

## 3 · What this lane is NOT

**Do not rebuild the membrane, the stage ladder, or the electorate.** The red team found this while
looking at something else, and the temptation to widen is exactly how a security fix becomes a
season. **Close the hole, protect the people already through it, and stop.**

**Do not touch `buildElectorate`.** It is correct: it asks the capability system a question and the
capability system answers wrongly. Fixing the answer at the electorate would leave the standing wrong
everywhere else it is read.

## 4 · Your zone

**Yours:** `POST /api/forms/submit` and its neighbours in `server/index.ts`, `hasMembership` and the
stage computation if your fix reaches them, `shared/capabilities.ts` only if you use `member.vouch`,
`drizzle/0119_*.sql` if needed.

**Live lanes:** MEND is in `server/lib/gratitude.ts` and two route call sites (`:8711`, `:23538`) and
is in CI. **Rebase onto `origin/main` before you start and again before you report.**

## 5 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself. **Capture each exit code directly, never
after a pipe.** `jq` is not installed. `git grep` matches nothing on a leading slash. A green gate
that ran zero checks is not green, so prove every negative against a known-present control.

**Write the tests first and watch them fail.** The one that matters: **a signed-in member who posts a
membership type for themselves does not appear in an electorate built afterwards.** Build the whole
chain in the test rather than asserting on one link, because every individual link here looks correct
and only the composition is wrong.

Report in the house-rules block, plus: **the allowlist you derived and where from**, **which reading
you took and why**, **the live numbers on existing membership rows**, and **every other reader of
`hasMembership` you found.** Status stops at **CODED**. Nothing pushed or merged without me.
