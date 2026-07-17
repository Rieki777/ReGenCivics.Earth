/**
 * Community song submissions for the Hymn Book.
 *
 * Flow per season:
 *  1. Each player may submit one song (`submit`).
 *  2. Players vote (one vote per season across all submissions in that season).
 *  3. At season end an admin runs `tallyAndReward` to mark the highest-voted
 *     submission as the winner. The reward amount is read from the
 *     `hymnSubmissionWinnerReward` game variable (default 3333 $ReGen).
 */
import { protectedProcedure, publicProcedure, adminProcedure, rateLimited, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { songSubmissions, songSubmissionVotes, users } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Best-effort current season helper. Returns the active game season id when the
// game_seasons table exists, otherwise `null` (which is treated as the global
// "no season" bucket so the feature still works pre-Season 2 launch).
async function getActiveSeasonId(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(sql`SELECT id FROM game_seasons WHERE status = 'active' LIMIT 1`);
    const row = (rows as any)?.[0]?.[0] ?? (rows as any)?.[0];
    return row?.id ?? null;
  } catch {
    return null;
  }
}

async function getWinnerReward(): Promise<number> {
  const db = await getDb();
  if (!db) return 3333;
  try {
    const rows = await db.execute(sql`SELECT value FROM game_variables WHERE \`key\` = 'hymnSubmissionWinnerReward' LIMIT 1`);
    const row = (rows as any)?.[0]?.[0] ?? (rows as any)?.[0];
    const v = row?.value;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 3333;
  } catch {
    return 3333;
  }
}

