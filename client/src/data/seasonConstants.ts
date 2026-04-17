/**
 * Shared season constants used across quest progression, carousels, and UI.
 * Single source of truth for season ordering, rite IDs, emojis, labels, and palette.
 */

import { season } from "@/lib/design-tokens";

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

/**
 * Season color palette for UI components.
 *
 * Accent values consume the locked `season.*` tokens from design-tokens.ts.
 * iconBg and cardBorder Tailwind arbitrary classes must remain as literal
 * hex strings (Tailwind JIT can only scan static strings) but every hex
 * below MUST equal the corresponding token. If a token value changes,
 * update the string here.
 *
 * Winter iconBg uses `forest.moss` (not the locked `season.winter` /
 * `forest.deep`) because forest.deep would render invisibly against
 * the primary app background. The accent still points at the locked
 * season.winter token.
 */
export const SEASON_PALETTE: Record<Season, {
  iconBg: string;
  parallax: string;
  cardBorder: string;
  accent: string;
}> = {
  spring: {
    iconBg: "bg-[#7dd87d]", // = season.spring
    parallax: "/backgrounds/quest-spring-baked.webp",
    cardBorder: "hover:border-[#7dd87d]/50", // = season.spring
    accent: season.spring,
  },
  summer: {
    iconBg: "bg-[#4a7c59]", // = season.summer
    parallax: "/backgrounds/quest-summer-baked.webp",
    cardBorder: "hover:border-[#4a7c59]/50", // = season.summer
    accent: season.summer,
  },
  fall: {
    iconBg: "bg-[#d4a574]", // = season.autumn
    parallax: "/backgrounds/quest-fall-baked.webp",
    cardBorder: "hover:border-[#d4a574]/50", // = season.autumn
    accent: season.autumn,
  },
  winter: {
    iconBg: "bg-[#2d5a3d]", // = forest.moss (visible substitute; accent uses locked season.winter)
    parallax: "/backgrounds/quest-winter-baked.webp",
    cardBorder: "hover:border-[#2d5a3d]/50", // = forest.moss
    accent: season.winter,
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
