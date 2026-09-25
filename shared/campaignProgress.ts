/**
 * One campaign progress reading, computed from rows. Pure: no React, no
 * tRPC, no database. The server runs it and returns it as `progress` on
 * campaigns.getById (full), campaigns.list rows (summary) and
 * projects.getPublic (full on the front campaign, summary on campaigns[]).
 * Every hub surface that shows how far a campaign has come reads this, so no
 * fourth total can drift in (build spec 2026-09-25, section 4).
 *
 * The two-line bar: in-kind first, then money.
 *   In-kind: needs met, and confirmed value against the in-kind ask. A need's
 *     confirmed value is capped at its own value, and a filled need counts its
 *     full value, so rounding never keeps a campaign from landing (ruling
 *     2026-09-24). Freeform offers (no need attached) show in the whole-ask
 *     sheet as other offers and do not count (question Q2).
 *   Money: money through verified routes (example routes on example
 *     campaigns) in the campaign's currency, gifts and loans both, loans
 *     marked (ruling 2026-09-24), plus any legacy on-platform crypto rows.
 *
 * `pledgedTotal` and `totalValue` on the campaign keep their meaning for
 * villages (crowdpool hub contract) and are not read here. Nothing is
 * derived by subtracting cached counters: every figure comes from rows.
 */
import { CAPITAL_TYPES, type CapitalType } from "./capitals";
import { DELIVERED_STATUSES, STANDING_STATUSES, isHoursNeed, roleFillState } from "./roleCapacity";
import {
  MONEY_NEED_KINDS,
  MONTHS_LONG,
  capitalForItem,
  formatShortDay,
  isMoneyKind,
  kindForItem,
  needShortLine,
  todayUtc,
  toDay,
  type NeedLike,
} from "./crowdpoolNeedAction";
import { ASKS_NO_MONEY } from "./crowdpoolCopy";

export { STANDING_STATUSES, DELIVERED_STATUSES, MONEY_NEED_KINDS };

/** Every status in which an offer is still on the table: waiting or standing. */
export const OFFERED_STATUSES = ["pending", "accepted", "fulfilled", "thanked"] as const;

/**
 * Freeform rows (no need attached) map to a capital by their contribution
 * type. When a row fills a need, the need's capitalType wins. Moved here from
 * server/routes/campaigns.ts (CONTRIBUTION_TYPE_TO_CAPITAL).
 */
export const FREEFORM_TYPE_TO_CAPITAL = {
  land: "living",
  equipment: "material",
  role: "experiential",
  resource: "material",
  financial: "financial",
  knowledge: "intellectual",
} as const satisfies Record<string, CapitalType>;

// ── Inputs ───────────────────────────────────────────────────────────────────

export type ProgressCampaign = {
  status: string;
  isDemo: boolean | number | null;
  financialTarget: number;
  currency: string | null;
  startedAt: Date | string | null;
  publishedAt?: Date | string | null;
  durationDays: number | null;
};

export type ProgressItem = NeedLike & { id: number; estimatedValue: number; quantityWanted: number };

/** Contribution rows grouped by need, status, type and mode (server/db.ts getCampaignProgressInputs). */
export type ProgressRow = {
  campaignItemId: number | null;
  status: string;
  contributionType: string;
  offerMode: "give" | "lend" | null;
  quantity: number;
  value: number;
  financialValue: number;
  count: number;
};

/** Offered or standing lends not yet returned, one per contribution. */
export type ProgressLend = {
  campaignItemId: number | null;
  quantity: number;
  availableFrom: string | Date | null;
  lendUntil: string | Date | null;
};

export type ProgressRoute = {
  partner: "maearth" | "gosteward" | "grant" | "other";
  status: "verified" | "example";
  cachedRaised: number | null;
  cachedCurrency: string | null;
  lastFetchedAt: Date | string | null;
};

// ── Outputs ──────────────────────────────────────────────────────────────────

