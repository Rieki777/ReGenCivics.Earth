/**
 * Leaflet layer components for the ReGen Ship treasure map. Each is a headless
 * react-leaflet child that reaches for the map via useMap() and manages a raw
 * Leaflet layer imperatively (the performant path for a raster satellite
 * basemap + thousands of clustered pins).
 *
 *  - BasemapLayer    Esri World Imagery satellite + reference labels (ADR-36).
 *  - VoyageRangeLayer the game board: fog beyond the 3-day horizon, gold day
 *                    rings, and a compass rose at the anchorage.
 *  - CascadiaBoundary the bioregion line (the fog mask now lives in
 *                    VoyageRangeLayer, so this is just the soft dashed edge).
 *  - ClusterLayer    supercluster-backed clustered markers. Only pins within
 *                    the voyage range render; beyond the horizon the board is
 *                    clean fog (unclickable ghost tokens were removed in the
 *                    2026-07 overhaul). Verified solid, unverified dashed,
 *                    stale (18+ mo) faded.
 *  - VoyageRoute     the concierge itinerary / "my voyage" as an ordered dashed
 *                    route with day numbers.
 *  - CrosshairPicker one-shot map-click capture for the "Add to the map" flow.
 */
import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import Supercluster from "supercluster";
import boundaryRaw from "@shared/data/cascadia-boundary.geojson?raw";
import {
  TYPE_META, MAP_MAX_ZOOM,
  SATELLITE_TILE_URL, SATELLITE_LABELS_URL, SATELLITE_ATTRIBUTION,
  ANCHORAGE, VOYAGE_DAYS, VOYAGE_RADIUS_MILES, crowMilesForDays, rangeRing, withinVoyageRange,
  litChakraPoints,
} from "./shipMapConfig";

const STALE_MS = 18 * 30 * 24 * 60 * 60 * 1000; // ~18 months

// ── Basemap: satellite + labels (ADR-36) ──────────────────────────────────────
export function BasemapLayer() {
  const map = useMap();
  useEffect(() => {
    const imagery = L.tileLayer(SATELLITE_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION, maxZoom: MAP_MAX_ZOOM, maxNativeZoom: 17,
    }).addTo(map);
    const labels = L.tileLayer(SATELLITE_LABELS_URL, {
      maxZoom: MAP_MAX_ZOOM, maxNativeZoom: 12, opacity: 0.9,
    }).addTo(map);
    return () => { map.removeLayer(imagery); map.removeLayer(labels); };
  }, [map]);
  return null;
}

// ── The game board: voyage range fog, day rings, compass rose ────────────────
const GOLD = "#ffd700";
const FOG = "#0a140d";

