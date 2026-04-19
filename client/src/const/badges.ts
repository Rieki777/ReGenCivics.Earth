/**
 * Badge definitions, shared constant used by client and (via import) server.
 * Adding a new badge: add an entry to BADGE_DEFS. No DB migration required.
 */

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;
  ringColor: string;
  ringGradient: string;
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    id: "welcome_aboard",
    name: "Welcome Aboard",
    description: "Completed all 10 Welcome Aboard Quests",
    tier: "gold",
    icon: "🌿",
    ringColor: "#d4a574",
    ringGradient: "linear-gradient(135deg, #d4a574, #f0c070, #d4a574)",
  },
  {
    id: "rites_of_passage",
    name: "Rites of Passage",
    description: "Completed all 13 Rites of Passage Quests",
    tier: "platinum",
    icon: "🔥",
    ringColor: "#7dd87d",
    ringGradient: "linear-gradient(135deg, #7dd87d, #a8f0a8, #7dd87d)",
  },
  {
    id: "campaign_contributor",
    name: "Campaign Contributor",
    description: "Contributed to a ReGen Civics campaign",
    tier: "bronze",
    icon: "🌱",
    ringColor: "#7dd87d",
    ringGradient: "linear-gradient(135deg, #7dd87d, #7dd87d, #7dd87d)",
  },
  {
    id: "campaign_launcher",
    name: "Campaign Launcher",
    description: "Launched a ReGen Civics crowd-pooling campaign",
    tier: "silver",
    icon: "🚀",
    ringColor: "#7dd87d",
    ringGradient: "linear-gradient(135deg, #7dd87d, #e9d5ff, #7dd87d)",
  },
  {
    id: "cedar_keeper",
    name: "Cedar Keeper",
    description: "Completed all 10 Ringing Cedars books",
    tier: "gold",
    icon: "🌲",
    ringColor: "#5a7a3a",
    ringGradient: "linear-gradient(135deg, #5a7a3a, #8ab45a, #5a7a3a)",
  },
];

const TIER_PRIORITY: BadgeTier[] = ["platinum", "gold", "silver", "bronze"];

export const BADGE_DEF_MAP: Record<string, BadgeDef> = Object.fromEntries(
  BADGE_DEFS.map((b) => [b.id, b])
);

/** Returns the highest-tier badge ID from a list of badge IDs, or null if none. */
export function getHighestBadgeId(badgeIds: string[]): string | null {
  for (const tier of TIER_PRIORITY) {
    const found = badgeIds.find((id) => BADGE_DEF_MAP[id]?.tier === tier);
    if (found) return found;
  }
  return null;
}
