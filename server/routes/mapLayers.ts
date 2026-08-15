/**
 * Civics map layers (Phase B1, improvement 2): the living world-state.
 *
 * One read procedure returning per-bioregion aggregates for the season
 * activity layer on the main Civics globe (client/src/components/GlobeMap.tsx):
 * quest completions this season plus active multiplayer crews, each attributed
 * to a bioregion. Aggregate-only per ADR-28 (counts, never identities), cached,
 * zero LLM. The ship map's Leaflet stack stays untouched (ADR-32).
 *
 * "This season" prefers the active game_seasons row; when none exists it falls
 * back to the Season 1 boundary the client's getCurrentSeason already encodes
 * (Season 1 runs Winter Solstice 2025 to the 2026-09-22 equinox).
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md, Phase B.
 */

import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cacheGet, cacheSet } from "../cache";
import { bioregions, playerProfiles, questCompletions, questCrews } from "../../drizzle/schema";
import { bioregionCentroid } from "@shared/bioregionCentroids";

const CACHE_KEY = "map:season-activity";
const CACHE_TTL_SECONDS = 300;
const SEASON_1_START = new Date("2025-12-21T00:00:00Z");

export type SeasonActivityRow = {
  bioregionId: number;
  slug: string | null;
  name: string;
  lat: number | null;
  lng: number | null;
  completions: number;
  activeCrews: number;
};

export type SeasonActivityResult = {
  seasonStart: string;
  rows: SeasonActivityRow[];
};

async function currentSeasonStart(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<Date> {
  try {
    const result: any = await db.execute(
      sql`SELECT startDate FROM game_seasons WHERE status = 'active' AND startDate <= NOW() ORDER BY startDate DESC LIMIT 1`,
    );
    const row = result?.[0]?.[0];
    if (row?.startDate) return new Date(row.startDate);
  } catch {
    // game_seasons may be empty or the query racing a migration; fall through.
  }
  return SEASON_1_START;
}

export const mapLayersRouter = router({
  /** Per-bioregion season activity: completion counts + active crew counts. */
  seasonActivity: publicProcedure.query(async (): Promise<SeasonActivityResult> => {
    const cached = await cacheGet<SeasonActivityResult>(CACHE_KEY);
    if (cached) return cached;

    const db = await getDb();
    if (!db) return { seasonStart: SEASON_1_START.toISOString(), rows: [] };

    const seasonStart = await currentSeasonStart(db);

    // Completions attributed to the completing player's primary bioregion.
    const completionRows = await db
      .select({
        bioregionId: playerProfiles.bioregionId,
        count: sql<number>`count(*)`,
      })
      .from(questCompletions)
      .innerJoin(playerProfiles, eq(playerProfiles.userId, questCompletions.userId))
      .where(and(gte(questCompletions.completedAt, seasonStart), isNotNull(playerProfiles.bioregionId)))
      .groupBy(playerProfiles.bioregionId);

    const crewRows = await db
      .select({
        bioregionId: questCrews.bioregionId,
        count: sql<number>`count(*)`,
      })
      .from(questCrews)
      .where(inArray(questCrews.status, ["forming", "ready", "active"]))
      .groupBy(questCrews.bioregionId);

    const byBioregion = new Map<number, { completions: number; activeCrews: number }>();
    for (const r of completionRows) {
      if (r.bioregionId === null) continue;
      byBioregion.set(r.bioregionId, { completions: Number(r.count), activeCrews: 0 });
    }
    for (const r of crewRows) {
      const entry = byBioregion.get(r.bioregionId) ?? { completions: 0, activeCrews: 0 };
      entry.activeCrews = Number(r.count);
      byBioregion.set(r.bioregionId, entry);
    }

    let rows: SeasonActivityRow[] = [];
    if (byBioregion.size > 0) {
      const meta = await db
        .select({ id: bioregions.id, slug: bioregions.slug, name: bioregions.name })
        .from(bioregions)
        .where(inArray(bioregions.id, [...byBioregion.keys()]));
      rows = meta.map((b) => {
        const counts = byBioregion.get(b.id)!;
        const centroid = bioregionCentroid(b.slug);
        return {
          bioregionId: b.id,
          slug: b.slug,
          name: b.name,
          lat: centroid?.lat ?? null,
          lng: centroid?.lng ?? null,
          completions: counts.completions,
          activeCrews: counts.activeCrews,
        };
      });
      rows.sort((a, b) => b.completions + b.activeCrews - (a.completions + a.activeCrews));
    }

    const result: SeasonActivityResult = { seasonStart: seasonStart.toISOString(), rows };
    await cacheSet(CACHE_KEY, result, CACHE_TTL_SECONDS);
    return result;
  }),
});
