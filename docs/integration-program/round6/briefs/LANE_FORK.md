# Lane FORK — "a new village publishes nobody else's people and nobody else's numbers"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-fork`, branch `wt/r6-fork`, cut from `origin/main` at
`b5bed01`, deps installed, `.env` present.
**Migration number allocated: `0107`**, only if you need one. Never renumber.

Read QA-3's report first:
`docs/integration-program/round6/qa/qa-3/REPORT_2026-08-29.md`. Its operator half came back almost
clean. **Its fork half is why this lane exists.**

---

## 1 · What a fresh village publishes on day one, measured by QA-3, signed out, empty schema

1. **`/team` and `/roles` serve real named people from another project.** QA-3 saw Ky, Christian,
   Jessica and Blake, plus twelve seat holders carrying internal notes like *"Away and inactive"*.
   **The coordinator confirmed the source: `server/seeds/org-chart-2026-08.json` and
   `server/seeds/org-chart-corrections-2026-08.json` carry Amora's real org chart, and they ship in
   the repository.** `Org Chart` and `Team Page` are **absent from the Setup Wizard entirely**, so a
   founder is never even shown the screen where they would replace it.
2. **`/investor` and `/master-plan` publish another project's financial claims as the village's own.**
   *"+113% in 16 months"*, *"$16M+ appraisal, January 2026"*, *"19.6% projected IRR"*, *"266 acres in
   Dominicalito"*. These are **module constants** in `client/src/pages/InvestorJourney.tsx` (around
   line 114) and `client/src/pages/MasterPlan.tsx` (around line 21). **No admin field anywhere, and
   the wizard's Go-live step never mentions them.**
3. **The homepage build board shows another project's real milestones as complete.**

**`docs/AUDIT_2026-07-30_IMPROVEMENTS.md:25` already recorded this class thirty days and thirty PRs
ago.** It has been known and unfixed for a month.

## 2 · Why this is the sharpest item in the round, in the founder's own terms

**R57 is the ruling that makes it worse rather than better.** A village's people are public by
default, and Rye ruled that the field-by-field list of what crosses into public is *"a person's
exposure question, since real people become visible and they did not vote on it."*

Ky, Christian, Jessica and Blake agreed to appear on Amora's site. **They did not agree to appear on
every fork of this platform, published by strangers, signed out, with their internal availability
notes attached.** The ruling that put people on public pages is exactly the ruling that makes
shipping the wrong people a violation rather than an untidiness.

**And the numbers are a different kind of danger.** A fork that publishes *"19.6% projected IRR"* and
*"$16M+ appraisal"* about land it does not own is making a financial representation it cannot stand
behind, using a platform that gave it no way to know it was doing so. That is a hazard to the fork
and a misrepresentation of Amora's real figures at the same time.

## 3 · The measurement that decides the shape of your fix. Do this FIRST

**Where does live Amora's org chart actually come from: the database, or these seed files?**

- **If live reads from the database** and the seeds are only first-boot example content, then the
  seeds are pure example data and the fix is clean: make them obviously fictional, or stop publishing
  them, or both.
- **If live depends on the seed files**, then removing or fictionalising them breaks Amora's own site
  and the fix is a different, larger shape. **Stop and tell the coordinator** rather than choosing.

**Do not guess this. Measure it, and say how you measured it.** Getting it wrong in the first
direction publishes strangers' names; getting it wrong in the second takes down the founder's own
team page.

## 4 · What to build

There is real machinery here already: `isExample` appears about 140 times in `server/index.ts` and 9
times in `server/lib/orgChart.ts`, and migration `0046_standing_examples.sql` added `is_example` to
users, circles, roles, quests, forum threads and replies, tools, library categories and items, and
accommodations. **So the concept exists. Find out what it currently does and what it does not**, and
prefer extending it over inventing a parallel scheme.

The harm metric, and it is the whole objective:

> **A village that has configured nothing publishes no real person who is not theirs, and no
> financial claim that is not theirs.**

Three shapes to weigh, and **your judgement on which is right is wanted**:

1. **Example content is never published on a public surface.** A fresh village's `/team` reads as
   young and empty rather than as somebody else's. Consistent with R55: a village with no team yet is
   not failing, it is new.
