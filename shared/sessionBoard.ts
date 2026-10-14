/**
 * Session boards: one live board for each weekly Season 2 episode.
 *
 * Rye, 2026-10-01: the incubator sessions get a board on the site that
 * everyone in the room can type into. What the projects share (where they are,
 * their biggest pain points, the growth opportunities they see), the
 * opportunities the room votes for and the quests drafted from them are kept
 * here as the Season's own memory, so the game and the next sessions can build
 * on them. Week 2 is the first board, and every week from 2 to 13 has one,
 * linked under its week wherever the Season's schedule is shown.
 *
 * This file is the board's shape: which stages each week walks through and
 * for how long, the facilitator's cues, the fixed lists (project phases,
 * opportunity themes, game blocks, breath patterns), the limits, and the
 * facilitator's actions as a pure function. The router
 * (server/routes/sessionBoard.ts) and the page (client/src/pages/SessionBoard.tsx)
 * both read it. ADR-68.
 *
 * Week 3 (2026-10-14) adds three kinds: `checkin` (tap your project),
 * `prompt` (questions whose answers are `answer` rows keyed by the prompt)
 * and `needs` (the ten human needs cards, shared/humanNeeds.ts). Every board
 * stays open after its session (Rye, 2026-10-13): people go through the weeks
 * at their own pace, so nothing here closes a board.
 */
import { episodeByWeek } from "./season2Curriculum";
import { stripHiddenText } from "./hiddenText";
import { absoluteSiteUrl } from "./siteContext";
import { VILLAGE_OS_OFFER } from "./villageOsOffer";
import {
  ALLIES,
  BOX_STEPS,
  BREADTH_STOPS,
  CIRCLES,
  DECIDE_OPTIONS,
  ECONOMIES,
  FEEL_WORDS,
  HUMAN_NEEDS,
  MATE_SCALE,
  MEET_WAYS,
  NEED_RUNGS,
  PLAYER_COUNTS,
  PULSE_OPTIONS,
  USEFUL_SCALE,
  WEEK4_PICKS,
  WHOLE_STOPS,
} from "./humanNeeds";

export const SESSION_BOARD_SEASON = "Season 2";
export const FIRST_BOARD_WEEK = 2;
export const LAST_BOARD_WEEK = 13;

/** Weeks with a board. Selection Day (week 1) ran before boards existed. */
export function hasSessionBoard(week: number): boolean {
  return Number.isInteger(week) && week >= FIRST_BOARD_WEEK && week <= LAST_BOARD_WEEK;
}

/** Where a week's board lives on the site. */
export function sessionBoardHref(week: number): string {
  return `/season2/week/${week}`;
}

/** The full https URL of that week's board, on the public site. */
export function sessionBoardShareUrl(week: number): string {
  return absoluteSiteUrl(sessionBoardHref(week));
}

/**
 * Role holders who can run a board without being site admins: the Design
 * Season's organizer (the Lantern-Keeper, who facilitates the incubator weeks),
 * the Season Facilitator, and the Incubator Guide. Slugs are toSlug(title) from
 * client/src/data/gameRoles.ts, as stored in roleHolders.roleSlug.
 */
export const BOARD_FACILITATOR_ROLE_SLUGS = [
  "design-season-organizer",
  "season-facilitator",
  "incubator-guide",
] as const;

/* ------------------------------------------------------------------ stages */

export const STAGE_KINDS = [
  "welcome",
  "breath",
  "open",
  "villageos",
  "together",
  "circle",
  "harvest",
  "game",
  "ahead",
  "close",
  "getvillageos",
  // Week 3 (2026-10-14): tap your project, answer prompts, the human needs cards.
  "checkin",
  "prompt",
  "needs",
] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

/**
 * The component that draws each kind, exported by name from
 * client/src/components/session-board/stages.tsx (or re-exported there from
 * week3/). The page maps kind to component; an unknown kind used to fall
 * through to Close, so every kind is listed here and a client test checks
 * each name is exported.
 */
export const STAGE_RENDERERS: Record<StageKind, string> = {
  welcome: "Welcome",
  breath: "Breath",
  open: "OpenSeason",
  villageos: "VillageOS",
  together: "Together",
  circle: "Circle",
  harvest: "Harvest",
  game: "Game",
  ahead: "Ahead",
  close: "Close",
  getvillageos: "GetVillageOS",
  checkin: "CheckIn",
  prompt: "PromptStage",
  needs: "NeedsStage",
};

/**
 * A slide on screen during a stage, by its number in the week's deck
 * (`BOARD_DECKS`). `also`: only if there's time. `deeper`: a "Go deeper" link
 * that stays off the shared screen.
 */
export type SlideRef = { n: number; also?: boolean; deeper?: boolean };

/** A video from a stage's slides: a direct link (YouTube or the deck slide it plays on). */
export type StageVideo = { label: string; href: string };

/** A picture on a stage, served by the site. */
export type StagePicture = { src: string; alt: string; caption: string };

/** One choice on a pick prompt. `key` is what's stored; `small` is small print; `tip` opens on a tap. */
export type PromptOption = { key: string; label: string; small?: string; tip?: string };

/**
 * One question on a stage (Week 3 onward). Its key is defined once per week
 * and stored as the `block` of an `answer` row (or, for an `ask`, the row is
 * kind `ask` with block `s<stage index>`).
 *
 * - `note`: words. `max` 1 replaces your line; more adds up to `max`.
 * - `pick`: options. `max` 1 replaces your pick; more refuses past `max`.
 * - `private`: stays on the person's screen. Never sent, never stored.
 * - `ask`: a question for the wall.
 */
export type BoardPrompt = {
  /** /^[a-z0-9-]{1,16}$/, unique per week (it lands in items.block, VARCHAR(16)). */
  key: string;
  title: string;
  hint?: string;
  placeholder?: string;
  mode: "note" | "pick" | "private" | "ask";
  /** project: kept with the card the person tapped (the room when they tapped none). room: never a project. */
  scope: "project" | "room";
  options?: readonly PromptOption[];
  /** How many rows one person keeps for this key and project. Defaults to 1. */
  max?: number;
  /** No name and no project stored, and the public read returns counts only. */
  anonymous?: boolean;
  /** private only: tap-to-fill words. They never leave the screen either. */
  words?: readonly string[];
  /** A line shown under the field once something is typed. */
  followup?: string;
  /** A link under the prompt. */
  link?: { label: string; href: string };
  /** What the server says past `max`, when it isn't the usual sentence. */
  full?: string;
  /** For the per-need prompts (n-, g-, b-, m-): which human need. */
  need?: string;
};

/** A prompt defined on an earlier stage, shown again here, with its words optionally changed. */
export type PromptRef = { ref: string; title?: string; hint?: string; placeholder?: string };

export type BoardStage = {
  kind: StageKind;
  /** Full name, shown as the stage title and in the agenda. */
  name: string;
  /** Short label for the path across the top. */
  short: string;
  /** Planned minutes. The facilitator can change them live. */
  min: number;
  /** One line for the agenda. */
  line: string;
  /** Private-ish prompts for whoever is facilitating. */
  cues: string[];
  /** The stage's opening line on screen, when the kind's component reads it from here. */
  lede?: string;
  /** Slides on screen, by the week's deck numbers. */
  slides?: readonly SlideRef[];
  /** Videos from this stage's slides, as direct links, so nobody waits on the deck to load one. */
  videos?: readonly StageVideo[];
  /** Pictures shown on the stage itself (served from client/public). */
  pictures?: readonly StagePicture[];
  /** The questions this stage asks, in order. */
  prompts?: readonly (BoardPrompt | PromptRef)[];
  /** needs stages only: which part of the human needs walk. */
  step?: "pick" | "depth" | "meet" | "room";
  /** A quote panel. */
  quote?: string;
  /** Plain lines shown with the stage (a bridge line, a footer). */
  notes?: readonly string[];
  /** Show the Season feedback box (topic for next week, facilitation feedback). */
  feedback?: boolean;
};

/**
 * The last page of every board (ADR-69): the two ways to start a village on
 * Village OS, left up as people leave. Its planned minute counts in the
 * session total, the same as every other stage. Always appended after the
 * close, never inserted earlier: a saved board's planned minutes are kept by
 * position. Its words come from shared/villageOsOffer.ts and say nothing
 * about money, since the board is public and kept as the week's record.
 */
const GET_VILLAGE_OS: BoardStage = {
  kind: "getvillageos", name: VILLAGE_OS_OFFER.board.title, short: "Your village", min: 1,
  line: "Two ways to start your village",
  cues: [
    "Close first. Then flip here and leave it up as people leave.",
    "Put regencivics.earth/village-os in the chat. No ask beyond that.",
  ],
};

/**
 * Week 2's "A Game we build together" stage, right after Village OS (Rye,
 * 2026-10-05): Village OS is itself a collaborative Game. The code is open
 * source and held in common, anyone can build modules, the builders' pool
 * shares $ReGen across the modules villages actually open, and ReGen Civics
 * contracts with land projects through coaches who embed early, which is Rye's
 * own income today and a field he wants to grow with others. Rye speaks in the
 * first person here, as he does on the open season stage.
 */
