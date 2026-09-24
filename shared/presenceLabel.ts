/**
 * Soft presence copy from a real active-session count.
 * Never fabricates a number — low counts use qualitative wording only.
 */

/** Inclusive upper bound for soft wording (1..SOFT_MAX). At SOFT_MAX+1 show "N here now". */
export const PRESENCE_SOFT_MAX = 4;

/**
 * Map a real presence count to UI copy.
 *
 * - `null` / `undefined` / non-finite → `null` (caller should hide the badge)
 * - `0` → "Be the first here"
 * - `1`–`4` → "A few folks here now"
 * - `5+` → "N here now" (exact count, never padded)
 */
export function presenceLabel(count: number | null | undefined): string | null {
  if (count == null || !Number.isFinite(count)) return null;
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return "Be the first here";
  if (n <= PRESENCE_SOFT_MAX) return "A few folks here now";
  return `${n} here now`;
}
