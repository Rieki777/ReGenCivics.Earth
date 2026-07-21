/**
 * FeaturedVoyage — the featured voyage on the treasure map page: "Cascadia Epic
 * Voyage: The Full Lunar Cycle," expanded south into Northern California and Mt
 * Shasta. An interactive illustrated map whose LABELS are the tap targets (a
 * transparent box over each printed label, a dark pill for the extra sites), a
 * synced detail card and stop list, real driving-distance badges and a leg by
 * leg breakdown, an honest season band, per-region RV logistics, and the booking
 * funnel for a month. The interactive layer works in the full-screen view too.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { X, Maximize2, Moon, Route, Mountain, CalendarRange, Compass, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { applyMultiWeekDiscount } from "@shared/shipPricing";
import {
  shipImg, ShipSection, ShipEyebrow, BookNowButton,
  ANCHOR_VOYAGE, TRIAL_VOYAGE,
} from "./shipShared";
import {
  VOYAGE, SEASON, STOPS, LEGS, LOGISTICS, LOGISTICS_FRAME, MAP_IMAGE, TOTAL_MILES,
  type Stop,
} from "./featuredVoyageData";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WD[dt.getUTCDay()]} ${MO[m - 1]} ${d}`;
}

const STOP_ICON: Record<Stop["kind"], string> = { home: "⚓", landmark: "📍", spring: "♨️" };

/** The interactive map: illustration + clickable label targets. */
function InteractiveMapView({ active, onSelect, onExpand }: { active: number | null; onSelect: (i: number) => void; onExpand?: () => void }) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={shipImg(MAP_IMAGE)}
        alt={`Illustrated bird's-eye map of the ${VOYAGE.title}, a grand loop from Ashland up the Oregon coast and Cascades and south to Mount Shasta and Northern California`}
        className="block w-full h-full object-contain"
        loading="lazy"
      />
      {/* Clickable label targets */}
      {STOPS.map((s, i) => {
        const isActive = active === i;
        const wPct = Math.min(30, Math.max(7, s.name.length * 1.05 + 6));
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${s.name}${s.kind === "spring" ? ", hot spring" : ""}${isActive ? ", selected" : ""}`}
            aria-pressed={isActive}
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${wPct}%`, height: "3.6%" }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] ${isActive ? "z-20 ring-2 ring-[#ffd700] bg-[#ffd700]/15" : "hover:ring-1 hover:ring-white/60 hover:bg-white/5"}`}
          >
            {/* Extra sites the art did not print get their own dark pill label. */}
            {!s.baked && (
              <span className={`absolute inset-0 flex items-center justify-center rounded-md border text-white leading-none whitespace-nowrap overflow-hidden ${isActive ? "bg-[#0d1f16] border-[#ffd700]" : "bg-[#0d1f16]/85 border-white/20"}`} style={{ fontSize: "clamp(7px, 1.2vw, 12px)" }}>
                {s.kind === "spring" ? "♨️ " : ""}{s.name}
              </span>
            )}
          </button>
        );
      })}
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Open the map full screen"
          className="absolute top-2 right-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" /> Expand
        </button>
      )}
    </div>
  );
}

function MapLightbox({ active, onSelect, onClose }: { active: number | null; onSelect: (i: number) => void; onClose: () => void }) {
  const sel = active != null ? STOPS[active] : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1300] flex flex-col items-center justify-center p-3 bg-black/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${VOYAGE.title}, full map`}>
      <button type="button" aria-label="Close full-screen map" onClick={onClose} className="absolute top-4 right-4 z-10 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]">
        <X className="w-6 h-6" aria-hidden="true" />
      </button>
      <div className="relative max-h-[88vh] max-w-[96vw] aspect-[3392/5056] rounded-lg overflow-hidden shadow-2xl">
        <InteractiveMapView active={active} onSelect={onSelect} />
      </div>
      <div className="mt-2 max-w-[96vw] w-[520px] rounded-xl bg-[#0d1f16]/90 border border-white/15 p-3 text-white min-h-[64px]">
        {sel ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span aria-hidden="true">{STOP_ICON[sel.kind]}</span>
              <span className="font-semibold">{sel.name}</span>
              {sel.seasonal && <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#b5762f]/30 text-[#e0b483] px-1.5 py-0.5">Summer to fall</span>}
              <span className="ml-auto text-xs text-white/60">{sel.region}</span>
            </div>
            <p className="text-sm text-white/85 mt-1">{sel.blurb}</p>
          </>
        ) : (
          <p className="text-sm text-white/70">Tap a label on the map to read that place.</p>
        )}
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 text-[#2f5d3a] dark:text-[#7dd87d] mt-0.5" aria-hidden="true">{icon}</span>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground/90">{value}</dd>
      </div>
    </div>
  );
}

