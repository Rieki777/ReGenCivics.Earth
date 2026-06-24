/**
 * Video summary: when a user posts a forum thread that contains a YouTube
 * URL with available auto-captions, fetch the transcript, summarize it via
 * Claude in ReGen Guide voice, and post the summary as a reply on the same
 * thread (authored by the ReGen Guide bot user).
 *
 * Rate-limited at two layers to bound cost and avoid bot spam:
 *   - 3 summaries per author per day (the user who posted the original)
 *   - 40 summaries site-wide per day
 *
 * Both counters live in memory and reset at midnight UTC. They survive a
 * single Express process; restarting the server resets them, which is fine.
 *
 * Sources supported:
 *   - YouTube (auto-captions via the public timedtext endpoint)
 *
 * Other VideoEmbed-supported sources (Vimeo, Loom, Wistia, Dailymotion,
 * direct MP4) are deliberately skipped this round. They'd need Whisper
 * transcription which adds cost + queue infra. Adding them later is a
 * matter of a single new fetcher in this file.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { forumReplies } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { getRegenGuideUserId } from "./regenGuide";

// ── URL parsing (mirrors client/src/components/VideoEmbed.tsx parser) ───────

type ParsedVideo =
  | { source: "youtube"; videoId: string; url: string }
  | { source: "other"; url: string };

/**
 * Find the FIRST recognised video URL in a markdown post body. Returns null
 * if the post doesn't contain one. We only summarise the first; if a post
 * has multiple videos the others are ignored to keep the comment focused.
 */
