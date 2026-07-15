/**
 * Suggested voyages + the deterministic rough chart (shared client/server).
 *
 * A suggested voyage is a one-tap package on /ship/book: it claims the first
 * open run of weeks on the calendar, writes a rough day-by-day chart, and walks
 * the guest straight to booking. The rough chart is deterministic (STEERING
 * section 11): no LLM call, instant, testable. The First Mate (ship.concierge)
 * then customizes it conversationally, a brief pass before booking and the full
 * pass after.
 *
 * Copy in this file is user-facing. Writing rules apply (STEERING section 1):
 * no em-dashes, no contrast framing, no AI word patterns.
 */

/** Most consecutive weeks a crew can chain into one voyage (a full lunar cycle). */
export const MAX_VOYAGE_WEEKS = 4;

export type SuggestedVoyageId = "standard" | "half_honeymoon" | "honeymoon" | "lunar_cycle";

export type SuggestedVoyage = {
  id: SuggestedVoyageId;
  name: string;
  /** Voyage weeks this package claims (1 to MAX_VOYAGE_WEEKS). */
  weeks: number;
  tagline: string;
  description: string;
  /** One theme per voyage week. Single-entry themes stay off the day titles. */
  weekThemes: string[];
  /** Closing line for the rough chart summary. */
  summaryLine: string;
  /** Optional flavor for the sacred-power-place day. */
  sacredDayNotes?: string;
  /** Seeds for the First Mate quick customization. */
  crewHint: string;
  paceHint: string;
};

export const SUGGESTED_VOYAGES: SuggestedVoyage[] = [
  {
    id: "standard",
    name: "The Standard Sail",
    weeks: 1,
    tagline: "One voyage week, the classic sail.",
    description:
      "Board Monday, return Sunday. Springs, old forest, a seed planting, and slow evenings at anchor. The week that started it all.",
    weekThemes: ["The classic week"],
    summaryLine: "The classic week aboard: water, forest, seeds, and slow evenings.",
    crewHint: "a crew of friends or family",
    paceHint: "balanced, with real rest built in",
  },
  {
    id: "half_honeymoon",
    name: "The Half Honeymoon",
    weeks: 1,
    tagline: "One week made for two.",
    description:
      "Seven days for a couple. Sacred springs, warm evenings, and a chart that keeps the two of you close to wild water and quiet places.",
    weekThemes: ["A week for two"],
    summaryLine: "One week charted for two.",
    sacredDayNotes:
      "Sit together at one of the sacred power places on her route. Hearts open easier out here, side by side.",
    crewHint: "a couple",
    paceHint: "restful and romantic",
  },
  {
    id: "honeymoon",
    name: "The Honeymoon",
    weeks: 2,
    tagline: "Fourteen days for the two of you.",
    description:
      "Two voyage weeks. The first opens the heart at sacred power places, the second deepens into the quiet ones. She resets her tanks at the Sunday turnover and you keep sailing.",
    weekThemes: ["The opening week", "The deepening week"],
    summaryLine: "Two weeks charted for two, opening first and deepening after.",
    sacredDayNotes:
      "Sit together at one of the sacred power places on her route. Hearts open easier out here, side by side.",
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
    weekThemes: [
      "New moon, arrival and grounding",
      "Waxing moon, opening the heart",
      "Full moon, the height of the voyage",
      "Waning moon, gratitude and return",
    ],
    summaryLine: "Four weeks riding one whole moon from arrival to return.",
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

/** The seven-day arc every voyage week follows, Monday board to Sunday. */
const DAY_ARC: Array<{ title: string; notes: string }> = [
  {
    title: "Board and settle",
    notes: "Board Monday at 3pm. Stock the galley, learn her systems, and take a quiet first evening at anchor.",
  },
  {
    title: "Wild water",
    notes: "Find a spring or a swimming hole off the treasure map and let the water begin the reset.",
  },
  {
    title: "Old forest",
    notes: "Walk under old trees. Slow miles, long breaths, no hurry.",
  },
  {
    title: "A sacred power place",
    notes:
      "Sit at one of the sacred power places on her route. Let your heart open at its own pace and come into rhythm with the land.",
  },
  {
    title: "Rest and integration",
    notes: "A no-plans day. Cook slow food, soak, nap, watch the light move. Nervous systems settle on days like this.",
  },
  {
    title: "Give back",
    notes: "Plant seeds from the chest or lend a morning to a land project along the way.",
  },
  {
    title: "Return",
    notes: "Sail home easy and have her back by Sunday at 11am, fuller than you left.",
  },
];

const TURNOVER_DAY = {
  title: "Turnover rest",
  notes: "Sunday she resets. The Keeper tops up propane and water while you rest, and a fresh week opens Monday morning.",
};

const NEW_WEEK_NOTES = "She is topped up and ready. Choose the next stretch of the treasure map and sail on.";

/**
 * Build the deterministic rough chart for a suggested voyage over the claimed
 * weeks. One entry per day. Multi-week voyages get turnover days between weeks
 * and a theme title on each week's first day.
 */
export function buildRoughChart(voyage: SuggestedVoyage, weeks: RoughChartWeek[]): RoughChart {
  const days: RoughChartDay[] = [];
  const themed = voyage.weekThemes.length > 1;
  for (let w = 0; w < weeks.length; w++) {
    const theme = voyage.weekThemes[Math.min(w, voyage.weekThemes.length - 1)];
    const lastWeek = w === weeks.length - 1;
    for (let d = 1; d <= 7; d++) {
      const day = w * 7 + d;
      const date = addDays(weeks[w].startDate, d - 1);
      let { title, notes } = DAY_ARC[d - 1];
      if (d === 4 && voyage.sacredDayNotes) notes = voyage.sacredDayNotes;
      if (d === 7 && !lastWeek) ({ title, notes } = TURNOVER_DAY);
      if (d === 1) {
        if (themed) title = theme;
        if (w > 0) notes = NEW_WEEK_NOTES;
      }
      days.push({ day, date, title, notes });
    }
  }

  const bioregions = Array.from(new Set(weeks.map((wk) => wk.bioregion)));
  const weekWord = weeks.length === 1 ? "voyage week" : "voyage weeks";
  const summary = `${voyage.name}: ${weeks.length} ${weekWord} through ${bioregions.join(" and ")}. ${voyage.summaryLine} Your First Mate refines every day of it with you.`;
  return { summary, days };
}

/**
 * Seed answers for the First Mate quick customization (ship.concierge.start).
 * voyage_nights tells the generator how long a chart to write; the rest are the
 * same intake keys the full planner uses.
 */
export function firstMateSeedAnswers(
  voyage: SuggestedVoyage,
  opts: { startDate: string; endDate: string; bioregions: string[] },
): Record<string, string> {
  return {
    voyage: voyage.name,
    voyage_nights: String(voyage.weeks * 7),
    dates: `${opts.startDate} to ${opts.endDate}, ${voyage.weeks * 7} nights through ${opts.bioregions.join(" and ")}`,
    group: voyage.crewHint,
    pace: voyage.paceHint,
    spiritual: "sacred power places to open the heart and settle the nervous system",
  };
}