export const songsRouter = router({
  /**
   * Submit a song for the current season's hymn vote.
   * Enforces one submission per user per season.
   */
  submit: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 3 }))
    .input(z.object({
      title: z.string().trim().min(1).max(200),
      artist: z.string().trim().max(200).optional(),
      audioUrl: z.string().trim().url().max(500),
      description: z.string().trim().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const seasonId = await getActiveSeasonId();

      // One submission per user per season
      const existing = await db.select({ id: songSubmissions.id })
        .from(songSubmissions)
        .where(
          seasonId === null
            ? eq(songSubmissions.userId, ctx.user.id)
            : and(eq(songSubmissions.userId, ctx.user.id), eq(songSubmissions.seasonId, seasonId))
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have a song submission for this season. One per player per season.",
        });
      }

      const inserted = await db.insert(songSubmissions).values({
        userId: ctx.user.id,
        seasonId: seasonId ?? null,
        title: input.title,
        artist: input.artist ?? null,
        audioUrl: input.audioUrl,
        description: input.description ?? null,
        voteCount: 0,
        status: "pending",
      });

      return { ok: true, id: (inserted as any)?.[0]?.insertId ?? null };
    }),

  /**
   * List all submissions for the current season, ordered by vote count desc.
   * Public, anyone can listen and see vote counts.
   */
  list: publicProcedure
    .input(z.object({
      seasonId: z.number().int().positive().optional(),
      includeWinners: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as Array<any>;
      const seasonId = input?.seasonId ?? await getActiveSeasonId();

      // Only live submissions belong on the voting page. After a season is
      // tallied, losers are archived and the winner moves into the Hymn Book,
      // so neither should keep showing as "this season's submissions".
      // `includeWinners` opts winners back in for archive/hall-of-fame views.
      const statusCond = input?.includeWinners
        ? sql`${songSubmissions.status} IN ('pending', 'winner')`
        : eq(songSubmissions.status, "pending");

      const rows = await db.select({
        id: songSubmissions.id,
        userId: songSubmissions.userId,
        seasonId: songSubmissions.seasonId,
        title: songSubmissions.title,
        artist: songSubmissions.artist,
        audioUrl: songSubmissions.audioUrl,
        description: songSubmissions.description,
        voteCount: songSubmissions.voteCount,
        status: songSubmissions.status,
        submittedAt: songSubmissions.submittedAt,
        submittedByName: users.name,
      })
      .from(songSubmissions)
      .leftJoin(users, eq(users.id, songSubmissions.userId))
      .where(
        seasonId === null || seasonId === undefined
          ? statusCond
          : and(eq(songSubmissions.seasonId, seasonId), statusCond)
      )
      .orderBy(desc(songSubmissions.voteCount), desc(songSubmissions.submittedAt))
      .limit(200);

      return rows;
    }),

  /**
   * Cast (or move) the player's single vote for this season to a submission.
   * Replaces any prior vote the user had for the same season.
   */
  vote: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 30 }))
    .input(z.object({ submissionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify the submission exists and resolve its season
      const target = await db.select({
        id: songSubmissions.id,
        seasonId: songSubmissions.seasonId,
      }).from(songSubmissions).where(eq(songSubmissions.id, input.submissionId)).limit(1);

      if (target.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      const seasonId = target[0].seasonId;

      // Find any existing vote by this user for this season
      const existing = await db.select({
        id: songSubmissionVotes.id,
        songSubmissionId: songSubmissionVotes.songSubmissionId,
      })
      .from(songSubmissionVotes)
      .where(
        seasonId === null
          ? and(eq(songSubmissionVotes.userId, ctx.user.id), sql`${songSubmissionVotes.seasonId} IS NULL`)
          : and(eq(songSubmissionVotes.userId, ctx.user.id), eq(songSubmissionVotes.seasonId, seasonId))
      )
      .limit(1);

      if (existing.length > 0) {
        const prev = existing[0];
        if (prev.songSubmissionId === input.submissionId) {
          return { ok: true, changed: false };
        }
        // Move the vote: decrement old, increment new, update the vote row
        await db.update(songSubmissions)
          .set({ voteCount: sql`GREATEST(${songSubmissions.voteCount} - 1, 0)` })
          .where(eq(songSubmissions.id, prev.songSubmissionId));
        await db.update(songSubmissionVotes)
          .set({ songSubmissionId: input.submissionId })
          .where(eq(songSubmissionVotes.id, prev.id));
      } else {
        await db.insert(songSubmissionVotes).values({
          songSubmissionId: input.submissionId,
          userId: ctx.user.id,
          seasonId: seasonId ?? null,
        });
      }

      await db.update(songSubmissions)
        .set({ voteCount: sql`${songSubmissions.voteCount} + 1` })
        .where(eq(songSubmissions.id, input.submissionId));

      return { ok: true, changed: true };
    }),

  /** Return the current user's vote for the active season (or null). */
  myVote: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const seasonId = await getActiveSeasonId();
    const rows = await db.select({ submissionId: songSubmissionVotes.songSubmissionId })
      .from(songSubmissionVotes)
      .where(
        seasonId === null
          ? and(eq(songSubmissionVotes.userId, ctx.user.id), sql`${songSubmissionVotes.seasonId} IS NULL`)
          : and(eq(songSubmissionVotes.userId, ctx.user.id), eq(songSubmissionVotes.seasonId, seasonId))
      )
      .limit(1);
    return rows[0] ?? null;
  }),

  /**
   * Admin: at season end, mark the top-voted submission as the winner.
   * Records the reward amount in the response so the operator can pay it
   * out via the existing token-grant flow.
   */
  tallyAndReward: adminProcedure
    .input(z.object({ seasonId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const seasonId = input?.seasonId ?? await getActiveSeasonId();

      const rows = await db.select({
        id: songSubmissions.id,
        userId: songSubmissions.userId,
        title: songSubmissions.title,
        voteCount: songSubmissions.voteCount,
      })
      .from(songSubmissions)
      .where(
        seasonId === null || seasonId === undefined
          ? eq(songSubmissions.status, "pending")
          : and(eq(songSubmissions.seasonId, seasonId), eq(songSubmissions.status, "pending"))
      )
      .orderBy(desc(songSubmissions.voteCount), desc(songSubmissions.submittedAt))
      .limit(1);

      if (rows.length === 0) {
        return { ok: true, winner: null as any, reward: 0 };
      }
      const winner = rows[0];
      const reward = await getWinnerReward();

      await db.update(songSubmissions)
        .set({ status: "winner" })
        .where(eq(songSubmissions.id, winner.id));

      // Mark all other pending submissions in this season as archived so they
      // do not appear as "current voting" once the season is closed.
      await db.update(songSubmissions)
        .set({ status: "archived" })
        .where(
          seasonId === null || seasonId === undefined
            ? eq(songSubmissions.status, "pending")
            : and(eq(songSubmissions.seasonId, seasonId), eq(songSubmissions.status, "pending"))
        );

      return { ok: true, winner, reward };
    }),
});
