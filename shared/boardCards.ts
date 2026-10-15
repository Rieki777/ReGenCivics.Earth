/**
 * Cards on a session board (Week 4 on): an answer with several fields, kept
 * as one `answer` row whose text is a small JSON object.
 *
 * Rye, 2026-10-14, for Week 4 ("Game & Organisation Co-Creation Part 2"):
 * need first; projects can add whatever human needs they're pursuing; each
 * seat in a circle is a card with six fields (its name, what it works toward,
 * the human need it meets, what it answers for, who holds it, and what it
 * asks); "held by" can name someone on the team who already holds it, stay
 * open as an invitation, or be a being; and what a seat asks is hours a week
 * or a clear contribution, either one.
 *
 * WHY ANSWER ROWS AND NOT A TABLE. Every answer on a board already reaches
 * the person's profile (Submissions), the admin export, the guest claim and
 * the facilitator's merge of two cards. A card rides all of that by being one
 * more answer row. Each person keeps up to N cards of a kind per project in
 * N slot keys ("seat-1" to "seat-12"); a slot holds one row (`max` 1), so
 * editing a card replaces its row in place, and taking it back is the usual
 * take-back. Different people's cards for one project all show.
 *
 * The words a person reads say "human needs" (plain "needs" means crowdpool
 * asks on this site). Nothing here is money, a token amount or a gate.
 *
 * NO IMPORTS FROM sessionBoard.ts: that file builds Week 4's prompts from the
 * slots here at load time, so an import back would be a cycle.
 */
import {
  BREADTH_STOPS,
  CIRCLES,
  HUMAN_NEEDS,
  NEED_RUNGS,
  customNeedKey,
  humanNeedById,
  isHumanNeedId,
  needShort,
} from "./humanNeeds";
import { stripHiddenText } from "./hiddenText";

/* ------------------------------------------------------------ the kinds */

export type CardKind = "seat" | "own" | "decide" | "quest";

/** Slot keys per kind: `seat-1` to `seat-12`. Each key is a prompt with `max` 1. */
export const CARD_SLOTS: Record<CardKind, { prefix: string; count: number }> = {
  seat: { prefix: "seat", count: 12 },
  own: { prefix: "own", count: 5 },
  decide: { prefix: "dec", count: 12 },
  quest: { prefix: "quest", count: 3 },
};

export const CARD_KINDS = Object.keys(CARD_SLOTS) as CardKind[];

export function cardSlotKeys(kind: CardKind): string[] {
  const s = CARD_SLOTS[kind];
  return Array.from({ length: s.count }, (_, i) => `${s.prefix}-${i + 1}`);
}

/** The card kind a prompt key holds, or null when the key is not a card slot. */
export function cardKindOfKey(key: string | null | undefined): CardKind | null {
  const m = /^([a-z]+)-(\d{1,2})$/.exec(key ?? "");
  if (!m) return null;
  for (const kind of CARD_KINDS) {
    const s = CARD_SLOTS[kind];
    if (s.prefix === m[1] && Number(m[2]) >= 1 && Number(m[2]) <= s.count) return kind;
  }
  return null;
}

/** The longest stored card, as JSON text. session_board_items.text holds 1000 (migration 0300). */
export const CARD_TEXT_MAX = 1000;

/* ------------------------------------------------------- what they hold */

export const HELD_BY = [
  { key: "team", label: "Someone on our team holds it", short: "Held by" },
  { key: "open", label: "Open, an invitation", short: "Open" },
  { key: "being", label: "A being holds it, with someone speaking for it", short: "Held by a being" },
] as const;
export type HeldBy = (typeof HELD_BY)[number]["key"];

