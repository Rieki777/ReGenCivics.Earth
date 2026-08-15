/**
 * The elders' community presence job (ADR-22).
 *
 * Deterministic-first (STEERING 11): the polling and candidate selection are
 * plain DB reads; the only model calls are the routing decision and the comment
 * texts. The forum itself is the cursor (an elder's existing reply excludes the
 * work), so restarts never double-post and no tracking table is needed.
 *
 * Each run, bounded by per-run caps:
 *   1. Comments: a new post is routed to the single best-fit elder (or none),
 *      and only that elder comments. An @handle mention in the post brings the
 *      named elder in regardless of routing.
 *   2. Replies: a direct reply to an elder's top-level comment gets one reply
 *      from that elder; an @handle mention in a reply brings the named elder in.
 *      "Once" is structural, so a branch ends at the elder's answer.
 */
import { and, asc, desc, eq, gt, inArray, isNotNull, like, not, notInArray } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db";
import { forumCategories, forumPosts, forumReplies, shipQuestActions } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { retrieveCanonPassages } from "../lib/elder-retrieval";
import { buildElderForumCommentPrompt, buildElderForumReplyPrompt, detectCrisis } from "../lib/elder-safety";
import { forumElders, mentionedElders, type Elder } from "../lib/elders";
import {
  EXCLUDED_CATEGORY_SLUGS,
  FORUM_TOP_K,
  MAX_COMMENTS_PER_RUN,
  MAX_REPLIES_PER_RUN,
  corpusHasRows,
  getOrCreateElderBotUser,
  isForumPresenceEnabled,
  parseComment,
  postQueryText,
  routePostToElder,
  type BotUser,
} from "../lib/elder-forum";

const COMMENT_MAX_TOKENS = 500;
const WINDOW = 60; // how many recent posts/replies to consider per run

