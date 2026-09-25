// server/routes/campaigns.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  campaigns as campaignsTable,
  campaignItems as campaignItemsTable,
  campaignContributions as campaignContributionsTable,
  userFollows,
  applications as applicationsTable,
  CrowdPoolingProject,
} from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { isAdminUser, pickPublic } from "../lib/public-projection";
import type { TrpcContext } from "../_core/context";
import type { Campaign, CampaignContribution } from "../../drizzle/schema";
import { sanitizeInput, sanitizeRichText } from "../_core/security";
import { designCompanionTurn } from "../lib/crowdpool-coach";
import { getGameVariable, recordScoreEvent, logActivityEvent } from "../game";
import { notifyIfEnabled } from "../notify-with-prefs";
import { generateImage } from "../_core/imageGeneration";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import { cacheGet, cacheSet, cacheDel } from "../cache";
import {
  assertCampaignSteward,
  canSeeCampaign,
  canStewardCampaign,
  canViewCampaign,
  isPublicCampaign,
} from "../lib/project-steward";
import { canTransition, type CampaignStatus } from "../../shared/campaignStatus";
import {
  MAX_OFFER_HOURS,
  MAX_ROLE_HOURS,
  FILLED_ROLE_REFUSAL,
  checkAcceptHours,
  isHoursNeed,
  reopenedOpenHours,
  roleFillState,
  scaleRoleValue,
} from "../../shared/roleCapacity";
import { projectPathForCampaignFocus } from "../../shared/projectKey";
import { FREEFORM_TYPE_TO_CAPITAL, computeCampaignProgress, summarizeProgress } from "../../shared/campaignProgress";
import { CASH_SHARE } from "../../shared/crowdpoolModel";
import { GIVE_LEND } from "../../shared/crowdpoolCopy";
import {
  isMoneyKind,
  isThingKind,
  kindForItem,
  modesFor,
  toDay,
  todayUtc,
  type NeedLike,
} from "../../shared/crowdpoolNeedAction";
import { isCurrentReadinessKey, isReadinessKey } from "../../shared/crowdpoolReadiness";
import {
  OPEN_NEEDS_CACHE_KEY,
  OPEN_NEEDS_CACHE_SECONDS,
  buildOpenNeeds,
  type OpenNeedsResult,
} from "../../shared/openNeeds";
import {
  ROUTE_PARTNERS,
  ROUTE_PARTNER_LABELS,
  isRoutePartner,
  validateProofUrl,
  validateRouteUrl,
} from "../lib/partner-links";
import { campaignPartnerLinks as campaignPartnerLinksTable } from "../../drizzle/schema";
import { regenSeasonSpan } from "../../shared/regenYear";
import {
  notifyCampaignApproved,
  notifyCampaignCompleted,
  notifyCampaignDeclined,
  notifyDelivered,
  notifyHoursChanged,
  notifyProposalAccepted,
  notifyProposalDeclined,
  notifyProposalReceived,
  notifyReleased,
  notifyRoleFilled,
  notifyRoleReopened,
  notifyThanked,
  notifyUpdatePosted,
} from "../lib/campaign-notify";
import { cancelCampaign } from "../lib/campaign-cancel";
import { suggestAlternatives } from "../lib/campaign-suggest";

/**
 * The creator, admins, and anyone at all once it is published. Sync, so the
 * list filter stays cheap. Moved to server/lib/project-steward.ts next to
 * canViewCampaign (which also admits a campaign's other stewards); re-exported
 * here for existing importers.
 */
export { canSeeCampaign };

/**
 * Children of a campaign (needs, partner links, activity, updates, images,
 * contributions) follow the campaign: an unpublished campaign's children are
 * for its stewards and admins only. Before 2026-09-24 these reads were open
 * by campaign id, so a draft's needs and journal were readable by anyone
 * counting upwards even though getById hid the draft itself.
 */
async function canReadCampaignChildren(user: TrpcContext["user"] | undefined, campaignId: number): Promise<boolean> {
  const campaign = await db.getCampaignById(campaignId);
  if (!campaign) return false;
  return canViewCampaign(user, campaign);
}

/** Plain words for a campaign status in an error message. */
const STATUS_WORDS: Record<string, string> = {
  draft: "draft",
  pending_review: "in review",
  active: "live",
  funded: "complete", // legacy status; the word is always complete
  completed: "complete",
  cancelled: "cancelled",
  rejected: "sent back",
};

/**
 * Public columns of a `campaigns` row: everything the pitch is made of.
 *
 * Withheld: `adminNotes`, `reviewedBy` and `reviewedAt`, the review trail.
 * `adminNotes` is where reviewers write what they actually think of a
 * project, and it rode out on every campaign card in the gallery.
 *
 * `userId` stays: the client compares it to decide whether to show the
 * creator their own manage controls.
 */
export const PUBLIC_CAMPAIGN_FIELDS = [
  "id", "userId", "status", "durationDays", "startedAt",
  "title", "description", "projectName", "location", "applicationId",
  "financialTarget", "currency",
  "vision", "landStatus", "landSize", "currentPhase", "timeline",
  "legalStructure", "governanceModel", "membershipModel", "housingPlans",
  "foodSystems", "waterSystems", "energySystems", "educationPrograms",
  "communityEngagement", "impactMetrics", "challenges",
  "teamSize", "teamDescription", "regenerativePractices",
  "websiteUrl", "videoUrl", "projectImageUrl", "daoLink",
  "totalValue", "landValue", "equipmentValue", "rolesValue", "resourcesValue",
  "pledgedTotal", "pledgedLand", "pledgedEquipment", "pledgedRoles",
  "pledgedResources", "pledgedFinancial",
  "createdAt", "updatedAt", "publishedAt", "completedAt",
  "generatedImageUrl", "isDemo", "forumPostId", "seasonId",
] as const satisfies ReadonlyArray<keyof Campaign>;

/**
 * What campaigns.getContributions (a public read) returns per row. Not in the
 * hub contract. Everything else on a contribution (email, phone, bio, notes,
 * ownerNotes, userId, referredBy, hyphaBridgeKey, playerContributionId) stays
 * with the stewards' getContributionsForOwner.
 */
export const PUBLIC_CONTRIBUTION_FIELDS = [
  "id", "campaignId", "campaignItemId", "contributorName", "isAnonymous",
  "contributionType", "title", "status", "estimatedValue", "quantityPledged",
  "roleTitle", "hoursPerWeek", "financialAmount", "financialCurrency",
  "submittedAt", "fulfilledAt", "acknowledgedAt",
] as const satisfies ReadonlyArray<keyof CampaignContribution>;

/** Offers that stand on a campaign: the only ones visitors see. */
export const PUBLIC_CONTRIBUTION_STATUSES = ["accepted", "fulfilled", "thanked"] as const;

/** Admins keep the review trail; everyone else gets the projection. */
export function toPublicCampaign(campaign: Campaign, user: TrpcContext["user"] | undefined) {
  return isAdminUser(user) ? campaign : pickPublic(campaign, PUBLIC_CAMPAIGN_FIELDS);
}

/**
 * What campaigns.getById returns for a campaign the viewer may see: the
 * public projection plus needs, images, cover, contributor count and whether
 * the viewer follows it. getById is part of the crowdpool hub contract
 * (villages read it), and the project page (projects.getPublic) builds its
 * front campaign with this same function, so the two can never drift.
 * server/projects.test.ts pins the key set.
 *
 * `progress` (added 2026-09-25, informative in the hub contract) is the
 * hub's own two-line reading from shared/campaignProgress.ts: in-kind
 * confirmed against the in-kind ask, money through verified routes against
 * the money ask. pledgedTotal and totalValue keep their meanings.
 */
export async function buildCampaignView(campaign: Campaign, user: TrpcContext["user"] | undefined) {
  const items = await db.getCampaignItems(campaign.id);
  const progressInputs = (await db.getCampaignProgressInputs([campaign.id], { withItems: false })).get(campaign.id);
  const progress = computeCampaignProgress({
    campaign,
    items,
    rows: progressInputs?.rows ?? [],
    lends: progressInputs?.lends ?? [],
    routes: progressInputs?.routes ?? [],
  });
  const images = await db.getCampaignImages(campaign.id);
  const coverImage = images.find(img => img.isCover === 1) || images[0] || null;

  // Distinct contributor emails across accepted/fulfilled/thanked.
  const contributorsCount = await db.getCampaignContributorsCount(campaign.id);

  // Whether the signed-in viewer follows this campaign (false for guests).
  let isFollowing = false;
  if (user) {
    const db2 = await getDb();
    if (db2) {
      const follow = await db2.select({ id: userFollows.id })
        .from(userFollows)
        .where(and(
          eq(userFollows.userId, user.id),
          eq(userFollows.targetType, 'campaign'),
          eq(userFollows.targetId, String(campaign.id)),
        ))
        .limit(1);
      isFollowing = follow.length > 0;
    }
  }

  return {
    ...toPublicCampaign(campaign, user),
    items,
    images,
    coverImage,
    contributorsCount,
    isFollowing,
    progress,
  };
}

export type CampaignView = Awaited<ReturnType<typeof buildCampaignView>>;

/**
 * The summary progress for many campaigns at once, from one batched read.
 * Used by campaigns.list rows and projects.getPublic's campaigns[].
 */
export async function progressSummariesFor(list: Campaign[]) {
  const inputs = await db.getCampaignProgressInputs(list.map((c) => c.id));
  const out = new Map<number, ReturnType<typeof summarizeProgress>>();
  for (const c of list) {
    const input = inputs.get(c.id) ?? { items: [], rows: [], lends: [], routes: [] };
    out.set(c.id, summarizeProgress(computeCampaignProgress({ campaign: c, ...input }), input.items));
  }
  return out;
}

/** Game variable with a fallback: crowdpool config may not be seeded yet. */
async function getGameVariableOr(key: string, fallback: number): Promise<number> {
  try {
    return await getGameVariable(key);
  } catch {
    return fallback;
  }
}

/** Claim expiry window in days by need kind (crowdpool.claim_expiry_days_*). */
async function claimExpiryDaysForKind(kind: string): Promise<number> {
  if (kind === 'shift') return getGameVariableOr('crowdpool.claim_expiry_days_shift', 7);
  if (kind === 'loan') return getGameVariableOr('crowdpool.claim_expiry_days_loan', 14);
  return getGameVariableOr('crowdpool.claim_expiry_days_item', 14);
}

