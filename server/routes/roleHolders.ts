/**
 * roleHolders router (Phase 1, Movement Coordination Engine).
 *
 * Admin-side read + update of who currently holds each sociocratic role
 * defined in `client/src/data/gameRoles.ts`. The seed script populates
 * rows with `userId = NULL`; Rye fills them via the admin form so a task
 * mentioned in a recorded call can route to a real person.
 *
 * No public read of userId here yet; that surface lives on the Team
 * page and the holder's profile in later phases.
 */
import { z } from "zod";
import { eq, asc, or, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { roleHolders, users } from "../../drizzle/schema";

const TokenKind = z.enum(["game", "fund"]);

export const roleHoldersRouter = router({
  // List every roleHolders row with the matched user (if any) for the
  // admin UI. Ordered kind then title so game-side roles render first.
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: roleHolders.id,
        roleSlug: roleHolders.roleSlug,
        roleTitle: roleHolders.roleTitle,
        kind: roleHolders.kind,
        circle: roleHolders.circle,
        userId: roleHolders.userId,
        season: roleHolders.season,
        isActive: roleHolders.isActive,
        notifyEmail: roleHolders.notifyEmail,
        notifyInApp: roleHolders.notifyInApp,
        aliases: roleHolders.aliases,
        userName: users.name,
        userEmail: users.email,
        userHandle: users.handle,
        updatedAt: roleHolders.updatedAt,
      })
      .from(roleHolders)
      .leftJoin(users, eq(users.id, roleHolders.userId))
      .orderBy(asc(roleHolders.kind), asc(roleHolders.roleTitle));
    return rows;
  }),

  // Assign / unassign a holder. Pass userId=null to mark the role open.
  setHolder: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      userId: z.number().int().positive().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      if (input.userId !== null) {
        // Verify the user exists before stamping the role holder row,
        // so the leftJoin in `list` never resolves to a ghost row.
        const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      await db
        .update(roleHolders)
        .set({ userId: input.userId })
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),

  // Toggle notification preferences for a holder so a person who's
  // overloaded can mute in-app or email pings without losing the role.
  setNotificationPrefs: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      notifyEmail: z.boolean().optional(),
      notifyInApp: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const patch: Record<string, number> = {};
      if (input.notifyEmail !== undefined) patch.notifyEmail = input.notifyEmail ? 1 : 0;
      if (input.notifyInApp !== undefined) patch.notifyInApp = input.notifyInApp ? 1 : 0;
      if (Object.keys(patch).length === 0) return { ok: true };
      await db
        .update(roleHolders)
        .set(patch)
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),

  // Update circle / season / kind / active flag. Useful when a role
  // moves between game-side and fund-side or rotates by season.
  updateMeta: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      kind: TokenKind.optional(),
      circle: z.string().max(128).nullable().optional(),
      season: z.string().max(50).nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const patch: Record<string, unknown> = {};
      if (input.kind !== undefined) patch.kind = input.kind;
      if (input.circle !== undefined) patch.circle = input.circle;
      if (input.season !== undefined) patch.season = input.season;
      if (input.isActive !== undefined) patch.isActive = input.isActive ? 1 : 0;
      if (Object.keys(patch).length === 0) return { ok: true };
      await db
        .update(roleHolders)
        .set(patch)
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),

  // Admin-side user lookup by email or handle, used by the assign UI
  // in AdminRoleHoldersTab. Returns at most 8 matches; the query must
  // be at least 2 characters so we never list everyone on an empty box.
  findUsers: adminProcedure
    .input(z.object({ q: z.string().min(2).max(120) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const needle = `%${input.q}%`;
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          handle: users.handle,
        })
        .from(users)
        .where(or(like(users.email, needle), like(users.handle, needle), like(users.name, needle)))
        .limit(8);
      return rows;
    }),

  // Replace the aliases list (the LLM matches transcript text against
  // these alongside roleTitle to attribute a task to the right role).
  setAliases: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      aliases: z.array(z.string().min(1).max(80)).max(20),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db
        .update(roleHolders)
        .set({ aliases: input.aliases })
        .where(eq(roleHolders.id, input.id));
      return { ok: true };
    }),
});
