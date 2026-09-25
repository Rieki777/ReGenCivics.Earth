/**
 * The steward's queue on a project page: what is waiting on the people who
 * run a campaign, and how offers group by need. Pure, shared by the client
 * (WaitingOnYou, ContributionReviewPanel, YourContributions) and tests.
 *
 * Words: the UI calls a pending contribution an "offer". Hours needs (role
 * needs measured in hours a week, shared/roleCapacity.ts) read in hours.
 */
import { isHoursNeed, roleFillState, type CapacityItem } from "./roleCapacity";

export type QueueContribution = {
  id: number;
  status: string;
  campaignItemId: number | null;
  quantityPledged?: number | null;
  hoursPerWeek?: number | null;
};

export type QueueItem = CapacityItem & { id: number };

/** The tabs of the offers panel, in order. */
export const OFFER_TABS = ["waiting", "accepted", "delivered", "thanked", "closed"] as const;
export type OfferTab = (typeof OFFER_TABS)[number];

export const OFFER_TAB_LABELS: Record<OfferTab, string> = {
  waiting: "Waiting",
  accepted: "Accepted",
  delivered: "Delivered",
  thanked: "Thanked",
  closed: "Closed",
};

/** Statuses that land in the Closed tab. */
export const CLOSED_STATUSES = ["rejected", "expired", "released", "cancelled", "withdrawn"] as const;

/** Which tab a contribution status belongs in. Unknown statuses read closed. */
export function offerTabForStatus(status: string): OfferTab {
  switch (status) {
    case "pending": return "waiting";
    case "accepted": return "accepted";
    case "fulfilled": return "delivered";
    case "thanked": return "thanked";
    default: return "closed";
  }
}

export type StewardQueue = {
  /** Offers to answer (pending). */
  toAnswer: number[];
  /** Accepted, waiting to be marked delivered. */
  toDeliver: number[];
  /** Delivered, waiting for a thank-you. */
  toThank: number[];
  /** The campaign is a draft: send it for review. */
  sendForReview: boolean;
  /** Pending offers on roles that now read filled. */
  pendingOnFilledRoles: number[];
  /** Everything above that asks the steward to act, counted once. */
  total: number;
};

export function buildStewardQueue(args: {
  contributions: ReadonlyArray<QueueContribution>;
  items: ReadonlyArray<QueueItem>;
  campaignStatus: string;
}): StewardQueue {
  const itemsById = new Map<number, QueueItem>();
  for (const it of args.items) itemsById.set(it.id, it);
  const filledHoursNeeds = new Set<number>();
  for (const it of args.items) {
    if (isHoursNeed(it) && roleFillState(it).filled) filledHoursNeeds.add(it.id);
  }

  const toAnswer: number[] = [];
  const toDeliver: number[] = [];
  const toThank: number[] = [];
  const pendingOnFilledRoles: number[] = [];
  for (const c of args.contributions) {
    if (c.status === "pending") {
      toAnswer.push(c.id);
      if (c.campaignItemId != null && filledHoursNeeds.has(c.campaignItemId)) pendingOnFilledRoles.push(c.id);
    } else if (c.status === "accepted") {
      toDeliver.push(c.id);
    } else if (c.status === "fulfilled") {
      toThank.push(c.id);
    }
  }
  const sendForReview = args.campaignStatus === "draft";
  return {
    toAnswer,
    toDeliver,
    toThank,
    sendForReview,
    pendingOnFilledRoles,
    total: toAnswer.length + toDeliver.length + toThank.length + (sendForReview ? 1 : 0),
  };
}

export type OfferGroup<C extends QueueContribution, I extends QueueItem> = {
  /** The need, or null for offers with no need attached ("Other offers"). */
  item: I | null;
  key: string;
  byTab: Record<OfferTab, C[]>;
  total: number;
};

function emptyTabs<C>(): Record<OfferTab, C[]> {
  return { waiting: [], accepted: [], delivered: [], thanked: [], closed: [] };
}

/**
 * Offers grouped by the need they answer, in the needs' own order, with
 * freeform offers (and offers on a need that no longer exists) last under
 * "Other offers". Needs with no offers are left out.
 */
export function groupOffersByNeed<C extends QueueContribution, I extends QueueItem>(
  contributions: ReadonlyArray<C>,
  items: ReadonlyArray<I>,
): OfferGroup<C, I>[] {
  const groups = new Map<string, OfferGroup<C, I>>();
  const order: string[] = [];
  for (const it of items) {
    const key = `need-${it.id}`;
    groups.set(key, { item: it, key, byTab: emptyTabs<C>(), total: 0 });
    order.push(key);
  }
  const other: OfferGroup<C, I> = { item: null, key: "other", byTab: emptyTabs<C>(), total: 0 };
  for (const c of contributions) {
    const g = (c.campaignItemId != null && groups.get(`need-${c.campaignItemId}`)) || other;
    g.byTab[offerTabForStatus(c.status)].push(c);
    g.total += 1;
  }
  const out = order.map((k) => groups.get(k)!).filter((g) => g.total > 0);
  if (other.total > 0) out.push(other);
  return out;
}

