// server/routes/gratitude.ts
// Gratitude acknowledgments on the lunar-cycle proportional model
// (GRATITUDE_SYSTEM_SPEC.md + GRATITUDE_TAB_BUILD_SPEC.md).
//
// Economy cutover 2026-07-03: sends no longer credit a flat 5 $ReGen.
// A send is a free acknowledgment; recipients earn $ReGen at cycle close,
// proportional to weighted gratitude received (server/lib/gratitude-cycles.ts).
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, getUserByHandle } from "../db";
import { gratitudeLog, gratitudeCycles, gratitudeCycleBudgets, users, playerProfiles, userTokenLedger } from "../../drizzle/schema";
import { eq, sql, and, gte, desc, lt } from "drizzle-orm";
import { sanitizeInput } from "../_core/security";
import {
  getOrCreateCurrentCycle,
  getOrCreateCycleBudget,
  getGratitudeVars,
  computePerPersonShare,
  closeDueCycles,
} from "../lib/gratitude-cycles";
import { moonPhase, daysRemainingInCycle } from "../../shared/lunar";
import { extractThemes, themeBlurb } from "../../shared/gratitude-themes";
import { getGameVariables } from "../game";

export const gratitudeRouter = router({
  // Send a gratitude acknowledgment to another user identified by handle.
  send: protectedProcedure
    .input(z.object({
      recipientHandle: z.string().min(3).max(40),
      message: z.string().min(3).max(500),
      sourceType: z.enum(["forum_post", "forum_reply", "profile", "command_center", "bounty"]).optional(),
      sourceId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const recipient = await getUserByHandle(input.recipientHandle);
      if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "No one with that handle" });
      if (recipient.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot send gratitude to yourself" });
      }

      // Block gratitude to system/team accounts. These are identified by
      // handles starting with "regen-" that are team-managed, or by the
      // openId "regen-guide-system". Players should only send to other players.
      const SYSTEM_HANDLES = ["regen-civics-team", "regen-guide", "regen-guide-system", "system", "admin"];
      if (SYSTEM_HANDLES.includes(input.recipientHandle.toLowerCase()) || (recipient as any).openId === "regen-guide-system") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Gratitude can only be sent to other players, not to team accounts." });
      }

      // Duplicate guard: prevent sending gratitude for the exact same source twice.
      // A source is a unique (sourceType + sourceId) pair.
      if (input.sourceType && input.sourceId) {
        const existing = await db
          .select({ id: gratitudeLog.id })
          .from(gratitudeLog)
          .where(and(
            eq(gratitudeLog.senderId, ctx.user.id),
            eq(gratitudeLog.recipientId, recipient.id),
            sql`${gratitudeLog.sourceType} = ${input.sourceType}`,
            sql`${gratitudeLog.sourceId} = ${input.sourceId}`,
          ))
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You've already sent gratitude for this. Each contribution gets one thank-you.",
          });
        }
      }

      // Spam guard: at most 30 sends per hour per sender, hard ceiling under
      // the cycle model too (acknowledgments are free, the ceiling stops bots).
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSends = await db
        .select({ id: gratitudeLog.id })
        .from(gratitudeLog)
        .where(and(eq(gratitudeLog.senderId, ctx.user.id), gte(gratitudeLog.createdAt, oneHourAgo)));
      if (recentSends.length >= 30) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You've sent a lot of gratitude in the last hour. Take a breath, come back soon.",
        });
      }

      // Lunar cycle: one acknowledgment per person per cycle.
      const cycle = await getOrCreateCurrentCycle(db);
      const [alreadyThisCycle] = await db
        .select({ id: gratitudeLog.id })
        .from(gratitudeLog)
        .where(and(
          eq(gratitudeLog.senderId, ctx.user.id),
          eq(gratitudeLog.recipientId, recipient.id),
          eq(gratitudeLog.cycleId, cycle.id),
        ))
        .limit(1);
      if (alreadyThisCycle) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You've already acknowledged this person this cycle. Your appreciation is already counted at full strength.",
        });
      }

      // Budget row (created lazily; snapshots tier + streak on first send).
      const budget = await getOrCreateCycleBudget(db, ctx.user.id, cycle);

      let insertId: number | null = null;
      try {
        const [result] = await db.insert(gratitudeLog).values({
          senderId: ctx.user.id,
          recipientId: recipient.id,
          message: sanitizeInput(input.message),
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          cycleId: cycle.id,
        });
        insertId = (result as any).insertId ?? null;
      } catch (err: any) {
        // uniq_ack_per_cycle backstop for the race the pre-check missed.
        if (String(err?.message ?? err).includes("uniq_ack_per_cycle") || err?.code === "ER_DUP_ENTRY") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You've already acknowledged this person this cycle. Your appreciation is already counted at full strength.",
          });
        }
        throw err;
      }

      // Count the new unique recipient toward this cycle's split.
      await db
        .update(gratitudeCycleBudgets)
        .set({ uniqueRecipients: sql`${gratitudeCycleBudgets.uniqueRecipients} + 1` })
        .where(eq(gratitudeCycleBudgets.id, budget.id));

      // NOTE: no token credit here. $ReGen flows to recipients at cycle
      // close via the distribution job (closeDueCycles). This is the
      // economy cutover from the flat 5-per-send model (ADR-30).

      // Fire-and-forget notification via the forum fan-out (dedupeKey makes
      // retries no-ops). Deep-links to the recipient's Gratitude tab.
      import("../lib/forum-notify")
        .then(({ handleGratitudeSent }) =>
          handleGratitudeSent({
            gratitudeId: insertId ?? 0,
            senderId: ctx.user.id,
            recipientId: recipient.id,
            message: input.message,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
          })
        )
        .catch((err) => console.error("[gratitude.send] notify fan-out failed:", err));

      const uniqueAfter = budget.uniqueRecipients + 1;
      const vars = await getGratitudeVars();
      return {
        ok: true,
        peopleThisCycle: uniqueAfter,
        perPersonShare: Math.round(computePerPersonShare(budget.effectiveBudget, uniqueAfter)),
        fullPowerRemaining: Math.max(0, vars.fullPowerThreshold - uniqueAfter),
      };
    }),

  // Everything the Gratitude tab header needs in one call.
  myOverview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = new Date();
    const cycle = await getOrCreateCurrentCycle(db);
    const vars = await getGratitudeVars();

    const [budget] = await db
      .select()
      .from(gratitudeCycleBudgets)
      .where(and(eq(gratitudeCycleBudgets.userId, ctx.user.id), eq(gratitudeCycleBudgets.cycleId, cycle.id)))
      .limit(1);
    // Budget row may not exist until the first send; compute a preview.
    const effective = budget?.effectiveBudget
      ?? (await getOrCreateCycleBudget(db, ctx.user.id, cycle)).effectiveBudget;
    const peopleThisCycle = budget?.uniqueRecipients ?? 0;
    const streakCycles = budget?.streakCycles ?? 0;

    // Received last cycle (distinct senders), by cycleNumber - 1.
    const [prevCycle] = await db
      .select({ id: gratitudeCycles.id })
      .from(gratitudeCycles)
      .where(eq(gratitudeCycles.cycleNumber, cycle.cycleNumber - 1))
      .limit(1);
    let peopleLastCycle = 0;
    if (prevCycle) {
      const [row] = await db
        .select({ n: sql<number>`COUNT(DISTINCT ${gratitudeLog.senderId})` })
        .from(gratitudeLog)
        .where(and(eq(gratitudeLog.recipientId, ctx.user.id), eq(gratitudeLog.cycleId, prevCycle.id)));
      peopleLastCycle = Number(row?.n ?? 0);
    }

    const [lifetime] = await db
      .select({
        people: sql<number>`COUNT(DISTINCT ${gratitudeLog.senderId})`,
        times: sql<number>`COUNT(*)`,
      })
      .from(gratitudeLog)
      .where(eq(gratitudeLog.recipientId, ctx.user.id));

    // Received-per-cycle trend for the sparkline (last 8 tagged cycles).
    const trend = await db
      .select({
        cycleNumber: gratitudeCycles.cycleNumber,
        people: sql<number>`COUNT(DISTINCT ${gratitudeLog.senderId})`,
      })
      .from(gratitudeLog)
      .innerJoin(gratitudeCycles, eq(gratitudeLog.cycleId, gratitudeCycles.id))
      .where(eq(gratitudeLog.recipientId, ctx.user.id))
      .groupBy(gratitudeCycles.cycleNumber)
      .orderBy(desc(gratitudeCycles.cycleNumber))
      .limit(8);

    // $ReGen earned from gratitude = positive ledger credits with the
    // gratitude source (covers legacy flat-5 credits AND cycle distributions).
    const [earned] = await db
      .select({ total: sql<number>`COALESCE(SUM(${userTokenLedger.amount}), 0)` })
      .from(userTokenLedger)
      .where(and(
        eq(userTokenLedger.userId, ctx.user.id),
        eq(userTokenLedger.tokenType, "regen"),
        eq(userTokenLedger.source, "gratitude_received"),
        gte(userTokenLedger.amount, 0),
      ));
    const earnedFromGratitude = Number(earned?.total ?? 0);

    // Whether a claim would actually succeed right now: the live Hypha gate
    // checks TOTAL private $ReGen (all sources), not just gratitude-earned.
    // So surface the button whenever a claim is genuinely available, even if
    // the gratitude ring hasn't filled (e.g. quests already pushed them over).
    const [profileRow] = await db
      .select({ regenPrivate: playerProfiles.regenPrivate })
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, ctx.user.id))
      .limit(1);
    const totalPrivateRegen = Number(profileRow?.regenPrivate ?? 0);
    const gateVars = await getGameVariables(["governance.claim_threshold_regen"]);
    const liveGate = gateVars["governance.claim_threshold_regen"] ?? vars.claimThreshold;
    const canClaimNow = totalPrivateRegen >= liveGate;

    return {
      cycle: {
        number: cycle.cycleNumber,
        endsAt: cycle.endsAt,
        daysRemaining: daysRemainingInCycle(now),
        moonPhase: moonPhase(now),
      },
      sends: {
        peopleThisCycle,
        effectiveBudget: effective,
        fullPowerThreshold: vars.fullPowerThreshold,
        fullPowerRemaining: Math.max(0, vars.fullPowerThreshold - peopleThisCycle),
        perPersonShare: Math.round(computePerPersonShare(effective, Math.max(peopleThisCycle, 1))),
      },
      received: {
        peopleLastCycle,
        lifetimePeople: Number(lifetime?.people ?? 0),
        lifetimeTimes: Number(lifetime?.times ?? 0),
        trend: trend.reverse().map((t: any) => ({ cycleNumber: t.cycleNumber, people: Number(t.people) })),
      },
      streak: {
        cycles: streakCycles,
        bonusPct: Math.round(Math.min(streakCycles * vars.streakBonusPerCycle, vars.streakBonusMax) * 100),
      },
      regen: {
        earnedFromGratitude,
        claimThreshold: vars.claimThreshold,
        claimEligible: earnedFromGratitude >= vars.claimThreshold,
        moreToClaim: Math.max(0, vars.claimThreshold - earnedFromGratitude),
        // True when a Hypha claim would actually go through right now.
        canClaimNow,
      },
    };
  }),

  // Deterministic theme summary for the shareable card: what people keep
  // thanking this user for, as recurring themes (never quotes, never sender
  // names). No LLM — see shared/gratitude-themes.ts. Private to the user;
  // the public/shareable render goes through GET /api/og?type=gratitude.
  myThemes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { themes: [], blurb: themeBlurb([]), peopleCount: 0, messageCount: 0 };

    const rows = await db
      .select({ senderId: gratitudeLog.senderId, message: gratitudeLog.message })
      .from(gratitudeLog)
      .where(eq(gratitudeLog.recipientId, ctx.user.id))
      .orderBy(desc(gratitudeLog.id))
      .limit(500);

    const themes = extractThemes(rows.map((r: any) => r.message));
    const peopleCount = new Set(rows.map((r: any) => r.senderId)).size;
    return {
      themes,
      blurb: themeBlurb(themes),
      peopleCount,
      messageCount: rows.length,
    };
  }),

  // Paginated journal, received or sent. Private to the signed-in user.
  myJournal: protectedProcedure
    .input(z.object({
      direction: z.enum(["received", "sent"]),
      cursor: z.number().int().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { entries: [], nextCursor: null };

      const mine = input.direction === "received"
        ? eq(gratitudeLog.recipientId, ctx.user.id)
        : eq(gratitudeLog.senderId, ctx.user.id);
      const otherIdCol = input.direction === "received" ? gratitudeLog.senderId : gratitudeLog.recipientId;

      const rows = await db
        .select({
          id: gratitudeLog.id,
          message: gratitudeLog.message,
          sourceType: gratitudeLog.sourceType,
          sourceId: gratitudeLog.sourceId,
          createdAt: gratitudeLog.createdAt,
          otherUserId: otherIdCol,
          otherHandle: users.handle,
          otherName: users.name,
          otherDisplayName: playerProfiles.displayName,
          otherAvatarUrl: playerProfiles.avatarUrl,
        })
        .from(gratitudeLog)
        .innerJoin(users, eq(users.id, otherIdCol))
        .leftJoin(playerProfiles, eq(playerProfiles.userId, otherIdCol))
        .where(input.cursor ? and(mine, lt(gratitudeLog.id, input.cursor)) : mine)
        .orderBy(desc(gratitudeLog.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const entries = hasMore ? rows.slice(0, input.limit) : rows;
      return {
        entries,
        nextCursor: hasMore ? entries[entries.length - 1]!.id : null,
      };
    }),

  // Public wall for someone else's profile: received messages only.
  // Visibility rule (spec §15): kind messages are public, totals and
  // $ReGen stay private — so this returns no counts and no aggregates.
  publicJournal: protectedProcedure
    .input(z.object({
      handle: z.string().min(3).max(40),
      cursor: z.number().int().optional(),
      limit: z.number().int().min(1).max(30).default(15),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { entries: [], nextCursor: null };
      const target = await getUserByHandle(input.handle);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "No one with that handle" });

      const base = eq(gratitudeLog.recipientId, target.id);
      const rows = await db
        .select({
          id: gratitudeLog.id,
          message: gratitudeLog.message,
          createdAt: gratitudeLog.createdAt,
          senderHandle: users.handle,
          senderName: users.name,
          senderDisplayName: playerProfiles.displayName,
          senderAvatarUrl: playerProfiles.avatarUrl,
        })
        .from(gratitudeLog)
        .innerJoin(users, eq(users.id, gratitudeLog.senderId))
        .leftJoin(playerProfiles, eq(playerProfiles.userId, gratitudeLog.senderId))
        .where(input.cursor ? and(base, lt(gratitudeLog.id, input.cursor)) : base)
        .orderBy(desc(gratitudeLog.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const entries = hasMore ? rows.slice(0, input.limit) : rows;
      return { entries, nextCursor: hasMore ? entries[entries.length - 1]!.id : null };
    }),

  // Admin/cron: close due cycles and distribute the pool.
  closeCycles: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return closeDueCycles(db);
  }),

  // Search users by handle, name, or display name. Used by the command palette People group.
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(2).max(40) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = `%${input.query.toLowerCase()}%`;

      const rows = await db
        .select({
          id: users.id,
          handle: users.handle,
          name: users.name,
          displayName: playerProfiles.displayName,
          avatarUrl: playerProfiles.avatarUrl,
        })
        .from(users)
        .leftJoin(playerProfiles, eq(playerProfiles.userId, users.id))
        .where(
          sql`LOWER(${users.handle}) LIKE ${q} OR LOWER(${users.name}) LIKE ${q} OR LOWER(${playerProfiles.displayName}) LIKE ${q}`
        )
        .limit(10);
      return rows;
    }),
});