/** One seat in a circle (Rye's six fields, 2026-10-14). */
export type SeatCard = {
  /** The seat's name: "Water keeper". */
  name: string;
  /** A circle key from CIRCLES, or "own:<name>" for one of the project's own circles. */
  circle: string;
  /** The human need it meets: one of the ten ids, or "custom:<slug>" for one of the project's own. */
  need: string;
  /** What it works toward. Village OS's seat card calls this the Aim. */
  aim: string;
  /** What it answers for. Village OS's "Answers for". */
  answersFor: string;
  heldBy: HeldBy;
  /** Who holds it (team), or which being (being). Empty when open. */
  who: string;
  /** Hours a week, or a clear contribution. */
  contribution: string;
};

/** A human need the project is pursuing that isn't one of the ten. */
export type OwnNeedCard = { label: string; goal: string; breadth: string };

/**
 * How a circle decides, in Village OS's own words (`circles.decides_by`), so
 * the card carries it across as it is.
 */
export const DECIDES_BY = [
  { key: "consent", label: "By consent" },
  { key: "consensus", label: "By consensus" },
  { key: "majority", label: "By majority vote" },
  { key: "lead", label: "A lead decides" },
  { key: "elders", label: "Elders decide" },
  { key: "founder", label: "The founder decides" },
  { key: "do-ocracy", label: "Whoever does the work decides" },
  { key: "delegated", label: "Handed to someone" },
  { key: "other", label: "Another way" },
] as const;
export type DecidesBy = (typeof DECIDES_BY)[number]["key"];

/** What one circle decides on, and how (optional). */
export type DecideCard = { circle: string; decidesOn: string; how?: DecidesBy };

/** A first quest, and the human need it grows. */
export type QuestCard = { quest: string; need: string };

export type CardOf<K extends CardKind> = K extends "seat" ? SeatCard : K extends "own" ? OwnNeedCard : K extends "decide" ? DecideCard : QuestCard;

/** Field caps, in characters, before the JSON wraps them. */
export const CARD_LIMITS = {
  name: 60,
  circleName: 50,
  aim: 160,
  answersFor: 160,
  who: 60,
  contribution: 100,
  label: 60,
  decidesOn: 200,
  quest: 200,
} as const;

/** The words on the card forms and the refusals. */
export const CARD_COPY = {
  seat: {
    add: "Add a seat",
    edit: "Change this seat",
    save: "Save the seat",
    name: "Seat name",
    namePlaceholder: "Water keeper",
    circle: "Which circle it sits in",
    need: "The human need it meets",
    aim: "What it works toward",
    aimPlaceholder: "living water for every household on the land",
    answersFor: "What it answers for",
    answersForPlaceholder: "the spring, the catchment, the water tests",
    heldBy: "Who holds it",
    whoTeam: "Who on your team",
    whoHint: "A first name is enough. Ask them first: this board is public.",
    whoBeing: "Which being, and who speaks for it",
    whoBeingPlaceholder: "the spring, with Ana speaking for it",
    contribution: "What it asks",
    contributionPlaceholder: "4 hours a week",
    contributionHint: "Hours a week, or a clear contribution.",
    open: "Open: an invitation someone could say yes to.",
    none: "No seats for this human need yet.",
    full: "That's twelve seats of yours for this project. Take one back to add another.",
  },
  own: {
    add: "Add a human need of your own",
    label: "The human need",
    labelPlaceholder: "spiritual practice",
    goal: "Where do you want your people with it in three years?",
    breadth: "Who is it for?",
    save: "Add it",
    full: "That's five of your own. Take one back to add another.",
    lastWeek: "You named this last week: {label}.",
    addLastWeek: "Add it",
  },
  decide: {
    add: "Add what a circle decides",
    circle: "The circle",
    decidesOn: "What it decides on",
    decidesOnPlaceholder: "what we plant, where, and when",
    how: "How it decides",
    save: "Save",
    full: "That's twelve of yours. Take one back to add another.",
  },
  quest: {
    add: "Add a quest",
    quest: "The quest",
    questPlaceholder: "plant twelve chestnuts along the north fence with two neighbours",
    need: "The human need it grows",
    save: "Save the quest",
    full: "Three quests each. Take one back to add another.",
  },
  tooLong: "That card is too long. Shorten a field or two and save again.",
  ownCircle: "One of our own circles",
  ownCircleName: "Name of your own circle",
  pickOne: "Pick one",
  remove: "Take back",
  cancel: "Cancel",
  bad: {
    seat: "A seat takes a name, a circle and the human need it meets.",
    own: "Name the human need and where you want your people with it. One of the ten? Tick it above instead.",
    decide: "Pick the circle, and say what it decides on.",
    quest: "Write the quest, and pick the human need it grows.",
  },
} as const;