/**
 * A contributor's view of where their offer stands, in plain words.
 * An accepted place on an hours need reads with its hours.
 */
export function contributorStatusLabel(status: string, acceptedHours?: number | null): string {
  switch (status) {
    case "pending": return "Waiting on the stewards";
    case "accepted":
      return acceptedHours && acceptedHours > 0 ? `Accepted for ${acceptedHours} hours a week` : "Accepted";
    case "fulfilled": return "Delivered";
    case "thanked": return "Thanked";
    case "released": return "Released";
    default: return "Closed";
  }
}

/**
 * The numbers the accept and change-hours dialog shows and checks, from the
 * need's counters. `standingExcludingThis` leaves out this offer's own hours
 * when it already holds a place, the same way the server does before
 * checkAcceptHours. `maxHours` is the most this person could hold;
 * `openNow` is what is open on the role right now.
 */
export function hoursDialogNumbers(
  need: CapacityItem,
  contribution: { status: string; quantityPledged?: number | null },
): { needed: number; standingExcludingThis: number; maxHours: number; openNow: number } {
  const fill = roleFillState(need);
  const holds = ["accepted", "fulfilled", "thanked"].includes(contribution.status)
    ? Math.max(Math.floor(Number(contribution.quantityPledged) || 0), 0)
    : 0;
  const standingExcludingThis = Math.max(fill.accepted - holds, 0);
  return {
    needed: fill.needed,
    standingExcludingThis,
    maxHours: Math.max(fill.needed - standingExcludingThis, 0),
    openNow: fill.open,
  };
}

/**
 * The line under each steward dialog's title (client AcceptDialog). People
 * without an account get the three direct emails (accepted, declined,
 * delivered) and nothing for thanks, release or an hours change, so the
 * dialog says who will hear and when the steward should tell them directly.
 */
/**
 * Added to the release and hours dialogs when the role is filled: freeing
 * hours on it sends a role_reopened notice (server/lib/campaign-notify.ts) to
 * the people still waiting on it.
 */
export const REOPEN_NOTICE_IF_OPENED =
  "If this opens the role, people still waiting on it hear that it has opened up.";

/** The same, for raising the hours a filled role needs, which always opens it. */
export const REOPEN_NOTICE_ON_RAISE = "People still waiting on this role hear that it has opened up.";

export function stewardActionDescription(args: {
  action: "accept" | "reject" | "deliver" | "thanks" | "release" | "hours";
  hoursNeed: boolean;
  hasAccount: boolean;
  name: string;
  roleTitle?: string | null;
  heldHours?: number | null;
  /** The role is filled right now, so a release or lower hours opens it. */
  roleFilled?: boolean;
}): string {
  const { action, hoursNeed, hasAccount, name } = args;
  const others = hoursNeed && args.roleFilled ? ` ${REOPEN_NOTICE_IF_OPENED}` : "";
  const role = args.roleTitle || "this role";
  const tellThem = `${name} has no account here yet, so let them know yourself.`;
  switch (action) {
    case "accept":
      return hoursNeed ? `Accept ${name} for a share of ${role}.` : "This reserves their place on the need.";
    case "reject":
      return "They hear from you in their notifications or by email.";
    case "deliver":
      return (hoursNeed
        ? `This marks that ${name} has served the hours they committed to. It then counts toward the campaign.`
        : "Confirm this contribution arrived. This is the moment it counts.")
        + (hasAccount ? " It grows on their Living Tree too." : "");
    case "thanks":
      return hasAccount
        ? "Close the loop. Your note goes to them and onto the Pool Ledger."
        : `Close the loop. Your note goes onto the Pool Ledger. ${name} has no account here yet, so share it with them yourself too.`;
    case "release": {
      const freed = hoursNeed
        ? `This frees the ${args.heldHours ?? ""} hours a week ${name} holds, so someone else can take them.`
        : `This frees ${name}'s place on this need, so someone else can take it.`;
      return (hasAccount ? `${freed} ${name} hears about it in their notifications.` : `${freed} ${tellThem}`) + others;
    }
    case "hours":
      return (hasAccount
        ? `Set how many hours a week ${name} holds on ${role}. They hear about it in their notifications.`
        : `Set how many hours a week ${name} holds on ${role}. ${tellThem}`) + others;
  }
}
