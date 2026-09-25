/**
 * Keep a linked anchor where the link put it while the page above it
 * finishes loading.
 *
 * The project page scrolls to its #anchor once, as soon as the target exists.
 * Sections above some anchors load later (the money routes, the More
 * campaigns list), push the target down, and nothing scrolled again: a new
 * campaign's steward landed on other projects' campaigns instead of
 * #steward-tools, and a notice to #updates landed on the money block.
 *
 * This watches where the anchor sits in the document (its top plus the
 * scroll offset, which a smooth scroll never changes, only a layout shift
 * above it does). Each time that moves, it scrolls the anchor back into
 * place. It stops once the layout has held still for `settleMs`, after
 * `maxMs` in all, or on the reader's first touch, wheel, key or pointer, so
 * it never fights someone who has started to scroll. Polling rather than a
 * ResizeObserver: timers still run in a background tab.
 *
 * Returns a function that stops it early.
 */
export function keepAnchorInPlace(
  el: HTMLElement,
  opts: { settleMs?: number; maxMs?: number; intervalMs?: number } = {},
): () => void {
  const settleMs = opts.settleMs ?? 3000;
  const maxMs = opts.maxMs ?? 12000;
  const intervalMs = opts.intervalMs ?? 150;
  const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

  const docTop = () => el.getBoundingClientRect().top + window.scrollY;
  const started = Date.now();
  let lastShift = started;
  let last = docTop();
  let stopped = false;
  let timer: number | undefined;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) window.clearInterval(timer);
    for (const type of userEvents) window.removeEventListener(type, stop, true);
  };

  for (const type of userEvents) window.addEventListener(type, stop, { capture: true, passive: true });

  timer = window.setInterval(() => {
    if (!el.isConnected) {
      stop();
      return;
    }
    const now = Date.now();
    const top = docTop();
    if (Math.abs(top - last) > 4) {
      last = top;
      lastShift = now;
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
    if (now - lastShift >= settleMs || now - started >= maxMs) stop();
  }, intervalMs);

  return stop;
}
