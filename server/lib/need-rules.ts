/**
 * A campaign's need rules and how a need's row is written, shared by
 * db.createCampaign (the wizard and the design companion) and
 * campaigns.updateDraft (a steward editing a campaign before it goes live).
 *
 * Moved out of db.createCampaign unchanged (bundle 1, item 9). The create
 * tests are the pin: assertNeedRules throws the same errors in the same
 * order, and needInsertValues builds the same row.
 *
 * Need rules (build spec 2026-09-25, section 6.1), checked before any write
 * so a bad need never leaves a half-written campaign:
 *   - money is never a need: the money ask is financialTarget, and money
 *     routes are added in the Money step;
 *   - a need window cannot end before it starts;
 *   - a thing takes a gift, a loan, or both, never neither;
 *   - kind 'loan' from any caller (the design companion can suggest it) is
 *     stored as kind 'item' that takes loans only. New needs never get kind
 *     'loan' (hub contract 4);
 *   - a need is never listed at 0 (ruling 2026-09-27, shared/needRules.ts):
 *     with every need above 0, "confirmed value reaches the in-kind ask" and
 *     "every need filled" agree. The message names the need;
 *   - a role in the Roles step (category 'role', kind 'role') is measured in
 *     hours a week (capacityUnit 'hours_per_week', migration 0249): the hours
 *     ARE its capacity, so it must say how many.
 */
import { TRPCError } from "@trpc/server";
import { isListableValue } from "../../shared/needRules";
import { ZERO_VALUE } from "../../shared/crowdpoolCopy";
import { decodeBasicEntities } from "../../shared/htmlText";
import type { CampaignItem, InsertCampaignItem } from "../../drizzle/schema";

export type NeedCategory = "land" | "equipment" | "role" | "resource";
export type NeedKind = "item" | "role" | "shift" | "loan" | "knowledge" | "crypto" | "financial_link";
export type NeedCapital =
  | "intellectual" | "social" | "material" | "financial" | "living"
  | "cultural" | "spiritual" | "experiential" | "health";

/** One need as campaigns.create and campaigns.updateDraft take it (CAMPAIGN_ITEM_INPUT). */
export type NeedInput = {
  category: NeedCategory;
  kind?: NeedKind;
  capitalType?: NeedCapital;
  quantityWanted?: number;
  hectares?: number;
  region?: string;
  features?: string[];
  videoUrl?: string;
  landDescription?: string;
  equipmentName?: string;
  equipmentQuantity?: number;
  equipmentCategory?: string;
  roleTitle?: string;
  hoursPerWeek?: number;
  durationMonths?: number;
  roleDescription?: string;
  resourceName?: string;
  resourceQuantity?: number;
  resourceUnit?: string;
  resourceDescription?: string;
  estimatedValue: number;
  // (0257) When the need is wanted, 'YYYY-MM-DD', and how a thing may come.
  neededFrom?: string;
  neededUntil?: string;
  acceptsGift?: boolean;
  acceptsLoan?: boolean;
  workMode?: "on_site" | "remote" | "either";
};

/** The kind a need is stored under before the loan rule: roles default to 'role', everything else to 'item'. */
export function resolvedNeedKind(item: { kind?: string; category: string }): string {
  return item.kind ?? (item.category === "role" ? "role" : "item");
}

/**
 * Only the Roles step's needs (category 'role', kind 'role') are hours needs.
 * The Other Needs step also sends kind 'role' for the Organizing, Arts,
 * Ceremony and Wellness categories, but with category 'resource' and no
 * hours field; those stay count needs with their resource quantity.
 */
export function isHoursNeedInput(item: { kind?: string; category: string }): boolean {
  return item.category === "role" && resolvedNeedKind(item) === "role";
}

/**
 * How a need may come. `thing` is true for kind 'item' and the legacy
 * 'loan' (land is stored as item). A legacy 'loan' takes loans only whatever
 * the caller sent; otherwise a gift is on unless the caller turned it off,
 * and a loan is off unless turned on.
 */
export function needModesForCreate(item: { kind?: string; category: string; acceptsGift?: boolean; acceptsLoan?: boolean }): {
  thing: boolean;
  gift: boolean;
  loan: boolean;
} {
  const kind = item.kind ?? (item.category === "role" ? "role" : "item");
  if (kind === "loan") return { thing: true, gift: false, loan: true };
  if (kind !== "item") return { thing: false, gift: true, loan: false };
  return { thing: true, gift: item.acceptsGift ?? true, loan: item.acceptsLoan ?? false };
}

/** Throws BAD_REQUEST for the first need that breaks a rule (header). Every need is checked before the hours. */
export function assertNeedRules(items: ReadonlyArray<NeedInput>): void {
  for (const item of items) {
    const kind = item.kind ?? (item.category === "role" ? "role" : "item");
    if (kind === "crypto" || kind === "financial_link") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Money isn't added as a need. Set the money this project asks for, and add the routes it holds, in the Money step.",
      });
    }
    if (!isListableValue(item.estimatedValue)) {
      const named = decodeBasicEntities(
        String(item.roleTitle || item.equipmentName || item.resourceName || item.landDescription || "A need"),
      ).trim().slice(0, 80) || "A need";
      throw new TRPCError({ code: "BAD_REQUEST", message: ZERO_VALUE.server(named) });
    }
    if (item.neededFrom && item.neededUntil && item.neededUntil < item.neededFrom) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A need can't end before it starts." });
    }
    const modes = needModesForCreate(item);
    if (modes.thing && !modes.gift && !modes.loan) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Choose whether you'd take each thing as a gift, on loan, or both." });
    }
  }

  // A role need is measured in hours a week: quantityWanted mirrors
  // hoursPerWeek and any client quantity is ignored.
  for (const item of items) {
    if (!isHoursNeedInput(item)) continue;
    const hours = Number(item.hoursPerWeek);
    if (!Number.isInteger(hours) || hours < 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Each role needs the hours a week it asks for." });
    }
  }
}

