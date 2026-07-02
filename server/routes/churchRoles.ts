/**
 * churchRoles router - Church of the Regenerative Earth (CORE).
 *
 * Steward roles and their payment rights, held in `church_role_holders`.
 * Rights are data-driven so the community can grant and revoke them through
 * governance without a code change; no names or user IDs are ever hardcoded.
 * The two initial holders are seeded by Rye after deploy (handoff), not in source.
 *
 * Grant and revoke are admin-only today. They are intended to move to direct
 * community governance over time through the tools at regencivics.earth and
 * Hypha; keeping the check data-driven is what makes that migration a config
 * change rather than a code change. See ADR-18.
 */
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { churchRoleHolders, users } from "../../drizzle/schema";
import { getChurchRolesForUser } from "../lib/church-permissions";

// A single, gender-neutral official title (renamed from priest/priestess,
// ADR-20). Kept as an enum (rather than dropping the field) so a future role
// variant is a config/data change, not a schema change.
const churchRoleEnum = z.enum(["steward"]);

export const churchRolesRouter = router({
  // The caller's own church roles and effective payment rights.
  getMyChurchRoles: protectedProcedure.query(async ({ ctx }) => {
    return getChurchRolesForUser(ctx.user.id);
  }),

  // Admin/transparency view: every holder (active + revoked) with the person.
  listRoleHolders: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: churchRoleHolders.id,
        userId: churchRoleHolders.userId,
        userName: users.name,
        userHandle: users.handle,
        userEmail: users.email,
        role: churchRoleHolders.role,
        canAcceptPayments: churchRoleHolders.canAcceptPayments,
        canMakePayments: churchRoleHolders.canMakePayments,
        grantedBy: churchRoleHolders.grantedBy,
        grantedAt: churchRoleHolders.grantedAt,
        revokedAt: churchRoleHolders.revokedAt,
      })
      .from(churchRoleHolders)
      .leftJoin(users, eq(users.id, churchRoleHolders.userId))
      .orderBy(desc(churchRoleHolders.grantedAt));
    return rows;
  }),

  // Grant the Steward role with optional payment rights. Admin only.
  grantRole: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        role: churchRoleEnum.default("steward"),
        canAcceptPayments: z.boolean().default(false),
        canMakePayments: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "That user does not exist." });

      // Avoid a duplicate active grant of the same role for the same person.
      const existing = await db
        .select({ id: churchRoleHolders.id })
        .from(churchRoleHolders)
        .where(
          and(
            eq(churchRoleHolders.userId, input.userId),
            eq(churchRoleHolders.role, input.role),
            isNull(churchRoleHolders.revokedAt),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "That user already holds this role." });
      }

      await db.insert(churchRoleHolders).values({
        userId: input.userId,
        role: input.role,
        canAcceptPayments: input.canAcceptPayments ? 1 : 0,
        canMakePayments: input.canMakePayments ? 1 : 0,
        grantedBy: ctx.user.id,
      });

      return getChurchRolesForUser(input.userId);
    }),

  // Revoke a specific holder row (sets revokedAt). Admin only.
  revokeRole: adminProcedure
    .input(z.object({ holderId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const [holder] = await db
        .select({ id: churchRoleHolders.id, userId: churchRoleHolders.userId, revokedAt: churchRoleHolders.revokedAt })
        .from(churchRoleHolders)
        .where(eq(churchRoleHolders.id, input.holderId))
        .limit(1);
      if (!holder) throw new TRPCError({ code: "NOT_FOUND", message: "That role grant does not exist." });
      if (holder.revokedAt) return { success: true, alreadyRevoked: true } as const;

      await db.update(churchRoleHolders).set({ revokedAt: new Date() }).where(eq(churchRoleHolders.id, input.holderId));
      return { success: true, alreadyRevoked: false } as const;
    }),
});
