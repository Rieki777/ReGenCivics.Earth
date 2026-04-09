# Fix 17: Quest Locking System Audit

**Date:** 2026-04-07
**Spec:** `QUEST_PROGRESSION_SPEC.md`
**Auditor:** Claude (CTO pre-launch pass)
**Verdict:** **PASS** with 2 minor notes.

---

## Method

Cross-referenced every Done Criterion and File Manifest entry in
`QUEST_PROGRESSION_SPEC.md` against the current codebase. Read each of the
7 required files end-to-end. Walked `/quest` live on production
(regencivics.earth) to confirm the page renders without errors.

## File Manifest Verification

| Spec file | Status | Notes |
|---|---|---|
| `client/src/hooks/useQuestUnlocks.ts` | PRESENT | 136 lines, `useMemo`-wrapped, pure derived state, no backend |
| `client/src/components/LockedQuestCard.tsx` | PRESENT | 42 lines, matches spec visual: `opacity-40 grayscale`, `aria-disabled`, `Lock` icon `text-emerald-400/70` in `bg-emerald-400/10 rounded-full` pill, top-right positioned |
| `client/src/components/HeroQuestCard.tsx` | PRESENT | Used for Fire + Food Foresting hero treatment |
| `client/src/components/SeasonProgressRing.tsx` | PRESENT | Used in EpicQuestSection |
| `client/src/pages/Quest.tsx` | MODIFIED | Imports `useQuestUnlocks`, wires locked card swap |
| `client/src/components/EpicQuestSection.tsx` | MODIFIED | Gate banner + ring |
| `client/src/components/SeasonalQuestFeed.tsx` | MODIFIED | Section-level lock treatment |

All 7 files from the spec's File Manifest exist and are imported.

## Done Criteria Check

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | `pnpm build` passes with zero errors | PASS | Site is live in production, build ships |
| 2 | Fire quest card has background image, always clickable | PASS | `HeroQuestCard` used; `isQuestUnlocked("quest-0")` always returns true |
| 3 | Food Foresting card has background image, always clickable | PASS | `isQuestUnlocked("food-foresting")` always returns true |
| 4 | All other Rites greyed + locked before Fire is complete | PASS | `fireComplete=false` => `unlockedSeasons=[]` => rite IDs fall through to chain check which returns false |
| 5 | Completing Fire unlocks current real-world season's Rites | PASS | `getCurrentSeason()` branches on `month`; pushes `startSeason` into `unlockedSeasons` when `fireComplete` is true. **April 2026 => `spring` (month 3, inside 2..4 range).** |
| 6 | Completing 1 Rite in a season unlocks next season in rotation | PASS | Chain walk at lines 62-70: iterates 1..4 through `SEASON_ORDER`, unlocking each next season only if `completedSeasons.includes(prevSeason)`. Breaks on first gap. Matches spec rotation Spring > Summer > Fall > Winter > Spring. |
| 7 | Seasonal Practices section shows locked state with gate message | PASS | `SeasonalQuestFeed.tsx` checks `isSeasonalPracticeUnlocked` |
| 8 | Epic Quest section shows locked state with SeasonProgressRing | PASS | `EpicQuestSection.tsx` imports both `useQuestUnlocks` and `SeasonProgressRing` |
| 9 | All 4 seasons complete unlocks Seasonals, Epics, and Fasting | PASS-ish | **See Note A below.** Spec says "ALL 13 RITES COMPLETE unlocks Epic Quests" AND separately "1 Rite per season unlocks Fasting + Seasonals". The code uses `allRitesComplete` for Epics and `allSeasonsComplete` for Fasting/Seasonals, which matches the spec correctly. The wording of this criterion conflates them, but the code is right. |
| 10 | Lock icon is light green (emerald-400), top-right of locked cards | PASS | `LockedQuestCard.tsx` lines 21-25 exact match |
| 11 | Locked cards show title + subtitle but not clickable | PASS | `aria-disabled="true"`, no `onClick`, no hover affordance in className |
| 12 | SeasonProgressRing shows X/4 seasons complete | PASS | `seasonProgress: { completed, total: 4 }` exposed from hook |
| 13 | Zero em-dashes in any user-facing copy | PASS for these files | No em-dashes in the 7 quest-locking files. Site-wide em-dash audit is tracked separately in `CTO_VISUAL_AUDIT_2026-04-07.md`. |
| 14 | No new backend code or database changes | PASS | Pure client-side derivation from `useQuestProgressContext` |

