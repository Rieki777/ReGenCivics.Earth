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
 * Rye's rulings, 2026-09-24:
 *
 *   Design Season    (winter)  tools, systems, governance; land projects design their games
 *   Resource Season  (spring)  crowdpooling, investors, onboarding roles; springing to life
 *   Build Season     (summer)  hands in the soil: gardens, buildings, festivals on the land
 *   Rest Season      (fall)    rest and abundance: harvest gatherings, healing, village life
 *
 * The seasons go by what they are for (Design, Resource, Build, Rest). Winter,
 * spring, summer and fall are the pattern they loosely follow, the connection
 * to the wheel of the year, kept in the imagery. That keeps the rhythm readable
 * on southern hemisphere and equatorial land, where the calendar seasons differ.
 *
 * Every solstice and equinox holds a recap and passoff from one season to the
 * next. The September one is the big one, the Handoff Festival: the outgoing
 * cohort celebrates its harvest and hands the wheel to the new cohort on
 * Selection Day.
 *
 * Timing is loose on purpose in this first turn of the wheel. The Game's
 * seasons follow the work, so they run one season ahead of the northern
 * calendar: Design opens at the September equinox with Selection Day and runs
 * the 13-week incubator; Resource opens at the December solstice, when week 13
 * launches the shared crowdpool; Build opens at the March equinox, planting
 * season; Rest opens at the June solstice. We adjust as the year needs, with
 * the goal of a clear pattern once we get going. Moving a boundary is a
 * one-line change in TURNING_POINTS.
 *
 * Numbering. Each numbered Season starts with a Design Season and a new cohort,
 * and follows it once around the wheel. Everything before Season 2 opened is
 * Season 1: the first incubator in 2022 (43 applications, 16 presented, 13
 * selected) and the long build that followed it.
 */

export type RegenSeasonKey = "winter" | "spring" | "summer" | "fall";

/**
 * Season 1 in numbers (Rye, 2026-09-24). Until that day the site said 46
 * applied (and 21 shortlisted) on /season2, 16 projects on the blog, and 2021
 * or "2025 and 2026" elsewhere. Read these; don't retype them.
 */
export const SEASON_ONE = { year: 2022, applied: 43, presented: 16, selected: 13 } as const;

/** Clockwise around the wheel, starting where each numbered Season starts. */
export const REGEN_SEASON_ORDER: readonly RegenSeasonKey[] = [
  "winter",
  "spring",
  "summer",
  "fall",
] as const;

export type PlayMove = {
  /** Who this move is for. "Land projects" */
  who: string;
  /** What to do, in one short line. */
  what: string;
  /** Where to do it. */
  href: string;
  /** The link text. */
  label: string;
};

export type RegenSeason = {
  key: RegenSeasonKey;
  /** The season's name, by what it is for. "Design Season" */
  title: string;
  /** One word for what the season is for. "Design" */
  verb: string;
  /** The wheel-of-the-year season it loosely follows. "Winter" */
  pattern: string;
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
  /**
   * Shared seasons happen online, so the whole network does them together on
   * one clock. Local seasons happen on the land, so each project times them to
   * its own climate (Rye, 2026-09-24).
   */
  scope: "shared" | "local";
  /** The Season Organizer who holds this season. */
  organizer: { title: string; character: string };
  /** The gathering that opens it, written to follow "Opens with". */
  opensWith: string;
  /** What that gathering is for, in one line. */
  gathering: string;
  /** How to play this season: a move for each kind of player, with a link. */
  play: PlayMove[];
  /** Where to go from here, for someone reading about this season. */
  cta: { label: string; href: string };
};

