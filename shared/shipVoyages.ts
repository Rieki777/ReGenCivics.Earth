/**
 * Suggested voyages, their routes, and the deterministic rough chart
 * (shared client/server).
 *
 * A suggested voyage is a one-tap package on /ship/book: it claims the first
 * open run of weeks on the calendar, writes a rough day-by-day chart, and walks
 * the guest straight to booking. Every package sails a named ROUTE: a
 * hand-written blueprint of its days. The rough chart is deterministic
 * (STEERING section 11): no LLM call, instant, testable. The First Mate
 * (ship.concierge) then customizes it conversationally, a brief pass before
 * booking and the full pass after.
 *
 * Standing doctrine baked into every route: the first night stays in or just
 * outside Ashland (board Monday 5pm, orientation films, learn her systems).
 * Free camps are the default recommendation; the WellSprings, a farm stay
 * arranged through the crew, or the Sanctuary are bookable, each at its own
 * cost, and none is built into the price. Tuesday morning is the Ashland
 * farmers market to fill the galley. Every week carries at least one forest
 * stop with a hike and a seed planting. Mid-voyage Monday turnovers are the
 * crew's choice: dump and refill on route, or swing through Ashland for the
 * Keeper. Paddling on Crater Lake itself is not permitted, so paddle days
 * point at the calm lakes nearby: Diamond Lake, Lemolo Lake, Lost Creek Lake,
 * and Lake Siskiyou. Saved meal seeds go into the healing hole at the
 * voyage's end, never into the chest.
 *
 * Copy in this file is user-facing. Writing rules apply (STEERING section 1):
 * no em-dashes, no contrast framing, no AI word patterns.
 */

/** Most consecutive weeks a crew can chain into one voyage (a full lunar cycle). */
export const MAX_VOYAGE_WEEKS = 4;

export type SuggestedVoyageId = "standard" | "half_honeymoon" | "honeymoon" | "lunar_cycle";

/** One charted day of a route blueprint. */
export type RouteDay = { title: string; notes: string };

export type SuggestedVoyage = {
  id: SuggestedVoyageId;
  name: string;
  /** Voyage weeks this package claims (1 to MAX_VOYAGE_WEEKS). */
  weeks: number;
  tagline: string;
  description: string;
  /** The named route this package sails. */
  routeName: string;
  /** One 7-day blueprint per voyage week. The last repeats if the sail runs longer. */
  routeWeeks: RouteDay[][];
  /** Closing line for the rough chart summary. */
  summaryLine: string;
  /** Seeds for the First Mate quick customization. */
  crewHint: string;
  paceHint: string;
};

// ── Route weeks (each exactly 7 nights, Monday board to the following Monday) ──
// Day 7 of any non-final week is replaced by the turnover day at chart time.

/** The shared first night: board in Ashland, free camps recommended. */
const DAY_ONE_ASHLAND: RouteDay = {
  title: "Board and settle in Ashland",
  notes:
    "Board at 5pm and take the first night easy in or just outside Ashland. Free camps sit around town and we point you to them. Or book a night at the WellSprings, a farm stay through us, or the Sanctuary, each at its own cost. Watch the orientation films, learn her systems, and begin rested.",
};

/** The Three Chakras: heart on Mount Ashland, root at Mount Shasta, crown at Crater Lake. */
const WEEK_THREE_CHAKRAS: RouteDay[] = [
  DAY_ONE_ASHLAND,
  {
    title: "Market morning, then the heart",
    notes:
      "Fill the galley at the Ashland Tuesday farmers market: fresh organic fruit and vegetables for the whole sail. Then the heart center: hike the Mount Ashland meadows and close the day with a sauna and a soak at the thermal baths.",
  },
  {
    title: "South to the root",
    notes:
      "Sail south to Mount Shasta, the root. Sit in ceremony with the mountain, drink from the headwaters spring, and fill your bottles with its water for the rest of the voyage.",
  },
  {
    title: "Root waters, then north",
    notes:
      "A slow Shasta morning, with an optional paddleboard on Lake Siskiyou under the mountain. Then sail north into the Rogue headwaters forest: Natural Bridge, the Rogue Gorge, a hike under old trees, and a seed planting from the chest where the forest asks.",
  },
  {
    title: "The crown",
    notes:
      "Crater Lake. Sit at the rim in silence, walk it slow, and make the crown practice yours. Walk down to Lightning Spring and gather its water: some to drink up here, some to carry home after the voyage. Filter to your comfort.",
  },
  {
    title: "The crown's forests and waters",
    notes:
      "An optional paddleboard day on Diamond Lake or quiet Lemolo Lake, twenty minutes from the rim. Or walk the Umpqua old growth to Toketee Falls. Let the week land in your body.",
  },
  {
    title: "Return",
    notes:
      "Sail home easy and have her back by Monday 11am. The crown water travels with you, and your saved meal seeds go into the healing hole to grow on.",
  },
];

