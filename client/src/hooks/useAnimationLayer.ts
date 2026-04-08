/**
 * Animation layer hooks
 *
 * Thin React hooks and utilities that power the complex animation layer
 * documented in client/src/index.css. All of them respect
 * prefers-reduced-motion and are safe on the server.
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ─────────────────────────────────────────────────────────────
// 13. Seasonal backdrop shift, set data-season on <html>
// ─────────────────────────────────────────────────────────────

export type Season = "winter" | "spring" | "summer" | "autumn";

export function getSeason(date = new Date()): Season {
  const m = date.getMonth(); // 0 = Jan
  if (m <= 1 || m === 11) return "winter"; // Dec, Jan, Feb
  if (m <= 4) return "spring";              // Mar, Apr, May
  if (m <= 7) return "summer";              // Jun, Jul, Aug
  return "autumn";                           // Sep, Oct, Nov
}

export function useSeasonalTheme() {
  useEffect(() => {
    const season = getSeason();
    document.documentElement.setAttribute("data-season", season);
  }, []);
}

// ─────────────────────────────────────────────────────────────
// 14. Magnetic button, pointer-tracking nudge
// ─────────────────────────────────────────────────────────────

export function useMagnetic<T extends HTMLElement = HTMLElement>(
  strength = 0.25,
  radius = 80,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;

    // Only apply on pointer: fine (desktop) to avoid touch devices nudging on tap.
    const pointerFine =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: fine)").matches;
    if (!pointerFine) return;

    const onMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) {
        el.style.transform = "translate(0px, 0px)";
        return;
      }
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    };
    const onLeave = () => {
      el.style.transform = "translate(0px, 0px)";
    };

    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength, radius]);

  return ref;
}

// ─────────────────────────────────────────────────────────────
// 19. Ripple on click, inject a span at the click point
// ─────────────────────────────────────────────────────────────

export function useRipple() {
  const onClick = useCallback((ev: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;
    const host = ev.currentTarget;
    if (!host) return;
    host.classList.add("ripple-host");
    const rect = host.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "ripple-dot";
    dot.style.left = `${ev.clientX - rect.left}px`;
    dot.style.top = `${ev.clientY - rect.top}px`;
    host.appendChild(dot);
    window.setTimeout(() => dot.remove(), 750);
  }, []);
  return { onClick };
}

// ─────────────────────────────────────────────────────────────
// 17. Ink reveal. IntersectionObserver adds the -on class
// ─────────────────────────────────────────────────────────────

export function useInkReveal() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>(".ink-reveal"));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("ink-reveal-on");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─────────────────────────────────────────────────────────────
// 22. Blur-up image loader, flips .blur-up-loaded on img.load
// ─────────────────────────────────────────────────────────────

export function useBlurUp() {
  useEffect(() => {
    const activate = (img: HTMLImageElement) => {
      if (img.classList.contains("blur-up-loaded")) return;
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("blur-up-loaded");
      } else {
        const done = () => img.classList.add("blur-up-loaded");
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    };
    // Handle images already in the DOM on mount
    document.querySelectorAll<HTMLImageElement>("img.blur-up").forEach(activate);
    // Watch for images added by route changes
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof HTMLImageElement && node.classList.contains("blur-up")) {
            activate(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll<HTMLImageElement>("img.blur-up").forEach(activate);
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
}

// ─────────────────────────────────────────────────────────────
// 14. Global magnetic button delegate
//      Any element with [data-magnetic] gets the magnetic effect.
// ─────────────────────────────────────────────────────────────

export function useGlobalMagnetic() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof window === "undefined") return;
    const pointerFine = window.matchMedia("(pointer: fine)").matches;
    if (!pointerFine) return;

    let rafId = 0;
    let targets: HTMLElement[] = [];

    const refresh = () => {
      targets = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
      targets.forEach((t) => t.classList.add("magnetic"));
    };
    refresh();
    // Refresh on a slow interval to catch lazily-mounted buttons
    const interval = window.setInterval(refresh, 2000);

    const onMove = (ev: PointerEvent) => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        for (const el of targets) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = ev.clientX - cx;
          const dy = ev.clientY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = Math.max(rect.width, rect.height) * 0.9;
          if (dist > radius) {
            el.style.transform = "translate(0px, 0px)";
          } else {
            const strength = 0.18;
            el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
          }
        }
        rafId = 0;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(interval);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);
}

// ─────────────────────────────────────────────────────────────
// 19. Global ripple delegate
//     Any element with [data-ripple] emits a ripple on click.
// ─────────────────────────────────────────────────────────────

export function useGlobalRipple() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof window === "undefined") return;

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const host = target.closest<HTMLElement>("[data-ripple]");
      if (!host) return;
      host.classList.add("ripple-host");
      const rect = host.getBoundingClientRect();
      const dot = document.createElement("span");
      dot.className = "ripple-dot";
      dot.style.left = `${ev.clientX - rect.left}px`;
      dot.style.top = `${ev.clientY - rect.top}px`;
      host.appendChild(dot);
      window.setTimeout(() => dot.remove(), 750);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}

// ─────────────────────────────────────────────────────────────
// 25. Scroll progress ring, hook returning 0..1
// ─────────────────────────────────────────────────────────────

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const compute = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      if (height <= 0) {
        setProgress(0);
        return;
      }
      const p = Math.min(1, Math.max(0, scrollTop / height));
      setProgress(p);
    };
    compute();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        compute();
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return progress;
}