/**
 * Forum notification fan-out: mentions, replies, gratitude, reactions,
 * governance stages, and ReGen Guide replies, all landing in the single
 * `notifications` table with a deep link to the exact comment.
 *
 * Design rules (see .ai/docs/STEERING.md §11 + the forum upgrade plan):
 *   - Fully deterministic. No LLM anywhere in this module.
 *   - Every insert carries a dedupeKey; the unique key on notifications
 *     makes double-fired hooks (retries, restarts) no-ops.
 *   - Callers invoke the handle* entry points fire-and-forget AFTER the
 *     mutation commits; nothing here may throw into the request path, so
 *     every entry point catches and logs.
 *   - One person, one notification per event: mention wins over direct
 *     reply, direct reply wins over thread-follow activity.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  notifications,
  forumMentions,
  forumSubscriptions,
  forumUserMutes,
  forumPosts,
  forumReplies,
  forumBans,
  users,
} from "../../drizzle/schema";

import { ELDERS } from "./elders";

/** Handles that never receive user-mention notifications. @regen-guide routes
 * to the Guide's own LLM reply flow (see maybeTriggerGuideMention); elder
 * handles route through the elder forum job (server/jobs/elderForumJob.ts). */
const SYSTEM_HANDLES = new Set([
  "regen-guide",
  "regen-civics-team",
  "system",
  "admin",
  ...ELDERS.map((e) => e.handle),
]);

/** Anti-spam: at most this many resolved mentions notify per post/reply. */
export const MENTION_CAP = 10;

/** Reaction counts that produce a milestone notification (never one-per-reaction). */
export const REACTION_MILESTONES = [1, 5, 10, 25];

const EXCERPT_LENGTH = 140;

// ─── Pure functions (unit-tested in server/forum-notify.test.ts) ─────────────

/**
 * Extract @handle mentions from forum content.
 *   - Fenced code blocks and inline code are stripped first (a code sample
 *     must never notify anyone).
 *   - The char before @ must be start-of-string or a non-word char, so
 *     emails (user@host.com) don't match.
 *   - Handles are 3-40 chars of [a-z0-9-] (mirrors users.handle), matched
 *     case-insensitively, returned lowercased and deduped in first-seen order.
 */
export function parseUserMentions(content: string): string[] {
  if (!content) return [];
  const stripped = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ");
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /(^|[^A-Za-z0-9_])@([a-z0-9][a-z0-9-]{1,38}[a-z0-9])\b/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const handle = m[2].toLowerCase();
    if (handle.length < 3) continue;
    if (!seen.has(handle)) {
      seen.add(handle);
      out.push(handle);
    }
  }
  return out;
}

/** First N chars of content as a plain-text excerpt for notification bodies. */
export function excerpt(content: string, max = EXCERPT_LENGTH): string {
  const flat = (content || "").replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** Canonical deep link for a forum event. Reply events land the browser
 * scrolled to that exact comment (CommunityPost handles the fragment). */
export function forumLink(postId: number, replyId?: number | null): string {
  return replyId ? `/community/post/${postId}#reply-${replyId}` : `/community/post/${postId}`;
}

// ─── Insert core ─────────────────────────────────────────────────────────────

export interface NotificationInput {
  userId: number;
  type: typeof notifications.$inferInsert.type;
  title: string;
  body?: string | null;
  link: string;
  actorId?: number | null;
  postId?: number | null;
  replyId?: number | null;
  dedupeKey: string;
}

/**
 * Insert one notification row, idempotently (dedupeKey unique key; a
 * duplicate is a silent no-op). Returns true when a NEW row was written.
 * On a fresh insert, pushes an SSE invalidate so the bell updates live.
 */
export async function insertNotification(input: NotificationInput): Promise<boolean> {
  // Never write notifications from test runs: integration tests share the
  // real database (same guard as db.createUserNotification).
  if (process.env.VITEST || process.env.NODE_ENV === "test") return false;
  const db = await getDb();
  if (!db) return false;

  const result: any = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link,
      actorId: input.actorId ?? null,
      postId: input.postId ?? null,
      replyId: input.replyId ?? null,
      dedupeKey: input.dedupeKey,
    })
    .onDuplicateKeyUpdate({ set: { id: sql`id` } });

  // mysql2: affectedRows is 1 for a fresh insert, 2 for a duplicate-key update
  // (and 0/1 semantics vary by driver wrapping, so treat exactly 1 as "new").
  const inserted = (result?.[0]?.affectedRows ?? result?.affectedRows ?? 0) === 1;

  if (inserted) {
    import("../_core/sse")
      .then(({ pushToUser }) =>
        pushToUser(input.userId, { type: "invalidate", keys: ["notifications", "unreadCount"] })
      )
      .catch(() => {/* best-effort */});

    // Immediate email for the channels that support it (mention/reply/guide),
    // gated on the recipient's prefs inside the email module.
    import("./notification-email")
      .then(({ maybeSendImmediateEmail }) => maybeSendImmediateEmail(input))
      .catch((err) => console.error("[forum-notify] immediate email failed", err));

    // Web push copy (Phase 1B). No-ops unless VAPID keys are configured and
    // the user has a subscription; per-type prefs checked inside.
    import("./push")
      .then(({ maybeSendPush }) => maybeSendPush(input))
      .catch((err) => console.error("[forum-notify] push failed", err));
  }

  return inserted;
}

