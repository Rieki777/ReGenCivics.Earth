/**
 * useQuestUnlocks - derives quest unlock state from existing quest progress.
 * Implements the progression chain:
 *   Fire (always open) -> Spring Rites -> Summer -> Fall -> Winter
 *   ALL rites (1-12) completed -> Epic quests unlock
 *   1 rite per season completed -> Routine, seasonal, anytime, elemental quests unlock
 * No backend changes needed. Pure derived state from useQuestProgressContext.
 */
import { useMemo } from "react";
import { useQuestProgressContext } from "@/components/QuestProgressTracker";
import {
  SEASON_ORDER, RITES_BY_SEASON, ALL_RITE_IDS, SEASON_LABELS,
  type Season,
} from "@/data/seasonConstants";

// Re-export Season for backward compatibility
export type { Season } from "@/data/seasonConstants";

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function useQuestUnlocks() {
  const { isQuestCompleted } = useQuestProgressContext();

  return useMemo(() => {
    const fireComplete = isQuestCompleted("quest-0");

    // Which seasons have at least 1 completed Rite?
    const completedSeasons = SEASON_ORDER.filter(season =>
      RITES_BY_SEASON[season].some(qId => isQuestCompleted(qId))
    );

    // Are ALL 12 rites of passage completed?
    const allRitesComplete = Array.from(ALL_RITE_IDS).every(qId => isQuestCompleted(qId));

    // Build the unlock chain starting from the current real-world season
    const startSeason = getCurrentSeason();
    const startIdx = SEASON_ORDER.indexOf(startSeason);
    const unlockedSeasons: Season[] = [];

    if (fireComplete) {
      unlockedSeasons.push(startSeason);
      for (let i = 1; i < 4; i++) {
        const prevSeason = SEASON_ORDER[(startIdx + i - 1) % 4];
        const nextSeason = SEASON_ORDER[(startIdx + i) % 4];
        if (completedSeasons.includes(prevSeason)) {
          unlockedSeasons.push(nextSeason);
        } else {
          break;
        }
      }
    }

    // 1 per season = routine/seasonal/anytime/elemental unlock gate
    const allSeasonsComplete = completedSeasons.length === 4;

    const isQuestUnlocked = (questId: string): boolean => {
      // Fire and Food Foresting always open
      if (questId === "quest-0" || questId === "food-foresting") return true;
      // Routine quests (Fasting, Love to Heal) require 1 per season
      if (questId === "quest-13" || questId === "quest-14") return allSeasonsComplete;
      // Rites: check if the quest's season is unlocked
      for (const [season, ids] of Object.entries(RITES_BY_SEASON)) {
        if (ids.includes(questId)) return unlockedSeasons.includes(season as Season);
      }
      // Seasonal Practices, anytime, elemental: need 1 per season
      // Epics: need ALL rites completed
      return allSeasonsComplete;
    };

    /** Get the season a rite quest belongs to, or null */
    const getQuestSeason = (questId: string): Season | null => {
      for (const [season, ids] of Object.entries(RITES_BY_SEASON)) {
        if (ids.includes(questId)) return season as Season;
      }
      return null;
    };

    /** Get a human-readable lock reason for a season */
    const getSeasonLockReason = (season: Season): string | null => {
      if (unlockedSeasons.includes(season)) return null;
      if (!fireComplete) return "Complete the Fire quest to open " + SEASON_LABELS[season] + " Rites";
      // Find which previous season in the rotation hasn't been completed
      for (let i = 1; i < 4; i++) {
        const checkSeason = SEASON_ORDER[(startIdx + i - 1) % 4];
        const targetSeason = SEASON_ORDER[(startIdx + i) % 4];
        if (targetSeason === season && !completedSeasons.includes(checkSeason)) {
          return "Complete one quest in " + SEASON_LABELS[checkSeason] + " to open " + SEASON_LABELS[season];
        }
      }
      return "Complete one quest in the previous season to open " + SEASON_LABELS[season];
    };

    /** Count completed rites */
    const completedRitesCount = Array.from(ALL_RITE_IDS).filter(qId => isQuestCompleted(qId)).length;

    return {
      fireComplete,
      unlockedSeasons,
      completedSeasons,
      allSeasonsComplete,
      allRitesComplete,
      completedRitesCount,
      currentSeason: startSeason,
      isQuestUnlocked,
      isRiteQuest: (id: string) => ALL_RITE_IDS.has(id),
      getQuestSeason,
      getSeasonLockReason,
      /** Epic quests require ALL 12 rites completed */
      isEpicUnlocked: allRitesComplete,
      /** Routine, seasonal, anytime, elemental require 1 per season */
      isSeasonalPracticeUnlocked: allSeasonsComplete,
      seasonProgress: { completed: completedSeasons.length, total: 4 },
      ritesProgress: { completed: completedRitesCount, total: 13 },
    };
  }, [isQuestCompleted]);
}
