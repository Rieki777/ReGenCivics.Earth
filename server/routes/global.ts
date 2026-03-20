// server/routes/global.ts
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql, like, or } from "drizzle-orm";
import { forumPosts, campaigns as campaignsTable } from "../../drizzle/schema";
import { checkRateLimit } from "../rate-limit";
import { ENV } from "../_core/env";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import { CHAT_SYSTEM_PROMPT } from "../_core/oauth";
import { invokeLLM } from "../_core/llm";

export const globalSearchRouter = router({
  query: publicProcedure
    .input(z.object({ q: z.string().min(2).max(100) }))
    .query(async ({ input }) => {
      const term = `%${input.q}%`;
      const dbConn = await getDb();
      if (!dbConn) return { forumPosts: [], campaigns: [] };

      const [forumResults, campaignResults] = await Promise.all([
        dbConn.select({ id: forumPosts.id, title: forumPosts.title })
          .from(forumPosts)
          .where(or(like(forumPosts.title, term), like(forumPosts.content, term)))
          .limit(5),
        dbConn.select({ id: campaignsTable.id, title: campaignsTable.title })
          .from(campaignsTable)
          .where(or(
            like(campaignsTable.title, term),
            like(campaignsTable.description, term),
          ))
          .limit(5),
      ]);

      return {
        forumPosts: forumResults.map(r => ({ id: r.id, title: r.title ?? '', url: `/community/post/${r.id}` })),
        campaigns: campaignResults.map(r => ({ id: r.id, title: r.title ?? '', url: `/crowd-pooling-projects/${r.id}` })),
      };
    }),
});

export const filesRouter = router({
  upload: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string(), // Base64 encoded
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate unique file key with user ID prefix
      const ext = input.fileName.split('.').pop() || 'bin';
      const fileKey = `uploads/${ctx.user.id}/${nanoid()}.${ext}`;

      // Decode base64 to buffer
      const buffer = Buffer.from(input.fileData, 'base64');

      // Upload to S3
      const result = await storagePut(fileKey, buffer, input.contentType);

      return {
        url: result.url,
        key: result.key,
        fileName: input.fileName,
      };
    }),
});

export const chatRouter = router({
  ask: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      checkRateLimit(ctx, "chat_ask");
      const llmMessages = [
        { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
        ...input.messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: llmMessages });
      const content = response.choices?.[0]?.message?.content
        ?? "I am not sure how to help with that. Please try rephrasing your question.";
      return { content };
    }),
});
