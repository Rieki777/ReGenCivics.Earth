/**
 * More campaigns (build spec 2026-09-25, section 8.1 item 11): up to three
 * live campaigns from other projects, real ones first, examples labelled,
 * each with its two short lines and a link to its project page.
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, MapPin, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { decodeBasicEntities } from "@shared/htmlText";
import { campaignRedirectTarget } from "@shared/projectKey";
import { PAGE } from "@shared/crowdpoolCopy";
import { makeCurrencyFormatter } from "@/lib/needDisplay";
import { TwoLineBar } from "@/components/crowdpool/TwoLineBar";

export function MoreCampaigns({ excludeIds, applicationId }: {
  /** This project's own campaigns. */
  excludeIds: number[];
  /** This project's application, so its other campaigns never show here. */
  applicationId: number | null;
}) {
  const { data } = trpc.campaigns.list.useQuery({ status: "active" }, { staleTime: 5 * 60 * 1000 });
  const picks = useMemo(() => {
    const skip = new Set(excludeIds);
    const others = (data ?? []).filter((c) => !skip.has(c.id) && !(applicationId && c.applicationId === applicationId));
    // Real campaigns first; examples only fill what is left.
    return [...others.filter((c) => !c.isDemo), ...others.filter((c) => !!c.isDemo)].slice(0, 3);
  }, [data, excludeIds, applicationId]);

  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="more-campaigns-heading" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl">
      <h2 id="more-campaigns-heading" className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <TrendingUp className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
        {PAGE.moreCampaigns}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {picks.map((c) => (
          <li key={c.id} className="min-w-0">
            <Link
              href={campaignRedirectTarget(c, "", "")}
              className="flex h-full flex-col rounded-2xl border border-[#1a472a]/10 bg-[#f0f7f0] p-4 hover:border-[#4a7c59]/60 transition-colors"
            >
              {!!c.isDemo && (
                <span className="self-start text-xs font-semibold px-2 py-0.5 rounded-full mb-2 bg-amber-100 text-amber-800">Example</span>
              )}
              <span className="font-bold text-[#1a472a] text-sm break-words line-clamp-2" style={{ fontFamily: "var(--font-display)" }}>
                {decodeBasicEntities(c.projectName || c.title)}
              </span>
              {c.location && (
                <span className="text-xs text-[#1a472a]/80 flex items-center gap-1 mt-1 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{decodeBasicEntities(c.location)}</span>
                </span>
              )}
              {c.progress && (
                <div className="mt-3">
                  <TwoLineBar progress={c.progress} formatCurrency={makeCurrencyFormatter(c.currency)} variant="compact" />
                </div>
              )}
              <span className="mt-auto pt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1a472a]">
                See the project <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
