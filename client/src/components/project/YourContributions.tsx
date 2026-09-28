/**
 * The signed-in viewer's own offers to this project, with where each one
 * stands in plain words and the stewards' thank-you when there is one.
 * Reads campaigns.myContributions and keeps the rows for this project's
 * campaigns. Renders nothing for someone who has offered nothing here.
 *
 * On the project page it sits at the top of "What has happened"
 * (variant "inline"), and keeps id="your-contributions" so the sign-in link
 * from the offer sheet's receipt lands on it.
 *
 * Build spec 2026-09-27 (sections 10.6 and 11.4):
 *   - "Needs you" at the top: each accepted offer with an arrival note
 *     (campaigns.myArrivalNotes) gets a line that opens the note inline.
 *     Delivered and thanked offers keep their note, closed, under the row.
 *   - Withdraw on offers still waiting, with the same dialog as the offer
 *     status page (campaigns.withdrawContribution, which checks the owner by
 *     account or by the offer's email without case).
 */
import { useMemo, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronDown, Gift, HandHeart, MapPin } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import { isHoursNeed } from "@shared/roleCapacity";
import { contributorStatusLabel } from "@shared/stewardQueue";
import { formatShortDay, toDay } from "@shared/crowdpoolNeedAction";
import { ARRIVAL, LINK, YOUR_OFFERS } from "@shared/crowdpoolCopy";
import type { ResolvedArrivalNote } from "@shared/offerStatus";
import { ArrivalNoteView } from "@/components/crowdpool/ArrivalNoteView";
import { WithdrawOfferDialog } from "@/components/crowdpool/WithdrawOfferDialog";
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

/** Delivered and thanked offers keep their arrival note, closed until opened. */
const KEEPS_NOTE = ["fulfilled", "thanked"];

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
  const utils = trpc.useUtils();
  const { data } = trpc.campaigns.myContributions.useQuery(undefined, { staleTime: 30_000 });
  const { data: arrival } = trpc.campaigns.myArrivalNotes.useQuery(undefined, { staleTime: 30_000 });
  const withdraw = trpc.campaigns.withdrawContribution.useMutation();

  const ids = useMemo(() => new Set(campaignIds), [campaignIds]);
  const hoursItems = useMemo(() => new Set(items.filter((it) => isHoursNeed(it)).map((it) => it.id)), [items]);
  const notesById = useMemo(
    () => new Map<number, ResolvedArrivalNote>((arrival ?? []).map((a) => [a.contributionId, a.note])),
    [arrival],
  );

  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({});
  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  // After a withdraw the row's Withdraw button goes, so focus lands on this
  // section's heading instead of the top of the page (review 2026-09-28).
  const withdrewRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const mine = (data ?? []).filter((c) => ids.has(c.campaignId));
  if (mine.length === 0) return null;
  const manyCampaigns = new Set(mine.map((c) => c.campaignId)).size > 1;
  const needsYou = mine.filter((c) => c.status === "accepted" && notesById.has(c.id));

  const toggle = (id: number) => setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));

  const confirmWithdraw = async () => {
    if (withdrawing == null) return;
    setWithdrawError(null);
    try {
      await withdraw.mutateAsync({ contributionId: withdrawing });
      withdrewRef.current = true;
      setWithdrawing(null);
      setLiveMessage(LINK.withdrawn);
      await utils.campaigns.myContributions.invalidate();
    } catch (err) {
      setWithdrawError((err as { message?: string })?.message || LINK.withdrawFailed);
    }
  };

  const lane = needsYou.length > 0 ? (
    <ul className="space-y-2 mb-3" data-testid="needs-you">
      {needsYou.map((c) => {
        const open = !!openNotes[c.id];
        const panelId = `arrival-note-${c.id}`;
        return (
          <li key={c.id} className="min-w-0">
            <button
              type="button"
              onClick={() => toggle(c.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className="w-full min-h-11 flex items-center gap-2 rounded-xl bg-amber-50 hover:bg-amber-100 p-3 text-left text-sm font-semibold text-amber-900"
            >
              <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0 break-words">{ARRIVAL.needsYou(decodeBasicEntities(c.title))}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div id={panelId} hidden={!open} className="mt-2">
              {open && <ArrivalNoteView note={notesById.get(c.id)} headingLevel={4} />}
            </div>
          </li>
        );
      })}
    </ul>
  ) : null;

  const list = (
    <ul className="space-y-3">
      {mine.map((c) => {
        const hours = c.campaignItemId != null && hoursItems.has(c.campaignItemId) && c.status === "accepted"
          ? c.quantityPledged
          : null;
        const lend = lendLine(c as Parameters<typeof lendLine>[0]);
        const title = decodeBasicEntities(c.title);
        const keptNote = KEEPS_NOTE.includes(c.status) ? notesById.get(c.id) : undefined;
        const noteOpen = !!openNotes[c.id];
        const panelId = `arrival-note-row-${c.id}`;
        return (
          <li key={c.id} className="rounded-xl bg-[#f0f7f0] p-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#1a472a] break-words">{title}</p>
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
            {c.status === "pending" && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setWithdrawError(null); withdrewRef.current = false; setWithdrawing(c.id); }}
                  aria-label={YOUR_OFFERS.withdrawLabel(title)}
                  className="min-h-11 border-[#1a472a]/30 text-[#1a472a] bg-white"
                >
                  {YOUR_OFFERS.withdraw}
                </Button>
              </div>
            )}
            {keptNote && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-expanded={noteOpen}
                  aria-controls={panelId}
                  className="min-h-11 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a472a] underline underline-offset-2"
                >
                  {noteOpen ? ARRIVAL.hide : ARRIVAL.show}
                </button>
                <div id={panelId} hidden={!noteOpen} className="mt-1">
                  {noteOpen && <ArrivalNoteView note={keptNote} headingLevel={4} />}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const body = (
    <>
      <p className="sr-only" role="status" aria-live="polite">{liveMessage}</p>
      {lane}
      {list}
      <WithdrawOfferDialog
        open={withdrawing != null}
        onOpenChange={(o) => { if (!o) setWithdrawing(null); }}
        onConfirm={confirmWithdraw}
        pending={withdraw.isPending}
        error={withdrawError}
        closeFocusTarget={() => (withdrewRef.current ? headingRef.current : null)}
      />
    </>
  );

  if (variant === "inline") {
    return (
      <div id="your-contributions" className="scroll-mt-24 mb-6">
        <h3 ref={headingRef} tabIndex={-1} className="text-base font-bold text-[#1a472a] mb-2 flex items-center gap-2 outline-none">
          <HandHeart className="w-4 h-4 text-[#4a7c59]" aria-hidden="true" />
          Your contributions
        </h3>
        {body}
      </div>
    );
  }

  return (
    <section id="your-contributions" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2 outline-none" style={{ fontFamily: "var(--font-display)" }}>
        <HandHeart className="w-5 h-5 text-[#4a7c59]" />
        Your contributions
      </h2>
      {body}
    </section>
  );
}
