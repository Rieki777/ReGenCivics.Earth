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
 */
import { episodeByWeek } from "./season2Curriculum";
import { stripHiddenText } from "./hiddenText";
import { absoluteSiteUrl } from "./siteContext";
import { VILLAGE_OS_OFFER } from "./villageOsOffer";

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

export type StageKind =
  | "welcome"
  | "breath"
  | "open"
  | "villageos"
  | "together"
  | "circle"
  | "harvest"
  | "game"
  | "ahead"
  | "close"
  | "getvillageos";

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

/** The stages a week's board walks through, in order. */
export function boardStages(week: number): BoardStage[] {
  return week === 2 ? WEEK_2 : defaultStages(week);
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
} as const satisfies Record<string, { title: string; sub: string; phases: ReadonlyArray<readonly [string, number, "in" | "out" | "hold-in" | "hold-out"]> }>;
export type BreathKey = keyof typeof BREATH_PATTERNS;
export const BREATH_KEYS = Object.keys(BREATH_PATTERNS) as [BreathKey, ...BreathKey[]];
export const BREATH_ROUNDS = [3, 6, 10] as const;

/** What a note on the board can be. */
export const ITEM_KINDS = ["arrive", "leave", "pain", "opp", "game"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

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
  /** Notes one person can add to one board. */
  itemsPerAuthor: 80,
  /** Projects one person can add to one board. */
  projectsPerAuthor: 3,
  itemsPerBoard: 2000,
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
  breath: { pattern: BreathKey; rounds: number; startedAt: number | null };
  speaker: { projectId: number | null; secs: number; startedAt: number | null; accum: number };
};

export function defaultBoardState(week: number): BoardState {
  return {
    stage: 0,
    stageStartedAt: null,
    sessionStartedAt: null,
    endedAt: null,
    plan: boardStages(week).map((s) => s.min),
    breath: { pattern: "settle", rounds: 6, startedAt: null },
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
      rounds: clampInt(breath.rounds, 1, 20, base.breath.rounds),
      startedAt: stampOrNull(breath.startedAt),
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
  | { type: "breath"; pattern?: BreathKey; rounds?: number; run?: boolean }
  | { type: "speaker"; projectId: number | null }
  | { type: "timer"; op: "start" | "pause" | "reset" }
  | { type: "shareSecs"; secs: number };

/**
 * Apply one facilitator action at server time `now`. Pure: the caller stores
 * the result. Moving past the welcome starts the session clock if nobody has.
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
      if (!s.sessionStartedAt && stage >= 1) s.sessionStartedAt = now;
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
      }
      if (action.rounds != null) s.breath.rounds = Math.min(20, Math.max(1, Math.round(action.rounds)));
      if (action.run === true) {
        s.breath.startedAt = now;
        if (!s.sessionStartedAt) s.sessionStartedAt = now;
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
  const pattern = BREATH_PATTERNS[breath.pattern] ?? BREATH_PATTERNS.settle;
  const cycle = pattern.phases.reduce((a, p) => a + p[1], 0);
  const t = Math.max(0, (now - breath.startedAt) / 1000);
  const round = Math.floor(t / cycle) + 1;
  if (round > breath.rounds) return { done: true };
  let r = t % cycle;
  for (const [label, secs, kind] of pattern.phases) {
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

/** Vote targets: an opportunity on the board, a hand raised for a coming week, or a hand raised to offer something. */
export const voteTarget = {
  item: (id: number) => `item:${id}`,
  week: (week: number) => `week:${week}`,
  offer: (key: BoardOfferKey) => `offer:${key}`,
};
