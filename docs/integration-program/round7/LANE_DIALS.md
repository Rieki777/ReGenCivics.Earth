# Lane DIALS — a dial says what it does, and a founder can find it

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-dials`, branch `wt/r7-dials`, cut from `a040bf6`.
**Rebase onto `origin/main` before you start.** Main has moved twice since that cut, and Lane CAPS
landed inside `shared/gameVariables.ts` after it.
**Migration `0113` if you need one. Only 0113.**

---

## 0 · THIS BRIEF WAS ALREADY WRONG ONCE. Read this section before anything else.

I was going to send you after **"18 boolean dials showing 1/0, and 14 descriptions that explain what
0 and 1 mean."** Lane CAPS checked that claim and it is **false**, and I then measured it myself at
`855075a` and confirmed CAPS:

- **18 boolean dials — correct.**
- **Descriptions that translate a number: ZERO.** Not 14. The boolean descriptions are fine.
- **`platform.feedback_relay` (`shared/gameVariables.ts`, near line 1514) is the only real defect
  of this kind in the file.** It is `type: "integer"`, default `"1"`, min 0, max 1,
  `unit: "on/off"`, and its description opens with `"ON: …"`. **A boolean wearing an integer's
  clothes.** It is what the founder screenshotted.
- **Roughly eleven INTEGER descriptions name what 0 or 1 does** (`"0 turns the second signature
  off"`, `"0 disables the contact relay entirely"`). **Those are correct and you must not touch
  them.** They are thresholds where 0 is a genuine setting, not a translation of a boolean.

**So the scope of the R79 half of this lane is one dial, not thirty-two.** If I had sent the
original brief, a lane would have rewritten eleven good descriptions.

**Everything else in here is also a hypothesis. Measure it. If an item is wrong, say which and
why, and do not do it.** A lane that refuses part of its brief with evidence is the lane working.

## 1 · The ruling

**R79.** Rye, looking at the feedback dial: [**this first screenshot should really say on/off instead
of 1/0 and having to say what they mean! Just say what they do from the start.**]

The principle, which is wider than the one dial: **a control states its effect. It does not state its
value and then gloss it.** A founder setting up a Game should never have to decode.

## 2 · What to build

### a. Flip the one dial

`platform.feedback_relay` becomes a real boolean, and its description stops explaining `1`.

**Two facts CAPS measured that make this safe, and you re-verify both before trusting them:**

- **Both readers are `numberVar(...) === 1`** (`server/index.ts` near 3897 and 13857). They keep
  working after a flip, because `Number(true) === 1`.
- **Existing stored `"1"` rows already parse as `true`**, because `parseVariable`'s boolean branch
  accepts `"1"`.

**That second one is the whole migration question.** If it holds, this needs no migration and no
data rewrite. **Prove it with a test that stores `"1"` and reads `true`**, rather than reading the
parser and believing it.

**This dial is live on production with a non-default value.** It is one of only two non-default
rows there. **A flip that silently resets it to default is a production behaviour change.** Check
what the current stored value is and say what happens to it.

### b. A founder can find a dial

The Game Mechanics page has **no search**, and **every category starts collapsed**. A founder
setting up a Game is hunting through closed drawers for a dial whose name they do not know yet.

- **Add search.** It must match the description text too, not only the key and the display name.
  Somebody looking for "how do I turn off the feedback thing" does not know the word `relay`.
- **Decide the collapse default deliberately and say why.** All-collapsed is defensible for a page
  of ninety-six dials. All-expanded is defensible for a founder who is scanning. **A third option
  is that search changes it** — collapsed until you type, then only matches open. Pick one, state
  the reason, and make sure a keyboard user can reach every result.

**R56 binds here:** state what is true and get out of the way. No empty-state pep talk.

### c. NOT YOURS THIS ROUND: the pool constant

`shared/modulePoolShares.ts:51` holds `export const MODULE_POOL_PER_CYCLE = 10000`, read by
`server/index.ts` at 8165 and 8188. **The village is holding its own copy of a number that
R80 says belongs to the hub**, and the live hub value is **333**, so the village's constant is
thirty times wrong.

**Do not fix it in this lane.** It is genuinely broken and it is being covered by an audit that may
change its shape entirely, because R81 puts every act of issuing value under governance and this
constant feeds a payout. **A fix now would be built against a shape that is about to move.**

**Report what you see and leave it.** If you find another copy of a hub-owned number living in the
village, name it in your report. That pattern is the finding, not the one constant.

## 3 · Your zone

**Yours:** `shared/gameVariables.ts` (the `platform.feedback_relay` entry only), the two
`numberVar` readers, `client/src/pages/GameMechanics.tsx`.

**Not yours:** every other dial's description. `shared/modulePoolShares.ts`. The gratitude dials
(CAPS just landed there). **`GameMechanics.tsx` was Lane HONEST's in round 7** — check whether
HONEST has merged before you open it, and if it is still in flight, tell me rather than editing
around it.

## 4 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself rather than from any list here.

**Write the tests first and watch them fail.** The one that matters: **a stored `"1"` reads as
`true` after the flip**, because that is the assumption the no-migration decision rests on.

Report in the house-rules block, plus:

- **What the production row currently holds and what happens to it**, measured rather than reasoned.
- **The collapse decision and why.**
- **Any other hub-owned number you found living in the village.**

Status stops at CODED. **Nothing is pushed or merged without me.**
