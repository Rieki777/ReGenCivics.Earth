import { useEffect } from "react";

/**
 * Locks body scroll while `active` is true and restores it on close.
 *
 * iOS Safari scrolls the page behind a position:fixed overlay when the user
 * drags on the backdrop. Setting overflow:hidden on the body prevents this.
 * Radix-based dialogs/sheets handle this internally; this hook is for
 * hand-rolled full-screen overlays that do not go through Radix.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
