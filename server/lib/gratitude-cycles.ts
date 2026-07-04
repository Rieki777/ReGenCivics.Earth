/**
 * Gratitude lunar-cycle engine.
 *
 * Implements the proportional-budget model from GRATITUDE_SYSTEM_SPEC.md:
 * each player gets a per-cycle budget (base x tier multiplier x streak
 * bonus) that splits equally across the unique people they acknowledge.
 * At cycle close, recipients earn $ReGen from a fixed pool proportional
 * to the weighted gratitude they received.
 *
 * Pure math lives in the exported compute* functions (unit-tested without
 * a DB). Orchestration functions take a drizzle instance.
 */

import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import {
  gratitudeCycles,
  gratitudeCycleBudgets,
  gratitudeDistributions,
  gratitudeLog,
  playerProfiles,
  type GratitudeCycle,
  type GratitudeCycleBudget,
} from "../../drizzle/schema";
import { cycleBoundsFor } from "../../shared/lunar";
import { getGameVariables } from "../game";

/* ─── Pure math (unit-tested in gratitudeCycles.test.ts) ───────────────── */

export interface BudgetInputs {
  baseBudget: number;       // gratitude.base_budget (default 100)
  multiplier: number;       // gratitude.multiplier.<tier>
  streakCycles: number;     // consecutive full-power cycles before this one
  streakBonusPerCycle: number; // gratitude.streak_bonus_per_cycle (0.03)
  streakBonusMax: number;   // gratitude.streak_bonus_max (0.30)
}

/** Effective budget = base x multiplier x (1 + capped streak bonus). */
export function computeEffectiveBudget(inputs: BudgetInputs): { streakBonus: number; effectiveBudget: number } {
  const streakBonus = Math.min(
    inputs.streakCycles * inputs.streakBonusPerCycle,
    inputs.streakBonusMax,
  );
  return {
    streakBonus,
    effectiveBudget: Math.round(inputs.baseBudget * inputs.multiplier * (1 + streakBonus)),
  };
}

/** Per-person share when a budget splits across n unique recipients. */
export function computePerPersonShare(effectiveBudget: number, uniqueRecipients: number): number {
  if (uniqueRecipients <= 0) return effectiveBudget;
  return effectiveBudget / uniqueRecipients;
}

/**
 * Pool distribution: each recipient's exact share of the cycle pool,
 * proportional to weighted gratitude received. Whole-token credit amounts
 * are floored (user_token_ledger.amount is INT); remainders stay in the
 * pool rather than minting extra tokens.
 */
export function computePoolShares(
  weightByUser: Map<number, number>,
  poolPerCycle: number,
): { totalWeight: number; shares: Array<{ userId: number; weightReceived: number; poolShare: number; creditedAmount: number }> } {
  let totalWeight = 0;
  for (const w of weightByUser.values()) totalWeight += w;
  if (totalWeight <= 0) return { totalWeight: 0, shares: [] };

  const shares = [...weightByUser.entries()].map(([userId, weightReceived]) => {
    const poolShare = (weightReceived / totalWeight) * poolPerCycle;
    return { userId, weightReceived, poolShare, creditedAmount: Math.floor(poolShare) };
  });
  return { totalWeight, shares };
}

/* ─── Game variables ───────────────────────────────────────────────────── */

const TIER_MULTIPLIER_DEFAULTS: Record<string, number> = {
  explorer: 1.0,
  co_creator: 2.0,
  steward: 3.0,
  sage: 5.0,
};

export async function getGratitudeVars() {
  const vars = await getGameVariables([
    "gratitude.base_budget",
    "gratitude.full_power_threshold",
    "gratitude.streak_bonus_per_cycle",
    "gratitude.streak_bonus_max",
    "gratitude.multiplier.explorer",
    "gratitude.multiplier.co_creator",
    "gratitude.multiplier.steward",
    "gratitude.multiplier.sage",
    "gratitude.regen_distribution.pool_per_cycle",
    "gratitude.regen_distribution.claim_threshold",
  ]);
  return {
    baseBudget: vars["gratitude.base_budget"] ?? 100,
    fullPowerThreshold: vars["gratitude.full_power_threshold"] ?? 10,
    streakBonusPerCycle: vars["gratitude.streak_bonus_per_cycle"] ?? 0.03,
    streakBonusMax: vars["gratitude.streak_bonus_max"] ?? 0.3,
    multipliers: {
      explorer: vars["gratitude.multiplier.explorer"] ?? TIER_MULTIPLIER_DEFAULTS.explorer,
      co_creator: vars["gratitude.multiplier.co_creator"] ?? TIER_MULTIPLIER_DEFAULTS.co_creator,
      steward: vars["gratitude.multiplier.steward"] ?? TIER_MULTIPLIER_DEFAULTS.steward,
      sage: vars["gratitude.multiplier.sage"] ?? TIER_MULTIPLIER_DEFAULTS.sage,
    } as Record<string, number>,
    poolPerCycle: vars["gratitude.regen_distribution.pool_per_cycle"] ?? 10000,
    claimThreshold: vars["gratitude.regen_distribution.claim_threshold"] ?? 333,
  };
}

