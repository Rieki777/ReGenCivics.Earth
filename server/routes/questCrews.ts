/**
 * Multiplayer Mode: quest crew signups and crew lifecycle (Phase A).
 *
 * Quest definitions are file-based (shared/multiplayerQuests.ts); drafts never
 * accept signups. Crew formation itself is the deterministic cron job in
 * server/jobs/questCrewAssembly.ts; these procedures only write signups and
 * membership state. One active signup per quest per player, enforced here.
 * Token credits stay on the existing quest completion path (STEERING.md §5);
 * nothing in this router touches balances.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure, rateLimited } from "../_core/trpc";
import { getDb } from "../db";
import { sanitizeInput } from "../_core/security";
import { bioregions, questCrewMembers, questCrews, questCrewSignups, users } from "../../drizzle/schema";
import { getLiveMultiplayerQuest, liveMultiplayerQuests } from "@shared/multiplayerQuests";

const OPEN_CREW_STATUSES = ["forming", "ready", "active"] as const;

export const questCrewsRouter = router({
  /**
   * The live multiplayer quests plus aggregate crew counts per bioregion
   * (counts only, never member identities; the Signal's aggregate-only posture).
   */
  quests: publicProcedure.query(async () => {
    const quests = liveMultiplayerQuests();
    const db = await getDb();
    if (!db || quests.length === 0) {
      return { quests, aggregates: [] as QuestAggregate[] };
    }

    const questIds = quests.map((q) => q.questId);

    const openSignups = await db
      .select({ questId: questCrewSignups.questId, bioregionId: questCrewSignups.bioregionId })
      .from(questCrewSignups)
      .where(and(inArray(questCrewSignups.questId, questIds), eq(questCrewSignups.status, "open")));

    const crews = await db
      .select()
      .from(questCrews)
      .where(and(inArray(questCrews.questId, questIds), inArray(questCrews.status, [...OPEN_CREW_STATUSES])));

    const memberCounts = new Map<number, number>();
    if (crews.length > 0) {
      const members = await db
        .select({ crewId: questCrewMembers.crewId, status: questCrewMembers.status })
        .from(questCrewMembers)
        .where(inArray(questCrewMembers.crewId, crews.map((c) => c.id)));
      for (const m of members) {
        if (m.status === "left") continue;
        memberCounts.set(m.crewId, (memberCounts.get(m.crewId) ?? 0) + 1);
      }
    }

    const bioregionIds = new Set<number>([
      ...openSignups.map((s) => s.bioregionId),
      ...crews.map((c) => c.bioregionId),
    ]);
    const bioregionNames = new Map<number, string>();
    if (bioregionIds.size > 0) {
      const rows = await db
        .select({ id: bioregions.id, name: bioregions.name })
        .from(bioregions)
        .where(inArray(bioregions.id, [...bioregionIds]));
      for (const r of rows) bioregionNames.set(r.id, r.name);
    }

    const byKey = new Map<string, QuestAggregate>();
    const keyOf = (questId: string, bioregionId: number) => `${questId}:${bioregionId}`;
    const ensure = (questId: string, bioregionId: number): QuestAggregate => {
      const key = keyOf(questId, bioregionId);
      let agg = byKey.get(key);
      if (!agg) {
        agg = {
          questId,
          bioregionId,
          bioregionName: bioregionNames.get(bioregionId) ?? "Unknown bioregion",
          openSignups: 0,
          crews: [],
        };
        byKey.set(key, agg);
      }
      return agg;
    };
    for (const s of openSignups) ensure(s.questId, s.bioregionId).openSignups += 1;
    for (const c of crews) {
      ensure(c.questId, c.bioregionId).crews.push({
        status: c.status as (typeof OPEN_CREW_STATUSES)[number],
        memberCount: memberCounts.get(c.id) ?? 0,
        crewSize: c.crewSize,
      });
    }

    return { quests, aggregates: [...byKey.values()] };
  }),

  /** Sign up for a live multiplayer quest in a bioregion. Friend tier (signed in). */
  signup: protectedProcedure
    .use(rateLimited({ windowMs: 60_000, max: 5 }))
    .input(
      z.object({
        questId: z.string().min(1).max(100),
        bioregionId: z.number().int().positive(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quest = getLiveMultiplayerQuest(input.questId);
      if (!quest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That quest is not open for crews right now." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [bioregion] = await db
        .select()
        .from(bioregions)
        .where(and(eq(bioregions.id, input.bioregionId), eq(bioregions.approved, 1)))
        .limit(1);
      if (!bioregion) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a bioregion from the list." });
      }

      // One active signup per quest per player.
      const existingSignup = await db
        .select({ id: questCrewSignups.id })
        .from(questCrewSignups)
        .where(
          and(
            eq(questCrewSignups.userId, ctx.user.id),
            eq(questCrewSignups.questId, input.questId),
            eq(questCrewSignups.status, "open"),
          ),
        )
        .limit(1);
      if (existingSignup.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "You're already signed up for this quest." });
      }

      // Already on a live crew for this quest counts as active too.
      const activeMembership = await db
        .select({ id: questCrewMembers.id })
        .from(questCrewMembers)
        .innerJoin(questCrews, eq(questCrews.id, questCrewMembers.crewId))
        .where(
          and(
            eq(questCrewMembers.userId, ctx.user.id),
            inArray(questCrewMembers.status, ["joined", "completed"]),
            eq(questCrews.questId, input.questId),
            inArray(questCrews.status, [...OPEN_CREW_STATUSES]),
          ),
        )
        .limit(1);
      if (activeMembership.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "You're already on a crew for this quest." });
      }

      await db.insert(questCrewSignups).values({
        userId: ctx.user.id,
        questId: input.questId,
        bioregionId: input.bioregionId,
        note: input.note ? sanitizeInput(input.note) : null,
      });
      return { ok: true };
    }),

  /** Withdraw an open signup (before a crew forms around it). */
  cancelSignup: protectedProcedure
    .input(z.object({ signupId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [signup] = await db
        .select()
        .from(questCrewSignups)
        .where(eq(questCrewSignups.id, input.signupId))
        .limit(1);
      if (!signup || signup.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Signup not found." });
      }
      if (signup.status !== "open") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This signup already joined a crew." });
      }
      await db
        .update(questCrewSignups)
        .set({ status: "cancelled" })
        .where(eq(questCrewSignups.id, input.signupId));
      return { ok: true };
    }),

  /** The signed-in player's open signups, with quest and bioregion names. */
  mySignups: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: questCrewSignups.id,
        questId: questCrewSignups.questId,
        bioregionId: questCrewSignups.bioregionId,
        bioregionName: bioregions.name,
        note: questCrewSignups.note,
        createdAt: questCrewSignups.createdAt,
      })
      .from(questCrewSignups)
      .innerJoin(bioregions, eq(bioregions.id, questCrewSignups.bioregionId))
      .where(and(eq(questCrewSignups.userId, ctx.user.id), eq(questCrewSignups.status, "open")))
      .orderBy(desc(questCrewSignups.createdAt));
    return rows;
  }),

  /** The signed-in player's crews (all statuses except crews they left). */
  myCrews: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const myMemberships = await db
      .select()
      .from(questCrewMembers)
      .where(and(eq(questCrewMembers.userId, ctx.user.id), inArray(questCrewMembers.status, ["joined", "completed"])));
    if (myMemberships.length === 0) return [];

    const crewIds = myMemberships.map((m) => m.crewId);
    const crews = await db.select().from(questCrews).where(inArray(questCrews.id, crewIds));
    const allMembers = await db
      .select({
        crewId: questCrewMembers.crewId,
        status: questCrewMembers.status,
        name: users.name,
        handle: users.handle,
      })
      .from(questCrewMembers)
      .innerJoin(users, eq(users.id, questCrewMembers.userId))
      .where(inArray(questCrewMembers.crewId, crewIds));
    const bioregionRows = await db
      .select({ id: bioregions.id, name: bioregions.name })
      .from(bioregions)
      .where(inArray(bioregions.id, crews.map((c) => c.bioregionId)));
    const bioregionNames = new Map(bioregionRows.map((b) => [b.id, b.name]));

    return crews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((crew) => ({
        id: crew.id,
        questId: crew.questId,
        bioregionId: crew.bioregionId,
        bioregionName: bioregionNames.get(crew.bioregionId) ?? "Unknown bioregion",
        status: crew.status,
        crewSize: crew.crewSize,
        forumThreadId: crew.forumThreadId,
        createdAt: crew.createdAt,
        activatedAt: crew.activatedAt,
        myStatus: myMemberships.find((m) => m.crewId === crew.id)?.status ?? "joined",
        members: allMembers
          .filter((m) => m.crewId === crew.id && m.status !== "left")
          .map((m) => ({ name: m.name || "A player", handle: m.handle, status: m.status })),
      }));
  }),

  /** Mark the crew active: "we've started the quest". Any member can call it. */
  activateCrew: protectedProcedure
    .input(z.object({ crewId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const membership = await requireMembership(db, input.crewId, ctx.user.id);
      const [crew] = await db.select().from(questCrews).where(eq(questCrews.id, input.crewId)).limit(1);
      if (!crew || !membership) throw new TRPCError({ code: "NOT_FOUND", message: "Crew not found." });
      if (crew.status !== "forming" && crew.status !== "ready") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This crew is already underway." });
      }
      await db
        .update(questCrews)
        .set({ status: "active", activatedAt: new Date() })
        .where(eq(questCrews.id, input.crewId));
      return { ok: true };
    }),

  /** Leave a crew. While it's forming or ready, the assembly job refills the slot. */
  leaveCrew: protectedProcedure
    .input(z.object({ crewId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const membership = await requireMembership(db, input.crewId, ctx.user.id);
      if (!membership) throw new TRPCError({ code: "NOT_FOUND", message: "You're not on this crew." });
      await db
        .update(questCrewMembers)
        .set({ status: "left" })
        .where(eq(questCrewMembers.id, membership.id));
      // A full crew that lost a member goes back to forming so the job refills it.
      await db
        .update(questCrews)
        .set({ status: "forming" })
        .where(and(eq(questCrews.id, input.crewId), eq(questCrews.status, "ready")));
      return { ok: true };
    }),
});

type QuestAggregate = {
  questId: string;
  bioregionId: number;
  bioregionName: string;
  openSignups: number;
  crews: { status: "forming" | "ready" | "active"; memberCount: number; crewSize: number }[];
};

async function requireMembership(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  crewId: number,
  userId: number,
) {
  const [membership] = await db
    .select()
    .from(questCrewMembers)
    .where(
      and(
        eq(questCrewMembers.crewId, crewId),
        eq(questCrewMembers.userId, userId),
        inArray(questCrewMembers.status, ["joined", "completed"]),
      ),
    )
    .limit(1);
  return membership ?? null;
}
