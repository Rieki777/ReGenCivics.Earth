/**
 * /ship/book - Availability + booking request. Our calendar is the source of
 * truth. Guests pick one or more open voyage weeks off a fixed Saturday grid
 * (no raw datepicker: the server enumerates valid weeks so a guest never has to
 * deduce a start date), commit to the vegan diet and the water doctrine, and
 * submit. The insured rental is arranged separately on the platform.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MapPin, Compass, LayoutGrid, List as ListIcon } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipNavRow, PriceTag } from "./shipShared";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return `${WD[d.getUTCDay()]} ${MO[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

type WeekState = "open" | "requested" | "booked" | "turnover" | "migration";
const STATE_META: Record<WeekState, { label: string; badge: string }> = {
  open: { label: "Open", badge: "bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d]" },
  requested: { label: "Requested by others", badge: "bg-[#d4a574]/20 text-[#8a5a2b] dark:text-[#e0b483]" },
  booked: { label: "Booked", badge: "bg-muted text-muted-foreground" },
  turnover: { label: "Turnover", badge: "bg-slate-400/15 text-slate-600 dark:text-slate-300" },
  migration: { label: "On passage", badge: "bg-blue-400/15 text-blue-700 dark:text-blue-300" },
};

export default function ShipBook() {
  const availability = trpc.ship.availability.useQuery();
  const request = trpc.ship.requestBooking.useMutation();

  const ref = useMemo(() => new URLSearchParams(window.location.search).get("ref") ?? "", []);
  const weeks = availability.data?.weeks ?? [];

  // Selection is a contiguous run of selectable weeks: a start index + a count.
  const [startIdx, setStartIdx] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [guests, setGuests] = useState(2);
  const [diet, setDiet] = useState(false);
  const [water, setWater] = useState(false);
  const [notes, setNotes] = useState("");

  const MAX_WEEKS = 3;
  const selected = startIdx === null ? [] : weeks.slice(startIdx, startIdx + count);
  const startDate = selected[0]?.startDate ?? "";
  const endDate = selected[selected.length - 1]?.endDate ?? "";
  const nights = selected.length * 7;
  const total = selected.reduce((sum, w) => sum + w.price.total, 0);
  const bioregions = Array.from(new Set(selected.map((w) => w.bioregion)));

  function clickWeek(i: number) {
    const wk = weeks[i];
    if (!wk?.selectable) return;
    // Toggle off if it is the only selected week.
    if (startIdx !== null && count === 1 && startIdx === i) {
      setStartIdx(null);
      setCount(1);
      return;
    }
    if (startIdx !== null) {
      const end = startIdx + count - 1;
      // Extend forward onto the next adjacent open week.
      if (i === end + 1 && count < MAX_WEEKS) {
        setCount(count + 1);
        return;
      }
      // Extend backward onto the previous adjacent open week.
      if (i === startIdx - 1 && count < MAX_WEEKS) {
        setStartIdx(i);
        setCount(count + 1);
        return;
      }
    }
    // Otherwise start a fresh single-week selection here.
    setStartIdx(i);
    setCount(1);
  }

  function isSelected(i: number): boolean {
    return startIdx !== null && i >= startIdx && i < startIdx + count;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return toast.error("Pick a voyage week.");
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
      setStartIdx(null);
      setCount(1);
      setDiet(false);
      setWater(false);
      setNotes("");
      availability.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  const submitReason = !startDate
    ? "Pick a voyage week to continue."
    : !diet || !water
      ? "Confirm both commitments to sail."
      : null;

  return (
    <PageWrapper>
      <SEO title="Book a Voyage" description="Request an open week aboard the ReGen Ship. Seven-night voyages through Cascadia." url="/ship/book" />
      <ShipNavRow current="/ship/book" />

      <ShipSection>
        <ShipEyebrow>Book a voyage</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-3">Choose your voyage week</h1>
        <PriceTag className="mb-4" />
        <p className="text-foreground/80 max-w-2xl">Voyages run Saturday to Saturday, one seven-night tank cycle at a time. The Saturday she changes hands is her turnover day, when the Keeper resets her for the next crew. Chain up to three weeks for a longer sail; she resets on each turnover. Every week below is a real open week on her calendar.</p>
      </ShipSection>

      <ShipSection className="bg-[#4a7c59]/8 pt-0">
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
          {/* Week picker + form */}
          <form onSubmit={submit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-xl font-semibold">Open weeks</h2>
                <div className="inline-flex rounded-lg border overflow-hidden" role="group" aria-label="Choose week layout">
                  <button type="button" onClick={() => setView("cards")} aria-pressed={view === "cards"} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "cards" ? "bg-[#2f5d3a] text-white" : "bg-background text-foreground/70"}`}>
                    <LayoutGrid className="w-4 h-4" aria-hidden="true" /> Cards
                  </button>
                  <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "list" ? "bg-[#2f5d3a] text-white" : "bg-background text-foreground/70"}`}>
                    <ListIcon className="w-4 h-4" aria-hidden="true" /> List
                  </button>
                </div>
              </div>

              {/* State legend */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(["open", "requested", "turnover", "migration", "booked"] as WeekState[]).map((s) => (
                  <span key={s} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_META[s].badge}`}>{STATE_META[s].label}</span>
                ))}
              </div>

              {availability.isLoading && (
                <p className="text-sm text-muted-foreground py-8 text-center">Unrolling the calendar…</p>
              )}
              {availability.isError && (
                <p className="text-sm text-muted-foreground py-8 text-center">The calendar did not load. Refresh the page to try again.</p>
              )}
              {!availability.isLoading && !availability.isError && weeks.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No open weeks are posted yet. Check back soon, the season is being charted.</p>
              )}

              {weeks.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Voyage weeks"
                  className={view === "cards" ? "grid sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1" : "space-y-2 max-h-[28rem] overflow-y-auto pr-1"}
                >
                  {weeks.map((wk, i) => {
                    const meta = STATE_META[wk.state as WeekState];
                    const sel = isSelected(i);
                    const perNight = Math.round(wk.price.total / 7);
                    return (
                      <li key={wk.startDate} role="option" aria-selected={sel}>
                        <button
                          type="button"
                          onClick={() => clickWeek(i)}
                          disabled={!wk.selectable}
                          aria-label={`Sail ${fmtDay(wk.startDate)} to ${fmtDay(wk.endDate)}, ${wk.bioregion}, ${meta.label}, $${wk.price.total.toLocaleString()} the week`}
                          className={[
                            "w-full text-left rounded-2xl border p-4 transition-all",
                            view === "list" ? "flex items-center justify-between gap-4" : "",
                            wk.selectable ? "hover:border-[#2f5d3a] cursor-pointer" : "opacity-55 cursor-not-allowed",
                            sel ? "border-[#ffd700] ring-2 ring-[#ffd700] bg-[#ffd700]/10" : "bg-card",
                          ].join(" ")}
                        >
                          <div className={view === "list" ? "" : "mb-2"}>
                            <div className="flex items-center gap-2 font-semibold">
                              <Compass className="w-4 h-4 text-[#2f5d3a] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
                              Sail {fmtDay(wk.startDate)} <span aria-hidden="true">→</span> {fmtDay(wk.endDate)}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-foreground/70 mt-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {wk.bioregion}
                            </div>
                          </div>
                          <div className={view === "list" ? "text-right shrink-0" : "flex items-center justify-between"}>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>{meta.label}</span>
                            <span className="block text-sm mt-1">
                              <span className="font-semibold">${wk.price.total.toLocaleString()}</span>
                              <span className="text-muted-foreground"> · ${perNight}/night</span>
                              {wk.windowLabel && <span className="text-muted-foreground"> · {wk.windowLabel}</span>}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Selection summary */}
            {startDate && (
              <div className="rounded-2xl border border-[#ffd700]/60 bg-[#ffd700]/10 p-4">
                <p className="font-semibold">Your voyage: {fmtDay(startDate)} to {fmtDay(endDate)}</p>
                <p className="text-sm text-foreground/80 mt-1">
                  {selected.length} {selected.length === 1 ? "week" : "weeks"}, {nights} nights through {bioregions.join(" and ")}. Suggested total ask ${total.toLocaleString()} across the rental and the offering.
                </p>
                {selected.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">A multi-week voyage resets her tanks on each turnover Saturday.</p>
                )}
              </div>
            )}

            <div className="max-w-xs">
              <Label htmlFor="guests">Guests</Label>
              <select id="guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full h-10 rounded-md border bg-background px-3">
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
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
            <div>
              <Button type="submit" disabled={request.isPending || Boolean(submitReason)} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
                {request.isPending ? "Sending…" : "Request this voyage"}
              </Button>
              {submitReason && <p className="text-xs text-muted-foreground mt-2">{submitReason}</p>}
            </div>
          </form>

          {/* How it works */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-lg mb-2">How the two-part payment works</h3>
              <ol className="space-y-2 text-foreground/80 list-decimal pl-5 text-sm">
                <li>You request a week here. A crew member confirms it.</li>
                <li>The insured rental is arranged on the platform through a custom offer for your dates. That charge activates the coverage the ship sails under.</li>
                <li>After the platform booking, a suggested voyage offering to the church covers the seed chest, the treasure map, the First Mate, the fleet building, and the real costs of keeping her sailing: maintenance, cleaning, and everything it takes to run this program. We strongly encourage giving at least the suggested offering so the program can keep running. Every gift is received with deep appreciation and used with utmost care, as with all funds, to serve the Regenerative Renaissance and CORE's spiritual mission. It is a gift, always voluntary, and your booking never depends on it.</li>
              </ol>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-lg mb-2">Reading the calendar</h3>
              <p className="text-sm text-foreground/80">Each card is one seven-night voyage. Open weeks are yours to request. Weeks marked <em>requested by others</em> are still yours to request too, we confirm the calendar by hand. <em>On passage</em> weeks are when she repositions between bioregions, so she cannot host. The projected bioregion tells you roughly where she will be.</p>
            </div>
          </div>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
