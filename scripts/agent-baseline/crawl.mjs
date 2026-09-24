#!/usr/bin/env node
/**
 * Phase -2 baseline, deterministic half: what a non-executing agent sees.
 *
 * Muse, Gemini Spark and Instinct read the site before they ever call a tool,
 * and none of them are guaranteed to run our JavaScript. This fetches every
 * public route with a plain HTTP GET (no JS, no browser) and records exactly
 * what comes back in the initial HTML response.
 *
 * Nothing here costs a token. Per STEERING section 11 this is the deterministic
 * part of the baseline: it runs free, forever, and is the half re-run after
 * every phase to compare against the control. ask.mjs holds the LLM half.
 *
 * Two facts about this codebase shape the measurement:
 *   1. server/_core/crawler-content.ts already injects real prose + JSON-LD
 *      before <div id="root"> for the routes it covers, so a no-JS fetch is
 *      not automatically blank. This measures which routes it actually covers.
 *   2. That injection is NOT user-agent gated (the AI_CRAWLER_RE in
 *      server/_core/index.ts is telemetry only). Same HTML for everyone, so a
 *      single plain fetch per URL measures the truth. Do not add a bot UA
 *      expecting different content; there isn't any.
 *
 * Run: node scripts/agent-baseline/crawl.mjs [baseUrl]
 *      BASELINE_BASE_URL=http://localhost:5000 node scripts/agent-baseline/crawl.mjs
 *
 * Writes: docs/agent-baseline/crawl-<YYYY-MM-DD>.json
 *
 * Self-contained: node builtins only, no repo imports (the repo package.json
 * trips node's package self-resolution; same constraint as audit-links.mjs).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const srcDir = join(repo, "client/src");

export const DEFAULT_BASE = "https://regencivics.earth";

// Our own robots.txt disallows these for every crawler. The baseline measures
// what an agent is allowed to see, so it honours them rather than crawling
// past our own rules and scoring pages no agent will ever fetch.
const DISALLOWED = [
  /^\/admin(\/|$)/,
  /^\/api(\/|$)/,
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/profile\/edit(\/|$)/,
  /^\/settings(\/|$)/,
];

// Routes that redirect off-site or to another route by design. Fetching them
// measures the redirect target, not the route, so they are recorded as skipped
// rather than scored.
const REDIRECT_ROUTES = new Set(["/form", "/church"]);

/**
 * The main-site route table, read from the same <Route path> declarations
 * audit-links.mjs parses. Reading the source rather than a hand-kept list is
 * what keeps this harness honest when routes are added between runs.
 *
 * CoreApp.tsx is deliberately excluded: those routes serve
 * core.regencivics.earth, a different host with its own baseline.
 */
