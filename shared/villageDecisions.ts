/**
 * Every decision a village makes before its Village OS 1.0 launches, in one
 * list (Rye, 2026-10-20: every episode and every page builds one profile per
 * land project, and the Season ends in launching each project's Village OS
 * from what the episodes uncover; ADR-77).
 *
 * WHY ONE LIST. Village OS has 235 settings and almost all of them have a
 * default a new village can start with. About fifteen have none: a founder
 * has to answer them (the inventory of village-os main 1be7043, 2026-10-15,
 * checked again against 5890dd2 on 2026-10-20). This list names those, plus
 * the few the Season already collects, each with where it lands in Village
 * OS, how the 1.0 file carries it (`lands`), the Season 2 weeks that ask it,
 * Village OS's own default in plain words (null when there is none) and
 * whether Village OS's launch checklist waits on it. The profile
 * (shared/projectProfile.ts), the stewards' page, the 1.0 file
 * (shared/villageFile.ts) and the boards all read it, so a decision is asked
 * once and lands in one place.
 *
 * `villageOs` names the target for a reader, not a contract: the 1.0 file's
 * own shape is the contract.
 *
 * Nothing here is money (Rye's call 6). The token decisions are a cap and
 * which token the recognition pool pays out; the file never carries a price,
 * dues or a figure the project didn't type, and the modules that move or
 * raise money start off.
 */
import { HUMAN_NEEDS } from "./humanNeeds";

export const VILLAGE_MODULES = [
  { key: "identity", title: "Who you are" },
  { key: "purpose", title: "What it's all for" },
  { key: "needs", title: "Human needs" },
  { key: "circles", title: "Circles" },
  { key: "seats", title: "Roles" },
  { key: "decide", title: "Who decides" },
  { key: "membership", title: "Coming in" },
  { key: "quests", title: "Quests and contribution" },
  { key: "seasons", title: "Seasons and rhythm" },
  { key: "modules", title: "What the village runs" },
  { key: "economy", title: "Economy" },
  { key: "legal", title: "Legal and land" },
  { key: "network", title: "The network" },
  { key: "launch", title: "Going live" },
] as const;
export type VillageModule = (typeof VILLAGE_MODULES)[number]["key"];

/**
 * How a decision is answered on the stewards' page.
 *  - text: one line. longtext: a few paragraphs.
 *  - number: a whole number in `range`. cap: a whole number in `range`, or
 *    CAP_KEEP_DEFAULT (keep Village OS's own number, as the founders' choice).
 *  - choice: one of `options`. multi: any of `options`.
 *  - block: a part of the project's card built on the weekly boards. It is
 *    changed on the boards; the stewards confirm what's there.
 */
export type DecisionKind = "text" | "longtext" | "number" | "cap" | "choice" | "multi" | "block";

export type DecisionOption = { key: string; label: string };

/**
 * How a decision reaches Village OS from the 1.0 file:
 *  - setting: the file sets it (names, human needs, circles, seats, modules, the cap).
 *  - editor: the file fills Village OS's own editor for the founders to read and save.
 *  - note: words the founders read and set by hand, because Village OS wants an id
 *    or a number the boards don't collect (a role, a token, vote thresholds).
 */
export type DecisionLands = "setting" | "editor" | "note";

/** Checks beyond length, each with its own refusal (shared/projectProfile.ts checkAnswer). */
export type DecisionFormat = "address" | "currency" | "timezone" | "purpose";

export type VillageDecision = {
  /** Permanent: stewards' answers are stored by this key. Change the words freely, never the key. */
  key: string;
  module: VillageModule;
  title: string;
  /** One line under the title. */
  hint?: string;
  kind: DecisionKind;
  options?: readonly DecisionOption[];
  /** text and longtext: the most characters kept. */
  max?: number;
  /** number and cap: the whole numbers allowed. */
  range?: readonly [number, number];
  format?: DecisionFormat;
  /** Where it lands in Village OS, for a reader. */
  villageOs: string;
  lands: DecisionLands;
  /** The Season 2 weeks that ask it (shared/season2Curriculum.ts). */
  weeks: readonly number[];
  /** Village OS's own default in plain words, or null when a village has to answer it. */
  default: string | null;
  /** Village OS's launch checklist waits on it (shared/launchRequirements.ts in village-os). */
  blocksLaunch: boolean;
};

