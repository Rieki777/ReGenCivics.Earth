/**
 * Video suggestion queries.
 *
 * Extracted from the db.ts god module (foundation audit Phase 2, finding C1),
 * following server/db/newsletter.ts: functions moved unchanged, re-exported
 * from db.ts so existing `import { ... } from "./db"` keeps working, typecheck
 * proves the move.
 */
import { desc, eq } from "drizzle-orm";
import { InsertVideoSuggestion, videoSuggestions } from "../../drizzle/schema";
import { getDb } from "../db";

export async function createVideoSuggestion(data: InsertVideoSuggestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(videoSuggestions).values(data);
  return result[0].insertId;
}

export async function getVideoSuggestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(videoSuggestions).where(eq(videoSuggestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllVideoSuggestions() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(videoSuggestions)
    .orderBy(desc(videoSuggestions.voteCount));
}

/**
 * Public projection of the suggestion list, for the voting board on /blog.
 *
 * `video_suggestions` stores `submitterEmail` and a `voterEmails` JSON array,
 * so the whole-row version above published the address of everyone who ever
 * suggested or voted on a video. The board needs the title, the category and
 * the tally; it never needed to know who.
 *
 * No status filter, deliberately. The board renders a badge per status and
 * links completed suggestions to their blog post, so filtering to approved
 * would empty most of the page. Status is a label here, not a gate: nothing
 * private is attached to a pending row once the two email columns are gone.
 */
export const PUBLIC_VIDEO_SUGGESTION_COLUMNS = {
  id: videoSuggestions.id,
  title: videoSuggestions.title,
  description: videoSuggestions.description,
  category: videoSuggestions.category,
  voteCount: videoSuggestions.voteCount,
  status: videoSuggestions.status,
  completedVideoUrl: videoSuggestions.completedVideoUrl,
  completedBlogSlug: videoSuggestions.completedBlogSlug,
  createdAt: videoSuggestions.createdAt,
} as const;

export async function getPublicVideoSuggestions() {
  const db = await getDb();
  if (!db) return [];

  return db.select(PUBLIC_VIDEO_SUGGESTION_COLUMNS)
    .from(videoSuggestions)
    .orderBy(desc(videoSuggestions.voteCount));
}

export async function getApprovedVideoSuggestions() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(videoSuggestions)
    .where(eq(videoSuggestions.status, "approved"))
    .orderBy(desc(videoSuggestions.voteCount));
}

export async function updateVideoSuggestion(id: number, data: Partial<InsertVideoSuggestion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(videoSuggestions).set(data).where(eq(videoSuggestions.id, id));
}

export async function deleteVideoSuggestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(videoSuggestions).where(eq(videoSuggestions.id, id));
}
