/**
 * Carrying a project's answers from earlier weeks' boards (Week 4 on), the
 * database side of shared/boardCarry.ts.
 *
 * - `readCarry`: for every card on a week's board, which earlier cards it
 *   carries from, and their answer rows; plus every question from the week
 *   before, with its Answered, even before the week has a board or a card. Public,
 *   like the board itself: every row it returns is already on an earlier
 *   board's public read. No author key leaves here.
 * - `carryLinkOnCheckIn`: the link a check-in records, inside the check-in's
 *   own transaction (the one that locks the board row).
 * - `assertCarryConfirmable`: what a facilitator's "same project" checks first.
 * - `earlierCardsFor`: the earlier cards one person checked in with or
 *   answered for, newest week first, for "Last week you were with X".
 *
 * One earlier card is carried by one card here. Once a card here carries it,
 * no check-in links it to a second card, it is no suggestion for one, and a
 * facilitator can't confirm one: two cards for one project get merged.
 *
 * Earlier boards are only ever read here, never written.
 */
import { TRPCError } from "@trpc/server";
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
  boardStages,
  fillCopy,
  foldProjectName,
  normalizeBoardState,
  promptsForWeek,
  sessionClosedAt,
  sessionMinutes,
  type BoardState,
} from "@shared/sessionBoard";
import {
  CARRY_COPY,
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

/** Every week's recorded links: the earlier boards', and this week's `links`. */
function linksByWeekOf(boards: readonly BoardRow[], week: number, links: Record<string, CarryLink>): Map<number, Record<string, CarryLink>> {
  const out = new Map<number, Record<string, CarryLink>>(boards.map((b) => [b.week, linksOf(b)]));
  out.set(week, links);
  return out;
}

/** The unhidden cards on these earlier boards, as the matcher reads them. */
async function shownEarlier(db: Db | Tx, boards: readonly BoardRow[]): Promise<EarlierCard[]> {
  const weekOf = new Map(boards.map((b) => [b.id, b.week]));
  return (await cardsOn(db, boards.map((b) => b.id)))
    .filter((c) => !c.hidden)
    .map((c) => ({ id: c.id, week: weekOf.get(c.boardId) ?? 0, name: c.name, applicationId: c.applicationId }));
}

/**
 * Which card here carries each earlier card, by the carry read's own rules
 * (application, recorded link, the linked card's application, back through
 * the weeks). Earlier card id to the first card that carries it.
 */
function carriersOf(
  cards: readonly { id: number; name: string; applicationId: number | null }[],
  week: number,
  linksByWeek: Map<number, Record<string, CarryLink>>,
  earlier: readonly EarlierCard[],
): Map<number, { cardId: number; name: string }> {
  const out = new Map<number, { cardId: number; name: string }>();
  for (const c of cards) {
    for (const f of resolveCard(c, week, linksByWeek, earlier).from) {
      if (!out.has(f.cardId)) out.set(f.cardId, { cardId: c.id, name: c.name });
    }
  }
  return out;
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
    } else if (i.kind === "ask" && w === newest) {
      // Answered ones too, so "Last week's questions" can show each one and its Answered.
      asks.push({ id: i.id, week: w, text: i.text, project: i.projectId != null ? nameOf.get(i.projectId) ?? null : null, createdAt: i.createdAt, chosen: !!i.chosen });
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
  // No board yet: no card carries, but the questions from the week before still show.
  if (!board) return { fromWeeks, cards: [], rows: [], asks: (await readEarlier(db, season, week)).asks };
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
  const earlier = await readEarlier(db, season, week);
  // No card yet: the questions from the week before show all the same.
  if (!cards.length) return { fromWeeks, cards: [], rows: [], asks: earlier.asks };
  const linksByWeek = linksByWeekOf(earlier.boards, week, linksOf(board));
  const out: CardCarry[] = cards.map((c) => ({ cardId: c.id, ...resolveCard(c, week, linksByWeek, earlier.cards) }));
  const used = new Set(out.flatMap((c) => c.from.map((f) => f.cardId)));
  // A suggestion another card here already carries is no suggestion: the facilitator merges the two cards.
  const carrier = new Map<number, CardCarry>();
  for (const c of out) for (const f of c.from) if (!carrier.has(f.cardId)) carrier.set(f.cardId, c);
  const nameOf = new Map(cards.map((c) => [c.id, c.name]));
  // Each suggestion's answer count, so two cards with one name can be told apart. Only the count leaves.
  const answers = new Map<number, number>();
  for (const r of earlier.rows) if (r.projectId != null) answers.set(r.projectId, (answers.get(r.projectId) ?? 0) + 1);
  for (const c of out) {
    if (c.match !== "suggested") continue;
    const taken = c.suggested.filter((s) => carrier.has(s.cardId));
    c.suggested = c.suggested.filter((s) => !carrier.has(s.cardId)).map((s) => ({ ...s, answers: answers.get(s.cardId) ?? 0 }));
    if (c.suggested.length) continue;
    const by = carrier.get(taken[0].cardId)!;
    c.match = "none";
    c.carriedBy = { cardId: by.cardId, name: nameOf.get(by.cardId) ?? "", earlier: taken[0] };
  }
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
 *   that very card ("tile"), when it is the only unhidden card with its name
 *   on its week. Anyone can add a same-name card to an open earlier board and
 *   send a ref the page never offered, so with two by that name the
 *   facilitator picks. Tapping an earlier tile that lands on a card already
 *   here records nothing by itself: anyone can add a card with any name, so a
 *   name alone stays a suggestion for the facilitator.
 * - Otherwise, when the card has no application tie to an earlier card: the
 *   one earlier card with the same name ("person"), when there is exactly one
 *   such card and this person checked in with it or answered for it before
 *   that week's live session ended.
 * Two cards tied to different applications are never linked, and an earlier
 * card another card here (`others`) already carries is never linked again. A
 * card that already has a link keeps it.
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
    /** This board's other unhidden cards: an earlier card one of them carries is taken. */
    others?: readonly { id: number; name: string; applicationId: number | null }[];
  },
): Promise<CarryLink | null> {
  const { season, week, state, card, keys, earlierTile, others = [] } = opts;
  const weeks = earlierAnswerWeeks(week);
  if (!weeks.length || state.carry[String(card.id)]) return null;
  if (!earlierTile && !keys.length) return null;
  const otherApp = (app: number | null) => app != null && card.applicationId != null && app !== card.applicationId;
  if (earlierTile) {
    if (!weeks.includes(earlierTile.week) || otherApp(earlierTile.applicationId)) return null;
    if (card.applicationId != null && card.applicationId === earlierTile.applicationId) return null;
  }
  const boards = await boardsFor(tx, season, weeks);
  const earlier = await shownEarlier(tx, boards);
  const taken = carriersOf(others, week, linksByWeekOf(boards, week, state.carry), earlier);
  if (earlierTile) {
    const self = earlier.find((c) => c.id === earlierTile.id && c.week === earlierTile.week);
    const folded = self ? foldProjectName(self.name) : "";
    if (!self || !folded || taken.has(self.id)) return null;
    if (earlier.some((c) => c.id !== self.id && c.week === self.week && foldProjectName(c.name) === folded)) return null;
    return { from: self.id, by: "tile" };
  }
  if (card.applicationId != null && earlier.some((c) => c.applicationId === card.applicationId)) return null;
  const folded = foldProjectName(card.name);
  const named = folded ? earlier.filter((c) => foldProjectName(c.name) === folded && !otherApp(c.applicationId)) : [];
  // Two earlier cards by this name: the facilitator picks, never the person.
  // One another card here carries already: the facilitator merges the two.
  if (named.length !== 1 || taken.has(named[0].id)) return null;
  const mine = await playedFor(tx, [named[0].id], boards, keys);
  return mine.has(named[0].id) ? { from: named[0].id, by: "person" } : null;
}

