/**
 * One offer's step line and the arrival note it can carry. Pure, shared by
 * the offer status page (client/src/pages/OfferStatus.tsx), the status link
 * procedures (server/routes/offerStatus.ts), Your contributions and the
 * accepted email.
 *
 * The step line (research R23 and R34): Sent, Stewards reviewing, Accepted
 * (or "Accepted for 6 hours a week"), Underway (a lend reads Lent),
 * Delivered, Thanked; or a named ending such as "Not this time". Words live
 * in shared/crowdpoolCopy.ts (OFFER_STEPS).
 *
 * The arrival note (research R35): a campaign-wide note and an optional note
 * per need, field by field; the need's note wins where it says something.
 * Words live in shared/crowdpoolCopy.ts (ARRIVAL).
 */
import { OFFER_STEPS, ARRIVAL } from "./crowdpoolCopy";
import { toDay, todayUtc } from "./crowdpoolNeedAction";

// ── The step line ────────────────────────────────────────────────────────────

export type OfferStepKey = "sent" | "reviewing" | "accepted" | "underway" | "delivered" | "thanked";

export type OfferEndingKey =
  | "rejected"
  | "withdrawn"
  | "campaign_cancelled"
  | "closed_with_campaign"
  | "released_at_close"
  | "released"
  | "expired"
  | "returned";

export type OfferStep = { key: OfferStepKey; label: string; state: "done" | "current" | "todo" };

export type OfferStepsInput = {
  /** campaign_contributions.status. */
  status: string;
  /** The hours a week the stewards accepted, on an hours need. */
  acceptedHours?: number | null;
  offerMode?: "give" | "lend" | null;
  /** A steward's record that a lent thing went back to its owner. */
  returnedAt?: Date | string | null;
  /** campaigns.status. */
  campaignStatus: string;
  /** Set when the close released this accepted offer. */
  closeReleasedAt?: Date | string | null;
  /** Optional: when a lend becomes available. Once it is today or earlier, an accepted lend reads Lent. */
  availableFrom?: string | Date | null;
  /** Optional: the need's start (a shift's start or a role's first day). Once it is today or earlier, an accepted offer reads Underway. */
  needStartsOn?: string | Date | null;
};

export type OfferStepsResult = {
  steps: OfferStep[];
  ending: { key: OfferEndingKey; text: string } | null;
  stepLine: string;
};

const ORDER: OfferStepKey[] = ["sent", "reviewing", "accepted", "underway", "delivered", "thanked"];

function labelFor(key: OfferStepKey, o: OfferStepsInput): string {
  const s = OFFER_STEPS.steps;
  switch (key) {
    case "sent":
      return s.sent;
    case "reviewing":
      return s.reviewing;
    case "accepted": {
      const h = Number(o.acceptedHours);
      return Number.isFinite(h) && h > 0 ? s.acceptedHours(h) : s.accepted;
    }
    case "underway":
      return o.offerMode === "lend" ? s.lent : s.underway;
    case "delivered":
      return s.delivered;
    case "thanked":
      return s.thanked;
  }
}

/** Every step up to and including `current`; `current` is marked current and the rest todo. */
function stepsUpTo(current: OfferStepKey, o: OfferStepsInput): OfferStep[] {
  const at = ORDER.indexOf(current);
  return ORDER.map((key, i) => ({
    key,
    label: labelFor(key, o),
    state: i < at ? "done" : i === at ? "current" : "todo",
  }));
}

/** The steps an ended offer reached, all done, and nothing after them. */
function stepsReached(last: OfferStepKey, o: OfferStepsInput): OfferStep[] {
  const at = ORDER.indexOf(last);
  return ORDER.slice(0, at + 1).map((key) => ({ key, label: labelFor(key, o), state: "done" as const }));
}

function hasValue(v: unknown): boolean {
  return v != null && v !== "";
}

function reachedDay(v: string | Date | null | undefined, today: string): boolean {
  const d = toDay(v ?? null);
  return d != null && d <= today;
}

function ending(key: OfferEndingKey): { key: OfferEndingKey; text: string } {
  const e = OFFER_STEPS.endings;
  const text: Record<OfferEndingKey, string> = {
    rejected: e.rejected,
    withdrawn: e.withdrawn,
    campaign_cancelled: e.campaignCancelled,
    closed_with_campaign: e.closedWithCampaign,
    released_at_close: e.releasedAtClose,
    released: e.released,
    expired: e.expired,
    returned: e.returned,
  };
  return { key, text: text[key] };
}

