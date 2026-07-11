/**
 * Leaflet layer components for the ReGen Ship treasure map. Each is a headless
 * react-leaflet child that reaches for the map via useMap() and manages a raw
 * Leaflet layer imperatively (the performant path for a self-hosted vector
 * basemap + thousands of clustered pins).
 *
 *  - BasemapLayer    self-hosted PMTiles via protomaps-leaflet (ADR-34); a
 *                    dev-only raster OSM fallback when the archive is not yet up.
 *  - CascadiaBoundary the bioregion glow: a soft boundary line + an outside mask
 *                    that dims everything beyond Cascadia.
 *  - ClusterLayer    supercluster-backed clustered markers; verified pins solid,
 *                    unverified translucent/dashed, stale (18+ mo) faded.
 *  - VoyageRoute     the concierge itinerary / "my voyage" as an ordered dashed
 *                    route with day numbers.
 *  - CrosshairPicker one-shot map-click capture for the "Add to the map" flow.
 */
import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import Supercluster from "supercluster";
import { leafletLayer } from "protomaps-leaflet";
import boundaryRaw from "@shared/data/cascadia-boundary.geojson?raw";
import {
  SHIP_BASEMAP_URL, SHIP_BASEMAP_DEV_OSM, TYPE_META, MAP_MAX_ZOOM,
} from "./shipMapConfig";

const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://protomaps.com">Protomaps</a>';
const STALE_MS = 18 * 30 * 24 * 60 * 60 * 1000; // ~18 months

// ── Basemap ───────────────────────────────────────────────────────────────────
export function BasemapLayer() {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer;
    if (SHIP_BASEMAP_DEV_OSM) {
      // Dev-only. This origin is NOT allowed by the production CSP.
      layer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: ATTRIBUTION, maxZoom: MAP_MAX_ZOOM });
    } else {
      layer = leafletLayer({ url: SHIP_BASEMAP_URL, flavor: "light", lang: "en", attribution: ATTRIBUTION }) as unknown as L.Layer;
    }
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);
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

    // Outside mask: a world rectangle with the bioregion punched out as a hole,
    // so everything beyond Cascadia dims and the bioregion glows.
    const world: L.LatLngExpression[] = [ [85, -180], [85, 180], [-85, 180], [-85, -180] ];
    const mask = L.polygon([world, latlngs] as unknown as L.LatLngExpression[][], {
      stroke: false, fillColor: "#1a2b1f", fillOpacity: 0.28, interactive: false,
    }).addTo(map);

    // Soft boundary line.
    const line = L.polyline(latlngs.concat([latlngs[0]]), {
      color: "#2f5d3a", weight: 2, opacity: 0.6, dashArray: "2 6", interactive: false,
    }).addTo(map);

    return () => { map.removeLayer(mask); map.removeLayer(line); };
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
  const opacity = pin.isVerified ? (stale ? 0.6 : 1) : 0.55;
  const border = pin.isVerified ? `2px solid ${meta.ring}` : `2px dashed ${meta.ring}`;
  const bg = pin.isVerified ? "#fff" : "#f3efe4";
  return L.divIcon({
    className: "ship-pin",
    html:
      `<div style="opacity:${opacity};font-size:18px;line-height:28px;width:28px;height:28px;text-align:center;background:${bg};border:${border};border-radius:50% 50% 50% 0;transform:rotate(45deg);box-shadow:0 2px 5px rgba(0,0,0,.3)">` +
      `<span style="display:inline-block;transform:rotate(-45deg)">${meta.emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function clusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 34 : count < 100 ? 42 : 52;
  return L.divIcon({
    className: "ship-cluster",
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(47,93,58,.9);color:#fff;` +
      `display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${count < 100 ? 13 : 12}px;` +
      `border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function ClusterLayer({ pins, onSelect }: { pins: MapPin[]; onSelect: (id: number) => void }) {
  const map = useMap();
  const group = useRef<L.LayerGroup | null>(null);

  const index = useMemo(() => {
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
  }, [pins]);

  const byId = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);

  useEffect(() => {
    if (!group.current) group.current = L.layerGroup().addTo(map);
    const layer = group.current;

    const render = () => {
      layer.clearLayers();
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const zoom = Math.round(map.getZoom());
      const clusters = index.getClusters(bbox, zoom);
      for (const c of clusters) {
        const [lng, lat] = c.geometry.coordinates;
        const props = c.properties as { cluster?: boolean; point_count?: number; cluster_id?: number; id?: number };
        if (props.cluster) {
          const m = L.marker([lat, lng], { icon: clusterIcon(props.point_count ?? 0) });
          m.on("click", () => {
            const expansion = Math.min(index.getClusterExpansionZoom(props.cluster_id!), MAP_MAX_ZOOM);
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
  }, [map, index, byId, onSelect]);

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