/**
 * The room keeps going after End session: Week 3's people answered for about
 * 40 minutes after Rye pressed it (2026-10-14). Their play counts for two
 * hours after the close.
 */
const PLAY_GRACE_MS = 2 * 3_600_000;

/**
 * Until when, in server ms, what someone did on an earlier board counts as
 * playing for a card there: its live session's close plus PLAY_GRACE_MS. A
 * session still running counts everything, and one never started counts
 * nothing, because an earlier board stays open to anyone after its session
 * (ADR-76).
 */
function playedUntil(board: BoardRow, now: number): number {
  const s = normalizeBoardState(board.state ?? null, board.week);
  if (!s.sessionStartedAt) return 0;
  const closed = sessionClosedAt(s, sessionMinutes(s.plan, boardStages(board.week)) * 60_000, now);
  return closed == null ? Infinity : closed + PLAY_GRACE_MS;
}

/** Of these cards, the ones this person checked in with or answered for during their week's live session. */
async function playedFor(db: Db | Tx, cardIds: readonly number[], boards: readonly BoardRow[], keys: readonly string[]): Promise<Set<number>> {
  const out = new Set<number>();
  const now = Date.now();
  const until = new Map(boards.map((b) => [b.id, playedUntil(b, now)]));
  const boardIds = boards.filter((b) => (until.get(b.id) ?? 0) > 0).map((b) => b.id);
  if (!cardIds.length || !keys.length || !boardIds.length) return out;
  // Stored UTC seconds (UNIX_TIMESTAMP), never drizzle's parsed timestamp, which reads the database session's zone as UTC.
  const [votes, answers] = await Promise.all([
    db
      .select({ boardId: sessionBoardVotes.boardId, target: sessionBoardVotes.target, at: sql<number>`UNIX_TIMESTAMP(${sessionBoardVotes.createdAt})` })
      .from(sessionBoardVotes)
      .where(and(
        inArray(sessionBoardVotes.boardId, boardIds),
        inArray(sessionBoardVotes.target, cardIds.map((id) => `checkin:${id}`)),
        inArray(sessionBoardVotes.voterKey, [...keys]),
      )),
    db
      .select({ boardId: sessionBoardItems.boardId, projectId: sessionBoardItems.projectId, at: sql<number>`MIN(UNIX_TIMESTAMP(${sessionBoardItems.createdAt}))` })
      .from(sessionBoardItems)
      .where(and(
        inArray(sessionBoardItems.boardId, boardIds),
        inArray(sessionBoardItems.projectId, [...cardIds]),
        inArray(sessionBoardItems.authorKey, [...keys]),
      ))
      .groupBy(sessionBoardItems.boardId, sessionBoardItems.projectId),
  ]);
  const inSession = (boardId: number, at: unknown) => Number(at) * 1000 <= (until.get(boardId) ?? 0);
  for (const v of votes) if (inSession(v.boardId, v.at)) out.add(Number(v.target.slice("checkin:".length)));
  for (const a of answers) if (a.projectId != null && inSession(a.boardId, a.at)) out.add(a.projectId);
  return out;
}

