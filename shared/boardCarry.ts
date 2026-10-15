/**
 * Carrying a project's answers from one week's board to the next (Week 4 on).
 *
 * Rye, 2026-10-14: each episode builds on the one before. Week 3 named the
 * human needs each project is here to meet, its circles and its way of
 * deciding; Week 4 builds its Game in Village OS from those answers, and the
 * whole Season ends in launching each project's Village OS from what the
 * episodes uncovered. So a later week's board reads the earlier weeks' answers
 * for the same project, and a project's card on any week is the sum of them.
 *
 * WHICH EARLIER CARD IS THE SAME PROJECT, in this order:
 *   1. application: the two cards share a Season 2 application.
 *   2. a recorded link in the later board's state (`BoardState.carry`):
 *      - "tile": someone checked in from the earlier week's tile, so the card
 *        was carried from that very card;
 *      - "person": the person checking in played for a card with the same
 *        name on the earlier week (their own check-in or answers there);
 *      - "facilitator": a facilitator confirmed a match found only by name.
 *   3. suggested: an earlier card with the same name and nothing else tying
 *      them. It carries nothing until a facilitator confirms it, because anyone
 *      can add a card with any name.
 *   A facilitator can also say "not this one" (a link from 0), which stops the
 *   suggestion and carries nothing.
 *
 * HOW ANSWERS MERGE. For each prompt key, a later week's rows for the project
 * replace an earlier week's rows for that key; a key nobody answered later
 * comes forward as it was. Earlier boards are never written to, so each stays
 * the record of what was said that day.
 *
 * Pure: the server reads the rows (server/lib/sessionBoardCarry.ts), the page
 * and the export merge them with these functions.
 */
import { foldProjectName } from "./sessionBoard";
import type { AnswerRow } from "./humanNeeds";

export type CarryBy = "tile" | "person" | "facilitator";

/** A recorded link from a card on this board to a card on an earlier week's board. `from` 0 means "not this one". */
export type CarryLink = { from: number; by: CarryBy };

export type CarryMatch = "application" | "carried" | "yours" | "confirmed" | "suggested" | "declined" | "none";

/** An earlier week's card, as the matcher needs it. Its author key never leaves the server. */
export type EarlierCard = { id: number; week: number; name: string; applicationId: number | null; hidden?: boolean };

export type CardRef = { week: number; cardId: number; name: string };

/** What the page gets for one card on this board. */
export type CardCarry = {
  cardId: number;
  match: CarryMatch;
  /** The earlier cards whose answers come forward (several when one project had a card on each week). */
  from: CardRef[];
  /** A same-name card waiting for a facilitator's yes. Carries nothing until then. */
  suggested: CardRef[];
};

/** An earlier week's answer row; `projectId` is the earlier card. */
export type CarriedRow = AnswerRow & { week: number };

/** A question from an earlier week still not marked Answered. */
export type CarriedAsk = { id: number; week: number; text: string; project: string | null; createdAt: Date | string | number };

/** Everything the `carry` read returns for a board. */
export type CarryData = {
  /** The earlier weeks read, newest first. */
  fromWeeks: number[];
  cards: CardCarry[];
  rows: CarriedRow[];
  asks: CarriedAsk[];
};

export const CARRY_BY_MATCH: Record<CarryBy, CarryMatch> = { tile: "carried", person: "yours", facilitator: "confirmed" };

const refOf = (c: EarlierCard): CardRef => ({ week: c.week, cardId: c.id, name: c.name });

/**
 * Which earlier cards one card on this board carries from. `earlier` holds the
 * cards of every earlier week read; `link` is this card's recorded link, if
 * any. Hidden earlier cards never carry and are never suggested.
 */
