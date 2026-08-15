/**
 * /admin/ship - ReGen Ship admin. Bookings, treasure map verification, quest
 * verification, seed plantings, nominations, applications, position pings, and
 * seasonal pricing + blackouts. Server-side adminProcedure guards every call.
 */
import { useState } from "react";
import { MapContainer, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BasemapLayer } from "./shipMapLayers";
import { CASCADIA_MAX_BOUNDS, MAP_MIN_ZOOM, MAP_MAX_ZOOM } from "./shipMapConfig";

const TABS = ["Bookings", "Map", "Coverage", "Flags", "Quest", "Plantings", "Nominations", "Applications", "Datasets", "Position", "Pricing", "Shipwright", "Galley"] as const;
type Tab = (typeof TABS)[number];

// 50 miles in metres — the v1 proxy for a ~60-minute drive (isochrones later).
const COVERAGE_RADIUS_M = 80467;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function ShipAdmin() {
  const [tab, setTab] = useState<Tab>("Bookings");
  const utils = trpc.useUtils();
  const err = (e: any) => toast.error(e?.message ?? "Action failed");
  const ok = (m: string) => (fn?: () => void) => { toast.success(m); fn?.(); };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">ReGen Ship admin</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm border ${tab === t ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "border-muted"}`}>{t}</button>
        ))}
      </div>

      {tab === "Bookings" && <BookingsTab utils={utils} err={err} ok={ok} />}
      {tab === "Map" && <MapTab utils={utils} err={err} ok={ok} />}
      {tab === "Coverage" && <CoverageTab err={err} ok={ok} />}
      {tab === "Flags" && <FlagsTab utils={utils} err={err} ok={ok} />}
      {tab === "Quest" && <QuestTab utils={utils} err={err} ok={ok} />}
      {tab === "Plantings" && <PlantingsTab utils={utils} err={err} ok={ok} />}
      {tab === "Nominations" && <NominationsTab utils={utils} err={err} ok={ok} />}
      {tab === "Applications" && <ApplicationsTab err={err} ok={ok} utils={utils} />}
      {tab === "Datasets" && <DatasetsTab utils={utils} err={err} ok={ok} />}
      {tab === "Position" && <PositionTab err={err} ok={ok} />}
      {tab === "Pricing" && <PricingTab utils={utils} err={err} ok={ok} />}
      {tab === "Shipwright" && <ShipwrightTab utils={utils} err={err} ok={ok} />}
      {tab === "Galley" && <GalleyTab utils={utils} err={err} ok={ok} />}
    </div>
  );
}

type Common = { utils?: any; err: (e: any) => void; ok: (m: string) => (fn?: () => void) => void };

function BookingsTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listBookings.useQuery();
  const approve = trpc.ship.admin.approveBooking.useMutation();
  const complete = trpc.ship.admin.markPlatformComplete.useMutation();
  const setStatus = trpc.ship.admin.setBookingStatus.useMutation();
  const [refs, setRefs] = useState<Record<number, string>>({});
  const refresh = () => utils.ship.admin.listBookings.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <Section title="Bookings">
      <div className="space-y-2">
        {(q.data ?? []).map((b: any) => (
          <div key={b.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between">
              <span>#{b.id} user {b.userId}, {b.startDate} to {b.endDate}, {b.guests} guests</span>
              <span className="font-semibold">{b.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => approve.mutateAsync({ id: b.id }).then(() => ok("Approved")(refresh)).catch(err)}>Approve</Button>
              <Input className="h-8 w-40" placeholder="platform ref" value={refs[b.id] ?? ""} onChange={(e) => setRefs({ ...refs, [b.id]: e.target.value })} />
              <Button size="sm" variant="outline" onClick={() => complete.mutateAsync({ id: b.id, platformBookingRef: refs[b.id] ?? "" }).then(() => ok("Confirmed")(refresh)).catch(err)}>Mark platform complete</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus.mutateAsync({ id: b.id, status: "cancelled" }).then(() => ok("Cancelled")(refresh)).catch(err)}>Cancel</Button>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
      </div>
    </Section>
  );
}

function MapTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listLocations.useQuery();
  const verify = trpc.ship.admin.verifyLocation.useMutation();
  const refresh = () => utils.ship.admin.listLocations.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <Section title="Locations">
      <div className="space-y-1">
        {(q.data ?? []).map((l: any) => (
          <div key={l.id} className="flex items-center justify-between border rounded p-2 text-sm">
            <span>{l.name} ({l.type}) {l.isVerified ? "✓" : "· pending"}</span>
            <Button size="sm" variant="outline" onClick={() => verify.mutateAsync({ id: l.id, isVerified: !l.isVerified }).then(() => ok("Updated")(refresh)).catch(err)}>{l.isVerified ? "Unverify" : "Verify"}</Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

// Coverage / gap view: verified boondocks with 50-mile (≈60-min drive) proxy
// circles over the Tier 1+2 voyage zone, so gaps are visible and research is
// targeted. Unverified (research-target) boondocks show as faded pins.
function CoverageTab({ err, ok }: Common) {
  const q = trpc.ship.admin.coverage.useQuery();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  const boondocks = q.data?.boondocks ?? [];
  const verified = boondocks.filter((b: any) => b.isVerified);
  const unverified = boondocks.filter((b: any) => !b.isVerified);
  return (
    <Section title={`Coverage — ${q.data?.verifiedCount ?? 0} verified boondocks (50-mi drive proxy)`}>
      <p className="text-sm text-muted-foreground mb-3">Green circles are a ~1-hour drive of a verified 40-ft-capable boondock. White space over the Ashland→Portland corridor is a gap to research. Faded pins are researched but not yet ground-truthed.</p>
      <div className="rounded-2xl overflow-hidden border" style={{ height: "60vh", minHeight: 420 }}>
        <MapContainer center={[43.5, -122.4]} zoom={7} minZoom={MAP_MIN_ZOOM} maxZoom={MAP_MAX_ZOOM} maxBounds={CASCADIA_MAX_BOUNDS} style={{ height: "100%", width: "100%", background: "#e9e4d6" }} scrollWheelZoom>
          <BasemapLayer />
          {verified.map((b: any) => (
            <Circle key={`c-${b.id}`} center={[b.lat, b.lng]} radius={COVERAGE_RADIUS_M} pathOptions={{ color: "#2f5d3a", fillColor: "#2f5d3a", fillOpacity: 0.12, weight: 1 }} />
          ))}
          {verified.map((b: any) => (
            <Marker key={`v-${b.id}`} position={[b.lat, b.lng]} icon={L.divIcon({ className: "cov-pin", html: `<div style="width:14px;height:14px;border-radius:50%;background:#2f5d3a;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] })}>
              <Popup><strong>{b.name}</strong>{b.maxRigLengthFt != null && <div style={{ fontSize: 12 }}>Up to {b.maxRigLengthFt} ft</div>}</Popup>
            </Marker>
          ))}
          {unverified.map((b: any) => (
            <Marker key={`u-${b.id}`} position={[b.lat, b.lng]} icon={L.divIcon({ className: "cov-pin", html: `<div style="width:12px;height:12px;border-radius:50%;background:#b5762f;opacity:.55;border:2px dashed #fff"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] })}>
              <Popup><strong>{b.name}</strong><div style={{ fontSize: 12 }}>Research target (not ground-truthed)</div></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </Section>
  );
}

function FlagsTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listFlags.useQuery();
  const resolve = trpc.ship.admin.resolveFlag.useMutation();
  const refresh = () => utils.ship.admin.listFlags.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <Section title="Field-verification flags">
      <div className="space-y-2">
        {(q.data ?? []).map((f: any) => (
          <div key={f.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span>
                {f.locationSlug ? <a className="underline" href={`/ship/map?pin=${f.locationSlug}`} target="_blank" rel="noreferrer">{f.locationName ?? `location ${f.locationId}`}</a> : (f.locationName ?? `location ${f.locationId}`)}
              </span>
              <Button size="sm" variant="outline" onClick={() => resolve.mutateAsync({ id: f.id }).then(() => ok("Resolved")(refresh)).catch(err)}>Resolve</Button>
            </div>
            <p className="text-muted-foreground mt-1">{f.reason}</p>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No open flags.</p>}
      </div>
    </Section>
  );
}

function QuestTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listPendingCompletions.useQuery();
  const review = trpc.ship.admin.reviewCompletion.useMutation();
  const status = trpc.ship.quest.freeVoyageStatus.useQuery();
  const draw = trpc.ship.admin.drawFreeVoyageWinner.useMutation();
  const refresh = () => utils.ship.admin.listPendingCompletions.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  const s = status.data;
  return (
    <>
      <Section title="Free voyages">
        <div className="text-sm border rounded p-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span><b>{s?.freeVoyagesUnlocked ?? "-"}</b> of {s?.freeVoyagesTotal ?? 6} unlocked</span>
          <span>{s?.percentBooked ?? 0}% booked ({s?.bookedVoyages ?? 0}/{s?.target ?? 0} voyages)</span>
          <span><b>{s?.poolSize ?? 0}</b> in the draw</span>
          <Button
            size="sm"
            className="bg-[#2f5d3a] hover:bg-[#264a2f]"
            disabled={draw.isPending}
            onClick={() => draw.mutateAsync().then((r) => { toast.success(`Drawn: ${r.handle ? "@" + r.handle : r.name ?? "user " + r.userId}`); status.refetch(); }).catch(err)}
          >
            {draw.isPending ? "Drawing…" : "Draw a free-voyage winner"}
          </Button>
        </div>
      </Section>
    <Section title="Pending quest completions">
      <div className="space-y-2">
        {(q.data ?? []).map((c: any) => (
          <div key={c.id} className="border rounded p-3 text-sm">
            <div>{c.name ?? "user " + c.userId} · {c.actionTitle} ({c.points} pts)</div>
            {c.proofUrl && <a href={c.proofUrl} target="_blank" rel="noreferrer" className="text-[#2f5d3a] dark:text-[#9de89d] underline break-all">{c.proofUrl}</a>}
            {c.note && <p className="text-muted-foreground">{c.note}</p>}
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => review.mutateAsync({ id: c.id, status: "verified" }).then(() => ok("Verified")(refresh)).catch(err)} className="bg-[#2f5d3a] hover:bg-[#264a2f]">Verify</Button>
              <Button size="sm" variant="outline" onClick={() => review.mutateAsync({ id: c.id, status: "rejected" }).then(() => ok("Rejected")(refresh)).catch(err)}>Reject</Button>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">Nothing pending.</p>}
      </div>
    </Section>
    </>
  );
}

function PlantingsTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listPendingPlantings.useQuery();
  const verify = trpc.ship.admin.verifyPlanting.useMutation();
  const refresh = () => utils.ship.admin.listPendingPlantings.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <Section title="Pending seed plantings">
      <div className="space-y-1">
        {(q.data ?? []).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between border rounded p-2 text-sm">
            <span>{p.species ?? "planting"} {p.lat != null ? `(${p.lat.toFixed?.(3)}, ${p.lng?.toFixed?.(3)})` : ""}</span>
            <Button size="sm" variant="outline" onClick={() => verify.mutateAsync({ id: p.id, isVerified: true }).then(() => ok("Verified")(refresh)).catch(err)}>Verify</Button>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">Nothing pending.</p>}
      </div>
    </Section>
  );
}

function NominationsTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listNominations.useQuery();
  const review = trpc.ship.admin.reviewNomination.useMutation();
  const refresh = () => utils.ship.admin.listNominations.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <Section title="Nominations">
      <div className="space-y-2">
        {(q.data ?? []).map((n: any) => (
          <div key={n.id} className="border rounded p-3 text-sm">
            <div className="font-medium">{n.nomineeName} {n.isSelfNomination ? "(self)" : ""} · {n.status}</div>
            <p className="text-muted-foreground">{n.reason}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => review.mutateAsync({ id: n.id, status: "shortlisted" }).then(() => ok("Shortlisted")(refresh)).catch(err)}>Shortlist</Button>
              <Button size="sm" variant="outline" onClick={() => review.mutateAsync({ id: n.id, status: "selected" }).then(() => ok("Selected")(refresh)).catch(err)}>Select</Button>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No nominations yet.</p>}
      </div>
    </Section>
  );
}

function ApplicationsTab({ err, ok, utils }: Common) {
  const [kind, setKind] = useState<"keeper" | "fleet" | "winter">("keeper");
  const q = trpc.ship.admin.listApplications.useQuery({ kind });
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <Section title="Applications">
      <div className="flex gap-2 mb-3">
        {(["keeper", "fleet", "winter"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`px-2 py-1 rounded text-sm border ${kind === k ? "bg-[#2f5d3a] text-white" : ""}`}>{k}</button>
        ))}
      </div>
      <div className="space-y-1">
        {(q.data ?? []).map((a: any) => (
          <div key={a.id} className="border rounded p-2 text-sm">
            <div className="font-medium">{a.name ?? a.ownerName ?? a.projectName} · {a.email} · {a.status}</div>
            {(a.rvYearMakeModel || a.location) && (
              <p className="text-xs text-muted-foreground">{[a.rvYearMakeModel, a.location].filter(Boolean).join(" · ")}</p>
            )}
            {(a.experience || a.message || a.siteDescription) && <p className="text-muted-foreground">{a.experience || a.message || a.siteDescription}</p>}
            {/* The Flagkeeper's qualification story (fleet applications). */}
            {a.whyRegeneration && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Why regeneration:</span> {a.whyRegeneration}</p>}
            {a.fleetVision && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Vision:</span> {a.fleetVision}</p>}
            {a.offersText && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Offers:</span> {a.offersText}</p>}
            {a.needsText && <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Hopes to receive:</span> {a.needsText}</p>}
            {a.companionTranscript && (() => {
              let turns: Array<{ role: string; content: string }> = [];
              try { turns = JSON.parse(a.companionTranscript); } catch { /* unreadable record; skip */ }
              if (!Array.isArray(turns) || turns.length === 0) return null;
              return (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium">Flagkeeper conversation ({turns.length} turns)</summary>
                  <div className="mt-1 space-y-1 max-h-64 overflow-y-auto border-l-2 pl-2">
                    {turns.map((t, i) => (
                      <p key={i} className="text-xs">
                        <span className="font-semibold">{t.role === "user" ? "Them" : "Flagkeeper"}:</span> {String(t.content)}
                      </p>
                    ))}
                  </div>
                </details>
              );
            })()}
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No applications yet.</p>}
      </div>
    </Section>
  );
}

function DatasetsTab({ utils, err, ok }: Common) {
  const q = trpc.ship.admin.listDatasetOffers.useQuery();
  const setStatus = trpc.ship.admin.setDatasetOfferStatus.useMutation();
  const refresh = () => utils.ship.admin.listDatasetOffers.invalidate();
  if (q.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  const STATUSES = ["submitted", "reviewing", "imported", "declined"] as const;
  return (
    <Section title="Dataset offers (Add your database to the map)">
      <p className="text-sm text-muted-foreground mb-3">On acceptance, import via the source-stamped conventions (source = org slug, sourceUrl, sourceLicense) so each partner dataset is idempotent and credited on its pins.</p>
      <div className="space-y-2">
        {(q.data ?? []).map((o: any) => (
          <div key={o.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{o.orgName} · {o.contactName} · {o.email}</span>
              <span className="font-semibold">{o.status}</span>
            </div>
            <p className="text-muted-foreground mt-1">{o.description}</p>
            <div className="text-xs text-muted-foreground mt-1">
              {o.approxCount != null && <>~{o.approxCount} places · </>}
              {o.dataUrl && <a className="underline break-all" href={o.dataUrl} target="_blank" rel="noreferrer">{o.dataUrl}</a>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {STATUSES.map((s) => (
                <Button key={s} size="sm" variant={o.status === s ? "default" : "outline"} className={o.status === s ? "bg-[#2f5d3a] hover:bg-[#264a2f]" : ""} onClick={() => setStatus.mutateAsync({ id: o.id, status: s }).then(() => ok("Updated")(refresh)).catch(err)}>{s}</Button>
              ))}
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No dataset offers yet.</p>}
      </div>
    </Section>
  );
}

function PositionTab({ err, ok }: Common) {
  const post = trpc.ship.admin.postPosition.useMutation();
  const [lat, setLat] = useState(""); const [lng, setLng] = useState(""); const [note, setNote] = useState("");
  return (
    <Section title="Post a position ping (she sails here)">
      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="text-xs">Lat</label><Input className="h-9 w-32" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div><label className="text-xs">Lng</label><Input className="h-9 w-32" value={lng} onChange={(e) => setLng(e.target.value)} /></div>
        <div><label className="text-xs">Note</label><Input className="h-9 w-48" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <Button size="sm" className="bg-[#2f5d3a] hover:bg-[#264a2f]" onClick={() => post.mutateAsync({ lat: parseFloat(lat), lng: parseFloat(lng), note: note || undefined }).then(() => ok("Position posted")()).catch(err)}>Post</Button>
      </div>
    </Section>
  );
}

function PricingTab({ utils, err, ok }: Common) {
  const windows = trpc.ship.admin.listPricingWindows.useQuery();
  const blackouts = trpc.ship.admin.listBlackouts.useQuery();
  const addWin = trpc.ship.admin.addPricingWindow.useMutation();
  const delWin = trpc.ship.admin.deletePricingWindow.useMutation();
  const addBk = trpc.ship.admin.addBlackout.useMutation();
  const delBk = trpc.ship.admin.deleteBlackout.useMutation();
  const [w, setW] = useState({ startDate: "", endDate: "", multiplier: "1.25", label: "" });
  const [b, setB] = useState({ startDate: "", endDate: "", reason: "" });
  const rWin = () => utils.ship.admin.listPricingWindows.invalidate();
  const rBk = () => utils.ship.admin.listBlackouts.invalidate();
  if (windows.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <>
      <Section title="Seasonal pricing windows">
        <div className="flex flex-wrap gap-2 items-end mb-2">
          <Input className="h-9 w-36" type="date" value={w.startDate} onChange={(e) => setW({ ...w, startDate: e.target.value })} />
          <Input className="h-9 w-36" type="date" value={w.endDate} onChange={(e) => setW({ ...w, endDate: e.target.value })} />
          <Input className="h-9 w-24" placeholder="mult" value={w.multiplier} onChange={(e) => setW({ ...w, multiplier: e.target.value })} />
          <Input className="h-9 w-36" placeholder="label" value={w.label} onChange={(e) => setW({ ...w, label: e.target.value })} />
          <Button size="sm" onClick={() => addWin.mutateAsync({ startDate: w.startDate, endDate: w.endDate, multiplier: parseFloat(w.multiplier), label: w.label || undefined }).then(() => ok("Added")(rWin)).catch(err)}>Add</Button>
        </div>
        {(windows.data ?? []).map((x: any) => (
          <div key={x.id} className="flex justify-between border rounded p-2 text-sm"><span>{x.startDate} to {x.endDate} · ×{x.multiplier} {x.label}</span><Button size="sm" variant="outline" onClick={() => delWin.mutateAsync({ id: x.id }).then(() => ok("Removed")(rWin)).catch(err)}>Delete</Button></div>
        ))}
      </Section>
      <Section title="Blackout dates">
        <div className="flex flex-wrap gap-2 items-end mb-2">
          <Input className="h-9 w-36" type="date" value={b.startDate} onChange={(e) => setB({ ...b, startDate: e.target.value })} />
          <Input className="h-9 w-36" type="date" value={b.endDate} onChange={(e) => setB({ ...b, endDate: e.target.value })} />
          <Input className="h-9 w-40" placeholder="reason" value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} />
          <Button size="sm" onClick={() => addBk.mutateAsync({ startDate: b.startDate, endDate: b.endDate, reason: b.reason || undefined }).then(() => ok("Added")(rBk)).catch(err)}>Add</Button>
        </div>
        {(blackouts.data ?? []).map((x: any) => (
          <div key={x.id} className="flex justify-between border rounded p-2 text-sm"><span>{x.startDate} to {x.endDate} · {x.reason}</span><Button size="sm" variant="outline" onClick={() => delBk.mutateAsync({ id: x.id }).then(() => ok("Removed")(rBk)).catch(err)}>Delete</Button></div>
        ))}
      </Section>
    </>
  );
}

const KB_SYSTEMS = [
  "general", "chassis", "engine", "propane", "electrical", "plumbing", "slides",
  "generator", "appliances", "starlink", "water_filtration", "tires_brakes", "hvac",
] as const;

function ShipwrightTab({ utils, err, ok }: Common) {
  const chunks = trpc.ship.admin.listKnowledgeChunks.useQuery();
  const cases = trpc.ship.admin.listMaintenanceCases.useQuery();
  const add = trpc.ship.admin.addKnowledgeChunk.useMutation();
  const approve = trpc.ship.admin.approveKnowledgeChunk.useMutation();
  const del = trpc.ship.admin.deleteKnowledgeChunk.useMutation();
  const resolve = trpc.ship.admin.resolveMaintenanceCase.useMutation();
  const intoKb = trpc.ship.admin.approveCaseIntoKb.useMutation();
  const [nk, setNk] = useState({ title: "", system: "general", sourceRef: "", content: "" });
  const [resolution, setResolution] = useState<Record<number, string>>({});
  const rChunks = () => utils.ship.admin.listKnowledgeChunks.invalidate();
  const rCases = () => utils.ship.admin.listMaintenanceCases.invalidate();
  if (chunks.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  return (
    <>
      <Section title="Teach the Shipwright (paste a manual section, a fix, a spec)">
        <p className="text-sm text-muted-foreground mb-2">One fact per entry works best: a symptom and its fix, a spec table, a how-to. It goes live for the Shipwright immediately.</p>
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap gap-2">
            <Input className="h-9 flex-1 min-w-56" placeholder="Title, e.g. Generator won't start: first checks" value={nk.title} onChange={(e) => setNk({ ...nk, title: e.target.value })} />
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nk.system} onChange={(e) => setNk({ ...nk, system: e.target.value })}>
              {KB_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input className="h-9 w-56" placeholder="Source (manual p.12, iRV2 thread…)" value={nk.sourceRef} onChange={(e) => setNk({ ...nk, sourceRef: e.target.value })} />
          </div>
          <textarea
            className="w-full rounded-md border bg-background p-2 text-sm min-h-32"
            placeholder="The knowledge itself. Plain language. Steps, specs, part numbers, what worked."
            value={nk.content}
            maxLength={8000}
            onChange={(e) => setNk({ ...nk, content: e.target.value })}
          />
          <Button
            size="sm"
            className="bg-[#2f5d3a] hover:bg-[#264a2f]"
            disabled={nk.title.trim().length < 2 || nk.content.trim().length < 10 || add.isPending}
            onClick={() => add.mutateAsync({ title: nk.title.trim(), content: nk.content.trim(), system: nk.system as (typeof KB_SYSTEMS)[number], sourceRef: nk.sourceRef.trim() || undefined })
              .then(() => { setNk({ title: "", system: nk.system, sourceRef: "", content: "" }); ok("She knows it now")(rChunks); })
              .catch(err)}
          >
            {add.isPending ? "Adding…" : "Add to her knowledge"}
          </Button>
        </div>
      </Section>

      <Section title={`Knowledge (${chunks.data?.length ?? 0})`}>
        <div className="space-y-2">
          {(chunks.data ?? []).map((c: any) => (
            <div key={c.id} className="border rounded p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{c.title} <span className="font-normal text-muted-foreground">· {c.system} · {c.sourceType}{c.sourceRef ? ` · ${c.sourceRef}` : ""}</span></span>
                <span className="flex gap-2">
                  <Button size="sm" variant={c.isApproved ? "default" : "outline"} className={c.isApproved ? "bg-[#2f5d3a] hover:bg-[#264a2f]" : ""} onClick={() => approve.mutateAsync({ id: c.id, isApproved: !c.isApproved }).then(() => ok(c.isApproved ? "Hidden from her" : "Live")(rChunks)).catch(err)}>{c.isApproved ? "Approved" : "Approve"}</Button>
                  <Button size="sm" variant="outline" onClick={() => del.mutateAsync({ id: c.id }).then(() => ok("Removed")(rChunks)).catch(err)}>Delete</Button>
                </span>
              </div>
              <p className="text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">{c.content}</p>
            </div>
          ))}
          {(chunks.data?.length ?? 0) === 0 && <p className="text-muted-foreground">Nothing yet. Teach her above, or run the seed script.</p>}
        </div>
      </Section>

      <Section title={`Maintenance cases (${cases.data?.length ?? 0})`}>
        <div className="space-y-2">
          {(cases.data ?? []).map((c: any) => (
            <div key={c.id} className={`border rounded p-2 text-sm ${c.isEscalation ? "border-red-500/50" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{c.isEscalation ? "⚠ " : ""}{c.title} <span className="font-normal text-muted-foreground">· {c.system} · {c.status}</span></span>
                <span className="flex gap-2">
                  {c.status !== "resolved" && (
                    <Button size="sm" variant="outline" disabled={!resolution[c.id]?.trim()} onClick={() => resolve.mutateAsync({ id: c.id, status: "resolved", resolution: resolution[c.id] }).then(() => ok("Resolved")(rCases)).catch(err)}>Resolve</Button>
                  )}
                  {c.status === "resolved" && !c.approvedIntoKb && (
                    <Button size="sm" className="bg-[#2f5d3a] hover:bg-[#264a2f]" onClick={() => intoKb.mutateAsync({ id: c.id }).then(() => { ok("In her knowledge now")(rCases); rChunks(); }).catch(err)}>Into knowledge</Button>
                  )}
                  {c.approvedIntoKb && <span className="text-xs text-muted-foreground self-center">in KB</span>}
                </span>
              </div>
              {c.description && <p className="text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
              {c.status !== "resolved" && (
                <Input className="h-8 mt-2" placeholder="What fixed it? (fills the resolution)" value={resolution[c.id] ?? ""} onChange={(e) => setResolution((r) => ({ ...r, [c.id]: e.target.value }))} />
              )}
            </div>
          ))}
          {(cases.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No cases logged yet.</p>}
        </div>
      </Section>
    </>
  );
}

// Galley cookbook moderation: crew submissions to the shared "From the Crews"
// section. Approve to publish live; reject to hide. Nothing auto-publishes.
function GalleyTab({ utils, err, ok }: Common) {
  const subs = trpc.ship.admin.listCookbookSubmissions.useQuery();
  const review = trpc.ship.admin.reviewCookbookSubmission.useMutation();
  const refresh = () => utils.ship.admin.listCookbookSubmissions.invalidate();
  if (subs.isError) return <p className="text-amber-700 dark:text-amber-400">Admin access required.</p>;
  const rows = subs.data ?? [];
  return (
    <Section title={`Cookbook submissions (${rows.length})`}>
      <p className="text-sm text-muted-foreground mb-2">Crews submit favorite remixes to the shared cookbook. Approve to publish into the public "From the Crews" section; reject to hide.</p>
      <div className="space-y-2">
        {rows.map((r: any) => {
          const recipe = Array.isArray(r.recipe) ? r.recipe[0] : r.recipe;
          const photos = Array.isArray(r.photoUrls) ? (r.photoUrls as string[]) : [];
          return (
            <div key={r.id} className="border rounded p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.dishName} <span className="font-normal text-muted-foreground">· {r.engine} · by {r.crewName} · {r.cookbookStatus}</span></span>
                <span className="flex gap-2">
                  <Button size="sm" className="bg-[#2f5d3a] hover:bg-[#264a2f]" disabled={r.cookbookStatus === "approved" || review.isPending} onClick={() => review.mutateAsync({ id: r.id, status: "approved" }).then(() => ok("Published to the cookbook")(refresh)).catch(err)}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={r.cookbookStatus === "rejected" || review.isPending} onClick={() => review.mutateAsync({ id: r.id, status: "rejected" }).then(() => ok("Rejected")(refresh)).catch(err)}>Reject</Button>
                </span>
              </div>
              {recipe?.method && <p className="text-muted-foreground mt-1 line-clamp-2">{recipe.method}</p>}
              {photos.length > 0 && (
                <div className="flex gap-1.5 mt-2">{photos.map((u) => <img key={u} src={u} alt="" className="w-12 h-12 rounded object-cover border" loading="lazy" />)}</div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-muted-foreground">No submissions yet.</p>}
      </div>
    </Section>
  );
}
