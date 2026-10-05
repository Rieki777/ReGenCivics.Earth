/**
 * Session board tRPC router (/season2/week/:week, ADR-68).
 *
 * One live board per weekly Season episode. Everyone in the session can type
 * onto it: arrival and closing words, their project's card, its pain points
 * and growth opportunities, notes on the game canvas, three votes each on the
 * opportunities, and a raised hand for the weeks they will join. A
 * facilitator (a site admin, or an active holder of a facilitating role) runs
 * the room: the stage, the clocks, the breath, the share timer, themes, room
 * votes, the chosen opportunities, hiding anything that should not be there,
 * and closing the board once it is the week's record.
 *
 * Public on purpose, like the Season Schedule: most project members have no
 * account, so a guest's browser keeps a random key and that key owns what they
 * wrote. A signed-in player is known by their user id instead. The key is a
 * bearer credential, so it only ever travels in mutation bodies, never in a
 * query's URL, and no author key is ever sent back to a page.
 *
 * Pages poll `version` every few seconds and fetch `get` only when it moves.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, rateLimited, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import {
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../../drizzle/schema";
import {
  BOARD_LIMITS,
  BOARD_OFFER_KEYS,
  BREATH_KEYS,
  GAME_BLOCK_KEYS,
  ITEM_KINDS,
  LAST_BOARD_WEEK,
  OPPORTUNITY_THEME_KEYS,
  PROJECT_PHASE_KEYS,
  SESSION_BOARD_SEASON,
  boardIdentity,
  boardStages,
  cleanBoardLine,
  cleanBoardText,
  hasSessionBoard,
  maxTextFor,
  normalizeBoardState,
  voteTarget,
} from "@shared/sessionBoard";
import { cleanRepoUrl } from "@shared/interopTools";
import { cleanNoteText } from "@shared/seasonSchedule";
import {
  READY_KEYS,
  actOnBoard,
  bumpVersion,
  canFacilitate,
  countByAuthor,
  countRows,
  ensureBoard,
  facilitatorLists,
  findBoard,
  itemVotesUsed,
  mineOnBoard,
  offerPeople,
  parseReadyList,
  readBoardRows,
  type Db,
} from "../lib/sessionBoard";
import { seasonPublicNotes } from "../lib/seasonSchedule";

/** Per-visitor ceilings. Generous for a live room; there to make loops slow. */
const WRITE_LIMIT = { windowMs: 60_000, max: 30 };
const PROJECT_LIMIT = { windowMs: 60_000, max: 6 };
const VOTE_LIMIT = { windowMs: 60_000, max: 40 };
const WHOAMI_LIMIT = { windowMs: 60_000, max: 30 };
const FACILITATE_LIMIT = { windowMs: 60_000, max: 240 };

/** Season 2's applications carry season = 2 (shared/incubatorSeason.ts). */
const APPLICATION_SEASON = 2;

const weekInput = z.number().int().min(2).max(LAST_BOARD_WEEK);
const voterKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const idInput = z.number().int().positive();

async function database(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return db;
}

function assertWeek(week: number) {
  if (!hasSessionBoard(week)) throw new TRPCError({ code: "NOT_FOUND", message: "That week has no board." });
}

/** Every identity the caller writes under: their account, and the key their browser keeps. */
export function callerKeys(user: TrpcContext["user"], voterKey: string | undefined): string[] {
  const keys: string[] = [];
  const own = boardIdentity(user?.id ?? null, null);
  if (own) keys.push(own);
  const guest = boardIdentity(null, voterKey ?? null);
  if (guest) keys.push(guest);
  return keys;
}

function requireKeys(keys: string[]): string[] {
  if (keys.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reload the page so your browser can hold your place on the board." });
  }
  return keys;
}

/** The board as a participant may write to it: it exists and is still open, unless they facilitate. */
async function writableBoard(db: Db, week: number, facilitator: boolean) {
  assertWeek(week);
  const board = await ensureBoard(db, SESSION_BOARD_SEASON, week);
  if (board.status !== "open" && !facilitator) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This board is closed. It stays up as the week's record." });
  }
  return board;
}

