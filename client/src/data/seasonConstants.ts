/**
 * Shared season constants used across quest progression, carousels, and UI.
 * Single source of truth for season ordering, rite IDs, emojis, labels, and palette.
 */

export type Season = "spring" | "summer" | "fall" | "winter";

export const SEASON_ORDER: Season[] = ["spring", "summer", "fall", "winter"];

/** Rite quest IDs by season (string format, e.g. "quest-1") */
export const RITES_BY_SEASON: Record<Season, string[]> = {
  spring: ["quest-1", "quest-2", "quest-3"],
  summer: ["quest-4", "quest-5", "quest-6"],
  fall: ["quest-7", "quest-8", "quest-9"],
  winter: ["quest-10", "quest-11", "quest-12"],
};

/** Rite quest numeric IDs by season */
export const RITE_NUMBERS_BY_SEASON: Record<Season, number[]> = {
  spring: [1, 2, 3],
  summer: [4, 5, 6],
  fall: [7, 8, 9],
  winter: [10, 11, 12],
};

/** All rite quest IDs including fire (quest-0) */
export const ALL_RITE_IDS = new Set([
  "quest-0",
  ...Object.values(RITES_BY_SEASON).flat(),
]);

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export const SEASON_EMOJI: Record<Season, string> = {
  spring: "\u{1F331}",
  summer: "\u2600\uFE0F",
  fall: "\u{1F342}",
  winter: "\u2744\uFE0F",
};

/** Season color palette for UI components */
export const SEASON_PALETTE: Record<Season, {
  iconBg: string;
  parallax: string;
  cardBorder: string;
  accent: string;
}> = {
  spring: {
    iconBg: "bg-[#4a7c59]",
    parallax: "/backgrounds/quest-spring-baked.webp",
    cardBorder: "hover:border-[#4a7c59]/50",
    accent: "#4a7c59",
  },
  summer: {
    iconBg: "bg-[#2e7d32]",
    parallax: "/backgrounds/quest-summer-baked.webp",
    cardBorder: "hover:border-[#2e7d32]/50",
    accent: "#2e7d32",
  },
  fall: {
    iconBg: "bg-[#d4a574]",
    parallax: "/backgrounds/quest-fall-baked.webp",
    cardBorder: "hover:border-[#d4a574]/50",
    accent: "#d4a574",
  },
  winter: {
    iconBg: "bg-[#8b7355]",
    parallax: "/backgrounds/quest-winter-baked.webp",
    cardBorder: "hover:border-[#8b7355]/50",
    accent: "#8b7355",
  },
};

/** Element types used for quest categorization */
export type QuestElement = "earth" | "water" | "fire" | "air";

export const ELEMENT_EMOJI: Record<QuestElement, string> = {
  earth: "\u{1F331}",
  water: "\u{1F4A7}",
  fire: "\u{1F525}",
  air: "\u{1F32C}\uFE0F",
};

export const ELEMENT_GRADIENTS: Record<QuestElement, string> = {
  earth: "from-emerald-700/30 to-emerald-900/20",
  water: "from-blue-600/30 to-blue-900/20",
  fire: "from-orange-500/30 to-red-800/20",
  air: "from-purple-500/30 to-indigo-800/20",
};

/** Default fallback for unknown elements */
export const DEFAULT_ELEMENT_EMOJI = "\u2728"; // sparkles
export const DEFAULT_ELEMENT_GRADIENT = "from-gray-600/30 to-gray-800/20";

/** Build a rotated season order starting from a given season */
export function getRotatedSeasons(current: Season): Season[] {
  const idx = SEASON_ORDER.indexOf(current);
  return SEASON_ORDER.map((_, i) => SEASON_ORDER[(idx + i) % 4]);
}
