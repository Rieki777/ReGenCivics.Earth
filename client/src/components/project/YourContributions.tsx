/**
 * The signed-in viewer's own offers to this project, with where each one
 * stands in plain words and the stewards' thank-you when there is one.
 * Reads campaigns.myContributions and keeps the rows for this project's
 * campaigns. Renders nothing for someone who has offered nothing here.
 *
 * On the project page it sits at the top of "What has happened"
 * (variant "inline"), and keeps id="your-contributions" so the sign-in link
 * from the offer sheet's receipt lands on it.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Gift, HandHeart } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import { isHoursNeed } from "@shared/roleCapacity";
import { contributorStatusLabel } from "@shared/stewardQueue";
import { formatShortDay, toDay } from "@shared/crowdpoolNeedAction";
import type { CampaignNeed } from "./ContributionCard";

/** "Lending 1 Apr to 30 Jun", or null for anything that is not a loan. */
function lendLine(c: { offerMode?: string | null; availableFrom?: string | Date | null; lendUntil?: string | Date | null; returnedAt?: string | Date | null }): string | null {
  if (c.offerMode !== "lend") return null;
  if (c.returnedAt) return "Returned to you";
  const from = toDay(c.availableFrom ?? null);
  const until = toDay(c.lendUntil ?? null);
  if (from && until) return `Lending ${formatShortDay(from)} to ${formatShortDay(until)}`;
  if (until) return `Lending until ${formatShortDay(until)}`;
  return "Lending";
}

export function YourContributions({
  campaignIds,
  campaignTitles,
  items,
  variant = "card",
}: {
  campaignIds: number[];
  campaignTitles: Record<number, string>;
  /** Needs of the front campaign, to read hours on an hours need. */
  items: CampaignNeed[];
  variant?: "card" | "inline";
}) {
  const { data } = trpc.campaigns.myContributions.useQuery(undefined, { staleTime: 30_000 });
  const ids = useMemo(() => new Set(campaignIds), [campaignIds]);
  const hoursItems = useMemo(() => new Set(items.filter((it) => isHoursNeed(it)).map((it) => it.id)), [items]);
  const mine = (data ?? []).filter((c) => ids.has(c.campaignId));
  if (mine.length === 0) return null;
  const manyCampaigns = new Set(mine.map((c) => c.campaignId)).size > 1;

  const list = (
    <ul className="space-y-3">
      {mine.map((c) => {
        const hours = c.campaignItemId != null && hoursItems.has(c.campaignItemId) && c.status === "accepted"
          ? c.quantityPledged
          : null;
        const lend = lendLine(c as Parameters<typeof lendLine>[0]);
        return (
          <li key={c.id} className="rounded-xl bg-[#f0f7f0] p-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#1a472a] break-words">{decodeBasicEntities(c.title)}</p>
                {manyCampaigns && campaignTitles[c.campaignId] && (
                  <p className="text-xs text-[#1a472a]/75 break-words">{decodeBasicEntities(campaignTitles[c.campaignId])}</p>
                )}
                {lend && <p className="text-xs text-[#1a472a]/75">{lend}</p>}
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-[#1a472a]">
                {contributorStatusLabel(c.status, hours)}
              </span>
            </div>
            {c.status === "thanked" && c.acknowledgedNote && (
              <p className="mt-2 flex items-start gap-2 text-sm text-[#1a472a]/85 break-words">
                <Gift className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                <span className="min-w-0">{decodeBasicEntities(c.acknowledgedNote)}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (variant === "inline") {
    return (
      <div id="your-contributions" className="scroll-mt-24 mb-6">
        <h3 className="text-base font-bold text-[#1a472a] mb-2 flex items-center gap-2">
          <HandHeart className="w-4 h-4 text-[#4a7c59]" aria-hidden="true" />
          Your contributions
        </h3>
        {list}
      </div>
    );
  }

  return (
    <section id="your-contributions" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <HandHeart className="w-5 h-5 text-[#4a7c59]" />
        Your contributions
      </h2>
      {list}
    </section>
  );
}