export function matchCard(
  card: { id: number; name: string; applicationId: number | null },
  earlier: readonly EarlierCard[],
  link: CarryLink | undefined,
): Omit<CardCarry, "cardId"> {
  const shown = earlier.filter((c) => !c.hidden);
  if (card.applicationId != null) {
    const byApp = shown.filter((c) => c.applicationId === card.applicationId);
    if (byApp.length) {
      // A card someone tapped or a facilitator confirmed comes too, even with no application of its own.
      const linked = link && link.from > 0 ? shown.find((c) => c.id === link.from && !byApp.includes(c)) : undefined;
      return { match: "application", from: [...byApp, ...(linked ? [linked] : [])].map(refOf), suggested: [] };
    }
  }
  if (link && link.from > 0) {
    const linked = shown.find((c) => c.id === link.from);
    if (linked) {
      // The linked card's own application ties the project's other weeks in too.
      const kin = linked.applicationId != null ? shown.filter((c) => c.applicationId === linked.applicationId && c.id !== linked.id) : [];
      return { match: CARRY_BY_MATCH[link.by], from: [linked, ...kin].map(refOf), suggested: [] };
    }
  }
  if (link && link.from === 0) return { match: "declined", from: [], suggested: [] };
  const folded = foldProjectName(card.name);
  const named = folded ? shown.filter((c) => foldProjectName(c.name) === folded) : [];
  if (named.length) return { match: "suggested", from: [], suggested: named.map(refOf) };
  return { match: "none", from: [], suggested: [] };
}

/** The earlier card ids a card carries from, per the carry read. */
export function carriedFrom(carry: Pick<CarryData, "cards"> | null | undefined, cardId: number | null): Set<number> {
  if (!carry || cardId == null) return new Set();
  const c = carry.cards.find((x) => x.cardId === cardId);
  return new Set((c?.from ?? []).map((f) => f.cardId));
}

/**
 * One project's rows with its earlier weeks' rows brought forward: for each
 * key, the latest week with any row for it wins. Carried rows come back on
 * `cardId`, marked with their week, so a view can say "From Week 3".
 *
 * The human needs move as one group: once today has picked the project's
 * human needs, that set is the set, and a carried seed or per-need answer
 * (today, goal, who it's for, who meets it, which circles) on a human need
 * not in today's set stays behind. A seed counts as a pick, so without this
 * a seed from last week would put back a human need the project took off.
 */
export function mergeCarried<T extends AnswerRow>(
  current: readonly T[],
  carried: readonly CarriedRow[],
  cardId: number,
  fromIds: ReadonlySet<number>,
): (T | (CarriedRow & { carried: true }))[] {
  const mine = current.filter((r) => r.kind === "answer" && (r.projectId ?? null) === cardId && !r.hidden);
  const taken = new Set(mine.map((r) => r.block ?? ""));
  const todayNeeds = taken.has("needs") ? new Set(mine.filter((r) => r.block === "needs").map((r) => r.text)) : null;
  const earlier = carried
    .filter((r) => r.kind === "answer" && r.projectId != null && fromIds.has(r.projectId) && !r.hidden && r.block)
    .sort((a, b) => b.week - a.week);
  const out: (T | (CarriedRow & { carried: true }))[] = [...mine];
  const weekOfKey = new Map<string, number>();
  for (const r of earlier) {
    const key = r.block as string;
    if (taken.has(key)) continue;
    if (todayNeeds) {
      if (key === "top" && !todayNeeds.has(r.text)) continue;
      const per = /^[ngbmc]-([a-z]+)$/.exec(key);
      if (per && !todayNeeds.has(per[1])) continue;
    }
    const w = weekOfKey.get(key);
    if (w != null && w !== r.week) continue; // a later week already holds this key
    weekOfKey.set(key, r.week);
    out.push({ ...r, projectId: cardId, carried: true });
  }
  return out;
}

/**
 * One project's answers from several weeks, merged with no board at hand:
 * pass each week's rows for the project (any card ids) and get one set of
 * rows on `cardId`, the latest week winning each key, the human needs moving
 * as one group (the same rule as `mergeCarried`). For readers that gather a
 * project's weeks themselves, such as its Village OS profile.
 */
export function mergeProjectWeeks(weeks: readonly { week: number; rows: readonly AnswerRow[] }[], cardId: number): (AnswerRow | (CarriedRow & { carried: true }))[] {
  if (!weeks.length) return [];
  const [latest, ...earlier] = [...weeks].sort((a, b) => b.week - a.week);
  const current = latest.rows.filter((r) => r.kind === "answer").map((r) => ({ ...r, projectId: cardId }));
  const carried: CarriedRow[] = earlier.flatMap((w) => w.rows.filter((r) => r.kind === "answer").map((r) => ({ ...r, projectId: cardId, week: w.week })));
  return mergeCarried(current, carried, cardId, new Set([cardId]));
}

