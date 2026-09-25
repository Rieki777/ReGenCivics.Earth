/**
 * What a campaign need is, what it asks a person to do, and how it reads.
 * Pure: no React, no tRPC, no database. Shared by the server (progress,
 * the Needs tab read) and the client (need cards, the offer sheet).
 *
 * The verb on a need (build spec 2026-09-25, section 10.3):
 *   Apply    roles and knowledge sessions
 *   Offer    things (kind item, and legacy kind loan)
 *   Sign up  shifts
 * Money kinds (crypto, financial_link) are never shown as a need, so they
 * have no verb and no chip.
 *
 * Dates on a need (neededFrom, neededUntil, availableFrom, lendUntil) are
 * 'YYYY-MM-DD' strings end to end (drizzle date mode "string"). They are
 * compared as strings and formatted here by hand, in UTC, so a viewer's
 * timezone can never move a day.
 */
import { CAPITAL_TYPES, type CapitalType } from "./capitals";
import { isHoursNeed } from "./roleCapacity";

/** Need kinds that carry money. They never count toward the in-kind half. */
export const MONEY_NEED_KINDS = ["crypto", "financial_link"] as const;

/** Need kinds that are things: given or lent. Land is stored as kind item. */
export const THING_NEED_KINDS = ["item", "loan"] as const;

export type NeedLike = {
  kind?: string | null;
  category?: string | null;
  capitalType?: string | null;
  capacityUnit?: string | null;
  quantityWanted?: number;
  hoursPerWeek?: number | null;
  durationMonths?: number | null;
  roleTitle?: string | null;
  equipmentName?: string | null;
  resourceName?: string | null;
  hectares?: number | null;
  region?: string | null;
  landDescription?: string | null;
  neededFrom?: string | Date | null;
  neededUntil?: string | Date | null;
  acceptsGift?: number | boolean | null;
  acceptsLoan?: number | boolean | null;
  workMode?: string | null;
  shiftStartsAt?: Date | string | null;
};

export type NeedVerb = "Apply" | "Offer" | "Sign up";
export type NeedChip = "things" | "time" | "role" | "knowhow";

// ── Dates ────────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Today as 'YYYY-MM-DD' in UTC, the server's "today" for every date rule. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * A date column value as 'YYYY-MM-DD', or null. Accepts the string drizzle
 * returns, a longer timestamp string, or a Date (read in UTC).
 */
