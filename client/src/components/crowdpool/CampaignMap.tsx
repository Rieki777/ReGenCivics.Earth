import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GalleryCampaign } from "@/pages/CrowdPoolingProjects";

/**
 * Projects map (Phase 6). Plots active and funded campaigns as pins on a world
 * map, each linking to its campaign page. Coordinates are geocoded on the client
 * from the campaign's free-text `location` (the campaigns table stores no
 * lat/lng), cached in localStorage, and rate limited to one Nominatim lookup a
 * second per the OpenStreetMap usage policy. A campaign whose location cannot be
 * geocoded simply does not get a pin.
 */

interface Pin {
  id: number;
  name: string;
  location: string;
  status: "active" | "funded";
  isDemo: boolean;
  lat: number;
  lng: number;
}

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  const key = `cp-geo:${location.trim().toLowerCase()}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached !== null) return JSON.parse(cached);
  } catch {
    /* localStorage unavailable: fall through to a live lookup */
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    const result = hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
    try {
      localStorage.setItem(key, JSON.stringify(result));
    } catch {
      /* ignore quota errors */
    }
    // Respect the Nominatim 1 request/second policy on real network hits only.
    await new Promise((r) => setTimeout(r, 1100));
    return result;
  } catch {
    return null;
  }
}

const pinIcon = (isDemo: boolean) =>
  L.divIcon({
    className: "cp-map-pin",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${
      isDemo ? "#8aa899" : "#4a7c59"
    };border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
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
  const [pins, setPins] = useState<Pin[]>([]);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    const run = async () => {
      const found: Pin[] = [];
      for (const c of campaigns) {
        if (cancelled) return;
        if (!c.location || c.location === "Location TBD") continue;
        const coords = await geocode(c.location);
        if (cancelled) return;
        if (coords) {
          found.push({
            id: c.id,
            name: c.name,
            location: c.location,
            status: c.status,
            isDemo: c.isDemo,
            lat: coords.lat,
            lng: coords.lng,
          });
          setPins([...found]);
        }
      }
      if (!cancelled) setPending(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [campaigns]);

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
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
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
      {pending && pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d2818]/70 text-white/70 text-sm pointer-events-none">
          Placing campaigns on the map...
        </div>
      )}
    </div>
  );
}
