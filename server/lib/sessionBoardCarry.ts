/**
 * Carrying a project's answers from earlier weeks' boards (Week 4 on), the
 * database side of shared/boardCarry.ts.
 *
 * - `readCarry`: for every card on a week's board, which earlier cards it
 *   carries from, and their answer rows; plus the questions still open from
 *   the week before. Public, like the board itself: every row it returns is
 *   already on an earlier board's public read. No author key leaves here.
 * - `carryLinkOnCheckIn`: the link a check-in records, inside the check-in's
 *   own transaction (the one that locks the board row).
 * - `earlierCardsFor`: the earlier cards one person checked in with or
 *   answered for, newest week first, for "Last week you were with X".
 *
 * Earlier boards are only ever read here, never written.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../../drizzle/schema";
import {
  FIRST_BOARD_WEEK,
  anonymousKeys,
  foldProjectName,
  normalizeBoardState,
  promptsForWeek,
  type BoardState,
} from "@shared/sessionBoard";
import {
  matchCard,
  type CardCarry,
  type CardRef,
  type CarriedAsk,
  type CarriedRow,
  type CarryData,
  type CarryLink,
  type EarlierCard,
} from "@shared/boardCarry";
import type { Db } from "./sessionBoard";
import type { Tx } from "./sessionBoardAnswers";

/** The earlier weeks whose boards asked prompts, newest first: Week 4 reads Week 3. */
export function earlierAnswerWeeks(week: number): number[] {
  const out: number[] = [];
  for (let w = week - 1; w >= FIRST_BOARD_WEEK; w--) if (promptsForWeek(w).size > 0) out.push(w);
  return out;
}

type BoardRow = { id: number; week: number; state: string | null; version?: number };
type CardRow = { id: number; boardId: number; name: string; applicationId: number | null; hidden: number };

async function boardsFor(db: Db | Tx, season: string, weeks: readonly number[]): Promise<BoardRow[]> {
  if (!weeks.length) return [];
  return db
    .select({ id: sessionBoards.id, week: sessionBoards.week, state: sessionBoards.state, version: sessionBoards.version })
    .from(sessionBoards)
    .where(and(eq(sessionBoards.season, season), inArray(sessionBoards.week, [...weeks])));
}

async function cardsOn(db: Db | Tx, boardIds: readonly number[]): Promise<CardRow[]> {
  if (!boardIds.length) return [];
  return db
    .select({
      id: sessionBoardProjects.id,
      boardId: sessionBoardProjects.boardId,
      name: sessionBoardProjects.name,
      applicationId: sessionBoardProjects.applicationId,
      hidden: sessionBoardProjects.hidden,
    })
    .from(sessionBoardProjects)
    .where(inArray(sessionBoardProjects.boardId, [...boardIds]))
    .orderBy(asc(sessionBoardProjects.id));
}

function linksOf(board: BoardRow | undefined): Record<string, CarryLink> {
  if (!board) return {};
  return normalizeBoardState(board.state ?? null, board.week).carry;
}

/* ------------------------------------------------- the 15 second cache */

const CACHE_MS = 15_000;
type EarlierRead = { at: number; boards: BoardRow[]; cards: EarlierCard[]; rows: CarriedRow[]; asks: CarriedAsk[] };
const cache = new Map<string, EarlierRead>();

/**
 * Whole answers, shared: every open page asks for the carry when its board's
 * version moves, so a room of thirty asks at once. One read per board version
 * (and per earlier-week read) serves them all, and a read in flight is shared.
 */
const results = new Map<string, { key: string; at: number; data: Promise<CarryData> }>();

/** Tests drop the cached earlier-week reads. */
export function clearCarryCache(): void {
  cache.clear();
  results.clear();
}

/**
 * Every earlier answer week's boards, cards, shown answer rows and open
 * questions. Earlier boards change rarely (people going at their own pace), so
 * the read is cached for 15 seconds per week.
 */