export function toDay(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** "1 Apr", with the year added when it is not this year: "1 Apr 2027". */
export function formatShortDay(day: string | Date | null | undefined, today: string = todayUtc()): string {
  const d = toDay(day);
  if (!d) return "";
  const [y, m, dd] = d.split("-").map(Number);
  const base = `${dd} ${MONTHS_SHORT[m - 1]}`;
  return String(y) === today.slice(0, 4) ? base : `${base} ${y}`;
}

/** Whole days from a to b ('YYYY-MM-DD'), UTC. */
function daysBetween(a: string, b: string): number {
  const ta = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const tb = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round((tb - ta) / 86_400_000);
}

function thousands(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function truthy(v: number | boolean | null | undefined): boolean {
  return v === true || (typeof v === "number" && v !== 0);
}

// ── What the need is ─────────────────────────────────────────────────────────

/** The need's kind. Legacy rows without one read from their category. */
export function kindForItem(item: NeedLike): string {
  if (item.kind) return item.kind;
  return item.category === "role" ? "role" : "item";
}

/** The form of capital a need feeds. Legacy items without one map from their old category. */
export function capitalForItem(item: NeedLike): CapitalType {
  if (item.capitalType && (CAPITAL_TYPES as readonly string[]).includes(item.capitalType)) {
    return item.capitalType as CapitalType;
  }
  switch (item.category) {
    case "land": return "living";
    case "role": return "experiential";
    default: return "material"; // equipment, resource
  }
}

/** The need's name as a person reads it. Was titleForItem in client/src/lib/needDisplay.ts; same output. */
export function needTitle(item: NeedLike): string {
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

export function isMoneyKind(kind: string): boolean {
  return (MONEY_NEED_KINDS as readonly string[]).includes(kind);
}

export function isThingKind(kind: string): boolean {
  return (THING_NEED_KINDS as readonly string[]).includes(kind);
}

/** The verb on the need's button. Null for money kinds, which never show as a need. */
export function needVerb(kind: string): NeedVerb | null {
  switch (kind) {
    case "role":
    case "knowledge":
      return "Apply";
    case "item":
    case "loan":
      return "Offer";
    case "shift":
      return "Sign up";
    default:
      return null;
  }
}

/** Which "What can you bring?" chip a need falls under. */
export function needChip(kind: string): NeedChip | null {
  switch (kind) {
    case "item":
    case "loan":
      return "things";
    case "shift":
      return "time";
    case "role":
      return "role";
    case "knowledge":
      return "knowhow";
    default:
      return null;
  }
}

/** Plain names for the chips, in the order they show. */
export const NEED_CHIP_LABELS: Record<NeedChip, string> = {
  things: "Things",
  time: "Time",
  role: "A role",
  knowhow: "Know-how",
};

/**
 * Which ways a thing may come. A legacy kind 'loan' need reads loan only
 * whatever its columns say. Roles, shifts and knowledge ignore the mode
 * columns and read as gift only.
 */
export function modesFor(item: NeedLike): { gift: boolean; loan: boolean } {
  const kind = kindForItem(item);
  if (kind === "loan") return { gift: false, loan: true };
  if (kind !== "item") return { gift: true, loan: false };
  const gift = item.acceptsGift == null ? true : truthy(item.acceptsGift);
  const loan = truthy(item.acceptsLoan);
  return { gift, loan };
}

/**
 * Where the need happens: the stored workMode ('on_site' reads 'land'),
 * otherwise 'land' for things and shifts (a thing arrives on the land; a
 * shift is a dated work day there), otherwise null (it doesn't say).
 */
export function effectiveWorkMode(item: NeedLike): "land" | "remote" | "either" | null {
  switch (item.workMode) {
    case "on_site": return "land";
    case "remote": return "remote";
    case "either": return "either";
    default: break;
  }
  const kind = kindForItem(item);
  if (isThingKind(kind) || kind === "shift") return "land";
  return null;
}

// ── How the need reads ───────────────────────────────────────────────────────

/**
 * The title, description, submit label and success heading of the offer
 * sheet for a verb. "Freeform" is the "Offer something else" sheet.
 */
export function sheetCopy(
  verb: NeedVerb | "Freeform",
  title: string,
  campaignTitle: string,
): { title: string; description: string; submit: string; success: string } {
  switch (verb) {
    case "Apply":
      return {
        title: `Apply for ${title}`,
        description: `Your application goes to the stewards of ${campaignTitle}.`,
        submit: "Send my application",
        success: "Application sent",
      };
    case "Sign up":
      return {
        title: `Sign up for ${title}`,
        description: `Your sign-up goes to the stewards of ${campaignTitle}.`,
        submit: "Sign me up",
        success: "Sign-up sent",
      };
    case "Freeform":
      return {
        title: "Offer something else",
        description: `Tell the stewards of ${campaignTitle} what you'd bring.`,
        submit: "Send my offer",
        success: "Offer sent",
      };
    case "Offer":
    default:
      return {
        title: `Offer ${title}`,
        description: `Your offer goes to the stewards of ${campaignTitle}.`,
        submit: "Send my offer",
        success: "Offer sent",
      };
  }
}

/**
 * How much time a role asks for, in plain words (R18). Hours needs, with
 * h = quantityWanted:
 *   with neededUntil:    "20 hrs a week until 15 Dec, about 480 hours in all"
 *   with durationMonths: "20 hrs a week for 6 months, about 520 hours in all"
 *   otherwise:           "20 hrs a week"
 * A legacy count role with hoursPerWeek: "10 hrs a week each". Anything else: null.
 * `today` is 'YYYY-MM-DD' (UTC); it starts the count when the role has no
 * start date and decides whether a date needs its year.
 */
export function roleTimeLine(item: NeedLike, today: string = todayUtc()): string | null {
  if (kindForItem(item) !== "role") return null;
  if (isHoursNeed({ kind: kindForItem(item), capacityUnit: item.capacityUnit ?? null })) {
    const h = Math.max(0, Math.floor(Number(item.quantityWanted) || 0));
    if (h <= 0) return null;
    const until = toDay(item.neededUntil);
    if (until) {
      const from = toDay(item.neededFrom) ?? today;
      const weeks = Math.max(1, Math.round(daysBetween(from, until) / 7));
      return `${h} hrs a week until ${formatShortDay(until, today)}, about ${thousands(h * weeks)} hours in all`;
    }
    const months = Math.floor(Number(item.durationMonths) || 0);
    if (months > 0) {
      return `${h} hrs a week for ${plural(months, "month", "months")}, about ${thousands((h * months * 52) / 12)} hours in all`;
    }
    return `${h} hrs a week`;
  }
  const perWeek = Math.floor(Number(item.hoursPerWeek) || 0);
  return perWeek > 0 ? `${perWeek} hrs a week each` : null;
}

/**
 * The window and modes line on a thing need's card (section 6.1):
 * "Needed 1 Mar to 30 Jun. Give or lend." / "Needed by 30 Jun. On loan." /
 * "Needed from 1 Mar." / "Give or lend." Null for a gift-only thing with no
 * dates, and for anything that is not a thing.
 */
export function thingWindowLine(item: NeedLike, today: string = todayUtc()): string | null {
  if (!isThingKind(kindForItem(item))) return null;
  const from = toDay(item.neededFrom);
  const until = toDay(item.neededUntil);
  const parts: string[] = [];
  if (from && until) parts.push(`Needed ${formatShortDay(from, today)} to ${formatShortDay(until, today)}.`);
  else if (until) parts.push(`Needed by ${formatShortDay(until, today)}.`);
  else if (from) parts.push(`Needed from ${formatShortDay(from, today)}.`);
  const modes = modesFor(item);
  if (modes.gift && modes.loan) parts.push("Give or lend.");
  else if (modes.loan) parts.push("On loan.");
  return parts.length ? parts.join(" ") : null;
}

/**
 * One short line for a need, used where a campaign lists what is still open
 * (gallery cards, topOpen): "Farm manager, 20 hrs a week", "Planting day,
 * 12 places", "Tractor, 1 Mar to 30 Jun", or just the title.
 */
export function needShortLine(item: NeedLike, today: string = todayUtc()): string {
  const title = needTitle(item);
  const kind = kindForItem(item);
  if (kind === "role") {
    const hoursNeed = isHoursNeed({ kind, capacityUnit: item.capacityUnit ?? null });
    const h = Math.floor(Number(hoursNeed ? item.quantityWanted : item.hoursPerWeek) || 0);
    return h > 0 ? `${title}, ${h} hrs a week` : title;
  }
  if (kind === "shift") {
    const wanted = Math.floor(Number(item.quantityWanted) || 0);
    return wanted > 0 ? `${title}, ${plural(wanted, "place", "places")}` : title;
  }
  if (isThingKind(kind)) {
    const from = toDay(item.neededFrom);
    const until = toDay(item.neededUntil);
    if (from && until) return `${title}, ${formatShortDay(from, today)} to ${formatShortDay(until, today)}`;
    if (until) return `${title}, by ${formatShortDay(until, today)}`;
    if (from) return `${title}, from ${formatShortDay(from, today)}`;
  }
  return title;
}
