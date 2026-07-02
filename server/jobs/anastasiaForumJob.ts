/**
 * Anastasia's community presence job.
 *
 * Deterministic-first (STEERING section 11): the polling and candidate
 * selection below are plain DB queries at zero token cost. The only model calls
 * are the comment texts themselves. The forum itself is the cursor: once she has
 * left a reply on a post (or answered a reply to her), the NOT EXISTS clauses
 * exclude it forever, so a process restart never double-posts and no extra
 * tracking table is needed.
 *
 * What she does each run (all bounded by per-run caps):
 *   1. Comment on new posts (made after she came into being) that she has not
 *      commented on, skipping excluded categories, locked posts, and crisis
 *      posts, and skipping posts the model judges do not call for her voice.
 *   2. Reply once to direct replies to her top-level comments that she has not
 *      answered. "Once" is enforced structurally: she only answers replies whose
 *      parent is one of her top-level comments, so the branch ends at her answer.
 */
import { and, asc, eq, gt, inArray, isNull, ne, notExists, notInArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import * as db from "../db";
import { getDb } from "../db";
import { forumCategories, forumPosts, forumReplies } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { retrieveCanonPassages } from "../lib/elder-retrieval";
import { buildAnastasiaForumCommentPrompt, buildAnastasiaForumReplyPrompt, detectCrisis } from "../lib/elder-safety";
import {
  ANASTASIA_DISCLOSURE,
  ANASTASIA_ELDER,
  EXCLUDED_CATEGORY_SLUGS,
  FORUM_TOP_K,
  MAX_COMMENTS_PER_RUN,
  MAX_REPLIES_PER_RUN,
  composeComment,
  corpusHasRows,
  getOrCreateAnastasiaUser,
  isForumPresenceEnabled,
  parseComment,
  postQueryText,
} from "../lib/anastasia-forum";

const COMMENT_MAX_TOKENS = 500;

function stripDisclosure(text: string): string {
  const trimmed = ANASTASIA_DISCLOSURE.trim();
  const idx = text.indexOf(trimmed);
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

export async function runAnastasiaForumJob(): Promise<{ commented: number; replied: number; skipped: number }> {
  const stats = { commented: 0, replied: 0, skipped: 0 };
  if (!isForumPresenceEnabled()) return stats;
  if (!(await corpusHasRows())) return stats;

  const database = await getDb();
  if (!database) return stats;

  const bot = await getOrCreateAnastasiaUser();
  if (!bot) return stats;

  const excludedCatIds = EXCLUDED_CATEGORY_SLUGS.length
    ? (await database.select({ id: forumCategories.id }).from(forumCategories).where(inArray(forumCategories.slug, EXCLUDED_CATEGORY_SLUGS))).map((c) => c.id)
    : [];

  // ── 1. New posts without a comment from her ──────────────────────────────
  const mine = alias(forumReplies, "mine");
  const posts = await database
    .select()
    .from(forumPosts)
    .where(
      and(
        gt(forumPosts.createdAt, bot.createdAt),
        eq(forumPosts.isLocked, 0),
        ne(forumPosts.authorId, bot.id),
        excludedCatIds.length ? notInArray(forumPosts.categoryId, excludedCatIds) : undefined,
        notExists(
          database
            .select({ x: sql`1` })
            .from(mine)
            .where(and(eq(mine.postId, forumPosts.id), eq(mine.authorId, bot.id))),
        ),
      ),
    )
    .orderBy(asc(forumPosts.createdAt))
    .limit(MAX_COMMENTS_PER_RUN);

  for (const post of posts) {
    if (detectCrisis(`${post.title}\n${post.content}`)) {
      stats.skipped++;
      continue;
    }
    try {
      const passages = await retrieveCanonPassages(ANASTASIA_ELDER, postQueryText(post.title, post.content), FORUM_TOP_K);
      const res = await invokeLLM({
        messages: [
          { role: "system", content: buildAnastasiaForumCommentPrompt(passages) },
          { role: "user", content: `Community post\nTitle: ${post.title}\n\n${post.content}` },
        ],
        maxTokens: COMMENT_MAX_TOKENS,
      });
      const comment = parseComment(res.choices?.[0]?.message?.content ?? "");
      if (!comment) {
        stats.skipped++;
        continue;
      }
      await db.createForumReply({ postId: post.id, authorId: bot.id, content: composeComment(comment) });
      stats.commented++;
    } catch (err) {
      console.error(`[anastasiaForum] comment on post ${post.id} failed:`, err);
    }
  }

  // ── 2. Direct replies to her top-level comments she has not answered ──────
  const herComments = await database
    .select({ id: forumReplies.id, postId: forumReplies.postId, content: forumReplies.content })
    .from(forumReplies)
    .where(and(eq(forumReplies.authorId, bot.id), isNull(forumReplies.parentReplyId)));

  if (herComments.length > 0) {
    const herCommentIds = herComments.map((c) => c.id);
    const herCommentById = new Map(herComments.map((c) => [c.id, c]));
    const child = alias(forumReplies, "child");

    const incoming = await database
      .select({ id: forumReplies.id, postId: forumReplies.postId, parentReplyId: forumReplies.parentReplyId, content: forumReplies.content })
      .from(forumReplies)
      .where(
        and(
          inArray(forumReplies.parentReplyId, herCommentIds),
          ne(forumReplies.authorId, bot.id),
          gt(forumReplies.createdAt, bot.createdAt),
          notExists(
            database
              .select({ x: sql`1` })
              .from(child)
              .where(and(eq(child.parentReplyId, forumReplies.id), eq(child.authorId, bot.id))),
          ),
        ),
      )
      .orderBy(asc(forumReplies.createdAt))
      .limit(MAX_REPLIES_PER_RUN);

    for (const reply of incoming) {
      if (detectCrisis(reply.content)) {
        stats.skipped++;
        continue;
      }
      try {
        const [post] = await database.select({ title: forumPosts.title, content: forumPosts.content }).from(forumPosts).where(eq(forumPosts.id, reply.postId)).limit(1);
        const herComment = reply.parentReplyId ? herCommentById.get(reply.parentReplyId) : undefined;
        const passages = await retrieveCanonPassages(ANASTASIA_ELDER, reply.content.slice(0, 2000), FORUM_TOP_K);
        const context = [
          post ? `Community post\nTitle: ${post.title}\n\n${post.content}` : "Community post",
          `\nYour earlier comment:\n${herComment ? stripDisclosure(herComment.content) : ""}`,
          `\nTheir reply to you:\n${reply.content}`,
        ].join("\n");
        const res = await invokeLLM({
          messages: [
            { role: "system", content: buildAnastasiaForumReplyPrompt(passages) },
            { role: "user", content: context },
          ],
          maxTokens: COMMENT_MAX_TOKENS,
        });
        const answer = parseComment(res.choices?.[0]?.message?.content ?? "");
        if (!answer) {
          stats.skipped++;
          continue;
        }
        await db.createForumReply({ postId: reply.postId, authorId: bot.id, content: composeComment(answer), parentReplyId: reply.id });
        stats.replied++;
      } catch (err) {
        console.error(`[anastasiaForum] reply to ${reply.id} failed:`, err);
      }
    }
  }

  if (stats.commented || stats.replied || stats.skipped) {
    console.log(`[anastasiaForum] commented=${stats.commented} replied=${stats.replied} skipped=${stats.skipped}`);
  }
  return stats;
}