/** The campaign_items row for a new need. Call assertNeedRules first. */
export function needInsertValues(campaignId: number, item: NeedInput): InsertCampaignItem {
  const modes = needModesForCreate(item);
  // A lendable thing is kind 'item' with acceptsLoan 1; 'loan' is legacy.
  const kind = (modes.thing ? "item" : resolvedNeedKind(item)) as NeedKind;
  const isRole = isHoursNeedInput(item);
  return {
    campaignId,
    category: item.category,
    // Needs registry taxonomy: wizard sends kind + capitalType; legacy callers get sane defaults.
    kind,
    neededFrom: item.neededFrom ?? null,
    neededUntil: item.neededUntil ?? null,
    // Roles, shifts and knowledge ignore the modes: they keep the defaults.
    acceptsGift: modes.thing ? (modes.gift ? 1 : 0) : 1,
    acceptsLoan: modes.thing ? (modes.loan ? 1 : 0) : 0,
    workMode: item.workMode ?? null,
    capitalType: item.capitalType ?? (item.category === "land" ? "living" : item.category === "role" ? "experiential" : "material"),
    capacityUnit: isRole ? "hours_per_week" : "count",
    quantityWanted: isRole
      ? Number(item.hoursPerWeek)
      : item.quantityWanted ?? item.equipmentQuantity ?? item.resourceQuantity ?? 1,
    hectares: item.hectares,
    region: item.region,
    features: item.features ? JSON.stringify(item.features) : null,
    videoUrl: item.videoUrl,
    landDescription: item.landDescription,
    equipmentName: item.equipmentName,
    equipmentQuantity: item.equipmentQuantity,
    equipmentCategory: item.equipmentCategory,
    roleTitle: item.roleTitle,
    hoursPerWeek: item.hoursPerWeek,
    durationMonths: item.durationMonths,
    roleDescription: item.roleDescription,
    resourceName: item.resourceName,
    resourceQuantity: item.resourceQuantity,
    resourceUnit: item.resourceUnit,
    resourceDescription: item.resourceDescription,
    estimatedValue: item.estimatedValue,
  };
}

/** The stored need an edit applies to: its category and kind never change. */
export type ExistingNeed = Pick<CampaignItem, "category" | "kind" | "capacityUnit" | "capitalType">;

/**
 * A sent need, read as the stored need it edits: its category and kind are
 * the stored ones, whatever the caller sent. campaigns.updateDraft checks
 * assertNeedRules on this, so the rules see the need as it will be stored.
 */
export function asStoredNeed(existing: ExistingNeed, item: NeedInput): NeedInput {
  return { ...item, category: existing.category, kind: existing.kind };
}

/**
 * What an edit writes on a need that already exists (campaigns.updateDraft).
 * The name field for its category, the description field, the value, how
 * many (for an hours role, the hours a week, which are its capacity), the
 * window, gift and loan for a thing, where it happens and its capital. What
 * the caller leaves out of the dates, the description and where it happens is
 * cleared, as a form that saves every field would; a capital left out keeps
 * the stored one. Category and kind never change. The equipment and resource
 * quantity columns follow quantityWanted, as they do at create.
 */
export function needUpdateValues(existing: ExistingNeed, sent: NeedInput): Partial<InsertCampaignItem> {
  const item = asStoredNeed(existing, sent);
  const modes = needModesForCreate(item);
  const hoursNeed = existing.kind === "role" && existing.capacityUnit === "hours_per_week";
  const quantity = hoursNeed
    ? Number(item.hoursPerWeek)
    : item.quantityWanted ?? item.equipmentQuantity ?? item.resourceQuantity ?? 1;
  const out: Partial<InsertCampaignItem> = {
    estimatedValue: item.estimatedValue,
    quantityWanted: quantity,
    neededFrom: item.neededFrom ?? null,
    neededUntil: item.neededUntil ?? null,
    workMode: item.workMode ?? null,
    capitalType: item.capitalType ?? existing.capitalType ?? null,
  };
  if (modes.thing) {
    out.acceptsGift = modes.gift ? 1 : 0;
    out.acceptsLoan = modes.loan ? 1 : 0;
  }
  if (hoursNeed) out.hoursPerWeek = quantity;
  switch (existing.category) {
    case "land":
      out.landDescription = item.landDescription ?? null;
      break;
    case "equipment":
      out.equipmentName = item.equipmentName ?? null;
      out.equipmentQuantity = quantity;
      break;
    case "role":
      out.roleTitle = item.roleTitle ?? null;
      out.roleDescription = item.roleDescription ?? null;
      break;
    case "resource":
      out.resourceName = item.resourceName ?? null;
      out.resourceDescription = item.resourceDescription ?? null;
      out.resourceQuantity = quantity;
      break;
  }
  return out;
}
