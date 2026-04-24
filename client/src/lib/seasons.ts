export type Season = "spring" | "summer" | "fall" | "winter";

/**
 * ReGen Civics tracks a game season rather than the calendar season.
 * Season 1 ("The First Build") runs until the next season begins at the
 * September 2026 equinox. Until then we stay in "winter" regardless of
 * calendar month, because Season 1 is a winter-coded season in our cycle.
 * After the equinox the calendar-aligned rotation takes over.
 */
export function getCurrentSeason(): Season {
  const now = new Date();
  const season2Start = new Date("2026-09-22T00:00:00Z");
  if (now < season2Start) return "winter";
  const month = now.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export const SEASON_THEMES: Record<
  Season,
  { gradient: string; accent: string; bgOpacity: number }
> = {
  spring: {
    gradient: "from-green-900 to-emerald-800",
    accent: "#7dd87d",
    bgOpacity: 0.15,
  },
  summer: {
    gradient: "from-amber-900 to-yellow-800",
    accent: "#d4a017",
    bgOpacity: 0.12,
  },
  fall: {
    gradient: "from-orange-900 to-red-900",
    accent: "#ea580c",
    bgOpacity: 0.14,
  },
  winter: {
    gradient: "from-slate-900 to-blue-900",
    accent: "#94a3b8",
    bgOpacity: 0.1,
  },
};
