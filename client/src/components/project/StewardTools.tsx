/**
 * The campaign tools on a project page, rendered only for the project's
 * stewards. Hiding them is for tidiness: every action calls a campaigns.*
 * procedure that checks the steward on the server
 * (server/lib/project-steward.ts), so a signed-in stranger who forced this
 * open would get FORBIDDEN on every button.
 *
 * Anchors: #steward-tools, #review, #claims, #money-routes, #needs,
 * #updates-composer, #followers, #campaign-status. The steward digest and the
 * old /campaign/:id/manage links land on these.
 *
 * "How it's going" reads the campaign's one progress reading (front.progress,
 * shared/campaignProgress.ts), the same figures visitors see, plus the soft
 * money-share note (guidance only). Ready to crowdpool ticks are stored on
 * the campaign while it is a draft, in review, or sent back, so the review
 * team sees them (build spec 2026-09-25, section 12).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Camera, Flag, Loader2, Send, Users } from "lucide-react";
import { CampaignImageUpload } from "@/components/CampaignImageUpload";
import { canTransition } from "@shared/campaignStatus";
import { decodeBasicEntities } from "@shared/htmlText";
import { buildStewardQueue, type OfferTab } from "@shared/stewardQueue";
import { makeCurrencyFormatter } from "@/lib/needDisplay";
import { WaitingOnYou } from "./WaitingOnYou";
import { ContributionReviewPanel } from "./ContributionReviewPanel";
import { NeedsGlance } from "./NeedsGlance";
import { CampaignUpdatesComposer } from "./CampaignUpdatesComposer";
import { CampaignStewardStats } from "./CampaignStewardStats";
import { CancelCampaignDialog } from "./CancelCampaignDialog";
import { CrowdpoolReadiness } from "@/components/CrowdpoolReadiness";
import { MoneyRoutesCard } from "./MoneyRoutesCard";
import { CASH_SHARE } from "@shared/crowdpoolModel";

/** Statuses whose stewards keep ticking the Ready to crowdpool list. Wizard campaigns start in review. */
const READINESS_STATUSES = ["draft", "pending_review", "rejected"];

/** The currency's symbol for the money route quiz ("$", "EUR"), from Intl. */
function currencySymbolFor(currency: string | null | undefined): string {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? "$";
  } catch {
    return currency || "$";
  }
}

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type ProjectFront = NonNullable<RouterOutputs["projects"]["getPublic"]["front"]>;

const card = "bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24";
const heading = "text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2";

