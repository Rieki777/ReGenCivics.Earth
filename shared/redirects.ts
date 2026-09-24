/**
 * Permanent route redirects, as data, so the server and the client agree.
 *
 * Every entry here is a redirect that ALREADY EXISTED in client/src/App.tsx as
 * a `<Redirect to>` or a `window.location.replace`. Nothing new is invented:
 * these are the pathways the site already has, expressed somewhere an agent
 * can see them.
 *
 * Why this file exists. A client-side redirect runs in the browser, so it is
 * invisible to anything that does not execute JavaScript. Muse, Gemini Spark
 * and Instinct read HTML before they run anything, and GPTBot, ClaudeBot and
 * PerplexityBot never run anything at all. To all of them a client-redirected
 * route is a blank page that never says where to go.
 *
 * Measured on production 2026-09-23 by the phase -2 agent baseline: 94 of 206
 * public urls returned an empty shell, and twelve of those were these
 * redirects. They were never missing content. They were missing a status line.
 *
 * A 301 also does the SEO job the client version could not: link equity
 * follows a server redirect and does not follow a JavaScript one, and a
 * crawler that cannot follow the hop indexes the empty shell instead of the
 * destination.
 *
 * Keep this in sync with App.tsx. `server/redirect-parity.test.ts` reads both
 * and fails if either side gains a route the other does not have, because a
 * half-applied redirect map is worse than none: it sends humans and agents to
 * different places.
 *
 * Types and data only, no imports, so client and server both take it.
 */

export interface RouteRedirect {
  /** The path as App.tsx declares it, no trailing slash. */
  from: string;
  /** Absolute path on this site, or a full url for an off-site destination. */
  to: string;
}

export const ROUTE_REDIRECTS: RouteRedirect[] = [
  { from: "/form", to: "/connect" },
  { from: "/church", to: "https://core.regencivics.earth" },
  { from: "/ship/honeymoon", to: "/blog/more-than-one-honeymoon" },
  { from: "/investmentform", to: "/investor" },
  { from: "/investor-form", to: "/investor" },
  { from: "/crowd-pooling-projects", to: "/campaigns" },
  { from: "/community/decisions", to: "/assembly" },
  { from: "/community/lessons", to: "/community/tag/lesson" },
  { from: "/community/seeking-support", to: "/community/tag/seeking-support" },
  { from: "/community/offering-support", to: "/community/tag/offering-support" },
  { from: "/economy", to: "/bionomics" },
  { from: "/local-food-economy", to: "/bionomics#local-food-economies" },
  { from: "/proposals", to: "/assembly" },
  { from: "/federation", to: "/network" },
];

const BY_PATH = new Map(ROUTE_REDIRECTS.map((r) => [r.from, r.to]));

/**
 * The destination for a path, or null when it is not a redirect.
 *
 * Trailing slashes are normalised because a crawler that found `/economy/` in
 * someone else's markup should still be sent somewhere, rather than landing on
 * the blank shell this whole file exists to remove.
 */
export function redirectFor(pathname: string): string | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return BY_PATH.get(clean) ?? null;
}
