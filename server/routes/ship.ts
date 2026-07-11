/**
 * ship router - The ReGen Ship (CORE program).
 *
 * A regenerative pirate ship + the ReGen Fleet. Bookings (our calendar is the
 * source of truth; the insured rental is a separate legal charge), the treasure
 * map, the AI concierge, the Maiden Voyage Quest, seed plantings, the public
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
import { and, or, eq, desc, asc, inArray, sql, gte, isNull, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  shipLocations, shipLocationFlags, shipBookings, shipBlackoutDates, shipPricingWindows,
  shipQuestActions, shipQuestCompletions, shipNominations, shipKeeperApplications,
  shipFleetApplications, shipWinterHostApplications, shipConciergeSessions,
  shipSeedPlantings, shipLogEntries, shipPassportStamps, shipPositionPings,
  shipDatasetOffers,
  shipCrewProfiles, shipGiveawayDrawings, churchDonations,
  users, questCompletions, applications,
} from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { sanitizeInput } from "../_core/security";
import { notifyOwner } from "../_core/notification";
import { creditPrivateTokens } from "../db/tokens";
import {
  isValidVoyageLength, nightsBetween, overlapsAny, computeVoyagePrice,
  computeQuestStandings, countEntered, maidenVoyageUserId, freeVoyagesUnlocked, percentBooked,
  weightedDraw, sponsorshipProgress, enumerateVoyageWeeks,
  type QuestCompletionRow, type DrawEntry,
} from "../lib/ship-logic";
import {
  MIN_GUESTS, MAX_GUESTS, SHIP_QUEST_SOURCE, shipFeatureFlags, isConciergeConfigured,
  MAX_FREE_VOYAGES, MAIDEN_YEAR_VOYAGE_TARGET,
  SHIP_SEASON_START_YMD, SHIP_BOOKING_HORIZON_WEEKS, SHIP_SEASONAL_BANDS,
  SHIP_ENTRY_THRESHOLD_POINTS, NOMINATION_TICKETS, CREW_SPONSOR_GOAL_CENTS, CREW_SPONSOR_PROGRAM_TAG,
} from "../lib/ship-config";
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
// The maiden voyage is free. Each 20% of the first year booked unlocks one more
// free voyage, up to six at 100%. Each is drawn at random from quest completers.
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

export const shipRouter = router({
  // What is live (concierge, offering/gift forms, platform listing, tracker).
  featureFlags: publicProcedure.query(() => shipFeatureFlags()),

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
          guests: z.number().int().min(MIN_GUESTS).max(MAX_GUESTS),
          dietCommitment: z.literal(true),
          waterDoctrineCommitment: z.literal(true),
          ref: z.string().max(40).optional(),
          notes: z.string().max(2000).optional(),
        })
        .refine((v) => isValidVoyageLength(v.startDate, v.endDate), {
          message: "A voyage is a whole number of 7-night cycles. Pick dates 7, 14, or 21 nights apart.",
          path: ["endDate"],
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
      const [res] = await d.insert(shipBookings).values({
        userId: ctx.user.id,
        startDate: input.startDate,
        endDate: input.endDate,
        guests: input.guests,
        status: "requested",
        dietCommitmentAt: now,
        waterDoctrineCommitmentAt: now,
        referredByUserId,
        notes: input.notes ? sanitizeInput(input.notes) : null,
      });
      const id = (res as { insertId?: number }).insertId ?? null;
      if (ctx.user.email) {
        await emailBookingReceived(ctx.user.email, { id: id ?? 0, startDate: input.startDate, endDate: input.endDate, guests: input.guests });
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
      .query(async ({ input }) => {
        const d = await db();
        const conds = [eq(shipLocations.bioregion, input?.bioregion ?? "cascadia")];
        if (input?.verifiedOnly) conds.push(eq(shipLocations.isVerified, true));
        if (input?.type) conds.push(eq(shipLocations.type, input.type as any));
        if (input?.fits40) conds.push(gte(shipLocations.maxRigLengthFt, 40));
        if (input?.hasWater) conds.push(isNotNull(shipLocations.waterQualityUrl));
        if (input?.freeCamping) conds.push(eq(shipLocations.type, "boondock"));
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
      .query(async ({ input }) => {
        const d = await db();
        if (!input.slug && input.id == null) return null;
        const where = input.slug ? eq(shipLocations.slug, input.slug) : eq(shipLocations.id, input.id!);
        const [row] = await d.select().from(shipLocations).where(where).limit(1);
        return row ?? null;
      }),

    // "Add to the map" (the FAB). Crew-sourced, unverified, feeds the admin
    // queue; verification auto-completes the Maiden Voyage add-a-location action.
    suggest: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(200),
          type: z.enum(["land_project", "spring", "waterfall", "lake", "geology", "forest", "food_forest", "seed_site", "boondock", "event_venue"]),
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

  // ── Maiden Voyage Quest ─────────────────────────────────────────────────────
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
      const maidenId = maidenVoyageUserId(standings);
      return {
        poolSize: countEntered(standings),
        entryThreshold: SHIP_ENTRY_THRESHOLD_POINTS,
        maidenVoyageUserId: maidenId,
        freeVoyage: await loadFreeVoyageStatus(),
        standings: standings.slice(0, 100).map((s) => ({
          ...s,
          isMaidenVoyage: s.userId === maidenId,
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
        return { id: (res as { insertId?: number }).insertId ?? null };
      }),

    generate: publicProcedure
      .input(z.object({ sessionId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_concierge_generate");
        if (!isConciergeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The concierge is not aboard yet. Please try again soon." });
        }
        const d = await db();
        const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.id, input.sessionId)).limit(1);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });

        const locs = await d.select().from(shipLocations).where(eq(shipLocations.isVerified, true));
        const locations: ConciergeLocation[] = locs.map((l) => ({ id: l.id, name: l.name, type: l.type, bioregion: l.bioregion, description: l.description }));
        try {
          const { itinerary, invalidIds } = await generateItinerary({
            answers: (session.profileAnswers as Record<string, unknown>) ?? {},
            locations,
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
      .input(z.object({ sessionId: z.number().int(), message: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit(ctx, "ship_concierge_chat");
        if (!isConciergeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The concierge is not aboard yet." });
        }
        const d = await db();
        const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.id, input.sessionId)).limit(1);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });

        const history = ((session.messages as Array<{ role: "user" | "assistant"; content: string }>) ?? []).concat({ role: "user", content: sanitizeInput(input.message) });
        const locs = await d.select().from(shipLocations).where(eq(shipLocations.isVerified, true));
        const locations: ConciergeLocation[] = locs.map((l) => ({ id: l.id, name: l.name, type: l.type, bioregion: l.bioregion, description: l.description }));
        const reply = await conciergeReply({ history, locations, itinerary: (session.itinerary as Itinerary | null) ?? null });
        const messages = history.concat({ role: "assistant", content: reply });
        await d.update(shipConciergeSessions).set({ messages }).where(eq(shipConciergeSessions.id, input.sessionId));
        return { reply, messages };
      }),

    getSession: publicProcedure.input(z.object({ sessionId: z.number().int() })).query(async ({ input }) => {
      const d = await db();
      const [session] = await d.select().from(shipConciergeSessions).where(eq(shipConciergeSessions.id, input.sessionId)).limit(1);
      return session ?? null;
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
      .input(z.object({ id: z.number().int(), status: z.enum(["requested", "approved", "platform_pending", "confirmed", "active", "completed", "cancelled"]), isWinnerVoyage: z.boolean().optional(), isGifted: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const d = await db();
        await d.update(shipBookings).set({ status: input.status, ...(input.isWinnerVoyage != null ? { isWinnerVoyage: input.isWinnerVoyage } : {}), ...(input.isGifted != null ? { isGifted: input.isGifted } : {}) }).where(eq(shipBookings.id, input.id));
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
      const excludeUserIds = new Set<number>([
        ...priorBookings.map((b) => b.userId),
        ...priorDraws.map((p) => p.winnerUserId).filter((n): n is number => n != null),
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
  }),
});
