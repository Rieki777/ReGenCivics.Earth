/**
 * The ReGen Civics Year: four seasons, one wheel. One definition, read by
 * everything that talks about the seasons.
 *
 * Why this file exists. Until 2026-09-24 the four seasons lived in four places
 * and they disagreed. /seasons ran three different four-season models on one
 * page. Its hero, the Team page's rhythm cards and client/src/data/gameRoles.ts
 * all called the incubator "Spring". client/src/lib/seasons.ts flipped the
 * whole site to fall at the September 2026 equinox, the same week Season 2's
 * winter began.
 *
 * Rye's ruling, 2026-09-24: the incubator is Winter.
 *
 *   Winter  design    tools, systems, governance; land projects design their games
 *   Spring  resource  crowdpooling, investors, onboarding roles; springing to life
 *   Summer  build     hands in the soil: gardens, buildings, festivals on the land
 *   Fall    rest      rest and abundance: harvest gatherings, healing, village life
 *
 * The Game's seasons follow the work, so they run one season ahead of the
 * northern calendar. Winter opens at the September equinox with Selection Day
 * and runs the 13-week incubator. Spring opens at the December solstice, when
 * week 13 launches the shared crowdpool and it runs its roughly 90 days. Summer
 * opens at the March equinox, which is planting season. Fall opens at the June
 * solstice. This is the shape of the 2022 Four Seasons Protocol
 * (Winter: local, inward; Spring: global, outward; Summer: local, outward;
 * Fall: local, inward) moved one quarter to fit the program as it actually
 * runs. Moving a boundary is a one-line change in TURNING_POINTS.
 *
 * Numbering. Each numbered Season starts in winter with a new cohort and
 * follows it once around the wheel. Everything before Season 2 opened is
 * Season 1: the first incubator in 2022 and the long build that followed it,
 * which the site has always shown as winter.
 */

export type RegenSeasonKey = "winter" | "spring" | "summer" | "fall";

/** Clockwise around the wheel, starting where each numbered Season starts. */
export const REGEN_SEASON_ORDER: readonly RegenSeasonKey[] = [
  "winter",
  "spring",
  "summer",
  "fall",
] as const;

export type RegenSeason = {
  key: RegenSeasonKey;
  /** "Winter" */
  name: string;
  /** One word for what the season is for. "Design" */
  verb: string;
  /** The line that says it plainly. */
  headline: string;
  /** Two or three sentences in Rye's voice. */
  summary: string;
  /** What actually happens, as short list items. */
  happens: string[];
  /** Inward or outward: gathering in, or reaching out. */
  flow: "Inward" | "Outward";
  /** Where the work mostly happens. */
  place: "Mostly online" | "On the land";
  /** The gathering that opens it, written to follow "Opens with". */
  opensWith: string;
  /** What that gathering is for, in one line. */
  gathering: string;
  /** Where to go from here, for someone reading about this season. */
  cta: { label: string; href: string };
};

export const REGEN_SEASONS: Record<RegenSeasonKey, RegenSeason> = {
  winter: {
    key: "winter",
    name: "Winter",
    verb: "Design",
    headline: "We design the game.",
    summary:
      "The technical season. We gather close and do the computer work: designing tools, systems, and governance. New land projects sit down with their core teams and design their games, so everything is ready to come alive in spring.",
    happens: [
      "A new cohort of land projects designs their games in the 13-week incubator",
      "Governance, roles, economies, and token models get drafted",
      "Legal structures and community agreements get sorted",
      "We build and upgrade the tools every project runs on",
    ],
    flow: "Inward",
    place: "Mostly online",
    opensWith: "Selection Day at the September equinox",
    gathering: "Selection Day. The season council chooses the new cohort, live and in public.",
    cta: { label: "See Season 2", href: "/season2" },
  },
  spring: {
    key: "spring",
    name: "Spring",
    verb: "Resource",
    headline: "We spring to life.",
    summary:
      "The designs are done, so we open the doors. Each project launches its crowdpool and asks for everything it needs to come alive: hands, roles, tools, materials, and money. We talk with investors, welcome people into roles, and receive the energy and resources that flow in.",
    happens: [
      "The cohort launches its crowdpools together",
      "People claim roles, lend tools, and pledge time and materials",
      "We talk with investors and gather Letters of Intent for the Fund",
      "Stories go out wide so the right people find each project",
    ],
    flow: "Outward",
    place: "Mostly online",
    opensWith: "the crowdpool launch at the December solstice",
    gathering: "The crowdpool launch. The cohort opens its doors and invites everyone in.",
    cta: { label: "How crowdpooling works", href: "/crowd-pooling" },
  },
  summer: {
    key: "summer",
    name: "Summer",
    verb: "Build",
    headline: "We get our hands in the soil.",
    summary:
      "Everyone goes outside. We plant gardens, raise buildings, and throw work parties and festivals on the land projects. This is where the designs meet the ground, and where we have a great time making the magic happen.",
    happens: [
      "Planting gardens, food forests, and water systems",
      "Building homes, kitchens, and gathering spaces",
      "Work parties, land visits, and festivals",
      "Players and allies show up in person to do the work",
    ],
    flow: "Outward",
    place: "On the land",
    opensWith: "the March equinox gathering",
    gathering: "We head out to the land together to plant, build, and celebrate.",
    cta: { label: "Explore the land projects", href: "/map" },
  },
  fall: {
    key: "fall",
    name: "Fall",
    verb: "Rest",
    headline: "We rest in the abundance.",
    summary:
      "The season of rest and abundance. Harvest festivals and gatherings fill the land projects, and then we take real time off: self-care, healing, and time in our villages. Many of us do other work. Then the wheel turns back to winter and a new cohort begins.",
    happens: [
      "Harvest festivals and gatherings at land projects",
      "Rest, self-care, and healing",
      "Time with family and village life",
      "Next winter's cohort of land projects applies",
    ],
    flow: "Inward",
    place: "On the land",
    opensWith: "the June solstice gathering",
    gathering: "We gather at the land projects for the harvest, and then we rest.",
    cta: { label: "Meet the community", href: "/community" },
  },
};

