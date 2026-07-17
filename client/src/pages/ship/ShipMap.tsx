/**
 * /ship/map — the treasure map, v2. A self-hosted PMTiles basemap on R2
 * (ADR-34), locked to the Cascadia bioregion, with clustered typed pins, a
 * detail drawer, filters, an "Add to the map" flow, a client-side voyage
 * builder with GPX / Google Maps export, field verification, and deep links.
 *
 * The heavy Leaflet work lives in shipMapLayers.tsx (imperative layers); this
 * file is the page shell, the drawer, the filters, and the add flow.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
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
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ShipSection, ShipEyebrow, ShipNavRow, useShipFlags } from "./shipShared";
import {
  TYPE_META, BOOL_FILTERS, type MapBoolFilter, type ShipLocationType,
  ANCHORAGE, VOYAGE_MAX_BOUNDS, VOYAGE_DAYS, withinVoyageRange,
  MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_DEFAULT_ZOOM,
} from "./shipMapConfig";
import {
  BasemapLayer, VoyageRangeLayer, CascadiaBoundary, ChakraLayer, ClusterLayer, VoyageRoute, CrosshairPicker, type MapPin,
} from "./shipMapLayers";
import { InnerCompassSection } from "./shipInnerCompass";
import { ShipPermissionMap } from "./ShipPermissionMap";
import { Link } from "wouter";
import {
  loadVoyage, addToVoyage, removeFromVoyage, clearVoyage, saveVoyage,
  downloadVoyageGpx, voyageToGoogleMapsUrl, type VoyagePin,
} from "./shipVoyage";
import { FirstMatePlanner, FIRST_MATE_GREETING, type Itinerary } from "./ShipFirstMate";
import { FormCompanion } from "@/components/companion";

const PINS_CACHE_KEY = "ship_map_pins_v1";

/** Headless child that hands the Leaflet map instance up to the page (for panning). */
function MapReady({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

function shipPositionIcon() {
  return L.divIcon({
    className: "ship-position",
    html: `<div style="font-size:26px;line-height:38px;width:38px;height:38px;text-align:center;background:#fff;border:3px solid #1a472a;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,.4)">⛵</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}
function plantingIcon() {
  return L.divIcon({
    className: "ship-planting",
    html: `<div style="font-size:16px;line-height:24px;width:24px;height:24px;text-align:center">🌱</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const ADD_TYPES: ShipLocationType[] = ["spring", "waterfall", "boondock", "commercial_boondock", "food_forest", "land_project", "lake", "geology", "forest", "seed_site", "event_venue"];

export default function ShipMap() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const flags = useShipFlags();
  const mapRef = useRef<L.Map | null>(null);
  const onMapReady = useCallback((m: L.Map) => { mapRef.current = m; }, []);

  // Pin data (all sources; filtered client-side for instant response). Seeded
  // from localStorage so the map shows pins offline on the next visit.
  const cached = useMemo<MapPin[]>(() => {
    try { const r = localStorage.getItem(PINS_CACHE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
  }, []);
  const pinsQuery = trpc.ship.map.list.useQuery({}, { staleTime: 5 * 60 * 1000 });
  const allPins: MapPin[] = (pinsQuery.data as MapPin[] | undefined) ?? cached;
  useEffect(() => {
    if (pinsQuery.data) {
      try { localStorage.setItem(PINS_CACHE_KEY, JSON.stringify(pinsQuery.data)); } catch { /* non-fatal */ }
    }
  }, [pinsQuery.data]);

  const position = trpc.ship.map.position.useQuery();
  const plantings = trpc.ship.seeds.listVerified.useQuery();

  // Filters.
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [boolFilters, setBoolFilters] = useState<Set<MapBoolFilter>>(new Set());
  const [showBoundary, setShowBoundary] = useState(true);
  const [showPlantings, setShowPlantings] = useState(false);
  const [showChakras, setShowChakras] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);

  // The Inner Compass: the intuition practice + printable map builder.
  const [innerCompassOpen, setInnerCompassOpen] = useState(false);

  // The permission-radius map: the Voyage Covenant travel radius (Terms §6).
  const [permissionOpen, setPermissionOpen] = useState(false);

  // Selection / drawer.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detail = trpc.ship.map.get.useQuery({ id: selectedId ?? undefined }, { enabled: selectedId != null });

  // Voyage builder.
  const [voyage, setVoyage] = useState<VoyagePin[]>([]);
  const [voyageOpen, setVoyageOpen] = useState(false);
  useEffect(() => { setVoyage(loadVoyage()); }, []);
  useEffect(() => {
    const h = () => setVoyage(loadVoyage());
    window.addEventListener("ship-voyage-changed", h);
    return () => window.removeEventListener("ship-voyage-changed", h);
  }, []);

  // The First Mate: a compact voyage-planning drawer over the map. When she
  // charts an itinerary, resolve its location ids to pins, load them into
  // "My voyage" (shared state), draw the route, and pan to it.
  const [firstMateOpen, setFirstMateOpen] = useState(false);
  const onItinerary = useCallback((itinerary: Itinerary) => {
    const byId = new Map(allPins.map((p) => [p.id, p]));
    const seen = new Set<number>();
    const stops: VoyagePin[] = [];
    for (const day of itinerary.days ?? []) {
      for (const id of day.locationIds ?? []) {
        if (seen.has(id)) continue;
        const p = byId.get(id);
        if (!p || p.lat == null || p.lng == null) continue;
        seen.add(id);
        stops.push({ id: p.id, slug: p.slug, name: p.name, type: p.type, lat: p.lat, lng: p.lng });
      }
    }
    if (stops.length === 0) {
      toast("The First Mate charted your days. Open a pin and add it to draw the route.");
      return;
    }
    saveVoyage(stops); // fires ship-voyage-changed -> voyage state + VoyageRoute update
    const map = mapRef.current;
    if (map) {
      map.fitBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number])), { padding: [60, 60], maxZoom: 11 });
    }
    toast.success("Your voyage is charted on the map. Close this to see the route.");
  }, [allPins]);

  // Dataset door ("Add your database to the map").
  const [datasetOpen, setDatasetOpen] = useState(false);

  // Add-to-map flow.
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "spring", lat: null as number | null, lng: null as number | null, description: "", accessNotes: "", imageUrl: "", maxRigLengthFt: "" });
  const suggest = trpc.ship.map.suggest.useMutation();
  const confirm = trpc.ship.map.confirm.useMutation();
  const flag = trpc.ship.map.flag.useMutation();

  // Deep links: ?type=spring, ?pin=<slug>.
  const [deepPinSlug, setDeepPinSlug] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("type");
    if (t && TYPE_META[t]) setActiveTypes(new Set([t]));
    const pin = params.get("pin");
    if (pin) setDeepPinSlug(pin);
  }, []);
  const deepPin = trpc.ship.map.get.useQuery({ slug: deepPinSlug ?? undefined }, { enabled: !!deepPinSlug });
  useEffect(() => {
    if (deepPin.data) setSelectedId(deepPin.data.id);
  }, [deepPin.data]);

  const filtered = useMemo(() => {
    return allPins.filter((p) => {
      if (activeTypes.size > 0 && !activeTypes.has(p.type)) return false;
      if (boolFilters.has("verifiedOnly") && !p.isVerified) return false;
      if (boolFilters.has("freeCamping") && p.type !== "boondock") return false;
      if (boolFilters.has("fits40") && !((p as any).maxRigLengthFt >= 40)) return false;
      if (boolFilters.has("hasWater") && !(p as any).hasWater) return false;
      return true;
    });
  }, [allPins, activeTypes, boolFilters]);

  const withinCount = useMemo(
    () => filtered.filter((p) => withinVoyageRange(p.lat, p.lng)).length,
    [filtered],
  );

  // Hide filters that can never match the live data (a pill that always empties
  // the board is a dead control, e.g. "Has water tests" before any results land).
  const visibleBoolFilters = useMemo(
    () => BOOL_FILTERS.filter((f) => f.key !== "hasWater" || allPins.some((p) => (p as any).hasWater)),
    [allPins],
  );

  const toggleType = (t: string) => setActiveTypes((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const toggleBool = (k: MapBoolFilter) => setBoolFilters((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const onSelect = useCallback((id: number) => { setSelectedId(id); setVoyageOpen(false); }, []);

  function startAdd() {
    if (!isAuthenticated) { toast.error("Please sign in to add to the map."); window.location.href = getLoginUrl(); return; }
    setSelectedId(null);
    setAdding(true);
    setAddForm((f) => ({ ...f, lat: null, lng: null }));
    toast("Tap the map to drop your pin, or use your location.");
  }
  const onPick = useCallback((lat: number, lng: number) => {
    setAddForm((f) => ({ ...f, lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) }));
  }, []);
  function useMyLocation() {
    if (!navigator.geolocation) { toast.error("Location is not available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setAddForm((f) => ({ ...f, lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) })),
      () => toast.error("Could not get your location."),
    );
  }
  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (addForm.lat == null || addForm.lng == null) { toast.error("Drop a pin on the map first."); return; }
    try {
      await suggest.mutateAsync({
        name: addForm.name,
        type: addForm.type as ShipLocationType,
        lat: addForm.lat,
        lng: addForm.lng,
        description: addForm.description || undefined,
        accessNotes: addForm.accessNotes || undefined,
        imageUrl: addForm.imageUrl || undefined,
        maxRigLengthFt: addForm.type === "boondock" && addForm.maxRigLengthFt ? Number(addForm.maxRigLengthFt) : undefined,
      });
      toast.success("Thank you. Your pin is on the map and in for review.");
      setAdding(false);
      setAddForm({ name: "", type: "spring", lat: null, lng: null, description: "", accessNotes: "", imageUrl: "", maxRigLengthFt: "" });
      void utils.ship.map.list.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not add your pin.");
    }
  }

  const pos = position.data;
  const d = detail.data;

  return (
    <PageWrapper>
      <SEO title="The Treasure Map" description="Springs, waterfalls, food forests, free boondocks, and the land projects regenerating Cascadia. Chart your voyage." url="/ship/map" />
      <ShipNavRow current="/ship/map" />

      <ShipSection>
        <ShipEyebrow>The treasure map</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-3">Chart your voyage through Cascadia</h1>
        <p className="text-foreground/80 mb-5">The board shows everything within a {VOYAGE_DAYS}-day sail of the anchorage. The compass rose marks home port, the gold rings mark each day of reach, and past the horizon lies fog. Every token is a place a crew can serve, drink from, rest at, or plant seeds. Solid tokens are verified treasure; faded ones wait for a crew to confirm them. The ship pin shows where she sails now.</p>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(TYPE_META).map(([t, meta]) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-3 py-2 min-h-11 rounded-full border text-sm transition-colors ${activeTypes.has(t) ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "border-[#4a7c59]/30 hover:bg-[#4a7c59]/10"}`}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
          {activeTypes.size > 0 && (
            <button onClick={() => setActiveTypes(new Set())} className="px-3 py-2 min-h-11 rounded-full border border-transparent text-sm underline">Clear</button>
          )}
        </div>

        {/* Boolean filters + layer toggles */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {visibleBoolFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleBool(f.key)}
              className={`px-3 py-2 min-h-11 rounded-full border text-xs transition-colors ${boolFilters.has(f.key) ? "bg-[#b5762f] text-white border-[#b5762f]" : "border-[#b5762f]/40 hover:bg-[#b5762f]/10"}`}
            >
              {f.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={showBoundary} onChange={(e) => setShowBoundary(e.target.checked)} /> Bioregion</label>
          {(plantings.data?.length ?? 0) > 0 && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={showPlantings} onChange={(e) => setShowPlantings(e.target.checked)} /> Seed plantings</label>
          )}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={showChakras} onChange={(e) => setShowChakras(e.target.checked)} /> Chakra points</label>
          <button
            onClick={() => { setInnerCompassOpen((v) => !v); setVoyageOpen(false); }}
            className="ml-auto px-3.5 py-1.5 rounded-full text-sm font-semibold bg-[#8a5fc9] text-white shadow hover:brightness-105"
          >
            🧭 Inner Compass
          </button>
          <button onClick={() => setVoyageOpen((v) => !v)} className="px-3 py-2 min-h-11 rounded-full border text-xs border-[#2f5d3a]/40 hover:bg-[#2f5d3a]/10">
            ⛵ My voyage{voyage.length ? ` (${voyage.length})` : ""}
          </button>
          <button onClick={() => { setPermissionOpen((v) => !v); setInnerCompassOpen(false); }} aria-pressed={permissionOpen} className="px-3 py-2 min-h-11 rounded-full border text-xs border-[#c0392b]/50 text-[#c0392b] dark:text-[#e77] hover:bg-[#c0392b]/10">
            🔴 Permission radius
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden border" style={{ height: "62vh", minHeight: 440 }}>
          <MapContainer
            center={ANCHORAGE}
            zoom={MAP_DEFAULT_ZOOM}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxBounds={VOYAGE_MAX_BOUNDS}
            maxBoundsViscosity={0.9}
            style={{ height: "100%", width: "100%", background: "#0a140d" }}
            scrollWheelZoom
          >
            <MapReady onReady={onMapReady} />
            <BasemapLayer />
            <VoyageRangeLayer />
            <CascadiaBoundary show={showBoundary} />
            <ChakraLayer show={showChakras} />
            <ClusterLayer pins={filtered} onSelect={onSelect} />
            {voyage.length > 0 && <VoyageRoute stops={voyage.map((v, i) => ({ lat: v.lat, lng: v.lng, day: i + 1, name: v.name }))} />}
            <CrosshairPicker active={adding} onPick={onPick} />
            {showPlantings && (plantings.data ?? []).filter((p) => p.lat != null && p.lng != null).map((p) => (
              <Marker key={`seed-${p.id}`} position={[p.lat as number, p.lng as number]} icon={plantingIcon()}>
                <Popup><strong>A crew planted here</strong>{p.species && <div style={{ fontSize: 13 }}>{p.species}</div>}</Popup>
              </Marker>
            ))}
            {pos && (
              <Marker position={[pos.lat, pos.lng]} icon={shipPositionIcon()} zIndexOffset={1000}>
                <Popup><strong>She sails here</strong>{pos.note && <div style={{ fontSize: 13 }}>{pos.note}</div>}</Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Board vignette: darkened corners so the map reads as a game board. */}
          <div aria-hidden className="absolute inset-0 z-[450] pointer-events-none" style={{ boxShadow: "inset 0 0 90px 24px rgba(6,14,9,.55)", borderRadius: "inherit" }} />

          {/* Attribution (the Leaflet control also sets it, this is the always-visible corner) */}
          <div className="absolute bottom-0 right-0 z-[500] bg-white/70 dark:bg-black/50 text-[10px] px-1.5 py-0.5 rounded-tl">Imagery © Esri, Maxar, Earthstar Geographics</div>

          {/* Add-to-map FAB */}
          {!adding && (
            <button
              onClick={startAdd}
              className="absolute bottom-4 left-4 z-[500] px-4 py-2.5 rounded-full bg-[#ffd700] text-[#1a472a] font-semibold shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a]"
            >
              ＋ Add to the map
            </button>
          )}
          {adding && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-white dark:bg-neutral-900 border rounded-full px-3 py-1.5 text-sm shadow flex items-center gap-2">
              <span>{addForm.lat != null ? "Pin dropped. Fill the form below." : "Tap the map to drop your pin"}</span>
              <button onClick={useMyLocation} className="underline text-[#2f5d3a] dark:text-[#9de89d]">Use my location</button>
              <button onClick={() => setAdding(false)} className="text-muted-foreground">Cancel</button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {pinsQuery.isLoading && allPins.length === 0
              ? "Loading the board…"
              : `${withinCount} places within a ${VOYAGE_DAYS}-day sail${filtered.length - withinCount > 0 ? ` · ${filtered.length - withinCount} more wait past the horizon and join the board when the anchorage moves` : ""}`}
          </p>
          <button onClick={() => setLegendOpen((v) => !v)} className="text-sm underline text-[#2f5d3a] dark:text-[#9de89d]">{legendOpen ? "Hide legend" : "What do the pins mean?"}</button>
        </div>

        {/* Legend + story strip */}
        {legendOpen && (
          <div className="mt-3 grid sm:grid-cols-2 gap-2 rounded-xl border p-4 bg-[#4a7c59]/5">
            {Object.entries(TYPE_META).map(([t, meta]) => (
              <div key={t} className="flex items-start gap-2 text-sm"><span aria-hidden>{meta.emoji}</span><span className="text-foreground/80">{meta.blurb}</span></div>
            ))}
            <p className="sm:col-span-2 text-xs text-muted-foreground mt-1">Faded, dashed tokens are unverified: pulled from open data or dropped by crews, waiting for someone to confirm them in the field.</p>
            <p className="sm:col-span-2 text-xs text-muted-foreground">The gold rings radiate from the anchorage, one per day of sail. Places past the {VOYAGE_DAYS}-day horizon rest in the fog, off the board until she sails closer.</p>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Some pins come from partner datasets offered by other projects and networks. Those places carry a credit line to their source.</p>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Some places are shared with permission from iOverlander and visible to signed-in crew.</p>
            <p className="sm:col-span-2 text-xs text-muted-foreground">The glowing colored orbs are chakra points: symbolic energy centers of the region, joined into one line of light. Visit one and focus its center. Release, clear, heal. More nodes will be named as the research lands.</p>
          </div>
        )}
      </ShipSection>

      {/* The Inner Compass: intuition practice + printable map builder */}
      {innerCompassOpen && (
        <InnerCompassSection pins={allPins} activeTypes={activeTypes} onClose={() => setInnerCompassOpen(false)} />
      )}

      {/* The permission radius: the Voyage Covenant travel radius (Terms §6) */}
      {permissionOpen && (
        <ShipSection className="bg-[#c0392b]/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <ShipEyebrow>Travel radius</ShipEyebrow>
              <h2 className="text-2xl font-bold">Where she may sail without asking</h2>
            </div>
            <button onClick={() => setPermissionOpen(false)} aria-label="Close" className="text-2xl leading-none text-muted-foreground hover:text-foreground min-h-11 min-w-11 -m-2 inline-flex items-center justify-center">×</button>
          </div>
          <p className="text-foreground/80 max-w-2xl mb-4">
            The <span className="font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">green zone</span> is the permitted range: within 500 miles of Ashland, a one-week voyage may sail anywhere inside it. Beyond that line lies the <span className="font-semibold text-[#c0392b] dark:text-[#e77]">red locked zone</span> — contact the core team for written permission before you cross it. Longer voyages can unlock a wider range (up to 1,250 miles for a four-week sail), but crossing 500 miles always needs permission in advance.
          </p>
          <ShipPermissionMap />
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
            To request a wider range, read <Link href="/ship/terms#radius" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Voyage Covenant §6</Link> and email the core team at least 72 hours ahead with your destination, route, and dates.
          </p>
        </ShipSection>
      )}

      {/* Plan your voyage with the First Mate */}
      <ShipSection className="bg-[#2f5d3a]/6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between max-w-3xl">
          <div>
            <ShipEyebrow>The First Mate</ShipEyebrow>
            <h2 className="text-2xl font-bold mb-1">Plan your voyage with the First Mate</h2>
            <p className="text-foreground/80">{FIRST_MATE_GREETING} She draws it live on the map, only from the real places here, and the plan becomes your voyage.</p>
          </div>
          <Button onClick={() => setFirstMateOpen(true)} className="bg-[#2f5d3a] hover:bg-[#264a2f] shrink-0">⛵ Chart with the First Mate</Button>
        </div>
      </ShipSection>

      {/* The dataset door */}
      <ShipSection className="bg-[#b5762f]/8">
        <div className="max-w-3xl">
          <ShipEyebrow>Grow the map</ShipEyebrow>
          <h2 className="text-2xl font-bold mb-2">Have a project or network in the Regenerative Renaissance? Add your database to the map.</h2>
          <p className="text-foreground/80 mb-3">If you hold a dataset of places that belong on the treasure map, offer it here. Accepted datasets flow onto the map through our source-stamped importer, and every partner dataset carries a credit line to you on its pins.</p>
          <Button onClick={() => setDatasetOpen(true)} className="bg-[#b5762f] hover:brightness-95">Add your database</Button>
        </div>
      </ShipSection>

      {/* First Mate drawer (slides over the map on mobile, side panel on desktop) */}
      {firstMateOpen && (
        <FirstMateDrawer conciergeAboard={flags.concierge} onItinerary={onItinerary} onClose={() => setFirstMateOpen(false)} />
      )}

      {/* Dataset offer form */}
      {datasetOpen && <DatasetOfferDialog onClose={() => setDatasetOpen(false)} />}

      {/* Add form (appears while adding) */}
      {adding && (
        <ShipSection className="bg-[#ffd700]/8">
          <ShipEyebrow>Add to the map</ShipEyebrow>
          <h2 className="text-2xl font-bold mb-3">Your pin</h2>
          <div className="max-w-2xl">
            <FormCompanion
              formId="map-add"
              collected={{ name: addForm.name, type: addForm.type, description: addForm.description, accessNotes: addForm.accessNotes }}
              onField={(key, value) => {
                if (key === "name") setAddForm((f) => ({ ...f, name: value }));
                else if (key === "type") { if ((ADD_TYPES as string[]).includes(value)) setAddForm((f) => ({ ...f, type: value as ShipLocationType })); }
                else if (key === "description") setAddForm((f) => ({ ...f, description: value }));
                else if (key === "accessNotes") setAddForm((f) => ({ ...f, accessNotes: value }));
              }}
            />
          </div>
          <form onSubmit={submitAdd} className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="sm:col-span-2 text-sm text-muted-foreground">
              {addForm.lat != null ? <>Location: {addForm.lat}, {addForm.lng} · <button type="button" className="underline" onClick={() => setAddForm((f) => ({ ...f, lat: null, lng: null }))}>change</button></> : "Tap the map above to set the location."}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required minLength={2} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="add-type">Type</Label>
              <select id="add-type" value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })} className="w-full h-10 rounded-md border bg-background px-3">
                {ADD_TYPES.map((t) => (<option key={t} value={t}>{TYPE_META[t].label}</option>))}
              </select>
            </div>
            {addForm.type === "boondock" && (
              <div>
                <Label htmlFor="add-rig">Largest rig confirmed (ft)</Label>
                <Input id="add-rig" type="number" min={0} max={100} value={addForm.maxRigLengthFt} onChange={(e) => setAddForm({ ...addForm, maxRigLengthFt: e.target.value })} placeholder="40" />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="add-photo">Photo URL (optional)</Label>
              <Input id="add-photo" value={addForm.imageUrl} onChange={(e) => setAddForm({ ...addForm, imageUrl: e.target.value })} placeholder="https://…" maxLength={512} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="add-desc">Description</Label>
              <Textarea id="add-desc" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} maxLength={2000} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="add-access">Access notes (road, turnaround, cell signal, gates)</Label>
              <Textarea id="add-access" value={addForm.accessNotes} onChange={(e) => setAddForm({ ...addForm, accessNotes: e.target.value })} maxLength={2000} rows={2} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={suggest.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">{suggest.isPending ? "Sending…" : "Add this pin"}</Button>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </form>
        </ShipSection>
      )}

      {/* Detail drawer */}
      {selectedId != null && d && (
        <DetailDrawer
          detail={d}
          onClose={() => setSelectedId(null)}
          inVoyage={voyage.some((v) => v.id === d.id)}
          onToggleVoyage={() => {
            if (voyage.some((v) => v.id === d.id)) removeFromVoyage(d.id);
            else addToVoyage({ id: d.id, slug: d.slug, name: d.name, type: d.type, lat: d.lat, lng: d.lng });
          }}
          isAuthenticated={isAuthenticated}
          onConfirm={async () => {
            try { await confirm.mutateAsync({ id: d.id }); toast.success("Thank you. Marked confirmed."); void utils.ship.map.get.invalidate(); void utils.ship.map.list.invalidate(); }
            catch (e: any) { toast.error(e?.message ?? "Could not confirm."); }
          }}
          onFlag={async (reason) => {
            try { await flag.mutateAsync({ id: d.id, reason }); toast.success("Thank you. A crew member will look into it."); }
            catch (e: any) { toast.error(e?.message ?? "Could not send the flag."); }
          }}
        />
      )}

      {/* Voyage panel */}
      {voyageOpen && (
        <VoyagePanel
          voyage={voyage}
          onRemove={(id) => removeFromVoyage(id)}
          onClear={() => clearVoyage()}
          onClose={() => setVoyageOpen(false)}
        />
      )}
    </PageWrapper>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
type LocationDetail = {
  id: number; slug: string; name: string; type: string; lat: number; lng: number;
  description?: string | null; websiteUrl?: string | null; imageUrl?: string | null;
  source?: string | null; sourceUrl?: string | null; sourceLicense?: string | null;
  accessNotes?: string | null; waterQualityUrl?: string | null; maxRigLengthFt?: number | null;
  lastVerifiedAt?: string | Date | null; isVerified: boolean;
};

function DetailDrawer({ detail, onClose, inVoyage, onToggleVoyage, isAuthenticated, onConfirm, onFlag }: {
  detail: LocationDetail; onClose: () => void; inVoyage: boolean; onToggleVoyage: () => void;
  isAuthenticated: boolean; onConfirm: () => void; onFlag: (reason: string) => void;
}) {
  const meta = TYPE_META[detail.type] ?? { emoji: "📍", label: detail.type };
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const shareUrl = `${window.location.origin}/ship/map?pin=${encodeURIComponent(detail.slug)}`;
  return (
    <ShipSection className="bg-[#2f5d3a]/5">
      <div className="max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <ShipEyebrow>{meta.emoji} {meta.label}{!detail.isVerified && " · unverified"}</ShipEyebrow>
            <h2 className="text-2xl font-bold">{detail.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-muted-foreground hover:text-foreground min-h-11 min-w-11 -m-2 inline-flex items-center justify-center">×</button>
        </div>
        {detail.imageUrl && <img src={detail.imageUrl} alt={detail.name} loading="lazy" className="mt-3 rounded-xl max-h-64 w-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />}
        {detail.description && <p className="mt-3 text-foreground/85">{detail.description}</p>}

        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {detail.maxRigLengthFt != null && (<div><dt className="text-muted-foreground">Rig fit</dt><dd>Up to {detail.maxRigLengthFt} ft</dd></div>)}
          {detail.accessNotes && (<div className="sm:col-span-2"><dt className="text-muted-foreground">Access</dt><dd>{detail.accessNotes}</dd></div>)}
          {detail.lastVerifiedAt && (<div><dt className="text-muted-foreground">Last confirmed</dt><dd>{new Date(detail.lastVerifiedAt).toLocaleDateString()}</dd></div>)}
          {detail.waterQualityUrl && (<div><dt className="text-muted-foreground">Water tests</dt><dd><a className="underline text-[#2f5d3a] dark:text-[#9de89d]" href={detail.waterQualityUrl} target="_blank" rel="noreferrer">View results</a></dd></div>)}
          {detail.websiteUrl && (<div><dt className="text-muted-foreground">Website</dt><dd><a className="underline text-[#2f5d3a] dark:text-[#9de89d]" href={detail.websiteUrl} target="_blank" rel="noreferrer">Visit</a></dd></div>)}
          {detail.sourceUrl && (<div><dt className="text-muted-foreground">Source</dt><dd><a className="underline text-[#2f5d3a] dark:text-[#9de89d]" href={detail.sourceUrl} target="_blank" rel="noreferrer">{detail.source ?? "origin"}</a>{detail.sourceLicense ? ` · ${detail.sourceLicense}` : ""}</dd></div>)}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onToggleVoyage} className={inVoyage ? "bg-[#b5762f] hover:brightness-95" : "bg-[#2f5d3a] hover:bg-[#264a2f]"}>{inVoyage ? "In your voyage ✓" : "Add to my voyage"}</Button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${detail.lat},${detail.lng}`}
            target="_blank" rel="noreferrer"
          ><Button size="sm" variant="outline">Google Maps</Button></a>
          <a
            href={`https://maps.apple.com/?daddr=${detail.lat},${detail.lng}&q=${encodeURIComponent(detail.name)}`}
            target="_blank" rel="noreferrer"
          ><Button size="sm" variant="outline">Apple Maps</Button></a>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success("Link copied"); }}>Share</Button>
          {isAuthenticated && (
            <>
              <Button size="sm" variant="outline" onClick={onConfirm}>Confirmed, still true</Button>
              <Button size="sm" variant="outline" onClick={() => setFlagOpen((v) => !v)}>Flag a problem</Button>
            </>
          )}
        </div>
        {flagOpen && (
          <div className="mt-3 flex gap-2 items-start">
            <Input value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="What's wrong? (gate locked, spring dry, rig no longer fits…)" maxLength={500} />
            <Button size="sm" onClick={() => { if (flagReason.trim().length >= 3) { onFlag(flagReason.trim()); setFlagReason(""); setFlagOpen(false); } }}>Send</Button>
          </div>
        )}
      </div>
    </ShipSection>
  );
}