/**
 * The earlier answer weeks' cards this person checked in with or answered
 * for, newest week first and, within a week, the one they last checked in
 * with or answered for first (by when each row was written, in stored UTC
 * seconds; a tie in one second keeps card order): what "Last week you were
 * with X" offers on a new device.
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
      .select({ target: sessionBoardVotes.target, at: sql<number>`UNIX_TIMESTAMP(${sessionBoardVotes.createdAt})` })
      .from(sessionBoardVotes)
      .where(and(inArray(sessionBoardVotes.boardId, boardIds), inArray(sessionBoardVotes.voterKey, [...keys]), sql`${sessionBoardVotes.target} LIKE 'checkin:%'`)),
    db
      .select({ projectId: sessionBoardItems.projectId, at: sql<number>`MAX(UNIX_TIMESTAMP(${sessionBoardItems.createdAt}))` })
      .from(sessionBoardItems)
      .where(and(inArray(sessionBoardItems.boardId, boardIds), inArray(sessionBoardItems.authorKey, [...keys])))
      .groupBy(sessionBoardItems.projectId),
    cardsOn(db, boardIds),
  ]);
  // One clock for both: check-ins and answers come from two id sequences that can't be compared.
  const rank = new Map<number, number>();
  for (const v of votes) {
    const id = Number(v.target.slice("checkin:".length));
    rank.set(id, Math.max(rank.get(id) ?? 0, Number(v.at)));
  }
  for (const a of answers) if (a.projectId != null) rank.set(a.projectId, Math.max(rank.get(a.projectId) ?? 0, Number(a.at)));
  return cards
    .filter((c) => !c.hidden && rank.has(c.id))
    .map((c) => ({ week: weekOf.get(c.boardId) ?? 0, cardId: c.id, name: c.name, at: rank.get(c.id) ?? 0 }))
    .sort((a, b) => b.week - a.week || b.at - a.at)
    .map(({ at: _at, ...ref }) => ref);
}

export const CONFIRM_REFUSALS = {
  notEarlier: "That card isn't on an earlier week's board.",
  otherApplication: "That card is linked to a different application. Fix the application link first.",
} as const;

/**
 * Before a facilitator's "same project" links a card here to an earlier card:
 * the earlier card is an unhidden card on an earlier answer week's board, the
 * two aren't tied to different applications (ADR-76), and no other card here
 * already carries it (CARRY_COPY.carriedBy: merge the two cards instead).
 * Reads the board's links and cards fresh, never the 15 second cache. Returns
 * the earlier card.
 */
