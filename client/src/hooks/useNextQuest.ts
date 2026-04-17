/**
 * useNextQuest - returns the single best "next quest" for the player.
 *
 * Priority order:
 *   1. Fire quest (quest-0) if not completed
 *   2. First uncompleted Rite in the current real-world season
 *   3. First uncompleted Rite in the next unlocked season (rotation order)
 *   4. First uncompleted seasonal depth quest for current season
 *   5. First uncompleted routine quest (quest-13, quest-14)
 *   6. null (all Rites done, show "Explore Epic Quests" prompt)
 */
import { useMemo } from "react";
import { useQuestProgressContext } from "@/components/QuestProgressTracker";
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { questData } from "@/data/questData";
import { seasonalQuestsData } from "@/data/seasonalQuestsData";
import {
  SEASON_ORDER, RITE_NUMBERS_BY_SEASON, SEASON_LABELS,
  type Season,
} from "@/data/seasonConstants";

const ALL_RITES = [
  questData.intro,
  ...questData.spring,
  ...questData.summer,
  ...questData.fall,
  ...questData.winter,
];

export type NextQuestResult = {
  questId: string;
  title: string;
  subtitle: string;
  season: Season | null;
  questNumber: number | null;
  type: "fire" | "rite" | "seasonal" | "routine" | "epic";
  prompt: string;
} | null;

export function useNextQuest(): NextQuestResult {
  const { isQuestCompleted } = useQuestProgressContext();
  const unlocks = useQuestUnlocks();

  return useMemo(() => {
    // 1. Fire quest if not completed
    if (!isQuestCompleted("quest-0")) {
      return {
        questId: "quest-0",
        title: questData.intro.title,
        subtitle: questData.intro.subtitle,
        season: null,
        questNumber: 0,
        type: "fire",
        prompt: "Begin your journey",
      };
    }

    // Build rotation order starting from current season
    const startIdx = SEASON_ORDER.indexOf(unlocks.currentSeason);
    const rotated: Season[] = [];
    for (let i = 0; i < 4; i++) {
      rotated.push(SEASON_ORDER[(startIdx + i) % 4]);
    }

    // 2 & 3. First uncompleted Rite in rotation order
    for (const season of rotated) {
      if (!unlocks.unlockedSeasons.includes(season)) continue;

      const riteIds = RITE_NUMBERS_BY_SEASON[season];
      for (const riteId of riteIds) {
        const questId = `quest-${riteId}`;
        if (!isQuestCompleted(questId)) {
          const questInfo = ALL_RITES.find(q => q.id === riteId);
          if (!questInfo) continue;

          const seasonLabel = SEASON_LABELS[season];
          const isFirstInSeason = riteIds[0] === riteId;
          const isCrossSeason = season !== unlocks.currentSeason;
          let prompt: string;
          if (isCrossSeason) {
            prompt = `Step into ${seasonLabel}`;
          } else if (isFirstInSeason) {
            prompt = `Start your ${seasonLabel} Rites`;
          } else {
            prompt = `Continue your ${seasonLabel} Rites`;
          }

          return {
            questId,
            title: questInfo.title,
            subtitle: questInfo.subtitle,
            season,
            questNumber: riteId,
            type: "rite" as const,
            prompt,
          };
        }
      }
    }

    // 4. First uncompleted seasonal depth quest for current season
    if (unlocks.isSeasonalPracticeUnlocked) {
      const currentSeasonDepth = seasonalQuestsData.filter(
        sq => sq.season === unlocks.currentSeason
      );
      for (const sq of currentSeasonDepth) {
        if (!isQuestCompleted(sq.id)) {
          return {
            questId: sq.id,
            title: sq.title,
            subtitle: sq.tagline,
            season: unlocks.currentSeason,
            questNumber: null,
            type: "seasonal" as const,
            prompt: "Deepen your practice",
          };
        }
      }
    }

    // 5. Routine quests
    if (unlocks.isSeasonalPracticeUnlocked) {
      if (!isQuestCompleted("quest-13")) {
        return {
          questId: "quest-13",
          title: questData.routine.title,
          subtitle: questData.routine.subtitle,
          season: null,
          questNumber: 13,
          type: "routine" as const,
          prompt: "Build your rhythm",
        };
      }
      if (!isQuestCompleted("quest-14")) {
        return {
          questId: "quest-14",
          title: questData.routine2.title,
          subtitle: questData.routine2.subtitle,
          season: null,
          questNumber: 14,
          type: "routine" as const,
          prompt: "Build your rhythm",
        };
      }
    }

    // 6. All done
    return null;
  }, [isQuestCompleted, unlocks]);
}