// ─── Shared lookups ──────────────────────────────────────────────────────────

async function getActiveBanSet(userIds: number[]): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ userId: forumBans.userId, expiresAt: forumBans.expiresAt })
    .from(forumBans)
    .where(inArray(forumBans.userId, userIds));
  // forumBans rows may carry an expiry; expired bans don't block notifications.
  const now = Date.now();
  const banned = new Set<number>();
  for (const r of rows as any[]) {
    if (!r.expiresAt || new Date(r.expiresAt).getTime() > now) banned.add(r.userId);
  }
  return banned;
}

/** Users who muted `actorId` (scope notifications/both) among `candidates`. */
async function getMutedBySet(actorId: number, candidates: number[]): Promise<Set<number>> {
  if (candidates.length === 0) return new Set();
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db
    .select({ userId: forumUserMutes.userId })
    .from(forumUserMutes)
    .where(
      and(
        eq(forumUserMutes.mutedUserId, actorId),
        inArray(forumUserMutes.userId, candidates),
        inArray(forumUserMutes.scope, ["notifications", "both"])
      )
    );
  return new Set(rows.map((r) => r.userId));
}

async function getActorName(actorId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Someone";
  const rows = await db
    .select({ name: users.name, handle: users.handle })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);
  return rows[0]?.name || (rows[0]?.handle ? `@${rows[0].handle}` : "Someone");
}

/** Idempotent thread follow (unique key on userId+postId keeps the first reason). */
export async function subscribeToThread(
  userId: number,
  postId: number,
  reason: "authored" | "replied" | "mentioned" | "manual"
): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;
  const db = await getDb();
  if (!db) return;
  await db
    .insert(forumSubscriptions)
    .values({ userId, postId, reason })
    .onDuplicateKeyUpdate({ set: { id: sql`id` } });
}

// ─── Mentions ────────────────────────────────────────────────────────────────

interface MentionSource {
  sourceType: "post" | "reply";
  sourceId: number;
  postId: number;
  replyId?: number | null;
  authorId: number;
  authorName: string;
  postTitle: string;
  content: string;
}

/**
 * Parse, resolve, and notify @mentions for a post or reply. Returns the user
 * IDs that received a NEW mention notification (so reply fan-out can skip
 * them: mention wins over reply). Safe to re-run on edit: forum_mentions'
 * unique key means only handles not yet recorded for this source notify.
 */
