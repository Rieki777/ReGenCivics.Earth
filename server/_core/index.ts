import "dotenv/config";
import crypto from "node:crypto";
/** Inline cookie parser — replaces the `cookie` npm package to avoid CJS/ESM
 *  interop issues in the esbuild ESM bundle (Sentry: "Dynamic require of cookie"). */
function parseCookieHeader(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!str) return result;
  for (const pair of str.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    let val = pair.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    try { result[key] = decodeURIComponent(val); } catch { result[key] = val; }
  }
  return result;
}
import * as Sentry from "@sentry/node";
import { runDigestJob } from "../jobs/digestJob";
import { runGlossaryJob } from "../jobs/glossaryJob";
import { runDraftCleanupJob } from "../jobs/draftCleanupJob";
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import express from "express";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, CHAT_SYSTEM_PROMPT } from "./oauth";
import { streamLLM } from "./llm";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerTrackingRoutes } from "../trackingRoutes";
import { registerResendWebhookRoutes } from "../webhooks/resend";
import { registerRiversideWebhookRoutes } from "../webhooks/riverside";
import { registerPresenceRoutes } from "../routes/presence";
import bufferRouter from "../routes/buffer";
import farcasterRouter from "../routes/farcaster";
import { registerImageOptimization } from "../routes/global";
import { registerOgRoutes } from "../routes/og";
import { registerEmbedRoutes } from "../routes/embed";
import * as db from "../db";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
import { sendEmail } from "./email";
import { cspMiddleware, securityHeadersMiddleware, rateLimitMiddleware, generateCSRFToken } from "./security";
import { isCacheAvailable } from "../cache";
import path from "path";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set('etag', 'strong');
  const server = createServer(app);

  // Gzip compression for all responses (reduces transfer size by 60-80%)
  app.use(compression({
    level: 6, // balanced speed vs compression ratio
    threshold: 1024, // only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress SSE streams
      if (req.headers['accept'] === 'text/event-stream') return false;
      return compression.filter(req, res);
    }
  }));

  // Prerender.io middleware: serves pre-rendered HTML to bots/crawlers (SEO)
  // PRERENDER_TOKEN must be set in Railway env vars
  if (process.env.PRERENDER_TOKEN) {
    try {
      const prerenderNode = _require("prerender-node");
      prerenderNode.set("prerenderToken", process.env.PRERENDER_TOKEN);
      // Don't prerender API routes, static assets, or health checks
      prerenderNode.set("beforeRenderFn", (req: any, done: (err: any, cached: string | null) => void) => {
        const path = req.path || "";
        if (path.startsWith("/api/") || path.startsWith("/assets/") || path === "/health") {
          done(null, null); // skip prerender
        } else {
          done(null, null); // continue normally
        }
      });
      app.use(prerenderNode);
      console.log("[Prerender] Middleware active (token configured)");
    } catch (e) {
      console.warn("[Prerender] prerender-node not installed yet. Run npm install.", e);
    }
  }

  // Attach a unique request ID for tracing (logged on every request, sent to Sentry)
  app.use((req: any, _res, next) => {
    req.id = crypto.randomUUID();
    next();
  });

  // Request/response logging (structured, Railway-friendly)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      const level = res.statusCode >= 500 ? "err" : res.statusCode >= 400 ? "wrn" : "inf";
      // Skip noisy health checks and static assets from logs
      if (req.path !== "/health" && !req.path.startsWith("/assets/")) {
        console.log(`[${level}] ${(req as any).id ?? '-'} ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
      }
    });
    next();
  });

  // Security middleware
  app.use(cspMiddleware);
  app.use(securityHeadersMiddleware);
  app.set('trust proxy', 1);
  
  // Rate limiting on public endpoints
  app.use('/api/trpc/newsletter.subscribe', rateLimitMiddleware(15 * 60 * 1000, 5));
  app.use('/api/trpc/applications.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/investor.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/inquiry.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/chat/stream', rateLimitMiddleware(60 * 1000, 20));
  app.use('/api/auth/email/request', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/oauth', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/webhooks', rateLimitMiddleware(60 * 1000, 30));
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // CSRF token endpoint — issues a CSRF token tied to the session cookie.
  // The tRPC CSRF middleware validates this token on mutations.
  app.get("/api/csrf-token", (req, res) => {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    let sessionId = cookies["session_id"];
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
    }
    const csrfToken = generateCSRFToken(sessionId);
    res.cookie("csrf_token", csrfToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ csrfToken });
  });
  // Health check endpoint (for UptimeRobot / uptime monitoring)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      db: process.env.DATABASE_URL ? 'connected' : 'disconnected',
      cache: isCacheAvailable() ? 'connected' : 'disconnected',
      ts: new Date().toISOString()
    });
  });

  // ── R2 storage proxy ────────────────────────────────────────────────
  // Serves objects from Cloudflare R2 through our own server, bypassing
  // the R2 custom domain which may be misconfigured.  Requests to
  // /storage/<key> are streamed directly from the bucket.
  app.get('/storage/*', async (req, res) => {
    try {
      const { storageStream } = await import("../storage.js");
      // Strip the /storage/ prefix to get the R2 object key.
      const rawKey = req.path.replace(/^\/storage\//, "");
      if (!rawKey) {
        return res.status(400).send("Missing object key");
      }
      // Try raw key first, then with bucket prefix (legacy images)
      const keysToTry = [rawKey];
      if (!rawKey.startsWith('regen-civics-assets/')) {
        keysToTry.push(`regen-civics-assets/${rawKey}`);
      }
      let stream: { body: any; contentType: string; contentLength: number | undefined } | null = null;
      for (const key of keysToTry) {
        try {
          stream = await storageStream(key);
          break;
        } catch { continue; }
      }
      if (!stream) throw Object.assign(new Error('Not found'), { name: 'NoSuchKey' });
      const { body, contentType, contentLength } = stream;
      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      // Cache for 1 day at edge + browser, revalidate after
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600");
      body.pipe(res);
    } catch (err: any) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        return res.status(404).send("Not found");
      }
      console.error("[storage proxy]", err);
      res.status(500).send("Storage error");
    }
  });

  // Sitemap cache (regenerated at most once per hour)
  let sitemapCache: { xml: string; generatedAt: number } | null = null;
  const SITEMAP_TTL = 60 * 60 * 1000; // 1 hour

  // Dynamic sitemap — includes static routes + DB-driven blog/campaign/forum URLs
  app.get('/sitemap.xml', async (_req, res) => {
    // Return cached sitemap if still fresh
    if (sitemapCache && Date.now() - sitemapCache.generatedAt < SITEMAP_TTL) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(sitemapCache.xml);
    }

    const BASE = 'https://regencivics.earth';
    const now = new Date().toISOString().split('T')[0];

    const staticUrls: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }> = [
      { loc: '/',                        changefreq: 'daily',   priority: '1.0' },
      { loc: '/fund',                    changefreq: 'weekly',  priority: '0.9' },
      { loc: '/opportunity',             changefreq: 'weekly',  priority: '0.9' },
      { loc: '/apply',                   changefreq: 'weekly',  priority: '0.9' },
      { loc: '/community',               changefreq: 'daily',   priority: '0.8' },
      { loc: '/map',                     changefreq: 'weekly',  priority: '0.8' },
      { loc: '/game',                    changefreq: 'weekly',  priority: '0.8' },
      { loc: '/quest',                   changefreq: 'weekly',  priority: '0.8' },
      { loc: '/land',                    changefreq: 'weekly',  priority: '0.7' },
      { loc: '/ally',                    changefreq: 'weekly',  priority: '0.7' },
      { loc: '/play',                    changefreq: 'weekly',  priority: '0.7' },
      { loc: '/seasons',                 changefreq: 'weekly',  priority: '0.7' },
      { loc: '/team',                    changefreq: 'monthly', priority: '0.6' },
      { loc: '/schedule',                changefreq: 'weekly',  priority: '0.6' },
      { loc: '/governance',              changefreq: 'monthly', priority: '0.6' },
      { loc: '/tokenomics',              changefreq: 'monthly', priority: '0.6' },
      { loc: '/glossary',                changefreq: 'monthly', priority: '0.5' },
      { loc: '/regen-games',             changefreq: 'monthly', priority: '0.6' },
      { loc: '/custom-games',            changefreq: 'monthly', priority: '0.5' },
      { loc: '/marketplace',             changefreq: 'weekly',  priority: '0.6' },
      { loc: '/crowd-pooling',           changefreq: 'weekly',  priority: '0.7' },
      { loc: '/crowd-pooling-projects',  changefreq: 'weekly',  priority: '0.7' },
      { loc: '/compare-projects',        changefreq: 'weekly',  priority: '0.5' },
      { loc: '/calculator',              changefreq: 'monthly', priority: '0.5' },
      { loc: '/showcase',                changefreq: 'weekly',  priority: '0.6' },
      { loc: '/blog',                    changefreq: 'weekly',  priority: '0.7' },
      { loc: '/community/seeking-team',  changefreq: 'weekly',  priority: '0.5' },
      { loc: '/community/chains',        changefreq: 'weekly',  priority: '0.5' },
      { loc: '/community/quests',        changefreq: 'weekly',  priority: '0.5' },
      { loc: '/community/members',       changefreq: 'daily',   priority: '0.6' },
      { loc: '/community/guidelines',    changefreq: 'monthly', priority: '0.4' },
      { loc: '/connect',                 changefreq: 'monthly', priority: '0.6' },
      { loc: '/investor',                changefreq: 'weekly',  priority: '0.7' },
      { loc: '/loi',                     changefreq: 'weekly',  priority: '0.7' },
      { loc: '/one-pager/land',          changefreq: 'monthly', priority: '0.5' },
      { loc: '/one-pager/alliance',      changefreq: 'monthly', priority: '0.5' },
      { loc: '/one-pager/player',        changefreq: 'monthly', priority: '0.5' },
      { loc: '/newsletter',              changefreq: 'monthly', priority: '0.5' },
      { loc: '/risk-disclosure',         changefreq: 'monthly', priority: '0.3' },
      { loc: '/terms-of-use',            changefreq: 'monthly', priority: '0.3' },
      { loc: '/privacy-policy',          changefreq: 'monthly', priority: '0.3' },
      { loc: '/disclaimers',             changefreq: 'monthly', priority: '0.3' },
    ];

    // Static blog post slugs (content is hardcoded in client/src/data/blogPosts.ts)
    const blogSlugs = [
      'what-makes-regen-civics-different',
      'remembering-season-1',
      'remembering-our-roots',
      'regen-civics-runs-on-base',
      'what-if-organizations-met-needs',
      'great-american-chestnut-abundance',
      'introducing-games-and-quests',
      'how-to-apply-for-season-2',
      'how-to-use-contribution-calculator',
      'how-to-set-up-player-profile',
      'getting-investment-through-regen-civics',
      'what-makes-land-project-good-investment',
      'claim-your-land-project-or-organisation',
      'your-seeds-contributions-live-on',
    ];

    // Dynamic DB entries (best-effort — sitemap still serves if DB is down)
    let campaignIds: number[] = [];
    let forumPostIds: number[] = [];
    try {
      const campaigns = await db.listCampaigns('active');
      campaignIds = campaigns.map((c: { id: number }) => c.id);
    } catch { /* DB unavailable — skip dynamic campaigns */ }
    try {
      const posts = await db.listForumPosts(undefined, 200, 0);
      forumPostIds = posts.map((p: { id: number }) => p.id);
    } catch { /* DB unavailable — skip dynamic forum posts */ }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&apos;');

    const urlTag = (loc: string, changefreq: string, priority: string, lastmod = now) =>
      `  <url><loc>${esc(BASE + loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticUrls.map(u => urlTag(u.loc, u.changefreq, u.priority)),
      ...blogSlugs.map(slug => urlTag(`/blog/${slug}`, 'monthly', '0.6')),
      ...campaignIds.map(id => urlTag(`/crowd-pooling-projects/${id}`, 'weekly', '0.7')),
      // Community posts excluded from sitemap to save crawl budget (thin user-generated content)
      '</urlset>',
    ];

    const xml = lines.join('\n');
    sitemapCache = { xml, generatedAt: Date.now() };

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });
  app.get('/robots.txt', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/robots.txt'));
  });
  app.get('/llms.txt', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/llms.txt'));
  });
  app.get('/llms-full.txt', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/public/llms-full.txt'));
  });
  
  // OAuth + email auth routes
  registerOAuthRoutes(app);

  // AI chat streaming endpoint
  app.post('/api/chat/stream', async (req, res) => {
    const { messages, userPath } = req.body as {
      messages?: Array<{ role: string; content: string }>;
      userPath?: string;
    };
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const PATH_GREETINGS: Record<string, string> = {
      investor: "This user is an Investor interested in funding regenerative land projects. Tailor responses to highlight investment opportunities, returns, and project due diligence.",
      land_project: "This user has a Land Project and wants to build a regenerative community. Tailor responses to highlight how to list their project, connect with investors, and use the platform's tools.",
      ally: "This user is an Alliance Partner  -  an organization supporting regenerative projects. Tailor responses to partnership opportunities, co-creation, and how to contribute expertise or resources.",
      player: "This user is a Player who wants to do Quests and co-create the Infinite Game. Tailor responses to quests, game mechanics, contribution opportunities, and community participation.",
    };

    const pathContext = userPath && PATH_GREETINGS[userPath]
      ? `\n\n## USER CONTEXT\n${PATH_GREETINGS[userPath]}`
      : "";

    try {
      const llmMessages = [
        { role: 'system' as const, content: CHAT_SYSTEM_PROMPT + pathContext },
        ...messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-20)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];

      await streamLLM({ messages: llmMessages }, (text) => {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      });

      res.write('data: [DONE]\n\n');
    } catch (err) {
      console.error('[chat/stream] error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  });
  // Email tracking routes
  registerTrackingRoutes(app);
  // Resend webhook routes
  registerResendWebhookRoutes(app);
  // Riverside recording webhook
  registerRiversideWebhookRoutes(app);
  // Presence heartbeat and count
  registerPresenceRoutes(app);

  // ── Event reminder cron endpoint ────────────────────────────────────────────
  // Called hourly by Railway cron: POST /api/cron/event-reminders
  // Finds events starting in 20–28 hours, sends reminder to all event_signups.
  // Set CRON_SECRET env var; pass as Bearer token in the cron job command.
  app.post("/api/cron/event-reminders", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    try {
      const { getDb } = await import("../db");
      const { events: eventsTable, eventSignups: signupsTable } = await import("../../drizzle/schema");
      const { sendEmail: sendResend, APP_BASE_URL: appUrl } = await import("./email");
      const { gte: dbGte, lte: dbLte, eq: dbEq, and: dbAnd } = await import("drizzle-orm");

      const database = await getDb();
      if (!database) return res.json({ skipped: true, reason: "no db" });

      const now = new Date();
      const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000); // 20h from now
      const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);   // 28h from now

      // #7 — Auto-update event status based on time
      const liveThreshold = new Date(now.getTime() - 30 * 60 * 1000);   // started >30min ago
      const completedThreshold = now;                                      // endTime has passed
      // Mark events as live if they started within the last 30 min and are still "upcoming"
      await database.update(eventsTable)
        .set({ status: "live" })
        .where(dbAnd(
          dbEq(eventsTable.status, "upcoming"),
          dbLte(eventsTable.startTime, now),
          dbGte(eventsTable.startTime, liveThreshold)
        ));
      // Mark events as completed if their endTime has passed
      const { lt: dbLt, sql: dbSql, isNotNull: dbIsNotNull } = await import("drizzle-orm");
      await database.update(eventsTable)
        .set({ status: "completed" })
        .where(dbAnd(
          dbSql`${eventsTable.status} IN ('upcoming','live')`,
          dbIsNotNull(eventsTable.endTime),
          dbLt(eventsTable.endTime as any, completedThreshold)
        ));

      // Find upcoming events in the reminder window that haven't been reminded yet
      const upcomingEvents = await database
        .select()
        .from(eventsTable)
        .where(
          dbAnd(
            dbGte(eventsTable.startTime, windowStart),
            dbLte(eventsTable.startTime, windowEnd),
            dbEq(eventsTable.reminderSent, 0),
            dbEq(eventsTable.status, "upcoming")
          )
        );

      const { sendSMS: sendTwilioSMS } = await import("./notify");

      let totalSent = 0;
      for (const event of upcomingEvents) {
        const signups = await database
          .select()
          .from(signupsTable)
          .where(dbAnd(dbEq(signupsTable.eventId, event.id), dbEq(signupsTable.signupType, "reminder")));
        if (!signups.length) {
          await database.update(eventsTable).set({ reminderSent: 1 }).where(dbEq(eventsTable.id, event.id));
          continue;
        }

        const dateStr = event.startTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const timeStr = event.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
        const joinUrl = event.riversideRoomUrl ?? event.zoomUrl ?? "https://us06web.zoom.us/j/5776315796?pwd=w43yb4Kpa6WAniIx1tHAqYINj3zoPx.1";
        const joinLabel = event.riversideRoomUrl ? "Join on Riverside" : "Join on Zoom";
        const joinColor = event.riversideRoomUrl ? "#7c3aed" : "#2d8cff";
        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1><p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">Happening tomorrow</p></div><div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;"><h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${event.title}</h2><p style="color:#444;font-size:15px;margin:0 0 20px 0;">${dateStr} at ${timeStr}</p>${event.description ? `<p style="color:#444;line-height:1.7;margin:0 0 24px 0;">${event.description}</p>` : ""}<a href="${joinUrl}" style="display:inline-block;background:${joinColor};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">${joinLabel}</a></div><div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;"><p style="color:#888;font-size:12px;margin:0;">You signed up for a reminder for this event.<br/><a href="${appUrl}/schedule" style="color:#7dd87d;">View all events</a></p></div></div>`;

        const emailSignups = signups.filter(s => s.email);
        const smsSignups = signups.filter(s => s.phone);

        // Send emails in batches
        const BATCH = 50;
        for (let i = 0; i < emailSignups.length; i += BATCH) {
          const batch = emailSignups.slice(i, i + BATCH).map(s => s.email);
          await sendResend({ to: batch, subject: `Tomorrow: ${event.title}`, html, template: "event_reminder" });
          totalSent += batch.length;
        }

        // #4 — Send SMS reminders to those who provided a phone number
        const smsText = `ReGen Civics reminder: "${event.title}" is tomorrow at ${timeStr}. Join: ${joinUrl}`;
        for (const signup of smsSignups) {
          await sendTwilioSMS(signup.phone!, smsText).catch(() => {});
        }

        await database.update(eventsTable).set({ reminderSent: 1 }).where(dbEq(eventsTable.id, event.id));
      }

      res.json({ ok: true, eventsProcessed: upcomingEvents.length, remindersSent: totalSent });
    } catch (err: any) {
      console.error("[cron/event-reminders]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Buffer + Farcaster routes
  app.use('/api/admin/buffer', bufferRouter);
  app.use('/api/admin/farcaster', farcasterRouter);
  // Image optimization proxy
  registerImageOptimization(app);
  registerOgRoutes(app);
  registerEmbedRoutes(app);
  // Cache-control for slow-changing tRPC GET endpoints (public, read-only data)
  const CACHED_TRPC_PREFIXES: Array<{ prefix: string; maxAge: number }> = [
    { prefix: "/api/trpc/forum.listCategories", maxAge: 300 },      // 5 min — forum categories change rarely
    { prefix: "/api/trpc/glossary.list", maxAge: 3600 },            // 1 hr  — glossary is static
    { prefix: "/api/trpc/seasons.list", maxAge: 3600 },             // 1 hr  — seasons change rarely
    { prefix: "/api/trpc/applications.mapData", maxAge: 120 },      // 2 min — map data is near-real-time
    { prefix: "/api/trpc/system.getPublicStats", maxAge: 300 },     // 5 min — dashboard stats
    { prefix: "/api/trpc/orgClaims.list", maxAge: 600 },            // 10 min — org list
  ];
  app.use("/api/trpc", (req, res, next) => {
    if (req.method === "GET") {
      const match = CACHED_TRPC_PREFIXES.find(({ prefix }) => req.originalUrl.startsWith(prefix));
      if (match) {
        res.setHeader("Cache-Control", `public, max-age=${match.maxAge}, stale-while-revalidate=${match.maxAge * 2}`);
      }
    }
    next();
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Sentry error handler (must come after all routes)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Branded 500 error handler — shown when the server crashes before React loads
  app.use((_err: unknown, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
    res.status(500).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ReGen Civics — Something went wrong</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(to bottom,#0a1a0a,#1a472a);font-family:system-ui,sans-serif;color:#fff;text-align:center;padding:2rem}
    .spinner{width:72px;height:72px;margin:0 auto 1.5rem;opacity:.85;animation:spin 8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{color:#d4a574;font-size:1.2rem;font-weight:300;letter-spacing:.05em;max-width:26rem;line-height:1.6;margin-bottom:.75rem}
    p{color:rgba(122,158,122,.6);font-size:.875rem;margin-bottom:2.5rem}
    .links{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center}
    a{padding:.625rem 1.25rem;border-radius:.5rem;font-size:.875rem;text-decoration:none;border:1px solid rgba(125,216,125,.3);color:#7dd87d;transition:border-color .2s}
    a:hover{border-color:rgba(125,216,125,.6)}
    a.home{background:#1a472a}
  </style>
</head>
<body>
  <div>
    <svg class="spinner" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="#7dd87d" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
      <circle cx="50" cy="20" r="16" stroke="#7dd87d" stroke-width="1.2" opacity="0.7"/>
      <circle cx="35" cy="46" r="16" stroke="#7dd87d" stroke-width="1.2" opacity="0.7"/>
      <circle cx="65" cy="46" r="16" stroke="#7dd87d" stroke-width="1.2" opacity="0.7"/>
    </svg>
    <h1>This route is broken&hellip; when we think things are broken, ponder the TAO.</h1>
    <p>An unexpected server error occurred. Our team has been notified.</p>
    <div class="links">
      <a href="/" class="home">Return Home</a>
      <a href="/community">Community</a>
      <a href="/fund">The Fund</a>
      <a href="/game">The Game</a>
    </div>
  </div>
</body>
</html>`);
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Security: CSP, Rate Limiting, Input Sanitization enabled`);
  });
}

startServer().catch(console.error);

// ─── Scheduled email processor ─────────────────────────────────────────────
async function processScheduledEmails() {
  try {
    const due = await db.getDueScheduledEmails();
    const now = new Date();
    for (const item of due) {
      if (new Date(item.scheduledFor) > now) continue; // not yet due
      try {
        const htmlBody = item.body
          .split(/\n\n+/)
          .map((p: string) => `<p style="margin:0 0 12px 0">${p.trim().replace(/\n/g, '<br/>')}</p>`)
          .join('');
        await sendEmail({
          to: item.recipientEmail,
          subject: item.subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">${htmlBody}</div>`,
          replyTo: process.env.EMAIL_REPLY_TO,
        });
        await db.updateScheduledEmailStatus(item.id, 'sent', new Date());
        console.log(`[ScheduledEmail] Sent id=${item.id} to ${item.recipientEmail}`);
      } catch (err) {
        await db.updateScheduledEmailStatus(item.id, 'failed');
        console.error(`[ScheduledEmail] Failed id=${item.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[ScheduledEmail] Processor error:', err);
  }
}

// Run every minute
setInterval(processScheduledEmails, 60_000);

// ─── Weekly digest job ───────────────────────────────────────────────────────
setTimeout(async () => {
  try { await runDigestJob(); } catch (e) { console.error("[DigestJob] Error:", e); }
  setInterval(async () => {
    try { await runDigestJob(); } catch (e) { console.error("[DigestJob] Error:", e); }
  }, 7 * 24 * 60 * 60 * 1000);
}, 60 * 1000); // first run after 1 minute

// ─── Weekly glossary job ─────────────────────────────────────────────────────
setTimeout(async () => {
  try { await runGlossaryJob(); } catch (e) { console.error("[GlossaryJob] Error:", e); }
  setInterval(async () => {
    try { await runGlossaryJob(); } catch (e) { console.error("[GlossaryJob] Error:", e); }
  }, 7 * 24 * 60 * 60 * 1000);
}, 90 * 1000); // first run after 90 seconds (staggered after digest)

// ─── Daily draft cleanup job ──────────────────────────────────────────────────
setTimeout(async () => {
  try { await runDraftCleanupJob(); } catch (e) { console.error("[DraftCleanup] Error:", e); }
  setInterval(async () => {
    try { await runDraftCleanupJob(); } catch (e) { console.error("[DraftCleanup] Error:", e); }
  }, 24 * 60 * 60 * 1000);
}, 120 * 1000); // first run after 2 minutes (staggered)
