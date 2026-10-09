/**
 * The steward's Edit campaign sheet (bundle 1, item 9): title, what the
 * campaign is for, the money it asks for, the days it runs once approved,
 * and its needs, while the campaign is a draft, in review, or sent back.
 * Saves through campaigns.updateDraft, which checks the steward, the status
 * and the need rules again (server/lib/need-rules.ts) and has the last word.
 *
 * Every check Save makes shows on its own field, and the first one is
 * scrolled to and focused (the offer form's pattern, build spec 2026-10-01,
 * section 7.2). The days field may be empty while typing: it is checked on
 * blur and on save, so it never snaps back to a default (audit P3). A server
 * refusal shows right above the buttons, where a phone user is looking.
 *
 * A need that exists keeps its category and kind; its description and where
 * it happens ride along unchanged. Money kinds are not needs, so they never
 * show here and the server leaves them be.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import { isListableValue } from "@shared/needRules";
import { isMoneyKind, needTitle } from "@shared/crowdpoolNeedAction";
import { MAX_ROLE_HOURS, isHoursNeed } from "@shared/roleCapacity";
import { MAX_WINDOW_DAYS } from "@shared/campaignClose";
import { CAPITAL_LABELS, CAPITAL_TYPES, type CapitalType } from "@shared/crowdpoolingTaxonomy";
import { DURATION, EDIT_CAMPAIGN, NEED_FORM, ZERO_VALUE } from "@shared/crowdpoolCopy";

type Category = "land" | "equipment" | "role" | "resource";
type Kind = "item" | "role" | "shift" | "loan" | "knowledge" | "crypto" | "financial_link";
type WorkMode = "on_site" | "remote" | "either";

/** A stored need as the project page carries it (front.items). */
export type EditableNeed = {
  id: number;
  category: string;
  kind: string;
  capitalType?: string | null;
  capacityUnit?: string | null;
  estimatedValue: number | string;
  quantityWanted?: number | null;
  hoursPerWeek?: number | null;
  neededFrom?: string | null;
  neededUntil?: string | null;
  acceptsGift?: number | boolean | null;
  acceptsLoan?: number | boolean | null;
  workMode?: string | null;
  roleTitle?: string | null;
  equipmentName?: string | null;
  resourceName?: string | null;
  landDescription?: string | null;
  roleDescription?: string | null;
  resourceDescription?: string | null;
  hectares?: number | null;
  region?: string | null;
};

export type EditableCampaign = {
  id: number;
  title: string;
  description: string | null;
  financialTarget: number | string | null;
  durationDays: number | null;
  items: ReadonlyArray<EditableNeed>;
};

type NeedDraft = {
  key: string;
  id?: number;
  category: Category;
  kind: Kind;
  capitalType: CapitalType | null;
  /** Measured in hours a week (an hours role, or a new role). */
  hoursNeed: boolean;
  /** Category role with kind role: the server asks it for hours a week. */
  rolesStep: boolean;
  /** A thing that may come as a gift or on loan (kind item). */
  thing: boolean;
  name: string;
  /** The stored description, sent back unchanged. */
  description: string | null;
  value: string;
  quantity: string;
  from: string;
  until: string;
  gift: boolean;
  loan: boolean;
  workMode: WorkMode | null;
  /** The stored hours a week of a role still counted as places (legacy), sent back as it was. */
  storedHours: number | null;
  confirmingRemove: boolean;
};

type Errors = Record<string, string | undefined>;
type SentNeed = inferRouterInputs<AppRouter>["campaigns"]["updateDraft"]["items"][number];

const truthy = (v: unknown) => v === true || v === 1 || v === "1";
const whole = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);
const money = (raw: string) => {
  const t = raw.trim().replace(/,/g, "");
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN;
};

function nameOf(item: EditableNeed): string {
  const stored =
    item.category === "role" ? item.roleTitle
      : item.category === "equipment" ? item.equipmentName
        : item.category === "resource" ? item.resourceName
          : item.landDescription;
  return decodeBasicEntities(String(stored || needTitle(item as Parameters<typeof needTitle>[0]) || ""));
}

