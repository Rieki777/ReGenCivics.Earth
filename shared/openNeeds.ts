/**
 * The Needs tab read: every open need across live campaigns, least covered
 * first (build spec 2026-09-25, section 9.1). Pure: the server
 * (campaigns.listOpenNeeds) loads the rows and this builds the answer, so
 * the ranking and the row shape are unit tested without a database.
 *
 * Privacy: a row carries counts and a status, never a contributor's name,
 * contact or the dates on someone's loan. server/open-needs.test.ts pins
 * the key set.
 *
 * Ranking (rankOpenNeeds): needs no one has offered on first, then the
 * smallest offered share, then the project's pinned needs, then the newest
 * campaign, then the need id. No popularity sort anywhere.
 */
import type { CapitalType } from "./capitals";
import {
  computeCampaignProgress,
  type NeedStatusKey,
  type ProgressCampaign,
  type ProgressItem,
  type ProgressLend,
  type ProgressRoute,
  type ProgressRow,
} from "./campaignProgress";
import {
  capitalForItem,
  effectiveWorkMode,
  formatShortDay,
  isMoneyKind,
  kindForItem,
  needChip,
  needTitle,
  needVerb,
  roleTimeLine,
  thingWindowLine,
  toDay,
  todayUtc,
  type NeedChip,
  type NeedVerb,
} from "./crowdpoolNeedAction";
import { ROUTE_LABELS } from "./crowdpoolCopy";
import { projectPathForCampaignFocus } from "./projectKey";

export const OPEN_NEEDS_CACHE_KEY = "crowdpool:open-needs";
export const OPEN_NEEDS_CACHE_SECONDS = 60;
/** Real campaigns' needs, at most. */
export const OPEN_NEEDS_MAX = 300;
/** Example campaigns' needs, at most. */
export const OPEN_EXAMPLE_NEEDS_MAX = 100;

export type OpenNeedRow = {
  needId: number;
  campaignId: number;
  projectName: string;
  campaignTitle: string;
  location: string | null;
  isDemo: boolean;
  /** The project page focused on this campaign, opening the offer sheet for this need. */
  path: string;
  kind: string;
  chip: NeedChip;
  verb: NeedVerb;
  title: string;
  detail: string | null;
  status: { key: NeedStatusKey; text: string };
  noOffersYet: boolean;
  place: "land" | "remote" | "either" | null;
  capitalType: CapitalType;
};

export type OpenRouteRow = {
  campaignId: number;
  projectName: string;
  partner: string;
  label: string;
  /** The project page's money block. */
  path: string;
  isDemo: boolean;
};

export type OpenNeedsResult = {
  needs: OpenNeedRow[];
  examples: OpenNeedRow[];
  routes: OpenRouteRow[];
  exampleRoutes: OpenRouteRow[];
  realCampaignCount: number;
};

/** The key set every OpenNeedRow carries, and nothing else. */
export const OPEN_NEED_ROW_KEYS = [
  "needId", "campaignId", "projectName", "campaignTitle", "location", "isDemo", "path",
  "kind", "chip", "verb", "title", "detail", "status", "noOffersYet", "place", "capitalType",
] as const satisfies ReadonlyArray<keyof OpenNeedRow>;

export const OPEN_ROUTE_ROW_KEYS = [
  "campaignId", "projectName", "partner", "label", "path", "isDemo",
] as const satisfies ReadonlyArray<keyof OpenRouteRow>;

export type OpenNeedsCampaign = ProgressCampaign & {
  id: number;
  applicationId: number | null;
  projectName: string | null;
  title: string;
  location: string | null;
};

export type OpenNeedsItem = ProgressItem & { priorityPinned?: number | boolean | null };

export type OpenNeedsInputs = {
  items: OpenNeedsItem[];
  rows: ProgressRow[];
  lends: ProgressLend[];
  routes: ProgressRoute[];
};

/** A route as the server loads it for the Needs tab (no URL, no review fields). */
export type OpenNeedsRouteInput = {
  campaignId: number;
  partner: string;
  label: string | null;
  status: string;
};

/** What rankOpenNeeds reads from each row. */
export type RankFields = {
  needId: number;
  offerCount: number;
  offered: number;
  wanted: number;
  pinned: boolean;
  /** The campaign's start (or publish) time in ms; 0 when unknown. */
  startedAtMs: number;
};

function offeredShare(r: RankFields): number {
  if (r.wanted > 0) return r.offered / r.wanted;
  return r.offered > 0 ? Number.POSITIVE_INFINITY : 0;
}

/**
 * Least covered first: no offers, then the smallest offered share, then
 * pinned, then the newest campaign, then need id. Returns a new array.
 */
export function rankOpenNeeds<T extends RankFields>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aNone = a.offerCount <= 0 ? 0 : 1;
    const bNone = b.offerCount <= 0 ? 0 : 1;
    if (aNone !== bNone) return aNone - bNone;
    const share = offeredShare(a) - offeredShare(b);
    if (share !== 0 && !Number.isNaN(share)) return share < 0 ? -1 : 1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.startedAtMs !== b.startedAtMs) return b.startedAtMs - a.startedAtMs;
    return a.needId - b.needId;
  });
}