// ── Give or lend, money, dates (build spec 2026-09-25, section 6.3) ────────

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' that names a real calendar day (no 2026-02-30). */
function isCalendarDay(s: string): boolean {
  if (!DAY_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** A date input: 'YYYY-MM-DD', a real day. Dates stay strings end to end. */
const zDay = z.string().regex(DAY_RE).refine(isCalendarDay, { message: 'Use a real date.' });

/** The same day n years on, as a string bound for comparison. */
function plusYears(day: string, n: number): string {
  return `${Number(day.slice(0, 4)) + n}${day.slice(4)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** No money moves through this site while crowdpool.rails.accept_money is off. */
export const MONEY_RAIL_REFUSAL =
  "Money doesn't move through this site yet. The project page shows the ways this project takes money.";

/** A loan can run this many years from today, at most. */
const MAX_LOAN_YEARS = 5;

/** Freeform offer types that are things, and so may be given or lent. */
const FREEFORM_THING_TYPES = ['land', 'equipment', 'resource'];

export type GiveOrLend = {
  offerMode: 'give' | 'lend' | null;
  availableFrom: string | null;
  lendUntil: string | null;
  lendTerms: string | null;
};

/**
 * How an offer comes: given or lent, with a lend's dates and terms. Throws
 * BAD_REQUEST with the words a contributor sees.
 *
 *   - A thing need (kind item, or legacy loan) takes only the modes it
 *     accepts (modesFor). When it takes both, the contributor must choose;
 *     when it takes one, that one applies.
 *   - A lend needs an until date, on or after today and after its own start,
 *     on or after the need's own start date, and within five years.
 *   - A gift drops the dates and terms. Roles, shifts and knowledge drop the
 *     mode and every loan field.
 *   - A freeform offer (no need) may carry a mode when it is a thing, with
 *     the same date checks.
 */
export function checkGiveOrLend(args: {
  need: NeedLike | null;
  contributionType: string;
  offerMode?: 'give' | 'lend';
  availableFrom?: string;
  lendUntil?: string;
  lendTerms?: string;
  today: string;
}): GiveOrLend {
  const none: GiveOrLend = { offerMode: null, availableFrom: null, lendUntil: null, lendTerms: null };
  const refuse = (message: string) => new TRPCError({ code: 'BAD_REQUEST', message });
  let mode: 'give' | 'lend' | null;
  if (args.need) {
    if (!isThingKind(kindForItem(args.need))) return none;
    const modes = modesFor(args.need);
    if (args.offerMode === undefined) {
      if (modes.gift && modes.loan) throw refuse('Choose give or lend for this need.');
      mode = modes.gift ? 'give' : 'lend';
    } else if (args.offerMode === 'give' && !modes.gift) {
      throw refuse('This need takes loans only.');
    } else if (args.offerMode === 'lend' && !modes.loan) {
      throw refuse('This need takes gifts only.');
    } else {
      mode = args.offerMode;
    }
  } else {
    if (!FREEFORM_THING_TYPES.includes(args.contributionType)) return none;
    mode = args.offerMode ?? null;
  }
  if (mode !== 'lend') return { ...none, offerMode: mode };

  const until = args.lendUntil ?? null;
  if (!until) throw refuse(GIVE_LEND.missingUntil);
  const from = args.availableFrom ?? null;
  if (until < args.today || (from && until < from)) throw refuse(GIVE_LEND.untilBeforeFrom);
  const neededFrom = args.need ? toDay(args.need.neededFrom ?? null) : null;
  if (neededFrom && until < neededFrom) throw refuse(GIVE_LEND.untilBeforeNeed);
  if (until > plusYears(args.today, MAX_LOAN_YEARS)) {
    throw refuse('A loan can run for up to five years from today. Pick an earlier date.');
  }
  const trimmed = args.lendTerms?.trim() ?? '';
  // Stored through sanitizeInput; entity-encoding can lengthen it, so cap again.
  const lendTerms = trimmed ? sanitizeInput(trimmed).slice(0, 300) : null;
  return { offerMode: 'lend', availableFrom: from, lendUntil: until, lendTerms: lendTerms || null };
}

/** Statuses a steward has taken an offer on: the ones a loan can be marked returned from. */
const TAKEN_ON_STATUSES = ['accepted', 'fulfilled', 'thanked'] as const;

/** A campaign that is over takes no new routes and keeps its ticks. */
const CLOSED_CAMPAIGN_STATUSES = ['cancelled', 'completed', 'funded'];

async function loadPartnerLink(linkId: number) {
  const database = await requireDb();
  const rows = await database
    .select()
    .from(campaignPartnerLinksTable)
    .where(eq(campaignPartnerLinksTable.id, linkId))
    .limit(1);
  return rows[0] ?? null;
}

/** The campaign behind a steward-only call, or FORBIDDEN (never NOT_FOUND: ids are enumerable). */
async function stewardCampaign(user: TrpcContext["user"] | undefined, campaignId: number, message: string): Promise<Campaign> {
  const campaign = await db.getCampaignById(campaignId);
  if (!campaign) throw new TRPCError({ code: 'FORBIDDEN', message });
  await assertCampaignSteward(user, campaign, message);
  return campaign;
}

/** Best-effort note to the site owner that a money route waits to be checked. Never throws. */
async function tellOwnerRouteToCheck(campaign: Pick<Campaign, 'title' | 'projectName'>): Promise<void> {
  try {
    const { notifyOwner } = await import("../_core/notification");
    await notifyOwner({
      title: `Money route to check: ${campaign.title}`,
      content: `${campaign.projectName || campaign.title} added a money route. Check it in Admin, Crowdpooling, before it shows on the project page.`,
    });
  } catch (err) {
    console.warn('[money-routes] owner notice failed (non-fatal):', err);
  }
}

/**
 * Link anonymous contributions made under a verified email to a now-signed-in
 * user, and back-create the verified Living Tree rows for any that were already
 * delivered (fulfilled or thanked). Mirrors the fulfilled-side payoff in
 * updateContributionStatus so a person who claimed anonymously and later makes
 * an account still gets their delivered contributions on their profile.
 *
 * Idempotent and self-healing. It claims only rows still owned by no one, and
 * back-creates only delivered rows with no playerContributionId yet, so
 * repeated calls (it runs on every login) never double-count. recordScoreEvent
 * is not idempotent, so it fires only after playerContributionId is set, which
 * removes the row from the candidate set on any later run.
 *
 * Called by campaigns.claimMyContributions and best-effort from the auth flow.
 */
export async function linkAnonymousContributions(
  database: any,
  userId: number,
  email: string,
): Promise<{ linked: number; livingTreeAdded: number }> {
  if (!database || !userId || !email) return { linked: 0, livingTreeAdded: 0 };

  // 1. Claim anonymous rows for this verified email (case-insensitive by the
  //    column's default collation).
  const [linkRes] = await database.execute(sql`
    UPDATE campaign_contributions
    SET userId = ${userId}
    WHERE userId IS NULL AND contributorEmail = ${email}
  `);
  const linked = Number((linkRes as any)?.affectedRows ?? 0);

  // 2. Back-create Living Tree rows for delivered contributions now owned by
  //    this user that do not have one yet.
  const [rows] = await database.execute(sql`
    SELECT cc.id, cc.campaignId, cc.campaignItemId, cc.contributionType, cc.title,
           cc.estimatedValue, c.projectName
    FROM campaign_contributions cc
    JOIN campaigns c ON c.id = cc.campaignId
    WHERE cc.userId = ${userId}
      AND cc.status IN ('fulfilled', 'thanked')
      AND cc.playerContributionId IS NULL
  `);
  const candidates = (rows as any[]) ?? [];
  if (candidates.length === 0) return { linked, livingTreeAdded: 0 };

  const profile = await db.getPlayerProfileByUserId(userId);
  if (!profile) return { linked, livingTreeAdded: 0 }; // no profile yet: nothing to attach

  let livingTreeAdded = 0;
  for (const c of candidates) {
    try {
      const need = c.campaignItemId ? await db.getCampaignItemById(Number(c.campaignItemId)) : null;
      const capitalType =
        need?.capitalType ??
        FREEFORM_TYPE_TO_CAPITAL[c.contributionType as keyof typeof FREEFORM_TYPE_TO_CAPITAL] ??
        'material';
      const playerContributionId = await db.createPlayerContribution({
        profileId: profile.id,
        userId,
        capitalType,
        title: String(c.title ?? 'A contribution'),
        estimatedValue: Number(c.estimatedValue ?? 0),
        projectName: c.projectName ?? null,
        status: 'verified',
        verifiedAt: new Date(),
      });
      // Mark done first (idempotency gate), then the one-time score event.
      await db.updateContribution(Number(c.id), { playerContributionId });
      livingTreeAdded++;
      try {
        await recordScoreEvent(
          userId,
          'crowdpool_contribution',
          'scoring.weights.crowdpool_contribution',
          'crowdpool',
          Number(c.id),
        );
      } catch (err) {
        console.warn('[link-contributions] score event failed (non-fatal):', err);
      }
    } catch (err) {
      console.warn(`[link-contributions] Living Tree row failed for contribution ${c.id}:`, err);
    }
  }

  // Recompute the cached Living Tree total once, the same way the fulfilled path
  // and playerContributions.create do.
  if (livingTreeAdded > 0) {
    try {
      const all = await db.getPlayerContributionsByProfileId(profile.id);
      const total = all.reduce((sum, x) => sum + (x.estimatedValue ?? 0), 0);
      await db.updatePlayerProfile(profile.id, { totalContributionValue: total });
    } catch (err) {
      console.warn('[link-contributions] total recompute failed (non-fatal):', err);
    }
  }

  return { linked, livingTreeAdded };
}

// ── Server-side geocoding for the projects map ──────────────────────────────
// Campaigns store a free-text location and no coordinates. The gallery map
// resolves those strings here, on the server, because the browser CSP blocks a
// direct Nominatim call (connect-src). Results cache in memory for the life of
// the process and lookups are spaced out to respect the OpenStreetMap usage
// policy. A location that cannot be resolved comes back null and gets no pin.
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  const key = location.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;
  let result: { lat: number; lng: number } | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        signal: controller.signal,
        headers: {
          "user-agent": "RegenCivicsBot/1.0 (+https://regencivics.earth)",
          "accept-language": "en",
        },
      },
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const hit = Array.isArray(data) ? data[0] : null;
      if (hit && hit.lat && hit.lon) {
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) result = { lat, lng };
      }
    }
  } catch {
    // Network error, timeout, or a block: leave null so the pin is just omitted.
  }
  geocodeCache.set(key, result);
  return result;
}

// ── Contribution status helpers (2026-09-24) ────────────────────────────────

type ContributionRow = NonNullable<Awaited<ReturnType<typeof db.getContributionById>>>;
type ItemRow = Awaited<ReturnType<typeof db.getCampaignItemById>>;
type ContributionStatus = ContributionRow['status'];

async function requireDb() {
  const database = await getDb();
  if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
  return database;
}

function affectedRows(result: any): number {
  return Number(result?.[0]?.affectedRows ?? result?.affectedRows ?? 0);
}

/** Someone else moved the row between our read and our write. */
function raced() {
  return new TRPCError({ code: 'CONFLICT', message: 'Someone just changed this offer. Refresh and try again.' });
}

/**
 * Update a contribution only while it is still in one of `from`. Returns the
 * rows changed (0 when another request got there first).
 */
async function conditionalStatusUpdate(
  id: number,
  from: string[],
  patch: Partial<typeof campaignContributionsTable.$inferInsert>,
  tx?: any,
): Promise<number> {
  const exec = tx ?? (await requireDb());
  const result = await exec.update(campaignContributionsTable)
    .set(patch)
    .where(and(
      eq(campaignContributionsTable.id, id),
      inArray(campaignContributionsTable.status, from as ContributionStatus[]),
    ));
  return affectedRows(result);
}

/**
 * Refuse unless the campaign is live, reading its status under a shared lock
 * so a cancel (which takes the campaign row for update) cannot slip in
 * between this check and the write that follows in the same transaction.
 * Lock order everywhere: need rows, then the campaign row, then
 * contribution rows (server/lib/campaign-cancel.ts takes them the same way).
 */
async function assertCampaignOpen(tx: any, campaignId: number, message: string): Promise<void> {
  const [rows] = await tx.execute(sql`SELECT status FROM campaigns WHERE id = ${campaignId} LOCK IN SHARE MODE`);
  const status = (rows as any[])[0]?.status;
  if (status !== 'active') throw new TRPCError({ code: 'BAD_REQUEST', message });
}

/**
 * What submitContribution returns on an example (demo) campaign: a practice
 * run. Rye, 2026-09-24 (decision B12c): "Sending on an example campaign gives
 * a practice receipt". The sheet works end to end and every input is checked
 * exactly as on a real campaign, but the server writes no row, moves no
 * counter or total, and tells nobody. Nobody real stands behind an example
 * to answer an offer.
 */
export const PRACTICE_CONTRIBUTION_RESULT = { id: null, success: true, practice: true } as const;

/** The answer when a steward tries to take on an offer after the campaign closed. */
const CLOSED_CAMPAIGN_ACCEPT = "This campaign isn't live anymore, so it can't take on offers.";

/** Lock an hours need's row for the rest of the transaction and read its size. */
async function lockHoursItem(tx: any, itemId: number): Promise<{ quantityWanted: number; estimatedValue: number }> {
  const [rows] = await tx.execute(sql`
    SELECT quantityWanted, estimatedValue FROM campaign_items WHERE id = ${itemId} FOR UPDATE
  `);
  const row = (rows as any[])[0];
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Need not found' });
  return { quantityWanted: Number(row.quantityWanted), estimatedValue: Number(row.estimatedValue) };
}

/**
 * One contribution's hours and status, read with a row lock inside the
 * caller's transaction (after lockHoursItem, so lock order matches every other
 * hours path). Null when the row is gone.
 */
async function lockedContributionHours(
  tx: any,
  contributionId: number,
): Promise<{ hours: number; status: string } | null> {
  const [rows] = await tx.execute(sql`
    SELECT quantityPledged, status FROM campaign_contributions WHERE id = ${contributionId} FOR UPDATE
  `);
  const row = (rows as any[])[0];
  if (!row) return null;
  return { hours: Number(row.quantityPledged ?? 0), status: String(row.status) };
}

/** Hours already standing on a need (accepted, fulfilled, thanked), not counting one contribution. */
async function standingHoursExcluding(tx: any, itemId: number, excludeContributionId: number): Promise<number> {
  const [rows] = await tx.execute(sql`
    SELECT COALESCE(SUM(quantityPledged), 0) AS standing FROM campaign_contributions
    WHERE campaignItemId = ${itemId}
      AND status IN ('accepted','fulfilled','thanked')
      AND id <> ${excludeContributionId}
    FOR UPDATE
  `);
  return Number((rows as any[])[0]?.standing ?? 0);
}

/**
 * Accept an offer on an hours need at `hours` a week. One transaction: lock
 * the need, sum the hours already standing, refuse to pass the hours the
 * role needs, move the row conditionally, recompute the counters from rows.
 * Concurrent accepts on one role serialize on the need's row lock, so the
 * accepted hours can never pass the hours needed.
 */
async function acceptHoursContribution(args: {
  contribution: ContributionRow;
  itemId: number;
  hours: number;
  ownerNotes?: string;
}): Promise<{ hours: number; justFilled: boolean }> {
  const database = await requireDb();
  return database.transaction(async (tx) => {
    const locked = await lockHoursItem(tx, args.itemId);
    await assertCampaignOpen(tx, args.contribution.campaignId, CLOSED_CAMPAIGN_ACCEPT);
    const standing = await standingHoursExcluding(tx, args.itemId, args.contribution.id);
    const check = checkAcceptHours({ requested: args.hours, neededHours: locked.quantityWanted, standingExcludingThis: standing });
    if (!check.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: check.message });
    const affected = await conditionalStatusUpdate(args.contribution.id, ['pending', 'rejected'], {
      status: 'accepted',
      quantityPledged: args.hours,
      estimatedValue: scaleRoleValue(locked.estimatedValue, locked.quantityWanted, args.hours),
      reviewedAt: new Date(),
      claimExpiresAt: null,
      ...(args.ownerNotes !== undefined ? { ownerNotes: args.ownerNotes } : {}),
    }, tx);
    if (affected === 0) throw raced();
    await db.recomputeNeedCounters(args.itemId, tx);
    return { hours: args.hours, justFilled: standing + args.hours >= locked.quantityWanted };
  });
}

/**
 * The delivery payoff for an account holder: a score event and a verified
 * Living Tree row, plus the Pool Ledger event. NEVER a token credit
 * (locked decision: no platform tokens for crowdpooling). Runs once, from
 * the call that actually moved the row to fulfilled.
 */
async function deliveryPayoff(contribution: ContributionRow, campaign: Campaign, need: ItemRow): Promise<void> {
  if (contribution.userId) {
    try {
      await recordScoreEvent(
        contribution.userId,
        'crowdpool_contribution',
        'scoring.weights.crowdpool_contribution',
        'crowdpool',
        contribution.id,
      );
    } catch (err) {
      console.warn('[Contribution] Score event failed (non-fatal):', err);
    }

    try {
      const profile = await db.getPlayerProfileByUserId(contribution.userId);
      if (profile) {
        const capitalType = need?.capitalType ?? FREEFORM_TYPE_TO_CAPITAL[contribution.contributionType];
        const playerContributionId = await db.createPlayerContribution({
          profileId: profile.id,
          userId: contribution.userId,
          capitalType,
          title: contribution.title,
          estimatedValue: contribution.estimatedValue,
          projectName: campaign.projectName,
          status: 'verified',
          verifiedAt: new Date(),
        });
        await db.updateContribution(contribution.id, { playerContributionId });
        // Recompute the cached Living Tree total, the same way
        // playerContributions.create does.
        const all = await db.getPlayerContributionsByProfileId(profile.id);
        const total = all.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
        await db.updatePlayerProfile(profile.id, { totalContributionValue: total });
      }
    } catch (err) {
      console.warn('[Contribution] Living Tree row creation failed (non-fatal):', err);
    }
  }

  // Pool Ledger event
  try {
    await logActivityEvent(
      'crowdpool_delivered',
      'player',
      contribution.userId || 0,
      'campaign',
      contribution.campaignId,
      { contributionId: contribution.id },
    );
  } catch (err) {
    console.warn('[Contribution] Activity event failed (non-fatal):', err);
  }
}

/**
 * The direct email for someone who offered WITHOUT an account: accepted,
 * declined, or first delivery. Account holders never get this; the spine
 * emails them by their prefs. A send failure never fails the steward's action.
 */
async function sendContributionStatusEmail(
  status: 'accepted' | 'rejected' | 'fulfilled',
  args: { campaign: Campaign; contribution: ContributionRow; item: ItemRow; ownerNotes: string | null },
): Promise<void> {
  try {
    const { sendEmail, emailTemplates, contributionEmailLinks } = await import("../_core/email");
    const template = status === 'accepted'
      ? emailTemplates.contributionAccepted
      : status === 'rejected'
        ? emailTemplates.contributionRejected
        : emailTemplates.contributionFulfilled;
    const hoursNeed = isHoursNeed(args.item);
    const emailContent = template({
      recipientName: args.contribution.contributorName,
      contributionTitle: args.contribution.title,
      campaignTitle: args.campaign.title,
      projectName: args.campaign.projectName || args.campaign.title,
      ownerNotes: args.ownerNotes,
      hoursPerWeek: hoursNeed ? args.contribution.quantityPledged : null,
      roleTitle: hoursNeed ? (args.item?.roleTitle ?? args.contribution.roleTitle ?? null) : null,
      ...contributionEmailLinks(projectPathForCampaignFocus(args.campaign)),
    });
    await sendEmail({
      to: args.contribution.contributorEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      template: `contribution_${status}`,
      recipientName: args.contribution.contributorName,
    });
  } catch (emailError) {
    console.warn('[Contribution] Failed to send status notification email:', emailError);
  }
}

export const campaignsRouter = router({
  // verifyCampaignAccess (a shared "222" password on the create page) was
  // removed 2026-09-24. campaigns.create now checks that the caller stewards
  // an approved application, which is the real gate.

  // List all campaigns (with optional filtering + server-side sort)
  list: publicProcedure
    .input(z.object({
      status: z.enum(['draft', 'pending_review', 'active', 'funded', 'completed', 'cancelled', 'rejected']).optional(),
      search: z.string().optional(),
      sort: z.enum(['most-funded', 'ending-soon', 'newest', 'most-contributors']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const campaignList = await db.listCampaigns(input?.status, input?.search);
      // Unpublished campaigns are the creator's own. Asking for
      // status=draft used to return every project's unfinished pitch.
      const allowed = campaignList.filter((c) => canSeeCampaign(ctx.user, c));
      // Batch-fetch all images in one query (eliminates N+1)
      const imagesMap = await db.getCampaignImagesForMany(allowed.map(c => c.id));
      // The two-line reading, summary form, from one batched read.
      const progressMap = await progressSummariesFor(allowed);
      const rows = allowed.map((c) => {
        const images = imagesMap[c.id] ?? [];
        const coverImage = images.find(img => img.isCover === 1) || images[0] || null;
        return { ...toPublicCampaign(c, ctx.user), coverImage, imageCount: images.length, progress: progressMap.get(c.id)! };
      });

      // isDemo rides along via select-all; sorting happens here so every
      // client sees the same order for the same sort key.
      switch (input?.sort) {
        case 'most-funded':
          // Funded ratio, not raw dollars, so small campaigns compete fairly.
          rows.sort((a, b) => {
            const ratio = (c: typeof a) => (c.totalValue > 0 ? c.pledgedTotal / c.totalValue : 0);
            return ratio(b) - ratio(a);
          });
          break;
        case 'ending-soon': {
          // Active campaigns by end date ascending; everything else after.
          const endsAt = (c: (typeof rows)[number]) =>
            c.status === 'active' && c.startedAt
              ? c.startedAt.getTime() + c.durationDays * 24 * 60 * 60 * 1000
              : Number.POSITIVE_INFINITY;
          rows.sort((a, b) => endsAt(a) - endsAt(b));
          break;
        }
        case 'most-contributors': {
          const db2 = await getDb();
          if (db2 && rows.length > 0) {
            const counts = await db2
              .select({
                campaignId: campaignContributionsTable.campaignId,
                contributors: sql<number>`COUNT(DISTINCT ${campaignContributionsTable.contributorEmail})`,
              })
              .from(campaignContributionsTable)
              .where(and(
                inArray(campaignContributionsTable.campaignId, rows.map(r => r.id)),
                inArray(campaignContributionsTable.status, ['accepted', 'fulfilled', 'thanked']),
              ))
              .groupBy(campaignContributionsTable.campaignId);
            const countMap = new Map(counts.map(c => [c.campaignId, Number(c.contributors)]));
            rows.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0));
          }
          break;
        }
        case 'newest':
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
        default:
          break; // listCampaigns already orders by createdAt desc
      }

      return rows;
    }),

  // Get a single campaign by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const campaign = await db.getCampaignById(input.id);
      if (!campaign) return null;
      // Enumerable id: without this, every draft and rejected pitch was
      // readable by anyone counting upwards. Stewards (applicant, approved
      // steward, claim holders) see their own unpublished campaign.
      if (!(await canViewCampaign(ctx.user, campaign))) return null;

      return await buildCampaignView(campaign, ctx.user);
    }),

  // Get campaign items for a campaign
  getItems: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!(await canReadCampaignChildren(ctx.user, input.campaignId))) return [];
      return await db.getCampaignItems(input.campaignId);
    }),

  // A campaign's money routes (Ma Earth, Steward) as the public sees them.
  // Money never passes through ReGen Civics: contributors finish on the
  // partner's own site, and the numbers are nightly-cached. Only routes a
  // ReGen Civics admin verified show, plus example routes on example
  // campaigns (status 'example': shown, never linked out). Explicit columns:
  // never proofUrl, reviewNote, addedBy or verifiedBy. Hub contract 4.
  getPartnerLinks: publicProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || !(await canViewCampaign(ctx.user, campaign))) return [];
      const db2 = await getDb();
      if (!db2) return [];
      const { campaignPartnerLinks } = await import("../../drizzle/schema");
      const shown: Array<'verified' | 'example'> = campaign.isDemo ? ['verified', 'example'] : ['verified'];
      return await db2
        .select({
          id: campaignPartnerLinks.id,
          campaignId: campaignPartnerLinks.campaignId,
          partner: campaignPartnerLinks.partner,
          label: campaignPartnerLinks.label,
          url: campaignPartnerLinks.url,
          cachedRaised: campaignPartnerLinks.cachedRaised,
          cachedContributorCount: campaignPartnerLinks.cachedContributorCount,
          cachedPercent: campaignPartnerLinks.cachedPercent,
          cachedCurrency: campaignPartnerLinks.cachedCurrency,
          lastFetchedAt: campaignPartnerLinks.lastFetchedAt,
          status: campaignPartnerLinks.status,
        })
        .from(campaignPartnerLinks)
        .where(and(
          eq(campaignPartnerLinks.campaignId, input.campaignId),
          inArray(campaignPartnerLinks.status, shown),
        ))
        .orderBy(campaignPartnerLinks.id);
    }),

  // The crowdpool settings a page needs to word itself: the soft money-share
  // band (guidance only, ruling 2026-09-24; never enforced), whether money
  // moves through this site at all (crowdpool.rails.accept_money), and
  // whether a Steward loan route can be verified (crowdpool.rails.loan_routes).
  // No input, no PII, cached by getGameVariable.
  crowdpoolSettings: publicProcedure.query(async () => {
    const [softMinPct, softMaxPct, defaultPct, acceptMoney, loanRoutes] = await Promise.all([
      getGameVariableOr('crowdpool.cash_share_min_pct', CASH_SHARE.softMinPct),
      getGameVariableOr('crowdpool.cash_share_max_pct', CASH_SHARE.softMaxPct),
      getGameVariableOr('crowdpool.cash_share_default_pct', CASH_SHARE.defaultPct),
      getGameVariableOr('crowdpool.rails.accept_money', 0),
      getGameVariableOr('crowdpool.rails.loan_routes', 0),
    ]);
    return {
      moneyShare: { softMinPct, softMaxPct, defaultPct },
      moneyMovesHere: acceptMoney === 1,
      loanRoutesOpen: loanRoutes === 1,
    };
  }),

  // The Needs tab (/campaigns?tab=needs): every open need across live public
  // campaigns, least covered first, examples in their own list, plus the
  // money routes people can use (build spec 2026-09-25, section 9.1). Public
  // and cached 60 seconds. Counts and statuses only: no names, no contact
  // data, no dates from anyone's loan (server/open-needs.test.ts pins the
  // row shape). Built by shared/openNeeds.ts from the same progress inputs
  // as every other reading.
  listOpenNeeds: publicProcedure.query(async (): Promise<OpenNeedsResult> => {
    const cached = await cacheGet<OpenNeedsResult>(OPEN_NEEDS_CACHE_KEY);
    if (cached) return cached;
    const live = (await db.listCampaigns('active')).filter((c) => isPublicCampaign(c));
    const ids = live.map((c) => c.id);
    const inputs = await db.getCampaignProgressInputs(ids);
    const database = await getDb();
    const routes = database && ids.length > 0
      ? await database
          .select({
            campaignId: campaignPartnerLinksTable.campaignId,
            partner: campaignPartnerLinksTable.partner,
            label: campaignPartnerLinksTable.label,
            status: campaignPartnerLinksTable.status,
          })
          .from(campaignPartnerLinksTable)
          .where(and(
            inArray(campaignPartnerLinksTable.campaignId, ids),
            inArray(campaignPartnerLinksTable.status, ['verified', 'example']),
          ))
          .orderBy(campaignPartnerLinksTable.id)
      : [];
    const result = buildOpenNeeds({ campaigns: live, inputs, routes });
    await cacheSet(OPEN_NEEDS_CACHE_KEY, result, OPEN_NEEDS_CACHE_SECONDS);
    return result;
  }),

  // ---- Money routes (build spec 2026-09-25, section 7.2) ----
  // A project steward adds a route (Ma Earth for gifts, Steward for loans)
  // on the partner's own site; a ReGen Civics admin verifies it; only
  // verified routes, and example routes on example campaigns, show publicly
  // (getPartnerLinks). The nightly job fetches verified routes only, with
  // the host allowlist and no off-host redirects (OWASP A10). Money through
  // a route never passes through ReGen Civics.

  addPartnerLink: protectedProcedure
    .input(z.object({
      campaignId: z.number().int().positive(),
      partner: z.enum(ROUTE_PARTNERS),
      url: z.string().max(512),
      proofUrl: z.string().max(512).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "campaign_money_route");
      const campaign = await stewardCampaign(ctx.user, input.campaignId, "Only this project's stewards can add its money routes.");
      if (campaign.isDemo) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Example campaigns keep their example routes.' });
      }
      if (CLOSED_CAMPAIGN_STATUSES.includes(campaign.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This campaign is closed, so it takes no new routes.' });
      }
      const checked = validateRouteUrl(input.partner, input.url);
      if (!checked.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: checked.message });
      let proofUrl: string | null = null;
      if (input.proofUrl && input.proofUrl.trim()) {
        const proof = validateProofUrl(input.proofUrl);
        if (!proof.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: proof.message });
        proofUrl = proof.url;
      }
      const database = await requireDb();
      // Count and insert under the campaign row's lock, so two adds at once
      // cannot both pass the limit of two per partner.
      const id = await database.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM campaigns WHERE id = ${campaign.id} FOR UPDATE`);
        const [rows]: any = await tx.execute(sql`
          SELECT COUNT(*) AS n FROM campaign_partner_links
          WHERE campaignId = ${campaign.id} AND partner = ${input.partner} AND status IN ('pending', 'verified')
        `);
        if (Number(rows?.[0]?.n ?? 0) >= 2) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A campaign can have up to two routes of each kind.' });
        }
        const result: any = await tx.insert(campaignPartnerLinksTable).values({
          campaignId: campaign.id,
          partner: input.partner,
          label: ROUTE_PARTNER_LABELS[input.partner],
          url: checked.url,
          proofUrl,
          status: 'pending',
          addedBy: ctx.user.id,
        });
        return Number(result?.[0]?.insertId ?? result?.insertId);
      });
      await tellOwnerRouteToCheck(campaign);
      return { id, success: true };
    }),

  // A steward removes one of their project's routes, whatever its status.
  // Example routes are the example campaign's own: only admins remove those.
  removePartnerLink: protectedProcedure
    .input(z.object({ linkId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const link = await loadPartnerLink(input.linkId);
      if (!link) return { success: true, changed: false };
      await stewardCampaign(ctx.user, link.campaignId, "Only this project's stewards can remove its money routes.");
      if (link.status === 'example' && !isAdminUser(ctx.user)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Example routes stay on example campaigns.' });
      }
      const database = await requireDb();
      const result = await database.delete(campaignPartnerLinksTable).where(eq(campaignPartnerLinksTable.id, link.id));
      if (link.status === 'verified' || link.status === 'example') await cacheDel(OPEN_NEEDS_CACHE_KEY);
      return { success: true, changed: affectedRows(result) > 0 };
    }),

  // Every route on a campaign with every column (status, proof link, review
  // note), for the steward's Money routes card and the admin review. Stewards
  // only; admins pass through project-steward.ts.
  getPartnerLinksForSteward: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const campaign = await stewardCampaign(ctx.user, input.campaignId, "Only this project's stewards can see its money routes.");
      const database = await requireDb();
      return await database
        .select()
        .from(campaignPartnerLinksTable)
        .where(eq(campaignPartnerLinksTable.campaignId, campaign.id))
        .orderBy(campaignPartnerLinksTable.id);
    }),

  // An admin checks a route: verified shows it on the project page and lets
  // the nightly job read its numbers; rejected hides it with a note the
  // project sees. The admin sets the currency of the partner page's numbers
  // here (never the job). A Steward (loan) route cannot be verified while
  // crowdpool.rails.loan_routes is off (question Q1).
  reviewPartnerLink: adminProcedure
    .input(z.object({
      linkId: z.number().int().positive(),
      decision: z.enum(['verified', 'rejected']),
      currency: z.string().trim().min(3).max(8).regex(/^[A-Za-z]{3,8}$/).optional(),
      note: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const link = await loadPartnerLink(input.linkId);
      if (!link) throw new TRPCError({ code: 'NOT_FOUND', message: 'That route is gone.' });
      if (link.status === 'example') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Example routes aren't reviewed. They stay on example campaigns and never link out." });
      }
      const campaign = await db.getCampaignById(link.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'That route is gone.' });
      const database = await requireDb();
      if (input.decision === 'verified') {
        if (link.partner === 'gosteward' && (await getGameVariableOr('crowdpool.rails.loan_routes', 0)) !== 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: "Loan routes can't be verified until the loan route switch is on." });
        }
        // The nightly job fetches verified routes, so the URL must still sit
        // on the partner's own hosts.
        if (!isRoutePartner(link.partner) || !validateRouteUrl(link.partner, link.url).ok) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: "This link isn't on the partner's own site, so it can't be verified." });
        }
        await database.update(campaignPartnerLinksTable)
          .set({
            status: 'verified',
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
            cachedCurrency: (input.currency ?? campaign.currency ?? 'USD').toUpperCase(),
            reviewNote: null,
          })
          .where(eq(campaignPartnerLinksTable.id, link.id));
      } else {
        const note = input.note && input.note.trim() ? sanitizeInput(input.note.trim()).slice(0, 1000) : null;
        await database.update(campaignPartnerLinksTable)
          .set({ status: 'rejected', reviewNote: note, verifiedBy: null, verifiedAt: null })
          .where(eq(campaignPartnerLinksTable.id, link.id));
      }
      await cacheDel(OPEN_NEEDS_CACHE_KEY);
      return { success: true, status: input.decision };
    }),

  // Server-side geocode for the gallery map. Same-origin so it clears the CSP
  // the browser enforces on a direct Nominatim call. Cached and spaced to
  // respect the OSM usage policy. Returns location -> {lat,lng} | null.
  geocodeLocations: publicProcedure
    .input(z.object({ locations: z.array(z.string().min(1).max(200)).max(60) }))
    .query(async ({ input }) => {
      const unique = Array.from(new Set(input.locations.map((l) => l.trim()).filter(Boolean)));
      const out: Record<string, { lat: number; lng: number } | null> = {};
      for (const loc of unique) {
        const wasCached = geocodeCache.has(loc.toLowerCase());
        out[loc] = await geocodeLocation(loc);
        // Only pace real network lookups, never cache hits.
        if (!wasCached) await new Promise((r) => setTimeout(r, 1100));
      }
      return out;
    }),

  // The Design Companion: a warm AI coach for campaign design, grounded in the
  // deterministic Crowdpool Capital Coach (shared/crowdpoolCoach.ts). Stateless
  // like companion.turn: the client holds the transcript + draft and passes them
  // each turn. publicProcedure (it writes nothing) with a rate limit. Builder
  // text is untrusted: designCompanionTurn sanitizes every string on the way in,
  // treats it as data in the system prompt, and validates the model output
  // before returning it. An LLM failure degrades to the deterministic coach, so
  // this never throws to the client for an AI problem.
  designCompanion: publicProcedure
    .input(z.object({
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })).max(40).default([]),
      draft: z.object({
        projectName: z.string().max(255).optional(),
        location: z.string().max(255).optional(),
        region: z.string().max(120).optional(),
        vision: z.string().max(5000).optional(),
        needs: z.array(z.object({
          title: z.string().max(255),
          capitalType: z.string().max(40).optional(),
          kind: z.string().max(40).optional(),
          estimatedValue: z.number().min(0).max(1_000_000_000).optional(),
        })).max(100).default([]),
      }),
      message: z.string().max(4000),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "design_companion");
      return designCompanionTurn(input);
    }),

  // Create a new campaign
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().min(1),
      projectName: z.string().min(1).max(255),
      location: z.string().optional(),
      financialTarget: z.number().min(0),
      currency: z.string().default('USD'),
      // Link to application
      applicationId: z.number().optional(),
      // Rich project data
      vision: z.string().optional(),
      landStatus: z.string().optional(),
      landSize: z.string().optional(),
      currentPhase: z.string().optional(),
      timeline: z.string().optional(),
      legalStructure: z.string().optional(),
      governanceModel: z.string().optional(),
      membershipModel: z.string().optional(),
      housingPlans: z.string().optional(),
      foodSystems: z.string().optional(),
      waterSystems: z.string().optional(),
      energySystems: z.string().optional(),
      educationPrograms: z.string().optional(),
      communityEngagement: z.string().optional(),
      impactMetrics: z.string().optional(),
      challenges: z.string().optional(),
      teamSize: z.number().optional(),
      teamDescription: z.string().optional(),
      regenerativePractices: z.string().optional(),
      websiteUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      projectImageUrl: z.string().optional(),
      daoLink: z.string().optional(),
      durationDays: z.number().min(1).max(365).default(90),
      items: z.array(z.object({
        category: z.enum(['land', 'equipment', 'role', 'resource']),
        // Needs registry taxonomy (shared/crowdpoolingTaxonomy.ts). Enum literals
        // mirror drizzle campaign_items.kind / capitalType exactly.
        kind: z.enum(['item', 'role', 'shift', 'loan', 'knowledge', 'crypto', 'financial_link']).optional(),
        capitalType: z.enum(['intellectual', 'social', 'material', 'financial', 'living', 'cultural', 'spiritual', 'experiential', 'health']).optional(),
        quantityWanted: z.number().int().min(1).optional(),
        // Land fields
        hectares: z.number().optional(),
        region: z.string().optional(),
        features: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
        landDescription: z.string().optional(),
        // Equipment fields
        equipmentName: z.string().optional(),
        equipmentQuantity: z.number().optional(),
        equipmentCategory: z.string().optional(),
        // Role fields
        roleTitle: z.string().optional(),
        // A role's hours a week, in whole hours. For a role this IS the
        // capacity (quantityWanted); db.createCampaign requires it.
        hoursPerWeek: z.number().int().min(1).max(MAX_ROLE_HOURS).optional(),
        durationMonths: z.number().optional(),
        roleDescription: z.string().optional(),
        // Resource fields
        resourceName: z.string().optional(),
        resourceQuantity: z.number().optional(),
        resourceUnit: z.string().optional(),
        resourceDescription: z.string().optional(),
        // Common
        estimatedValue: z.number().min(0),
        // When the need is wanted, and how a thing may come (section 6.1).
        // db.createCampaign checks the rules; kind 'loan' is stored as an
        // item that takes loans only, and money kinds are refused.
        neededFrom: zDay.optional(),
        neededUntil: zDay.optional(),
        acceptsGift: z.boolean().optional(),
        acceptsLoan: z.boolean().optional(),
        workMode: z.enum(['on_site', 'remote', 'either']).optional(),
      })),
      // Money routes the project holds (section 7.2). Each is checked against
      // the partner's hosts and stored pending: an admin verifies it before
      // it shows anywhere.
      moneyRoutes: z.array(z.object({
        partner: z.enum(ROUTE_PARTNERS),
        url: z.string().max(512),
      })).max(2).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Security (2026-09-24): create used to accept any caller and any
      // applicationId, behind nothing but a shared client-side password. A
      // campaign now needs an application the caller stewards (applicant or
      // stewardUserId) that has passed review. Admins are exempt.
      if (!isAdminUser(ctx.user)) {
        const refusal = "You can start a campaign for a land project you steward once its application is approved.";
        if (!input.applicationId) throw new TRPCError({ code: 'FORBIDDEN', message: refusal });
        const app = await db.getApplicationById(input.applicationId);
        const ownsIt = !!app && (app.userId === ctx.user.id || app.stewardUserId === ctx.user.id);
        const approved = !!app && (app.status === 'approved' || app.status === 'active');
        if (!ownsIt || !approved) throw new TRPCError({ code: 'FORBIDDEN', message: refusal });
      }
      // Every route is checked before anything is written, so a bad link
      // never leaves a half-made campaign.
      const moneyRoutes = (input.moneyRoutes ?? []).map((r) => {
        const checked = validateRouteUrl(r.partner, r.url);
        if (!checked.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: checked.message });
        return { partner: r.partner, url: checked.url, label: ROUTE_PARTNER_LABELS[r.partner] };
      });
      const { moneyRoutes: _routes, ...campaignInput } = input;
      const campaignId = await db.createCampaign(ctx.user.id, { ...campaignInput, moneyRoutes });
      // Fire-and-forget image generation, don't block mutation response
      generateImage({
        contentType: "campaign",
        contentId: campaignId,
        contextText: `${input.title}. ${(input.description ?? "").slice(0, 200)}`,
      }).then(({ url }) =>
        getDb().then(d => d?.update(campaignsTable).set({ generatedImageUrl: url }).where(eq(campaignsTable.id, campaignId)))
      ).catch(err => console.error(`Image gen failed for campaign ${campaignId}:`, err));
      const created = await db.getCampaignById(campaignId);
      if (moneyRoutes.length > 0) {
        await tellOwnerRouteToCheck({ title: created?.title ?? input.title, projectName: created?.projectName ?? input.projectName });
      }
      // The project page, focused on the new campaign: where the wizard sends
      // its steward next.
      const path = projectPathForCampaignFocus(
        created ?? { id: campaignId, applicationId: input.applicationId ?? null, projectName: input.projectName, title: input.title },
      );
      return { id: campaignId, path, success: true };
    }),

  // Get contributions for a campaign — public view strips PII.
  // Use getContributionsForOwner for management views that need full details.
  getContributions: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'fulfilled', 'thanked', 'expired', 'released', 'cancelled']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!(await canReadCampaignChildren(ctx.user, input.campaignId))) return [];
      // Visitors see only offers that stand (accepted, delivered, thanked).
      // Waiting, declined, released, withdrawn and closed rows are between
      // the contributor and the stewards; stewards also have
      // getContributionsForOwner.
      const campaign = await db.getCampaignById(input.campaignId);
      const seesAll = !!campaign && (await canStewardCampaign(ctx.user, campaign));
      if (!seesAll && input.status && !(PUBLIC_CONTRIBUTION_STATUSES as readonly string[]).includes(input.status)) return [];
      // 'fulfilled' means delivered, and thanked rows are still delivered,
      // so the delivered view includes both. Everything else filters exactly.
      let rows;
      if (input.status === 'fulfilled') {
        const all = await db.getContributionsByCampaign(input.campaignId);
        rows = all.filter(r => r.status === 'fulfilled' || r.status === 'thanked');
      } else if (input.status) {
        rows = await db.getContributionsByCampaignAndStatus(input.campaignId, input.status);
      } else {
        rows = await db.getContributionsByCampaign(input.campaignId);
      }
      if (!seesAll) rows = rows.filter(r => (PUBLIC_CONTRIBUTION_STATUSES as readonly string[]).includes(r.status));
      // An allowlist, never a denylist: contact details, the stewards' notes
      // to the contributor (ownerNotes), account ids and bridge keys never go
      // out. Names on contributions marked anonymous are masked (stewards
      // still see them in the owner view).
      return rows.map((r) => {
        const safe = pickPublic(r, PUBLIC_CONTRIBUTION_FIELDS);
        return { ...safe, contributorName: safe.isAnonymous ? 'A contributor' : safe.contributorName };
      });
    }),

  // Get contributions with full PII — campaign owner or admin only.
  getContributionsForOwner: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'fulfilled', 'thanked', 'expired', 'released', 'cancelled']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Every project steward sees contributor contact details: they run the
      // project (OWASP-TOP10 A01, deliberate widening). project-steward.ts is
      // the only gate.
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) throw new TRPCError({ code: 'FORBIDDEN', message: "Only this project's stewards can see its offers." });
      await assertCampaignSteward(ctx.user, campaign, "Only this project's stewards can see its offers.");
      return input.status
        ? await db.getContributionsByCampaignAndStatus(input.campaignId, input.status)
        : await db.getContributionsByCampaign(input.campaignId);
    }),

  // Submit a contribution to a campaign
  submitContribution: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      campaignItemId: z.number().optional(),
      contributorName: z.string().min(1).max(255),
      contributorEmail: z.string().email(),
      contributorPhone: z.string().optional(),
      contributorBio: z.string().optional(),
      contributionType: z.enum(['land', 'equipment', 'role', 'resource', 'financial', 'knowledge']),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      // Claims against a specific need
      quantityPledged: z.number().int().min(1).max(100_000).default(1),
      isAnonymous: z.boolean().optional(),
      referredBy: z.string().max(16).optional(),
      // Land-specific
      landHectares: z.number().optional(),
      landRegion: z.string().optional(),
      landFeatures: z.array(z.string()).optional(),
      // Equipment-specific
      equipmentName: z.string().optional(),
      equipmentQuantity: z.number().optional(),
      equipmentCondition: z.string().optional(),
      // Role-specific
      roleTitle: z.string().optional(),
      // Whole hours a week, 1 to 168. Required when the need is an hours
      // need (a role measured in hours a week); optional elsewhere.
      hoursPerWeek: z.number().int().min(1).max(MAX_OFFER_HOURS).optional(),
      durationMonths: z.number().int().min(1).max(120).optional(),
      skills: z.array(z.string()).optional(),
      // Resource-specific
      resourceName: z.string().optional(),
      resourceQuantity: z.number().optional(),
      resourceUnit: z.string().optional(),
      // Financial-specific. Refused while crowdpool.rails.accept_money is off.
      financialAmount: z.number().min(0).max(10_000_000).optional(),
      financialCurrency: z.string().optional(),
      paymentMethod: z.string().optional(),
      // Common. On an offer against a need the server sets the value from
      // the need (below) and this number is ignored; a freeform offer keeps it.
      estimatedValue: z.number().min(0).max(10_000_000),
      contributorNotes: z.string().optional(),
      // Give or lend (build spec 2026-09-25, section 6.3). Dates are
      // 'YYYY-MM-DD' strings end to end.
      offerMode: z.enum(['give', 'lend']).optional(),
      availableFrom: zDay.optional(),
      lendUntil: zDay.optional(),
      lendTerms: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "campaign_contribution");
      // Verify campaign exists and is active
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      if (campaign.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Campaign is not accepting contributions' });
      }
      // Example campaigns take practice runs: every check below still runs,
      // then the practice return further down skips every write.
      const practice = !!campaign.isDemo;

      // 1. Nothing takes money (rails ruling 2026-09-05): a financial offer is
      //    refused at the route while crowdpool.rails.accept_money is off.
      if (input.contributionType === 'financial' && (await getGameVariableOr('crowdpool.rails.accept_money', 0)) !== 1) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: MONEY_RAIL_REFUSAL });
      }

      // Claim against a specific need: guard the slot count and stamp the
      // claim expiry window from the crowdpool.claim_expiry_days_* variables.
      let claimExpiresAt: Date | null = null;
      let item: Awaited<ReturnType<typeof db.getCampaignItemById>> = null;
      let quantityPledged = input.quantityPledged;
      let hoursPerWeek = input.hoursPerWeek;
      let estimatedValue = input.estimatedValue;
      let hoursNeed = false;
      if (input.campaignItemId) {
        item = await db.getCampaignItemById(input.campaignItemId);
        if (!item || item.campaignId !== input.campaignId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'That need does not belong to this campaign' });
        }
        hoursNeed = isHoursNeed(item);
        if (hoursNeed) {
          // A role measured in hours a week. People offer the hours they
          // can give; a steward accepts each at a number of hours. Offers
          // are never refused for partial capacity, only when every hour the
          // role needs is already accepted. Accepted hours never expire.
          const offer = input.hoursPerWeek;
          if (offer === undefined || !Number.isInteger(offer) || offer < 1 || offer > MAX_OFFER_HOURS) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tell the stewards how many hours a week you can offer, as a whole number.' });
          }
          if (roleFillState(item).filled) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: FILLED_ROLE_REFUSAL });
          }
          quantityPledged = offer;
          hoursPerWeek = offer; // the ORIGINAL offer, kept forever
          claimExpiresAt = null;
          // The server prices the offer: its share of the role's value by hours.
          estimatedValue = scaleRoleValue(item.estimatedValue, item.quantityWanted, Math.min(offer, item.quantityWanted));
        } else {
          if (item.quantityClaimed + input.quantityPledged > item.quantityWanted) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'This need is already fully claimed' });
          }
        }
      }

      // 2 to 4. Give or lend: the modes the need accepts, a lend's dates and
      //    terms. Roles, shifts and knowledge drop every loan field.
      const giveOrLend = checkGiveOrLend({
        need: item,
        contributionType: input.contributionType,
        offerMode: input.offerMode,
        availableFrom: input.availableFrom,
        lendUntil: input.lendUntil,
        lendTerms: input.lendTerms,
        today: todayUtc(),
      });

      if (item && !hoursNeed) {
        // 5. The value comes from the need, never the client: the need's
        //    per-slot value times the slots offered. Loans count at the
        //    listed value until plan decision 5 is ruled. Money needs keep
        //    the row's own amount (their value is the whole money ask).
        if (!isMoneyKind(kindForItem(item))) {
          const wanted = Number(item.quantityWanted) || 0;
          const needValue = Math.max(0, Number(item.estimatedValue) || 0);
          const perSlot = wanted > 1 ? round2(needValue / wanted) : needValue;
          estimatedValue = round2(perSlot * quantityPledged);
        }
        // 6. Claim expiry. A lend counts from when the thing is available, so
        //    an accepted loan that starts later is not swept before it begins.
        if (giveOrLend.offerMode === 'lend') {
          const expiryDays = await claimExpiryDaysForKind('loan');
          const startsAt = giveOrLend.availableFrom ? Date.parse(`${giveOrLend.availableFrom}T00:00:00.000Z`) : 0;
          claimExpiresAt = new Date(Math.max(Date.now(), startsAt) + expiryDays * DAY_MS);
        } else {
          const expiryDays = await claimExpiryDaysForKind(item.kind);
          claimExpiresAt = new Date(Date.now() + expiryDays * DAY_MS);
        }
      }

      // A practice run on an example campaign stops here, after the same
      // checks a real offer passes: no row, no counter, no notification, no
      // email (PRACTICE_CONTRIBUTION_RESULT).
      if (practice) return PRACTICE_CONTRIBUTION_RESULT;

      // Insert only while the campaign is still live: a cancel that commits
      // after the status check above must not leave a new pending row it
      // never closed.
      const database = await requireDb();
      const contributionId = await database.transaction(async (tx) => {
        await assertCampaignOpen(tx, input.campaignId, 'Campaign is not accepting contributions');
        return db.createContribution({
        campaignId: input.campaignId,
        campaignItemId: input.campaignItemId,
        userId: ctx.user?.id,
        contributorName: sanitizeInput(input.contributorName),
        contributorEmail: input.contributorEmail,
        contributorPhone: input.contributorPhone,
        contributorBio: input.contributorBio ? sanitizeInput(input.contributorBio) : null,
        contributionType: input.contributionType,
        title: sanitizeInput(input.title),
        description: input.description ? sanitizeInput(input.description) : null,
        landHectares: input.landHectares,
        landRegion: input.landRegion ? sanitizeInput(input.landRegion) : null,
        landFeatures: input.landFeatures ? JSON.stringify(input.landFeatures) : null,
        equipmentName: input.equipmentName ? sanitizeInput(input.equipmentName) : null,
        equipmentQuantity: input.equipmentQuantity,
        equipmentCondition: input.equipmentCondition,
        roleTitle: input.roleTitle ? sanitizeInput(input.roleTitle) : null,
        hoursPerWeek,
        durationMonths: input.durationMonths,
        skills: input.skills ? JSON.stringify(input.skills) : null,
        resourceName: input.resourceName ? sanitizeInput(input.resourceName) : null,
        resourceQuantity: input.resourceQuantity,
        resourceUnit: input.resourceUnit,
        financialAmount: input.financialAmount,
        financialCurrency: input.financialCurrency || 'USD',
        paymentMethod: input.paymentMethod,
        estimatedValue,
        contributorNotes: input.contributorNotes ? sanitizeInput(input.contributorNotes) : null,
        quantityPledged,
        claimExpiresAt,
        isAnonymous: input.isAnonymous ? 1 : 0,
        referredBy: input.referredBy,
        status: 'pending',
        // 7. Give or lend, checked above; lendTerms went through sanitizeInput.
        offerMode: giveOrLend.offerMode,
        availableFrom: giveOrLend.availableFrom,
        lendUntil: giveOrLend.lendUntil,
        lendTerms: giveOrLend.lendTerms,
      }, tx);
      });

      // Every project steward hears about the offer on the notification
      // spine (bell, push, email by their prefs). Never throws.
      await notifyProposalReceived({
        campaign,
        contribution: {
          id: contributionId,
          campaignId: input.campaignId,
          userId: ctx.user?.id ?? null,
          title: sanitizeInput(input.title),
          contributorName: input.isAnonymous ? null : sanitizeInput(input.contributorName),
          quantityPledged,
          hoursPerWeek: hoursPerWeek ?? null,
          roleTitle: input.roleTitle ? sanitizeInput(input.roleTitle) : null,
          campaignItemId: input.campaignItemId ?? null,
        },
        item,
        actorId: ctx.user?.id ?? null,
      });

      // Rye's site-owner notice (respects notification preferences)
      try {
        await notifyIfEnabled("campaignContributions", {
          title: `New Contribution: ${input.title}`,
          content: `A new ${input.contributionType} contribution has been submitted to campaign "${campaign.title}".\n\n**Contributor:** ${input.contributorName}\n**Type:** ${input.contributionType}\n**Value:** $${estimatedValue.toLocaleString()}\n\nReview it in the campaign dashboard.`,
        });
      } catch (e) {
        console.warn('Failed to send contribution notification:', e);
      }

      return { id: contributionId, success: true, practice: false as const };
    }),

  // Answer an offer: accept, decline, release, mark delivered, send thanks.
  // Project stewards only (server/lib/project-steward.ts).
  //
  // Transitions (2026-09-24, every need):
  //   accepted  only from pending or rejected
  //   rejected  only from pending (an accepted place is released instead)
  //   released  only from accepted
  //   fulfilled only from accepted (a freeform offer may go from pending)
  //   thanked   only from fulfilled
  // Repeating the status a row already has is a no-op. Before this, any
  // status other than accepted could be re-accepted, and fulfilled ->
  // accepted re-added the claim to the need's counter.
  //
  // Hours needs (a role measured in hours a week) accept at a number of
  // hours inside a transaction that locks the need, refuse to pass the hours
  // the role needs, and recompute the need's counters from the rows.
  //
  // Who hears: an account holder hears on the notification spine only (the
  // spine emails them by their prefs). Someone who offered WITHOUT an account
  // gets the three direct emails (accepted, declined, first delivery).
  updateContributionStatus: protectedProcedure
    .input(z.object({
      contributionId: z.number(),
      status: z.enum(['accepted', 'rejected', 'fulfilled', 'thanked', 'released']),
      ownerNotes: z.string().max(2000).optional(),
      acknowledgedNote: z.string().optional(),
      acknowledgedImageUrl: z.string().optional(),
      // Hours needs: accept this person at this many hours a week (default:
      // what they offered).
      acceptedHours: z.number().int().min(1).max(MAX_ROLE_HOURS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contribution = await db.getContributionById(input.contributionId);
      if (!contribution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
      }

      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await assertCampaignSteward(ctx.user, campaign, 'Not authorized to manage this campaign');

      const prevStatus = contribution.status;
      // Stored through sanitizeInput like every other contribution field; the
      // email templates escape again on the way out.
      const ownerNotes = input.ownerNotes !== undefined ? sanitizeInput(input.ownerNotes) : undefined;
      const item = contribution.campaignItemId ? await db.getCampaignItemById(contribution.campaignItemId) : null;
      const hoursNeed = isHoursNeed(item);
      const actorId = ctx.user.id;

      // A repeat of the status the row already has changes nothing and
      // tells nobody.
      if (prevStatus === input.status) return { success: true, changed: false };

      let changed = false;
      let firstFulfillment = false;
      let roleJustFilled = false;
      // Hours a week a release opened on a role that was filled (0: it wasn't).
      let reopenedHours = 0;
      let acceptedHours: number | null = null;

      if (input.status === 'accepted') {
        if (prevStatus !== 'pending' && prevStatus !== 'rejected') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an offer that is waiting can be accepted.' });
        }
        // A cancelled or completed campaign takes on nothing new. Cancel
        // closes pending and accepted rows but leaves declined ones, so
        // without this a declined offer could be accepted afterwards.
        if (campaign.status !== 'active') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: CLOSED_CAMPAIGN_ACCEPT });
        }
        if (hoursNeed && item) {
          const result = await acceptHoursContribution({
            contribution,
            itemId: item.id,
            hours: input.acceptedHours ?? contribution.hoursPerWeek ?? contribution.quantityPledged,
            ownerNotes,
          });
          acceptedHours = result.hours;
          roleJustFilled = result.justFilled;
        } else {
          const database = await requireDb();
          await database.transaction(async (tx) => {
            const itemId = contribution.campaignItemId;
            if (itemId) await tx.execute(sql`SELECT id FROM campaign_items WHERE id = ${itemId} FOR UPDATE`);
            await assertCampaignOpen(tx, contribution.campaignId, CLOSED_CAMPAIGN_ACCEPT);
            const affected = await conditionalStatusUpdate(contribution.id, ['pending', 'rejected'], {
              status: 'accepted',
              reviewedAt: new Date(),
              ...(ownerNotes !== undefined ? { ownerNotes } : {}),
            }, tx);
            if (affected === 0) throw raced();
            // Accepting a claim reserves its slots on the need (ghost progress).
            if (itemId) {
              await tx.update(campaignItemsTable)
                .set({ quantityClaimed: sql`${campaignItemsTable.quantityClaimed} + ${contribution.quantityPledged}` })
                .where(eq(campaignItemsTable.id, itemId));
            }
          });
        }
        changed = true;
        await db.updateCampaignPledgedTotals(contribution.campaignId);
      }

      if (input.status === 'rejected') {
        if (prevStatus === 'accepted') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This place is already accepted. Use Release to free it up.' });
        }
        if (prevStatus !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an offer that is waiting can be declined.' });
        }
        const affected = await conditionalStatusUpdate(contribution.id, ['pending'], {
          status: 'rejected',
          reviewedAt: new Date(),
          ...(ownerNotes !== undefined ? { ownerNotes } : {}),
        });
        if (affected === 0) throw raced();
        changed = true;
        await db.updateCampaignPledgedTotals(contribution.campaignId);
      }

      if (input.status === 'released') {
        if (prevStatus !== 'accepted') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an accepted place can be released.' });
        }
        const patch = {
          status: 'released' as const,
          reviewedAt: new Date(),
          ...(ownerNotes !== undefined ? { ownerNotes } : {}),
        };
        if (hoursNeed && item) {
          const database = await requireDb();
          reopenedHours = await database.transaction(async (tx) => {
            const locked = await lockHoursItem(tx, item.id);
            const acceptedBefore = await standingHoursExcluding(tx, item.id, 0);
            const affected = await conditionalStatusUpdate(contribution.id, ['accepted'], patch, tx);
            if (affected === 0) throw raced();
            await db.recomputeNeedCounters(item.id, tx);
            const acceptedAfter = await standingHoursExcluding(tx, item.id, 0);
            return reopenedOpenHours(
              { needed: locked.quantityWanted, accepted: acceptedBefore },
              { needed: locked.quantityWanted, accepted: acceptedAfter },
            );
          });
        } else {
          const affected = await conditionalStatusUpdate(contribution.id, ['accepted'], patch);
          if (affected === 0) throw raced();
          // The slots go back to the need, the same way the nightly sweep
          // releases an expired claim.
          if (contribution.campaignItemId) {
            const db2 = await getDb();
            if (db2) {
              await db2.update(campaignItemsTable)
                .set({ quantityClaimed: sql`GREATEST(${campaignItemsTable.quantityClaimed} - ${contribution.quantityPledged}, 0)` })
                .where(eq(campaignItemsTable.id, contribution.campaignItemId));
            }
          }
        }
        changed = true;
        await db.updateCampaignPledgedTotals(contribution.campaignId);
      }

      // Fulfilled is the payoff moment. Idempotent: the payoff runs only for
      // the call that actually moved the row, so a repeat is a no-op.
      if (input.status === 'fulfilled') {
        if (prevStatus === 'thanked') return { success: true, changed: false };
        if (hoursNeed && item) {
          // Serving the commitment: only from accepted, and the conditional
          // update makes delivery idempotent under concurrent clicks.
          if (prevStatus !== 'accepted') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only accepted contributions can be marked fulfilled' });
          }
          const database = await requireDb();
          firstFulfillment = await database.transaction(async (tx) => {
            const result: any = await tx.update(campaignContributionsTable)
              .set({
                status: 'fulfilled',
                fulfilledAt: new Date(),
                ...(ownerNotes !== undefined ? { ownerNotes } : {}),
              })
              .where(and(
                eq(campaignContributionsTable.id, contribution.id),
                eq(campaignContributionsTable.status, 'accepted'),
                isNull(campaignContributionsTable.fulfilledAt),
              ));
            if (affectedRows(result) !== 1) return false;
            await db.recomputeNeedCounters(item.id, tx);
            return true;
          });
        } else {
          // Claims must be accepted first; legacy freeform contributions (no
          // need attached) may go straight from pending.
          const allowedFrom: string[] = contribution.campaignItemId
            ? ['accepted']
            : ['pending', 'accepted'];
          if (!allowedFrom.includes(prevStatus)) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only accepted contributions can be marked fulfilled' });
          }
          if (!contribution.fulfilledAt) {
            const affected = await conditionalStatusUpdate(contribution.id, allowedFrom, {
              status: 'fulfilled',
              fulfilledAt: new Date(),
              ...(ownerNotes !== undefined ? { ownerNotes } : {}),
            });
            firstFulfillment = affected === 1;
            // Delivery confirms the slots (solid progress on the need).
            if (firstFulfillment && contribution.campaignItemId) {
              const db2 = await getDb();
              if (db2) {
                await db2.update(campaignItemsTable)
                  .set({ quantityDelivered: sql`${campaignItemsTable.quantityDelivered} + ${contribution.quantityPledged}` })
                  .where(eq(campaignItemsTable.id, contribution.campaignItemId));
              }
            }
          }
        }

        if (firstFulfillment) {
          changed = true;
          await deliveryPayoff(contribution, campaign, item);
          // Recompute after the payoff too, so the stored totals never lag.
          await db.updateCampaignPledgedTotals(contribution.campaignId);
        }
      }

      // Thanked closes the loop: a note is required, a photo is optional.
      let thanksNote = '';
      if (input.status === 'thanked') {
        if (prevStatus !== 'fulfilled') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only fulfilled contributions can be thanked' });
        }
        thanksNote = input.acknowledgedNote ? sanitizeInput(input.acknowledgedNote).trim() : '';
        if (!thanksNote) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A thank-you note is required' });
        }
        const affected = await conditionalStatusUpdate(contribution.id, ['fulfilled'], {
          status: 'thanked',
          acknowledgedAt: new Date(),
          acknowledgedNote: thanksNote,
          acknowledgedImageUrl: input.acknowledgedImageUrl,
        });
        if (affected === 0) throw raced();
        changed = true;
      }

      if (!changed) return { success: true, changed: false };

      // ── Tell people ─────────────────────────────────────────────────────
      const noticeContribution = {
        ...contribution,
        quantityPledged: acceptedHours ?? contribution.quantityPledged,
      };
      if (contribution.userId) {
        // Account holders: the notification spine only. It emails them by
        // their campaignsEmail preference, so there is no direct email here.
        const args = { campaign, contribution: noticeContribution, item, note: ownerNotes ?? null, actorId };
        if (input.status === 'accepted') await notifyProposalAccepted(args);
        else if (input.status === 'rejected') await notifyProposalDeclined(args);
        else if (input.status === 'released') await notifyReleased(args);
        else if (input.status === 'fulfilled') await notifyDelivered(args);
        else if (input.status === 'thanked') await notifyThanked({ ...args, note: thanksNote });
      } else if (input.status === 'accepted' || input.status === 'rejected' || input.status === 'fulfilled') {
        // No account: the direct emails they get today. Released and thanks
        // send nothing (the stewards talk to them directly).
        await sendContributionStatusEmail(input.status, {
          campaign,
          contribution: noticeContribution,
          item,
          ownerNotes: ownerNotes ?? null,
        });
      }
      if (roleJustFilled && item) {
        await notifyRoleFilled({ campaign, item, triggerContributionId: contribution.id, actorId });
      }
      // A release that opened a filled role tells the people still waiting
      // on it (notifyRoleReopened decides who). Never the person released.
      if (reopenedHours > 0 && item) {
        await notifyRoleReopened({
          campaign, item, openHours: reopenedHours, excludeUserIds: [contribution.userId], actorId,
        });
      }

      return { success: true, changed: true, ...(acceptedHours != null ? { acceptedHours, roleFilled: roleJustFilled } : {}) };
    }),

  // Change the hours an accepted person holds on an hours need. Stewards
  // only. Lowering frees hours for others; raising is capped at the hours
  // still open.
  setAcceptedHours: protectedProcedure
    .input(z.object({
      contributionId: z.number(),
      hours: z.number().int().min(1).max(MAX_ROLE_HOURS),
    }))
    .mutation(async ({ ctx, input }) => {
      const contribution = await db.getContributionById(input.contributionId);
      if (!contribution) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      await assertCampaignSteward(ctx.user, campaign, 'Not authorized to manage this campaign');

      const item = contribution.campaignItemId ? await db.getCampaignItemById(contribution.campaignItemId) : null;
      if (!item || !isHoursNeed(item)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a role measured in hours a week has hours to change.' });
      }
      if (contribution.status !== 'accepted') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an accepted place can have its hours changed.' });
      }
      if (campaign.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "This campaign isn't live anymore, so its hours can't change." });
      }
      if (contribution.quantityPledged === input.hours) return { success: true, changed: false };

      const database = await requireDb();
      const { changed, justFilled, reopened } = await database.transaction(async (tx) => {
        const locked = await lockHoursItem(tx, item.id);
        await assertCampaignOpen(tx, contribution.campaignId, "This campaign isn't live anymore, so its hours can't change.");
        // The hours this person holds right now, read under the lock. The copy
        // read before the transaction can be stale: two stewards lowering the
        // same person at once would both see the old figure, and the second
        // would think the role was still filled and announce a reopening that
        // the first had already announced.
        const current = await lockedContributionHours(tx, contribution.id);
        if (!current || current.status !== 'accepted') throw raced();
        if (current.hours === input.hours) {
          return { changed: false, justFilled: false, reopened: 0 };
        }
        const standing = await standingHoursExcluding(tx, item.id, contribution.id);
        const check = checkAcceptHours({ requested: input.hours, neededHours: locked.quantityWanted, standingExcludingThis: standing });
        if (!check.ok) throw new TRPCError({ code: 'BAD_REQUEST', message: check.message });
        const result: any = await tx.update(campaignContributionsTable)
          .set({
            quantityPledged: input.hours,
            estimatedValue: scaleRoleValue(locked.estimatedValue, locked.quantityWanted, input.hours),
          })
          .where(and(
            eq(campaignContributionsTable.id, contribution.id),
            eq(campaignContributionsTable.status, 'accepted'),
            // Refuse to write over hours that moved since they were read.
            eq(campaignContributionsTable.quantityPledged, current.hours),
          ));
        if (affectedRows(result) === 0) throw raced();
        await db.recomputeNeedCounters(item.id, tx);
        const wasFilled = standing + current.hours >= locked.quantityWanted;
        return {
          changed: true,
          justFilled: !wasFilled && standing + input.hours >= locked.quantityWanted,
          // Lowering someone's hours on a filled role opens it up again.
          reopened: reopenedOpenHours(
            { needed: locked.quantityWanted, accepted: standing + current.hours },
            { needed: locked.quantityWanted, accepted: standing + input.hours },
          ),
        };
      });
      if (!changed) return { success: true, changed: false };
      await db.updateCampaignPledgedTotals(contribution.campaignId);

      await notifyHoursChanged({
        campaign,
        contribution: { ...contribution, quantityPledged: input.hours },
        item,
        hours: input.hours,
        actorId: ctx.user.id,
      });
      // Raising to the full role tells its holders and stewards. Lowering on a
      // filled role tells the people still waiting on it; the person whose
      // hours changed hears only above.
      if (justFilled) {
        await notifyRoleFilled({ campaign, item, triggerContributionId: contribution.id, actorId: ctx.user.id });
      }
      if (reopened > 0) {
        await notifyRoleReopened({
          campaign, item, openHours: reopened, excludeUserIds: [contribution.userId], actorId: ctx.user.id,
        });
      }
      return { success: true, changed: true };
    }),

  // Change how many hours a week a role needs. Stewards only. This is how a
  // steward reopens a filled role for more people, or trims one. It can never
  // drop below the hours already accepted. Value per hour stays the same.
  setNeedHours: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      hoursNeeded: z.number().int().min(1).max(MAX_ROLE_HOURS),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await db.getCampaignItemById(input.itemId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Need not found' });
      const campaign = await db.getCampaignById(item.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      await assertCampaignSteward(ctx.user, campaign, 'Not authorized to manage this campaign');
      if (!isHoursNeed(item)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a role measured in hours a week has hours to change.' });
      }
      if (['cancelled', 'completed', 'funded'].includes(campaign.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "This campaign is closed, so its roles can't change." });
      }

      const database = await requireDb();
      const reopened = await database.transaction(async (tx) => {
        const locked = await lockHoursItem(tx, item.id);
        const accepted = await standingHoursExcluding(tx, item.id, 0);
        if (input.hoursNeeded < accepted) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `${accepted} hours a week are already accepted. Release someone or lower their hours first.`,
          });
        }
        const value = locked.quantityWanted > 0
          ? scaleRoleValue(locked.estimatedValue, locked.quantityWanted, input.hoursNeeded)
          : locked.estimatedValue;
        await tx.update(campaignItemsTable)
          .set({ quantityWanted: input.hoursNeeded, hoursPerWeek: input.hoursNeeded, estimatedValue: value })
          .where(eq(campaignItemsTable.id, item.id));
        await db.recomputeNeedCounters(item.id, tx);
        await db.recomputeCampaignValueTotals(item.campaignId, tx);
        return reopenedOpenHours(
          { needed: locked.quantityWanted, accepted },
          { needed: input.hoursNeeded, accepted },
        );
      });
      await db.updateCampaignPledgedTotals(item.campaignId);
      // Raising the hours of a filled role opens it up again: the people
      // still waiting on it hear about it.
      if (reopened > 0) {
        await notifyRoleReopened({ campaign, item, openHours: reopened, actorId: ctx.user.id });
      }
      return { success: true };
    }),

  // Withdraw a contribution (authenticated, contributor only)
  withdrawContribution: protectedProcedure
    .input(z.object({
      contributionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contribution = await db.getContributionById(input.contributionId);
      if (!contribution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
      }

      // Verify authenticated user owns this contribution
      if (contribution.contributorEmail !== ctx.user.email) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only withdraw your own contributions' });
      }

      // Can only withdraw pending contributions
      if (contribution.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only withdraw pending contributions' });
      }

      // Conditional, like every other status write: if a steward accepted it
      // in the meantime, the withdraw is refused instead of leaving a
      // 'withdrawn' row whose hours still count on the need.
      const affected = await conditionalStatusUpdate(input.contributionId, ['pending'], { status: 'withdrawn' });
      if (affected === 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'The stewards just answered this offer. Refresh to see where it stands.' });
      }
      return { success: true };
    }),

  // A steward records that a lent thing went back to its owner (build spec
  // 2026-09-25, section 6.4). A stamp only: no status change, no counter
  // change, no notice. Accepted, delivered and thanked loans qualify
  // (question Q6). A repeat answers changed: false.
  markLoanReturned: protectedProcedure
    .input(z.object({ contributionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const contribution = await db.getContributionById(input.contributionId);
      if (!contribution) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      await assertCampaignSteward(ctx.user, campaign, "Only this project's stewards can mark a loan returned.");
      if (campaign.isDemo) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Example campaigns keep their example records.' });
      }
      if (contribution.offerMode !== 'lend') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a loan can be marked returned.' });
      }
      if (contribution.returnedAt) return { success: true, changed: false };
      if (!(TAKEN_ON_STATUSES as readonly string[]).includes(contribution.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a loan the stewards took on can be marked returned.' });
      }
      const database = await requireDb();
      const result = await database.update(campaignContributionsTable)
        .set({ returnedAt: new Date() })
        .where(and(
          eq(campaignContributionsTable.id, contribution.id),
          eq(campaignContributionsTable.offerMode, 'lend'),
          inArray(campaignContributionsTable.status, [...TAKEN_ON_STATUSES]),
          isNull(campaignContributionsTable.returnedAt),
        ));
      if (affectedRows(result) === 0) {
        // Someone else stamped it first (a repeat), or the row moved.
        const again = await db.getContributionById(contribution.id);
        if (again?.returnedAt) return { success: true, changed: false };
        throw raced();
      }
      return { success: true, changed: true };
    }),

  // Formalize a delivered contribution as a Hypha contribution proposal on the
  // project's DHO. Delivery is the moment that counts, so only fulfilled or
  // thanked contributions formalize. Project tokens are issued on-chain by the
  // DHO through Hypha, never by us. We only build the bridge and hand off.
  formalizeOnHypha: protectedProcedure
    .input(z.object({ contributionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const contribution = await db.getContributionById(input.contributionId);
      if (!contribution) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });

      // Steward, the contributor themselves, or an admin may formalize.
      const isSteward = await canStewardCampaign(ctx.user, campaign);
      const isContributor = contribution.userId != null && contribution.userId === ctx.user.id;
      if (!isSteward && !isContributor) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to formalize this contribution' });
      }

      // Only delivered contributions formalize.
      if (contribution.status !== 'fulfilled' && contribution.status !== 'thanked') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only delivered contributions can be formalized on Hypha' });
      }
      if (contribution.hyphaBridgeKey) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This contribution is already on its way to Hypha' });
      }

      // The DHO slug lives inside the campaign's daoLink (.../dho/{slug}/...). It
      // is user-entered, so guard for a missing or non-Hypha value.
      const slugMatch = String(campaign.daoLink || '').match(/\/dho\/([^/]+)/);
      const targetDhoSlug = slugMatch ? decodeURIComponent(slugMatch[1]) : '';
      if (!targetDhoSlug) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This campaign has no Hypha DHO link yet, so it cannot be formalized. Add the project DHO link first.' });
      }

      const value = contribution.estimatedValue || 0;
      const projectName = campaign.projectName || campaign.title;
      const title = `${contribution.title} for ${projectName}`.slice(0, 200);
      const contributorLabel = contribution.isAnonymous
        ? 'a community member'
        : sanitizeInput(contribution.contributorName || 'a contributor');
      const description = [
        contribution.description ? sanitizeInput(contribution.description) : '',
        `Contributed by ${contributorLabel} and delivered to ${sanitizeInput(projectName)}.`,
        value > 0 ? `Estimated value: ${campaign.currency || 'USD'} ${value.toLocaleString()}.` : '',
      ].filter(Boolean).join('\n\n').slice(0, 1500);

      const { bridgeToHypha } = await import('../lib/hypha-bridge');
      const { bridgeKey, bridgeUrl } = await bridgeToHypha('crowdpool-to-contribution', {
        sourceId: String(contribution.id),
        targetDhoSlug,
        title,
        description,
        initiatorUserId: ctx.user.id,
        metadata: { campaignId: campaign.id, contributionId: contribution.id },
      });

      const dbx = await getDb();
      if (dbx) {
        await dbx.update(campaignContributionsTable)
          .set({ hyphaBridgeKey: bridgeKey })
          .where(eq(campaignContributionsTable.id, contribution.id));
      }
      return { ok: true, bridgeUrl };
    }),

  // How far a formalized contribution's Hypha proposal has traveled, so the
  // steward can see created -> handoff -> on chain -> passed at a glance.
  hyphaBridgeStatus: publicProcedure
    .input(z.object({ bridgeKey: z.string().min(1).max(16) }))
    .query(async ({ input }) => {
      const dbx = await getDb();
      if (!dbx) return null;
      const { hyphaBridges } = await import('../../drizzle/schema');
      const rows = await dbx
        .select({ status: hyphaBridges.status, hyphaPassedAt: hyphaBridges.hyphaPassedAt, basescanUrl: hyphaBridges.basescanUrl })
        .from(hyphaBridges)
        .where(eq(hyphaBridges.bridgeKey, input.bridgeKey))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Get user's contributions
  myContributions: protectedProcedure.query(async ({ ctx }) => {
    return await db.getContributionsByUser(ctx.user.id);
  }),

  // Link past anonymous contributions to this account by verified email, and
  // back-create any delivered ones onto the Living Tree. Idempotent, so it is
  // safe to call from a "claim your past contributions" button as well as the
  // automatic auth-flow hook.
  claimMyContributions: protectedProcedure.mutation(async ({ ctx }) => {
    const email = ctx.user.email;
    if (!email) return { linked: 0, livingTreeAdded: 0 };
    const database = await getDb();
    if (!database) return { linked: 0, livingTreeAdded: 0 };
    return await linkAnonymousContributions(database, ctx.user.id, email);
  }),

  // Get campaigns owned by user
  // Owning a campaign is not the same as being its reviewer: the creator
  // gets their own pitch back, not adminNotes about it. Nothing in the
  // client has ever rendered that column outside the seeds-claims admin tab.
  myCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const allCampaigns = await db.listCampaigns();
    return allCampaigns
      .filter(c => c.userId === ctx.user.id)
      .map(c => toPublicCampaign(c, ctx.user));
  }),

  // Move a campaign between statuses. Security (2026-09-24): this used to let
  // a campaign's owner set ANY status, so a creator could publish past review
  // or mark their own campaign complete. The transition tables in
  // shared/campaignStatus.ts now decide: stewards send a draft for review and
  // cancel; publishing, completing and rejecting are admin moves.
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'pending_review', 'active', 'funded', 'completed', 'cancelled', 'rejected']),
      reviewNotes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.id);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      const role = isAdminUser(ctx.user)
        ? 'admin'
        : (await canStewardCampaign(ctx.user, campaign)) ? 'steward' : null;
      if (!role) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to update this campaign' });
      }

      const from = campaign.status as CampaignStatus;
      const to = input.status;
      if (from === to) return { success: true };
      if (!canTransition(from, to, role)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `A campaign can't move from ${STATUS_WORDS[from] ?? from} to ${STATUS_WORDS[to] ?? to}.`,
        });
      }

      if (to === 'cancelled') {
        // One cancel service: closes offers, recomputes, tells everyone.
        const result = await cancelCampaign({ campaignId: campaign.id, actor: ctx.user });
        return { success: true, ...result };
      }

      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const now = new Date();
      const patch: Partial<typeof campaignsTable.$inferInsert> = { status: to, updatedAt: now };
      // Going live stamps the clocks the progress tracker counts from.
      if (to === 'active' && !campaign.startedAt) {
        patch.startedAt = now;
        patch.publishedAt = now;
      }
      if (to === 'completed' && !campaign.completedAt) patch.completedAt = now;
      if (role === 'admin' && (to === 'active' || to === 'rejected')) {
        patch.reviewedBy = ctx.user.id;
        patch.reviewedAt = now;
        if (input.reviewNotes !== undefined) patch.adminNotes = sanitizeInput(input.reviewNotes);
      }

      // Conditional on the status we read, so two admins clicking at once
      // cannot both apply (and double-count fundedCampaignCount below).
      const result: any = await db2.update(campaignsTable)
        .set(patch)
        .where(and(eq(campaignsTable.id, input.id), eq(campaignsTable.status, from)));
      const affected = Number(result?.[0]?.affectedRows ?? result?.affectedRows ?? 0);
      if (affected === 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Someone just changed this campaign. Refresh and try again.' });
      }

      // A funded or completed campaign counts toward the land project's
      // status progression. Guarded on the transition so flipping between
      // funded and completed cannot double-count.
      const fundedStatuses = ['funded', 'completed'];
      if (
        fundedStatuses.includes(to)
        && !fundedStatuses.includes(from)
        && campaign.applicationId
      ) {
        await db2.update(applicationsTable)
          .set({ fundedCampaignCount: sql`COALESCE(${applicationsTable.fundedCampaignCount}, 0) + 1` })
          .where(eq(applicationsTable.id, campaign.applicationId));
      }

      // Tell the project's stewards (and, on completion, the account holders
      // who contributed) on the notification spine. Never throws.
      const reviewNotes = input.reviewNotes !== undefined ? sanitizeInput(input.reviewNotes) : null;
      if (to === 'active') {
        await notifyCampaignApproved({ campaign, reviewNotes, reviewedAt: now, actorId: ctx.user.id });
      } else if (to === 'rejected') {
        await notifyCampaignDeclined({ campaign, reviewNotes, reviewedAt: now, actorId: ctx.user.id });
      } else if (fundedStatuses.includes(to) && !fundedStatuses.includes(from)) {
        await notifyCampaignCompleted({ campaign, actorId: ctx.user.id });
      }

      return { success: true };
    }),

  // Cancel a campaign, with an optional message for everyone involved.
  // Stewards cancel their own (draft, in review or live); admins also a
  // sent-back one. server/lib/campaign-cancel.ts does the work; a repeat
  // call returns alreadyCancelled and sends nothing.
  cancel: protectedProcedure
    .input(z.object({
      id: z.number(),
      message: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await cancelCampaign({ campaignId: input.id, actor: ctx.user, message: input.message });
    }),

  // Live campaigns that could use the energy of a cancelled campaign's
  // people. Public fields only; [] for a campaign the viewer cannot see.
  suggestAlternatives: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign || !(await canViewCampaign(ctx.user, campaign))) return [];
      const suggestions = await suggestAlternatives(campaign, 3);
      return suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        projectName: s.projectName,
        location: s.location,
        country: s.country,
        isDemo: !!s.isDemo,
        path: s.path,
      }));
    }),

  // Whether the signed-in viewer stewards this campaign (the Manage button).
  canSteward: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) return false;
      return await canStewardCampaign(ctx.user, campaign);
    }),

  // How many people follow a campaign. Counts only, stewards only.
  followerCounts: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      await assertCampaignSteward(ctx.user, campaign, "Only this project's stewards can see its followers.");
      return await db.getCampaignFollowerCounts(input.campaignId);
    }),

  // A steward sends their draft to the review queue. This is how a
  // play-launched draft (plays.ts) reaches an admin.
  submitForReview: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.id);
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      await assertCampaignSteward(ctx.user, campaign, "Only this project's stewards can send it for review.");
      if (campaign.status === 'pending_review') return { success: true };
      if (!canTransition(campaign.status, 'pending_review', 'steward')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only a draft can be sent for review.' });
      }
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const result: any = await db2.update(campaignsTable)
        .set({ status: 'pending_review', updatedAt: new Date() })
        .where(and(eq(campaignsTable.id, input.id), eq(campaignsTable.status, 'draft')));
      const affected = Number(result?.[0]?.affectedRows ?? result?.affectedRows ?? 0);
      if (affected === 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Someone just changed this campaign. Refresh and try again.' });
      }
      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({
          title: `Campaign sent for review: ${campaign.title}`,
          content: `${campaign.title} (${campaign.projectName}) is waiting in the campaign review queue.`,
        });
      } catch (err) {
        console.warn('[Campaign] review notice to the site owner failed (non-fatal):', err);
      }
      return { success: true };
    }),

  // ---- Ready to crowdpool ticks (build spec 2026-09-25, section 12) ----
  // A project steward's record of which Ready to crowdpool items the project
  // meets, stored on the campaign so the review team sees it. Keys are the
  // permanent keys in shared/crowdpoolReadiness.ts. Stewards and admins only.

  getReadiness: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const campaign = await stewardCampaign(ctx.user, input.campaignId, "Only this project's stewards can see its ticks.");
      return await db.getReadinessTicks(campaign.id);
    }),

  setReadinessTick: protectedProcedure
    .input(z.object({
      campaignId: z.number().int().positive(),
      key: z.string().max(40),
      ticked: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await stewardCampaign(ctx.user, input.campaignId, "Only this project's stewards can tick its items.");
      if (campaign.isDemo) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Example campaigns don't keep ticks." });
      }
      if (CLOSED_CAMPAIGN_STATUSES.includes(campaign.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This campaign is closed, so its ticks stay as they are.' });
      }
      // A retired key can still be unticked, never newly ticked.
      const known = input.ticked ? isCurrentReadinessKey(input.key) : isReadinessKey(input.key);
      if (!known) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "That isn't one of the Ready to crowdpool items." });
      }
      const { changed } = await db.setReadinessTick(campaign.id, input.key, ctx.user.id, input.ticked);
      return { success: true, changed };
    }),

  // ---- Followers, updates, and the Pool Ledger ----

  // Email-only follow, no account required. Never reveals whether an email
  // is already subscribed.
  subscribeByEmail: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      email: z.string().email(),
      name: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "campaign_follow_email");
      const campaign = await db.getCampaignById(input.campaignId);
      // An unpublished campaign is invisible to visitors, so following it
      // would leak its title and updates by email. Same answer as a missing id.
      if (!campaign || !(await canViewCampaign(ctx.user, campaign))) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await db.upsertCampaignFollower({
        campaignId: input.campaignId,
        email: input.email.toLowerCase().trim(),
        name: input.name ? sanitizeInput(input.name) : null,
        unsubscribeToken: nanoid(32),
      });
      return { success: true };
    }),

  // "Tell me when crowdpooling opens." One row per email per Game season;
  // the season comes from the server clock, never the client. Mailed only
  // by admin Outbound. Always { ok: true }: never reveals whether an email
  // is already on the list.
  joinWaitlist: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      name: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "campaign_follow_email");
      await db.upsertWaitlist({
        seasonNumber: regenSeasonSpan(new Date()).seasonNumber,
        email: input.email.toLowerCase().trim(),
        name: input.name ? sanitizeInput(input.name) : null,
        unsubscribeToken: nanoid(32),
      });
      return { ok: true };
    }),

  // The "Stop these emails" link on every list letter (campaign email
  // followers and the waitlist). 'this' removes the rows that carry the
  // token; 'all' removes every follower and waitlist row for that token's
  // email. Always { ok: true }, so a guessed token reveals nothing. The
  // token is never logged.
  unsubscribeEmailFollow: publicProcedure
    .input(z.object({
      token: z.string().length(32),
      scope: z.enum(['this', 'all']),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "campaign_list_unsubscribe");
      try {
        const a = await db.deleteEmailFollowByToken(input.token, 'this');
        const b = await db.deleteWaitlistByToken(input.token, 'this');
        const email = a.email ?? b.email;
        if (input.scope === 'all' && email) await db.deleteEmailListRowsForEmail(email);
      } catch {
        console.warn('[campaign-updates] unsubscribe failed');
      }
      return { ok: true };
    }),

  // Follow a campaign with an account. Idempotent.
  follow: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      // Following an unpublished campaign would send its title, updates and
      // cancel message to a stranger's bell and inbox.
      if (!campaign || !(await canViewCampaign(ctx.user, campaign))) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db2.insert(userFollows)
        .values({ userId: ctx.user.id, targetType: 'campaign', targetId: String(input.campaignId) })
        .onDuplicateKeyUpdate({ set: { id: sql`id` } });
      return { success: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await db2.delete(userFollows)
        .where(and(
          eq(userFollows.userId, ctx.user.id),
          eq(userFollows.targetType, 'campaign'),
          eq(userFollows.targetId, String(input.campaignId)),
        ));
      return { success: true };
    }),

  // Publish a numbered journal entry and fan out to followers.
  createUpdate: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      title: z.string().min(1).max(255),
      body: z.string().min(1),
      imageUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await assertCampaignSteward(ctx.user, campaign, 'Not authorized to post updates for this campaign');

      const title = sanitizeInput(input.title);
      const { id, updateNumber } = await db.createCampaignUpdate({
        campaignId: input.campaignId,
        authorId: ctx.user.id,
        title,
        body: sanitizeRichText(input.body),
        imageUrls: input.imageUrls,
      });

      // Fan out to account-holder followers on the notification spine
      // (bell, push, and the daily digest for email). Email-only followers
      // hear in the next letter from the ReGen Civics team (admin Outbound).
      // Never throws, so a notice failure never blocks publishing.
      await notifyUpdatePosted({
        campaign,
        update: { id, updateNumber, title },
        authorId: ctx.user.id,
      });

      return { id, updateNumber };
    }),

  // Public updates journal, newest first.
  listUpdates: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!(await canReadCampaignChildren(ctx.user, input.campaignId))) return [];
      return await db.listCampaignUpdates(input.campaignId);
    }),

  // The Pool Ledger: what has moved through this campaign, PII stripped.
  getActivity: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      limit: z.number().int().min(1).max(100).default(30),
    }))
    .query(async ({ input, ctx }) => {
      if (!(await canReadCampaignChildren(ctx.user, input.campaignId))) return [];
      const db2 = await getDb();
      if (!db2) return [];

      const rows = await db2.select().from(campaignContributionsTable)
        .where(and(
          eq(campaignContributionsTable.campaignId, input.campaignId),
          inArray(campaignContributionsTable.status, ['accepted', 'fulfilled', 'thanked']),
        ))
        .orderBy(desc(campaignContributionsTable.submittedAt));

      const kindFor = { accepted: 'pledged', fulfilled: 'delivered', thanked: 'thanked' } as const;
      const atFor = (c: (typeof rows)[number]) => {
        if (c.status === 'fulfilled') return c.fulfilledAt ?? c.submittedAt;
        if (c.status === 'thanked') return c.acknowledgedAt ?? c.fulfilledAt ?? c.submittedAt;
        return c.reviewedAt ?? c.submittedAt;
      };

      return rows
        .map((c) => ({
          id: c.id,
          kind: kindFor[c.status as keyof typeof kindFor],
          contributorName: c.isAnonymous ? 'A contributor' : c.contributorName,
          title: c.title,
          contributionType: c.contributionType,
          estimatedValue: c.estimatedValue,
          at: atFor(c),
        }))
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, input.limit);
    }),

  // Track campaign page view
  trackView: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      visitorId: z.string().optional(),
      referrer: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      userAgent: z.string().optional(),
      deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.trackCampaignView({
        campaignId: input.campaignId,
        visitorId: input.visitorId,
        userId: ctx.user?.id,
        referrer: input.referrer,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        userAgent: input.userAgent,
        deviceType: input.deviceType,
      });
      return { success: true };
    }),

  // Get campaign analytics (owner only)
  getAnalytics: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await assertCampaignSteward(ctx.user, campaign, "Only this project's stewards can see its numbers.");

      const analytics = await db.getCampaignAnalytics(input.campaignId);
      const conversion = await db.getCampaignConversionRate(input.campaignId);

      return {
        ...analytics,
        conversion,
      };
    }),

  // ---- Campaign Images ----

  // Upload an image to a campaign
  uploadImage: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // Base64 encoded
      contentType: z.string(),
      fileSize: z.number(),
      category: z.enum(['land', 'team', 'progress', 'infrastructure', 'community', 'other']),
      caption: z.string().max(500).optional(),
      isCover: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the campaign
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await assertCampaignSteward(ctx.user, campaign, 'Not authorized to upload images to this campaign');

      // Validate file size (max 5MB)
      if (input.fileSize > 5 * 1024 * 1024) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Image must be under 5MB' });
      }

      // Validate content type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(input.contentType)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
      }

      // Upload to S3
      const ext = input.fileName.split('.').pop() || 'jpg';
      const fileKey = `campaigns/${input.campaignId}/images/${nanoid()}.${ext}`;
      const buffer = Buffer.from(input.fileData, 'base64');
      const { url, key } = await storagePut(fileKey, buffer, input.contentType);

      // Save to database
      const imageId = await db.addCampaignImage({
        campaignId: input.campaignId,
        uploadedByUserId: ctx.user.id,
        url,
        fileKey: key,
        fileName: input.fileName,
        mimeType: input.contentType,
        fileSize: input.fileSize,
        category: input.category,
        caption: input.caption,
        isCover: input.isCover,
      });

      return { id: imageId, url, key, success: true };
    }),

  // Get all images for a campaign
  getImages: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!(await canReadCampaignChildren(ctx.user, input.campaignId))) return [];
      return await db.getCampaignImages(input.campaignId);
    }),

  // Delete a campaign image
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // The uploader, or any steward of the image's campaign.
      const image = await db.getCampaignImageById(input.imageId);
      const campaign = image ? await db.getCampaignById(image.campaignId) : null;
      const asSteward = !!campaign && (await canStewardCampaign(ctx.user, campaign));
      const deleted = await db.deleteCampaignImage(input.imageId, ctx.user.id, asSteward);
      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Image not found or not authorized to delete' });
      }
      return { success: true };
    }),

  // Set an image as the campaign cover
  setCoverImage: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      imageId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      await assertCampaignSteward(ctx.user, campaign, 'Not authorized');
      await db.setCampaignCoverImage(input.campaignId, input.imageId);
      return { success: true };
    }),
});