function draftFrom(item: EditableNeed): NeedDraft {
  const kind = item.kind as Kind;
  const category = item.category as Category;
  const hoursNeed = isHoursNeed({ kind, capacityUnit: (item.capacityUnit ?? "count") as "count" | "hours_per_week" });
  const description = category === "role" ? item.roleDescription ?? null : category === "resource" ? item.resourceDescription ?? null : null;
  const quantity = hoursNeed ? item.hoursPerWeek ?? item.quantityWanted : item.quantityWanted;
  return {
    key: `need-${item.id}`,
    id: item.id,
    category,
    kind,
    capitalType: (item.capitalType as CapitalType | null) ?? null,
    hoursNeed,
    rolesStep: category === "role" && kind === "role",
    thing: kind === "item",
    name: nameOf(item),
    description,
    value: String(Number(item.estimatedValue) || 0),
    quantity: quantity != null ? String(quantity) : "1",
    from: item.neededFrom ?? "",
    until: item.neededUntil ?? "",
    gift: item.acceptsGift == null ? true : truthy(item.acceptsGift),
    loan: truthy(item.acceptsLoan),
    workMode: (item.workMode as WorkMode | null) ?? null,
    storedHours: item.hoursPerWeek ?? null,
    confirmingRemove: false,
  };
}

let newKey = 0;
function newNeed(shape: "thing" | "role"): NeedDraft {
  newKey += 1;
  const role = shape === "role";
  return {
    key: `new-${newKey}`,
    category: role ? "role" : "resource",
    kind: role ? "role" : "item",
    capitalType: role ? "experiential" : "material",
    hoursNeed: role,
    rolesStep: role,
    thing: !role,
    name: "",
    description: null,
    value: "",
    quantity: role ? "" : "1",
    from: "",
    until: "",
    gift: true,
    loan: false,
    // Roles from the wizard happen on the land unless it says otherwise.
    workMode: role ? "on_site" : null,
    storedHours: null,
    confirmingRemove: false,
  };
}

function kindLabel(n: NeedDraft): string {
  if (n.rolesStep || n.kind === "role") return EDIT_CAMPAIGN.kinds.role;
  if (n.thing) return EDIT_CAMPAIGN.kinds.thing;
  if (n.kind === "loan") return EDIT_CAMPAIGN.kinds.loan;
  if (n.kind === "shift") return EDIT_CAMPAIGN.kinds.shift;
  if (n.kind === "knowledge") return EDIT_CAMPAIGN.kinds.knowledge;
  return EDIT_CAMPAIGN.kinds.other;
}

/** What updateDraft takes for one need. */
function toSent(n: NeedDraft): SentNeed {
  const qty = whole(n.quantity);
  const out: SentNeed = {
    category: n.category,
    kind: n.kind,
    estimatedValue: money(n.value),
    quantityWanted: qty,
  };
  if (n.id != null) out.id = n.id;
  if (n.capitalType) out.capitalType = n.capitalType;
  if (n.from) out.neededFrom = n.from;
  if (n.until) out.neededUntil = n.until;
  if (n.workMode) out.workMode = n.workMode;
  const name = n.name.trim();
  if (n.category === "role") out.roleTitle = name;
  else if (n.category === "equipment") out.equipmentName = name;
  else if (n.category === "resource") out.resourceName = name;
  else out.landDescription = name;
  if (n.description != null) {
    if (n.category === "role") out.roleDescription = n.description;
    if (n.category === "resource") out.resourceDescription = n.description;
  }
  if (n.rolesStep) out.hoursPerWeek = n.hoursNeed ? qty : n.storedHours && n.storedHours >= 1 ? n.storedHours : qty;
  if (n.thing) {
    out.acceptsGift = n.gift;
    out.acceptsLoan = n.loan;
  }
  return out;
}

