/**
 * Nine forms of capital — shared constants used by the server
 * (contribution scoring, capital score cache) and the client (profile
 * Living Tree and Contribution Compass, quest capital mapping).
 */

export const CAPITAL_TYPES = [
  "intellectual",
  "social",
  "material",
  "financial",
  "living",
  "cultural",
  "spiritual",
  "experiential",
  "health",
] as const;

export type CapitalType = (typeof CAPITAL_TYPES)[number];

/**
 * Maps quest categories to the capital they primarily feed. Used when a
 * quest completion lands so we can bump the right capital on the player's
 * cached score row.
 */
export const QUEST_CATEGORY_TO_CAPITAL: Record<string, CapitalType> = {
  governance: "intellectual",
  "community-building": "social",
  infrastructure: "material",
  fundraising: "financial",
  "land-stewardship": "living",
  storytelling: "cultural",
  ceremony: "spiritual",
  events: "experiential",
  wellness: "health",
};

/** Returns a zeroed score object with every capital set to 0. */
export function zeroCapitalScores(): Record<CapitalType, number> {
  return CAPITAL_TYPES.reduce((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {} as Record<CapitalType, number>);
}
