/**
 * Parity lock between the canonical reward table (shared/quest-rewards.ts,
 * the server-side source of truth for Hypha payouts) and the client data
 * files that display rewards. If a reward changes in one place and not the
 * other, this suite fails before the drift reaches players.
 */
import { describe, expect, it } from "vitest";
import { QUEST_REWARDS } from "@shared/quest-rewards";
import { questData } from "@/data/questData";
import { seasonalQuestsData } from "@/data/seasonalQuestsData";
import { questDetailsData } from "@/components/QuestDetailModal";

describe("quest reward parity", () => {
  it("questData rewards match the canonical table", () => {
    const entries: Array<{ questId: string; reward: { regen: number; rvoice: number } }> = [
      { questId: "quest-0", reward: questData.intro.reward },
      ...questData.spring.map((q) => ({ questId: `quest-${q.id}`, reward: q.reward })),
      ...questData.summer.map((q) => ({ questId: `quest-${q.id}`, reward: q.reward })),
      ...questData.fall.map((q) => ({ questId: `quest-${q.id}`, reward: q.reward })),
      ...questData.winter.map((q) => ({ questId: `quest-${q.id}`, reward: q.reward })),
      { questId: `quest-${questData.routine.id}`, reward: questData.routine.reward },
      { questId: `quest-${questData.routine2.id}`, reward: questData.routine2.reward },
      { questId: "food-foresting", reward: questData.featured.reward },
    ];
    for (const { questId, reward } of entries) {
      expect(QUEST_REWARDS[questId], `missing canonical entry for ${questId}`).toBeDefined();
      expect(QUEST_REWARDS[questId], `reward drift on ${questId}`).toEqual(reward);
    }
  });

  it("seasonal quest rewards match the canonical table", () => {
    for (const quest of seasonalQuestsData) {
      expect(QUEST_REWARDS[quest.id], `missing canonical entry for ${quest.id}`).toBeDefined();
      expect(QUEST_REWARDS[quest.id], `reward drift on ${quest.id}`).toEqual(quest.reward);
    }
  });

  it("quest detail map rewards match the canonical table", () => {
    for (const [questId, detail] of Object.entries(questDetailsData)) {
      expect(QUEST_REWARDS[questId], `missing canonical entry for ${questId}`).toBeDefined();
      expect(
        QUEST_REWARDS[questId].regen,
        `reward drift on ${questId} in questDetailsData`,
      ).toBe(detail.rewards.regen);
    }
  });
});
