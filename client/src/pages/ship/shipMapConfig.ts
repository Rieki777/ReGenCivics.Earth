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
// A gentle pace: we keep the miles low on the RV for now and can open the range
// back up later by raising this one number (the whole board follows).
export const ROAD_MILES_PER_DAY = 125;
// Roads wander; a mile as the crow flies costs about 1.3 on the odometer.
export const ROAD_TO_CROW = 1.3;
export const MILES_TO_METERS = 1609.344;

/** Straight-line miles reachable in N days of sailing (driving). */
export function crowMilesForDays(days: number): number {
  return (days * ROAD_MILES_PER_DAY) / ROAD_TO_CROW;
}

/** The horizon: straight-line radius of the full voyage range (~288 mi). */
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

/**
 * The self-hosted PMTiles basemap (ADR-34), kept for offline/fallback use.
 * Served through the app's same-origin range proxy (/api/ship/basemap.pmtiles)
 * because R2's custom domain does not serve the ship/ sub-path. protomaps-leaflet
 * reads it by HTTP range; the proxy streams straight from R2 with 206 responses.
 */
export const SHIP_BASEMAP_URL = "/api/ship/basemap.pmtiles";

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
  | "forest" | "food_forest" | "seed_site" | "boondock" | "event_venue"
  | "commercial_boondock";

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
  // High-traffic paved rest: rest areas, Walmarts, Home Depots, and their kin.
  // The asphalt-gray ring and the parking glyph mark it apart from wild sites.
  commercial_boondock: { emoji: "🅿️", label: "Commercial boondock", ring: "#708090", blurb: "Commercial boondocks: rest areas and big paved lots for a quick legal night between wild stops. Check posted signs." },
  event_venue:  { emoji: "🎪", label: "Event venue", ring: "#a8478a", blurb: "Venues: where the fleet converges." },
};

// ── Chakra points: the subtle body of the bioregion ──────────────────────────
// Symbolic energy centers mapped onto the land around the anchorage. Three are
// named; Rye is researching the rest. To light a new node, fill in its place,
// lat, lng, and practice: the layer, the line, and the poster all follow.
export type ChakraPoint = {
  order: number;            // 1 root .. 7 crown
  key: string;
  name: string;
  sanskrit: string;
  color: string;
  place: string | null;     // null = still being divined
  lat: number | null;
  lng: number | null;
  practice: string;
};

export const CHAKRA_POINTS: ChakraPoint[] = [
  {
    order: 1, key: "root", name: "Root", sanskrit: "Muladhara", color: "#d9302c",
    place: "Mount Shasta", lat: 41.4099, lng: -122.1949,
    practice: "Ground here. Release what keeps you bracing, let the mountain hold your weight, and leave feeling safe in your body.",
  },
  {
    order: 2, key: "sacral", name: "Sacral", sanskrit: "Svadhisthana", color: "#f28c28",
    place: null, lat: null, lng: null,
    practice: "This node is still being divined. Its land will be named soon.",
  },
  {
    order: 3, key: "solar_plexus", name: "Solar Plexus", sanskrit: "Manipura", color: "#f2c744",
    place: null, lat: null, lng: null,
    practice: "This node is still being divined. Its land will be named soon.",
  },
  {
    order: 4, key: "heart", name: "Heart", sanskrit: "Anahata", color: "#3fa060",
    place: "Mount Ashland", lat: 42.0806, lng: -122.7156,
    practice: "The heart node shares its slopes with home port. Release old grief in your own time, and let love move both ways, given and received.",
  },
  {
    order: 5, key: "throat", name: "Throat", sanskrit: "Vishuddha", color: "#3b7fd0",
    place: null, lat: null, lng: null,
    practice: "This node is still being divined. Its land will be named soon.",
  },
  {
    order: 6, key: "third_eye", name: "Third Eye", sanskrit: "Ajna", color: "#5b4bb5",
    place: null, lat: null, lng: null,
    practice: "This node is still being divined. Its land will be named soon.",
  },
  {
    order: 7, key: "crown", name: "Crown", sanskrit: "Sahasrara", color: "#8a5fc9",
    place: "Crater Lake", lat: 42.9446, lng: -122.109,
    practice: "Sit where the deepest lake holds the clearest sky. Release the need to know, and let the whole picture arrive.",
  },
];

/** The chakra nodes that have land under them, in energy order. */
export function litChakraPoints(): Array<ChakraPoint & { lat: number; lng: number }> {
  return CHAKRA_POINTS
    .filter((c): c is ChakraPoint & { lat: number; lng: number } => c.lat != null && c.lng != null)
    .sort((a, b) => a.order - b.order);
}

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
