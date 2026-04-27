/**
 * Drizzle relations definitions for the relational query API
 * (`db.query.<table>.findMany({ with: { ... } })`).
 *
 * Why this file exists: without `relations()` declarations, the relational
 * query API silently can't traverse from one table to another, forcing
 * callers to reach for explicit batch helpers (getUsersByIds,
 * getPlayerProfilesByUserIds, etc) and wire up the join in JavaScript.
 *
 * The minimum set wired here covers the surfaces touched by the
 * world-class audit batch (forum + player profiles). Extend incrementally
 * as more queries move to the relational API.
 *
 * Drizzle 0.44 syntax: `relations(table, ({ one, many }) => ({ ... }))`
 * with the `relationName` parameter when the same pair has multiple
 * directional links (e.g., posts.lastReplyBy + posts.authorId both point
 * at users).
 */

import { relations } from "drizzle-orm";
import {
  users,
  playerProfiles,
  forumPosts,
  forumReplies,
  forumCategories,
  bioregions,
  postReactions,
  userTokenLedger,
} from "./schema";

// users 1:1 playerProfile, plus the back-reference from playerProfiles.userId.
export const usersRelations = relations(users, ({ one, many }) => ({
  playerProfile: one(playerProfiles, {
    fields: [users.id],
    references: [playerProfiles.userId],
  }),
  forumPosts: many(forumPosts, { relationName: "forumPostsAuthor" }),
  forumReplies: many(forumReplies, { relationName: "forumRepliesAuthor" }),
  postReactions: many(postReactions),
  tokenLedger: many(userTokenLedger),
}));

export const playerProfilesRelations = relations(playerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [playerProfiles.userId],
    references: [users.id],
  }),
}));

// forumPosts has TWO links to users (authorId + lastReplyBy). Drizzle
// requires relationName to disambiguate which side a given many() points at.
export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [forumPosts.authorId],
    references: [users.id],
    relationName: "forumPostsAuthor",
  }),
  lastReplier: one(users, {
    fields: [forumPosts.lastReplyBy],
    references: [users.id],
    relationName: "forumPostsLastReplier",
  }),
  category: one(forumCategories, {
    fields: [forumPosts.categoryId],
    references: [forumCategories.id],
  }),
  bioregion: one(bioregions, {
    fields: [forumPosts.bioregionId],
    references: [bioregions.id],
  }),
  replies: many(forumReplies),
  reactions: many(postReactions),
}));

export const forumRepliesRelations = relations(forumReplies, ({ one }) => ({
  post: one(forumPosts, {
    fields: [forumReplies.postId],
    references: [forumPosts.id],
  }),
  author: one(users, {
    fields: [forumReplies.authorId],
    references: [users.id],
    relationName: "forumRepliesAuthor",
  }),
  parentReply: one(forumReplies, {
    fields: [forumReplies.parentReplyId],
    references: [forumReplies.id],
    relationName: "forumRepliesParent",
  }),
}));

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  posts: many(forumPosts),
}));

export const bioregionsRelations = relations(bioregions, ({ many }) => ({
  posts: many(forumPosts),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(forumPosts, {
    fields: [postReactions.postId],
    references: [forumPosts.id],
  }),
  user: one(users, {
    fields: [postReactions.userId],
    references: [users.id],
  }),
}));

export const userTokenLedgerRelations = relations(userTokenLedger, ({ one }) => ({
  user: one(users, {
    fields: [userTokenLedger.userId],
    references: [users.id],
  }),
}));
