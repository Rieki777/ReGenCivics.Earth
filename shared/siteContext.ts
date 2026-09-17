/**
 * Canonical public site URLs for admin / email / support AI prompts.
 *
 * Outbound Write and Applications email agents used to invent example links
 * (fake Season 2 paths, etc.). This module is the allowlist those prompts
 * must use. Prefer editing here over hardcoding URLs in system prompts.
 *
 * Paths should match real client routes in shared/appRoutes.ts. This list is
 * curated for outbound mail and admin assistants (high-traffic CTAs), not a
 * full dump of APP_ROUTE_PATTERNS.
 */

/** Production apex. Prefer this in outbound mail and prompts. */
export const SITE_ORIGIN = "https://regencivics.earth";

/** www alias; same site. Prefer SITE_ORIGIN when writing new links. */
export const SITE_WWW_ORIGIN = "https://www.regencivics.earth";

/** Public asset CDN (images for newsletter markdown). */
export const SITE_ASSETS_ORIGIN = "https://assets.regencivics.earth";

export type SitePage = {
  /** Path starting with `/`. */
  path: string;
  /** Short label for prompts and CTAs. */
  title: string;
  /** One-line description for AI context. */
  description: string;
};

/**
 * Curated public pages email / admin bots may link to.
 * Add new entries here when a stable public CTA ships.
 */
export const SITE_CANONICAL_PAGES: readonly SitePage[] = [
  {
    path: "/",
    title: "Home",
    description: "ReGen Civics landing page.",
  },
  {
    path: "/season2",
    title: "Season 2",
    description: "Season Two incubator overview, curriculum, and how to follow along.",
  },
  {
    path: "/schedule",
    title: "Schedule",
    description: "Open Access Sessions and Season Two episode calendar.",
  },
  {
    path: "/apply",
    title: "Apply",
    description: "Land project application for Season participation.",
  },
  {
    path: "/apply/status",
    title: "Application status",
    description: "Applicants check the status of a submitted application.",
  },
  {
    path: "/investor",
    title: "Investor",
    description: "Investor overview and path into the movement.",
  },
  {
    path: "/investor-form",
    title: "Investor form",
    description: "Investor inquiry form.",
  },
  {
    path: "/investor/contact",
    title: "Investor contact",
    description: "Investor contact / follow-up path.",
  },
  {
    path: "/claim-seeds",
    title: "Claim SEEDS",
    description: "SEEDS claim flow for community participants.",
  },
  {
    path: "/newsletter",
    title: "Newsletter",
    description: "Subscribe to ReGen Civics letters.",
  },
  {
    path: "/email-preferences",
    title: "Email preferences",
    description: "Manage newsletter and email preferences (tokenized links preferred when sending).",
  },
  {
    path: "/connect",
    title: "Connect",
    description: "General connect / inquiry form hub.",
  },
  {
    path: "/loi",
    title: "Letter of intent",
    description: "LOI form for aligned partners.",
  },
  {
    path: "/custom-games",
    title: "Custom games",
    description: "Custom regenerative games overview.",
  },
  {
    path: "/custom-games/apply",
    title: "Custom games apply",
    description: "Apply to build a custom game on the ReGen stack.",
  },
  {
    path: "/ship",
    title: "The Ship",
    description: "Ship voyages, booking, and related experiences.",
  },
  {
    path: "/ship/book",
    title: "Book a voyage",
    description: "Ship voyage booking.",
  },
  {
    path: "/assembly",
    title: "Assembly",
    description: "Public Assembly trail and gatherings.",
  },
  {
    path: "/community",
    title: "Community",
    description: "Community forum and member spaces.",
  },
  {
    path: "/learn",
    title: "Learn",
    description: "Learning library and regenerative civics primers.",
  },
  {
    path: "/network",
    title: "Network",
    description: "Alliance / network directory.",
  },
  {
    path: "/fund",
    title: "Fund",
    description: "Funding and crowdpooling entry.",
  },
  {
    path: "/crowd-pooling",
    title: "Crowd-pooling",
    description: "Shared crowdpooling model and projects.",
  },
  {
    path: "/heal-the-land",
    title: "Heal the land",
    description: "Land healing pathway overview.",
  },
  {
    path: "/features",
    title: "Features",
    description: "Product / platform features overview.",
  },
  {
    path: "/socials",
    title: "Socials",
    description: "Official social channel links.",
  },
  {
    path: "/team",
    title: "Team",
    description: "Who is building ReGen Civics.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy policy",
    description: "Privacy policy.",
  },
  {
    path: "/terms-of-use",
    title: "Terms of use",
    description: "Terms of use.",
  },
  {
    path: "/unsubscribe",
    title: "Unsubscribe",
    description: "Generic unsubscribe entry (prefer tokenized email-preferences when sending).",
  },
] as const;

/** Join apex origin and a path that may or may not start with `/`. */
export function absoluteSiteUrl(path: string): string {
  const p = (path || "/").trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (!p || p === "/") return SITE_ORIGIN;
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${SITE_ORIGIN}${normalized}`;
}

/**
 * Prompt block for email / admin AI: only these URLs; never invent links.
 * Safe to append to every draft system prompt.
 */
export function formatSiteContextForPrompt(): string {
  const lines = SITE_CANONICAL_PAGES.map((page) => {
    const url = absoluteSiteUrl(page.path);
    return `- ${page.title}: ${url} - ${page.description}`;
  });
  return [
    "## Canonical site URLs (DATA, never invent links)",
    `Production origin: ${SITE_ORIGIN}`,
    `Also valid: ${SITE_WWW_ORIGIN}`,
    `Image assets only: ${SITE_ASSETS_ORIGIN}/... (never invent asset paths; leave a placeholder and ask the admin).`,
    "Only use URLs from this list (or a path the admin explicitly gave you in this conversation).",
    "If the page you need is not listed, say so and ask the admin for the correct URL. Do not invent Season, apply, investor, or claim links.",
    "Preferred markdown link form: [Label](https://regencivics.earth/path)",
    "",
    ...lines,
  ].join("\n");
}
