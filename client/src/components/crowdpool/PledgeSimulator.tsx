import { useMemo, useState } from "react";
import {
  analyzeCoverage,
  valuationForRole,
  valuationBandForValue,
  type CoachNeedInput,
} from "@shared/crowdpoolCoach";
import {
  CAPITAL_TYPES,
  CAPITAL_LABELS,
  CAPITAL_COLORS,
  type CapitalType,
} from "@shared/crowdpoolingTaxonomy";
import { CapitalBalanceMeter } from "@/components/crowdpool/CapitalBalanceMeter";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Clock, ListChecks } from "lucide-react";

/**
 * Pledge simulator (Phase 4). A pure client widget: the visitor picks one of the
 * campaign's needs or offers some hours, and sees live which of the nine capitals
 * it fills, how it moves that capital on the balance meter, and a fair-market
 * value. Nothing is sent. All numbers come straight from shared/crowdpoolCoach so
 * they match the design coach exactly.
 */

function capitalForItem(item: any): CapitalType {
  if (item?.capitalType) return item.capitalType;
  switch (item?.category) {
    case "land":
      return "living";
    case "role":
      return "experiential";
    default:
      return "material";
  }
}
function kindForItem(item: any): string {
  if (item?.kind) return item.kind;
  return item?.category === "role" ? "role" : "item";
}
function titleForItem(item: any): string {
  return (
    item?.roleTitle ||
    item?.equipmentName ||
    item?.resourceName ||
    (item?.landDescription ? String(item.landDescription).split("\n")[0].slice(0, 60) : "") ||
    "This need"
  );
}

const STRENGTH_WORD: Record<string, string> = { none: "empty", thin: "thin", solid: "solid" };
const WEEKS = 12;

