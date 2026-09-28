/**
 * Project page keys. Pure, shared by server and client.
 *
 * A land project's public page lives at /project/:key. The key is readable:
 * `{applicationId}-{slug}` for a project with an application, and
 * `c{campaignId}-{slug}` for a campaign with none (demos and play-launched
 * drafts). The slug is decoration: the server answers any slug and returns
 * the canonical path, and a campaign key for a campaign that has an
 * application canonicalizes to the application key.
 */

import { decodeBasicEntities } from "./htmlText";

const SLUG_MAX = 60;

export function slugifyProjectName(name: string): string {
  // Names are stored sanitized ("Seeds &amp; Soil"): decode before slugging.
  const base = decodeBasicEntities(String(name ?? ""))
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, SLUG_MAX).replace(/-+$/g, "");
}

function withSlug(prefix: string, name: string): string {
  const slug = slugifyProjectName(name);
  return slug ? `${prefix}-${slug}` : prefix;
}

export function projectKey(p: { applicationId: number | null | undefined; campaignId: number; name: string }): string {
  if (p.applicationId) return withSlug(String(p.applicationId), p.name);
  return withSlug(`c${p.campaignId}`, p.name);
}

export type ParsedProjectKey = { kind: "application"; id: number } | { kind: "campaign"; id: number };

export function parseProjectKey(key: string): ParsedProjectKey | null {
  if (typeof key !== "string" || key.length === 0 || key.length > 120) return null;
  const m = /^(c?)(\d+)(?:-[a-z0-9-]*)?$/.exec(key);
  if (!m) return null;
  const id = Number(m[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return m[1] === "c" ? { kind: "campaign", id } : { kind: "application", id };
}

/**
 * A project's follow ref (0265): `a{applicationId}` for a project with an
 * application, `c{campaignId}` for a campaign with none. It is the targetId
 * of a `user_follows` row with targetType 'project' and the projectRef of an
 * email follower (campaign_followers), so a follow lasts from one season's
 * campaign to the next. Migration 0265 writes the same refs in SQL.
 */
export function projectRefFor(c: { id: number; applicationId: number | null | undefined }): string {
  return c.applicationId ? `a${c.applicationId}` : `c${c.id}`;
}

/**
 * The follow ref for a parsed page key. An application key is `a{id}`. A
 * campaign key is `a{applicationId}` when that campaign has an application
 * (pass the campaign), else `c{id}`, the same ref projectRefFor gives it.
 */
export function projectRefFromKey(
  parsed: ParsedProjectKey,
  campaign?: { applicationId: number | null | undefined } | null,
): string {
  if (parsed.kind === "application") return `a${parsed.id}`;
  return campaign?.applicationId ? `a${campaign.applicationId}` : `c${parsed.id}`;
}

/** The parts of a follow ref, or null for anything that isn't one. */
export function parseProjectRef(ref: string): ParsedProjectKey | null {
  if (typeof ref !== "string" || ref.length > 24) return null;
  const m = /^([ac])(\d+)$/.exec(ref);
  if (!m) return null;
  const id = Number(m[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return m[1] === "a" ? { kind: "application", id } : { kind: "campaign", id };
}

export function projectPathForApplication(appId: number, name: string): string {
  return `/project/${projectKey({ applicationId: appId, campaignId: 0, name })}`;
}

export function projectPathForCampaign(c: {
  id: number;
  applicationId: number | null | undefined;
  projectName?: string | null;
  title: string;
}): string {
  const name = (c.projectName && c.projectName.trim()) || c.title;
  return `/project/${projectKey({ applicationId: c.applicationId ?? null, campaignId: c.id, name })}`;
}

/**
 * Where the project page should quietly move to, or null to stay. The slug
 * is decoration, so a page whose URL differs from the server's canonical path
 * moves there in place. Never while the data on screen is the previous
 * project's (a placeholder while a new key loads): that would bounce a
 * visitor moving from one project to another straight back.
 */
export function canonicalRedirectTarget(args: {
  location: string;
  canonicalPath: string | null | undefined;
  isPlaceholderData: boolean;
}): string | null {
  if (args.isPlaceholderData || !args.canonicalPath) return null;
  return args.location === args.canonicalPath ? null : args.canonicalPath;
}

/**
 * The project page, focused on one campaign: `?campaign={id}` makes that
 * campaign the page's front (server/routes/projects.ts pickFrontCampaign),
 * so a project with several campaigns can reach each one's tools. Every
 * campaign notice, digest and manage link uses this.
 */
export function projectPathForCampaignFocus(c: Parameters<typeof projectPathForCampaign>[0]): string {
  return `${projectPathForCampaign(c)}?campaign=${c.id}`;
}

/**
 * Where an old /campaign/:id link lands: the project page focused on that
 * campaign, carrying every other query parameter the link had (a ?ref=
 * attribution token, utm_ tags) and the #anchor (a #need-12 link). A stale
 * `campaign` parameter in `search` is dropped, so the id in the path wins.
 * Used by the server 301 (server/lib/campaign-redirect.ts), the client
 * redirect (client/src/pages/CampaignRedirect.tsx) and every link that used
 * to point at /campaign/:id.
 *
 * `search` may start with "?" or not; `hash` may start with "#" or be empty.
 */
export function campaignRedirectTarget(
  c: Parameters<typeof projectPathForCampaign>[0],
  search: string,
  hash: string,
): string {
  const params = new URLSearchParams(String(search ?? "").replace(/^\?/, ""));
  params.delete("campaign");
  const rest = params.toString();
  const h = String(hash ?? "");
  const fragment = h && h !== "#" ? (h.startsWith("#") ? h : `#${h}`) : "";
  return `${projectPathForCampaignFocus(c)}${rest ? `&${rest}` : ""}${fragment}`;
}