/** The Springs for Two: baths, hot springs, falls, and a quiet lake for a couple. */
const WEEK_SPRINGS_FOR_TWO: RouteDay[] = [
  {
    title: "Board and settle in Ashland",
    notes:
      "Board at 5pm and take the first night easy in or just outside Ashland, just the two of you. Free camps sit around town and we point you to them. Or book a night at the WellSprings, a farm stay through us, or the Sanctuary, each at its own cost. Orientation films, her systems, and a slow first evening.",
  },
  {
    title: "Market morning, then the baths",
    notes:
      "Fill the galley at the Tuesday farmers market. Hike the Mount Ashland meadows in the afternoon, then sauna and soak side by side at the thermal baths.",
  },
  {
    title: "The hot springs",
    notes:
      "Sail north into the Umpqua canyon. Walk to Toketee Falls, then soak in the hot springs perched above the river. Dinner by the fire.",
  },
  {
    title: "The crown for two",
    notes:
      "A morning at the Crater Lake rim, unhurried. Gather Lightning Spring water together: some for the week, some for your home. Filter to your comfort.",
  },
  {
    title: "A lake of your own",
    notes:
      "An optional paddleboard morning on Diamond Lake or Lemolo Lake, then find a quiet cove and stay a while.",
  },
  {
    title: "Rest, then seeds",
    notes:
      "A no-plans morning. In the afternoon plant seeds from the chest somewhere that felt like yours, and take one last soak.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Monday 11am, carrying the water and each other.",
  },
];

/** Honeymoon week one: the opening, a whole week in and around Shasta. */
const WEEK_HONEYMOON_ROOT: RouteDay[] = [
  {
    title: "Board and settle in Ashland",
    notes:
      "Board at 5pm and take the first night easy in or just outside Ashland, just the two of you. Free camps sit around town and we point you to them. Or book a night at the WellSprings, a farm stay through us, or the Sanctuary, each at its own cost. Orientation films, her systems, and a slow first evening.",
  },
  {
    title: "Market morning, then the heart",
    notes:
      "Fill the galley at the Ashland Tuesday farmers market. Then the heart center: hike the Mount Ashland meadows and close the day with a sauna and a soak at the thermal baths.",
  },
  {
    title: "South to the root",
    notes:
      "Sail south to Mount Shasta, the root. Sit in ceremony with the mountain, drink from the headwaters spring, and fill your bottles with its water for the voyage.",
  },
  {
    title: "In and around Shasta",
    notes:
      "A paddleboard morning on Lake Siskiyou, a forest hike in the afternoon, and a seed planting from the chest where the trees ask. The mountain holds you both.",
  },
  {
    title: "Root rest",
    notes: "A no-plans Shasta day. Springs, meadows, slow food, and the mountain doing its quiet work.",
  },
  {
    title: "North again, through the forest",
    notes:
      "Sail back toward Ashland with a forest stop on the way: a hike, a seed planting, a last look south at the mountain.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Monday 11am.",
  },
];

/** Honeymoon week two: the deepening, the crown and its waters. */
const WEEK_HONEYMOON_CROWN: RouteDay[] = [
  {
    title: "A fresh week, toward the crown",
    notes:
      "Topped up and pointed north. Sail into the Rogue headwaters forest: Natural Bridge, the gorge, and a night under old trees.",
  },
  {
    title: "Market, then the crown country",
    notes:
      "Restock at the Tuesday market, then climb to Crater Lake. Sit at the rim together and gather Lightning Spring water: some to drink, some for home. Filter to your comfort.",
  },
  {
    title: "Falls and hot springs",
    notes:
      "Toketee and Watson Falls on foot, then a long soak in the hot springs above the North Umpqua. Dinner by the fire.",
  },
  {
    title: "Paddle day",
    notes: "Diamond Lake or Lemolo Lake under the crown. Calm water, two boards, no hurry.",
  },
  {
    title: "The forest's day",
    notes: "Old growth on foot: a long hike, a seed planting, hammocks after.",
  },
  {
    title: "Give back, close the circle",
    notes:
      "Give a morning to a land project. In the evening return to the place you loved most and close with both waters.",
  },
  {
    title: "Return",
    notes:
      "Sail home easy, back by Monday 11am. Your saved meal seeds go into the healing hole, growing plants that hold your love. Married to the land now too.",
  },
];

