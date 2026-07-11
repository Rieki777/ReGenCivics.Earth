/**
 * Shared config for the ReGen Ship treasure map (/ship/map) and the admin
 * coverage view. One source of truth for the Cascadia bounds, the self-hosted
 * PMTiles basemap URL, the pin type styling, and the filter set.
 *
 * The basemap is a single PMTiles archive on R2 (ADR-34). No OSM tile origin,
 * no CSP widening. When the archive is not yet uploaded, set
 * VITE_SHIP_BASEMAP_DEV_OSM=1 in a local .env to fall back to raster OSM tiles
 * for development only (that origin is NOT allowed by the production CSP).
 */

// US-Cascadia bbox: Cape Mendocino to the Canadian border, coast to the
// continental divide. [west, south, east, north].
export const CASCADIA_BBOX = { west: -126.0, south: 39.5, east: -110.5, north: 49.5 } as const;

// Leaflet bounds are [[south, west], [north, east]]. A small pad so the
// bioregion is not flush against the viewport edge.
const PAD = 0.75;
export const CASCADIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [CASCADIA_BBOX.south - PAD, CASCADIA_BBOX.west - PAD],
  [CASCADIA_BBOX.north + PAD, CASCADIA_BBOX.east + PAD],
];

// The map is Cascadia; you cannot scroll to Kansas.
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 15;
export const MAP_DEFAULT_ZOOM = 6;

// Radiate from Ashland (the anchorage).
export const ASHLAND: [number, number] = [42.1946, -122.7095];
export const CASCADIA_CENTER: [number, number] = [43.8, -121.5];

/** The self-hosted basemap. Served static from R2 through the CDN. */
export const SHIP_BASEMAP_URL = "https://assets.regencivics.earth/ship/basemap.pmtiles";

/** Dev-only escape hatch (see file header). Never true in production builds. */
export const SHIP_BASEMAP_DEV_OSM =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.VITE_SHIP_BASEMAP_DEV_OSM === "1";

export type ShipLocationType =
  | "land_project" | "spring" | "waterfall" | "lake" | "geology"
  | "forest" | "food_forest" | "seed_site" | "boondock" | "event_venue";

export const TYPE_META: Record<string, { emoji: string; label: string; ring: string; blurb: string }> = {
  land_project: { emoji: "🏕️", label: "Land project", ring: "#2f5d3a", blurb: "Land projects: serve the crews regenerating Cascadia." },
  spring:       { emoji: "💧", label: "Spring", ring: "#2b7fb8", blurb: "Springs: fill her tanks from living water." },
  waterfall:    { emoji: "🌊", label: "Waterfall", ring: "#3a95c7", blurb: "Waterfalls: worth the walk, worth the wonder." },
  lake:         { emoji: "🏞️", label: "Lake", ring: "#2f7d8c", blurb: "Lakes: still water for a still day." },
  geology:      { emoji: "🪨", label: "Geology", ring: "#8a6d3b", blurb: "Geology: the bones of the bioregion." },
  forest:       { emoji: "🌲", label: "Forest", ring: "#1f5130", blurb: "Forests: old growth, deep shade, big trees." },
  food_forest:  { emoji: "🌳", label: "Food forest", ring: "#4a7c59", blurb: "Food forests: abundance you can eat." },
  seed_site:    { emoji: "🌱", label: "Seed site", ring: "#6ca34f", blurb: "Seed sites: where the next forest begins." },
  boondock:     { emoji: "🚐", label: "Boondock", ring: "#b5762f", blurb: "Boondocks: free, beautiful, 40-ft-capable rest." },
  event_venue:  { emoji: "🎪", label: "Event venue", ring: "#a8478a", blurb: "Venues: where the fleet converges." },
};

/** Boolean filters beyond the type pills. */
export type MapBoolFilter = "fits40" | "verifiedOnly" | "hasWater" | "freeCamping";

export const BOOL_FILTERS: Array<{ key: MapBoolFilter; label: string }> = [
  { key: "fits40", label: "Fits 40 ft" },
  { key: "verifiedOnly", label: "Verified only" },
  { key: "hasWater", label: "Has water tests" },
  { key: "freeCamping", label: "Free camping" },
];

/** True when a lon/lat falls inside the US-Cascadia display bbox. */
export function inCascadiaBbox(lng: number, lat: number): boolean {
  return (
    lng >= CASCADIA_BBOX.west &&
    lng <= CASCADIA_BBOX.east &&
    lat >= CASCADIA_BBOX.south &&
    lat <= CASCADIA_BBOX.north
  );
}
