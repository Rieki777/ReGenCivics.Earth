/**
 * While someone types, decorative motion holds still (STEERING.md section 13).
 *
 * Even an animation the compositor runs is restyled on the main thread
 * whenever a keystroke forces a style update, so the home page's 46 drifting
 * leaves and stars doubled each key's delay. watchTyping() marks <html> with
 * data-typing while a text field has focus; index.css pauses every animation
 * inside a .decor-layer then, and canvas loops check isTyping() or listen
 * with onTypingChange().
 */

const NOT_TEXT = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image", "hidden"]);
const EVENT = "typingchange";

/** A field people type into: a textarea, a text-like input or editable content. */
export function isTextEntry(el: EventTarget | null): boolean {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return !NOT_TEXT.has(el.type) && !el.readOnly && !el.disabled;
  return el instanceof HTMLElement && el.isContentEditable === true;
}

export function isTyping(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-typing");
}

/** Calls back with true when typing starts and false when it stops. Returns the unsubscribe. */
export function onTypingChange(callback: (typing: boolean) => void): () => void {
  const listener = () => callback(isTyping());
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Starts tracking focus. Returns the cleanup, which also clears the mark. */
export function watchTyping(): () => void {
  const root = document.documentElement;
  const set = (typing: boolean) => {
    if (typing === root.hasAttribute("data-typing")) return;
    if (typing) root.setAttribute("data-typing", "");
    else root.removeAttribute("data-typing");
    window.dispatchEvent(new Event(EVENT));
  };
  const onFocusIn = (e: FocusEvent) => set(isTextEntry(e.target));
  // relatedTarget is where focus is going; null when it leaves for the page.
  const onFocusOut = (e: FocusEvent) => set(isTextEntry(e.relatedTarget));
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  set(isTextEntry(document.activeElement));
  return () => {
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
    set(false);
  };
}