async function processMentions(src: MentionSource): Promise<Set<number>> {
  const notified = new Set<number>();
  const handles = parseUserMentions(src.content).filter((h) => !SYSTEM_HANDLES.has(h));
  if (handles.length === 0) return notified;

  const db = await getDb();
  if (!db) return notified;

  const rows = await db
    .select({ id: users.id, handle: users.handle })
    .from(users)
    .where(inArray(users.handle, handles));

  // Preserve in-content order, drop self-mentions, cap the fan-out.
  const byHandle = new Map(rows.map((r) => [r.handle!, r.id]));
  const targets: number[] = [];
  for (const h of handles) {
    const id = byHandle.get(h);
    if (id && id !== src.authorId && !targets.includes(id)) targets.push(id);
    if (targets.length >= MENTION_CAP) break;
  }
  if (targets.length === 0) return notified;

  const [banned, mutedBy] = await Promise.all([
    getActiveBanSet(targets),
    getMutedBySet(src.authorId, targets),
  ]);

  for (const userId of targets) {
    if (banned.has(userId) || mutedBy.has(userId)) continue;

    // Record the mention first; if it already exists (edit re-parse, retried
    // hook), skip the notification entirely.
    if (!(process.env.VITEST || process.env.NODE_ENV === "test")) {
      const res: any = await db
        .insert(forumMentions)
        .values({
          sourceType: src.sourceType,
          sourceId: src.sourceId,
          mentionedUserId: userId,
          mentionerUserId: src.authorId,
        })
        .onDuplicateKeyUpdate({ set: { id: sql`id` } });
      const fresh = (res?.[0]?.affectedRows ?? res?.affectedRows ?? 0) === 1;
      if (!fresh) continue;
    }

    const inserted = await insertNotification({
      userId,
      type: "mention",
      title: `${src.authorName} mentioned you`,
      body: excerpt(src.content),
      link: forumLink(src.postId, src.replyId),
      actorId: src.authorId,
      postId: src.postId,
      replyId: src.replyId ?? null,
      dedupeKey: `mention:${src.sourceType}:${src.sourceId}:u${userId}`,
    });
    if (inserted) {
      notified.add(userId);
      await subscribeToThread(userId, src.postId, "mentioned").catch(() => {});
    }
  }
  return notified;
}

/** Fire the ReGen Guide's existing mention flow when content @mentions it.
 * The Guide's own weekly rate limit applies inside postGuideReply. */
function maybeTriggerGuideMention(postId: number, content: string): void {
  if (!/(^|[^A-Za-z0-9_])@regen-guide\b/i.test(content)) return;
  import("./regenGuide")
    .then(({ handleGuideMention }) => handleGuideMention(postId, content))
    .catch((err) => console.error("[forum-notify] guide mention failed", err));
}

// ─── Entry points (call fire-and-forget after the mutation commits) ──────────

export async function handleForumPostCreated(args: {
  postId: number;
  authorId: number;
  title: string;
  content: string;
}): Promise<void> {
  try {
    await subscribeToThread(args.authorId, args.postId, "authored");
    const authorName = await getActorName(args.authorId);
    await processMentions({
      sourceType: "post",
      sourceId: args.postId,
      postId: args.postId,
      authorId: args.authorId,
      authorName,
      postTitle: args.title,
      content: args.content,
    });
    maybeTriggerGuideMention(args.postId, args.content);
  } catch (err) {
    console.error(`[forum-notify] post-created fan-out failed for post ${args.postId}`, err);
  }
}

/** Re-parse mentions on edit. Only handles NEW to this source notify;
 * removing a mention never retracts a delivered notification. */
export async function handleForumPostEdited(args: {
  postId: number;
  authorId: number;
  title: string;
  content: string;
}): Promise<void> {
  try {
    const authorName = await getActorName(args.authorId);
    await processMentions({
      sourceType: "post",
      sourceId: args.postId,
      postId: args.postId,
      authorId: args.authorId,
      authorName,
      postTitle: args.title,
      content: args.content,
    });
  } catch (err) {
    console.error(`[forum-notify] post-edited fan-out failed for post ${args.postId}`, err);
  }
}

