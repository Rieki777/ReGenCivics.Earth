/**
 * /ship/book - Availability + booking request. Our calendar is the source of
 * truth. Guests pick an open start date, a whole number of 7-night cycles,
 * commit to the vegan diet and the water doctrine, and submit. The insured
 * rental is arranged separately on the platform after approval.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShipSection, ShipEyebrow, ShipNavRow, PriceTag, TRIAL_NIGHTLY } from "./shipShared";

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ShipBook() {
  const availability = trpc.ship.availability.useQuery();
  const request = trpc.ship.requestBooking.useMutation();

  const ref = useMemo(() => new URLSearchParams(window.location.search).get("ref") ?? "", []);
  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState(1);
  const [guests, setGuests] = useState(2);
  const [diet, setDiet] = useState(false);
  const [water, setWater] = useState(false);
  const [notes, setNotes] = useState("");

  const nights = weeks * 7;
  const endDate = startDate ? addDays(startDate, nights) : "";
  const total = TRIAL_NIGHTLY * nights;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return toast.error("Pick a start date.");
    if (!diet || !water) return toast.error("Both commitments are required to sail.");
    try {
      await request.mutateAsync({
        startDate,
        endDate,
        guests,
        dietCommitment: true,
        waterDoctrineCommitment: true,
        ref: ref || undefined,
        notes: notes || undefined,
      });
      toast.success("Your voyage request is in. We will confirm your week soon.");
      setStartDate(""); setDiet(false); setWater(false); setNotes("");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  const unavailable = availability.data?.unavailable ?? [];

  return (
    <PageWrapper>
      <SEO title="Book a Voyage" description="Request an open week aboard the ReGen Ship. Seven-night voyages through Cascadia." url="/ship/book" />
      <ShipNavRow current="/ship/book" />

      <ShipSection>
        <ShipEyebrow>Book a voyage</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-3">Request your week</h1>
        <PriceTag className="mb-4" />
        <p className="text-foreground/80 max-w-2xl">Voyages run in one-week cycles, set by the ship's tank capacity. Multi-week voyages are welcome and reset the systems mid-voyage. Our calendar is the source of truth, so a crew member confirms every week before the platform rental is arranged.</p>
      </ShipSection>

      <ShipSection className="bg-[#4a7c59]/8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weeks">Weeks</Label>
                <select id="weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-full h-10 rounded-md border bg-background px-3">
                  <option value={1}>1 week (7 nights)</option>
                  <option value={2}>2 weeks (14 nights)</option>
                  <option value={3}>3 weeks (21 nights)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="guests">Guests</Label>
                <select id="guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full h-10 rounded-md border bg-background px-3">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {startDate && (
              <p className="text-sm text-muted-foreground">Your voyage: {startDate} to {endDate}. Suggested total ask, ${total.toLocaleString()} across the rental and the offering.</p>
            )}
            <div className="flex items-start gap-3">
              <Checkbox id="diet" checked={diet} onCheckedChange={(v) => setDiet(Boolean(v))} />
              <Label htmlFor="diet" className="font-normal leading-snug">I commit to a regenerative vegan diet aboard for the whole voyage.</Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="water" checked={water} onCheckedChange={(v) => setWater(Boolean(v))} />
              <Label htmlFor="water" className="font-normal leading-snug">I commit to the ship's water doctrine: only the soaps and cleaning materials aboard, no chemical body products. <Link href="/ship/guide" className="underline">Read the doctrine</Link>.</Label>
            </div>
            <div>
              <Label htmlFor="notes">Anything we should know</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
            </div>
            {ref && <p className="text-xs text-muted-foreground">Referred by @{ref.replace(/^@/, "")}. Thank them at the healing hole.</p>}
            <Button type="submit" disabled={request.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
              {request.isPending ? "Sending…" : "Request this week"}
            </Button>
          </form>

          {/* How it works + availability */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-lg mb-2">How the two-part payment works</h3>
              <ol className="space-y-2 text-foreground/80 list-decimal pl-5 text-sm">
                <li>You request a week here. A crew member confirms it.</li>
                <li>The insured rental is arranged on the platform through a custom offer for your dates. That charge activates the coverage the ship sails under.</li>
                <li>After the platform booking, a suggested voyage offering to the church covers the seed chest, the treasure map, the concierge, and the fleet building. It is a gift, always voluntary, and your booking never depends on it.</li>
              </ol>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-lg mb-2">Weeks already spoken for</h3>
              {availability.isLoading && <p className="text-sm text-muted-foreground">Checking the calendar…</p>}
              {!availability.isLoading && unavailable.length === 0 && <p className="text-sm text-muted-foreground">The calendar is open. Pick any week.</p>}
              <ul className="space-y-1 text-sm">
                {unavailable.map((u, i) => (
                  <li key={i} className="flex justify-between border-b py-1">
                    <span>{u.startDate} to {u.endDate}</span>
                    <span className="text-muted-foreground">{u.kind === "blackout" ? "held" : "booked"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