/* ------------------------------------------------------------ cleaning */

/** One line: hidden characters out, whitespace folded, trimmed to `max`. */
function line(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return stripHiddenText(raw).replace(/\s+/g, " ").trim().slice(0, max).trim();
}

const CIRCLE_KEYS = new Set<string>(CIRCLES.map((c) => c.key));
const RUNG_KEYS = new Set<string>(NEED_RUNGS.map((r) => r.key));
const BREADTH_KEYS = new Set<string>(BREADTH_STOPS.map((b) => b.key));
const HELD_KEYS = new Set<string>(HELD_BY.map((h) => h.key));
const DECIDES_KEYS = new Set<string>(DECIDES_BY.map((d) => d.key));
/** Village OS's own rule (needKeyProblem): a name of lowercase letters, digits and hyphens, never one of the ten. */
const CUSTOM_NEED_RE = /^custom:[a-z0-9][a-z0-9-]{0,49}$/;

/**
 * Whether a project's own human need can go to Village OS by this name: its
 * key (`custom:<slug>`) is one Village OS takes, so not one of the ten and not
 * empty. "Love." and "Play!" would key as the ten; a name with no letter a to
 * z keys as "unnamed".
 */
export function ownNeedLabelOk(label: string): boolean {
  const key = customNeedKey(label);
  const slug = key.slice("custom:".length);
  if (key === "custom:unnamed" && !/unnamed/i.test(label)) return false;
  if (isHumanNeedId(slug)) return false;
  return !HUMAN_NEEDS.some((n) => n.label.toLowerCase() === label.toLowerCase().trim());
}

/** A circle a card can name: one of the nine, or "own:<name>". */
export function cleanCircle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (CIRCLE_KEYS.has(raw)) return raw;
  if (raw.startsWith("own:")) {
    const name = line(raw.slice(4), CARD_LIMITS.circleName);
    return name ? `own:${name}` : null;
  }
  return null;
}

/** A human need a card can name: one of the ten ids, or a project's own ("custom:<slug>"). */
export function cleanNeedKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (isHumanNeedId(raw)) return raw;
  return CUSTOM_NEED_RE.test(raw) && !isHumanNeedId(raw.slice("custom:".length)) && raw !== "custom:unnamed" ? raw : null;
}

/** The circle's name for a person to read. */
export function circleLabel(circle: string): string {
  if (circle.startsWith("own:")) return circle.slice(4);
  return CIRCLES.find((c) => c.key === circle)?.label ?? circle;
}

/** A human need's name for a person to read, given the project's own needs by key. */
export function needKeyLabel(key: string, own: ReadonlyMap<string, string> = new Map()): string {
  if (isHumanNeedId(key)) return needShort(key);
  return own.get(key) ?? key.replace(/^custom:/, "").replace(/-/g, " ");
}

/**
 * A card as typed, made safe to store: every field cleaned and capped,
 * every choice checked against its list. Null when a required field is
 * missing or a choice isn't one of the list's.
 */