export async function runElderForumJob(): Promise<{ commented: number; replied: number; skipped: number }> {
  const stats = { commented: 0, replied: 0, skipped: 0 };
  if (!isForumPresenceEnabled()) return stats;

  const database = await getDb();
  if (!database) return stats;

  // Active elders: forum-enabled, with a built corpus and a provisioned bot user.
  const active: Array<{ elder: Elder; bot: BotUser }> = [];
  for (const elder of forumElders()) {
    if (!(await corpusHasRows(elder.id))) continue;
    const bot = await getOrCreateElderBotUser(elder);
    if (bot) active.push({ elder, bot });
  }
  if (active.length === 0) return stats;

  const botUserIds = active.map((a) => a.bot.userId);
  const elderById = new Map(active.map((a) => [a.elder.id, a]));
  const elderIdByBotUserId = new Map(active.map((a) => [a.bot.userId, a.elder.id]));
  const earliestCutoff = new Date(Math.min(...active.map((a) => a.bot.createdAt.getTime())));

  const excludedCatIds = EXCLUDED_CATEGORY_SLUGS.length
    ? (await database.select({ id: forumCategories.id }).from(forumCategories).where(inArray(forumCategories.slug, EXCLUDED_CATEGORY_SLUGS))).map((c) => c.id)
    : [];

  // The ReGen Ship "Free Passage Quest" threads are curated (item 17): each
  // carries exactly one comment from each elder, seeded and human-reviewed. The
  // general best-fit-elder routing must never add, double, or one-sidedly claim
  // top-level comments on them, so exclude every ship-quest-linked post from the
  // comment pass below. (Elders may still answer direct replies to their own
  // comments there, which is conversational, not crowding.)
  const shipQuestPostIds = (
    await database.select({ id: shipQuestActions.forumPostId }).from(shipQuestActions).where(isNotNull(shipQuestActions.forumPostId))
  )
    .map((r) => r.id)
    .filter((id): id is number => id != null);

  // All replies ever written by the elders. Small set; used to know which posts
  // and replies each elder has already responded to.
  const botReplies = await database
    .select({ id: forumReplies.id, postId: forumReplies.postId, authorId: forumReplies.authorId, parentReplyId: forumReplies.parentReplyId, content: forumReplies.content })
    .from(forumReplies)
    .where(inArray(forumReplies.authorId, botUserIds));

  const commentedEldersByPost = new Map<number, Set<string>>();
  const answered = new Set<string>(); // `${elderId}:${replyId}` the elder has answered
  const topCommentElderById = new Map<number, string>(); // elder top-level comment id -> elderId
  const topCommentContentById = new Map<number, string>();
  for (const r of botReplies) {
    const elderId = elderIdByBotUserId.get(r.authorId);
    if (!elderId) continue;
    if (r.parentReplyId == null) {
      if (!commentedEldersByPost.has(r.postId)) commentedEldersByPost.set(r.postId, new Set());
      commentedEldersByPost.get(r.postId)!.add(elderId);
      topCommentElderById.set(r.id, elderId);
      topCommentContentById.set(r.id, r.content);
    } else {
      answered.add(`${elderId}:${r.parentReplyId}`);
    }
  }

  const existsBefore = (bot: BotUser, when: Date) => bot.createdAt.getTime() <= when.getTime();

  // ── 1. Comments on posts (mentions + routing) ────────────────────────────
  const posts = await database
    .select()
    .from(forumPosts)
    .where(
      and(
        gt(forumPosts.createdAt, earliestCutoff),
        eq(forumPosts.isLocked, 0),
        // Assembly walkthrough threads are fictional teaching content; elders
        // must not engage with them (same marker seed-assembly-examples.ts writes)
        not(like(forumPosts.content, "[EXAMPLE%")),
        notInArray(forumPosts.authorId, botUserIds),
        excludedCatIds.length ? notInArray(forumPosts.categoryId, excludedCatIds) : undefined,
        shipQuestPostIds.length ? notInArray(forumPosts.id, shipQuestPostIds) : undefined,
      ),
    )
    .orderBy(asc(forumPosts.createdAt))
    .limit(WINDOW);

  type CommentJob = { elder: Elder; bot: BotUser; post: typeof posts[number] };
  const commentJobs: CommentJob[] = [];
  const queuedComment = new Set<string>(); // `${elderId}:${postId}`

  for (const post of posts) {
    if (commentJobs.length >= MAX_COMMENTS_PER_RUN) break;
    if (detectCrisis(`${post.title}\n${post.content}`)) {
      stats.skipped++;
      continue;
    }
    const already = commentedEldersByPost.get(post.id) ?? new Set<string>();
    const queueFor = (a: { elder: Elder; bot: BotUser }) => {
      const key = `${a.elder.id}:${post.id}`;
      if (already.has(a.elder.id) || queuedComment.has(key)) return;
      if (!existsBefore(a.bot, new Date(post.createdAt))) return;
      queuedComment.add(key);
      commentJobs.push({ elder: a.elder, bot: a.bot, post });
    };

    const mentions = mentionedElders(`${post.title}\n${post.content}`)
      .map((e) => elderById.get(e.id))
      .filter((x): x is { elder: Elder; bot: BotUser } => Boolean(x));
    mentions.forEach(queueFor);

    // Primary routing only when no elder has commented and none was mentioned.
    if (already.size === 0 && mentions.length === 0) {
      const candidates = active.filter((a) => existsBefore(a.bot, new Date(post.createdAt)));
      const chosen = await routePostToElder(post.title, post.content, candidates.map((c) => c.elder));
      if (chosen) {
        const a = elderById.get(chosen);
        if (a) queueFor(a);
      } else {
        stats.skipped++;
      }
    }
  }

  for (const job of commentJobs.slice(0, MAX_COMMENTS_PER_RUN)) {
    try {
      const passages = await retrieveCanonPassages(job.elder.id, postQueryText(job.post.title, job.post.content), FORUM_TOP_K);
      const res = await invokeLLM({
        messages: [
          { role: "system", content: buildElderForumCommentPrompt(job.elder, passages) },
          { role: "user", content: `Community post\nTitle: ${job.post.title}\n\n${job.post.content}` },
        ],
        maxTokens: COMMENT_MAX_TOKENS,
      });
      const comment = parseComment(res.choices?.[0]?.message?.content ?? "");
      if (!comment) {
        stats.skipped++;
        continue;
      }
      // Elder quest offers (improvement 12): deterministic, human-ratified
      // pool only, appended where fitting. Crisis posts never reach here (the
      // PASS gate above returns for them). Off until ELDER_QUEST_OFFERS_ENABLED
      // and the elder's steward blesses it.
      let commentWithOffer = comment;
      try {
        const { maybeQuestOffer } = await import("../lib/elderQuestOffers");
        const offer = await maybeQuestOffer({
          elder: job.elder,
          playerText: `${job.post.title}\n${job.post.content}`,
          bioregionId: job.post.bioregionId ?? null,
        });
        if (offer) commentWithOffer = `${comment}\n\n${offer}`;
      } catch {
        // Offers are decorative; never break a comment over one.
      }
      const commentReplyId = await db.createForumReply({ postId: job.post.id, authorId: job.bot.userId, content: commentWithOffer });
      stats.commented++;
      // Notify the post author: an elder responded (deep-links to the comment).
      import("../lib/forum-notify")
        .then(({ handleElderReplied }) =>
          handleElderReplied({
            postId: job.post.id,
            replyId: commentReplyId,
            elderUserId: job.bot.userId,
            elderName: job.elder.displayName,
          })
        )
        .catch((err) => console.error(`[elderForum] notify fan-out failed for post ${job.post.id}`, err));
    } catch (err) {
      console.error(`[elderForum] ${job.elder.id} comment on post ${job.post.id} failed:`, err);
    }
  }

  // ── 2. Replies to elders + mentions in replies ───────────────────────────
  const recentReplies = await database
    .select({ id: forumReplies.id, postId: forumReplies.postId, parentReplyId: forumReplies.parentReplyId, content: forumReplies.content, authorId: forumReplies.authorId })
    .from(forumReplies)
    .where(and(gt(forumReplies.createdAt, earliestCutoff), notInArray(forumReplies.authorId, botUserIds), not(like(forumReplies.content, "[EXAMPLE%"))))
    .orderBy(desc(forumReplies.createdAt))
    .limit(WINDOW);

  type ReplyJob = { elder: Elder; bot: BotUser; reply: typeof recentReplies[number] };
  const replyJobs: ReplyJob[] = [];
  const queuedReply = new Set<string>();

  const queueReply = (a: { elder: Elder; bot: BotUser }, reply: typeof recentReplies[number]) => {
    const key = `${a.elder.id}:${reply.id}`;
    if (answered.has(key) || queuedReply.has(key)) return;
    replyJobs.push({ elder: a.elder, bot: a.bot, reply });
    queuedReply.add(key);
  };

  for (const reply of recentReplies) {
    if (replyJobs.length >= MAX_REPLIES_PER_RUN) break;
    if (detectCrisis(reply.content)) {
      stats.skipped++;
      continue;
    }
    const mentions = mentionedElders(reply.content)
      .map((e) => elderById.get(e.id))
      .filter((x): x is { elder: Elder; bot: BotUser } => Boolean(x));
    if (mentions.length > 0) {
      mentions.forEach((a) => queueReply(a, reply));
      continue;
    }
    // No mention: answer only if it is a direct reply to an elder's top-level comment.
    const parentElderId = reply.parentReplyId != null ? topCommentElderById.get(reply.parentReplyId) : undefined;
    if (parentElderId) {
      const a = elderById.get(parentElderId);
      if (a) queueReply(a, reply);
    }
  }

  for (const job of replyJobs.slice(0, MAX_REPLIES_PER_RUN)) {
    try {
      const [post] = await database.select({ title: forumPosts.title, content: forumPosts.content }).from(forumPosts).where(eq(forumPosts.id, job.reply.postId)).limit(1);
      const parentComment = job.reply.parentReplyId != null ? topCommentContentById.get(job.reply.parentReplyId) : undefined;
      const passages = await retrieveCanonPassages(job.elder.id, job.reply.content.slice(0, 2000), FORUM_TOP_K);
      const context = [
        post ? `Community post\nTitle: ${post.title}\n\n${post.content}` : "Community post",
        parentComment ? `\nYour earlier comment:\n${parentComment}` : "",
        `\nThey wrote to you:\n${job.reply.content}`,
      ].join("\n");
      const res = await invokeLLM({
        messages: [
          { role: "system", content: buildElderForumReplyPrompt(job.elder, passages) },
          { role: "user", content: context },
        ],
        maxTokens: COMMENT_MAX_TOKENS,
      });
      const answer = parseComment(res.choices?.[0]?.message?.content ?? "");
      if (!answer) {
        stats.skipped++;
        continue;
      }
      const answerReplyId = await db.createForumReply({ postId: job.reply.postId, authorId: job.bot.userId, content: answer, parentReplyId: job.reply.id });
      stats.replied++;
      // Notify the person the elder answered (deep-links to the elder's reply).
      import("../lib/forum-notify")
        .then(({ handleElderReplied }) =>
          handleElderReplied({
            postId: job.reply.postId,
            replyId: answerReplyId,
            elderUserId: job.bot.userId,
            elderName: job.elder.displayName,
            repliedToUserId: job.reply.authorId,
          })
        )
        .catch((err) => console.error(`[elderForum] notify fan-out failed for reply ${job.reply.id}`, err));
    } catch (err) {
      console.error(`[elderForum] ${job.elder.id} reply to ${job.reply.id} failed:`, err);
    }
  }

  if (stats.commented || stats.replied || stats.skipped) {
    console.log(`[elderForum] commented=${stats.commented} replied=${stats.replied} skipped=${stats.skipped}`);
  }
  return stats;
}