export const crowdPoolingProjectsRouter = router({
  // Get all active projects (public, cached 2 min)
  list: publicProcedure.query(async () => {
    const CACHE_KEY = 'crowdpooling:active';
    const cached = await cacheGet<CrowdPoolingProject[]>(CACHE_KEY);
    if (cached) return cached;
    const result = await db.getActiveCrowdPoolingProjects();
    await cacheSet(CACHE_KEY, result, 120);
    return result;
  }),

  // Get all projects including inactive (admin only)
  listAll: adminProcedure.query(async () => {
    return db.getAllCrowdPoolingProjects();
  }),

  // Get project by ID (public)
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCrowdPoolingProjectById(input.id);
    }),

  // Create new project (admin only)
  create: adminProcedure
    .input(z.object({
      projectName: z.string(),
      projectDescription: z.string(),
      location: z.string().optional(),
      targetAmount: z.number(),
      targetCurrency: z.string(),
      currentAmount: z.number().default(0),
      contributorCount: z.number().default(0),
      status: z.enum(["upcoming", "active", "completed", "paused"]).default("active"),
      projectImageUrl: z.string().optional(),
      projectUrl: z.string().optional(),
      applicationId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const projectId = await db.createCrowdPoolingProject({
        ...input,
        isVisible: 1,
      });
      return { id: projectId, success: true };
    }),

  // Update project (admin only)
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      projectName: z.string().optional(),
      projectDescription: z.string().optional(),
      location: z.string().optional(),
      targetAmount: z.number().optional(),
      targetCurrency: z.string().optional(),
      currentAmount: z.number().optional(),
      contributorCount: z.number().optional(),
      status: z.enum(["upcoming", "active", "completed", "paused"]).optional(),
      projectImageUrl: z.string().optional(),
      projectUrl: z.string().optional(),
      isVisible: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCrowdPoolingProject(id, data);
      return { success: true };
    }),

  // Delete project (admin only - soft delete)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCrowdPoolingProject(input.id);
      return { success: true };
    }),
});

