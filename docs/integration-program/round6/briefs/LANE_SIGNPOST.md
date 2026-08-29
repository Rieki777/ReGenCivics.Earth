# Lane SIGNPOST — "a page that tells you to do the thing you are already on it to do"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-signpost`, branch `wt/r6-signpost`, cut from
`origin/main` at `b5bed01`, deps installed, `.env` present. **No migration. Do not take a number.**

Read both QA reports first, since your work came from two independent passes that found the same
thing without talking to each other:
`docs/integration-program/round6/qa/qa-1/REPORT_2026-08-29.md` and `.../qa-3/REPORT_2026-08-29.md`.

---

## 1 · The headline class, and it is yours to size properly

**QA-3 found 47 routes in this shape. QA-1 found the same defect independently on `/propose` and
described it best:**

> *"It told me to make a proposal. I clicked the page where you make proposals and it told me to make
> a proposal."*

A page whose empty state or call to action points at itself, or at a door that does not exist. The
sharpest known instance in this codebase is a refusal reading *"Allocate weight before opening a
ballot"* on a product that **has nowhere to allocate weight**. A correct signpost pointing at nothing.

**Two independent passes converging on one class is the strongest signal this round produced.**

### What I want from you, in this order

1. **Size it honestly first.** QA-3's 47 is a count from one sweep, not a verified list.
   **Enumerate every empty state, call to action, refusal message and "next step" prompt in the
   client, and classify each**: points somewhere real, points at itself, points at a door that does
   not exist, or is fine. **Report examined and defective as two numbers**, and classify the safe
   ones rather than padding the list. One round-5 lane correctly left fourteen alone and said why for
   each, which is the standard.
2. **Fix the ones that point at nothing or at themselves.** Where the destination genuinely does not
   exist, **say what is true and stop, rather than inventing a door.** R56: state what is true, then
   get out of the way. An empty `/propose` should say the village has not proposed anything yet, not
   instruct someone to do the thing they are standing in front of.
3. **Where a refusal names an action the product cannot perform, that is a finding for me, not a fix
   for you** unless the door is trivially addable. Report those separately: they are missing
   features wearing a copy defect's clothes, and they get their own lane.

## 2 · The rest of your list

Each was measured. **Re-verify before acting; a cause from a QA pass is a hypothesis, and both passes
were forbidden from diagnosing causes.**

- **`/project-history` signed out is a two-step dead end.** Its card names a different page, and its
  only link goes to `/admin`, which has zero links. A member follows two hops and is stranded.
- **`/village-health`'s doughnut cuts its outer labels** to "ed", "ate", "He" and "0 t" at 390 wide.
  **The DOM holds the full text, so every assertion passes and only the screenshot shows it.** Treat
  that as the lesson as much as the bug: fix the rendering, and if you add a check, make it one that
  could actually have caught this.
- **A notification about a member's own voting weight runs two sentences into one** and had to be
  read three times.
- **`/journey-to-launch` reads "One admin have their own login."**
- **`POST /api/admin/tools` tells an admin their category is called `undefined`.** That is a value
  reaching a sentence, not a copy problem: find why, and make the sentence come from what happened.
- **QA-1's four LOW findings**, listed in its `findings.json`.

## 3 · Your zone

**Yours:** `client/src/pages/Propose.tsx`, `ProjectHistory.tsx`, `VillageHealth.tsx`,
`JourneyToLaunch.tsx` and their components; the notification copy for weight changes; the
`/api/admin/tools` category path; and the empty-state and refusal strings on any page **not** listed
below.

**NOT yours. Six other lanes are live and these boundaries are not advisory:**
- **G-D**: `Decisions.tsx`, `Decision.tsx`, `GameMechanics.tsx`, `Roles.tsx`,
  `components/power/**`, `ProfileJourney.tsx`, `server/lib/ballots.ts`, `server/lib/orgChart.ts`,
  the org/seat region of `server/index.ts`, `/api/game/progression`,
  `GET /api/governance/ballots/:id`. **`/powers` and `/profile`'s capability list are already
  routed to G-D. Do not touch them.**
- **FORK**: `InvestorJourney.tsx`, `MasterPlan.tsx`, `Team.tsx`, **`Circles.tsx`**, the homepage
  build board, the Setup Wizard, `server/seeds/**`, `/api/org` through `/api/org/vision`.
  **QA-3's nested-link finding touches `/circles`, which is FORK's: report it, do not fix it.**
- **G-E**: the objection routes, `mechanics/:id/open-ballot`, `ObjectionPanel.tsx`.
- **CYCLE**: the gratitude and cycle block, `server/lib/economy.ts`, `server/lib/gratitude-cycles.ts`.
- **MINT**: the admin tokens block, `meterUserId`, the tokens tab of `Admin.tsx`.
- **INVESTOR**: `/api/admin/investor-docs` through `/api/admin/investor-summary`, the investor tab of
  `Admin.tsx`.

If a fix needs a hunk outside your zone, **send me a written request rather than taking it.**

## 4 · Gates and the standard for this lane

Beyond the standard set and the measured baseline in house rules §2:

- **`check-voice.mjs` does NOT scan `client/src` prose.** Neither does `check-hyphen-dash`, which is
  a hyphen gate rather than an em-dash gate. **So almost every string you write has no automatic
  check behind it.** No em-dashes, no "not X but Y", plain words, written for a community member.
- **A copy change breaks tests by capitalization alone.** Grep the tests case-sensitively before you
  rename anything.
- **The brand ratchet is 60 against a baseline of 63.** It only ever falls. Never `--update-baseline`.
- **`check-route-reachability.mjs` reports "every route has 2 or more ways in" on trunk.** If your
  dead-end fix adds or removes a link, keep it green.
- **Look at the screenshot.** Your list contains at least one defect that every DOM assertion passed
  and only a picture revealed. If you fix it and verify in the DOM, you have verified nothing.
