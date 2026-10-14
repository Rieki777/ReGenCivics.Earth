/**
 * Small pure reads the Week 3 stages share: which card a prompt's answer is
 * for, which rows are this person's, and the rows a view may count.
 *
 * Answer rows follow API_CONTRACT.md section 2: kind "answer", block = the
 * prompt's key, text = the option key or the words, projectId = the card the
 * person tapped (null for the room). A row painted before its save lands has a
 * negative id, and it is always this browser's own.
 */
import type { BoardPrompt, BoardStage } from "@shared/sessionBoard";
import { shownAnswerRows } from "@shared/humanNeeds";
import type { BoardItem, Mine, MyProject, SessionBoardData } from "../useSessionBoard";

/** The card this browser checked in with, or null (here to learn, or nothing picked yet). */
export function myCardId(myProject: MyProject): number | null {
  return myProject && myProject.kind === "project" ? myProject.cardId : null;
}

/** Where an answer to this prompt goes: room scope and anonymous prompts are never a project's. */
export function projectIdFor(p: Pick<BoardPrompt, "scope" | "anonymous">, myProject: MyProject): number | null {
  if (p.scope === "room" || p.anonymous) return null;
  return myCardId(myProject);
}

export function isMineRow(mine: Mine, id: number): boolean {
  return id < 0 || mine.itemIds.has(id);
}

const stamp = (i: { createdAt: Date | string | number; id: number }) => {
  const t = new Date(i.createdAt as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
};
const idRank = (id: number) => (id < 0 ? 1e15 - id : id);

/** Newest first; a painted row (negative id) counts as the newest. */
export function newestFirst<T extends { createdAt: Date | string | number; id: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => stamp(b) - stamp(a) || idRank(b.id) - idRank(a.id));
}

/** Oldest first, for "my seeds in the order I planted them". */
export function oldestFirst<T extends { createdAt: Date | string | number; id: number }>(rows: readonly T[]): T[] {
  return newestFirst(rows).reverse();
}

export function hiddenCardIds(board: Pick<SessionBoardData, "projects">): number[] {
  return board.projects.filter((p) => p.hidden).map((p) => p.id);
}

/** The rows every view reads: no hidden row, nothing on a hidden card (a facilitator's read has both). */
export function shownRows(board: Pick<SessionBoardData, "items" | "projects">): BoardItem[] {
  return shownAnswerRows(board.items, hiddenCardIds(board));
}

/** Answer rows for one key and one card (null = the room). */
export function answerRows(items: readonly BoardItem[], key: string, projectId: number | null): BoardItem[] {
  return items.filter((i) => i.kind === "answer" && i.block === key && (i.projectId ?? null) === projectId);
}

/** This person's answer rows for one key and one card. */
export function myAnswerRows(items: readonly BoardItem[], mine: Mine, key: string, projectId: number | null): BoardItem[] {
  return answerRows(items, key, projectId).filter((i) => isMineRow(mine, i.id));
}

/** The name of a card on this board, or the words for the room. */
export function cardName(board: Pick<SessionBoardData, "projects">, id: number | null, room: string): string {
  if (id == null) return room;
  return board.projects.find((p) => p.id === id)?.name ?? room;
}

/** The index of a week's first stage of a kind (and step), or -1. */
export function stageIndexOf(stages: readonly BoardStage[], kind: BoardStage["kind"], step?: BoardStage["step"]): number {
  return stages.findIndex((s) => s.kind === kind && (step == null || s.step === step));
}
