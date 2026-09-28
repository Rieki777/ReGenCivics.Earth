/**
 * The money figures on example campaigns. Pure, shared by the demo seed
 * (scripts/seed-demo-campaigns.ts) and the tests.
 *
 * Ruling 2026-09-27 (Rye: "Yes do this"): example campaigns ask for money at
 * about 20% of the whole ask, so a quarter of the in-kind ask, and their
 * example routes scale with the new money ask so no example reads as landed.
 * Migration 0263 applies the same rule in SQL to the example rows already in
 * a database; these functions mirror its statements exactly, in integer
 * arithmetic (cents and BigInt, never a 0.4 float), so a seeded example and a
 * migrated one read the same.
 *
 * Rounding matches MySQL's ROUND on exact DECIMAL values: half away from
 * zero, which for these positive figures is half up.
 */
import { MAX_WINDOW_DAYS } from "./campaignClose";

/** Ruling 2026-09-27: examples ask for money at about 20% of the whole ask, so a quarter of the in-kind ask. */
export const EXAMPLE_MONEY = { inKindDivisor: 4, roundTo: 1000, floor: 1000 } as const;
/** Example routes together show about 40% of the money ask: real progress, never landed. */
export const EXAMPLE_ROUTES = { shareNumerator: 2, shareDenominator: 5, roundTo: 500 } as const;
/** An example over the nine-month cap (273 days, ruling 2026-09-04) runs this long instead. */
export const EXAMPLE_DURATION_FIX_DAYS = 270;

/** A money figure as whole cents, or 0 when it isn't a positive finite number. */
function toCents(v: unknown): bigint {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0n;
  return BigInt(Math.round(n * 100));
}

/** round(num / den) half up, for num >= 0 and den > 0. */
function roundHalfUp(num: bigint, den: bigint): bigint {
  return (2n * num + den) / (2n * den);
}

/**
 * The money ask for an example with this in-kind ask: 0 when there is no
 * in-kind ask; otherwise max(1000, the nearest 1000 to inKind / 4).
 * SQL (0263 step 2): GREATEST(ROUND(inKind / 4, -3), 1000).
 */
export function exampleMoneyAsk(inKindAsk: number): number {
  const cents = toCents(inKindAsk);
  if (cents <= 0n) return 0;
  const unitCents = BigInt(EXAMPLE_MONEY.inKindDivisor * EXAMPLE_MONEY.roundTo * 100);
  const units = roundHalfUp(cents, unitCents);
  return Math.max(EXAMPLE_MONEY.floor, Number(units) * EXAMPLE_MONEY.roundTo);
}

/**
 * Each route's new cachedRaised, in the order given:
 * round(moneyAsk * 2 * raised / (5 * total * 500)) * 500, where total is the
 * sum of every route's raised. A route with no figure (null) keeps null, as
 * the SQL leaves it; when the total is 0 every route keeps its figure.
 * SQL (0263 step 3).
 */
export function exampleRouteFigures(moneyAsk: number, routes: Array<{ cachedRaised: number }>): number[];
export function exampleRouteFigures(
  moneyAsk: number,
  routes: Array<{ cachedRaised: number | null }>,
): Array<number | null>;
export function exampleRouteFigures(
  moneyAsk: number,
  routes: Array<{ cachedRaised: number | null }>,
): Array<number | null> {
  const total = routes.reduce((sum, r) => sum + (r.cachedRaised == null ? 0n : toCents(r.cachedRaised)), 0n);
  if (total <= 0n) return routes.map((r) => (r.cachedRaised == null ? null : Number(r.cachedRaised)));
  const ask = toCents(moneyAsk);
  const { shareNumerator, shareDenominator, roundTo } = EXAMPLE_ROUTES;
  return routes.map((r) => {
    if (r.cachedRaised == null) return null;
    // In cents: ask * 2 * raised / (5 * total * 500 * 100). The extra 100
    // brings the product of two cent figures back to whole units of 500.
    const num = ask * BigInt(shareNumerator) * toCents(r.cachedRaised);
    const den = BigInt(shareDenominator) * total * BigInt(roundTo) * 100n;
    return Number(roundHalfUp(num, den)) * roundTo;
  });
}

/** The duration an example runs after 0263: unchanged up to the nine-month cap, else 270. SQL (0263 step 4). */
export function exampleDurationDays(durationDays: number): number {
  return durationDays > MAX_WINDOW_DAYS ? EXAMPLE_DURATION_FIX_DAYS : durationDays;
}
