// server/lib/geocode.ts
//
// Server-side forward geocoding via OpenStreetMap Nominatim (no API key needed).
//
// Why this exists: the map pin on /apply is optional and the client-side Google
// geocoder only runs if the applicant interacts with the map. Applications that
// are submitted with a text-only "location" therefore land in the DB with NULL
// latitude/longitude and stay invisible on the globe (mapData requires both).
// This lets the submit flow backfill coordinates from the typed location.
//
// Best-effort by contract: every failure path returns null so callers can treat
// geocoding as non-fatal and never block a submission on it.

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** English country name from Nominatim address details, when available. */
  country?: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Placeholder "locations" that carry no geographic meaning. Nominatim will still
// return *something* for these (e.g. "Various" resolves to a place in China), so
// we refuse to geocode them rather than drop a misleading pin on the globe.
const PLACEHOLDER_LOCATIONS = new Set([
  "various",
  "various locations",
  "multiple",
  "multiple locations",
  "tbd",
  "to be determined",
  "n/a",
  "na",
  "none",
  "unknown",
  "global",
  "worldwide",
  "everywhere",
  "remote",
  "online",
]);

// Nominatim's usage policy requires a descriptive User-Agent identifying the app.
const USER_AGENT = "regen-civics/1.0 (+https://regencivics.earth)";

/**
 * Build the ordered list of query variants to try. Applicants type things like
 * "Goodman, MO, US (Ozarks)" — Nominatim returns nothing for the raw string but
 * resolves cleanly once the parenthetical annotation is stripped, so we fall back
 * to a sanitized variant. Variants are de-duplicated and emptied entries dropped.
 */
function queryVariants(raw: string): string[] {
  const stripped = raw
    .replace(/\s*\([^)]*\)/g, "") // remove "(Ozarks)"-style annotations
    .replace(/\s+/g, " ")
    .replace(/[\s,]+$/g, "") // trailing commas/space left by the strip
    .trim();
  return [...new Set([raw, stripped].filter((s) => s.length > 0))];
}

async function fetchGeocode(query: string): Promise<GeocodeResult | null> {
  const url =
    `${NOMINATIM_URL}?format=jsonv2&limit=1&addressdetails=1` +
    `&accept-language=en&q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      address?: { country?: string };
    }>;
    if (!Array.isArray(data) || data.length === 0) return null;

    const hit = data[0];
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng, country: hit.address?.country };
  } catch {
    // Aborted timeout, network failure, or malformed JSON — non-fatal.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a free-text location (e.g. "Plesio, Como, Italy") to coordinates.
 * Tries the raw string first, then a sanitized fallback. Returns null on empty
 * input, no match, network/timeout error, or bad response.
 */
export async function geocodeLocation(
  location: string | null | undefined,
): Promise<GeocodeResult | null> {
  const raw = location?.trim();
  if (!raw) return null;

  // Refuse obvious placeholders so we never place a pin for "Various"/"Global"/etc.
  const normalized = raw.toLowerCase().replace(/[.\s]+$/g, "");
  if (PLACEHOLDER_LOCATIONS.has(normalized)) return null;

  const variants = queryVariants(raw);
  for (let i = 0; i < variants.length; i++) {
    const result = await fetchGeocode(variants[i]);
    if (result) return result;
    // Space out the polite fallback request per Nominatim's 1 req/sec guidance.
    if (i < variants.length - 1) await new Promise((s) => setTimeout(s, 1100));
  }
  return null;
}
