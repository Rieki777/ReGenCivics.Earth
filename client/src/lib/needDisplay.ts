/**
 * Display helpers for campaign needs, shared by the campaign page
 * (CampaignDetail, NeedsRegistry, NeedCard) and the project page's steward
 * tools (NeedsGlance, ContributionReviewPanel). Pure: no React, no tRPC.
 */
import type { CapitalType } from "@shared/crowdpoolingTaxonomy";

export const KIND_LABELS: Record<string, string> = {
  item: "Item",
  role: "Role",
  shift: "Shift",
  loan: "Loan",
  knowledge: "Knowledge",
  crypto: "Crypto",
  financial_link: "Recommended funder",
};

export const KIND_CHIP_CLASSES: Record<string, string> = {
  item: "bg-purple-100 text-purple-700",
  role: "bg-blue-100 text-blue-700",
  shift: "bg-orange-100 text-orange-700",
  loan: "bg-amber-100 text-amber-700",
  knowledge: "bg-indigo-100 text-indigo-700",
  crypto: "bg-emerald-100 text-emerald-700",
  financial_link: "bg-gray-100 text-gray-700",
};

/** Legacy items without a capitalType map from their old category. */
export function capitalForItem(item: any): CapitalType {
  if (item.capitalType) return item.capitalType;
  switch (item.category) {
    case "land": return "living";
    case "role": return "experiential";
    default: return "material"; // equipment, resource
  }
}

export function kindForItem(item: any): string {
  if (item.kind) return item.kind;
  return item.category === "role" ? "role" : "item";
}

export function titleForItem(item: any): string {
  if (item.roleTitle) return item.roleTitle;
  if (item.equipmentName) return item.equipmentName;
  if (item.resourceName) return item.resourceName;
  if (item.hectares && item.region) return `${item.hectares} hectares in ${item.region}`;
  if (item.landDescription) {
    const firstLine = String(item.landDescription).split("\n")[0];
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  }
  return "Campaign need";
}

export function descriptionForItem(item: any): string | null {
  if (item.roleDescription) return item.roleDescription;
  if (item.resourceDescription) return item.resourceDescription;
  if (item.landDescription && (item.hectares || item.region)) return item.landDescription;
  return null;
}

/** Whole-currency formatter for a campaign's currency. */
export function makeCurrencyFormatter(currency: string | null | undefined): (amount: number) => string {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return (amount: number) => fmt.format(amount || 0);
}

/** A campaign status in plain words, for pills on the project page. */
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "In review",
  rejected: "Sent back",
  active: "Live",
  funded: "Complete",
  completed: "Complete",
  cancelled: "Cancelled",
};

export const CAMPAIGN_STATUS_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-800",
  funded: "bg-purple-100 text-purple-700",
  completed: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-200 text-gray-700",
};

/** A contribution status as the stewards read it. */
export const STEWARD_STATUS_LABELS: Record<string, string> = {
  pending: "Waiting",
  accepted: "Accepted",
  fulfilled: "Delivered",
  thanked: "Thanked",
  rejected: "Declined",
  expired: "Expired",
  released: "Released",
  cancelled: "Cancelled",
  withdrawn: "Withdrawn",
};

export const STEWARD_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-500",
  accepted: "bg-green-500",
  fulfilled: "bg-emerald-600",
  thanked: "bg-purple-500",
  rejected: "bg-red-500",
  expired: "bg-gray-400",
  released: "bg-gray-500",
  cancelled: "bg-gray-500",
  withdrawn: "bg-gray-400",
};