// ── Voyage panel ──────────────────────────────────────────────────────────────
function VoyagePanel({ voyage, onRemove, onClear, onClose }: { voyage: VoyagePin[]; onRemove: (id: number) => void; onClear: () => void; onClose: () => void }) {
  return (
    <ShipSection className="bg-[#b5762f]/8">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between">
          <ShipEyebrow>⛵ My voyage</ShipEyebrow>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-muted-foreground hover:text-foreground min-h-11 min-w-11 -m-2 inline-flex items-center justify-center">×</button>
        </div>
        <h2 className="text-2xl font-bold mb-3">{voyage.length ? `${voyage.length} stop${voyage.length > 1 ? "s" : ""}` : "No stops yet"}</h2>
        {voyage.length === 0 ? (
          <p className="text-foreground/80">Open a pin and tap “Add to my voyage” to start charting a route. Then export it to your nav app.</p>
        ) : (
          <>
            <ol className="space-y-1 mb-4">
              {voyage.map((v, i) => (
                <li key={v.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <span><span className="inline-block w-6 font-semibold text-[#b5762f]">{i + 1}</span>{TYPE_META[v.type]?.emoji} {v.name}</span>
                  <button onClick={() => onRemove(v.id)} className="text-muted-foreground hover:text-foreground text-xs underline">remove</button>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-[#2f5d3a] hover:bg-[#264a2f]" onClick={() => downloadVoyageGpx(voyage)}>Export GPX</Button>
              <a href={voyageToGoogleMapsUrl(voyage)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Open in Google Maps</Button></a>
              <Button size="sm" variant="outline" onClick={onClear}>Clear</Button>
            </div>
          </>
        )}
      </div>
    </ShipSection>
  );
}

// ── First Mate drawer ─────────────────────────────────────────────────────────
// Slides over the map on mobile (full width), a side panel on desktop. Reuses
// the shared FirstMatePlanner; when she charts an itinerary the host draws it on
// the map and it becomes "My voyage".
function FirstMateDrawer({ conciergeAboard, onItinerary, onClose }: {
  conciergeAboard: boolean; onItinerary: (itinerary: Itinerary) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1200]" role="dialog" aria-modal="true" aria-label="Plan your voyage with the First Mate">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full sm:w-[440px] max-w-full bg-background shadow-2xl overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background px-5 py-4">
          <div>
            <ShipEyebrow>The First Mate</ShipEyebrow>
            <p className="text-sm text-foreground/80">{FIRST_MATE_GREETING}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-muted-foreground hover:text-foreground min-h-11 min-w-11 -m-2 inline-flex items-center justify-center">×</button>
        </div>
        <div className="p-5">
          {!conciergeAboard && (
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">The First Mate is not aboard yet. Check back soon, or build a voyage by hand from the pins.</p>
          )}
          <FirstMatePlanner conciergeAboard={conciergeAboard} onItinerary={onItinerary} compact />
        </div>
      </div>
    </div>
  );
}

// ── Dataset door ──────────────────────────────────────────────────────────────
// "Add your database to the map." A partner or network offers a dataset of
// places; accepted offers flow through the source-stamped importer and are
// credited on the pins.
function DatasetOfferDialog({ onClose }: { onClose: () => void }) {
  const submit = trpc.ship.datasetOffer.submit.useMutation();
  const [f, setF] = useState({ orgName: "", contactName: "", email: "", description: "", approxCount: "", dataUrl: "", license: false });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.license) { toast.error("Please confirm you have the right to share this data."); return; }
    try {
      await submit.mutateAsync({
        orgName: f.orgName,
        contactName: f.contactName,
        email: f.email,
        description: f.description,
        approxCount: f.approxCount ? Number(f.approxCount) : undefined,
        dataUrl: f.dataUrl || undefined,
        licenseConfirmed: true,
      });
      toast.success("Thank you. Your dataset offer is in. We will be in touch.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send your offer.");
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-start sm:items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Add your database to the map">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg my-8 p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <ShipEyebrow>Grow the map</ShipEyebrow>
            <h2 className="text-xl font-bold">Add your database to the map</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-muted-foreground hover:text-foreground min-h-11 min-w-11 -m-2 inline-flex items-center justify-center">×</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="ds-org">Organization or network name</Label>
            <Input id="ds-org" value={f.orgName} onChange={(e) => setF({ ...f, orgName: e.target.value })} required minLength={2} maxLength={200} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ds-contact">Contact name</Label>
              <Input id="ds-contact" value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} required minLength={2} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="ds-email">Email</Label>
              <Input id="ds-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required maxLength={320} />
            </div>
          </div>
          <div>
            <Label htmlFor="ds-desc">What does the dataset hold?</Label>
            <Textarea id="ds-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} required minLength={10} maxLength={2000} placeholder="Springs, food forests, land projects, events…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ds-count">Roughly how many places?</Label>
              <Input id="ds-count" type="number" min={0} max={10000000} value={f.approxCount} onChange={(e) => setF({ ...f, approxCount: e.target.value })} placeholder="120" />
            </div>
            <div>
              <Label htmlFor="ds-url">Link to the data or its home (optional)</Label>
              <Input id="ds-url" value={f.dataUrl} onChange={(e) => setF({ ...f, dataUrl: e.target.value })} placeholder="https://…" maxLength={512} />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={f.license} onChange={(e) => setF({ ...f, license: e.target.checked })} className="mt-1" />
            <span>We have the right to share this data and welcome its use on the treasure map, with attribution.</span>
          </label>
          <p className="text-xs text-muted-foreground">Partner datasets get a credit line on their pins and in the map legend.</p>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={submit.isPending} className="bg-[#b5762f] hover:brightness-95">{submit.isPending ? "Sending…" : "Offer this dataset"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
