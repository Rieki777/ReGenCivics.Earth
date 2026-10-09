/**
 * Soft-hide for forum posts and replies.
 * Public lists, threads, feeds, search, and the sitemap keep isHidden = false.
 * Admins load the hidden rows on purpose and can set the flag back.
 */
import { eq } from "drizzle-orm";
import { forumPosts, forumReplies } from "../../drizzle/schema";

export function visibleForumPost() {
  return eq(forumPosts.isHidden, false);
}

export function visibleForumReply() {
  return eq(forumReplies.isHidden, false);
}

/** MySQL boolean arrives as 0/1. Drizzle may also surface true/false. */
export function isForumHidden(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}
