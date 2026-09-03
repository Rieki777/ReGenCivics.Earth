import { normalizeReturnTo } from "@shared/oauthReturnTo";
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Build an OAuth login URL. When `returnTo` is not provided, defaults to the
 * current pathname + search so post-OAuth lands the player back where they
 * were. Pass `null` (or any non-string falsy other than undefined) to
 * explicitly suppress the default.
 *
 * Server-side state-param round-trip is more robust than sessionStorage on
 * iPhone Safari — Intelligent Tracking Prevention can clear client storage
 * during the OAuth hop.
 */
function withReturnTo(base: string, returnTo?: string | null): string {
  const target = resolveReturnTo(returnTo);
  if (!target) return base;
  const url = new URL(base, window.location.origin);
  url.searchParams.set("returnTo", target);
  return url.pathname + url.search;
}

function resolveReturnTo(returnTo?: string | null): string | null {
  if (returnTo === null) return null;
  if (typeof returnTo === "string") return normalizeReturnTo(stripErrorParams(returnTo));
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  // Strip transient error params before encoding into the OAuth state.
  // Without this, a previous failed-auth redirect to /?error=auth_failed
  // poisons the OAuth state for every subsequent sign-in click, so the
  // post-success redirect bounces the user back to the error page even
  // though OAuth actually succeeded. Self-perpetuating loop.
  url.searchParams.delete("error");
  url.searchParams.delete("auth_failed");
  const path = url.pathname + url.search;
  if (!path || path === "/" || path.startsWith("/login")) return null;
  return normalizeReturnTo(path);
}

/**
 * Strip transient error params from a caller-provided returnTo string.
 * Caller-provided returnTo paths come from sessionStorage and other places
 * where the same poisoning can happen.
 */
function stripErrorParams(returnTo: string): string {
  if (!returnTo.includes("?")) return returnTo;
  try {
    const url = new URL(returnTo, "https://regencivics.earth");
    url.searchParams.delete("error");
    url.searchParams.delete("auth_failed");
    const out = url.pathname + url.search;
    return out;
  } catch {
    return returnTo;
  }
}

export const getGoogleLoginUrl = (returnTo?: string | null) =>
  withReturnTo("/api/oauth/google", returnTo);

export const getAppleLoginUrl = (returnTo?: string | null) =>
  withReturnTo("/api/oauth/apple", returnTo);

// Default login URL  -  points to Google (primary)
export const getLoginUrl = (returnTo?: string | null) => getGoogleLoginUrl(returnTo);