/* ─── Cycle lifecycle ──────────────────────────────────────────────────── */

type Db = any; // drizzle instance; typed loosely to match existing route style

/** The open cycle containing now, creating it from lunar bounds if absent. */
export async function getOrCreateCurrentCycle(db: Db): Promise<GratitudeCycle> {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(gratitudeCycles)
    .where(and(lte(gratitudeCycles.startsAt, now), gt(gratitudeCycles.endsAt, now)))
    .limit(1);
  if (existing) return existing;

  const bounds = cycleBoundsFor(now);
  const { poolPerCycle } = await getGratitudeVars();
  // Race-safe: uniq_cycle_number means a concurrent open just no-ops.
  await db
    .insert(gratitudeCycles)
    .values({
      cycleNumber: bounds.cycleNumber,
      startsAt: bounds.startsAt,
      endsAt: bounds.endsAt,
      poolPerCycle,
      status: "open",
    })
    .onDuplicateKeyUpdate({ set: { cycleNumber: sql`cycleNumber` } });

  const [created] = await db
    .select()
    .from(gratitudeCycles)
    .where(eq(gratitudeCycles.cycleNumber, bounds.cycleNumber))
    .limit(1);
  return created;
}

/**
 * The user's budget row for a cycle, created lazily on first touch.
 * Streak carries forward from the previous cycle's budget row: hitting the
 * full-power threshold there extends the streak, missing it resets to 0.
 */
export async function getOrCreateCycleBudget(db: Db, userId: number, cycle: GratitudeCycle): Promise<GratitudeCycleBudget> {
  const [existing] = await db
    .select()
    .from(gratitudeCycleBudgets)
    .where(and(eq(gratitudeCycleBudgets.userId, userId), eq(gratitudeCycleBudgets.cycleId, cycle.id)))
    .limit(1);
  if (existing) return existing;

  const vars = await getGratitudeVars();

  const [profile] = await db
    .select({ citizenshipTier: playerProfiles.citizenshipTier })
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1);
  const tier: string = profile?.citizenshipTier ?? "explorer";
  const multiplier = vars.multipliers[tier] ?? 1.0;

  // Previous cycle's row (by cycleNumber - 1) decides the streak.
  const [prevCycle] = await db
    .select({ id: gratitudeCycles.id })
    .from(gratitudeCycles)
    .where(eq(gratitudeCycles.cycleNumber, cycle.cycleNumber - 1))
    .limit(1);
  let streakCycles = 0;
  if (prevCycle) {
    const [prevBudget] = await db
      .select()
      .from(gratitudeCycleBudgets)
      .where(and(eq(gratitudeCycleBudgets.userId, userId), eq(gratitudeCycleBudgets.cycleId, prevCycle.id)))
      .limit(1);
    if (prevBudget && prevBudget.uniqueRecipients >= vars.fullPowerThreshold) {
      streakCycles = prevBudget.streakCycles + 1;
    }
  }

  const { streakBonus, effectiveBudget } = computeEffectiveBudget({
    baseBudget: vars.baseBudget,
    multiplier,
    streakCycles,
    streakBonusPerCycle: vars.streakBonusPerCycle,
    streakBonusMax: vars.streakBonusMax,
  });

  await db
    .insert(gratitudeCycleBudgets)
    .values({
      userId,
      cycleId: cycle.id,
      tier,
      baseBudget: vars.baseBudget,
      multiplier: multiplier.toFixed(2),
      streakCycles,
      streakBonus: streakBonus.toFixed(3),
      effectiveBudget,
      uniqueRecipients: 0,
    })
    .onDuplicateKeyUpdate({ set: { userId: sql`userId` } });

  const [created] = await db
    .select()
    .from(gratitudeCycleBudgets)
    .where(and(eq(gratitudeCycleBudgets.userId, userId), eq(gratitudeCycleBudgets.cycleId, cycle.id)))
    .limit(1);
  return created;
}

