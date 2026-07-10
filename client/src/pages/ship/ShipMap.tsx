/**
 * /ship/map - The treasure map. Leaflet + OpenStreetMap tiles (no API key).
 * Verified locations as typed pins, the live ship position ("she sails here"),
 * verified seed plantings as a celebration layer, filter pills, and a
 * suggest-a-location form that feeds admin verification.
 *
 * GlobeMap is untouched; this is a separate regional map (see the ReGen Ship
 * ADR for Leaflet alongside GlobeMap).
 */
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  land_project: { emoji: "🏕️", label: "Land project" },
  spring: { emoji: "💧", label: "Spring" },
  waterfall: { emoji: "🌊", label: "Waterfall" },
  lake: { emoji: "🏞️", label: "Lake" },
  geology: { emoji: "🪨", label: "Geology" },
  forest: { emoji: "🌲", label: "Forest" },
  food_forest: { emoji: "🌳", label: "Food forest" },
  seed_site: { emoji: "🌱", label: "Seed site" },
  boondock: { emoji: "🚐", label: "Boondock" },
  event_venue: { emoji: "🎪", label: "Event venue" },
};

const CASCADIA_CENTER: [number, number] = [43.8, -121.5];

function emojiIcon(emoji: string, ring = "#2f5d3a") {
  return L.divIcon({
    className: "ship-pin",
    html: `<div style="font-size:22px;line-height:32px;width:32px;height:32px;text-align:center;background:#fff;border:2px solid ${ring};border-radius:50% 50% 50% 0;transform:rotate(45deg);box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="display:inline-block;transform:rotate(-45deg)">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });
}

export default function ShipMap() {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const locations = trpc.ship.map.list.useQuery({});
  const position = trpc.ship.map.position.useQuery();
  const plantings = trpc.ship.seeds.listVerified.useQuery();
  const suggest = trpc.ship.map.suggest.useMutation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({ name: "", type: "spring", lat: "", lng: "", description: "" });

  const filtered = useMemo(() => {
    const all = locations.data ?? [];
    if (activeTypes.size === 0) return all;
    return all.filter((l) => activeTypes.has(l.type));
  }, [locations.data, activeTypes]);

  function toggleType(t: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Please enter valid coordinates.");
      return;
    }
    try {
      await suggest.mutateAsync({
        name: form.name,
        type: form.type as "land_project" | "spring" | "waterfall" | "lake" | "geology" | "forest" | "food_forest" | "seed_site" | "boondock" | "event_venue",
        lat,
        lng,
        description: form.description || undefined,
      });
      toast.success("Thank you. Your location is in for review.");
      setForm({ name: "", type: "spring", lat: "", lng: "", description: "" });
      void utils.ship.map.list.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Please sign in to suggest a location.");
    }
  }

  const pos = position.data;

  return (
    <PageWrapper>
      <SEO title="The Treasure Map" description="Springs, waterfalls, food forests, and the land projects regenerating Cascadia. Chart your voyage." url="/ship/map" />
      <ShipNavRow current="/ship/map" />

      <ShipSection>
        <ShipEyebrow>The treasure map</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-3">Chart your voyage through Cascadia</h1>
        <p className="text-foreground/80 mb-5">Every pin is a place a crew can serve, drink from, rest at, or plant seeds. The ship pin shows where she sails now.</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(TYPE_META).map(([t, meta]) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${activeTypes.has(t) ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "border-[#4a7c59]/30 hover:bg-[#4a7c59]/10"}`}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
          {activeTypes.size > 0 && (
            <button onClick={() => setActiveTypes(new Set())} className="px-3 py-1.5 rounded-full border border-transparent text-sm underline">Clear</button>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden border" style={{ height: "60vh", minHeight: 420 }}>
          <MapContainer center={CASCADIA_CENTER} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((l) => (
              <Marker key={l.id} position={[l.lat, l.lng]} icon={emojiIcon(TYPE_META[l.type]?.emoji ?? "📍")}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{l.name}</strong>
                    <div style={{ fontSize: 12, color: "#666" }}>{TYPE_META[l.type]?.label ?? l.type}</div>
                    {l.description && <p style={{ margin: "6px 0", fontSize: 13 }}>{l.description}</p>}
                    {l.websiteUrl && <a href={l.websiteUrl} target="_blank" rel="noreferrer">Visit</a>}
                  </div>
                </Popup>
              </Marker>
            ))}
            {(plantings.data ?? []).filter((p) => p.lat != null && p.lng != null).map((p) => (
              <Marker key={`seed-${p.id}`} position={[p.lat as number, p.lng as number]} icon={emojiIcon("🌱", "#d4a574")}>
                <Popup>
                  <strong>A crew planted here</strong>
                  {p.species && <div style={{ fontSize: 13 }}>{p.species}</div>}
                </Popup>
              </Marker>
            ))}
            {pos && (
              <Marker position={[pos.lat, pos.lng]} icon={emojiIcon("⛵", "#1a472a")}>
                <Popup>
                  <strong>She sails here</strong>
                  {pos.note && <div style={{ fontSize: 13 }}>{pos.note}</div>}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        {locations.isLoading && <p className="text-sm text-muted-foreground mt-3">Loading the map…</p>}
        {!locations.isLoading && (locations.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground mt-3">The map is being charted. Verified locations will appear here soon.</p>
        )}
      </ShipSection>

      {/* Suggest a location */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>Add to the map</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-4">Know a spring, a waterfall, or a land project?</h2>
        <p className="text-foreground/80 mb-4">Suggest it. A crew member reviews every location before it appears on the map.</p>
        <form onSubmit={submitSuggestion} className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="sm:col-span-2">
            <Label htmlFor="loc-name">Name</Label>
            <Input id="loc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="loc-type">Type</Label>
            <select id="loc-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 rounded-md border bg-background px-3">
              {Object.entries(TYPE_META).map(([t, meta]) => (
                <option key={t} value={t}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="loc-lat">Latitude</Label>
              <Input id="loc-lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="42.19" required />
            </div>
            <div>
              <Label htmlFor="loc-lng">Longitude</Label>
              <Input id="loc-lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="-122.71" required />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="loc-desc">Description</Label>
            <Textarea id="loc-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} rows={3} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={suggest.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
              {suggest.isPending ? "Sending…" : "Suggest this location"}
            </Button>
          </div>
        </form>
      </ShipSection>
    </PageWrapper>
  );
}
