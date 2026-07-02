/**
 * Shared config, bot-user provisioning, routing, and pure helpers for the
 * elders' community presence (server/jobs/elderForumJob.ts).
 *
 * The elders bring their wisdom into the community forum. Model (ADR-22):
 *  - Each new post is routed to the ONE elder whose wisdom best fits it (or to
 *    none). Only that elder comments, so a thread is never crowded.
 *  - Any elder can be called by name: an @handle mention in a post or reply
 *    brings that elder in to give their perspective, regardless of routing.
 *  - A direct reply to an elder's comment gets one reply from that elder, unless
 *    it calls a different elder by name.
 *
 * Deterministic-first (STEERING 11): the polling and candidate selection in the
 * job are plain DB queries. The only model calls are the routing decision (one
 * cheap call per un-handled post) and the comment texts themselves. Bot users
 * are auto-provisioned; each elder's createdAt is its no-backfill cutoff.
 */
import { ENV } from "../_core/env";
import * as db from "../db";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { elderCorpusChunks, users } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { FORUM_PASS_TOKEN } from "./elder-safety";
import { type Elder } from "./elders";

/**
 * Category slugs the elders do NOT comment in. Edit this list to ban or allow
 * categories. Defaults skip the administrative / bookkeeping surfaces where an
 * elder comment does not belong. Slugs come from forumCategories.slug.
 */
export const EXCLUDED_CATEGORY_SLUGS: string[] = [
  "historical-contribution-accounting",
  "plays",
  "epic-quests",
];

/** Safety caps so a burst of posts can never turn into a burst of comments. */
export const MAX_COMMENTS_PER_RUN = 8;
export const MAX_REPLIES_PER_RUN = 8;

/** Passages retrieved to ground each comment. */
export const FORUM_TOP_K = 5;

export function isForumPresenceEnabled(): boolean {
  if (String(process.env.ELDER_FORUM_ENABLED).toLowerCase() === "false") return false;
  return Boolean(ENV.anthropicApiKey);
}

export async function corpusHasRows(elder: string): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;
  const rows = await database.select({ id: elderCorpusChunks.id }).from(elderCorpusChunks).where(eq(elderCorpusChunks.elder, elder)).limit(1);
  return rows.length > 0;
}

export type BotUser = { elderId: string; userId: number; createdAt: Date };

/**
 * Look up an elder's bot user, creating it once if missing. Idempotent on the
 * synthetic openId. The bot's display name carries the AI-ELDER framing.
 */
export async function getOrCreateElderBotUser(elder: Elder): Promise<BotUser | null> {
  const database = await getDb();
  if (!database) return null;

  const existing = await db.getUserByOpenId(elder.openId);
  if (existing) return { elderId: elder.id, userId: existing.id, createdAt: new Date(existing.createdAt) };

  try {
    await database.insert(users).values({
      openId: elder.openId,
      name: elder.displayName,
      handle: elder.handle,
      loginMethod: "system",
      role: "user",
    });
  } catch {
    // Unique-constraint race: another run created it first. Fall through to read.
  }
  const created = await db.getUserByOpenId(elder.openId);
  return created ? { elderId: elder.id, userId: created.id, createdAt: new Date(created.createdAt) } : null;
}

/** The query text used to retrieve grounding passages for a post. */
export function postQueryText(title: string, content: string): string {
  return `${title}\n\n${content}`.slice(0, 2000);
}

/**
 * Interpret a model comment. Returns null when the elder declined (the PASS
 * token, empty, or near-empty), otherwise the cleaned text. PASS is matched as
 * an exact word, case-insensitive, so a stray period cannot post "PASS." live.
 */
export function parseComment(raw: string): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const stripped = text.replace(/[.!\s]+$/g, "").trim().toUpperCase();
  if (stripped === FORUM_PASS_TOKEN) return null;
  if (text.length < 8) return null;
  return text;
}

/** Case-insensitive exact-id match against the elder ids, or null for NONE. */
export function parseRouterChoice(raw: string, elderIds: string[]): string | null {
  const token = (raw ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!token || token === "none") return null;
  return elderIds.find((id) => id.toLowerCase() === token) ?? null;
}

/**
 * Route a post to the single best-fit elder, or null if none should speak.
 * One cheap model call: given the post and each elder's domain, it returns an
 * elder id or NONE. When embeddings are available this could become a pure
 * cosine-score comparison, but FULLTEXT match scores are not comparable across
 * corpora, so a small router call is the robust choice today.
 */
export async function routePostToElder(
  title: string,
  content: string,
  elders: Elder[],
): Promise<string | null> {
  if (elders.length === 0) return null;
  if (elders.length === 1) return elders[0].id;

  const roster = elders.map((e) => `- ${e.id}: ${e.domain}`).join("\n");
  const system = [
    "You route a community post to the one spiritual elder whose wisdom best fits it, for a comment. Choose at most one.",
    "The elders and what each carries:",
    roster,
    "",
    `Reply with exactly one elder id from the list, or the word ${FORUM_PASS_TOKEN} if the post is administrative, a test, pure logistics, or nothing any elder's wisdom truly speaks to. Reply with the id or ${FORUM_PASS_TOKEN} and nothing else.`,
  ].join("\n");

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Post\nTitle: ${title}\n\n${content}`.slice(0, 4000) },
      ],
      maxTokens: 16,
    });
    return parseRouterChoice(res.choices?.[0]?.message?.content ?? "", elders.map((e) => e.id));
  } catch (err) {
    console.error("[elderForum] router error:", err);
    return null;
  }
}
