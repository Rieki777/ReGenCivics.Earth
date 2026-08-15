/**
 * Every path the client router can serve.
 *
 * The SPA catch-all answers 200 for anything it does not recognise, so until
 * 2026-08-03 an unbounded space of invented URLs each looked like a real page
 * to a crawler: /learn/buy-cheap-things, /totally-made-up-route, all 200, each
 * carrying whatever meta the nearest route prefix supplied and a canonical
 * naming itself. That is a soft 404. Google downranks for it and it spends
 * crawl budget on pages that do not exist, on a site whose whole problem is
 * getting crawled properly.
 *
 * This is the allowlist that lets server/_core/vite.ts answer honestly. It is
 * generated from the <Route path={...}> literals in client/src/App.tsx, and
 * server/app-routes.test.ts re-parses that file and fails if the two ever
 * disagree, so adding a route without adding it here cannot ship.
 *
 * Patterns are wouter syntax: ':name' matches one segment, ':name?' makes that
 * segment optional. No wildcards are in use and none are supported here.
 *
 * Data only, no imports, so both halves of the app can read it.
 */

export const APP_ROUTE_PATTERNS: readonly string[] = [
  "/",
  "/404",
  "/accessibility",
  "/admin",
  "/admin-create",
  "/admin/application/:id",
  "/admin/applications",
  "/admin/calls",
  "/admin/funding",
  "/admin/governance-forks",
  "/admin/moderation",
  "/admin/ship",
  "/admin/voice-rules",
  "/ally",
  "/apply",
  "/apply/status",
  "/apply/success",
  "/assembly",
  "/bionomics",
  "/bionomics/edit",
  "/blog",
  "/blog/:slug",
  "/board",
  "/bounties",
  "/bounties/:id",
  "/bridge/hypha/:bridgeKey",
  "/calculator",
  "/campaign/:id",
  "/campaign/:id/analytics",
  "/campaign/:id/manage",
  "/campaigns",
  "/checkin/:token",
  "/church",
  "/claim-seeds",
  "/co-creators-guide",
  "/community",
  "/community/c/:slug",
  "/community/chains",
  "/community/decisions",
  "/community/decisions/stories",
  "/community/guidelines",
  "/community/lessons",
  "/community/members",
  "/community/new",
  "/community/offering-support",
  "/community/post/:id",
  "/community/quests",
  "/community/seeking-support",
  "/community/seeking-team",
  "/community/tag/:tag",
  "/community/user/:id",
  "/compare-projects",
  "/connect",
  "/create-campaign",
  "/crowd-pooling",
  "/crowd-pooling-projects",
  "/custom-games",
  "/custom-games/apply",
  "/disclaimers",
  "/economy",
  "/events/:id",
  "/features",
  "/federation",
  "/form",
  "/fund",
  "/game",
  "/game-mechanics",
  "/glossary",
  "/gov/:slug",
  "/gov/:slug/backfield",
  "/gov/create",
  "/governance",
  "/heal-the-land",
  "/hymn-book",
  "/hymn-book/:slug",
  "/investmentform",
  "/investor",
  "/investor-form",
  "/investor/contact",
  "/land",
  "/learn",
  "/learn/:slug",
  "/local-food-economy",
  "/loi",
  "/map",
  "/marketplace",
  "/messages",
  "/messages/:conversationId?",
  "/multiplayer",
  "/my-applications",
  "/network",
  "/newsletter",
  "/newsletter/confirm",
  "/notifications",
  "/opportunity",
  "/play",
  "/plays",
  "/plays/:slug",
  "/plays/submit",
  "/privacy-policy",
  "/profile",
  "/profile/:handle",
  "/proposals",
  "/quest",
  "/quest/:slug",
  "/regen-community-onboarding",
  "/regen-games",
  "/risk-disclosure",
  "/schedule",
  "/season2",
  "/seasons",
  "/series/:season",
  "/settings/notifications",
  "/shape-next-session",
  "/ship",
  "/ship/book",
  "/ship/concierge",
  "/ship/crew-list/confirm",
  "/ship/crew-list/unsubscribe",
  "/ship/fleet",
  "/ship/galley",
  "/ship/giveaway",
  "/ship/giveaway/rules",
  "/ship/guide",
  "/ship/honeymoon",
  "/ship/inventory",
  "/ship/inventory/:slug",
  "/ship/keeper",
  "/ship/log",
  "/ship/log/:slug",
  "/ship/map",
  "/ship/nominate",
  "/ship/quest",
  "/ship/quest/rules",
  "/ship/terms",
  "/ship/theme",
  "/ship/voyage",
  "/ship/winter",
  "/showcase",
  "/socials",
  "/team",
  "/terms-of-use",
  "/tokenomics",
  "/tools",
  "/tools/:slug",
  "/tools/submit",
  "/unsubscribe",
  "/watch/:videoId",
] as const;

/**
 * Paths that reach the SPA catch-all without being client routes.
 *
 * Most server-owned paths (/api/*, /sitemap.xml, /llms.txt, /feed.xml, static
 * assets) are answered by earlier middleware and never get here. These are the
 * ones that legitimately fall through, so they must not be treated as unknown.
 */
export const SERVER_RENDERED_PREFIXES: readonly string[] = [
  "/embed", // server-rendered widgets with live DB data (server/routes/embed.ts)
  "/.well-known",
] as const;

/** Turns one wouter pattern into an anchored regex. */
function patternToRegex(pattern: string): RegExp {
  const source = pattern
    .split("/")
    .filter((seg, i) => !(i === 0 && seg === ""))
    .map((seg) => {
      if (seg.startsWith(":")) {
        // ':name?' makes the whole segment, including its slash, optional.
        return seg.endsWith("?") ? "(?:/[^/]+)?" : "/[^/]+";
      }
      return "/" + seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${source || "/"}$`);
}

const COMPILED = APP_ROUTE_PATTERNS.map(patternToRegex);

/**
 * True when the client router has a route for this path.
 *
 * Pass a pathname with no query string and no trailing slash. A `true` here
 * means the route pattern exists, not that the record behind it does: a valid
 * /community/post/:id shape still returns true for an id that was deleted.
 * This distinguishes "no such page" from "no such row", and only the first is
 * something the router can know.
 */
export function matchesAppRoute(path: string): boolean {
  if (path === "/") return true;
  if (SERVER_RENDERED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return true;
  }
  return COMPILED.some((re) => re.test(path));
}