export async function assertCarryConfirmable(
  db: Db,
  opts: { season: string; week: number; boardId: number; card: { id: number; applicationId: number | null }; fromCardId: number },
): Promise<EarlierCard> {
  const { season, week, boardId, card, fromCardId } = opts;
  const boards = await boardsFor(db, season, earlierAnswerWeeks(week));
  const earlier = await shownEarlier(db, boards);
  const from = earlier.find((c) => c.id === fromCardId);
  if (!from) throw new TRPCError({ code: "NOT_FOUND", message: CONFIRM_REFUSALS.notEarlier });
  if (from.applicationId != null && card.applicationId != null && from.applicationId !== card.applicationId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: CONFIRM_REFUSALS.otherApplication });
  }
  const [board] = await db
    .select({ id: sessionBoards.id, week: sessionBoards.week, state: sessionBoards.state })
    .from(sessionBoards)
    .where(eq(sessionBoards.id, boardId))
    .limit(1);
  const others = (await cardsOn(db, [boardId])).filter((c) => !c.hidden && c.id !== card.id);
  const carrier = carriersOf(others, week, linksByWeekOf(boards, week, linksOf(board)), earlier).get(from.id);
  if (carrier) {
    throw new TRPCError({ code: "BAD_REQUEST", message: fillCopy(CARRY_COPY.carriedBy, { other: carrier.name, name: from.name, week: from.week }) });
  }
  return from;
}

/** An earlier answer week's unhidden card, for a facilitator's confirm. Null when it isn't one. */
export async function earlierCardFor(db: Db, season: string, week: number, cardId: number): Promise<EarlierCard | null> {
  const weeks = earlierAnswerWeeks(week);
  const boards = await boardsFor(db, season, weeks);
  const [card] = (await cardsOn(db, boards.map((b) => b.id))).filter((c) => c.id === cardId && !c.hidden);
  if (!card) return null;
  return { id: card.id, week: boards.find((b) => b.id === card.boardId)?.week ?? 0, name: card.name, applicationId: card.applicationId, hidden: false };
}