export function extractFirstVideoUrl(content: string): ParsedVideo | null {
  if (!content) return null;
  // Find every URL, then test each against the video patterns in order.
  const urls = content.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
  for (const raw of urls) {
    const yt = raw.match(
      /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (yt) return { source: "youtube", videoId: yt[1], url: raw };
    if (
      /vimeo\.com\/(?:video\/)?\d+/.test(raw) ||
      /dailymotion\.com\/video\/[a-zA-Z0-9]+/.test(raw) ||
      /wistia\.(com|net)\//.test(raw) ||
      /loom\.com\/(share|embed)\//.test(raw) ||
      /\.(mp4|webm|ogg)(\?.*)?$/i.test(raw)
    ) {
      return { source: "other", url: raw };
    }
  }
  return null;
}

// ── YouTube auto-caption fetcher ────────────────────────────────────────────

/**
 * Fetch auto-generated captions from YouTube's public timedtext endpoint.
 * Tries common English variants. Returns the plain-text transcript stripped
 * of XML and timing tags, or null if no captions are available.
 *
 * This endpoint is unofficial and YouTube can change it without notice. If
 * it breaks, we fall back to silently skipping the summary; the post still
 * lands and renders correctly.
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  const langs = ["en", "en-US", "en-GB"];
  for (const lang of langs) {
    try {
      const res = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`,
        { headers: { "User-Agent": "Mozilla/5.0 (compatible; ReGenCivicsBot/1.0)" } }
      );
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml || xml.length < 80) continue;
      const text = xml
        .replace(/<\/?[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 200) return text;
    } catch {
      // try next lang
    }
  }
  return null;
}

// ── Rate limiting (in-memory, resets at midnight UTC) ───────────────────────

type DayKey = string; // "YYYY-MM-DD"
function dayKey(): DayKey {
  return new Date().toISOString().slice(0, 10);
}

const SITE_DAILY_LIMIT = 40;
const PER_USER_DAILY_LIMIT = 3;

const counters: {
  day: DayKey;
  siteCount: number;
  perUser: Map<number, number>;
} = { day: dayKey(), siteCount: 0, perUser: new Map() };

function rollDayIfNeeded() {
  const today = dayKey();
  if (counters.day !== today) {
    counters.day = today;
    counters.siteCount = 0;
    counters.perUser.clear();
  }
}

function checkRateLimit(authorId: number): { ok: true } | { ok: false; reason: string } {
  rollDayIfNeeded();
  if (counters.siteCount >= SITE_DAILY_LIMIT) {
    return { ok: false, reason: `site daily limit reached (${SITE_DAILY_LIMIT})` };
  }
  const userCount = counters.perUser.get(authorId) ?? 0;
  if (userCount >= PER_USER_DAILY_LIMIT) {
    return { ok: false, reason: `per-user daily limit reached (${PER_USER_DAILY_LIMIT})` };
  }
  return { ok: true };
}

function recordRateUsage(authorId: number) {
  rollDayIfNeeded();
  counters.siteCount += 1;
  counters.perUser.set(authorId, (counters.perUser.get(authorId) ?? 0) + 1);
}

// ── LLM summarisation ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  "You are ReGen Guide, the AI companion for ReGen Civics. You write in Rye's voice: direct, grounded, specific.",
  "Banned: em-dashes (zero, ever), contrast framing ('not X but Y'), AI tells (delve, foster, leverage, vibrant, transformative, unlock, seamless, robust, comprehensive, utilize, navigate as metaphor, empower, beacon of, testament to, embark, in conclusion, it's worth noting).",
  "Format the summary as: a 2-3 sentence overview paragraph, then a markdown bullet list of 3-5 specific takeaways, then optional 'Quote worth holding:' line if a striking sentence stood out.",
  "Lead with what's true and concrete. Cite specific examples or numbers from the transcript when present. Never invent details that aren't in the transcript.",
  "If the transcript is fragmentary or unclear (auto-captions can be), say so plainly rather than papering over it.",
  "Cap output at ~200 words. The point is to help a forum reader decide whether to watch the video.",
].join("\n\n");

async function summariseTranscript(transcript: string, videoUrl: string): Promise<string | null> {
  // Trim to a sensible window for Claude. Auto-captions tend to be talky; 12k
  // chars is roughly 30 minutes of captions and stays well under the model's
  // input budget while keeping the price low.
  const trimmed = transcript.length > 12_000 ? transcript.slice(0, 12_000) + "\n\n[... transcript truncated for summary ...]" : transcript;
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Video URL: ${videoUrl}\n\nTranscript (auto-captions):\n${trimmed}\n\nWrite the summary in the format described.`,
        },
      ],
      maxTokens: 800,
    });
    const out = result.choices?.[0]?.message?.content?.trim();
    return out || null;
  } catch (err) {
    console.error("[videoSummary] invokeLLM failed", err);
    return null;
  }
}

// ── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Fire-and-forget. Call this AFTER a forum post is created. It will:
 *   1. Detect a video URL in the content
 *   2. Check the rate limit
 *   3. Fetch the transcript (YouTube only this round)
 *   4. Summarise via Claude
 *   5. Post a reply on the same thread, authored by the ReGen Guide bot
 *
 * Errors are swallowed and logged; this never throws to the caller.
 */
export async function maybePostVideoSummary(
  postId: number,
  content: string,
  authorId: number
): Promise<void> {
  try {
    const video = extractFirstVideoUrl(content);
    if (!video) return;
    if (video.source !== "youtube") return; // V1: YouTube only

    const limit = checkRateLimit(authorId);
    if (!limit.ok) {
      console.log(`[videoSummary] skipped postId=${postId}: ${limit.reason}`);
      return;
    }

    const transcript = await fetchYouTubeTranscript(video.videoId);
    if (!transcript) {
      console.log(`[videoSummary] skipped postId=${postId}: no transcript for ${video.videoId}`);
      return;
    }

    const summary = await summariseTranscript(transcript, video.url);
    if (!summary) return;

    const guideId = await getRegenGuideUserId();
    if (!guideId) {
      console.warn("[videoSummary] regen-guide user not found, skipping summary post");
      return;
    }

    const db = await getDb();
    if (!db) return;

    const body = [
      "_ReGen Guide, AI companion. This is an auto-summary of the linked video, drafted from its captions. May miss nuance; not a substitute for watching._",
      "",
      summary,
    ].join("\n");

    await db.insert(forumReplies).values({
      postId,
      authorId: guideId,
      content: body,
    } as any);

    recordRateUsage(authorId);
    console.log(`[videoSummary] posted summary for postId=${postId} (${video.videoId})`);
  } catch (err) {
    console.error(`[videoSummary] failed for postId=${postId}`, err);
  }
}

// Exported for tests / external rate-limit inspection if needed later.
export const _videoSummaryInternals = {
  fetchYouTubeTranscript,
  summariseTranscript,
  checkRateLimit,
  recordRateUsage,
};
