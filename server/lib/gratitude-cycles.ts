/**
 * Gratitude lunar-cycle engine.
 *
 * Implements the proportional-budget model from GRATITUDE_SYSTEM_SPEC.md:
 * each player gets a per-cycle budget (base x tier multiplier x streak
 * bonus) that splits across the unique people they acknowledge, divided by
 * AT LEAST the full-power threshold. Acknowledging fewer people than the
 * threshold forfeits the remainder: use it or lose it.
 *
 * At cycle close, recipients earn $ReGen from a fixed pool proportional to
 * the weighted gratitude they received, capped per person per cycle. Pool
 * money above that cap is never minted, which is what stops a small
 * colluding group from draining a whole cycle's pool.
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

/**
 * Per-person share when a budget splits across n unique recipients.
 *
 * The divisor is max(n, fullPowerThreshold), so the first `threshold`
 * acknowledgments each carry a full share and acknowledging fewer than that
 * forfeits the rest of the budget rather than concentrating it. That is the
 * "use it or lose it" rule; dividing by n alone made recipient count change
 * only the concentration, never the total a sender emitted.
 *
 * Acknowledging nobody emits nothing.
 */
export function computePerPersonShare(
  effectiveBudget: number,
  uniqueRecipients: number,
  fullPowerThreshold: number,
): number {
  if (uniqueRecipients <= 0) return 0;
  return effectiveBudget / Math.max(uniqueRecipients, Math.max(1, fullPowerThreshold));
}

/**
 * Pool distribution: each recipient's exact share of the cycle pool,
 * proportional to weighted gratitude received.
 *
 * Two things reduce what is actually minted, both deliberately:
 *
 *  - `maxPayoutPerPerson` caps what any one recipient can be credited in a
 *    cycle. With a 10,000 pool and a 1,000 cap, a two-person cycle mints
 *    2,000, not 10,000. This is the anti-collusion floor: a small group
 *    acknowledging only each other cannot capture the pool.
 *  - Credits are floored, because user_token_ledger.amount is an INT.
 *
 * In both cases the difference is never minted and does not roll forward.
 * The pool is a ceiling on issuance, not a promise to issue.
 */
export function computePoolShares(
  weightByUser: Map<number, number>,
  poolPerCycle: number,
  maxPayoutPerPerson: number,
): {
  totalWeight: number;
  distributed: number;
  shares: Array<{ userId: number; weightReceived: number; poolShare: number; creditedAmount: number; capped: boolean }>;
} {
  let totalWeight = 0;
  for (const w of weightByUser.values()) totalWeight += w;
  if (totalWeight <= 0) return { totalWeight: 0, distributed: 0, shares: [] };

  const cap = maxPayoutPerPerson > 0 ? maxPayoutPerPerson : Infinity;
  let distributed = 0;

  const shares = [...weightByUser.entries()].map(([userId, weightReceived]) => {
    const poolShare = (weightReceived / totalWeight) * poolPerCycle;
    const creditedAmount = Math.min(Math.floor(poolShare), cap);
    distributed += creditedAmount;
    return { userId, weightReceived, poolShare, creditedAmount, capped: Math.floor(poolShare) > cap };
  });
  return { totalWeight, distributed, shares };
}

/* ─── Game variables ───────────────────────────────────────────────────── */

const TIER_MULTIPLIER_DEFAULTS: Record<string, number> = {
  explorer: 1.0,
  co_creator: 2.0,
  steward: 3.0,
  sage: 5.0,
};