/**
 * Village OS's optional modules a project can switch on in its 1.0; the core
 * modules always run. Stays sell stay credit for money and the crowdpool view
 * carries funding, so both wait with the money modules (Rye's call 6).
 */
export const VILLAGE_OS_MODULES: readonly DecisionOption[] = [
  { key: "map", label: "The map: your living org chart, and \"I want to help with...\"" },
  { key: "governance", label: "Proposals and votes" },
  { key: "events", label: "Events and gatherings" },
  { key: "forum", label: "Forum" },
  { key: "feed", label: "The everyday feed (it runs on the forum)" },
  { key: "messaging", label: "Private messages" },
  { key: "library", label: "A shared library of tools and goods" },
  { key: "tools", label: "Your village's tools directory" },
  { key: "badges", label: "Skills and honours" },
  { key: "journal", label: "Member journals" },
  { key: "sessions", label: "Live circle calls" },
  { key: "introductions", label: "Introductions between members (they run on private messages)" },
  { key: "health", label: "Village vital signs" },
  { key: "network", label: "Joining other villages" },
];

/** A module that runs only beside another; Village OS refuses one without it. */
export const MODULE_NEEDS: Readonly<Record<string, string>> = { feed: "forum", introductions: "messaging" };

/** Core modules every village runs. */
export const VILLAGE_OS_CORE_MODULES = ["quests", "gratitude", "progression", "profiles"] as const;

/** Modules that move or raise money; they start off in a 1.0 until the legal weeks are done. */
export const VILLAGE_OS_MONEY_MODULES = ["exchange", "redemption", "commerce", "stays", "crowdpool"] as const;

/** How the next holder of a seat is chosen: Village OS's `org_roles.how_chosen` ids. */
export const HOW_CHOSEN: readonly DecisionOption[] = [
  { key: "volunteers", label: "Someone volunteers and the circle says yes" },
  { key: "elected_by_circle", label: "The circle chooses" },
  { key: "appointed_by_lead", label: "The circle's lead appoints" },
  { key: "rotates", label: "It rotates" },
  { key: "founder_appoints", label: "The founders appoint" },
];

export const HEMISPHERES: readonly DecisionOption[] = [
  { key: "north", label: "Northern hemisphere" },
  { key: "south", label: "Southern hemisphere" },
];

/**
 * The cap's other answer: keep Village OS's own 10,000 for now. Village OS
 * records it as the founders' choice; it uncaps nothing.
 */
export const CAP_KEEP_DEFAULT = "declined";

/** The words Village OS's launch needs at least of a governing purpose (village-os shared/governingPurpose.ts). */
export const PURPOSE_MIN_WORDS = 80;

