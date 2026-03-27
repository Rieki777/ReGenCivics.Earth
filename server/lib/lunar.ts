// server/lib/lunar.ts
// Lunar cycle utilities for regen-civics.
// Based on a known new moon epoch and the synodic month length.

// Known new moon: January 29, 2025 at 12:36 UTC
const NEW_MOON_EPOCH = new Date("2025-01-29T12:36:00Z").getTime();

// Average synodic month in days (new moon to new moon)
const LUNAR_CYCLE_DAYS = 29.53058867;
const LUNAR_CYCLE_MS = LUNAR_CYCLE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Returns the start (new moon) of the current lunar cycle
 * as a Date object.
 */
export function getCurrentLunarCycleStart(now: Date = new Date()): Date {
  const elapsed = now.getTime() - NEW_MOON_EPOCH;
  const completedCycles = Math.floor(elapsed / LUNAR_CYCLE_MS);
  return new Date(NEW_MOON_EPOCH + completedCycles * LUNAR_CYCLE_MS);
}

/**
 * Returns the Date of the next new moon after the given time.
 */
export function getNextNewMoon(now: Date = new Date()): Date {
  const elapsed = now.getTime() - NEW_MOON_EPOCH;
  const completedCycles = Math.floor(elapsed / LUNAR_CYCLE_MS);
  return new Date(NEW_MOON_EPOCH + (completedCycles + 1) * LUNAR_CYCLE_MS);
}
