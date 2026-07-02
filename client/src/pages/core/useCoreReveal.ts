import { useEffect } from "react";

/**
 * Gentle scroll-reveal for CORE sections. Adds `.in` to any `.reveal` element
 * as it enters the viewport. Respects prefers-reduced-motion: when the user
 * asks for less motion, everything is shown immediately and no observer runs.
 * Re-runs whenever `deps` change so lazily rendered pages pick up their nodes.
 */
export function useCoreReveal(deps: unknown[] = []) {
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".core-root .reveal"));
    if (prefersReduced || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
