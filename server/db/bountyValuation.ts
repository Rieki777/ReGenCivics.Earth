/**
 * Deterministic bounty valuation engine.
 *
 * How much $ReGen a bounty is worth is computed, not decreed:
 *
 *   base(scopeTier) * impact * priority * demand
 *     -> anchored toward the precedent median
 *     -> capped by bounty.max and any season budget
 *     -> rounded to bounty.round_to
 *
 * The one nondeterministic input (reading a transcript and classifying the
 * work into { scopeTier, impactLevel }) happens in the extract-tasks pass. All
 * money math here is deterministic and driven by public `game_variables`, so
 * every amount is explainable and the stored breakdown reconstructs it.
 *
 * `computeValuation` is pure (no I/O) and is the unit-tested core.
 * `computeBountyAmount` loads the live weights, the learned demand factor, and
 * the remaining season budget, then calls the pure core.
 *
 * See BOUNTY_VALUATION_ENGINE_SPEC.md. Everything pays $ReGen for now; the
 * `token` field is carried so another token can be added later without a
 * schema change, but nothing branches on it.
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { bountyDemandFactors, roles } from "../../drizzle/schema";
import { getGameVariables } from "../game";

export const SCOPE_TIERS = ["trivial", "small", "medium", "large"] as const;
export type ScopeTier = (typeof SCOPE_TIERS)[number];

export const IMPACT_LEVELS = ["low", "normal", "high"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export interface ValuationWeights {
  base: Record<ScopeTier, number>;
  impact: Record<ImpactLevel, number>;
  priorityBoost: number;
  anchorWeight: number;
  max: number;
  roundTo: number;
}

export interface DemandData {
  factor: number;
  precedentMedian: number | null;
}

export interface ValuationInput {
  scopeTier: ScopeTier;
  impactLevel: ImpactLevel;
  priority: boolean;
  tokenType?: string;
}

export interface ValuationBreakdown {
  amount: number;
  token: string;
  circle: string;
  scopeTier: ScopeTier;
  impactLevel: ImpactLevel;
  base: number;
  impact: number;
  priority: number;
  demand: number;
  anchorWeight: number;
  precedentMedian: number | null;
  raw: number;
  anchored: number;
  cap: number;
  // Stored as null (not Infinity) when no budget cap is set, so it round-trips through JSON.
  seasonBudgetRemaining: number | null;
  computedAt: string;
  // Set only when a maintainer overrode the computed amount at accept (the human
  // consent on value). Kept on the locked breakdown so any amount is explainable.
  override?: { by: number; reason: string | null; suggested: number };
}

// Defaults mirror scripts/seed-bounty-valuation.ts. getGameVariables skips
// missing keys, so these keep the engine correct before the seed runs.
export const DEFAULT_WEIGHTS: ValuationWeights = {
  base: { trivial: 25, small: 75, medium: 250, large: 750 },
  impact: { low: 0.75, normal: 1.0, high: 1.5 },
  priorityBoost: 1.25,
  anchorWeight: 0.25,
  max: 2000,
  roundTo: 25,
};

export const DEFAULT_LEARNING = {
  windowDays: 45,
  unclaimedDays: 14,
  raiseSensitivity: 0.15,
  lowerSensitivity: 0.05,
  factorMin: 0.9,
  factorMax: 1.4,
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The pure valuation core. No I/O; fully deterministic given its inputs.
 * `seasonBudgetRemaining` is Infinity when no cap is set.
 */
export function computeValuation(
  input: ValuationInput,
  weights: ValuationWeights,
  demand: DemandData,
  seasonBudgetRemaining: number = Infinity,
): ValuationBreakdown {
  const token = input.tokenType || "regen";
  const base = weights.base[input.scopeTier] ?? 0;
  const impact = weights.impact[input.impactLevel] ?? 1;
  const priority = input.priority ? weights.priorityBoost : 1;
  const demandFactor = Number.isFinite(demand.factor) && demand.factor > 0 ? demand.factor : 1;

  const raw = base * impact * priority * demandFactor;

  const precedentMedian =
    demand.precedentMedian != null && Number.isFinite(demand.precedentMedian) && demand.precedentMedian > 0
      ? demand.precedentMedian
      : null;
  const anchored =
    precedentMedian != null
      ? raw * (1 - weights.anchorWeight) + precedentMedian * weights.anchorWeight
      : raw;

  const cap = Math.min(weights.max, seasonBudgetRemaining);
  const capped = Math.max(0, Math.min(anchored, cap));

  const step = weights.roundTo > 0 ? weights.roundTo : 1;
  let amount = Math.round(capped / step) * step;
  // Rounding to nearest can push a hair over the hard cap; never exceed it.
  if (amount > cap) amount = Math.floor(cap / step) * step;
  if (amount < 0) amount = 0;

  return {
    amount,
    token,
    circle: "general",
    scopeTier: input.scopeTier,
    impactLevel: input.impactLevel,
    base,
    impact,
    priority,
    demand: demandFactor,
    anchorWeight: weights.anchorWeight,
    precedentMedian,
    raw: round2(raw),
    anchored: round2(anchored),
    cap: Number.isFinite(cap) ? cap : weights.max,
    seasonBudgetRemaining: Number.isFinite(seasonBudgetRemaining) ? seasonBudgetRemaining : null,
    computedAt: new Date().toISOString(),
  };
}

