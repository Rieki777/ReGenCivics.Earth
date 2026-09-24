import { regenSeasonOn, type RegenSeasonKey } from "@shared/regenYear";

export type Season = RegenSeasonKey;

/**
 * ReGen Civics tracks a game season rather than the calendar season.
 *
 * Until 2026-09-24 this switched to the calendar at the September 2026
 * equinox, which put the whole site in fall the same week Season 2's winter
 * began. The Game's seasons now come from shared/regenYear.ts, the one
 * definition of the ReGen Civics Year: winter designs (the incubator), spring
 * resources, summer builds, fall rests. They run one season ahead of the
 * northern calendar, so the September equinox opens winter.
 */
export function getCurrentSeason(): Season {
  return regenSeasonOn(new Date());
}

// On-brand seasonal palettes. Each gradient is rooted in the deep forest
// (#0d2818) so the brand world holds together across seasons, with a seasonal
// shift toward fresh green, gold, ember, or frost. The accent doubles as the
// floating command-center color, so it stays a readable, intentional hue.
export const SEASON_THEMES: Record<
  Season,
  { gradient: string; accent: string; bgOpacity: number; image: string }
> = {
  spring: {
    gradient: "from-[#0a2417] via-[#10401f] to-[#15522f]",
    accent: "#7dd87d",
    bgOpacity: 0.15,
    image: "/images/seasons/spring.webp",
  },
  summer: {
    gradient: "from-[#0d2818] via-[#2c4314] to-[#5a4e0e]",
    accent: "#f2c14e",
    bgOpacity: 0.12,
    image: "/images/seasons/summer.webp",
  },
  fall: {
    gradient: "from-[#231708] via-[#4a2410] to-[#6b2d12]",
    accent: "#ea8a3c",
    bgOpacity: 0.14,
    image: "/images/seasons/fall.webp",
  },
  // Winter (the design season, and all of Season 1): a frosted evergreen night, not a flat blue. Deep
  // forest base easing into a cool teal frost, with the signature green
  // accent so the command-center button reads as on-brand. The gradient is
  // also the fallback if the seasonal village image is missing.
  winter: {
    gradient: "from-[#0d2818] via-[#0e3334] to-[#0c2b3e]",
    accent: "#7dd87d",
    bgOpacity: 0.12,
    image: "/images/seasons/winter.webp",
  },
};
