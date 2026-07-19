/**
 * /ship/book - Availability + booking request. Our calendar is the source of
 * truth. Guests pick one or more open voyage weeks off a fixed Saturday grid
 * (no raw datepicker: the server enumerates valid weeks so a guest never has to
 * deduce a start date), commit to the vegan diet and the water doctrine, and
 * submit. The insured rental is arranged separately on the platform.
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MapPin, Compass, LayoutGrid, List as ListIcon, Moon, Heart, Sailboat, ChevronDown, type LucideIcon } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipNavRow, PriceTag, useShipFlags, ANCHOR_VOYAGE, TRIAL_VOYAGE } from "./shipShared";
import { FormCompanion } from "@/components/companion";
import { companionBool } from "@shared/companions";
import {
  SUGGESTED_VOYAGES, MAX_VOYAGE_WEEKS, buildRoughChart, firstMateSeedAnswers, suggestedVoyageById,
  type SuggestedVoyage, type SuggestedVoyageId,
} from "@shared/shipVoyages";
import { applyMultiWeekDiscount, multiWeekDiscountPct, nextTierNudge } from "@shared/shipPricing";
import { FirstMateQuickCustomize } from "./ShipFirstMate";
import { CrewListJoin } from "@/components/ship/CrewListJoin";
import { SHIP_TERMS_VERSION, SHIP_DEPOSIT_USD } from "@shared/shipTerms";

/** Card icons for the suggested voyages. */
const VOYAGE_ICONS: Record<SuggestedVoyageId, LucideIcon> = {
  standard: Sailboat,
  half_honeymoon: Heart,
  honeymoon: Heart,
  lunar_cycle: Moon,
};

/** First index where `len` consecutive weeks are all selectable, or null. */
function findRun(weeks: Array<{ selectable: boolean }>, len: number): number | null {
  for (let i = 0; i + len <= weeks.length; i++) {
    let ok = true;
    for (let j = 0; j < len; j++) {
      if (!weeks[i + j]?.selectable) { ok = false; break; }
    }
    if (ok) return i;
  }
  return null;
}

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

/** True when `len` consecutive selectable weeks start at index `i` (no booked or
 *  passage week in between), so an N-week voyage can begin there. */
function canStartRun(weeks: Array<{ selectable: boolean }>, i: number, len: number): boolean {
  if (i + len > weeks.length) return false;
  for (let j = 0; j < len; j++) {
    if (!weeks[i + j]?.selectable) return false;
  }
  return true;
}