export function cleanCard<K extends CardKind>(kind: K, raw: unknown): CardOf<K> | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (kind === "seat") {
    const name = line(o.name, CARD_LIMITS.name);
    const circle = cleanCircle(o.circle);
    const need = cleanNeedKey(o.need);
    const heldBy = typeof o.heldBy === "string" && HELD_KEYS.has(o.heldBy) ? (o.heldBy as HeldBy) : "open";
    if (!name || !circle || !need) return null;
    const seat: SeatCard = {
      name,
      circle,
      need,
      aim: line(o.aim, CARD_LIMITS.aim),
      answersFor: line(o.answersFor, CARD_LIMITS.answersFor),
      heldBy,
      who: heldBy === "open" ? "" : line(o.who, CARD_LIMITS.who),
      contribution: line(o.contribution, CARD_LIMITS.contribution),
    };
    return seat as CardOf<K>;
  }
  if (kind === "own") {
    const label = line(o.label, CARD_LIMITS.label);
    const goal = typeof o.goal === "string" && RUNG_KEYS.has(o.goal) ? o.goal : "";
    const breadth = typeof o.breadth === "string" && BREADTH_KEYS.has(o.breadth) ? o.breadth : "100";
    if (!label || !goal) return null;
    // One of the ten ("Love", "Play!") belongs on the ten's own cards, and Village
    // OS refuses its key; a name with no letter a to z has no key Village OS can file.
    if (!ownNeedLabelOk(label)) return null;
    return { label, goal, breadth } as CardOf<K>;
  }
  if (kind === "decide") {
    const circle = cleanCircle(o.circle);
    const decidesOn = line(o.decidesOn, CARD_LIMITS.decidesOn);
    if (!circle || !decidesOn) return null;
    const how = typeof o.how === "string" && DECIDES_KEYS.has(o.how) ? (o.how as DecidesBy) : undefined;
    return (how ? { circle, decidesOn, how } : { circle, decidesOn }) as CardOf<K>;
  }
  const quest = line(o.quest, CARD_LIMITS.quest);
  const need = cleanNeedKey(o.need);
  if (!quest || !need) return null;
  return { quest, need } as CardOf<K>;
}

/* ------------------------------------------------------ stored as text */

/** Short keys keep a stored card well inside the column. */
const SHORT: Record<CardKind, Record<string, string>> = {
  seat: { name: "n", circle: "c", need: "d", aim: "a", answersFor: "f", heldBy: "h", who: "w", contribution: "t" },
  own: { label: "l", goal: "g", breadth: "b" },
  decide: { circle: "c", decidesOn: "o", how: "b" },
  quest: { quest: "q", need: "d" },
};

/** A clean card as the text of its answer row. */
export function cardText<K extends CardKind>(kind: K, card: CardOf<K>): string {
  const out: Record<string, string> = {};
  for (const [field, short] of Object.entries(SHORT[kind])) {
    const v = (card as Record<string, string>)[field];
    if (v) out[short] = v;
  }
  return JSON.stringify(out);
}

/** An answer row's text read back as a card, or null when it isn't one. */
export function parseCard<K extends CardKind>(kind: K, text: string | null | undefined): CardOf<K> | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const long: Record<string, unknown> = {};
  for (const [field, short] of Object.entries(SHORT[kind])) long[field] = (raw as Record<string, unknown>)[short];
  return cleanCard(kind, long);
}

/**
 * What the server stores for a card answer: the typed JSON cleaned and
 * written back in short keys, or null when it isn't a whole card. The page
 * sends `cardText` of what the form holds; anything else is refused.
 */
export function normalizeCardText(kind: CardKind, text: string): string | null {
  const card = parseCard(kind, text);
  if (!card) return null;
  const out = cardText(kind, card);
  return out.length <= CARD_TEXT_MAX ? out : null;
}

/* ---------------------------------------------------------- reading rows */

/** A row the card readers take: an answer row, as the board's read returns it. */
export type CardRow = { id: number; kind: string; block: string | null; text: string; projectId: number | null; createdAt: Date | string | number; hidden?: boolean };

