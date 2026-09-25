import { useMemo, useState } from "react";
import {
  analyzeCoverage,
  valuationBandForValue,
  type CoachNeedInput,
} from "@shared/crowdpoolCoach";
import { CAPITAL_LABELS, CAPITAL_COLORS } from "@shared/crowdpoolingTaxonomy";
import { capitalForItem, isMoneyKind, kindForItem, needTitle, needVerb } from "@shared/crowdpoolNeedAction";
import { PAGE } from "@shared/crowdpoolCopy";
import { CapitalBalanceMeter } from "@/components/crowdpool/CapitalBalanceMeter";
import { Button } from "@/components/ui/button";

/**
 * Try filling a need (build spec 2026-09-25, section 8.5; ruling 2026-09-24:
 * "keeps Fill a need with a real Apply, Offer or Sign up button; Offer time
 * goes"). A pure client widget: the visitor picks one of the campaign's needs
 * and sees which of the nine capitals it fills and how it moves that capital
 * on the balance meter. Nothing is sent until they press the need's own verb,
 * which opens the same offer sheet as the need card. Money kinds are left
 * out: money is never a need. All numbers come from shared/crowdpoolCoach so
 * they match the design coach.
 *
 * The project page shows it inside a closed disclosure after the needs,
 * whose summary carries the heading, so this renders no heading of its own.
 */

const STRENGTH_WORD: Record<string, string> = { none: "empty", thin: "thin", solid: "solid" };

/**
 * Currency symbols for the currencies a campaign can be denominated in, so a
 * campaign in francs, euros or pounds never shows a person a dollar sign.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CHF: "CHF ", JPY: "¥",
  CAD: "C$", AUD: "A$", NZD: "NZ$", PHP: "₱", INR: "₹",
};

export function PledgeSimulator({
  items,
  currency,
  onPick,
  canPick,
}: {
  items: any[];
  currency?: string;
  /** Opens the offer sheet for the chosen need. Left out, no button shows. */
  onPick?: (item: any) => void;
  /** Whether the chosen need can take an offer now (open, campaign live). */
  canPick?: (item: any) => boolean;
}) {
  const needs = useMemo(() => (items ?? []).filter((it) => !isMoneyKind(kindForItem(it))), [items]);

  const baseNeeds: CoachNeedInput[] = useMemo(
    () =>
      needs.map((it) => ({
        capitalType: capitalForItem(it),
        kind: kindForItem(it),
        estimatedValue: Number(it.estimatedValue) || 0,
      })),
    [needs],
  );

  const [needIdx, setNeedIdx] = useState(0);

  // The campaign's own currency, not a dollar sign. An unknown code renders as
  // the code itself ("SEK 1,200") rather than silently claiming to be dollars.
  const symbol = currency
    ? (CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `)
    : "";
  const fmt = (n: number) => `${symbol}${Math.round(n).toLocaleString()}`;

  const chosen = needs[Math.min(needIdx, Math.max(needs.length - 1, 0))];
  const base = useMemo(() => analyzeCoverage(baseNeeds), [baseNeeds]);
  if (!chosen) return null;

  const cap = capitalForItem(chosen);
  const value = Number(chosen.estimatedValue) || 0;
  const band = valuationBandForValue(value, 0.25, symbol || "$");
  const simNeed: CoachNeedInput = { capitalType: cap, kind: kindForItem(chosen), estimatedValue: value };
  const withSim = analyzeCoverage([...baseNeeds, simNeed]);

  const beforeEntry = base.entries.find((e) => e.capital === cap);
  const afterEntry = withSim.entries.find((e) => e.capital === cap);
  const capColor = CAPITAL_COLORS[cap];
  const capLabel = CAPITAL_LABELS[cap].label;
  const movement =
    beforeEntry && afterEntry && beforeEntry.strength !== afterEntry.strength
      ? `moves ${capLabel} from ${STRENGTH_WORD[beforeEntry.strength]} to ${STRENGTH_WORD[afterEntry.strength]}`
      : `keeps ${capLabel} ${STRENGTH_WORD[afterEntry?.strength ?? "none"]}`;
  const opensNewForm = withSim.coveredCount > base.coveredCount;
  const verb = needVerb(kindForItem(chosen));
  const title = needTitle(chosen);
  const pickable = !!onPick && !!verb && (canPick ? canPick(chosen) : true);

  return (
    <div>
      <p className="text-sm text-[#1a472a]/80 mb-4">{PAGE.tryFillingIntro}</p>

      <div className="mb-5">
        <label htmlFor="try-need" className="block text-xs font-medium text-[#1a472a]/80 mb-2">Which need would you fill?</label>
        <select
          id="try-need"
          value={needIdx}
          onChange={(e) => setNeedIdx(Number(e.target.value))}
          className="w-full rounded-xl border border-[#1a472a]/15 bg-white px-3 py-3 text-base md:text-sm text-[#1a472a] pointer-coarse:min-h-11"
        >
          {needs.map((it, i) => (
            <option key={it.id ?? i} value={i}>
              {needTitle(it)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-[#1a472a]/10 p-4 mb-5" style={{ background: `${capColor}12` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: capColor }} aria-hidden="true" />
          <span className="text-sm font-semibold text-[#1a472a]">This fills {capLabel} capital</span>
        </div>
        <p className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          {fmt(band.mid)}
          <span className="text-sm font-normal text-[#1a472a]/75">
            {" "}
            fair value ({fmt(band.low)} to {fmt(band.high)})
          </span>
        </p>
        <p className="text-xs text-[#1a472a]/75 mt-1">{band.note}</p>
        <p className="text-sm text-[#1a472a] mt-3">
          It {movement}
          {opensNewForm ? " and covers a form the pool did not have yet." : "."}
        </p>
        {pickable && (
          <Button
            type="button"
            className="mt-3 min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white"
            aria-label={`${verb}: ${title}`}
            onClick={() => onPick!(chosen)}
          >
            {verb}
          </Button>
        )}
      </div>

      {/* Live meter with the chosen need added */}
      <CapitalBalanceMeter needs={[...baseNeeds, simNeed]} />
    </div>
  );
}
