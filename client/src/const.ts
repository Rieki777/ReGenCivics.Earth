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
  if (typeof returnTo === "string") return returnTo;
  if (typeof window === "undefined") return null;
  const path = window.location.pathname + window.location.search;
  // Don't bounce back to "/" or auth-related paths.
  if (!path || path === "/" || path.startsWith("/login")) return null;
  return path;
}

export const getGoogleLoginUrl = (returnTo?: string | null) =>
  withReturnTo("/api/oauth/google", returnTo);

export const getAppleLoginUrl = (returnTo?: string | null) =>
  withReturnTo("/api/oauth/apple", returnTo);

// Default login URL  -  points to Google (primary)
export const getLoginUrl = (returnTo?: string | null) => getGoogleLoginUrl(returnTo);