export async function handleForumReplyCreated(args: {
  replyId: number;
  postId: number;
  parentReplyId?: number | null;
  authorId: number;
  content: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const [post] = await db
      .select({ id: forumPosts.id, authorId: forumPosts.authorId, title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, args.postId))
      .limit(1);
    if (!post) return;

    await subscribeToThread(args.authorId, args.postId, "replied");
    const authorName = await getActorName(args.authorId);

    // 1. Mentions (highest priority; winners are excluded from reply/thread fan-out).
    const alreadyNotified = await processMentions({
      sourceType: "reply",
      sourceId: args.replyId,
      postId: args.postId,
      replyId: args.replyId,
      authorId: args.authorId,
      authorName,
      postTitle: post.title,
      content: args.content,
    });

    const link = forumLink(args.postId, args.replyId);
    const body = excerpt(args.content);

    // 2. Direct reply to the post author.
    const directTargets: { userId: number; title: string }[] = [];
    if (post.authorId !== args.authorId && !alreadyNotified.has(post.authorId)) {
      directTargets.push({
        userId: post.authorId,
        title: `${authorName} replied to your post "${excerpt(post.title, 60)}"`,
      });
    }

    // 3. Nested reply to the parent reply's author.
    if (args.parentReplyId) {
      const [parent] = await db
        .select({ authorId: forumReplies.authorId })
        .from(forumReplies)
        .where(eq(forumReplies.id, args.parentReplyId))
        .limit(1);
      if (
        parent &&
        parent.authorId !== args.authorId &&
        !alreadyNotified.has(parent.authorId) &&
        !directTargets.some((t) => t.userId === parent.authorId)
      ) {
        directTargets.push({
          userId: parent.authorId,
          title: `${authorName} replied to your comment`,
        });
      }
    }

    if (directTargets.length > 0) {
      const ids = directTargets.map((t) => t.userId);
      const [banned, mutedBy] = await Promise.all([
        getActiveBanSet(ids),
        getMutedBySet(args.authorId, ids),
      ]);
      for (const t of directTargets) {
        if (banned.has(t.userId) || mutedBy.has(t.userId)) continue;
        const inserted = await insertNotification({
          userId: t.userId,
          type: "forum_reply",
          title: t.title,
          body,
          link,
          actorId: args.authorId,
          postId: args.postId,
          replyId: args.replyId,
          dedupeKey: `reply:${args.replyId}:u${t.userId}`,
        });
        if (inserted) alreadyNotified.add(t.userId);
      }
    }

    // 4. Thread followers (subscribed, not muted, not already covered above).
    const subs = await db
      .select({ userId: forumSubscriptions.userId })
      .from(forumSubscriptions)
      .where(and(eq(forumSubscriptions.postId, args.postId), eq(forumSubscriptions.muted, 0)));
    const followerIds = subs
      .map((s) => s.userId)
      .filter((id) => id !== args.authorId && !alreadyNotified.has(id));
    if (followerIds.length > 0) {
      const [banned, mutedBy] = await Promise.all([
        getActiveBanSet(followerIds),
        getMutedBySet(args.authorId, followerIds),
      ]);
      for (const userId of followerIds) {
        if (banned.has(userId) || mutedBy.has(userId)) continue;
        await insertNotification({
          userId,
          type: "thread_followed_activity",
          title: `New reply in "${excerpt(post.title, 60)}"`,
          body,
          link,
          actorId: args.authorId,
          postId: args.postId,
          replyId: args.replyId,
          dedupeKey: `thread:${args.replyId}:u${userId}`,
        });
      }
    }

    maybeTriggerGuideMention(args.postId, args.content);
  } catch (err) {
    console.error(`[forum-notify] reply-created fan-out failed for reply ${args.replyId}`, err);
  }
}

/** Edit re-parse for replies (wired when forum.updateReply ships in Phase 3;
 * exported now so that mutation has a ready hook). */
export async function handleForumReplyEdited(args: {
  replyId: number;
  postId: number;
  authorId: number;
  content: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [post] = await db
      .select({ title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, args.postId))
      .limit(1);
    const authorName = await getActorName(args.authorId);
    await processMentions({
      sourceType: "reply",
      sourceId: args.replyId,
      postId: args.postId,
      replyId: args.replyId,
      authorId: args.authorId,
      authorName,
      postTitle: post?.title ?? "",
      content: args.content,
    });
  } catch (err) {
    console.error(`[forum-notify] reply-edited fan-out failed for reply ${args.replyId}`, err);
  }
}

