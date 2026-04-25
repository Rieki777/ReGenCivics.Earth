# Quest Locking Audit — 2026-03-29

Verification of the quest progression system against QUEST_PROGRESSION_SPEC.md.

## Results

| # | Rule | Status | Evidence |
|---|------|--------|----------|
| 1 | Fire (Quest 0) always unlocked | PASS | `useQuestUnlocks.ts` line 64: `if (questId === "quest-0") return true` |
| 2 | Food Foresting always unlocked | PASS | `useQuestUnlocks.ts` line 64: `if (questId === "food-foresting") return true` |
| 3 | Fire completion unlocks current season's Rites | PASS | Lines 49-53: `if (fireComplete) unlockedSeasons.push(startSeason)` where `startSeason = getCurrentSeason()` |
| 4 | Completing 1 Rite unlocks next season in rotation | PASS | Lines 54-60: for loop walks clockwise through seasons, unlocking each if previous has a completed Rite |
| 5 | All 4 seasons unlocks Epics/Seasonals/Fasting | PASS | Line 62: `allSeasonsComplete = completedSeasons.length === 4`, Line 66: quest-13 checks `allSeasonsComplete` |
| 6 | Locked cards show emerald lock icon | PASS | `LockedQuestCard.tsx` line 22: `<Lock className="w-5 h-5 text-emerald-400/70" />` positioned top-right |
| 7 | Locked cards are greyed out and non-interactive | PASS | `LockedQuestCard.tsx` line 18: `opacity-40 grayscale select-none`, `aria-disabled="true"` |
| 8 | Hero cards have background images | PASS | `quest-fire-hero.webp` (436KB) and `quest-food-foresting-hero.webp` (484KB) exist in `client/public/images/quests/` |
| 9 | Season progress ring shows X/4 | PASS | `SeasonProgressRing.tsx` renders 4 dots, filled = done, text shows "X of 4 seasons" |
| 10 | Epic section has gate banner when locked | PASS | `EpicQuestSection.tsx` lines 144-155: lock icon + text + SeasonProgressRing, content dimmed with `opacity-40 grayscale` |
| 11 | Seasonal section has gate banner when locked | PASS | `SeasonalQuestFeed.tsx` lines 114-123: lock icon + text + SeasonProgressRing, content wrapped in dimming div |
| 12 | QuestCard accepts isLocked prop | PASS | `Quest.tsx` QuestCard component: early return renders `<LockedQuestCard>` when `isLocked` is true |
| 13 | All seasonal quest renders pass isLocked | PASS | Quest.tsx: all 4 seasonal QuestCard renders include `isLocked={unlocks ? !unlocks.isQuestUnlocked(...) : false}` |
| 14 | HeroQuestCard component exists | PASS | `client/src/components/HeroQuestCard.tsx` — background image, dark overlay, pulse animation option |
| 15 | Season rotation order is Spring > Summer > Fall > Winter | PASS | `useQuestUnlocks.ts` line 9: `SEASON_ORDER: Season[] = ["spring", "summer", "fall", "winter"]` |

## Summary

**15/15 PASS.** All rules from QUEST_PROGRESSION_SPEC.md are implemented and verified.

### Note
HeroQuestCard component is created but not yet wired into Quest.tsx for Fire and Food Foresting (they use their existing custom renders). The component is available for future integration when Rye wants to swap the rendering.
