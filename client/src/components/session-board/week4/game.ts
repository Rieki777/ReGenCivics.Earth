/**
 * What the Week 4 stages read: each card's answers with its earlier weeks'
 * answers brought forward (shared/boardCarry.ts), as one project's Game.
 *
 * A carried row is never this person's to change: it lives on an earlier
 * week's board. A change today writes a row on this board, and for that key
 * it replaces last week's (one key at a time).
 */
import { useMemo } from "react";
import { isCarried, withCarried, type CardCarry, type CarriedRow } from "@shared/boardCarry";
import { cardKindOfKey, cardsOf, freeSlot, ownNeedLabels, type CardKind } from "@shared/boardCards";
import { HUMAN_NEED_IDS, projectView, type AnswerRow, type HumanNeedId, type ProjectView } from "@shared/humanNeeds";
import { cardsForProject, type ProjectCards } from "@shared/villageOsCard";
import type { BoardItem, Mine } from "../useSessionBoard";
import type { StageProps } from "../stages";
import { myCardId, shownRows } from "../week3/answers";

export type GameRow = BoardItem | (CarriedRow & { carried: true });

/** Every row the views read on this board, with each card's carried rows merged in. */
export function useGameRows(props: Pick<StageProps, "board" | "carry">): GameRow[] {
  const { board, carry } = props;
  return useMemo(() => withCarried(shownRows(board) as BoardItem[], carry.data) as GameRow[], [board, carry.data]);
}

export type Game = {
  cardId: number | null;
  view: ProjectView;
  cards: ProjectCards;
  /** The project's own human needs, by key ("custom:spiritual-practice" to its name). */
  own: Map<string, string>;
  /** Its human needs in the order the stages walk them: seeds first, then the rest, then its own. */
  needOrder: string[];
  link: CardCarry | null;
};

/** One project's Game from the merged rows. */
export function gameOf(rows: readonly GameRow[], cardId: number | null, link: CardCarry | null): Game {
  const view = projectView(rows as readonly AnswerRow[], cardId);
  const cards = cardsForProject(rows, cardId);
  const own = ownNeedLabels(cards.own);
  const seeds = view.seeds as string[];
  const rest = view.needs.map((n) => n.id as string).filter((id) => !seeds.includes(id));
  return { cardId, view, cards, own, needOrder: [...seeds, ...rest, ...own.keys()], link };
}

/** The Game of the card this person tapped (null card: the room's answers). */
export function useMyGame(props: StageProps): { rows: GameRow[]; game: Game } {
  const rows = useGameRows(props);
  const cardId = myCardId(props.myProject);
  const link = cardId != null ? props.carry.data?.cards.find((c) => c.cardId === cardId) ?? null : null;
  const game = useMemo(() => gameOf(rows, cardId, link), [rows, cardId, link]);
  return { rows, game };
}

/**
 * Last week's answer for a key on this card, when nobody has answered it
 * today: the value to show as "Last week: ...". Null when today has an
 * answer, or last week had none.
 */
export function lastWeekValue(rows: readonly GameRow[], key: string, cardId: number | null): string | null {
  if (cardId == null) return null;
  const forKey = rows.filter((r) => r.kind === "answer" && r.block === key && (r.projectId ?? null) === cardId);
  if (!forKey.length || !forKey.every((r) => isCarried(r))) return null;
  return [...forKey].sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())[0]?.text ?? null;
}

/** Whether every row this card has for a key came forward from an earlier week. */
export function onlyCarried(rows: readonly GameRow[], key: string, cardId: number | null): boolean {
  if (cardId == null) return false;
  const forKey = rows.filter((r) => r.kind === "answer" && r.block === key && (r.projectId ?? null) === cardId);
  return forKey.length > 0 && forKey.every((r) => isCarried(r));
}

/** The slot keys of a card kind this person already uses on this card. */
export function mySlotKeys(items: readonly BoardItem[], mine: Mine, kind: CardKind, cardId: number | null): string[] {
  return items
    .filter((i) => i.kind === "answer" && (i.projectId ?? null) === cardId && (i.id < 0 || mine.itemIds.has(i.id)) && cardKindOfKey(i.block) === kind)
    .map((i) => i.block as string);
}

/** The next free slot for a new card of this kind, or null when every slot is used. */
export function nextSlot(items: readonly BoardItem[], mine: Mine, kind: CardKind, cardId: number | null): string | null {
  return freeSlot(kind, mySlotKeys(items, mine, kind, cardId));
}

/** Whether a card row on this board is this person's to change. */
export function isMyCard(mine: Mine, rowId: number): boolean {
  return rowId < 0 || mine.itemIds.has(rowId);
}

/** Every card of a kind on one card, today's only (cards are a Week 4 answer). */
export function todaysCards<K extends CardKind>(items: readonly BoardItem[], kind: K, cardId: number | null) {
  return cardsOf(items, kind, cardId);
}

/** The ten in the deck's order, for a need select. */
export const NEED_IDS: readonly HumanNeedId[] = HUMAN_NEED_IDS;
