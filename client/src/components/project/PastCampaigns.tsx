/**
 * The project's other campaigns (past ones, and for stewards any drafts), as
 * small cards with their status, their two short lines and a link to the
 * project page focused on that campaign (c.path).
 */
import { Link } from "wouter";
import { ArrowRight, History } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import type { CampaignProgressSummary } from "@shared/campaignProgress";
import { PAGE } from "@shared/crowdpoolCopy";
import { CAMPAIGN_STATUS_CLASSES, CAMPAIGN_STATUS_LABELS, makeCurrencyFormatter } from "@/lib/needDisplay";
import { TwoLineBar } from "@/components/crowdpool/TwoLineBar";

export type ProjectCampaignCard = {
  id: number;
  title: string;
  status: string;
  isDemo: boolean;
  currency: string | null;
  /** /project/:key?campaign={id} */
  path: string;
  progress?: CampaignProgressSummary | null;
};

export function PastCampaigns({ campaigns, projectName }: { campaigns: ProjectCampaignCard[]; projectName: string }) {
  if (campaigns.length === 0) return null;
  return (
    <section id="past-campaigns" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <History className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
        {PAGE.otherCampaignsFrom(projectName)}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {campaigns.map((c) => (
          <li key={c.id} className="min-w-0">
            <Link
              href={c.path}
              className="flex h-full flex-col rounded-2xl border border-[#1a472a]/10 bg-[#f0f7f0] p-4 hover:border-[#4a7c59]/60 transition-colors"
            >
              <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${CAMPAIGN_STATUS_CLASSES[c.status] ?? "bg-gray-100 text-gray-700"}`}>
                {CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
              </span>
              <span className="font-bold text-[#1a472a] break-words">{decodeBasicEntities(c.title)}</span>
              {c.progress && (
                <div className="mt-2">
                  <TwoLineBar progress={c.progress} formatCurrency={makeCurrencyFormatter(c.currency)} variant="compact" />
                </div>
              )}
              <span className="mt-auto pt-2 inline-flex items-center gap-1 text-sm font-medium text-[#1a472a]">
                Open campaign <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
