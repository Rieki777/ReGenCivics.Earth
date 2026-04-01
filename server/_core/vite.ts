import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // Vite hashes all asset filenames (e.g. index-abc123.js), so it's safe to
  // cache them for 1 year. HTML is excluded (served via the catch-all below
  // with no-cache so deploys are picked up immediately).
  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    etag: true,
    setHeaders(res, filePath) {
      // Don't cache HTML or service worker files — they must always reflect the latest deploy
      if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("registerSW.js")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // ── Server-side meta tag injection ──────────────────────────────────────────
  // Google's crawler often sees the empty <div id="root"></div> SPA shell before
  // React hydrates. This catch-all handler injects per-route meta tags directly
  // into the served HTML so crawlers see real titles/descriptions immediately.
  // This is NOT full SSR — it's lightweight meta tag pre-population.
  //
  // The meta tag map mirrors client/src/components/SEO.tsx `pageSEO`. Keep them in sync.
  const BASE_URL = "https://regencivics.earth";
  const DEFAULT_META = {
    title: "ReGen Civics: Fund and Game for Regenerative Land Projects",
    description: "ReGen Civics is a venture fund and alliance helping regenerative land projects succeed through capital, community, and an infinite game for the Regenerative Renaissance.",
    image: `${BASE_URL}/og-default.jpg`,
  };
  const ROUTE_META: Record<string, { title: string; description: string; image?: string }> = {
    "/fund":        { title: "ReGen Civics Fund: Invest in Regenerative Land", description: "Invest in the Regenerative Renaissance. ReGen Civics pools capital to support land projects healing communities and ecosystems.", image: `${BASE_URL}/og/fund.jpg` },
    "/game":        { title: "The Infinite Game: ReGen Civics", description: "A real-world game for the Regenerative Renaissance. Complete quests, earn $ReGen tokens, and help build the world we all want to live in.", image: `${BASE_URL}/og/game.jpg` },
    "/quest":       { title: "Quests: ReGen Civics", description: "Rites of passage, seasonal practices, and community challenges. Complete quests, earn tokens, and deepen your regenerative path.", image: `${BASE_URL}/og/quest.jpg` },
    "/schedule":    { title: "Events & Sessions: ReGen Civics", description: "Live community sessions, open calls, and events. Connect with fellow regenerators and participate in the Infinite Game.", image: `${BASE_URL}/og/schedule.jpg` },
    "/community":   { title: "Community: ReGen Civics", description: "A growing network of regenerators, land projects, and organizations building the Regenerative Renaissance together.", image: `${BASE_URL}/og/community.jpg` },
    "/governance":  { title: "Governance: ReGen Civics", description: "Voice-based governance rooted in land and contribution. How ReGen Civics makes decisions, and who has a say.", image: `${BASE_URL}/og/governance.jpg` },
    "/map":         { title: "Regenerative Land Map: ReGen Civics", description: "Explore a living map of regenerative land projects and organizations across the globe.", image: `${BASE_URL}/og/map.jpg` },
    "/opportunity": { title: "Opportunities: ReGen Civics", description: "Discover opportunities to contribute, collaborate, and grow within the ReGen Civics ecosystem.", image: `${BASE_URL}/og/opportunity.jpg` },
    "/blog":        { title: "Blog: ReGen Civics", description: "Insights, stories, and updates from the Regenerative Renaissance." },
    "/connect":     { title: "Connect: ReGen Civics", description: "Join the conversation. Find us on WhatsApp, Discord, and beyond.", image: `${BASE_URL}/og/connect.jpg` },
    "/apply":       { title: "Apply: ReGen Civics Incubator", description: "Apply to have your land project supported through the ReGen Civics incubator.", image: `${BASE_URL}/og/apply.jpg` },
    "/tokenomics":  { title: "Tokenomics: ReGen Civics", description: "How $ReGen and RGVoice tokens work. Contribution-based rewards and regenerative governance.", image: `${BASE_URL}/og/tokenomics.jpg` },
    "/land":        { title: "Land Projects: ReGen Civics", description: "Regenerative land projects healing soils, communities, and bioregions.", image: `${BASE_URL}/og/land.jpg` },
    "/ally":        { title: "Allies & Partners: ReGen Civics", description: "Organizations and individuals working alongside ReGen Civics to build the Regenerative Renaissance." },
    "/seasons":     { title: "Seasons: Join Our Regenerative Journey", description: "Apply for Season 2 of ReGen Civics starting September 2026. Build your regenerative portfolio and join the incubator.", image: `${BASE_URL}/og/seasons.jpg` },
    "/team":        { title: "Team: ReGen Civics", description: "The people behind ReGen Civics. Community builders, developers, land stewards, and movement catalysts.", image: `${BASE_URL}/og/team.jpg` },
    "/crowd-pooling": { title: "Crowd Pooling: ReGen Civics", description: "Pool capital with the community to directly fund regenerative land projects.", image: `${BASE_URL}/og/crowd-pooling.jpg` },
  };

  let indexHtmlCache: string | null = null;

  app.use("*", (_req, res) => {
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

    const canonical = `${BASE_URL}${reqPath === "/" ? "" : reqPath}`;

    // Dynamic OG images for content pages
    let ogImage = meta.image ?? DEFAULT_META.image;
    const forumMatch = reqPath.match(/^\/community\/post\/(\d+)$/);
    if (forumMatch) {
      ogImage = `${BASE_URL}/api/og?type=forum&id=${forumMatch[1]}`;
    }

    // Inject into the <head> — replace placeholder tags written into index.html
    // Covers both Open Graph and Twitter Card tags so social crawlers see correct data.
    const escapedTitle = meta.title.replace(/"/g, "&quot;");
    const escapedDesc = meta.description.replace(/"/g, "&quot;");

    const injected = indexHtmlCache
      .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/,
        `$1${escapedDesc}$2`)
      // Open Graph
      .replace(/(<meta property="og:title" content=")[^"]*(")/,
        `$1${escapedTitle}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/,
        `$1${escapedDesc}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/,
        `$1${canonical}$2`)
      .replace(/(<meta property="og:image" content=")[^"]*(")/,
        `$1${ogImage}$2`)
      // Twitter Card
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/,
        `$1${escapedTitle}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/,
        `$1${escapedDesc}$2`)
      .replace(/(<meta name="twitter:url" content=")[^"]*(")/,
        `$1${canonical}$2`)
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/,
        `$1${ogImage}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/,
        `$1${canonical}$2`);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(injected);
  });
}
