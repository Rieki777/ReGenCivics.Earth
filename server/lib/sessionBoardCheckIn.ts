/**
 * Check-in tiles and checking in (API_CONTRACT 3.6 and 3.7, Rye's decision
 * 13): the tiles are derived live, so no facilitator import is needed and
 * someone going at their own pace always sees the current projects.
 *
 * Tiles are this board's cards, then earlier weeks' cards that have no card
 * here, then Season 2 applications that have neither, deduped by application
 * id and then by folded name. Every card here, hidden ones too, seeds the
 * dedupe, so hiding a stray card never brings its application back as a tile.
 *
 * An application tile only ever shows the project's name, and its place only
 * where the project page is already public. Nothing else from the
 * application leaves the server.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import {
  applications,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../../drizzle/schema";
import {
  BOARD_LIMITS,
  CHECKIN_APPLICATION_STATUSES,
  FIRST_BOARD_WEEK,
  PUBLIC_PLACE_STATUSES,
  applyBoardAction,
  cleanBoardLine,
  foldProjectName,
  normalizeBoardState,
  parseTileRef,
  tileRef,
  voteTarget,
} from "@shared/sessionBoard";
import { voteCounts, type Db } from "./sessionBoard";
import { carryLinkOnCheckIn } from "./sessionBoardCarry";

export type CheckInTile = {
  ref: string;
  name: string;
  place: string | null;
  /** Set only when the tile is a card on this board. */
  cardId: number | null;
  from: "board" | "application" | "earlier";
  /** Set only for an earlier week's card. */
  fromWeek: number | null;
  /** People checked in with this card on this board (0 before it is a card here). */
  here: number;
};

export type CheckInOptions = { tiles: CheckInTile[] };

export const CHECKIN_REFUSALS = {
  notOnBoard: "That project is not on this board.",
  notOpen: "That project isn't open for check-in.",
  full: "The circle is full.",
} as const;

const OPEN_STATUSES = new Set<string>(CHECKIN_APPLICATION_STATUSES);
const PUBLIC_STATUSES = new Set<string>(PUBLIC_PLACE_STATUSES);

type CardLite = {
  id: number;
  name: string;
  place: string | null;
  url: string | null;
  applicationId: number | null;
  authorKey: string | null;
  displayName: string | null;
  hidden: number;
};

type EarlierCard = CardLite & { week: number };

type AppLite = { id: number; projectName: string; location: string | null; status: string; userId: number; stewardUserId: number | null };

/**
 * Whether a check-in may bind a card to an application: only a card nobody
 * owns, or one its applicant or steward wrote. A guest who typed a matching
 * name never gets a card tied to someone else's application; the facilitator's
 * "Link to an application" select does that by hand.
 */
export function mayAutoLink(authorKey: string | null, app: { userId: number; stewardUserId: number | null }): boolean {
  if (authorKey == null) return true;
  if (authorKey === `u:${app.userId}`) return true;
  return app.stewardUserId != null && authorKey === `u:${app.stewardUserId}`;
}

/** A place from an application, only where its project page is public, and never "TBD". */
export function applicationPlace(app: { location: string | null; status: string }): string | null {
  if (!PUBLIC_STATUSES.has(app.status)) return null;
  const place = cleanBoardLine(app.location, BOARD_LIMITS.place);
  if (!place || /^(tbd|tba|n\/?a)$/i.test(place)) return null;
  return place;
}

/* ---------------------------------------------------- the 15 second cache */

const CACHE_MS = 15_000;
const cache = new Map<string, { at: number; earlier: EarlierCard[]; apps: AppLite[] }>();

/** Tests and anything that just wrote an application can drop the cached reads. */
export function clearCheckInCache(): void {
  cache.clear();
}

async function readApplications(db: Db, appSeason: number): Promise<AppLite[]> {
  const rows = await db
    .select({
      id: applications.id,
      projectName: applications.projectName,
      location: applications.location,
      status: applications.status,
      userId: applications.userId,
      stewardUserId: applications.stewardUserId,
    })
    .from(applications)
    .where(and(eq(applications.season, appSeason), inArray(applications.status, [...CHECKIN_APPLICATION_STATUSES])));
  // Approved and active first, so a public project names the tile; then newest first.
  return rows
    .filter((a) => cleanBoardLine(a.projectName, BOARD_LIMITS.projectName))
    .sort((a, b) => Number(PUBLIC_STATUSES.has(b.status)) - Number(PUBLIC_STATUSES.has(a.status)) || b.id - a.id);
}

