/**
 * Offers by need: every contribution to this campaign, grouped by the need
 * it answers, each group with tabs for Waiting, Accepted, Delivered, Thanked
 * and Closed. Stewards only; the server refuses anyone else
 * (campaigns.getContributionsForOwner and every action behind the dialog).
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Loader2 } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import { isHoursNeed, roleFillState } from "@shared/roleCapacity";
import { OFFER_TABS, OFFER_TAB_LABELS, groupOffersByNeed, type OfferTab } from "@shared/stewardQueue";
import { KIND_CHIP_CLASSES, KIND_LABELS, kindForItem, titleForItem } from "@/lib/needDisplay";
import { ContributionCard, type CampaignNeed, type ContributionAction, type OwnerContribution } from "./ContributionCard";
import { AcceptDialog } from "./AcceptDialog";

const EMPTY_TEXT: Record<OfferTab, string> = {
  waiting: "No offers waiting on you here.",
  accepted: "Nobody accepted here yet.",
  delivered: "Nothing delivered here yet.",
  thanked: "No thanks sent here yet.",
  closed: "Nothing closed here.",
};

function firstTabWithOffers(byTab: Record<OfferTab, unknown[]>): OfferTab {
  return OFFER_TABS.find((t) => byTab[t].length > 0) ?? "waiting";
}

export function ContributionReviewPanel({
  campaignId,
  items,
  formatCurrency,
  focus,
  onChanged,
}: {
  campaignId: number;
  items: CampaignNeed[];
  formatCurrency: (amount: number) => string;
  /** Set by "Waiting on you": open this tab in every group. The nonce re-applies it. */
  focus?: { tab: OfferTab; nonce: number } | null;
  /** Something changed on the server (needs, totals): refresh the page's data. */
  onChanged: () => void;
}) {
  const { data: contributions, isLoading, error, refetch } = trpc.campaigns.getContributionsForOwner.useQuery(
    { campaignId },
    { retry: false },
  );

  const groups = useMemo(
    () => groupOffersByNeed(contributions ?? [], items),
    [contributions, items],
  );

  const [tabs, setTabs] = useState<Record<string, OfferTab>>({});
  useEffect(() => {
    if (!focus) return;
    const next: Record<string, OfferTab> = {};
    for (const g of groups) next[g.key] = focus.tab;
    setTabs(next);
  }, [focus?.nonce]);

  const [selected, setSelected] = useState<OwnerContribution | null>(null);
  const [action, setAction] = useState<ContributionAction | null>(null);
  const [formalizingId, setFormalizingId] = useState<number | null>(null);

  const itemsById = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const needFor = (c: OwnerContribution | null): CampaignNeed | null =>
    c?.campaignItemId != null ? itemsById.get(c.campaignItemId) ?? null : null;

  const formalizeMutation = trpc.campaigns.formalizeOnHypha.useMutation({
    onSuccess: (res: any) => {
      toast.success("Bridge ready. Hypha opens to finish formalizing.");
      if (res?.bridgeUrl) window.location.href = res.bridgeUrl;
    },
    onError: (err) => toast.error(err.message || "Could not formalize on Hypha"),
    onSettled: () => setFormalizingId(null),
  });

  const onAction = (a: ContributionAction, c: OwnerContribution) => {
    setSelected(c);
    setAction(a);
  };

  return (
    <section id="claims" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <Inbox className="w-5 h-5 text-[#4a7c59]" />
        Offers by need
      </h2>
      <p className="text-sm text-[#1a472a]/75 mb-4">
        Everyone who offered something, grouped by what they offered it for.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[#1a472a]/75 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading offers...
        </div>
      ) : error ? (
        <p className="text-sm text-red-700 py-4">{error.message || "Couldn't load the offers."}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[#1a472a]/75 py-4">
          No offers yet. When someone offers something, it shows up here for you to answer.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const hoursNeed = isHoursNeed(g.item);
            const fill = g.item && hoursNeed ? roleFillState(g.item) : null;
            const kind = g.item ? kindForItem(g.item) : null;
            const current = tabs[g.key] ?? firstTabWithOffers(g.byTab);
            return (
              <div key={g.key} className="border border-[#1a472a]/10 rounded-2xl p-3 sm:p-4 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {kind && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KIND_CHIP_CLASSES[kind] || "bg-gray-100 text-gray-700"}`}>
                      {KIND_LABELS[kind] || kind}
                    </span>
                  )}
                  {fill?.filled && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#4a7c59] text-white">Filled</span>
                  )}
                </div>
                <h3 className="font-bold text-[#1a472a] break-words">
                  {g.item ? decodeBasicEntities(titleForItem(g.item)) : "Other offers"}
                </h3>
                {fill && (
                  <p className="text-xs text-[#1a472a]/80 mb-2">
                    {fill.accepted} of {fill.needed} hours a week filled
                  </p>
                )}
                <Tabs value={current} onValueChange={(v) => setTabs((t) => ({ ...t, [g.key]: v as OfferTab }))} className="w-full mt-2">
                  <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full justify-start">
                    {OFFER_TABS.map((t) => (
                      <TabsTrigger key={t} value={t} className="text-xs sm:text-sm flex-none">
                        {OFFER_TAB_LABELS[t]} ({g.byTab[t].length})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {OFFER_TABS.map((t) => (
                    <TabsContent key={t} value={t} className="mt-3">
                      {g.byTab[t].length === 0 ? (
                        <p className="text-sm text-[#1a472a]/70 py-3">{EMPTY_TEXT[t]}</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {g.byTab[t].map((c) => (
                            <ContributionCard
                              key={c.id}
                              contribution={c}
                              need={g.item}
                              formatCurrency={formatCurrency}
                              onAction={onAction}
                              onFormalize={(fc) => { setFormalizingId(fc.id); formalizeMutation.mutate({ contributionId: fc.id }); }}
                              formalizing={formalizeMutation.isPending && formalizingId === c.id}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            );
          })}
        </div>
      )}

      <AcceptDialog
        contribution={selected}
        action={action}
        need={needFor(selected)}
        formatCurrency={formatCurrency}
        onClose={() => { setSelected(null); setAction(null); }}
        onDone={() => { refetch(); onChanged(); }}
      />
    </section>
  );
}
