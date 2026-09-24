/**
 * How each season of the ReGen Civics Year looks: its color, the ink that reads
 * on that color, its icon, and its village painting. The words live in
 * shared/regenYear.ts; this is only the paint, shared by the wheel on /seasons,
 * the rest of that page, and the rhythm cards on /team.
 */
import { Leaf, Snowflake, Sprout, Sun, type LucideIcon } from "lucide-react";
import type { RegenSeasonKey } from "@shared/regenYear";
import { SEASON_THEMES } from "@/lib/seasons";

export type SeasonLook = { color: string; ink: string; Icon: LucideIcon; image: string };

/**
 * Spring, summer and fall reuse the site's seasonal accents. Winter's site
 * accent is the brand green (so the command button stays on-brand), which
 * would read as spring next to the other three, so winter gets its frost here.
 */
export const SEASON_LOOK: Record<RegenSeasonKey, SeasonLook> = {
  winter: { color: "#8fd8e8", ink: "#0c2b3e", Icon: Snowflake, image: SEASON_THEMES.winter.image },
  spring: { color: SEASON_THEMES.spring.accent, ink: "#0d2818", Icon: Sprout, image: SEASON_THEMES.spring.image },
  summer: { color: SEASON_THEMES.summer.accent, ink: "#2c2108", Icon: Sun, image: SEASON_THEMES.summer.image },
  fall: { color: SEASON_THEMES.fall.accent, ink: "#231708", Icon: Leaf, image: SEASON_THEMES.fall.image },
};
