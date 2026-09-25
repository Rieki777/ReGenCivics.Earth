/**
 * Putting money in (build spec 2026-09-25, section 7.5): the money routes a
 * project holds outside ReGen Civics, after its needs. Only routes a ReGen
 * Civics admin verified reach this block (campaigns.getPartnerLinks), plus
 * example routes on example campaigns, which never link out.
 *
 * Each card names who holds the money. There is no input of any kind here
 * (no amount field, nothing pre-selected): a person finishes on the
 * partner's own site, and money never passes through ReGen Civics. No fund
 * copy appears on this page.
 */
import { ExternalLink, Gift, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignProgress, CampaignProgressSummary } from "@shared/campaignProgress";
import { formatCloseDate } from "@shared/campaignProgress";
import { HOLDER_LINE, LOAN_INTEREST_LINE, MONEY_BLOCK } from "@shared/crowdpoolCopy";
import { makeCurrencyFormatter } from "@/lib/needDisplay";

/** A row of campaigns.getPartnerLinks. */
export type MoneyRoute = {
  id: number;
  partner: string;
  label?: string | null;
  url: string;
  cachedRaised: number | null;
  cachedCurrency: string | null;
  lastFetchedAt: Date | string | null;
  status: string;
};

const SHOWN_PARTNERS = ["maearth", "gosteward"] as const;
type ShownPartner = (typeof SHOWN_PARTNERS)[number];

function isShownPartner(p: string): p is ShownPartner {
  return (SHOWN_PARTNERS as readonly string[]).includes(p);
}

function asOf(v: Date | string | null): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : formatCloseDate(d);
}

function RouteCard({ route, currency }: { route: MoneyRoute & { partner: ShownPartner }; currency: string }) {
  const copy = MONEY_BLOCK[route.partner];
  const example = route.status === "example";
  const routeCurrency = route.cachedCurrency || currency;
  const raised = route.cachedRaised != null && route.cachedRaised > 0
    ? copy.raised(makeCurrencyFormatter(routeCurrency)(route.cachedRaised))
    : null;
  const date = example ? null : asOf(route.lastFetchedAt);
  const Icon = route.partner === "maearth" ? Gift : Landmark;

  return (
    <div className="flex flex-col rounded-2xl border border-[#1a472a]/10 bg-[#f0f7f0] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-[#4a7c59] shrink-0" aria-hidden="true" />
        <h3 className="font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>{copy.title}</h3>
        {example && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{MONEY_BLOCK.exampleRoute}</span>
        )}
      </div>
      <p className="text-sm text-[#1a472a]/85">{copy.body}</p>
      <p className="text-sm text-[#1a472a]/85 mt-2">{HOLDER_LINE[route.partner]}</p>
      {route.partner === "gosteward" && <p className="text-sm text-[#1a472a]/85 mt-2">{LOAN_INTEREST_LINE}</p>}
      {raised && (
        <p className="text-sm mt-3">
          <span className="font-bold text-[#1a472a]">{raised}</span>
          {example && <span className="text-[#1a472a]/75">{`. ${MONEY_BLOCK.exampleFigures}`}</span>}
          {date && <span className="text-[#1a472a]/75">{`, ${MONEY_BLOCK.asOf(date)}`}</span>}
        </p>
      )}
      {!raised && example && <p className="text-xs text-[#1a472a]/75 mt-3">{MONEY_BLOCK.exampleFigures}</p>}
      {!example && (
        <div className="mt-4">
          <Button asChild className="w-full min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
            <a href={route.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
              {copy.button}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export function MoneyBlock({
  routes,
  money,
  currency,
}: {
  routes: MoneyRoute[] | undefined;
  money: Pick<(CampaignProgress | CampaignProgressSummary)["money"], "asksNone">;
  currency: string;
}) {
  const shown = (routes ?? []).filter(
    (r): r is MoneyRoute & { partner: ShownPartner } => isShownPartner(r.partner) && (r.status === "verified" || r.status === "example"),
  );

  let body;
  if (money.asksNone) {
    body = <p className="text-sm text-[#1a472a]/85">{MONEY_BLOCK.asksNone}</p>;
  } else if (shown.length === 0) {
    body = <p className="text-sm text-[#1a472a]/85">{MONEY_BLOCK.noRoute}</p>;
  } else {
    body = (
      <>
        <p className="text-sm text-[#1a472a]/85 mb-4">{MONEY_BLOCK.introWithRoutes}</p>
        <div className={`grid grid-cols-1 gap-4 ${shown.length > 1 ? "md:grid-cols-2" : ""}`}>
          {shown.map((r) => <RouteCard key={r.id} route={r} currency={currency} />)}
        </div>
      </>
    );
  }

  return (
    <section id="money" aria-labelledby="money-heading" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 id="money-heading" className="text-xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: "var(--font-display)" }}>
        {MONEY_BLOCK.title}
      </h2>
      {body}
    </section>
  );
}
