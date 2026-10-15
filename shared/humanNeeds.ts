/**
 * The ten human needs, as the Week 3 board asks about them (Season 2, Week 3,
 * "Game & Organisation Co-Creation Part 1"; docs/planning/week3-episode).
 *
 * WHY THIS FILE EXISTS. Village OS already keeps what a village is for in
 * `village_needs`, keyed by the deck's ten human needs (`HUMAN_NEEDS` in the
 * village-os repo's shared/needs.ts, ids "never renamed"). Village OS copied
 * that table from slide 5 of the same deck Rye presents in Week 3. So the board
 * collects every answer in Village OS's own ids, rungs and percents, and Week 4
 * is a paste: `toVillageOsScope` returns exactly the body Village OS's admin
 * scope write takes. humanNeeds.test.ts pins the ids, labels, hues and rungs to
 * Village OS's literal list.
 *
 * THE WORD. On this site plain "needs" means crowdpool asks (the Needs tab,
 * campaign items). Every string here a person reads says "human needs".
 *
 * NO IMPORTS FROM sessionBoard.ts. That file builds Week 3's stages from the
 * lists below at load time, so an import back would be a cycle that breaks
 * whichever file loads second. Code that needs both lives in boardEntries.ts.
 *
 * Nothing here is money, a token amount or a gate. A human need on a board is
 * a description of what a project is for, the same way Village OS treats it.
 */

/* --------------------------------------------------------------- the ten */

export type HumanNeed = {
  /** Village OS's id. Never renamed: Week 4 writes it into `village_needs.need_key`. */
  id: string;
  /** Slide 5's heading, character for character as Village OS has it. */
  label: string;
  /** The word for a short line or mid-sentence ("Your people can count on your project for love"). */
  word: string;
  /** A plain line for the card. */
  plain: string;
  /** The deck's own words for it, in small print. */
  deck: string;
  /** Village OS's colour. Never the only sign: the label always shows. */
  hue: string;
};

export const HUMAN_NEEDS = [
  { id: "vitality", label: "Vitality & Survival Needs", word: "vitality", plain: "The body's ground: breath, food, water, movement, a roof.", deck: "Clean air, organic food, living water, exercise, natural shelter", hue: "#009E73" },
  { id: "significance", label: "Significance", word: "significance", plain: "Everyone here matters, and has a way to show it.", deck: "Self-expression, meaning, validation, feeling wanted, purpose", hue: "#E69F00" },
  { id: "love", label: "Love", word: "love", plain: "Real connection. Family, chosen or born.", deck: "Connection, communication, intimacy, interdependence, authentic community, family", hue: "#CC79A7" },
  { id: "growth", label: "Growth", word: "growth", plain: "People keep growing in body, heart, mind and spirit.", deck: "Physical, emotional, intellectual and spiritual development", hue: "#56B4E9" },
  { id: "contribution", label: "Contribution", word: "contribution", plain: "Everyone here gets to give, to care, and to serve what they believe in.", deck: "Effectiveness, to give, care, and serve an idea greater than myself", hue: "#0072B2" },
  { id: "routine", label: "Routine", word: "routine", plain: "Rhythms you can count on. Ground under your feet.", deck: "Consistency, stability, grounding", hue: "#946B2D" },
  { id: "diversity", label: "Diversity", word: "diversity", plain: "Enough variety and challenge to stay awake.", deck: "Variety, adventure, challenge, surprise", hue: "#8B7DD8" },
  { id: "autonomy", label: "Autonomy", word: "autonomy", plain: "Freedom to choose, space to be.", deck: "Freedom, space, independence", hue: "#33BBC5" },
  { id: "play", label: "Play", word: "play", plain: "Joy, humour and making things for the fun of it.", deck: "Joy, humor, passion, creativity", hue: "#F0E442" },
  { id: "honesty", label: "Honesty", word: "honesty", plain: "People say what's true and show up as themselves.", deck: "Authenticity, integrity, presence", hue: "#D55E00" },
] as const satisfies readonly HumanNeed[];

export type HumanNeedId = (typeof HUMAN_NEEDS)[number]["id"];
export const HUMAN_NEED_IDS = HUMAN_NEEDS.map((n) => n.id) as HumanNeedId[];
const NEED_BY_ID: Record<string, HumanNeed> = Object.fromEntries(HUMAN_NEEDS.map((n) => [n.id, n]));
const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export function humanNeedById(id: string | null | undefined): HumanNeed | null {
  return id && has(NEED_BY_ID, id) ? NEED_BY_ID[id] : null;
}

