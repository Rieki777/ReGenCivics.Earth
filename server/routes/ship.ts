/**
 * ship router - The ReGen Ship (CORE program).
 *
 * A regenerative pirate ship + the ReGen Fleet. Bookings (our calendar is the
 * source of truth; the insured rental is a separate legal charge), the treasure
 * map, the AI concierge, the Free Passage Quest, seed plantings, the public
 * voyage log, the digital passport, and live position pings.
 *
 * Security posture (BUILD-PLAYBOOK + AI-AUTOMATION-RISKS):
 *  - Every public procedure: zod validation, length caps, checkRateLimit,
 *    sanitizeInput on free text.
 *  - Concierge treats guest text as untrusted data (see ship-concierge.ts) and
 *    validates every location id the model returns against the DB.
 *  - Token writes touch the private ledger only via creditPrivateTokens
 *    (STEERING section 5), source tag ship_quest / ship_referral.
 *  - Offering donations reuse churchDonations with a program tag so ship
 *    revenue is segmentable. This router never moves money.
 */
import { z } from "zod";
import { and, or, eq, desc, asc, inArray, notInArray, sql, gte, isNull, isNotNull, like } from "drizzle-orm";
import { CREW_ONLY_SOURCES, isLocationVisible } from "@shared/shipVisibility";
import { DEMO_ACCOUNT_OPENID_PREFIX } from "@shared/shipDemo";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  shipLocations, shipLocationFlags, shipBookings, shipBlackoutDates, shipPricingWindows,
  shipQuestActions, shipQuestCompletions, shipNominations, shipKeeperApplications,
  shipFleetApplications, shipWinterHostApplications, shipConciergeSessions,
  shipSeedPlantings, shipLogEntries, shipPassportStamps, shipPositionPings,
  shipDatasetOffers, shipInventoryItems, shipKnowledgeChunks, shipMaintenanceCases,
  shipCrewListSignups, shipGearChecks,
  shipCrewProfiles, shipGiveawayDrawings, churchDonations,
  galleyHauls, galleyHaulItems, galleyRemixes,
  users, questCompletions, applications,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import { checkRateLimit } from "../rate-limit";
import { sanitizeInput } from "../_core/security";
import { notifyOwner } from "../_core/notification";
import { creditPrivateTokens } from "../db/tokens";
import {
  isValidVoyageLength, nightsBetween, overlapsAny, computeVoyagePrice, voyageNightsFromAnswers,
  computeQuestStandings, countEntered, freeVoyagesUnlocked, percentBooked,
  weightedDraw, sponsorshipProgress, enumerateVoyageWeeks,
  type QuestCompletionRow, type DrawEntry,
} from "../lib/ship-logic";
import {
  MIN_GUESTS, MAX_GUESTS, MAX_GUESTS_WITH_KIDS, isValidCrewSize, SHIP_QUEST_SOURCE, shipFeatureFlags, isConciergeConfigured,
  MAX_FREE_VOYAGES, MAIDEN_YEAR_VOYAGE_TARGET,
  SHIP_SEASON_START_YMD, SHIP_YEAR2_START_YMD, YEAR2_PRICE_MULTIPLIER, SHIP_BOOKING_HORIZON_WEEKS, SHIP_SEASONAL_BANDS,
  SHIP_ENTRY_THRESHOLD_POINTS, NOMINATION_TICKETS, CREW_SPONSOR_GOAL_CENTS, CREW_SPONSOR_PROGRAM_TAG,
  SEEDS_PLANTED_BASELINE, VOYAGES_SAILED_BASELINE,
} from "../lib/ship-config";
import { askShipwright, detectEscalation, type ShipSystem } from "../lib/ship-shipwright";
import { buildToolContext, locationOf, type InventoryRow } from "../lib/ship-inventory-context";
import { remixHaul, rollRemix, type HaulItemInput } from "../lib/galley-remix";
import { askShipCook } from "../lib/ship-cook";
import type { GalleyTrack } from "../../shared/galleyCards";
import { generateItinerary, conciergeReply, type ConciergeLocation } from "../lib/ship-concierge";
import type { Itinerary } from "../lib/ship-logic";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import {
  emailBookingReceived, emailBookingApproved, emailBookingConfirmed,
  emailQuestActionVerified, emailQuestWinner, emailApplicationReceived, emailNominationReceived,
  emailDatasetOfferReceived,
  emailEnteredTheDraw, emailCrewProfileInvite,
} from "../lib/ship-emails";

const YMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

async function db() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  return d;
}

// The proof type for the referral action (auto-verifies when an application is
// shortlisted). Kept as a constant so the seed script and router agree.
export const REFERRAL_PROOF = "referral_shortlisted" as const;

// Statuses that hold the calendar (a requested booking does not block; an
// approved-or-later one does).
const BLOCKING_STATUSES = ["approved", "platform_pending", "confirmed", "active"] as const;

// Haversine distance in meters, for the passport GPS proximity check.
function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const PASSPORT_PROXIMITY_M = 2_000; // within 2km of the pin counts as a visit

// Keep only our own R2 asset URLs. An arbitrary URL would let a guest feed a
// vision model attacker-controlled pictures hosted anywhere (AI-AUTOMATION-RISKS).
// Uploads land on the R2 asset domain, so that host is the allow-list.
function assetPhotoUrls(urls: string[] | undefined, cap = 4): string[] {
  return (urls ?? []).filter((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "https:" && parsed.hostname === ASSET_HOST;
    } catch {
      return false;
    }
  }).slice(0, cap);
}

// The public host our R2 uploads are served from. Photos handed to the
// Shipwright's vision must live here (see the shipwright.ask allow-list).
const ASSET_HOST = (() => {
  try {
    return new URL(process.env.STORAGE_PUBLIC_URL ?? "https://assets.regencivics.earth").hostname;
  } catch {
    return "assets.regencivics.earth";
  }
})();

// ── Concierge session capability ──────────────────────────────────────────────
// Session ids are sequential ints, so the id alone must not grant access to a
// session's answers and chat (they hold personal detail: who the crew is, diet,
// kids). `start` mints a signed token; every later call needs the token, or a
// signed-in user whose id matches the session's owner. Wrong or missing proof
// reads as NOT_FOUND so ids cannot be probed.
async function mintConciergeToken(sessionId: number): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ sid: sessionId, purpose: "ship-concierge" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
}

async function assertConciergeAccess(
  session: { id: number; userId: number | null },
  token: string | undefined,
  userId: number | undefined,
): Promise<void> {
  if (session.userId != null && userId != null && session.userId === userId) return;
  if (token) {
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(token, secret);
      if (payload.purpose === "ship-concierge" && Number(payload.sid) === session.id) return;
    } catch {
      /* invalid or expired token falls through to NOT_FOUND */
    }
  }
  throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
}

// ── Quest standings helper (verified completions -> standings) ────────────────
// Entry is a points threshold now, not a checklist: a crew with at least
// SHIP_ENTRY_THRESHOLD_POINTS verified points is in every draw, tickets equal to
// its points. No single action is required.
async function loadQuestStandings() {
  const d = await db();
  const actions = await d.select().from(shipQuestActions);
  const pointsById = new Map(actions.map((a) => [a.id, a.points]));
  const completions = await d
    .select()
    .from(shipQuestCompletions)
    .where(eq(shipQuestCompletions.status, "verified"));
  const rows: QuestCompletionRow[] = completions.map((c) => ({
    userId: c.userId,
    actionId: c.actionId,
    status: c.status,
    verifiedAt: c.verifiedAt,
    points: pointsById.get(c.actionId) ?? 0,
  }));
  return { standings: computeQuestStandings(rows, SHIP_ENTRY_THRESHOLD_POINTS), actions };
}

// ── Free-voyage giveaway status (booking-volume driven) ───────────────────────
// One free voyage is drawn at launch (the first draw). The rest release at
// 40/60/75/85/95% of the first year booked, up to six. Each is drawn at random
// from everyone in the draw.
async function loadFreeVoyageStatus() {
  const d = await db();
  const booked = await d
    .select({ id: shipBookings.id })
    .from(shipBookings)
    .where(inArray(shipBookings.status, ["confirmed", "active", "completed"]));
  const bookedVoyages = booked.length;
  const percent = percentBooked(bookedVoyages, MAIDEN_YEAR_VOYAGE_TARGET);
  const unlocked = freeVoyagesUnlocked(percent);
  const { standings } = await loadQuestStandings();
  return {
    bookedVoyages,
    target: MAIDEN_YEAR_VOYAGE_TARGET,
    percentBooked: percent,
    freeVoyagesUnlocked: unlocked,
    freeVoyagesTotal: MAX_FREE_VOYAGES,
    poolSize: countEntered(standings),
    entryThreshold: SHIP_ENTRY_THRESHOLD_POINTS,
  };
}

// A user's total verified quest points (used to detect a threshold crossing).
async function verifiedPointsForUser(userId: number): Promise<number> {
  const d = await db();
  const [row] = await d
    .select({ total: sql<number>`COALESCE(SUM(${shipQuestActions.points}), 0)` })
    .from(shipQuestCompletions)
    .innerJoin(shipQuestActions, eq(shipQuestActions.id, shipQuestCompletions.actionId))
    .where(and(eq(shipQuestCompletions.userId, userId), eq(shipQuestCompletions.status, "verified")));
  return Number(row?.total ?? 0);
}

// Credit the ReGen reward + notify when a completion is verified. When this
// verification is the one that carries the crew across the entry threshold, send
// the "you are in the draw, make your crew profile" email exactly once.
async function rewardVerifiedCompletion(completionId: number) {
  const d = await db();
  const [c] = await d.select().from(shipQuestCompletions).where(eq(shipQuestCompletions.id, completionId)).limit(1);
  if (!c || c.status !== "verified") return;
  const [action] = await d.select().from(shipQuestActions).where(eq(shipQuestActions.id, c.actionId)).limit(1);
  if (!action) return;
  await creditPrivateTokens({
    userId: c.userId,
    tokenType: "regen",
    amount: action.points,
    source: SHIP_QUEST_SOURCE,
    sourceId: c.id,
    description: `ReGen Ship quest: ${action.title}`,
    idempotencyKey: `ship_quest:${c.id}`,
  });
  const [u] = await d.select().from(users).where(eq(users.id, c.userId)).limit(1);
  if (u?.email) await emailQuestActionVerified(u.email, action.title, action.points);

  // Threshold crossing: after includes this action, before excludes it.
  const after = await verifiedPointsForUser(c.userId);
  const before = after - (action.points || 0);
  if (before < SHIP_ENTRY_THRESHOLD_POINTS && after >= SHIP_ENTRY_THRESHOLD_POINTS && u?.email) {
    await emailEnteredTheDraw(u.email);
  }
}

// ── Galley helpers ────────────────────────────────────────────────────────────
type ShipDb = Awaited<ReturnType<typeof db>>;

// The user's active (confirmed or sailing) voyage, so a haul links to it.
async function activeVoyageBookingId(userId: number): Promise<number | null> {
  const d = await db();
  const [active] = await d
    .select({ id: shipBookings.id })
    .from(shipBookings)
    .where(and(eq(shipBookings.userId, userId), inArray(shipBookings.status, ["confirmed", "active"])))
    .orderBy(asc(shipBookings.startDate))
    .limit(1);
  return active?.id ?? null;
}

// A haul must exist and belong to this crew member (ids are sequential ints).
// A miss reads as NOT_FOUND so ids cannot be probed.
async function assertHaulOwner(d: ShipDb, haulId: number, userId: number) {
  const [haul] = await d.select().from(galleyHauls).where(eq(galleyHauls.id, haulId)).limit(1);
  if (!haul || haul.userId !== userId) throw new TRPCError({ code: "NOT_FOUND", message: "Haul not found." });
  return haul;
}

// Auto-verify a Galley quest action (logging a haul, trying the Deeper Reset) and
// credit the ReGen reward, once. No-ops when the action is not seeded yet, so it
// is always safe to call. A nudge into the Free Passage Quest, never a gate.
async function awardGalleyQuest(userId: number, slug: string, note: string): Promise<void> {
  const d = await db();
  const [action] = await d.select().from(shipQuestActions).where(eq(shipQuestActions.slug, slug)).limit(1);
  if (!action) return;
  const [existing] = await d
    .select()
    .from(shipQuestCompletions)
    .where(and(eq(shipQuestCompletions.userId, userId), eq(shipQuestCompletions.actionId, action.id)))
    .limit(1);
  if (existing?.status === "verified") return;
  let cid: number | undefined;
  if (existing) {
    await d.update(shipQuestCompletions).set({ status: "verified", verifiedAt: new Date() }).where(eq(shipQuestCompletions.id, existing.id));
    cid = existing.id;
  } else {
    const [res] = await d.insert(shipQuestCompletions).values({ userId, actionId: action.id, status: "verified", verifiedAt: new Date(), note });
    cid = (res as { insertId?: number }).insertId;
  }
  if (cid) await rewardVerifiedCompletion(cid);
}

/**
 * Item 16: award a Free Passage Quest action when a player posts in its forum
 * thread. Auto actions verify and credit immediately; crew actions record a
 * pending completion for the reviewer to approve. Honors the action's submission
 * cap (counting the player's non-rejected completions). No-ops when the post is
 * not a quest thread, so forum.createReply can call it for every reply.
 */
export async function awardQuestFromForumReply(userId: number, postId: number, replyId: number): Promise<void> {
  const d = await db();
  const [action] = await d.select().from(shipQuestActions).where(eq(shipQuestActions.forumPostId, postId)).limit(1);
  if (!action) return; // Not a quest thread.
  const [countRow] = await d
    .select({ n: sql<number>`COUNT(*)` })
    .from(shipQuestCompletions)
    .where(and(
      eq(shipQuestCompletions.userId, userId),
      eq(shipQuestCompletions.actionId, action.id),
      sql`${shipQuestCompletions.status} <> 'rejected'`,
    ));
  if (Number(countRow?.n ?? 0) >= action.maxSubmissions) return; // At the cap.
  const status = action.verificationType === "auto" ? ("verified" as const) : ("pending" as const);
  const [res] = await d.insert(shipQuestCompletions).values({
    userId,
    actionId: action.id,
    proofUrl: `/community/${postId}`,
    note: `Posted in the quest thread (reply #${replyId}).`,
    status,
    verifiedAt: status === "verified" ? new Date() : null,
  });
  const cid = (res as { insertId?: number }).insertId;
  if (status === "verified" && cid) await rewardVerifiedCompletion(cid);
}

