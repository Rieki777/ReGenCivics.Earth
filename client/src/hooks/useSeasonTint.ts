/**
 * useSeasonTint: thin React hook over the existing seasons helper.
 * Returns the current season tint values used by the mobile More menu
 * and floating wizard button so the visual stays in sync with the season.
 */
import { getCurrentSeason, SEASON_THEMES, type Season } from "@/lib/seasons";

export type SeasonTint = {
  season: Season;
  primary: string;
  bgGradient: string;
};

export function useSeasonTint(): SeasonTint {
  const season = getCurrentSeason();
  const theme = SEASON_THEMES[season];
  return {
    season,
    primary: theme.accent,
    bgGradient: theme.gradient,
  };
}