export function isHumanNeedId(id: unknown): id is HumanNeedId {
  return typeof id === "string" && has(NEED_BY_ID, id);
}

/** "Vitality", "Love": the need's word, capitalised, for a seed list or the start of a line. */
export function needShort(id: string): string {
  const n = humanNeedById(id);
  if (!n) return id;
  return n.word.charAt(0).toUpperCase() + n.word.slice(1);
}

/* ------------------------------------------------------------- the rungs */

/** Slide 6's ladder and Village OS's `NEED_DEPTHS`, lowest first. The order is the comparison. */
export const NEED_RUNGS = [
  { key: "deprived", label: "Deprived" },
  { key: "unmet", label: "Unmet" },
  { key: "alive", label: "Alive" },
  { key: "satisfied", label: "Satisfied" },
  { key: "thriving", label: "Thriving" },
] as const;
export type NeedRung = (typeof NEED_RUNGS)[number]["key"];
export const NEED_RUNG_KEYS = NEED_RUNGS.map((r) => r.key) as NeedRung[];

export function isNeedRung(v: unknown): v is NeedRung {
  return typeof v === "string" && (NEED_RUNG_KEYS as string[]).includes(v);
}

export function rungLabel(rung: string): string {
  return NEED_RUNGS.find((r) => r.key === rung)?.label ?? rung;
}

/**
 * What a rung means for a project, shown under the goal row. Worded from
 * Village OS's own `rungMeaning`, turned toward a project.
 */
export function rungMeaning(rung: string, needId: string): string {
  const word = humanNeedById(needId)?.word ?? needId;
  const Word = needShort(needId);
  switch (rung) {
    case "deprived": return `${Word} goes unmet here, and your project isn't taking that on.`;
    case "unmet": return `Your project sees ${word} is short and hasn't built for it yet.`;
    case "alive": return `${Word} is alive here, and nobody can count on it yet.`;
    case "satisfied": return `Your people can count on your project for ${word}.`;
    case "thriving": return `People come here for ${word}. It's one of the reasons your project exists.`;
    default: return "";
  }
}

/* ------------------------------------------------- breadth and the whole */

/** Who a human need is for, as a whole percent of the project's people (`village_needs.breadth_target_pct`). */
export const BREADTH_STOPS = [
  { key: "10", label: "A few (10%)", phrase: "for a few" },
  { key: "25", label: "Some (25%)", phrase: "for some" },
  { key: "50", label: "About half (50%)", phrase: "for about half" },
  { key: "75", label: "Most (75%)", phrase: "for most of us" },
  { key: "100", label: "Everyone (100%)", phrase: "for everyone" },
] as const;

/** How much of its people's human needs a project means to meet (Village OS `needs.totality_target_pct`). */
export const WHOLE_STOPS = [
  { key: "10", label: "A good neighbour (10%)", phrase: "a tenth" },
  { key: "25", label: "A real part (25%)", phrase: "a quarter" },
  { key: "50", label: "About half (50%)", phrase: "about half" },
  { key: "75", label: "Most of it (75%)", phrase: "most" },
  { key: "100", label: "A whole world (100%)", phrase: "all" },
] as const;

/* ------------------------------------------------- who meets a human need */

/** The five ways, in the deck's order (slide 38), with its power line in small print. */
export const MEET_WAYS = [
  { key: "play", label: "Festivals, rites and play", small: "Play-based co-creation. Love = diversity of games", by: "festivals, rites and play" },
  { key: "household", label: "Each household, on its own ground", small: "Sovereign-based. Power doesn't build up", by: "each household on its own ground" },
  { key: "circle", label: "A circle of people in roles", small: "Role-based. Role is power", by: "a circle of people in roles" },
  { key: "market", label: "A market", small: "Free market-based. Money is power", by: "a market", tip: "Rule of thumb from the deck: keep human needs with roles, gifts and households. Markets can carry wants." },
  { key: "holder", label: "One holder for everyone", small: "Monopoly-based. Status is power", by: "one holder for everyone", tip: "This works when whoever holds the power acts for everyone's wellbeing." },
] as const;
export type MeetWay = (typeof MEET_WAYS)[number]["key"];

/* ------------------------------------------------- the other Week 3 lists */

