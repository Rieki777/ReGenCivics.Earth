import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepAnchorInPlace } from "./keepAnchorInPlace";

/** An anchor whose document position the test moves, as a section above it loads. */
function anchor(initialTop: number) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  let docTop = initialTop;
  el.getBoundingClientRect = () => ({ top: docTop - window.scrollY } as DOMRect);
  const scrollIntoView = vi.fn();
  el.scrollIntoView = scrollIntoView;
  return { el, scrollIntoView, moveTo: (t: number) => { docTop = t; } };
}

describe("keepAnchorInPlace", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("scrolls the anchor back each time a section above it pushes it down", () => {
    const a = anchor(800);
    keepAnchorInPlace(a.el);
    vi.advanceTimersByTime(1000);
    expect(a.scrollIntoView).not.toHaveBeenCalled();
    // The money routes arrive: the anchor sits 300px lower.
    a.moveTo(1100);
    vi.advanceTimersByTime(200);
    expect(a.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(a.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    // More campaigns arrive two seconds later: it follows again.
    vi.advanceTimersByTime(2000);
    a.moveTo(1500);
    vi.advanceTimersByTime(200);
    expect(a.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("stops once the layout holds still", () => {
    const a = anchor(800);
    keepAnchorInPlace(a.el, { settleMs: 1000 });
    vi.advanceTimersByTime(1200);
    a.moveTo(1400);
    vi.advanceTimersByTime(500);
    expect(a.scrollIntoView).not.toHaveBeenCalled();
  });

  it("stops at the reader's first touch, so it never fights their scroll", () => {
    const a = anchor(800);
    keepAnchorInPlace(a.el);
    window.dispatchEvent(new Event("touchstart"));
    a.moveTo(1400);
    vi.advanceTimersByTime(500);
    expect(a.scrollIntoView).not.toHaveBeenCalled();
  });

  it("can be stopped early, and stops when the anchor leaves the page", () => {
    const a = anchor(800);
    const stop = keepAnchorInPlace(a.el);
    stop();
    a.moveTo(1400);
    vi.advanceTimersByTime(500);
    expect(a.scrollIntoView).not.toHaveBeenCalled();

    const b = anchor(800);
    keepAnchorInPlace(b.el);
    b.el.remove();
    b.moveTo(1400);
    vi.advanceTimersByTime(500);
    expect(b.scrollIntoView).not.toHaveBeenCalled();
  });
});