/** The waters week (waxing moon): springs, falls, lakes, and soaks. */
const WEEK_WATERS: RouteDay[] = [
  {
    title: "Waxing moon, the waters",
    notes: "A fresh week off the turnover. This one belongs to the waters: springs, falls, lakes, and soaks.",
  },
  {
    title: "Market, then north",
    notes: "Restock at the Tuesday market, then sail for the North Umpqua canyon.",
  },
  {
    title: "Falls and hot springs",
    notes: "Toketee and Watson Falls on foot, then a long soak in the hot springs above the river.",
  },
  {
    title: "Paddle day",
    notes: "Diamond Lake or Lemolo Lake under the crown. Calm morning water is the best water.",
  },
  {
    title: "The Rogue",
    notes:
      "Follow the Rogue down through the gorge and Natural Bridge, with an optional paddle on Lost Creek Lake. Stop in the forest for a hike and a seed planting.",
  },
  {
    title: "Rest by water",
    notes: "Pick your favorite water of the week and give it a whole day. Nothing planned.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Monday 11am.",
  },
];

/** The forests week (full moon): old growth, service, seeds, and the full-moon night. */
const WEEK_FORESTS: RouteDay[] = [
  {
    title: "Full moon, the forests",
    notes: "The height of the voyage. This week belongs to the old trees and the land's work.",
  },
  {
    title: "Market, then the giants",
    notes: "Restock Tuesday, then walk the Umpqua and Rogue old growth. Slow miles, long breaths.",
  },
  {
    title: "Service day",
    notes: "Give a day to a land project along the route. Hands in soil is the practice.",
  },
  {
    title: "Seeds",
    notes: "Plant from the seed chest at a place that asks for it, and log it for the chest.",
  },
  {
    title: "Full moon night",
    notes: "Find a high open place and sit with the full moon. Bring the waters you have gathered.",
  },
  {
    title: "Rest",
    notes: "A no-plans day in the forest. Hammocks count as practice.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Monday 11am.",
  },
];

/** The waning week: gratitude, revisits, and the sail home. */
const WEEK_WANING: RouteDay[] = [
  {
    title: "Waning moon, gratitude",
    notes: "The last week sails home slow. Revisit what asked for more of you.",
  },
  {
    title: "Market one more time",
    notes: "A last Tuesday market run. Cook generous meals from here out.",
  },
  {
    title: "Your favorite water",
    notes: "Go back to the spring, lake, or falls that held the voyage's best hour.",
  },
  {
    title: "Your favorite ground",
    notes: "Same for the land: the meadow, the grove, the rim. Say thank you out loud.",
  },
  {
    title: "Ashland again",
    notes: "Anchor in or near Ashland where the voyage began. Walk the town slow and feel the difference a moon makes.",
  },
  {
    title: "Close the circle",
    notes:
      "A closing ceremony with the waters you carried: the root water from Shasta and the crown water from Lightning Spring. Keep some for home, and plant your saved meal seeds in the healing hole so what fed you grows on.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Monday 11am, a whole moon older and lighter.",
  },
];

// ── The packages ──────────────────────────────────────────────────────────────

export const SUGGESTED_VOYAGES: SuggestedVoyage[] = [
  {
    id: "standard",
    name: "The Standard Sail",
    weeks: 1,
    tagline: "One voyage week, the classic sail.",
    description:
      "Board Monday, return the following Monday, sailing The Three Chakras: heart on Mount Ashland, root at Mount Shasta, crown at Crater Lake and its forests.",
    routeName: "The Three Chakras",
    routeWeeks: [WEEK_THREE_CHAKRAS],
    summaryLine: "Heart on Mount Ashland, root at Mount Shasta, crown at Crater Lake.",
    crewHint: "a crew of friends or family",
    paceHint: "balanced, with real rest built in",
  },
  {
    id: "half_honeymoon",
    name: "The Half Honeymoon",
    weeks: 1,
    tagline: "One week made for two.",
    description:
      "Seven days for a couple: the Tuesday market, the thermal baths, the hot springs above the North Umpqua, and a quiet lake of your own.",
    routeName: "The Springs for Two",
    routeWeeks: [WEEK_SPRINGS_FOR_TWO],
    summaryLine: "Baths, hot springs, falls, and a quiet lake, charted for two.",
    crewHint: "a couple",
    paceHint: "restful and romantic",
  },
  {
    id: "honeymoon",
    name: "The Honeymoon",
    weeks: 2,
    tagline: "Fourteen days for the two of you.",
    description:
      "Two voyage weeks for two. Week one opens the heart in Ashland and roots deep in and around Shasta; week two crowns at Crater Lake and its waters: hot springs, waterfalls, paddle days, and a closing ceremony. The Monday turnover is your choice: do it yourselves on route, or swing through Ashland and the Keeper does it.",
    routeName: "The Opening and the Deepening",
    routeWeeks: [WEEK_HONEYMOON_ROOT, WEEK_HONEYMOON_CROWN],
    summaryLine:
      "A week in and around Shasta first, back through Ashland for the optional turnover, then the crown and its waters.",
    crewHint: "a couple on their honeymoon",
    paceHint: "restful and romantic, unhurried",
  },
  {
    id: "lunar_cycle",
    name: "The Full Lunar Cycle",
    weeks: 4,
    tagline: "Twenty-eight days, one whole moon.",
    description:
      "Four voyage weeks, a full 28-day moon cycle in living nature. City life sits heavy on a nervous system. A whole cycle among sacred power places lets your heart open, your system settle, and your sleep find the moon again.",
    routeName: "One Whole Moon",
    routeWeeks: [WEEK_THREE_CHAKRAS, WEEK_WATERS, WEEK_FORESTS, WEEK_WANING],
    summaryLine:
      "The chakras under the new moon, the waters waxing, the forests at full, and gratitude on the wane.",
    crewHint: "a small crew on a full 28-day moon cycle reset",
    paceHint: "slow and deep, one whole lunar cycle",
  },
];

