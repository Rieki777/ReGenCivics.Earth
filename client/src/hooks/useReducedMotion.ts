/**
 * useReducedMotion, returns true when animations should be skipped.
 * Triggers on: OS prefers-reduced-motion, or a slow/data-saving connection.
 */
export function useReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  const prefersReduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) return true;

  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  if (!conn) return false;

  return (
    conn.saveData === true ||
    conn.effectiveType === "2g" ||
    conn.effectiveType === "slow-2g"
  );
}