export const TOGETHER_COPY = {
  title: "A Game we build together",
  lede:
    "Village OS is a Game too, and everyone who uses it is a player. We're crowdbuilding our own village technology, one module at a time.",
  open: {
    title: "Open source, held in common",
    body: "Every line of Village OS is public. Read it, run it, change it. The code is owned by all of us: the villages that run it and the people who build it.",
    /** Shown while VILLAGE_OS_SHOW_REPO is off, in place of the repo's address. */
    pending: "The code's address goes up here soon. Start at",
  },
  modules: {
    title: "Build a module, and its use counts",
    body: "Anyone can build a module and offer it to the shared Module Library. Each lunar cycle the builders' pool divides its $ReGen among the modules villages actually open, by how many of their members use each one, and the treasury's members approve each payout. $ReGen tracks contributions to the Game.",
    link: "How the builders' pool works",
  },
  coaches: {
    title: "We need coaches",
    body: "ReGen Civics contracts with land projects to help them set up their Games. If you're a holistic system designer who loves working with villages, come coach: embed with a village project early and help it find its shape. It's paid work, it's my own income right now, and I want to grow this field together.",
    link: "Help for land projects",
  },
  hands: {
    title: "Raise a hand",
    hint: "Leave your name and email and we'll reach out about coaching or building.",
  },
} as const;

/** What someone can offer from the "A Game we build together" stage, as a raised hand. */
export const BOARD_OFFERS = [
  { key: "coach", label: "Coach a village", on: "I'd coach" },
  { key: "build", label: "Build a module", on: "I'd build" },
] as const;
export type BoardOfferKey = (typeof BOARD_OFFERS)[number]["key"];
export const BOARD_OFFER_KEYS = BOARD_OFFERS.map((o) => o.key) as [BoardOfferKey, ...BoardOfferKey[]];

/**
 * Week 2, Incubator Overview, the first board (Rye, 2026-10-01).
 * Village OS sits between the open season and the circle: how we will build
 * our Games in it, ending in the crowdpool that fills their rosters. "A Game
 * we build together" follows it (Rye, 2026-10-05), added before the board had
 * any saved state: once a board is saved its planned minutes are kept by
 * position, so stages are never inserted into a week that has run.
 */
const WEEK_2: BoardStage[] = [
  {
    kind: "welcome", name: "Welcome", short: "Welcome", min: 5, line: "What today holds",
    cues: [
      "Welcome people by name as they arrive.",
      "Give the shape of today in one breath: how the season works, the tool, the projects, the opportunities.",
      "Point to the board link in the chat. Anyone can type in.",
    ],
  },
  {
    kind: "breath", name: "Drop in", short: "Drop in", min: 8, line: "Breathe together and arrive",
    cues: [
      "Choose the pattern before you start. Long exhale settles a room fastest.",
      "Six rounds of long exhale is about a minute. Let the quiet sit after the last one.",
      "Ask for one word on the board or in the chat.",
    ],
  },
  {
    kind: "open", name: "The open season", short: "Open season", min: 10,
    line: "How the incubator works now, and why I'm here as Amora",
    cues: [
      "Two hats: you hold the room, and Amora is one more project at the table.",
      "Name the shift: rolling applications, open roundtables, each project self-organizing.",
      "A yes means minimum foundations. Getting ready is each project's own work.",
      "Point to the March equinox launch as where everyone is headed.",
    ],
  },
  {
    kind: "villageos", name: "Building in Village OS", short: "Village OS", min: 10,
    line: "The tool we build our Games in, and the crowdpool that fills their rosters",
    cues: [
      "Show, don't list. Walk Amora's circles map: tap a circle, then an open seat.",
      "Show the role cards: a seat's card, front and back, and the card someone sees while proposing a role.",
      "Tie each design week to what gets set up in the tool.",
      "Land the ending: the crowdpool at the March equinox fills each Game's roster.",
    ],
  },
  {
    kind: "together", name: TOGETHER_COPY.title, short: "Together", min: 8,
    line: "Open source, modules that count, and coaches for villages",
    cues: [
      "Village OS is a Game we all play: open source, owned in common, crowdbuilt.",
      "Modules: anyone can build one. The builders' pool shares $ReGen by how much villages use each module.",
      "Name coaching as paid work and your own income today. Ask who wants to grow it with you.",
      "Ask for hands. The form takes names and emails.",
    ],
  },
  {
    kind: "circle", name: "Project circle", short: "Circle", min: 42,
    line: "Where you are, your biggest pain, your next growth",
    cues: [
      "Go first with Amora to model the three questions and the time.",
      "Invite people to add their own project and notes on the board while others share.",
      "More projects than time? Drop the timer to 2 minutes.",
    ],
  },
  {
    kind: "harvest", name: "Harvest", short: "Harvest", min: 12,
    line: "Gather the opportunities and choose what we play for",
    cues: [
      "Read the opportunities back out loud, quickly.",
      "Everyone has three votes on the board. Count votes called out in the chat as room votes.",
      "Choose the top three to five for the game.",
    ],
  },
  {
    kind: "game", name: "Seed the game", short: "Game", min: 15,
    line: "A first sketch: aim, players, quests, flows, who decides",
    cues: [
      "Start with the aim: what does winning look like at the March equinox?",
      "Turn each chosen opportunity into a quest.",
      "Leave the rest open. Week 3 picks it up.",
    ],
  },
  {
    kind: "ahead", name: "Roundtables ahead", short: "Ahead", min: 7,
    line: "The weeks ahead, and one move for this week",
    cues: [
      "Walk the weeks quickly. People raise a hand on the board for the ones they'll join.",
      "Each project names one move before next week.",
    ],
  },
  {
    kind: "close", name: "Close", short: "Close", min: 3, line: "One word, and thanks",
    cues: ["One word each to close.", "Thank people, and say the board stays up as this week's record."],
  },
  { ...GET_VILLAGE_OS },
];

/** Every other week, until it gets its own design. */
function defaultStages(week: number): BoardStage[] {
  const next = week + 1;
  return [
    {
      kind: "welcome", name: "Welcome", short: "Welcome", min: 5, line: "What today holds",
      cues: ["Welcome people by name.", "Point to the board link in the chat."],
    },
    {
      kind: "breath", name: "Drop in", short: "Drop in", min: 8, line: "Breathe together and arrive",
      cues: ["Choose the pattern, then breathe with the light.", "One word each, on the board or in the chat."],
    },
    {
      kind: "circle", name: "Project circle", short: "Circle", min: 50,
      line: "Where you are this week, what's hard, what's growing",
      cues: ["Each project shares what moved since last week.", "Notes go on the board as they talk."],
    },
    {
      kind: "harvest", name: "Harvest", short: "Harvest", min: 30,
      line: "What we're learning together, and what to carry forward",
      cues: ["Read the opportunities back.", "Votes on the board, plus room votes from the chat."],
    },
    {
      kind: "ahead", name: "Roundtables ahead", short: "Ahead", min: 20,
      line: next <= LAST_BOARD_WEEK ? `One move each before week ${next}` : "Where each project goes from here",
      cues: ["Each project names one move.", "Raise hands for the coming roundtables."],
    },
    {
      kind: "close", name: "Close", short: "Close", min: 7, line: "One word, and thanks",
      cues: ["One word each to close."],
    },
    { ...GET_VILLAGE_OS },
  ];
}

/* ---------------------------------------------------------------- week 3 */

/**
 * Week 3's deck: ONE constant holds the Google Slides file and the table of
 * slide numbers to page ids. This is the clean Week 3 copy, "PART 2 NEEDS,
 * Week 3 (Season 2)" (Rye, 2026-10-13), shared by link: 36 slides. Slides 1 to
 * 3 are new (the two-part framing, where answers go, why this matters now);
 * 4 to 36 are the original deck's slides in their original order, which kept
 * their page ids in the copy, except 18 (the original 22, "Why are we
 * inside?", pasted back in on 2026-10-14, which took a new id). A link opens
 * https://docs.google.com/presentation/d/<fileId>/edit#slide=id.<pageId>.
 */
export const WEEK3_DECK = {
  fileId: "1JzjmHh1CuaK__jF6Uc8W1F1UFwXgbV657AxLEqftPh0",
  pages: {
    1: "h54f395336a71f1b1_3_12", // new: Week 3 title and the two-part framing
    2: "h54f395336a71f1b1_3_6", // new: Tap your project, and where your answers go
    3: "h54f395336a71f1b1_3_0", // new: Why this matters now (Nate Hagens)
    4: "g22bfe7ee262_0_0", // was 1
    5: "g22bfe7ee262_0_9", // was 2
    6: "g22bfe7ee262_0_32", // was 5
    7: "g22bfe7ee262_0_41", // was 6
    8: "g22bfe7ee262_0_93", // was 7
    9: "g22bfe7ee262_0_120", // was 8
    10: "g22bfe7ee262_0_164", // was 9
    11: "g22bfe7ee262_0_212", // was 10
    12: "g22bfe7ee262_0_270", // was 11
    13: "g22bfe7ee262_0_102", // was 12
    14: "g22bfe7ee262_0_288", // was 13
    15: "g22bfe7ee262_5_0", // was 14
    16: "g22bfe7ee262_0_294", // was 15
    17: "g22bfe7ee262_0_478", // was 19
    18: "h7b4cdac3707b58bd_3_0", // was 22: Why are we inside? (Jack Schwartz)
    19: "g22bfe7ee262_0_919", // was 23
    20: "g22bfe7ee262_0_965", // was 24
    21: "g22bfe7ee262_0_620", // was 26
    22: "g22bfe7ee262_0_639", // was 28
    23: "g22bfe7ee262_0_1016", // was 35
    24: "g22bfe7ee262_0_1104", // was 37
    25: "g22bfe7ee262_0_1159", // was 38
    26: "g22bfe7ee262_0_1224", // was 39
    27: "g22bfe7ee262_0_1261", // was 40
    28: "g22bfe7ee262_0_1378", // was 41
    29: "g22bfe7ee262_0_1440", // was 42
    30: "g22bfe7ee262_0_1502", // was 43
    31: "g22bfe7ee262_0_1533", // was 44
    32: "g22bfe7ee262_0_1612", // was 46
    33: "g22bfe7ee262_0_1777", // was 47
    34: "g22bfe7ee262_0_1849", // was 50
    35: "g22bfe7ee262_0_2276", // was 56
    36: "g22bfe7ee262_0_2345", // was 57
  } as Readonly<Record<number, string>>,
} as const;