/** How a project decides, today and where it's headed (slides 37 and 38). */
export const DECIDE_OPTIONS = [
  { key: "founder", label: "A founder or a small board" },
  { key: "tokens", label: "Money or tokens vote" },
  { key: "circles", label: "Circles decide what's theirs" },
  { key: "roles", label: "Voice weighted by role" },
  { key: "elders", label: "Elders or a wisdom council" },
  { key: "consent", label: "Everyone, by consent or consensus" },
  { key: "play", label: "We play it out: rites, festivals, games" },
  { key: "undecided", label: "Not decided yet" },
] as const;

/** The circles a project could start with (slide 41's wheel). */
export const CIRCLES = [
  { key: "food", label: "Food & Fertility" },
  { key: "water", label: "Living Water" },
  { key: "breath", label: "Nourishing Breath" },
  { key: "habitats", label: "Habitats & Material Libraries" },
  { key: "love", label: "Love Cultivation" },
  { key: "trust", label: "Trust & Comms" },
  { key: "purpose", label: "Purpose & Ikigai" },
  { key: "festivals", label: "Festivals & Rites" },
  { key: "organize", label: "Organize & Co-Create" },
] as const;

/** A circle a project names itself, as an answer to "which circles meet this human need?". */
export const OWN_CIRCLE = { key: "own", label: "One of our own circles" } as const;

/** The overall shape of a project's Game (slides 30 to 33: cells, membranes, cells that overlap). */
export const GAME_SHAPES = [
  { key: "one-cell", label: "One cell: a single village or land, its circles inside" },
  { key: "cells", label: "Cells that overlap: households or hamlets sharing circles" },
  { key: "hub", label: "A hub and satellites: a home land with projects around it" },
  { key: "network", label: "A network: our project linked with others in our bioregion" },
  { key: "unsure", label: "Still finding our shape" },
] as const;

/** How well the organisation that takes most of your time meets your human needs (anonymous). */
export const MATE_SCALE = [
  { key: "hardly", label: "Hardly" },
  { key: "little", label: "A little" },
  { key: "some", label: "Some" },
  { key: "mostly", label: "Mostly" },
  { key: "fully", label: "Fully" },
] as const;

/** "How's this landing?" (anonymous). */
export const PULSE_OPTIONS = [
  { key: "clear", label: "Clear" },
  { key: "deeper", label: "Want to go deeper" },
  { key: "fast", label: "Too fast" },
  { key: "lost", label: "Lost me" },
] as const;

/** Beings that could hold a role on a project's land (slides 8 to 15). */
export const ALLIES = [
  { key: "trees", label: "Nut and fruit trees" },
  { key: "fungi", label: "Fungi" },
  { key: "bees", label: "Bees" },
  { key: "birds", label: "Birds" },
  { key: "water", label: "Fish and water life" },
  { key: "beavers", label: "Beavers" },
  { key: "fowl", label: "Ducks and geese" },
  { key: "grazers", label: "Goats and sheep" },
  { key: "chickens", label: "Chickens" },
  { key: "soil", label: "Worms and soil life" },
] as const;

/** How many players a Game takes to start, and how many play now (slide 41). */
export const PLAYER_COUNTS = [
  { key: "under-6", label: "Under 6" },
  { key: "6-12", label: "6 to 12" },
  { key: "13-30", label: "13 to 30" },
  { key: "31-150", label: "31 to 150" },
  { key: "over-150", label: "More than 150" },
] as const;

/** Which economy holds most of a project's life (slide 50). */
export const ECONOMIES = [
  { key: "soul", label: "Soul: love and family" },
  { key: "gift", label: "Gift: belonging and care" },
  { key: "role", label: "Role: circles and roles" },
  { key: "market", label: "Market: prices and trade" },
] as const;

/** The six steps of the box (slide 57). */
export const BOX_STEPS = [
  { key: "vision", label: "Vision, values, image: what's the Game?" },
  { key: "patterns", label: "Patterns of co-creation" },
  { key: "legal", label: "Legal structures" },
  { key: "membranes", label: "Membranes, circles, roles and quests" },
  { key: "pooling", label: "Crowd pooling structure" },
  { key: "governance", label: "Governance: the ongoing game to create the game" },
] as const;

