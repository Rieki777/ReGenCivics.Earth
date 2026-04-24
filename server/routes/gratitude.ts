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

      // Block gratitude to system/team accounts. These are identified by
      // handles starting with "regen-" that are team-managed, or by the
      // openId "regen-guide-system". Players should only send to other players.
      const SYSTEM_HANDLES = ["regen-civics-team", "regen-guide", "regen-guide-system", "system", "admin"];
      if (SYSTEM_HANDLES.includes(input.recipientHandle.toLowerCase()) || (recipient as any).openId === "regen-guide-system") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Gratitude can only be sent to other players, not to team accounts." });
      }

      // Duplicate guard: prevent sending gratitude for the exact same source twice.
      // A source is a unique (sourceType + sourceId) pair.
      if (input.sourceType && input.sourceId) {
        const existing = await db
          .select({ id: gratitudeLog.id })
          .from(gratitudeLog)
          .where(and(
            eq(gratitudeLog.senderId, ctx.user.id),
            eq(gratitudeLog.recipientId, recipient.id),
            sql`${gratitudeLog.sourceType} = ${input.sourceType}`,
            sql`${gratitudeLog.sourceId} = ${input.sourceId}`,
          ))
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You've already sent gratitude for this. Each contribution gets one thank-you.",
          });
        }
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

      // Private ledger credit: bump the recipient's RGVoice private balance
      // by 5 so the profile's big-number total reflects gratitude earned
      // in real time. RGVoice was picked because gratitude is a
      // Game-track signal; when the player claims their voice on Hypha
      // the private balance will be debited and matched on-chain.
      try {
        const { creditPrivateTokens } = await import("../db");
        await creditPrivateTokens({
          userId: recipient.id,
          tokenType: "rgvoice",
          amount: 5,
          source: "gratitude_received",
          sourceId: (result as any).insertId ?? null,
          description: `Gratitude received from @${ctx.user.handle ?? ctx.user.id}`,
        });
      } catch (err) {
        console.warn("[gratitude.send] private ledger credit failed (non-fatal):", err);
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
          sql`LOWER(${users.handle}) LIKE ${q} OR LOWER(${users.name}) LIKE ${q} OR LOWER(${playerProfiles.displayName}) LIKE ${q}`
        )
        .limit(10);
      return rows;
    }),
});