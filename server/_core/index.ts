import "dotenv/config";
import crypto from "node:crypto";
import { logger } from "./logger";

const log = logger("server");
/** Inline cookie parser, replaces the `cookie` npm package to avoid CJS/ESM
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
import { runNotificationDigestJob } from "../jobs/notificationDigestJob";
import { runForumAffinityJob } from "../jobs/forumAffinityJob";
import { runElderForumJob } from "../jobs/elderForumJob";
import { runGlossaryJob } from "../jobs/glossaryJob";
import { runDraftCleanupJob } from "../jobs/draftCleanupJob";
import { runShipCrewListJob } from "../jobs/shipCrewList";
import { runQuestCrewAssemblyJob } from "../jobs/questCrewAssembly";
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // sampleRate controls error-event capture (separate from tracing). The
    // SDK default is already 1.0; set explicitly so it's intentional.
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || "production",
  });
}
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import express from "express";
import fsSync from "fs";
import compression from "compression";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, CHAT_SYSTEM_PROMPT } from "./oauth";
import { streamLLM } from "./llm";
import { sdk } from "./sdk";
import { buildGuidePersona, buildGuideContext, fetchGuidePreferences } from "../lib/guide-companion";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { LEARN_SLUGS } from "@shared/learnContent";
import { registerTrackingRoutes } from "../trackingRoutes";
import { registerResendWebhookRoutes } from "../webhooks/resend";
import { registerRiversideWebhookRoutes } from "../webhooks/riverside";
import { registerPresenceRoutes } from "../routes/presence";
import { registerShipCalendarRoutes } from "../routes/shipCalendarFeed";
import { registerAnalyticsRoutes } from "../routes/analytics";
import bufferRouter from "../routes/buffer";
import farcasterRouter from "../routes/farcaster";
import { registerImageOptimization } from "../routes/global";
import { registerSseRoutes } from "../routes/sse";
import { registerOgRoutes } from "../routes/og";
import { registerEmbedRoutes } from "../routes/embed";
import { registerHyphaWebhookRoutes } from "../lib/hypha-bridge/webhook-receiver";
import { registerGithubWebhookRoutes } from "../webhooks/github";
import { registerStripeWebhookRoutes } from "../webhooks/stripe";
import { registerZeffyWebhookRoutes } from "../webhooks/zeffy";
import { registerHarvestBridgeRoutes } from "../webhooks/harvest-bridge";
import { registerTelegramBrainRoutes } from "../webhooks/telegram-brain";
import { registerBrainAssetRoutes } from "../webhooks/brain-assets";
import { registerBrainExportRoutes } from "../webhooks/brain-export";
import { registerWorldviewUploadRoutes } from "../webhooks/worldview-upload";
import { getGuideWorldviewPreamble } from "../lib/worldview";
import { registerOidcRoutes } from "../routes/oidc";
import * as db from "../db";
import { sendEmail } from "./email";
import { emailDocumentFromMarkdown } from "../lib/emailHtml";
import { cspMiddleware, cspNonceMiddleware, securityHeadersMiddleware, rateLimitMiddleware, generateCSRFToken } from "./security";
import { cronAuthOk } from "./cronAuth";
import { isCacheAvailable } from "../cache";
import { initCacheOnStartup, setupCacheShutdownHandlers } from "../cacheInit";
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

  // Prerender.io middleware: REMOVED 2026-08-01, and it was serving 503s.
  //
  // This block ran whenever PRERENDER_TOKEN was set. The token in Railway was
  // invalid, so prerender-node intercepted every request with a crawler user
  // agent, proxied it to Prerender.io, got rejected, and returned an empty 503.
  // Measured against production before removal: Googlebot, bingbot, GPTBot,
  // PerplexityBot, facebookexternalhit, and Twitterbot all received
  // `HTTP 503` + `x-prerender-reject-reason: invalid-x-prerender-token-provided`
  // on `/`, `/fund`, `/custom-games`, and `/network`. Only crawlers absent from
  // prerender-node's bot list (ClaudeBot, OAI-SearchBot) and normal browsers
  // got a page. So search indexing, ChatGPT's Bing-fed citations, and every
  // social link preview were broken, and the Layer 1 crawler content could not
  // reach the crawlers it was written for.
  //
  // It fails silently by design: humans never see it, health checks never see
  // it, and a 503 to a bot leaves no trace in any surface we watch. The AI
  // crawler telemetry below logs the hit, not the status.
  //
  // The removal is the decision already on record: LLM_DISCOVERABILITY_PLAN.md
  // Layer 0 says own the rendering ourselves rather than paying Prerender.io
  // (deterministic-first, STEERING section 11), and we do. `crawler-content.ts`
  // injects real HTML bodies at request time for every route that matters, and
  // the blog and Learn hub carry full prose. Nothing here needed a third party.
  //
  // Do not reintroduce it. If server-side rendering for bots is ever wanted
  // again, extend crawler-content.ts.

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
        // Redact webhook paths: some carry the shared secret as a URL
        // segment (e.g. /api/webhooks/zeffy/:token), which would otherwise
        // land in Railway logs and leak the secret to anyone with log access.
        const loggedPath = req.path.startsWith("/api/webhooks/")
          ? req.path.replace(/^(\/api\/webhooks\/[^/]+).*/, "$1/[redacted]")
          : req.path;
        // Request log line. Skip the structured logger here so the
        // request log keeps its single-line, easy-to-grep shape.
        console.log(`[${level}] ${(req as any).id ?? '-'} ${req.method} ${loggedPath} ${res.statusCode} ${ms}ms`);
      }
    });
    next();
  });

  // AI crawler telemetry: one greppable log line per AI-bot page fetch so we
  // can verify from Railway logs which engines crawl us and what they read.
  // Grep with: railway logs | grep '\[ai-crawler\]'
  const AI_CRAWLER_RE = /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|Claude-Web|Anthropic-AI|PerplexityBot|Perplexity-User|Google-Extended|CCBot|Bytespider|Meta-ExternalAgent|Meta-ExternalFetcher|Applebot|cohere-ai|MistralAI-User|Amazonbot|DuckAssistBot|YouBot)/i;
  app.use((req, _res, next) => {
    const ua = req.headers["user-agent"];
    if (ua && !req.path.startsWith("/assets/") && req.path !== "/health") {
      const m = ua.match(AI_CRAWLER_RE);
      if (m) console.log(`[ai-crawler] ${m[1]} ${req.method} ${req.path}`);
    }
    next();
  });

  // Referral telemetry for the foundation credit. Every custom game's credit
  // link carries ?ref=<gameId> (shared/foundationCredit.ts creditHref), so this
  // one greppable line is how "referral clicks from footer credits" in the
  // master plan's success metrics gets measured, at zero token cost.
  // Grep with: railway logs | grep '\[credit-referral\]'
  app.use((req, _res, next) => {
    const ref = req.query?.ref;
    if (typeof ref === "string" && ref && ref.length <= 60 && !req.path.startsWith("/assets/")) {
      // Sanitize before logging: a ref value is attacker-controllable, and a
      // newline in it would forge a second log line.
      console.log(`[credit-referral] ${ref.replace(/[^\w.-]/g, "")} ${req.path}`);
    }
    next();
  });

  // Security middleware. cspNonceMiddleware MUST run before cspMiddleware
  // so res.locals.nonce is set in time to be embedded in the CSP header.
  app.use(cspNonceMiddleware);
  app.use(cspMiddleware);
  app.use(securityHeadersMiddleware);
  app.set('trust proxy', 1);

  // CORS: allow gov.regencivics.earth (and localhost in dev) to call our API.
  // This covers the OIDC discovery/JWKS endpoints fetched by the gov app's
  // backend, and any tRPC calls the gov frontend makes cross-origin.
  const CORS_ALLOWED_ORIGINS = new Set([
    "https://gov.regencivics.earth",
    "https://regencivics.earth",
    "http://localhost:3000",
    "http://localhost:5173",
  ]);
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && CORS_ALLOWED_ORIGINS.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-CSRF-Token");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  
  // Rate limiting on public endpoints
  app.use('/api/trpc/newsletter.subscribe', rateLimitMiddleware(15 * 60 * 1000, 5));
  app.use('/api/trpc/applications.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/investor.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/inquiry.submit', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/chat/stream', rateLimitMiddleware(60 * 1000, 20));
  app.use('/api/auth/email/request', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/oauth', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/webhooks', rateLimitMiddleware(60 * 1000, 30));
  // Forum and messaging rate limits (anti-spam)
  app.use('/api/trpc/forum.createPost', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/trpc/forum.createReply', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/messages.send', rateLimitMiddleware(60 * 1000, 50));
  // Contribution and quest rate limits (anti-gaming)
  app.use('/api/trpc/playerContributions.create', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/game.sendGratitude', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/proposals.create', rateLimitMiddleware(60 * 60 * 1000, 5));

  // Governance pipeline rate limits
  app.use('/api/trpc/governance.requestPromotion', rateLimitMiddleware(60 * 60 * 1000, 3));
  app.use('/api/trpc/governance.coSignPromotion', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/governance.watchForReady', rateLimitMiddleware(60 * 1000, 20));
  app.use('/api/trpc/governance.parkInBackField', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/governance.createStrawPoll', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/trpc/governance.voteStrawPoll', rateLimitMiddleware(60 * 1000, 30));
  app.use('/api/trpc/governance.createTenant', rateLimitMiddleware(60 * 60 * 1000, 3));
  app.use('/api/trpc/governance.suggestTemplate', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/trpc/governance.draftDecision', rateLimitMiddleware(60 * 1000, 3));
  app.use('/api/trpc/governance.joinTenant', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/governance.addLineage', rateLimitMiddleware(60 * 60 * 1000, 5));
  app.use('/api/trpc/governance.toggleStorytellerOptIn', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/governance.publishStorytellerNarrative', rateLimitMiddleware(60 * 60 * 1000, 5));
  app.use('/api/trpc/governance.postPreMortemConcern', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/governance.setDelegation', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/governance.revokeDelegation', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/governance.promoteFromBackField', rateLimitMiddleware(60 * 60 * 1000, 5));
  app.use('/api/trpc/players.setStoryteller', rateLimitMiddleware(60 * 60 * 1000, 10));
  // Token claim touches the private ledger and the Hypha bridge, so throttle
  // hard to blunt race/replay attempts. (seedsClaims.submit is rate-limited
  // at the tRPC layer in server/routes/seedsClaims.ts.)
  app.use('/api/trpc/players.requestClaim', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/trpc/hyphaBridge.create', rateLimitMiddleware(60 * 60 * 1000, 5));
  app.use('/api/trpc/proposals.signalVote', rateLimitMiddleware(60 * 1000, 20));
  // Referrals: throttle the public landing endpoint and the
  // signup-time attribution endpoint so a single IP can't backfill
  // bogus referrer credit by hammering either route.
  app.use('/api/trpc/sharing.recordReferral', rateLimitMiddleware(60 * 1000, 30));
  app.use('/api/trpc/sharing.attributeSignup', rateLimitMiddleware(60 * 60 * 1000, 10));
  // H4 additions: forum likes, profile updates, campaign contributions, profile/avatar updates
  app.use('/api/trpc/forum.toggleLike', rateLimitMiddleware(60 * 1000, 30));
  app.use('/api/trpc/forum.editPost', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/forum.editReply', rateLimitMiddleware(60 * 1000, 15));
  app.use('/api/trpc/forum.deletePost', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/trpc/forum.deleteReply', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/profiles.update', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/profiles.updateAvatar', rateLimitMiddleware(60 * 1000, 5));
  app.use('/api/trpc/players.updateProfile', rateLimitMiddleware(60 * 1000, 10));
  app.use('/api/trpc/campaigns.contribute', rateLimitMiddleware(60 * 1000, 20));
  app.use('/api/trpc/campaigns.create', rateLimitMiddleware(60 * 60 * 1000, 10));
  app.use('/api/trpc/campaigns.update', rateLimitMiddleware(60 * 1000, 20));
  // Body parser. Default limit is intentionally TIGHT to bound DoS surface.
  // Was 50mb which would allow a single attacker request to balloon Express
  // memory by 50mb. Real uploads (images, video, PDFs) go through the
  // dedicated R2 upload path with multipart streaming, not JSON. If an
  // endpoint legitimately needs more than 2mb of JSON, it should mount a
  // route-specific express.json({ limit: "Nmb" }) inline rather than
  // raising the global default.
  // Capture the raw bytes for webhook signature verification before json() parses them.
  // Handlers read (req as any).rawBody; falls back to JSON.stringify(req.body) if absent.
  app.use(express.json({
    limit: "2mb",
    verify: (req: any, _res, buf, encoding) => {
      if (typeof req.url === "string" && req.url.startsWith("/api/webhooks/")) {
        req.rawBody = buf.toString((encoding as BufferEncoding) || "utf8");
      }
    },
  }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // CSRF token endpoint, issues a CSRF token tied to the session cookie.
  // The tRPC CSRF middleware validates this token on mutations.
  app.get("/api/csrf-token", async (req, res) => {
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
    const csrfToken = await generateCSRFToken(sessionId);
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
      log.error("storage proxy", err);
      res.status(500).send("Storage error");
    }
  });

  // Sitemap cache (regenerated at most once per hour)
  let sitemapCache: { xml: string; generatedAt: number } | null = null;
  const SITEMAP_TTL = 60 * 60 * 1000; // 1 hour

  // Dynamic sitemap, includes static routes + DB-driven blog/campaign/forum URLs
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
      { loc: '/assembly',                changefreq: 'weekly',  priority: '0.6' },
      { loc: '/tokenomics',              changefreq: 'monthly', priority: '0.6' },
      { loc: '/glossary',                changefreq: 'monthly', priority: '0.5' },
      { loc: '/learn',                   changefreq: 'weekly',  priority: '0.8' },
      { loc: '/regen-games',             changefreq: 'monthly', priority: '0.6' },
      { loc: '/custom-games',            changefreq: 'monthly', priority: '0.5' },
      // Changes every time a custom game launches, which is the freshness
      // signal Perplexity rewards. Weekly, so it gets re-fetched between ships.
      { loc: '/network',                 changefreq: 'weekly',  priority: '0.6' },
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
      { loc: '/newsletter',              changefreq: 'monthly', priority: '0.5' },
      { loc: '/risk-disclosure',         changefreq: 'monthly', priority: '0.3' },
      { loc: '/terms-of-use',            changefreq: 'monthly', priority: '0.3' },
      { loc: '/privacy-policy',          changefreq: 'monthly', priority: '0.3' },
      { loc: '/disclaimers',             changefreq: 'monthly', priority: '0.3' },
      // AI Accessibility Files
      { loc: '/llms.txt',                changefreq: 'weekly',  priority: '0.8' },
      { loc: '/llms-full.txt',           changefreq: 'weekly',  priority: '0.7' },
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
      'the-regen-ship',
      'food-producers-first',
      'more-than-one-honeymoon',
    ];

    // Dynamic DB entries (best-effort, sitemap still serves if DB is down)
    let campaignIds: number[] = [];
    let forumPostIds: number[] = [];
    try {
      const campaigns = await db.listCampaigns('active');
      campaignIds = campaigns.map((c: { id: number }) => c.id);
    } catch { /* DB unavailable, skip dynamic campaigns */ }
    try {
      const posts = await db.listForumPosts(undefined, 2000, 0);
      forumPostIds = posts.map((p: { id: number }) => p.id);
    } catch { /* DB unavailable, skip dynamic forum posts */ }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&apos;');

    const urlTag = (loc: string, changefreq: string, priority: string, lastmod = now) =>
      `  <url><loc>${esc(BASE + loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticUrls.map(u => urlTag(u.loc, u.changefreq, u.priority)),
      ...blogSlugs.map(slug => urlTag(`/blog/${slug}`, 'monthly', '0.6')),
      // Learn hub (LLM_DISCOVERABILITY_PLAN.md Layer 2). Answer-first pages
      // aimed at the query space the visibility panel showed us missing from.
      // Each URL serves full prose + FAQPage JSON-LD via crawler-content.ts.
      ...LEARN_SLUGS.map(slug => urlTag(`/learn/${slug}`, 'monthly', '0.8')),
      ...campaignIds.map(id => urlTag(`/campaign/${id}`, 'weekly', '0.7')),
      // Community posts included by decision (2026-07-15): real conversations
      // by practitioners are what answer engines cite. Each post URL serves
      // full thread HTML + DiscussionForumPosting JSON-LD via the crawler
      // content injector (server/_core/crawler-content.ts).
      ...forumPostIds.map(id => urlTag(`/community/post/${id}`, 'weekly', '0.5')),
      '</urlset>',
    ];

    const xml = lines.join('\n');
    sitemapCache = { xml, generatedAt: Date.now() };

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });
  // AI accessibility files. IMPORTANT: in the production bundle __dirname is
  // dist/, so the correct copy lives at dist/public/<name> (Vite copies
  // client/public there at build, and prerender-blog.mjs appends the blog
  // section to the dist copy). The old '../../client/public' path resolved
  // outside the app root in production and served empty responses; keep the
  // client/public path only as the dev fallback.
  const publicFileCandidates = (name: string) => [
    path.join(__dirname, 'public', name),               // production: dist/public
    path.join(__dirname, '../../client/public', name),  // dev: repo source
    path.join(__dirname, '../../dist/public', name),    // dev after a local build
  ];
  const servePublicFile = (name: string, contentType: string) =>
    (_req: express.Request, res: express.Response) => {
      const file = publicFileCandidates(name).find((f) => fsSync.existsSync(f));
      if (!file) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(file);
    };
  app.get('/robots.txt', servePublicFile('robots.txt', 'text/plain; charset=utf-8'));
  app.get('/llms.txt', servePublicFile('llms.txt', 'text/plain; charset=utf-8'));
  app.get('/llms-full.txt', servePublicFile('llms-full.txt', 'text/plain; charset=utf-8'));
  app.get('/feed.xml', servePublicFile('feed.xml', 'application/rss+xml; charset=utf-8'));

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

    // Personalize the Guide for the signed-in member: their chosen name + tone,
    // and their OWN data (tokens, voyages) loaded strictly by their user id.
    // Unauthenticated visitors get the normal general assistant, no personal data.
    let guidePersona = "";
    let guideContext = "";
    try {
      const authedUser = await sdk.authenticateRequest(req);
      if (authedUser) {
        const prefs = await fetchGuidePreferences(authedUser.id);
        guidePersona = buildGuidePersona(prefs);
        guideContext = await buildGuideContext(authedUser);

        // Consent-based player memory (improvement 13): read-only journey
        // facts, ONLY for opted-in players (companionMemoryOptIn = 1), framed
        // as untrusted prior notes. Fail-soft: chat is unchanged without it.
        try {
          const { getDb } = await import("../db");
          const memDb = await getDb();
          if (memDb) {
            const { and, desc, eq, isNull } = await import("drizzle-orm");
            const { playerCompanionMemory, playerProfiles } = await import("../../drizzle/schema");
            const [profile] = await memDb
              .select({ optIn: playerProfiles.companionMemoryOptIn })
              .from(playerProfiles)
              .where(eq(playerProfiles.userId, authedUser.id))
              .limit(1);
            if ((profile?.optIn ?? 0) === 1) {
              const facts = await memDb
                .select({ fact: playerCompanionMemory.fact, createdAt: playerCompanionMemory.createdAt })
                .from(playerCompanionMemory)
                .where(and(eq(playerCompanionMemory.userId, authedUser.id), isNull(playerCompanionMemory.supersededAt)))
                .orderBy(desc(playerCompanionMemory.createdAt))
                .limit(30);
              const { framedMemoryContext } = await import("../lib/companionMemory");
              const framed = framedMemoryContext(facts);
              if (framed) guideContext = `${guideContext}\n\n${framed}`;
            }
          }
        } catch {
          // Memory must never break chat.
        }
      }
    } catch {
      // Not signed in, or session invalid: fall back to the generic guide.
    }

    // Worldview Pack (the Mycelium): ground the Guide in Rye's voice when a
    // pack is present. Fail-soft: "" when absent, and behavior is unchanged.
    let worldviewPreamble = "";
    try {
      worldviewPreamble = await getGuideWorldviewPreamble();
    } catch {
      // Pack loading must never break chat.
    }

    try {
      const systemPrompt = [guidePersona, CHAT_SYSTEM_PROMPT + pathContext + guideContext + worldviewPreamble]
        .filter(Boolean)
        .join("\n\n");
      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
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
      log.error("chat/stream error", err);
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
  // Hypha Bridge: Alchemy webhook for Base chain governance events
  registerHyphaWebhookRoutes(app);
  // GitHub webhook: merge automation for Bounty Engine
  registerGithubWebhookRoutes(app);
  // Stripe webhook: CORE church donations (checkout + subscription lifecycle)
  registerStripeWebhookRoutes(app);
  // Zeffy webhook: CORE church donations (preferred, zero-fee processor)
  registerZeffyWebhookRoutes(app);
  // Harvest bridge: the local second brain pulls Rye's captures (token auth)
  registerHarvestBridgeRoutes(app);
  // Second-brain Telegram bot: owner-only capture and buttons (secret-token auth,
  // fails closed when any of the three TELEGRAM_BRAIN_* variables is unset)
  registerTelegramBrainRoutes(app);
  // Second-brain attachments: screenshots and voice notes streamed from the
  // PRIVATE R2 prefixes behind owner session or bridge token. Never storageGet:
  // that returns a public URL when STORAGE_PUBLIC_URL is set.
  registerBrainAssetRoutes(app);
  // Second-brain export: the vault pulls new and changed items over the bridge
  // token so bot-era captures are never single-copy in one database.
  registerBrainExportRoutes(app);
  // Worldview Pack upload: the Mycelium's distribution endpoint (token auth)
  registerWorldviewUploadRoutes(app);
  // OIDC provider for shared auth with the ReGen Gov app at gov.regencivics.earth
  registerOidcRoutes(app);
  // Presence heartbeat and count
  registerPresenceRoutes(app);
  // Outbound availability feed the rental channels subscribe to
  // (GET /api/ship/calendar/:token/regen-ship.ics, guarded by SHIP_ICAL_TOKEN).
  // Our calendar is the source of truth; Outdoorsy re-reads this every 2h.
  registerShipCalendarRoutes(app);
  // First-party analytics ingest (POST /api/analytics/collect)
  registerAnalyticsRoutes(app);

  // ── Outdoorsy calendar sync cron endpoint ──────────────────────────────────
  // Called every 15 minutes by Railway cron: POST /api/cron/outdoorsy-sync
  // Pulls the Outdoorsy bookings feed, snaps each booking outward to whole
  // voyage weeks, and reconciles ship_blackout_dates against it. Idempotent:
  // rows are keyed on the channel's UID, so a repeat run over an unchanged feed
  // reports created/updated/deleted all zero.
  //
  // Fifteen minutes rather than matching Outdoorsy's two-hour pull, because the
  // window where a cancellation still reads as booked on our side is dead
  // inventory, and this direction is cheap.
  // Spec: CLAUDE_CODE_PROMPT_2026-08-01_OUTDOORSY_SYNC.md section 6.
  app.post("/api/cron/outdoorsy-sync", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runOutdoorsySync } = await import("../jobs/outdoorsySync");
      const report = await runOutdoorsySync();
      return res.json({ ok: true, ...report });
    } catch (err: any) {
      log.error("cron outdoorsy-sync failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Governance jobs cron endpoint ──────────────────────────────────────────
  // Called hourly by Railway cron: POST /api/cron/governance-jobs
  // Runs the full sweep: expire promotions, mark closing-soon, assign
  // storytellers, create renewal threads, reconcile stuck Hypha bridges.
  // Set CRON_SECRET env var; pass as Bearer token.
  app.post("/api/cron/governance-jobs", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    // Timing-safe comparison so attackers can't probe the secret byte-by-byte
    // via response-time analysis. Length mismatch returns 401 fast (length is
    // not the secret). See cronAuth.ts for why the length must be measured in
    // BYTES: measuring it in string units let a crafted header crash the
    // process instead of getting a 401.
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runAllGovernanceJobs } = await import("../jobs/governanceJobs");
      const reports = await runAllGovernanceJobs();
      return res.json({ ok: true, reports });
    } catch (err: any) {
      log.error("cron governance-jobs failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Builders' pool cron endpoint (ADR-50) ──────────────────────────────────
  // Called DAILY by Railway cron: POST /api/cron/module-pool-statement
  // (Bearer CRON_SECRET). Writes the cycle statement for the lunar cycle that
  // has just closed, if it has not been written already.
  //
  // Daily rather than monthly on purpose: a lunation is 29.53 days and no cron
  // expression lands on a new moon, so the job asks whether an unsettled closed
  // cycle exists and does nothing on the ~28 days it does not. `count: 0` with
  // a `skipped` detail is the normal answer, not a failure.
  //
  // It computes and records. It moves nothing: the statement is a document a
  // human executes through Hypha from the treasury, and server/blockchain.ts
  // stays read-only, no wallet, no signing.
  app.post("/api/cron/module-pool-statement", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runModulePoolStatement } = await import("../jobs/moduleBuildersPool");
      const report = await runModulePoolStatement();
      return res.json({ ok: true, report });
    } catch (err: any) {
      log.error("cron module-pool-statement failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Harvest generation cron endpoint ───────────────────────────────────────
  // Called hourly by Railway cron: POST /api/cron/harvest-generation (Bearer
  // CRON_SECRET). Scores transitions and drafts the eager channel for up to
  // MAX_AUTO_DRAFTS_PER_RUN newly-ripe ideas (The Harvest Phase 2).
  app.post("/api/cron/harvest-generation", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runGeneration } = await import("../lib/harvest");
      const stats = await runGeneration();
      // Stage 7: extract insights for newly-transcribed community calls
      // (bounded, cached per recording; a no-op when nothing new landed).
      let calls: { scanned: number; extracted: number; insights: number } | undefined;
      try {
        const { sweepCallInsights } = await import("../lib/call-insights");
        calls = await sweepCallInsights();
      } catch (sweepErr) {
        log.error("call-insights sweep failed", sweepErr instanceof Error ? sweepErr : undefined);
      }
      return res.json({ ok: true, ...stats, calls });
    } catch (err: any) {
      log.error("cron harvest-generation failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Harvest weekly digest cron endpoint ─────────────────────────────────────
  // Called weekly by Railway cron: POST /api/cron/harvest-digest (Bearer
  // CRON_SECRET). Clusters the week's fresh ideas and proposes three articles
  // into the feed, with a summary email to the owner (Phase 4).
  app.post("/api/cron/harvest-digest", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runWeeklyDigest } = await import("../lib/harvest");
      const result = await runWeeklyDigest();
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      log.error("cron harvest-digest failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Admin automations cron endpoint ─────────────────────────────────────────
  // Called by Railway cron: POST /api/cron/admin-automations (Bearer CRON_SECRET).
  // Runs every enabled admin automation whose cadence is due. Schedule it
  // hourly so daily/weekly digests fire on time without extra work.
  app.post("/api/cron/admin-automations", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runDueAutomations } = await import("../routes/adminAutomations");
      const report = await runDueAutomations();
      return res.json({ ok: true, ...report });
    } catch (err: any) {
      log.error("cron admin-automations failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Movement Coordination Engine pipeline cron endpoint ──────────────────
  // Called every ~10 minutes by Railway cron: POST /api/cron/coordination-pipeline
  // Polls the YouTube channel RSS for new uploads, ingests them as
  // recordings rows, runs the synthesize + extract-tasks LLM passes,
  // and inserts proposed bounty rows for the admin gate.
  // Idempotent on `recordings.youtubeVideoId`. Set CRON_SECRET env var;
  // pass as Bearer token in the cron job command.
  // Spec: MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md sections 5 + 6.
  app.post("/api/cron/coordination-pipeline", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runCoordinationPipeline } = await import("../jobs/coordinationPipeline");
      const report = await runCoordinationPipeline({});
      return res.json({ ok: true, ...report });
    } catch (err: any) {
      log.error("cron coordination-pipeline failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Movement Coordination Engine flywheel cron endpoint ─────────────────
  // Called daily by Railway cron: POST /api/cron/coordination-flywheel
  // Runs the two Phase 5 agents: stale-claims (nudge at the configured
  // window, release after the configured window) and roles-reconciliation
  // (diff client/src/data/gameRoles.ts against the roleHolders table,
  // insert new roles, refresh drifted titles/circles/aliases). Both
  // agents are idempotent. Set CRON_SECRET env var and pass it as a
  // Bearer token in the cron job command.
  app.post("/api/cron/coordination-flywheel", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runCoordinationFlywheel } = await import("../jobs/coordinationFlywheel");
      const report = await runCoordinationFlywheel();
      return res.json({ ok: true, ...report });
    } catch (err: any) {
      log.error("cron coordination-flywheel failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Tier progression detector cron endpoint ─────────────────────────────────
  // Called every 15 minutes by Railway cron: POST /api/cron/tier-detector
  // Walks every user with at least one declared path and runs the
  // detector. Idempotent: existing tier_events rows short-circuit
  // criteria that already fired, so re-running has no extra cost beyond
  // the read pass. See server/lib/tierDetector.ts and
  // QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md section 7.
  // Set CRON_SECRET env var; pass as Bearer token in the cron job command.
  app.post("/api/cron/tier-detector", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { detectTierProgressionForAllUsers } = await import("../lib/tierDetector");
      const report = await detectTierProgressionForAllUsers();
      return res.json({ ok: true, ...report });
    } catch (err: any) {
      log.error("cron tier-detector failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Federation: public project directory (Phase C2, improvement 11) ─────────
  // GET /api/federation/projects.json — the machine-readable directory partner
  // networks fetch (GEN, OpenCivics, BioFi, the Ethereum localism cluster).
  // Public data only: the same visibility statuses as publicDetail, a
  // whitelisted field set, and the impact summary via publicImpactSummary()
  // (shared/impact.ts decides what is public; nothing personal). Cached.
  // Deeper partner handoffs wait for the Federation Bridge (ADR in
  // .ai/docs/DECISIONS.md); this endpoint is read-only surface area.
  app.get("/api/federation/projects.json", async (_req, res) => {
    try {
      const { cacheGet, cacheSet } = await import("../cache");
      const CACHE_KEY = "federation:projects";
      const cached = await cacheGet<object>(CACHE_KEY);
      if (cached) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.json(cached);
      }
      const db = await import("../db");
      const { parseImpactData, publicImpactSummary } = await import("@shared/impact");
      const allApps = await db.getAllApplications();
      const visibleStatuses = ["submitted", "under_review", "approved", "active"];
      const projects = allApps
        .filter((app: any) => visibleStatuses.includes(app.status ?? ""))
        .map((app: any) => ({
          id: app.id,
          name: app.projectName,
          projectType: app.projectType,
          location: app.location ?? null,
          country: app.country ?? null,
          websiteUrl: app.websiteUrl ?? null,
          videoUrl: app.videoUrl ?? null,
          // Projects render on the Civics map; there is no per-project page yet
          // (improvement 9, on hold). Only URLs that resolve, per SHIPPED_LOG.
          profileUrl: "https://regencivics.earth/map",
          impact: publicImpactSummary(parseImpactData(app.impactData)),
        }));
      const payload = {
        network: "ReGen Civics",
        description:
          "Regenerative land projects in the ReGen Civics incubator and alliance. Impact fields follow shared/impact.ts (Common Impact Data Standard mapping in its header).",
        docs: "https://regencivics.earth/llms.txt",
        generatedAt: new Date().toISOString(),
        projects,
      };
      await cacheSet(CACHE_KEY, payload, 600);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.json(payload);
    } catch (err: any) {
      log.error("federation projects.json failed", err);
      return res.status(500).json({ error: "temporarily unavailable" });
    }
  });

  // ── The network of games: the return half of the foundation credit ──────────
  // GET /api/network/games.json — every live custom game built with ReGen
  // Civics, with the link back out to it. Each delivered game credits us in its
  // footer (shared/foundationCredit.ts); this is how we credit them back, and
  // what /network renders from.
  //
  // Registry-driven (shared/networkRegistry.ts), enriched best-effort from each
  // game's own federation feed, cached in server/lib/network-feed.ts. Public
  // data only: what the owner already publishes on their own site.
  app.get("/api/network/games.json", async (_req, res) => {
    try {
      const { getNetworkFeed } = await import("../lib/network-feed");
      const payload = await getNetworkFeed();
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=600");
      return res.json(payload);
    } catch (err: any) {
      log.error("network games.json failed", err);
      return res.status(500).json({ error: "temporarily unavailable" });
    }
  });

  // ── Learn hub slugs, reserved ahead of the pages ────────────────────────────
  // The foundation credit links to /learn/regenerative-economics from every
  // custom game's about page, and those links live in other people's
  // deployments where we cannot edit them later. The Learn hub shipped six
  // articles and that is not one of them, so the slug resolves by 301 to the
  // page that does answer the query (nine forms of capital, the "new economics"
  // cluster in LLM_DISCOVERABILITY_PLAN.md section 3). Equity passes through,
  // and no crawler following a credit link ever sees a 404.
  //
  // A real Learn article always wins: LEARN_SLUGS is checked first, so writing
  // the article is all it takes to retire a redirect. Nobody has to remember to
  // come back and delete the entry.
  const LEARN_SLUG_REDIRECTS: Record<string, string> = {
    "regenerative-economics": "/learn/nine-forms-of-capital",
  };
  app.get("/learn/:slug", (req, res, next) => {
    const slug = req.params.slug;
    if ((LEARN_SLUGS as readonly string[]).includes(slug)) return next();
    const target = LEARN_SLUG_REDIRECTS[slug];
    if (!target) return next();
    return res.redirect(301, target);
  });

  // ── Multiplayer crew assembly cron endpoint ─────────────────────────────────
  // Called by Railway cron (suggested: every 30 minutes): POST /api/cron/quest-crew-assembly
  // Deterministic, zero LLM: groups open signups by (quest, bioregion), forms
  // crews at crewSizeMin, creates crew chat threads, sends formation emails
  // (idempotent per member per crew via formationEmailSentAt), and sweeps
  // quest completions to close finished crews. Safe to re-run at any time.
  // Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md, Phase A.
  // Set CRON_SECRET env var; pass as Bearer token in the cron job command.
  app.post("/api/cron/quest-crew-assembly", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runQuestCrewAssemblyJob } = await import("../jobs/questCrewAssembly");
      const report = await runQuestCrewAssemblyJob();
      return res.json(report);
    } catch (err: any) {
      log.error("cron quest-crew-assembly failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Needs and Offers matcher cron endpoint ──────────────────────────────────
  // POST /api/cron/needs-offers-matcher (Bearer CRON_SECRET). Deterministic
  // tag + bioregion matching with one introduction email per pair ever and a
  // per-party daily cap; also runs daily in-process. Safe to re-run any time.
  // Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md, Phase B.
  app.post("/api/cron/needs-offers-matcher", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { runNeedsOffersMatcherJob } = await import("../jobs/needsOffersMatcher");
      const report = await runNeedsOffersMatcherJob();
      return res.json(report);
    } catch (err: any) {
      log.error("cron needs-offers-matcher failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Event reminder cron endpoint ────────────────────────────────────────────
  // Called hourly by Railway cron: POST /api/cron/event-reminders
  // Finds events starting in 20–28 hours, sends reminder to all event_signups.
  // Set CRON_SECRET env var; pass as Bearer token in the cron job command.
  app.post("/api/cron/event-reminders", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "CRON_SECRET not configured" });
    }
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) {
      return res.status(401).json({ error: "Unauthorized" });
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

      // #7. Auto-update event status based on time
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
        const joinUrl = event.riversideRoomUrl ?? event.zoomUrl ?? "";
        const joinLabel = "Join on Riverside";
        const joinColor = "#7c3aed";
        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background-color: #1a472a; background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1><p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">Happening tomorrow</p></div><div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;"><h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${event.title}</h2><p style="color:#444;font-size:15px;margin:0 0 20px 0;">${dateStr} at ${timeStr}</p>${event.description ? `<p style="color:#444;line-height:1.7;margin:0 0 24px 0;">${event.description}</p>` : ""}<a href="${joinUrl}" style="display:inline-block;background:${joinColor};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">${joinLabel}</a></div><div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;"><p style="color:#888;font-size:12px;margin:0;">You signed up for a reminder for this event.<br/><a href="${appUrl}/schedule" style="color:#7dd87d;">View all events</a></p></div></div>`;

        const emailSignups = signups.filter(s => s.email);
        const smsSignups = signups.filter(s => s.phone);

        // Send emails in batches
        const BATCH = 50;
        for (let i = 0; i < emailSignups.length; i += BATCH) {
          const batch = emailSignups.slice(i, i + BATCH).map(s => s.email);
          await sendResend({ to: batch, subject: `Tomorrow: ${event.title}`, html, template: "event_reminder" });
          totalSent += batch.length;
        }

        // #4. Send SMS reminders to those who provided a phone number
        const smsText = `ReGen Civics reminder: "${event.title}" is tomorrow at ${timeStr}. Join: ${joinUrl}`;
        for (const signup of smsSignups) {
          await sendTwilioSMS(signup.phone!, smsText).catch(() => {});
        }

        await database.update(eventsTable).set({ reminderSent: 1 }).where(dbEq(eventsTable.id, event.id));
      }

      // Durable admin-scheduled custom reminders (persisted by
      // events.sendReminders instead of an in-memory setTimeout). Send any
      // whose scheduled time has passed and that haven't been sent yet.
      let scheduledSent = 0;
      const dueScheduled = await database
        .select()
        .from(eventsTable)
        .where(dbAnd(
          dbIsNotNull(eventsTable.reminderScheduledFor),
          dbLte(eventsTable.reminderScheduledFor as any, now),
          dbEq(eventsTable.reminderSent, 0),
        ));
      for (const event of dueScheduled) {
        const signups = await database
          .select()
          .from(signupsTable)
          .where(dbAnd(
            dbEq(signupsTable.eventId, event.id),
            dbEq(signupsTable.signupType, "reminder"),
            dbSql`${signupsTable.cancelledAt} IS NULL`,
          ));
        if (signups.length) {
          const dateStr = event.startTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          const timeStr = event.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
          const joinUrl = event.riversideRoomUrl ?? event.zoomUrl ?? "";
          const subj = event.reminderCustomSubject?.trim() || `Reminder: ${event.title}`;
          const bodyText = event.reminderCustomBody?.trim() || (event.description ?? "");
          const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background-color: #1a472a; background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1><p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">Event reminder</p></div><div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;"><h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${event.title}</h2><p style="color:#444;font-size:15px;margin:0 0 20px 0;">${dateStr} at ${timeStr}</p>${bodyText ? `<p style="color:#444;line-height:1.7;margin:0 0 24px 0;">${bodyText}</p>` : ""}<a href="${joinUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Join on Riverside</a></div><div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;"><p style="color:#888;font-size:12px;margin:0;">You signed up for a reminder for this event.<br/><a href="${appUrl}/schedule" style="color:#7dd87d;">View all events</a></p></div></div>`;
          const emailSignups = signups.filter(s => s.email);
          const BATCH = 50;
          for (let i = 0; i < emailSignups.length; i += BATCH) {
            const batch = emailSignups.slice(i, i + BATCH).map(s => s.email);
            await sendResend({ to: batch, subject: subj, html, template: "event_reminder" });
            scheduledSent += batch.length;
          }
        }
        await database.update(eventsTable)
          .set({ reminderSent: 1, reminderScheduledFor: null })
          .where(dbEq(eventsTable.id, event.id));
      }

      res.json({ ok: true, eventsProcessed: upcomingEvents.length, remindersSent: totalSent, scheduledSent });
    } catch (err: any) {
      log.error("cron/event-reminders", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Gratitude cycle close cron endpoint ────────────────────────────────────
  // Called hourly by Railway cron: POST /api/cron/gratitude-cycles
  // A lunation ends at an arbitrary hour, so closing hourly keeps a cycle from
  // sitting open for most of a day after its new moon. Idempotent: the status
  // guard, uniq_dist, and the ledger idempotencyKey make a repeat run a no-op,
  // so running this hourly AND inside the nightly batch is safe.
  app.post("/api/cron/gratitude-cycles", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: "CRON_SECRET not configured" });
    // Same helper as every other cron endpoint. This one was written before
    // that helper existed and merged cleanly around it, which is how a
    // textual merge can leave a single endpoint still carrying a hole the
    // rest of the file no longer has.
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { getDb } = await import("../db");
      const database = await getDb();
      if (!database) return res.json({ skipped: true, reason: "no db" });
      const { closeDueCycles } = await import("../lib/gratitude-cycles");
      const result = await closeDueCycles(database);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      log.error("cron gratitude-cycles failed", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Nightly batch cron endpoint ────────────────────────────────────────────
  // Called once per day by Railway cron: POST /api/cron/nightly-batch
  // Runs a SUBSET of the admin-triggered batchJobs.runNightly procedure:
  //   citizenship tiers, event status sweep, crowdpool claim expiry,
  //   partner-progress hydration, and gratitude cycle close.
  // It is not full parity with runNightly, and the comment that used to claim
  // parity hid the fact that gratitude cycles never closed in production
  // (audit 2026-07-28). Anything added to runNightly must be added here too,
  // or it only ever runs when a human clicks the admin button.
  // Set CRON_SECRET env var; pass as Bearer token in the cron job command.
  app.post("/api/cron/nightly-batch", express.json(), async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "CRON_SECRET not configured" });
    }
    const ok = cronAuthOk(req.headers.authorization, secret);
    if (!ok) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { getDb } = await import("../db");
      const { sql: dbSql } = await import("drizzle-orm");
      const { checkCitizenshipTiers } = await import("../lib/citizenship");
      const database = await getDb();
      if (!database) return res.json({ skipped: true, reason: "no db" });

      const startedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
      await database.execute(dbSql`
        INSERT INTO batch_job_runs (jobType, startedAt, status, triggeredBy, createdAt)
        VALUES ('nightly', ${startedAt}, 'running', 'cron', NOW())
      `);
      const [lastId] = await database.execute(dbSql`SELECT LAST_INSERT_ID() as id`);
      const jobId = (lastId as any)?.[0]?.id;

      const errors: string[] = [];
      let promotions = 0;
      let demotions = 0;
      try {
        const tierResult = await checkCitizenshipTiers(database);
        promotions = tierResult.promotions;
        demotions = tierResult.demotions;
      } catch (e: any) { errors.push(`tiers: ${e.message}`); }

      // Event status sweep: upcoming -> live -> completed
      try {
        const { sweepEventStatuses } = await import("../lib/eventStatusSweep");
        await sweepEventStatuses();
      } catch (e: any) { errors.push(`eventSweep: ${e.message}`); }

      // Crowdpool claim expiry sweep + reminders: releases reserved slots on
      // needs whose claims blew their delivery window.
      try {
        const { expireCrowdpoolClaims } = await import("../routes/batchJobs");
        await expireCrowdpoolClaims(database);
      } catch (e: any) { errors.push(`crowdpoolClaims: ${e.message}`); }

      // Partner-progress hydration: refresh cached Ma Earth / GoSteward numbers
      // on active + funded campaigns. Fetch or parse failures leave stale cache
      // untouched (never zeroed).
      try {
        const { hydrateCampaignPartnerLinks } = await import("../routes/batchJobs");
        await hydrateCampaignPartnerLinks(database);
      } catch (e: any) { errors.push(`partnerHydration: ${e.message}`); }

      // Gratitude lunar cycles: close every cycle whose new moon has passed,
      // write acknowledgment weights, distribute the capped $ReGen pool, and
      // open the current lunation. Idempotent. The dedicated hourly endpoint
      // below normally gets there first; this is the safety net.
      let gratitudeClosed = 0;
      let gratitudeCredited = 0;
      try {
        const { closeDueCycles } = await import("../lib/gratitude-cycles");
        const g = await closeDueCycles(database);
        gratitudeClosed = g.closed;
        gratitudeCredited = g.credited;
      } catch (e: any) { errors.push(`gratitudeCycles: ${e.message}`); }

      const status = errors.length === 0 ? "success" : "partial_failure";
      if (jobId) {
        await database.execute(dbSql`
          UPDATE batch_job_runs
          SET completedAt = NOW(), status = ${status},
              promotions = ${promotions}, demotions = ${demotions},
              errors = ${errors.length > 0 ? JSON.stringify(errors) : null}
          WHERE id = ${jobId}
        `);
      }
      res.json({ ok: true, status, promotions, demotions, gratitudeClosed, gratitudeCredited, errors });
    } catch (err: any) {
      log.error("cron/nightly-batch", err);
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
  // Server-Sent Events: per-user push channel for invalidation events.
  // Replaces the high-frequency polling loop in NotificationBell, the
  // navigation unread badge, and LiveActivityFeed.
  registerSseRoutes(app);
  // Cache-control for slow-changing tRPC GET endpoints (public, read-only data)
  const CACHED_TRPC_PREFIXES: Array<{ prefix: string; maxAge: number }> = [
    { prefix: "/api/trpc/forum.listCategories", maxAge: 300 },      // 5 min, forum categories change rarely
    { prefix: "/api/trpc/glossary.list", maxAge: 3600 },            // 1 hr , glossary is static
    { prefix: "/api/trpc/seasons.list", maxAge: 3600 },             // 1 hr , seasons change rarely
    { prefix: "/api/trpc/applications.mapData", maxAge: 120 },      // 2 min, map data is near-real-time
    { prefix: "/api/trpc/system.getPublicStats", maxAge: 300 },     // 5 min, dashboard stats
    { prefix: "/api/trpc/orgClaims.list", maxAge: 600 },            // 10 min, org list
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
      // tRPC catches procedure errors and formats them into JSON responses, so
      // they never propagate to the Express error handler where Sentry's
      // setupExpressErrorHandler listens. That is why traces were flowing but
      // zero errors were captured. Forward genuine server faults
      // (INTERNAL_SERVER_ERROR, i.e. uncaught throws inside procedures) to
      // Sentry here. Expected client errors (UNAUTHORIZED, BAD_REQUEST,
      // TOO_MANY_REQUESTS, NOT_FOUND, ...) are intentionally skipped so the
      // issues dashboard stays high-signal.
      onError({ error, path, type }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          Sentry.captureException(error.cause ?? error, (scope) => {
            scope.setTag("trpc.path", path ?? "unknown");
            scope.setTag("trpc.type", type);
            return scope;
          });
        }
      },
    })
  );
  // Sentry error handler (must come after all routes)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Branded 500 error handler, shown when the server crashes before React loads
  app.use((_err: unknown, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
    res.status(500).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ReGen Civics. Something went wrong</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background-color: #0a1a0a; background:linear-gradient(to bottom,#0a1a0a,#1a472a);font-family:system-ui,sans-serif;color:#fff;text-align:center;padding:2rem}
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
    log.warn("port busy, falling back", { preferredPort, port });
  }

  // Connect Redis (if REDIS_URL is set) before accepting traffic. This was
  // previously defined in cacheInit.ts but never invoked, so CSRF tokens,
  // webhook-failure buckets, and rate limits silently ran on the in-memory
  // fallback in production even after REDIS_URL was configured. isCacheAvailable()
  // gates all of those call sites, so this is safe to no-op when unset.
  await initCacheOnStartup();
  setupCacheShutdownHandlers();

  server.listen(port, () => {
    log.info(`Server running on http://localhost:${port}/`);
    log.info("Security: CSP, Rate Limiting, Input Sanitization enabled");
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
        await sendEmail({
          to: item.recipientEmail,
          subject: item.subject,
          html: emailDocumentFromMarkdown(item.body),
          // No replyTo: replies route through /connect, not into an inbox.
        });
        await db.updateScheduledEmailStatus(item.id, 'sent', new Date());
        log.info("ScheduledEmail sent", { id: item.id, recipient: item.recipientEmail });
      } catch (err) {
        await db.updateScheduledEmailStatus(item.id, 'failed');
        log.error(`ScheduledEmail failed id=${item.id}`, err);
      }
    }
  } catch (err) {
    log.error("ScheduledEmail processor error", err);
  }
}

// Run every minute
setInterval(processScheduledEmails, 60_000);

// ─── Weekly digest job ───────────────────────────────────────────────────────
setTimeout(async () => {
  try { await runDigestJob(); } catch (e) { log.error("DigestJob error", e); }
  setInterval(async () => {
    try { await runDigestJob(); } catch (e) { log.error("DigestJob error", e); }
  }, 7 * 24 * 60 * 60 * 1000);
}, 60 * 1000); // first run after 1 minute

// ─── Daily notification digest ───────────────────────────────────────────────
// Batches unread, un-emailed forum notifications (mentions, replies,
// gratitude) into one email per user per day, honoring per-type prefs.
// Deterministic aggregation, no LLM. Idempotent via emailedAt stamps.
setTimeout(async () => {
  try { await runNotificationDigestJob(); } catch (e) { log.error("NotificationDigestJob error", e); }
  setInterval(async () => {
    try { await runNotificationDigestJob(); } catch (e) { log.error("NotificationDigestJob error", e); }
  }, 24 * 60 * 60 * 1000);
}, 5 * 60 * 1000); // first run after 5 minutes

// ─── Nightly forum affinity computation ─────────────────────────────────────
// Builds per-user category/author/tag relevance scores for the For You feed.
// Pure SQL aggregation with recency decay; idempotent full refresh.
setTimeout(async () => {
  try { await runForumAffinityJob(); } catch (e) { log.error("ForumAffinityJob error", e); }
  setInterval(async () => {
    try { await runForumAffinityJob(); } catch (e) { log.error("ForumAffinityJob error", e); }
  }, 24 * 60 * 60 * 1000);
}, 7 * 60 * 1000); // first run after 7 minutes

// ─── Daily ReGen Ship crew-list trigger ─────────────────────────────────────
// Emails confirmed crew-list signups when a bookable week now matches their
// interests (any week / this season / winter / year two), at most once a
// fortnight per signup. Deterministic enumeration, idempotent via lastNotifiedAt.
setTimeout(async () => {
  try { await runShipCrewListJob(); } catch (e) { log.error("ShipCrewListJob error", e); }
  setInterval(async () => {
    try { await runShipCrewListJob(); } catch (e) { log.error("ShipCrewListJob error", e); }
  }, 24 * 60 * 60 * 1000);
}, 9 * 60 * 1000); // first run after 9 minutes

// ─── Daily Free Voyage Giveaway sweep ────────────────────────────────────────
// Expires unverified public entries after 7 days (one resend at day 3) and
// recomputes referral credits from confirmed referrals. Deterministic, zero LLM,
// idempotent; also triggerable via batchJobsRouter.runGiveawaySweep.
setTimeout(async () => {
  const runGiveawaySweep = async () => {
    const { expireGiveawayEntries } = await import("../routes/batchJobs");
    const database = await db.getDb();
    if (database) await expireGiveawayEntries(database);
  };
  try { await runGiveawaySweep(); } catch (e) { log.error("GiveawaySweep error", e); }
  setInterval(async () => {
    try { await runGiveawaySweep(); } catch (e) { log.error("GiveawaySweep error", e); }
  }, 24 * 60 * 60 * 1000);
}, 13 * 60 * 1000); // first run after 13 minutes

// ─── Multiplayer crew assembly (every 30 minutes) ────────────────────────────
// Forms quest crews when (quest, bioregion) signups reach crewSizeMin, creates
// crew chat threads, sends formation emails (idempotent per member per crew),
// and sweeps completions. Deterministic, zero LLM, safe to re-run; also
// triggerable via POST /api/cron/quest-crew-assembly for a manual kick.
setTimeout(async () => {
  try { await runQuestCrewAssemblyJob(); } catch (e) { log.error("QuestCrewAssemblyJob error", e); }
  setInterval(async () => {
    try { await runQuestCrewAssemblyJob(); } catch (e) { log.error("QuestCrewAssemblyJob error", e); }
  }, 30 * 60 * 1000);
}, 5 * 60 * 1000); // first run after 5 minutes

// ─── Consent-based player memory writer (daily) ──────────────────────────────
// Derives game-journey facts from events for OPTED-IN players only
// (companionMemoryOptIn = 1, default off). Deterministic, zero LLM, idempotent
// via the (userId, sourceRef) unique key. The transparency surface in settings
// is the gate and the mirror: full list, delete any or all, export.
setTimeout(async () => {
  try { const { runCompanionMemoryJob } = await import("../jobs/companionMemoryJob"); await runCompanionMemoryJob(); } catch (e) { log.error("CompanionMemoryJob error", e); }
  setInterval(async () => {
    try { const { runCompanionMemoryJob } = await import("../jobs/companionMemoryJob"); await runCompanionMemoryJob(); } catch (e) { log.error("CompanionMemoryJob error", e); }
  }, 24 * 60 * 60 * 1000);
}, 17 * 60 * 1000); // first run after 17 minutes

// ─── Needs and Offers matcher (daily) ────────────────────────────────────────
// Deterministic tag + bioregion matching over the board and application-form
// captures. One introduction email per (need, offer) pair ever (ledgered),
// per-party daily cap. Also triggerable via POST /api/cron/needs-offers-matcher.
setTimeout(async () => {
  try { const { runNeedsOffersMatcherJob } = await import("../jobs/needsOffersMatcher"); await runNeedsOffersMatcherJob(); } catch (e) { log.error("NeedsOffersMatcherJob error", e); }
  setInterval(async () => {
    try { const { runNeedsOffersMatcherJob } = await import("../jobs/needsOffersMatcher"); await runNeedsOffersMatcherJob(); } catch (e) { log.error("NeedsOffersMatcherJob error", e); }
  }, 24 * 60 * 60 * 1000);
}, 11 * 60 * 1000); // first run after 11 minutes

// ─── Elders' community presence (CORE) ───────────────────────────────────────
// The elders comment on new community posts (routed to the best-fit elder, or
// called by an @mention) and reply once to replies to their comments, in their
// own voice. Deterministic-first: the poll is a plain DB query; only routing and
// the comment text cost a model call. Runs a few times a day. Silenced by setting
// ELDER_FORUM_ENABLED=false. Bounded by per-run caps in elderForumJob.
const ELDER_FORUM_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours (~4x/day)
setTimeout(async () => {
  try { await runElderForumJob(); } catch (e) { log.error("ElderForumJob error", e); }
  setInterval(async () => {
    try { await runElderForumJob(); } catch (e) { log.error("ElderForumJob error", e); }
  }, ELDER_FORUM_INTERVAL_MS);
}, 3 * 60 * 1000); // first run after 3 minutes

// ─── Weekly glossary job ─────────────────────────────────────