# Lane VOICE — nobody may take away a voice that was earned

**Read `../round6/BUILD_HOUSE_RULES.md` first.** Both files bind.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-voice`, branch `wt/r7-voice`, from `origin/main` at
**`a9f55de`**, deps installed, `.env` present. **Migration `0109` if you need one. Only 0109.**

---

## 1 · The ruling, in the founder's words

> [**I'd say denying a voice is not a power anyone should hold. Remove this ability for now.**]

and, generalising it:

> [**This policy shouldn't exist, when voice is earned it should never be force taken away (Though
> with Hypha rules voice can wane and that can be programmed if they use Hypha who we encourage
> those who want to do governance professionally to use Hypha).**]

Recorded as **R65** and **R66**. This settles a question open since the badge review: the standing
recommendation was to keep the deny ordering and make *issuing* a warning a village-held power. **He
has overtaken that. The ability goes.**

**The distinction that survives, and it is the whole of the design space you have:**

> **Waning is not removal.** A rule under which unused voice decays over time is legitimate, and it
> is Hypha's to implement for villages that want professional governance. **An act by which one
> party strips another's earned voice is not legitimate, at any tier, held by anybody.**

## 2 · What is there now

`shared/capabilities.ts:506` is the gate:

```
if ((ctx.badgeDenies ?? []).includes(cap)) return decided(false, "denied by warning badge");
```

It is **Gate 2**, deliberately ahead of role and stage, and the file's own comments say so in several
places: *"A warning badge's deny suspends it, which is the whole reason the deny path outranks role
and stage."* `server/lib/badges.ts:52` carries `denies: string[]` on a badge.

Round 6 measured what this does: **a warning badge denying `ballot.vote` removes a member from
`ballot_electorate` on every ballot opened afterwards**, the badge is invisible on her own badge
page, and `ballot.vote` is deliberately non-transferable, **so the village can never take that power
back.** That combination is what made it disenfranchisement held by the scaffolding.

## 3 · What to do, and the judgement I want brought back rather than guessed

**Certain, do it:** no badge, role, stage, admin, or any other actor may deny `ballot.vote` or any
capability that constitutes having a voice in a decision. Remove that ability.

**The boundary is genuinely unclear and it is yours to map, not to settle alone.** "Denying a voice"
plainly covers voting. It may or may not cover things like posting, messaging, or proposing.

1. **Enumerate every capability a badge can currently deny**, from the code rather than from a list
   somebody wrote. For each, classify: **VOICE (a say in a decision)**, **EXPRESSION (speaking, but
   not deciding)**, or **NEITHER**.
2. **Remove the VOICE ones with certainty.**
3. **Bring me the EXPRESSION ones with your recommendation and do not remove them unilaterally.** A
   village silencing a harasser is a different act from a village disenfranchising a dissenter, and
   the founder ruled on the second. **Guessing which way he would rule on the first is exactly what
   a lane must not do.**
4. **Sweep for every other path that reduces earned voice**, not only badges. Anything that debits,
   burns, expires, zeroes or withholds a voice balance or a vote. **For each, say whether it is
   time-and-rule-based (legitimate waning) or an act one party performs on another (forbidden).**
   The claim-bridge debits and the token sinks are worth looking at closely: a debit a member chose
   is not a removal, and one they did not choose is.

## 4 · What must not break

**This is governance. A defect here is a village's decision being wrong or lost.**

- **The snapshot law**: a vote is counted against the day it opened, and every dial, weight and roll
  member is frozen at open. `ballots.test.ts` pins it. **Run it unmodified and green.**
- **The electorate is built by running the gate over every member with no request**, which is why
  `ballot.vote` has no override to read and no request to attribute. Removing a deny must not change
  how the roll is built for anyone who was already on it.
- **Gate ordering.** The file documents the deny path as beating role and stage on purpose. Removing
  one input from a gate that other rules depend on can quietly change the answer for capabilities you
  did not mean to touch. **Prove the decision is unchanged for a member with no badge, and for a
  member with a badge that denies something you left in place.**
- **Do not delete the badge.** A warning badge may still exist and may still say something true. Lane
  HONEST is making it visible on the member's own surface. **You are removing what it TAKES, not what
  it SAYS.**

## 5 · Your zone

**Yours:** `shared/capabilities.ts`, `server/lib/badges.ts`, the electorate-building path, and the
tests that pin them. `drizzle/0109_*.sql` if a badge's stored denies need cleaning.

**Three lanes are live in this repo.** HONEST holds the badge **display** surfaces, `GameMechanics.tsx`,
`ObjectionPanel.tsx`, `currentCycleId`, the investor-summary routes and the module contract. PRIVACY
holds `ProjectHistory.tsx` and the `FRONTEND_URL` defaults. CARRY holds `GameDashboard.tsx` and the
quest-board section of `Admin.tsx`. **If you need a hunk in any of those, ask me.**

## 6 · Gates and reporting

Standard eighteen-step set. **Write the regression test first and watch it fail**: a member carrying
a badge that denies `ballot.vote` is on the electorate and can vote. Add a second that pins the
refusal you are NOT removing, so the next reader can tell the two apart.

`pnpm build` can exit 0 while the artifact carries the previous commit; check the SHA in `dist`.

Report in the house-rules block, plus **the full classification table from §3.1** and your
recommendation on the EXPRESSION set. **Give two numbers: capabilities a badge could deny before,
and after.**
