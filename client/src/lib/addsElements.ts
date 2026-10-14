/**
 * True when a batch of mutations added at least one element. The page-wide
 * watchers (scroll reveal, ink reveal) only care about new elements, and a
 * controlled textarea replaces its text node on every keystroke, so they
 * skip text-only batches.
 */
export function addsElements(mutations: MutationRecord[]): boolean {
  for (const m of mutations) {
    for (const node of Array.from(m.addedNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
    }
  }
  return false;
}
