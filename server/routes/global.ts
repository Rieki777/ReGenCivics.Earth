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
import { storagePut, storageStream } from "../storage";
import { CHAT_SYSTEM_PROMPT } from "../_core/oauth";
import { invokeLLM } from "../_core/llm";
import { generateImage, buildImagePrompt, type ContentType } from "../_core/imageGeneration";
import type { Express } from "express";
import sharp from "sharp";
import { ALLOWED_IMG_HOSTS, checkAllowlistedHost } from "../_core/ssrf";

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

// User-facing image generation (authenticated, not admin-only)
export const imagesRouter = router({
  generate: protectedProcedure
    .input(z.object({
      context: z.enum(["forum", "quest", "campaign", "blog", "video", "profile", "default"]),
      title: z.string().min(1).max(200),
      description: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx, "image_generate");
      const result = await generateImage({
        contentType: input.context as ContentType,
        contentId: `user-${ctx.user.id}-${Date.now()}`,
        contextText: buildImagePrompt(input.context as ContentType, input.title, input.description),
        temp: true,
      });
      return { url: result.url, key: result.key };
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
import { LRUCache } from 'lru-cache';

const imageCache = new LRUCache<string, Buffer>({
  max: 200,
  maxSize: 200_000_000, // 200MB
  sizeCalculation: (value) => value.length,
  ttl: 1000 * 60 * 60 * 24, // 24 hours
});

// Allowlist now lives in server/_core/ssrf.ts (ALLOWED_IMG_HOSTS) so it's
// shared with any future proxy that needs the same gate.

export function registerImageOptimization(app: Express) {
  app.get('/api/img', async (req, res) => {
    try {
      const { url, w, h, q } = req.query as Record<string, string>;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url required' });
      }

      const parsedUrl = checkAllowlistedHost(url, ALLOWED_IMG_HOSTS);
      if (!parsedUrl) {
        return res.status(400).json({ error: 'url is not on the allowlist' });
      }

      const width = w ? Math.min(parseInt(w, 10), 2048) : undefined;
      const height = h ? Math.min(parseInt(h, 10), 2048) : undefined;
      const quality = q ? Math.min(parseInt(q, 10), 100) : 80;

      // Fetch the image: use R2 S3 client directly for assets.regencivics.earth
      // (the custom domain is broken), fall back to regular fetch for others.
      let buffer!: Buffer;
      if (parsedUrl.hostname === 'assets.regencivics.earth') {
        const rawKey = parsedUrl.pathname.replace(/^\/+/, '');
        // Try the raw key first (for new uploads at root), then with bucket prefix
        // (legacy images stored under regen-civics-assets/ directory)
        const keysToTry = [rawKey];
        if (!rawKey.startsWith('regen-civics-assets/')) {
          keysToTry.push(`regen-civics-assets/${rawKey}`);
        }
        let found = false;
        for (const objectKey of keysToTry) {
          try {
            const { body } = await storageStream(objectKey);
            const chunks: Buffer[] = [];
            for await (const chunk of body) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            buffer = Buffer.concat(chunks);
            found = true;
            break;
          } catch (r2err: any) {
            // Try next key
            continue;
          }
        }
        if (!found) {
          console.error('[img] R2 not found in any prefix:', rawKey);
          return res.status(404).json({ error: 'not found in storage' });
        }
      } else {
        // Allowlisted upstream (e.g. regencivics.earth). Disable redirect-
        // following so an open-redirect on the upstream can't be used to
        // pivot the proxy onto an arbitrary host. 8s timeout caps the
        // worst-case response.
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 8_000);
        let upstream: Response;
        try {
          upstream = await fetch(url, { redirect: 'manual', signal: ac.signal });
        } finally {
          clearTimeout(timer);
        }
        if (!upstream.ok) {
          return res.redirect(302, url);
        }
        buffer = Buffer.from(await upstream.arrayBuffer());
      }

      // ── Fast path for pre-optimized CORE assets ──────────────────────────
      // CORE illustrations are uploaded to R2 as .webp AND .avif at every
      // registered width (scripts/process-core-assets.ts), so re-encoding them
      // here is redundant. Worse: when a CORE page loads it fires ~6-10 <img>
      // requests at once, all sending `Accept: image/avif,...`, so each takes
      // the sharp AVIF branch below. Those encodes saturate the CPU and the
      // requests hang long enough that the browser gives up and CoreImage
      // falls back to nothing. So for these, stream the pre-made file straight
      // from R2 with no sharp re-encode: the browser gets AVIF when it accepts
      // it, WebP otherwise, in milliseconds.
      if (
        parsedUrl.hostname === 'assets.regencivics.earth' &&
        /^\/?core\/[^/]+\.webp$/i.test(parsedUrl.pathname)
      ) {
        const webpKey = parsedUrl.pathname.replace(/^\/+/, '');
        const readKey = async (key: string): Promise<Buffer | null> => {
          try {
            const { body } = await storageStream(key);
            const chunks: Buffer[] = [];
            for await (const chunk of body) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
          } catch {
            return null;
          }
        };
        let out: Buffer | null = null;
        let ct = 'image/webp';
        if ((req.headers.accept || '').includes('image/avif')) {
          out = await readKey(webpKey.replace(/\.webp$/i, '.avif'));
          if (out) ct = 'image/avif';
        }
        if (!out) out = buffer; // the .webp we already fetched above
        res.set({
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Vary': 'Accept',
        });
        return res.send(out);
      }

      const accept = req.headers.accept || '';
      const supportsAvif = accept.includes('image/avif');
      const supportsWebp = accept.includes('image/webp');
      const fmt = supportsAvif ? 'avif' : supportsWebp ? 'webp' : 'orig';
      const cacheKey = `${url}-${width ?? ''}-${height ?? ''}-${quality}-${fmt}`;

      // Check LRU cache first
      const cached = imageCache.get(cacheKey);
      if (cached) {
        let ct: string;
        if (fmt === 'avif') ct = 'image/avif';
        else if (fmt === 'webp') ct = 'image/webp';
        else ct = cached[0] === 0x89 ? 'image/png' : 'image/jpeg';
        res.set({
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Vary': 'Accept',
        });
        return res.send(cached);
      }

      const metadata = await sharp(buffer).metadata();
      const hasAlpha = metadata.hasAlpha ?? false;

      let optimized: Buffer;
      let contentType: string;

      const pipeline = sharp(buffer).resize(width, height, { fit: 'cover', withoutEnlargement: true });

      if (supportsAvif) {
        optimized = await pipeline.avif({ quality: Math.min(quality, 60), effort: 4 }).toBuffer();
        contentType = 'image/avif';
      } else if (supportsWebp) {
        optimized = await pipeline.webp({ quality }).toBuffer();
        contentType = 'image/webp';
      } else if (hasAlpha) {
        optimized = await pipeline.png({ quality: Math.min(quality, 100), compressionLevel: 8 }).toBuffer();
        contentType = 'image/png';
      } else {
        optimized = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
        contentType = 'image/jpeg';
      }

      // Store in LRU cache
      imageCache.set(cacheKey, optimized);

      res.set({
        'Content-Type': contentType,
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
