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
 * Standing doctrine baked into every route: the first night anchors at the
 * Sanctuary in Ashland (board Monday 3pm, orientation films, learn her
 * systems, walk the grounds), and Tuesday morning is the Ashland farmers
 * market to fill the galley. Paddling on Crater Lake itself is not permitted,
 * so paddle days point at the calm lakes nearby: Diamond Lake, Lemolo Lake,
 * Lost Creek Lake, and Lake Siskiyou.
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

// ── Route weeks (each exactly 7 days, Monday board to Sunday) ─────────────────
// Day 7 of any non-final week is replaced by the turnover day at chart time.

/** The Three Chakras: heart on Mount Ashland, root at Mount Shasta, crown at Crater Lake. */
const WEEK_THREE_CHAKRAS: RouteDay[] = [
  {
    title: "The Sanctuary, first anchorage",
    notes:
      "Board at 3pm and stay the night at the Sanctuary in Ashland. Watch the orientation films, learn her systems, walk the grounds, and take in that view. The voyage begins rested.",
  },
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
      "A slow Shasta morning, with an optional paddleboard on Lake Siskiyou under the mountain. Then sail north into the Rogue headwaters forest: Natural Bridge, the Rogue Gorge, and a night under old trees.",
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
    notes: "Sail home easy and have her back by Sunday 11am. The crown water travels with you.",
  },
];

/** The Springs for Two: baths, hot springs, falls, and a quiet lake for a couple. */
const WEEK_SPRINGS_FOR_TWO: RouteDay[] = [
  {
    title: "The Sanctuary, first anchorage",
    notes:
      "Board at 3pm and stay the night at the Sanctuary in Ashland. Orientation films, her systems, the grounds, the view, and a slow first evening for the two of you.",
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
    notes: "Sail home easy, back by Sunday 11am, carrying the water and each other.",
  },
];

/** The deepening week: the second honeymoon week, deeper into the waters. */
const WEEK_DEEPENING: RouteDay[] = [
  {
    title: "A fresh week, deeper in",
    notes:
      "She is topped up off the Sunday turnover. Ease out slow and point her toward the waters that asked for more of you.",
  },
  {
    title: "Market, then the North Umpqua",
    notes:
      "Restock at the Tuesday market, then sail for the North Umpqua: waterfalls, old growth, and the hot springs above the river.",
  },
  {
    title: "The waters for two",
    notes: "Soak, walk, and stay warm. Toketee and Watson Falls are short walks apart.",
  },
  {
    title: "Paddle day",
    notes: "Diamond Lake, Lemolo Lake, or Lost Creek Lake on the Rogue. Calm water, two boards, no hurry.",
  },
  {
    title: "Rest and slow food",
    notes: "A no-plans day. Cook something slow from the market haul and let the voyage settle into you.",
  },
  {
    title: "Give back, close the circle",
    notes:
      "Give a morning to a land project or plant seeds from the chest together. In the evening return to the place you loved most and close with both waters.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Sunday 11am. Married to the land now too.",
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
    notes: "Follow the Rogue down through the gorge and Natural Bridge, with an optional paddle on Lost Creek Lake.",
  },
  {
    title: "Rest by water",
    notes: "Pick your favorite water of the week and give it a whole day. Nothing planned.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Sunday 11am.",
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
    notes: "Sail home easy, back by Sunday 11am.",
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
    title: "The Sanctuary again",
    notes: "Anchor near the Sanctuary. Walk the grounds where the voyage began and feel the difference a moon makes.",
  },
  {
    title: "Close the circle",
    notes:
      "A closing ceremony with the waters you carried: the root water from Shasta and the crown water from Lightning Spring. Keep some for home.",
  },
  {
    title: "Return",
    notes: "Sail home easy, back by Sunday 11am, a whole moon older and lighter.",
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
      "Board Monday, return Sunday, sailing The Three Chakras: heart on Mount Ashland, root at Mount Shasta, crown at Crater Lake and its forests.",
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
      "Two voyage weeks for two. Week one opens the three chakras; week two deepens into the waters: hot springs, waterfalls, paddle days, and a closing ceremony. She resets her tanks at the Sunday turnover and you keep sailing.",
    routeName: "The Opening and the Deepening",
    routeWeeks: [WEEK_THREE_CHAKRAS, WEEK_DEEPENING],
    summaryLine: "The three chakras first, then two weeks deep in the waters together.",
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
  title: "Turnover rest",
  notes: "Sunday she resets. The Keeper tops up propane and water while you rest, and a fresh week opens Monday morning.",
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
    route: `${voyage.routeName}. First night anchors at the Sanctuary in Ashland for orientation; Tuesday morning is the Ashland farmers market.`,
    voyage_nights: String(voyage.weeks * 7),
    dates: `${opts.startDate} to ${opts.endDate}, ${voyage.weeks * 7} nights through ${opts.bioregions.join(" and ")}`,
    group: voyage.crewHint,
    pace: voyage.paceHint,
    spiritual: "sacred power places to open the heart and settle the nervous system",
    activity: "optional paddleboard days on calm lakes are welcome",
  };
}
