/**
 * FeaturedVoyage — the first fully-built voyage on the treasure map page:
 * "Cascadia Epic Voyage: The Full Lunar Cycle." An interactive illustrated map
 * (tappable markers over each stop, synced to the list and a detail card, plus
 * a full-screen view), a stats card, an honest season band, a tappable stop
 * layer, general per-region RV logistics, and the booking funnel for a month.
 *
 * This is one worked example, not the gallery. The other routes and the full
 * gallery are a later pass.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { X, Maximize2, Moon, Route, Mountain, CalendarRange, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { applyMultiWeekDiscount } from "@shared/shipPricing";
import {
  shipImg, ShipSection, ShipEyebrow, BookNowButton,
  ANCHOR_VOYAGE, TRIAL_VOYAGE,
} from "./shipShared";
import {
  VOYAGE, SEASON, STOPS, LOGISTICS, LOGISTICS_FRAME, MAP_IMAGE, TOTAL_MILES,
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
const DOT_COLOR: Record<Stop["kind"], string> = { home: "bg-[#3ddc84]", landmark: "bg-[#ffd700]", spring: "bg-[#ff9a3d]" };

/** The illustrated map with tappable markers over each stop. */
function InteractiveMap({ active, onSelect, onExpand }: { active: number | null; onSelect: (i: number) => void; onExpand: () => void }) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-[#ffd700]/30">
        <img
          src={shipImg(MAP_IMAGE)}
          alt={`Illustrated bird's-eye map of the ${VOYAGE.title}, the loop from Ashland up the Oregon coast, across the Columbia Gorge and Cascades, down to Crater Lake and home`}
          className="block w-full h-auto"
          loading="lazy"
        />
        {STOPS.map((s, i) => {
          const isActive = active === i;
          const labelAbove = s.y > 0.82;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`${s.name}${s.kind === "spring" ? ", hot spring" : ""}${isActive ? ", selected" : ""}`}
              aria-pressed={isActive}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 group focus-visible:outline-none ${isActive ? "z-20" : "z-10"}`}
            >
              <span
                className={`block rounded-full ring-2 shadow transition-transform group-hover:scale-125 group-focus-visible:ring-white ${DOT_COLOR[s.kind]} ${isActive ? "w-4 h-4 ring-white scale-125" : "w-2.5 h-2.5 ring-black/60"}`}
              />
              {isActive && (
                <span className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 text-white text-[10px] font-medium px-1.5 py-0.5 pointer-events-none ${labelAbove ? "bottom-full mb-1" : "top-full mt-1"}`}>
                  {STOP_ICON[s.kind]} {s.name}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onExpand}
          aria-label="Open the map full screen"
          className="absolute top-2 right-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" /> Expand
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">Tap a marker to read the place. Gold is a stop, amber is a hot spring, green is home port. Expand for the full map.</p>
    </div>
  );
}

function MapLightbox({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-3 bg-black/90 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label={`${VOYAGE.title}: ${VOYAGE.subtitle}, full map`}
      onClick={onClose}
    >
      <button
        type="button" aria-label="Close full-screen map" onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
      >
        <X className="w-6 h-6" aria-hidden="true" />
      </button>
      <img
        src={shipImg(MAP_IMAGE)}
        alt={`Illustrated map of the ${VOYAGE.title}, ${VOYAGE.subtitle}, the loop from Ashland up the coast, across the Cascades, and back`}
        className="max-w-full max-h-[92vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
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

  const availability = trpc.ship.availability.useQuery(undefined, { staleTime: 60_000 });
  const weeks = availability.data?.weeks ?? [];

  // The next open month: the first run of four consecutive open weeks.
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

  // Fall back to the standard month math while availability loads or if no open
  // month run exists yet, so the price and savings always render.
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
          {/* The interactive map + synced detail */}
          <div>
            <InteractiveMap active={activeStop} onSelect={toggleStop} onExpand={() => setFull(true)} />
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
                <p className="text-sm text-muted-foreground">Tap a marker on the map, or a stop in the list below, to read that place.</p>
              )}
            </div>
          </div>

          {/* Stats + funnel */}
          <div className="space-y-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border p-4 bg-background/60">
              <StatRow icon={<Moon className="w-5 h-5" />} label="Length" value={`About ${VOYAGE.nights} nights (${VOYAGE.weeks} voyage weeks, one whole moon)`} />
              <StatRow icon={<Route className="w-5 h-5" />} label="Route" value={`About ${TOTAL_MILES} miles around the loop`} />
              <StatRow icon={<Compass className="w-5 h-5" />} label="Pace" value={VOYAGE.pace} />
              <StatRow icon={<Mountain className="w-5 h-5" />} label="Terrain" value={VOYAGE.terrain} />
              <StatRow icon={<CalendarRange className="w-5 h-5" />} label="Best months" value={VOYAGE.bestMonths} />
            </dl>

            {/* Funnel: the open month + stacked savings + Book Now */}
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
                <Link
                  href={bookHref}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#2f5d3a]/40 px-4 py-2 text-sm font-semibold text-[#2f5d3a] dark:text-[#7dd87d] hover:bg-[#2f5d3a]/10"
                >
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

        {/* Stop layer, synced to the map */}
        <div className="mt-8">
          <ShipEyebrow>The stops</ShipEyebrow>
          <h3 className="text-2xl font-bold mb-1">Every anchor on the map</h3>
          <p className="text-sm text-muted-foreground mb-4">
            In loop order from home port. Tap a stop to read the place and light it on the map. <span className="whitespace-nowrap">♨️ marks a hot spring.</span>
          </p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {STOPS.map((s, i) => {
              const isOpen = activeStop === i;
              return (
                <li key={s.name}>
                  <button
                    type="button"
                    onClick={() => toggleStop(i)}
                    aria-expanded={isOpen}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${isOpen ? "border-[#2f5d3a]/60 bg-[#2f5d3a]/5 ring-1 ring-[#2f5d3a]/30" : "border-border hover:border-[#2f5d3a]/40"}`}
                  >
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
            The four hot springs on this loop: {springs.map((s) => s.name).join(", ")}. Tillamook Creamery appears on the map, but it is not a stop on this voyage.
          </p>
        </div>

        {/* RV logistics, honest general guidance per region */}
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
          <Link
            href={bookHref}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-[#2f5d3a] hover:bg-[#264a2f] text-white px-4 py-2.5 text-sm font-semibold"
          >
            <Compass className="w-4 h-4" aria-hidden="true" /> Customize this voyage
          </Link>
        </div>
      </div>

      {full && <MapLightbox onClose={() => setFull(false)} />}
    </ShipSection>
  );
}
