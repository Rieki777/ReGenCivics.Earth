import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trpc } from "@/lib/trpc";
import type { GalleryCampaign } from "@/pages/CrowdPoolingProjects";

/**
 * Projects map (Phase 6). Plots active and funded campaigns as pins on a world
 * map, each linking to its campaign page. The campaigns table stores no
 * coordinates, so locations are geocoded server-side (campaigns.geocodeLocations)
 * rather than in the browser, where the site CSP blocks a direct Nominatim call.
 * The basemap is Esri World Imagery, the same tiles the ship maps use, because
 * the public OpenStreetMap tile servers reject requests from this origin. A
 * location that cannot be geocoded simply gets no pin.
 */

const ESRI_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

interface Pin {
  id: number;
  name: string;
  location: string;
  isDemo: boolean;
  lat: number;
  lng: number;
}

const pinIcon = (isDemo: boolean) =>
  L.divIcon({
    className: "cp-map-pin",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${
      isDemo ? "#8aa899" : "#7dd87d"
    };border:2px solid #0d2818;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });

/** Fits the map to the pins once they resolve. */
function FitToPins({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 5);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [pins, map]);
  return null;
}

export function CampaignMap({
  campaigns,
  onSelect,
}: {
  campaigns: GalleryCampaign[];
  onSelect: (id: number) => void;
}) {
  const located = useMemo(
    () => campaigns.filter((c) => c.location && c.location !== "Location TBD"),
    [campaigns],
  );
  const locations = useMemo(
    () => Array.from(new Set(located.map((c) => c.location))),
    [located],
  );

  const { data: geo, isLoading } = trpc.campaigns.geocodeLocations.useQuery(
    { locations },
    { enabled: locations.length > 0, staleTime: 60 * 60 * 1000 },
  );

  const pins: Pin[] = useMemo(() => {
    if (!geo) return [];
    return located
      .map((c) => {
        const g = geo[c.location];
        return g ? { id: c.id, name: c.name, location: c.location, isDemo: c.isDemo, lat: g.lat, lng: g.lng } : null;
      })
      .filter((p): p is Pin => p !== null);
  }, [geo, located]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#7dd87d]/20 mb-6" style={{ height: "62vh", minHeight: 420 }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        worldCopyJump
        scrollWheelZoom
        style={{ height: "100%", width: "100%", background: "#0d2818" }}
      >
        <TileLayer url={ESRI_IMAGERY} attribution="Esri, Maxar, Earthstar Geographics, and the GIS User Community" maxZoom={17} />
        <TileLayer url={ESRI_LABELS} maxZoom={12} opacity={0.9} />
        <FitToPins pins={pins} />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.isDemo)}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong style={{ color: "#1a472a" }}>{p.name}</strong>
                <div style={{ fontSize: 12, color: "#4a5568", margin: "2px 0 8px" }}>
                  {p.location}
                  {p.isDemo ? " · Example" : ""}
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  style={{
                    background: "#4a7c59",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    minHeight: 40,
                    width: "100%",
                  }}
                >
                  View campaign
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {isLoading && pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d2818]/70 text-white/70 text-sm pointer-events-none">
          Placing campaigns on the map...
        </div>
      )}
    </div>
  );
}