async function readEarlier(db: Db, season: string, week: number): Promise<EarlierRead> {
  const key = `${season}|${week}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  const weeks = earlierAnswerWeeks(week);
  const boards = await boardsFor(db, season, weeks);
  const weekOf = new Map(boards.map((b) => [b.id, b.week]));
  const cardRows = await cardsOn(db, boards.map((b) => b.id));
  const cards: EarlierCard[] = cardRows.map((c) => ({
    id: c.id, week: weekOf.get(c.boardId) ?? 0, name: c.name, applicationId: c.applicationId, hidden: !!c.hidden,
  }));
  const hiddenCards = new Set(cards.filter((c) => c.hidden).map((c) => c.id));
  const nameOf = new Map(cards.map((c) => [c.id, c.name]));
  const items = boards.length
    ? await db
      .select({
        id: sessionBoardItems.id,
        boardId: sessionBoardItems.boardId,
        kind: sessionBoardItems.kind,
        block: sessionBoardItems.block,
        text: sessionBoardItems.text,
        projectId: sessionBoardItems.projectId,
        chosen: sessionBoardItems.chosen,
        hidden: sessionBoardItems.hidden,
        createdAt: sessionBoardItems.createdAt,
      })
      .from(sessionBoardItems)
      .where(and(
        inArray(sessionBoardItems.boardId, boards.map((b) => b.id)),
        inArray(sessionBoardItems.kind, ["answer", "ask"]),
        eq(sessionBoardItems.hidden, 0),
      ))
      .orderBy(asc(sessionBoardItems.id))
    : [];
  const rows: CarriedRow[] = [];
  const asks: CarriedAsk[] = [];
  const newest = weeks[0];
  for (const i of items) {
    const w = weekOf.get(i.boardId) ?? 0;
    if (i.projectId != null && hiddenCards.has(i.projectId)) continue;
    if (i.kind === "answer") {
      // Anonymous answers never leave their board as rows, and room answers belong to nobody.
      if (i.projectId == null || !i.block || anonymousKeys(w).has(i.block)) continue;
      rows.push({ id: i.id, kind: "answer", block: i.block, text: i.text, projectId: i.projectId, createdAt: i.createdAt, week: w });
    } else if (i.kind === "ask" && !i.chosen && w === newest) {
      asks.push({ id: i.id, week: w, text: i.text, project: i.projectId != null ? nameOf.get(i.projectId) ?? null : null, createdAt: i.createdAt });
    }
  }
  const fresh: EarlierRead = { at: Date.now(), boards, cards, rows, asks };
  cache.set(key, fresh);
  return fresh;
}

/**
 * The earlier cards one card carries from, following each linked card back
 * to its own week's links (a Week 5 card carried from Week 4's card also
 * carries what that card carried from Week 3).
 */
function resolveCard(
  card: { id: number; name: string; applicationId: number | null },
  week: number,
  linksByWeek: Map<number, Record<string, CarryLink>>,
  earlier: readonly EarlierCard[],
): Omit<CardCarry, "cardId"> {
  const before = earlier.filter((c) => c.week < week);
  const direct = matchCard(card, before, linksByWeek.get(week)?.[String(card.id)]);
  if (!direct.from.length) return direct;
  const seen = new Map<number, CardRef>(direct.from.map((f) => [f.cardId, f]));
  const queue = [...direct.from];
  while (queue.length) {
    const ref = queue.shift()!;
    const src = earlier.find((c) => c.id === ref.cardId);
    if (!src) continue;
    const back = matchCard(src, earlier.filter((c) => c.week < ref.week), linksByWeek.get(ref.week)?.[String(src.id)]);
    for (const f of back.from) {
      if (seen.has(f.cardId)) continue;
      seen.set(f.cardId, f);
      queue.push(f);
    }
  }
  return { ...direct, from: [...seen.values()].sort((a, b) => b.week - a.week || a.cardId - b.cardId) };
}

/** What every card on a week's board carries from earlier weeks (API: `sessionBoard.carry`). */
export async function readCarry(db: Db, season: string, week: number): Promise<CarryData> {
  const fromWeeks = earlierAnswerWeeks(week);
  if (!fromWeeks.length) return { fromWeeks, cards: [], rows: [], asks: [] };
  const [board] = await boardsFor(db, season, [week]);
  // No board yet: nothing carries, and the earlier boards are never read for it.
  if (!board) return { fromWeeks, cards: [], rows: [], asks: [] };
  const hit = cache.get(`${season}|${week}`);
  const key = `${board.version ?? 0}|${hit && Date.now() - hit.at < CACHE_MS ? hit.at : "fresh"}`;
  const memo = results.get(`${season}|${week}`);
  if (memo && memo.key === key && Date.now() - memo.at < CACHE_MS) return memo.data;
  const data = computeCarry(db, season, week, board, fromWeeks);
  results.set(`${season}|${week}`, { key, at: Date.now(), data });
  data.catch(() => results.delete(`${season}|${week}`));
  return data;
}

async function computeCarry(db: Db, season: string, week: number, board: BoardRow, fromWeeks: number[]): Promise<CarryData> {
  const cards = (await cardsOn(db, [board.id])).filter((c) => !c.hidden);
  if (!cards.length) return { fromWeeks, cards: [], rows: [], asks: [] };
  const earlier = await readEarlier(db, season, week);
  const linksByWeek = new Map<number, Record<string, CarryLink>>(earlier.boards.map((b) => [b.week, linksOf(b)]));
  linksByWeek.set(week, linksOf(board));
  const out: CardCarry[] = cards.map((c) => ({ cardId: c.id, ...resolveCard(c, week, linksByWeek, earlier.cards) }));
  const used = new Set(out.flatMap((c) => c.from.map((f) => f.cardId)));
  return {
    fromWeeks,
    cards: out,
    rows: earlier.rows.filter((r) => r.projectId != null && used.has(r.projectId)),
    asks: earlier.asks,
  };
}

/**
 * The link a check-in records for the card it lands on, or null. Called
 * inside the check-in's transaction, after the board row is locked.
 *
 * - From an earlier week's tile, when this check-in made the card from it:
 *   that very card ("tile"). Tapping an earlier tile that lands on a card
 *   already here records nothing by itself: anyone can add a card with any
 *   name, so a name alone stays a suggestion for the facilitator.
 * - Otherwise, when the card has no application tie to an earlier card: the
 *   one earlier card with the same name ("person"), when there is exactly one
 *   such card and this person checked in with it or answered for it.
 * Two cards tied to different applications are never linked. A card that
 * already has a link keeps it.
 */
export async function carryLinkOnCheckIn(
  tx: Tx,
  opts: {
    season: string;
    week: number;
    state: BoardState;
    card: { id: number; name: string; applicationId: number | null };
    keys: string[];
    /** The earlier card the tile pointed at, only when this check-in created the card from it. */
    earlierTile: { id: number; week: number; applicationId: number | null } | null;
  },
): Promise<CarryLink | null> {
  const { season, week, state, card, keys, earlierTile } = opts;
  const weeks = earlierAnswerWeeks(week);
  if (!weeks.length || state.carry[String(card.id)]) return null;
  const otherApp = (app: number | null) => app != null && card.applicationId != null && app !== card.applicationId;
  if (earlierTile) {
    if (!weeks.includes(earlierTile.week) || otherApp(earlierTile.applicationId)) return null;
    if (card.applicationId != null && card.applicationId === earlierTile.applicationId) return null;
    return { from: earlierTile.id, by: "tile" };
  }
  if (!keys.length) return null;
  const boards = await boardsFor(tx, season, weeks);
  const cards = (await cardsOn(tx, boards.map((b) => b.id))).filter((c) => !c.hidden);
  if (card.applicationId != null && cards.some((c) => c.applicationId === card.applicationId)) return null;
  const folded = foldProjectName(card.name);
  const named = cards.filter((c) => folded && foldProjectName(c.name) === folded && !otherApp(c.applicationId));
  // Two earlier cards by this name: the facilitator picks, never the person.
  if (named.length !== 1) return null;
  const mine = await playedFor(tx, named.map((c) => c.id), boards.map((b) => b.id), keys);
  return mine.has(named[0].id) ? { from: named[0].id, by: "person" } : null;
}

/** Of these cards, the ones this person checked in with or answered for. */
async function playedFor(db: Db | Tx, cardIds: readonly number[], boardIds: readonly number[], keys: readonly string[]): Promise<Set<number>> {
  const out = new Set<number>();
  if (!cardIds.length || !keys.length || !boardIds.length) return out;
  const [votes, answers] = await Promise.all([
    db
      .select({ target: sessionBoardVotes.target })
      .from(sessionBoardVotes)
      .where(and(
        inArray(sessionBoardVotes.boardId, [...boardIds]),
        inArray(sessionBoardVotes.target, cardIds.map((id) => `checkin:${id}`)),
        inArray(sessionBoardVotes.voterKey, [...keys]),
      )),
    db
      .select({ projectId: sessionBoardItems.projectId })
      .from(sessionBoardItems)
      .where(and(
        inArray(sessionBoardItems.boardId, [...boardIds]),
        inArray(sessionBoardItems.projectId, [...cardIds]),
        inArray(sessionBoardItems.authorKey, [...keys]),
      ))
      .groupBy(sessionBoardItems.projectId),
  ]);
  for (const v of votes) out.add(Number(v.target.slice("checkin:".length)));
  for (const a of answers) if (a.projectId != null) out.add(a.projectId);
  return out;
}

/**
 * The earlier answer weeks' cards this person checked in with or answered
 * for, newest week first and, within a week, most recent first: what "Last
 * week you were with X" offers on a new device.
 */
export async function earlierCardsFor(db: Db, season: string, week: number, keys: readonly string[]): Promise<CardRef[]> {
  const weeks = earlierAnswerWeeks(week);
  if (!weeks.length || !keys.length) return [];
  const boards = await boardsFor(db, season, weeks);
  if (!boards.length) return [];
  const weekOf = new Map(boards.map((b) => [b.id, b.week]));
  const boardIds = boards.map((b) => b.id);
  const [votes, answers, cards] = await Promise.all([
    db
      .select({ target: sessionBoardVotes.target, id: sessionBoardVotes.id })
      .from(sessionBoardVotes)
      .where(and(inArray(sessionBoardVotes.boardId, boardIds), inArray(sessionBoardVotes.voterKey, [...keys]), sql`${sessionBoardVotes.target} LIKE 'checkin:%'`)),
    db
      .select({ projectId: sessionBoardItems.projectId, at: sql<number>`MAX(${sessionBoardItems.id})` })
      .from(sessionBoardItems)
      .where(and(inArray(sessionBoardItems.boardId, boardIds), inArray(sessionBoardItems.authorKey, [...keys])))
      .groupBy(sessionBoardItems.projectId),
    cardsOn(db, boardIds),
  ]);
  const rank = new Map<number, number>();
  for (const v of votes) {
    const id = Number(v.target.slice("checkin:".length));
    rank.set(id, Math.max(rank.get(id) ?? 0, v.id));
  }
  for (const a of answers) if (a.projectId != null) rank.set(a.projectId, Math.max(rank.get(a.projectId) ?? 0, Number(a.at)));
  return cards
    .filter((c) => !c.hidden && rank.has(c.id))
    .map((c) => ({ week: weekOf.get(c.boardId) ?? 0, cardId: c.id, name: c.name, at: rank.get(c.id) ?? 0 }))
    .sort((a, b) => b.week - a.week || b.at - a.at)
    .map(({ at: _at, ...ref }) => ref);
}

/** An earlier answer week's unhidden card, for a facilitator's confirm. Null when it isn't one. */
export async function earlierCardFor(db: Db, season: string, week: number, cardId: number): Promise<EarlierCard | null> {
  const weeks = earlierAnswerWeeks(week);
  const boards = await boardsFor(db, season, weeks);
  const [card] = (await cardsOn(db, boards.map((b) => b.id))).filter((c) => c.id === cardId && !c.hidden);
  if (!card) return null;
  return { id: card.id, week: boards.find((b) => b.id === card.boardId)?.week ?? 0, name: card.name, applicationId: card.applicationId, hidden: false };
}
