// server/routes/campaigns.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  campaigns as campaignsTable,
  campaignItems as campaignItemsTable,
  campaignContributions as campaignContributionsTable,
  userFollows,
  applications as applicationsTable,
  CrowdPoolingProject,
} from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { canSeeFullRecord, isAdminUser, pickPublic } from "../lib/public-projection";
import type { TrpcContext } from "../_core/context";
import type { Campaign } from "../../drizzle/schema";
import { sanitizeInput, sanitizeRichText } from "../_core/security";
import { designCompanionTurn } from "../lib/crowdpool-coach";
import { getGameVariable, recordScoreEvent, logActivityEvent } from "../game";
import { notifyIfEnabled } from "../notify-with-prefs";
import { generateImage } from "../_core/imageGeneration";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import { cacheGet, cacheSet, cacheDel } from "../cache";

/**
 * Statuses a campaign is not published in. A draft is a project still
 * writing its pitch; pending_review and rejected are the review queue.
 * None of the three is the creator's public statement.
 */
const UNPUBLISHED_CAMPAIGN_STATUSES: ReadonlyArray<string> = ["draft", "pending_review", "rejected"];

/** The creator, admins, and anyone at all once it is published. */
export function canSeeCampaign(user: TrpcContext["user"] | undefined, campaign: Campaign): boolean {
  if (!UNPUBLISHED_CAMPAIGN_STATUSES.includes(campaign.status)) return true;
  return canSeeFullRecord(user, campaign.userId);
}

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

