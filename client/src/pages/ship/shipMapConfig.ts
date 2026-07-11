/**
 * Shared config for the ReGen Ship treasure map (/ship/map) and the admin
 * coverage view. One source of truth for the Cascadia bounds, the voyage
 * range (the game board), the basemap, the pin type styling, and the filters.
 *
 * Basemap (ADR-36, extends ADR-34): Esri World Imagery satellite tiles with
 * the Esri reference-label overlay, rendered as a game board. The board is
 * bounded to the voyage range: everything within a 3-day sail of the
 * anchorage. Beyond that edge the world fades into fog; pins out there render
 * dimmed and unclickable until the anchorage moves.
 *
 * The self-hosted PMTiles archive (ADR-34) remains on R2 as the offline /
 * fallback basemap; SHIP_BASEMAP_URL still points at it.
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

// ── The voyage range: the game board ─────────────────────────────────────────
// The board always renders a 3-day sail from the anchorage. Ashland for now;
// when she weighs anchor, point ANCHORAGE somewhere else and the whole board
// (fog, rings, bounds, pin dimming) follows.
export const ANCHORAGE: [number, number] = ASHLAND;
export const VOYAGE_DAYS = 3;
export const ROAD_MILES_PER_DAY = 250;
// Roads wander; a mile as the crow flies costs about 1.3 on the odometer.
export const ROAD_TO_CROW = 1.3;
export const MILES_TO_METERS = 1609.344;

/** Straight-line miles reachable in N days of sailing (driving). */
export function crowMilesForDays(days: number): number {
  return (days * ROAD_MILES_PER_DAY) / ROAD_TO_CROW;
}

/** The horizon: straight-line radius of the full voyage range (~577 mi). */
export const VOYAGE_RADIUS_MILES = crowMilesForDays(VOYAGE_DAYS);

/** Great-circle distance in miles. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613; // earth radius, miles
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** True when a point sits within the 3-day voyage range of the anchorage. */
export function withinVoyageRange(lat: number, lng: number, anchorage: [number, number] = ANCHORAGE): boolean {
  return haversineMiles(anchorage[0], anchorage[1], lat, lng) <= VOYAGE_RADIUS_MILES;
}

/**
 * A closed ring of [lat, lng] points approximating the circle of
 * `radiusMiles` around `center`. Spherical destination formula, so the ring
 * stays round at Cascadia latitudes (a naive lat/lng ellipse would not).
 */
export function rangeRing(center: [number, number], radiusMiles: number, steps = 120): [number, number][] {
  const R = 3958.7613;
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = center[0] * toRad;
  const lng1 = center[1] * toRad;
  const d = radiusMiles / R;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
    ring.push([lat2 * toDeg, lng2 * toDeg]);
  }
  return ring;
}

// The board is the voyage range; you cannot scroll past the fog. A pad so the
// horizon edge is not flush against the viewport.
const RANGE_PAD_DEG = 1.0;
const rangeLatDeg = VOYAGE_RADIUS_MILES / 69;
const rangeLngDeg = VOYAGE_RADIUS_MILES / (69 * Math.cos(ANCHORAGE[0] * (Math.PI / 180)));
export const VOYAGE_MAX_BOUNDS: [[number, number], [number, number]] = [
  [ANCHORAGE[0] - rangeLatDeg - RANGE_PAD_DEG, ANCHORAGE[1] - rangeLngDeg - RANGE_PAD_DEG],
  [ANCHORAGE[0] + rangeLatDeg + RANGE_PAD_DEG, ANCHORAGE[1] + rangeLngDeg + RANGE_PAD_DEG],
];

/** The self-hosted basemap (ADR-34), kept for offline/fallback use. */
export const SHIP_BASEMAP_URL = "https://assets.regencivics.earth/ship/basemap.pmtiles";

/** Esri World Imagery satellite + reference labels (ADR-36). One origin. */
export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_LABELS_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_ATTRIBUTION = "Esri, Maxar, Earthstar Geographics, and the GIS User Community";

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
