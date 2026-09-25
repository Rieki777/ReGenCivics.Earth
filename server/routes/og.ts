/**
 * Dynamic OG Image Generation endpoint.
 * Uses satori + @resvg/resvg-js to render React-like JSX to PNG.
 * Endpoint: GET /api/og?type=forum&id=624, or /api/og?type=project&key=42-hill-farm
 */
import type { Express, Request, Response } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as db from "../db";
import { getDb } from "../db";
import { desc, eq } from "drizzle-orm";
import { forumPosts, recordings, gratitudeLog, forumCategories } from "../../drizzle/schema";
import { landProjectTeamAttribution } from "../lib/team-user";
import { isPublicCampaign } from "../lib/project-steward";
import { computeCampaignProgress, progressLines } from "../../shared/campaignProgress";
import { decodeBasicEntities } from "../../shared/htmlText";
import { parseProjectKey } from "../../shared/projectKey";
import { serverCurrencyFormatter } from "../lib/currency-format";
import { extractThemes, validThemeKeys, labelForThemeKey } from "../../shared/gratitude-themes";
import fs from "fs";
import path from "path";

const WIDTH = 1200;
const HEIGHT = 630;

// Cache generated images in memory (type-id -> { png, generatedAt }).
// /api/og is public, so the key space is the caller's to choose: the key is
// built from a parsed id (ogCacheKey) and the map is capped (rememberOgCard).
const ogCache = new Map<string, { png: Buffer; generatedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
/** At most this many cards stay in memory; the oldest goes first. */
export const OG_CACHE_MAX = 500;

/** Card types keyed by a numeric id. */
const OG_ID_TYPES = new Set(["forum", "gratitude", "campaign", "quest"]);
/** Card types that ignore their id: one card each. */
const OG_FIXED_TYPES = new Set(["player", "blog"]);

/**
 * The cache key for one card, or null when the request cannot name one.
 *
 * Number() read many spellings of one id (01597, 1597.0, 0x63D, 1597e0, a
 * leading space) and the key used the raw string, so every spelling was a
 * fresh render (about 270 ms of CPU) and a new entry that was never freed.
 * An id now has to be a plain positive whole number, and the key uses the
 * number. A project card keys by its parsed project id, never the slug.
 */
export function ogCacheKey(type: string, id: string | undefined, key: string | undefined): string | null {
  if (type === "project") {
    const parsed = typeof key === "string" ? parseProjectKey(key) : null;
    return parsed ? `project-${parsed.kind}-${parsed.id}` : null;
  }
  if (typeof id !== "string" || !id) return null;
  if (OG_ID_TYPES.has(type)) {
    if (!/^[1-9]\d{0,9}$/.test(id)) return null;
    const n = Number(id);
    return Number.isSafeInteger(n) ? `${type}-${n}` : null;
  }
  if (OG_FIXED_TYPES.has(type)) return type;
  if (type === "core") return `core-${Object.prototype.hasOwnProperty.call(CORE_OG, id) ? id : "_default"}`;
  return null;
}

/** Store one card, dropping the oldest once the map passes OG_CACHE_MAX. */
export function rememberOgCard(cacheKey: string, png: Buffer, now = Date.now()): void {
  ogCache.delete(cacheKey);
  ogCache.set(cacheKey, { png, generatedAt: now });
  while (ogCache.size > OG_CACHE_MAX) {
    const oldest = ogCache.keys().next().value;
    if (oldest === undefined) break;
    ogCache.delete(oldest);
  }
}

/** For tests: how many cards the cache holds, and whether it holds one. */
export function ogCacheState(cacheKey?: string): { size: number; has: boolean } {
  return { size: ogCache.size, has: cacheKey ? ogCache.has(cacheKey) : false };
}

// Load font once
let fontData: ArrayBuffer | null = null;
function getFont(): ArrayBuffer {
  if (fontData) return fontData;
  try {
    // satori's font parser cannot read woff2 (throws "Unsupported OpenType
    // signature wOF2"), so we vendor a static TTF instanced from the same
    // Quicksand variable font at weight 700. Keep this a .ttf, not .woff2.
    const fontPath = path.resolve(process.cwd(), "client/public/fonts/quicksand-latin.ttf");
    fontData = fs.readFileSync(fontPath).buffer as ArrayBuffer;
  } catch {
    // Fallback: empty buffer, satori will use system font
    fontData = new ArrayBuffer(0);
  }
  return fontData;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

// Base card layout shared by all templates
function baseCard(children: any): any {
  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        backgroundColor: "#1a472a",
        padding: "40px",
        fontFamily: "Quicksand",
        color: "white",
      },
      children,
    },
  };
}

