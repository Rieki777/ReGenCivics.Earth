/**
 * useQuestUnlocks - derives quest unlock state from existing quest progress.
 * Implements the progression chain:
 *   Fire (always open) -> current season Rites -> next season -> ... -> all unlocked
 * No backend changes needed. Pure derived state from useQuestProgressContext.
 */
import { useMemo } from "react";
import { useQuestProgressContext } from "@/components/QuestProgressTracker";

export type Season = "spring" | "summer" | "fall" | "winter";

const SEASON_ORDER: Season[] = ["spring", "summer", "fall", "winter"];

const RITES_BY_SEASON: Record<Season, string[]> = {
  spring: ["quest-1", "quest-2", "quest-3"],
  summer: ["quest-4", "quest-5", "quest-6"],
  fall: ["quest-7", "quest-8", "quest-9"],
  winter: ["quest-10", "quest-11", "quest-12"],
};

/** All rite quest IDs (1-12) */
const ALL_RITE_IDS = new Set(Object.values(RITES_BY_SEASON).flat());

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

    const allSeasonsComplete = completedSeasons.length === 4;

    const isQuestUnlocked = (questId: string): boolean => {
      // Fire and Food Foresting always open
      if (questId === "quest-0" || questId === "food-foresting") return true;
      // Fasting (quest 13) requires all 4 seasons
      if (questId === "quest-13") return allSeasonsComplete;
      // Rites: check if the quest's season is unlocked
      for (const [season, ids] of Object.entries(RITES_BY_SEASON)) {
        if (ids.includes(questId)) return unlockedSeasons.includes(season as Season);
      }
      // Seasonal Practices and Epics: need all 4 seasons
      return allSeasonsComplete;
    };

    /** Get the season a rite quest belongs to, or null */
    const getQuestSeason = (questId: string): Season | null => {
      for (const [season, ids] of Object.entries(RITES_BY_SEASON)) {
        if (ids.includes(questId)) return season as Season;
      }
      return null;
    };

    return {
      fireComplete,
      unlockedSeasons,
      completedSeasons,
      allSeasonsComplete,
      currentSeason: startSeason,
      isQuestUnlocked,
      isRiteQuest: (id: string) => ALL_RITE_IDS.has(id),
      getQuestSeason,
      isEpicUnlocked: allSeasonsComplete,
      isSeasonalPracticeUnlocked: allSeasonsComplete,
      seasonProgress: { completed: completedSeasons.length, total: 4 },
    };
  }, [isQuestCompleted]);
}
