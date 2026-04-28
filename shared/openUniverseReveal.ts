/**
 * Open Universe progressive reveal utility.
 *
 * Per QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md section 4.3:
 *   - Once a player completes the 14 Rites of Passage, the Open
 *     Universe pool unlocks 2 quests at a time. Completing one
 *     unlocks 2 more. Continues until all are revealed.
 *   - Random order is seeded per-player so each journey is unique
 *     but deterministic.
 *
 * Pure functions, no React. Reusable from any render context.
 */

/**
 * 32-bit FNV-1a hash for turning a string seed into a number.
 * Stable across browsers and Node.
 */
function hashSeed(input: string | number): number {
  const str = String(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG: small, fast, deterministic. Same seed always
 * produces the same sequence.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle. The same (items, seed) pair
 * always produces the same output order, regardless of the runtime.
 */
export function seededShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const arr = items.slice();
  const rand = mulberry32(hashSeed(seed));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute the visible / locked split of the Open Universe pool for a
 * given player.
 *
 * Visible count = min(2 + completedCount, total). The first time the
 * pool unlocks, the player sees 2 quests. Each Open Universe quest
 * they complete reveals 2 more (1 replaces the just-completed one,
 * 1 is the new reveal), until the entire pool is visible.
 *
 * The order is deterministic per player: same seed always produces
 * the same shuffle, so a player who returns tomorrow sees the same
 * 2 reveals waiting for them.
 *
 * @param pool   The full Open Universe quest list.
 * @param seed   Per-player seed (typically the user id).
 * @param completedCount Number of Open Universe quests this player
 *               has already completed.
 * @returns An object with `visible` (the cards to render with full
 *          interactivity) and `locked` (the cards to render as moss-
 *          overgrown ruins).
 */
export function computeReveal<T>(
  pool: readonly T[],
  seed: string | number,
  completedCount: number,
): { visible: T[]; locked: T[] } {
  const shuffled = seededShuffle(pool, seed);
  const visibleCount = Math.min(2 + Math.max(0, completedCount), pool.length);
  return {
    visible: shuffled.slice(0, visibleCount),
    locked: shuffled.slice(visibleCount),
  };
}

/**
 * Identify which item ids are "newly revealed" since the last render.
 * The caller passes the previous visible set; this returns the IDs
 * that appear in the new set but not the old one. Used to trigger
 * the canopy-fall animation only on freshly revealed cards.
 */
export function newlyRevealedIds<T>(
  newVisible: readonly T[],
  prevVisibleIds: ReadonlySet<string>,
  getId: (item: T) => string,
): Set<string> {
  const out = new Set<string>();
  for (const item of newVisible) {
    const id = getId(item);
    if (!prevVisibleIds.has(id)) out.add(id);
  }
  return out;
}
