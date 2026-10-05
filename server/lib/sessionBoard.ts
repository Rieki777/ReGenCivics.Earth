/**
 * Session boards: the database side (shared/sessionBoard.ts, migration 0283,
 * ADR-68). The router in server/routes/sessionBoard.ts decides who may do what;
 * this file reads and writes the rows and keeps `version` moving so every open
 * page knows when to fetch again.
 */
import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import {
  applications,
  roleHolders,
  seasonScheduleVotes,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
  users,
  type SessionBoard,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { isAdminRole } from "@shared/adminRole";
import { CROWDPOOL_READINESS } from "@shared/crowdpoolReadiness";
import {
  BOARD_FACILITATOR_ROLE_SLUGS,
  applyBoardAction,
  cleanBoardLine,
  normalizeBoardState,
  parseReadyList,
  type BoardAction,
  type BoardState,
} from "@shared/sessionBoard";

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const READY_KEYS = CROWDPOOL_READINESS.map((r) => r.key);

/** The board for a week, or null before anyone has touched it. */
export async function findBoard(db: Db, season: string, week: number): Promise<SessionBoard | null> {
  const [row] = await db
    .select()
    .from(sessionBoards)
    .where(and(eq(sessionBoards.season, season), eq(sessionBoards.week, week)))
    .limit(1);
  return row ?? null;
}

/** The board for a week, made on first use. Two first writers at once both land on the one row. */
export async function ensureBoard(db: Db, season: string, week: number): Promise<SessionBoard> {
  const found = await findBoard(db, season, week);
  if (found) return found;
  await db
    .insert(sessionBoards)
    .values({ season, week, status: "open", version: 0 })
    .onDuplicateKeyUpdate({ set: { season: sql`season` } });
  const made = await findBoard(db, season, week);
  if (!made) throw new Error("session board could not be created");
  return made;
}

/** Tell every open page something changed. */
export async function bumpVersion(db: Db, boardId: number): Promise<void> {
  await db
    .update(sessionBoards)
    .set({ version: sql`${sessionBoards.version} + 1` })
    .where(eq(sessionBoards.id, boardId));
}

/**
 * Who can run a board: a site admin, or an active holder of one of the
 * facilitating roles (the Lantern-Keeper, the Season Facilitator, the
 * Incubator Guide).
 */
export async function canFacilitate(
  db: Db,
  user: { id: number; role?: string | null } | null | undefined,
): Promise<boolean> {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const [row] = await db
    .select({ id: roleHolders.id })
    .from(roleHolders)
    .where(and(
      eq(roleHolders.userId, user.id),
      eq(roleHolders.isActive, 1),
      inArray(roleHolders.roleSlug, [...BOARD_FACILITATOR_ROLE_SLUGS]),
    ))
    .limit(1);
  return !!row;
}

/**
 * Apply one facilitator action, holding the row so two facilitators (or one on
 * two devices) never lose each other's move. Returns the new state.
 */
export async function actOnBoard(db: Db, boardId: number, week: number, action: BoardAction, now: number): Promise<BoardState> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ state: sessionBoards.state })
      .from(sessionBoards)
      .where(eq(sessionBoards.id, boardId))
      .for("update");
    const next = applyBoardAction(normalizeBoardState(row?.state ?? null, week), action, now);
    await tx
      .update(sessionBoards)
      .set({ state: JSON.stringify(next), version: sql`${sessionBoards.version} + 1` })
      .where(eq(sessionBoards.id, boardId));
    return next;
  });
}

/** Votes per target on a board: "item:12" -> 4, "week:5" -> 2. */
export async function voteCounts(db: Db, boardId: number): Promise<Map<string, number>> {
  const rows = await db
    .select({ target: sessionBoardVotes.target, n: sql<number>`COUNT(*)` })
    .from(sessionBoardVotes)
    .where(eq(sessionBoardVotes.boardId, boardId))
    .groupBy(sessionBoardVotes.target);
  return new Map(rows.map((r) => [r.target, Number(r.n)]));
}

/** Everything a page draws, in the order it was added. Hidden rows only for facilitators. */
export async function readBoardRows(db: Db, boardId: number, opts: { includeHidden: boolean }) {
  const [projects, items, counts] = await Promise.all([
    db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.boardId, boardId)).orderBy(asc(sessionBoardProjects.id)),
    db.select().from(sessionBoardItems).where(eq(sessionBoardItems.boardId, boardId)).orderBy(asc(sessionBoardItems.id)),
    voteCounts(db, boardId),
  ]);
  const hiddenProjects = new Set(projects.filter((p) => p.hidden).map((p) => p.id));
  const shownProjects = opts.includeHidden ? projects : projects.filter((p) => !p.hidden);
  const shownItems = opts.includeHidden
    ? items
    : items.filter((i) => !i.hidden && !(i.projectId != null && hiddenProjects.has(i.projectId)));
  return { projects: shownProjects, items: shownItems, counts };
}

