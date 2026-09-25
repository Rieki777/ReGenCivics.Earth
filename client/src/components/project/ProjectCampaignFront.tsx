/**
 * The project's campaign, front and centre: title, status, progress,
 * description and needs. Claiming a need opens the same ContributionModal
 * as the campaign page, so an offer made here is the same offer.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Lock } from "lucide-react";
import { CampaignProgressTracker } from "@/components/CampaignProgressTracker";
import { ContributionModal, type ContributionNeed } from "@/components/ContributionModal";
import { NeedsRegistry } from "@/components/campaign-needs/NeedsRegistry";
import { decodeBasicEntities } from "@shared/htmlText";
import { CAMPAIGN_STATUS_CLASSES, CAMPAIGN_STATUS_LABELS, makeCurrencyFormatter } from "@/lib/needDisplay";
import type { ProjectFront } from "./StewardTools";

export function ProjectCampaignFront({ front, onContributed, needsAnchor }: {
  front: ProjectFront;
  onContributed: () => void;
  /** Give the needs list the #needs anchor (visitors). Stewards have #needs on their tools. */
  needsAnchor: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [need, setNeed] = useState<ContributionNeed | null>(null);
  const formatCurrency = useMemo(() => makeCurrencyFormatter(front.currency), [front.currency]);
  const totalValue = front.items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
  const active = front.status === "active";
  // Example campaigns take practice runs: every way in works, and the server
  // writes nothing (campaigns.submitContribution returns practice:true).
  const isExample = !!front.isDemo;
  const unpublished = front.status === "draft" || front.status === "pending_review" || front.status === "rejected";
  const title = decodeBasicEntities(front.title);

  return (
    <section id="campaign" className="scroll-mt-24">
      <div className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4a7c59] mb-1">
          {active ? "Live campaign" : "Campaign"}
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a472a] break-words min-w-0" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_CLASSES[front.status] ?? "bg-gray-100 text-gray-700"}`}>
            {CAMPAIGN_STATUS_LABELS[front.status] ?? front.status}
          </span>
        </div>

        {unpublished && (
          <p className="flex items-start gap-2 text-sm bg-amber-50 text-amber-900 rounded-xl p-3 mb-4">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Only stewards can see this campaign until it passes review.
          </p>
        )}

        <CampaignProgressTracker
          totalValue={totalValue}
          pledgedTotal={front.pledgedTotal || 0}
          financialTarget={front.financialTarget || 0}
          pledgedFinancial={front.pledgedFinancial || 0}
          contributorsCount={front.contributorsCount ?? 0}
          durationDays={front.durationDays || 90}
          startedAt={front.startedAt || front.publishedAt || front.createdAt}
          status={front.status}
          currency={front.currency || "USD"}
        />

        {front.description && (
          <p className="text-[#1a472a]/80 leading-relaxed mt-4 whitespace-pre-line break-words">
            {decodeBasicEntities(front.description)}
          </p>
        )}

        {isExample && active && (
          <p className="text-sm bg-[#f0f7f0] text-[#1a472a] rounded-xl p-3 mt-4">
            This is an example campaign. You can try every step, and nothing you send reaches a real project.
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {active && (
            <Button
              size="sm"
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white"
              onClick={() => { setNeed(null); setShowModal(true); }}
            >
              <Heart className="w-4 h-4 mr-2" />
              Offer something
            </Button>
          )}
          <Link href={`/campaign/${front.id}`}>
            <Button size="sm" variant="outline" className="border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white">
              Open the full campaign page
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      <div id={needsAnchor ? "needs" : "project-needs"} className="scroll-mt-24">
        <NeedsRegistry
          items={front.items}
          campaignActive={active}
          formatCurrency={formatCurrency}
          onClaim={(n) => { setNeed(n); setShowModal(true); }}
        />
      </div>

      <ContributionModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNeed(null); }}
        campaignId={front.id}
        campaignTitle={title}
        currency={front.currency || "USD"}
        need={need ?? undefined}
        afterSignUpAnchor="your-contributions"
        onSuccess={({ practice }) => {
          // A practice run wrote nothing: no refetch, no "with the stewards".
          if (practice) return;
          onContributed();
          toast.success("Your offer is with the stewards.");
        }}
      />
    </section>
  );
}