2. **Example content is obviously fictional.** Keeps a new village from looking broken, and no real
   person is exposed. Costs a rewrite of the seed files.
3. **Both**: fictional examples, visible to the founder while setting up, never published.

**Whichever you choose, the internal notes (`note`, `focus`, availability text) must not travel.**
QA-3 saw *"Away and inactive"*. That string leaked through a public route once before and is recorded
in the ledger as a known exposure.

**For the numbers (§1.2), the shape is not in doubt:** a constant that makes a financial claim about
a specific property has no business being a module constant in a fork's bundle. Either it becomes
village-configurable with an honest empty state, or those pages refuse to render for a village that
has not filled them in. **They must not render Amora's figures for anyone else.**

**And the wizard must mention what it currently hides.** A founder who is never shown the Org Chart
or Team Page step cannot be blamed for publishing what was already there.

## 5 · Your zone

**Yours:**
- `server/seeds/org-chart-2026-08.json`, `server/seeds/org-chart-corrections-2026-08.json`, and the
  org parts of `server/seeds/content-seed.json`. **`check-voice.mjs` scans `server/seeds/**.json`**,
  so anything you write there is subject to the voice gate.
- `server/index.ts`: the org read region **only** — anchor from `app.get("/api/org"` through
  `app.get("/api/org/vision"`. **Stop there.**
- `client/src/pages/InvestorJourney.tsx`, `client/src/pages/MasterPlan.tsx`,
  `client/src/pages/Team.tsx`, `client/src/pages/Circles.tsx`, and the homepage build board.
- The Setup Wizard, wherever it lives.
- `drizzle/0107_*.sql` if you need it.

**NOT yours. Six other lanes are live:**
- **`client/src/pages/Roles.tsx` IS LANE G-D's.** You may not touch it. If the fix genuinely needs a
  change there, **send the coordinator a written request** and it goes to G-D as an addendum.
- **G-D also owns** `server/lib/orgChart.ts`, `server/lib/ballots.ts`, `server/index.ts` from
  `app.get("/api/org/roles/:id/history"` onward, `/api/game/progression`,
  `GET /api/governance/ballots/:id`, `Decisions.tsx`, `Decision.tsx`, `GameMechanics.tsx`,
  `components/power/**`, `ProfileJourney.tsx`. **`orgChart.ts` is the one you are most likely to
  reach for. Ask, do not take.**
- **G-E**: the objection routes and `mechanics/:id/open-ballot`.
- **INVESTOR**: `/api/admin/investor-docs` through `/api/admin/investor-summary` and the investor tab
  of `Admin.tsx`. **Note the name collision: that lane owns the investor DOCUMENT VAULT, you own the
  `/investor` PAGE's hardcoded numbers. Different things. Do not touch its zone.**
- **CYCLE**: the gratitude and cycle block, `server/lib/economy.ts`, `server/lib/gratitude-cycles.ts`.
- **MINT**: the admin tokens block and `meterUserId`.

## 6 · Gates specific to this lane

Beyond the standard set and the baseline in house rules §2:

- **A test that boots an EMPTY schema and asserts no real person's name and none of the four
  financial strings appear on any signed-out route.** Write it first, watch it fail at `b5bed01`,
  then fix. That test is the deliverable as much as the fix is.
- **A test that a village with its own people still publishes them**, so the fix does not simply
  blank `/team` for everybody. **Amora's own live site must keep working.**
- **`check-voice.mjs` scans `server/seeds/**.json`.** Anything you write into a seed file meets the
  voice rules: no em-dashes, no "not X but Y".
- **`check-brand-refs.mjs` is a ratchet at 60 against a baseline of 63.** Removing another project's
  name from seeds should move it DOWN, which is fine. **Never `--update-baseline`.**
- The R55 check: at zero people and zero milestones, does `/team` read as young rather than broken?

## 7 · Report additionally

- **The §3 measurement and how you made it**, before anything else.
- **Every real person's name that ships in the repository**, as a count and a file list. No names in
  your report. The founder needs the size of it, and those people are entitled to not be enumerated
  again in another document.
- **Every other hardcoded claim about Amora specifically** that a fork would publish: places,
  acreages, dates, prices, partner names, photographs. **Enumerate every door into this room; do not
  ask whether the three QA-3 found are safe.** That instruction found a second undiscovered public
  leak in round 5.
