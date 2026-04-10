// server/routes/gratitude.ts
// Forum + command-palette surface for sending gratitude. Lunar-cycle budget and
// $ReGen distribution batch jobs come later (see GRATITUDE_SYSTEM_SPEC.md).
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, getUserByHandle } from "../db";
import { gratitudeLog, users, playerProfiles } from "../../drizzle/schema";
import { eq, or, like, sql, and, gte } from "drizzle-orm";
import { sanitizeInput } from "../_core/security";

export const gratitudeRouter = router({
  // Send a gratitude message to another user identified by handle.
  send: protectedProcedure
    .input(z.object({
      recipientHandle: z.string().min(3).max(40),
      message: z.string().min(3).max(500),
      sourceType: z.enum(["forum_post", "forum_reply", "profile", "command_center"]).optional(),
      sourceId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const recipient = await getUserByHandle(input.recipientHandle);
      if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "No one with that handle" });
      if (recipient.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot send gratitude to yourself" });
      }

      // Spam guard: at most 30 sends per hour per sender. The lunar-cycle
      // budget system in GRATITUDE_SYSTEM_SPEC.md will replace this with a
      // proper budget once it ships, but until then we need a hard ceiling.
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSends = await db
        .select({ id: gratitudeLog.id })
        .from(gratitudeLog)
        .where(and(eq(gratitudeLog.senderId, ctx.user.id), gte(gratitudeLog.createdAt, oneHourAgo)));
      if (recentSends.length >= 30) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You've sent a lot of gratitude in the last hour. Take a breath, come back soon.",
        });
      }

      // Same recipient cooldown: at most 3 messages to the same person per hour.
      const recentToRecipient = recentSends.length === 0 ? [] : await db
        .select({ id: gratitudeLog.id })
        .from(gratitudeLog)
        .where(and(
          eq(gratitudeLog.senderId, ctx.user.id),
          eq(gratitudeLog.recipientId, recipient.id),
          gte(gratitudeLog.createdAt, oneHourAgo),
        ));
      if (recentToRecipient.length >= 3) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You've already sent this person several thank-yous recently. Try again in a little while.",
        });
      }

      const [result] = await db.insert(gratitudeLog).values({
        senderId: ctx.user.id,
        recipientId: recipient.id,
        message: sanitizeInput(input.message),
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
      });

      // Governance token ledger: credit 5 tokens to the recipient for
      // receiving gratitude.
      try {
        const { governanceTokenLedger, governanceTenants } = await import("../../drizzle/schema");
        const tenants = await db.select({ id: governanceTenants.id }).from(governanceTenants).where(eq(governanceTenants.slug, "platform")).limit(1);
        const tenantId = tenants[0]?.id ?? 1;
        await db.insert(governanceTokenLedger).values({
          userId: recipient.id,
          tenantId,
          amount: 5,
          type: "gratitude",
          sourceRef: `gratitude:${(result as any).insertId ?? 0}`,
          description: `Gratitude received from @${ctx.user.handle ?? ctx.user.id}`,
        } as any);
      } catch (err) {
        console.warn("[gratitude.send] governance token credit failed (non-fatal):", err);
      }

      return { ok: true };
    }),

  // Search users by handle, name, or display name. Used by the command palette People group.
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(2).max(40) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = `%${input.query.toLowerCase()}%`;

      const rows = await db
        .select({
          id: users.id,
          handle: users.handle,
          name: users.name,
          displayName: playerProfiles.displayName,
          avatarUrl: playerProfiles.avatarUrl,
        })
        .from(users)
        .leftJoin(playerProfiles, eq(playerProfiles.userId, users.id))
        .where(
          or(
            like(users.handle, q),
            sql`LOWER(${users.name}) LIKE ${q}`,
            sql`LOWER(${playerProfiles.displayName}) LIKE ${q}`,
          ),
        )
        .limit(12);

      return rows;
    }),

  // List the current user's recent received gratitude. For a future "received" inbox view.
  myRecent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(gratitudeLog)
      .where(eq(gratitudeLog.recipientId, ctx.user.id))
      .orderBy(sql`${gratitudeLog.createdAt} DESC`)
      .limit(50);
  }),
});