/**
 * Every row a room view reads: this board's rows, plus each card's carried
 * rows merged the same way. Rows for the room (no card) never carry.
 */
export function withCarried<T extends AnswerRow>(rows: readonly T[], carry: CarryData | null | undefined): (T | (CarriedRow & { carried: true }))[] {
  if (!carry || !carry.cards.length) return [...rows];
  const carrying = new Set(carry.cards.filter((c) => c.from.length).map((c) => c.cardId));
  // A carrying card's answers come back through mergeCarried; everything else passes as it is.
  const out: (T | (CarriedRow & { carried: true }))[] = rows.filter((r) => !(r.kind === "answer" && r.projectId != null && carrying.has(r.projectId)));
  for (const c of carry.cards) {
    if (!c.from.length) continue;
    out.push(...mergeCarried(rows, carry.rows, c.cardId, new Set(c.from.map((f) => f.cardId))));
  }
  return out;
}

/** Whether a row came forward from an earlier week. */
export function isCarried(row: object): row is CarriedRow & { carried: true } {
  return (row as { carried?: unknown }).carried === true;
}

/**
 * The options a person's first change on a many-answer key copies across.
 * A change replaces last week's answer for that key, so the first tap on a
 * key the project has only from last week copies last week's picks as this
 * person's, minus the one they're taking off. Returns the options to add (in
 * last week's order) or [] when nothing needs copying.
 */
export function firstChangeCopy(
  merged: readonly (AnswerRow | (CarriedRow & { carried: true }))[],
  key: string,
  cardId: number,
  change: { option: string; on: boolean },
): string[] {
  const rows = merged.filter((r) => r.kind === "answer" && r.block === key && (r.projectId ?? null) === cardId);
  if (!rows.length || !rows.every((r) => isCarried(r))) return [];
  const seen: string[] = [];
  for (const r of rows) if (!seen.includes(r.text)) seen.push(r.text);
  return seen.filter((o) => change.on || o !== change.option);
}

/** The words for where a card's earlier answers came from. */
export const CARRY_COPY = {
  found: {
    application: "From Week {week}, linked by your application.",
    carried: "From Week {week}: the card you checked in with.",
    yours: "From Week {week}: the card you answered for.",
    confirmed: "From Week {week}, confirmed by the facilitator.",
  },
  suggested: "We found a Week {week} card named {name}. The facilitator will confirm it's yours.",
  declined: "Nothing carries from earlier weeks for this card.",
  none: "No Week {week} card for this project yet. Today's stages ask it all fresh, and Week {week}'s board stays open if you want to go back.",
  noProject: "Tap your project to see what it said last week.",
  noProjectHere: "Tap your project to add to its card.",
  learn: "You're here to learn today. Tap a project any time to see its card.",
  fromWeek: "From Week {week}",
  lastWeek: "Last week: {value}",
  gaps: "Not answered yet",
  gapsNone: "Every part of the card has an answer.",
  goTo: "Answer it on {stage}",
  moveLast: "Last week's move",
  openAsks: "Still open from Week {week}",
  openAsksNone: "Every question from Week {week} has an answer.",
  confirmAsk: "Is this the same project as {name} on Week {week}?",
  confirmYes: "Yes, same project",
  confirmNo: "No, a different one",
  confirmed: "Linked. Its Week {week} answers come forward.",
  declinedDone: "Noted. Nothing carries for this card.",
  undo: "Undo",
  linkedTitle: "Cards carrying an earlier week's answers",
  linkedLine: "{name} carries {from} from Week {week}.",
  linkedNone: "{name} carries nothing from earlier weeks.",
  unlink: "Not the same project",
  linkAgain: "Look for a match again",
  sameToday: "Last week you were with {name}. Same today?",
  sameTodayEarlier: "In Week {week} you were with {name}. Same today?",
  sameYes: "Yes, {name}",
  sameNo: "Another project",
  loading: "Reading last week's answers...",
  loadFailed: "Last week's answers didn't load.",
  retry: "Try again",
} as const;
