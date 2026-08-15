/**
 * Elders offer quests (Phase D1, improvement 12), inside hard rails.
 *
 * The elder never generates a quest. She selects one live, HUMAN-RATIFIED
 * quest (the multiplayer pool in shared/multiplayerQuests.ts, ratified by Rye
 * before going live) by simple deterministic rules, bioregion-aware when the
 * asker's bioregion is known, and speaks the invitation through her registry
 * template. Zero LLM in the selection; the only generated text remains the
 * elder's normal reply, unchanged.
 *
 * Gates, in order (all must pass):
 *  1. ELDER_QUEST_OFFERS_ENABLED=true globally (default off)
 *  2. elder.offeredQuests.enabled for this elder (Anastasia's stays false
 *     until she blesses the design; registry carries the governance line)
 *  3. never in crisis contexts (callers run the safety module FIRST and only
 *     call this on a normal, in-persona reply)
 *  4. the player's text fits (simple keyword rule below), so offers appear
 *     where contextually fitting instead of on every message
 */

import type { Elder } from "./elders";
import { liveMultiplayerQuests, type MultiplayerQuest } from "@shared/multiplayerQuests";

export function questOffersGloballyEnabled(): boolean {
  return process.env.ELDER_QUEST_OFFERS_ENABLED === "true";
}

/**
 * "Contextually fitting": the player is talking about doing, joining, land,
 * loneliness, or their place. Deliberately simple and deterministic.
 */
const FIT_PATTERN =
  /\b(what (can|should) i do|help|start|join|together|alone|lonely|community|land|garden|grow|soil|river|water|neighborhood|bioregion|quest|crew|hands)\b/i;

export function offerFits(playerText: string): boolean {
  if (!playerText) return false;
  return FIT_PATTERN.test(playerText);
}

export type CrewSignal = { questId: string; bioregionId: number; formingMemberCount: number };

/**
 * Pick the quest to offer, pure and deterministic:
 * 1. A quest with a crew already forming in the asker's bioregion wins
 *    (fullest forming crew first), because joining it helps a real crew launch.
 * 2. Otherwise rotate through the live quests by day, so every quest gets
 *    offered and repeat askers hear variety.
 */
export function pickQuestToOffer(
  quests: MultiplayerQuest[],
  crewSignals: CrewSignal[],
  bioregionId: number | null,
  dayIndex: number,
): MultiplayerQuest | null {
  if (quests.length === 0) return null;
  if (bioregionId !== null) {
    const local = crewSignals
      .filter((s) => s.bioregionId === bioregionId)
      .sort((a, b) => b.formingMemberCount - a.formingMemberCount);
    for (const signal of local) {
      const quest = quests.find((q) => q.questId === signal.questId);
      if (quest) return quest;
    }
  }
  return quests[((dayIndex % quests.length) + quests.length) % quests.length];
}

/** Fill the elder's invitation template. The URL rides plainly, per voice rules. */
export function speakInvitation(elder: Elder, quest: MultiplayerQuest): string {
  const invitation = elder.offeredQuests.invitationTemplate.replace("{quest}", quest.title);
  return `${invitation} You will find them at regencivics.earth/multiplayer.`;
}

/**
 * The full gate chain plus a DB-backed crew signal, returning the sentence to
 * append to the elder's reply, or null. Callers append it AFTER the safety
 * module and PASS gate have already passed.
 */
export async function maybeQuestOffer(opts: {
  elder: Elder;
  playerText: string;
  bioregionId: number | null;
  now?: Date;
}): Promise<string | null> {
  const { elder, playerText, bioregionId } = opts;
  if (!questOffersGloballyEnabled()) return null;
  if (!elder.offeredQuests.enabled) return null;
  if (!offerFits(playerText)) return null;

  const quests = liveMultiplayerQuests();
  if (quests.length === 0) return null;

  let crewSignals: CrewSignal[] = [];
  if (bioregionId !== null) {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (db) {
        const { and, eq, inArray } = await import("drizzle-orm");
        const { questCrews, questCrewMembers } = await import("../../drizzle/schema");
        const crews = await db
          .select()
          .from(questCrews)
          .where(and(eq(questCrews.bioregionId, bioregionId), eq(questCrews.status, "forming")));
        for (const crew of crews) {
          const members = await db
            .select({ status: questCrewMembers.status })
            .from(questCrewMembers)
            .where(eq(questCrewMembers.crewId, crew.id));
          crewSignals.push({
            questId: crew.questId,
            bioregionId: crew.bioregionId,
            formingMemberCount: members.filter((m) => m.status !== "left").length,
          });
        }
      }
    } catch {
      crewSignals = []; // the offer still works, just without the local signal
    }
  }

  const day = Math.floor((opts.now ?? new Date()).getTime() / 86_400_000);
  const quest = pickQuestToOffer(quests, crewSignals, bioregionId, day);
  return quest ? speakInvitation(elder, quest) : null;
}