export const crowdPoolingProposalsRouter = router({
  // Submit a proposal to a project (public - no login required)
  submit: publicProcedure
    .input(z.object({
      projectId: z.number(),
      contributorName: z.string().min(1),
      contributorEmail: z.string().email(),
      proposalData: z.string(), // JSON string with all contribution details
      totalContribution: z.number(),
      financialContribution: z.number(),
      futureValueContribution: z.number(),
      contributorNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "crowd_pooling_proposal");
      // Verify project exists
      const project = await db.getCrowdPoolingProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Create the proposal
      const proposalId = await db.createProposal({
        projectId: input.projectId,
        contributorName: input.contributorName,
        contributorEmail: input.contributorEmail,
        proposalData: input.proposalData,
        totalContribution: input.totalContribution,
        financialContribution: input.financialContribution,
        futureValueContribution: input.futureValueContribution,
        contributorNotes: input.contributorNotes || null,
      });

      // Notify owner of new proposal (respects notification preferences)
      try {
        await notifyIfEnabled("campaignContributions", {
          title: `New Proposal for ${project.projectName}`,
          content: `${input.contributorName} submitted a proposal worth $${input.totalContribution.toLocaleString()} (Financial: $${input.financialContribution.toLocaleString()}, Future Value: $${input.futureValueContribution.toLocaleString()})`,
        });
      } catch (e) {
        console.warn('Failed to send proposal notification:', e);
      }

      return { success: true, proposalId };
    }),

  // Get proposals for a project (public - shows stats only)
  getProjectStats: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return db.getProjectProposalStats(input.projectId);
    }),

  // Get all proposals for a project (admin only)
  getByProject: adminProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return db.getProposalsByProject(input.projectId);
    }),

  // Update proposal status (admin only)
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "accepted", "rejected", "withdrawn"]),
      reviewNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateProposalStatus(input.id, input.status, input.reviewNotes);
      return { success: true };
    }),
});

