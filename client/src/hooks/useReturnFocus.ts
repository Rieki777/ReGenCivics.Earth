import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Hand keyboard focus back to whatever opened a dialog, when the dialog is
 * opened through state rather than a DialogTrigger.
 *
 * Radix returns focus only to its own DialogTrigger. The whole-ask sheet and
 * the offer sheet open from plain buttons through state, so Escape or Close
 * left focus on <body> and a keyboard or screen reader user lost their place
 * (WCAG 2.4.3).
 *
 * The opener is read in a layout effect when `open` turns true, before the
 * dialog's own focus scope moves focus inside it. Pass the returned handler
 * to DialogContent's onCloseAutoFocus. It focuses without scrolling, so a
 * row action that closes the sheet and scrolls elsewhere keeps its scroll.
 */
export function useReturnFocus(open: boolean): (event: Event) => void {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const active = typeof document === "undefined" ? null : document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, [open]);
  return useCallback((event: Event) => {
    const el = opener.current;
    if (!el || !el.isConnected) return;
    event.preventDefault();
    el.focus({ preventScroll: true });
  }, []);
}