/** What a project wants to set up in Village OS in Week 4. */
export const WEEK4_PICKS = [
  { key: "needs", label: "Our human needs" },
  { key: "circles", label: "Our circles and roles" },
  { key: "decide", label: "Who decides what" },
  { key: "quests", label: "Our first quests" },
  { key: "gratitude", label: "Gratitude" },
  { key: "entry", label: "How new people come in" },
  { key: "unsure", label: "Not sure yet" },
] as const;

/** How useful today was (anonymous). */
export const USEFUL_SCALE = [
  { key: "notyet", label: "Not yet" },
  { key: "little", label: "A little" },
  { key: "useful", label: "Useful" },
  { key: "very", label: "Very" },
  { key: "exactly", label: "Just what we needed" },
] as const;

/* ------------------------------------------------- the Week 4 lists */

/** Did last week's move happen? (Week 4, "Your Week 3 card"). */
export const MOVED_SCALE = [
  { key: "yes", label: "Yes" },
  { key: "part", label: "Part of it" },
  { key: "notyet", label: "Not yet" },
] as const;

/** What the whole project decides together, once each circle decides what's its own (Week 4). */
export const TOGETHER_DECISIONS = [
  { key: "join", label: "Who joins" },
  { key: "land", label: "How the land is used" },
  { key: "build", label: "What we build next" },
  { key: "share", label: "How we share what we grow and receive" },
  { key: "circles", label: "Adding or closing a circle" },
  { key: "change", label: "How these agreements change" },
] as const;

/** What would help most with a project's seats (Week 4); it tells us what to build in Village OS next. */
export const SEAT_HELP = [
  { key: "cards", label: "Role cards people can read" },
  { key: "count", label: "A way to count contribution" },
  { key: "grow", label: "How someone grows in a seat" },
  { key: "circle", label: "How a seat becomes a circle" },
] as const;

/** What a project wants to work on in Week 5 (Game Guides & Economic Systems). */
export const WEEK5_PICKS = [
  { key: "guide", label: "Writing our Game Guide" },
  { key: "economy", label: "Our economic system" },
  { key: "count", label: "Counting contribution" },
  { key: "gratitude", label: "Gratitude" },
  { key: "unsure", label: "Not sure yet" },
] as const;

/** Tap-to-fill words for the private card (slide 2's wheel). Never sent anywhere. */
export const FEEL_WORDS = [
  "Connection", "Support", "Trust", "Safety", "Respect", "Understanding", "Ease", "Balance",
  "Peace of mind", "Freedom", "Choice", "Purpose", "Contribution", "Clarity", "Play", "Celebration",
] as const;

/* --------------------------------------------------------- answer keys */

/**
 * The answer keys the views below read. They are the `block` of a
 * `session_board_items` row of kind `answer`; the text is the option key or
 * the words. Week 3's stage list (shared/sessionBoard.ts) defines the
 * prompts with these exact keys.
 */
export const NEEDS_KEYS = {
  pick: "needs",
  seed: "top",
  other: "other",
  whole: "whole",
  today: (id: string) => `n-${id}`,
  goal: (id: string) => `g-${id}`,
  breadth: (id: string) => `b-${id}`,
  meet: (id: string) => `m-${id}`,
} as const;

/** Every per-need key a human need carries, for the un-pick cascade. */
export function perNeedKeys(id: string): string[] {
  return [NEEDS_KEYS.today(id), NEEDS_KEYS.goal(id), NEEDS_KEYS.breadth(id), NEEDS_KEYS.meet(id)];
}

/** Three seeds each, per person per project. */
export const SEEDS_PER_PERSON = 3;

/* ------------------------------------------------------- one project's card */

/** One row the views read: a `session_board_items` row as the board's public read returns it. */
export type AnswerRow = {
  id: number;
  kind: string;
  block: string | null;
  text: string;
  projectId: number | null;
  createdAt: Date | string | number;
  hidden?: boolean;
};

/** A single-answer row across a project's people: the latest, and how the rest differ. */
export type SingleAnswer = {
  /** The latest answer across the project's people, or null. */
  value: string | null;
  /** How many people gave an answer here. */
  people: number;
  /** The other answers, most people first: "2 of you say Unmet". */
  others: { value: string; people: number }[];
};

/** A short-text answer across a project's people: the latest as the headline, the rest under it. */
export type TextAnswer = { latest: string | null; others: string[] };

