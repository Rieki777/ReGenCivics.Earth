/**
 * Fast-lane unit tests for the canonical quest reward resolution used by
 * hyphaBridge.createFromQuest. Locks the security property: the payout
 * amount always comes from shared/quest-rewards.ts, never from the client.
 */
import { describe, expect, it } from "vitest";
import {
  QUEST_REWARDS,
  getQuestReward,
  resolveQuestRegenReward,
} from "@shared/quest-rewards";

describe("resolveQuestRegenReward", () => {
  it("returns the canonical amount when the client value matches", () => {
    const result = resolveQuestRegenReward("quest-5", 99);
    expect(result).toEqual({ regen: 99, mismatch: false });
  });

  it("overrides an inflated client value with the canonical amount", () => {
    const result = resolveQuestRegenReward("quest-5", 9999);
    expect(result).toEqual({ regen: 99, mismatch: true });
  });

  it("overrides a lowballed client value with the canonical amount", () => {
    const result = resolveQuestRegenReward("quest-8", 1);
    expect(result).toEqual({ regen: 222, mismatch: true });
  });

  it("resolves without any client value (new clients omit it)", () => {
    const result = resolveQuestRegenReward("quest-0");
    expect(result).toEqual({ regen: 111, mismatch: false });
  });

  it("returns null for an unknown quest id so callers reject the payout", () => {
    expect(resolveQuestRegenReward("quest-999", 111)).toBeNull();
    expect(resolveQuestRegenReward("made-up-quest")).toBeNull();
    expect(resolveQuestRegenReward("")).toBeNull();
  });

  it("rejects inherited object keys, not just missing ones", () => {
    // A plain bracket lookup would resolve these to Object.prototype members.
    for (const key of ["constructor", "__proto__", "hasOwnProperty", "toString", "valueOf"]) {
      expect(resolveQuestRegenReward(key, 111), `prototype key ${key}`).toBeNull();
      expect(getQuestReward(key), `prototype key ${key}`).toBeUndefined();
    }
  });

  it("covers every quest id in the canonical table", () => {
    for (const [questId, reward] of Object.entries(QUEST_REWARDS)) {
      expect(resolveQuestRegenReward(questId)).toEqual({
        regen: reward.regen,
        mismatch: false,
      });
      expect(getQuestReward(questId)).toEqual(reward);
    }
  });

  it("keeps every canonical amount a sane positive integer", () => {
    for (const reward of Object.values(QUEST_REWARDS)) {
      expect(Number.isInteger(reward.regen)).toBe(true);
      expect(reward.regen).toBeGreaterThan(0);
      expect(reward.regen).toBeLessThanOrEqual(1000);
      expect(reward.rvoice).toBe(1);
    }
  });
});