const WEIGHT_KEYS = [
  "bounty.tier.trivial.base",
  "bounty.tier.small.base",
  "bounty.tier.medium.base",
  "bounty.tier.large.base",
  "bounty.impact.low",
  "bounty.impact.normal",
  "bounty.impact.high",
  "bounty.priority.boost",
  "bounty.anchor.weight",
  "bounty.max",
  "bounty.round_to",
];

/** Load the live valuation weights from game_variables, falling back to defaults. */
export async function loadValuationWeights(): Promise<ValuationWeights> {
  const v = await getGameVariables(WEIGHT_KEYS).catch(() => ({} as Record<string, number>));
  const num = (k: string, d: number): number => (Number.isFinite(v[k]) ? v[k] : d);
  return {
    base: {
      trivial: num("bounty.tier.trivial.base", DEFAULT_WEIGHTS.base.trivial),
      small: num("bounty.tier.small.base", DEFAULT_WEIGHTS.base.small),
      medium: num("bounty.tier.medium.base", DEFAULT_WEIGHTS.base.medium),
      large: num("bounty.tier.large.base", DEFAULT_WEIGHTS.base.large),
    },
    impact: {
      low: num("bounty.impact.low", DEFAULT_WEIGHTS.impact.low),
      normal: num("bounty.impact.normal", DEFAULT_WEIGHTS.impact.normal),
      high: num("bounty.impact.high", DEFAULT_WEIGHTS.impact.high),
    },
    priorityBoost: num("bounty.priority.boost", DEFAULT_WEIGHTS.priorityBoost),
    anchorWeight: num("bounty.anchor.weight", DEFAULT_WEIGHTS.anchorWeight),
    max: num("bounty.max", DEFAULT_WEIGHTS.max),
    roundTo: num("bounty.round_to", DEFAULT_WEIGHTS.roundTo),
  };
}

/** Resolve a bounty's circle from its roleSlug. Player proposals with no role fall back to "general". */
export async function resolveCircleForRole(roleSlug: string | null | undefined): Promise<string> {
  if (!roleSlug) return "general";
  const db = await getDb();
  if (!db) return "general";
  const [row] = await db.select({ circle: roles.circle }).from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  return row?.circle?.trim() || "general";
}

/** Read the learned demand factor + precedent median for a (circle, scopeTier). */
export async function getDemandData(circle: string, scopeTier: ScopeTier): Promise<DemandData> {
  const db = await getDb();
  if (!db) return { factor: 1, precedentMedian: null };
  const [row] = await db
    .select()
    .from(bountyDemandFactors)
    .where(and(eq(bountyDemandFactors.circle, circle), eq(bountyDemandFactors.scopeTier, scopeTier)))
    .limit(1);
  if (!row) return { factor: 1, precedentMedian: null };
  const factor = Number(row.factor);
  return {
    factor: Number.isFinite(factor) && factor > 0 ? factor : 1,
    precedentMedian: row.precedentMedian != null ? Number(row.precedentMedian) : null,
  };
}

/**
 * $ReGen already committed to live and paid bounties (optionally scoped to a
 * circle). Feeds the season-budget cap and the mechanics-page "committed vs
 * available" readout. Not season-bounded yet; a season boundary is a follow-up.
 */