export async function getGratitudeVars() {
  // Canonical keys are the ones seeded in the DB: budget vars in 0173, pool +
  // claim in 0166. The claim threshold shown on the tab aligns with the live
  // Hypha gate (governance.claim_threshold_regen = 1000). The budget model
  // uses gratitude.budget_multiplier.* — NOT gratitude.multiplier.* (which
  // drives the separate trust-graph bonus at different values).
  const vars = await getGameVariables([
    "gratitude.base_budget",
    "gratitude.full_power_threshold",
    "gratitude.streak_bonus_per_cycle",
    "gratitude.streak_bonus_max",
    "gratitude.budget_multiplier.explorer",
    "gratitude.budget_multiplier.co_creator",
    "gratitude.budget_multiplier.steward",
    "gratitude.budget_multiplier.sage",
    "gratitude.pool_per_cycle",
    "gratitude.max_payout_per_person",
    "gratitude.claim_threshold",
  ]);
  return {
    baseBudget: vars["gratitude.base_budget"] ?? 100,
    fullPowerThreshold: vars["gratitude.full_power_threshold"] ?? 10,
    streakBonusPerCycle: vars["gratitude.streak_bonus_per_cycle"] ?? 0.03,
    streakBonusMax: vars["gratitude.streak_bonus_max"] ?? 0.3,
    multipliers: {
      explorer: vars["gratitude.budget_multiplier.explorer"] ?? TIER_MULTIPLIER_DEFAULTS.explorer,
      co_creator: vars["gratitude.budget_multiplier.co_creator"] ?? TIER_MULTIPLIER_DEFAULTS.co_creator,
      steward: vars["gratitude.budget_multiplier.steward"] ?? TIER_MULTIPLIER_DEFAULTS.steward,
      sage: vars["gratitude.budget_multiplier.sage"] ?? TIER_MULTIPLIER_DEFAULTS.sage,
    } as Record<string, number>,
    poolPerCycle: vars["gratitude.pool_per_cycle"] ?? 10000,
    // Anti-collusion ceiling: the most $ReGen any one person can be credited
    // from a single cycle's pool. 0 disables the cap.
    maxPayoutPerPerson: vars["gratitude.max_payout_per_person"] ?? 1000,
    claimThreshold: vars["gratitude.claim_threshold"] ?? 1000,
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

  // Past this point the cycle is latched to 'distributing', and closeDueCycles
  // only ever selects 'open'. A throw here therefore used to make the cycle
  // UNREACHABLE: its pool was never distributed, some recipients were paid and
  // the rest never were, and the hourly cron reported {closed: 0} forever after
  // so the alarm vanished within the hour. Nothing in the codebase wrote 'open'
  // back, so only hand-written SQL could recover it.
  //
  // Handing it back is safe precisely because of the guarantees this function
  // already relies on: uniq_dist stops a second distribution row and the ledger
  // idempotencyKey stops a second credit, so a retry re-does only what did not
  // finish. The error still propagates, so the caller still reports it.
  try {
    return await distributeCycle(db, cycle);
  } catch (err) {
    await db
      .update(gratitudeCycles)
      .set({ status: "open" })
      .where(and(eq(gratitudeCycles.id, cycle.id), eq(gratitudeCycles.status, "distributing")))
      .catch(() => { /* the retry is best-effort; the throw below is the alarm */ });
    throw err;
  }
}

/** The body of a close, separated so closeCycle can un-latch a failed run. */
async function distributeCycle(db: Db, cycle: GratitudeCycle): Promise<number> {
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

  const vars = await getGratitudeVars();

  for (const s of senders) {
    const budget = await getOrCreateCycleBudget(db, s.senderId, cycle);
    const share = computePerPersonShare(budget.effectiveBudget, s.uniqueRecipients, vars.fullPowerThreshold);
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
  const { totalWeight, distributed, shares } = computePoolShares(
    weightByUser,
    cycle.poolPerCycle,
    vars.maxPayoutPerPerson,
  );

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
    } catch (err: any) {
      // ONLY a duplicate is expected here, and it means a previous attempt
      // already wrote this row. Everything else (a dropped connection, a bad
      // value, a full disk) used to be swallowed identically: the recipient
      // lost their payout, the loop moved on, and the cycle still closed 'ok'.
      const duplicate = err?.code === "ER_DUP_ENTRY" || err?.errno === 1062;
      if (!duplicate) throw err;
      // Deliberately NOT `continue`. The earlier attempt may have inserted the
      // row and then died before crediting, so skipping the credit here is
      // what left a recipient permanently unpaid. The credit is idempotent by
      // key, so re-running it either pays them or does nothing.
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
    .set({ status: "closed", distributedAt: new Date(), totalWeight, distributedTotal: distributed })
    .where(eq(gratitudeCycles.id, cycle.id));
  return creditedUsers;
}

/* ─── The builders' pool recycling its platform share back in (R64) ────── */

/**
 * Put what ReGen Civics' own modules earned into the ReGen Civics gratitude
 * pool, where the community gives it out.
 *
 * R64, the founder: "regen civics built modules pay out regen civics but have
 * it go to the regen civics gratitude pool as the Game tokens $ReGen ... As the
 * revenue regen civics core team is getting from regen-civics is then
 * distributed to regen civics gratitude system to give out!"
 *
 * ── WHERE IT LANDS, AND WHY THAT PLACE ──────────────────────────────────────
 *
 * On `poolPerCycle` of the gratitude cycle that is OPEN right now, which is the
 * number `distributeCycle` splits across everybody who was thanked when that
 * cycle closes. So the platform's share reaches the community the same way
 * every other $ReGen in the gratitude system does, weighted by recognition,
 * capped per person, and credited through `creditPrivateTokens`. Nothing here
 * mints and nothing here picks a recipient.
 *
 * The open cycle rather than the next one, because the next one does not exist
 * yet and a row nobody has created cannot be added to. It moves a number a
 * member may already have seen, which is why the amount is recorded as its own
 * row rather than folded silently into a total.
 *
 * ── IDEMPOTENT, ON THE POOL CYCLE ───────────────────────────────────────────
 *
 * `modulePoolRecycles.poolCycleNumber` is unique, so a re-run of a settlement
 * that died halfway adds nothing a second time. This matters more than it looks
 * like it does: the pool statement is written before this runs, so any retry
 * path reaches this line with the statement already in place.
 *
 * Returns an outcome word rather than a boolean, because "there was nothing to
 * recycle" and "this was already done" are different facts and a job report
 * that showed both as `false` would hide a repeat.
 */
export async function recycleIntoGratitudePool(
  db: Db,
  input: { cycleNumber: number; amount: number },
): Promise<{ outcome: "recycled" | "nothing-to-recycle" | "already-recycled" | "no-open-cycle"; amount: number; gratitudeCycleNumber: number | null }> {
  const amount = Math.max(0, Math.floor(input.amount));
  if (amount <= 0) return { outcome: "nothing-to-recycle", amount: 0, gratitudeCycleNumber: null };

  const cycle = await getOrCreateCurrentCycle(db);
  if (!cycle) return { outcome: "no-open-cycle", amount, gratitudeCycleNumber: null };

  // Claim the recycle first. If this row already existed the pool was already
  // credited, and adding again would give the community the same $ReGen twice.
  const claimed: any = await db.execute(sql`
    INSERT IGNORE INTO modulePoolRecycles (poolCycleNumber, gratitudeCycleId, gratitudeCycleNumber, amount)
    VALUES (${input.cycleNumber}, ${cycle.id}, ${cycle.cycleNumber}, ${amount})
  `);
  const affected = claimed?.[0]?.affectedRows ?? claimed?.affectedRows ?? 0;
  if (!affected) {
    return { outcome: "already-recycled", amount, gratitudeCycleNumber: cycle.cycleNumber };
  }

  await db.execute(sql`
    UPDATE gratitude_cycles SET poolPerCycle = poolPerCycle + ${amount} WHERE id = ${cycle.id}
  `);

  return { outcome: "recycled", amount, gratitudeCycleNumber: cycle.cycleNumber };
}

/**
 * Every recycled amount, newest first, so the returning share is a number
 * anybody can read rather than a claim in a document.
 *
 * R59 is explicit that the visibility is the point rather than a nicety: a
 * village or an author should be able to see the platform's share going back in
 * rather than into a pocket.
 */
export async function recycleHistory(db: Db, limit = 12): Promise<Array<{
  poolCycleNumber: number;
  gratitudeCycleNumber: number;
  amount: number;
  appliedAt: string | null;
}>> {
  const rows: any = await db.execute(sql`
    SELECT poolCycleNumber, gratitudeCycleNumber, amount, appliedAt
    FROM modulePoolRecycles ORDER BY poolCycleNumber DESC LIMIT ${limit}
  `);
  const list = rows?.[0] ?? rows?.rows ?? [];
  return (Array.isArray(list) ? list : []).map((r: any) => ({
    poolCycleNumber: Number(r.poolCycleNumber),
    gratitudeCycleNumber: Number(r.gratitudeCycleNumber),
    amount: Number(r.amount),
    appliedAt: r.appliedAt ? new Date(r.appliedAt).toISOString() : null,
  }));
}
