/**
 * The Needs tab read, loaded from the database: every open need across live
 * public campaigns, least covered first, examples in their own list, plus
 * the money routes people can use. Moved here from campaigns.listOpenNeeds
 * (build spec 2026-09-27, section 9.2) so the close notices can offer the
 * same needs the Needs tab shows, in the same order. The procedure keeps its
 * 60-second cache and calls loadOpenNeeds.
 *
 * Privacy is unchanged: shared/openNeeds.ts builds rows with counts and a
 * status, never a contributor's name, contact or loan dates
 * (server/open-needs.test.ts pins the row shape).
 */
import { and, inArray } from "drizzle-orm";
import * as db from "../db";
import { campaignPartnerLinks } from "../../drizzle/schema";
import { cacheGet } from "../cache";
import { isPublicCampaign } from "./project-steward";
import {
  OPEN_NEEDS_CACHE_KEY,
  buildOpenNeeds,
  type OpenNeedsResult,
} from "../../shared/openNeeds";
import type { NeedVerb } from "../../shared/crowdpoolNeedAction";

/** Build the Needs tab answer from the database, uncached. */
export async function loadOpenNeeds(): Promise<OpenNeedsResult> {
  const live = (await db.listCampaigns("active")).filter((c) => isPublicCampaign(c));
  const ids = live.map((c) => c.id);
  const inputs = await db.getCampaignProgressInputs(ids);
  const database = await db.getDb();
  const routes = database && ids.length > 0
    ? await database
        .select({
          campaignId: campaignPartnerLinks.campaignId,
          partner: campaignPartnerLinks.partner,
          label: campaignPartnerLinks.label,
          status: campaignPartnerLinks.status,
        })
        .from(campaignPartnerLinks)
        .where(and(
          inArray(campaignPartnerLinks.campaignId, ids),
          db.publicRouteWhere({ loanRoutesOpen: await db.loanRoutesOpen(), withExamples: true }),
        ))
        .orderBy(campaignPartnerLinks.id)
    : [];
  return buildOpenNeeds({ campaigns: live, inputs, routes });
}

/** One need on another project, offered at a close. */
export type OtherNeed = { title: string; projectName: string; verb: NeedVerb; path: string };

/**
 * Up to `limit` real open needs on other campaigns, first in the Needs tab's
 * ranking (no one offered yet first, then the least covered). Reads the
 * Needs tab's cache when it is warm. Examples are never offered. Never
 * throws: a close notice goes out without suggestions rather than not at all.
 */
export async function otherOpenNeeds(excludeCampaignId: number, limit: number): Promise<OtherNeed[]> {
  if (!(limit > 0)) return [];
  try {
    const result = (await cacheGet<OpenNeedsResult>(OPEN_NEEDS_CACHE_KEY)) ?? (await loadOpenNeeds());
    return result.needs
      .filter((n) => n.campaignId !== excludeCampaignId && !n.isDemo)
      .slice(0, limit)
      .map((n) => ({ title: n.title, projectName: n.projectName, verb: n.verb, path: n.path }));
  } catch (err) {
    console.warn("[open-needs] other open needs failed (non-fatal):", err);
    return [];
  }
}
