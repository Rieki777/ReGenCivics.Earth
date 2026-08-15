/**
 * /ship/concierge - The First Mate, the ship's voyage-planning companion. Two
 * modes:
 *  - default: intake (~10 questions) -> generates a 7-day itinerary from
 *    verified map locations -> refine by chat. The planner is shared with the
 *    compact drawer on the treasure map (ShipFirstMate.tsx).
 *  - ?mode=log: the seed-chest QR flow. Log a planting (species, GPS, photo).
 *
 * The route path and the ship.concierge tRPC namespace are unchanged; only the
 * persona name changed to the First Mate (2026-07-10).
 */
import { useMemo, useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShipSection, ShipEyebrow, ShipNavRow, ShipImage, useShipFlags } from "./shipShared";
import { FirstMatePlanner, FIRST_MATE_INTRO } from "./ShipFirstMate";

const SPECIES = ["Chestnut", "Oak / acorn", "Apple", "Pear", "Plum", "Walnut", "Hazelnut", "Elderberry", "Other saved fruit seed"];

function SeedLogMode() {
  const log = trpc.ship.seeds.log.useMutation();
  const [species, setSpecies] = useState(SPECIES[0]);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");

  function getLocation() {
    if (!navigator.geolocation) return toast.error("Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured."); },
      () => toast.error("Could not read your location."),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await log.mutateAsync({
        species,
        lat: coords?.lat,
        lng: coords?.lng,
        photoUrl: photoUrl || undefined,
        notes: notes || undefined,
      });
      toast.success("Planting logged. It joins the map once verified.");
      setNotes(""); setPhotoUrl("");
    } catch (err: any) {
      toast.error(err?.message ?? "Please sign in to log a planting.");
    }
  }

  return (
    <ShipSection>
      <ShipEyebrow>Log a planting</ShipEyebrow>
      <h1 className="text-3xl font-bold mb-3">You planted something. Tell the ship.</h1>
      <p className="text-foreground/80 mb-5">One card, one log. Every verified planting joins the treasure map for the crews who follow.</p>
      <form onSubmit={submit} className="space-y-4 max-w-lg">
        <div>
          <Label htmlFor="species">What did you plant?</Label>
          <select id="species" value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3">
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <Label>Where?</Label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={getLocation}>Use my location</Button>
            {coords && <span className="text-sm text-muted-foreground">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>}
          </div>
        </div>
        <div>
          <Label htmlFor="photo">Photo URL (optional)</Label>
          <Input id="photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label htmlFor="pnotes">Notes (optional)</Label>
          <Textarea id="pnotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </div>
        <Button type="submit" disabled={log.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">{log.isPending ? "Logging…" : "Log this planting"}</Button>
      </form>
    </ShipSection>
  );
}

export default function ShipConcierge() {
  const mode = useMemo(() => new URLSearchParams(window.location.search).get("mode"), []);
  const flags = useShipFlags();

  if (mode === "log") {
    return (
      <PageWrapper>
        <SEO title="Log a Planting" description="Log a seed planting aboard the ReGen Ship." url="/ship/concierge" />
        <ShipNavRow />
        <SeedLogMode />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <SEO title="The First Mate" description="Ahoy. Let the First Mate chart your voyage through Cascadia." url="/ship/concierge" />
      <ShipNavRow />
      <ShipSection>
        <div className="grid md:grid-cols-[1fr_2fr] gap-6 items-start mb-6">
          <div className="aspect-square max-w-[220px]"><ShipImage name="ship-concierge-captain.jpg" alt="The ship's First Mate." className="h-full" /></div>
          <div>
            <ShipEyebrow>The First Mate</ShipEyebrow>
            <h1 className="text-3xl font-bold mb-2">Ahoy. I'm your First Mate.</h1>
            <p className="text-foreground/80">{FIRST_MATE_INTRO}</p>
            {!flags.concierge && <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">The First Mate is not aboard yet. Check back soon, or explore the <a href="/ship/map" className="underline">treasure map</a>.</p>}
          </div>
        </div>

        <div className="max-w-2xl">
          <FirstMatePlanner conciergeAboard={flags.concierge} />
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