export type ProgressState = "draft" | "open" | "money_landed" | "in_kind_landed" | "both_landed" | "complete" | "cancelled";

export type NeedStatusKey = "filled" | "waiting" | "partly" | "none";

export type NeedProgress = {
  unit: "count" | "hours_per_week";
  wanted: number;
  confirmed: number;
  delivered: number;
  offered: number;
  offerCount: number;
  open: number;
  filled: boolean;
  confirmedValue: number;
  deliveredValue: number;
  gives: number;
  lends: Array<{ quantity: number; from: string | null; until: string | null }>;
  status: { key: NeedStatusKey; text: string };
};

export type CampaignProgress = {
  currency: string;
  isExample: boolean;
  state: ProgressState;
  /** state 'open' and in-kind at 85% or more and (no money asked or money at 85% or more). */
  almostComplete: boolean;
  /** ISO. Null before the campaign goes live. */
  endsAt: string | null;
  inKind: {
    ask: number;
    confirmed: number;
    delivered: number;
    pct: number;
    needsTotal: number;
    needsMet: number;
    landed: boolean;
    otherOffers: number;
  };
  money: {
    ask: number;
    asksNone: boolean;
    raised: number;
    given: number;
    lent: number;
    pledgedHere: number;
    pct: number;
    landed: boolean;
    hasRoutes: boolean;
    notAdded: Array<{ partner: string; amount: number; currency: string | null }>;
  };
  open: { count: number; roles: number; things: number; shifts: number; sessions: number };
  byNeed: Record<number, NeedProgress>;
  byCapital: Array<{
    capital: CapitalType;
    asked: number;
    confirmed: number;
    delivered: number;
    otherOffers: number;
    needIds: number[];
  }>;
};

export type CampaignProgressSummary = Omit<CampaignProgress, "byNeed" | "byCapital"> & {
  topOpen: Array<{ id: number; line: string }>;
};

export type ProgressLines = {
  inKind: string;
  inKindDelivered: string | null;
  money: string;
  open: string | null;
  halves: string | null;
  completion: string | null;
  closes: string | null;
  inKindShort: string;
  moneyShort: string;
  stateTag: string;
};

// ── Small helpers ────────────────────────────────────────────────────────────

function num(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function whole(n: unknown): number {
  const v = Math.floor(num(n));
  return v > 0 ? v : 0;
}

function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A share in percent, capped at 100 and floored to one decimal, so 100 means landed. */
function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.floor((part / whole) * 1000) / 10);
}

function inList(list: readonly string[], v: string): boolean {
  return list.includes(v);
}