export type CardEntry<K extends CardKind> = { rowId: number; key: string; card: CardOf<K>; createdAt: Date | string | number };

function stamp(v: Date | string | number): number {
  const t = new Date(v as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Every card of a kind on one project (null = the room), oldest first. Rows that don't parse are skipped. */
export function cardsOf<K extends CardKind>(rows: readonly CardRow[], kind: K, projectId: number | null): CardEntry<K>[] {
  const out: CardEntry<K>[] = [];
  for (const r of rows) {
    if (r.kind !== "answer" || r.hidden || (r.projectId ?? null) !== projectId) continue;
    if (cardKindOfKey(r.block) !== kind) continue;
    const card = parseCard(kind, r.text);
    if (card) out.push({ rowId: r.id, key: r.block as string, card, createdAt: r.createdAt });
  }
  return out.sort((a, b) => stamp(a.createdAt) - stamp(b.createdAt) || Math.abs(a.rowId) - Math.abs(b.rowId));
}

/** The first slot key of a kind that this person has no row in, or null when every slot is used. */
export function freeSlot(kind: CardKind, usedKeys: Iterable<string>): string | null {
  const used = new Set(usedKeys);
  return cardSlotKeys(kind).find((k) => !used.has(k)) ?? null;
}

/** The project's own human needs, by key: "custom:spiritual-practice" to "Spiritual practice". */
export function ownNeedLabels(own: readonly CardEntry<"own">[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of own) {
    const key = customNeedKey(e.card.label);
    if (!out.has(key)) out.set(key, e.card.label);
  }
  return out;
}

/* --------------------------------------------------------- in plain words */

/** Someone's words placed mid-sentence: "Living water for..." reads "living water for...", "UN goals" stays. */
export function midSentence(words: string): string {
  return /^[A-Z][a-z]/.test(words) ? words.charAt(0).toLowerCase() + words.slice(1) : words;
}

/** A card in one line, for the profile, the export and the card read aloud. */
export function cardLine(kind: CardKind, card: CardOf<CardKind>, own: ReadonlyMap<string, string> = new Map()): string {
  if (kind === "seat") {
    const s = card as SeatCard;
    const held = s.heldBy === "open" ? "open" : s.who ? `held by ${s.who}` : s.heldBy === "being" ? "held by a being" : "held by the team";
    const parts = [
      `${s.name} (${circleLabel(s.circle)}), meets ${needKeyLabel(s.need, own)}`,
      s.aim ? `works toward ${midSentence(s.aim)}` : "",
      s.answersFor ? `answers for ${midSentence(s.answersFor)}` : "",
      held,
      s.contribution ? `asks ${midSentence(s.contribution)}` : "",
    ].filter(Boolean);
    return parts.join("; ");
  }
  if (kind === "own") {
    const o = card as OwnNeedCard;
    const goal = NEED_RUNGS.find((r) => r.key === o.goal)?.label ?? o.goal;
    const breadth = BREADTH_STOPS.find((b) => b.key === o.breadth)?.phrase ?? "";
    return [o.label, `${goal} in three years`, breadth].filter(Boolean).join(", ");
  }
  if (kind === "decide") {
    const d = card as DecideCard;
    const how = DECIDES_BY.find((x) => x.key === d.how)?.label;
    return `${circleLabel(d.circle)} decides on ${midSentence(d.decidesOn)}${how ? ` (${midSentence(how)})` : ""}`;
  }
  const q = card as QuestCard;
  return `${q.quest} (grows ${needKeyLabel(q.need, own)})`;
}

/** The label a card row gets on the profile and in the export. */
export const CARD_LABELS: Record<CardKind, string> = {
  seat: "A seat you wrote",
  own: "A human need of your own",
  decide: "What a circle decides",
  quest: "A quest you wrote",
};

/** Whether a human need key is one of the ten, for the views that colour by need. */
export function isPlatformNeed(key: string): boolean {
  return !!humanNeedById(key);
}
