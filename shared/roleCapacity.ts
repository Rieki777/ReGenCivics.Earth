/**
 * Role capacity in hours a week. Pure, shared by server and client.
 *
 * A role need marked `capacityUnit = 'hours_per_week'` (migration 0249) keeps
 * its meter in hours a week: quantityWanted is the hours the role needs,
 * quantityClaimed the hours accepted (accepted, fulfilled and thanked rows)
 * and quantityDelivered the hours delivered (fulfilled and thanked rows).
 * Every other need, including a legacy role still on 'count', counts units.
 *
 * Branch on isHoursNeed(), never on kind alone. See ADR "Role capacity counts
 * hours a week" in .ai/docs/DECISIONS.md and crowdpool contract version 3.
 */

/** 40 hours a week is about one full-time person. */
export const HOURS_PER_FULL_TIME = 40;
/** The most one person can offer: the hours in a week. */
export const MAX_OFFER_HOURS = 168;
/** The most hours a week one role can ask for (250 full-time people). */
export const MAX_ROLE_HOURS = 10000;

export type CapacityItem = {
  kind: string;
  capacityUnit?: string | null;
  quantityWanted: number;
  quantityClaimed: number;
  quantityDelivered: number;
  estimatedValue: number;
};

/** Statuses whose hours stand on the role (accepted and still standing). */
export const STANDING_STATUSES = ["accepted", "fulfilled", "thanked"] as const;
/** Statuses whose hours count as delivered. */
export const DELIVERED_STATUSES = ["fulfilled", "thanked"] as const;

export function isHoursNeed(item: Pick<CapacityItem, "kind" | "capacityUnit"> | null | undefined): boolean {
  return !!item && item.kind === "role" && item.capacityUnit === "hours_per_week";
}

function whole(n: unknown): number {
  const v = Math.floor(Number(n) || 0);
  return v > 0 ? v : 0;
}

export function roleFillState(item: CapacityItem): {
  needed: number;
  accepted: number;
  delivered: number;
  open: number;
  filled: boolean;
  percentAccepted: number;
} {
  const needed = whole(item.quantityWanted);
  const accepted = whole(item.quantityClaimed);
  const delivered = whole(item.quantityDelivered);
  const open = Math.max(needed - accepted, 0);
  const filled = needed > 0 && accepted >= needed;
  const percentAccepted = needed > 0 ? Math.min(100, Math.round((accepted / needed) * 100)) : 0;
  return { needed, accepted, delivered, open, filled, percentAccepted };
}

/** Full-time equivalents at one decimal: 120 -> 3, 60 -> 1.5. */
export function fullTimeEquivalent(hours: number): number {
  const h = Number(hours) || 0;
  return Math.round((h / HOURS_PER_FULL_TIME) * 10) / 10;
}

/**
 * A plain-language size for a number of hours a week.
 * 40 -> "about 1 full-time person", 120 -> "about 3 full-time people",
 * 20 -> "about half a full-time person", under 10 -> "a few hours a week".
 */
export function fullTimeLabel(hours: number): string {
  const h = Number(hours) || 0;
  if (h < 10) return "a few hours a week";
  const fte = fullTimeEquivalent(h);
  if (fte === 0.5) return "about half a full-time person";
  if (fte < 1) return "less than one full-time person";
  if (fte === 1) return "about 1 full-time person";
  return `about ${fte} full-time people`;
}

/** A share of a role's value by hours, rounded to cents. 0 when roleHours <= 0. */
export function scaleRoleValue(roleValue: number, roleHours: number, hours: number): number {
  const rv = Number(roleValue) || 0;
  const rh = Number(roleHours) || 0;
  const h = Number(hours) || 0;
  if (rh <= 0 || h <= 0 || rv <= 0) return 0;
  return Math.round(((rv * h) / rh) * 100) / 100;
}

export const HOURS_WHOLE_NUMBER_MESSAGE = "Hours need to be a whole number, 1 or more.";

/**
 * Would accepting `requested` hours keep the role within the hours it needs?
 * `standingExcludingThis` is the accepted hours already on the role, not
 * counting the contribution being accepted or changed.
 */
export function checkAcceptHours(args: {
  requested: number;
  neededHours: number;
  standingExcludingThis: number;
}): { ok: true } | { ok: false; open: number; message: string } {
  const requested = Number(args.requested);
  const open = Math.max(whole(args.neededHours) - whole(args.standingExcludingThis), 0);
  if (!Number.isInteger(requested) || requested < 1) {
    return { ok: false, open, message: HOURS_WHOLE_NUMBER_MESSAGE };
  }
  if (open <= 0) {
    return {
      ok: false,
      open: 0,
      message: "This role is already filled. Release someone or raise the hours it needs first.",
    };
  }
  if (requested > open) {
    return {
      ok: false,
      open,
      message: `Only ${open} hours a week are still open on this role. Lower the hours to ${open} or fewer, or raise the hours the role needs.`,
    };
  }
  return { ok: true };
}

/** Accepted and delivered hours from contribution rows. */
export function standingHours(rows: Array<{ status: string; quantityPledged: number }>): {
  accepted: number;
  delivered: number;
} {
  let accepted = 0;
  let delivered = 0;
  for (const r of rows) {
    const q = whole(r.quantityPledged);
    if ((STANDING_STATUSES as readonly string[]).includes(r.status)) accepted += q;
    if ((DELIVERED_STATUSES as readonly string[]).includes(r.status)) delivered += q;
  }
  return { accepted, delivered };
}
