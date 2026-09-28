/**
 * The one season Follow on /campaigns, id="get-notified" (the Needs tab's
 * empty state or the gallery foot; build spec 2026-09-27, section 12.5).
 *
 * The banner's "Hear when it opens" used to scroll there and stop, leaving
 * focus on the banner: a keyboard or screen reader user heard nothing, and
 * the next Tab went on from the top of the gallery (review 2026-09-28). It
 * now also puts focus on the form's first control (the email field, or the
 * one button when signed in), without a second jump.
 */
export const GET_NOTIFIED_ID = "get-notified";

export function goToGetNotified(doc: Document = document): boolean {
  const target = doc.getElementById(GET_NOTIFIED_ID);
  if (!target) return false;
  target.scrollIntoView?.({ behavior: "smooth", block: "start" });
  // The form's first control; once someone has joined, the form is gone and
  // the confirmation (focusable, tabindex -1) takes the focus instead.
  const control =
    target.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), button:not([disabled])") ??
    target.querySelector<HTMLElement>("[tabindex='-1']");
  control?.focus({ preventScroll: true });
  return true;
}
