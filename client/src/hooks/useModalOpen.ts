import { useEffect, useState } from "react";

/**
 * True while a modal dialog holds the page.
 *
 * The shell's floating controls (the shortcuts button and the scroll ring,
 * both z-[60]) sat above every dialog (z-50). At 375px the shortcuts button
 * covered the right end of the offer sheet's "Send my offer" and the loan
 * condition field, and a tap there hit the button (WCAG 2.4.11). They hide
 * while this is true.
 *
 * Radix marks the body with data-scroll-locked while a modal dialog is open;
 * an open [role=dialog] counts too, for a dialog that does not lock scroll.
 */
export function isModalOpen(doc: Document = document): boolean {
  if (doc.body?.hasAttribute("data-scroll-locked")) return true;
  return !!doc.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
}

export function useModalOpen(): boolean {
  const [open, setOpen] = useState(() => (typeof document === "undefined" ? false : isModalOpen()));
  useEffect(() => {
    const read = () => setOpen(isModalOpen());
    read();
    const observer = new MutationObserver(read);
    // Radix toggles the attribute on <body>, and dialogs portal in and out as
    // children of <body>, so neither needs a whole-document subtree watch.
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked"],
      childList: true,
    });
    return () => observer.disconnect();
  }, []);
  return open;
}
