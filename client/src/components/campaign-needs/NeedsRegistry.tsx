/**
 * What this project needs, grouped by the form of capital each need feeds
 * (build spec 2026-09-25, section 8.4). Money is never a need here: kinds
 * crypto and financial_link are left out, and money routes live in the money
 * block. Each group heading carries id="capital-{capital}" so the whole-ask
 * sheet can move to it. The token line shows once, under the heading.
 */
import type { ReactNode } from "react";
import { Target } from "lucide-react";
import type { ContributionNeed } from "@/components/ContributionModal";
import { CAPITAL_TYPES, CAPITAL_LABELS, CAPITAL_COLORS } from "@shared/crowdpoolingTaxonomy";
import { capitalForItem, kindForItem } from "@/lib/needDisplay";
import { NeedCard } from "./NeedCard";
import { isHoursNeed, roleFillState } from "@shared/roleCapacity";
import type { NeedProgress } from "@shared/campaignProgress";
import { isMoneyKind, type NeedChip } from "@shared/crowdpoolNeedAction";
import { PAGE, TOKEN_LINE, TOKEN_PRACTICE_LINE } from "@shared/crowdpoolCopy";
import { needMatchesChips } from "@/components/crowdpool/BringChips";

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

/** The needs a contributor can act on: every need that is not money. */
export function inKindNeeds<T>(items: T[]): T[] {
  return (items ?? []).filter((item) => !isMoneyKind(kindForItem(item as any)));
}

export function NeedsRegistry({
  items,
  campaignActive,
  claimsHidden = false,
  formatCurrency,
  onClaim,
  byNeed,
  filter = [],
  projectName,
  isExample = false,
  children,
}: {
  items: any[];
  campaignActive: boolean;
  /** Hide every need's button (a cancelled campaign takes no offers). */
  claimsHidden?: boolean;
  formatCurrency: (amount: number) => string;
  onClaim: (need: ContributionNeed) => void;
  /** progress.byNeed from the campaign's reading. */
  byNeed?: Record<number, NeedProgress>;
  /** "What can you bring?" chips; none shows every need. */
  filter?: NeedChip[];
  /** For the token line; left out when not given. */
  projectName?: string;
  isExample?: boolean;
  /** Shown at the end of the list (the "Something else to offer?" card). */
  children?: ReactNode;
}) {
  const needs = inKindNeeds(items);
  if (needs.length === 0 && !children) return null;

  // Pinned needs first, then unfilled needs nearest to complete.
  const ratio = (item: any) => {
    const np = byNeed?.[item.id];
    if (np) return np.filled ? 1 : np.wanted > 0 ? np.confirmed / np.wanted : 0;
    return needFillRatio(item);
  };
  const sortNeeds = (a: any, b: any) => {
    const pinA = a.priorityPinned ? 1 : 0;
    const pinB = b.priorityPinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;
    const ra = ratio(a);
    const rb = ratio(b);
    const fullA = ra >= 1 ? 1 : 0;
    const fullB = rb >= 1 ? 1 : 0;
    if (fullA !== fullB) return fullA - fullB;
    return rb - ra;
  };

  const coveredCount = CAPITAL_TYPES.filter((capital) => needs.some((item) => capitalForItem(item) === capital)).length;
  const groups = CAPITAL_TYPES
    .map((capital) => ({
      capital,
      items: needs
        .filter((item) => capitalForItem(item) === capital && needMatchesChips(item, filter))
        .sort(sortNeeds),
    }))
    .filter((g) => g.items.length > 0);

  const tokenLine = isExample ? TOKEN_PRACTICE_LINE : projectName ? TOKEN_LINE(projectName) : null;

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl">
      {needs.length > 0 && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
            <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Target className="w-5 h-5 text-[#4a7c59]" />
              {PAGE.needsHeading}
            </h2>
            <span className="text-xs font-semibold text-[#1a472a] bg-[#4a7c59]/10 rounded-full px-3 py-1">
              {coveredCount} of 9 forms of capital
            </span>
          </div>
          <p className="text-sm text-[#1a472a]/80 mb-2">{PAGE.needsIntro}</p>
          {tokenLine && <p className="text-xs text-[#1a472a]/75 mb-5">{tokenLine}</p>}

          <div className="space-y-8">
            {groups.map(({ capital, items: groupItems }) => {
              const color = CAPITAL_COLORS[capital];
              return (
                <div key={capital}>
                  <div
                    id={`capital-${capital}`}
                    className="mb-3 pl-3 border-l-4 rounded-sm scroll-mt-24"
                    style={{ borderColor: color }}
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a472a]">
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
                        progress={byNeed?.[item.id]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {children && <div className={needs.length > 0 ? "mt-8" : ""}>{children}</div>}
    </div>
  );
}
