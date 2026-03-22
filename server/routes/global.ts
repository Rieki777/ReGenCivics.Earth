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
import type { Express } from "express";
import sharp from "sharp";

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

// Map of allowed MIME types to their magic bytes (base64 prefix)
const ALLOWED_MIME_PREFIXES: Record<string, string[]> = {
  'image/jpeg': ['/9j/'],
  'image/png': ['iVBORw0KGgo'],
  'image/webp': ['UklGR'],
  'image/gif': ['R0lGOD'],
  'application/pdf': ['JVBERi0'],
  // Word docs and Excel are zip-based, harder to check by magic bytes - allow by extension only
};

function validateMimeVsContent(base64Data: string, claimedType: string): boolean {
  // For types we can check, verify the magic bytes match
  const prefixes = ALLOWED_MIME_PREFIXES[claimedType];
  if (!prefixes) return true; // Can't check this type, allow it
  const dataStart = base64Data.substring(0, 20);
  return prefixes.some(prefix => dataStart.startsWith(prefix));
}

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

      // Validate that file content matches declared MIME type
      if (!validateMimeVsContent(input.fileData, input.contentType)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'File content does not match its declared type.' });
      }

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
      await checkRateLimit(ctx, "chat_ask");
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

// ─── Image optimization route ────────────────────────────────────────────────
const ALLOWED_IMG_DOMAINS = [
  'assets.regencivics.earth',
  'regencivics.earth',
  'regencivics.com',
];

export function registerImageOptimization(app: Express) {
  app.get('/api/img', async (req, res) => {
    try {
      const { url, w, h, q } = req.query as Record<string, string>;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url required' });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: 'invalid url' });
      }
      if (!ALLOWED_IMG_DOMAINS.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith(`.${d}`))) {
        return res.status(403).json({ error: 'domain not allowed' });
      }

      const width = w ? Math.min(parseInt(w, 10), 2048) : undefined;
      const height = h ? Math.min(parseInt(h, 10), 2048) : undefined;
      const quality = q ? Math.min(parseInt(q, 10), 100) : 80;

      const upstream = await fetch(url);
      if (!upstream.ok) {
        // Redirect to the original URL so the browser can display whatever it gets
        // (or show its own broken-image icon) instead of a hard 502 that can crash React.
        return res.redirect(302, url);
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());

      const optimized = await sharp(buffer)
        .resize(width, height, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      });
      res.send(optimized);
    } catch (err) {
      console.error('[img] optimization error:', err);
      // Fall back to the original image rather than crashing the page
      const fallbackUrl = req.query.url as string;
      if (fallbackUrl) return res.redirect(302, fallbackUrl);
      res.status(500).json({ error: 'processing failed' });
    }
  });
}