/** Admins keep the review trail; everyone else gets the projection. */
export function toPublicCampaign(campaign: Campaign, user: TrpcContext["user"] | undefined) {
  return isAdminUser(user) ? campaign : pickPublic(campaign, PUBLIC_CAMPAIGN_FIELDS);
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

/**
 * Fallback capital mapping for freeform contributions (no need attached).
 * When the contribution fills a need, the need's capitalType wins.
 */
const CONTRIBUTION_TYPE_TO_CAPITAL = {
  land: 'living',
  equipment: 'material',
  role: 'experiential',
  resource: 'material',
  financial: 'financial',
  knowledge: 'intellectual',
} as const;

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
        CONTRIBUTION_TYPE_TO_CAPITAL[c.contributionType as keyof typeof CONTRIBUTION_TYPE_TO_CAPITAL] ??
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

export const campaignsRouter = router({
  // Verify campaign creator access password (server-side)
  verifyCampaignAccess: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      const expected = process.env.CAMPAIGN_ACCESS_PASSWORD || "222";
      return { valid: input.password === expected };
    }),

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
      const rows = allowed.map((c) => {
        const images = imagesMap[c.id] ?? [];
        const coverImage = images.find(img => img.isCover === 1) || images[0] || null;
        return { ...toPublicCampaign(c, ctx.user), coverImage, imageCount: images.length };
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
      // readable by anyone counting upwards.
      if (!canSeeCampaign(ctx.user, campaign)) return null;

      // Get campaign items and images
      const items = await db.getCampaignItems(input.id);
      const images = await db.getCampaignImages(input.id);
      const coverImage = images.find(img => img.isCover === 1) || images[0] || null;

      // Distinct contributor emails across accepted/fulfilled/thanked.
      const contributorsCount = await db.getCampaignContributorsCount(input.id);

      // Whether the signed-in viewer follows this campaign (false for guests).
      let isFollowing = false;
      if (ctx.user) {
        const db2 = await getDb();
        if (db2) {
          const follow = await db2.select({ id: userFollows.id })
            .from(userFollows)
            .where(and(
              eq(userFollows.userId, ctx.user.id),
              eq(userFollows.targetType, 'campaign'),
              eq(userFollows.targetId, String(input.id)),
            ))
            .limit(1);
          isFollowing = follow.length > 0;
        }
      }

      return {
        ...toPublicCampaign(campaign, ctx.user),
        items,
        images,
        coverImage,
        contributorsCount,
        isFollowing,
      };
    }),

  // Get campaign items for a campaign
  getItems: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      return await db.getCampaignItems(input.campaignId);
    }),

  // Read-only recommended-funder links (Ma Earth / GoSteward / grants) for a
  // campaign. Money never touches us: these are display CTAs with nightly-cached
  // numbers, contributors finish on the funder's own site. No PII.
  getPartnerLinks: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db2 = await getDb();
      if (!db2) return [];
      const { campaignPartnerLinks } = await import("../../drizzle/schema");
      return await db2
        .select()
        .from(campaignPartnerLinks)
        .where(eq(campaignPartnerLinks.campaignId, input.campaignId));
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
        hoursPerWeek: z.number().optional(),
        durationMonths: z.number().optional(),
        roleDescription: z.string().optional(),
        // Resource fields
        resourceName: z.string().optional(),
        resourceQuantity: z.number().optional(),
        resourceUnit: z.string().optional(),
        resourceDescription: z.string().optional(),
        // Common
        estimatedValue: z.number().min(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaignId = await db.createCampaign(ctx.user.id, input);
      // Fire-and-forget image generation, don't block mutation response
      generateImage({
        contentType: "campaign",
        contentId: campaignId,
        contextText: `${input.title}. ${(input.description ?? "").slice(0, 200)}`,
      }).then(({ url }) =>
        getDb().then(d => d?.update(campaignsTable).set({ generatedImageUrl: url }).where(eq(campaignsTable.id, campaignId)))
      ).catch(err => console.error(`Image gen failed for campaign ${campaignId}:`, err));
      return { id: campaignId, success: true };
    }),

  // Get contributions for a campaign — public view strips PII.
  // Use getContributionsForOwner for management views that need full details.
  getContributions: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'fulfilled', 'thanked']).optional(),
    }))
    .query(async ({ input }) => {
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
      // Strip PII before returning to anonymous callers, and mask names on
      // contributions marked anonymous (steward still sees them via the owner view).
      return rows.map(({ contributorEmail: _e, contributorPhone: _p, contributorBio: _b, contributorNotes: _n, ...safe }) => ({
        ...safe,
        contributorName: safe.isAnonymous ? 'A contributor' : safe.contributorName,
      }));
    }),

  // Get contributions with full PII — campaign owner or admin only.
  getContributionsForOwner: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn', 'fulfilled']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const camp = await db2.select({ userId: campaignsTable.userId }).from(campaignsTable).where(eq(campaignsTable.id, input.campaignId)).limit(1);
      if (!camp[0] || (camp[0].userId !== ctx.user.id && ctx.user.role !== 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not the campaign owner' });
      }
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
      quantityPledged: z.number().int().min(1).default(1),
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
      hoursPerWeek: z.number().optional(),
      durationMonths: z.number().optional(),
      skills: z.array(z.string()).optional(),
      // Resource-specific
      resourceName: z.string().optional(),
      resourceQuantity: z.number().optional(),
      resourceUnit: z.string().optional(),
      // Financial-specific
      financialAmount: z.number().optional(),
      financialCurrency: z.string().optional(),
      paymentMethod: z.string().optional(),
      // Common
      estimatedValue: z.number().min(0),
      contributorNotes: z.string().optional(),
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

      // Claim against a specific need: guard the slot count and stamp the
      // claim expiry window from the crowdpool.claim_expiry_days_* variables.
      let claimExpiresAt: Date | null = null;
      if (input.campaignItemId) {
        const item = await db.getCampaignItemById(input.campaignItemId);
        if (!item || item.campaignId !== input.campaignId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'That need does not belong to this campaign' });
        }
        if (item.quantityClaimed + input.quantityPledged > item.quantityWanted) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This need is already fully claimed' });
        }
        const expiryDays = await claimExpiryDaysForKind(item.kind);
        claimExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      }

      const contributionId = await db.createContribution({
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
        hoursPerWeek: input.hoursPerWeek,
        durationMonths: input.durationMonths,
        skills: input.skills ? JSON.stringify(input.skills) : null,
        resourceName: input.resourceName ? sanitizeInput(input.resourceName) : null,
        resourceQuantity: input.resourceQuantity,
        resourceUnit: input.resourceUnit,
        financialAmount: input.financialAmount,
        financialCurrency: input.financialCurrency || 'USD',
        paymentMethod: input.paymentMethod,
        estimatedValue: input.estimatedValue,
        contributorNotes: input.contributorNotes ? sanitizeInput(input.contributorNotes) : null,
        quantityPledged: input.quantityPledged,
        claimExpiresAt,
        isAnonymous: input.isAnonymous ? 1 : 0,
        referredBy: input.referredBy,
        status: 'pending',
      });

      // Notify campaign owner (respects notification preferences)
      try {
        await notifyIfEnabled("campaignContributions", {
          title: `New Contribution: ${input.title}`,
          content: `A new ${input.contributionType} contribution has been submitted to campaign "${campaign.title}".\n\n**Contributor:** ${input.contributorName}\n**Type:** ${input.contributionType}\n**Value:** $${input.estimatedValue.toLocaleString()}\n\nReview it in the campaign dashboard.`,
        });
      } catch (e) {
        console.warn('Failed to send contribution notification:', e);
      }

      return { id: contributionId, success: true };
    }),

  // Update contribution status (campaign owner only)
  updateContributionStatus: protectedProcedure
    .input(z.object({
      contributionId: z.number(),
      status: z.enum(['accepted', 'rejected', 'fulfilled', 'thanked']),
      ownerNotes: z.string().optional(),
      acknowledgedNote: z.string().optional(),
      acknowledgedImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contribution = await db.getContributionById(input.contributionId);
      if (!contribution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contribution not found' });
      }

      // Verify user owns the campaign
      const campaign = await db.getCampaignById(contribution.campaignId);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to manage this campaign' });
      }

      const prevStatus = contribution.status;

      if (input.status === 'accepted' || input.status === 'rejected') {
        await db.updateContributionStatus(input.contributionId, input.status, input.ownerNotes);

        // Accepting a claim reserves its slots on the need (ghost progress).
        // Guarded on the transition so a repeated call cannot double-reserve.
        if (input.status === 'accepted' && contribution.campaignItemId && prevStatus !== 'accepted') {
          const db2 = await getDb();
          if (db2) {
            await db2.update(campaignItemsTable)
              .set({ quantityClaimed: sql`${campaignItemsTable.quantityClaimed} + ${contribution.quantityPledged}` })
              .where(eq(campaignItemsTable.id, contribution.campaignItemId));
          }
        }

        // Update campaign pledged totals
        await db.updateCampaignPledgedTotals(contribution.campaignId);
      }

      // Fulfilled is the payoff moment. Idempotent: the whole payoff block is
      // skipped when fulfilledAt is already set, so a repeated call is a no-op.
      let firstFulfillment = false;
      if (input.status === 'fulfilled') {
        // Claims must be accepted first; legacy freeform contributions (no
        // need attached) may go straight from pending.
        const allowedFrom: string[] = contribution.campaignItemId
          ? ['accepted', 'fulfilled']
          : ['pending', 'accepted', 'fulfilled'];
        if (!allowedFrom.includes(prevStatus)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only accepted contributions can be marked fulfilled' });
        }

        firstFulfillment = !contribution.fulfilledAt;
        if (firstFulfillment) {
          await db.updateContribution(input.contributionId, {
            status: 'fulfilled',
            fulfilledAt: new Date(),
            ...(input.ownerNotes !== undefined ? { ownerNotes: input.ownerNotes } : {}),
          });

          // Delivery confirms the slots (solid progress on the need).
          if (contribution.campaignItemId) {
            const db2 = await getDb();
            if (db2) {
              await db2.update(campaignItemsTable)
                .set({ quantityDelivered: sql`${campaignItemsTable.quantityDelivered} + ${contribution.quantityPledged}` })
                .where(eq(campaignItemsTable.id, contribution.campaignItemId));
            }
          }

          // Payoff for account holders: score event + Living Tree row.
          // NEVER a token credit here (locked decision: no platform tokens
          // for crowdpooling).
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
                const need = contribution.campaignItemId
                  ? await db.getCampaignItemById(contribution.campaignItemId)
                  : null;
                const capitalType = need?.capitalType ?? CONTRIBUTION_TYPE_TO_CAPITAL[contribution.contributionType];
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
                await db.updateContribution(input.contributionId, { playerContributionId });
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
      }

      // Recompute after the payoff too. The totals used to refresh only in the
      // accepted/rejected branch, so a status change here left the stored number
      // stale until some unrelated accept happened to trigger a recompute. That
      // made the correction land late and detached from its cause, which is the
      // half of this defect that made it hard to attribute.
      if (input.status === 'fulfilled' && firstFulfillment) {
        await db.updateCampaignPledgedTotals(contribution.campaignId);
      }

      // Thanked closes the loop: a note is required, a photo is optional.
      if (input.status === 'thanked') {
        if (prevStatus !== 'fulfilled') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only fulfilled contributions can be thanked' });
        }
        const note = input.acknowledgedNote ? sanitizeInput(input.acknowledgedNote).trim() : '';
        if (!note) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A thank-you note is required' });
        }
        await db.updateContribution(input.contributionId, {
          status: 'thanked',
          acknowledgedAt: new Date(),
          acknowledgedNote: note,
          acknowledgedImageUrl: input.acknowledgedImageUrl,
        });
      }

      // Send email notification to contributor (accepted / rejected /
      // fulfilled; thanks stays in-app). A repeated fulfilled call sends
      // nothing.
      const sendsEmail = input.status === 'accepted' || input.status === 'rejected'
        || (input.status === 'fulfilled' && firstFulfillment);
      if (sendsEmail) {
        try {
          const { sendEmail, emailTemplates } = await import("../_core/email");
          const template = input.status === 'accepted'
            ? emailTemplates.contributionAccepted
            : input.status === 'rejected'
              ? emailTemplates.contributionRejected
              : emailTemplates.contributionFulfilled;
          const emailContent = template(
            contribution.contributorName,
            contribution.title,
            campaign.title,
            input.ownerNotes
          );

          await sendEmail({
            to: contribution.contributorEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            template: `contribution_${input.status}`,
            recipientName: contribution.contributorName,
          });
        } catch (emailError) {
          console.warn('[Contribution] Failed to send status notification email:', emailError);
          // Don't fail the mutation if email fails
        }
      }

      // Create in-app notification for the contributor if they have an account
      const sendsNotification = input.status !== 'fulfilled' || firstFulfillment;
      if (contribution.userId && sendsNotification) {
        try {
          const notificationType = input.status === 'accepted'
            ? 'contribution_accepted'
            : input.status === 'rejected'
              ? 'contribution_rejected'
              : input.status === 'thanked'
                ? 'gratitude'
                : 'system';

          const notificationTitle = input.status === 'accepted'
            ? `Contribution Accepted!`
            : input.status === 'rejected'
              ? `Contribution Update`
              : input.status === 'thanked'
                ? `A Thank You From ${campaign.projectName}`
                : `Contribution Fulfilled`;

          const notificationMessage = input.status === 'accepted'
            ? `Your contribution "${contribution.title}" to ${campaign.title} has been accepted! ${input.ownerNotes ? `Note: ${input.ownerNotes}` : ''}`
            : input.status === 'rejected'
              ? `Your contribution "${contribution.title}" to ${campaign.title} was not accepted. ${input.ownerNotes ? `Reason: ${input.ownerNotes}` : 'Please contact the campaign owner for more details.'}`
              : input.status === 'thanked'
                ? `The stewards of ${campaign.title} sent you thanks for "${contribution.title}".`
                : `Your contribution "${contribution.title}" to ${campaign.title} has been marked as fulfilled. Thank you for your support!`;

          await db.createUserNotification({
            userId: contribution.userId,
            type: notificationType as any,
            title: notificationTitle,
            message: notificationMessage,
            campaignId: contribution.campaignId,
            contributionId: contribution.id,
          });
          if (!process.env.VITEST) console.log(`[Notification] In-app notification created for user ${contribution.userId}`);
        } catch (notifError) {
          console.warn('[Notification] Failed to create in-app notification:', notifError);
        }
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

      await db.updateContributionStatus(input.contributionId, 'withdrawn');
      return { success: true };
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
      const isSteward = campaign.userId === ctx.user.id;
      const isContributor = contribution.userId != null && contribution.userId === ctx.user.id;
      if (!isSteward && !isContributor && ctx.user.role !== 'admin') {
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

  // Update campaign status (owner only)
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'pending_review', 'active', 'funded', 'completed', 'cancelled', 'rejected']),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.id);
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to update this campaign' });
      }
      await db.updateCampaignStatus(input.id, input.status);

      const db2 = await getDb();

      // Going live stamps the clocks the progress tracker counts from.
      if (input.status === 'active' && !campaign.startedAt && db2) {
        const now = new Date();
        await db2.update(campaignsTable)
          .set({ startedAt: now, publishedAt: now })
          .where(eq(campaignsTable.id, input.id));
      }

      // A funded or completed campaign counts toward the land project's
      // status progression. Guarded on the transition so flipping between
      // funded and completed cannot double-count.
      const fundedStatuses = ['funded', 'completed'];
      if (
        fundedStatuses.includes(input.status)
        && !fundedStatuses.includes(campaign.status)
        && campaign.applicationId
        && db2
      ) {
        await db2.update(applicationsTable)
          .set({ fundedCampaignCount: sql`COALESCE(${applicationsTable.fundedCampaignCount}, 0) + 1` })
          .where(eq(applicationsTable.id, campaign.applicationId));
      }

      return { success: true };
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
      if (!campaign) {
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

  // Follow a campaign with an account. Idempotent.
  follow: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) {
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
      if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to post updates for this campaign' });
      }

      const title = sanitizeInput(input.title);
      const { id, updateNumber } = await db.createCampaignUpdate({
        campaignId: input.campaignId,
        authorId: ctx.user.id,
        title,
        body: sanitizeRichText(input.body),
        imageUrls: input.imageUrls,
      });

      // Fan out to account-holder followers. Best-effort: a notification
      // failure never blocks publishing.
      try {
        const followerIds = await db.getCampaignFollowerUserIds(input.campaignId);
        for (const userId of followerIds) {
          if (userId === ctx.user.id) continue;
          await db.createUserNotification({
            userId,
            type: 'campaign_update',
            title: `Update #${updateNumber} from ${campaign.title}`,
            message: title,
            campaignId: input.campaignId,
            link: `/campaign/${input.campaignId}`,
          });
        }
      } catch (notifError) {
        console.warn('[Campaign] Update fan-out failed:', notifError);
      }

      return { id, updateNumber };
    }),

  // Public updates journal, newest first.
  listUpdates: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      return await db.listCampaignUpdates(input.campaignId);
    }),

  // The Pool Ledger: what has moved through this campaign, PII stripped.
  getActivity: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      limit: z.number().int().min(1).max(100).default(30),
    }))
    .query(async ({ input }) => {
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
      if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to view analytics' });
      }

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
      if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to upload images to this campaign' });
      }

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
    .query(async ({ input }) => {
      return await db.getCampaignImages(input.campaignId);
    }),

  // Delete a campaign image
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db.deleteCampaignImage(input.imageId, ctx.user.id);
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
      if (campaign.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }
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
