/**
 * The permission-radius map: a standalone, zoomed-out map centered on Ashland
 * that shows the Voyage Covenant travel radius (Terms §6) as concentric rings.
 *
 *  - The base 500-mile radius is the green permitted zone: a one-week voyage may
 *    sail anywhere inside it without asking.
 *  - Everything beyond it is the red locked zone: crossing the line needs written
 *    permission from the core team in advance (§6.3).
 *  - Dashed reference rings mark how far a longer voyage may be granted
 *    (750 / 1000 / 1250 mi for 2 / 3 / 4 weeks), all still gated on permission.
 *
 * Deterministic (STEERING deterministic-first): every ring is computed from
 * permittedRadiusMiles() in shared/shipTerms.ts, so the page, this map, and the
 * booking policy never drift. This is separate from the treasure-map game board
 * (/ship/map), which stays locked to its 3-day-sail horizon.
 */
import { useEffect } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ASHLAND, rangeRing, SATELLITE_TILE_URL, SATELLITE_ATTRIBUTION,
} from "./shipMapConfig";
import { permittedRadiusMiles, RADIUS_BASE_MILES, RADIUS_MAX_WEEKS } from "@shared/shipTerms";

const GREEN = "#2f5d3a";
const RED = "#c0392b";
const GOLD = "#ffd700";

/** The reference rings: 500 / 750 / 1000 / 1250 mi, one per voyage length. */
const RINGS = Array.from({ length: RADIUS_MAX_WEEKS }, (_, i) => {
  const weeks = i + 1;
  return { weeks, miles: permittedRadiusMiles(weeks) };
});
const OUTER_MILES = RINGS[RINGS.length - 1].miles; // 1250

function anchorIcon(): L.DivIcon {
  return L.divIcon({
    className: "ship-permission-anchor",
    html:
      `<div style="font-size:22px;line-height:34px;width:34px;height:34px;text-align:center;` +
      `background:#12241a;border:2px solid ${GOLD};border-radius:50%;` +
      `box-shadow:0 2px 6px rgba(0,0,0,.5)">⚓</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function ringLabelIcon(text: string, color: string): L.DivIcon {
  return L.divIcon({
    className: "ship-permission-label",
    html:
      `<div style="transform:translate(-50%,-50%);display:inline-block;white-space:nowrap;padding:2px 9px;` +
      `border-radius:999px;background:rgba(10,20,13,.82);border:1px solid ${color};color:${color};` +
      `font-size:11px;font-weight:700;letter-spacing:.04em;box-shadow:0 2px 6px rgba(0,0,0,.5)">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Imperative Leaflet layers: green permitted zone, red locked zone, rings. */
function PermissionRings() {
  const map = useMap();
  useEffect(() => {
    const group = L.layerGroup().addTo(map);

    const baseRing = rangeRing(ASHLAND, RADIUS_BASE_MILES).map(([lat, lng]) => L.latLng(lat, lng));

    // Red locked zone: a world rectangle with the permitted base radius punched
    // out, so everything past the 500-mile line reads as "permission required".
    const world: L.LatLngExpression[] = [[85, -180], [85, 180], [-85, 180], [-85, -180]];
    L.polygon([world, baseRing] as unknown as L.LatLngExpression[][], {
      stroke: false, fillColor: RED, fillOpacity: 0.18, interactive: false,
    }).addTo(group);

    // Green permitted zone: the base 500-mile circle.
    L.polygon(baseRing, {
      color: GREEN, weight: 2.5, opacity: 0.9, fillColor: GREEN, fillOpacity: 0.14,
    }).addTo(group).bindPopup(
      `<strong>Permitted range</strong><div style="font-size:13px;margin-top:2px">Within ${RADIUS_BASE_MILES} miles of Ashland. A one-week voyage may sail anywhere inside this green zone.</div>`,
    );

    // Extension reference rings (750 / 1000 / 1250): the farthest a longer voyage
    // may be granted. Dashed, since crossing 500 mi always needs permission.
    for (const r of RINGS) {
      if (r.miles <= RADIUS_BASE_MILES) continue;
      const ring = rangeRing(ASHLAND, r.miles).map(([lat, lng]) => L.latLng(lat, lng));
      const outer = r.miles === OUTER_MILES;
      L.polyline(ring, {
        color: outer ? RED : GREEN, weight: outer ? 2.5 : 1.5,
        opacity: outer ? 0.85 : 0.6, dashArray: outer ? "8 6" : "3 9", interactive: false,
      }).addTo(group);
    }

    // Labels at the north point of each ring.
    for (const r of RINGS) {
      const labelLat = ASHLAND[0] + r.miles / 69;
      const permitted = r.miles === RADIUS_BASE_MILES;
      const text = permitted
        ? `${r.miles} mi · permitted (1 week)`
        : `${r.miles} mi · ${r.weeks}-week max`;
      L.marker([labelLat, ASHLAND[1]], {
        icon: ringLabelIcon(text, permitted ? GREEN : RED), interactive: false, keyboard: false,
      }).addTo(group);
    }

    // The anchorage.
    L.marker(ASHLAND, { icon: anchorIcon(), title: "Ashland, Oregon — the anchorage" })
      .bindPopup(`<strong>The anchorage</strong><div style="font-size:13px">Ashland, Oregon. The travel radius is measured straight-line from here.</div>`)
      .addTo(group);

    // Frame the outer ring on first paint.
    const bounds = L.latLngBounds(rangeRing(ASHLAND, OUTER_MILES * 1.08).map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [12, 12] });

    return () => { map.removeLayer(group); };
  }, [map]);
  return null;
}

function PermissionBasemap() {
  const map = useMap();
  useEffect(() => {
    const imagery = L.tileLayer(SATELLITE_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION, maxZoom: 12, maxNativeZoom: 12,
    }).addTo(map);
    return () => { map.removeLayer(imagery); };
  }, [map]);
  return null;
}

export function ShipPermissionMap() {
  return (
    <div className="relative rounded-2xl overflow-hidden border" style={{ height: "58vh", minHeight: 380 }}>
      <MapContainer
        center={ASHLAND}
        zoom={5}
        minZoom={4}
        maxZoom={9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#0a140d" }}
      >
        <PermissionBasemap />
        <PermissionRings />
      </MapContainer>
      <div className="absolute bottom-0 right-0 z-[500] bg-white/70 dark:bg-black/50 text-[10px] px-1.5 py-0.5 rounded-tl">Imagery © Esri, Maxar, Earthstar Geographics</div>
    </div>
  );
}
