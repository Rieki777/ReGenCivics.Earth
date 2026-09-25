/**
 * Every need of the campaign with how full it is, for the project's
 * stewards. A role measured in hours a week reads in hours and can have the
 * hours it needs changed here (campaigns.setNeedHours, stewards only on the
 * server). Raising the hours is how a steward reopens a filled role.
 */
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Target } from "lucide-react";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import { decodeBasicEntities } from "@shared/htmlText";
import { MAX_ROLE_HOURS, fullTimeLabel, isHoursNeed, roleFillState } from "@shared/roleCapacity";
import { REOPEN_NOTICE_ON_RAISE } from "@shared/stewardQueue";
import { KIND_CHIP_CLASSES, KIND_LABELS, capitalForItem, kindForItem, titleForItem } from "@/lib/needDisplay";
import type { CampaignNeed } from "./ContributionCard";

function NeedHoursForm({ item, accepted, filled, onSaved }: {
  item: CampaignNeed;
  accepted: number;
  /** The role is filled now, so raising its hours opens it up again. */
  filled: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState(String(item.quantityWanted));
  const [error, setError] = useState<string | null>(null);
  const mutation = trpc.campaigns.setNeedHours.useMutation({
    onSuccess: () => {
      toast.success("Hours saved.");
      setOpen(false);
      onSaved();
    },
    onError: (err) => setError(err.message || "That didn't go through. Try again."),
  });

  const value = /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  const localError = !Number.isInteger(value) || value < 1
    ? "Hours need to be a whole number, 1 or more."
    : value > MAX_ROLE_HOURS
      ? `A role can ask for up to ${MAX_ROLE_HOURS} hours a week.`
      : value < accepted
        ? `${accepted} hours a week are already accepted. Release someone or lower their hours first.`
        : null;

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="mt-2 border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white"
        onClick={() => { setRaw(String(item.quantityWanted)); setError(null); setOpen(true); }}
      >
        Change hours needed
      </Button>
    );
  }
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (localError) return;
        mutation.mutate({ itemId: item.id, hoursNeeded: value });
      }}
    >
      <Label htmlFor={`need-hours-${item.id}`} className="text-xs">Hours a week this role needs</Label>
      <div className="flex gap-2">
        <Input
          id={`need-hours-${item.id}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={raw}
          onChange={(e) => { setRaw(e.target.value.replace(/[^\d]/g, "").slice(0, 5)); setError(null); }}
          className="bg-white w-28"
          aria-invalid={!!(localError || error)}
        />
        <Button type="submit" size="sm" disabled={mutation.isPending || !!localError} className="bg-[#4a7c59] hover:bg-[#1a472a] text-white">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Not now</Button>
      </div>
      {!localError && Number.isInteger(value) && <p className="text-xs text-[#1a472a]/75">That is {fullTimeLabel(value)}.</p>}
      {!localError && filled && value > item.quantityWanted && (
        <p className="text-xs text-[#1a472a]/75">{REOPEN_NOTICE_ON_RAISE}</p>
      )}
      {(error || (localError && raw !== "")) && <p className="text-xs text-red-600" role="alert">{error || localError}</p>}
    </form>
  );
}

export function NeedsGlance({ items, canEditHours, onChanged }: {
  items: CampaignNeed[];
  /** Hours can change while the campaign is still open (not cancelled or complete). */
  canEditHours: boolean;
  onChanged: () => void;
}) {
  return (
    <section id="needs" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <Target className="w-5 h-5 text-[#4a7c59]" />
        Needs ({items.length})
      </h2>
      <p className="text-sm text-[#1a472a]/75 mb-4">
        Delivered fills the bar solid and accepted shows lighter. Open needs are where to point your next share.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-[#1a472a]/75">This campaign has no needs listed.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const kind = kindForItem(item);
            const capital = capitalForItem(item);
            const hours = isHoursNeed(item);
            const fill = roleFillState(item);
            const wanted = item.quantityWanted || 1;
            const claimed = item.quantityClaimed || 0;
            const delivered = item.quantityDelivered || 0;
            const claimedPct = Math.min((claimed / wanted) * 100, 100);
            const deliveredPct = Math.min((delivered / wanted) * 100, 100);
            return (
              <div key={item.id} className="bg-[#f0f7f0] rounded-xl p-3 border border-[#7dd87d]/30 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KIND_CHIP_CLASSES[kind] || "bg-gray-100 text-gray-700"}`}>
                    {KIND_LABELS[kind] || kind}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white text-[#4a7c59]">
                    {CAPITAL_LABELS[capital]?.label ?? capital}
                  </span>
                  {hours && fill.filled && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#4a7c59] text-white">Filled</span>
                  )}
                </div>
                <p className="font-medium text-[#1a472a] text-sm mb-2 break-words">{decodeBasicEntities(titleForItem(item))}</p>
                <div className="w-full bg-[#1a472a]/10 rounded-full h-2 relative overflow-hidden mb-1">
                  <div className="absolute inset-y-0 left-0 bg-[#7dd87d]/50 rounded-full" style={{ width: `${claimedPct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-[#4a7c59] rounded-full" style={{ width: `${deliveredPct}%` }} />
                </div>
                {hours ? (
                  <p className="text-xs text-[#1a472a]/80">
                    {fill.accepted} of {fill.needed} hours a week filled ({fullTimeLabel(fill.needed)})
                  </p>
                ) : (
                  <p className="text-xs text-[#1a472a]/80">
                    {delivered} of {wanted} delivered
                    {claimed > delivered ? `, ${claimed - delivered} more claimed` : ""}
                  </p>
                )}
                {hours && canEditHours && (
                  <NeedHoursForm item={item} accepted={fill.accepted} filled={fill.filled} onSaved={onChanged} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
