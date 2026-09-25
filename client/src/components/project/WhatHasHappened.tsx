/**
 * What has happened on a campaign (build spec 2026-09-25, section 8.6): the
 * signed-in viewer's own contributions first, then one timeline built by
 * shared/campaignProgress.ts buildCampaignTimeline from the updates and the
 * campaign's activity, newest first, with the close date ahead on top.
 *
 * Replaced the old campaign page's milestones (whose "25% funded" and "goal
 * reached" steps came from a third total), its contributors list, its Pool
 * Ledger and its updates journal. id="updates" so every notice that links to
 * a campaign's updates still lands here. No money figure appears here.
 */
import { useMemo, useState } from "react";
import { BookOpen, CalendarClock, CheckCircle2, Flag, Gift, HandHeart, History, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { decodeBasicEntities } from "@shared/htmlText";
import { buildCampaignTimeline, type TimelineEntry, type TimelineInput } from "@shared/campaignProgress";
import { PAGE } from "@shared/crowdpoolCopy";
import type { CampaignUpdateRow } from "./CampaignUpdatesList";
import { YourContributions } from "./YourContributions";
import type { CampaignNeed } from "./ContributionCard";

const SHOWN_AT_FIRST = 6;

const ICONS: Record<TimelineEntry["kind"], typeof History> = {
  closes: CalendarClock,
  update: BookOpen,
  accepted: HandHeart,
  delivered: CheckCircle2,
  thanked: Gift,
  opened: Flag,
  complete: CheckCircle2,
  cancelled: XCircle,
};

function dayLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function WhatHasHappened({
  campaign,
  progress,
  updates,
  yourContributions,
}: {
  campaign: TimelineInput["campaign"] & { id: number };
  progress: TimelineInput["progress"];
  updates: CampaignUpdateRow[] | undefined | null;
  /** The viewer's own offers to this project, shown first when signed in. */
  yourContributions?: { campaignIds: number[]; campaignTitles: Record<number, string>; items: CampaignNeed[] };
}) {
  const { isAuthenticated } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const { data: activity } = trpc.campaigns.getActivity.useQuery({ campaignId: campaign.id, limit: 50 });

  const entries = useMemo(
    () => buildCampaignTimeline({
      campaign,
      progress,
      activity: (activity ?? []).map((a) => ({
        id: a.id,
        kind: a.kind,
        contributorName: a.contributorName ?? "",
        title: a.title ?? "",
        contributionType: a.contributionType,
        at: a.at,
      })),
      updates: (updates ?? []).map((u) => ({ id: u.id, updateNumber: u.updateNumber, title: u.title, body: u.body, publishedAt: u.publishedAt ?? null })),
    }),
    [campaign, progress, activity, updates],
  );
  const imagesByUpdate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const u of updates ?? []) {
      if (Array.isArray(u.imageUrls) && u.imageUrls.length > 0) m.set(`update-${u.id}`, u.imageUrls as string[]);
    }
    return m;
  }, [updates]);

  const shown = showAll ? entries : entries.slice(0, SHOWN_AT_FIRST);

  return (
    <section id="updates" aria-labelledby="updates-heading" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 id="updates-heading" className="text-xl font-bold text-[#1a472a] mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <History className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
        {PAGE.whatHasHappened}
      </h2>

      {isAuthenticated && yourContributions && <YourContributions {...yourContributions} variant="inline" />}

      {entries.length === 0 ? (
        <p className="text-sm text-[#1a472a]/80">{PAGE.whatHasHappenedEmpty}</p>
      ) : (
        <>
          <ol className="space-y-3">
            {shown.map((e) => {
              const Icon = ICONS[e.kind] ?? History;
              const images = imagesByUpdate.get(e.key);
              return (
                <li key={e.key} className={`flex items-start gap-3 rounded-xl p-3 ${e.upcoming ? "border border-dashed border-[#4a7c59]/40" : "bg-[#f0f7f0]"}`}>
                  <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0" aria-hidden="true">
                    <Icon className="w-4 h-4 text-[#4a7c59]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1a472a] break-words">{decodeBasicEntities(e.text)}</p>
                    {!e.upcoming && e.at && <p className="text-xs text-[#1a472a]/75">{dayLabel(e.at)}</p>}
                    {e.body && (
                      <p className="text-sm text-[#1a472a]/85 mt-1 whitespace-pre-line break-words">{decodeBasicEntities(e.body)}</p>
                    )}
                    {images && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {images.map((url, idx) => (
                          <img key={idx} src={url} alt={`${decodeBasicEntities(e.text)}, photo ${idx + 1}`} className="w-24 h-24 object-cover rounded-lg" loading="lazy" />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {entries.length > SHOWN_AT_FIRST && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 inline-flex items-center min-h-11 pointer-coarse:min-h-11 text-sm font-semibold text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
            >
              {PAGE.seeEverything(entries.length)}
            </button>
          )}
        </>
      )}
    </section>
  );
}
