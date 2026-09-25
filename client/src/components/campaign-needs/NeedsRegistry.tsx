import { Link } from "wouter";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import type { ContributionNeed } from "@/components/ContributionModal";
import { CAPITAL_TYPES, CAPITAL_LABELS, CAPITAL_COLORS } from "@shared/crowdpoolingTaxonomy";
import { capitalForItem } from "@/lib/needDisplay";
import { NeedCard } from "./NeedCard";
import { isHoursNeed, roleFillState } from "@shared/roleCapacity";

/**
 * How full a need is, 0 to 1 and beyond. Hours needs use accepted hours over
 * hours needed through roleFillState, the same numbers their card shows;
 * every other need (and a legacy role still on 'count') uses claimed slots.
 */
export function needFillRatio(item: any): number {
  if (isHoursNeed(item)) {
    const f = roleFillState({
      kind: item.kind,
      capacityUnit: item.capacityUnit,
      quantityWanted: item.quantityWanted || 0,
      quantityClaimed: item.quantityClaimed || 0,
      quantityDelivered: item.quantityDelivered || 0,
      estimatedValue: item.estimatedValue || 0,
    });
    if (f.filled) return 1;
    return f.needed > 0 ? f.accepted / f.needed : 0;
  }
  return (item.quantityClaimed || 0) / (item.quantityWanted || 1);
}

export function NeedsRegistry({
  items,
  campaignActive,
  claimsHidden = false,
  formatCurrency,
  onClaim,
}: {
  items: any[];
  campaignActive: boolean;
  /** Hide every Claim button (a cancelled campaign takes no offers). */
  claimsHidden?: boolean;
  formatCurrency: (amount: number) => string;
  onClaim: (need: ContributionNeed) => void;
}) {
  if (!items || items.length === 0) return null;

  // Pinned needs first, then unfilled needs nearest to complete.
  const sortNeeds = (a: any, b: any) => {
    const pinA = a.priorityPinned ? 1 : 0;
    const pinB = b.priorityPinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;
    const ra = needFillRatio(a);
    const rb = needFillRatio(b);
    const fullA = ra >= 1 ? 1 : 0;
    const fullB = rb >= 1 ? 1 : 0;
    if (fullA !== fullB) return fullA - fullB;
    return rb - ra;
  };

  const groups = CAPITAL_TYPES
    .map((capital) => ({
      capital,
      items: items.filter((item) => capitalForItem(item) === capital).sort(sortNeeds),
    }))
    .filter((g) => g.items.length > 0);

  const coveredCount = groups.length;

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
        <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Target className="w-5 h-5 text-[#4a7c59]" />
          What this project needs
        </h2>
        <span className="text-xs font-semibold text-[#4a7c59] bg-[#4a7c59]/10 rounded-full px-3 py-1">
          {coveredCount} of 9 forms of capital
        </span>
      </div>
      <p className="text-sm text-[#1a472a]/75 mb-5">
        Every kind of value a village runs on, grouped by the capital it feeds. Take a slot and the steward takes it from there.
      </p>

      {/*
        The Crowd Pooling Tool is the actual innovation and until now nothing on
        this page pointed at it: a person arriving here could only think in terms
        of money, which is the smallest part of what a project needs. This says
        the quiet part out loud, right where someone is deciding what to give.
      */}
      <Link href="/crowd-pooling">
        <div className="group mb-6 rounded-2xl border border-[#4a7c59]/25 bg-gradient-to-r from-[#f0f7f0] to-[#f0f7f0]/40 p-4 md:p-5 hover:border-[#4a7c59]/60 transition-colors cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#1a472a] p-2 shrink-0">
              <Sparkles className="w-5 h-5 text-[#7dd87d]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1a472a] mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                You have more to bring than money
              </p>
              <p className="text-sm text-[#1a472a]/80">
                Hours, tools, land, a skill, a spare room, a network. Add up everything you could
                bring in the Crowd Pooling Tool, then place it where you want it to go.
              </p>
              <span className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-[#4a7c59] group-hover:underline">
                Total up what you can bring
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
      <div className="space-y-8">
        {groups.map(({ capital, items: groupItems }) => {
          const color = CAPITAL_COLORS[capital];
          return (
            <div key={capital}>
              <div
                className="mb-3 pl-3 border-l-4 rounded-sm"
                style={{ borderColor: color }}
              >
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color }}>
                  {CAPITAL_LABELS[capital].label} Capital
                </h3>
                <p className="text-xs text-[#1a472a]/75">{CAPITAL_LABELS[capital].blurb}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {groupItems.map((item: any) => (
                  <NeedCard
                    key={item.id}
                    item={item}
                    capital={capital}
                    accent={color}
                    campaignActive={campaignActive}
                    claimsHidden={claimsHidden}
                    formatCurrency={formatCurrency}
                    onClaim={onClaim}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
