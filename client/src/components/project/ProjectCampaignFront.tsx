/**
 * The project's campaign, the heart of the project page (build spec
 * 2026-09-25, section 8.1, items 5 to 8), in phone order:
 *
 *   the campaign card (#campaign): title, status, the two-line bar with the
 *     completion line and a light strip;
 *   What can you bring? (#bring): chips that filter the needs;
 *   the needs (#needs for visitors), ending with "Something else to offer?"
 *     and the closed "Try filling a need" disclosure;
 *   Putting money in (#money).
 *
 * Every figure comes from front.progress (shared/campaignProgress.ts). Every
 * way in (a need's Apply, Offer or Sign up, the freeform offer, the
 * simulator's button, a ?offer= link from the Needs tab) opens the same
 * offer sheet. Its receipt is the confirmation, so no toast repeats it.
 *
 * The page adds no fixed or sticky element: the bottom navigation is always
 * on screen on a phone.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, Lock, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ContributionModal, type ContributionNeed } from "@/components/ContributionModal";
import { NeedsRegistry, inKindNeeds } from "@/components/campaign-needs/NeedsRegistry";
import { toContributionNeed } from "@/components/campaign-needs/NeedCard";
import { TwoLineBar } from "@/components/crowdpool/TwoLineBar";
import { WholeAskSheet } from "@/components/crowdpool/WholeAskSheet";
import { BringChips, needMatchesChips } from "@/components/crowdpool/BringChips";
import { MoneyBlock } from "@/components/crowdpool/MoneyBlock";
import { PledgeSimulator } from "@/components/crowdpool/PledgeSimulator";
import { decodeBasicEntities } from "@shared/htmlText";
import { progressLines } from "@shared/campaignProgress";
import { capitalForItem, type NeedChip } from "@shared/crowdpoolNeedAction";
import { PAGE } from "@shared/crowdpoolCopy";
import { CAMPAIGN_STATUS_CLASSES, CAMPAIGN_STATUS_LABELS, makeCurrencyFormatter } from "@/lib/needDisplay";
import type { ProjectFront } from "./StewardTools";

function scrollToId(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

/** ?offer={needId} from the Needs tab, once. */
function readOfferParam(): number | null {
  if (typeof window === "undefined") return null;
  const n = Number(new URLSearchParams(window.location.search).get("offer"));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Drop ?offer= from the address without a navigation, keeping every other parameter and the #anchor. */
function clearOfferParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("offer")) return;
  url.searchParams.delete("offer");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function ProjectCampaignFront({ front, onContributed, needsAnchor, projectName, canonicalPath }: {
  front: ProjectFront;
  onContributed: () => void;
  /** Give the needs list the #needs anchor (visitors). Stewards have #needs on their tools. */
  needsAnchor: boolean;
  projectName: string;
  /** The project page's canonical path, for share links. */
  canonicalPath: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [need, setNeed] = useState<ContributionNeed | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chips, setChips] = useState<NeedChip[]>([]);
  const [tryOpen, setTryOpen] = useState(false);
  const formatCurrency = useMemo(() => makeCurrencyFormatter(front.currency), [front.currency]);
  const progress = front.progress;
  const active = front.status === "active";
  const cancelled = front.status === "cancelled";
  // Example campaigns take practice runs: every way in works, and the server
  // writes nothing (campaigns.submitContribution returns practice:true).
  const isExample = !!front.isDemo;
  const unpublished = front.status === "draft" || front.status === "pending_review" || front.status === "rejected";
  const title = decodeBasicEntities(front.title);
  const lines = useMemo(() => progressLines(progress, formatCurrency), [progress, formatCurrency]);

  const { data: settings } = trpc.campaigns.crowdpoolSettings.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const { data: routes } = trpc.campaigns.getPartnerLinks.useQuery({ campaignId: front.id }, { staleTime: 5 * 60 * 1000 });
  const maEarthVerified = (routes ?? []).some((r) => r.partner === "maearth" && r.status === "verified");

  const needs = useMemo(() => inKindNeeds(front.items), [front.items]);
  const shownCount = useMemo(() => needs.filter((n) => needMatchesChips(n, chips)).length, [needs, chips]);

  const openNeed = useCallback((n: ContributionNeed | null) => {
    setNeed(n);
    setShowModal(true);
  }, []);

  // A link to one need (#need-12) shows every need first, so the card it
  // names is on the page to scroll to.
  useEffect(() => {
    const clearForNeedHash = () => { if (window.location.hash.startsWith("#need-")) setChips([]); };
    window.addEventListener("hashchange", clearForNeedHash);
    window.addEventListener("pushState", clearForNeedHash);
    return () => {
      window.removeEventListener("hashchange", clearForNeedHash);
      window.removeEventListener("pushState", clearForNeedHash);
    };
  }, []);

  // ?offer={needId} (the Needs tab): open the sheet for that need, once,
  // when the campaign is live and the need is still open; then drop it from
  // the address so a reload or a shared link doesn't open it again.
  useEffect(() => {
    const offerId = readOfferParam();
    if (!offerId) return;
    const item = front.items.find((it) => it.id === offerId);
    const np = progress.byNeed[offerId];
    if (active && item && np && !np.filled) {
      openNeed(toContributionNeed(item, capitalForItem(item), np));
    }
    clearOfferParam();
    // Once per campaign: the component is keyed by campaign id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seeNeeds = (capital: string) => {
    setSheetOpen(false);
    setChips([]);
    scrollToId(`capital-${capital}`);
  };
  const seeMoney = () => {
    setSheetOpen(false);
    scrollToId("money");
  };

  const campaignPath = `${canonicalPath}?campaign=${front.id}`;
  const sharePath = need ? `${campaignPath}#need-${need.id}` : campaignPath;

  return (
    <>
      <section id="campaign" className="scroll-mt-24">
        <div className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4a7c59] mb-1">
            {active ? PAGE.liveCampaign : "Campaign"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
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

          <TwoLineBar
            progress={progress}
            formatCurrency={formatCurrency}
            variant="full"
            settings={settings}
            onOpenSheet={() => setSheetOpen(true)}
            maEarthVerified={maEarthVerified}
          />
        </div>
      </section>

      <BringChips
        items={needs}
        byNeed={progress.byNeed}
        selected={chips}
        onChange={setChips}
        showMoney={progress.money.ask > 0 || progress.money.hasRoutes}
        onMoney={() => scrollToId("money")}
        shownCount={shownCount}
        totalCount={needs.length}
      />

      <div id={needsAnchor ? "needs" : "project-needs"} className="scroll-mt-24">
        <NeedsRegistry
          items={front.items}
          campaignActive={active}
          claimsHidden={cancelled}
          formatCurrency={formatCurrency}
          onClaim={openNeed}
          byNeed={progress.byNeed}
          filter={chips}
          projectName={projectName}
          isExample={isExample}
        >
          {active && (
            <div className="rounded-2xl border border-[#4a7c59]/25 bg-gradient-to-r from-[#f0f7f0] to-[#f0f7f0]/40 p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#1a472a] p-2 shrink-0" aria-hidden="true">
                  <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#1a472a] mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
                    {PAGE.somethingElse}
                  </h3>
                  <p className="text-sm text-[#1a472a]/80">
                    Hours, tools, land, a skill, a spare room, a network. Add up everything you could
                    bring in the Crowd Pooling Tool, then place it where you want it to go.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Button
                      className="min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white"
                      onClick={() => openNeed(null)}
                    >
                      {PAGE.offerSomethingElse}
                    </Button>
                    <Link
                      href="/crowd-pooling"
                      className="inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-[#1a472a] underline underline-offset-2 hover:text-[#4a7c59]"
                    >
                      Total up what you can bring
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          {needs.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#1a472a]/10">
              <button
                type="button"
                onClick={() => setTryOpen((o) => !o)}
                aria-expanded={tryOpen}
                aria-controls="try-filling-body"
                className="w-full flex items-center justify-between gap-2 text-left px-4 py-3 min-h-11 pointer-coarse:min-h-11"
              >
                <span className="font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>{PAGE.tryFillingNeed}</span>
                <ChevronDown className={`w-5 h-5 text-[#4a7c59] transition-transform ${tryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {tryOpen && (
                <div id="try-filling-body" className="px-4 pb-4">
                  <PledgeSimulator
                    items={needs}
                    currency={front.currency || undefined}
                    onPick={active ? (item) => openNeed(toContributionNeed(item, capitalForItem(item), progress.byNeed[item.id])) : undefined}
                    canPick={(item) => !progress.byNeed[item.id]?.filled}
                  />
                </div>
              )}
            </div>
          )}
        </NeedsRegistry>
      </div>

      <MoneyBlock routes={routes} money={progress.money} currency={progress.currency} />

      <WholeAskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        progress={progress}
        formatCurrency={formatCurrency}
        onSeeNeeds={seeNeeds}
        onSeeMoney={seeMoney}
      />

      <ContributionModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNeed(null); }}
        campaignId={front.id}
        campaignTitle={title}
        currency={front.currency || "USD"}
        need={need ?? undefined}
        afterSignUpAnchor="your-contributions"
        projectName={projectName}
        completionLine={lines.completion}
        sharePath={sharePath}
        isExample={isExample}
        isFollowing={!!front.isFollowing}
        onFollowed={onContributed}
        onSuccess={({ practice }) => {
          // A practice run wrote nothing: no refetch. The receipt is the
          // confirmation, so there is no toast here.
          if (practice) return;
          onContributed();
        }}
      />
    </>
  );
}