function compassRoseIcon(): L.DivIcon {
  // An inline SVG compass rose on a dark disc with a gold rim: the home-port
  // token on the board.
  const svg =
    `<svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="24" cy="24" r="22" fill="#12241a" stroke="${GOLD}" stroke-width="2.5"/>` +
    `<circle cx="24" cy="24" r="16" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.55"/>` +
    `<polygon points="24,5 27,21 24,24 21,21" fill="${GOLD}"/>` +
    `<polygon points="24,43 27,27 24,24 21,27" fill="#e6e0c8"/>` +
    `<polygon points="5,24 21,21 24,24 21,27" fill="#e6e0c8"/>` +
    `<polygon points="43,24 27,27 24,24 27,21" fill="#e6e0c8"/>` +
    `<circle cx="24" cy="24" r="3" fill="${GOLD}"/>` +
    `</svg>`;
  return L.divIcon({
    className: "ship-compass-rose",
    html: `<div style="filter:drop-shadow(0 3px 8px rgba(0,0,0,.6))">${svg}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function dayLabelIcon(text: string): L.DivIcon {
  return L.divIcon({
    className: "ship-day-label",
    html:
      `<div style="transform:translate(-50%,-50%);display:inline-block;white-space:nowrap;padding:2px 10px;` +
      `border-radius:999px;background:rgba(10,20,13,.78);border:1px solid ${GOLD};color:${GOLD};` +
      `font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;` +
      `box-shadow:0 2px 6px rgba(0,0,0,.5)">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Renders the board itself: everything beyond a 3-day sail of the anchorage
 * sinks into fog, gold rings mark how far each voyage day reaches, and a
 * compass rose marks home port. All geometry radiates from ANCHORAGE, so when
 * she weighs anchor the whole board moves with her.
 */
export function VoyageRangeLayer({ anchorage = ANCHORAGE }: { anchorage?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    const horizon = rangeRing(anchorage, VOYAGE_RADIUS_MILES);
    const horizonLatLngs = horizon.map(([lat, lng]) => L.latLng(lat, lng));

    // Fog of the unexplored: a world rectangle with the voyage range punched
    // out, so the board glows and the beyond dims.
    const world: L.LatLngExpression[] = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
    L.polygon([world, horizonLatLngs] as unknown as L.LatLngExpression[][], {
      stroke: false, fillColor: FOG, fillOpacity: 0.62, interactive: false,
    }).addTo(group);

    // A soft glow just inside the horizon, then the gold horizon edge itself.
    L.polyline(horizonLatLngs, {
      color: GOLD, weight: 10, opacity: 0.12, interactive: false,
    }).addTo(group);
    L.polyline(horizonLatLngs, {
      color: GOLD, weight: 2.5, opacity: 0.85, dashArray: "10 8", interactive: false,
    }).addTo(group);

    // Interior day rings: how far each sailing day reaches.
    for (let day = 1; day < VOYAGE_DAYS; day++) {
      const ring = rangeRing(anchorage, crowMilesForDays(day)).map(([lat, lng]) => L.latLng(lat, lng));
      L.polyline(ring, {
        color: GOLD, weight: 1.25, opacity: 0.35, dashArray: "2 10", interactive: false,
      }).addTo(group);
    }

    // Day labels at the northern point of each ring.
    for (let day = 1; day <= VOYAGE_DAYS; day++) {
      const labelLat = anchorage[0] + crowMilesForDays(day) / 69;
      L.marker([labelLat, anchorage[1]], {
        icon: dayLabelIcon(day === VOYAGE_DAYS ? `Day ${day} · the horizon` : `Day ${day}`),
        interactive: false,
        keyboard: false,
      }).addTo(group);
    }

    // The compass rose at home port.
    const rose = L.marker(anchorage, { icon: compassRoseIcon(), zIndexOffset: 900, title: "The anchorage" });
    rose.bindPopup(`<strong>The anchorage</strong><div style="font-size:13px">Ashland, Oregon. Every voyage on this board starts here. The gold rings mark each day of sail; past the horizon lies fog.</div>`);
    rose.addTo(group);

    return () => { map.removeLayer(group); };
  }, [map, anchorage]);
  return null;
}

// ── Cascadia boundary + outside mask ──────────────────────────────────────────
type Ring = [number, number][];
function boundaryRing(): Ring {
  try {
    const gj = JSON.parse(boundaryRaw as string);
    return gj.features[0].geometry.coordinates[0] as Ring;
  } catch {
    return [];
  }
}

export function CascadiaBoundary({ show = true }: { show?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!show) return;
    const ring = boundaryRing();
    if (ring.length === 0) return;
    const latlngs = ring.map(([lng, lat]) => L.latLng(lat, lng));

    // Soft boundary line only. The outside-dimming mask that used to live here
    // moved to VoyageRangeLayer (the fog), which now owns "beyond the board".
    const line = L.polyline(latlngs.concat([latlngs[0]]), {
      color: "#7fd695", weight: 2, opacity: 0.55, dashArray: "2 6", interactive: false,
    }).addTo(map);

    return () => { map.removeLayer(line); };
  }, [map, show]);
  return null;
}

// ── Chakra points: the subtle body of the bioregion ──────────────────────────
function chakraIcon(color: string, name: string): L.DivIcon {
  return L.divIcon({
    className: "ship-chakra",
    html:
      `<div title="${name}" style="width:34px;height:34px;border-radius:50%;` +
      `background:radial-gradient(circle at 50% 42%, #fff 0%, ${color} 55%, ${color} 100%);` +
      `border:2px solid rgba(255,255,255,.9);` +
      `box-shadow:0 0 18px 4px ${color}99, 0 2px 6px rgba(0,0,0,.45);` +
      `display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;` +
      `text-shadow:0 1px 2px rgba(0,0,0,.5)">✦</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/**
 * The chakra layer: symbolic energy centers of the region, joined into one
 * line of light. Voyagers are invited to focus, release, clear, and heal the
 * energy of each center when they visit its land. Nodes come from
 * CHAKRA_POINTS in shipMapConfig.ts; unfilled nodes simply wait unlit.
 */
export function ChakraLayer({ show = true }: { show?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!show) return;
    const lit = litChakraPoints();
    if (lit.length === 0) return;
    const group = L.layerGroup().addTo(map);

    // The energy line: a soft white glow under a fine violet thread.
    if (lit.length > 1) {
      const path = lit.map((c) => [c.lat, c.lng]) as L.LatLngExpression[];
      L.polyline(path, { color: "#ffffff", weight: 7, opacity: 0.14, interactive: false }).addTo(group);
      L.polyline(path, { color: "#e8d9ff", weight: 1.75, opacity: 0.8, dashArray: "1 7", interactive: false }).addTo(group);
    }

    for (const c of lit) {
      const m = L.marker([c.lat, c.lng], { icon: chakraIcon(c.color, `${c.name} · ${c.place ?? ""}`), zIndexOffset: 800, title: `${c.name} chakra` });
      m.bindPopup(
        `<strong>${c.name} <span style="font-weight:400;opacity:.75">· ${c.sanskrit}</span></strong>` +
        `<div style="font-size:13px;margin-top:2px">${c.place ?? ""}</div>` +
        `<div style="font-size:13px;margin-top:6px">${c.practice}</div>` +
        `<div style="font-size:12px;margin-top:6px;opacity:.75">Focus this center when you visit. Release, clear, heal.</div>`,
      );
      m.addTo(group);
    }

    return () => { map.removeLayer(group); };
  }, [map, show]);
  return null;
}

// ── Clustered pins ────────────────────────────────────────────────────────────
export type MapPin = {
  id: number;
  slug: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  isVerified: boolean;
  lastVerifiedAt?: string | Date | null;
};

function pinIcon(pin: MapPin): L.DivIcon {
  const meta = TYPE_META[pin.type] ?? { emoji: "📍", ring: "#2f5d3a" };
  const stale = pin.lastVerifiedAt ? Date.now() - new Date(pin.lastVerifiedAt).getTime() > STALE_MS : false;
  const opacity = pin.isVerified ? (stale ? 0.65 : 1) : 0.6;
  const border = pin.isVerified ? `2.5px solid ${meta.ring}` : `2.5px dashed ${meta.ring}`;
  // Game-token treatment: ivory face with a soft top-light, the type ring as
  // the rim, and a heavier drop shadow so tokens sit above the satellite board.
  const bg = pin.isVerified
    ? "linear-gradient(145deg,#fffef7,#ece5cf)"
    : "linear-gradient(145deg,#f5f0e0,#e2d9bf)";
  return L.divIcon({
    className: "ship-pin",
    html:
      `<div style="opacity:${opacity};font-size:18px;line-height:28px;width:28px;height:28px;text-align:center;background:${bg};border:${border};border-radius:50% 50% 50% 0;transform:rotate(45deg);box-shadow:0 3px 7px rgba(0,0,0,.5)">` +
      `<span style="display:inline-block;transform:rotate(-45deg)">${meta.emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 34 : count < 100 ? 42 : 52;
  // Game-chip treatment: a dark green disc with a gold rim, lit from the
  // upper left like a stacked token.
  return L.divIcon({
    className: "ship-cluster",
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 30% 30%, #3f7a4e, #1f4429);color:#fff;` +
      `display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${count < 100 ? 13 : 12}px;` +
      `border:2px solid #ffd700;box-shadow:0 2px 6px rgba(0,0,0,.45)">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildIndex(pins: MapPin[]): Supercluster<{ id: number }, Record<string, never>> {
  const sc = new Supercluster<{ id: number }, Record<string, never>>({ radius: 60, maxZoom: MAP_MAX_ZOOM - 1 });
  sc.load(
    pins
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        type: "Feature" as const,
        id: p.id,
        properties: { id: p.id },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
  );
  return sc;
}

export function ClusterLayer({ pins, onSelect, anchorage = ANCHORAGE }: {
  pins: MapPin[]; onSelect: (id: number) => void; anchorage?: [number, number];
}) {
  const map = useMap();
  const group = useRef<L.LayerGroup | null>(null);

  // Only pins within the voyage range render. Everything beyond the horizon
  // stays in the fog: no dimmed, unclickable ghost tokens cluttering the board.
  const indexIn = useMemo(() => {
    return buildIndex(pins.filter((p) => withinVoyageRange(p.lat, p.lng, anchorage)));
  }, [pins, anchorage]);

  const byId = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);

  useEffect(() => {
    if (!group.current) group.current = L.layerGroup().addTo(map);
    const layer = group.current;

    const render = () => {
      layer.clearLayers();
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const zoom = Math.round(map.getZoom());

      for (const c of indexIn.getClusters(bbox, zoom)) {
        const [lng, lat] = c.geometry.coordinates;
        const props = c.properties as { cluster?: boolean; point_count?: number; cluster_id?: number; id?: number };
        if (props.cluster) {
          const m = L.marker([lat, lng], { icon: clusterIcon(props.point_count ?? 0) });
          m.on("click", () => {
            const expansion = Math.min(indexIn.getClusterExpansionZoom(props.cluster_id!), MAP_MAX_ZOOM);
            map.setView([lat, lng], expansion, { animate: true });
          });
          m.addTo(layer);
        } else {
          const pin = byId.get(props.id!);
          if (!pin) continue;
          const m = L.marker([lat, lng], { icon: pinIcon(pin), keyboard: true, title: pin.name });
          m.on("click", () => onSelect(pin.id));
          m.addTo(layer);
        }
      }
    };

    render();
    map.on("moveend zoomend", render);
    return () => {
      map.off("moveend zoomend", render);
      layer.clearLayers();
    };
  }, [map, indexIn, byId, onSelect]);

  useEffect(() => () => { if (group.current) { map.removeLayer(group.current); group.current = null; } }, [map]);
  return null;
}

// ── Voyage route ──────────────────────────────────────────────────────────────
export type VoyageStop = { lat: number; lng: number; day?: number | null; name?: string };

export function VoyageRoute({ stops }: { stops: VoyageStop[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
    if (valid.length === 0) return;
    const group = L.layerGroup().addTo(map);
    if (valid.length > 1) {
      L.polyline(valid.map((s) => [s.lat, s.lng]) as L.LatLngExpression[], {
        color: "#b5762f", weight: 3, opacity: 0.85, dashArray: "6 8", interactive: false,
      }).addTo(group);
    }
    valid.forEach((s, i) => {
      const label = s.day ?? i + 1;
      const icon = L.divIcon({
        className: "ship-voyage-stop",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#b5762f;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([s.lat, s.lng], { icon, title: s.name }).addTo(group);
    });
    return () => { map.removeLayer(group); };
  }, [map, stops]);
  return null;
}

// ── Crosshair picker (Add to the map) ─────────────────────────────────────────
export function CrosshairPicker({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const el = map.getContainer();
    const prevCursor = el.style.cursor;
    el.style.cursor = "crosshair";
    const handler = (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => {
      el.style.cursor = prevCursor;
      map.off("click", handler);
    };
  }, [map, active, onPick]);
  return null;
}