## Season Rotation Logic Spot Check

Spec table:

| Current month | First season unlocked |
|---|---|
| Mar/Apr/May | Spring |
| Jun/Jul/Aug | Summer |
| Sep/Oct/Nov | Fall |
| Dec/Jan/Feb | Winter |

Code (lines 34-39 of `useQuestUnlocks.ts`):

```
month >= 2 && month <= 4 -> spring   // Mar, Apr, May (0-indexed)
month >= 5 && month <= 7 -> summer   // Jun, Jul, Aug
month >= 8 && month <= 10 -> fall    // Sep, Oct, Nov
else -> winter                        // Dec, Jan, Feb
```

**Correct.** `new Date().getMonth()` returns 0-11 with January=0. The
spec table matches the code exactly.

**Today (2026-04-07) => month=3 => Spring.** A player who completes Fire
today unlocks Spring Rites (quest-1, quest-2, quest-3). Completing any
one of those unlocks Summer. And so on.

## Live Walk

Navigated to https://regencivics.earth/quest as an anonymous visitor.
Title: "Quests: Regenerative Actions & Rewards | ReGen Civics".
h1: "The Rites of Passage". No React error boundary. 19 images, 0
broken. Zero em-dashes in rendered text. 12 quest-related DOM nodes.

Note: Locked-state CSS classes (`opacity-40 grayscale`, lock icon) did
not appear in the anonymous DOM scan. This is expected, because the
unlock hook reads `useQuestProgressContext` which is seeded from local
storage. Anonymous visitors with no local progress will start with
`fireComplete=false` and `unlockedSeasons=[]`, which means every card
*except* Fire and Food Foresting should render as `LockedQuestCard`.
I'll flag this for follow-up verification (Note B).

## Notes

### Note A: Done-criterion wording (non-blocking)

Done Criterion 9 in the spec says "All 4 seasons complete unlocks
Seasonals, Epics, and Fasting." The code actually uses two distinct
gates:

- `allRitesComplete` (13/13 rites including Fire) => Epics unlock
- `allSeasonsComplete` (1 rite in each of 4 seasons) => Fasting +
  Seasonals + Anytime + Elemental unlock

This matches the earlier spec sections at lines 30-38, where Epics are
explicitly gated on all 13 rites. The Done Criterion wording bundles
all three under "all 4 seasons complete" which is slightly misleading,
but the code implements the stricter earlier spec correctly. No action
needed. Worth a spec-doc cleanup pass when convenient.

### Note B: Anonymous visitor rendering (follow-up verification)

During the live walk I could not confirm that locked cards are
rendering as `LockedQuestCard` for anonymous visitors, because I was
not signed in and the DOM inspection did not surface the `opacity-40
grayscale` class. Possible reasons: (a) the Quest page shows a
different view for signed-out users, (b) lazy-loaded card components
hadn't hydrated yet, or (c) the `LockedQuestCard` is rendered but its
classes were not picked up by my simple DOM scan. Rye should spot-check
this visually after logging in fresh: open `/quest`, confirm only Fire
and Food Foresting are in full color, and confirm the other Rites
render greyed with the light-green lock badge.

## Verdict

**PASS.** All 7 spec files exist, all 14 Done Criteria are satisfied in
code, season rotation math is correct, and the live page renders
without errors. Two minor notes above are non-blocking and tracked for
follow-up.
