/**
 * Money routes: the partner pages a project holds outside ReGen Civics
 * (build spec 2026-09-25, section 7.1). Pure: no database, no network.
 *
 * A project steward adds a route (campaigns.addPartnerLink, or
 * campaigns.create with moneyRoutes). A ReGen Civics admin verifies it
 * (campaigns.reviewPartnerLink). The nightly hydration job
 * (server/routes/batchJobs.ts hydrateCampaignPartnerLinks) fetches verified
 * routes only, so every URL it touches went through validateRouteUrl here and
 * an admin looked at it. OWASP A10: creators now supply URLs the server
 * fetches, so the host is an exact allowlist per partner, https only, and a
 * redirect is followed only to the same allowlist (isAllowedHop).
 *
 * Money through a route never passes through ReGen Civics: the contributor
 * finishes on the partner's own site.
 */

/** What a steward can add in this build: Ma Earth for gifts, Steward for loans. */
export const ROUTE_PARTNERS = ["maearth", "gosteward"] as const;
export type RoutePartner = (typeof ROUTE_PARTNERS)[number];

/** Exact hostnames per partner. No subdomain wildcard, no look-alikes. */
export const PARTNER_HOSTS: Record<RoutePartner, string[]> = {
  maearth: ["maearth.com", "www.maearth.com"],
  gosteward: ["gosteward.com", "www.gosteward.com"],
};

/** The partner's name as people read it. */
export const ROUTE_PARTNER_NAMES: Record<RoutePartner, string> = {
  maearth: "Ma Earth",
  gosteward: "Steward",
};

/** The label a new route carries on the project page. */
export const ROUTE_PARTNER_LABELS: Record<RoutePartner, string> = {
  maearth: "Give through Ma Earth",
  gosteward: "Lend through Steward",
};

export const MAX_ROUTE_URL_LENGTH = 512;

export function isRoutePartner(value: unknown): value is RoutePartner {
  return typeof value === "string" && (ROUTE_PARTNERS as readonly string[]).includes(value);
}

function routeRefusal(partner: RoutePartner): string {
  return `Use your project's page on ${ROUTE_PARTNER_NAMES[partner]}. The link has to start with https://${PARTNER_HOSTS[partner][0]}.`;
}

/** True when a parsed URL is https on one of the partner's exact hosts, on the default port, with no credentials. */
function onPartnerHost(partner: RoutePartner, u: URL): boolean {
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.port !== "") return false;
  return PARTNER_HOSTS[partner].includes(u.hostname.toLowerCase());
}

/**
 * Check a route URL a steward typed. https only, no username or password,
 * the host exactly one of the partner's, the default port, at most 512
 * characters, and a path past the site's front page (a route is the
 * project's own page on the partner). Returns the normalised URL.
 */
export function validateRouteUrl(
  partner: RoutePartner,
  raw: string,
): { ok: true; url: string } | { ok: false; message: string } {
  const refusal = { ok: false as const, message: routeRefusal(partner) };
  if (!isRoutePartner(partner)) return { ok: false, message: "Choose Ma Earth or Steward." };
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text || text.length > MAX_ROUTE_URL_LENGTH) return refusal;
  // Whitespace or control characters inside a URL are never part of a real page link.
  if (/[\s\u0000-\u001f\u007f]/.test(text)) return refusal;
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return refusal;
  }
  if (!onPartnerHost(partner, u)) return refusal;
  if (u.pathname === "" || u.pathname === "/") return refusal;
  const url = u.href;
  if (url.length > MAX_ROUTE_URL_LENGTH) return refusal;
  return { ok: true, url };
}

/** Shown when a steward adds a page that is already one of the campaign's routes. */
export const DUPLICATE_ROUTE_MESSAGE = "That page is already one of this campaign's routes.";

/**
 * The page a route URL points at, for spotting one page added twice (a retry
 * after a network error is enough). Host without "www.", path without
 * trailing slashes, both in lower case, plus the query string; the fragment
 * never names a different page. The nightly job writes a page's one total
 * into every verified row that points at it, so two rows with the same key
 * would count that money twice. Null for a string that is not a URL.
 */
export function routePageKey(url: string): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "").toLowerCase();
  return `${host}${path}${u.search}`;
}

/**
 * Check the optional proof link (a page showing the route is the project's
 * own). Any host, https only, no credentials, at most 512 characters. It is
 * shown to admins only, as a link with rel="noopener noreferrer", and the
 * server never fetches it.
 */
export function validateProofUrl(raw: string): { ok: true; url: string } | { ok: false; message: string } {
  const refusal = { ok: false as const, message: "The link that shows the page is yours has to start with https://." };
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text || text.length > MAX_ROUTE_URL_LENGTH) return refusal;
  if (/[\s\u0000-\u001f\u007f]/.test(text)) return refusal;
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return refusal;
  }
  if (u.protocol !== "https:" || u.username || u.password || !u.hostname) return refusal;
  if (u.href.length > MAX_ROUTE_URL_LENGTH) return refusal;
  return { ok: true, url: u.href };
}

/**
 * Whether the hydration job may follow a redirect from `from` to `location`
 * (a Location header, possibly relative). Only to the same partner's
 * allowlist, https only. Anything else counts as a failed fetch.
 */
export function isAllowedHop(partner: RoutePartner, from: URL, location: string): boolean {
  if (!isRoutePartner(partner)) return false;
  if (typeof location !== "string" || !location.trim()) return false;
  let next: URL;
  try {
    next = new URL(location.trim(), from);
  } catch {
    return false;
  }
  return onPartnerHost(partner, next);
}