/**
 * Currency symbols for the currencies a campaign can be denominated in. The
 * simulator used to hardcode a dollar sign, so a campaign in francs, euros or
 * pounds showed a person their pledge in dollars: measured live on the EUR
 * campaign "Terra Nova Regenerative Farm", where "$3,500" sat among euro figures
 * on the same page.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CHF: "CHF ", JPY: "¥",
  CAD: "C$", AUD: "A$", NZD: "NZ$", PHP: "₱", INR: "₹",
};

export function PledgeSimulator({ items, region, currency }: { items: any[]; region?: string | null; currency?: string }) {
  const needs = (items ?? []).filter((it) => kindForItem(it) !== "financial_link");

  const baseNeeds: CoachNeedInput[] = useMemo(
    () =>
      needs.map((it) => ({
        capitalType: capitalForItem(it),
        kind: kindForItem(it),
        estimatedValue: Number(it.estimatedValue) || 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  const [mode, setMode] = useState<"need" | "time">(needs.length > 0 ? "need" : "time");
  const [needIdx, setNeedIdx] = useState(0);
  const [capital, setCapital] = useState<CapitalType>("experiential");
  const [hours, setHours] = useState(5);

  // The campaign's own currency, not a dollar sign. An unknown code renders as
  // the code itself ("SEK 1,200") rather than silently claiming to be dollars.
  const symbol = currency
    ? (CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `)
    : "";
  const fmt = (n: number) => `${symbol}${Math.round(n).toLocaleString()}`;

  const sim = useMemo(() => {
    if (mode === "need" && needs[needIdx]) {
      const it = needs[needIdx];
      const cap = capitalForItem(it);
      const value = Number(it.estimatedValue) || 0;
      return { capital: cap, kind: kindForItem(it), value, band: valuationBandForValue(value, 0.25, symbol || "$") };
    }
    const band = valuationForRole({ capital, hoursPerWeek: hours, weeks: WEEKS, region });
    return { capital, kind: "role", value: band.mid, band };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, needIdx, capital, hours, region, needs.length, symbol]);

  const simNeed: CoachNeedInput = { capitalType: sim.capital, kind: sim.kind, estimatedValue: sim.value };
  const base = useMemo(() => analyzeCoverage(baseNeeds), [baseNeeds]);
  const withSim = useMemo(() => analyzeCoverage([...baseNeeds, simNeed]), [baseNeeds, simNeed]);

  const beforeEntry = base.entries.find((e) => e.capital === sim.capital);
  const afterEntry = withSim.entries.find((e) => e.capital === sim.capital);
  const capColor = CAPITAL_COLORS[sim.capital];
  const capLabel = CAPITAL_LABELS[sim.capital].label;

  const movement =
    beforeEntry && afterEntry && beforeEntry.strength !== afterEntry.strength
      ? `moves ${capLabel} from ${STRENGTH_WORD[beforeEntry.strength]} to ${STRENGTH_WORD[afterEntry.strength]}`
      : `keeps ${capLabel} ${STRENGTH_WORD[afterEntry?.strength ?? "none"]}`;
  const opensNewForm = withSim.coveredCount > base.coveredCount;


  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
      <h2
        className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Sparkles className="w-5 h-5 text-[#4a7c59]" />
        See what your pledge unlocks
      </h2>
      <p className="text-sm text-[#1a472a]/75 mb-5">
        Try it out. Pick a need or offer some hours, and watch which capital it fills and what it is worth. Nothing is sent.
      </p>

      {/* Mode toggle */}
      <div className="inline-flex rounded-full bg-[#f0f7f0] p-1 mb-5">
        {needs.length > 0 && (
          <button
            type="button"
            onClick={() => setMode("need")}
            className={`px-4 py-2 rounded-full text-sm font-medium pointer-coarse:min-h-11 flex items-center gap-1.5 transition-colors ${
              mode === "need" ? "bg-[#4a7c59] text-white" : "text-[#1a472a]/75"
            }`}
          >
            <ListChecks className="w-4 h-4" /> Fill a need
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("time")}
          className={`px-4 py-2 rounded-full text-sm font-medium pointer-coarse:min-h-11 flex items-center gap-1.5 transition-colors ${
            mode === "time" ? "bg-[#4a7c59] text-white" : "text-[#1a472a]/75"
          }`}
        >
          <Clock className="w-4 h-4" /> Offer time
        </button>
      </div>

      {/* Controls */}
      {mode === "need" && needs.length > 0 ? (
        <div className="mb-5">
          <label className="block text-xs font-medium text-[#1a472a]/75 mb-2">Which need would you fill?</label>
          <select
            value={needIdx}
            onChange={(e) => setNeedIdx(Number(e.target.value))}
            className="w-full rounded-xl border border-[#1a472a]/15 bg-white px-3 py-3 text-base md:text-sm text-[#1a472a] pointer-coarse:min-h-11"
          >
            {needs.map((it, i) => (
              <option key={i} value={i}>
                {titleForItem(it)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mb-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a472a]/75 mb-2">What kind of capital?</label>
            <div className="flex flex-wrap gap-2">
              {CAPITAL_TYPES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCapital(c)}
                  className={`px-3 py-2 rounded-full text-xs font-medium border pointer-coarse:min-h-11 transition-colors ${
                    capital === c ? "text-white" : "text-[#1a472a]/80 bg-white"
                  }`}
                  style={
                    capital === c
                      ? { backgroundColor: CAPITAL_COLORS[c], borderColor: CAPITAL_COLORS[c] }
                      : { borderColor: `${CAPITAL_COLORS[c]}80` }
                  }
                >
                  {CAPITAL_LABELS[c].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs font-medium text-[#1a472a]/75">Hours a week, over {WEEKS} weeks</label>
              <span className="text-sm font-bold text-[#1a472a]">{hours} hrs/wk</span>
            </div>
            <Slider
              value={[hours]}
              onValueChange={([v]) => setHours(v)}
              min={1}
              max={40}
              step={1}
              aria-label="Hours per week"
            />
          </div>
        </div>
      )}

      {/* Result */}
      <div className="rounded-2xl border border-[#1a472a]/10 p-4 mb-5" style={{ background: `${capColor}12` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: capColor }} />
          <span className="text-sm font-semibold text-[#1a472a]">This fills {capLabel} capital</span>
        </div>
        <p className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          {fmt(sim.band.mid)}
          <span className="text-sm font-normal text-[#1a472a]/75">
            {" "}
            fair value ({fmt(sim.band.low)} to {fmt(sim.band.high)})
          </span>
        </p>
        <p className="text-xs text-[#1a472a]/75 mt-1">{sim.band.note}</p>
        <p className="text-sm text-[#1a472a] mt-3">
          It {movement}
          {opensNewForm ? " and covers a form the pool did not have yet." : "."}
        </p>
      </div>

      {/* Live meter with the simulated pledge added */}
      <CapitalBalanceMeter needs={[...baseNeeds, simNeed]} />
    </div>
  );
}