export async function getCommittedEmission(circle?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const circleJoin = circle
    ? sql`JOIN roles ro ON ro.slug = b.roleSlug AND ro.circle = ${circle}`
    : sql``;
  const rows = await db.execute(sql`
    SELECT COALESCE(SUM(r.amount), 0) AS committed
    FROM bounty_roles r
    JOIN bounties b ON b.id = r.bountyId
    ${circleJoin}
    WHERE b.workStatus IN ('accepted', 'open', 'claimed', 'in_review', 'completed')
      AND r.payStatus IN ('filled', 'payable', 'held', 'paid')
  `);
  return Number((rows as any)?.[0]?.[0]?.committed ?? 0);
}

/** Remaining season budget for a circle (Infinity when no cap is set). */
export async function getSeasonBudgetRemaining(circle?: string): Promise<number> {
  const perCircleKey = circle ? `bounty.season_budget.${circle}` : null;
  const keys = perCircleKey ? [perCircleKey, "bounty.season_budget"] : ["bounty.season_budget"];
  const v = await getGameVariables(keys).catch(() => ({} as Record<string, number>));
  const perCircle = perCircleKey && Number.isFinite(v[perCircleKey]) && v[perCircleKey] > 0 ? v[perCircleKey] : 0;
  const global = Number.isFinite(v["bounty.season_budget"]) && v["bounty.season_budget"] > 0 ? v["bounty.season_budget"] : 0;
  const budget = perCircle || global;
  if (!budget || budget <= 0) return Infinity;
  const committed = await getCommittedEmission(perCircle ? circle : undefined);
  return Math.max(0, budget - committed);
}

// ── Self-learning: the demand factor ─────────────────────────────────────────

export interface DemandSignals {
  // Bounties of this (circle, scopeTier) considered in the rolling window.
  sampleSize: number;
  // Fraction (0..1) that sat open past the unclaimed threshold or expired unclaimed.
  unclaimedRate: number;
  // Fraction (0..1) of claimed bounties that were claimed very fast. Only pulls
  // the factor down, and only when nothing is going unclaimed.
  fastClaimSignal: number;
}

export interface LearningParams {
  raiseSensitivity: number;
  lowerSensitivity: number;
  factorMin: number;
  factorMax: number;
  minSample: number;
}

// The largest a factor may move in a single cycle, so learning is a nudge, never a jump.
export const MAX_FACTOR_STEP = 0.1;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const clamp01 = (n: number): number => (Number.isFinite(n) ? clamp(n, 0, 1) : 0);

/**
 * Recompute a bounded demand factor from the previous value and this cycle's
 * signals. Asymmetric on purpose: underpricing (work going undone) is the worst
 * outcome for the movement, so the raise-on-unclaimed nudge is the bolder one
 * and the lower-on-fast-claim nudge is gentle. Pure and unit-tested.
 */
export function computeDemandFactor(prev: number, signals: DemandSignals, learning: LearningParams): number {
  const base = Number.isFinite(prev) && prev > 0 ? prev : 1;
  // Not enough data to move: hold, but keep within the published bounds.
  if (!Number.isFinite(signals.sampleSize) || signals.sampleSize < learning.minSample) {
    return clamp(base, learning.factorMin, learning.factorMax);
  }
  const unclaimed = clamp01(signals.unclaimedRate);
  let next: number;
  if (unclaimed > 0) {
    next = base * (1 + learning.raiseSensitivity * unclaimed);
  } else {
    next = base * (1 - learning.lowerSensitivity * clamp01(signals.fastClaimSignal));
  }
  // Small step per cycle.
  next = clamp(next, base - MAX_FACTOR_STEP, base + MAX_FACTOR_STEP);
  return clamp(next, learning.factorMin, learning.factorMax);
}

export interface ComputeParams {
  scopeTier: ScopeTier;
  impactLevel: ImpactLevel;
  priority: boolean;
  roleSlug?: string | null;
  circle?: string | null;
  tokenType?: string;
}

/**
 * Compute a bounty's suggested amount and full breakdown from live weights,
 * the learned demand factor, and the remaining season budget.
 */
export async function computeBountyAmount(params: ComputeParams): Promise<ValuationBreakdown> {
  const circle = params.circle?.trim() || (await resolveCircleForRole(params.roleSlug));
  const [weights, demand, budgetRemaining] = await Promise.all([
    loadValuationWeights(),
    getDemandData(circle, params.scopeTier),
    getSeasonBudgetRemaining(circle),
  ]);
  const breakdown = computeValuation(
    {
      scopeTier: params.scopeTier,
      impactLevel: params.impactLevel,
      priority: params.priority,
      tokenType: params.tokenType,
    },
    weights,
    demand,
    budgetRemaining,
  );
  return { ...breakdown, circle };
}
