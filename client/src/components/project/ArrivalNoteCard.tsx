/**
 * The arrival note, as a project steward writes it (build spec 2026-09-27,
 * section 11.3; research R35). What someone needs once their offer is
 * accepted: where to go, what to bring, who to ask for, meals, beds, parking
 * or transit. One note for everyone the stewards accept, plus an optional
 * note per need that fills in anything it leaves blank from the note for
 * everyone.
 *
 * Only people whose offer the stewards accepted read it: in Your
 * contributions, on their offer link and in the acceptance email. It lives
 * in its own table, which no public read touches. Every save goes through
 * campaigns.setArrivalNote, which checks the steward on the server
 * (server/lib/project-steward.ts).
 *
 * Example campaigns show the card disabled with the example line. A
 * cancelled or closed campaign keeps its notes as they are.
 *
 * Clear asks first: accepted people lose where to go and what to bring the
 * moment it's gone, so one tap next to Save must not do it (review
 * 2026-09-28). Focus goes to Keep it, the safe choice.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin } from "lucide-react";
import { ARRIVAL } from "@shared/crowdpoolCopy";
import { ARRIVAL_FIELDS, type ArrivalField } from "@shared/offerStatus";
import { decodeBasicEntities } from "@shared/htmlText";
import { isMoneyKind, kindForItem, needTitle } from "@shared/crowdpoolNeedAction";
import type { CampaignNeed } from "./ContributionCard";

/** Each field's size on the server (drizzle/0267_arrival_notes_and_need_markers.sql). */
export const ARRIVAL_MAX: Record<ArrivalField, number> = {
  whereToGo: 500,
  whatToBring: 500,
  askFor: 120,
  meals: 300,
  beds: 300,
  gettingThere: 500,
};

/** Longer fields get a few lines to type in; short ones a single line. */
const MULTILINE: ReadonlySet<ArrivalField> = new Set(["whereToGo", "whatToBring", "gettingThere"]);

type Fields = Record<ArrivalField, string>;

const EMPTY: Fields = { whereToGo: "", whatToBring: "", askFor: "", meals: "", beds: "", gettingThere: "" };

/** A count shows once the text is within a tenth of the limit. */
export function showCount(length: number, max: number): boolean {
  return length >= Math.floor(max * 0.9);
}

const card = "bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24";

