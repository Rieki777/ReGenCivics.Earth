/**
 * Assembly tRPC router (ASSEMBLY_PAGE_SPEC.md section 11).
 *
 * The Game's community-governed pipeline: forming proposals carry the Signal
 * (one adjustable -3..+3 score per signed-in member), an AI synthesis cache,
 * and lifecycle lanes. Reads are public; writes require sign-in.
 *
 * Signals are aggregate-only by locked decision 4: individual scores are
 * never returned to anyone, only sums, averages, counts, and histograms.
 * "What would move you" notes are stored on the signal row for negative
 * scores and surface unattributed through the synthesis.
 *
 * The tier gate reads governance.signal_min_tier on every call so flipping
 * it later needs no deploy (locked decision 2).
 */
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, sql, inArray } from "drizzle-orm";
import { proposals, proposalSignals, proposalSynthesis } from "../../drizzle/schema";

// ─── Shared helpers ────────────────────────────────────────────────────────

async function readGameVariable(key: string, fallback: number): Promise<number> {
  const db = await getDb();
  if (!db) return fallback;
  try {
    const [rows] = await db.execute(
      sql`SELECT value FROM game_variables WHERE \`key\` = ${key} LIMIT 1`
    );
    const v = Number((rows as any)?.[0]?.value);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

interface SignalAggregate {
  netPoints: number;
  avg: number | null;
  count: number;
  histogram: number[]; // 7 buckets, index 0 = score -3 ... index 6 = score +3
}

const EMPTY_AGGREGATE: SignalAggregate = { netPoints: 0, avg: null, count: 0, histogram: [0, 0, 0, 0, 0, 0, 0] };

/** Aggregate signals for a set of proposals. Never exposes an individual row. */
async function signalAggregates(proposalIds: number[]): Promise<Map<number, SignalAggregate>> {
  const out = new Map<number, SignalAggregate>();
  if (proposalIds.length === 0) return out;
  const db = await getDb();
  if (!db) return out;
  const rows = await db
    .select({
      proposalId: proposalSignals.proposalId,
      score: proposalSignals.score,
      cnt: sql<number>`COUNT(*)`,
    })
    .from(proposalSignals)
    .where(inArray(proposalSignals.proposalId, proposalIds))
    .groupBy(proposalSignals.proposalId, proposalSignals.score);
  for (const r of rows) {
    const agg = out.get(r.proposalId) ?? { netPoints: 0, avg: null, count: 0, histogram: [0, 0, 0, 0, 0, 0, 0] };
    const score = Number(r.score);
    const cnt = Number(r.cnt);
    agg.netPoints += score * cnt;
    agg.count += cnt;
    agg.histogram[score + 3] = cnt;
    out.set(r.proposalId, agg);
  }
  for (const agg of out.values()) {
    agg.avg = agg.count > 0 ? agg.netPoints / agg.count : null;
  }
  return out;
}

export const assemblyRouter = router({
  /** Forming proposals with signal aggregates, sorted by net points.
   * Public read; mySignal is included when a session exists. */
  forming: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(proposals)
      .where(eq(proposals.status, "signaling"))
      .limit(100);
    const ids = rows.map((p) => p.id);
    const aggs = await signalAggregates(ids);

    // Synthesis freshness (used for the stale-signal badge from Phase 3 on)
    const synthRows = ids.length
      ? await db
          .select({ proposalId: proposalSynthesis.proposalId, lastSyncedAt: proposalSynthesis.lastSyncedAt })
          .from(proposalSynthesis)
          .where(inArray(proposalSynthesis.proposalId, ids))
      : [];
    const synthMap = new Map(synthRows.map((s) => [s.proposalId, s.lastSyncedAt]));

    // The caller's own signals, when signed in (aggregate-only rule applies to
    // everyone else's; your own score is yours to see and move).
    const myMap = new Map<number, { score: number; updatedAt: Date }>();
    const userId = (ctx as any).user?.id as number | undefined;
    if (userId && ids.length) {
      const mine = await db
        .select({ proposalId: proposalSignals.proposalId, score: proposalSignals.score, updatedAt: proposalSignals.updatedAt })
        .from(proposalSignals)
        .where(sql`${proposalSignals.userId} = ${userId} AND ${inArray(proposalSignals.proposalId, ids)}`);
      for (const m of mine) myMap.set(m.proposalId, { score: Number(m.score), updatedAt: m.updatedAt as any });
    }

    const [advancePoints, advanceAvg] = await Promise.all([
      readGameVariable("governance.signal_advance_points", 12),
      readGameVariable("governance.signal_advance_avg", 1.0),
    ]);

    const cards = rows.map((p) => {
      const agg = aggs.get(p.id) ?? EMPTY_AGGREGATE;
      const mine = myMap.get(p.id) ?? null;
      const lastSyncedAt = synthMap.get(p.id) ?? null;
      const mySignalStale = !!(
        mine && lastSyncedAt && new Date(lastSyncedAt as any).getTime() > new Date(mine.updatedAt as any).getTime()
      );
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        forumThreadId: p.forumThreadId,
        createdAt: p.createdAt,
        signal: {
          netPoints: agg.netPoints,
          avg: agg.avg,
          count: agg.count,
          histogram: agg.histogram,
          mySignal: mine ? mine.score : null,
          mySignalStale,
        },
        gates: {
          points: { met: agg.netPoints >= advancePoints, value: agg.netPoints, needed: advancePoints },
          avg: { met: agg.avg !== null && agg.avg >= advanceAvg, value: agg.avg, needed: advanceAvg },
        },
      };
    });

    cards.sort((a, b) => b.signal.netPoints - a.signal.netPoints);
    return cards;
  }),

  /** Set (or move) my signal on a proposal. Upserts on (proposalId, userId). */
  signal: protectedProcedure
    .input(
      z.object({
        proposalId: z.number().int().positive(),
        score: z.number().int().min(-3).max(3),
        moveNote: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Tier gate, read live so it is a config flip (0 = any signed-in member)
      const minTier = await readGameVariable("governance.signal_min_tier", 0);
      if (minTier > 0) {
        const [profileRows] = await db.execute(
          sql`SELECT citizenshipTier FROM player_profiles WHERE userId = ${ctx.user.id} LIMIT 1`
        );
        const userTier = Number((profileRows as any)?.[0]?.citizenshipTier ?? 0);
        if (userTier < minTier) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You need a higher citizenship tier to signal on proposals." });
        }
      }

      const target = await db.select({ id: proposals.id, status: proposals.status }).from(proposals).where(eq(proposals.id, input.proposalId)).limit(1);
      if (target.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
      if (target[0].status !== "signaling") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Signals are open while a proposal is forming." });
      }

      // moveNote is only meaningful for negative scores; cleared otherwise
      const moveNote = input.score < 0 ? (input.moveNote?.trim() || null) : null;

      await db.execute(
        sql`INSERT INTO proposal_signals (proposalId, userId, score, moveNote)
            VALUES (${input.proposalId}, ${ctx.user.id}, ${input.score}, ${moveNote})
            ON DUPLICATE KEY UPDATE score = VALUES(score), moveNote = VALUES(moveNote)`
      );

      const aggs = await signalAggregates([input.proposalId]);
      return {
        ok: true,
        aggregates: aggs.get(input.proposalId) ?? EMPTY_AGGREGATE,
        mySignal: input.score,
      };
    }),

  /** My signal on one proposal (score + when I set it), or null. */
  mySignal: protectedProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ score: proposalSignals.score, updatedAt: proposalSignals.updatedAt })
        .from(proposalSignals)
        .where(sql`${proposalSignals.proposalId} = ${input.proposalId} AND ${proposalSignals.userId} = ${ctx.user.id}`)
        .limit(1);
      return rows.length ? { score: Number(rows[0].score), updatedAt: rows[0].updatedAt } : null;
    }),
});
