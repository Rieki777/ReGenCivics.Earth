// Presence stub. The /api/presence endpoint does not exist yet (returns 404).
// Return null count so the UI shows a static "Online" label instead of polling.
export function usePresence() {
  return { count: null as number | null };
}
