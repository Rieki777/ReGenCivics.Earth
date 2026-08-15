/**
 * Lunar cycle NUMBERS, shared with every village fork.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT `server/lib/lunar.ts`.
 *
 * There are two lunar clocks in this ecosystem and they do not agree.
 *
 *   server/lib/lunar.ts  epoch 2025-01-29 12:36 UTC, no cycle number
 *   this file            epoch 2000-01-06 18:14 UTC (Meeus), cycle numbers
 *
 * Both use the same mean synodic month, so both produce stable 29.53-day
 * cycles, but the epochs are 310.0096 lunations apart rather than a whole
 * number of them, which puts their boundaries 6.79 hours out of step.
 *
 * `game-amora` `shared/lunar.ts` opens by calling itself a "VERBATIM PORT of
 * regen-civics `shared/lunar.ts`" and warns that two codebases disagreeing
 * about which lunation an event belongs to is "the kind of divergence you
 * discover months later in a distribution dispute". It was right about the
 * risk and wrong about the file: no `shared/lunar.ts` existed here. This is
 * that file. It carries the fork's constants exactly, so a cycle number in a
 * hub statement names the same lunation as a cycle number in a village's
 * gratitude distribution.
 *
 * `server/lib/lunar.ts` is deliberately left alone. Gratitude cycles and the
 * existing crons run on it, and moving a live clock by 6.79 hours for the sake
 * of an unrelated feature is its own change with its own blast radius (ADR-50,
 * decision D7). Until somebody makes that call, use THIS file for anything that
 * needs a cycle NUMBER, and that file for anything already running on it.
 *
 * Deterministic by construction (STEERING section 11): mean synodic month
 * anchored to a fixed reference, no external calls, every environment computes
 * the identical number. It drifts up to ~14 hours from the true astronomical
 * new moon in any given lunation, which is fine for a ~29.5-day cycle whose
 * only requirement is that boundaries are stable and monotonic.
 */

export const SYNODIC_MONTH_DAYS = 29.53058867;
export const SYNODIC_MONTH_MS = SYNODIC_MONTH_DAYS * 24 * 60 * 60 * 1000;

/** Reference new moon: 2000-01-06 18:14:00 UTC (Meeus). */
export const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export interface LunarCycleBounds {
  /** Whole lunations since the reference new moon. */
  cycleNumber: number;
  startsAt: Date;
  endsAt: Date;
}

/** The lunation containing `date`, new moon to next new moon. */
export function cycleBoundsFor(date: Date): LunarCycleBounds {
  const elapsed = date.getTime() - REFERENCE_NEW_MOON_MS;
  return cycleBoundsByNumber(Math.floor(elapsed / SYNODIC_MONTH_MS));
}

/** The lunation with a specific cycle number. */
export function cycleBoundsByNumber(cycleNumber: number): LunarCycleBounds {
  return {
    cycleNumber,
    startsAt: new Date(REFERENCE_NEW_MOON_MS + cycleNumber * SYNODIC_MONTH_MS),
    endsAt: new Date(REFERENCE_NEW_MOON_MS + (cycleNumber + 1) * SYNODIC_MONTH_MS),
  };
}

/**
 * The most recent lunation that has fully CLOSED as of `now`.
 *
 * A cycle is settled after its end, never during. This is the one the pool
 * statement job asks for, and asking for it by name is what keeps the job from
 * settling a cycle that is still running.
 */
export function lastClosedCycle(now: Date = new Date()): LunarCycleBounds {
  return cycleBoundsByNumber(cycleBoundsFor(now).cycleNumber - 1);
}