/**
 * The step line for one offer: the steps, the named ending when it has one,
 * and the sentence under them.
 *
 *   pending   Sent done, Stewards reviewing current.
 *   accepted  Accepted current; Underway (or Lent) current once the lend's
 *             available-from day or the need's start is today or earlier.
 *   fulfilled Delivered current.  thanked  Thanked current.
 *
 * Endings show only the steps the offer reached, all done: rejected "Not
 * this time"; withdrawn "You withdrew"; cancelled "Campaign cancelled", or
 * "Closed when the campaign closed" on a closed or completed campaign;
 * released "Released by the stewards", or "Released with thanks when the
 * campaign closed" when the close released it; expired "The place closed";
 * a lend a steward marked returned (returnedAt, set only on lent things)
 * "Returned to you". An unknown status reads as waiting.
 */
export function offerSteps(o: OfferStepsInput, today: string = todayUtc()): OfferStepsResult {
  const line = OFFER_STEPS.stepLine;
  const ended = (last: OfferStepKey, key: OfferEndingKey): OfferStepsResult => {
    const end = ending(key);
    return { steps: stepsReached(last, o), ending: end, stepLine: end.text };
  };

  switch (o.status) {
    case "rejected":
      return ended("reviewing", "rejected");
    case "withdrawn":
      return ended("sent", "withdrawn");
    case "cancelled":
      return ended(
        "sent",
        o.campaignStatus === "closed" || o.campaignStatus === "completed" ? "closed_with_campaign" : "campaign_cancelled",
      );
    case "released":
      return ended("accepted", hasValue(o.closeReleasedAt) ? "released_at_close" : "released");
    case "expired":
      return ended("accepted", "expired");
    case "accepted": {
      if (hasValue(o.returnedAt)) return ended("underway", "returned");
      const started =
        (o.offerMode === "lend" && reachedDay(o.availableFrom, today)) || reachedDay(o.needStartsOn, today);
      return { steps: stepsUpTo(started ? "underway" : "accepted", o), ending: null, stepLine: line.accepted };
    }
    case "fulfilled":
      if (hasValue(o.returnedAt)) return ended("delivered", "returned");
      return { steps: stepsUpTo("delivered", o), ending: null, stepLine: line.fulfilled };
    case "thanked":
      if (hasValue(o.returnedAt)) return ended("thanked", "returned");
      return { steps: stepsUpTo("thanked", o), ending: null, stepLine: line.thanked };
    case "pending":
    default:
      return { steps: stepsUpTo("reviewing", o), ending: null, stepLine: line.pending };
  }
}

// ── The arrival note ─────────────────────────────────────────────────────────

/** The six fields of an arrival note, in the order they show. */
export const ARRIVAL_FIELDS = ["whereToGo", "whatToBring", "askFor", "meals", "beds", "gettingThere"] as const;
export type ArrivalField = (typeof ARRIVAL_FIELDS)[number];

/** A stored note row, or any object carrying some of the six fields. */
export type ArrivalNoteFields = Partial<Record<ArrivalField, string | null | undefined>>;

/** A note after resolution: every field, null where neither note says anything. */
export type ResolvedArrivalNote = Record<ArrivalField, string | null>;

function fieldText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Field by field: the need's note when that field is set, else the campaign
 * note's. Null when nothing is set on either. A freeform offer (no need)
 * passes null for the need's note and reads the campaign note.
 */
export function resolveArrivalNote(
  campaignNote: ArrivalNoteFields | null | undefined,
  needNote: ArrivalNoteFields | null | undefined,
): ResolvedArrivalNote | null {
  const out = {} as ResolvedArrivalNote;
  let any = false;
  for (const f of ARRIVAL_FIELDS) {
    const v = fieldText(needNote?.[f]) ?? fieldText(campaignNote?.[f]);
    out[f] = v;
    if (v != null) any = true;
  }
  return any ? out : null;
}

/** A resolved note as labelled lines for the contributor, set fields only, in order. */
export function arrivalNoteLines(note: ResolvedArrivalNote | null | undefined): Array<{ field: ArrivalField; label: string; text: string }> {
  if (!note) return [];
  const out: Array<{ field: ArrivalField; label: string; text: string }> = [];
  for (const f of ARRIVAL_FIELDS) {
    const text = note[f];
    if (text) out.push({ field: f, label: ARRIVAL.viewLabels[f], text });
  }
  return out;
}
