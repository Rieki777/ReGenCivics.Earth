/**
 * Canonical quest reward amounts, keyed by the quest id strings used across
 * questCompletions, activeQuestSignals, and the Hypha bridge ("quest-5",
 * "food-foresting", "healing-five-bodies", ...).
 *
 * This is the server-side source of truth for what a quest pays. The client
 * data files (client/src/data/questData.ts, seasonalQuestsData.ts) and the
 * quest detail map (QuestDetailModal.tsx) must agree with it; a parity test
 * (client/src/data/quest-rewards-parity.test.ts) fails the suite if they
 * drift. The Hypha bridge resolves payout amounts from here and never trusts
 * a client-supplied reward value.
 */

export interface QuestReward {
  regen: number;
  rvoice: number;
}

export const QUEST_REWARDS: Record<string, QuestReward> = {
  // Rites of Passage (questData.ts + questDetailsData)
  "quest-0": { regen: 111, rvoice: 1 },
  "quest-1": { regen: 111, rvoice: 1 },
  "quest-2": { regen: 111, rvoice: 1 },
  "quest-3": { regen: 144, rvoice: 1 },
  "quest-4": { regen: 111, rvoice: 1 },
  "quest-5": { regen: 99, rvoice: 1 },
  "quest-6": { regen: 144, rvoice: 1 },
  "quest-7": { regen: 111, rvoice: 1 },
  "quest-8": { regen: 222, rvoice: 1 },
  "quest-9": { regen: 99, rvoice: 1 },
  "quest-10": { regen: 177, rvoice: 1 },
  "quest-11": { regen: 177, rvoice: 1 },
  "quest-12": { regen: 111, rvoice: 1 },
  "quest-13": { regen: 77, rvoice: 1 },
  "quest-14": { regen: 111, rvoice: 1 },
  "food-foresting": { regen: 111, rvoice: 1 },

  // Seasonal depth quests (seasonalQuestsData.ts)
  "healing-five-bodies": { regen: 144, rvoice: 1 },
  "study-natural-hygiene": { regen: 111, rvoice: 1 },
  "community-currency": { regen: 333, rvoice: 1 },
  "friendship-free-animal": { regen: 111, rvoice: 1 },
  "honey-moon": { regen: 144, rvoice: 1 },
  "singing-food-forest": { regen: 77, rvoice: 1 },
  "animal-spirit-totems": { regen: 111, rvoice: 1 },
  "future-casting": { regen: 77, rvoice: 1 },
  "eating-sunlight": { regen: 99, rvoice: 1 },
  "becoming-trauma-informed": { regen: 111, rvoice: 1 },
  "write-childrens-book": { regen: 177, rvoice: 1 },
  "make-a-song": { regen: 111, rvoice: 1 },
  "recreate-personal-cycles": { regen: 111, rvoice: 1 },
  "decrease-expenses": { regen: 77, rvoice: 1 },
  "hermetic-seal": { regen: 144, rvoice: 1 },
  "start-friend-pool": { regen: 111, rvoice: 1 },
  "present-parenting": { regen: 444, rvoice: 1 },
  "fifth-agreement": { regen: 99, rvoice: 1 },
  "regen-financial-systems": { regen: 333, rvoice: 1 },
  "your-honey-moon": { regen: 144, rvoice: 1 },
  "make-song-regeneration": { regen: 111, rvoice: 1 },
  "decrease-expenses-increase-joy": { regen: 77, rvoice: 1 },
  "the-fifth-agreement": { regen: 99, rvoice: 1 },
  // Ringing Cedars pays 33 per book; the canonical base amount is one book.
  "ringing-cedars": { regen: 33, rvoice: 1 },
};

/**
 * Own-property lookup. A plain bracket read would resolve inherited keys
 * ("constructor", "__proto__", "toString", ...) to truthy prototype members
 * and let a fake quest id slip past the unknown-quest rejection.
 */
export function getQuestReward(questId: string): QuestReward | undefined {
  return Object.prototype.hasOwnProperty.call(QUEST_REWARDS, questId)
    ? QUEST_REWARDS[questId]
    : undefined;
}

/**
 * Resolve the $ReGen amount a quest submission may request.
 *
 * Returns the canonical amount for the quest, flagging (but never honoring)
 * a client-supplied value that disagrees. Returns null for unknown quest ids
 * so callers reject rather than pay out for a quest that does not exist.
 */
export function resolveQuestRegenReward(
  questId: string,
  clientValue?: number,
): { regen: number; mismatch: boolean } | null {
  const canonical = getQuestReward(questId);
  if (!canonical || typeof canonical.regen !== "number") return null;
  return {
    regen: canonical.regen,
    mismatch: clientValue !== undefined && clientValue !== canonical.regen,
  };
}