/** Each week's deck, where it has one. */
export const BOARD_DECKS: Readonly<Partial<Record<number, { fileId: string; pages: Readonly<Record<number, string>> }>>> = {
  3: WEEK3_DECK,
};

/** A page id that stands in until the deck has the slide ("NEW1"). Renders as a number with no link. */
export function isPlaceholderSlideId(id: string | null | undefined): boolean {
  return !id || /^NEW\d*$/.test(id);
}

/** The new-tab link to one slide of a week's deck, or null when it has no real page id yet. */
export function slideHref(week: number, n: number): string | null {
  const deck = BOARD_DECKS[week];
  const id = deck?.pages[n];
  if (!deck || isPlaceholderSlideId(id)) return null;
  return `https://docs.google.com/presentation/d/${deck.fileId}/edit#slide=id.${id}`;
}

/** A stage's slides with their links: the ones on screen, then "if there's time", then "go deeper". */
/** The picture of one slide, served by the site, or null when the week has none. */
export function slideImage(week: number, n: number): string | null {
  if (week !== 3 || !(n in WEEK3_DECK.pages)) return null;
  return `/season2/week3/slides/${String(n).padStart(2, "0")}.jpg`;
}

export function stageSlides(week: number, stage: BoardStage): { n: number; href: string | null; img: string | null; also: boolean; deeper: boolean }[] {
  return (stage.slides ?? []).map((s) => ({ n: s.n, href: slideHref(week, s.n), img: slideImage(week, s.n), also: !!s.also, deeper: !!s.deeper }));
}