async function projectOnBoard(db: Db, boardId: number, projectId: number) {
  const [p] = await db
    .select()
    .from(sessionBoardProjects)
    .where(and(eq(sessionBoardProjects.id, projectId), eq(sessionBoardProjects.boardId, boardId)))
    .limit(1);
  return p ?? null;
}

async function itemOnBoard(db: Db, boardId: number, itemId: number) {
  const [i] = await db
    .select()
    .from(sessionBoardItems)
    .where(and(eq(sessionBoardItems.id, itemId), eq(sessionBoardItems.boardId, boardId)))
    .limit(1);
  return i ?? null;
}

const cleanName = (raw: string | undefined) => cleanBoardLine(raw, BOARD_LIMITS.displayName);

/** Facilitators only: a site admin, or an active holder of a facilitating role. */
const facilitatorProcedure = protectedProcedure.use(rateLimited(FACILITATE_LIMIT)).use(async ({ ctx, next }) => {
  const db = await database();
  if (!(await canFacilitate(db, ctx.user))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the session's facilitator can do that." });
  }
  return next();
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("go"), stage: z.number().int().min(0).max(20) }),
  z.object({ type: z.literal("startSession") }),
  z.object({ type: z.literal("restartClocks") }),
  z.object({ type: z.literal("plan"), stage: z.number().int().min(0).max(20), minutes: z.number().int().min(1).max(BOARD_LIMITS.maxStageMinutes) }),
  z.object({
    type: z.literal("breath"),
    pattern: z.enum(BREATH_KEYS).optional(),
    rounds: z.number().int().min(1).max(20).optional(),
    run: z.boolean().optional(),
  }),
  z.object({ type: z.literal("speaker"), projectId: idInput.nullable() }),
  z.object({ type: z.literal("timer"), op: z.enum(["start", "pause", "reset"]) }),
  z.object({ type: z.literal("shareSecs"), secs: z.number().int().min(BOARD_LIMITS.minShareSecs).max(BOARD_LIMITS.maxShareSecs) }),
]);

export const addItemInput = z.object({
  week: weekInput,
  voterKey: voterKeySchema.optional(),
  kind: z.enum(ITEM_KINDS),
  // Bounded well above the stored length so a long paste is trimmed, not refused.
  text: z.string().min(1).max(1000),
  projectId: idInput.optional(),
  block: z.enum(GAME_BLOCK_KEYS).optional(),
  displayName: z.string().max(200).optional(),
});

export const updateProjectInput = z.object({
  week: weekInput,
  voterKey: voterKeySchema.optional(),
  projectId: idInput,
  name: z.string().max(300).optional(),
  place: z.string().max(300).optional(),
  url: z.string().max(500).optional(),
  phase: z.enum(PROJECT_PHASE_KEYS).nullable().optional(),
  whereNow: z.string().max(BOARD_LIMITS.whereNow * 2).optional(),
  ready: z.array(z.string().max(32)).max(20).optional(),
  nextMove: z.string().max(BOARD_LIMITS.nextMove * 2).optional(),
});