export function ArrivalNoteCard({
  campaignId,
  items,
  isExample,
  canEdit,
}: {
  campaignId: number;
  items: CampaignNeed[];
  isExample: boolean;
  /** False once the campaign is cancelled or closed: its notes stay as they are. */
  canEdit: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: notes, isLoading } = trpc.campaigns.getArrivalNotes.useQuery(
    { campaignId },
    { retry: false, enabled: !isExample },
  );
  const save = trpc.campaigns.setArrivalNote.useMutation();

  // Money is never a need, so it gets no note.
  const needs = useMemo(
    () => items.filter((it) => !isMoneyKind(kindForItem(it))).map((it) => ({ id: it.id, title: decodeBasicEntities(needTitle(it)) })),
    [items],
  );

  const [target, setTarget] = useState<number>(0);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [emptyError, setEmptyError] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const firstRef = useRef<HTMLTextAreaElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const current = useMemo(() => (notes ?? []).find((n) => n.campaignItemId === target) ?? null, [notes, target]);

  // Fill the fields from the stored note whenever the note or the target changes.
  useEffect(() => {
    const next = { ...EMPTY };
    if (current) {
      for (const f of ARRIVAL_FIELDS) next[f] = decodeBasicEntities(current[f] ?? "");
    }
    setFields(next);
    setEmptyError(false);
    setConfirmingClear(false);
  }, [current, target]);

  useEffect(() => {
    if (confirmingClear) keepRef.current?.focus();
  }, [confirmingClear]);

  const disabled = isExample || !canEdit;

  const submit = async (values: Fields, cleared: boolean): Promise<boolean> => {
    try {
      await save.mutateAsync({
        campaignId,
        ...(target ? { campaignItemId: target } : {}),
        ...values,
      });
      await utils.campaigns.getArrivalNotes.invalidate({ campaignId });
      toast.success(cleared ? ARRIVAL.cleared : ARRIVAL.saved);
      return true;
    } catch (err) {
      toast.error((err as { message?: string })?.message || ARRIVAL.saveFailed);
      return false;
    }
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const trimmed = { ...EMPTY };
    for (const f of ARRIVAL_FIELDS) trimmed[f] = fields[f].trim();
    if (ARRIVAL_FIELDS.every((f) => !trimmed[f])) {
      setEmptyError(true);
      firstRef.current?.focus();
      return;
    }
    setEmptyError(false);
    void submit(trimmed, false);
  };

  const askToClear = () => {
    if (disabled) return;
    setEmptyError(false);
    setConfirmingClear(true);
  };

  const keepNote = () => {
    setConfirmingClear(false);
    requestAnimationFrame(() => clearRef.current?.focus());
  };

  const onClear = async () => {
    if (disabled) return;
    const ok = await submit({ ...EMPTY }, true);
    setConfirmingClear(false);
    // The Clear button goes with the note, so focus starts the note afresh.
    if (ok) requestAnimationFrame(() => firstRef.current?.focus());
  };

  return (
    <section id="arrival-note" className={card} aria-labelledby="arrival-note-heading">
      <h2 id="arrival-note-heading" className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <MapPin className="w-5 h-5 text-[#4a7c59]" aria-hidden="true" />
        {ARRIVAL.title}
      </h2>
      <p className="text-sm text-[#1a472a]/80 mb-4">{ARRIVAL.intro}</p>
      {isExample && <p className="text-sm font-semibold text-[#1a472a] bg-[#f0f7f0] rounded-lg p-3 mb-4">{ARRIVAL.exampleOnly}</p>}
      {!isExample && !canEdit && <p className="text-sm font-semibold text-[#1a472a] bg-[#f0f7f0] rounded-lg p-3 mb-4">{ARRIVAL.closedCampaign}</p>}

      <form onSubmit={onSave} noValidate>
        <fieldset disabled={disabled} className="space-y-4 min-w-0 disabled:opacity-70">
          <div className="space-y-1">
            <Label htmlFor="arrival-for" className="text-sm font-semibold text-[#1a472a]">{ARRIVAL.whoFor}</Label>
            <select
              id="arrival-for"
              value={String(target)}
              onChange={(e) => setTarget(Number(e.target.value) || 0)}
              className="w-full min-h-11 rounded-md border border-[#1a472a]/25 bg-white px-3 text-base md:text-sm text-[#1a472a]"
              aria-describedby={target ? "arrival-for-help" : undefined}
            >
              <option value="0">{ARRIVAL.everyone}</option>
              {needs.map((n) => (
                <option key={n.id} value={String(n.id)}>{ARRIVAL.onlyFor(n.title)}</option>
              ))}
            </select>
            {target !== 0 && <p id="arrival-for-help" className="text-xs text-[#1a472a]/75">{ARRIVAL.needHelp}</p>}
          </div>

          {!isExample && isLoading ? (
            <p className="flex items-center gap-2 text-sm text-[#1a472a]/75">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {ARRIVAL.loading}
            </p>
          ) : (
            ARRIVAL_FIELDS.map((f, i) => {
              const id = `arrival-${f}`;
              const max = ARRIVAL_MAX[f];
              const value = fields[f];
              const counted = showCount(value.length, max);
              const errorHere = emptyError && i === 0;
              const describedBy = [counted ? `${id}-count` : null, errorHere ? "arrival-empty" : null].filter(Boolean).join(" ") || undefined;
              const common = {
                id,
                value,
                maxLength: max,
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  const v = e.target.value;
                  setFields((prev) => ({ ...prev, [f]: v }));
                  if (emptyError && v.trim()) setEmptyError(false);
                },
                "aria-describedby": describedBy,
                "aria-invalid": errorHere ? true : undefined,
                className: "bg-white text-base md:text-sm text-[#1a472a]",
              };
              return (
                <div key={f} className="space-y-1 min-w-0">
                  <Label htmlFor={id} className="text-sm font-semibold text-[#1a472a]">{ARRIVAL.fields[f]}</Label>
                  {MULTILINE.has(f) ? (
                    <Textarea
                      {...common}
                      ref={i === 0 ? firstRef : undefined}
                      rows={2}
                      placeholder={f === "whereToGo" ? ARRIVAL.placeholderWhere : undefined}
                    />
                  ) : (
                    <Input {...common} className={`${common.className} min-h-11`} />
                  )}
                  {errorHere && <p id="arrival-empty" role="alert" className="text-sm text-red-700">{ARRIVAL.empty}</p>}
                  {counted && <p id={`${id}-count`} className="text-xs text-[#1a472a]/75">{ARRIVAL.count(value.length, max)}</p>}
                </div>
              );
            })
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button type="submit" disabled={save.isPending} className="min-h-11 bg-[#1a472a] hover:bg-[#0f2e1a] text-white">
              {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {ARRIVAL.save}
            </Button>
            {current && !confirmingClear && (
              <Button ref={clearRef} type="button" variant="outline" onClick={askToClear} disabled={save.isPending} className="min-h-11 border-[#1a472a]/30 text-[#1a472a]">
                {ARRIVAL.clear}
              </Button>
            )}
          </div>
          {current && confirmingClear && (
            <div role="group" aria-labelledby="arrival-clear-question" className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2" data-testid="arrival-clear-confirm">
              <p id="arrival-clear-question" className="text-sm font-semibold text-[#1a472a]">{ARRIVAL.clearConfirm}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button ref={keepRef} type="button" variant="outline" onClick={keepNote} disabled={save.isPending} className="min-h-11 border-[#1a472a]/30 text-[#1a472a] bg-white dark:bg-white">
                  {ARRIVAL.clearKeep}
                </Button>
                <Button type="button" onClick={() => void onClear()} disabled={save.isPending} className="min-h-11 bg-red-700 hover:bg-red-800 text-white">
                  {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                  {ARRIVAL.clearYes}
                </Button>
              </div>
            </div>
          )}
        </fieldset>
      </form>
    </section>
  );
}
