/** Longest returnTo we carry. Real paths are well under this; the cap keeps a
 * junk value out of the OAuth state and the email_tokens row. */
export const MAX_RETURN_TO_LENGTH = 512;

// Browsers strip tab and newline from URLs, and a backslash reads as a slash,
// so any of these could turn "/x" into "//evil.example". None has a place in a
// same-site path, so any of them anywhere drops the value.
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;

function isUnsafeForm(value: string): boolean {
  return value.startsWith("//") || UNSAFE_CHARS.test(value);
}

// A placeholder origin to resolve the path against. It never leaves this file:
// the value must resolve back onto it, and only the path, query and hash are
// returned.
const PLACEHOLDER_ORIGIN = "https://return-to.invalid";

/**
 * Query parameters that carry a secret (unsubscribe and newsletter tokens, a
 * blog preview token, an OAuth code). A returnTo is stored in email_tokens and
 * rides in the Google/Apple state, so these are removed before it goes anywhere.
 */
export const RETURN_TO_SECRET_PARAMS = ["token", "preview", "code"] as const;

/**
 * Server endpoints, never pages. After sign-in the browser follows the returnTo
 * with the fresh session cookie, so a stranger who can choose it could chain a
 * second endpoint onto someone else's genuine sign-in link (for example
 * /api/auth/email/verify?token=<their own token>, which swaps the session for
 * theirs). Express matches routes without regard to case, so the check is too.
 */
function isServerEndpoint(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return (
    lower === "/api" ||
    lower.startsWith("/api/") ||
    lower === "/storage" ||
    lower.startsWith("/storage/")
  );
}

/** Decode up to three rounds. An escape that stops decoding after the first
 * round is ordinary data (a literal "%" someone searched for), so decoding just
 * stops there. Returns null only when the first round fails, or when any round
 * shows a form isUnsafeForm rejects. */
function decodesSafely(value: string): boolean {
  let decoded = value;
  for (let i = 0; i < 3 && decoded.includes("%"); i++) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      if (i === 0) return false;
      break;
    }
    if (isUnsafeForm(next)) return false;
    decoded = next;
  }
  return true;
}

/**
 * Same-origin page paths only. Absolute URLs, protocol-relative URLs, schemes
 * and server endpoints (/api/..., /storage/...) are dropped, so a poisoned
 * returnTo can neither send the player off-site nor chain another endpoint
 * after OAuth or the email sign-in link.
 *
 * The value is resolved the way a browser would resolve it ("/x/../api" is
 * "/api"), and what comes back is that canonical path plus its query and hash.
 * Secret query parameters (RETURN_TO_SECRET_PARAMS) are removed.
 *
 * Also dropped: values over MAX_RETURN_TO_LENGTH, control characters and
 * backslashes anywhere, percent-encoded versions of those ("/%2F%2Fevil",
 * "/%5Cevil", "/%09/evil", double encoding included), and a value whose
 * escapes do not decode at all.
 */
export function normalizeReturnTo(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_RETURN_TO_LENGTH) return null;
  if (!trimmed.startsWith("/")) return null;
  if (isUnsafeForm(trimmed)) return null;
  if (!decodesSafely(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;
  const pathname = url.pathname;
  if (pathname.startsWith("//") || !decodesSafely(pathname)) return null;
  // Checked on the decoded path as well: "/%61pi/..." is not routed as /api by
  // Express, but it costs nothing to refuse it. decodesSafely has already shown
  // the first round decodes, so this cannot throw.
  if (isServerEndpoint(pathname) || isServerEndpoint(decodeURIComponent(pathname))) return null;

  if (/[?&](error|auth_failed)=/i.test(url.search)) return null;
  // Only touch the query when a secret is in it: searchParams re-serialises the
  // whole query ("%20" becomes "+"), which is harmless but needless churn.
  if (RETURN_TO_SECRET_PARAMS.some((name) => url.searchParams.has(name))) {
    for (const name of RETURN_TO_SECRET_PARAMS) url.searchParams.delete(name);
  }

  const out = url.pathname + url.search + url.hash;
  return out.length > MAX_RETURN_TO_LENGTH ? null : out;
}
