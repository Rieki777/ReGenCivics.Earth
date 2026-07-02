/**
 * Dynamic OG Image Generation endpoint.
 * Uses satori + @resvg/resvg-js to render React-like JSX to PNG.
 * Endpoint: GET /api/og?type=forum&id=624
 */
import type { Express, Request, Response } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as db from "../db";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { forumPosts, recordings } from "../../drizzle/schema";
import fs from "fs";
import path from "path";

const WIDTH = 1200;
const HEIGHT = 630;

// Cache generated images in memory (type-id -> { png, generatedAt })
const ogCache = new Map<string, { png: Buffer; generatedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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

// Campaign/crowd-pooling template
function campaignTemplate(campaign: { title: string; location?: string; raised: number; goal: number; backers: number }): any {
  const pct = campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0;
  const funded = pct >= 100;
  return baseCard([
    { type: "div", props: { style: { fontSize: 14, color: funded ? "#d4a574" : "#7dd87d", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }, children: funded ? "FUNDED" : "CROWD POOLING" } },
    { type: "div", props: { style: { fontSize: 36, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }, children: truncate(campaign.title, 60) } },
    campaign.location ? { type: "div", props: { style: { fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 16 }, children: campaign.location } } : null,
    { type: "div", props: { style: { display: "flex", alignItems: "center", gap: 8, height: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden", marginBottom: 12 }, children: [
      { type: "div", props: { style: { width: `${pct}%`, height: "100%", backgroundColor: funded ? "#d4a574" : "#7dd87d", borderRadius: 6 } } },
    ] } },
    { type: "div", props: { style: { display: "flex", justifyContent: "space-between", fontSize: 16, color: "rgba(255,255,255,0.6)" }, children: [
      { type: "span", props: { children: `$${campaign.raised.toLocaleString()} of $${campaign.goal.toLocaleString()}` } },
      { type: "span", props: { children: `${campaign.backers} backers` } },
      { type: "span", props: { children: `${pct}% funded` } },
    ] } },
    { type: "div", props: { style: { marginTop: 16, fontSize: 14, color: "rgba(255,255,255,0.3)" }, children: "regencivics.earth" } },
  ].filter(Boolean));
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
    const { type, id } = req.query as { type?: string; id?: string };

    if (!type || !id) {
      return res.status(400).json({ error: "type and id required" });
    }

    // Check cache
    const cacheKey = `${type}-${id}`;
    const cached = ogCache.get(cacheKey);
    if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
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
          const authors = await db.getUsersByIds([post.authorId]);
          element = forumTemplate({
            title: post.title,
            authorName: authors[post.authorId]?.name || "Anonymous",
            replyCount: post.replyCount,
          });
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
          element = campaignTemplate({
            title: "Regenerative Land Project",
            raised: 0,
            goal: 100000,
            backers: 0,
          });
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
      ogCache.set(cacheKey, { png, generatedAt: Date.now() });

      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=3600" });
      res.send(png);
    } catch (err: any) {
      console.error("[og] Generation failed:", err?.message);
      res.status(500).json({ error: "OG image generation failed" });
    }
  });
}