/** Fill "{name}" style holes in a copy line. */
export function fillCopy(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/**
 * Stage 2, "Tap your project" (Rye, 2026-10-13: anyone can tap any project,
 * no sign-in needed; signed in, every answer is saved to the profile).
 */
export const CHECKIN_COPY = {
  title: "Tap your project",
  lede: "Everything you add today is kept with your project's card, ready for Week 4 and the weeks after. Here with a teammate? Tap the same card.",
  saved: "Signed in, every answer you give is saved to your profile under Submissions, week by week. Joined as a guest? Sign in any time from this browser and your answers come with you. We read everyone's answers to shape how we build Village OS.",
  signIn: "Sign in to save these to your profile",
  filter: "Find your project",
  picked: "You're with {name}.",
  change: "Change project",
  yours: "Yours",
  here: "{n} here",
  joining: "Checking you in...",
  nameField: "Your name (optional). Only the facilitator sees it.",
  add: "Not on the list? Add your project",
  addName: "Project name",
  addPlace: "Where on Earth",
  addYourName: "Your name (optional)",
  addButton: "Add it and check in",
  addHint: "Haven't applied yet? Add it here today, and apply when you're ready.",
  applyLink: "Apply at regencivics.earth/apply",
  loadFailed: "The projects didn't load.",
  retry: "Try again",
  care: "Two cards for one project: merge the stray into the one to keep, and its answers and check-ins move with it. A new card with an application: link it.",
  mergeSelect: "Merge into",
  learn: "I'm here to learn today",
  learnChip: "Here to learn",
  learnLine: "Ask, answer and give feedback as yourself. Tap a project any time to answer for it.",
  footnote: "No account needed. This browser remembers your pick.",
  empty: "Projects show up here as they check in. Add yours below.",
  linkSelect: "Link to an application",
} as const;

/** The words every prompt and needs stage shares. */
export const PROMPT_COPY = {
  forProject: "For {name}",
  change: "Change",
  forRoom: "Answering for the room. Tap your project to keep these with it.",
  tapProject: "Tap your project",
  backToLive: "Back to live",
  onScreen: "On screen:",
  slide: "slide {n}",
  also: "If there's time:",
  deeper: "Go deeper:",
  videos: "Videos:",
  slideAlt: "Slide {n}",
  openSlide: "Open slide {n} in the deck",
  askFoot: "Questions any time: type yours here and I'll pick them up.",
  askPlaceholder: "Type a question and press Enter",
  fromRoom: "From the room",
  answered: "Answered",
  markAnswered: "Mark answered",
  countsOnly: "Only the counts show here, with no names.",
  full: "That's all of yours for this one. Take one back to change it.",
  pickFirst: "Pick this human need first, then plant a seed on it.",
  notChosen: "not chosen yet",
  addMore: "Add another",
  saved: "Saved",
} as const;

/** The human needs cards (stages 6, 7, 9 and 13). */
export const NEEDS_COPY = {
  pick: "Tap to pick",
  picked: "Picked",
  plant: "Plant a seed",
  planted: "Seed planted",
  seedsLeft: ["All three planted", "1 seed left", "2 seeds left", "3 seeds left"],
  people: "{n} of you",
  // "The last stage" read like the final stage to someone going at their own pace.
  noSeeds: "Plant up to three seeds first, on {stage}.",
  goBack: "Go to {stage}",
  unpickAsk: "Un-pick {need}? Its seed and your answers on it go too.",
  acrossRoom: "Across the room",
  acrossRoomRow: "{need} · {projects} · {seeds}",
  soFar: "{name} so far:",
  ladder: "The room's ladder",
  leans: "The room leans",
  whoMeets: "Who will meet this on your land?",
  roomCards: "Every project's card",
  noCards: "Each project's card fills in as it answers.",
} as const;

/**
 * Stage 15, "Tell us": the Season feedback box on the board. The box files
 * under the next session that hasn't started (`nextSessionWeek`), and boards
 * stay open for people going at their own pace, so `{week}` is that next
 * session's week, filled on the page from the Season Schedule. Live on
 * Wednesday it reads Week 4.
 */
export const TELL_US_COPY = {
  topic: "What do you want to dig into in Week {week}?",
  /** When the schedule names no next session. */
  topicNext: "What do you want to dig into next session?",
  share: "Share this with the cohort",
  facilitation: "Feedback on how I run these sessions",
  facilitationHint: "Only the organisers see this.",
  /** This box is the Season feedback, read by the organisers; board answers are what the profile keeps. */
  where: "This box goes straight to the organisers, and it stays off your profile. Your answers on the other stages are the ones saved under Submissions.",
  send: "Send",
  sent: "Thank you. It's filed for Week {week}.",
  /** sendFeedback answered with no week (no session left on the schedule). */
  sentNext: "Thank you. The organisers have it.",
} as const;

/** Week 3's close: what the stats count, and the board staying open (Rye, 2026-10-13). */
export const CLOSE_COPY_WEEK3 = {
  stats: ["Projects checked in", "Human needs named", "Seeds planted", "Questions asked"],
  open: "The board stays open. Come back any time to finish a stage.",
} as const;

const opts = (list: readonly { key: string; label: string }[]): PromptOption[] => list.map((o) => ({ key: o.key, label: o.label }));
const NEED_OPTIONS: PromptOption[] = HUMAN_NEEDS.map((n) => ({ key: n.id, label: n.label, small: n.plain }));
const RUNG_OPTIONS = opts(NEED_RUNGS);
const PULSE: PromptOption[] = opts(PULSE_OPTIONS);

/** The per-need questions on "How deep, how wide": today, the goal, and who it's for. */
const DEPTH_PROMPTS: BoardPrompt[] = HUMAN_NEEDS.flatMap((n): BoardPrompt[] => [
  { key: `n-${n.id}`, need: n.id, title: "Where are your people with this today?", mode: "pick", scope: "project", options: RUNG_OPTIONS, max: 1 },
  { key: `g-${n.id}`, need: n.id, title: "Where do you want them in three years?", mode: "pick", scope: "project", options: RUNG_OPTIONS, max: 1 },
  {
    key: `b-${n.id}`, need: n.id, title: "Who is it for?",
    hint: "Childcare may be for the families with children. Clean water is for everyone.",
    mode: "pick", scope: "project", options: opts(BREADTH_STOPS), max: 1,
  },
]);

/** The per-need question on "Who meets each need". */
const MEET_PROMPTS: BoardPrompt[] = HUMAN_NEEDS.map((n): BoardPrompt => ({
  key: `m-${n.id}`, need: n.id, title: NEEDS_COPY.whoMeets, mode: "pick", scope: "project",
  options: MEET_WAYS.map((w) => ({ key: w.key, label: w.label, small: w.small, ...("tip" in w ? { tip: w.tip } : {}) })),
  max: 1,
}));

/**
 * "Why this matters now" (Rye, 2026-10-13): before the room dives in, a clip
 * from Nate Hagens. The link is the plain post address; Rye's share link
 * carried personal tracking parameters (rcm, utm), which never go on the board.
 */
/**
 * Where all of this is going (Rye, 2026-10-14): one aim of the season's economic
 * and social design is that each project can network with others and that
 * supporters and funders can understand it and back it, along a path we build
 * together. Words only; the cooperative stays as shared/fund.ts describes it.
 */
export const WHERE_GOING = {
  bridge: "Where this is all going: a bridge from the world we have to the one our projects are growing. Every week of this season builds a piece of it.",
  pieces: "The pieces we're putting in place together: the ReGen Game framework, your organisation, legal structures, the cooperative in design, crowdpooling and the accelerator.",
  together: "One aim of all this design: your project's economy becomes clear enough to network with other projects, and for supporters and funders to understand it and back it. We're building that path together, one piece each week.",
} as const;

export const WHY_NOW = {
  title: "Why this matters now",
  lede: "Before we dive in, a minute and a half from Nate Hagens: what happens when a civilization built for growth, with no account of resilience, brings in a technology like AI?",
  watch: "Watch: Nate Hagens, 1 minute 41",
  href: "https://www.linkedin.com/posts/nate-hagens-004810b_what-happens-when-a-civilization-optimized-activity-7515814924523151361-R1lw",
} as const;

/**
 * Week 3, "Game & Organisation Co-Creation Part 1" (Wednesday 2026-10-14,
 * 10:00 PDT), Part 1 of 2. Every economy starts with the human needs it's
 * built to meet, so the episode starts there: each project taps its card,
 * names what it's for in Village OS's own keys, and Week 4 builds it in
 * Village OS. The run of show is WEEK3_BOARD_SPEC_V1.md section 2 with Rye's
 * decisions of 2026-10-13: the clean deck's numbers, no badge demo, the
 * private card never leaves the screen, every board stays open, and a
 * "Why this matters now" clip before the room dives in. 18 stages, 120 minutes.
 *
 * Stage positions are fixed from the first save of Week 3's board (planned
 * minutes are kept by position), so this list never gets a stage inserted.
 */
const WEEK_3: BoardStage[] = [
  {
    kind: "welcome", name: "Welcome", short: "Welcome", min: 3, line: "Part 1 of 2: the big picture first",
    slides: [{ n: 1 }],
    pictures: [{ src: "/season2/week3/bridging-worlds.jpg", alt: "Bridging Worlds: a stone bridge across a chasm, from a smoky city and suburbs to a green village of food forests and waterfalls", caption: WHERE_GOING.bridge }],
    cues: [
      "Greet people by name. \"Open the board on your own screen and tap your project while we gather.\" Point to the QR.",
      "Say it plainly: this is Part 1 of 2. Today is the big picture, the human needs each project is here to meet. Next week we design your Game in Village OS from today's answers.",
      "Read any \"You asked us to cover\" notes in one breath.",
      "When you go live, press Start session at the top. Moving between stages never starts the clock, so you can look around first.",
    ],
  },
  {
    kind: "checkin", name: CHECKIN_COPY.title, short: "Your project", min: 5, line: "Tap your project, or add it",
    lede: CHECKIN_COPY.lede,
    slides: [{ n: 2 }],
    cues: [
      "Share the board. \"Tap your project. Not on the list? Add it, two fields. Here to learn? Tap that.\"",
      "Slide 2: every answer is saved to each person's profile under Submissions, and we read them all to shape Village OS. Guests can sign in any time and bring their answers.",
      "Two cards for one project: merge the stray into the one to keep. Its answers and check-ins move with it. A new card with an application: link it with the select.",
    ],
  },
  {
    kind: "breath", name: "Drop in", short: "Drop in", min: 5, line: "Breathe together and arrive",
    cues: [
      "Long exhale, six rounds.",
      "\"We meet a few days after the new moon, early in the Design Season. Planting time.\"",
      "Then one word each, on the board or in the chat.",
    ],
  },
  {
    kind: "prompt", name: "What you came for", short: "You came for", min: 4, line: "Your questions, and one hope for today",
    lede: "Bring your questions on games and organising. They stay open all session, and I'll answer as many as I can as we go.",
    prompts: [
      { key: "ask", title: "Your questions on games and organisation", placeholder: PROMPT_COPY.askPlaceholder, mode: "ask", scope: "project" },
      { key: "hope", title: "What do you want to leave with today, for your project?", placeholder: "One thing you want from today", mode: "note", scope: "project", max: 2 },
    ],
    cues: [
      "Read the first questions aloud and say where today answers them.",
      "The ones we don't reach go first in stage 15.",
      "Ask for one hope per project.",
    ],
  },
  {
    kind: "prompt", name: WHY_NOW.title, short: "Why now", min: 4, line: "A minute and a half on why this matters now",
    lede: WHY_NOW.lede,
    slides: [{ n: 3 }],
    prompts: [
      {
        key: "whynow",
        title: "What did that stir in you, for your project?",
        hint: "One line, for your project, your land or your people.",
        placeholder: "One line",
        mode: "note", scope: "project", max: 1,
        link: { label: WHY_NOW.watch, href: WHY_NOW.href },
      },
    ],
    cues: [
      "Slide 3. \"Before we dive in, a minute and a half on why this matters now.\" Play the clip from the link: Nate Hagens, 1 minute 41.",
      "Then one line on the board: what did that stir in you, for your project?",
      "Land it in one breath: this is why we start with the human needs our projects are here to meet.",
    ],
  },
  {
    kind: "prompt", name: "What it's all for", short: "All for", min: 9, line: "How we measure a project, and your first line",
    lede: "Gabor Maté measures a society by how well it meets human needs and helps people grow. We can measure our projects the same way.",
    slides: [{ n: 4 }, { n: 5 }],
    videos: [{ label: "Gabor Maté: The Myth of Normal and the Power of Connection", href: "https://www.youtube.com/watch?v=X0cODqqYyi8" }],
    prompts: [
      {
        key: "mate",
        title: "Think of the organisation that takes most of your time: your work, a community, your family. How well does it meet your human needs?",
        mode: "pick", scope: "room", anonymous: true, options: opts(MATE_SCALE), max: 1,
      },
      {
        key: "feel",
        title: "Just for you. Right now, about my project, I feel ___ because I need ___.",
        hint: "This stays on your screen. We never save it or send it to our server.",
        placeholder: "I feel ... because I need ...",
        followup: "Look at what you wrote after \"because I need\". If it names a person, a thing or a plan, that's a strategy. Find the human need underneath it.",
        mode: "private", scope: "room", words: FEEL_WORDS,
        link: { label: "Practise speaking from human needs: Quest 10, Communication Patterns", href: "/community/post/617" },
      },
      {
        key: "purpose",
        title: "Your project's first line. All this is for ___",
        placeholder: "twelve families living well on land we heal together",
        hint: "One line. You'll come back to it near the end.",
        mode: "note", scope: "project", max: 1,
      },
    ],
    cues: [
      "Slide 4: Maté's two measures of a society, 1.5 minutes. Our projects get measured the same way.",
      "Slide 5: \"I feel ___ because I need ___\", and a need versus a strategy, 2.5 minutes.",
      "Two quiet minutes on the private card. It stays on their screen. Nothing is saved or sent to our server.",
      "Then the first line: \"You'll polish it near the end.\" The Maté video stays on slide 4 for after.",
    ],
  },
  {
    kind: "needs", step: "pick", name: "What your project is for", short: "Human needs", min: 12, line: "Tap the human needs, plant three seeds",
    lede: "These are the ten human needs from the deck. Tap every one your project is here to meet, for your people and your land. Then plant three seeds on the ones at its heart. Your economy gets built around these.",
    slides: [{ n: 6 }],
    quote: "Not a single human need requires a scarce resource.",
    notes: ["Week 2's housing, food, water and air live inside Vitality. Joy lives in Play. Meaning and purpose live in Significance."],
    prompts: [
      { key: "needs", title: "The human needs your project is here to meet", mode: "pick", scope: "project", options: NEED_OPTIONS, max: 10 },
      { key: "top", title: NEEDS_COPY.plant, mode: "pick", scope: "project", options: NEED_OPTIONS, max: 3, full: "Three seeds each. Take one back to move it." },
      { key: "other", title: "A human need that isn't here", placeholder: "Name it in a few words", mode: "note", scope: "project", max: 3 },
    ],
    cues: [
      "Slide 6: the ten human needs and the Law of Abundance, 3 minutes.",
      "\"Tap every one you're here to meet, then plant three seeds.\" Five minutes of tapping.",
      "Read \"Across the room\": the most-picked human needs, and any nobody picked.",
      "Name the word: human needs, so they stay apart from the crowdpool asks on the site. Read the bridge line for anyone who was in Week 2.",
    ],
  },
  {
    kind: "needs", step: "depth", name: "How deep, how wide", short: "Deep, wide", min: 11, line: "Where your people are, where you want them, and for whom",
    lede: "Take your three seeds one at a time. Mark where your people are with it today, where you want them in three years, and who it's for.",
    slides: [{ n: 7 }, { n: 8 }, { n: 13 }],
    prompts: [
      ...DEPTH_PROMPTS,
      {
        key: "whole",
        title: "How much of your people's human needs does your project mean to meet?",
        hint: "Ten percent is a good neighbour. A hundred percent is a whole world, and it takes a whole economy behind it.",
        mode: "pick", scope: "project", options: opts(WHOLE_STOPS), max: 1,
      },
      { key: "pulse-a", title: "How's this landing?", mode: "pick", scope: "room", anonymous: true, options: PULSE, max: 1 },
    ],
    cues: [
      "Slide 7: depth and breadth, 3 minutes. \"These maps are for certain not empirically correct.\"",
      "Two sentences of your origin story: you looked for the civilisation that would meet your family's human needs, found it doesn't exist yet, and started making it.",
      "Slide 8 for one minute, with respect, crediting the Blackfoot perspective. Slide 13 as the bridge to infinite games, 1.5 minutes.",
      "Say the ten percent and hundred percent line before the whole-project question. Glance at the pulse.",
    ],
  },
  {
    kind: "prompt", name: "Living ways", short: "Living ways", min: 10, line: "Your chestnut, and the beings that could help",
    lede: "Every human need can be met by machines or by living allies. Living allies repair themselves, grow and adapt. Most projects use some of each.",
    slides: [{ n: 9 }, { n: 11 }, { n: 14 }, { n: 15 }, { n: 16 }, { n: 10, also: true }, { n: 12, also: true }],
    videos: [
      { label: "Geese weeding an orchard, and the other ally clips (they play on slide 15)", href: slideHref(3, 15) ?? "" },
      { label: "Crows trained to pick up trash", href: "https://www.youtube.com/watch?v=zk644QrklNE" },
      { label: "Dolphins help fishermen catch fish", href: "https://www.youtube.com/watch?v=lRwWfYLKFw0" },
      { label: "Janine Benyus: design inspired by nature", href: "https://www.youtube.com/watch?v=GD0qPaHEvYM" },
    ],
    prompts: [
      {
        key: "living",
        title: "What could be the chestnut of your land: a living system that meets one of your seeds and mostly tends itself?",
        placeholder: "The human need, and the living way",
        mode: "note", scope: "project", max: 1,
      },
      { key: "allies", title: "Which beings could hold a role on your land?", mode: "pick", scope: "project", options: opts(ALLIES), max: 4 },
    ],
    cues: [
      "Slide 9: machines and living allies. Slide 11: the corn system and the chestnut forest.",
      "Slide 14: read the forest story aloud and stop on \"Until...\".",
      "Slide 15: the geese clip, if you play one. Every other video stays on its slide for after. Slide 16: one line on biomimicry.",
      "Land it: \"Living creatures repair themselves.\" Slides 10 and 12 only if there's time.",
    ],
  },
  {
    kind: "needs", step: "meet", name: "Who meets each need", short: "Who meets", min: 12, line: "Who meets each seed on your land",
    lede: "A human need can be met by each household on its own ground, by circles of people in roles, by a market, or by one holder for everyone. Play is a fifth way. Each project mixes its own.",
    slides: [{ n: 17 }, { n: 18 }, { n: 19 }, { n: 20 }, { n: 22 }, { n: 27 }, { n: 23, also: true }, { n: 21, deeper: true }],
    videos: [
      { label: "Why are we inside? Jack Schwartz (plays on slide 18)", href: slideHref(3, 18) ?? "" },
      { label: "A couple turns their land into a permaculture food forest", href: "https://www.youtube.com/watch?v=6GJFL0MD9fc" },
      { label: "The same food forest at 28 years old", href: "https://www.youtube.com/watch?v=mdi_9o92XcU" },
    ],
    prompts: [
      ...MEET_PROMPTS,
      {
        key: "want",
        title: "Name one thing your project will offer. Does it meet a human need or a want?",
        placeholder: "Name it, then human need or want",
        mode: "note", scope: "project", max: 3,
      },
      { key: "pulse-b", title: "How's this landing?", mode: "pick", scope: "room", anonymous: true, options: PULSE, max: 1 },
    ],
    cues: [
      "Slide 17: every economy is a game, and Monopoly is one.",
      "Slide 18: why are we inside? Play the short Jack Schwartz clip from the slide, then slide 19: access to land, four ways.",
      "Slide 20: the same chart with legal structure added. Legal structures come in Weeks 10 and 11.",
      "Slide 22: water, and \"there is no market for free water.\" Ask: \"Who wins when this human need is met, and who wins when it isn't?\"",
      "Slide 27: keep human needs out of markets, and let markets carry wants. Read \"the room leans\" back.",
      "Slide 23 for the power lines if there's time. Slide 21 is on the board as \"go deeper\".",
    ],
  },
  {
    kind: "prompt", name: "Who decides", short: "Decides", min: 7, line: "How you decide today, and how you want to",
    lede: "When each household meets its own core human needs on its own ground, shared decisions come up less often and can take their time.",
    slides: [{ n: 24 }, { n: 25 }],
    prompts: [
      { key: "decide-now", title: "How does your project decide today?", mode: "pick", scope: "project", options: opts(DECIDE_OPTIONS), max: 1 },
      { key: "decide-aim", title: "How do you want to decide?", mode: "pick", scope: "project", options: opts(DECIDE_OPTIONS), max: 1 },
      {
        key: "play",
        title: "One game, rite or festival that could take the place of a meeting",
        placeholder: "A planting festival in place of the work-day meeting",
        mode: "note", scope: "project", max: 1,
      },
    ],
    cues: [
      "Slide 24: the ways to decide, and the \"Vitally\" line. Slide 25: play-based co-creation, \"Love = Diversity of Games\".",
      "\"A rite or a festival can take the place of a meeting.\"",
      "Run it in 6 minutes if behind.",
    ],
  },
  {
    kind: "prompt", name: "Circles and players", short: "Circles", min: 8, line: "Your first circles, and the players to start",
    lede: "An economy is people coming together to meet each other's human needs. A whole economy takes enough roles, and enough players to fill them.",
    slides: [{ n: 26 }, { n: 28 }, { n: 29 }, { n: 32 }],
    prompts: [
      { key: "circles", title: "Which circles would your project start with? Tap up to four.", mode: "pick", scope: "project", options: opts(CIRCLES), max: 4 },
      { key: "players", title: "We need at least ___ players to start our Game.", mode: "pick", scope: "project", options: opts(PLAYER_COUNTS), max: 1 },
      { key: "players-now", title: "How many are playing now?", mode: "pick", scope: "project", options: opts(PLAYER_COUNTS), max: 1 },
      {
        key: "calls",
        title: "Which circle calls you, and why?",
        hint: "Your Regenerative Ikigai: what you love creating, what you're good at, what the Renaissance calls for, what earns tokens.",
        link: { label: "Your own R-Ikigai: the Co-Creator's Guide", href: "/co-creators-guide" },
        mode: "note", scope: "project", max: 1,
      },
    ],
    cues: [
      "Slide 26: when each economy works, and \"an economy is people coming together to help meet each other's needs.\"",
      "Slide 28: \"We need at least ___ players to start the Infinite Game.\" Slide 29: your own R-Ikigai; say \"what earns tokens\".",
      "Slide 32: cells that overlap can share and remix.",
    ],
  },
  {
    kind: "prompt", name: "From the centre out", short: "Centre out", min: 5, line: "One economy at the centre, and one rite",
    lede: "A project grows from love, play and flow at its centre, out through trust, roles and markets. People come deeper in through rites of passage.",
    slides: [{ n: 30 }, { n: 33 }, { n: 34 }, { n: 31, also: true }],
    prompts: [
      { key: "economies", title: "Which economy should hold most of your project's life?", mode: "pick", scope: "project", options: opts(ECONOMIES), max: 1 },
      {
        key: "rite",
        title: "Name one rite that brings someone deeper into your project.",
        placeholder: "A first season in a role, then a welcome circle",
        mode: "note", scope: "project", max: 1,
      },
    ],
    cues: [
      "Slide 30: membranes, from tokens in to love, play and flow. Slide 33: rites carry people inward. Slide 34: soul, gift, role, market.",
      "Rhyme it with the site's own Rite of Passage quests, and Visitor, Friend, Citizen, Steward.",
      "Past 11:30: slide 34 and the economies tap only, 1 minute. Slide 31 only if there's time. If \"R-Tokens\" comes up, say $ReGen.",
    ],
  },
  {
    kind: "needs", step: "room", name: "Your project in one breath", short: "One breath", min: 8, line: "Each project reads what it's for",
    lede: "Each project reads what it's for, in about a minute. The rest of us listen and send thanks in the chat.",
    slides: [{ n: 35 }],
    prompts: [{ ref: "purpose", title: "Polish your first line. All this is for ___", hint: "This is the line your project reads aloud." }],
    cues: [
      "Switch the share from the deck to the board. Slide 35 can sit behind it: \"The map is not the territory.\"",
      "Each project gets the floor for about a minute. Thanks go in the chat; read a few aloud.",
      "More than 8 projects: 30 seconds each.",
    ],
  },
  {
    kind: "prompt", name: "Your questions, and next week", short: "Questions", min: 9, line: "Questions answered, and one move before Week 4",
    lede: "Let's take your questions. Then each project names one move before Week 4, when we build all of this in Village OS.",
    slides: [{ n: 36 }],
    pictures: [
      { src: "/season2/week3/clarity-resources.jpg", alt: "Clarity and Resources: a tree of light with branches for the ReGen Game framework, legal, organisation, the fund, the crowdpooling platform and the accelerator", caption: WHERE_GOING.pieces },
      { src: "/season2/week3/bridging-worlds.jpg", alt: "Bridging Worlds: a stone bridge across a chasm, from a smoky city to a green village", caption: WHERE_GOING.together },
    ],
    notes: ["Legal structures come in Weeks 10 and 11. Pooling what everyone brings comes in Week 13."],
    prompts: [
      { ref: "ask" },
      { key: "box", title: "Which parts of the box are clear for your project today?", mode: "pick", scope: "project", options: opts(BOX_STEPS), max: 6 },
      {
        key: "move",
        title: "One move before Week 4",
        placeholder: "Read our card with our people and change what doesn't fit",
        mode: "note", scope: "project", max: 1,
      },
      { key: "week4", title: "What do you want to set up in Village OS next week?", mode: "pick", scope: "project", options: opts(WEEK4_PICKS), max: 3 },
    ],
    cues: [
      "Share the wall. Answer the top questions and tap \"Answered\" on each.",
      "Slide 36: today was step 2 of the box, patterns of co-creation. Next week is step 4: membranes, circles, roles and quests, in Village OS.",
      "Legal is Weeks 10 and 11. Crowd pooling is Week 13, in one line.",
      "Close on the big picture: the Clarity + Resources picture, then Bridging Worlds. One aim of all this design is that each project can network with others and that supporters and funders can understand it and back it. We build that path together, one piece each week. The cooperative is in design: not yet a legal entity, and it accepts no money.",
      "Each project names one move. Read the \"set up next week\" picks: that's Week 4's agenda.",
    ],
  },
  {
    kind: "prompt", name: "Tell us", short: "Tell us", min: 4, line: "How today landed",
    lede: "Tell me how today landed. It shapes next week.",
    feedback: true,
    prompts: [
      { key: "landed", title: "One thing that landed for you today", mode: "note", scope: "room", max: 2 },
      { key: "useful", title: "How useful was today for your project?", mode: "pick", scope: "room", anonymous: true, options: opts(USEFUL_SCALE), max: 1 },
    ],
    cues: [
      "\"Tell me how today landed. Tick share if you want your Week 4 topic on next week's welcome.\"",
      "Three quiet minutes.",
    ],
  },
  {
    kind: "close", name: "Close", short: "Close", min: 3, line: "One word, and thanks",
    lede: `One word as you leave. Thank you for bringing your projects to this table. ${CLOSE_COPY_WEEK3.open}`,
    cues: [
      "One word each. Invite a word of thanks: for someone here, for your land, or for yourself.",
      "Read the numbers. Say the board stays open, and anyone can come back any time to finish a stage.",
      "Then press End session. Leave the board open.",
    ],
  },
  { ...GET_VILLAGE_OS },
];

/** The stages a week's board walks through, in order. */
export function boardStages(week: number): BoardStage[] {
  if (week === 2) return WEEK_2;
  if (week === 3) return WEEK_3;
  return defaultStages(week);
}

/* ------------------------------------------------------------ the prompts */

export function isPromptRef(p: BoardPrompt | PromptRef): p is PromptRef {
  return "ref" in p;
}

/** Every prompt a week defines, by key. A `{ ref }` is not a definition. */
export function promptsForWeek(week: number): Map<string, BoardPrompt> {
  const out = new Map<string, BoardPrompt>();
  for (const stage of boardStages(week)) {
    for (const p of stage.prompts ?? []) if (!isPromptRef(p)) out.set(p.key, p);
  }
  return out;
}

/** Where each prompt is defined: key to stage index. */
export function promptHomes(week: number): Map<string, number> {
  const out = new Map<string, number>();
  boardStages(week).forEach((stage, i) => {
    for (const p of stage.prompts ?? []) if (!isPromptRef(p) && !out.has(p.key)) out.set(p.key, i);
  });
  return out;
}

/** A stage's prompts with every `{ ref }` resolved to its definition, ref words laid over it. */
export function resolvedPrompts(week: number, index: number): (BoardPrompt & { isRef: boolean })[] {
  const stage = boardStages(week)[index];
  if (!stage?.prompts) return [];
  const all = promptsForWeek(week);
  const out: (BoardPrompt & { isRef: boolean })[] = [];
  for (const p of stage.prompts) {
    if (!isPromptRef(p)) {
      out.push({ ...p, isRef: false });
      continue;
    }
    const base = all.get(p.ref);
    if (!base) continue;
    const { ref: _ref, ...over } = p;
    const words = Object.fromEntries(Object.entries(over).filter(([, v]) => v !== undefined));
    out.push({ ...base, ...words, isRef: true });
  }
  return out;
}

/** The keys whose public read is counts only. */
export function anonymousKeys(week: number): Set<string> {
  return new Set([...promptsForWeek(week).values()].filter((p) => p.anonymous).map((p) => p.key));
}

/** How many rows one person keeps for a prompt and project. */
export function promptMax(p: BoardPrompt): number {
  return p.max ?? 1;
}

/** What the server says past a prompt's `max`. */
export function promptFull(p: BoardPrompt): string {
  return p.full ?? PROMPT_COPY.full;
}

export const PROMPT_KEY_RE = /^[a-z0-9-]{1,16}$/;
export const OPTION_KEY_RE = /^[a-z0-9-]{1,24}$/;

/** A question from stage `index` goes on the wall as an `ask` row with this block. */
export function askBlock(index: number): string {
  return `s${index}`;
}

/** The stage index an ask's block names, or null when it isn't one. */
export function parseAskBlock(block: string | null | undefined): number | null {
  const m = /^s(\d{1,2})$/.exec(block ?? "");
  return m ? Number(m[1]) : null;
}

/**
 * Whether a question for the wall can come from stage `index`: only the
 * stages that show the "Questions any time" line (`prompt` and `needs`). The
 * server refuses an `ask` from anywhere else, so Week 2's board, which has
 * neither kind, never gets one.
 */
export function canAskFrom(week: number, index: number): boolean {
  const stage = boardStages(week)[index];
  return !!stage && (stage.kind === "prompt" || stage.kind === "needs");
}

/* ---------------------------------------------------------- check-in tiles */

/**
 * Applications whose names are already public (shared/applications' public
 * reads serve these). Their names make check-in tiles; their place shows only
 * where the project page is public (`PUBLIC_PLACE_STATUSES`).
 */
export const CHECKIN_APPLICATION_STATUSES = ["submitted", "under_review", "approved", "active"] as const;
export const PUBLIC_PLACE_STATUSES = ["approved", "active"] as const;

/** One name, folded so "Toa  Hermitage" and "toa hermitage" are one project. */
export function foldProjectName(name: string | null | undefined): string {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * What a check-in tile points at, as one opaque string the page sends back:
 * a card on this board (`p12`), a Season 2 application with no card here yet
 * (`a57`), or a card on an earlier week's board (`w2p8`).
 */
export type TileRef =
  | { from: "board"; cardId: number }
  | { from: "application"; applicationId: number }
  | { from: "earlier"; week: number; cardId: number };

export const TILE_REF_RE = /^(?:p\d{1,10}|a\d{1,10}|w\d{1,2}p\d{1,10})$/;

export function tileRef(t: TileRef): string {
  if (t.from === "board") return `p${t.cardId}`;
  if (t.from === "application") return `a${t.applicationId}`;
  return `w${t.week}p${t.cardId}`;
}

export function parseTileRef(ref: string): TileRef | null {
  if (!TILE_REF_RE.test(ref)) return null;
  let m = /^p(\d+)$/.exec(ref);
  if (m) return { from: "board", cardId: Number(m[1]) };
  m = /^a(\d+)$/.exec(ref);
  if (m) return { from: "application", applicationId: Number(m[1]) };
  m = /^w(\d+)p(\d+)$/.exec(ref);
  if (m) return { from: "earlier", week: Number(m[1]), cardId: Number(m[2]) };
  return null;
}

/**
 * The session's planned minutes: the sum of every entry in `plan`, one per
 * stage. `normalizeBoardState` sizes `plan` to the stage list, so a stage
 * added later is counted too. Get your Village OS used to sit outside this
 * sum (ADR-69). It is included now, and so is any stage added after it.
 * `stages` is the list the plan lines up with.
 */
export function sessionMinutes(plan: number[], _stages: BoardStage[]): number {
  return plan.reduce((a, m) => a + m, 0);
}

/**
 * The moment a running session is over. The presenter can end it, and it also
 * ends when the planned length has passed. Null while it is still going, or
 * before anyone has started it.
 */
export function sessionClosedAt(state: BoardState, plannedMs: number, now: number): number | null {
  if (!state.sessionStartedAt) return null;
  if (state.endedAt) return state.endedAt;
  const end = state.sessionStartedAt + Math.max(0, plannedMs);
  return now >= end ? end : null;
}

/**
 * Follow the room only while that session is still running.
 * Before the board loads, and after the clock has ended, the screen stays
 * on the stage someone picked. A finished week opens on the first stage.
 */
export function keepsFollowingRoom(opts: {
  boardLoaded: boolean;
  sessionEnded: boolean;
  facilitator: boolean;
  following: boolean;
}): boolean {
  if (!opts.boardLoaded || opts.sessionEnded) return false;
  return opts.following || opts.facilitator;
}

/**
 * A stage tap keeps following only when the session is live and that stage
 * is the one the room is on. The room reads as stage 0 until the board
 * arrives, so an early tap must not count as following.
 */
export function followingAfterStageChoice(opts: {
  boardLoaded: boolean;
  sessionEnded: boolean;
  facilitator: boolean;
  chosen: number;
  liveStage: number;
}): boolean {
  if (!opts.boardLoaded || opts.sessionEnded) return false;
  if (opts.facilitator) return true;
  return opts.chosen === opts.liveStage;
}

/** Elapsed session time, frozen once the session is over and never past the plan. */
export function sessionElapsedMs(state: BoardState, plannedMs: number, now: number): number | null {
  if (!state.sessionStartedAt) return null;
  const cap = Math.max(0, plannedMs);
  const closed = sessionClosedAt(state, cap, now);
  const at = closed ?? now;
  return Math.min(cap, Math.max(0, at - state.sessionStartedAt));
}

/** What a week's welcome says. Week 2 has its own words; the rest read the curriculum. */
export function boardWelcome(week: number): { title: string; lede: string; leaveWith: string[] } {
  const ep = episodeByWeek(week);
  if (week === 2) {
    return {
      title: ep?.title ?? "Incubator Overview",
      lede: "How this season works, the tool we'll build our Games in, and the projects at the table. We finish by choosing the growth opportunities our first Game grows around.",
      leaveWith: [
        "A clear picture of how the season works and where it ends",
        "Some projects at the table, and where each one is",
        "The growth opportunities we share, ready to design a Game around",
      ],
    };
  }
  if (week === 3) {
    // Rye, 2026-10-13: Part 1 of 2. The big picture first, then Week 4 gets practical.
    return {
      title: ep?.title ?? "Game & Organisation Co-Creation Part 1",
      lede: "This is Part 1 of 2. Today we start with the big picture: the end goal, the human needs your project is here to meet. Next week we get practical and design your Game in Village OS, built from your answers today.",
      leaveWith: [
        "Your project's human needs, with three seeds planted at its heart",
        "How deep, and for how many, you mean to meet them",
        "The circles, players and way of deciding your Game starts with",
        "Your questions answered, or carried into Week 4",
      ],
    };
  }
  return {
    title: ep?.title ?? `Week ${week}`,
    lede: ep?.description ?? "",
    leaveWith: [
      "Where the projects at the table are this week",
      "The opportunities we see together",
      "One move each before the next session",
    ],
  };
}

/* ------------------------------------------------------------- fixed lists */

export const PROJECT_PHASES = [
  { key: "seed", title: "Seed", desc: "A vision and a few people, looking for land." },
  { key: "root", title: "Root", desc: "Land in sight or secured. The core group is forming." },
  { key: "sprout", title: "Sprout", desc: "On the land. First builds, first people living there." },
  { key: "grow", title: "Grow", desc: "People living and working there. Systems running." },
  { key: "fruit", title: "Fruit", desc: "Steady, and sharing what works with other projects." },
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number]["key"];
export const PROJECT_PHASE_KEYS = PROJECT_PHASES.map((p) => p.key) as [ProjectPhase, ...ProjectPhase[]];

export const OPPORTUNITY_THEMES = [
  { key: "people", title: "People & belonging" },
  { key: "decide", title: "Decisions & roles" },
  { key: "money", title: "Money & resources" },
  { key: "land", title: "Land & legal" },
  { key: "story", title: "Story & reach" },
  { key: "tools", title: "Tools & systems" },
  { key: "care", title: "Care & wellbeing" },
] as const;
export type OpportunityTheme = (typeof OPPORTUNITY_THEMES)[number]["key"];
export const OPPORTUNITY_THEME_KEYS = OPPORTUNITY_THEMES.map((t) => t.key) as [OpportunityTheme, ...OpportunityTheme[]];

/** The game canvas: every organisation is a game. */
export const GAME_BLOCKS = [
  { key: "aim", title: "What we play for", prompt: "What does winning look like at the March equinox?" },
  { key: "players", title: "Who plays", prompt: "Projects, stewards, contributors, neighbours, the land itself. Who else?" },
  { key: "quests", title: "Quests", prompt: "Which moves grow the opportunities we chose? One quest per note." },
  { key: "flows", title: "What flows", prompt: "What does each player give, and what do they get back?" },
  { key: "decide", title: "Who decides", prompt: "Who sets the rules, and how do the rules change?" },
] as const;
export type GameBlock = (typeof GAME_BLOCKS)[number]["key"];
export const GAME_BLOCK_KEYS = GAME_BLOCKS.map((b) => b.key) as [GameBlock, ...GameBlock[]];

export const BREATH_PATTERNS = {
  settle: { title: "Long exhale", sub: "In 4 · out 6", phases: [["Breathe in", 4, "in"], ["Breathe out", 6, "out"]] },
  box: { title: "Box", sub: "4 · 4 · 4 · 4", phases: [["Breathe in", 4, "in"], ["Hold", 4, "hold-in"], ["Breathe out", 4, "out"], ["Hold", 4, "hold-out"]] },
  even: { title: "Even", sub: "In 5 · out 5", phases: [["Breathe in", 5, "in"], ["Breathe out", 5, "out"]] },
  /** Mini breathwork (Rye, 2026-10-14): deep, connected breaths, counted one by one; its count and pace are set apart. */
  power: { title: "Mini breathwork", sub: "50 to 80 deep breaths", phases: [["Breathe in", 2, "in"], ["Let go", 2, "out"]] },
} as const satisfies Record<string, { title: string; sub: string; phases: ReadonlyArray<readonly [string, number, "in" | "out" | "hold-in" | "hold-out"]> }>;
export type BreathKey = keyof typeof BREATH_PATTERNS;
export const BREATH_KEYS = Object.keys(BREATH_PATTERNS) as [BreathKey, ...BreathKey[]];
export const BREATH_ROUNDS = [3, 6, 10] as const;

/** Mini breathwork's pace: seconds in and out for each breath. */
export const BREATH_PACES = {
  slow: { title: "Slow", in: 3, out: 3 },
  medium: { title: "Medium", in: 2, out: 2 },
  fast: { title: "Fast", in: 1.5, out: 1.5 },
} as const;
export type BreathPace = keyof typeof BREATH_PACES;
export const BREATH_PACE_KEYS = Object.keys(BREATH_PACES) as [BreathPace, ...BreathPace[]];
/** How many breaths mini breathwork counts (Rye: a setting from 50 to 80). */
export const BREATHWORK_COUNTS = [50, 65, 80] as const;
/** The most rounds a breath can run: mini breathwork's 80 breaths. */
export const BREATH_MAX_ROUNDS = 80;

type BreathPhase = readonly [string, number, "in" | "out" | "hold-in" | "hold-out"];
/** The phases one round runs: the pattern's own, or for mini breathwork, one breath at its pace. */
export function breathPhases(breath: { pattern: BreathKey; pace?: BreathPace }): readonly BreathPhase[] {
  if (breath.pattern === "power") {
    const p = BREATH_PACES[breath.pace ?? "medium"] ?? BREATH_PACES.medium;
    return [["Breathe in", p.in, "in"], ["Let go", p.out, "out"]];
  }
  return (BREATH_PATTERNS[breath.pattern] ?? BREATH_PATTERNS.settle).phases;
}

/**
 * What a row on the board can be. `ask` is a question for the wall (block
 * `s<stage index>`). `answer` is an answer to a stage's prompt (block = the
 * prompt's key, text = the option key or the words); it is written only
 * through the `answer` procedure, never `addItem`.
 */
export const ITEM_KINDS = ["arrive", "leave", "pain", "opp", "game", "ask", "answer"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** The kinds `addItem` takes: everything but `answer`. */
export const NOTE_ITEM_KINDS = ["arrive", "leave", "pain", "opp", "game", "ask"] as const;
export type NoteItemKind = (typeof NOTE_ITEM_KINDS)[number];

/* ------------------------------------------------------------------ limits */

export const BOARD_LIMITS = {
  /** A word to arrive or leave with. */
  word: 40,
  /** A pain point, an opportunity, a game note. */
  note: 300,
  projectName: 120,
  place: 120,
  whereNow: 1200,
  nextMove: 300,
  displayName: 80,
  /** Each person's votes on the opportunities, per board. */
  votesPerPerson: 3,
  /** Notes one person can add to one board. Answers have their own ceilings below. */
  itemsPerAuthor: 80,
  /** Projects one person can add to one board. */
  projectsPerAuthor: 3,
  /** Notes on one board, answers not counted. */
  itemsPerBoard: 2000,
  /**
   * Answer rows one person can keep on one board, across every project they
   * answer for. Each prompt's own `max` bounds them first (about 96 a project
   * at most); this is the loop guard. Boards stay open for good (Rye,
   * 2026-10-13), so answers get their own room and never crowd out notes.
   */
  answersPerAuthor: 300,
  answersPerBoard: 10000,
  projectsPerBoard: 150,
  /** Share timer bounds, seconds. */
  minShareSecs: 60,
  maxShareSecs: 600,
  /** Planned minutes for one stage. */
  maxStageMinutes: 120,
} as const;

export function maxTextFor(kind: ItemKind): number {
  return kind === "arrive" || kind === "leave" ? BOARD_LIMITS.word : BOARD_LIMITS.note;
}

/** One line of text: hidden characters out, runs of whitespace (line breaks too) folded to one space. */
export function cleanBoardLine(raw: string | null | undefined, max: number): string | null {
  if (typeof raw !== "string") return null;
  const text = stripHiddenText(raw)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
  return text ? text : null;
}

/** Several lines: hidden characters out, at most one blank line in a row. */
export function cleanBoardText(raw: string | null | undefined, max: number): string | null {
  if (typeof raw !== "string") return null;
  const text = stripHiddenText(raw.replace(/\r\n?/g, "\n"))
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max)
    .trim();
  return text ? text : null;
}

/** Readiness keys a board's project can tick, kept as a comma list. Unknown keys drop. */
export function parseReadyList(raw: string | null | undefined, allowed: readonly string[]): string[] {
  if (!raw) return [];
  const ok = new Set(allowed);
  const out: string[] = [];
  for (const k of raw.split(",")) {
    const key = k.trim();
    if (ok.has(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

/* ------------------------------------------------------------------- state */

/**
 * The part of a board that only facilitators change: where the room is, the
 * clocks, the breath and the share timer. Times are server milliseconds, so
 * everyone's screen counts from the same moment whatever their own clock says.
 */
export type BoardState = {
  stage: number;
  stageStartedAt: number | null;
  sessionStartedAt: number | null;
  /** Set when the presenter ends the session early. The planned length ends it too. */
  endedAt: number | null;
  /** Planned minutes, one per stage. */
  plan: number[];
  breath: { pattern: BreathKey; rounds: number; startedAt: number | null; pace: BreathPace };
  speaker: { projectId: number | null; secs: number; startedAt: number | null; accum: number };
};

export function defaultBoardState(week: number): BoardState {
  return {
    stage: 0,
    stageStartedAt: null,
    sessionStartedAt: null,
    endedAt: null,
    plan: boardStages(week).map((s) => s.min),
    breath: { pattern: "settle", rounds: 6, startedAt: null, pace: "medium" },
    speaker: { projectId: null, secs: 180, startedAt: null, accum: 0 },
  };
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const stampOrNull = (v: unknown): number | null => (finite(v) && v > 0 ? Math.floor(v) : null);
const clampInt = (v: unknown, lo: number, hi: number, dflt: number): number =>
  finite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt;

/**
 * A stored state read back, whatever shape it is in. Anything missing or
 * malformed falls back to the default, so a hand-edited or older row still
 * renders instead of breaking the board.
 */
export function normalizeBoardState(raw: unknown, week: number): BoardState {
  const base = defaultBoardState(week);
  let src: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") src = parsed as Record<string, unknown>;
    } catch {
      /* fall back to the default */
    }
  } else if (raw && typeof raw === "object") {
    src = raw as Record<string, unknown>;
  }
  const count = base.plan.length;
  const planIn = Array.isArray(src.plan) ? src.plan : [];
  const breath = (src.breath && typeof src.breath === "object" ? src.breath : {}) as Record<string, unknown>;
  const speaker = (src.speaker && typeof src.speaker === "object" ? src.speaker : {}) as Record<string, unknown>;
  const pattern = typeof breath.pattern === "string" && breath.pattern in BREATH_PATTERNS ? (breath.pattern as BreathKey) : base.breath.pattern;
  return {
    stage: clampInt(src.stage, 0, count - 1, 0),
    stageStartedAt: stampOrNull(src.stageStartedAt),
    sessionStartedAt: stampOrNull(src.sessionStartedAt),
    endedAt: stampOrNull(src.endedAt),
    plan: base.plan.map((dflt, i) => clampInt(planIn[i], 1, BOARD_LIMITS.maxStageMinutes, dflt)),
    breath: {
      pattern,
      rounds: clampInt(breath.rounds, 1, BREATH_MAX_ROUNDS, base.breath.rounds),
      startedAt: stampOrNull(breath.startedAt),
      pace: typeof breath.pace === "string" && breath.pace in BREATH_PACES ? (breath.pace as BreathPace) : base.breath.pace,
    },
    speaker: {
      projectId: finite(speaker.projectId) && speaker.projectId > 0 ? Math.floor(speaker.projectId) : null,
      secs: clampInt(speaker.secs, BOARD_LIMITS.minShareSecs, BOARD_LIMITS.maxShareSecs, base.speaker.secs),
      startedAt: stampOrNull(speaker.startedAt),
      accum: finite(speaker.accum) && speaker.accum > 0 ? Math.min(speaker.accum, 24 * 3600) : 0,
    },
  };
}

/** What a facilitator can do to the room. */
export type BoardAction =
  | { type: "go"; stage: number }
  | { type: "startSession" }
  | { type: "endSession" }
  | { type: "restartClocks" }
  | { type: "plan"; stage: number; minutes: number }
  | { type: "breath"; pattern?: BreathKey; rounds?: number; run?: boolean; pace?: BreathPace }
  | { type: "speaker"; projectId: number | null }
  | { type: "timer"; op: "start" | "pause" | "reset" }
  | { type: "shareSecs"; secs: number };

/**
 * Apply one facilitator action at server time `now`. Pure: the caller stores
 * the result. Only "startSession" starts the session clock (Rye, 2026-10-14:
 * a facilitator clicking through the stages before going live started it twice,
 * so moving stages and running the breath no longer do).
 */
export function applyBoardAction(state: BoardState, action: BoardAction, now: number): BoardState {
  const s: BoardState = {
    ...state,
    plan: [...state.plan],
    breath: { ...state.breath },
    speaker: { ...state.speaker },
  };
  const last = s.plan.length - 1;
  switch (action.type) {
    case "go": {
      const stage = Math.min(last, Math.max(0, Math.round(action.stage)));
      if (stage !== s.stage) {
        s.stage = stage;
        s.stageStartedAt = now;
      }
      return s;
    }
    case "startSession":
      s.sessionStartedAt = now;
      s.stageStartedAt = now;
      s.endedAt = null;
      return s;
    case "endSession":
      if (!s.sessionStartedAt) s.sessionStartedAt = now;
      if (!s.endedAt) s.endedAt = now;
      return s;
    case "restartClocks":
      s.sessionStartedAt = null;
      s.stageStartedAt = now;
      s.endedAt = null;
      return s;
    case "plan": {
      const i = Math.round(action.stage);
      if (i >= 0 && i <= last) s.plan[i] = Math.min(BOARD_LIMITS.maxStageMinutes, Math.max(1, Math.round(action.minutes)));
      return s;
    }
    case "breath": {
      if (action.pattern && action.pattern !== s.breath.pattern) {
        s.breath.pattern = action.pattern;
        s.breath.startedAt = null;
        // Mini breathwork counts breaths, the others count rounds: switching resets to a sensible count.
        if (action.pattern === "power" && s.breath.rounds < BREATHWORK_COUNTS[0]) s.breath.rounds = BREATHWORK_COUNTS[0];
        if (action.pattern !== "power" && s.breath.rounds > 20) s.breath.rounds = 6;
      }
      if (action.pace && action.pace in BREATH_PACES && action.pace !== s.breath.pace) {
        s.breath.pace = action.pace;
        s.breath.startedAt = null;
      }
      if (action.rounds != null) s.breath.rounds = Math.min(BREATH_MAX_ROUNDS, Math.max(1, Math.round(action.rounds)));
      if (action.run === true) {
        s.breath.startedAt = now;
      } else if (action.run === false) {
        s.breath.startedAt = null;
      }
      return s;
    }
    case "speaker":
      s.speaker = { ...s.speaker, projectId: action.projectId, startedAt: null, accum: 0 };
      return s;
    case "timer": {
      const sp = s.speaker;
      if (action.op === "start" && !sp.startedAt) sp.startedAt = now;
      else if (action.op === "pause" && sp.startedAt) {
        sp.accum += Math.max(0, now - sp.startedAt) / 1000;
        sp.startedAt = null;
      } else if (action.op === "reset") {
        sp.accum = 0;
        sp.startedAt = null;
      }
      return s;
    }
    case "shareSecs":
      s.speaker.secs = Math.min(BOARD_LIMITS.maxShareSecs, Math.max(BOARD_LIMITS.minShareSecs, Math.round(action.secs)));
      return s;
  }
}

/* --------------------------------------------------------------- the breath */

export type BreathMoment =
  | { idle: true }
  | { done: true }
  | { round: number; label: string; kind: "in" | "out" | "hold-in" | "hold-out"; progress: number; secondsLeft: number };

/** Where the shared breath is at `now`, so every screen breathes together. */
export function breathAt(breath: BoardState["breath"], now: number): BreathMoment {
  if (!breath.startedAt) return { idle: true };
  const phases = breathPhases(breath);
  const cycle = phases.reduce((a, p) => a + p[1], 0);
  const t = Math.max(0, (now - breath.startedAt) / 1000);
  const round = Math.floor(t / cycle) + 1;
  if (round > breath.rounds) return { done: true };
  let r = t % cycle;
  for (const [label, secs, kind] of phases) {
    if (r < secs) return { round, label, kind, progress: r / secs, secondsLeft: Math.ceil(secs - r) };
    r -= secs;
  }
  return { done: true };
}

/** Seconds of the current share used, and left (negative when over). */
export function shareTime(speaker: BoardState["speaker"], now: number): { used: number; left: number } {
  const used = Math.max(0, speaker.accum + (speaker.startedAt ? Math.max(0, now - speaker.startedAt) / 1000 : 0));
  return { used, left: speaker.secs - used };
}

/** Who wrote something: a signed-in player by id, or a guest by the key their browser keeps. */
export function boardIdentity(userId: number | null | undefined, voterKey: string | null | undefined): string | null {
  if (userId) return `u:${userId}`;
  if (voterKey && /^[A-Za-z0-9_-]{8,64}$/.test(voterKey)) return `k:${voterKey}`;
  return null;
}

/**
 * Vote targets: an opportunity on the board, a hand raised for a coming week,
 * a hand raised to offer something, or a check-in with a project's card (one
 * row per person per card, so a profile can list the projects someone played
 * for, and a tile can say "3 here").
 */
export const voteTarget = {
  item: (id: number) => `item:${id}`,
  week: (week: number) => `week:${week}`,
  offer: (key: BoardOfferKey) => `offer:${key}`,
  checkin: (cardId: number) => `checkin:${cardId}`,
};