function timeMs(v: Date | string | null | undefined): number {
  if (v == null) return 0;
  const t = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isFinite(t) ? t : 0;
}

function truthy(v: number | boolean | null | undefined): boolean {
  return v === true || (typeof v === "number" && v !== 0);
}

/** One short line under a need's title: its time, its window and modes, or its day. */
function needDetail(item: OpenNeedsItem, kind: string, today: string): string | null {
  if (kind === "role") return roleTimeLine(item, today);
  if (kind === "item" || kind === "loan") return thingWindowLine(item, today);
  if (kind === "shift") {
    const day = toDay(item.shiftStartsAt ?? null);
    return day ? `On ${formatShortDay(day, today)}` : null;
  }
  return null;
}

/**
 * Build the Needs tab answer from live public campaigns (the server passes
 * only status 'active' campaigns that pass isPublicCampaign), their progress
 * inputs and their shown routes.
 */
export function buildOpenNeeds(input: {
  campaigns: OpenNeedsCampaign[];
  inputs: Map<number, OpenNeedsInputs>;
  routes: OpenNeedsRouteInput[];
  today?: string;
}): OpenNeedsResult {
  const today = input.today ?? todayUtc();
  const real: Array<OpenNeedRow & { rank: RankFields }> = [];
  const examples: Array<OpenNeedRow & { rank: RankFields }> = [];
  const byId = new Map<number, OpenNeedsCampaign>();

  for (const c of input.campaigns) {
    byId.set(c.id, c);
    const data = input.inputs.get(c.id) ?? { items: [], rows: [], lends: [], routes: [] };
    const progress = computeCampaignProgress({ campaign: c, ...data });
    const isDemo = truthy(c.isDemo as number | boolean | null);
    const projectName = (c.projectName && c.projectName.trim()) || c.title;
    const base = projectPathForCampaignFocus({ id: c.id, applicationId: c.applicationId, projectName: c.projectName, title: c.title });
    const startedAtMs = timeMs(c.startedAt) || timeMs(c.publishedAt ?? null);

    for (const item of data.items) {
      const kind = kindForItem(item);
      if (isMoneyKind(kind)) continue;
      const np = progress.byNeed[item.id];
      if (!np || np.filled) continue;
      const verb = needVerb(kind);
      const chip = needChip(kind);
      if (!verb || !chip) continue;
      const row: OpenNeedRow & { rank: RankFields } = {
        needId: item.id,
        campaignId: c.id,
        projectName,
        campaignTitle: c.title,
        location: c.location ?? null,
        isDemo,
        path: `${base}&offer=${item.id}#need-${item.id}`,
        kind,
        chip,
        verb,
        title: needTitle(item),
        detail: needDetail(item, kind, today),
        status: { key: np.status.key, text: np.status.text },
        noOffersYet: np.offerCount <= 0,
        place: effectiveWorkMode(item),
        capitalType: capitalForItem(item),
        rank: {
          needId: item.id,
          offerCount: np.offerCount,
          offered: np.offered,
          wanted: np.wanted,
          pinned: truthy(item.priorityPinned ?? null),
          startedAtMs,
        },
      };
      (isDemo ? examples : real).push(row);
    }
  }

  const strip = (list: Array<OpenNeedRow & { rank: RankFields }>, max: number): OpenNeedRow[] =>
    rankOpenNeeds(list.map((r) => ({ ...r.rank, row: r })))
      .slice(0, max)
      .map(({ row }) => {
        const { rank: _rank, ...rest } = row;
        return rest;
      });

  const routes: OpenRouteRow[] = [];
  const exampleRoutes: OpenRouteRow[] = [];
  for (const r of input.routes) {
    const c = byId.get(r.campaignId);
    if (!c) continue;
    const isDemo = truthy(c.isDemo as number | boolean | null);
    const shown = isDemo ? r.status === "verified" || r.status === "example" : r.status === "verified";
    if (!shown) continue;
    const row: OpenRouteRow = {
      campaignId: c.id,
      projectName: (c.projectName && c.projectName.trim()) || c.title,
      partner: r.partner,
      label: routeLabel(r.partner, r.label),
      path: `${projectPathForCampaignFocus({ id: c.id, applicationId: c.applicationId, projectName: c.projectName, title: c.title })}#money`,
      isDemo,
    };
    (isDemo ? exampleRoutes : routes).push(row);
  }

  return {
    needs: strip(real, OPEN_NEEDS_MAX),
    examples: strip(examples, OPEN_EXAMPLE_NEEDS_MAX),
    routes,
    exampleRoutes,
    realCampaignCount: input.campaigns.filter((c) => !truthy(c.isDemo as number | boolean | null)).length,
  };
}

/**
 * The two partners a steward can add always read with the shared words
 * (older seeded rows say "GoSteward"); any other route keeps its own label.
 */
function routeLabel(partner: string, stored: string | null): string {
  if (partner === "maearth" || partner === "gosteward") return ROUTE_LABELS[partner];
  return (stored && stored.trim()) || "Another way to put money in";
}
