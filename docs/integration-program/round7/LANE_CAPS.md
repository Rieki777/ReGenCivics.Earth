# Lane CAPS — one allowance, one share, and a founder who can find the dials

**Read `../round6/BUILD_HOUSE_RULES.md` first.** Both files bind.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-caps`, branch `wt/r7-caps`, from `origin/main` at
**`6b44084`**, deps installed, `.env` present. **Migration `0110` if you need one. Only 0110.**

---

## 1 · The ruling

**R73.** Rye: [**Go with your default and make sure these are clearly labeled in the Game Mechanics so
founders know what to tweak**]

The default he adopted:

- **Keep `gratitude.base_budget` × stage multiplier** as the one allowance. Stock range **100 to 500**.
- **Retire the flat 30** (`economy.giving_allowance_per_moon`).
- **Replace BOTH per-recipient caps** — `gratitude.max_per_recipient_per_cycle` (1 send) and
  `economy.hearts_per_recipient_per_moon` (10 units) — **with one share-of-allowance dial**, default
  **25%**, min 1, max 100.
- **Label every surviving dial so a founder can find it in Game Mechanics.**

## 2 · Why, so you build the right thing rather than the described thing

**The old per-recipient cap limits the COUNT and never the SIZE.** A member at the top of the ladder
can hand one person **500 in a single send and break no rule.** Gratitude is
`governance.weight_token` by default, so that is not a budget hole, it is a limit on how much voice
one member may concentrate in another, and it does not exist.

**A share is stage-proof and edit-proof.** It means the same thing at 100 and at 500, and doubling
`base_budget` does not silently double how much of one person's standing can come from one
relationship. **A cap of 1/N is the sentence "at least N people" written as one number.**

**And it is the only lever left.** R66 says voice can never be taken away. **The rate at which it
enters is therefore the whole control surface**, and a count cap is not a rate limit while a share is.

## 3 · What to build

1. **One allowance.** Both write paths read `gratitude.base_budget` × stage. `budgetFor` already does;
   make `allowanceFor` do the same and retire `economy.giving_allowance_per_moon`.
2. **One per-recipient rule**, expressed as a share. Name it so it reads as what it is; **the unit is
   a percentage of the giver's own allowance for that cycle**, not an absolute.
3. **Keep `feed.max_hearts_per_recipient_per_cycle`** as the only surviving count cap. A heart is a
   tap, already amount-bounded by `feed.heart_amount`, and it is a genuinely different mechanic.
4. **Retire the dials you replace properly.** A dial a village may already have set is a data
   question, not only a code one: **check whether any village has a non-default value before you
   delete the key**, and if one has, say so rather than silently reinterpreting it.

## 4 · The labelling half, which is a requirement and not a polish pass

**"A dial a founder cannot find is a dial the village does not have."** Every dial you touch or leave
in this area gets a `label`, a `description` and a `unit` that a founder reading Game Mechanics can
act on **without reading the code**. The description says what the dial does, what happens at the
extremes, and what it interacts with.

**Do the labelling in `shared/gameVariables.ts`, in the variable definitions.** Lane HONEST holds
`client/src/pages/GameMechanics.tsx` and you must not touch it. If a well-labelled dial would still
be hard to find on that page, **tell me rather than fixing it** and I will route it.

**`check-voice.mjs` reads string literals in `shared/`**, so your labels and descriptions are subject
to the voice rules: no em-dashes, no "not X but Y", plain words for a community member.

## 5 · What a member's experience becomes, and you must state it

**Somebody's behaviour changes the day this ships.** Under the old rule a member could give one
person any amount once; under the new one they can give any one person at most a quarter of their
allowance, as many times as they like within it.

**Report, in the founder's terms, what a member at each stage can now do**, and **whether any member
on production would meet a refusal they did not meet before.** Production `gratitude_log` was measured
empty tonight, so this is very likely a no-op there, but **measure it rather than assuming.**

## 6 · Your zone

**Yours:** `shared/gameVariables.ts` (the gratitude and economy dials only), `server/lib/gratitude.ts`,
`server/lib/economy.ts`, the gratitude write and read routes in `server/index.ts`, and the tests that
pin them.

**Live lanes and their zones:** HONEST holds `GameMechanics.tsx`, `ObjectionPanel.tsx`,
`currentCycleId`, the investor-summary routes and the badge display surfaces. VOICE holds
`shared/capabilities.ts`, `server/lib/badges.ts` and the electorate path. PRIVACY holds
`ProjectHistory.tsx` and the `FRONTEND_URL` defaults. PROVENANCE holds `shared/modules.ts`,
`docs/MODULE_LIBRARY_CONTRACT.md` and the module-usage code. **Ask before crossing any of those.**

## 7 · Gates

Standard set. **Write the tests first and watch them fail**: a member cannot exceed the share to one
recipient; a member CAN give the same person twice within the share; the two write paths draw on one
allowance. **The old 1-send test will now be wrong — read what it asserts before you change it**,
because a test that encodes the old rule is the third one this program has found pinning a defect.

`pnpm build` can exit 0 while the artifact carries the previous commit. Check the SHA in `dist`.

Report in the house-rules block plus §5. Status stops at CODED.