async function readEarlierCards(db: Db, season: string, week: number): Promise<EarlierCard[]> {
  if (week <= FIRST_BOARD_WEEK) return [];
  const boards = await db
    .select({ id: sessionBoards.id, week: sessionBoards.week })
    .from(sessionBoards)
    .where(and(eq(sessionBoards.season, season), gte(sessionBoards.week, FIRST_BOARD_WEEK), lt(sessionBoards.week, week)));
  if (boards.length === 0) return [];
  const weekOf = new Map(boards.map((b) => [b.id, b.week]));
  const cards = await db
    .select({
      id: sessionBoardProjects.id,
      boardId: sessionBoardProjects.boardId,
      name: sessionBoardProjects.name,
      place: sessionBoardProjects.place,
      url: sessionBoardProjects.url,
      applicationId: sessionBoardProjects.applicationId,
      authorKey: sessionBoardProjects.authorKey,
      displayName: sessionBoardProjects.displayName,
      hidden: sessionBoardProjects.hidden,
    })
    .from(sessionBoardProjects)
    .where(and(inArray(sessionBoardProjects.boardId, boards.map((b) => b.id)), eq(sessionBoardProjects.hidden, 0)))
    .orderBy(asc(sessionBoardProjects.id));
  // The most recent week first: a project's latest card is the one it carries forward.
  return cards
    .map(({ boardId, ...c }) => ({ ...c, week: weekOf.get(boardId) ?? 0 }))
    .sort((a, b) => b.week - a.week || a.id - b.id);
}

