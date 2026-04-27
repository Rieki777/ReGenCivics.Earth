/**
 * Quest pool + path metadata.
 *
 * Lookup table that classifies each quest by its pool (welcome_aboard,
 * rite_of_passage, routine, open_universe) and path (player, investor,
 * land_project, ally, shared). The tier detector and the Quest page
 * redesign both consume this.
 *
 * For Phase 1 of QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md, the detector
 * only needs to know which quests count as Rites of Passage so it can
 * detect the ReGen Player Co-Creator milestone (all 14 Rites complete).
 *
 * Phase 3 (Quest page redesign) will consume the full pool/path metadata
 * to render the four-portal selector and the ring-grouped quest list.
 *
 * Source of truth lives here; questData.ts entries are not tagged
 * inline. This keeps the canonical quest content readable and lets the
 * pool/path classification evolve independently of the content.
 */

export type QuestPool = "welcome_aboard" | "rite_of_passage" | "routine" | "open_universe";
export type QuestPath = "player" | "investor" | "land_project" | "ally" | "shared";

/**
 * Quest IDs that make up the 14 Rites of Passage.
 * Quest 0 (Fire) through Quest 13 (Fasting). Quest 14 (Food Foresting)
 * is a routine quest (always available, not part of the Rite count).
 *
 * Confirmed by Rye 2026-04-26.
 */
export const RITES_OF_PASSAGE_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

/**
 * Quest IDs that are routine / always-available quests, outside the
 * Rite count and outside the Open Universe progressive reveal.
 */
export const ROUTINE_QUEST_IDS = [14] as const;

/**
 * Total Rite count required to earn ReGen Player Co-Creator title.
 */
export const RITES_OF_PASSAGE_COUNT = RITES_OF_PASSAGE_IDS.length;

/**
 * Quest count required for ReGen Player Steward criterion (along with
 * 144 proposal votes). Per spec: counts ALL completed quests across
 * every pool (Welcome Aboard + Rites + Routine + Open Universe).
 */
export const PLAYER_STEWARD_QUEST_COUNT = 33;

/**
 * Proposal vote count required for ReGen Player Steward criterion.
 */
export const PLAYER_STEWARD_VOTE_COUNT = 144;

/**
 * Tier bonus amounts (RGVoice). Paid once per path on first earn of
 * each tier. Sage paid once cross-path.
 */
export const TIER_BONUS = {
  co_creator: 77,
  steward: 144,
  sage: 233,
} as const;

/**
 * Sage criterion: contribution percentile threshold and density of
 * days that must meet it within a season for Sage to fire.
 */
export const SAGE_PERCENTILE_THRESHOLD = 80;
export const SAGE_DAYS_PERCENTAGE_REQUIRED = 80; // 80% of season days

/**
 * Returns the pool classification for a given quest ID.
 * Welcome Aboard quests live in welcomeAboardQuests.ts and use a
 * separate string-based ID space, so this helper accepts numeric IDs
 * for the main quest set only.
 */
export function questPoolForId(questId: number): QuestPool {
  if ((RITES_OF_PASSAGE_IDS as readonly number[]).includes(questId)) {
    return "rite_of_passage";
  }
  if ((ROUTINE_QUEST_IDS as readonly number[]).includes(questId)) {
    return "routine";
  }
  // Anything else from epicQuestsData / seasonalQuestsData is Open Universe.
  return "open_universe";
}

/**
 * Returns the path tag for a given quest ID. Most quests are 'shared'
 * (count for any path). The 14 Rites are 'player' (only count toward
 * the ReGen Player path's Co-Creator milestone, though they also count
 * toward the 'all completed quests' Steward tally for any path).
 */
export function questPathForId(questId: number): QuestPath {
  if ((RITES_OF_PASSAGE_IDS as readonly number[]).includes(questId)) {
    return "player";
  }
  return "shared";
}

/**
 * Parses a stored questId string (as used in quest_completions.questId)
 * and returns the numeric ID if it matches a known main-quest pattern.
 *
 * Known patterns:
 *   "quest-0", "quest-1", ..., "quest-14"    (canonical)
 *   "0", "1", ..., "14"                      (occasional bare numeric)
 *   "fire", "potion-brewing", ...             (slug-based, rare)
 *
 * Returns null if the string doesn't match any of these. Slug-based
 * lookups would need a slug-to-id map; since slugs aren't currently
 * passed through here in any production path we read from, we don't
 * implement that until the need actually appears.
 */
export function parseQuestIdToNumber(stored: string | null | undefined): number | null {
  if (!stored) return null;
  const m = /^quest-(\d+)$/.exec(stored);
  if (m) return Number(m[1]);
  if (/^\d+$/.test(stored)) return Number(stored);
  return null;
}

/**
 * Returns true if the given stored questId represents a Rite of Passage.
 */
export function isRiteOfPassage(storedQuestId: string | null | undefined): boolean {
  const id = parseQuestIdToNumber(storedQuestId);
  if (id === null) return false;
  return (RITES_OF_PASSAGE_IDS as readonly number[]).includes(id);
}