export type ProjectView = {
  projectId: number | null;
  /** Any answer row at all. */
  answered: boolean;
  /** Human needs picked by any of the project's people, most people first. A seed counts as a pick. */
  needs: { id: HumanNeedId; people: number }[];
  /** The three needs with the most seeds, a tie going to the most recent. */
  seeds: HumanNeedId[];
  seedCounts: Partial<Record<HumanNeedId, number>>;
  perNeed: Partial<Record<HumanNeedId, { today: SingleAnswer; goal: SingleAnswer; breadth: SingleAnswer; meet: SingleAnswer }>>;
  whole: SingleAnswer;
  decideNow: SingleAnswer;
  decideAim: SingleAnswer;
  players: SingleAnswer;
  playersNow: SingleAnswer;
  economies: SingleAnswer;
  /** Many-pick answers, as people per option. */
  allies: Record<string, number>;
  circles: Record<string, number>;
  /** Circles the project named itself, newest first. */
  circlesOwn: string[];
  /** Which circles meet each human need (`c-<need>`), as people per circle key ("own" = one of its own). */
  circlesFor: Partial<Record<HumanNeedId, Record<string, number>>>;
  /** The overall shape of its Game, and its one-line sketch. */
  shape: SingleAnswer;
  shapeLine: TextAnswer;
  /** Week 4: did last week's move happen, and what moved. */
  moved: SingleAnswer;
  movedLine: TextAnswer;
  /** Week 4: what the whole project decides together, and its first agreement. */
  together: Record<string, number>;
  agreement: TextAnswer;
  /** Week 4: the first step someone takes to come in. */
  entry: TextAnswer;
  box: Record<string, number>;
  week4: Record<string, number>;
  /** Short-text answers. */
  purpose: TextAnswer;
  living: TextAnswer;
  rite: TextAnswer;
  move: TextAnswer;
  play: TextAnswer;
  calls: TextAnswer;
  hope: TextAnswer;
  want: TextAnswer;
  other: TextAnswer;
};

/**
 * The rows a page or the export reads the human needs views from: no hidden
 * row, and nothing on a hidden card. A facilitator's `get` returns both
 * (hidden cards and their rows), so without this their room views would count
 * what everyone else's leave out.
 */
export function shownAnswerRows<T extends AnswerRow>(items: readonly T[], hiddenProjectIds: Iterable<number>): T[] {
  const hidden = new Set(hiddenProjectIds);
  return items.filter((i) => !i.hidden && !(i.projectId != null && hidden.has(i.projectId)));
}

