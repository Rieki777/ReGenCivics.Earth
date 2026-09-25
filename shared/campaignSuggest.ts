/**
 * Suggest live campaigns to people whose campaign was cancelled. Pure.
 *
 * Keep only other active campaigns. Prefer real ones: the demos are used only
 * when no real campaign is live. Rank by same country first, then distance
 * when both have coordinates, then the newest start.
 */

export type CampaignSuggestion = {
  id: number;
  title: string;
  projectName: string | null;
  location: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  isDemo: boolean | number;
  status: string;
  startedAt: Date | string | null;
  path: string;
};

export type SuggestTarget = Pick<CampaignSuggestion, "id" | "location" | "country" | "lat" | "lng">;

/** The country from the linked application, else the last comma segment of location. */
export function countryOf(c: Pick<CampaignSuggestion, "country" | "location">): string | null {
  const direct = (c.country ?? "").trim();
  if (direct) return direct.toLowerCase();
  const loc = (c.location ?? "").trim();
  if (!loc.includes(",")) return null;
  const last = loc.split(",").pop()!.trim();
  return last ? last.toLowerCase() : null;
}

function hasCoords(c: { lat: number | null; lng: number | null }): boolean {
  return typeof c.lat === "number" && typeof c.lng === "number" && Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function time(d: Date | string | null): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function rankAlternatives(
  target: SuggestTarget,
  candidates: CampaignSuggestion[],
  limit = 3,
): CampaignSuggestion[] {
  const live = candidates.filter((c) => c.status === "active" && c.id !== target.id);
  const real = live.filter((c) => !c.isDemo);
  const pool = real.length > 0 ? real : live.filter((c) => !!c.isDemo);

  const targetCountry = countryOf(target);
  const targetHasCoords = hasCoords(target);

  const scored = pool.map((c) => {
    const sameCountry = targetCountry != null && countryOf(c) === targetCountry ? 0 : 1;
    const distance = targetHasCoords && hasCoords(c)
      ? haversineKm(target as { lat: number; lng: number }, c as { lat: number; lng: number })
      : Number.POSITIVE_INFINITY;
    return { c, sameCountry, distance, started: time(c.startedAt) };
  });

  scored.sort((a, b) =>
    a.sameCountry - b.sameCountry
    || (a.distance === b.distance ? 0 : a.distance < b.distance ? -1 : 1)
    || b.started - a.started
    || a.c.id - b.c.id,
  );

  return scored.slice(0, Math.max(0, limit)).map((s) => s.c);
}
