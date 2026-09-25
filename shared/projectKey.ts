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
