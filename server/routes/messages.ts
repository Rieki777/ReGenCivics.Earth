// server/routes/messages.ts
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, lt, sql, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { conversations, conversationParticipants, directMessages, users } from "../../drizzle/schema";
import { pushToUser } from "../_core/sse";
import { sanitizeInput } from "../_core/security";

export const messagesRouter = router({
  conversations: router({
    // List all conversations for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const db2 = await getDb();
      if (!db2) return [];
      const userId = ctx.user.id;

      // Find all conversation IDs the current user participates in
      const myParticipations = await db2
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, userId));

      if (myParticipations.length === 0) return [];

      const convIds = myParticipations.map((p) => p.conversationId);

      const results: Array<{
        id: number;
        otherUser: { id: number; name: string; avatarUrl: string | null };
        lastMessage: { content: string; senderId: number; createdAt: Date } | null;
        unreadCount: number;
        updatedAt: Date;
      }> = [];

      for (const participation of myParticipations) {
        const convId = participation.conversationId;

        // Get the other participant
        const otherParticipants = await db2
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, convId),
              sql`${conversationParticipants.userId} != ${userId}`
            )
          );

        if (otherParticipants.length === 0) continue;

        const otherUserId = otherParticipants[0].userId;

        // Get the other user's info
        const otherUsers = await db2
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, otherUserId));

        if (otherUsers.length === 0) continue;

        const otherUser = otherUsers[0];

        // Get the conversation's updatedAt
        const convRows = await db2
          .select()
          .from(conversations)
          .where(eq(conversations.id, convId));

        if (convRows.length === 0) continue;

        const conv = convRows[0];

        // Get the last message
        const lastMessages = await db2
          .select()
          .from(directMessages)
          .where(
            and(
              eq(directMessages.conversationId, convId),
              isNull(directMessages.deletedAt)
            )
          )
          .orderBy(desc(directMessages.createdAt))
          .limit(1);

        const lastMessage =
          lastMessages.length > 0
            ? {
                content: lastMessages[0].content,
                senderId: lastMessages[0].senderId,
                createdAt: lastMessages[0].createdAt,
              }
            : null;

        // Count unread messages
        const lastReadAt = participation.lastReadAt;
        let unreadCount = 0;
        if (lastReadAt) {
          const unreadRows = await db2
            .select({ count: sql<number>`count(*)` })
            .from(directMessages)
            .where(
              and(
                eq(directMessages.conversationId, convId),
                sql`${directMessages.senderId} != ${userId}`,
                sql`${directMessages.createdAt} > ${lastReadAt}`,
                isNull(directMessages.deletedAt)
              )
            );
          unreadCount = Number(unreadRows[0]?.count ?? 0);
        } else {
          // Never read, count all messages not sent by self
          const unreadRows = await db2
            .select({ count: sql<number>`count(*)` })
            .from(directMessages)
            .where(
              and(
                eq(directMessages.conversationId, convId),
                sql`${directMessages.senderId} != ${userId}`,
                isNull(directMessages.deletedAt)
              )
            );
          unreadCount = Number(unreadRows[0]?.count ?? 0);
        }

        results.push({
          id: convId,
          otherUser: {
            id: otherUser.id,
            name: otherUser.name ?? '',
            avatarUrl: null,
          },
          lastMessage,
          unreadCount,
          updatedAt: conv.updatedAt,
        });
      }

      // Sort by most recently updated
      results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return results;
    }),

    // Find or create a conversation with another user
    getOrCreate: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });
        const currentUserId = ctx.user.id;
        const targetUserId = input.userId;

        if (currentUserId === targetUserId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create a conversation with yourself.',
          });
        }

        // Find conversations current user is in
        const myConvs = await db2
          .select({ conversationId: conversationParticipants.conversationId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.userId, currentUserId));

        const myConvIds = myConvs.map((r) => r.conversationId);

        if (myConvIds.length > 0) {
          // Check if target user is in any of these conversations
          const shared = await db2
            .select({ conversationId: conversationParticipants.conversationId })
            .from(conversationParticipants)
            .where(
              and(
                eq(conversationParticipants.userId, targetUserId),
                sql`${conversationParticipants.conversationId} IN (${sql.join(
                  myConvIds.map((id) => sql`${id}`),
                  sql`, `
                )})`
              )
            );

          if (shared.length > 0) {
            return { conversationId: shared[0].conversationId };
          }
        }

        // Create a new conversation
        const insertResult = await db2.insert(conversations).values({
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const conversationId = Number((insertResult as any).insertId);

        await db2.insert(conversationParticipants).values([
          { conversationId, userId: currentUserId, joinedAt: new Date() },
          { conversationId, userId: targetUserId, joinedAt: new Date() },
        ]);

        return { conversationId };
      }),

    // Mark messages in a conversation as read
    markRead: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) return { success: true };

        await db2
          .update(conversationParticipants)
          .set({ lastReadAt: new Date() })
          .where(
            and(
              eq(conversationParticipants.userId, ctx.user.id),
              eq(conversationParticipants.conversationId, input.conversationId)
            )
          );

        return { success: true };
      }),
  }),

  messages: router({
    // List messages in a conversation (cursor-based pagination)
    list: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          cursor: z.number().optional(),
          limit: z.number().min(1).max(100).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) return { messages: [], nextCursor: null };
        const { conversationId, cursor, limit = 30 } = input;

        // Verify participant
        const participation = await db2
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.userId, ctx.user.id),
              eq(conversationParticipants.conversationId, conversationId)
            )
          );

        if (participation.length === 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a participant in this conversation.',
          });
        }

        // Keep deleted rows in the result so the UI can render a
        // "[Message deleted]" tombstone with the correct timestamp.
        const conditions = [
          eq(directMessages.conversationId, conversationId),
        ];

        if (cursor !== undefined) {
          conditions.push(lt(directMessages.id, cursor));
        }

        const rows = await db2
          .select()
          .from(directMessages)
          .where(and(...conditions))
          .orderBy(desc(directMessages.id))
          .limit(limit + 1);

        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        // Collect unique sender IDs and fetch names
        const senderIds = Array.from(new Set(pageRows.map((m) => m.senderId)));
        const senderUsers = await db2
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(senderIds.map((id) => sql`${id}`), sql`, `)})`);

        const senderMap = new Map(senderUsers.map((u) => [u.id, u.name ?? '']));

        const messages = pageRows.map((m) => ({
          ...m,
          senderName: senderMap.get(m.senderId) ?? '',
        }));

        const nextCursor =
          hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1].id : null;

        return { messages, nextCursor };
      }),

    // Send a message in a conversation
    send: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable.' });
        const { conversationId, content } = input;

        // Verify participant
        const participation = await db2
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.userId, ctx.user.id),
              eq(conversationParticipants.conversationId, conversationId)
            )
          );

        if (participation.length === 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a participant in this conversation.',
          });
        }

        const now = new Date();

        const insertResult = await db2.insert(directMessages).values({
          conversationId,
          senderId: ctx.user.id,
          content: sanitizeInput(content),
          createdAt: now,
        });

        const messageId = Number((insertResult as any).insertId);

        // Update conversation's updatedAt
        await db2
          .update(conversations)
          .set({ updatedAt: now })
          .where(eq(conversations.id, conversationId));

        const [message] = await db2
          .select()
          .from(directMessages)
          .where(eq(directMessages.id, messageId));

        // Push SSE invalidation to all other participants so their unread
        // badge updates without waiting for the polling fallback.
        const allParticipants = await db2
          .select({ userId: conversationParticipants.userId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, conversationId));
        for (const p of allParticipants) {
          if (p.userId !== ctx.user.id) {
            pushToUser(p.userId, { type: 'invalidate', keys: ['messages'] });
          }
        }

        return message;
      }),

    // Soft-delete a message (sender only). The row stays in the table so
    // the thread still renders in order with a "[Message deleted]" tombstone.
    delete: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const existing = await db2
          .select({ senderId: directMessages.senderId })
          .from(directMessages)
          .where(eq(directMessages.id, input.messageId))
          .limit(1);
        if (!existing[0]) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
        }
        if (existing[0].senderId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the sender can delete this message" });
        }
        await db2
          .update(directMessages)
          .set({ deletedAt: new Date() })
          .where(eq(directMessages.id, input.messageId));
        return { success: true };
      }),

    // Search message content across the caller's conversations.
    search: protectedProcedure
      .input(z.object({ query: z.string().min(2).max(200) }))
      .query(async ({ ctx, input }) => {
        const db2 = await getDb();
        if (!db2) return [];
        const myConvIds = await db2
          .select({ conversationId: conversationParticipants.conversationId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.userId, ctx.user.id));
        if (myConvIds.length === 0) return [];
        const convIdList = myConvIds.map((r) => r.conversationId);
        const likeQuery = `%${input.query}%`;
        const rows = await db2
          .select({
            messageId: directMessages.id,
            content: directMessages.content,
            senderId: directMessages.senderId,
            conversationId: directMessages.conversationId,
            createdAt: directMessages.createdAt,
          })
          .from(directMessages)
          .where(
            and(
              isNull(directMessages.deletedAt),
              sql`${directMessages.conversationId} IN (${sql.join(convIdList.map((id) => sql`${id}`), sql`, `)})`,
              sql`${directMessages.content} LIKE ${likeQuery}`,
            ),
          )
          .orderBy(desc(directMessages.createdAt))
          .limit(20);
        const senderIds = Array.from(new Set(rows.map((r) => r.senderId)));
        const senderUsers = senderIds.length
          ? await db2
              .select({ id: users.id, name: users.name })
              .from(users)
              .where(sql`${users.id} IN (${sql.join(senderIds.map((id) => sql`${id}`), sql`, `)})`)
          : [];
        const senderMap = new Map(senderUsers.map((u) => [u.id, u.name ?? ""]));
        return rows.map((r) => ({
          messageId: r.messageId,
          snippet: r.content.length > 100 ? r.content.slice(0, 100) + "..." : r.content,
          senderName: senderMap.get(r.senderId) ?? "",
          conversationId: r.conversationId,
          createdAt: r.createdAt,
        }));
      }),
  }),

  // Count total unread messages across all conversations
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db2 = await getDb();
    if (!db2) return { count: 0 };
    const userId = ctx.user.id;

    const myParticipations = await db2
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (myParticipations.length === 0) return { count: 0 };

    let total = 0;

    for (const participation of myParticipations) {
      const lastReadAt = participation.lastReadAt;

      const conditions = [
        eq(directMessages.conversationId, participation.conversationId),
        sql`${directMessages.senderId} != ${userId}`,
        isNull(directMessages.deletedAt),
      ];

      if (lastReadAt) {
        conditions.push(sql`${directMessages.createdAt} > ${lastReadAt}`);
      }

      const rows = await db2
        .select({ count: sql<number>`count(*)` })
        .from(directMessages)
        .where(and(...conditions));

      total += Number(rows[0]?.count ?? 0);
    }

    return { count: total };
  }),
});
