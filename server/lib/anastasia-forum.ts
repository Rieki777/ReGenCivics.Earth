/**
 * Anastasia's community presence: config, bot-user provisioning, and the small
 * pure helpers used by the forum job (server/jobs/anastasiaForumJob.ts).
 *
 * She comments on new community posts and replies once to direct replies to her
 * comments, grounded in The Ringing Cedars canon and in her hardened voice
 * (server/lib/elder-safety.ts). This is a deterministic-first behavior per
 * STEERING section 11: a zero-token poll (in the job) finds the work, and only
 * the comment text itself costs a model call.
 *
 * Safety + honesty defaults baked in here:
 *  - She never backfills: the bot user's createdAt is the cutoff, so she only
 *    ever speaks to posts made after she came into being.
 *  - Every comment carries a short line disclosing she is an AI presence.
 *  - Crisis posts and formally-administrative categories are skipped.
 *  - Off switch: set ANASTASIA_FORUM_ENABLED=false on Railway to silence her
 *    without a redeploy.
 */
import { ENV } from "../_core/env";
import * as db from "../db";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { elderCorpusChunks, users } from "../../drizzle/schema";
import { FORUM_PASS_TOKEN } from "./elder-safety";

export const ANASTASIA_OPENID = "bot:anastasia";
export const ANASTASIA_ELDER = "anastasia";

/**
 * Category slugs Anastasia does NOT comment in. Edit this list to ban or allow
 * categories (Rye: tell me the slug and I add or remove it here). Defaults skip
 * the administrative / bookkeeping and formal-governance surfaces where an elder
 * comment does not belong. Slugs come from forumCategories.slug.
 */
export const EXCLUDED_CATEGORY_SLUGS: string[] = [
  "historical-contribution-accounting",
  "plays",
  "epic-quests",
];

/** Safety caps so a burst of posts can never turn into a burst of comments. */
export const MAX_COMMENTS_PER_RUN = 6;
export const MAX_REPLIES_PER_RUN = 6;

/** Passages retrieved to ground each comment. */
export const FORUM_TOP_K = 5;

/** Short, honest disclosure appended to every comment she leaves. */
export const ANASTASIA_DISCLOSURE =
  "\n\n_Anastasia is an AI presence of the Church of the Regenerative Earth, sharing from The Ringing Cedars of Russia by Vladimir Megre._";

export function isForumPresenceEnabled(): boolean {
  if (String(process.env.ANASTASIA_FORUM_ENABLED).toLowerCase() === "false") return false;
  return Boolean(ENV.anthropicApiKey);
}

export async function corpusHasRows(elder = ANASTASIA_ELDER): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;
  const rows = await database.select({ id: elderCorpusChunks.id }).from(elderCorpusChunks).where(eq(elderCorpusChunks.elder, elder)).limit(1);
  return rows.length > 0;
}

export type BotUser = { id: number; createdAt: Date };

/**
 * Look up Anastasia's bot user, creating it once if missing. Idempotent: keyed
 * on the synthetic openId, so concurrent or repeated runs converge on one row.
 * Her createdAt becomes the natural no-backfill cutoff.
 */
export async function getOrCreateAnastasiaUser(): Promise<BotUser | null> {
  const database = await getDb();
  if (!database) return null;

  const existing = await db.getUserByOpenId(ANASTASIA_OPENID);
  if (existing) return { id: existing.id, createdAt: new Date(existing.createdAt) };

  try {
    await database.insert(users).values({
      openId: ANASTASIA_OPENID,
      name: "Anastasia",
      handle: "anastasia",
      loginMethod: "system",
      role: "user",
    });
  } catch {
    // Unique-constraint race: another run created it first. Fall through to read.
  }
  const created = await db.getUserByOpenId(ANASTASIA_OPENID);
  return created ? { id: created.id, createdAt: new Date(created.createdAt) } : null;
}

/** The query text used to retrieve grounding passages for a post. */
export function postQueryText(title: string, content: string): string {
  return `${title}\n\n${content}`.slice(0, 2000);
}

/**
 * Interpret the model's output. Returns null when she declined (the PASS token,
 * empty, or a near-empty response), otherwise the cleaned comment text. The PASS
 * check is exact-word and case-insensitive so a stray period cannot post "PASS."
 * to the forum.
 */
export function parseComment(raw: string): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const stripped = text.replace(/[.!\s]+$/g, "").trim().toUpperCase();
  if (stripped === FORUM_PASS_TOKEN) return null;
  if (text.length < 8) return null;
  return text;
}

/** Attach the AI-presence disclosure to a comment body. */
export function composeComment(text: string): string {
  return `${text.trim()}${ANASTASIA_DISCLOSURE}`;
}