/** A field's message, under it. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-sm font-medium text-red-700">{message}</p>;
}

const inputClass = "min-h-11 border-[#1a472a]/25 bg-white text-base md:text-sm text-[#1a472a]";

export function EditCampaignDialog({
  open,
  onClose,
  campaign,
  currencySymbol,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  campaign: EditableCampaign;
  currencySymbol: string;
  /** Refresh the page's data after a save. */
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moneyAsk, setMoneyAsk] = useState("");
  const [days, setDays] = useState("");
  const [needs, setNeeds] = useState<NeedDraft[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fill the sheet from the campaign each time it opens; a refresh behind an
  // open sheet never overwrites what the steward is typing.
  useEffect(() => {
    if (!open) return;
    setTitle(decodeBasicEntities(campaign.title ?? ""));
    setDescription(decodeBasicEntities(campaign.description ?? ""));
    setMoneyAsk(String(Number(campaign.financialTarget) || 0));
    setDays(String(campaign.durationDays ?? ""));
    setNeeds(campaign.items.filter((i) => !isMoneyKind(String(i.kind))).map(draftFrom));
    setErrors({});
    setServerError(null);
  }, [open, campaign.id]);

  const save = trpc.campaigns.updateDraft.useMutation();

  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  const setNeed = (key: string, patch: Partial<NeedDraft>) =>
    setNeeds((list) => list.map((n) => (n.key === key ? { ...n, ...patch } : n)));

  const checkDays = (raw: string): string | undefined => {
    const n = whole(raw);
    if (!Number.isFinite(n) || n < 1) return EDIT_CAMPAIGN.errors.days;
    if (n > MAX_WINDOW_DAYS) return DURATION.tooLong;
    return undefined;
  };

  /** Every check, in the order the fields sit on the sheet. */
  const validate = (): Array<[string, string]> => {
    const out: Array<[string, string]> = [];
    if (!title.trim()) out.push(["edit-title", EDIT_CAMPAIGN.errors.title]);
    if (!description.trim()) out.push(["edit-description", EDIT_CAMPAIGN.errors.description]);
    const m = money(moneyAsk);
    if (!Number.isFinite(m) || m > 10_000_000) out.push(["edit-money", EDIT_CAMPAIGN.errors.money]);
    const d = checkDays(days);
    if (d) out.push(["edit-days", d]);
    for (const n of needs) {
      if (!n.name.trim()) out.push([`${n.key}-name`, EDIT_CAMPAIGN.errors.name]);
      if (!isListableValue(money(n.value))) out.push([`${n.key}-value`, ZERO_VALUE.field]);
      const q = whole(n.quantity);
      if (n.hoursNeed) {
        if (!Number.isFinite(q) || q < 1 || q > MAX_ROLE_HOURS) out.push([`${n.key}-quantity`, EDIT_CAMPAIGN.errors.hours(MAX_ROLE_HOURS)]);
      } else if (!Number.isFinite(q) || q < 1) {
        out.push([`${n.key}-quantity`, EDIT_CAMPAIGN.errors.howMany]);
      }
      if (n.from && n.until && n.until < n.from) out.push([`${n.key}-until`, NEED_FORM.endsBeforeStart]);
      if (n.thing && !n.gift && !n.loan) out.push([`${n.key}-modes`, NEED_FORM.chooseMode]);
    }
    return out;
  };

  /** Scroll to the first field with a message and put the cursor in it. */
  const focusFirst = (key: string) => {
    requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector<HTMLElement>(`[id="${key}"]`);
      if (!el) return;
      const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView?.({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
    });
  };

  const submit = () => {
    setServerError(null);
    const found = validate();
    setErrors(Object.fromEntries(found));
    if (found.length > 0) {
      focusFirst(found[0][0]);
      return;
    }
    save.mutate(
      {
        id: campaign.id,
        title: title.trim(),
        description: description.trim(),
        financialTarget: money(moneyAsk),
        durationDays: whole(days),
        items: needs.map(toSent),
      },
      {
        onSuccess: () => {
          toast.success(EDIT_CAMPAIGN.saved);
          onSaved();
          onClose();
        },
        onError: (err) => setServerError(err?.message || EDIT_CAMPAIGN.failed),
      },
    );
  };

  const fieldProps = (key: string, describedBy?: string) => ({
    id: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": [errors[key] ? `${key}-error` : "", describedBy ?? ""].filter(Boolean).join(" ") || undefined,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-white text-[#1a472a] light-form-island">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a]">{EDIT_CAMPAIGN.title}</DialogTitle>
          <DialogDescription>{EDIT_CAMPAIGN.intro}</DialogDescription>
        </DialogHeader>

        <div ref={rootRef} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{EDIT_CAMPAIGN.titleLabel}</Label>
            <Input
              {...fieldProps("edit-title")}
              value={title}
              maxLength={255}
              onChange={(e) => { setTitle(e.target.value); clear("edit-title"); }}
              className={inputClass}
            />
            <FieldError id="edit-title-error" message={errors["edit-title"]} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">{EDIT_CAMPAIGN.descriptionLabel}</Label>
            <Textarea
              {...fieldProps("edit-description")}
              value={description}
              rows={4}
              onChange={(e) => { setDescription(e.target.value); clear("edit-description"); }}
              className="border-[#1a472a]/25 bg-white text-base md:text-sm text-[#1a472a]"
            />
            <FieldError id="edit-description-error" message={errors["edit-description"]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="edit-money">{EDIT_CAMPAIGN.moneyLabel(currencySymbol)}</Label>
              <Input
                {...fieldProps("edit-money", "edit-money-help")}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={moneyAsk}
                onChange={(e) => { setMoneyAsk(e.target.value); clear("edit-money"); }}
                className={inputClass}
              />
              <p id="edit-money-help" className="text-sm text-[#1a472a]/80">{EDIT_CAMPAIGN.moneyHelper}</p>
              <FieldError id="edit-money-error" message={errors["edit-money"]} />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="edit-days">{EDIT_CAMPAIGN.daysLabel}</Label>
              <Input
                {...fieldProps("edit-days", "edit-days-help")}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={days}
                onChange={(e) => { setDays(e.target.value.replace(/[^\d]/g, "").slice(0, 4)); clear("edit-days"); }}
                onBlur={() => setErrors((er) => ({ ...er, "edit-days": checkDays(days) }))}
                className={inputClass}
              />
              <p id="edit-days-help" className="text-sm text-[#1a472a]/80">{EDIT_CAMPAIGN.daysHelper}</p>
              <FieldError id="edit-days-error" message={errors["edit-days"]} />
            </div>
          </div>

          <div className="border-t border-[#1a472a]/10 pt-4 space-y-3">
            <h3 className="font-semibold text-[#1a472a]">{EDIT_CAMPAIGN.needsHeading}</h3>
            {needs.length === 0 && <p className="text-sm text-[#1a472a]/80">{EDIT_CAMPAIGN.noNeeds}</p>}
            {needs.map((n) => (
              <fieldset key={n.key} className="rounded-xl border border-[#1a472a]/15 bg-[#f8f5f0] p-3 space-y-3 min-w-0" data-testid={`edit-need-${n.key}`}>
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#1a472a]/80">{kindLabel(n)}</legend>
                <div className="space-y-1.5">
                  <Label htmlFor={`${n.key}-name`}>{EDIT_CAMPAIGN.needName}</Label>
                  <Input
                    {...fieldProps(`${n.key}-name`)}
                    value={n.name}
                    maxLength={255}
                    onChange={(e) => { setNeed(n.key, { name: e.target.value }); clear(`${n.key}-name`); }}
                    className={inputClass}
                  />
                  <FieldError id={`${n.key}-name-error`} message={errors[`${n.key}-name`]} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor={`${n.key}-value`}>{EDIT_CAMPAIGN.needValue(currencySymbol)}</Label>
                    <Input
                      {...fieldProps(`${n.key}-value`)}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={n.value}
                      onChange={(e) => { setNeed(n.key, { value: e.target.value }); clear(`${n.key}-value`); }}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor={`${n.key}-quantity`}>{n.hoursNeed ? EDIT_CAMPAIGN.hoursAWeek : EDIT_CAMPAIGN.howMany}</Label>
                    <Input
                      {...fieldProps(`${n.key}-quantity`)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={n.quantity}
                      onChange={(e) => { setNeed(n.key, { quantity: e.target.value.replace(/[^\d]/g, "").slice(0, 5) }); clear(`${n.key}-quantity`); }}
                      className={inputClass}
                    />
                  </div>
                </div>
                <FieldError id={`${n.key}-value-error`} message={errors[`${n.key}-value`]} />
                <FieldError id={`${n.key}-quantity-error`} message={errors[`${n.key}-quantity`]} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor={`${n.key}-from`}>{EDIT_CAMPAIGN.wantedFrom}</Label>
                    <Input
                      id={`${n.key}-from`}
                      type="date"
                      value={n.from}
                      onChange={(e) => { setNeed(n.key, { from: e.target.value }); clear(`${n.key}-until`); }}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor={`${n.key}-until`}>{EDIT_CAMPAIGN.wantedUntil}</Label>
                    <Input
                      {...fieldProps(`${n.key}-until`)}
                      type="date"
                      min={n.from || undefined}
                      value={n.until}
                      onChange={(e) => { setNeed(n.key, { until: e.target.value }); clear(`${n.key}-until`); }}
                      className={inputClass}
                    />
                  </div>
                </div>
                <FieldError id={`${n.key}-until-error`} message={errors[`${n.key}-until`]} />
                {n.thing && (
                  <div
                    id={`${n.key}-modes`}
                    tabIndex={-1}
                    role="group"
                    aria-label={NEED_FORM.howTake}
                    aria-invalid={errors[`${n.key}-modes`] ? true : undefined}
                    aria-describedby={errors[`${n.key}-modes`] ? `${n.key}-modes-error` : undefined}
                    className="flex flex-wrap gap-x-5 gap-y-1"
                  >
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[#4a7c59]"
                        checked={n.gift}
                        onChange={(e) => { setNeed(n.key, { gift: e.target.checked }); clear(`${n.key}-modes`); }}
                      />
                      {EDIT_CAMPAIGN.asGift}
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[#4a7c59]"
                        checked={n.loan}
                        onChange={(e) => { setNeed(n.key, { loan: e.target.checked }); clear(`${n.key}-modes`); }}
                      />
                      {EDIT_CAMPAIGN.onLoan}
                    </label>
                  </div>
                )}
                <FieldError id={`${n.key}-modes-error`} message={errors[`${n.key}-modes`]} />
                {n.id == null && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${n.key}-capital`}>{EDIT_CAMPAIGN.capitalLabel}</Label>
                    <select
                      id={`${n.key}-capital`}
                      value={n.capitalType ?? ""}
                      onChange={(e) => setNeed(n.key, { capitalType: e.target.value as CapitalType })}
                      className="w-full min-h-11 rounded-md border border-[#1a472a]/25 bg-white px-3 text-base md:text-sm text-[#1a472a]"
                    >
                      {CAPITAL_TYPES.map((c) => (
                        <option key={c} value={c}>{EDIT_CAMPAIGN.capitalOption(CAPITAL_LABELS[c].label)}</option>
                      ))}
                    </select>
                  </div>
                )}
                {n.confirmingRemove ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2" role="group" aria-label={EDIT_CAMPAIGN.removeConfirm(n.name.trim() || kindLabel(n))}>
                    <span className="text-sm font-medium">{EDIT_CAMPAIGN.removeConfirm(n.name.trim() || kindLabel(n))}</span>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setNeeds((list) => list.filter((x) => x.key !== n.key));
                        setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`${n.key}-`))));
                      }}
                    >
                      {EDIT_CAMPAIGN.removeYes}
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setNeed(n.key, { confirmingRemove: false })}>
                      {EDIT_CAMPAIGN.removeNo}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 border-[#1a472a]/20 text-[#1a472a]"
                    onClick={() => setNeed(n.key, { confirmingRemove: true })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    {EDIT_CAMPAIGN.remove}
                  </Button>
                )}
              </fieldset>
            ))}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1a472a]">{EDIT_CAMPAIGN.addNeed}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11 border-[#4a7c59] text-[#1a472a]" onClick={() => setNeeds((l) => [...l, newNeed("thing")])}>
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  {EDIT_CAMPAIGN.addThing}
                </Button>
                <Button type="button" variant="outline" className="min-h-11 border-[#4a7c59] text-[#1a472a]" onClick={() => setNeeds((l) => [...l, newNeed("role")])}>
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  {EDIT_CAMPAIGN.addRole}
                </Button>
              </div>
            </div>
          </div>

          {serverError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose} disabled={save.isPending}>{EDIT_CAMPAIGN.cancel}</Button>
          <Button onClick={submit} disabled={save.isPending} className="min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
            {save.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{EDIT_CAMPAIGN.saving}</> : EDIT_CAMPAIGN.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
