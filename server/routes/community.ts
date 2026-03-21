// server/routes/community.ts
import { protectedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { sanitizeInput } from "../_core/security";
import { gifts, needs, upcomingAmas, playerProfiles, projectConnections, applications as applicationsTable } from "../../drizzle/schema";

// ─── Marketplace (Gifts / Needs registry) ──────────────────────────────────────
export const marketplaceRouter = router({
  // List all active gift+need pairs, optionally filtered by category or bioregionId
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      bioregionId: z.number().optional(),
      collaborationStatus: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return { items: [] };

      const allGifts = await d.select().from(gifts).where(eq(gifts.isActive, 1));
      const allNeeds = await d.select().from(needs).where(eq(needs.isActive, 1));

      // Collect unique userIds
      const userIds = Array.from(new Set([
        ...allGifts.map(g => g.userId),
        ...allNeeds.map(n => n.userId),
      ]));

      if (userIds.length === 0) return { items: [] };

      // Load userProfiles (for display: displayName, avatarUrl, location)
      // and playerProfiles (for collaboration data: collaborationStatus, dreamingOf, bioregionId)
      const [userProfileList, playerProfileList] = await Promise.all([
        Promise.all(userIds.map(uid => db.getUserProfile(uid).catch(() => null))),
        Promise.all(userIds.map(uid => db.getPlayerProfileByUserId(uid).catch(() => null))),
      ]);

      const userProfileMap = new Map(
        userProfileList
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(p => [p.userId, p])
      );
      const playerProfileMap = new Map(
        (playerProfileList.filter(Boolean) as NonNullable<typeof playerProfileList[number]>[])
          .filter(p => p.userId != null)
          .map(p => [p.userId as number, p])
      );

      // Build per-user items
      let items = userIds
        .map(uid => {
          const up = userProfileMap.get(uid);
          const pp = playerProfileMap.get(uid);
          const userGifts = allGifts.filter(g => g.userId === uid);
          const userNeeds = allNeeds.filter(n => n.userId === uid);
          if (userGifts.length === 0 && userNeeds.length === 0) return null;
          return {
            userId: uid,
            displayName: up?.displayName ?? pp?.displayName ?? "Community Member",
            avatarUrl: up?.avatarUrl ?? pp?.avatarUrl ?? null,
            location: up?.location ?? null,
            collaborationStatus: pp?.collaborationStatus ?? null,
            dreamingOf: pp?.dreamingOf ?? null,
            bioregionId: pp?.bioregionId ?? null,
            gifts: userGifts.map(g => ({ id: g.id, type: g.type, description: g.description })),
            needs: userNeeds.map(n => ({ id: n.id, type: n.type, description: n.description })),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      // Apply filters
      if (input?.category) {
        items = items.filter(item =>
          item.gifts.some(g => g.type === input.category) ||
          item.needs.some(n => n.type === input.category)
        );
      }
      if (input?.bioregionId) {
        items = items.filter(item => item.bioregionId === input.bioregionId);
      }
      if (input?.collaborationStatus) {
        items = items.filter(item => item.collaborationStatus === input.collaborationStatus);
      }

      return { items };
    }),

  // Add a gift for the current user
  addGift: protectedProcedure
    .input(z.object({
      type: z.enum(["skill", "resource", "time", "knowledge", "land", "capital"]),
      description: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await d.insert(gifts).values({ userId: ctx.user.id, type: input.type, description: sanitizeInput(input.description) });
      return { success: true };
    }),

  // Remove a gift (must own it)
  removeGift: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await d.select().from(gifts).where(eq(gifts.id, input.id));
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await d.delete(gifts).where(eq(gifts.id, input.id));
      return { success: true };
    }),

  // Add a need for the current user
  addNeed: protectedProcedure
    .input(z.object({
      type: z.enum(["skill", "resource", "time", "knowledge", "land", "capital"]),
      description: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await d.insert(needs).values({ userId: ctx.user.id, type: input.type, description: sanitizeInput(input.description) });
      return { success: true };
    }),

  // Remove a need (must own it)
  removeNeed: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await d.select().from(needs).where(eq(needs.id, input.id));
      if (!row || row.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await d.delete(needs).where(eq(needs.id, input.id));
      return { success: true };
    }),

  // Get current user's own gifts+needs (for profile management)
  myEntries: protectedProcedure.query(async ({ ctx }) => {
    const d = await getDb();
    if (!d) return { gifts: [], needs: [] };
    const myGifts = await d.select().from(gifts).where(eq(gifts.userId, ctx.user.id));
    const myNeeds = await d.select().from(needs).where(eq(needs.userId, ctx.user.id));
    return { gifts: myGifts, needs: myNeeds };
  }),
});

// ─── Upcoming AMAs ──────────────────────────────────────────────────────────────
export const amasRouter = router({
  // Get the next upcoming active AMA (public)
  getNext: publicProcedure.query(async () => {
    const d = await getDb();
    if (!d) return null;
    const rows = await d.select().from(upcomingAmas).where(eq(upcomingAmas.isActive, 1));
    if (rows.length === 0) return null;
    // Sort by date and return the soonest
    const sorted = rows.sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0];
  }),

  // List all active AMAs
  list: publicProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    const rows = await d.select().from(upcomingAmas).where(eq(upcomingAmas.isActive, 1));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }),

  // Admin: create AMA
  create: adminProcedure
    .input(z.object({
      projectName: z.string().min(1).max(255),
      hostName: z.string().min(1).max(255),
      date: z.string(),
      time: z.string(),
      timezone: z.string(),
      forumThreadUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await d.insert(upcomingAmas).values({
        projectName: input.projectName,
        hostName: input.hostName,
        date: input.date,
        time: input.time,
        timezone: input.timezone,
        forumThreadUrl: input.forumThreadUrl,
      });
      return { success: true };
    }),

  // Admin: toggle active
  setActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await d.update(upcomingAmas).set({ isActive: input.isActive ? 1 : 0 }).where(eq(upcomingAmas.id, input.id));
      return { success: true };
    }),

  // Admin: delete AMA
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await d.delete(upcomingAmas).where(eq(upcomingAmas.id, input.id));
      return { success: true };
    }),
});

// ─── C15: Project Connections ───────────────────────────────────────────────────
export const projectConnectionsRouter = router({
  forPost: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      return db.getConnectionsForPost(input.postId);
    }),

  listAll: adminProcedure.query(async () => {
    return db.getAllProjectConnections();
  }),

  create: adminProcedure
    .input(z.object({
      postAId: z.number(),
      postBId: z.number(),
      connectionType: z.enum(["needs_each_other", "similar"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createProjectConnection({
        postAId: input.postAId,
        postBId: input.postBId,
        connectionType: input.connectionType,
        note: input.note || null,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteProjectConnection(input.id);
      return { success: true };
    }),
});

// ─── Community ─────────────────────────────────────────────────────────────────
export const communityRouter = router({
  // Public: active land projects with their details for Community page cards
  activeLandProjects: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db
      .select({
        id: applicationsTable.id,
        projectName: applicationsTable.projectName,
        location: applicationsTable.location,
        country: applicationsTable.country,
        websiteUrl: applicationsTable.websiteUrl,
      })
      .from(applicationsTable)
      .where(sql`${applicationsTable.status} IN ('active', 'approved')`)
      .orderBy(sql`${applicationsTable.projectName} ASC`);
  }),
});