// Forum post template
function forumTemplate(post: { title: string; authorName: string; replyCount: number; categoryName?: string }): any {
  return baseCard([
    { type: "div", props: { style: { fontSize: 16, color: "#7dd87d", marginBottom: 8, letterSpacing: 1 }, children: post.categoryName || "Community Forum" } },
    { type: "div", props: { style: { fontSize: 36, fontWeight: 700, lineHeight: 1.3, marginBottom: 16, maxHeight: 140, overflow: "hidden" }, children: truncate(post.title, 80) } },
    { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 16, fontSize: 16, color: "rgba(255,255,255,0.6)" }, children: [
      { type: "span", props: { children: `by ${post.authorName}` } },
      { type: "span", props: { children: `${post.replyCount} replies` } },
    ] } },
    { type: "div", props: { style: { marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.3)" }, children: "regencivics.earth" } },
  ]);
}

// Quest completion template
function questTemplate(quest: { title: string; playerName: string; reward: number; season?: string }): any {
  return baseCard([
    { type: "div", props: { style: { fontSize: 14, color: "#7dd87d", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }, children: "QUEST COMPLETE" } },
    { type: "div", props: { style: { fontSize: 40, fontWeight: 700, lineHeight: 1.2, marginBottom: 12 }, children: truncate(quest.title, 60) } },
    { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 16, fontSize: 18, color: "rgba(255,255,255,0.7)" }, children: [
      { type: "span", props: { children: `Completed by ${quest.playerName}` } },
      { type: "span", props: { style: { color: "#7dd87d" }, children: `+${quest.reward} $ReGen` } },
    ] } },
    { type: "div", props: { style: { marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.3)" }, children: "regencivics.earth" } },
  ]);
}

// Campaign / project page template: the two-line reading (build spec
// 2026-09-25, section 8.8). In-kind first, then money, each with a thin bar,
// and one state tag. No percentage headline and no over-goal state.
export type CampaignCard = {
  title: string;
  location?: string | null;
  inKindLine: string;
  moneyLine: string;
  inKindPct: number;
  /** Null when the project asks for no money: the money line shows without a bar. */
  moneyPct: number | null;
  stateTag: string;
};

function thinBar(pct: number, color: string): any {
  const width = Math.max(0, Math.min(100, Math.round(pct)));
  return {
    type: "div",
    props: {
      style: { display: "flex", height: 10, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 5, overflow: "hidden", marginTop: 8, marginBottom: 14 },
      children: [{ type: "div", props: { style: { width: `${width}%`, height: "100%", backgroundColor: color, borderRadius: 5 } } }],
    },
  };
}

export function campaignTemplate(card: CampaignCard): any {
  return baseCard([
    { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }, children: [
      { type: "span", props: { style: { fontSize: 14, color: "#7dd87d", letterSpacing: 2, textTransform: "uppercase" }, children: "CROWD POOLING" } },
      { type: "span", props: { style: { fontSize: 14, color: "#1a472a", backgroundColor: "#7dd87d", borderRadius: 12, padding: "2px 12px" }, children: card.stateTag } },
    ] } },
    { type: "div", props: { style: { fontSize: 36, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }, children: truncate(card.title, 60) } },
    card.location ? { type: "div", props: { style: { fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 16 }, children: truncate(card.location, 80) } } : null,
    { type: "div", props: { style: { fontSize: 18, color: "rgba(255,255,255,0.85)" }, children: truncate(card.inKindLine, 90) } },
    thinBar(card.inKindPct, "#7dd87d"),
    { type: "div", props: { style: { fontSize: 18, color: "rgba(255,255,255,0.85)", marginBottom: card.moneyPct == null ? 14 : 0 }, children: truncate(card.moneyLine, 90) } },
    card.moneyPct == null ? null : thinBar(card.moneyPct, "#d4a574"),
    { type: "div", props: { style: { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.3)" }, children: "regencivics.earth" } },
  ].filter(Boolean));
}