export const VILLAGE_DECISIONS: readonly VillageDecision[] = [
  // Who you are
  { key: "identity.name", module: "identity", title: "Your village's name", kind: "text", max: 120, villageOs: "brand.project.name", lands: "setting", weeks: [1], default: null, blocksLaunch: true },
  { key: "identity.tagline", module: "identity", title: "Its tagline", hint: "One line people see under the name.", kind: "text", max: 160, villageOs: "brand.project.tagline", lands: "setting", weeks: [1, 3], default: null, blocksLaunch: false },
  { key: "identity.location", module: "identity", title: "Where on Earth", kind: "text", max: 200, villageOs: "brand.project.location", lands: "setting", weeks: [1], default: null, blocksLaunch: false },
  { key: "identity.memberWord", module: "identity", title: "What a member is called", kind: "text", max: 40, villageOs: "brand.project.memberName", lands: "setting", weeks: [1, 6], default: "Village member", blocksLaunch: false },
  { key: "identity.timezone", module: "identity", title: "Your timezone", hint: "Like America/Costa_Rica or Europe/Lisbon.", kind: "text", max: 64, format: "timezone", villageOs: "season.timezone", lands: "setting", weeks: [5], default: null, blocksLaunch: false },
  { key: "identity.hemisphere", module: "identity", title: "Your hemisphere", hint: "Your seasons turn with it.", kind: "choice", options: HEMISPHERES, villageOs: "calendar.hemisphere", lands: "setting", weeks: [5], default: "Northern hemisphere", blocksLaunch: false },
  { key: "identity.currency", module: "identity", title: "The currency your prices are in", hint: "Three letters, like USD, EUR or CRC.", kind: "text", max: 3, format: "currency", villageOs: "brand.project.fiatCurrency", lands: "setting", weeks: [5], default: null, blocksLaunch: false },

  // What it's all for
  {
    key: "purpose.statement", module: "purpose", title: "Your governing purpose",
    hint: "At least 80 words, in five parts: who it serves, what they're up against, from where to where, by what means, and what becomes true.",
    kind: "longtext", max: 4000, format: "purpose", villageOs: "gps.statement", lands: "editor", weeks: [3, 5], default: null, blocksLaunch: true,
  },

  // Human needs
  { key: "needs.scope", module: "needs", title: "The human needs your village is here to meet", hint: "Seeds first, how deep and for how many, and your own.", kind: "block", villageOs: "village_needs (the needs scope write)", lands: "setting", weeks: [3, 4], default: null, blocksLaunch: false },

  // Circles
  { key: "circles.list", module: "circles", title: "Your circles", hint: "Each with the human needs it meets and how it decides. They replace the eight councils a new village starts with.", kind: "block", villageOs: "circles, circles.decides_by, need_links", lands: "setting", weeks: [3, 4], default: null, blocksLaunch: false },

  // Seats
  { key: "seats.cards", module: "seats", title: "The roles in each circle", hint: "Each role's card: its aim, the human need it meets, what it answers for, and who holds it.", kind: "block", villageOs: "org_roles, org_role_assignments, need_links", lands: "setting", weeks: [4], default: null, blocksLaunch: false },
  { key: "seats.nextHolder", module: "seats", title: "How the next holder of most roles is chosen", hint: "Village OS sets this role by role. This is where your founders start.", kind: "choice", options: HOW_CHOSEN, villageOs: "org_roles.how_chosen", lands: "note", weeks: [6], default: null, blocksLaunch: false },

  // Who decides
  { key: "decide.together", module: "decide", title: "What the whole village decides together, and your first agreement", kind: "block", villageOs: "village brief, governance", lands: "note", weeks: [3, 4], default: null, blocksLaunch: false },
  { key: "decide.voting", module: "decide", title: "Voting thresholds and how long a vote runs", kind: "text", max: 200, villageOs: "governance.unity_pct, quorum_pct, vote_days", lands: "note", weeks: [4], default: "80% unity, 20% quorum, seven days", blocksLaunch: false },
  { key: "decide.founders", module: "decide", title: "Your founders, and at least three people for the launch vote", hint: "Names, one per line. Every founder says yes to launch.", kind: "longtext", max: 1000, villageOs: "users.role founder, the launch vote", lands: "note", weeks: [13], default: null, blocksLaunch: true },
  { key: "decide.stewards", module: "decide", title: "Your first season's stewards", hint: "Founders only for the first season.", kind: "longtext", max: 1000, villageOs: "the steward slate", lands: "note", weeks: [13], default: null, blocksLaunch: false },

  // Coming in
  { key: "membership.covenant", module: "membership", title: "What a member signs", hint: "Village OS starts with sample words. Week 6 drafts yours, and the legal weeks read it again.", kind: "longtext", max: 4000, villageOs: "covenant", lands: "editor", weeks: [6, 11], default: null, blocksLaunch: false },
  { key: "membership.entry", module: "membership", title: "The first step someone takes to come in", kind: "text", max: 300, villageOs: "training, welcome", lands: "note", weeks: [4, 6], default: null, blocksLaunch: false },
  { key: "membership.rite", module: "membership", title: "The rite that brings someone deeper in", kind: "text", max: 300, villageOs: "training, quests", lands: "note", weeks: [3, 6], default: null, blocksLaunch: false },
  { key: "membership.greeter", module: "membership", title: "The role that greets newcomers", kind: "text", max: 120, villageOs: "arrival.greeter_role", lands: "note", weeks: [6], default: null, blocksLaunch: false },
  { key: "membership.joining", module: "membership", title: "How joining works", kind: "text", max: 200, villageOs: "membership.invite_only, membership.vouches_required", lands: "note", weeks: [6], default: "By invitation, with three vouches", blocksLaunch: false },

  // Quests and contribution
  { key: "quests.first", module: "quests", title: "Your first quests", hint: "Each tied to the human need it grows.", kind: "block", villageOs: "quests, need_links", lands: "editor", weeks: [4, 5], default: null, blocksLaunch: false },
  { key: "quests.contribution", module: "quests", title: "What counts as contribution here", kind: "longtext", max: 2000, villageOs: "gratitude, mint rules", lands: "note", weeks: [5], default: null, blocksLaunch: false },
  { key: "quests.tokenName", module: "quests", title: "The name of your recognition token", hint: "The thanks people send each other. It carries no price and no peg.", kind: "text", max: 40, villageOs: "tokens", lands: "editor", weeks: [5], default: null, blocksLaunch: false },

  // Seasons
  { key: "seasons.year", module: "seasons", title: "Your village's seasons", hint: "Their names and the day each one starts.", kind: "longtext", max: 1000, villageOs: "calendar.seasons", lands: "note", weeks: [5], default: "Spring, summer, autumn and winter, by your hemisphere", blocksLaunch: false },

  // Modules
  { key: "modules.on", module: "modules", title: "What your village runs", hint: "Quests, gratitude, progression and profiles always run. Payments, exchange, redemption, stays and the crowdpool view start off until the legal weeks.", kind: "multi", options: VILLAGE_OS_MODULES, villageOs: "module_settings", lands: "setting", weeks: [5, 6, 12], default: null, blocksLaunch: true },

  // Economy
  { key: "economy.issuanceCap", module: "economy", title: "The most new tokens your village can make each lunar cycle", hint: "Counted in whole tokens. Village OS starts at 10,000 and asks every village to set its own number, or keep that one, before it launches.", kind: "cap", range: [1, 10_000_000], villageOs: "ledger.admin_mint_cycle_cap", lands: "setting", weeks: [8, 9], default: null, blocksLaunch: true },
  { key: "economy.poolToken", module: "economy", title: "Which of your tokens people receive each lunar cycle", hint: "Shared out by the thanks they were given. One your village issues itself, like its credits, and never the recognition token.", kind: "text", max: 40, villageOs: "gratitude.pool_token", lands: "note", weeks: [8, 9], default: "Your village's credits", blocksLaunch: false },

  // Legal and land
  { key: "legal.exitPolicy", module: "legal", title: "What happens when someone leaves", kind: "longtext", max: 4000, villageOs: "exit-policy", lands: "editor", weeks: [10, 11], default: null, blocksLaunch: true },
  { key: "legal.structure", module: "legal", title: "Your legal structure, or your fiscal host", kind: "text", max: 300, villageOs: "readiness: legal", lands: "note", weeks: [10, 11], default: null, blocksLaunch: false },
  { key: "legal.land", module: "legal", title: "Your access to the land", kind: "text", max: 300, villageOs: "readiness: land", lands: "note", weeks: [11], default: null, blocksLaunch: false },
  { key: "legal.care", module: "legal", title: "How tensions get raised and repaired, and who holds it", kind: "longtext", max: 2000, villageOs: "readiness: care", lands: "note", weeks: [4, 6, 11], default: null, blocksLaunch: false },

  // The network
  { key: "network.tools", module: "network", title: "Tools you already use", kind: "block", villageOs: "tools", lands: "note", weeks: [1, 7], default: null, blocksLaunch: false },

  // Going live
  { key: "launch.address", module: "launch", title: "The web address you'd like", hint: "Small letters, digits and hyphens.", kind: "text", max: 63, format: "address", villageOs: "domain", lands: "note", weeks: [13], default: null, blocksLaunch: false },
];

const BY_KEY = new Map(VILLAGE_DECISIONS.map((d) => [d.key, d]));

export function villageDecision(key: string): VillageDecision | null {
  return BY_KEY.get(key) ?? null;
}

export const VILLAGE_DECISION_KEYS = VILLAGE_DECISIONS.map((d) => d.key);

/** /^[a-z]+\.[a-zA-Z]+$/: the shape every key keeps, so it fits the store's VARCHAR(48). */
export const DECISION_KEY_RE = /^[a-z]+\.[a-zA-Z]+$/;

/** The decisions a module holds, in order. */
export function decisionsOf(module: VillageModule): VillageDecision[] {
  return VILLAGE_DECISIONS.filter((d) => d.module === module);
}

/** The first week that asks a decision, for "Week N asks this". */
export function firstWeek(d: VillageDecision): number | null {
  return d.weeks.length ? Math.min(...d.weeks) : null;
}

/** The ten human needs' ids, so a reader can tell them from a project's own. */
export const TEN_NEED_IDS: readonly string[] = HUMAN_NEEDS.map((n) => n.id);
