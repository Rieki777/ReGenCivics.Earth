/**
 * Live campaigns to suggest when a campaign is cancelled.
 *
 * Loads every active campaign with its linked application's country and
 * coordinates, then ranks them with the pure rankAlternatives
 * (shared/campaignSuggest.ts): real campaigns before demos, same country
 * first, then distance, then the newest. Returns public fields only.
 */
import { eq } from "drizzle-orm";
import { applications, campaigns, type Campaign } from "../../drizzle/schema";
import { getDb } from "../db";
import { rankAlternatives, type CampaignSuggestion } from "../../shared/campaignSuggest";
import { projectPathForCampaignFocus } from "../../shared/projectKey";

export type { CampaignSuggestion };

/** The target's own country and coordinates, from its application when it has one. */
async function targetOf(campaign: Pick<Campaign, "id" | "location" | "applicationId">) {
  const database = await getDb();
  let country: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  if (database && campaign.applicationId) {
    const [app] = await database
      .select({ country: applications.country, lat: applications.latitude, lng: applications.longitude })
      .from(applications)
      .where(eq(applications.id, campaign.applicationId))
      .limit(1);
    country = app?.country ?? null;
    lat = app?.lat ?? null;
    lng = app?.lng ?? null;
  }
  return { id: campaign.id, location: campaign.location ?? null, country, lat, lng };
}

/** Every active campaign as a suggestion candidate. */
export async function loadSuggestionCandidates(): Promise<CampaignSuggestion[]> {
  const database = await getDb();
  if (!database) return [];
  const rows = await database
    .select({
      id: campaigns.id,
      title: campaigns.title,
      projectName: campaigns.projectName,
      location: campaigns.location,
      applicationId: campaigns.applicationId,
      isDemo: campaigns.isDemo,
      status: campaigns.status,
      startedAt: campaigns.startedAt,
      country: applications.country,
      lat: applications.latitude,
      lng: applications.longitude,
    })
    .from(campaigns)
    .leftJoin(applications, eq(applications.id, campaigns.applicationId))
    .where(eq(campaigns.status, "active"));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    projectName: r.projectName ?? null,
    location: r.location ?? null,
    country: r.country ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    isDemo: !!r.isDemo,
    status: r.status,
    startedAt: r.startedAt ?? null,
    path: projectPathForCampaignFocus({
      id: r.id,
      applicationId: r.applicationId ?? null,
      projectName: r.projectName,
      title: r.title,
    }),
  }));
}

/** Up to `limit` live campaigns that could use the energy of a cancelled one's people. */
export async function suggestAlternatives(
  campaign: Pick<Campaign, "id" | "location" | "applicationId">,
  limit = 3,
): Promise<CampaignSuggestion[]> {
  try {
    const [target, candidates] = await Promise.all([targetOf(campaign), loadSuggestionCandidates()]);
    return rankAlternatives(target, candidates, limit);
  } catch (err) {
    console.warn("[campaign-suggest] failed (non-fatal):", err);
    return [];
  }
}

/** A plain place line for a suggestion ("Guanacaste, Costa Rica"). */
export function placeOf(s: Pick<CampaignSuggestion, "location" | "country">): string | null {
  const loc = (s.location ?? "").trim();
  if (loc) return loc;
  const c = (s.country ?? "").trim();
  return c || null;
}
