import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { resolveCrawlerContent, escapeHtml, type CrawlerContent } from "./crawler-content";
import { LEARN_SLUGS } from "@shared/learnContent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Rewrites the shell's head tags for one request.
 *
 * `title` and `description` are NOT always ours. For /community/post/:id and
 * /campaign/:id they come from crawler-content.ts, which builds them from the
 * forum post title and the campaign title, both of which are text any signed-in
 * member can write. Until 2026-08-03 the title went into the <title> element
 * with no escaping at all (the attributes got quote-escaping only), so a post
 * titled
 *
 *     </title><link rel="canonical" href="https://spam.example/"><title>x
 *
 * closed the element early and injected an attacker-controlled canonical AHEAD
 * of the real one. That is the exact shape of the blog bug fixed the same day:
 * the first canonical is the one a crawler acts on, and conflicting canonicals
 * get ignored entirely. A single forum post could have pointed a crawlable
 * ReGen Civics URL at someone else's domain. The same hole took arbitrary
 * <meta http-equiv="refresh"> and any other head markup.
 *
 * Everything interpolated here is escaped now, element text and attribute
 * values alike. `canonical` and `ogImage` are server-built from BASE_URL and a
 * matched numeric id, never from user text, but they get the same treatment so
 * there is no "which of these is safe" question to get wrong later.
 */