function sameCurrency(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.trim().toUpperCase() === b.trim().toUpperCase();
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** (startedAt or publishedAt) plus durationDays. Null before going live. */
export function campaignEndsAt(c: ProgressCampaign): Date | null {
  const start = toDate(c.startedAt) ?? toDate(c.publishedAt ?? null);
  if (!start) return null;
  const days = num(c.durationDays);
  if (days <= 0) return null;
  return new Date(start.getTime() + days * 86_400_000);
}

/** "14 March 2027": day, full month, year, in UTC. */
export function formatCloseDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Per need ─────────────────────────────────────────────────────────────────

/** A need's status in words, shown under its meter. */
export function needStatus(np: Pick<NeedProgress, "unit" | "wanted" | "offered" | "offerCount" | "filled">): {
  key: NeedStatusKey;
  text: string;
} {
  if (np.filled) return { key: "filled", text: "Filled" };
  if (np.offerCount <= 0 || np.offered <= 0) return { key: "none", text: "No one has offered yet" };
  if (np.offered >= np.wanted) return { key: "waiting", text: "Offered, waiting on the stewards" };
  if (np.unit === "hours_per_week") {
    return { key: "partly", text: `${np.offered} of ${np.wanted} hours a week offered` };
  }
  return { key: "partly", text: `${np.offered} of ${np.wanted} offered` };
}

/**
 * What is already offered on a thing need: "Offered so far: 2 to give. 1 to
 * lend, 1 Apr to 30 Jun." Up to three lends, soonest first. Null when
 * nothing is offered to give or lend.
 */
export function offeredLine(np: Pick<NeedProgress, "gives" | "lends">, today: string = todayUtc()): string | null {
  const lends = np.lends.filter((l) => l.quantity > 0);
  if (np.gives <= 0 && lends.length === 0) return null;
  let line = "Offered so far:";
  if (np.gives > 0) line += ` ${np.gives} to give.`;
  for (const l of lends.slice(0, 3)) {
    if (l.from && l.until) line += ` ${l.quantity} to lend, ${formatShortDay(l.from, today)} to ${formatShortDay(l.until, today)}.`;
    else if (l.until) line += ` ${l.quantity} to lend, until ${formatShortDay(l.until, today)}.`;
    else line += ` ${l.quantity} to lend.`;
  }
  return line;
}

// ── The reading ──────────────────────────────────────────────────────────────

function stateFor(status: string, inKindLanded: boolean, moneyLanded: boolean, asksNone: boolean): ProgressState {
  switch (status) {
    case "cancelled":
      return "cancelled";
    case "completed":
    case "funded": // legacy status; the word is always complete
      return "complete";
    case "active":
      if (inKindLanded && (asksNone || moneyLanded)) return "both_landed";
      if (inKindLanded) return "in_kind_landed";
      if (moneyLanded) return "money_landed";
      return "open";
    default: // draft, pending_review, rejected
      return "draft";
  }
}

export function computeCampaignProgress(input: {
  campaign: ProgressCampaign;
  items: ProgressItem[];
  rows: ProgressRow[];
  lends: ProgressLend[];
  routes: ProgressRoute[];
  now?: Date;
}): CampaignProgress {
  const { campaign } = input;
  const currency = (campaign.currency || "USD").trim() || "USD";
  const isExample = num(campaign.isDemo) !== 0;

  const itemsById = new Map<number, ProgressItem>();
  for (const item of input.items) itemsById.set(item.id, item);
  const inKindItems = input.items.filter((i) => !isMoneyKind(kindForItem(i)));

  // Rows by need. Rows whose need is gone count as freeform.
  const rowsByNeed = new Map<number, ProgressRow[]>();
  const freeformRows: ProgressRow[] = [];
  let pledgedHere = 0;
  for (const r of input.rows) {
    const standing = inList(STANDING_STATUSES, r.status);
    if (standing && r.contributionType === "financial") pledgedHere += num(r.financialValue);
    const need = r.campaignItemId != null ? itemsById.get(r.campaignItemId) : undefined;
    if (!need) {
      freeformRows.push(r);
      continue;
    }
    const list = rowsByNeed.get(need.id) ?? [];
    list.push(r);
    rowsByNeed.set(need.id, list);
  }

  const lendsByNeed = new Map<number, ProgressLend[]>();
  for (const l of input.lends) {
    if (l.campaignItemId == null) continue;
    const list = lendsByNeed.get(l.campaignItemId) ?? [];
    list.push(l);
    lendsByNeed.set(l.campaignItemId, list);
  }

  // ── In-kind, need by need ──
  const byNeed: Record<number, NeedProgress> = {};
  const open = { count: 0, roles: 0, things: 0, shifts: 0, sessions: 0 };
  let inKindAsk = 0;
  let inKindConfirmed = 0;
  let inKindDelivered = 0;
  let needsMet = 0;

  for (const item of inKindItems) {
    const kind = kindForItem(item);
    const rows = rowsByNeed.get(item.id) ?? [];
    const value = Math.max(0, num(item.estimatedValue));
    const wanted = whole(item.quantityWanted);
    let confirmed = 0;
    let delivered = 0;
    let offered = 0;
    let offerCount = 0;
    let standingValue = 0;
    let deliveredRowValue = 0;
    let gives = 0;
    for (const r of rows) {
      const q = whole(r.quantity);
      if (inList(STANDING_STATUSES, r.status)) {
        confirmed += q;
        standingValue += num(r.value);
      }
      if (inList(DELIVERED_STATUSES, r.status)) {
        delivered += q;
        deliveredRowValue += num(r.value);
      }
      if (inList(OFFERED_STATUSES, r.status)) {
        offered += q;
        offerCount += whole(r.count);
        if ((kind === "item" || kind === "loan") && r.offerMode !== "lend") gives += q;
      }
    }
    // A thing on a loan-only need is lent even when its row predates the mode.
    if (kind === "loan") gives = 0;

    const hours = isHoursNeed({ kind, capacityUnit: item.capacityUnit ?? null });
    const filled = hours
      ? roleFillState({
          kind,
          capacityUnit: item.capacityUnit ?? null,
          quantityWanted: wanted,
          quantityClaimed: confirmed,
          quantityDelivered: delivered,
          estimatedValue: value,
        }).filled
      : confirmed >= Math.max(wanted, 1);

    const confirmedValue = filled ? value : Math.min(Math.max(standingValue, 0), value);
    const deliveredValue = Math.min(Math.max(deliveredRowValue, 0), value);
    const lends = (lendsByNeed.get(item.id) ?? [])
      .map((l) => ({ quantity: whole(l.quantity), from: toDay(l.availableFrom), until: toDay(l.lendUntil) }))
      .sort((a, b) => (a.from ?? "").localeCompare(b.from ?? "") || (a.until ?? "").localeCompare(b.until ?? ""));

    const np: NeedProgress = {
      unit: hours ? "hours_per_week" : "count",
      wanted,
      confirmed,
      delivered,
      offered,
      offerCount,
      open: Math.max(wanted - confirmed, 0),
      filled,
      confirmedValue: cents(confirmedValue),
      deliveredValue: cents(deliveredValue),
      gives,
      lends,
      status: { key: "none", text: "" },
    };
    np.status = needStatus(np);
    byNeed[item.id] = np;

    inKindAsk += value;
    inKindConfirmed += np.confirmedValue;
    inKindDelivered += np.deliveredValue;
    if (filled) {
      needsMet++;
    } else {
      open.count++;
      if (kind === "role") open.roles++;
      else if (kind === "item" || kind === "loan") open.things++;
      else if (kind === "shift") open.shifts++;
      else if (kind === "knowledge") open.sessions++;
    }
  }

  let otherOffers = 0;
  for (const r of freeformRows) {
    if (inList(STANDING_STATUSES, r.status) && r.contributionType !== "financial") otherOffers += num(r.value);
  }

  const needsTotal = inKindItems.length;
  const inKindLanded = needsTotal > 0 && needsMet === needsTotal;

  // ── Money ──
  const cryptoAsk = input.items
    .filter((i) => kindForItem(i) === "crypto")
    .reduce((sum, i) => sum + Math.max(0, num(i.estimatedValue)), 0);
  const moneyAsk = cents(Math.max(0, num(campaign.financialTarget)) + cryptoAsk);
  const asksNone = moneyAsk <= 0;

  const routes = input.routes.filter((r) => r.status === "verified" || (r.status === "example" && isExample));
  let given = 0;
  let lent = 0;
  const notAdded: CampaignProgress["money"]["notAdded"] = [];
  for (const r of routes) {
    const amount = r.cachedRaised == null ? null : num(r.cachedRaised);
    if (amount == null || amount <= 0) continue;
    const routeCurrency = r.cachedCurrency ?? (r.status === "example" ? currency : null);
    if (!sameCurrency(routeCurrency, currency)) {
      notAdded.push({ partner: r.partner, amount, currency: routeCurrency });
      continue;
    }
    if (r.partner === "gosteward") lent += amount;
    else given += amount;
  }
  const raised = cents(given + lent + pledgedHere);
  const moneyLanded = moneyAsk > 0 && raised >= moneyAsk;

  const inKind = {
    ask: cents(inKindAsk),
    confirmed: cents(inKindConfirmed),
    delivered: cents(inKindDelivered),
    pct: pctOf(inKindConfirmed, inKindAsk),
    needsTotal,
    needsMet,
    landed: inKindLanded,
    otherOffers: cents(otherOffers),
  };
  const money = {
    ask: moneyAsk,
    asksNone,
    raised,
    given: cents(given),
    lent: cents(lent),
    pledgedHere: cents(pledgedHere),
    pct: pctOf(raised, moneyAsk),
    landed: moneyLanded,
    hasRoutes: routes.length > 0,
    notAdded,
  };

  const state = stateFor(campaign.status, inKindLanded, moneyLanded, asksNone);
  const almostComplete = state === "open" && inKind.pct >= 85 && (asksNone || money.pct >= 85);
  const endsAt = campaignEndsAt(campaign);

  // ── The nine forms of capital ──
  const byCapital: CampaignProgress["byCapital"] = CAPITAL_TYPES.map((capital) => ({
    capital,
    asked: 0,
    confirmed: 0,
    delivered: 0,
    otherOffers: 0,
    needIds: [] as number[],
  }));
  const capitalRow = (c: CapitalType) => byCapital.find((row) => row.capital === c) ?? byCapital[2];
  for (const item of inKindItems) {
    const row = capitalRow(capitalForItem(item));
    const np = byNeed[item.id];
    row.asked += Math.max(0, num(item.estimatedValue));
    row.confirmed += np.confirmedValue;
    row.delivered += np.deliveredValue;
    row.needIds.push(item.id);
  }
  const financialRow = capitalRow("financial");
  financialRow.asked += moneyAsk;
  financialRow.confirmed += Math.min(raised, moneyAsk);
  for (const r of freeformRows) {
    if (!inList(STANDING_STATUSES, r.status) || r.contributionType === "financial") continue;
    const capital = (FREEFORM_TYPE_TO_CAPITAL as Record<string, CapitalType>)[r.contributionType] ?? "material";
    capitalRow(capital).otherOffers += num(r.value);
  }
  for (const row of byCapital) {
    row.asked = cents(row.asked);
    row.confirmed = cents(row.confirmed);
    row.delivered = cents(row.delivered);
    row.otherOffers = cents(row.otherOffers);
  }

  return {
    currency,
    isExample,
    state,
    almostComplete,
    endsAt: endsAt ? endsAt.toISOString() : null,
    inKind,
    money,
    open,
    byNeed,
    byCapital,
  };
}

/**
 * The reading without per-need and per-capital detail, plus up to three open
 * needs: fewest offers first, then the smallest share offered.
 */
export function summarizeProgress(p: CampaignProgress, items: ProgressItem[], today: string = todayUtc()): CampaignProgressSummary {
  const { byNeed, byCapital, ...rest } = p;
  void byCapital;
  const openNeeds = items
    .filter((i) => byNeed[i.id] && !byNeed[i.id].filled)
    .map((i) => {
      const np = byNeed[i.id];
      return { item: i, offerCount: np.offerCount, share: np.wanted > 0 ? np.offered / np.wanted : 0 };
    })
    .sort((a, b) => a.offerCount - b.offerCount || a.share - b.share || a.item.id - b.item.id)
    .slice(0, 3);
  return {
    ...rest,
    topOpen: openNeeds.map((o) => ({ id: o.item.id, line: needShortLine(o.item, today) })),
  };
}

// ── Lines ────────────────────────────────────────────────────────────────────

type AnyProgress = CampaignProgress | CampaignProgressSummary;

function openListLine(open: AnyProgress["open"]): string {
  const parts: string[] = [];
  if (open.roles) parts.push(plural(open.roles, "role", "roles"));
  if (open.things) parts.push(plural(open.things, "thing", "things"));
  if (open.shifts) parts.push(plural(open.shifts, "shift", "shifts"));
  if (open.sessions) parts.push(plural(open.sessions, "session", "sessions"));
  return parts.join(", ");
}

/** "6 needs still open. 2 roles, 3 things, 1 shift." / "Every need is met." / null with no needs. */
function openLine(p: AnyProgress): string | null {
  if (p.inKind.needsTotal === 0) return null;
  if (p.open.count === 0) return "Every need is met.";
  const list = openListLine(p.open);
  const head = `${plural(p.open.count, "need", "needs")} still open.`;
  return list ? `${head} ${list}.` : head;
}

/**
 * Every line the two-line bar and its neighbours print, from one reading.
 * `fmt` formats an amount in the campaign's currency (client
 * makeCurrencyFormatter; server Intl.NumberFormat en-US, no decimals).
 */
export function progressLines(p: AnyProgress, fmt: (n: number) => string): ProgressLines {
  const { inKind, money } = p;
  const endsAt = p.endsAt ? new Date(p.endsAt) : null;
  const date = endsAt && !isNaN(endsAt.getTime()) ? formatCloseDate(endsAt) : null;

  const inKindLine = inKind.needsTotal === 0
    ? "This project lists no in-kind needs yet."
    : `In-kind: ${inKind.needsMet} of ${inKind.needsTotal} needs met (${fmt(inKind.confirmed)} of ${fmt(inKind.ask)} confirmed)`;

  const moneyShort = money.asksNone ? ASKS_NO_MONEY : `Money: ${fmt(Math.min(money.raised, money.ask))} of ${fmt(money.ask)}`;
  let moneyLine = moneyShort;
  if (!money.asksNone) {
    if (money.hasRoutes && money.pledgedHere === 0 && money.raised > 0) moneyLine += " through partner routes";
    if (money.lent > 0) moneyLine += ` (${fmt(money.lent)} of it lent)`;
  }

  let halves: string | null = null;
  if (p.state === "money_landed") {
    halves = `Money half landed. The in-kind half still has ${plural(p.open.count, "need", "needs")} open.`;
  } else if (p.state === "in_kind_landed") {
    halves = `In-kind half landed. The money half still needs ${fmt(Math.max(money.ask - money.raised, 0))}.`;
  } else if (p.state === "both_landed") {
    halves = money.asksNone ? "Every need is confirmed." : "Both halves have landed.";
  }

  let completion: string | null;
  if (p.isExample) {
    completion = "On a real campaign, complete means the money half and the in-kind half both land by its close date.";
  } else if (p.state === "cancelled") {
    completion = null;
  } else if (p.state === "complete") {
    completion = "This campaign is complete.";
  } else {
    const by = date ? `by ${date}` : "by the close date";
    completion = money.asksNone
      ? `Complete means every need is confirmed ${by}.`
      : `Complete means the money half and the in-kind half both land ${by}.`;
  }

  const live = p.state !== "draft" && p.state !== "complete" && p.state !== "cancelled";
  const closes = !p.isExample && live && date ? `Closes ${date}` : null;

  let stateTag: string;
  if (p.isExample) stateTag = "Example";
  else if (p.state === "complete") stateTag = "Complete";
  else if (p.state === "cancelled") stateTag = "Cancelled";
  else if (p.state === "draft") stateTag = "Not live yet";
  else if (p.almostComplete) stateTag = "Almost complete";
  else stateTag = "Open for offers";

  return {
    inKind: inKindLine,
    inKindDelivered: inKind.delivered > 0 ? `${fmt(inKind.delivered)} of it delivered so far` : null,
    money: moneyLine,
    open: openLine(p),
    halves,
    completion,
    closes,
    inKindShort: inKind.needsTotal === 0
      ? "This project lists no in-kind needs yet."
      : `In-kind: ${inKind.needsMet} of ${inKind.needsTotal} needs met`,
    moneyShort,
    stateTag,
  };
}

/**
 * What each bar tells assistive tech: aria-valuenow is the whole percent and
 * aria-valuetext is the visible line, exactly (section 8.2). The segments
 * are percentages of the ask: in-kind confirmed (striped) with delivered
 * (solid) on top; money given (solid) and lent (striped). No money bar when
 * the project asks for none.
 */
export function progressBars(
  p: AnyProgress,
  fmt: (n: number) => string,
  variant: "full" | "compact" = "full",
): {
  inKind: { label: "In-kind"; now: number; text: string; confirmedPct: number; deliveredPct: number };
  money: { label: "Money"; now: number; text: string; givenPct: number; lentPct: number } | null;
} {
  const lines = progressLines(p, fmt);
  const { inKind, money } = p;
  const givenAndHere = money.given + money.pledgedHere;
  const givenPct = pctOf(Math.min(givenAndHere, money.ask), money.ask);
  const lentPct = Math.min(pctOf(money.lent, money.ask), Math.max(0, 100 - givenPct));
  return {
    inKind: {
      label: "In-kind",
      now: Math.floor(inKind.pct),
      text: variant === "full" ? lines.inKind : lines.inKindShort,
      confirmedPct: inKind.pct,
      deliveredPct: pctOf(inKind.delivered, inKind.ask),
    },
    money: money.asksNone
      ? null
      : {
          label: "Money",
          now: Math.floor(money.pct),
          text: variant === "full" ? lines.money : lines.moneyShort,
          givenPct,
          lentPct,
        },
  };
}

/** One line to share a campaign with. */
export function shareLine(projectName: string, p: CampaignProgressSummary | CampaignProgress): string {
  if (p.isExample) return `${projectName} is an example campaign on ReGen Civics.`;
  const open = openLine(p);
  return open ? `${projectName} is crowdpooling on ReGen Civics. ${open}` : `${projectName} is crowdpooling on ReGen Civics.`;
}

// ── Money share: a soft note, never a rule (ruling 2026-09-24) ──────────────

/** Money as a whole percent of the whole ask. 0 when both are 0. */
export function moneySharePct(inKindAsk: number, moneyAsk: number): number {
  const i = Math.max(0, num(inKindAsk));
  const m = Math.max(0, num(moneyAsk));
  if (i + m <= 0) return 0;
  return Math.round((m / (i + m)) * 100);
}

/**
 * The note a steward or admin sees beside the money ask. Contributors never
 * see it, and nothing blocks. `outside` is true when the share sits outside
 * the usual band. Line is null while nothing has been asked at all.
 */
export function moneyShareNote(a: {
  inKindAsk: number;
  moneyAsk: number;
  asksNone: boolean;
  band: { softMinPct: number; softMaxPct: number };
}): { line: string | null; outside: boolean } {
  if (a.asksNone) return { line: "This project asks for no money.", outside: false };
  if (num(a.inKindAsk) + num(a.moneyAsk) <= 0) return { line: null, outside: false };
  const pct = moneySharePct(a.inKindAsk, a.moneyAsk);
  const outside = pct < a.band.softMinPct || pct > a.band.softMaxPct;
  let line = `Money is ${pct}% of the whole ask.`;
  if (outside) {
    line += ` Most campaigns ask for ${a.band.softMinPct} to ${a.band.softMaxPct} percent. You can send it as it is.`;
  }
  return { line, outside };
}

/** The money ask that makes money `defaultPct` percent of the whole: inKind x pct / (100 - pct), whole units. */
export function suggestedMoneyAsk(inKindAsk: number, defaultPct: number): number {
  const pct = num(defaultPct);
  if (pct <= 0 || pct >= 100) return 0;
  return Math.round((Math.max(0, num(inKindAsk)) * pct) / (100 - pct));
}

// ── What has happened (section 8.6) ─────────────────────────────────────────

export type TimelineInput = {
  campaign: {
    status: string;
    isDemo: boolean | number | null;
    startedAt?: Date | string | null;
    completedAt?: Date | string | null;
    /** The cancel stamps updatedAt; there is no cancelledAt column. */
    updatedAt?: Date | string | null;
  };
  progress: Pick<AnyProgress, "endsAt" | "isExample" | "state">;
  /** campaigns.getActivity rows. Its `kind` values stay pledged / delivered / thanked for villages. */
  activity: Array<{
    id: number;
    kind: string;
    contributorName: string;
    title: string;
    contributionType?: string | null;
    at: Date | string;
  }>;
  /** campaigns.listUpdates rows. */
  updates: Array<{
    id: number;
    updateNumber: number;
    title: string;
    body: string;
    publishedAt?: Date | string | null;
    createdAt?: Date | string | null;
  }>;
  now?: Date;
};

export type TimelineEntry = {
  key: string;
  kind: "closes" | "update" | "accepted" | "delivered" | "thanked" | "opened" | "complete" | "cancelled";
  /** ISO, or null when the source row had no date. */
  at: string | null;
  text: string;
  /** Update bodies only. */
  body: string | null;
  /** True for the close date still ahead. */
  upcoming: boolean;
};

/**
 * One timeline, newest first, with the close date still ahead on top (live,
 * real campaigns only). Names arrive already masked by the server; titles and
 * bodies arrive as stored, so the renderer decodes entities the way
 * CampaignUpdatesList does. No money figure appears here.
 */
export function buildCampaignTimeline(a: TimelineInput): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const iso = (v: Date | string | null | undefined) => toDate(v ?? null)?.toISOString() ?? null;

  for (const u of a.updates) {
    entries.push({
      key: `update-${u.id}`,
      kind: "update",
      at: iso(u.publishedAt ?? u.createdAt ?? null),
      text: `Update ${u.updateNumber}: ${u.title}`,
      body: u.body,
      upcoming: false,
    });
  }

  for (const act of a.activity) {
    const name = act.contributorName || "A contributor";
    let kind: TimelineEntry["kind"];
    let text: string;
    if (act.kind === "delivered") {
      kind = "delivered";
      text = `${name} delivered ${act.title}`;
    } else if (act.kind === "thanked") {
      kind = "thanked";
      text = `${name} was thanked for ${act.title}`;
    } else {
      kind = "accepted";
      text = act.contributionType === "role" ? `${name} took on ${act.title}` : `${name} is bringing ${act.title}`;
    }
    entries.push({ key: `activity-${act.id}-${kind}`, kind, at: iso(act.at), text, body: null, upcoming: false });
  }

  const opened = iso(a.campaign.startedAt ?? null);
  if (opened) entries.push({ key: "opened", kind: "opened", at: opened, text: "Campaign opened", body: null, upcoming: false });
  const completed = iso(a.campaign.completedAt ?? null);
  if (completed && a.progress.state === "complete") {
    entries.push({ key: "complete", kind: "complete", at: completed, text: "Campaign complete", body: null, upcoming: false });
  }
  if (a.campaign.status === "cancelled") {
    entries.push({ key: "cancelled", kind: "cancelled", at: iso(a.campaign.updatedAt ?? null), text: "Campaign cancelled", body: null, upcoming: false });
  }

  entries.sort((x, y) => (y.at ?? "").localeCompare(x.at ?? ""));

  const now = a.now ?? new Date();
  const ends = a.progress.endsAt ? new Date(a.progress.endsAt) : null;
  const live = a.campaign.status === "active";
  if (live && !a.progress.isExample && ends && !isNaN(ends.getTime()) && ends.getTime() >= now.getTime()) {
    entries.unshift({
      key: "closes",
      kind: "closes",
      at: ends.toISOString(),
      text: `Closes ${formatCloseDate(ends)}`,
      body: null,
      upcoming: true,
    });
  }
  return entries;
}
