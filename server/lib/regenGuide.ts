/**
 * ReGen Guide: AI companion that posts to forum threads and decision pages.
 *
 * The Guide is a real user in the database with openId='regen-guide-system'
 * and handle='regen-guide'. Its posts render with an AI badge in the forum.
 *
 * Spec: archive/FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md section 5 (superseded by ADR-23).
 *
 * The Guide:
 *   - Never casts a stance on behalf of a user
 *   - Never speaks unless invoked or unless an explicit trigger fires
 *   - Always cites its reasoning when possible
 *   - Always editable by facilitators
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { users, forumPosts, forumReplies } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

const REGEN_GUIDE_OPEN_ID = "regen-guide-system";

let cachedGuideUserId: number | null = null;

export async function getRegenGuideUserId(): Promise<number | null> {
  if (cachedGuideUserId) return cachedGuideUserId;
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.openId, REGEN_GUIDE_OPEN_ID)).limit(1);
  if (rows.length === 0) return null;
  cachedGuideUserId = rows[0].id;
  return cachedGuideUserId;
}

/**
 * Post a Guide comment as a reply on a forum thread. The reply is marked
 * with a leading "_ReGen Guide_" provenance line so the UI can render the
 * AI badge consistently. Returns the reply ID, or null if the Guide isn't
 * available or rate-limited.
 */
export async function postGuideReply(threadId: number, content: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const guideId = await getRegenGuideUserId();
  if (!guideId) return null;

  // Rate limit: governance.guide.proactive_posts_per_week from game variables
  const limitRows = await db.execute(sql`
    SELECT value FROM game_variables WHERE \`key\` = 'governance.guide.proactive_posts_per_week' LIMIT 1
  `).then((r: any) => r[0] ?? []);
  const weeklyLimit = Number(limitRows[0]?.value ?? 5);
  // Table is forumReplies (camelCase); the old forum_replies name made this
  // count query error and the weekly rate limit never actually applied.
  const recentRows = await db.execute(sql`
    SELECT COUNT(*) AS c FROM forumReplies WHERE authorId = ${guideId} AND createdAt > (NOW() - INTERVAL 7 DAY)
  `).then((r: any) => r[0] ?? []);
  const recentCount = Number(recentRows[0]?.c ?? 0);
  if (recentCount >= weeklyLimit) {
    console.log(`[regen-guide] rate-limited: ${recentCount}/${weeklyLimit} posts this week`);
    return null;
  }

  const body = [
    "_ReGen Guide, AI companion. This response was drafted by Claude and may include interpretations, suggestions, or questions from a systems-thinking point of view._",
    "",
    content,
  ].join("\n");

  try {
    const result: any = await db.insert(forumReplies).values({
      postId: threadId,
      authorId: guideId,
      content: body,
    } as any);
    const replyId = result?.[0]?.insertId ?? result?.insertId ?? null;
    if (replyId) {
      // Notify the thread author that the Guide responded (deep-links to the comment).
      import("./forum-notify")
        .then(({ handleGuideReplied }) =>
          handleGuideReplied({ postId: threadId, replyId, guideUserId: guideId })
        )
        .catch((err) => console.error("[regen-guide] notify fan-out failed", err));
    }
    return replyId;
  } catch (err) {
    console.error("[regen-guide] failed to post reply", err);
    return null;
  }
}

/**
 * Mention handler: when a forum reply contains @regen-guide, generate a
 * response and post it. Returns the reply ID if posted.
 */
export async function handleGuideMention(threadId: number, mentioningContent: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  // Pull thread context
  const post = await db.select().from(forumPosts).where(eq(forumPosts.id, threadId)).limit(1);
  if (post.length === 0) return null;

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are ReGen Guide, the AI companion for the ReGen Civics governance pipeline. You speak in Rye's voice: direct, grounded, specific. " +
            "No em-dashes. No contrast framing (never 'not X but Y'). No banned AI words: delve, foster, leverage, vibrant, transformative, unlock, seamless, robust, comprehensive, utilize, navigate, empower. " +
            "When mentioned in a forum thread, respond with a short helpful comment (2-4 paragraphs max). Cite your reasoning when relevant. Never cast votes for users. " +
            "If you draw on a project doc or past decision, name it.",
        },
        {
          role: "user",
          content: `Thread title: ${post[0].title}\n\nThread OP: ${(post[0].content ?? "").slice(0, 1500)}\n\nSomeone just mentioned you with this message:\n\n${mentioningContent}\n\nWrite a short response.`,
        },
      ],
      maxTokens: 1500,
    });
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;
    return postGuideReply(threadId, reply);
  } catch (err) {
    console.error("[regen-guide] handleGuideMention failed", err);
    return null;
  }
}

/**
 * Devil's-advocate post for near-unanimous decisions.
 * Triggered 24h before a decision closes when the unanimity percentage
 * exceeds governance.guide.devil_advocate_unanimity_pct.
 */
export async function postDevilAdvocate(threadId: number, decisionSummary: string): Promise<number | null> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are ReGen Guide acting as a neutral devil's advocate. The community is about to ratify a decision with near-unanimous consent. " +
            "Surface 3 specific reasons this decision might be wrong that you do not see being discussed. Be concrete and specific. Lead with the affirmative. " +
            "No em-dashes, no contrast framing, no banned AI words (delve, foster, leverage, vibrant, transformative, unlock, seamless, robust, comprehensive, utilize, navigate, empower). " +
            "Frame as questions the facilitator should think about, not as objections.",
        },
        {
          role: "user",
          content: `The decision is: ${decisionSummary}\n\nPost three concerns the community should consider before ratifying.`,
        },
      ],
      maxTokens: 1500,
    });
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;
    return postGuideReply(threadId, `**Devil's advocate, three things to consider before ratifying:**\n\n${reply}`);
  } catch (err) {
    console.error("[regen-guide] postDevilAdvocate failed", err);
    return null;
  }
}