export const shipRouter = router({
  // What is live (concierge, offering/gift forms, platform listing, tracker).
  featureFlags: publicProcedure.query(() => shipFeatureFlags()),

  // State of the Ship: the public trust dashboard (SHIP_V5_FLYWHEEL Section 3).
  // The collective-ownership story, live and provable. Cached client-side.
  stateOfShip: publicProcedure.query(async () => {
    const d = await db();
    const free = await loadFreeVoyageStatus();
    const [seeds] = await d
      .select({ n: sql<number>`COUNT(*)` })
      .from(shipSeedPlantings)
      .where(eq(shipSeedPlantings.isVerified, true));
    const sailed = await d
      .select({ id: shipBookings.id })
      .from(shipBookings)
      .where(eq(shipBookings.status, "completed"));
    // Admin-editable game variables (asset value, community-owned so far, trees).
    // Absent variables fall back to 0 so the tiles degrade gracefully.
    const { getGameVariables } = await import("../game");
    const vars = await getGameVariables(["ship.asset_value_usd", "ship.community_owned_usd", "ship.trees_planted", "ship.seeds_planted_base", "ship.voyages_sailed_base"]).catch(() => ({} as Record<string, number>));
    // Real-world totals from before the ledger existed, added on top of live
    // counts. Overridable at runtime via game variables (no deploy needed).
    const seedsBase = vars["ship.seeds_planted_base"] ?? SEEDS_PLANTED_BASELINE;
    const voyagesBase = vars["ship.voyages_sailed_base"] ?? VOYAGES_SAILED_BASELINE;
    const assetValue = vars["ship.asset_value_usd"] ?? 0;
    const communityOwned = vars["ship.community_owned_usd"] ?? 0;
    const communityOwnedPct = assetValue > 0 ? Math.max(0, Math.min(100, Math.round((communityOwned / assetValue) * 100))) : 0;
    return {
      percentBooked: free.percentBooked,
      bookedVoyages: free.bookedVoyages,
      target: free.target,
      freeVoyagesUnlocked: free.freeVoyagesUnlocked,
      freeVoyagesTotal: free.freeVoyagesTotal,
      poolSize: free.poolSize,
      seedsPlanted: Number(seeds?.n ?? 0) + seedsBase,
      voyagesSailed: sailed.length + voyagesBase,
      assetValueUsd: assetValue,
      communityOwnedUsd: communityOwned,
      communityOwnedPct,
      treesPlanted: vars["ship.trees_planted"] ?? 0,
    };
  }),

  // Trial-year price for a set of dates, breakdown for the two-line display.
  quote: publicProcedure
    .input(z.object({ startDate: YMD, endDate: YMD }))
    .query(({ input }) => {
      const nights = nightsBetween(input.startDate, input.endDate);
      if (!Number.isFinite(nights) || nights <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid dates." });
      }
      return computeVoyagePrice(nights);
    }),

  // ── Availability ────────────────────────────────────────────────────────────
  // Returns the enumerated voyage-week grid (the booking page's source of truth)
  // plus the raw unavailable ranges and pricing windows for compatibility.
  availability: publicProcedure.query(async () => {
    const d = await db();
    const blocking = await d
      .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate })
      .from(shipBookings)
      .where(inArray(shipBookings.status, [...BLOCKING_STATUSES]));
    const requested = await d
      .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate })
      .from(shipBookings)
      .where(eq(shipBookings.status, "requested"));
    const blackouts = await d.select().from(shipBlackoutDates);
    const pricing = await d.select().from(shipPricingWindows).orderBy(asc(shipPricingWindows.startDate));

    const today = new Date().toISOString().slice(0, 10);
    const weeks = enumerateVoyageWeeks({
      seasonStart: SHIP_SEASON_START_YMD,
      year2Start: SHIP_YEAR2_START_YMD,
      year2Multiplier: YEAR2_PRICE_MULTIPLIER,
      horizonWeeks: SHIP_BOOKING_HORIZON_WEEKS,
      today,
      booked: blocking.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
      requested: requested.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
      blackouts: blackouts.map((b) => ({ startDate: b.startDate, endDate: b.endDate, reason: b.reason })),
      pricingWindows: pricing.map((p) => ({ startDate: p.startDate, endDate: p.endDate, multiplier: p.multiplier, label: p.label })),
      bands: SHIP_SEASONAL_BANDS,
    });

    return {
      weeks,
      unavailable: [
        ...blocking.map((b) => ({ startDate: b.startDate, endDate: b.endDate, kind: "booked" as const })),
        ...blackouts.map((b) => ({ startDate: b.startDate, endDate: b.endDate, kind: "blackout" as const })),
      ],
      pricingWindows: pricing,
    };
  }),

  // ── Booking ─────────────────────────────────────────────────────────────────
  requestBooking: protectedProcedure
    .input(
      z
        .object({
          startDate: YMD,
          endDate: YMD,
          // adults + children, capped by the crew-size rule. `guests` kept as a
          // fallback total for older clients; adults defaults from it.
          adults: z.number().int().min(1).max(MAX_GUESTS_WITH_KIDS).optional(),
          children: z.number().int().min(0).max(MAX_GUESTS_WITH_KIDS).default(0),
          guests: z.number().int().min(MIN_GUESTS).max(MAX_GUESTS_WITH_KIDS).optional(),
          dietCommitment: z.literal(true),
          waterDoctrineCommitment: z.literal(true),
          // Voyage Covenant acceptance. Record the version the client actually
          // displayed (not the server's current one) so the audit trail is honest.
          agreementAccepted: z.literal(true),
          agreementVersion: z.string().min(1).max(16),
          ref: z.string().max(40).optional(),
          notes: z.string().max(2000).optional(),
        })
        .refine((v) => isValidVoyageLength(v.startDate, v.endDate), {
          message: "A voyage is a whole number of 7-night cycles, up to four weeks. Pick dates 7, 14, 21, or 28 nights apart.",
          path: ["endDate"],
        })
        .refine((v) => {
          const adults = v.adults ?? Math.max(1, (v.guests ?? 1) - (v.children ?? 0));
          return isValidCrewSize(adults, v.children ?? 0);
        }, {
          message: "Up to four aboard, or five when at least three are children.",
          path: ["adults"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_booking");
      const d = await db();

      // Overlap check against blocking bookings + blackouts.
      const blocking = await d
        .select({ startDate: shipBookings.startDate, endDate: shipBookings.endDate })
        .from(shipBookings)
        .where(inArray(shipBookings.status, [...BLOCKING_STATUSES]));
      const blackouts = await d.select({ startDate: shipBlackoutDates.startDate, endDate: shipBlackoutDates.endDate }).from(shipBlackoutDates);
      if (overlapsAny(input.startDate, input.endDate, [...blocking, ...blackouts])) {
        throw new TRPCError({ code: "CONFLICT", message: "Those dates are already spoken for. Please choose another open week." });
      }

      // Resolve referral handle -> user id (Ship's Bell / quest attribution).
      let referredByUserId: number | null = null;
      if (input.ref) {
        const handle = input.ref.toLowerCase().replace(/^@/, "");
        const [refUser] = await d.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1);
        referredByUserId = refUser?.id ?? null;
      }

      const now = new Date();
      const children = input.children ?? 0;
      const adults = input.adults ?? Math.max(1, (input.guests ?? 1) - children);
      const totalGuests = adults + children;
      const [res] = await d.insert(shipBookings).values({
        userId: ctx.user.id,
        startDate: input.startDate,
        endDate: input.endDate,
        guests: totalGuests,
        children,
        status: "requested",
        dietCommitmentAt: now,
        waterDoctrineCommitmentAt: now,
        agreementAcceptedAt: now,
        agreementVersion: input.agreementVersion,
        referredByUserId,
        notes: input.notes ? sanitizeInput(input.notes) : null,
      });
      const id = (res as { insertId?: number }).insertId ?? null;
      if (ctx.user.email) {
        await emailBookingReceived(ctx.user.email, { id: id ?? 0, startDate: input.startDate, endDate: input.endDate, guests: totalGuests });
      }
      return { id };
    }),

  myBookings: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    return d.select().from(shipBookings).where(eq(shipBookings.userId, ctx.user.id)).orderBy(desc(shipBookings.startDate));
  }),

  myVoyage: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    const [active] = await d
      .select()
      .from(shipBookings)
      .where(and(eq(shipBookings.userId, ctx.user.id), inArray(shipBookings.status, ["confirmed", "active"])))
      .orderBy(asc(shipBookings.startDate))
      .limit(1);
    if (!active) return null;
    const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.bookingId, active.id)).limit(1);
    const logEntries = await d.select().from(shipLogEntries).where(eq(shipLogEntries.bookingId, active.id)).orderBy(asc(shipLogEntries.dayNumber));
    const plantings = await d.select().from(shipSeedPlantings).where(eq(shipSeedPlantings.bookingId, active.id));
    const stamps = await d.select().from(shipPassportStamps).where(eq(shipPassportStamps.userId, ctx.user.id));
    return { booking: active, itinerary: (session?.itinerary as Itinerary | null) ?? null, logEntries, plantings, stamps };
  }),

  // ── The Captain's Book (active-voyage hub) ──────────────────────────────────
  voyage: router({
    // Set the crew roles for the sailing voyage (Captain, Navigator, and so on).
    setRoles: protectedProcedure
      .input(z.object({
        captain: z.string().max(120).optional(),
        navigator: z.string().max(120).optional(),
        quartermaster: z.string().max(120).optional(),
        bosun: z.string().max(120).optional(),
        seedKeeper: z.string().max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        const [active] = await d.select().from(shipBookings)
          .where(and(eq(shipBookings.userId, ctx.user.id), inArray(shipBookings.status, ["confirmed", "active"])))
          .orderBy(asc(shipBookings.startDate)).limit(1);
        if (!active) throw new TRPCError({ code: "NOT_FOUND", message: "No sailing voyage to set roles on." });
        const roles = Object.fromEntries(
          Object.entries(input).filter(([, v]) => v).map(([k, v]) => [k, sanitizeInput(v as string)]),
        );
        await d.update(shipBookings).set({ crewRoles: roles }).where(eq(shipBookings.id, active.id));
        return { ok: true, roles };
      }),
    // Log a completed pre-sail checklist run (one per drive), for the crew's and
    // the church's protection on damage questions.
    logPreSail: protectedProcedure
      .input(z.object({ byName: z.string().min(1).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        const [active] = await d.select().from(shipBookings)
          .where(and(eq(shipBookings.userId, ctx.user.id), inArray(shipBookings.status, ["confirmed", "active"])))
          .orderBy(asc(shipBookings.startDate)).limit(1);
        if (!active) throw new TRPCError({ code: "NOT_FOUND", message: "No sailing voyage to log against." });
        const prior = Array.isArray(active.preSailLog) ? (active.preSailLog as Array<{ at: string; byName: string }>) : [];
        const entry = { at: new Date().toISOString(), byName: sanitizeInput(input.byName) };
        await d.update(shipBookings).set({ preSailLog: [...prior, entry] }).where(eq(shipBookings.id, active.id));
        return { ok: true, entry, count: prior.length + 1 };
      }),

    // Crew hides or shows their own Homecoming recap page (SHIP_V5_FLYWHEEL §2).
    setHomecomingHidden: protectedProcedure
      .input(z.object({ hidden: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        const [b] = await d.select({ id: shipBookings.id }).from(shipBookings)
          .where(and(eq(shipBookings.userId, ctx.user.id), eq(shipBookings.status, "completed")))
          .orderBy(desc(shipBookings.startDate)).limit(1);
        if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "No completed voyage to hide." });
        await d.update(shipBookings).set({ homecomingHidden: input.hidden }).where(eq(shipBookings.id, b.id));
        return { ok: true };
      }),

    // The gear manifest (SHIP_V5_FLYWHEEL §1): the high-value gear she carries,
    // plus this voyage's boarding/return checks.
    gearManifest: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      const [active] = await d.select().from(shipBookings)
        .where(and(eq(shipBookings.userId, ctx.user.id), inArray(shipBookings.status, ["confirmed", "active", "completed"])))
        .orderBy(desc(shipBookings.startDate)).limit(1);
      const gear = await d.select({ id: shipInventoryItems.id, name: shipInventoryItems.name, category: shipInventoryItems.category })
        .from(shipInventoryItems)
        .where(and(eq(shipInventoryItems.isVisible, true), eq(shipInventoryItems.isGearChecked, true)))
        .orderBy(asc(shipInventoryItems.sortOrder));
      const checks = active
        ? await d.select().from(shipGearChecks).where(eq(shipGearChecks.bookingId, active.id))
        : [];
      return { bookingId: active?.id ?? null, gear, checks };
    }),
    submitGearCheck: protectedProcedure
      .input(z.object({
        phase: z.enum(["boarding", "return"]),
        items: z.array(z.object({
          itemId: z.number().int(),
          present: z.boolean(),
          condition: z.enum(["good", "worn", "damaged", "missing"]),
          photoUrl: z.string().max(512).optional(),
        })).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        const [active] = await d.select().from(shipBookings)
          .where(and(eq(shipBookings.userId, ctx.user.id), inArray(shipBookings.status, ["confirmed", "active"])))
          .orderBy(asc(shipBookings.startDate)).limit(1);
        if (!active) throw new TRPCError({ code: "NOT_FOUND", message: "No sailing voyage for a gear check." });
        await d.insert(shipGearChecks).values({ bookingId: active.id, phase: input.phase, items: input.items, completedByUserId: ctx.user.id });
        // On a return check, flag discrepancies to the owner.
        const bad = input.items.filter((i) => !i.present || i.condition === "damaged" || i.condition === "missing");
        if (input.phase === "return" && bad.length) {
          await notifyOwner({ title: "Ship gear check: discrepancies at return", content: `Booking ${active.id}: ${bad.length} item(s) worn, damaged, or missing.` }).catch(() => {});
        }
        return { ok: true, discrepancies: bad.length };
      }),
  }),

  // ── Treasure map ──────────────────────────────────────────────────────────
  map: router({
    // Lean projection for the clustered map. Returns verified pins (the treasure)
    // plus bulk-imported unverified pins (styled translucent on the client) so
    // the map is populated; the "verified only" filter hides the latter. The
    // detail drawer fetches the full row via `get`. Capped so an importer that
    // seeds thousands of pins can't blow up the payload (ADR-35).
    list: publicProcedure
      .input(
        z
          .object({
            type: z.string().max(40).optional(),
            bioregion: z.string().max(64).optional(),
            verifiedOnly: z.boolean().optional(),
            fits40: z.boolean().optional(),
            hasWater: z.boolean().optional(),
            freeCamping: z.boolean().optional(),
            limit: z.number().int().min(1).max(10000).optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        const d = await db();
        const conds = [eq(shipLocations.bioregion, input?.bioregion ?? "cascadia")];
        if (input?.verifiedOnly) conds.push(eq(shipLocations.isVerified, true));
        if (input?.type) conds.push(eq(shipLocations.type, input.type as any));
        if (input?.fits40) conds.push(gte(shipLocations.maxRigLengthFt, 40));
        if (input?.hasWater) conds.push(isNotNull(shipLocations.waterQualityUrl));
        if (input?.freeCamping) conds.push(eq(shipLocations.type, "boondock"));
        // Crew-gate partner data used under a people-we-know scope (iOverlander,
        // Section 1 of the import spec): anonymous visitors never receive those
        // pins. Enforced server-side so they never reach the client. NULL-source
        // rows (base seeds, crew pins) always pass.
        if (!ctx.user) {
          conds.push(or(isNull(shipLocations.source), notInArray(shipLocations.source, [...CREW_ONLY_SOURCES]))!);
        }
        return d
          .select({
            id: shipLocations.id,
            slug: shipLocations.slug,
            name: shipLocations.name,
            type: shipLocations.type,
            lat: shipLocations.lat,
            lng: shipLocations.lng,
            isVerified: shipLocations.isVerified,
            source: shipLocations.source,
            maxRigLengthFt: shipLocations.maxRigLengthFt,
            hasWater: sql<boolean>`${shipLocations.waterQualityUrl} IS NOT NULL`,
            lastVerifiedAt: shipLocations.lastVerifiedAt,
          })
          .from(shipLocations)
          .where(and(...conds))
          // Verified (treasure) first so it wins the cluster's representative pin.
          .orderBy(desc(shipLocations.isVerified), asc(shipLocations.name))
          .limit(input?.limit ?? 8000);
      }),

    get: publicProcedure
      .input(z.object({ slug: z.string().max(200).optional(), id: z.number().int().optional() }))
      .query(async ({ ctx, input }) => {
        const d = await db();
        if (!input.slug && input.id == null) return null;
        const where = input.slug ? eq(shipLocations.slug, input.slug) : eq(shipLocations.id, input.id!);
        const [row] = await d.select().from(shipLocations).where(where).limit(1);
        if (!row) return null;
        // Same crew-gate as map.list: never leak a crew-only pin to anonymous.
        if (!isLocationVisible(row.source, Boolean(ctx.user))) return null;
        return row;
      }),

    // "Add to the map" (the FAB). Crew-sourced, unverified, feeds the admin
    // queue; verification auto-completes the Maiden Voyage add-a-location action.
    suggest: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(200),
          type: z.enum(["land_project", "spring", "waterfall", "lake", "geology", "forest", "food_forest", "seed_site", "boondock", "event_venue", "commercial_boondock"]),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          description: z.string().max(2000).optional(),
          websiteUrl: z.string().url().max(512).optional(),
          imageUrl: z.string().url().max(512).optional(),
          accessNotes: z.string().max(2000).optional(),
          maxRigLengthFt: z.number().int().min(0).max(100).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_map_suggest");
        const d = await db();
        const base = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "location";
        const slug = `${base}-${Date.now().toString(36)}`;
        await d.insert(shipLocations).values({
          name: sanitizeInput(input.name),
          slug,
          type: input.type,
          lat: input.lat,
          lng: input.lng,
          source: "crew",
          sourceLicense: "original",
          description: input.description ? sanitizeInput(input.description) : null,
          websiteUrl: input.websiteUrl ?? null,
          imageUrl: input.imageUrl ?? null,
          accessNotes: input.accessNotes ? sanitizeInput(input.accessNotes) : null,
          maxRigLengthFt: input.maxRigLengthFt ?? null,
          isVerified: false,
          addedByUserId: ctx.user.id,
        });
        return { ok: true, slug };
      }),

    // Verify-in-the-field: a crew confirms a pin is still true. Bumps the
    // freshness so stale pins (18+ months) can fade on the client.
    confirm: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_map_confirm");
        const d = await db();
        const [loc] = await d.select({ id: shipLocations.id }).from(shipLocations).where(eq(shipLocations.id, input.id)).limit(1);
        if (!loc) throw new TRPCError({ code: "NOT_FOUND", message: "That location is not on the map." });
        await d
          .update(shipLocations)
          .set({ lastVerifiedAt: new Date(), verifiedCount: sql`${shipLocations.verifiedCount} + 1` })
          .where(eq(shipLocations.id, input.id));
        return { ok: true };
      }),

    // Flag a problem (gate locked, spring dry, rig no longer fits). Admin queue.
    flag: protectedProcedure
      .input(z.object({ id: z.number().int(), reason: z.string().min(3).max(500) }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_map_flag");
        const d = await db();
        const [loc] = await d.select({ id: shipLocations.id }).from(shipLocations).where(eq(shipLocations.id, input.id)).limit(1);
        if (!loc) throw new TRPCError({ code: "NOT_FOUND", message: "That location is not on the map." });
        await d.insert(shipLocationFlags).values({ locationId: input.id, userId: ctx.user.id, reason: sanitizeInput(input.reason) });
        return { ok: true };
      }),

    position: publicProcedure.query(async () => {
      const d = await db();
      const [ping] = await d.select().from(shipPositionPings).orderBy(desc(shipPositionPings.createdAt)).limit(1);
      return ping ?? null;
    }),
  }),

  // ── Free Passage Quest ─────────────────────────────────────────────────────
  quest: router({
    actions: publicProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipQuestActions).orderBy(asc(shipQuestActions.sortOrder));
    }),

    myProgress: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      const completions = await d.select().from(shipQuestCompletions).where(eq(shipQuestCompletions.userId, ctx.user.id));
      const { standings } = await loadQuestStandings();
      const mine = standings.find((s) => s.userId === ctx.user.id) ?? null;
      const [crew] = await d.select().from(shipCrewProfiles).where(eq(shipCrewProfiles.userId, ctx.user.id)).limit(1);
      return {
        completions,
        standing: mine,
        inTheDraw: Boolean(mine?.isEntered),
        entryThreshold: SHIP_ENTRY_THRESHOLD_POINTS,
        crewProfile: crew ?? null,
      };
    }),

    // The free-voyage meter: how many are unlocked by bookings so far.
    freeVoyageStatus: publicProcedure.query(async () => loadFreeVoyageStatus()),

    submit: protectedProcedure
      .input(z.object({ actionId: z.number().int(), proofUrl: z.string().url().max(512).optional(), note: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_quest_submit");
        const d = await db();
        const [action] = await d.select().from(shipQuestActions).where(eq(shipQuestActions.id, input.actionId)).limit(1);
        if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "That quest action does not exist." });

        // Auto-verify the Food Foresting quest from the existing quest_completions.
        let autoVerified = false;
        if (action.proofType === "game_quest" && action.linkedQuestId) {
          const [done] = await d
            .select({ id: questCompletions.id })
            .from(questCompletions)
            .where(and(eq(questCompletions.userId, ctx.user.id), eq(questCompletions.questId, action.linkedQuestId)))
            .limit(1);
          autoVerified = Boolean(done);
        }

        const existing = await d
          .select()
          .from(shipQuestCompletions)
          .where(and(eq(shipQuestCompletions.userId, ctx.user.id), eq(shipQuestCompletions.actionId, input.actionId)))
          .limit(1);

        const values = {
          proofUrl: input.proofUrl ?? null,
          note: input.note ? sanitizeInput(input.note) : null,
          status: autoVerified ? ("verified" as const) : ("pending" as const),
          verifiedAt: autoVerified ? new Date() : null,
        };

        let completionId: number;
        if (existing[0]) {
          if (existing[0].status === "verified") return { status: "verified" as const };
          await d.update(shipQuestCompletions).set(values).where(eq(shipQuestCompletions.id, existing[0].id));
          completionId = existing[0].id;
        } else {
          const [res] = await d.insert(shipQuestCompletions).values({ userId: ctx.user.id, actionId: input.actionId, ...values });
          completionId = (res as { insertId?: number }).insertId ?? 0;
        }
        if (autoVerified && completionId) await rewardVerifiedCompletion(completionId);
        return { status: values.status };
      }),

    leaderboard: publicProcedure.query(async () => {
      const d = await db();
      const { standings } = await loadQuestStandings();
      const ids = standings.map((s) => s.userId);
      const profiles = ids.length
        ? await d.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, ids))
        : [];
      const byId = new Map(profiles.map((p) => [p.id, p]));
      return {
        poolSize: countEntered(standings),
        entryThreshold: SHIP_ENTRY_THRESHOLD_POINTS,
        freeVoyage: await loadFreeVoyageStatus(),
        standings: standings.slice(0, 100).map((s) => ({
          ...s,
          name: byId.get(s.userId)?.name ?? "A crew member",
          handle: byId.get(s.userId)?.handle ?? null,
        })),
      };
    }),
  }),

  // ── Crew profiles + sponsorship ─────────────────────────────────────────────
  crew: router({
    // My crew profile (by account). Null until I make one.
    mine: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      const [crew] = await d.select().from(shipCrewProfiles).where(eq(shipCrewProfiles.userId, ctx.user.id)).limit(1);
      return crew ?? null;
    }),

    // Create or update my crew profile. Publishing (a public card) is gated: a
    // crew is only shown publicly once it is in the draw (threshold reached) or
    // linked to an approved nomination. Passing a nominationId activates that
    // nomination for the signed-in account.
    upsert: protectedProcedure
      .input(
        z.object({
          displayName: z.string().min(2).max(200),
          bio: z.string().max(2000).optional(),
          intent: z.string().max(2000).optional(),
          photoUrl: z.string().url().max(512).optional(),
          videoUrl: z.string().url().max(512).optional(),
          isPublic: z.boolean().optional(),
          nominationId: z.number().int().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_crew_upsert");
        const d = await db();

        // Activate a nomination for this account, if one was passed.
        let nominationId: number | null = null;
        if (input.nominationId) {
          const [nom] = await d.select().from(shipNominations).where(eq(shipNominations.id, input.nominationId)).limit(1);
          if (nom && (nom.nomineeUserId == null || nom.nomineeUserId === ctx.user.id)) {
            nominationId = nom.id;
            if (nom.nomineeUserId == null) {
              await d.update(shipNominations).set({ nomineeUserId: ctx.user.id }).where(eq(shipNominations.id, nom.id));
            }
          }
        }

        // Am I eligible for a public card? (in the draw or an approved nominee)
        const { standings } = await loadQuestStandings();
        const mine = standings.find((s) => s.userId === ctx.user.id);
        let nominationApproved = false;
        if (nominationId) {
          const [nom] = await d.select().from(shipNominations).where(eq(shipNominations.id, nominationId)).limit(1);
          nominationApproved = nom?.status === "approved_for_draw";
        }
        const eligibleForPublic = Boolean(mine?.isEntered) || nominationApproved;
        const isPublic = Boolean(input.isPublic) && eligibleForPublic;

        const values = {
          displayName: sanitizeInput(input.displayName),
          bio: input.bio ? sanitizeInput(input.bio) : null,
          intent: input.intent ? sanitizeInput(input.intent) : null,
          photoUrl: input.photoUrl ?? null,
          videoUrl: input.videoUrl ?? null,
          isPublic,
          status: (isPublic ? "published" : "draft") as "published" | "draft",
        };

        const [existing] = await d.select().from(shipCrewProfiles).where(eq(shipCrewProfiles.userId, ctx.user.id)).limit(1);
        if (existing) {
          // Never demote a crew that is already sponsored/sailed.
          const keepStatus = existing.status === "sponsored" || existing.status === "sailed";
          await d
            .update(shipCrewProfiles)
            .set({ ...values, ...(keepStatus ? { status: existing.status } : {}), ...(nominationId ? { nominationId } : {}) })
            .where(eq(shipCrewProfiles.id, existing.id));
          return { id: existing.id, isPublic };
        }
        const [res] = await d.insert(shipCrewProfiles).values({
          userId: ctx.user.id,
          nominationId,
          sponsorGoalCents: CREW_SPONSOR_GOAL_CENTS,
          ...values,
        });
        return { id: (res as { insertId?: number }).insertId ?? null, isPublic };
      }),

    // Public crew cards for the quest page. Only crews that are truly in the
    // draw appear (threshold entrants + approved nominees), so a public card
    // always maps to a live draw entry.
    listPublished: publicProcedure.query(async () => {
      const d = await db();
      const crews = await d
        .select()
        .from(shipCrewProfiles)
        .where(eq(shipCrewProfiles.isPublic, true))
        .orderBy(desc(shipCrewProfiles.createdAt))
        .limit(200);
      if (crews.length === 0) return [];

      const { standings } = await loadQuestStandings();
      const enteredIds = new Set(standings.filter((s) => s.isEntered).map((s) => s.userId));
      const nomIds = crews.map((c) => c.nominationId).filter((n): n is number => n != null);
      const approvedNoms = nomIds.length
        ? await d.select({ id: shipNominations.id }).from(shipNominations).where(and(inArray(shipNominations.id, nomIds), eq(shipNominations.status, "approved_for_draw")))
        : [];
      const approvedNomSet = new Set(approvedNoms.map((n) => n.id));

      return crews
        .filter((c) => (c.userId != null && enteredIds.has(c.userId)) || (c.nominationId != null && approvedNomSet.has(c.nominationId)))
        .map((c) => ({
          id: c.id,
          displayName: c.displayName,
          bio: c.bio,
          intent: c.intent,
          photoUrl: c.photoUrl,
          videoUrl: c.videoUrl,
          status: c.status,
          ...sponsorshipProgress(c.sponsoredCents, c.sponsorGoalCents),
        }));
    }),

    // Sponsor a crew's voyage. Creates a hosted Stripe Checkout tagged with the
    // ship-gift program + crewProfileId so the succeeded donation reconciles onto
    // the crew (see server/lib/ship-sponsorship.ts, called by the Stripe webhook).
    sponsor: publicProcedure
      .input(z.object({ crewProfileId: z.number().int(), amountCents: z.number().int().min(500).max(210000), donorEmail: z.string().email().max(320).optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_crew_sponsor");
        if (!isStripeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Sponsorship is not live yet. Please try again soon." });
        }
        const d = await db();
        const [crew] = await d.select().from(shipCrewProfiles).where(eq(shipCrewProfiles.id, input.crewProfileId)).limit(1);
        if (!crew || !crew.isPublic) throw new TRPCError({ code: "NOT_FOUND", message: "That crew is not sailing yet." });

        const stripe = getStripe();
        const donorUserId = ctx.user?.id ?? null;
        const email = ctx.user?.email ?? input.donorEmail ?? undefined;
        const metadata = { source: "ship_crew_sponsor", crewProfileId: String(crew.id), program: CREW_SPONSOR_PROGRAM_TAG, donorUserId: donorUserId ? String(donorUserId) : "" };
        const successUrl = `https://regencivics.earth/ship/quest?sponsored=${crew.id}&session_id={CHECKOUT_SESSION_ID}`;
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: input.amountCents, product_data: { name: `Sponsor a ReGen Ship voyage: ${crew.displayName}` } } }],
          success_url: successUrl,
          cancel_url: "https://regencivics.earth/ship/quest",
          metadata,
          ...(email ? { customer_email: email } : {}),
        });
        await d.insert(churchDonations).values({
          stripeSessionId: session.id,
          donorUserId,
          donorEmail: email ?? null,
          amountCents: input.amountCents,
          currency: "usd",
          giftInterval: "one_time",
          status: "pending",
          program: CREW_SPONSOR_PROGRAM_TAG,
          crewProfileId: crew.id,
        });
        return { url: session.url };
      }),
  }),

  // ── Nominations + applications (public forms) ───────────────────────────────
  nominate: publicProcedure
    .input(
      z.object({
        nomineeName: z.string().min(2).max(200),
        nomineeContact: z.string().max(320).optional(),
        reason: z.string().min(10).max(2000),
        isSelfNomination: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_nominate");
      const d = await db();
      await d.insert(shipNominations).values({
        nominatorUserId: ctx.user?.id ?? null,
        nomineeName: sanitizeInput(input.nomineeName),
        nomineeContact: input.nomineeContact ? sanitizeInput(input.nomineeContact) : null,
        reason: sanitizeInput(input.reason),
        isSelfNomination: input.isSelfNomination,
      });
      const notify = ctx.user?.email ?? (input.nomineeContact?.includes("@") ? input.nomineeContact : null);
      if (notify) await emailNominationReceived(notify, input.nomineeName);
      return { ok: true };
    }),

  applyKeeper: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        email: z.string().email().max(320),
        location: z.string().max(255).optional(),
        experience: z.string().max(3000).optional(),
        availability: z.string().max(2000).optional(),
        needsText: z.string().max(2000).optional(),
        offersText: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_apply_keeper");
      const d = await db();
      await d.insert(shipKeeperApplications).values({
        name: sanitizeInput(input.name),
        email: input.email,
        location: input.location ? sanitizeInput(input.location) : null,
        experience: input.experience ? sanitizeInput(input.experience) : null,
        availability: input.availability ? sanitizeInput(input.availability) : null,
        needsText: input.needsText ? sanitizeInput(input.needsText) : null,
        offersText: input.offersText ? sanitizeInput(input.offersText) : null,
      });
      const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
      await captureFormNeedsOffers({
        source: "ship_keeper",
        sourceId: null,
        contactName: input.name,
        contactEmail: input.email,
        needsText: input.needsText,
        offersText: input.offersText,
      });
      await emailApplicationReceived(input.email, "Ship Keeper");
      return { ok: true };
    }),

  applyFleet: publicProcedure
    .input(
      z.object({
        ownerName: z.string().min(2).max(200),
        email: z.string().email().max(320),
        rvYearMakeModel: z.string().max(255).optional(),
        location: z.string().max(255).optional(),
        message: z.string().max(3000).optional(),
        needsText: z.string().max(2000).optional(),
        offersText: z.string().max(2000).optional(),
        // The Flagkeeper's qualification story (0197). All optional so the
        // plain typed form keeps working without the companion.
        whyRegeneration: z.string().max(4000).optional(),
        fleetVision: z.string().max(4000).optional(),
        // JSON array of turns from the Flagkeeper conversation. Capped to fit
        // the TEXT column; stored raw like applications.companionTranscript
        // (React escapes on render, and only admins ever see it).
        companionTranscript: z.string().max(60_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_apply_fleet");
      const d = await db();
      await d.insert(shipFleetApplications).values({
        ownerName: sanitizeInput(input.ownerName),
        email: input.email,
        rvYearMakeModel: input.rvYearMakeModel ? sanitizeInput(input.rvYearMakeModel) : null,
        location: input.location ? sanitizeInput(input.location) : null,
        message: input.message ? sanitizeInput(input.message) : null,
        needsText: input.needsText ? sanitizeInput(input.needsText) : null,
        offersText: input.offersText ? sanitizeInput(input.offersText) : null,
        whyRegeneration: input.whyRegeneration ? sanitizeInput(input.whyRegeneration) : null,
        fleetVision: input.fleetVision ? sanitizeInput(input.fleetVision) : null,
        companionTranscript: input.companionTranscript || null,
      });
      const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
      await captureFormNeedsOffers({
        source: "ship_fleet",
        sourceId: null,
        contactName: input.ownerName,
        contactEmail: input.email,
        needsText: input.needsText,
        offersText: input.offersText,
      });
      await emailApplicationReceived(input.email, "ReGen Fleet");
      return { ok: true };
    }),

  applyWinterHost: publicProcedure
    .input(
      z.object({
        projectName: z.string().min(2).max(200),
        contactName: z.string().min(2).max(200),
        email: z.string().email().max(320),
        location: z.string().max(255).optional(),
        powerHookup: z.boolean().default(false),
        freezeProtectionPlan: z.string().max(3000).optional(),
        siteDescription: z.string().max(3000).optional(),
        proposedShare: z.string().max(120).optional(),
        needsText: z.string().max(2000).optional(),
        offersText: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "ship_apply_winter");
      const d = await db();
      await d.insert(shipWinterHostApplications).values({
        projectName: sanitizeInput(input.projectName),
        contactName: sanitizeInput(input.contactName),
        email: input.email,
        location: input.location ? sanitizeInput(input.location) : null,
        powerHookup: input.powerHookup,
        freezeProtectionPlan: input.freezeProtectionPlan ? sanitizeInput(input.freezeProtectionPlan) : null,
        siteDescription: input.siteDescription ? sanitizeInput(input.siteDescription) : null,
        proposedShare: input.proposedShare ? sanitizeInput(input.proposedShare) : null,
        needsText: input.needsText ? sanitizeInput(input.needsText) : null,
        offersText: input.offersText ? sanitizeInput(input.offersText) : null,
      });
      const { captureFormNeedsOffers } = await import("../lib/needsOffersStore");
      await captureFormNeedsOffers({
        source: "ship_winter_host",
        sourceId: null,
        contactName: input.contactName,
        contactEmail: input.email,
        needsText: input.needsText,
        offersText: input.offersText,
      });
      await emailApplicationReceived(input.email, "Winter Anchorage");
      return { ok: true };
    }),

  // ── The dataset door ("Add your database to the map") ───────────────────────
  // A project or network offers a dataset of places. Public, rate-limited,
  // sanitized. Accepted offers flow through the source-stamped importer (source
  // = org slug, sourceUrl, sourceLicense) and are credited on the pins. This
  // router only records the offer and notifies; it never imports automatically.
  datasetOffer: router({
    submit: publicProcedure
      .input(
        z.object({
          orgName: z.string().min(2).max(200),
          contactName: z.string().min(2).max(200),
          email: z.string().email().max(320),
          description: z.string().min(10).max(2000),
          approxCount: z.number().int().min(0).max(10_000_000).optional(),
          dataUrl: z.string().url().max(512).optional(),
          licenseConfirmed: z.literal(true),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_dataset_offer");
        const d = await db();
        await d.insert(shipDatasetOffers).values({
          orgName: sanitizeInput(input.orgName),
          contactName: sanitizeInput(input.contactName),
          email: input.email,
          description: sanitizeInput(input.description),
          approxCount: input.approxCount ?? null,
          dataUrl: input.dataUrl ?? null,
          licenseNote: "Confirmed right to share, welcomes use with attribution.",
        });
        await emailDatasetOfferReceived(input.email, input.orgName);
        await notifyOwner({
          title: `New treasure-map dataset offer: ${input.orgName}`,
          content: [
            `${input.contactName} (${input.email}) offered a dataset for the treasure map.`,
            input.approxCount != null ? `Approx places: ${input.approxCount}` : null,
            input.dataUrl ? `Data: ${input.dataUrl}` : null,
            "",
            input.description,
          ].filter(Boolean).join("\n"),
        }).catch(() => {});
        return { ok: true };
      }),
  }),

  // ── Concierge ───────────────────────────────────────────────────────────────
  concierge: router({
    start: publicProcedure
      .input(z.object({ answers: z.record(z.string(), z.string().max(1000)), bookingId: z.number().int().optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_concierge_start");
        const d = await db();
        const [res] = await d.insert(shipConciergeSessions).values({
          userId: ctx.user?.id ?? null,
          bookingId: input.bookingId ?? null,
          profileAnswers: input.answers,
          messages: [],
        });
        const id = (res as { insertId?: number }).insertId ?? null;
        // The token is the capability for this session: without it (or the
        // signed-in owner), sequential ids grant nothing.
        const token = id != null ? await mintConciergeToken(id) : null;
        return { id, token };
      }),

    generate: publicProcedure
      .input(z.object({ sessionId: z.number().int(), token: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_concierge_generate");
        if (!isConciergeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The concierge is not aboard yet. Please try again soon." });
        }
        const d = await db();
        const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.id, input.sessionId)).limit(1);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        await assertConciergeAccess(session, input.token, ctx.user?.id);

        const locs = await d.select().from(shipLocations).where(eq(shipLocations.isVerified, true));
        const locations: ConciergeLocation[] = locs.map((l) => ({ id: l.id, name: l.name, type: l.type, bioregion: l.bioregion, description: l.description }));
        try {
          const answers = (session.profileAnswers as Record<string, unknown>) ?? {};
          const { itinerary, invalidIds } = await generateItinerary({
            answers,
            locations,
            // Suggested voyages seed voyage_nights so multi-week charts run the
            // whole sail (7 to 28 nights, validated deterministically).
            nights: voyageNightsFromAnswers(answers),
          });
          if (invalidIds.length) console.warn("[ship-concierge] dropped invented location ids:", invalidIds);
          await d.update(shipConciergeSessions).set({ itinerary }).where(eq(shipConciergeSessions.id, input.sessionId));
          return { itinerary };
        } catch (err) {
          console.error("[ship-concierge] generate failed:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The concierge could not chart the map just now. Please try again." });
        }
      }),

    chat: publicProcedure
      .input(z.object({ sessionId: z.number().int(), message: z.string().min(1).max(1000), token: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_concierge_chat");
        if (!isConciergeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The concierge is not aboard yet." });
        }
        const d = await db();
        const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.id, input.sessionId)).limit(1);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        await assertConciergeAccess(session, input.token, ctx.user?.id);

        const history = ((session.messages as Array<{ role: "user" | "assistant"; content: string }>) ?? []).concat({ role: "user", content: sanitizeInput(input.message) });
        const locs = await d.select().from(shipLocations).where(eq(shipLocations.isVerified, true));
        const locations: ConciergeLocation[] = locs.map((l) => ({ id: l.id, name: l.name, type: l.type, bioregion: l.bioregion, description: l.description }));
        // The First Mate knows the bag: pass the top-level gear aboard (not the
        // deep tool tree, which is the Shipwright's domain) with where each one
        // lives, so "what should we bring to the lake" and "where is the
        // paddleboard" both answer from real gear (Section 2.1).
        const bagRows = await d
          .select({
            id: shipInventoryItems.id, name: shipInventoryItems.name, category: shipInventoryItems.category,
            activityTags: shipInventoryItems.activityTags, storagePlace: shipInventoryItems.storagePlace,
            quantity: shipInventoryItems.quantity, parentId: shipInventoryItems.parentId,
            manifestCategory: shipInventoryItems.manifestCategory,
            isContainer: shipInventoryItems.isContainer, isVisible: shipInventoryItems.isVisible,
          })
          .from(shipInventoryItems)
          // Exclude year-two gear that is not aboard yet, so the First Mate never
          // tells a guest to bring something that is not actually on the ship.
          .where(and(eq(shipInventoryItems.isVisible, true), eq(shipInventoryItems.comingYear2, false)));
        const bagById = new Map(bagRows.map((b) => [b.id, b as InventoryRow]));
        const inventory = bagRows
          .filter((b) => b.parentId == null && !b.isContainer)
          .map((b) => ({
            name: b.name,
            category: b.category,
            activityTags: Array.isArray(b.activityTags) ? (b.activityTags as string[]) : [],
            location: locationOf(b as InventoryRow, bagById),
          }));
        const reply = await conciergeReply({ history, locations, itinerary: (session.itinerary as Itinerary | null) ?? null, inventory });
        // Cap the stored transcript so a long-running session cannot grow the
        // JSON column without bound; the model only reads the recent turns anyway.
        const messages = history.concat({ role: "assistant", content: reply }).slice(-60);
        await d.update(shipConciergeSessions).set({ messages }).where(eq(shipConciergeSessions.id, input.sessionId));
        return { reply, messages };
      }),

    getSession: publicProcedure
      .input(z.object({ sessionId: z.number().int(), token: z.string().max(2000).optional() }))
      .query(async ({ ctx, input }) => {
        const d = await db();
        const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.id, input.sessionId)).limit(1);
        if (!session) return null;
        await assertConciergeAccess(session, input.token, ctx.user?.id);
        return session;
      }),
  }),

  // ── Seeds (chest QR log) ────────────────────────────────────────────────────
  seeds: router({
    log: protectedProcedure
      .input(
        z.object({
          species: z.string().max(200).optional(),
          lat: z.number().min(-90).max(90).optional(),
          lng: z.number().min(-180).max(180).optional(),
          locationId: z.number().int().optional(),
          bookingId: z.number().int().optional(),
          photoUrl: z.string().url().max(512).optional(),
          notes: z.string().max(1000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_seeds_log");
        const d = await db();
        await d.insert(shipSeedPlantings).values({
          userId: ctx.user.id,
          bookingId: input.bookingId ?? null,
          locationId: input.locationId ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          species: input.species ? sanitizeInput(input.species) : null,
          photoUrl: input.photoUrl ?? null,
          notes: input.notes ? sanitizeInput(input.notes) : null,
          isVerified: false,
        });
        return { ok: true };
      }),

    listVerified: publicProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipSeedPlantings).where(eq(shipSeedPlantings.isVerified, true)).orderBy(desc(shipSeedPlantings.plantedAt)).limit(500);
    }),
  }),

  // ── Voyage log ──────────────────────────────────────────────────────────────
  log: router({
    create: protectedProcedure
      .input(
        z.object({
          bookingId: z.number().int(),
          dayNumber: z.number().int().min(0).max(60).optional(),
          title: z.string().max(200).optional(),
          content: z.string().min(1).max(5000),
          photoUrl: z.string().url().max(512).optional(),
          isPublic: z.boolean().default(true),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_log_create");
        const d = await db();
        const [booking] = await d.select().from(shipBookings).where(eq(shipBookings.id, input.bookingId)).limit(1);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "That is not your voyage." });
        await d.insert(shipLogEntries).values({
          bookingId: input.bookingId,
          userId: ctx.user.id,
          dayNumber: input.dayNumber ?? null,
          title: input.title ? sanitizeInput(input.title) : null,
          content: sanitizeInput(input.content),
          photoUrl: input.photoUrl ?? null,
          isPublic: input.isPublic,
        });
        return { ok: true };
      }),

    list: publicProcedure
      .input(z.object({ bookingId: z.number().int().optional() }).optional())
      .query(async ({ input }) => {
        const d = await db();
        const conds = [eq(shipLogEntries.isPublic, true)];
        if (input?.bookingId) conds.push(eq(shipLogEntries.bookingId, input.bookingId));
        return d.select().from(shipLogEntries).where(and(...conds)).orderBy(desc(shipLogEntries.createdAt)).limit(200);
      }),

    // The Homecoming timeline: completed, non-hidden voyages (SHIP_V5_FLYWHEEL §2).
    recaps: publicProcedure.query(async () => {
      const d = await db();
      const rows = await d
        .select({ slug: shipBookings.publicSlug, startDate: shipBookings.startDate, endDate: shipBookings.endDate, crewRoles: shipBookings.crewRoles })
        .from(shipBookings)
        .where(and(eq(shipBookings.status, "completed"), eq(shipBookings.homecomingHidden, false), isNotNull(shipBookings.publicSlug)))
        .orderBy(desc(shipBookings.startDate))
        .limit(200);
      return rows.map((r) => ({ slug: r.slug, startDate: r.startDate, endDate: r.endDate, crewName: (r.crewRoles as { captain?: string } | null)?.captain ?? "A crew" }));
    }),

    // One voyage's auto-compiled recap page. Public, respects privacy toggles.
    recap: publicProcedure
      .input(z.object({ slug: z.string().min(4).max(80) }))
      .query(async ({ input }) => {
        const d = await db();
        const [b] = await d.select().from(shipBookings).where(eq(shipBookings.publicSlug, input.slug)).limit(1);
        if (!b || b.status !== "completed" || b.homecomingHidden) return null;
        const entries = await d.select().from(shipLogEntries).where(and(eq(shipLogEntries.bookingId, b.id), eq(shipLogEntries.isPublic, true))).orderBy(asc(shipLogEntries.dayNumber));
        const plantings = await d.select().from(shipSeedPlantings).where(and(eq(shipSeedPlantings.bookingId, b.id), eq(shipSeedPlantings.isVerified, true)));
        const stamps = await d.select().from(shipPassportStamps).where(eq(shipPassportStamps.bookingId, b.id));
        const [captain] = await d.select({ handle: users.handle }).from(users).where(eq(users.id, b.userId)).limit(1);
        const roles = (b.crewRoles as { captain?: string } | null) ?? {};
        return {
          slug: b.publicSlug,
          crewName: roles.captain ?? "A crew",
          startDate: b.startDate,
          endDate: b.endDate,
          referralHandle: captain?.handle ?? null,
          entries: entries.map((e) => ({ id: e.id, dayNumber: e.dayNumber, title: e.title, content: e.content, photoUrl: e.photoUrl })),
          plantingCount: plantings.length,
          stampCount: stamps.length,
          closingLine: "She came home fuller than she left. Fair winds to the next crew.",
        };
      }),
  }),

  // ── Passport ────────────────────────────────────────────────────────────────
  passport: router({
    stamp: protectedProcedure
      .input(
        z.object({
          locationId: z.number().int(),
          bookingId: z.number().int().optional(),
          photoUrl: z.string().url().max(512).optional(),
          lat: z.number().min(-90).max(90).optional(),
          lng: z.number().min(-180).max(180).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_passport_stamp");
        const d = await db();
        const [loc] = await d.select().from(shipLocations).where(eq(shipLocations.id, input.locationId)).limit(1);
        if (!loc) throw new TRPCError({ code: "NOT_FOUND", message: "That location is not on the map." });
        // Optional GPS proximity check when the crew shares coordinates.
        if (input.lat != null && input.lng != null) {
          const dist = metersBetween(input.lat, input.lng, loc.lat, loc.lng);
          if (dist > PASSPORT_PROXIMITY_M) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "You need to be at the location to stamp your passport." });
          }
        }
        const [existing] = await d
          .select({ id: shipPassportStamps.id })
          .from(shipPassportStamps)
          .where(and(eq(shipPassportStamps.userId, ctx.user.id), eq(shipPassportStamps.locationId, input.locationId)))
          .limit(1);
        if (existing) return { ok: true, alreadyStamped: true };
        await d.insert(shipPassportStamps).values({
          userId: ctx.user.id,
          locationId: input.locationId,
          bookingId: input.bookingId ?? null,
          photoUrl: input.photoUrl ?? null,
        });
        return { ok: true, alreadyStamped: false };
      }),

    mine: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      return d.select().from(shipPassportStamps).where(eq(shipPassportStamps.userId, ctx.user.id));
    }),
  }),

  // ── The Shipwright (ship maintainer AI) ─────────────────────────────────────
  shipwright: router({
    // A voyager asks a maintenance/operation question. Retrieval over approved
    // knowledge + similar resolved cases; safety triggers hard-route to make-safe
    // guidance and mark the case as an escalation. Every ask logs a case so the
    // Keeper sees the ship's running health.
    ask: protectedProcedure
      .input(z.object({
        question: z.string().min(2).max(2000),
        system: z.enum([
          "chassis", "engine", "propane", "electrical", "plumbing", "slides", "generator",
          "appliances", "starlink", "water_filtration", "tires_brakes", "hvac", "general",
        ]).default("general"),
        caseId: z.number().int().optional(),
        photoUrls: z.array(z.string().max(512)).max(6).optional(),
        bookingId: z.number().int().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_shipwright");
        const d = await db();
        const question = sanitizeInput(input.question);

        // Continuing a case: it must exist and belong to this crew member (case
        // ids are sequential ints; without this check anyone signed in could
        // append to another crew's log). The prior conversation becomes the
        // model's memory, so follow-ups keep their context.
        let existingCase: typeof shipMaintenanceCases.$inferSelect | undefined;
        let history: Array<{ role: "user" | "assistant"; content: string }> = [];
        if (input.caseId) {
          const [row] = await d.select().from(shipMaintenanceCases).where(eq(shipMaintenanceCases.id, input.caseId)).limit(1);
          if (!row || row.reportedByUserId !== ctx.user.id) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Case not found." });
          }
          existingCase = row;
          history = (Array.isArray(row.conversation) ? (row.conversation as Array<{ role?: unknown; content?: unknown }>) : [])
            .filter((m): m is { role: "user" | "assistant"; content: string } =>
              Boolean(m) && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
        }

        // Retrieve approved knowledge for this system (FULLTEXT, with a LIKE
        // fallback) plus similar resolved cases in the same system. Best text
        // matches first, so the six chunks we keep are the six most relevant.
        let chunks: Array<{ title: string; content: string; system: string; sourceRef: string | null }> = [];
        try {
          chunks = await d
            .select({ title: shipKnowledgeChunks.title, content: shipKnowledgeChunks.content, system: shipKnowledgeChunks.system, sourceRef: shipKnowledgeChunks.sourceRef })
            .from(shipKnowledgeChunks)
            .where(and(
              eq(shipKnowledgeChunks.isApproved, true),
              or(eq(shipKnowledgeChunks.system, input.system), sql`MATCH(${shipKnowledgeChunks.title}, ${shipKnowledgeChunks.content}) AGAINST (${question})`),
            ))
            .orderBy(sql`MATCH(${shipKnowledgeChunks.title}, ${shipKnowledgeChunks.content}) AGAINST (${question}) DESC`)
            .limit(6);
        } catch {
          chunks = await d
            .select({ title: shipKnowledgeChunks.title, content: shipKnowledgeChunks.content, system: shipKnowledgeChunks.system, sourceRef: shipKnowledgeChunks.sourceRef })
            .from(shipKnowledgeChunks)
            .where(and(eq(shipKnowledgeChunks.isApproved, true), eq(shipKnowledgeChunks.system, input.system)))
            .limit(6);
        }
        const priorCases = await d
          .select({ title: shipMaintenanceCases.title, resolution: shipMaintenanceCases.resolution, whatWorked: shipMaintenanceCases.whatWorked })
          .from(shipMaintenanceCases)
          .where(and(eq(shipMaintenanceCases.system, input.system), eq(shipMaintenanceCases.status, "resolved")))
          .limit(4);

        // Only our own asset URLs reach the model as images: an arbitrary URL
        // would let a guest feed the Shipwright attacker-controlled pictures
        // hosted anywhere (AI-AUTOMATION-RISKS). Uploads land on the R2 asset
        // domain, so that host is the allow-list.
        const safePhotoUrls = (input.photoUrls ?? []).filter((u) => {
          try {
            const parsed = new URL(u);
            return parsed.protocol === "https:" && parsed.hostname === ASSET_HOST;
          } catch {
            return false;
          }
        }).slice(0, 4);

        // The Shipwright knows the tools aboard: pass repair-relevant inventory
        // with where each one is stored, so it only ever suggests a tool that is
        // actually aboard (mirrors the concierge's "First Mate knows the bag").
        const invRows = await d
          .select({
            id: shipInventoryItems.id, name: shipInventoryItems.name, quantity: shipInventoryItems.quantity,
            parentId: shipInventoryItems.parentId, storagePlace: shipInventoryItems.storagePlace,
            category: shipInventoryItems.category, manifestCategory: shipInventoryItems.manifestCategory,
            isContainer: shipInventoryItems.isContainer, isVisible: shipInventoryItems.isVisible,
          })
          .from(shipInventoryItems)
          // Only tools actually aboard now: exclude year-two gear so the Shipwright
          // never names a tool that has not arrived yet.
          .where(and(eq(shipInventoryItems.isVisible, true), eq(shipInventoryItems.comingYear2, false)));
        const tools = buildToolContext(invRows as InventoryRow[]);

        const { reply, escalated, reason } = await askShipwright({
          question,
          history,
          chunks,
          cases: priorCases.map((c) => ({ title: c.title, resolution: c.resolution, whatWorked: c.whatWorked })),
          photoUrls: safePhotoUrls,
          tools,
        });

        // Log/append the case so the ship's health has a continuous history.
        const turn = [
          { role: "user" as const, content: question },
          { role: "assistant" as const, content: reply },
        ];
        let caseId = input.caseId ?? null;
        if (caseId && existingCase) {
          const convo = Array.isArray(existingCase.conversation) ? (existingCase.conversation as unknown[]) : [];
          await d.update(shipMaintenanceCases)
            .set({ conversation: [...convo, ...turn].slice(-40), status: escalated ? "escalated" : "advised", isEscalation: escalated || Boolean(existingCase.isEscalation) })
            .where(eq(shipMaintenanceCases.id, caseId));
          if (escalated && !existingCase.isEscalation) {
            await notifyOwner({ title: "Ship Shipwright escalation", content: `${reason}: ${question.slice(0, 200)}` }).catch(() => {});
          }
        } else {
          const [res] = await d.insert(shipMaintenanceCases).values({
            bookingId: input.bookingId ?? null,
            reportedByUserId: ctx.user.id,
            system: input.system as ShipSystem,
            title: question.slice(0, 120),
            description: question,
            photoUrls: input.photoUrls ?? [],
            conversation: turn,
            status: escalated ? "escalated" : "advised",
            isEscalation: escalated,
          });
          caseId = (res as { insertId?: number }).insertId ?? null;
          if (escalated) await notifyOwner({ title: "Ship Shipwright escalation", content: `${reason}: ${question.slice(0, 200)}` }).catch(() => {});
        }
        return { reply, escalated, reason, caseId };
      }),

    // The crew's own maintenance log (their cases), newest first.
    myCases: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      return d
        .select({ id: shipMaintenanceCases.id, system: shipMaintenanceCases.system, title: shipMaintenanceCases.title, status: shipMaintenanceCases.status, isEscalation: shipMaintenanceCases.isEscalation, createdAt: shipMaintenanceCases.createdAt })
        .from(shipMaintenanceCases)
        .where(eq(shipMaintenanceCases.reportedByUserId, ctx.user.id))
        .orderBy(desc(shipMaintenanceCases.createdAt))
        .limit(50);
    }),
  }),

  // ── The Crew List (capture demand on non-open weeks) ────────────────────────
  crewList: router({
    // Join the crew list from a non-open week card. Double opt-in: the row is
    // stored unconfirmed and a confirmation email is sent (GDPR). One-click
    // unsubscribe token is minted now (SHIP_V5_FLYWHEEL Section 4).
    join: publicProcedure
      .input(z.object({
        email: z.string().email(),
        interests: z.array(z.enum(["any_week", "this_season", "winter", "year_2", "price_change"])).max(5).default([]),
        source: z.string().max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_crew_list");
        const d = await db();
        const unsubscribeToken = crypto.randomBytes(24).toString("hex");
        const [existing] = await d.select({ id: shipCrewListSignups.id }).from(shipCrewListSignups).where(eq(shipCrewListSignups.email, input.email)).limit(1);
        if (existing) {
          await d.update(shipCrewListSignups).set({ interests: input.interests, source: input.source ?? "week_card" }).where(eq(shipCrewListSignups.id, existing.id));
        } else {
          await d.insert(shipCrewListSignups).values({ email: input.email, interests: input.interests, source: input.source ?? "week_card", unsubscribeToken });
        }
        // Confirmation email (best-effort, non-fatal).
        try {
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({ email: input.email, purpose: "ship-crewlist-confirm" })
            .setProtectedHeader({ alg: "HS256" }).setExpirationTime("14d").sign(secret);
          const confirmUrl = `${ENV.appUrl}/ship/crew-list/confirm?token=${encodeURIComponent(token)}`;
          const unsubUrl = `${ENV.appUrl}/ship/crew-list/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
          const { sendEmail } = await import("../_core/email");
          await sendEmail({
            to: input.email,
            subject: "Confirm your spot on the ReGen Ship crew list",
            html: `<h2>Almost aboard</h2><p>Confirm you want word when a voyage week opens for you, and we'll keep you posted, in the ship's voice, one short note at a time.</p><p style="margin:24px 0;"><a href="${confirmUrl}" style="background:#1a472a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Confirm my spot</a></p><p style="color:#888;font-size:12px;">If you did not ask for this, ignore this email. <a href="${unsubUrl}" style="color:#999;">Unsubscribe</a>.</p>`,
          });
        } catch { /* email failure is non-fatal */ }
        return { ok: true, pendingConfirmation: true };
      }),
    confirm: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const { payload } = await jwtVerify(input.token, secret);
          if (payload.purpose !== "ship-crewlist-confirm" || typeof payload.email !== "string") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid confirmation link." });
          }
          const d = await db();
          await d.update(shipCrewListSignups).set({ confirmedAt: new Date() }).where(eq(shipCrewListSignups.email, payload.email));
          return { ok: true };
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({ code: "BAD_REQUEST", message: "That confirmation link is invalid or expired." });
        }
      }),
    unsubscribe: publicProcedure
      .input(z.object({ token: z.string().min(8).max(64) }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_crew_list");
        const d = await db();
        await d.delete(shipCrewListSignups).where(eq(shipCrewListSignups.unsubscribeToken, input.token));
        // Always succeed (no enumeration signal).
        return { ok: true };
      }),
  }),

  // ── The Ship's Inventory (the bag) ──────────────────────────────────────────
  // A nested tree: top-level nodes (parentId IS NULL) are the hero cards on the
  // /ship overview; container nodes (isContainer) drill into their child items on
  // /ship/inventory/:slug. list() returns every VISIBLE row (top-level + nested)
  // so the client can render the overview (filter to parentId === null), search
  // across the whole tree, and group a container's children by manifestCategory.
  // A bare .select() now also returns the nesting columns added in 0210
  // (parentId, isContainer, frameUrl, manifestCategory, storagePlace, zone, …).
  inventory: router({
    // Public: every visible item (top-level + nested), ordered for the grid.
    list: publicProcedure.query(async () => {
      const d = await db();
      return d
        .select()
        .from(shipInventoryItems)
        .where(eq(shipInventoryItems.isVisible, true))
        .orderBy(asc(shipInventoryItems.sortOrder), asc(shipInventoryItems.name));
    }),

    // Public: one item by slug, plus its visible children and the breadcrumb trail
    // from the top-level ancestor down to it. Powers the /ship/inventory/:slug
    // detail sub-page (breadcrumb + category-grouped child list).
    get: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(async ({ input }) => {
        const d = await db();
        const [item] = await d
          .select()
          .from(shipInventoryItems)
          .where(and(eq(shipInventoryItems.slug, input.slug), eq(shipInventoryItems.isVisible, true)))
          .limit(1);
        if (!item) return { item: null, children: [], breadcrumb: [] as { id: number; slug: string; name: string }[] };

        const children = await d
          .select()
          .from(shipInventoryItems)
          .where(and(eq(shipInventoryItems.parentId, item.id), eq(shipInventoryItems.isVisible, true)))
          .orderBy(asc(shipInventoryItems.sortOrder), asc(shipInventoryItems.name));

        // Breadcrumb: walk up parentId. One bounded query over id/slug/name/parentId
        // (the whole tree is tiny, ~135 rows) with a cycle guard so a bad parentId
        // can never loop forever.
        const nodes = await d
          .select({
            id: shipInventoryItems.id,
            slug: shipInventoryItems.slug,
            name: shipInventoryItems.name,
            parentId: shipInventoryItems.parentId,
          })
          .from(shipInventoryItems);
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const breadcrumb: { id: number; slug: string; name: string }[] = [];
        const seen = new Set<number>();
        let cur: (typeof nodes)[number] | undefined = byId.get(item.id);
        while (cur && !seen.has(cur.id)) {
          seen.add(cur.id);
          breadcrumb.unshift({ id: cur.id, slug: cur.slug, name: cur.name });
          cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
        }

        return { item, children, breadcrumb };
      }),
  }),

  // ── The Galley (food experience) ────────────────────────────────────────────
  // A crew logs what they gathered and remixes it into dishes that follow the
  // ship's diet. Two engines: the deterministic remix (galley-remix.ts, works with
  // no LLM) and the Ship's Cook AI (ship-cook.ts). Hauls and remixes belong to the
  // crew's account and link to the active voyage when there is one. All user text
  // is untrusted (AI-AUTOMATION-RISKS): sanitized on write, treated as data by the
  // Cook. Photos handed to the Cook are filtered to our own asset URLs.
  galley: router({
    // The caller's hauls, newest first, each with its items.
    myHauls: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      const hauls = await d.select().from(galleyHauls).where(eq(galleyHauls.userId, ctx.user.id)).orderBy(desc(galleyHauls.createdAt)).limit(100);
      if (!hauls.length) return [];
      const items = await d.select().from(galleyHaulItems).where(inArray(galleyHaulItems.haulId, hauls.map((h) => h.id)));
      const byHaul = new Map<number, typeof items>();
      for (const it of items) {
        const arr = byHaul.get(it.haulId) ?? [];
        arr.push(it);
        byHaul.set(it.haulId, arr);
      }
      return hauls.map((h) => ({ ...h, items: byHaul.get(h.id) ?? [] }));
    }),

    createHaul: protectedProcedure
      .input(z.object({
        title: z.string().max(200).optional(),
        visibility: z.enum(["crew", "public"]).default("crew"),
        bookingId: z.number().int().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_galley_haul");
        const d = await db();
        // Link to the active voyage automatically when the crew is sailing.
        const bookingId = input.bookingId ?? (await activeVoyageBookingId(ctx.user.id));
        const [res] = await d.insert(galleyHauls).values({
          userId: ctx.user.id,
          bookingId,
          title: input.title ? sanitizeInput(input.title) : null,
          visibility: input.visibility,
        });
        // Logging a haul is a Free Passage Quest nudge (never blocks the haul).
        await awardGalleyQuest(ctx.user.id, "galley-log-haul", "Logged a market haul in the Galley").catch(() => {});
        return { id: (res as { insertId?: number }).insertId ?? null, bookingId };
      }),

    renameHaul: protectedProcedure
      .input(z.object({ haulId: z.number().int(), title: z.string().max(200) }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        await assertHaulOwner(d, input.haulId, ctx.user.id);
        await d.update(galleyHauls).set({ title: sanitizeInput(input.title) }).where(eq(galleyHauls.id, input.haulId));
        return { ok: true };
      }),

    addItem: protectedProcedure
      .input(z.object({
        haulId: z.number().int(),
        name: z.string().min(1).max(200),
        note: z.string().max(500).optional(),
        photoUrl: z.string().max(512).optional(),
        category: z.enum(["produce", "pantry", "protein", "sauce", "other"]).default("produce"),
        source: z.enum(["market", "ship", "forage", "store"]).default("market"),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_galley_item");
        const d = await db();
        await assertHaulOwner(d, input.haulId, ctx.user.id);
        const [photo] = assetPhotoUrls(input.photoUrl ? [input.photoUrl] : [], 1);
        const [res] = await d.insert(galleyHaulItems).values({
          haulId: input.haulId,
          name: sanitizeInput(input.name),
          note: input.note ? sanitizeInput(input.note) : null,
          photoUrl: photo ?? null,
          category: input.category,
          source: input.source,
        });
        return { id: (res as { insertId?: number }).insertId ?? null };
      }),

    removeItem: protectedProcedure
      .input(z.object({ itemId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        const [item] = await d.select().from(galleyHaulItems).where(eq(galleyHaulItems.id, input.itemId)).limit(1);
        if (!item) return { ok: true };
        await assertHaulOwner(d, item.haulId, ctx.user.id);
        await d.delete(galleyHaulItems).where(eq(galleyHaulItems.id, input.itemId));
        return { ok: true };
      }),

    setHaulVisibility: protectedProcedure
      .input(z.object({ haulId: z.number().int(), visibility: z.enum(["crew", "public"]) }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        await assertHaulOwner(d, input.haulId, ctx.user.id);
        await d.update(galleyHauls).set({ visibility: input.visibility }).where(eq(galleyHauls.id, input.haulId));
        return { ok: true };
      }),

    // Deterministic remix: build 1 to 3 dishes from a haul (or a raw item list)
    // for the chosen track. No LLM. Persists the remix so it can join the log.
    remix: protectedProcedure
      .input(z.object({
        haulId: z.number().int().optional(),
        items: z.array(z.object({ name: z.string().min(1).max(200), note: z.string().max(500).optional() })).max(60).optional(),
        track: z.enum(["table", "reset"]).default("table"),
        save: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_galley_remix");
        const d = await db();
        let bookingId: number | null = null;
        let haulItems: HaulItemInput[] = [];
        if (input.haulId) {
          const haul = await assertHaulOwner(d, input.haulId, ctx.user.id);
          bookingId = haul.bookingId ?? null;
          const items = await d.select().from(galleyHaulItems).where(eq(galleyHaulItems.haulId, input.haulId));
          haulItems = items.map((i) => ({ name: i.name, note: i.note }));
        } else if (input.items?.length) {
          haulItems = input.items.map((i) => ({ name: i.name, note: i.note ?? null }));
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Log a few items first, then remix." });
        }

        const result = remixHaul(haulItems, input.track as GalleyTrack, 3);
        // Trying the Deeper Reset is a Free Passage Quest nudge.
        if (input.track === "reset") {
          await awardGalleyQuest(ctx.user.id, "galley-deeper-reset", "Tried the Deeper Reset in the Galley").catch(() => {});
        }
        let remixId: number | null = null;
        if (input.save && result.dishes.length) {
          const [res] = await d.insert(galleyRemixes).values({
            haulId: input.haulId ?? null,
            bookingId,
            userId: ctx.user.id,
            dishName: result.dishes[0].name.slice(0, 200),
            engine: "deterministic",
            cardSlugs: result.dishes.map((x) => x.cardSlug),
            recipe: result.dishes as unknown as object,
            visibility: "crew",
          });
          remixId = (res as { insertId?: number }).insertId ?? null;
        }
        return { ...result, remixId };
      }),

    // Roll the Tide: one random valid dish from the haul (Galley spec 6g). No save.
    roll: protectedProcedure
      .input(z.object({
        haulId: z.number().int().optional(),
        items: z.array(z.object({ name: z.string().min(1).max(200), note: z.string().max(500).optional() })).max(60).optional(),
        track: z.enum(["table", "reset"]).default("table"),
        seed: z.number().int().min(0).max(1_000_000).default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_galley_remix");
        const d = await db();
        let haulItems: HaulItemInput[] = [];
        if (input.haulId) {
          await assertHaulOwner(d, input.haulId, ctx.user.id);
          const items = await d.select().from(galleyHaulItems).where(eq(galleyHaulItems.haulId, input.haulId));
          haulItems = items.map((i) => ({ name: i.name, note: i.note }));
        } else if (input.items?.length) {
          haulItems = input.items.map((i) => ({ name: i.name, note: i.note ?? null }));
        }
        return { dish: rollRemix(haulItems, input.track as GalleyTrack, input.seed) };
      }),

    // The Ship's Cook: AI dish from the haul + photos + a free-text ask. Reuses the
    // vision pipeline. Persists the conversation, the dish, and the photos.
    cook: protectedProcedure
      .input(z.object({
        haulId: z.number().int().optional(),
        remixId: z.number().int().optional(),
        message: z.string().min(1).max(1000),
        track: z.enum(["table", "reset"]).default("table"),
        photoUrls: z.array(z.string().max(512)).max(4).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_galley_cook");
        const d = await db();
        const message = sanitizeInput(input.message);
        let bookingId: number | null = null;
        let haulItems: Array<{ name: string; note?: string | null }> = [];
        if (input.haulId) {
          const haul = await assertHaulOwner(d, input.haulId, ctx.user.id);
          bookingId = haul.bookingId ?? null;
          const items = await d.select().from(galleyHaulItems).where(eq(galleyHaulItems.haulId, input.haulId));
          haulItems = items.map((i) => ({ name: i.name, note: i.note }));
        }
        const safePhotos = assetPhotoUrls(input.photoUrls, 4);

        // Continue an existing Cook thread (must belong to this crew member).
        let existing: typeof galleyRemixes.$inferSelect | undefined;
        let history: Array<{ role: "user" | "assistant"; content: string }> = [];
        if (input.remixId) {
          const [row] = await d.select().from(galleyRemixes).where(eq(galleyRemixes.id, input.remixId)).limit(1);
          if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Remix not found." });
          existing = row;
          history = (Array.isArray(row.conversation) ? (row.conversation as Array<{ role?: unknown; content?: unknown }>) : [])
            .filter((m): m is { role: "user" | "assistant"; content: string } =>
              Boolean(m) && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
        }

        const { reply, dish } = await askShipCook({
          message,
          track: input.track as GalleyTrack,
          haulItems,
          history,
          photoUrls: safePhotos,
        });

        const turn = [
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: reply },
        ];
        let remixId = input.remixId ?? null;
        if (existing) {
          const convo = Array.isArray(existing.conversation) ? (existing.conversation as unknown[]) : [];
          await d.update(galleyRemixes).set({
            conversation: [...convo, ...turn].slice(-40),
            ...(dish ? { dishName: dish.dishName.slice(0, 200), recipe: dish as unknown as object } : {}),
            ...(safePhotos.length ? { photoUrls: safePhotos } : {}),
          }).where(eq(galleyRemixes.id, existing.id));
        } else {
          const [res] = await d.insert(galleyRemixes).values({
            haulId: input.haulId ?? null,
            bookingId,
            userId: ctx.user.id,
            dishName: (dish?.dishName ?? "The Cook's dish").slice(0, 200),
            engine: "cook",
            recipe: dish ? (dish as unknown as object) : null,
            conversation: turn,
            photoUrls: safePhotos.length ? safePhotos : null,
            visibility: "crew",
          });
          remixId = (res as { insertId?: number }).insertId ?? null;
        }
        return { reply, dish, remixId };
      }),

    // My saved remixes, newest first (the voyage log's Galley strip reads these).
    myRemixes: protectedProcedure.query(async ({ ctx }) => {
      const d = await db();
      return d.select().from(galleyRemixes).where(eq(galleyRemixes.userId, ctx.user.id)).orderBy(desc(galleyRemixes.createdAt)).limit(100);
    }),

    // Submit a favorite remix to the shared cookbook. Never auto-publishes: this
    // sets the crew's visibility choice and queues it for admin approval (mirrors
    // the resolved_case -> knowledge chunk pattern). It goes live only on approval.
    publishToCookbook: protectedProcedure
      .input(z.object({ remixId: z.number().int(), visibility: z.enum(["crew", "public"]).default("public") }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_galley_publish");
        const d = await db();
        const [row] = await d.select().from(galleyRemixes).where(eq(galleyRemixes.id, input.remixId)).limit(1);
        if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Remix not found." });
        await d.update(galleyRemixes).set({
          visibility: input.visibility,
          cookbookStatus: "pending",
          publishedToCookbook: false,
          submittedToCookbookAt: new Date(),
        }).where(eq(galleyRemixes.id, input.remixId));
        await notifyOwner({ title: "Galley: a crew submitted a remix", content: `"${row.dishName}" submitted to the cookbook for review.` }).catch(() => {});
        return { ok: true, pendingReview: true };
      }),

    // The community idea board: approved, public remixes ("From the Crews").
    publicFeed: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        const d = await db();
        const rows = await d
          .select({
            id: galleyRemixes.id, dishName: galleyRemixes.dishName, engine: galleyRemixes.engine,
            recipe: galleyRemixes.recipe, photoUrls: galleyRemixes.photoUrls, createdAt: galleyRemixes.createdAt,
            userId: galleyRemixes.userId,
          })
          .from(galleyRemixes)
          .where(and(eq(galleyRemixes.publishedToCookbook, true), eq(galleyRemixes.visibility, "public")))
          .orderBy(desc(galleyRemixes.createdAt))
          .limit(input?.limit ?? 60);
        if (!rows.length) return [];
        const ids = Array.from(new Set(rows.map((r) => r.userId)));
        const crews = await d.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, ids));
        const byId = new Map(crews.map((c) => [c.id, c]));
        return rows.map((r) => ({
          id: r.id, dishName: r.dishName, engine: r.engine, recipe: r.recipe, photoUrls: r.photoUrls, createdAt: r.createdAt,
          crewName: byId.get(r.userId)?.name ?? "A crew",
          crewHandle: byId.get(r.userId)?.handle ?? null,
        }));
      }),
  }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    listBookings: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipBookings).orderBy(desc(shipBookings.createdAt)).limit(300);
    }),

    approveBooking: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipBookings).set({ status: "platform_pending" }).where(eq(shipBookings.id, input.id));
      const [b] = await d.select().from(shipBookings).where(eq(shipBookings.id, input.id)).limit(1);
      if (b) {
        const [u] = await d.select().from(users).where(eq(users.id, b.userId)).limit(1);
        if (u?.email) await emailBookingApproved(u.email, b);
      }
      return { ok: true };
    }),

    markPlatformComplete: adminProcedure
      .input(z.object({ id: z.number().int(), platformBookingRef: z.string().max(255) }))
      .mutation(async ({ input }) => {
        const d = await db();
        await d.update(shipBookings).set({ status: "confirmed", platformBookingRef: sanitizeInput(input.platformBookingRef) }).where(eq(shipBookings.id, input.id));
        const [b] = await d.select().from(shipBookings).where(eq(shipBookings.id, input.id)).limit(1);
        if (b) {
          const [u] = await d.select().from(users).where(eq(users.id, b.userId)).limit(1);
          if (u?.email) await emailBookingConfirmed(u.email, b);
        }
        return { ok: true };
      }),

    setBookingStatus: adminProcedure
      .input(z.object({ id: z.number().int(), status: z.enum(["requested", "approved", "platform_pending", "confirmed", "active", "completed", "cancelled"]), isWinnerVoyage: z.boolean().optional(), isGifted: z.boolean().optional(), overrideOrientation: z.boolean().optional(), overrideReason: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        // The orientation gate (SHIP_V5_FLYWHEEL Section 5): a booking cannot move
        // to `active` until the Keeper has run the 2-hour walkthrough, unless an
        // admin overrides it with a logged reason.
        if (input.status === "active") {
          const [b] = await d.select().from(shipBookings).where(eq(shipBookings.id, input.id)).limit(1);
          if (b && !b.orientationCompletedAt) {
            if (!input.overrideOrientation) {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No captain sails her without the handing of the keys. Mark orientation complete first, or override with a reason." });
            }
            console.warn(`[ship] orientation gate overridden for booking ${input.id} by user ${ctx.user.id}: ${input.overrideReason ?? "(no reason)"}`);
          }
        }
        // Mint a Homecoming slug when the voyage completes (SHIP_V5_FLYWHEEL §2).
        let publicSlug: string | undefined;
        if (input.status === "completed") {
          const [b] = await d.select({ slug: shipBookings.publicSlug }).from(shipBookings).where(eq(shipBookings.id, input.id)).limit(1);
          if (!b?.slug) publicSlug = `voyage-${crypto.randomBytes(5).toString("hex")}`;
        }
        await d.update(shipBookings).set({ status: input.status, ...(publicSlug ? { publicSlug } : {}), ...(input.isWinnerVoyage != null ? { isWinnerVoyage: input.isWinnerVoyage } : {}), ...(input.isGifted != null ? { isGifted: input.isGifted } : {}) }).where(eq(shipBookings.id, input.id));
        return { ok: true, publicSlug };
      }),
    // The Keeper (or an admin) marks the orientation walkthrough complete, which
    // unlocks the booking to become `active` and the driving-day features.
    completeOrientation: adminProcedure
      .input(z.object({ bookingId: z.number().int(), complete: z.boolean().default(true) }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        await d.update(shipBookings).set({
          orientationCompletedAt: input.complete ? new Date() : null,
          orientationKeeperId: input.complete ? ctx.user.id : null,
        }).where(eq(shipBookings.id, input.bookingId));
        return { ok: true };
      }),

    listLocations: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipLocations).orderBy(desc(shipLocations.createdAt)).limit(1000);
    }),

    verifyLocation: adminProcedure.input(z.object({ id: z.number().int(), isVerified: z.boolean().default(true) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipLocations).set({ isVerified: input.isVerified }).where(eq(shipLocations.id, input.id));
      // Auto-verify the "add a location that gets verified" quest action for the adder.
      if (input.isVerified) {
        const [loc] = await d.select().from(shipLocations).where(eq(shipLocations.id, input.id)).limit(1);
        if (loc?.addedByUserId) {
          // Find the map-location quest action by slug convention.
          const [mapAction] = await d.select().from(shipQuestActions).where(eq(shipQuestActions.slug, "add-map-location")).limit(1);
          if (mapAction) {
            const [existing] = await d.select().from(shipQuestCompletions).where(and(eq(shipQuestCompletions.userId, loc.addedByUserId), eq(shipQuestCompletions.actionId, mapAction.id))).limit(1);
            if (existing && existing.status !== "verified") {
              await d.update(shipQuestCompletions).set({ status: "verified", verifiedAt: new Date() }).where(eq(shipQuestCompletions.id, existing.id));
              await rewardVerifiedCompletion(existing.id);
            } else if (!existing) {
              const [res] = await d.insert(shipQuestCompletions).values({ userId: loc.addedByUserId, actionId: mapAction.id, status: "verified", verifiedAt: new Date(), note: `Verified location: ${loc.name}` });
              const cid = (res as { insertId?: number }).insertId;
              if (cid) await rewardVerifiedCompletion(cid);
            }
          }
        }
      }
      return { ok: true };
    }),

    // Coverage / gap view: verified boondocks for the 60-min-drive proxy circles
    // over the Tier 1+2 voyage zone, so gaps are visible and research is targeted.
    coverage: adminProcedure.query(async () => {
      const d = await db();
      const boondocks = await d
        .select({
          id: shipLocations.id, name: shipLocations.name, lat: shipLocations.lat, lng: shipLocations.lng,
          maxRigLengthFt: shipLocations.maxRigLengthFt, isVerified: shipLocations.isVerified,
          lastVerifiedAt: shipLocations.lastVerifiedAt,
        })
        .from(shipLocations)
        .where(eq(shipLocations.type, "boondock"))
        .orderBy(desc(shipLocations.isVerified));
      const [{ count: verifiedCount }] = await d
        .select({ count: sql<number>`count(*)` })
        .from(shipLocations)
        .where(and(eq(shipLocations.type, "boondock"), eq(shipLocations.isVerified, true)));
      return { boondocks, verifiedCount: Number(verifiedCount ?? 0) };
    }),

    // Field-verification flags queue.
    listFlags: adminProcedure.query(async () => {
      const d = await db();
      return d
        .select({
          id: shipLocationFlags.id, locationId: shipLocationFlags.locationId, reason: shipLocationFlags.reason,
          createdAt: shipLocationFlags.createdAt, userId: shipLocationFlags.userId,
          locationName: shipLocations.name, locationSlug: shipLocations.slug,
        })
        .from(shipLocationFlags)
        .leftJoin(shipLocations, eq(shipLocations.id, shipLocationFlags.locationId))
        .where(isNull(shipLocationFlags.resolvedAt))
        .orderBy(desc(shipLocationFlags.createdAt))
        .limit(300);
    }),

    resolveFlag: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const d = await db();
      await d.update(shipLocationFlags).set({ resolvedAt: new Date(), resolvedByUserId: ctx.user.id }).where(eq(shipLocationFlags.id, input.id));
      return { ok: true };
    }),

    listPendingCompletions: adminProcedure.query(async () => {
      const d = await db();
      const rows = await d
        .select({
          id: shipQuestCompletions.id, userId: shipQuestCompletions.userId, actionId: shipQuestCompletions.actionId,
          proofUrl: shipQuestCompletions.proofUrl, note: shipQuestCompletions.note, createdAt: shipQuestCompletions.createdAt,
          actionTitle: shipQuestActions.title, points: shipQuestActions.points,
          name: users.name, handle: users.handle,
        })
        .from(shipQuestCompletions)
        .leftJoin(shipQuestActions, eq(shipQuestActions.id, shipQuestCompletions.actionId))
        .leftJoin(users, eq(users.id, shipQuestCompletions.userId))
        .where(eq(shipQuestCompletions.status, "pending"))
        .orderBy(asc(shipQuestCompletions.createdAt))
        .limit(300);
      return rows;
    }),

    listPendingPlantings: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipSeedPlantings).where(eq(shipSeedPlantings.isVerified, false)).orderBy(desc(shipSeedPlantings.plantedAt)).limit(300);
    }),

    reviewCompletion: adminProcedure
      .input(z.object({ id: z.number().int(), status: z.enum(["verified", "rejected"]) }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        await d.update(shipQuestCompletions).set({ status: input.status, verifiedByUserId: ctx.user.id, verifiedAt: input.status === "verified" ? new Date() : null }).where(eq(shipQuestCompletions.id, input.id));
        if (input.status === "verified") {
          await rewardVerifiedCompletion(input.id);
          // Completing the quest puts the crew in the draw. Free voyages are
          // drawn at random at each booking milestone (admin.drawFreeVoyageWinner),
          // not awarded by finish order, so there is nothing to notify here.
        }
        return { ok: true };
      }),

    // Draw a free-voyage winner, weighted by tickets, from everyone in the draw
    // (threshold entrants + approved nominees) who has not already won. The draw
    // is logged to ship_giveaway_drawings (eligible set, weights, seed, roll) so
    // it is reproducible and auditable. Does not create the booking; the admin
    // arranges it, then flags it a winner voyage.
    drawFreeVoyageWinner: adminProcedure.mutation(async ({ ctx }) => {
      const d = await db();
      const { standings } = await loadQuestStandings();

      // Prior winners: anyone holding a winner voyage, plus prior draw winners.
      const priorBookings = await d.select({ userId: shipBookings.userId }).from(shipBookings).where(eq(shipBookings.isWinnerVoyage, true));
      const priorDraws = await d.select({ winnerUserId: shipGiveawayDrawings.winnerUserId, winnerNominationId: shipGiveawayDrawings.winnerNominationId }).from(shipGiveawayDrawings);
      // Demo accounts seeded for launch social proof (@shared/shipDemo) stay on the
      // draw board but can never win: excluding them here means the draw simply
      // lands on a real crew, and the audit records them as excluded. No redraw.
      const demoAccounts = await d
        .select({ userId: users.id })
        .from(users)
        .where(like(users.openId, `${DEMO_ACCOUNT_OPENID_PREFIX}%`));
      const excludeUserIds = new Set<number>([
        ...priorBookings.map((b) => b.userId),
        ...priorDraws.map((p) => p.winnerUserId).filter((n): n is number => n != null),
        ...demoAccounts.map((u) => u.userId),
      ]);
      const wonNominationIds = new Set<number>(priorDraws.map((p) => p.winnerNominationId).filter((n): n is number => n != null));

      // Threshold entrants: tickets equal to points.
      const entries: DrawEntry[] = standings
        .filter((s) => s.isEntered)
        .map((s) => ({ userId: s.userId, tickets: s.tickets, kind: "threshold" as const, label: `user:${s.userId}` }));

      // Approved nominees: a flat ticket count. Skip nominations that already won.
      const approvedNoms = await d.select().from(shipNominations).where(eq(shipNominations.status, "approved_for_draw"));
      for (const nom of approvedNoms) {
        if (wonNominationIds.has(nom.id)) continue;
        entries.push({ userId: nom.nomineeUserId ?? null, nominationId: nom.id, tickets: NOMINATION_TICKETS, kind: "nomination", label: `nomination:${nom.id} (${nom.nomineeName})` });
      }

      const seed = Math.floor(Math.random() * 2_147_483_647);
      const result = weightedDraw(entries, seed, excludeUserIds);
      if (!result) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No one is in the draw yet." });
      const { winner, audit } = result;

      // Resolve the winner for notification + display.
      let name: string | null = null;
      let handle: string | null = null;
      let winnerEmail: string | null = null;
      if (winner.userId) {
        const [u] = await d.select().from(users).where(eq(users.id, winner.userId)).limit(1);
        name = u?.name ?? null;
        handle = u?.handle ?? null;
        winnerEmail = u?.email ?? null;
      } else if (winner.nominationId) {
        const [nom] = await d.select().from(shipNominations).where(eq(shipNominations.id, winner.nominationId)).limit(1);
        name = nom?.nomineeName ?? null;
        winnerEmail = nom?.nomineeContact && nom.nomineeContact.includes("@") ? nom.nomineeContact : null;
      }

      const eligibleCount = audit.entries.filter((e) => !e.excluded).length;
      await d.insert(shipGiveawayDrawings).values({
        drawnByUserId: ctx.user.id,
        seed,
        totalTickets: audit.totalTickets,
        roll: audit.roll.toFixed(4),
        eligibleCount,
        winnerUserId: winner.userId ?? null,
        winnerNominationId: winner.nominationId ?? null,
        winnerLabel: winner.label ?? null,
        audit: audit as unknown as object,
      });

      if (winnerEmail) await emailQuestWinner(winnerEmail);
      return { userId: winner.userId ?? null, nominationId: winner.nominationId ?? null, name, handle, poolSize: eligibleCount, totalTickets: audit.totalTickets };
    }),

    // Referral auto-verification: called when a referred application is shortlisted.
    verifyReferralForApplication: adminProcedure.input(z.object({ applicationId: z.number().int() })).mutation(async ({ input }) => {
      const d = await db();
      const [app] = await d.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
      if (!app?.shipReferralUserId) return { ok: true, verified: 0 };
      const [action] = await d.select().from(shipQuestActions).where(eq(shipQuestActions.proofType, REFERRAL_PROOF)).limit(1);
      if (!action) return { ok: true, verified: 0 };
      const [existing] = await d.select().from(shipQuestCompletions).where(and(eq(shipQuestCompletions.userId, app.shipReferralUserId), eq(shipQuestCompletions.actionId, action.id))).limit(1);
      let cid: number | undefined;
      if (existing && existing.status !== "verified") {
        await d.update(shipQuestCompletions).set({ status: "verified", verifiedAt: new Date() }).where(eq(shipQuestCompletions.id, existing.id));
        cid = existing.id;
      } else if (!existing) {
        const [res] = await d.insert(shipQuestCompletions).values({ userId: app.shipReferralUserId, actionId: action.id, status: "verified", verifiedAt: new Date(), note: `Referred application shortlisted: ${app.projectName}` });
        cid = (res as { insertId?: number }).insertId;
      }
      if (cid) await rewardVerifiedCompletion(cid);
      return { ok: true, verified: cid ? 1 : 0 };
    }),

    verifyPlanting: adminProcedure.input(z.object({ id: z.number().int(), isVerified: z.boolean().default(true) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipSeedPlantings).set({ isVerified: input.isVerified }).where(eq(shipSeedPlantings.id, input.id));
      return { ok: true };
    }),

    listNominations: adminProcedure.query(async () => (await db()).select().from(shipNominations).orderBy(desc(shipNominations.createdAt)).limit(500)),
    // Approving a nomination for the draw (joint ReGen Civics + CORE review)
    // creates a draw entry at NOMINATION_TICKETS. If the nominee has no account,
    // link one by email if it exists and send the profile invite so they can
    // activate their entry and become reachable if drawn.
    reviewNomination: adminProcedure
      .input(z.object({ id: z.number().int(), status: z.enum(["submitted", "shortlisted", "selected", "approved_for_draw"]) }))
      .mutation(async ({ input }) => {
        const d = await db();
        const [nom] = await d.select().from(shipNominations).where(eq(shipNominations.id, input.id)).limit(1);
        if (!nom) throw new TRPCError({ code: "NOT_FOUND", message: "Nomination not found." });

        const patch: Partial<typeof shipNominations.$inferInsert> = { status: input.status };
        if (input.status === "approved_for_draw") {
          // Link an existing account by contact email, when we can.
          let nomineeUserId = nom.nomineeUserId;
          const email = nom.nomineeContact && nom.nomineeContact.includes("@") ? nom.nomineeContact : null;
          if (!nomineeUserId && email) {
            const [u] = await d.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
            if (u) nomineeUserId = u.id;
          }
          if (nomineeUserId) patch.nomineeUserId = nomineeUserId;
          if (!nom.inviteEmailSentAt && email) {
            await emailCrewProfileInvite(email, nom.nomineeName);
            patch.inviteEmailSentAt = new Date();
          }
        }
        await d.update(shipNominations).set(patch).where(eq(shipNominations.id, input.id));
        return { ok: true };
      }),

    // Crew profiles admin surface: list all, and mark a sponsored crew sailed
    // once the church books the week (isGifted, like a winner voyage).
    listCrewProfiles: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipCrewProfiles).orderBy(desc(shipCrewProfiles.createdAt)).limit(500);
    }),
    setCrewStatus: adminProcedure
      .input(z.object({ id: z.number().int(), status: z.enum(["draft", "published", "sponsored", "sailed"]) }))
      .mutation(async ({ input }) => {
        const d = await db();
        await d.update(shipCrewProfiles).set({ status: input.status }).where(eq(shipCrewProfiles.id, input.id));
        return { ok: true };
      }),
    listDrawings: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipGiveawayDrawings).orderBy(desc(shipGiveawayDrawings.createdAt)).limit(100);
    }),

    listApplications: adminProcedure
      .input(z.object({ kind: z.enum(["keeper", "fleet", "winter"]) }))
      .query(async ({ input }) => {
        const d = await db();
        if (input.kind === "keeper") return d.select().from(shipKeeperApplications).orderBy(desc(shipKeeperApplications.createdAt));
        if (input.kind === "fleet") return d.select().from(shipFleetApplications).orderBy(desc(shipFleetApplications.createdAt));
        return d.select().from(shipWinterHostApplications).orderBy(desc(shipWinterHostApplications.createdAt));
      }),

    setKeeperStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["submitted", "interviewing", "accepted", "declined"]) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipKeeperApplications).set({ status: input.status }).where(eq(shipKeeperApplications.id, input.id));
      return { ok: true };
    }),
    setFleetStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["submitted", "in_conversation", "joined"]) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipFleetApplications).set({ status: input.status }).where(eq(shipFleetApplications.id, input.id));
      return { ok: true };
    }),
    setWinterHostStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["submitted", "in_conversation", "accepted", "declined"]) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipWinterHostApplications).set({ status: input.status }).where(eq(shipWinterHostApplications.id, input.id));
      return { ok: true };
    }),

    // Dataset door queue.
    listDatasetOffers: adminProcedure.query(async () => (await db()).select().from(shipDatasetOffers).orderBy(desc(shipDatasetOffers.createdAt)).limit(500)),
    setDatasetOfferStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["submitted", "reviewing", "imported", "declined"]) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipDatasetOffers).set({ status: input.status }).where(eq(shipDatasetOffers.id, input.id));
      return { ok: true };
    }),

    postPosition: adminProcedure.input(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), note: z.string().max(255).optional() })).mutation(async ({ input }) => {
      const d = await db();
      await d.insert(shipPositionPings).values({ lat: input.lat, lng: input.lng, source: "manual", note: input.note ? sanitizeInput(input.note) : null });
      return { ok: true };
    }),

    // Pricing windows + blackouts.
    listPricingWindows: adminProcedure.query(async () => (await db()).select().from(shipPricingWindows).orderBy(asc(shipPricingWindows.startDate))),
    addPricingWindow: adminProcedure.input(z.object({ startDate: YMD, endDate: YMD, multiplier: z.number().min(0.1).max(5), label: z.string().max(120).optional() })).mutation(async ({ input }) => {
      const d = await db();
      await d.insert(shipPricingWindows).values({ startDate: input.startDate, endDate: input.endDate, multiplier: input.multiplier.toFixed(2), label: input.label ? sanitizeInput(input.label) : null });
      return { ok: true };
    }),
    deletePricingWindow: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const d = await db();
      await d.delete(shipPricingWindows).where(eq(shipPricingWindows.id, input.id));
      return { ok: true };
    }),
    addBlackout: adminProcedure.input(z.object({ startDate: YMD, endDate: YMD, reason: z.string().max(255).optional() })).mutation(async ({ input }) => {
      const d = await db();
      await d.insert(shipBlackoutDates).values({ startDate: input.startDate, endDate: input.endDate, reason: input.reason ? sanitizeInput(input.reason) : null });
      return { ok: true };
    }),
    listBlackouts: adminProcedure.query(async () => (await db()).select().from(shipBlackoutDates).orderBy(asc(shipBlackoutDates.startDate))),
    deleteBlackout: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const d = await db();
      await d.delete(shipBlackoutDates).where(eq(shipBlackoutDates.id, input.id));
      return { ok: true };
    }),

    // Ship's Inventory CRUD (SHIP_MAINTAINER_INVENTORY Section 2).
    listInventory: adminProcedure.query(async () => (await db()).select().from(shipInventoryItems).orderBy(asc(shipInventoryItems.sortOrder), asc(shipInventoryItems.name))),
    upsertInventory: adminProcedure
      .input(z.object({
        id: z.number().int().optional(),
        name: z.string().min(1).max(160),
        slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/, "lowercase, digits, and dashes only"),
        category: z.enum(["adventure", "galley", "water", "power", "connectivity", "tools", "magic", "comfort", "safety"]),
        description: z.string().max(4000).optional(),
        lore: z.string().max(2000).optional(),
        iconUrl: z.string().max(512).optional(),
        photoUrl: z.string().max(512).optional(),
        quantity: z.number().int().min(0).max(9999).default(1),
        storagePlace: z.string().max(200).optional(),
        activityTags: z.array(z.string().max(40)).max(20).optional(),
        isVisible: z.boolean().default(true),
        isGearChecked: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
        comingYear2: z.boolean().default(false),
        // Nested tree + physical-manifest merge (0210_ship_inventory_nesting.sql).
        parentId: z.number().int().nullable().optional(),
        isContainer: z.boolean().default(false),
        provenance: z.enum(["curated", "transcribed", "curator_added"]).default("curated"),
        zone: z.string().max(40).optional(),
        unit: z.string().max(40).optional(),
        itemCondition: z.string().max(60).optional(),
        confidence: z.string().max(12).optional(),
        sourceVideo: z.string().max(120).optional(),
        sourceTimestamp: z.string().max(12).optional(),
        frameUrl: z.string().max(512).optional(),
        manifestCategory: z.string().max(40).optional(),
      }))
      .mutation(async ({ input }) => {
        const d = await db();
        // Resolve the parent, guarding against cycles: never an item's own id, and
        // never one of its descendants (that would orphan the whole subtree from the
        // top-level view). This is the procedure-layer integrity the schema relies on.
        let parentId = input.parentId && input.parentId !== input.id ? input.parentId : null;
        if (parentId && input.id) {
          const nodes = await d
            .select({ id: shipInventoryItems.id, parentId: shipInventoryItems.parentId })
            .from(shipInventoryItems);
          const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
          let cur: number | null | undefined = parentId;
          const seen = new Set<number>();
          while (cur != null && !seen.has(cur)) {
            if (cur === input.id) { parentId = null; break; } // proposed parent is under this item
            seen.add(cur);
            cur = parentOf.get(cur);
          }
        }
        const values = {
          name: sanitizeInput(input.name),
          slug: input.slug,
          category: input.category,
          description: input.description ? sanitizeInput(input.description) : null,
          lore: input.lore ? sanitizeInput(input.lore) : null,
          iconUrl: input.iconUrl || null,
          photoUrl: input.photoUrl || null,
          quantity: input.quantity,
          storagePlace: input.storagePlace ? sanitizeInput(input.storagePlace) : null,
          activityTags: input.activityTags ?? [],
          isVisible: input.isVisible,
          isGearChecked: input.isGearChecked,
          sortOrder: input.sortOrder,
          comingYear2: input.comingYear2,
          parentId,
          isContainer: input.isContainer,
          provenance: input.provenance,
          zone: input.zone ? sanitizeInput(input.zone) : null,
          unit: input.unit ? sanitizeInput(input.unit) : null,
          itemCondition: input.itemCondition ? sanitizeInput(input.itemCondition) : null,
          confidence: input.confidence || null,
          sourceVideo: input.sourceVideo || null,
          sourceTimestamp: input.sourceTimestamp || null,
          frameUrl: input.frameUrl || null,
          manifestCategory: input.manifestCategory ? sanitizeInput(input.manifestCategory) : null,
        };
        if (input.id) {
          await d.update(shipInventoryItems).set(values).where(eq(shipInventoryItems.id, input.id));
          return { id: input.id };
        }
        const [res] = await d.insert(shipInventoryItems).values(values);
        return { id: (res as { insertId?: number }).insertId ?? null };
      }),
    deleteInventory: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const d = await db();
      await d.delete(shipInventoryItems).where(eq(shipInventoryItems.id, input.id));
      return { ok: true };
    }),

    // The Shipwright: cases queue, resolution, and approve-into-KB. Escalations
    // surface first. Bad advice never compounds automatically: a resolved case
    // becomes a knowledge chunk only when Rye or the Keeper approves it.
    listMaintenanceCases: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipMaintenanceCases).orderBy(desc(shipMaintenanceCases.isEscalation), desc(shipMaintenanceCases.createdAt)).limit(500);
    }),
    resolveMaintenanceCase: adminProcedure
      .input(z.object({
        id: z.number().int(),
        status: z.enum(["open", "advised", "resolved", "escalated"]),
        resolution: z.string().max(4000).optional(),
        whatWorked: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
        const d = await db();
        await d.update(shipMaintenanceCases).set({
          status: input.status,
          resolution: input.resolution ? sanitizeInput(input.resolution) : null,
          whatWorked: input.whatWorked ? sanitizeInput(input.whatWorked) : null,
          resolvedAt: input.status === "resolved" ? new Date() : null,
        }).where(eq(shipMaintenanceCases.id, input.id));
        return { ok: true };
      }),
    approveCaseIntoKb: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const d = await db();
        const [c] = await d.select().from(shipMaintenanceCases).where(eq(shipMaintenanceCases.id, input.id)).limit(1);
        if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Case not found." });
        if (!c.resolution) throw new TRPCError({ code: "BAD_REQUEST", message: "Resolve the case first, so there is a fix to record." });
        if (c.approvedIntoKb) return { ok: true, already: true };
        const content = [c.description ? `Symptom: ${c.description}` : "", c.resolution ? `Fix: ${c.resolution}` : "", c.whatWorked ? `What worked: ${c.whatWorked}` : ""].filter(Boolean).join("\n");
        await d.insert(shipKnowledgeChunks).values({
          title: c.title,
          content,
          system: c.system,
          sourceType: "resolved_case",
          sourceRef: `case #${c.id}`,
          tags: [],
          isApproved: true,
        });
        await d.update(shipMaintenanceCases).set({ approvedIntoKb: true }).where(eq(shipMaintenanceCases.id, input.id));
        return { ok: true };
      }),
    listKnowledgeChunks: adminProcedure.query(async () => {
      const d = await db();
      return d.select().from(shipKnowledgeChunks).orderBy(desc(shipKnowledgeChunks.createdAt)).limit(500);
    }),
    // Add ship knowledge directly: paste a manual section, a service bulletin,
    // or forum wisdom, pick the system, done. Approved immediately since only
    // admins can call this; the Shipwright can use it on the next question.
    addKnowledgeChunk: adminProcedure
      .input(z.object({
        title: z.string().min(2).max(255),
        content: z.string().min(10).max(8000),
        system: z.enum([
          "chassis", "engine", "propane", "electrical", "plumbing", "slides", "generator",
          "appliances", "starlink", "water_filtration", "tires_brakes", "hvac", "general",
        ]).default("general"),
        sourceType: z.enum(["manual", "service_bulletin", "forum_wisdom"]).default("manual"),
        sourceRef: z.string().max(512).optional(),
      }))
      .mutation(async ({ input }) => {
        const d = await db();
        const [res] = await d.insert(shipKnowledgeChunks).values({
          title: sanitizeInput(input.title),
          content: sanitizeInput(input.content),
          system: input.system,
          sourceType: input.sourceType,
          sourceRef: input.sourceRef ? sanitizeInput(input.sourceRef) : null,
          tags: [],
          isApproved: true,
        });
        return { id: (res as { insertId?: number }).insertId ?? null };
      }),
    deleteKnowledgeChunk: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const d = await db();
      await d.delete(shipKnowledgeChunks).where(eq(shipKnowledgeChunks.id, input.id));
      return { ok: true };
    }),
    approveKnowledgeChunk: adminProcedure.input(z.object({ id: z.number().int(), isApproved: z.boolean().default(true) })).mutation(async ({ input }) => {
      const d = await db();
      await d.update(shipKnowledgeChunks).set({ isApproved: input.isApproved }).where(eq(shipKnowledgeChunks.id, input.id));
      return { ok: true };
    }),

    // Crew list: the demand signal (confirmed signups + interest counts).
    crewListSummary: adminProcedure.query(async () => {
      const d = await db();
      const rows = await d.select({ interests: shipCrewListSignups.interests, confirmedAt: shipCrewListSignups.confirmedAt }).from(shipCrewListSignups);
      const byInterest: Record<string, number> = {};
      let confirmed = 0;
      for (const r of rows) {
        if (r.confirmedAt) confirmed++;
        for (const i of (Array.isArray(r.interests) ? (r.interests as string[]) : [])) byInterest[i] = (byInterest[i] ?? 0) + 1;
      }
      return { total: rows.length, confirmed, byInterest };
    }),

    // ── Galley cookbook moderation ──────────────────────────────────────────────
    // Crew submissions to the shared cookbook queue here. Approving flips the
    // remix live into the public "From the Crews" section; nothing auto-publishes.
    listCookbookSubmissions: adminProcedure.query(async () => {
      const d = await db();
      const rows = await d
        .select()
        .from(galleyRemixes)
        .where(notInArray(galleyRemixes.cookbookStatus, ["none"]))
        .orderBy(desc(galleyRemixes.submittedToCookbookAt))
        .limit(300);
      if (!rows.length) return [];
      const ids = Array.from(new Set(rows.map((r) => r.userId)));
      const crews = await d.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, ids));
      const byId = new Map(crews.map((c) => [c.id, c]));
      return rows.map((r) => ({ ...r, crewName: byId.get(r.userId)?.name ?? "A crew", crewHandle: byId.get(r.userId)?.handle ?? null }));
    }),
    reviewCookbookSubmission: adminProcedure
      .input(z.object({ id: z.number().int(), status: z.enum(["approved", "rejected"]) }))
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        await d.update(galleyRemixes).set({
          cookbookStatus: input.status,
          publishedToCookbook: input.status === "approved",
          approvedByUserId: input.status === "approved" ? ctx.user.id : null,
        }).where(eq(galleyRemixes.id, input.id));
        return { ok: true };
      }),
  }),
});
