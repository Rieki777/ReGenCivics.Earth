# Lane GAMESTART — the Launch button becomes the village's first vote

**Read `../round6/BUILD_HOUSE_RULES.md` first**, and **`../GAME_GOVERNANCE_AND_ECONOMICS.md` §2**,
which is the trajectory this lane makes real. Both bind.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-gamestart`, branch `wt/r7-gamestart`, from `origin/main`
at **`6b44084`**, deps installed, `.env` present.
**Migration `0112` if you need one. Only 0112.**

---

## 1 · The rulings, in the founder's words

**R67:** [**A game needs 3 people minimum to play (to actually issue tokens) so they can do everything
else to set up the game on their own, but once they press "start the Game" this proposal to actually
be able to start minting tokens (after the founder sets up all the modules and how the Game is going
to run)**]

**R74, the threshold:** [**So the "mark the village launched" button actually generates the first
proposal that requires 100% unity and 100% quorum to launch and a minimum of 3 people.**]

**R68, the turning point this creates:** [**once the "Game Starts" then members are governing the
admin powers... every admin action is available to be SEEN by all members, and members can make a
series of suggested admin changes and put this up as a proposal... Changing the Game itself should
require significantly more % of overall voice.**]

## 2 · What exists today

**A real surface, and you build onto it rather than beside it.** `/journey-to-launch` renders a
checklist and, at the bottom, a card reading **"Mark the village launched"** with a **Launch** button,
disabled while blocking items are open: *"4 blocking item(s) still open. The button unlocks when they
read done."*

- Requirements: `shared/launchRequirements.ts`, each with a `blocksLaunch` flag. Live blockers today
  include writing the exit policy's actual terms and taking one backup and restoring it once.
- The route: `POST /api/admin/launch/launched` in `server/index.ts`.
- The page: `client/src/pages/JourneyToLaunch.tsx`, the card near line 455.

**Read all three before designing. Every line number here will have moved.**

## 3 · What to build

**The Launch button stops marking and starts proposing.**

1. **Pressing Launch opens the village's first ballot.** Not a flag write.
2. **Its thresholds are 100% unity and 100% quorum.** Every member votes; every member agrees.
3. **A floor of three members.** Below three, the button explains rather than proposes.
4. **Token issuance stays off until that ballot carries.** This is the substance of R67: a founder
   builds the whole Game alone, and **issuance is the thing that waits for the village.**
5. **The existing blocking requirements still gate it.** They gate whether the proposal may be
   opened, not whether it passes.

## 4 · The engineering constraint that must not be missed

**A 100% quorum ballot cannot carry if a single member never votes.**

That is not a reason to soften the ruling. It is a reason to design for it:

- **The launch proposal must be re-runnable.** A village that fails to reach everyone must be able to
  try again. Work out what happens to the old ballot and say so.
- **It must never strand a village in a state where launch is unreachable.** Consider a member who
  has left, or an account nobody controls. **Note that R71 says a departed member's voice leaves with
  them, and that departure DOES NOT EXIST YET** — a separate lane may be building it. **If launch can
  be blocked forever by an unreachable account and departure is the only escape, say so plainly; do
  not invent a bypass.** A stated dead end is worth more than a quiet override.
- **The snapshot law applies.** The ballot freezes its electorate at open, so anyone who joins after
  it opens is not counted in its 100%. Decide whether that helps or hurts and say which.

## 5 · The turning point, and how much of it is yours

R68 describes three things that begin when the Game starts: **admin actions become visible to every
member**, **members can propose a set of admin changes**, and **changing the Game needs a
significantly higher threshold than approving a quest.**

**Build the flag and the seam, not all three features.** Concretely: make "has this village
launched" a fact the rest of the product can read and act on, and **state clearly in your report what
each of the three would need next.** The whole turning point is more than one lane, and a half-built
visibility feed is worse than none.

**One thing that IS yours, because it is where the threshold work starts:** today **every
village-wide ballot resolves through one pair of dials regardless of subject.** Launch at 100/100 is
the first proposal kind that needs its own. **Build that seam properly** — a per-subject threshold
that other kinds can use later — rather than special-casing launch with a hardcoded pair. **Say what
shape you chose and why.**

## 6 · The rulings your design must obey

- **R55**: this is a journey to celebrate, never a scorecard. A village that has not launched is
  **young**, not failing. No percentage-incomplete, no countdown, no nagging.
- **R56**: state what is true and get out of the way. "Two more members before the village can vote to
  launch" is a fact. "You should really launch soon" is an argument.
- **R52**: a power crossing to the village is exactly the rare kind of moment that earns a
  celebration. **Launch carrying is the rarest moment a village will ever have.** Read
  `docs/modules/natural-interface.md` before reaching for an intensity, and note that **a prose edit
  in `docs/modules/**` is a behaviour change** and fires two path-gated CI workflows.
- **The snapshot law** is the invariant. Run `ballots.test.ts` unmodified and green.

## 7 · Your zone

**Yours:** `shared/launchRequirements.ts`, the launch route in `server/index.ts`,
`client/src/pages/JourneyToLaunch.tsx`, the proposal-kind and threshold seam in the governance
engine, `drizzle/0112_*.sql` if needed.

**Live lanes:** VOICE holds `shared/capabilities.ts`, `server/lib/badges.ts` and **the
electorate-building path** — you will read it; **ask before changing it.** HONEST holds
`GameMechanics.tsx` and `ObjectionPanel.tsx`. CAPS holds the gratitude dials, `gratitude.ts` and
`economy.ts`. PROVENANCE holds `shared/modules.ts` and the module-usage code.

## 8 · Gates and reporting

Standard set. **Write the tests first and watch them fail**: a launch ballot with one member short of
unanimity does not carry; a village of two cannot open one; issuance is off before it carries and on
after.

Report in the house-rules block, plus: **what happens when launch fails**, **whether a village can be
stranded and how**, and **what the three parts of R68's turning point need next.** Status stops at
CODED.
