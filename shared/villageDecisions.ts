/**
 * Every decision a village makes before its Village OS 1.0 launches, in one
 * list (Rye, 2026-10-20: every episode and every page builds one profile per
 * land project, and the Season ends in launching each project's Village OS
 * from what the episodes uncover; ADR-77).
 *
 * WHY ONE LIST. Village OS has 235 settings and almost all of them have a
 * default a new village can start with. About fifteen have none: a founder
 * has to answer them (the inventory of village-os main 1be7043, 2026-10-15).
 * This list names those, plus the few the Season already collects, each with
 * where it lands in Village OS, the Season 2 weeks that ask it, Village OS's
 * own default in plain words (null when there is none) and whether Village
 * OS's launch checklist waits on it. The profile (shared/projectProfile.ts),
 * the stewards' page, the 1.0 file (shared/villageFile.ts) and the boards all
 * read it, so a decision is asked once and lands in one place.
 *
 * `villageOs` names the target for a reader, not a contract: the 1.0 file's
 * own shape is the contract.
 *
 * Nothing here is money. The two token decisions are a cap and a choice of
 * where a pool can be spent; the file never carries a price, a dues amount or
 * a figure the project didn't type, and exchange, redemption and payments
 * start off (Rye, 2026-10-20).
 */
import { HUMAN_NEEDS } from "./humanNeeds";

export const VILLAGE_MODULES = [
  { key: "identity", title: "Who you are" },
  { key: "purpose", title: "What it's all for" },
  { key: "needs", title: "Human needs" },
  { key: "circles", title: "Circles" },
  { key: "seats", title: "Seats" },
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
 *  - number: a whole number in `range`. cap: a whole number, or "none".
 *  - choice: one of `options`. multi: any of `options`.
 *  - block: a part of the project's card built on the weekly boards. It is
 *    changed on the boards; the stewards confirm what's there.
 */
export type DecisionKind = "text" | "longtext" | "number" | "cap" | "choice" | "multi" | "block";

export type DecisionOption = { key: string; label: string };

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
  /** number: the whole numbers allowed. */
  range?: readonly [number, number];
  /** Where it lands in Village OS, for a reader. */
  villageOs: string;
  /** The Season 2 weeks that ask it (shared/season2Curriculum.ts). */
  weeks: readonly number[];
  /** Village OS's own default in plain words, or null when a village has to answer it. */
  default: string | null;
  /** Village OS's launch checklist waits on it (shared/launchRequirements.ts in village-os). */
  blocksLaunch: boolean;
};

/** Village OS's optional modules a project can switch on in its 1.0 (core modules are always on). */
export const VILLAGE_OS_MODULES: readonly DecisionOption[] = [
  { key: "map", label: "The map: your living org chart, and \"I want to help with...\"" },
  { key: "governance", label: "Proposals and votes" },
  { key: "events", label: "Events and gatherings" },
  { key: "forum", label: "Forum" },
  { key: "feed", label: "The everyday feed" },
  { key: "messaging", label: "Private messages" },
  { key: "stays", label: "Stays for guests" },
  { key: "library", label: "A shared library of tools and goods" },
  { key: "tools", label: "Your village's tools directory" },
  { key: "badges", label: "Skills and honours" },
  { key: "journal", label: "Member journals" },
  { key: "sessions", label: "Live circle calls" },
  { key: "introductions", label: "Introductions between members" },
  { key: "health", label: "Village vital signs" },
  { key: "network", label: "Joining other villages" },
  { key: "crowdpool", label: "The crowdpool view" },
];

/** Core modules every village runs. */
export const VILLAGE_OS_CORE_MODULES = ["quests", "gratitude", "progression", "profiles"] as const;

/** Modules that move money; they start off in a 1.0 until the legal weeks are done. */
export const VILLAGE_OS_MONEY_MODULES = ["exchange", "redemption", "commerce"] as const;

/** How the next holder of a seat is chosen: Village OS's `org_roles.how_chosen` ids. */
export const HOW_CHOSEN: readonly DecisionOption[] = [
  { key: "volunteers", label: "Someone volunteers and the circle says yes" },
  { key: "elected_by_circle", label: "The circle chooses" },
  { key: "appointed_by_lead", label: "The circle's lead appoints" },
  { key: "rotates", label: "It rotates" },
  { key: "founder_appoints", label: "The founders appoint" },
  { key: "other", label: "Another way" },
];

export const HEMISPHERES: readonly DecisionOption[] = [
  { key: "north", label: "Northern hemisphere" },
  { key: "south", label: "Southern hemisphere" },
];