export function FeaturedVoyage() {
  const [full, setFull] = useState(false);
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const [legsOpen, setLegsOpen] = useState(false);

  const availability = trpc.ship.availability.useQuery(undefined, { staleTime: 60_000 });
  const weeks = availability.data?.weeks ?? [];

  const monthWindow = useMemo(() => {
    for (let i = 0; i + 4 <= weeks.length; i++) {
      const run = weeks.slice(i, i + 4);
      if (run.every((w) => w.state === "open")) {
        const subtotal = run.reduce((s, w) => s + w.price.total, 0);
        const anchor = run.reduce((s, w) => s + w.price.anchorTotal, 0);
        const mw = applyMultiWeekDiscount(subtotal, 4);
        return { board: run[0].startDate, ret: run[3].endDate, anchor, total: mw.total, saved: anchor - mw.total };
      }
    }
    return null;
  }, [weeks]);

  const priced = monthWindow ?? (() => {
    const subtotal = TRIAL_VOYAGE * 4;
    const mw = applyMultiWeekDiscount(subtotal, 4);
    const anchor = ANCHOR_VOYAGE * 4;
    return { board: null as string | null, ret: null as string | null, anchor, total: mw.total, saved: anchor - mw.total };
  })();
  const savedPct = priced.anchor > 0 ? Math.round((priced.saved / priced.anchor) * 100) : 0;

  const springs = STOPS.filter((s) => s.kind === "spring");
  const bookHref = "/ship/book?voyage=lunar_cycle";
  const toggleStop = (i: number) => setActiveStop((cur) => (cur === i ? null : i));
  const sel = activeStop != null ? STOPS[activeStop] : null;

  return (
    <ShipSection className="bg-gradient-to-b from-[#0d1f16]/[0.06] to-transparent">
      <div className="rounded-3xl border border-[#ffd700]/30 bg-[#0d1f16]/[0.03] p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#ffd700]/20 text-[#8a6d1f] dark:text-[#ffd700] text-[11px] font-bold uppercase tracking-wide px-2 py-0.5">Featured voyage</span>
        </div>
        <ShipEyebrow>The flagship month</ShipEyebrow>
        <h2 className="text-3xl md:text-4xl font-bold">{VOYAGE.title}</h2>
        <p className="text-xl text-[#2f5d3a] dark:text-[#7dd87d] font-semibold mt-1">{VOYAGE.subtitle}</p>
        <p className="text-foreground/80 mt-2 max-w-2xl">{VOYAGE.tagline}</p>

        <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
          {/* Interactive map + synced detail */}
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-[#ffd700]/30 aspect-[3392/5056]">
              <InteractiveMapView active={activeStop} onSelect={toggleStop} onExpand={() => setFull(true)} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Tap a label to read the place. Real driving distances are in the leg by leg list below. Expand for the full map.</p>
            <div className="mt-2 rounded-xl border p-3 bg-background/60 min-h-[84px]">
              {sel ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span aria-hidden="true">{STOP_ICON[sel.kind]}</span>
                    <span className="font-semibold text-foreground">{sel.name}</span>
                    {sel.seasonal && <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#b5762f]/15 text-[#8a5a2b] dark:text-[#e0b483] px-1.5 py-0.5">Summer to fall</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{sel.region}</span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-1.5">{sel.blurb}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Tap a label on the map, or a stop in the list below, to read that place.</p>
              )}
            </div>
          </div>

          {/* Stats + funnel */}
          <div className="space-y-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border p-4 bg-background/60">
              <StatRow icon={<Moon className="w-5 h-5" />} label="Length" value={`About ${VOYAGE.nights} nights (${VOYAGE.weeks} voyage weeks, one whole moon)`} />
              <StatRow icon={<Route className="w-5 h-5" />} label="Route" value={`${TOTAL_MILES.toLocaleString()} real road miles around the loop`} />
              <StatRow icon={<Compass className="w-5 h-5" />} label="Pace" value={VOYAGE.pace} />
              <StatRow icon={<Mountain className="w-5 h-5" />} label="Terrain" value={VOYAGE.terrain} />
              <StatRow icon={<CalendarRange className="w-5 h-5" />} label="Best months" value={VOYAGE.bestMonths} />
            </dl>

            <div className="rounded-2xl border border-[#3ddc84]/40 bg-gradient-to-br from-[#2f5d3a]/10 to-[#d4a574]/10 p-5">
              <p className="text-sm font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">Book the whole moon</p>
              <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                <span className="text-muted-foreground line-through text-lg">${priced.anchor.toLocaleString()}</span>
                <span className="text-3xl font-bold text-[#2f5d3a] dark:text-[#9de89d]">${priced.total.toLocaleString()}</span>
                <span className="inline-flex items-center rounded-full bg-[#2f5d3a] text-white text-xs font-bold px-2 py-0.5">{savedPct}% off</span>
              </div>
              <p className="text-xs text-foreground/75 mt-1">
                50% off through early April 2027, plus another 15% for booking a full month. That stacks to ${priced.saved.toLocaleString()} off the four week voyage.
              </p>
              {monthWindow?.board ? (
                <p className="text-sm text-foreground/85 mt-2">The next open month boards <strong>{fmtDate(monthWindow.board)}</strong> and returns <strong>{fmtDate(monthWindow.ret!)}</strong>.</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Open months are filling. Tap through to claim the next one.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <BookNowButton href={bookHref} />
                <Link href={bookHref} className="inline-flex items-center gap-1.5 rounded-md border border-[#2f5d3a]/40 px-4 py-2 text-sm font-semibold text-[#2f5d3a] dark:text-[#7dd87d] hover:bg-[#2f5d3a]/10">
                  <Compass className="w-4 h-4" aria-hidden="true" /> Customize with your First Mate
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Season band */}
        <div className="mt-8 rounded-2xl border border-[#b5762f]/40 bg-[#b5762f]/8 p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-[#8a5a2b] dark:text-[#e0b483]" aria-hidden="true" />
            <h3 className="font-semibold">Best sailed {SEASON.best}</h3>
          </div>
          <p className="text-sm text-foreground/80 mt-2">{SEASON.note}</p>
        </div>

        {/* The route, leg by leg (real distances) */}
        <div className="mt-8">
          <button type="button" onClick={() => setLegsOpen((v) => !v)} aria-expanded={legsOpen} className="flex items-center gap-2 text-left">
            <ChevronDown className={`w-5 h-5 transition-transform ${legsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            <span><span className="font-bold text-lg">The route, leg by leg</span> <span className="text-sm text-muted-foreground">real driving miles, {TOTAL_MILES.toLocaleString()} total</span></span>
          </button>
          {legsOpen && (
            <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {LEGS.map((l, i) => (
                <li key={i} className="flex justify-between border-b border-border/50 py-1">
                  <span className="text-foreground/85">{l.from} <span className="text-muted-foreground">to</span> {l.to}</span>
                  <span className="shrink-0 font-semibold text-[#2f5d3a] dark:text-[#7dd87d]">{l.mi} mi</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stop layer, synced to the map */}
        <div className="mt-8">
          <ShipEyebrow>The stops</ShipEyebrow>
          <h3 className="text-2xl font-bold mb-1">Every anchor on the map</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tap a stop to read the place and light its label on the map. <span className="whitespace-nowrap">♨️ marks a hot spring.</span>
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {STOPS.map((s, i) => {
              const isOpen = activeStop === i;
              return (
                <li key={s.name}>
                  <button type="button" onClick={() => toggleStop(i)} aria-expanded={isOpen} className={`w-full text-left rounded-xl border p-3 transition-colors ${isOpen ? "border-[#2f5d3a]/60 bg-[#2f5d3a]/5 ring-1 ring-[#2f5d3a]/30" : "border-border hover:border-[#2f5d3a]/40"}`}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg leading-none" aria-hidden="true">{STOP_ICON[s.kind]}</span>
                      <span className="font-semibold text-foreground">{s.name}</span>
                      {s.kind === "home" && <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#ffd700]/20 text-[#8a6d1f] dark:text-[#ffd700] px-1.5 py-0.5 font-bold">Home port</span>}
                      {s.seasonal && <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#b5762f]/15 text-[#8a5a2b] dark:text-[#e0b483] px-1.5 py-0.5">Summer to fall</span>}
                      <span className="ml-auto text-xs text-muted-foreground">{s.region}</span>
                    </span>
                    {isOpen && <span className="block mt-2 text-sm text-foreground/80">{s.blurb}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Hot springs on this loop: {springs.map((s) => s.name).join(", ")}. Tillamook Creamery appears on the map, but it is not a stop on this voyage.
          </p>
        </div>

        {/* RV logistics */}
        <div className="mt-8">
          <ShipEyebrow>Rig logistics</ShipEyebrow>
          <h3 className="text-2xl font-bold mb-1">Hookups, water, and dumps, by region</h3>
          <p className="text-sm text-muted-foreground mb-4">{LOGISTICS_FRAME}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {LOGISTICS.map((l) => (
              <div key={l.region} className="rounded-xl border p-4 bg-background/50">
                <h4 className="font-semibold text-sm text-[#2f5d3a] dark:text-[#7dd87d]">{l.region}</h4>
                <p className="text-sm text-foreground/80 mt-1">{l.guidance}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Customize entry point */}
        <div className="mt-8 rounded-2xl border border-[#2f5d3a]/30 bg-[#2f5d3a]/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h3 className="text-lg font-bold">Make it yours</h3>
            <p className="text-sm text-foreground/80">Keep the grand loop or reshape it. The First Mate charts your exact days, stops, and soaks from the real places on the treasure map, then it becomes your voyage.</p>
          </div>
          <Link href={bookHref} className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-[#2f5d3a] hover:bg-[#264a2f] text-white px-4 py-2.5 text-sm font-semibold">
            <Compass className="w-4 h-4" aria-hidden="true" /> Customize this voyage
          </Link>
        </div>
      </div>

      {full && <MapLightbox active={activeStop} onSelect={toggleStop} onClose={() => setFull(false)} />}
    </ShipSection>
  );
}