// ─── Gratitude ───────────────────────────────────────────────────────────────

export async function handleGratitudeSent(args: {
  gratitudeId: number;
  senderId: number;
  recipientId: number;
  message: string;
  sourceType?: string | null;
  sourceId?: number | null;
}): Promise<void> {
  try {
    const senderName = await getActorName(args.senderId);
    let link = "/profile";
    let postId: number | null = null;
    let replyId: number | null = null;
    if (args.sourceType === "forum_post" && args.sourceId) {
      postId = args.sourceId;
      link = forumLink(args.sourceId);
    } else if (args.sourceType === "forum_reply" && args.sourceId) {
      const db = await getDb();
      const [reply] = db
        ? await db
            .select({ postId: forumReplies.postId })
            .from(forumReplies)
            .where(eq(forumReplies.id, args.sourceId))
            .limit(1)
        : [undefined as any];
      if (reply) {
        postId = reply.postId;
        replyId = args.sourceId;
        link = forumLink(reply.postId, args.sourceId);
      }
    }
    await insertNotification({
      userId: args.recipientId,
      type: "gratitude",
      title: `${senderName} sent you gratitude`,
      body: excerpt(args.message),
      link,
      actorId: args.senderId,
      postId,
      replyId,
      dedupeKey: `gratitude:${args.gratitudeId}`,
    });
  } catch (err) {
    console.error(`[forum-notify] gratitude fan-out failed for ${args.gratitudeId}`, err);
  }
}

// ─── Reaction milestones ─────────────────────────────────────────────────────

/**
 * Called after a reaction is ADDED (never on removal). Notifies the item's
 * owner only when the total count lands exactly on a milestone, so a popular
 * post produces 4 notifications ever, not one per reaction.
 */
export async function handleReactionAdded(args: {
  actorId: number;
  postId?: number | null;
  replyId?: number | null;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    let ownerId: number | null = null;
    let postId: number | null = null;
    let targetKey = "";
    let itemLabel = "";
    if (args.replyId) {
      const [reply] = await db
        .select({ authorId: forumReplies.authorId, postId: forumReplies.postId })
        .from(forumReplies)
        .where(eq(forumReplies.id, args.replyId))
        .limit(1);
      if (!reply) return;
      ownerId = reply.authorId;
      postId = reply.postId;
      targetKey = `reply:${args.replyId}`;
      itemLabel = "comment";
    } else if (args.postId) {
      const [post] = await db
        .select({ authorId: forumPosts.authorId, title: forumPosts.title })
        .from(forumPosts)
        .where(eq(forumPosts.id, args.postId))
        .limit(1);
      if (!post) return;
      ownerId = post.authorId;
      postId = args.postId;
      targetKey = `post:${args.postId}`;
      itemLabel = `post "${excerpt(post.title, 60)}"`;
    }
    if (!ownerId || ownerId === args.actorId || !postId) return;

    const [countRow]: any = await db.execute(
      args.replyId
        ? sql`SELECT COUNT(*) AS c FROM postReactions WHERE replyId = ${args.replyId}`
        : sql`SELECT COUNT(*) AS c FROM postReactions WHERE postId = ${args.postId} AND replyId IS NULL`
    );
    const count = Number(countRow?.[0]?.c ?? countRow?.c ?? 0);
    if (!REACTION_MILESTONES.includes(count)) return;

    const mutedBy = await getMutedBySet(args.actorId, [ownerId]);
    if (mutedBy.has(ownerId)) return;

    const actorName = await getActorName(args.actorId);
    await insertNotification({
      userId: ownerId,
      type: "reaction_milestone",
      title:
        count === 1
          ? `${actorName} reacted to your ${itemLabel}`
          : `Your ${itemLabel} reached ${count} reactions`,
      body: null,
      link: forumLink(postId, args.replyId ?? null),
      actorId: args.actorId,
      postId,
      replyId: args.replyId ?? null,
      dedupeKey: `rmilestone:${targetKey}:${count}`,
    });
  } catch (err) {
    console.error("[forum-notify] reaction milestone fan-out failed", err);
  }
}