async function cachedReads(db: Db, season: string, week: number, appSeason: number) {
  const key = `${season}|${appSeason}|${week}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  const [earlier, apps] = await Promise.all([readEarlierCards(db, season, week), readApplications(db, appSeason)]);
  const fresh = { at: Date.now(), earlier, apps };
  cache.set(key, fresh);
  return fresh;
}

async function boardCards(db: Db, boardId: number): Promise<CardLite[]> {
  return db
    .select({
      id: sessionBoardProjects.id,
      name: sessionBoardProjects.name,
      place: sessionBoardProjects.place,
      url: sessionBoardProjects.url,
      applicationId: sessionBoardProjects.applicationId,
      authorKey: sessionBoardProjects.authorKey,
      displayName: sessionBoardProjects.displayName,
      hidden: sessionBoardProjects.hidden,
    })
    .from(sessionBoardProjects)
    .where(eq(sessionBoardProjects.boardId, boardId))
    .orderBy(asc(sessionBoardProjects.id));
}

/** The tiles for a week's "Tap your project" stage (API_CONTRACT 3.6). */
export async function checkInOptions(
  db: Db,
  opts: { season: string; week: number; appSeason: number },
): Promise<CheckInOptions> {
  const { season, week, appSeason } = opts;
  const [board] = await db
    .select({ id: sessionBoards.id })
    .from(sessionBoards)
    .where(and(eq(sessionBoards.season, season), eq(sessionBoards.week, week)))
    .limit(1);
  const [cards, counts, reads] = await Promise.all([
    board ? boardCards(db, board.id) : Promise.resolve([] as CardLite[]),
    board ? voteCounts(db, board.id) : Promise.resolve(new Map<string, number>()),
    cachedReads(db, season, week, appSeason),
  ]);

  const seenApps = new Set<number>();
  const seenNames = new Set<string>();
  const see = (applicationId: number | null, name: string) => {
    if (applicationId) seenApps.add(applicationId);
    const folded = foldProjectName(name);
    if (folded) seenNames.add(folded);
  };
  const seen = (applicationId: number | null, name: string) =>
    (!!applicationId && seenApps.has(applicationId)) || seenNames.has(foldProjectName(name));

  const tiles: CheckInTile[] = [];
  for (const c of cards) see(c.applicationId, c.name);
  for (const c of cards) {
    if (c.hidden) continue;
    tiles.push({
      ref: tileRef({ from: "board", cardId: c.id }),
      name: c.name,
      place: c.place,
      cardId: c.id,
      from: "board",
      fromWeek: null,
      here: counts.get(voteTarget.checkin(c.id)) ?? 0,
    });
  }
  for (const c of reads.earlier) {
    if (seen(c.applicationId, c.name)) continue;
    see(c.applicationId, c.name);
    tiles.push({
      ref: tileRef({ from: "earlier", week: c.week, cardId: c.id }),
      name: c.name,
      place: c.place,
      cardId: null,
      from: "earlier",
      fromWeek: c.week,
      here: 0,
    });
  }
  for (const a of reads.apps) {
    const name = cleanBoardLine(a.projectName, BOARD_LIMITS.projectName);
    if (!name || seen(a.id, name)) continue;
    see(a.id, name);
    tiles.push({
      ref: tileRef({ from: "application", applicationId: a.id }),
      name,
      place: applicationPlace(a),
      cardId: null,
      from: "application",
      fromWeek: null,
      here: 0,
    });
  }
  const sortKey = (t: CheckInTile) => foldProjectName(t.name);
  tiles.sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.ref.localeCompare(b.ref));
  return { tiles };
}

export type CheckInResult = { ok: true; cardId: number; name: string; created: boolean };

function notOpen(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: CHECKIN_REFUSALS.notOpen });
}

/**
 * Check in with a tile (API_CONTRACT 3.7): find this board's card for it, or
 * make it, then mark the caller as here. Runs in one transaction that locks
 * the board row, so two taps on one tile make one card. Nobody who taps an
 * application tile owns the card it makes; a card carried from an earlier
 * week keeps its original writer.
 */
export async function checkInOnBoard(
  db: Db,
  opts: { season: string; boardId: number; week: number; keys: string[]; ref: string; appSeason: number },
): Promise<CheckInResult> {
  const { season, boardId, week, keys, ref, appSeason } = opts;
  const tile = parseTileRef(ref);
  if (!tile) notOpen();

  // What the tile points at, read before the lock (none of it changes under it).
  let app: AppLite | null = null;
  let earlier: (CardLite & { week: number }) | null = null;
  let earlierApp: AppLite | null = null;
  if (tile.from === "application") {
    const [row] = await db
      .select({
        id: applications.id,
        projectName: applications.projectName,
        location: applications.location,
        status: applications.status,
        season: applications.season,
        userId: applications.userId,
        stewardUserId: applications.stewardUserId,
      })
      .from(applications)
      .where(eq(applications.id, tile.applicationId))
      .limit(1);
    if (!row || row.season !== appSeason || !OPEN_STATUSES.has(row.status)) notOpen();
    if (!cleanBoardLine(row.projectName, BOARD_LIMITS.projectName)) notOpen();
    app = row;
  } else if (tile.from === "earlier") {
    if (tile.week >= week || tile.week < FIRST_BOARD_WEEK) notOpen();
    const [b] = await db
      .select({ id: sessionBoards.id })
      .from(sessionBoards)
      .where(and(eq(sessionBoards.season, season), eq(sessionBoards.week, tile.week)))
      .limit(1);
    if (!b) notOpen();
    const [card] = (await boardCards(db, b.id)).filter((c) => c.id === tile.cardId);
    if (!card || card.hidden) notOpen();
    earlier = { ...card, week: tile.week };
    if (card.applicationId == null) {
      const folded = foldProjectName(card.name);
      const matches = (await readApplications(db, appSeason)).filter((a) => foldProjectName(a.projectName) === folded);
      earlierApp = matches.length === 1 && mayAutoLink(card.authorKey, matches[0]) ? matches[0] : null;
    }
  }

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: sessionBoards.id, state: sessionBoards.state })
      .from(sessionBoards)
      .where(eq(sessionBoards.id, boardId))
      .for("update");
    const cards: CardLite[] = await tx
      .select({
        id: sessionBoardProjects.id,
        name: sessionBoardProjects.name,
        place: sessionBoardProjects.place,
        url: sessionBoardProjects.url,
        applicationId: sessionBoardProjects.applicationId,
        authorKey: sessionBoardProjects.authorKey,
        displayName: sessionBoardProjects.displayName,
        hidden: sessionBoardProjects.hidden,
      })
      .from(sessionBoardProjects)
      .where(eq(sessionBoardProjects.boardId, boardId))
      .orderBy(asc(sessionBoardProjects.id));
    const shown = cards.filter((c) => !c.hidden);
    const hidden = cards.filter((c) => c.hidden);

    let card: CardLite | undefined;
    let created = false;
    let linked = false;

    const create = async (values: Omit<CardLite, "id" | "hidden">): Promise<CardLite> => {
      // Hidden cards don't count, so hiding spam frees room (countRows agrees).
      if (shown.length >= BOARD_LIMITS.projectsPerBoard) {
        throw new TRPCError({ code: "BAD_REQUEST", message: CHECKIN_REFUSALS.full });
      }
      const res = await tx.insert(sessionBoardProjects).values({ boardId, ...values });
      const id = Number((res as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
      created = true;
      return { id, hidden: 0, ...values };
    };

    if (tile.from === "board") {
      card = shown.find((c) => c.id === tile.cardId);
      if (!card) throw new TRPCError({ code: "NOT_FOUND", message: CHECKIN_REFUSALS.notOnBoard });
    } else if (tile.from === "application" && app) {
      const name = cleanBoardLine(app.projectName, BOARD_LIMITS.projectName)!;
      const folded = foldProjectName(name);
      card = shown.find((c) => c.applicationId === app!.id);
      if (!card) {
        const named = shown.find((c) => c.applicationId == null && foldProjectName(c.name) === folded);
        if (named && mayAutoLink(named.authorKey, app)) {
          await tx.update(sessionBoardProjects).set({ applicationId: app.id }).where(eq(sessionBoardProjects.id, named.id));
          card = { ...named, applicationId: app.id };
          linked = true;
        } else if (named) {
          // Someone else's card by the same name: check in with it, unlinked.
          card = named;
        }
      }
      if (!card) {
        // A stale tile for a project the facilitator hid here.
        if (hidden.some((c) => c.applicationId === app!.id || foldProjectName(c.name) === folded)) notOpen();
        card = await create({
          name,
          place: applicationPlace(app),
          url: null,
          applicationId: app.id,
          authorKey: null,
          displayName: null,
        });
      }
    } else if (tile.from === "earlier" && earlier) {
      const folded = foldProjectName(earlier.name);
      const byApp = (c: CardLite) => earlier!.applicationId != null && c.applicationId === earlier!.applicationId;
      card = shown.find(byApp) ?? shown.find((c) => foldProjectName(c.name) === folded);
      if (!card) {
        if (hidden.some((c) => byApp(c) || foldProjectName(c.name) === folded)) notOpen();
        card = await create({
          name: earlier.name,
          place: earlier.place,
          url: earlier.url,
          applicationId: earlier.applicationId ?? earlierApp?.id ?? null,
          authorKey: earlier.authorKey,
          displayName: earlier.displayName,
        });
      }
    }
    if (!card) notOpen();

    const target = voteTarget.checkin(card.id);
    const [already] = await tx
      .select({ id: sessionBoardVotes.id })
      .from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, boardId), eq(sessionBoardVotes.target, target), inArray(sessionBoardVotes.voterKey, keys)))
      .limit(1);
    let marked = false;
    if (!already) {
      await tx
        .insert(sessionBoardVotes)
        .values({ boardId, target, voterKey: keys[0] })
        .onDuplicateKeyUpdate({ set: { target: sql`target` } });
      marked = true;
    }
    // Week 4 on: remember which earlier card this one carries its answers
    // from (shared/boardCarry.ts), when the tile or the person says so.
    const state = normalizeBoardState(locked?.state ?? null, week);
    const link = await carryLinkOnCheckIn(tx, {
      season,
      week,
      state,
      card,
      keys,
      earlierTile: earlier && created ? { id: earlier.id, week: earlier.week, applicationId: earlier.applicationId } : null,
    });
    if (link) {
      const next = applyBoardAction(state, { type: "carry", cardId: card.id, from: link.from, by: link.by }, Date.now());
      await tx.update(sessionBoards).set({ state: JSON.stringify(next) }).where(eq(sessionBoards.id, boardId));
    }
    if (created || linked || marked || link) {
      await tx
        .update(sessionBoards)
        .set({ version: sql`${sessionBoards.version} + 1` })
        .where(eq(sessionBoards.id, boardId));
    }
    return { ok: true as const, cardId: card.id, name: card.name, created };
  });
}