/**
 * Close every open cycle whose end has passed: write per-acknowledgment
 * weights, distribute the $ReGen pool to recipients, then open the current
 * cycle. Idempotent (status guard + uniq_dist + ledger idempotencyKey);
 * safe to run from the nightly batch or an admin trigger.
 */
export async function closeDueCycles(db: Db): Promise<{ closed: number; credited: number }> {
  const now = new Date();
  const due = await db
    .select()
    .from(gratitudeCycles)
    .where(and(eq(gratitudeCycles.status, "open"), lte(gratitudeCycles.endsAt, now)));

  let credited = 0;
  for (const cycle of due) {
    credited += await closeCycle(db, cycle);
  }
  // Make sure the current lunation is open for new sends.
  await getOrCreateCurrentCycle(db);
  return { closed: due.length, credited };
}

async function closeCycle(db: Db, cycle: GratitudeCycle): Promise<number> {
  // Status guard: only one runner transitions open -> distributing.
  const result: any = await db
    .update(gratitudeCycles)
    .set({ status: "distributing" })
    .where(and(eq(gratitudeCycles.id, cycle.id), eq(gratitudeCycles.status, "open")));
  const changed = result?.[0]?.affectedRows ?? result?.affectedRows ?? result?.rowsAffected ?? 1;
  if (!changed) return 0;

  // 1. Per-sender: split effective budget across unique recipients and
  //    stamp the share onto each acknowledgment.
  const senders: Array<{ senderId: number; uniqueRecipients: number }> = await db
    .select({
      senderId: gratitudeLog.senderId,
      uniqueRecipients: sql<number>`COUNT(DISTINCT ${gratitudeLog.recipientId})`,
    })
    .from(gratitudeLog)
    .where(eq(gratitudeLog.cycleId, cycle.id))
    .groupBy(gratitudeLog.senderId);

  for (const s of senders) {
    const budget = await getOrCreateCycleBudget(db, s.senderId, cycle);
    const share = computePerPersonShare(budget.effectiveBudget, s.uniqueRecipients);
    await db
      .update(gratitudeLog)
      .set({ weight: share })
      .where(and(eq(gratitudeLog.cycleId, cycle.id), eq(gratitudeLog.senderId, s.senderId), isNull(gratitudeLog.weight)));
  }

  // 2. Per-recipient weighted totals -> pool shares.
  const received: Array<{ recipientId: number; w: number }> = await db
    .select({
      recipientId: gratitudeLog.recipientId,
      w: sql<number>`COALESCE(SUM(${gratitudeLog.weight}), 0)`,
    })
    .from(gratitudeLog)
    .where(eq(gratitudeLog.cycleId, cycle.id))
    .groupBy(gratitudeLog.recipientId);

  const weightByUser = new Map<number, number>();
  for (const r of received) weightByUser.set(r.recipientId, Number(r.w));
  const { totalWeight, shares } = computePoolShares(weightByUser, cycle.poolPerCycle);

  // 3. Credit recipients. uniq_dist + idempotencyKey make retries no-ops.
  let creditedUsers = 0;
  const { creditPrivateTokens } = await import("../db");
  for (const share of shares) {
    try {
      await db.insert(gratitudeDistributions).values({
        cycleId: cycle.id,
        userId: share.userId,
        weightReceived: share.weightReceived,
        poolShare: share.poolShare.toFixed(6),
        creditedAmount: share.creditedAmount,
      });
    } catch {
      continue; // uniq_dist hit: this recipient was already credited
    }
    if (share.creditedAmount > 0) {
      await creditPrivateTokens({
        userId: share.userId,
        tokenType: "regen",
        amount: share.creditedAmount,
        source: "gratitude_received",
        sourceRef: `gratitude_cycle:${cycle.id}`,
        description: `Gratitude cycle ${cycle.cycleNumber} distribution`,
        idempotencyKey: `gratitude_dist:${cycle.id}:${share.userId}`,
      });
      creditedUsers++;
    }
  }

  await db
    .update(gratitudeCycles)
    .set({ status: "closed", distributedAt: new Date(), totalWeight })
    .where(eq(gratitudeCycles.id, cycle.id));
  return creditedUsers;
}