export function staticRoutesFromSource() {
  const routeFile = join(srcDir, "App.tsx");
  const routes = new Set();
  const params = [];
  if (!existsSync(routeFile)) return { routes: [], params };
  const src = readFileSync(routeFile, "utf8");
  for (const m of src.matchAll(/<Route\s+path=(?:\{)?["'`]([^"'`]+)["'`]/g)) {
    const p = m[1];
    if (p.includes(":")) params.push(p);
    else routes.add(p.replace(/\/$/, "") || "/");
  }
  return { routes: [...routes], params };
}

/**
 * Real URLs from the live sitemap. This is how parameterised routes
 * (/learn/:slug, /quest/:slug) get sampled with instances that actually exist
 * instead of invented slugs that would all 404 and read as a false blank.
 */
async function sitemapUrls(base) {
  try {
    const res = await fetch(`${base}/sitemap.xml`, { redirect: "follow" });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
      .map((m) => {
        try {
          return new URL(m[1]).pathname.replace(/\/$/, "") || "/";
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

const stripTags = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const attr = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};

/**
 * Classify what an agent gets. The thresholds are deliberately crude: the
 * question is only "is there prose here or is this an empty shell", and the
 * number that matters across runs is how many routes move out of BLANK.
 */
function classify(textLen) {
  if (textLen < 200) return "BLANK";
  if (textLen < 1000) return "THIN";
  return "FULL";
}

async function probe(base, path) {
  const url = `${base}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        // A plain browser-shaped UA. Not a bot string: crawler-content.ts is
        // not UA-gated, and pretending to be GPTBot would only make the
        // measurement harder to reproduce by hand.
        "user-agent":
          "Mozilla/5.0 (compatible; regen-civics-agent-baseline/1.0; +https://regencivics.earth)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await res.text();
    const head = html.slice(0, html.search(/<\/head>/i) + 7) || "";
    // #root is empty in the served shell, so everything left in <body> after
    // stripping scripts is exactly the prose a non-executing agent reads.
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
    const agentText = stripTags(bodyMatch ? bodyMatch[1] : html);
    const jsonldBlocks = [
      ...html.matchAll(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      ),
    ].map((m) => m[1]);
    const jsonldTypes = [];
    for (const raw of jsonldBlocks) {
      try {
        const parsed = JSON.parse(raw);
        for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
          if (node && node["@type"]) jsonldTypes.push(String(node["@type"]));
        }
      } catch {
        jsonldTypes.push("UNPARSEABLE");
      }
    }
    return {
      path,
      status: res.status,
      finalUrl: res.url,
      ms: Date.now() - started,
      title: attr(head, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: attr(head, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
      canonical: attr(head, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i),
      ogTitle: attr(head, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i),
      ogImage: attr(head, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i),
      jsonldCount: jsonldBlocks.length,
      jsonldTypes,
      hasNoscript: /<noscript\b/i.test(html),
      agentTextLen: agentText.length,
      agentTextSample: agentText.slice(0, 400),
      verdict: res.ok ? classify(agentText.length) : "ERROR",
    };
  } catch (err) {
    return { path, status: 0, error: String(err?.message ?? err), verdict: "ERROR" };
  }
}

// Files an agent looks for before it looks at any page. Absent ones are the
// phase 4 backlog; present ones are already-done work the spec assumed was not.
const WELL_KNOWN = [
  "/llms.txt",
  "/llms-full.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/feed.xml",
  "/agents.md",
  "/.well-known/mcp",
  "/.well-known/ai-plugin.json",
  "/openapi.json",
  "/ai-catalog.json",
];

async function probeFile(base, path) {
  try {
    const res = await fetch(`${base}${path}`, { redirect: "follow" });
    const body = res.ok ? await res.text() : "";
    // A SPA that 200s every path will serve the HTML shell for a missing .txt.
    // Treat an HTML body on a non-HTML path as absent, not present.
    const looksHtml = /^\s*<!doctype html|^\s*<html/i.test(body);
    const isHtmlPath = path.endsWith(".md") || !path.includes(".");
    return {
      path,
      status: res.status,
      bytes: body.length,
      present: res.ok && body.length > 0 && (isHtmlPath ? true : !looksHtml),
      servedSpaShell: looksHtml && !isHtmlPath,
      contentType: res.headers.get("content-type"),
    };
  } catch (err) {
    return { path, status: 0, present: false, error: String(err?.message ?? err) };
  }
}

export async function crawl(base = DEFAULT_BASE, { concurrency = 4 } = {}) {
  const { routes, params } = staticRoutesFromSource();
  const fromSitemap = await sitemapUrls(base);
  const all = [...new Set([...routes, ...fromSitemap])]
    .filter((p) => !DISALLOWED.some((re) => re.test(p)))
    .filter((p) => !REDIRECT_ROUTES.has(p))
    // The sitemap lists /llms.txt and friends. Those are files, scored in the
    // files table below; scoring them as routes too would count a file with no
    // <title> as a route missing its title.
    .filter((p) => !/\.(txt|xml|json|md)$/i.test(p))
    .sort();

  const results = [];
  for (let i = 0; i < all.length; i += concurrency) {
    const batch = all.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map((p) => probe(base, p)))));
    // robots.txt asks for Crawl-delay: 1. We are crawling ourselves, so one
    // second per page would make a 150-route run take three minutes for no
    // reason; a short pause per batch keeps it polite without that.
    await new Promise((r) => setTimeout(r, 200));
  }

  const files = [];
  for (const f of WELL_KNOWN) files.push(await probeFile(base, f));

  const counts = results.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
    return acc;
  }, {});

  // A JSON-LD type present on nearly every route is one boilerplate block in
  // the HTML shell, not structured data about that page. Counting it as
  // coverage would report "203 of 205 routes have JSON-LD" for a site where
  // most routes describe nothing. Separate the two before anything reads this.
  const typeFreq = {};
  for (const r of results) for (const t of new Set(r.jsonldTypes ?? [])) typeFreq[t] = (typeFreq[t] ?? 0) + 1;
  const siteWideTypes = Object.entries(typeFreq)
    .filter(([, n]) => n >= results.length * 0.9)
    .map(([t]) => t);
  for (const r of results) {
    r.pageSpecificJsonldTypes = (r.jsonldTypes ?? []).filter((t) => !siteWideTypes.includes(t));
  }

  return {
    jsonld: {
      siteWideTypes,
      typeFrequency: typeFreq,
      routesWithPageSpecific: results.filter((r) => r.pageSpecificJsonldTypes.length > 0).length,
    },
    base,
    ranAt: new Date().toISOString(),
    routeSource: {
      staticFromAppTsx: routes.length,
      parameterisedInAppTsx: params.length,
      parameterisedPatterns: params,
      fromSitemap: fromSitemap.length,
      crawled: all.length,
      skippedDisallowed: DISALLOWED.map(String),
      skippedRedirects: [...REDIRECT_ROUTES],
    },
    counts,
    files,
    routes: results,
  };
}

function outPath(repoRoot, stamp) {
  const dir = join(repoRoot, "docs/agent-baseline");
  mkdirSync(dir, { recursive: true });
  return join(dir, `crawl-${stamp}.json`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("crawl.mjs")) {
  const base = process.argv[2] || process.env.BASELINE_BASE_URL || DEFAULT_BASE;
  const data = await crawl(base);
  const stamp = new Date().toISOString().slice(0, 10);
  const file = outPath(repo, stamp);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`crawled ${data.routes.length} routes on ${base}`);
  console.log(
    Object.entries(data.counts)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n"),
  );
  console.log(`\nfiles present: ${data.files.filter((f) => f.present).map((f) => f.path).join(", ") || "none"}`);
  console.log(`files absent:  ${data.files.filter((f) => !f.present).map((f) => f.path).join(", ") || "none"}`);
  console.log(`\nwrote ${file}`);
}
