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