export const REGEN_SEASONS: Record<RegenSeasonKey, RegenSeason> = {
  winter: {
    key: "winter",
    title: "Design Season",
    verb: "Design",
    pattern: "Winter",
    headline: "We design the game.",
    summary:
      "The technical season. We gather close and do the computer work: designing tools, systems, and governance. New land projects sit down with their core teams and design their games, so everything is ready to come alive in the Resource Season.",
    happens: [
      "A new cohort of land projects designs their games in the 13-week incubator",
      "Governance, roles, economies, and token models get drafted",
      "Legal structures and community agreements get sorted",
      "We build and upgrade the tools every project runs on",
    ],
    flow: "Inward",
    place: "Mostly online",
    scope: "shared",
    organizer: { title: "Design Season Organizer", character: "The Lantern-Keeper" },
    opensWith: "the Handoff Festival and Selection Day at the September equinox",
    gathering:
      "The Handoff Festival. The outgoing cohort celebrates its harvest and hands the wheel to the new cohort on Selection Day. The north brings the harvest, the south brings the seeds.",
    play: [
      { who: "Land projects", what: "Follow along live as the cohort designs their games, then crowdpool with them if you're ready.", href: "/schedule#follow-along", label: "Follow along live" },
      { who: "Builders", what: "Build the tools under the land projects with us, weekly.", href: "/interop-sessions", label: "Join the Interoperability Circle" },
      { who: "Players", what: "Pick up a quest and start earning your place in the Game.", href: "/game", label: "Play the Game" },
    ],
    cta: { label: "See Season 2", href: "/season2" },
  },
  spring: {
    key: "spring",
    title: "Resource Season",
    verb: "Resource",
    pattern: "Spring",
    headline: "We spring to life.",
    summary:
      "The designs are done, so we open the doors. Each project launches its crowdpool and asks for everything it needs to come alive: hands, roles, tools, materials, and money. We talk with investors, welcome people into roles, and receive the energy and resources that flow in.",
    happens: [
      "The cohort and every ready community project launch their crowdpools together",
      "People claim roles, lend tools, and pledge time and materials",
      "We talk with investors and gather Letters of Intent for the Fund",
      "Stories go out wide so the right people find each project",
    ],
    flow: "Outward",
    place: "Mostly online",
    scope: "shared",
    organizer: { title: "Resource Season Organizer", character: "The Rainmaker" },
    opensWith: "a recap and passoff, and the crowdpool launch, at the December solstice",
    gathering:
      "Recap and passoff from Design to Resource. The cohort and the community projects that are ready launch their crowdpools together and invite everyone in.",
    play: [
      { who: "Everyone", what: "Fill a need on a land project's campaign: time, tools, skills, or money.", href: "/campaigns", label: "See the campaigns" },
      { who: "Land projects", what: "Join the crowdpooling round with the cohort once your project is ready.", href: "/crowd-pooling", label: "How crowdpooling works" },
      { who: "Investors", what: "Tell us what you'd back with a non-binding Letter of Intent for the Fund.", href: "/loi", label: "Send a Letter of Intent" },
    ],
    cta: { label: "How crowdpooling works", href: "/crowd-pooling" },
  },
  summer: {
    key: "summer",
    title: "Build Season",
    verb: "Build",
    pattern: "Summer",
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
    scope: "local",
    organizer: { title: "Build Season Organizer", character: "The Barn-Raiser" },
    opensWith: "a recap and passoff at the March equinox",
    gathering: "Recap and passoff from Resource to Build. We head out to the land together to plant and raise.",
    play: [
      { who: "Everyone", what: "Find a land project near you and show up for a work day.", href: "/map", label: "Open the map" },
      { who: "Players", what: "Come to work parties, land visits, and festivals.", href: "/schedule", label: "See what's coming up" },
      { who: "Travelers", what: "Follow the festivals around the world, north March to June and south September to February, aboard the ReGen Ship.", href: "/ship", label: "Meet the ReGen Ship" },
    ],
    cta: { label: "Explore the land projects", href: "/map" },
  },
  fall: {
    key: "fall",
    title: "Rest Season",
    verb: "Rest",
    pattern: "Fall",
    headline: "We rest in the abundance.",
    summary:
      "The season of rest and abundance. Harvest festivals and gatherings fill the land projects, and then we take real time off: self-care, healing, and time in our villages. Many of us do other work. Then the wheel turns back to the Design Season and a new cohort begins.",
    happens: [
      "Harvest festivals and gatherings at land projects",
      "Rest, self-care, and healing",
      "Time with family and village life",
      "Next season's cohort of land projects applies",
    ],
    flow: "Inward",
    place: "On the land",
    scope: "local",
    organizer: { title: "Rest Season Organizer", character: "The Hearth-Keeper" },
    opensWith: "a recap and passoff at the June solstice",
    gathering: "Recap and passoff from Build to Rest. The harvest begins, and then we rest.",
    play: [
      { who: "Everyone", what: "Come to a harvest gathering at a land project.", href: "/schedule", label: "See the gatherings" },
      { who: "Players", what: "Share what you learned and thank the people who showed up.", href: "/community", label: "Go to the community" },
      { who: "Land projects", what: "Apply anytime for the next season's cohort.", href: "/apply", label: "Apply for the next season" },
    ],
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


// ─── One wheel, many lands ──────────────────────────────────────────────────

export type LandKey = "northern" | "southern" | "equatorial";

export type RegenLand = {
  key: LandKey;
  label: string;
  /** How the Game's seasons sit on this land, in one or two sentences. */
  guidance: string;
  /**
   * The land's own season during each season of the Game, or null near the
   * equator, where wet and dry seasons fall differently from place to place.
   */
  natural: Record<RegenSeasonKey, "winter" | "spring" | "summer" | "autumn"> | null;
};

/**
 * The wheel is the network's rhythm; the land keeps its own (Rye, 2026-09-24).
 * Design and Resource are shared by everyone at once. Build and Rest are timed
 * to each project's own climate.
 */
export const REGEN_LANDS: Record<LandKey, RegenLand> = {
  northern: {
    key: "northern",
    label: "Northern",
    guidance:
      "The Game runs one season ahead of your calendar: we design through your autumn, resource through your winter, build in your spring, and rest in your summer.",
    natural: { winter: "autumn", spring: "winter", summer: "spring", fall: "summer" },
  },
  southern: {
    key: "southern",
    label: "Southern",
    guidance:
      "Design and Resource are online and shared, so you do them with everyone. Time Build and Rest to your own land: build through your spring and summer, roughly September to March, and rest in your winter.",
    natural: { winter: "spring", spring: "summer", summer: "autumn", fall: "winter" },
  },
  equatorial: {
    key: "equatorial",
    label: "Near the equator",
    guidance:
      "Design and Resource are shared with everyone. On the land, build in your dry season and rest through the heaviest rains, whenever those fall where you are.",
    natural: null,
  },
};

export const REGEN_LAND_ORDER: readonly LandKey[] = ["northern", "southern", "equatorial"] as const;

/** IANA zones well south of the equator, by prefix or exact name. */
const SOUTHERN_ZONES = [
  "Australia/",
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Norfolk",
  "Pacific/Noumea",
  "Pacific/Fiji",
  "Pacific/Tongatapu",
  "America/Santiago",
  "America/Punta_Arenas",
  "America/Argentina/",
  "America/Buenos_Aires",
  "America/Montevideo",
  "America/Asuncion",
  "America/Sao_Paulo",
  "America/Campo_Grande",
  "America/Cuiaba",
  "America/La_Paz",
  "Africa/Johannesburg",
  "Africa/Maputo",
  "Africa/Harare",
  "Africa/Lusaka",
  "Africa/Windhoek",
  "Africa/Gaborone",
  "Africa/Maseru",
  "Africa/Mbabane",
  "Indian/Antananarivo",
  "Indian/Mauritius",
  "Indian/Reunion",
];

/** IANA zones in the wet-and-dry tropics, within roughly 15 degrees of the equator. */
const EQUATORIAL_ZONES = [
  "America/Bogota",
  "America/Guayaquil",
  "Pacific/Galapagos",
  "America/Lima",
  "America/Caracas",
  "America/Panama",
  "America/Costa_Rica",
  "America/Managua",
  "America/Tegucigalpa",
  "America/El_Salvador",
  "America/Guatemala",
  "America/Belize",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Paramaribo",
  "America/Cayenne",
  "America/Guyana",
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Kigali",
  "Africa/Dar_es_Salaam",
  "Africa/Addis_Ababa",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Abidjan",
  "Africa/Kinshasa",
  "Africa/Lubumbashi",
  "Africa/Douala",
  "Africa/Libreville",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Phnom_Penh",
  "Asia/Colombo",
  "Indian/Maldives",
  "Pacific/Port_Moresby",
];

/**
 * A first guess at where a visitor's land is, from the browser's time zone.
 * No network call and nothing leaves the device; the visitor can change it.
 */
export function guessLandFromTimeZone(timeZone: string | undefined): LandKey {
  if (!timeZone) return "northern";
  const hit = (list: string[]) => list.some((z) => (z.endsWith("/") ? timeZone.startsWith(z) : timeZone === z));
  if (hit(SOUTHERN_ZONES)) return "southern";
  if (hit(EQUATORIAL_ZONES)) return "equatorial";
  return "northern";
}
