export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Build an OAuth login URL. Pass `returnTo` to have the server bounce the
 * player back to a specific relative path after Google signs them in.
 * Relying on the server-side state param is more robust than sessionStorage,
 * which iOS Safari's Intelligent Tracking Prevention can clear during the
 * OAuth round-trip.
 */
function withReturnTo(base: string, returnTo?: string): string {
  if (!returnTo) return base;
  const url = new URL(base, window.location.origin);
  url.searchParams.set("returnTo", returnTo);
  return url.pathname + url.search;
}

export const getGoogleLoginUrl = (returnTo?: string) =>
  withReturnTo("/api/oauth/google", returnTo);

export const getAppleLoginUrl = (returnTo?: string) =>
  withReturnTo("/api/oauth/apple", returnTo);

// Default login URL  -  points to Google (primary)
export const getLoginUrl = (returnTo?: string) => getGoogleLoginUrl(returnTo);