// ─── Governance stage ────────────────────────────────────────────────────────

/** Notify a thread's followers when it advances a governance stage
 * (sensing today; proposal/decided hook in when those transitions land). */
export async function handleGovernanceStage(args: {
  postId: number;
  stage: "sensing" | "proposal" | "decided";
  actorId: number;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [post] = await db
      .select({ title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, args.postId))
      .limit(1);
    if (!post) return;

    const STAGE_COPY: Record<string, string> = {
      sensing: "entered Sensing",
      proposal: "became a proposal",
      decided: "reached a decision",
    };

    const subs = await db
      .select({ userId: forumSubscriptions.userId })
      .from(forumSubscriptions)
      .where(and(eq(forumSubscriptions.postId, args.postId), eq(forumSubscriptions.muted, 0)));
    for (const s of subs) {
      if (s.userId === args.actorId) continue;
      await insertNotification({
        userId: s.userId,
        type: "governance_stage",
        title: `"${excerpt(post.title, 60)}" ${STAGE_COPY[args.stage]}`,
        body: null,
        link: forumLink(args.postId),
        actorId: args.actorId,
        postId: args.postId,
        dedupeKey: `gov:${args.stage}:${args.postId}:u${s.userId}`,
      });
    }
  } catch (err) {
    console.error(`[forum-notify] governance fan-out failed for post ${args.postId}`, err);
  }
}

// ─── AI Elder replies ────────────────────────────────────────────────────────

/**
 * An AI Elder commented in a thread (top-level: notify the post author;
 * nested: notify the person the elder answered). Called from
 * server/jobs/elderForumJob.ts after its createForumReply.
 */
export async function handleElderReplied(args: {
  postId: number;
  replyId: number;
  elderUserId: number;
  elderName: string;
  /** Author of the human reply the elder answered, for nested replies. */
  repliedToUserId?: number | null;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [post] = await db
      .select({ authorId: forumPosts.authorId, title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, args.postId))
      .limit(1);
    if (!post) return;
    const targetId = args.repliedToUserId ?? post.authorId;
    if (targetId === args.elderUserId) return;
    await insertNotification({
      userId: targetId,
      type: "elder_reply",
      title: args.repliedToUserId
        ? `${args.elderName} answered your comment`
        : `${args.elderName} responded to your post "${excerpt(post.title, 60)}"`,
      body: null,
      link: forumLink(args.postId, args.replyId),
      actorId: args.elderUserId,
      postId: args.postId,
      replyId: args.replyId,
      dedupeKey: `elder:${args.replyId}:u${targetId}`,
    });
  } catch (err) {
    console.error(`[forum-notify] elder-reply fan-out failed for reply ${args.replyId}`, err);
  }
}

// ─── ReGen Guide replies ─────────────────────────────────────────────────────

/** A delight moment: the Guide replied in your thread. Called from
 * postGuideReply after its insert; deep-links straight to the comment. */
export async function handleGuideReplied(args: {
  postId: number;
  replyId: number;
  guideUserId: number;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [post] = await db
      .select({ authorId: forumPosts.authorId, title: forumPosts.title })
      .from(forumPosts)
      .where(eq(forumPosts.id, args.postId))
      .limit(1);
    if (!post || post.authorId === args.guideUserId) return;
    await insertNotification({
      userId: post.authorId,
      type: "guide_reply",
      title: `The ReGen Guide responded in "${excerpt(post.title, 60)}"`,
      body: null,
      link: forumLink(args.postId, args.replyId),
      actorId: args.guideUserId,
      postId: args.postId,
      replyId: args.replyId,
      dedupeKey: `guide:${args.replyId}:u${post.authorId}`,
    });
  } catch (err) {
    console.error(`[forum-notify] guide-reply fan-out failed for reply ${args.replyId}`, err);
  }
}