function stamp(row: AnswerRow): number {
  const t = new Date(row.createdAt as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Temp rows painted before a save have negative ids; they are the newest. */
function idRank(id: number): number {
  return id < 0 ? 1e15 - id : id;
}

/** Newest first. */
function byRecency(a: AnswerRow, b: AnswerRow): number {
  return stamp(b) - stamp(a) || idRank(b.id) - idRank(a.id);
}

function single(rows: AnswerRow[]): SingleAnswer {
  if (!rows.length) return { value: null, people: 0, others: [] };
  const sorted = [...rows].sort(byRecency);
  const value = sorted[0].text;
  const counts = new Map<string, number>();
  for (const r of sorted) counts.set(r.text, (counts.get(r.text) ?? 0) + 1);
  const others = [...counts.entries()]
    .filter(([v]) => v !== value)
    .map(([v, people]) => ({ value: v, people }))
    .sort((a, b) => b.people - a.people);
  return { value, people: rows.length, others };
}

function text(rows: AnswerRow[]): TextAnswer {
  const sorted = [...rows].sort(byRecency).map((r) => r.text);
  return { latest: sorted[0] ?? null, others: sorted.slice(1) };
}

function tally(rows: AnswerRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.text] = (out[r.text] ?? 0) + 1;
  return out;
}

/**
 * One project's card, read from every answer its people gave on one board.
 * Pure: stage 7's project view, stage 14's room cards and the Week 4 export
 * all read it. `projectId` null reads the answers given "for the room".
 *
 * Each person's row is one per key (and per option, on a many-pick prompt),
 * because the server keeps it that way. So a count of rows is a count of
 * people, and no author key ever has to reach a page.
 */
export function projectView(items: readonly AnswerRow[], projectId: number | null): ProjectView {
  const rows = items.filter((i) => i.kind === "answer" && !i.hidden && (i.projectId ?? null) === projectId && i.block);
  const by = new Map<string, AnswerRow[]>();
  for (const r of rows) {
    const k = r.block as string;
    const list = by.get(k);
    if (list) list.push(r); else by.set(k, [r]);
  }
  const of = (k: string) => by.get(k) ?? [];

  // Seeds: most seeds first, a tie going to the most recent seed.
  const seedRows = of(NEEDS_KEYS.seed).filter((r) => isHumanNeedId(r.text));
  const seedCounts: Partial<Record<HumanNeedId, number>> = {};
  const seedLatest = new Map<string, AnswerRow>();
  for (const r of seedRows) {
    const id = r.text as HumanNeedId;
    seedCounts[id] = (seedCounts[id] ?? 0) + 1;
    const prev = seedLatest.get(id);
    if (!prev || byRecency(r, prev) < 0) seedLatest.set(id, r);
  }
  const seeds = (Object.keys(seedCounts) as HumanNeedId[])
    .sort((a, b) => (seedCounts[b] ?? 0) - (seedCounts[a] ?? 0) || byRecency(seedLatest.get(a)!, seedLatest.get(b)!))
    .slice(0, SEEDS_PER_PERSON);

  // Picked: any pick, plus any seed (a seed is planted on a picked card).
  const pickCounts = new Map<HumanNeedId, number>();
  for (const r of of(NEEDS_KEYS.pick)) {
    if (isHumanNeedId(r.text)) pickCounts.set(r.text, (pickCounts.get(r.text) ?? 0) + 1);
  }
  for (const id of Object.keys(seedCounts) as HumanNeedId[]) {
    if (!pickCounts.has(id)) pickCounts.set(id, seedCounts[id] ?? 0);
  }
  const order = (id: HumanNeedId) => HUMAN_NEED_IDS.indexOf(id);
  const needs = [...pickCounts.entries()]
    .map(([id, people]) => ({ id, people }))
    .sort((a, b) => b.people - a.people || order(a.id) - order(b.id));

  const circlesFor: ProjectView["circlesFor"] = {};
  for (const id of HUMAN_NEED_IDS) {
    const c = of(`c-${id}`);
    if (c.length) circlesFor[id] = tally(c);
  }

  const perNeed: ProjectView["perNeed"] = {};
  for (const id of HUMAN_NEED_IDS) {
    const today = single(of(NEEDS_KEYS.today(id)));
    const goal = single(of(NEEDS_KEYS.goal(id)));
    const breadth = single(of(NEEDS_KEYS.breadth(id)));
    const meet = single(of(NEEDS_KEYS.meet(id)));
    if (today.people || goal.people || breadth.people || meet.people) perNeed[id] = { today, goal, breadth, meet };
  }

  return {
    projectId,
    answered: rows.length > 0,
    needs,
    seeds,
    seedCounts,
    perNeed,
    whole: single(of(NEEDS_KEYS.whole)),
    decideNow: single(of("decide-now")),
    decideAim: single(of("decide-aim")),
    players: single(of("players")),
    playersNow: single(of("players-now")),
    economies: single(of("economies")),
    allies: tally(of("allies")),
    circles: tally(of("circles")),
    circlesOwn: [...new Set([...of("circles-own")].sort(byRecency).map((r) => r.text.trim()).filter(Boolean))],
    circlesFor,
    shape: single(of("shape")),
    shapeLine: text(of("shape-line")),
    moved: single(of("moved")),
    movedLine: text(of("moved-line")),
    together: tally(of("together")),
    agreement: text(of("agreement")),
    entry: text(of("entry")),
    box: tally(of("box")),
    week4: tally(of("week4")),
    purpose: text(of("purpose")),
    living: text(of("living")),
    rite: text(of("rite")),
    move: text(of("move")),
    play: text(of("play")),
    calls: text(of("calls")),
    hope: text(of("hope")),
    want: text(of("want")),
    other: text(of(NEEDS_KEYS.other)),
  };
}

/**
 * The line under a single answer when the project's people differ:
 * "2 of you say Unmet. 1 of you says Alive." Empty when everyone agrees.
 */
export function othersLine(others: SingleAnswer["others"], label: (value: string) => string = (v) => v): string {
  return others
    .map((o) => `${o.people} of you ${o.people === 1 ? "says" : "say"} ${label(o.value)}.`)
    .join(" ");
}

/* ------------------------------------------------- the card read aloud */

const NOT_YET = "not chosen yet";

function optionLabel(list: readonly { key: string; label: string }[], key: string | null): string | null {
  if (key == null) return null;
  return list.find((o) => o.key === key)?.label ?? null;
}

function sentence(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * A project's card in plain lines, for stage 14's room view and the export.
 * Empty parts read "not chosen yet".
 */
export function projectCardLines(view: ProjectView): string[] {
  const lines: string[] = [];
  const purpose = view.purpose.latest?.trim().replace(/^all this is for\s*/i, "");
  lines.push(purpose ? sentence(`All this is for ${purpose}`) : `All this is for: ${NOT_YET}.`);
  lines.push(view.seeds.length ? `Seeds: ${view.seeds.map(needShort).join(", ")}.` : `Seeds: ${NOT_YET}.`);
  for (const id of view.seeds) {
    const p = view.perNeed[id];
    const today = p?.today.value ? `${rungLabel(p.today.value)} today` : `today ${NOT_YET}`;
    const goal = p?.goal.value ? `${rungLabel(p.goal.value)} in three years` : `three years ${NOT_YET}`;
    const breadth = BREADTH_STOPS.find((b) => b.key === p?.breadth.value)?.phrase ?? `who it's for ${NOT_YET}`;
    const way = MEET_WAYS.find((w) => w.key === p?.meet.value);
    const meet = way ? `met by ${way.by}` : `who meets it ${NOT_YET}`;
    lines.push(`${needShort(id)}: ${today}, ${goal}, ${breadth}, ${meet}.`);
  }
  const whole = WHOLE_STOPS.find((w) => w.key === view.whole.value);
  lines.push(whole ? `Means to meet ${whole.phrase} of its people's human needs.` : `How much of its people's human needs it means to meet: ${NOT_YET}.`);
  const circles = CIRCLES.filter((c) => (view.circles[c.key] ?? 0) > 0)
    .sort((a, b) => (view.circles[b.key] ?? 0) - (view.circles[a.key] ?? 0))
    .map((c): string => c.label)
    .concat(view.circlesOwn ?? []);
  const players = optionLabel(PLAYER_COUNTS, view.players.value);
  const playersNow = optionLabel(PLAYER_COUNTS, view.playersNow.value);
  lines.push(
    `Circles first: ${circles.length ? circles.join(", ") : NOT_YET}. Players to start: ${players ?? NOT_YET}. Playing now: ${playersNow ?? NOT_YET}.`,
  );
  return lines;
}

/* ------------------------------------------------------- Village OS */

export type VillageOsScope = {
  needs: { needKey: HumanNeedId; depthTarget: NeedRung; breadthTargetPct: number; sortOrder: number }[];
  totalityTargetPct?: number;
};

/** Village OS's defaults for a picked human need nobody set: Satisfied, for everyone. */
export const VILLAGE_OS_DEFAULT_DEPTH: NeedRung = "satisfied";
export const VILLAGE_OS_DEFAULT_BREADTH = 100;

/**
 * The body Village OS's admin scope write takes (`PUT /api/admin/needs/scope`,
 * `{ needs: [{ needKey, depthTarget?, breadthTargetPct?, sortOrder? }] }`), plus
 * the totality percent for `needs.totality_target_pct`. Seeds come first, in
 * seed order, then the other picked needs, most people first. A picked need
 * nobody set takes Village OS's defaults. Custom human needs ("A human need
 * that isn't here") stay out: Week 4 adds them once the founder confirms.
 */
export function toVillageOsScope(view: ProjectView): VillageOsScope {
  const ordered: HumanNeedId[] = [...view.seeds];
  for (const n of view.needs) if (!ordered.includes(n.id)) ordered.push(n.id);
  const needs = ordered.map((id, i) => {
    const p = view.perNeed[id];
    const depth = p?.goal.value && isNeedRung(p.goal.value) ? p.goal.value : VILLAGE_OS_DEFAULT_DEPTH;
    const pct = Number(p?.breadth.value);
    return {
      needKey: id,
      depthTarget: depth,
      breadthTargetPct: Number.isInteger(pct) && pct >= 1 && pct <= 100 ? pct : VILLAGE_OS_DEFAULT_BREADTH,
      sortOrder: i + 1,
    };
  });
  const whole = Number(view.whole.value);
  return Number.isInteger(whole) && whole >= 1 && whole <= 100 ? { needs, totalityTargetPct: whole } : { needs };
}

/** Village OS's key for a village's own human need: `custom:<slug>`, as its `customNeedKey` builds it. */
export function customNeedKey(name: string): string {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return `custom:${slug || "unnamed"}`;
}

/* ------------------------------------------------------- the whole room */

export type NeedsSummary = {
  /** Projects (cards) with any human needs answer. The room's own answers are not a project. */
  projects: number;
  needs: {
    id: HumanNeedId;
    label: string;
    /** Projects that picked it or planted a seed on it. */
    projects: number;
    /** Picks across everyone. */
    picks: number;
    /** Seeds planted on it across everyone. */
    seeds: number;
    /** Projects whose top three seeds include it. */
    seedProjects: number;
    today: Record<NeedRung, number>;
    goal: Record<NeedRung, number>;
    breadth: Record<string, number>;
    meet: Record<MeetWay, number>;
  }[];
  /** "The room leans": answers per way, across every seed. */
  meet: Record<MeetWay, number>;
  whole: Record<string, number>;
  decideNow: Record<string, number>;
  decideAim: Record<string, number>;
  circles: Record<string, number>;
  players: Record<string, number>;
  playersNow: Record<string, number>;
  /** "A human need that isn't here", as typed. */
  other: string[];
};

function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

function countInto(out: Record<string, number>, rows: AnswerRow[]) {
  for (const r of rows) if (has(out, r.text)) out[r.text] += 1;
}

/**
 * The room's human needs answers in one place, for the room views (Across the
 * room, the ladder, the room leans) and the admin export's per-week summary.
 * Every option starts at zero so the shape never changes with the answers.
 */
export function needsSummary(items: readonly AnswerRow[]): NeedsSummary {
  const rows = items.filter((i) => i.kind === "answer" && !i.hidden && i.block);
  const of = (k: string) => rows.filter((r) => r.block === k);
  const projectIds = new Set<number>();
  const needKeys = new Set<string>([NEEDS_KEYS.pick, NEEDS_KEYS.seed, NEEDS_KEYS.whole, NEEDS_KEYS.other]);
  for (const id of HUMAN_NEED_IDS) for (const k of perNeedKeys(id)) needKeys.add(k);
  for (const r of rows) if (r.projectId != null && needKeys.has(r.block as string)) projectIds.add(r.projectId);

  const views = [...projectIds].map((id) => projectView(rows, id));
  const wayKeys = MEET_WAYS.map((w) => w.key);
  const roomMeet = zeros(wayKeys);

  const needs = HUMAN_NEEDS.map((n) => {
    const picks = of(NEEDS_KEYS.pick).filter((r) => r.text === n.id);
    const seedRows = of(NEEDS_KEYS.seed).filter((r) => r.text === n.id);
    const touched = new Set<number>();
    for (const r of [...picks, ...seedRows]) if (r.projectId != null) touched.add(r.projectId);
    const today = zeros(NEED_RUNG_KEYS);
    const goal = zeros(NEED_RUNG_KEYS);
    const breadth = zeros(BREADTH_STOPS.map((b) => b.key));
    const meet = zeros(wayKeys);
    countInto(today, of(NEEDS_KEYS.today(n.id)));
    countInto(goal, of(NEEDS_KEYS.goal(n.id)));
    countInto(breadth, of(NEEDS_KEYS.breadth(n.id)));
    countInto(meet, of(NEEDS_KEYS.meet(n.id)));
    for (const w of wayKeys) roomMeet[w] += meet[w];
    return {
      id: n.id,
      label: n.label,
      projects: touched.size,
      picks: picks.length,
      seeds: seedRows.length,
      seedProjects: views.filter((v) => v.seeds.includes(n.id)).length,
      today,
      goal,
      breadth,
      meet,
    };
  });

  const tallyOf = (key: string, list: readonly { key: string }[]) => {
    const out = zeros(list.map((o) => o.key));
    countInto(out, of(key));
    return out;
  };

  return {
    projects: projectIds.size,
    needs,
    meet: roomMeet,
    whole: tallyOf(NEEDS_KEYS.whole, WHOLE_STOPS),
    decideNow: tallyOf("decide-now", DECIDE_OPTIONS),
    decideAim: tallyOf("decide-aim", DECIDE_OPTIONS),
    circles: tallyOf("circles", CIRCLES),
    players: tallyOf("players", PLAYER_COUNTS),
    playersNow: tallyOf("players-now", PLAYER_COUNTS),
    other: of(NEEDS_KEYS.other).sort(byRecency).map((r) => r.text),
  };
}