/** The words that start every village's year, unless a project says otherwise. */
export const REGEN_YEAR_SEASONS = "Design, Resource, Build and Rest, the ReGen Civics year";

export const VILLAGE_DECISIONS: readonly VillageDecision[] = [
  // Who you are
  { key: "identity.name", module: "identity", title: "Your village's name", kind: "text", max: 120, villageOs: "brand.project.name", weeks: [1], default: null, blocksLaunch: true },
  { key: "identity.tagline", module: "identity", title: "Its tagline", hint: "One line people see under the name.", kind: "text", max: 160, villageOs: "brand.project.tagline", weeks: [1, 3], default: null, blocksLaunch: true },
  { key: "identity.location", module: "identity", title: "Where on Earth", kind: "text", max: 200, villageOs: "brand.project.location", weeks: [1], default: null, blocksLaunch: true },
  { key: "identity.memberWord", module: "identity", title: "What a member is called", kind: "text", max: 40, villageOs: "brand.project.memberName", weeks: [1, 6], default: "Village member", blocksLaunch: false },
  { key: "identity.timezone", module: "identity", title: "Your timezone", hint: "Like America/Costa_Rica or Europe/Lisbon.", kind: "text", max: 64, villageOs: "season.timezone", weeks: [5], default: null, blocksLaunch: false },
  { key: "identity.hemisphere", module: "identity", title: "Your hemisphere", hint: "Your seasons turn with it.", kind: "choice", options: HEMISPHERES, villageOs: "calendar.hemisphere", weeks: [5], default: "Northern hemisphere", blocksLaunch: false },
  { key: "identity.currency", module: "identity", title: "The currency your prices are in", hint: "Like USD, EUR or CRC.", kind: "text", max: 8, villageOs: "brand.project.fiatCurrency", weeks: [5], default: null, blocksLaunch: false },

  // What it's all for
  {
    key: "purpose.statement", module: "purpose", title: "Your governing purpose",
    hint: "At least 80 words, in five parts: who it serves, what they're up against, from where to where, by what means, and what becomes true.",
    kind: "longtext", max: 4000, villageOs: "gps.statement", weeks: [3, 5], default: null, blocksLaunch: true,
  },

  // Human needs
  { key: "needs.scope", module: "needs", title: "The human needs your village is here to meet", hint: "Seeds first, how deep and for how many, and your own.", kind: "block", villageOs: "village_needs (the needs scope write)", weeks: [3, 4], default: null, blocksLaunch: false },

  // Circles
  { key: "circles.list", module: "circles", title: "Your circles", hint: "Each with the human needs it meets and how it decides. They replace the eight councils a new village starts with.", kind: "block", villageOs: "circles, circles.decides_by, need_links", weeks: [3, 4], default: null, blocksLaunch: false },

  // Seats
  { key: "seats.cards", module: "seats", title: "The seats in each circle", hint: "Each seat's card: its aim, the human need it meets, what it answers for, and who holds it.", kind: "block", villageOs: "org_roles, org_role_assignments, need_links", weeks: [4], default: null, blocksLaunch: false },
  { key: "seats.nextHolder", module: "seats", title: "How the next holder of a seat is chosen", kind: "choice", options: HOW_CHOSEN, villageOs: "org_roles.how_chosen", weeks: [6], default: null, blocksLaunch: false },

  // Who decides
  { key: "decide.together", module: "decide", title: "What the whole village decides together, and your first agreement", kind: "block", villageOs: "village brief, governance", weeks: [3, 4], default: null, blocksLaunch: false },
  { key: "decide.voting", module: "decide", title: "Voting thresholds and how long a vote runs", kind: "text", max: 200, villageOs: "governance.*", weeks: [4], default: "80% unity, 20% quorum, seven days", blocksLaunch: false },
  { key: "decide.founders", module: "decide", title: "Your founders, and at least three people for the launch vote", hint: "Names, one per line. Every founder says yes to launch.", kind: "longtext", max: 1000, villageOs: "users.role founder, the launch vote", weeks: [13], default: null, blocksLaunch: true },
  { key: "decide.stewards", module: "decide", title: "Your first season's stewards", hint: "Founders only for the first season.", kind: "longtext", max: 1000, villageOs: "the steward slate", weeks: [13], default: null, blocksLaunch: false },

  // Coming in
  { key: "membership.covenant", module: "membership", title: "What a member signs", hint: "Village OS ships a placeholder. Week 6 drafts yours, and the legal weeks read it again.", kind: "longtext", max: 4000, villageOs: "covenant", weeks: [6, 11], default: null, blocksLaunch: false },
  { key: "membership.entry", module: "membership", title: "The first step someone takes to come in", kind: "text", max: 300, villageOs: "training, welcome", weeks: [4, 6], default: null, blocksLaunch: false },
  { key: "membership.rite", module: "membership", title: "The rite that brings someone deeper in", kind: "text", max: 300, villageOs: "training, quests", weeks: [3, 6], default: null, blocksLaunch: false },
  { key: "membership.greeter", module: "membership", title: "The seat that greets newcomers", kind: "text", max: 120, villageOs: "arrival.greeter_role", weeks: [6], default: null, blocksLaunch: false },
  { key: "membership.joining", module: "membership", title: "How joining works", kind: "text", max: 200, villageOs: "membership.invite_only, membership.vouches_required", weeks: [6], default: "By invitation, with three vouches", blocksLaunch: false },

  // Quests and contribution
  { key: "quests.first", module: "quests", title: "Your first quests", hint: "Each tied to the human need it grows.", kind: "block", villageOs: "quests, need_links", weeks: [4, 5], default: null, blocksLaunch: false },
  { key: "quests.contribution", module: "quests", title: "What counts as contribution here", kind: "longtext", max: 2000, villageOs: "gratitude, mint rules", weeks: [5], default: null, blocksLaunch: false },
  { key: "quests.tokenName", module: "quests", title: "The name of your recognition token", kind: "text", max: 40, villageOs: "tokens", weeks: [5], default: null, blocksLaunch: false },

  // Seasons
  { key: "seasons.year", module: "seasons", title: "Your village's seasons", hint: "Their names and when each one starts.", kind: "longtext", max: 1000, villageOs: "season, calendar.seasons", weeks: [5], default: REGEN_YEAR_SEASONS, blocksLaunch: false },

  // Modules
  { key: "modules.on", module: "modules", title: "What your village runs", hint: "Quests, gratitude, progression and profiles always run. Exchange, redemption and payments start off until the legal weeks.", kind: "multi", options: VILLAGE_OS_MODULES, villageOs: "module_settings", weeks: [5, 6, 12], default: null, blocksLaunch: true },

  // Economy
  { key: "economy.issuanceCap", module: "economy", title: "The most new tokens each lunar cycle, or no cap", hint: "Counted in whole tokens. Village OS starts at 10,000, and asks every village to choose before it launches.", kind: "cap", range: [0, 10_000_000], villageOs: "ledger.admin_mint_cycle_cap", weeks: [8, 9], default: null, blocksLaunch: true },
  { key: "economy.poolToken", module: "economy", title: "The token your recognition pool pays out", hint: "One your village issues itself, like its credits. Recognition stays apart from it.", kind: "text", max: 40, villageOs: "gratitude.pool_token", weeks: [8, 9], default: "Your village's credits", blocksLaunch: true },

  // Legal and land
  { key: "legal.exitPolicy", module: "legal", title: "What happens when someone leaves", kind: "longtext", max: 4000, villageOs: "exit-policy", weeks: [10, 11], default: null, blocksLaunch: true },
  { key: "legal.structure", module: "legal", title: "Your legal structure, or your fiscal host", kind: "text", max: 300, villageOs: "readiness: legal", weeks: [10, 11], default: null, blocksLaunch: false },
  { key: "legal.land", module: "legal", title: "Your access to the land", kind: "text", max: 300, villageOs: "readiness: land", weeks: [11], default: null, blocksLaunch: false },
  { key: "legal.care", module: "legal", title: "How tensions get raised and repaired, and who holds it", kind: "longtext", max: 2000, villageOs: "readiness: care", weeks: [4, 6, 11], default: null, blocksLaunch: false },

  // The network
  { key: "network.tools", module: "network", title: "Tools you already use", kind: "block", villageOs: "tools", weeks: [1, 7], default: null, blocksLaunch: false },

  // Going live
  { key: "launch.address", module: "launch", title: "The web address you'd like", hint: "Letters, digits and hyphens.", kind: "text", max: 63, villageOs: "domain", weeks: [13], default: null, blocksLaunch: false },
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

/** The first week that asks a decision, for "answered in Week N". */
export function firstWeek(d: VillageDecision): number | null {
  return d.weeks.length ? Math.min(...d.weeks) : null;
}

/** The ten human needs' ids, so a reader can tell them from a project's own. */
export const TEN_NEED_IDS: readonly string[] = HUMAN_NEEDS.map((n) => n.id);