/** The card for one campaign's reading. Stored text is entity-encoded once; satori prints text, so decode only. */
export function cardFor(
  c: { title: string; location?: string | null },
  progress: Parameters<typeof progressLines>[0],
  fmt: (n: number) => string,
  name?: string,
): CampaignCard {
  const lines = progressLines(progress, fmt);
  return {
    title: decodeBasicEntities(name || c.title),
    location: c.location ? decodeBasicEntities(c.location) : null,
    inKindLine: lines.inKindShort,
    moneyLine: lines.moneyShort,
    inKindPct: progress.inKind.pct,
    moneyPct: progress.money.asksNone ? null : progress.money.pct,
    stateTag: lines.stateTag,
  };
}

// Player profile template
function playerTemplate(player: { name: string; questsCompleted: number; regenEarned: number; memberSince?: string }): any {
  return baseCard([
    { type: "div", props: { style: { fontSize: 14, color: "#7dd87d", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }, children: "PLAYER PROFILE" } },
    { type: "div", props: { style: { fontSize: 40, fontWeight: 700, marginBottom: 20 }, children: player.name } },
    { type: "div", props: { style: { display: "flex", gap: 32, fontSize: 18, color: "rgba(255,255,255,0.7)" }, children: [
      { type: "span", props: { children: `${player.questsCompleted} quests completed` } },
      { type: "span", props: { style: { color: "#7dd87d" }, children: `${player.regenEarned} $ReGen earned` } },
    ] } },
    player.memberSince ? { type: "div", props: { style: { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.4)" }, children: `Member since ${player.memberSince}` } } : null,
    { type: "div", props: { style: { marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.3)" }, children: "regencivics.earth" } },
  ].filter(Boolean));
}

// Blog post template
function blogTemplate(blog: { title: string; author: string; date: string; readTime?: string }): any {
  return baseCard([
    { type: "div", props: { style: { fontSize: 14, color: "#7dd87d", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }, children: "BLOG" } },
    { type: "div", props: { style: { fontSize: 36, fontWeight: 700, lineHeight: 1.3, marginBottom: 16, maxHeight: 140, overflow: "hidden" }, children: truncate(blog.title, 80) } },
    { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 16, fontSize: 16, color: "rgba(255,255,255,0.6)" }, children: [
      { type: "span", props: { children: `by ${blog.author}` } },
      { type: "span", props: { children: blog.date } },
      blog.readTime ? { type: "span", props: { children: blog.readTime } } : null,
    ].filter(Boolean) } },
    { type: "div", props: { style: { marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.3)" }, children: "regencivics.earth" } },
  ]);
}

// Gratitude summary card. AGGREGATE and ANONYMOUS by construction: it shows
// the themes people keep thanking this person for — never a quote, never a
// sender name, and NO COUNTS (this endpoint is public for social crawlers,
// and the visibility rule is "public messages, private totals"). Themes come
// from the deterministic lexicon (shared/gratitude-themes.ts), so nothing a
// sender wrote can inject text into the image.
function gratitudeTemplate(data: { name: string; themes: string[] }): any {
  const themeRows = data.themes.slice(0, 4).map((label, i) => ({
    type: "div",
    props: {
      style: {
        display: "flex", alignItems: "center", gap: 16,
        fontSize: 30, color: i === 0 ? "#ffd700" : "#f0ebe3",
        marginBottom: 6,
      },
      children: [
        { type: "div", props: { style: { width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? "#ffd700" : "#7dd87d" } } },
        { type: "span", props: { children: label } },
      ],
    },
  }));
  return {
    type: "div",
    props: {
      style: {
        width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(150deg, #10331f 0%, #0d2818 60%, #0a1f14 100%)",
        padding: "60px", fontFamily: "Quicksand", color: "#f8f5f0",
      },
      children: [
        { type: "div", props: { style: { fontSize: 22, color: "#ffd700", letterSpacing: 3, textTransform: "uppercase" }, children: "Gratitude" } },
        { type: "div", props: { style: { display: "flex", flexDirection: "column" }, children: [
          // Only promise a theme list when there are themes to show. Otherwise
          // fall back to a warm standalone line so the card never dangles.
          // No counts here — the endpoint is public.
          { type: "div", props: { style: { fontSize: data.themes.length > 0 ? 30 : 44, fontWeight: data.themes.length > 0 ? 400 : 700, color: data.themes.length > 0 ? "rgba(240,235,227,0.75)" : "#f8f5f0", marginBottom: 18, lineHeight: 1.2 }, children: data.themes.length > 0
            ? `What people keep thanking ${truncate(data.name, 24)} for`
            : `${truncate(data.name, 28)} is appreciated in the ReGen Civics movement` } },
          ...themeRows,
        ] } },
        { type: "div", props: { style: { fontSize: 22, color: "rgba(248,245,240,0.55)" }, children: "regencivics.earth" } },
      ],
    },
  };
}

async function renderOgImage(element: any): Promise<Buffer> {
  const font = getFont();
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: font.byteLength > 0 ? [{
      name: "Quicksand",
      data: font,
      weight: 700,
      style: "normal",
    }] : [],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
  return resvg.render().asPng();
}

// Church of the Regenerative Earth (CORE) share card. Text-composed (no art
// dependency) so it works before the illustrations exist; forest + parchment
// palette to match the subdomain.
export const CORE_OG: Record<string, { eyebrow: string; title: string }> = {
  home: { eyebrow: "Church of the Regenerative Earth", title: "The spiritual heart of ReGen Civics" },
  faith: { eyebrow: "Our Faith", title: "We are the Earth, choosing to heal itself" },
  programs: { eyebrow: "Programs", title: "Worship you can put your hands into" },
  elders: { eyebrow: "Our Elders", title: "We honor the wisdom keepers" },
  "get-involved": { eyebrow: "Get Involved", title: "There is a place for you here" },
  donate: { eyebrow: "Give", title: "Giving is worship" },
  transparency: { eyebrow: "Transparency", title: "Held in the open" },
};

export function coreTemplate(id: string): any {
  const meta = CORE_OG[id] ?? { eyebrow: "Church of the Regenerative Earth", title: "The spiritual heart of ReGen Civics" };
  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(160deg, #0d2818, #1a472a)",
        padding: "64px",
        fontFamily: "Quicksand",
        color: "#f8f5f0",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: 18, fontSize: 26, color: "#7dd87d", letterSpacing: 2 },
            children: [
              { type: "div", props: { style: { width: 40, height: 40, borderRadius: 20, background: "#7dd87d" } } },
              { type: "span", props: { children: "CORE" } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: 16 },
            children: [
              { type: "div", props: { style: { fontSize: 22, color: "#a8e6a8", letterSpacing: 3, textTransform: "uppercase" }, children: meta.eyebrow } },
              { type: "div", props: { style: { fontSize: 60, fontWeight: 700, lineHeight: 1.15 }, children: truncate(meta.title, 70) } },
            ],
          },
        },
        {
          type: "div",
          props: { style: { fontSize: 20, color: "rgba(248,245,240,0.6)" }, children: "core.regencivics.earth" },
        },
      ],
    },
  };
}

export function registerOgRoutes(app: Express) {
  app.get("/api/og", async (req: Request, res: Response) => {
    const { type, id, key } = req.query as { type?: string; id?: string; key?: string };

    // A project card is keyed by the project page key (/project/:key); every
    // other card by id. The cache keys a project by its parsed id, never the
    // slug, so any number of made-up slugs share one entry.
    if (!type || (type === "project" ? !key : !id)) {
      return res.status(400).json({ error: type === "project" ? "type and key required" : "type and id required" });
    }
    const cacheKey = ogCacheKey(type, id, key);
    if (!cacheKey) {
      if (type === "project") return res.status(400).json({ error: "type and key required" });
      if (OG_ID_TYPES.has(type)) return res.status(400).json({ error: "id must be a whole number" });
      return res.status(400).json({ error: `Unknown type: ${type}` });
    }

    // Cache policy: gratitude cards change as new gratitude arrives, so they
    // get a short TTL; custom theme-combo variants are rendered on demand and
    // never stored (keeps the in-memory map bounded — theme combos are
    // attacker-enumerable). Everything else keeps the 24h TTL.
    const themesParam = typeof req.query.themes === "string" ? req.query.themes : "";
    const ttl = type === "gratitude" ? 10 * 60 * 1000 : CACHE_TTL;
    const cacheable = !(type === "gratitude" && themesParam);
    const cached = cacheable ? ogCache.get(cacheKey) : undefined;
    if (cached && Date.now() - cached.generatedAt < ttl) {
      res.set({ "Content-Type": "image/png", "Cache-Control": `public, max-age=${Math.floor(ttl / 1000)}` });
      return res.send(cached.png);
    }

    try {
      let element: any;
      const database = await getDb();

      switch (type) {
        case "forum": {
          if (!database) break;
          const [post] = await database.select().from(forumPosts).where(eq(forumPosts.id, Number(id))).limit(1);
          if (!post) break;
          const [authors, [category]] = await Promise.all([
            db.getUsersByIds([post.authorId]),
            database.select({ slug: forumCategories.slug, name: forumCategories.name })
              .from(forumCategories)
              .where(eq(forumCategories.id, post.categoryId))
              .limit(1),
          ]);
          const team = landProjectTeamAttribution(category?.slug);
          element = forumTemplate({
            title: post.title,
            authorName: team?.authorName || authors[post.authorId]?.name || "Anonymous",
            replyCount: post.replyCount,
            categoryName: category?.name,
          });
          break;
        }
        case "gratitude": {
          if (!database) break;
          const userId = Number(id);
          if (!Number.isFinite(userId)) break;
          // Newest 500, matching gratitude.myThemes so the in-tab preview and
          // the public card agree on which messages feed the themes.
          const rows = await database
            .select({ message: gratitudeLog.message })
            .from(gratitudeLog)
            .where(eq(gratitudeLog.recipientId, userId))
            .orderBy(desc(gratitudeLog.id))
            .limit(500);
          const users = await db.getUsersByIds([userId]);
          const name = users[userId]?.name || "A ReGen player";
          // Extract this user's real themes, then intersect with the caller's
          // selection (validated against the lexicon) so the image can only
          // ever show themes the user actually earned.
          const earned = extractThemes(rows.map((r: any) => r.message), 8);
          const requested = validThemeKeys(themesParam ? themesParam.split(",") : []);
          const earnedKeys = new Set(earned.map((t) => t.key));
          const selected = requested.filter((k) => earnedKeys.has(k));
          const keys = (selected.length > 0 ? selected : earned.map((t) => t.key)).slice(0, 4);
          const labels = keys.map((k) => labelForThemeKey(k)!).filter(Boolean);
          element = gratitudeTemplate({ name, themes: labels });
          break;
        }
        case "quest": {
          element = questTemplate({
            title: `Quest ${id}`,
            playerName: "Player",
            reward: 111,
          });
          break;
        }
        case "campaign": {
          const c = await db.getCampaignById(Number(id));
          // Share cards are public: an unpublished campaign gets the default card.
          if (!c || !isPublicCampaign(c)) break;
          const input = (await db.getCampaignProgressInputs([c.id])).get(c.id) ?? { items: [], rows: [], lends: [], routes: [] };
          element = campaignTemplate(cardFor(c, computeCampaignProgress({ campaign: c, ...input }), serverCurrencyFormatter(c.currency)));
          break;
        }
        case "project": {
          // The project page is the campaign page: the same read as
          // projects.getPublic, with no viewer, so public campaigns only.
          // Loaded on demand: the page read pulls in the campaigns router.
          const { resolvePublicProjectPage } = await import("../lib/project-page");
          const page = await resolvePublicProjectPage(String(key));
          if (!page) break;
          const place = [page.project.location, page.project.country].filter((p) => p && String(p).trim()).join(", ");
          if (page.front) {
            element = campaignTemplate(cardFor(
              { title: page.front.title, location: place || page.front.location },
              page.front.progress,
              serverCurrencyFormatter(page.front.currency),
              page.project.name || page.front.title,
            ));
          } else {
            element = campaignTemplate({
              title: decodeBasicEntities(page.project.name || "Land project"),
              location: place ? decodeBasicEntities(place) : null,
              inKindLine: "A land project on ReGen Civics",
              moneyLine: "No campaign is open right now",
              inKindPct: 0,
              moneyPct: null,
              stateTag: page.project.isDemo ? "Example" : "Land project",
            });
          }
          break;
        }
        case "player": {
          element = playerTemplate({
            name: "ReGen Player",
            questsCompleted: 0,
            regenEarned: 0,
          });
          break;
        }
        case "blog": {
          element = blogTemplate({
            title: "ReGen Civics Blog",
            author: "ReGen Civics Team",
            date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          });
          break;
        }
        case "core": {
          element = coreTemplate(id || "home");
          break;
        }
        default:
          return res.status(400).json({ error: `Unknown type: ${type}` });
      }

      if (!element) {
        return res.status(404).json({ error: "Content not found" });
      }

      const png = await renderOgImage(element);
      if (cacheable) rememberOgCard(cacheKey, png);

      res.set({ "Content-Type": "image/png", "Cache-Control": `public, max-age=${Math.floor(ttl / 1000)}, s-maxage=3600` });
      res.send(png);
    } catch (err: any) {
      console.error("[og] Generation failed:", err?.message);
      res.status(500).json({ error: "OG image generation failed" });
    }
  });
}
