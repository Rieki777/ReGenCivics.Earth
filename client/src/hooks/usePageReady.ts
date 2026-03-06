/**
 * usePageReady
 * Returns false while any of the provided loading flags are true,
 * then true once they all settle. Pages use this to show the TaoSpinner
 * instead of a partially-loaded view.
 *
 * Usage:
 *   const ready = usePageReady(isLoading, isFetchingUser);
 *   if (!ready) return <TaoSpinner />;
 */
export function usePageReady(...loadingFlags: (boolean | undefined)[]): boolean {
  // Once all flags have been false at least once, we consider the page ready.
  // We use a simple: if any flag is still true → not ready.
  return !loadingFlags.some((f) => f === true);
}