/**
 * Where each season begins, as a month and day (UTC). The dates are the
 * solstices and equinoxes rounded to the day they usually fall on; the
 * gatherings themselves flex a few days to fit the community.
 */
export const TURNING_POINTS: Record<
  RegenSeasonKey,
  { month: number; day: number; label: string }
> = {
  winter: { month: 9, day: 22, label: "September equinox" },
  spring: { month: 12, day: 21, label: "December solstice" },
  summer: { month: 3, day: 20, label: "March equinox" },
  fall: { month: 6, day: 21, label: "June solstice" },
};

/**
 * The day Season 2's winter opened. Before it, the site was in Season 1, which
 * it has always treated as one long winter.
 */
export const SEASON_2_OPENS = new Date(Date.UTC(2026, 8, 22));

function turningPointIn(key: RegenSeasonKey, year: number): Date {
  const tp = TURNING_POINTS[key];
  return new Date(Date.UTC(year, tp.month - 1, tp.day));
}

export function nextRegenSeason(key: RegenSeasonKey): RegenSeasonKey {
  const i = REGEN_SEASON_ORDER.indexOf(key);
  return REGEN_SEASON_ORDER[(i + 1) % REGEN_SEASON_ORDER.length];
}

export function previousRegenSeason(key: RegenSeasonKey): RegenSeasonKey {
  const i = REGEN_SEASON_ORDER.indexOf(key);
  return REGEN_SEASON_ORDER[(i + REGEN_SEASON_ORDER.length - 1) % REGEN_SEASON_ORDER.length];
}

export type RegenSeasonSpan = {
  season: RegenSeasonKey;
  /** 1 for everything before Season 2 opened, then one number per winter. */
  seasonNumber: number;
  start: Date;
  end: Date;
  /** 0 at the opening gathering, 1 at the next one. */
  progress: number;
};

/**
 * Which season of the Game a moment falls in, where it started, when it ends,
 * and how far along it is.
 */
export function regenSeasonSpan(now: Date = new Date()): RegenSeasonSpan {
  const t = now.getTime();

  if (t < SEASON_2_OPENS.getTime()) {
    // Season 1: the long winter, from the first incubator to Season 2.
    const start = new Date(Date.UTC(2022, 0, 1));
    return {
      season: "winter",
      seasonNumber: 1,
      start,
      end: SEASON_2_OPENS,
      progress: clamp01((t - start.getTime()) / (SEASON_2_OPENS.getTime() - start.getTime())),
    };
  }

  // Walk the turning points from the September equinox before `now`.
  const y = now.getUTCFullYear();
  const winterStart = t >= turningPointIn("winter", y).getTime()
    ? turningPointIn("winter", y)
    : turningPointIn("winter", y - 1);
  const wy = winterStart.getUTCFullYear();
  const bounds: Array<[RegenSeasonKey, Date]> = [
    ["winter", winterStart],
    ["spring", turningPointIn("spring", wy)],
    ["summer", turningPointIn("summer", wy + 1)],
    ["fall", turningPointIn("fall", wy + 1)],
    ["winter", turningPointIn("winter", wy + 1)],
  ];

  let i = 0;
  while (i < 3 && t >= bounds[i + 1][1].getTime()) i++;
  const [season, start] = bounds[i];
  const end = bounds[i + 1][1];

  return {
    season,
    seasonNumber: 2 + (wy - SEASON_2_OPENS.getUTCFullYear()),
    start,
    end,
    progress: clamp01((t - start.getTime()) / (end.getTime() - start.getTime())),
  };
}

/** The season of the Game right now (or at `now`). */
export function regenSeasonOn(now: Date = new Date()): RegenSeasonKey {
  return regenSeasonSpan(now).season;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