function scrollToId(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

export function StewardTools({
  front,
  onChanged,
  onCancelled,
}: {
  front: ProjectFront;
  /** Refresh the page's data after a change (needs, totals, updates, status). */
  onChanged: () => void;
  onCancelled: (message: string) => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const campaignId = front.id;
  const formatCurrency = useMemo(() => makeCurrencyFormatter(front.currency), [front.currency]);
  const status = front.status;
  const closed = status === "cancelled" || status === "completed" || status === "funded";

  const { data: contributions, isLoading: contributionsLoading } = trpc.campaigns.getContributionsForOwner.useQuery(
    { campaignId },
    { retry: false },
  );
  const { data: followers } = trpc.campaigns.followerCounts.useQuery({ campaignId }, { retry: false });
  const { data: settings } = trpc.campaigns.crowdpoolSettings.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  const queue = useMemo(
    () => contributions ? buildStewardQueue({ contributions, items: front.items, campaignStatus: status }) : null,
    [contributions, front.items, status],
  );
  const counts = useMemo(() => {
    const list = contributions ?? [];
    return {
      waiting: list.filter((c) => c.status === "pending").length,
      accepted: list.filter((c) => c.status === "accepted").length,
      delivered: list.filter((c) => c.status === "fulfilled" || c.status === "thanked").length,
    };
  }, [contributions]);

  const [focus, setFocus] = useState<{ tab: OfferTab; nonce: number } | null>(null);
  const jump = (tab: OfferTab) => {
    setFocus({ tab, nonce: Date.now() });
    scrollToId("claims");
  };

  const utils = trpc.useUtils();
  const refreshAll = () => {
    utils.campaigns.getContributionsForOwner.invalidate({ campaignId });
    onChanged();
  };

  const submitForReview = trpc.campaigns.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Sent for review. The ReGen Civics team will take a look.");
      onChanged();
    },
    onError: (err) => toast.error(err.message || "Couldn't send it for review. Try again."),
  });

  // Stored on the campaign (campaigns.setReadinessTick) so the review team sees them.
  const readiness = READINESS_STATUSES.includes(status) ? (
    <>
      <p className="text-sm font-semibold text-[#1a472a] mb-2">The review checks these eight before approving:</p>
      <CrowdpoolReadiness framed={false} campaignId={campaignId} id={`ready-campaign-${campaignId}`} />
    </>
  ) : null;

  const canCancel = canTransition(status, "cancelled", "steward") || (isAdmin && canTransition(status, "cancelled", "admin"));

  return (
    <div id="steward-tools" className="scroll-mt-24 space-y-6">
      <div className="px-1">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Steward tools</h2>
        <p className="text-sm text-white/80">
          Only this project's stewards see this part of the page.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        <WaitingOnYou
          queue={queue}
          loading={contributionsLoading}
          onJump={jump}
          onSendForReview={() => scrollToId("campaign-status")}
        />
        <CampaignStewardStats
          campaignId={campaignId}
          progress={front.progress}
          band={settings?.moneyShare ?? CASH_SHARE}
          contributorsCount={front.contributorsCount ?? 0}
          counts={counts}
          formatCurrency={formatCurrency}
        />
      </div>

      <ContributionReviewPanel
        campaignId={campaignId}
        items={front.items}
        formatCurrency={formatCurrency}
        focus={focus}
        onChanged={onChanged}
      />

      <MoneyRoutesCard
        campaignId={campaignId}
        isExample={!!front.isDemo}
        closed={closed}
        isAdmin={isAdmin}
        currencySymbol={currencySymbolFor(front.currency)}
      />

      <NeedsGlance items={front.items} canEditHours={!closed} onChanged={refreshAll} />

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {!closed ? (
          <CampaignUpdatesComposer campaignId={campaignId} onPosted={onChanged} />
        ) : (
          <section id="updates-composer" className={card}>
            <p className="text-sm text-[#1a472a]/80">This campaign is closed, so it takes no new updates.</p>
          </section>
        )}

        <section id="followers" className={card}>
          <h2 className={heading} style={{ fontFamily: "var(--font-display)" }}>
            <Users className="w-5 h-5 text-[#4a7c59]" />
            Followers
          </h2>
          <p className="text-sm text-[#1a472a]/80">
            {followers
              ? `${followers.accounts} following with an account, ${followers.emails} following by email`
              : "Counting followers..."}
          </p>
          <p className="text-xs text-[#1a472a]/70 mt-2">
            Email followers hear from the ReGen Civics team, who send letters to them from the admin tools.
          </p>
        </section>
      </div>

      <section id="photos" className={card}>
        <h2 className={heading} style={{ fontFamily: "var(--font-display)" }}>
          <Camera className="w-5 h-5 text-[#4a7c59]" />
          Photos
        </h2>
        <p className="text-sm text-[#1a472a]/75 mb-4">
          Photos of your land, team and progress. They show on your campaign card and pages.
        </p>
        <CampaignImageUpload campaignId={campaignId} />
      </section>

      <section id="campaign-status" className={card}>
        <h2 className={heading} style={{ fontFamily: "var(--font-display)" }}>
          <Flag className="w-5 h-5 text-[#4a7c59]" />
          Campaign status
        </h2>
        {status === "draft" && (
          <div className="mt-2 mb-6">
            <p className="text-sm text-[#1a472a]/80 mb-3">
              This campaign is a draft. Only stewards can see it. When it's ready, send it to the ReGen Civics team for review.
            </p>
            <div className="mb-4">{readiness}</div>
            <Button
              onClick={() => submitForReview.mutate({ id: campaignId })}
              disabled={submitForReview.isPending}
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white"
            >
              {submitForReview.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send for review
            </Button>
          </div>
        )}
        {status === "pending_review" && (
          <p className="text-sm text-[#1a472a]/80 mt-2 mb-6">In review. The ReGen Civics team will look at it and let you know.</p>
        )}
        {status === "rejected" && (
          <p className="text-sm text-[#1a472a]/80 mt-2 mb-6">The review team sent this campaign back. Check your notifications for their notes.</p>
        )}
        {(status === "pending_review" || status === "rejected") && <div className="mb-6">{readiness}</div>}
        {status === "active" && (
          <p className="text-sm text-[#1a472a]/80 mt-2 mb-6">Live and open for offers.</p>
        )}
        {closed && (
          <p className="text-sm text-[#1a472a]/80 mt-2">
            {status === "cancelled" ? "This campaign is cancelled." : "This campaign is complete."}
          </p>
        )}
        {canCancel && (
          <div className="border-t border-[#1a472a]/10 pt-4">
            <h3 className="font-semibold text-[#1a472a] mb-2">Cancel this campaign</h3>
            <CancelCampaignDialog
              campaignId={campaignId}
              campaignTitle={decodeBasicEntities(front.title)}
              onCancelled={onCancelled}
            />
          </div>
        )}
      </section>
    </div>
  );
}