export const savedContributionsRouter = router({
  // Get all saved contributions for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.getSavedContributionsByUser(ctx.user.id);
  }),

  // Get a specific saved contribution
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const contribution = await db.getSavedContributionById(input.id, ctx.user.id);
      if (!contribution) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saved contribution not found" });
      }
      return contribution;
    }),

  // Get the user's default contribution form
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    return await db.getDefaultSavedContribution(ctx.user.id);
  }),

  // Save a new contribution form
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      isDefault: z.boolean().optional(),
      projectName: z.string().optional(),
      targetAmount: z.number().optional(),
      currency: z.string().optional(),
      contributorName: z.string().optional(),
      contributorEmail: z.string().email().optional().or(z.literal("")),
      immediateContributions: z.string(), // JSON string
      futureContributions: z.string(), // JSON string
      totalImmediateValue: z.number().optional(),
      totalFutureValue: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createSavedContribution({
        userId: ctx.user.id,
        name: input.name,
        isDefault: input.isDefault || false,
        projectName: input.projectName || null,
        targetAmount: input.targetAmount || null,
        currency: input.currency || "USD",
        contributorName: input.contributorName || null,
        contributorEmail: input.contributorEmail || null,
        immediateContributions: input.immediateContributions,
        futureContributions: input.futureContributions,
        totalImmediateValue: input.totalImmediateValue || 0,
        totalFutureValue: input.totalFutureValue || 0,
      });
      return { id, success: true };
    }),

  // Update an existing saved contribution
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      isDefault: z.boolean().optional(),
      projectName: z.string().optional(),
      targetAmount: z.number().optional(),
      currency: z.string().optional(),
      contributorName: z.string().optional(),
      contributorEmail: z.string().email().optional().or(z.literal("")),
      immediateContributions: z.string().optional(),
      futureContributions: z.string().optional(),
      totalImmediateValue: z.number().optional(),
      totalFutureValue: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateSavedContribution(id, ctx.user.id, data);
      return { success: true };
    }),

  // Delete a saved contribution
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteSavedContribution(input.id, ctx.user.id);
      return { success: true };
    }),

  // Set a contribution as the default
  setDefault: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.setDefaultSavedContribution(input.id, ctx.user.id);
      return { success: true };
    }),
});
