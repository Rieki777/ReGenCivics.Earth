/**
 * useGlobalScrollReveal - Auto-animates any element with data-reveal attribute.
 * Runs once in App.tsx. No per-page setup needed.
 *
 * Usage in any JSX:
 *   <div data-reveal>...</div>
 *   <div data-reveal="left" data-reveal-delay="100">...</div>
 *
 * Directions: up (default), left, right, scale
 * data-reveal-delay: ms integer
 */
import { useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

export function useGlobalScrollReveal() {
  const skipAnim = useReducedMotion();

  useEffect(() => {
    // When reduced motion is preferred, reveal all elements immediately
    if (skipAnim) {
      document.querySelectorAll("[data-reveal]").forEach((el) =>
        el.classList.add("is-revealed")
      );
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      [data-reveal] {
        opacity: 0;
        transform: translateY(32px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      [data-reveal="left"] {
        transform: translateX(-32px);
      }
      [data-reveal="right"] {
        transform: translateX(32px);
      }
      [data-reveal="scale"] {
        transform: scale(0.92);
      }
      [data-reveal].is-revealed {
        opacity: 1;
        transform: none;
      }
    `;
    document.head.appendChild(style);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = parseInt(el.dataset.revealDelay ?? "0", 10);
            setTimeout(() => el.classList.add("is-revealed"), delay);
            observer.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
    );

    // Observe current elements + watch for new ones (for lazy-loaded pages)
    const observeAll = () => {
      document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) =>
        observer.observe(el)
      );
    };

    observeAll();

    // Re-observe after navigation (wouter doesn't fire popstate consistently)
    // Debounce to avoid firing observeAll on every single DOM mutation
    let debounceTimer: ReturnType<typeof setTimeout>;
    const mutationObserver = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(observeAll, 100);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
      mutationObserver.disconnect();
      document.head.removeChild(style);
    };
  }, []);
}