export function injectMetaTags(
  shell: string,
  meta: { title: string; description: string; canonical: string; ogImage: string },
): string {
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);
  const ogImage = escapeHtml(meta.ogImage);

  // Non-global replaces on purpose: the shell carries exactly one of each tag
  // and a second one would be a shell bug, not something to paper over here.
  // server/vite-meta.test.ts asserts the counts stay at one.
  return shell
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    // Open Graph
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${ogImage}$2`)
    // Twitter Card
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta name="twitter:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${ogImage}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const projectRoot = path.resolve(__dirname, "../..");
  const clientRoot = path.join(projectRoot, "client");
  const configPath = path.join(projectRoot, "vite.config.ts");

  const vite = await createViteServer({
    ...viteConfig,
    configFile: configPath,
    root: clientRoot,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - they should never get the SPA HTML fallback
    if (url.startsWith("/api/")) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../..", "dist", "public")
      : path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Per-request nonce substitution helper. Replaces every `{{NONCE}}`
  // placeholder AND adds `nonce="..."` to every external <script src>
  // tag and every <link rel="modulepreload"> tag that does not already
  // have one. CSP `'strict-dynamic'` requires a nonce on every script
  // load (including modulepreload, which is governed by script-src-elem).
  // Without this, the main bundle and its preloaded chunks are blocked.
  const applyNonce = (html: string, nonce: string): string => {
    return html
      .replaceAll("{{NONCE}}", nonce)
      .replace(
        /<script(?![^>]*\bnonce=)([^>]*\bsrc=)/g,
        `<script nonce="${nonce}"$1`
      )
      .replace(
        /<link(?![^>]*\bnonce=)([^>]*\brel="modulepreload")/g,
        `<link nonce="${nonce}"$1`
      );
  };

  // Dedicated HTML handlers MUST run BEFORE express.static so we can
  // substitute the per-request CSP nonce into the inline <style> and
  // <script> blocks. Without this, the static middleware would serve the
  // raw template with `{{NONCE}}` placeholders intact and the page would
  // be blocked by strict CSP.
  let offlineHtmlCache: string | null = null;
  app.get("/offline.html", (_req, res) => {
    const offlinePath = path.resolve(distPath, "offline.html");
    if (!offlineHtmlCache || process.env.NODE_ENV === "development") {
      try { offlineHtmlCache = fs.readFileSync(offlinePath, "utf-8"); } catch { /* fall through */ }
    }
    if (!offlineHtmlCache) {
      res.sendFile(offlinePath);
      return;
    }
    const nonce = (res.locals.nonce as string) || "";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // no-store (not no-cache): prevents browsers from revalidating via
    // 304 with a stale body. With nonce-based CSP, a 304 response would
    // serve cached HTML carrying an old nonce alongside a fresh CSP
    // header carrying a new nonce, and the browser would block every
    // inline script and style as a nonce mismatch.
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.send(applyNonce(offlineHtmlCache, nonce));
  });

  // Same treatment for the root index.html: serve the substituted template
  // for `/` directly so the static middleware does not return the raw file
  // with placeholders. The catch-all below handles every other SPA route.
  let rootIndexHtmlCache: string | null = null;
  app.get("/", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (!rootIndexHtmlCache || process.env.NODE_ENV === "development") {
      try { rootIndexHtmlCache = fs.readFileSync(indexPath, "utf-8"); } catch { /* fall through */ }
    }
    if (!rootIndexHtmlCache) {
      res.sendFile(indexPath);
      return;
    }
    const nonce = (res.locals.nonce as string) || "";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // no-store (not no-cache): prevents browsers from revalidating via
    // 304 with a stale body. With nonce-based CSP, a 304 response would
    // serve cached HTML carrying an old nonce alongside a fresh CSP
    // header carrying a new nonce, and the browser would block every
    // inline script and style as a nonce mismatch.
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.send(applyNonce(rootIndexHtmlCache, nonce));
  });

  // Vite hashes all asset filenames (e.g. index-abc123.js), so it's safe to
  // cache them for 1 year. HTML is explicitly excluded so every .html
  // request flows through the nonce-substituting handlers above and the
  // catch-all below. Without this skip, express.static would serve the
  // raw template files with `{{NONCE}}` placeholders intact and strict
  // CSP would block every inline script and style.
  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    etag: true,
    extensions: false,
    index: false,
    // `redirect: false` because the blog prerender writes real directories
    // (dist/public/blog/<slug>/index.html). With the default `redirect: true`,
    // express.static answers a request for a directory path with a 301 to the
    // trailing-slash form, so every URL we publish for a blog post cost a
    // crawler an extra hop: sitemap and llms.txt advertise /blog/<slug>, that
    // 301'd to /blog/<slug>/, and the page served there declared its canonical
    // as /blog/<slug> again. Measured on 2026-08-03 across 10 published URLs
    // (/community, /blog, /map, /ship and 6 posts). With redirect off, the
    // request falls through to the blog handler below, which matches both
    // forms and serves 200 at the URL we actually advertise.
    redirect: false,
    setHeaders(res, filePath) {
      // Don't cache HTML or service worker files, they must always reflect the latest deploy
      if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("registerSW.js")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // (injectMetaTags lives at module scope, below, so it can be tested.)

  // ── Server-side meta tag injection ──────────────────────────────────────────
  // Google's crawler often sees the empty <div id="root"></div> SPA shell before
  // React hydrates. This catch-all handler injects per-route meta tags directly
  // into the served HTML so crawlers see real titles/descriptions immediately.
  // This is NOT full SSR, it's lightweight meta tag pre-population.
  //
  // The meta tag map mirrors client/src/components/SEO.tsx `pageSEO`. Keep them in sync.
  const BASE_URL = "https://regencivics.earth";
  const DEFAULT_META = {
    title: "ReGen Civics: Infinite Game for the ReGenerative Renaissance",
    description: "A fund and a game for regenerative land projects. Do quests, earn tokens, fund real-world regeneration.",
    image: `${BASE_URL}/og-default.jpg`,
  };
  const ROUTE_META: Record<string, { title: string; description: string; image?: string }> = {
    "/fund":        { title: "ReGen Civics Fund: Invest in Regenerative Land", description: "Invest in the ReGenerative Renaissance. ReGen Civics pools capital to support land projects healing communities and ecosystems.", image: `${BASE_URL}/og/fund.jpg` },
    "/game":        { title: "The Infinite Game: ReGen Civics", description: "A real-world game for the ReGenerative Renaissance. Complete quests, earn $ReGen tokens, and help build the world we all want to live in.", image: `${BASE_URL}/og/game.jpg` },
    "/quest":       { title: "Quests: ReGen Civics", description: "Rites of passage, seasonal practices, and community challenges. Complete quests, earn tokens, and deepen your regenerative path.", image: `${BASE_URL}/og/quest.jpg` },
    "/schedule":    { title: "Events & Sessions: ReGen Civics", description: "Live community sessions, open calls, and events. Connect with fellow regenerators and participate in the Infinite Game.", image: `${BASE_URL}/og/schedule.jpg` },
    "/community":   { title: "Community: ReGen Civics", description: "A growing network of regenerators, land projects, and organizations building the ReGenerative Renaissance together.", image: `${BASE_URL}/og/community.jpg` },
    "/governance":  { title: "Governance: ReGen Civics", description: "Voice-based governance rooted in land and contribution. How ReGen Civics makes decisions, and who has a say.", image: `${BASE_URL}/og/governance.jpg` },
    "/map":         { title: "Regenerative Land Map: ReGen Civics", description: "Explore a living map of regenerative land projects and organizations across the globe.", image: `${BASE_URL}/og/map.jpg` },
    "/opportunity": { title: "Opportunities: ReGen Civics", description: "Discover opportunities to contribute, collaborate, and grow within the ReGen Civics ecosystem.", image: `${BASE_URL}/og/opportunity.jpg` },
    "/blog":        { title: "Blog: ReGen Civics", description: "Insights, stories, and updates from the ReGenerative Renaissance." },
    "/connect":     { title: "Connect: ReGen Civics", description: "Join the conversation. Find us on WhatsApp, Discord, and beyond.", image: `${BASE_URL}/og/connect.jpg` },
    "/apply":       { title: "Apply: ReGen Civics Incubator", description: "Apply to have your land project supported through the ReGen Civics incubator.", image: `${BASE_URL}/og/apply.jpg` },
    "/tokenomics":  { title: "Tokenomics: ReGen Civics", description: "How $ReGen and RGVoice tokens work. Contribution-based rewards and regenerative governance.", image: `${BASE_URL}/og/tokenomics.jpg` },
    "/land":        { title: "Land Projects: ReGen Civics", description: "Regenerative land projects healing soils, communities, and bioregions.", image: `${BASE_URL}/og/land.jpg` },
    "/ally":        { title: "Allies & Partners: ReGen Civics", description: "Organizations and individuals working alongside ReGen Civics to build the ReGenerative Renaissance." },
    "/seasons":     { title: "Seasons: Join Our Regenerative Journey", description: "Apply for Season 2 of ReGen Civics starting September 2026. Build your regenerative portfolio and join the incubator.", image: `${BASE_URL}/og/seasons.jpg` },
    "/team":        { title: "Team: ReGen Civics", description: "The people behind ReGen Civics. Community builders, developers, land stewards, and movement catalysts.", image: `${BASE_URL}/og/team.jpg` },
    "/crowd-pooling": { title: "Crowd Pooling: ReGen Civics", description: "Pool capital with the community to directly fund regenerative land projects.", image: `${BASE_URL}/og/crowd-pooling.jpg` },
    "/economy":     { title: "The Regenerative Economy: ReGen Civics", description: "A real economic system built through gameplay. Contribution scores, gratitude tokens, seasonal harvests.", image: `${BASE_URL}/og/economy.jpg` },
    "/proposals":   { title: "Community Proposals: ReGen Civics", description: "Shape the direction of ReGen Civics. Submit proposals, signal your support, help the community decide.", image: `${BASE_URL}/og/proposals.jpg` },
    "/game-mechanics": { title: "Game Mechanics: ReGen Civics", description: "See every variable that powers the game. Simulate changes. Export proposals.", image: `${BASE_URL}/og/game-mechanics.jpg` },
    "/local-food-economy": { title: "Local Food Economy: ReGen Civics", description: "Build regenerative food systems in your bioregion. Rate producers, support local farms.", image: `${BASE_URL}/og/local-food-economy.jpg` },
    "/play":        { title: "Play the Game: ReGen Civics", description: "Complete quests, earn $ReGen tokens, and contribute to regenerative projects. The Infinite Game is open to everyone." },
    "/socials":     { title: "Socials: ReGen Civics", description: "Find us on WhatsApp, Discord, YouTube, and beyond. Connect with the regenerative community." },
    "/marketplace": { title: "Connection Hub: ReGen Civics", description: "Share what you can offer and find help with what you need. A space for regenerators to connect." },
    "/calculator":  { title: "Contribution Calculator: ReGen Civics", description: "Calculate the value of your contributions to regenerative land projects." },
    "/newsletter":  { title: "Newsletter: ReGen Civics", description: "Stay updated on the ReGenerative Renaissance. Community news, season updates, and quest announcements." },
    "/crowd-pooling-projects": { title: "Crowd Pooling Projects: ReGen Civics", description: "Browse active crowd pooling campaigns for regenerative land projects." },
    "/co-creators-guide": { title: "Co-Creators Guide: ReGen Civics", description: "A guide for co-creators building the ReGenerative Renaissance together." },
    "/claim-seeds": { title: "Claim SEEDS: ReGen Civics", description: "Former SEEDS token holders can claim their $ReGen allocation here." },
    "/risk-disclosure": { title: "Risk Disclosure: ReGen Civics", description: "Full risk disclosure for the ReGen Civics Regenerative Land Fund." },
    "/terms-of-use": { title: "Terms of Use: ReGen Civics", description: "Terms governing use of the ReGen Civics platform." },
    "/privacy-policy": { title: "Privacy Policy: ReGen Civics", description: "How ReGen Civics handles your data." },
    "/disclaimers": { title: "Disclaimers: ReGen Civics", description: "Legal disclaimers for the ReGen Civics platform and fund." },
    "/glossary":    { title: "Glossary: ReGen Civics", description: "Key terms and concepts in the ReGen Civics ecosystem." },
    // Prefix match, so /learn/:slug inherits this when the crawler-content
    // lookup fails. Normally crawler-content.ts overrides title + description
    // per article from shared/learnContent.
    "/learn":       { title: "Learn: Land, Community, Funding, Governance | ReGen Civics", description: "Practical answers on starting a community on your land, intentional community structures and funding, ecovillages, governance models, crowd pooling, and the nine forms of capital." },
    "/features":    { title: "Feature Suggestions: ReGen Civics", description: "Suggest and vote on new features for the ReGen Civics platform.", image: `${BASE_URL}/og/features.jpg` },
    "/bionomics":   { title: "Bionomics: ReGen Civics", description: "A living economy modelled on ecosystems. How ReGen Civics builds bioregional value flows.", image: `${BASE_URL}/og/bionomics.jpg` },
    "/hymn-book":   { title: "Hymn Book: ReGen Civics", description: "Songs of the ReGenerative Renaissance. A growing collection of hymns from the movement.", image: `${BASE_URL}/og/hymn-book.jpg` },
    "/investor":    { title: "Investor Journey: ReGen Civics", description: "Begin your journey as a regenerative investor. Explore the fund and connect with land projects." },
    "/loi":         { title: "Letter of Intent: ReGen Civics", description: "Submit a letter of intent to invest in the ReGen Civics Fund." },
    "/tools":       { title: "Regen Civilization Tools Library", description: "Every tool the ReGenerative Renaissance needs. Software, hardware, governance, currency, food systems.", image: `${BASE_URL}/og/tools.jpg` },
    "/heal-the-land": { title: "Heal the Land, Heal Ourselves | Church of the Regenerative Earth", description: "A community healing ministry offering free food, gardening days, and land residency. For land project sponsors: free Game Building." },
    "/ship":        { title: "The ReGen Ship: Sail Cascadia, Plant As You Go", description: "Visiting the most beautiful places on earth in reverence and regeneration.", image: `${BASE_URL}/images/ship/ship-zion-redrock-hero.jpg` },
    "/network":     { title: "The Network of Regenerative Games: ReGen Civics", description: "Land projects running their own coordination game, built with ReGen Civics and owned outright by the project." },
    "/custom-games": { title: "Custom Games for Land Projects: ReGen Civics", description: "Your own coordination game: your domain, your brand, your data. Built with ReGen Civics, owned 100% by your project." },
  };

  let indexHtmlCache: string | null = null;
  const blogHtmlCache = new Map<string, string>();

  // Blog prerender handler. The post-build script
  // (scripts/prerender-blog.mjs) emits dist/public/blog/<slug>/index.html
  // for every entry in client/src/data/blogPosts.ts. Serve those files
  // first so crawlers and LLMs see article body, BlogPosting JSON-LD,
  // canonical URL, and OG tags in the initial response. The SPA bundle
  // hydrates on top of the prerendered shell so React routing still works.
  app.get(/^\/blog\/([a-z0-9-]+)\/?$/i, (req, res, next) => {
    const slug = req.params[0];
    const filePath = path.resolve(distPath, "blog", slug, "index.html");
    if (!fs.existsSync(filePath)) return next();

    let html = blogHtmlCache.get(slug) ?? null;
    if (!html || process.env.NODE_ENV === "development") {
      try {
        html = fs.readFileSync(filePath, "utf-8");
        blogHtmlCache.set(slug, html);
      } catch {
        return next();
      }
    }
    if (!html) return next();

    const nonce = (res.locals.nonce as string) || "";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.send(applyNonce(html, nonce));
  });

  app.use("*", async (_req, res) => {
    if (_req.originalUrl.startsWith("/api/")) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const indexPath = path.resolve(distPath, "index.html");

    // Read once and cache; bust on NODE_ENV=development
    if (!indexHtmlCache || process.env.NODE_ENV === "development") {
      try { indexHtmlCache = fs.readFileSync(indexPath, "utf-8"); } catch { /* fall through */ }
    }

    if (!indexHtmlCache) {
      res.sendFile(indexPath);
      return;
    }

    // Find the best matching route (longest prefix match)
    const reqPath = _req.originalUrl.split("?")[0].replace(/\/$/, "") || "/";
    let meta = DEFAULT_META;
    let bestLen = 0;
    for (const [route, routeMeta] of Object.entries(ROUTE_META)) {
      if (reqPath === route || reqPath.startsWith(route + "/")) {
        if (route.length > bestLen) {
          bestLen = route.length;
          meta = { ...DEFAULT_META, ...routeMeta };
        }
      }
    }

    // /learn/<slug> is the one route space with a closed, known set of valid
    // values, so it is the one place we can answer honestly. Everything else
    // in an SPA catch-all has to return 200 and let the router sort it out.
    //
    // Before this, /learn/anything-at-all returned 200 carrying the hub's
    // title, the hub's description (ROUTE_META prefix-matches /learn) and a
    // canonical pointing at itself. That is a soft 404: an unbounded space of
    // fabricated URLs that each look like a real page to a crawler, which
    // Google downranks for and which burns crawl budget on a site whose whole
    // problem is getting crawled properly. Anyone could have linked
    // /learn/<anything> and had us serve it as valid.
    //
    // The redirect handler in index.ts runs first and 301s the reserved slugs,
    // so anything still arriving here with a /learn/ prefix is genuinely
    // unknown. Humans still get the app (LearnArticle redirects to /learn);
    // crawlers get the status code that matches reality.
    const learnSlugMatch = reqPath.match(/^\/learn\/(.+)$/);
    const unknownLearnSlug =
      learnSlugMatch !== null && !LEARN_SLUGS.includes(learnSlugMatch[1]);

    // A missing page should not nominate itself as canonical. Point at the hub,
    // which is the real page for this space.
    const canonical = unknownLearnSlug
      ? `${BASE_URL}/learn`
      : `${BASE_URL}${reqPath === "/" ? "" : reqPath}`;

    // Dynamic OG images for content pages
    let ogImage = meta.image ?? DEFAULT_META.image;
    const forumMatch = reqPath.match(/^\/community\/post\/(\d+)$/);
    if (forumMatch) {
      ogImage = `${BASE_URL}/api/og?type=forum&id=${forumMatch[1]}`;
    }
    const campaignMatch = reqPath.match(/^\/campaign\/(\d+)$/);
    if (campaignMatch) {
      ogImage = `${BASE_URL}/api/og?type=campaign&id=${campaignMatch[1]}`;
    }

    // Crawler-visible content: real HTML body + JSON-LD for key routes and
    // community posts. AI crawlers (GPTBot, ClaudeBot, PerplexityBot) fetch
    // HTML without executing JS, so without this they see an empty shell.
    // Never block page serving on it.
    let crawlerContent: CrawlerContent | null = null;
    try {
      crawlerContent = await resolveCrawlerContent(reqPath);
    } catch { /* serve the plain shell on any failure */ }
    if (crawlerContent?.title) meta = { ...meta, title: crawlerContent.title };
    if (crawlerContent?.description) meta = { ...meta, description: crawlerContent.description };

    const injected = injectMetaTags(indexHtmlCache, {
      title: meta.title,
      description: meta.description,
      canonical,
      ogImage,
    });

    // Inject crawler content: JSON-LD into <head>, prose before <div id="root">
    // (same placement as the blog prerender output).
    let withContent = injected;
    if (crawlerContent) {
      if (crawlerContent.jsonld) {
        withContent = withContent.replace(
          /<\/head>/i,
          `<script type="application/ld+json">${JSON.stringify(crawlerContent.jsonld)}</script></head>`,
        );
      }
      withContent = withContent.replace(
        /<div id="root">/i,
        `${crawlerContent.bodyHtml}<div id="root">`,
      );
    }

    // Per-request CSP nonce substitution. Same applyNonce helper used
    // by the dedicated /offline.html and / handlers above.
    const nonce = (res.locals.nonce as string) || "";
    const withNonce = applyNonce(withContent, nonce);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // See note above about no-store: prevents 304 revalidation from
    // serving cached HTML with stale nonces alongside fresh CSP headers.
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    // Real status for a page that does not exist, with the app still in the
    // body so a human who mistyped a Learn URL lands somewhere useful.
    if (unknownLearnSlug) res.status(404);
    res.send(withNonce);
  });
}