export function suggestedVoyageById(id: string): SuggestedVoyage | null {
  return SUGGESTED_VOYAGES.find((v) => v.id === id) ?? null;
}

// ── The rough chart ───────────────────────────────────────────────────────────

/** What the generator needs to know about each claimed week. */
export type RoughChartWeek = { startDate: string; bioregion: string };

export type RoughChartDay = {
  /** 1-based day of the whole voyage. */
  day: number;
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  title: string;
  notes: string;
};

export type RoughChart = { summary: string; days: RoughChartDay[] };

/** Add whole days to a YYYY-MM-DD string (kept local so shared has no imports). */
function addDays(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(t)) return ymd;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

const TURNOVER_DAY: RouteDay = {
  title: "Turnover, your way",
  notes:
    "Monday she resets for the next week, and how is your choice: dump and refill her yourselves on route, or swing through Ashland and the Keeper tops up propane and water while you rest. A fresh week boards Monday evening.",
};

/**
 * Build the deterministic rough chart for a suggested voyage over the claimed
 * weeks, one entry per day, straight from the route blueprint. If the sail runs
 * longer than the blueprint, the last route week repeats. Day 7 of any
 * non-final week becomes the turnover day.
 */
export function buildRoughChart(voyage: SuggestedVoyage, weeks: RoughChartWeek[]): RoughChart {
  const days: RoughChartDay[] = [];
  for (let w = 0; w < weeks.length; w++) {
    const routeWeek = voyage.routeWeeks[Math.min(w, voyage.routeWeeks.length - 1)];
    const lastWeek = w === weeks.length - 1;
    for (let d = 1; d <= 7; d++) {
      const day = w * 7 + d;
      const date = addDays(weeks[w].startDate, d - 1);
      let { title, notes } = routeWeek[d - 1];
      if (d === 7 && !lastWeek) ({ title, notes } = TURNOVER_DAY);
      days.push({ day, date, title, notes });
    }
  }

  const bioregions = Array.from(new Set(weeks.map((wk) => wk.bioregion)));
  const weekWord = weeks.length === 1 ? "voyage week" : "voyage weeks";
  const summary = `${voyage.name}, sailing ${voyage.routeName}: ${weeks.length} ${weekWord} through ${bioregions.join(" and ")}. ${voyage.summaryLine} Your First Mate refines every day of it with you.`;
  return { summary, days };
}

/**
 * Seed answers for the First Mate quick customization (ship.concierge.start).
 * voyage_nights tells the generator how long a chart to write; the rest are the
 * same intake keys the full planner uses, plus the route doctrine.
 */
export function firstMateSeedAnswers(
  voyage: SuggestedVoyage,
  opts: { startDate: string; endDate: string; bioregions: string[] },
): Record<string, string> {
  return {
    voyage: voyage.name,
    route: `${voyage.routeName}. First night stays in or near Ashland: free camps encouraged, with the WellSprings, a farm stay, or the Sanctuary bookable at extra cost. Tuesday morning is the Ashland farmers market. Every week wants a forest hike and a seed planting. Mid-voyage turnovers are optional: self-serve on route or the Keeper in Ashland.`,
    voyage_nights: String(voyage.weeks * 7),
    dates: `${opts.startDate} to ${opts.endDate}, ${voyage.weeks * 7} nights through ${opts.bioregions.join(" and ")}`,
    group: voyage.crewHint,
    pace: voyage.paceHint,
    spiritual: "sacred power places to open the heart and settle the nervous system",
    activity: "optional paddleboard days on calm lakes are welcome",
  };
}