export const sessionBoardRouter = router({
  /**
   * Public and tiny, polled every few seconds by every open page: has anything
   * on this week's board changed?
   */
  version: publicProcedure
    .input(z.object({ week: weekInput }))
    .query(async ({ input }) => {
      assertWeek(input.week);
      const board = await findBoard(await database(), SESSION_BOARD_SEASON, input.week);
      return { version: board?.version ?? 0, status: board?.status ?? "open" };
    }),

  /**
   * Public: the whole board. Hidden notes and projects, room-vote counts, the
   * names people typed and the facilitator's lists come back only to a
   * facilitator. No author key ever leaves the server.
   */
  get: publicProcedure
    .input(z.object({ week: weekInput }))
    .query(async ({ ctx, input }) => {
      assertWeek(input.week);
      const db = await database();
      const facilitator = await canFacilitate(db, ctx.user);
      const board = await findBoard(db, SESSION_BOARD_SEASON, input.week);
      const state = normalizeBoardState(board?.state ?? null, input.week);

      let notes: { topic: string; displayName: string | null; projectName: string | null }[] = [];
      try {
        notes = (await seasonPublicNotes(db, SESSION_BOARD_SEASON))
          .filter((n) => n.week === input.week && n.topic)
          .map((n) => ({
            topic: cleanNoteText(n.topic, 1000) ?? "",
            displayName: cleanName(n.displayName ?? undefined),
            projectName: cleanName(n.projectName ?? undefined),
          }))
          .filter((n) => n.topic);
      } catch (err) {
        console.error("[sessionBoard] notes read failed:", err);
      }

      const rows = board
        ? await readBoardRows(db, board.id, { includeHidden: facilitator })
        : { projects: [], items: [], counts: new Map<string, number>() };

      const hands: Record<number, number> = {};
      const offers: Record<string, number> = {};
      for (const [target, n] of rows.counts) {
        if (target.startsWith("week:")) hands[Number(target.slice(5))] = n;
        else if (target.startsWith("offer:")) offers[target.slice(6)] = n;
      }

      const lists = facilitator ? await facilitatorLists(db, SESSION_BOARD_SEASON, APPLICATION_SEASON) : null;
      // Who offered to coach or build, for the facilitator only: names of
      // signed-in people so they can be reached, and a count of guests.
      const offerList = facilitator && board ? await offerPeople(db, board.id) : null;

      return {
        week: input.week,
        status: (board?.status ?? "open") as "open" | "closed",
        version: board?.version ?? 0,
        serverNow: Date.now(),
        state,
        canFacilitate: facilitator,
        notes,
        hands,
        offers,
        offerPeople: offerList,
        projects: rows.projects.map((p) => ({
          id: p.id,
          name: p.name,
          place: p.place,
          url: cleanRepoUrl(p.url),
          phase: p.phase,
          whereNow: p.whereNow,
          ready: parseReadyList(p.ready, READY_KEYS),
          nextMove: p.nextMove,
          shared: !!p.shared,
          hidden: !!p.hidden,
          applicationId: facilitator ? p.applicationId : null,
          displayName: facilitator ? p.displayName : null,
        })),
        items: rows.items.map((i) => ({
          id: i.id,
          kind: i.kind,
          text: i.text,
          projectId: i.projectId,
          block: i.block,
          theme: i.theme,
          chosen: !!i.chosen,
          votes: (rows.counts.get(voteTarget.item(i.id)) ?? 0) + (i.roomVotes ?? 0),
          roomVotes: facilitator ? i.roomVotes : 0,
          fromItemId: i.fromItemId,
          hidden: !!i.hidden,
          displayName: facilitator ? i.displayName : null,
          createdAt: i.createdAt,
        })),
        facilitatorLists: lists && {
          register: lists.register
            .map((r) => ({
              projectName: cleanName(r.projectName ?? undefined),
              displayName: cleanName(r.displayName ?? undefined),
              projectUrl: cleanRepoUrl(r.projectUrl),
            }))
            .filter((r) => r.projectName),
          applications: lists.applications,
        },
      };
    }),

  /**
   * Public, a POST so the browser's key never sits in a URL: what this person
   * has put on the board, so the page can offer to edit or take it back.
   */
  whoami: publicProcedure
    .use(rateLimited(WHOAMI_LIMIT))
    .input(z.object({ week: weekInput, voterKey: voterKeySchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      assertWeek(input.week);
      const db = await database();
      const keys = callerKeys(ctx.user, input.voterKey);
      const board = await findBoard(db, SESSION_BOARD_SEASON, input.week);
      const mine = board ? await mineOnBoard(db, board.id, keys) : { itemIds: [], projectIds: [], targets: [] };
      return {
        itemIds: mine.itemIds,
        projectIds: mine.projectIds,
        votes: mine.targets.filter((t) => t.startsWith("item:")).map((t) => Number(t.slice(5))),
        hands: mine.targets.filter((t) => t.startsWith("week:")).map((t) => Number(t.slice(5))),
        offers: mine.targets.filter((t) => t.startsWith("offer:")).map((t) => t.slice(6)),
        canFacilitate: await canFacilitate(db, ctx.user),
      };
    }),

  /** Public: add a word, a pain point, an opportunity or a game note. */
  addItem: publicProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(addItemInput)
    .mutation(async ({ ctx, input }) => {
      const keys = requireKeys(callerKeys(ctx.user, input.voterKey));
      const db = await database();
      const facilitator = await canFacilitate(db, ctx.user);
      const board = await writableBoard(db, input.week, facilitator);

      const text = cleanBoardLine(input.text, maxTextFor(input.kind));
      if (!text) throw new TRPCError({ code: "BAD_REQUEST", message: "Write something first." });

      let projectId: number | null = null;
      if (input.kind === "pain" || input.kind === "opp") {
        if (input.projectId != null) {
          const p = await projectOnBoard(db, board.id, input.projectId);
          if (!p || p.hidden) throw new TRPCError({ code: "NOT_FOUND", message: "That project is not on this board." });
          projectId = p.id;
        }
      }
      let block: string | null = null;
      if (input.kind === "game") {
        if (!input.block) throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a block on the canvas." });
        block = input.block;
      }

      if (!facilitator) {
        if ((await countByAuthor(db, "items", board.id, keys)) >= BOARD_LIMITS.itemsPerAuthor) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You've added a lot to this board already. Ask the facilitator to add the rest." });
        }
      }
      if ((await countRows(db, "items", board.id)) >= BOARD_LIMITS.itemsPerBoard) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This board is full." });
      }

      const [res] = await db.insert(sessionBoardItems).values({
        boardId: board.id,
        kind: input.kind,
        text,
        projectId,
        block,
        authorKey: keys[0],
        displayName: cleanName(input.displayName),
      });
      await bumpVersion(db, board.id);
      return { ok: true as const, id: Number((res as { insertId?: number }).insertId ?? 0) };
    }),

  /** Public: take back something you wrote. A facilitator can take back anything. */
  removeItem: publicProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(z.object({ week: weekInput, voterKey: voterKeySchema.optional(), itemId: idInput }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const facilitator = await canFacilitate(db, ctx.user);
      const keys = callerKeys(ctx.user, input.voterKey);
      const board = await writableBoard(db, input.week, facilitator);
      const item = await itemOnBoard(db, board.id, input.itemId);
      if (!item) return { ok: true as const };
      if (!facilitator && !(item.authorKey && keys.includes(item.authorKey))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only take back what you wrote." });
      }
      await db.delete(sessionBoardItems).where(eq(sessionBoardItems.id, item.id));
      await db.delete(sessionBoardVotes).where(and(
        eq(sessionBoardVotes.boardId, board.id),
        eq(sessionBoardVotes.target, voteTarget.item(item.id)),
      ));
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /** Public: put your land project in the circle. */
  addProject: publicProcedure
    .use(rateLimited(PROJECT_LIMIT))
    .input(z.object({
      week: weekInput,
      voterKey: voterKeySchema.optional(),
      name: z.string().min(1).max(300),
      place: z.string().max(300).optional(),
      url: z.string().max(500).optional(),
      displayName: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const keys = requireKeys(callerKeys(ctx.user, input.voterKey));
      const db = await database();
      const facilitator = await canFacilitate(db, ctx.user);
      const board = await writableBoard(db, input.week, facilitator);
      const name = cleanBoardLine(input.name, BOARD_LIMITS.projectName);
      if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "Give your project a name." });
      const url = cleanRepoUrl(input.url);
      if (input.url && input.url.trim() && !url) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That does not look like a link. Use a web address, like yourproject.org." });
      }
      if (!facilitator && (await countByAuthor(db, "projects", board.id, keys)) >= BOARD_LIMITS.projectsPerAuthor) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You've added three projects already." });
      }
      if ((await countRows(db, "projects", board.id)) >= BOARD_LIMITS.projectsPerBoard) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The circle is full." });
      }
      const [res] = await db.insert(sessionBoardProjects).values({
        boardId: board.id,
        name,
        place: cleanBoardLine(input.place, BOARD_LIMITS.place),
        url,
        authorKey: keys[0],
        displayName: cleanName(input.displayName),
      });
      await bumpVersion(db, board.id);
      return { ok: true as const, id: Number((res as { insertId?: number }).insertId ?? 0) };
    }),

  /** Public: change your project's card. A facilitator can change any card. */
  updateProject: publicProcedure
    .use(rateLimited(WRITE_LIMIT))
    .input(updateProjectInput)
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const facilitator = await canFacilitate(db, ctx.user);
      const keys = callerKeys(ctx.user, input.voterKey);
      const board = await writableBoard(db, input.week, facilitator);
      const p = await projectOnBoard(db, board.id, input.projectId);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "That project is not on this board." });
      if (!facilitator && !(p.authorKey && keys.includes(p.authorKey))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project that added this card, or the facilitator, can change it." });
      }
      const set: Partial<typeof sessionBoardProjects.$inferInsert> = {};
      if (input.name !== undefined) {
        const name = cleanBoardLine(input.name, BOARD_LIMITS.projectName);
        if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "A project needs a name." });
        set.name = name;
      }
      if (input.place !== undefined) set.place = cleanBoardLine(input.place, BOARD_LIMITS.place);
      if (input.url !== undefined) {
        const url = cleanRepoUrl(input.url);
        if (input.url.trim() && !url) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That does not look like a link. Use a web address, like yourproject.org." });
        }
        set.url = url;
      }
      if (input.phase !== undefined) set.phase = input.phase;
      if (input.whereNow !== undefined) set.whereNow = cleanBoardText(input.whereNow, BOARD_LIMITS.whereNow);
      if (input.ready !== undefined) set.ready = parseReadyList(input.ready.join(","), READY_KEYS).join(",") || null;
      if (input.nextMove !== undefined) set.nextMove = cleanBoardLine(input.nextMove, BOARD_LIMITS.nextMove);
      if (Object.keys(set).length === 0) return { ok: true as const };
      await db.update(sessionBoardProjects).set(set).where(eq(sessionBoardProjects.id, p.id));
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /** Public: vote for an opportunity, or take the vote back. Three each. */
  vote: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({ week: weekInput, voterKey: voterKeySchema.optional(), itemId: idInput, on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const keys = requireKeys(callerKeys(ctx.user, input.voterKey));
      const db = await database();
      const board = await writableBoard(db, input.week, false);
      const target = voteTarget.item(input.itemId);
      if (!input.on) {
        await db.delete(sessionBoardVotes).where(and(
          eq(sessionBoardVotes.boardId, board.id),
          eq(sessionBoardVotes.target, target),
          inArray(sessionBoardVotes.voterKey, keys),
        ));
        await bumpVersion(db, board.id);
        return { ok: true as const };
      }
      const item = await itemOnBoard(db, board.id, input.itemId);
      if (!item || item.hidden || item.kind !== "opp") {
        throw new TRPCError({ code: "NOT_FOUND", message: "That opportunity is not on this board." });
      }
      const [already] = await db
        .select({ id: sessionBoardVotes.id })
        .from(sessionBoardVotes)
        .where(and(eq(sessionBoardVotes.boardId, board.id), eq(sessionBoardVotes.target, target), inArray(sessionBoardVotes.voterKey, keys)))
        .limit(1);
      if (already) return { ok: true as const };
      if ((await itemVotesUsed(db, board.id, keys)) >= BOARD_LIMITS.votesPerPerson) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You've used your three votes. Take one back to move it." });
      }
      await db
        .insert(sessionBoardVotes)
        .values({ boardId: board.id, target, voterKey: keys[0] })
        .onDuplicateKeyUpdate({ set: { target: sql`target` } });
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /** Public: raise or lower a hand for a coming week's roundtable. */
  hand: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({ week: weekInput, voterKey: voterKeySchema.optional(), forWeek: z.number().int().min(2).max(LAST_BOARD_WEEK), on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const keys = requireKeys(callerKeys(ctx.user, input.voterKey));
      const db = await database();
      const board = await writableBoard(db, input.week, false);
      if (input.forWeek <= input.week) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hands are for the weeks still to come." });
      }
      const target = voteTarget.week(input.forWeek);
      if (input.on) {
        await db
          .insert(sessionBoardVotes)
          .values({ boardId: board.id, target, voterKey: keys[0] })
          .onDuplicateKeyUpdate({ set: { target: sql`target` } });
      } else {
        await db.delete(sessionBoardVotes).where(and(
          eq(sessionBoardVotes.boardId, board.id),
          eq(sessionBoardVotes.target, target),
          inArray(sessionBoardVotes.voterKey, keys),
        ));
      }
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /** Public: raise or lower a hand to coach a village or build a module ("A Game we build together"). */
  offer: publicProcedure
    .use(rateLimited(VOTE_LIMIT))
    .input(z.object({ week: weekInput, voterKey: voterKeySchema.optional(), offer: z.enum(BOARD_OFFER_KEYS), on: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const keys = requireKeys(callerKeys(ctx.user, input.voterKey));
      if (!boardStages(input.week).some((s) => s.kind === "together")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This week's board has no hands to raise for that." });
      }
      const db = await database();
      const board = await writableBoard(db, input.week, false);
      const target = voteTarget.offer(input.offer);
      if (input.on) {
        await db
          .insert(sessionBoardVotes)
          .values({ boardId: board.id, target, voterKey: keys[0] })
          .onDuplicateKeyUpdate({ set: { target: sql`target` } });
      } else {
        await db.delete(sessionBoardVotes).where(and(
          eq(sessionBoardVotes.boardId, board.id),
          eq(sessionBoardVotes.target, target),
          inArray(sessionBoardVotes.voterKey, keys),
        ));
      }
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /* ---------------------------------------------------------- facilitator */

  /** Facilitator: move the room, run the clocks, the breath and the share timer. */
  act: facilitatorProcedure
    .input(z.object({ week: weekInput, action: actionSchema }))
    .mutation(async ({ input }) => {
      assertWeek(input.week);
      const db = await database();
      const board = await ensureBoard(db, SESSION_BOARD_SEASON, input.week);
      const state = await actOnBoard(db, board.id, input.week, input.action, Date.now());
      return { ok: true as const, state };
    }),

  /** Facilitator: theme, choose, count room votes, hide, or fix the wording of a note. */
  curateItem: facilitatorProcedure
    .input(z.object({
      week: weekInput,
      itemId: idInput,
      theme: z.enum(OPPORTUNITY_THEME_KEYS).nullable().optional(),
      chosen: z.boolean().optional(),
      roomVotes: z.number().int().min(0).max(500).optional(),
      hidden: z.boolean().optional(),
      text: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      assertWeek(input.week);
      const db = await database();
      const board = await ensureBoard(db, SESSION_BOARD_SEASON, input.week);
      const item = await itemOnBoard(db, board.id, input.itemId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "That note is not on this board." });
      const set: Partial<typeof sessionBoardItems.$inferInsert> = {};
      if (input.theme !== undefined) set.theme = input.theme;
      if (input.chosen !== undefined) set.chosen = input.chosen ? 1 : 0;
      if (input.roomVotes !== undefined) set.roomVotes = input.roomVotes;
      if (input.hidden !== undefined) set.hidden = input.hidden ? 1 : 0;
      if (input.text !== undefined) {
        const text = cleanBoardLine(input.text, maxTextFor(item.kind as (typeof ITEM_KINDS)[number]));
        if (!text) throw new TRPCError({ code: "BAD_REQUEST", message: "A note needs words." });
        set.text = text;
      }
      if (Object.keys(set).length === 0) return { ok: true as const };
      await db.update(sessionBoardItems).set(set).where(eq(sessionBoardItems.id, item.id));
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /** Facilitator: mark a project as shared, hide it, or link it to its incubator application. */
  curateProject: facilitatorProcedure
    .input(z.object({
      week: weekInput,
      projectId: idInput,
      shared: z.boolean().optional(),
      hidden: z.boolean().optional(),
      applicationId: idInput.nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      assertWeek(input.week);
      const db = await database();
      const board = await ensureBoard(db, SESSION_BOARD_SEASON, input.week);
      const p = await projectOnBoard(db, board.id, input.projectId);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "That project is not on this board." });
      const set: Partial<typeof sessionBoardProjects.$inferInsert> = {};
      if (input.shared !== undefined) set.shared = input.shared ? 1 : 0;
      if (input.hidden !== undefined) set.hidden = input.hidden ? 1 : 0;
      if (input.applicationId !== undefined) set.applicationId = input.applicationId;
      if (Object.keys(set).length === 0) return { ok: true as const };
      await db.update(sessionBoardProjects).set(set).where(eq(sessionBoardProjects.id, p.id));
      await bumpVersion(db, board.id);
      return { ok: true as const };
    }),

  /** Facilitator: turn a chosen opportunity into a quest on the game canvas, once. */
  promote: facilitatorProcedure
    .input(z.object({ week: weekInput, itemId: idInput }))
    .mutation(async ({ ctx, input }) => {
      assertWeek(input.week);
      const db = await database();
      const board = await ensureBoard(db, SESSION_BOARD_SEASON, input.week);
      const item = await itemOnBoard(db, board.id, input.itemId);
      if (!item || item.kind !== "opp") throw new TRPCError({ code: "NOT_FOUND", message: "That opportunity is not on this board." });
      const [exists] = await db
        .select({ id: sessionBoardItems.id })
        .from(sessionBoardItems)
        .where(and(eq(sessionBoardItems.boardId, board.id), eq(sessionBoardItems.fromItemId, item.id)))
        .limit(1);
      if (exists) return { ok: true as const, id: exists.id };
      const [res] = await db.insert(sessionBoardItems).values({
        boardId: board.id,
        kind: "game",
        text: item.text,
        block: "quests",
        fromItemId: item.id,
        authorKey: boardIdentity(ctx.user.id, null),
      });
      await bumpVersion(db, board.id);
      return { ok: true as const, id: Number((res as { insertId?: number }).insertId ?? 0) };
    }),

  /** Facilitator: bring the projects on the Season's register into the circle, skipping any already there. */
  importRegister: facilitatorProcedure
    .input(z.object({ week: weekInput }))
    .mutation(async ({ ctx, input }) => {
      assertWeek(input.week);
      const db = await database();
      const board = await ensureBoard(db, SESSION_BOARD_SEASON, input.week);
      const { register } = await facilitatorLists(db, SESSION_BOARD_SEASON, APPLICATION_SEASON);
      const existing = await db
        .select({ name: sessionBoardProjects.name })
        .from(sessionBoardProjects)
        .where(eq(sessionBoardProjects.boardId, board.id));
      const fold = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const seen = new Set(existing.map((e) => fold(e.name)));
      let added = 0;
      for (const r of register) {
        const name = cleanBoardLine(r.projectName ?? undefined, BOARD_LIMITS.projectName);
        if (!name || seen.has(fold(name))) continue;
        seen.add(fold(name));
        await db.insert(sessionBoardProjects).values({
          boardId: board.id,
          name,
          url: cleanRepoUrl(r.projectUrl),
          authorKey: boardIdentity(ctx.user.id, null),
        });
        added++;
      }
      if (added) await bumpVersion(db, board.id);
      return { ok: true as const, added };
    }),

  /** Facilitator: close the board as the week's record, or open it again. */
  setStatus: facilitatorProcedure
    .input(z.object({ week: weekInput, status: z.enum(["open", "closed"]) }))
    .mutation(async ({ input }) => {
      assertWeek(input.week);
      const db = await database();
      const board = await ensureBoard(db, SESSION_BOARD_SEASON, input.week);
      await db
        .update(sessionBoards)
        .set({ status: input.status, version: sql`${sessionBoards.version} + 1` })
        .where(eq(sessionBoards.id, board.id));
      return { ok: true as const };
    }),
});