export default function ShipBook() {
  const availability = trpc.ship.availability.useQuery();
  const request = trpc.ship.requestBooking.useMutation();

  const ref = useMemo(() => new URLSearchParams(window.location.search).get("ref") ?? "", []);
  const weeks = availability.data?.weeks ?? [];

  // Selection is a contiguous run of selectable weeks: a start index + a count.
  const [startIdx, setStartIdx] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [view, setView] = useState<"cards" | "list">("cards");
  // The length tiles double as a booking-length + availability filter (default 1).
  const [bookLength, setBookLength] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const guests = adults + children;
  // Up to four aboard, or five when at least three are children.
  const crewOk = guests <= 4 || (guests === 5 && children >= 3);
  const [diet, setDiet] = useState(false);
  const [water, setWater] = useState(false);
  const [terms, setTerms] = useState(false);
  const [notes, setNotes] = useState("");
  const submitRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  // A chosen suggested voyage (one-tap package) + its First Mate quick pass.
  const flags = useShipFlags();
  const [voyageId, setVoyageId] = useState<SuggestedVoyageId | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // True once the First Mate charts a real itinerary; the rough days step back.
  const [fmCharted, setFmCharted] = useState(false);

  const MAX_WEEKS = MAX_VOYAGE_WEEKS;
  const selected = startIdx === null ? [] : weeks.slice(startIdx, startIdx + count);
  const startDate = selected[0]?.startDate ?? "";
  const endDate = selected[selected.length - 1]?.endDate ?? "";
  const total = selected.reduce((sum, w) => sum + w.price.total, 0);
  const anchorTotal = selected.reduce((sum, w) => sum + w.price.anchorTotal, 0);
  // The trial discount applies only when every selected week is trial-rate.
  const allTrial = selected.length > 0 && selected.every((w) => !w.isYear2);
  // Multi-week discount, stacked on top of the first-year rate already baked into
  // each week's price. Extending the run recomputes it across the whole booking.
  const mw = applyMultiWeekDiscount(total, selected.length);
  const finalTotal = mw.total;
  const totalSaved = anchorTotal - finalTotal;
  const totalSavedPct = anchorTotal > 0 ? Math.round((totalSaved / anchorTotal) * 100) : 0;
  const nudge = nextTierNudge(selected.length);
  const perPerson = guests > 0 ? Math.round(finalTotal / guests) : finalTotal;
  const bioregions = Array.from(new Set(selected.map((w) => w.bioregion)));

  // The length tiles double as an availability filter. For a length > 1, only the
  // start weeks with that many consecutive open weeks qualify, and each option's
  // price is tied to that length's multi-week discount.
  const filterPct = multiWeekDiscountPct(bookLength);
  const windowStarts = useMemo(() => {
    if (bookLength <= 1) return [] as number[];
    const out: number[] = [];
    for (let i = 0; i + bookLength <= weeks.length; i++) {
      if (canStartRun(weeks, i, bookLength)) out.push(i);
    }
    return out;
  }, [weeks, bookLength]);

  const voyagePkg = voyageId ? suggestedVoyageById(voyageId) : null;
  // The rough chart is deterministic: recomputed instantly from the package and
  // the claimed weeks, no LLM call (STEERING deterministic-first).
  const roughChart = useMemo(() => {
    if (!voyagePkg || selected.length === 0) return null;
    return buildRoughChart(voyagePkg, selected.map((w) => ({ startDate: w.startDate, bioregion: w.bioregion })));
  }, [voyagePkg, selected]);

  /** One tap: claim the first open run for this package and chart it. */
  function chooseSuggested(v: SuggestedVoyage) {
    const i = findRun(weeks, v.weeks);
    if (i === null) return;
    setStartIdx(i);
    setCount(v.weeks);
    setBookLength(v.weeks);
    setVoyageId(v.id);
    setCustomizeOpen(false);
    setFmCharted(false);
    window.setTimeout(() => chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function clickWeek(i: number) {
    const wk = weeks[i];
    if (!wk?.selectable) return;
    // Hand-picking weeks leaves the suggested-voyage flow; the form stays.
    setVoyageId(null);
    setCustomizeOpen(false);
    setFmCharted(false);
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

  /** Click a length tile: set the filter and clear any selection that no longer fits. */
  function selectLength(len: number) {
    setBookLength(len);
    setVoyageId(null);
    setCustomizeOpen(false);
    setFmCharted(false);
    // Keep a still-valid selection of the new length; otherwise clear it.
    if (!(startIdx !== null && canStartRun(weeks, startIdx, len))) {
      setStartIdx(null);
    }
    setCount(len);
  }

  /** Click a filtered start window: select the full N-week run beginning at i. */
  function selectWindow(i: number) {
    setVoyageId(null);
    setCustomizeOpen(false);
    setFmCharted(false);
    setStartIdx(i);
    setCount(bookLength);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return toast.error("Pick a voyage week.");
    if (!crewOk) return toast.error("Up to four aboard, or five when at least three are children.");
    if (!diet || !water || !terms) return toast.error("All three commitments are required to sail.");
    try {
      // Carry the chosen suggested voyage to the crew in the notes, so the
      // confirmation and the First Mate both know the intent.
      const noteParts = [
        voyagePkg ? `Suggested voyage: ${voyagePkg.name} (${selected.length} ${selected.length === 1 ? "week" : "weeks"}).` : null,
        notes || null,
      ].filter(Boolean) as string[];
      await request.mutateAsync({
        startDate,
        endDate,
        adults,
        children,
        guests,
        dietCommitment: true,
        waterDoctrineCommitment: true,
        agreementAccepted: true,
        agreementVersion: SHIP_TERMS_VERSION,
        ref: ref || undefined,
        notes: noteParts.length ? noteParts.join("\n") : undefined,
      });
      toast.success("Your voyage request is in. We will confirm your week soon.");
      setStartIdx(null);
      setCount(1);
      setDiet(false);
      setWater(false);
      setTerms(false);
      setNotes("");
      setVoyageId(null);
      setCustomizeOpen(false);
      setFmCharted(false);
      availability.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  const submitReason = !startDate
    ? "Pick a voyage week to continue."
    : !crewOk
      ? "Up to four aboard, or five when at least three are children."
      : !diet || !water || !terms
        ? "Confirm all three commitments to sail."
        : null;

  return (
    <PageWrapper>
      <SEO title="Book a Voyage" description="Request an open voyage week aboard the ReGen Ship through Cascadia. Board Monday, return Sunday." url="/ship/book" />
      <ShipNavRow current="/ship/book" />

      <ShipSection>
        <ShipEyebrow>Book a voyage</ShipEyebrow>
        <h1 className="text-3xl font-bold mb-3">Choose your voyage week</h1>
        <PriceTag className="mb-4" />
        {/* Multi-week savings ladder: stacks on top of the first-year 50% off. */}
        <div className="mb-4 rounded-2xl border border-[#3ddc84]/40 bg-[#3ddc84]/[0.06] p-4 max-w-2xl">
          <p className="text-sm font-semibold mb-2">Stay longer, save more. She is $600 a night, 50% off through early April 2027, so $300 a night now. These multi-week savings stack on top of that.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Choose booking length">
            {[1, 2, 3, 4].map((w) => {
              const p = multiWeekDiscountPct(w);
              const activeTile = bookLength === w;
              return (
                <button
                  type="button"
                  key={w}
                  onClick={() => selectLength(w)}
                  aria-pressed={activeTile}
                  className={[
                    "rounded-xl border p-2 text-center transition-all cursor-pointer",
                    activeTile
                      ? "border-[#2f5d3a] ring-2 ring-[#2f5d3a] bg-[#2f5d3a]/10"
                      : w === 4
                        ? "border-[#ffd700] bg-[#ffd700]/10 hover:-translate-y-0.5"
                        : "bg-card hover:-translate-y-0.5 hover:border-[#2f5d3a]",
                  ].join(" ")}
                >
                  <p className="text-xs text-muted-foreground">{w === 4 ? "A month" : `${w} ${w === 1 ? "week" : "weeks"}`}</p>
                  <p className="font-bold text-[#2f5d3a] dark:text-[#7dd87d]">{p === 0 ? "Base rate" : `${p}% off`}</p>
                  {w === 4 && <p className="text-[10px] font-bold text-[#b8860b] dark:text-[#ffd700]">Best value</p>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Tap a length to filter the open weeks below to the windows that fit it.</p>
        </div>
        <p className="text-foreground/80 max-w-2xl">Each voyage boards <strong>Monday at 3pm</strong> and returns the following <strong>Sunday at 11am</strong>. She turns over Sunday afternoon into Monday morning, when the Keeper resets her and tops up propane and water before the next crew boards. Pricing is per voyage. Chain up to four weeks, one full lunar cycle, for a longer sail; she resets her tanks on each turnover.</p>
        <a href="#open-weeks" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#2f5d3a]/40 bg-[#2f5d3a]/5 px-3.5 py-1.5 text-sm font-semibold text-[#2f5d3a] dark:text-[#7dd87d] hover:bg-[#2f5d3a]/10 transition-colors">
          See open weeks below <ChevronDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
        </a>
      </ShipSection>

      {/* Suggested voyages: one tap claims the first open run and charts it. */}
      {weeks.length > 0 && (
        <ShipSection className="pt-0">
          <ShipEyebrow>Suggested voyages</ShipEyebrow>
          <h2 className="text-2xl font-bold mb-2">Pick a voyage, she charts the rest</h2>
          <p className="text-foreground/80 max-w-2xl mb-6">One tap claims the first open run on her calendar and writes a rough chart of your days, so you can go straight to booking. City life sits heavy on a nervous system. These voyages sail to sacred power places in living nature, where hearts open and whole systems settle and reset. Customize yours with your First Mate, a quick pass now and the full pass after you book.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SUGGESTED_VOYAGES.map((v) => {
              const run = findRun(weeks, v.weeks);
              const subtotal = run === null ? null : weeks.slice(run, run + v.weeks).reduce((sum, w) => sum + w.price.total, 0);
              const pkg = subtotal === null ? null : applyMultiWeekDiscount(subtotal, v.weeks);
              const price = pkg?.total ?? null;
              const active = voyageId === v.id;
              const Icon = VOYAGE_ICONS[v.id];
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => chooseSuggested(v)}
                  disabled={run === null}
                  aria-pressed={active}
                  className={[
                    "flex flex-col text-left rounded-2xl border p-4 transition-all",
                    run === null ? "opacity-55 cursor-not-allowed bg-card" : "hover:border-[#2f5d3a] hover:-translate-y-0.5 cursor-pointer",
                    active ? "border-[#ffd700] ring-2 ring-[#ffd700] bg-[#ffd700]/10" : "bg-card",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-5 h-5 text-[#2f5d3a] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
                    <span className="font-semibold">{v.name}</span>
                    {v.weeks >= MAX_VOYAGE_WEEKS && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-[#ffd700] text-[#1a472a] text-[10px] font-bold px-1.5 py-0.5 shrink-0">Best value</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80">{v.tagline}</p>
                  <p className="text-xs font-semibold text-[#2f5d3a] dark:text-[#7dd87d] mt-1">Sails {v.routeName}</p>
                  <p className="text-xs text-foreground/70 mt-1.5 flex-1">{v.description}</p>
                  <div className="mt-3 pt-3 border-t text-sm">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d] mr-2">
                      {v.weeks} {v.weeks === 1 ? "week" : "weeks"}
                    </span>
                    {price !== null && pkg ? (
                      <span className="inline-flex items-baseline flex-wrap gap-1.5">
                        {pkg.discountPct > 0 && <span className="line-through text-muted-foreground text-xs">${pkg.subtotal.toLocaleString()}</span>}
                        <span className="font-semibold">${price.toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs">the voyage</span>
                        {pkg.discountPct > 0 && <span className="inline-flex items-center rounded-full bg-[#3ddc84] text-[#08301c] text-[10px] font-bold px-1.5 py-0.5">{pkg.discountPct}% off</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No open run of {v.weeks} weeks right now</span>
                    )}
                    {run !== null && (
                      <span className="block text-xs text-[#2f5d3a] dark:text-[#7dd87d] font-semibold mt-1.5">Tap to claim {fmtDay(weeks[run].startDate)} and chart it</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ShipSection>
      )}

      <ShipSection id="open-weeks" className="bg-[#4a7c59]/8 pt-0">
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

              {/* The discount that applies to the selected length, above the options. */}
              <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[#3ddc84]/40 bg-[#3ddc84]/[0.06] px-3 py-2 text-sm">
                <span className="font-semibold">{bookLength === 1 ? "One week" : bookLength === 4 ? "A month (4 weeks)" : `${bookLength} weeks`}:</span>
                {filterPct > 0 ? (
                  <span className="font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">{filterPct}% off, stacked on the 50% first year</span>
                ) : (
                  <span className="text-muted-foreground">base rate, 50% off through early April 2027</span>
                )}
                {bookLength > 1 && (
                  <span className="text-muted-foreground">· {windowStarts.length} {windowStarts.length === 1 ? "window" : "windows"} where {bookLength} weeks are open back to back</span>
                )}
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
                  className={view === "cards" ? "grid sm:grid-cols-2 gap-3 sm:max-h-[28rem] sm:overflow-y-auto sm:pr-1" : "space-y-2 sm:max-h-[28rem] sm:overflow-y-auto sm:pr-1"}
                >
                  {bookLength === 1 ? weeks.map((wk, i) => {
                    const meta = STATE_META[wk.state as WeekState];
                    const sel = isSelected(i);
                    const returnDay = (wk as { returnDate?: string }).returnDate ?? wk.endDate;
                    // Trial weeks show the full rate struck through with the discount;
                    // full-rate weeks (from April 2027) just show their price.
                    const wkDiscount = !wk.isYear2 && wk.price.anchorTotal > wk.price.total
                      ? Math.round((1 - wk.price.total / wk.price.anchorTotal) * 100)
                      : 0;
                    return (
                      <li key={wk.startDate} role="option" aria-selected={sel}>
                        <button
                          type="button"
                          onClick={() => clickWeek(i)}
                          disabled={!wk.selectable}
                          aria-label={`Board ${fmtDay(wk.startDate)} 3pm, return ${fmtDay(returnDay)} 11am, ${wk.bioregion}, ${meta.label}, $${wk.price.total.toLocaleString()} the voyage`}
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
                              Board {fmtDay(wk.startDate)} <span aria-hidden="true">→</span> return {fmtDay(returnDay)}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-foreground/70 mt-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {wk.bioregion}
                            </div>
                          </div>
                          <div className={view === "list" ? "text-right shrink-0" : "flex items-center justify-between"}>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>{meta.label}</span>
                            <span className="block text-sm mt-1">
                              {wkDiscount > 0 ? (
                                <>
                                  <span className="text-muted-foreground line-through">${wk.price.anchorTotal.toLocaleString()}</span>{" "}
                                  <span className="font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">${wk.price.total.toLocaleString()}</span>
                                  <span className="text-muted-foreground"> the voyage</span>
                                  <span className="ml-1.5 inline-flex items-center rounded-full bg-[#2f5d3a] text-white text-[10px] font-bold px-1.5 py-0.5 align-middle">{wkDiscount}% off</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">${wk.price.total.toLocaleString()}</span>
                                  <span className="text-muted-foreground"> the voyage</span>
                                </>
                              )}
                              {wk.windowLabel && <span className="text-muted-foreground"> · {wk.windowLabel}</span>}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  }) : windowStarts.length === 0 ? (
                    <li className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground py-8 text-center">No {bookLength}-week windows are open back to back right now. Try a shorter stay above.</p>
                    </li>
                  ) : windowStarts.map((wi) => {
                    const run = weeks.slice(wi, wi + bookLength);
                    const first = run[0];
                    const last = run[run.length - 1];
                    const returnDay = (last as { returnDate?: string }).returnDate ?? last.endDate;
                    const winAnchor = run.reduce((s, w) => s + w.price.anchorTotal, 0);
                    const winSubtotal = run.reduce((s, w) => s + w.price.total, 0);
                    const winPrice = applyMultiWeekDiscount(winSubtotal, bookLength);
                    const winPct = winAnchor > 0 ? Math.round(((winAnchor - winPrice.total) / winAnchor) * 100) : 0;
                    const winBioregions = Array.from(new Set(run.map((w) => w.bioregion)));
                    const sel = startIdx === wi && count === bookLength;
                    return (
                      <li key={`win-${first.startDate}`} role="option" aria-selected={sel}>
                        <button
                          type="button"
                          onClick={() => selectWindow(wi)}
                          aria-label={`Board ${fmtDay(first.startDate)} 3pm, return ${fmtDay(returnDay)} 11am, ${bookLength} weeks, $${winPrice.total.toLocaleString()} total`}
                          className={[
                            "w-full text-left rounded-2xl border p-4 transition-all cursor-pointer",
                            sel ? "border-[#ffd700] ring-2 ring-[#ffd700] bg-[#ffd700]/10" : "bg-card hover:border-[#2f5d3a]",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            <Compass className="w-4 h-4 text-[#2f5d3a] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
                            Board {fmtDay(first.startDate)} <span aria-hidden="true">→</span> return {fmtDay(returnDay)}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-foreground/70 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {winBioregions.join(" and ")}
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d] mr-2">{bookLength} weeks</span>
                            <span className="text-muted-foreground line-through text-xs">${winAnchor.toLocaleString()}</span>{" "}
                            <span className="font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">${winPrice.total.toLocaleString()}</span>
                            <span className="text-muted-foreground"> total</span>
                            {winPct > 0 && <span className="ml-1.5 inline-flex items-center rounded-full bg-[#3ddc84] text-[#08301c] text-[10px] font-bold px-1.5 py-0.5 align-middle">{winPct}% off</span>}
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
                  {selected.length} voyage {selected.length === 1 ? "week" : "weeks"} through {bioregions.join(" and ")}.
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="line-through text-muted-foreground">${anchorTotal.toLocaleString()}</span>
                  <span className="text-2xl font-bold text-[#2f5d3a] dark:text-[#9de89d]">${finalTotal.toLocaleString()}</span>
                  {totalSavedPct > 0 && (
                    <span className="inline-flex items-center rounded-full bg-[#2f5d3a] text-white text-xs font-bold px-2 py-0.5">{totalSavedPct}% off</span>
                  )}
                  <span className="text-sm text-muted-foreground">suggested total ask</span>
                </div>
                {(allTrial || mw.discountPct > 0) && (
                  <p className="text-xs text-foreground/75 mt-1">
                    {allTrial && "50% off through early April 2027"}
                    {allTrial && mw.discountPct > 0 && ", plus "}
                    {mw.discountPct > 0 && `${mw.discountPct}% off for ${selected.length} weeks`}
                    {`. You save $${totalSaved.toLocaleString()} off her $${anchorTotal.toLocaleString()} value.`}
                  </p>
                )}
                <p className="text-sm text-foreground/80 mt-1">
                  About <span className="font-semibold">${mw.perWeek.toLocaleString()} per week</span> and <span className="font-semibold">${perPerson.toLocaleString()} per person</span> for the {guests} sailing. Plus applicable taxes.
                </p>
                {nudge && (
                  <p className="mt-2 text-sm font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">
                    {nudge.atWeeks >= 4 ? "Book a month" : "Add a week"} and save {nudge.pct}% off the whole booking.
                  </p>
                )}
                {selected.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">A multi-week voyage resets her tanks each Sunday, your way: dump and refill on route, or swing through Ashland and the Keeper does it.</p>
                )}
              </div>
            )}

            {/* The rough chart for a chosen suggested voyage + the First Mate quick pass */}
            {voyagePkg && roughChart && (
              <div ref={chartRef} className="rounded-2xl border bg-card p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold text-lg">Your rough chart</h3>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d]">{voyagePkg.name} · {voyagePkg.routeName}</span>
                  </div>
                  <p className="text-sm text-foreground/80 italic mt-2">{roughChart.summary}</p>
                </div>
                {!(customizeOpen && fmCharted) && (
                  <div className="space-y-2 sm:max-h-72 sm:overflow-y-auto sm:pr-1">
                    {roughChart.days.map((d) => (
                      <div key={d.day} className="rounded-xl border bg-background/60 p-3">
                        <p className="font-medium text-sm">Day {d.day} · {fmtDay(d.date)}: {d.title}</p>
                        <p className="text-xs text-foreground/70 mt-0.5">{d.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
                {flags.concierge && !customizeOpen && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setCustomizeOpen(true)}
                    className="w-full bg-[#2f5d3a] hover:bg-[#264a2f] text-white font-semibold"
                  >
                    Chat with your First Mate to customize your itinerary
                  </Button>
                )}
                {flags.concierge && customizeOpen && (
                  <FirstMateQuickCustomize
                    key={`${voyagePkg.id}-${startDate}-${selected.length}`}
                    seedAnswers={firstMateSeedAnswers(voyagePkg, { startDate, endDate, bioregions })}
                    onItinerary={() => setFmCharted(true)}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {flags.concierge
                    ? "Or go straight to booking below. After you book, the full First Mate session charts every day with you."
                    : "After you book, your First Mate charts every day of it with you."}
                </p>
              </div>
            )}

            {startDate && (
              <FormCompanion
                formId="booking-request"
                context={`${voyagePkg ? `The guest chose the suggested ${voyagePkg.name} voyage (${selected.length} ${selected.length === 1 ? "week" : "weeks"}). ` : ""}The guest has chosen the voyage boarding ${fmtDay(startDate)} through ${bioregions.join(" and ")}. Confirm those dates with them warmly, then ask how many adults and how many children are sailing (up to four aboard, or five when at least three are children), and get an explicit yes to both commitments.`}
                collected={{
                  guests: String(guests),
                  dietCommitment: diet ? "yes" : "",
                  waterDoctrineCommitment: water ? "yes" : "",
                  notes,
                }}
                onField={(key, value) => {
                  if (key === "guests") {
                    const n = Number(value.match(/\d+/)?.[0] ?? value);
                    if (Number.isFinite(n) && n >= 1) setAdults(Math.max(1, Math.min(4, Math.round(n))));
                  } else if (key === "dietCommitment") {
                    if (companionBool(value)) setDiet(true);
                  } else if (key === "waterDoctrineCommitment") {
                    if (companionBool(value)) setWater(true);
                  } else if (key === "notes") {
                    setNotes(value);
                  }
                }}
                onReadyForReview={() => submitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
              />
            )}

            <div className="flex flex-wrap gap-4">
              <div className="w-32">
                <Label htmlFor="adults">Adults</Label>
                <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="w-full h-11 rounded-md border bg-background px-3 text-base">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="w-32">
                <Label htmlFor="children">Children</Label>
                <select id="children" value={children} onChange={(e) => setChildren(Number(e.target.value))} className="w-full h-11 rounded-md border bg-background px-3 text-base">
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <p className="w-full text-xs text-muted-foreground -mt-1">
                Up to four aboard, or five when at least three are children. {guests > 0 && (crewOk ? `${guests} sailing.` : "That crew is over her berths.")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="diet" checked={diet} onCheckedChange={(v) => setDiet(Boolean(v))} />
              <p className="font-normal leading-snug text-sm">
                <Label htmlFor="diet" className="font-normal">I will keep the Ship meat-free, alcohol-free, and smoke-free inside for the whole voyage, unless the core team gives me written permission otherwise.</Label>{" "}
                <Link href="/ship#the-table" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Read the protocols and menu</Link>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="water" checked={water} onCheckedChange={(v) => setWater(Boolean(v))} />
              <p className="font-normal leading-snug text-sm">
                <Label htmlFor="water" className="font-normal">I commit to the ship's water doctrine: only the soaps and cleaning materials aboard, no chemical body products.</Label>{" "}
                <Link href="/ship/guide" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Read the doctrine</Link>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(Boolean(v))} />
              <p className="font-normal leading-snug text-sm">
                <Label htmlFor="terms" className="font-normal">I agree to the Terms and Conditions, the Voyage Covenant and Rental Terms, including the cancellation policy, the 500-mile travel radius, the meat, alcohol, and smoke-free rule aboard, and my responsibility for loss that insurance does not cover.</Label>{" "}
                <a href="/ship/terms#cancellation" target="_blank" rel="noopener noreferrer" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Read the Terms and Conditions (opens in a new tab)</a>.
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Anything we should know</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
            </div>
            {ref && <p className="text-xs text-muted-foreground">Referred by @{ref.replace(/^@/, "")}. Thank them at the healing hole.</p>}
            <div ref={submitRef}>
              <Button type="submit" size="lg" disabled={request.isPending || Boolean(submitReason)} className="w-full sm:w-auto bg-[#ffd700] text-[#1a472a] font-bold text-base px-8 shadow-[0_0_24px_rgba(255,215,0,0.5)] hover:bg-[#ffe14d] hover:shadow-[0_0_36px_rgba(255,215,0,0.85)] transition-shadow disabled:opacity-50 disabled:shadow-none">
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
                <li>The insured rental is arranged on the platform through a custom offer for your dates. That charge activates the coverage the ship sails under. A <strong>refundable ${SHIP_DEPOSIT_USD.toLocaleString()} security deposit</strong> is held on the platform for your voyage and returned after her homecoming inspection, less anything you owe under the <Link href="/ship/terms#uncovered-loss" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Voyage Covenant</Link>.</li>
                <li>After the platform booking, a suggested voyage offering to the church covers the seed chest, the treasure map, the First Mate, the fleet building, and the real costs of keeping her sailing: maintenance, cleaning, and everything it takes to run this program. We strongly encourage giving at least the suggested offering so the program can keep running. Every gift is received with deep appreciation and used with utmost care, as with all funds, to serve the Regenerative Renaissance and CORE's spiritual mission. It is a gift, always voluntary, and your booking never depends on it.</li>
              </ol>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-lg mb-2">Why the trial year is a discount</h3>
              <p className="text-sm text-foreground/80">
                She is a <strong>2006 Fleetwood Revolution</strong>, and she carries her years honestly. You are sailing her as she is, with the quirks any twenty-year-old vehicle has. We would rather you hear them from us than find them at dusk: right now the <strong>leveling jacks are not fully working, and one has to be lowered by hand</strong>. You do not need them to drive her, sleep in her, or love the voyage. Nothing we know of stands between you and an epic trip.
              </p>
              <p className="text-sm text-foreground/80 mt-2">
                That is part of why this year sails at ${TRIAL_VOYAGE.toLocaleString()} instead of ${ANCHOR_VOYAGE.toLocaleString()}. What this year earns goes back into her, into the upgrades and repairs that make the later years a more polished sail at a higher price. Want the comforts more than the discount? Book a full-rate week from April 2027. Want the voyage and the story? This is your year.{" "}
                <Link href="/ship/terms#quirks" className="underline text-[#2f5d3a] dark:text-[#7dd87d] font-medium">Read her quirks in the covenant</Link>.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-lg mb-2">Reading the calendar</h3>
              <p className="text-sm text-foreground/80">Each card is one voyage week: board Monday 3pm, return Sunday 11am. Open weeks are yours to request. Weeks marked <em>requested by others</em> are still yours to request too, we confirm the calendar by hand. <em>On passage</em> weeks are when she repositions between bioregions, so she cannot host. From April 2027 on she sails at her full rate; every week before then is half price. The projected bioregion tells you roughly where she will be.</p>
            </div>
            {weeks.some((w) => !w.selectable) && <CrewListJoin source="book_page" />}
          </div>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
