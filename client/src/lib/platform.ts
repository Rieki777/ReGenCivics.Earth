// Small platform helpers. Kept dependency-free so any component can import them.

/**
 * True on iPhone/iPad/iPod. iOS makes HTMLMediaElement.volume read-only and
 * routes output level only through the hardware buttons, so JS volume controls
 * silently do nothing there. Detecting iOS lets us hide dead volume sliders.
 *
 * Also catches iPadOS 13+, which reports a desktop "Macintosh" user agent but
 * still exposes a touch screen (maxTouchPoints > 1).
 */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS masquerading as macOS.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}
