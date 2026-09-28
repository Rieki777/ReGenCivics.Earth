/**
 * The offer status link's token on the client (build spec 2026-09-27,
 * section 10.1). The link is `/offer#<token>`: a fragment never reaches a
 * server, so no access log, proxy log or Referer carries it.
 *
 * captureOfferTokenFromLocation() runs at the top of client/src/App.tsx,
 * which evaluates before main.tsx registers Sentry's deferred init and before
 * React renders anything. It moves the token out of the address bar with
 * history.replaceState, so Sentry's browser SDK (which records location.href
 * and history changes) and analytics never see it. The page reads the token
 * back from memory, or from sessionStorage after a reload in the same tab.
 *
 * Every storage call is wrapped: private windows and blocked site data can
 * throw, and the page still works from memory then.
 */

const STORAGE_KEY = "regen-offer-status-token";
const OFFER_PATH = "/offer";
/** Anything longer than this is not a token; it is dropped, never stored. */
const MAX_TOKEN_CHARS = 100;

let memory: string | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Keep a token for this tab: in memory, and in sessionStorage when it works. */
export function rememberOfferToken(token: string): void {
  memory = token;
  try {
    storage()?.setItem(STORAGE_KEY, token);
  } catch {
    // Memory is enough for this visit.
  }
}

/** The token this tab holds, or null. */
export function readOfferToken(): string | null {
  if (memory) return memory;
  try {
    const stored = storage()?.getItem(STORAGE_KEY) ?? null;
    if (stored) memory = stored;
    return stored;
  } catch {
    return null;
  }
}

/** Forget the token (a bad or expired link). */
export function forgetOfferToken(): void {
  memory = null;
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * On /offer with a fragment: keep the fragment as this tab's token and take
 * it out of the address bar. Returns true when it took one. A fragment too
 * long to be a token is still cleared from the address, and not kept.
 */
export function captureOfferTokenFromLocation(loc: Location | undefined = typeof window !== "undefined" ? window.location : undefined): boolean {
  if (!loc || loc.pathname !== OFFER_PATH) return false;
  const raw = (loc.hash || "").replace(/^#/, "").trim();
  if (!raw) return false;
  try {
    window.history.replaceState(null, "", OFFER_PATH);
  } catch {
    // An old browser without replaceState keeps the fragment; the page still works.
  }
  if (raw.length > MAX_TOKEN_CHARS) {
    forgetOfferToken();
    return false;
  }
  rememberOfferToken(raw);
  return true;
}

/** Tests only. */
export function __resetOfferTokenForTests(): void {
  memory = null;
}