/** How many of something one person has already put on a board. */
export async function countByAuthor(
  db: Db,
  table: "items" | "projects",
  boardId: number,
  keys: string[],
): Promise<number> {
  if (keys.length === 0) return 0;
  if (table === "items") {
    const [row] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(sessionBoardItems)
      .where(and(eq(sessionBoardItems.boardId, boardId), inArray(sessionBoardItems.authorKey, keys)));
    return Number(row?.n ?? 0);
  }
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(sessionBoardProjects)
    .where(and(eq(sessionBoardProjects.boardId, boardId), inArray(sessionBoardProjects.authorKey, keys)));
  return Number(row?.n ?? 0);
}

export async function countRows(db: Db, table: "items" | "projects", boardId: number): Promise<number> {
  const t = table === "items" ? sessionBoardItems : sessionBoardProjects;
  const [row] = await db.select({ n: sql<number>`COUNT(*)` }).from(t).where(eq(t.boardId, boardId));
  return Number(row?.n ?? 0);
}

/** How many opportunity votes one person has used on a board. */
export async function itemVotesUsed(db: Db, boardId: number, keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(sessionBoardVotes)
    .where(and(
      eq(sessionBoardVotes.boardId, boardId),
      inArray(sessionBoardVotes.voterKey, keys),
      like(sessionBoardVotes.target, "item:%"),
    ));
  return Number(row?.n ?? 0);
}

/** What one person has put on a board, so the page can offer to edit or take it back. */
export async function mineOnBoard(db: Db, boardId: number, keys: string[]) {
  if (keys.length === 0) return { itemIds: [] as number[], projectIds: [] as number[], targets: [] as string[] };
  const [items, projects, votes] = await Promise.all([
    db.select({ id: sessionBoardItems.id }).from(sessionBoardItems)
      .where(and(eq(sessionBoardItems.boardId, boardId), inArray(sessionBoardItems.authorKey, keys))),
    db.select({ id: sessionBoardProjects.id }).from(sessionBoardProjects)
      .where(and(eq(sessionBoardProjects.boardId, boardId), inArray(sessionBoardProjects.authorKey, keys))),
    db.select({ target: sessionBoardVotes.target }).from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, boardId), inArray(sessionBoardVotes.voterKey, keys))),
  ]);
  return {
    itemIds: items.map((r) => r.id),
    projectIds: projects.map((r) => r.id),
    targets: votes.map((r) => r.target),
  };
}

/**
 * For the facilitator: who raised a hand to offer something ("offer:coach",
 * "offer:build"). Signed-in people by the name on their account, so they can
 * be reached; guests only as a count, since a guest key names no one.
 */
export async function offerPeople(db: Db, boardId: number): Promise<Record<string, { names: string[]; guests: number }>> {
  const rows = await db
    .select({ target: sessionBoardVotes.target, voterKey: sessionBoardVotes.voterKey })
    .from(sessionBoardVotes)
    .where(and(eq(sessionBoardVotes.boardId, boardId), like(sessionBoardVotes.target, "offer:%")))
    .orderBy(asc(sessionBoardVotes.id));
  const userIds = Array.from(new Set(
    rows.map((r) => /^u:(\d+)$/.exec(r.voterKey)?.[1]).filter((id): id is string => !!id).map(Number),
  ));
  const named = userIds.length
    ? await db.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, userIds))
    : [];
  const nameById = new Map(named.map((u) => [u.id, cleanBoardLine(u.name, 80) ?? (u.handle ? `@${u.handle}` : `Player ${u.id}`)]));
  const out: Record<string, { names: string[]; guests: number }> = {};
  for (const r of rows) {
    const key = r.target.slice("offer:".length);
    const slot = (out[key] ??= { names: [], guests: 0 });
    const id = /^u:(\d+)$/.exec(r.voterKey)?.[1];
    if (id) slot.names.push(nameById.get(Number(id)) ?? `Player ${id}`);
    else slot.guests += 1;
  }
  return out;
}

/**
 * For the facilitator: the projects on the Season's register (their own name
 * and link, as they typed them on /season-schedule) and the approved
 * applications a circle project can be linked to.
 */
export async function facilitatorLists(db: Db, season: string, applicationSeason: number) {
  const [register, apps] = await Promise.all([
    db
      .select({
        projectName: seasonScheduleVotes.projectName,
        displayName: seasonScheduleVotes.displayName,
        projectUrl: seasonScheduleVotes.projectUrl,
      })
      .from(seasonScheduleVotes)
      .where(eq(seasonScheduleVotes.season, season))
      .orderBy(asc(seasonScheduleVotes.createdAt)),
    db
      .select({ id: applications.id, projectName: applications.projectName })
      .from(applications)
      .where(and(eq(applications.season, applicationSeason), inArray(applications.status, ["approved", "active"])))
      .orderBy(asc(applications.projectName)),
  ]);
  return { register, applications: apps };
}

export { parseReadyList };
