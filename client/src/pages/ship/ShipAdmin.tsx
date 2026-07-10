/**
 * /admin/ship - ReGen Ship admin. Bookings, treasure map verification, quest
 * verification, seed plantings, nominations, applications, position pings, and
 * seasonal pricing + blackouts. Server-side adminProcedure guards every call.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const TABS = ["Bookings", "Map", "Quest", "Plantings", "Nominations", "Applications", "Position", "Pricing"] as const;
type Tab = (typeof TABS)[number];

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
      {tab === "Quest" && <QuestTab utils={utils} err={err} ok={ok} />}
      {tab === "Plantings" && <PlantingsTab utils={utils} err={err} ok={ok} />}
      {tab === "Nominations" && <NominationsTab utils={utils} err={err} ok={ok} />}
      {tab === "Applications" && <ApplicationsTab err={err} ok={ok} utils={utils} />}
      {tab === "Position" && <PositionTab err={err} ok={ok} />}
      {tab === "Pricing" && <PricingTab utils={utils} err={err} ok={ok} />}
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
            {(a.experience || a.message || a.siteDescription) && <p className="text-muted-foreground">{a.experience || a.message || a.siteDescription}</p>}
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <p className="text-muted-foreground">No applications yet.</p>}
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
