/**
 * useFocusTrap. Traps keyboard focus within a container element while it is active.
 *
 * Usage:
 *   const trapRef = useFocusTrap(isOpen);
 *   <div ref={trapRef} role="dialog" aria-modal="true">...</div>
 *
 * Behaviour:
 *   - On open: moves focus to the first focusable child (or the container itself).
 *   - On Tab / Shift+Tab: cycles focus within the container.
 *   - On close: restores focus to the element that was active before the trap opened.
 */
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    // Remember the element that was focused before the trap opened
    previousFocusRef.current = document.activeElement;

    // Focus the first focusable element inside the container
    const container = containerRef.current;
    if (!container) return;
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
    // preventScroll so activating a trapped overlay never yanks the page's scroll
    // position to bring the focused element into view (the element is already
    // visible inside the fixed/positioned overlay). Without this, opening a modal
    // or drawer while the page is scrolled mid-way jumps the whole page.
    if (focusables.length > 0) {
      focusables[0].focus({ preventScroll: true });
    } else {
      container.focus({ preventScroll: true });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the previously active element, without scrolling the
      // page back to wherever that element sits.
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [active]);

  return containerRef as React.RefObject<HTMLDivElement>;
}
