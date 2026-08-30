# Lane DOORS — a way to ask the village for a module, and one page called by one name

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-doors`, branch `wt/r7-doors`, from `origin/main` at
**`855075a`**, deps installed, `.env` present.
**Migration `0115` if you need one. Only 0115.** You probably need none.

**Two items from R82. Every premise here is a hypothesis I measured at `855075a`. Re-measure them,
and if one is wrong, say which and why, and do not do it.**

---

## 1 · "Ask the village for this." R82 item 4.

**Today a member who wants a module their village does not run has nowhere to say so.** The module
card shows them a thing they cannot have and the conversation ends there.

**Build the door.** On every module card, a way to ask the village for it, **opening the proposal
wizard that already exists, prefilled**. You are not building a new proposal kind and you are not
building a module-enabling execution path. **The wizard opens with the module named in the draft and
a member finishes the sentence.** The proposal kind that actually turns a module on comes later.

**Say plainly in your report what a carried proposal of this shape does today**, which as far as I
know is nothing automatic: somebody with the power reads it and acts. **That is fine and it must not
be dressed up.** A button that implies the vote flips the switch, when a human still has to, is the
exact defect class this program spends most of its time on.

**R56 binds:** state what is true and get out of the way. **R55 binds:** a village not running a
module is not behind, so no lock icons, no "unlock this", no upsell.

**Three things to get right, and they are where this either lands well or reads as a form:**

- **A member who cannot open a proposal at all** should not be shown a door that refuses them at the
  end. Read `shared/capabilities.ts` for `proposal.open`. **Say what you show them instead.**
- **Asking twice.** If a member asks for a module somebody already asked for this cycle, the honest
  answer is that the ask already exists and here it is. **Do not silently create a second one.**
- **Where the card lives.** `client/src/components/modules/ModuleCard.tsx` renders in more than one
  place. **Check every one** and make sure the door makes sense from each. A card inside an admin
  screen probably wants no door at all.

## 2 · One page, one name. R82 item 5.

`/project-history` is the founders' Command Centre, admin-gated. **The nav already calls it that**
(`client/src/config/nav.ts`, label `🛠 Command Centre`, with a comment explaining the gate). **Four
other places still call it something else**, measured at `855075a`:

- `client/src/App.tsx:87` — the route title map: `"What we have built"`
- `client/src/pages/ProjectHistory.tsx:442` — an `<h2>`: `Project History`
- `client/src/pages/ProjectHistory.tsx:1002` — `Project History`
- `client/src/pages/JourneyToLaunch.tsx:494` — link text: `Project history`

**Rename all four to Command Centre.** Then **search again yourself** for anything I missed, prose
and comments included: a doc telling somebody to open "project history" is the same defect in a
different file. **Report the full list you found, not the list I gave you.**

**Do not rename the ROUTE.** `/project-history` is linked from places outside this repo's control and
a URL change is a different decision with different consequences. **Only what a person reads.**

## 3 · Your zone

**Yours:** `client/src/components/modules/ModuleCard.tsx`, `client/src/pages/Modules.tsx`,
`client/src/pages/ModuleDetail.tsx`, `client/src/pages/ProjectHistory.tsx`,
`client/src/pages/JourneyToLaunch.tsx`, `client/src/App.tsx`, and the proposal wizard component.

**Live lanes right now:** DIALS holds `client/src/pages/GameMechanics.tsx`. GUARDS holds
`shared/capabilities.ts` and parts of `server/index.ts` — **you will READ capabilities.ts, and it is
being edited, so read it from `origin/main` and ask me before changing a byte of it.** CAPS is
mid-flight in `shared/gameVariables.ts`.

**Note `JourneyToLaunch.tsx` was Lane GAMESTART's in round 7 and has merged (#102).** It is free, and
its launch card is now a proposal rather than a button. **Read what GAMESTART built before you touch
that file**, because the page's shape changed.

## 4 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself. **`docs/modules/**` prose is a live
retrieval corpus and an edit there is a behaviour change; if your rename reaches into it, run the
knowledge tests and report the count before and after.**

**Write the tests first.** The two that matter: **a member without `proposal.open` is not offered a
door that refuses them**, and **a second ask for the same module in the same cycle finds the first
one.**

Report in the house-rules block, plus: **what a carried "ask the village" proposal actually does
today**, in one sentence a member would understand, and **every naming site you found.** Status stops
at **CODED**. Nothing pushed or merged without me.
