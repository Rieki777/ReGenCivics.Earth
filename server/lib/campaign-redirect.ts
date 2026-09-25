/**
 * /campaign/:id is no longer a page. The project page is the campaign page
 * (/project/:key?campaign=:id, shared/projectKey.ts), so an old campaign link
 * answers a 301 there (build spec 2026-09-25, section 8.7).
 *
 * Only for a campaign the public may see (isPublicCampaign). An unpublished
 * campaign never 301s, because the Location header would carry its project
 * name in the slug to anyone counting ids. Those fall through to the SPA,
 * where client/src/pages/CampaignRedirect.tsx asks campaigns.getById (which
 * admits the campaign's stewards) and moves in the browser.
 *
 * The query string travels (?ref= attribution, utm tags). A browser carries
 * the original #fragment across a 301 whose Location has none, so a
 * /campaign/12#need-5 link still lands on the need.
 *
 * GET and HEAD on exactly /campaign/:id only: /campaign/:id/manage and
 * /campaign/:id/analytics are real pages, and a POST is never turned into a
 * redirect.
 */
import type { NextFunction, Request, Response } from "express";
import { campaignRedirectTarget } from "../../shared/projectKey";
import type { Campaign } from "../../drizzle/schema";
import { isPublicCampaign, type CampaignVisibilityRef } from "./project-steward";

export type RedirectableCampaign = CampaignVisibilityRef & Pick<Campaign, "id" | "applicationId" | "projectName" | "title">;

const CAMPAIGN_PATH = /^\/campaign\/(\d+)$/;

export function campaignRedirectMiddleware(load: (id: number) => Promise<RedirectableCampaign | null | undefined>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const m = CAMPAIGN_PATH.exec(req.path);
    if (!m) return next();
    const id = Number(m[1]);
    if (!Number.isSafeInteger(id) || id <= 0) return next();
    let campaign: RedirectableCampaign | null | undefined;
    try {
      campaign = await load(id);
    } catch {
      // The database being down never breaks the page: the client redirect takes over.
      return next();
    }
    if (!campaign || !isPublicCampaign(campaign)) return next();
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.redirect(301, campaignRedirectTarget(campaign, qs, ""));
  };
}
