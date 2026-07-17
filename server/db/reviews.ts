/**
 * Application review queries: the reviews themselves and the reviewer roster.
 *
 * Extracted from the db.ts god module (foundation audit Phase 2, finding C1),
 * following server/db/newsletter.ts: functions moved unchanged, re-exported
 * from db.ts so existing `import { ... } from "./db"` keeps working, typecheck
 * proves the move.
 *
 * Reviews and reviewer emails live together: the roster exists to staff the
 * review queue, and neither is meaningful without the other.
 */
import { desc, eq } from "drizzle-orm";
import {
  InsertReview,
  InsertReviewerEmail,
  reviewerEmails,
  reviews,
} from "../../drizzle/schema";
import { getDb } from "../db";

// ============================================
// Review Queries
// ============================================

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}

export async function getReviewsByApplicationId(applicationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(reviews)
    .where(eq(reviews.applicationId, applicationId))
    .orderBy(desc(reviews.createdAt));
}

export async function updateReview(id: number, data: Partial<InsertReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reviews).set(data).where(eq(reviews.id, id));
}

// ============================================
// Reviewer Email Queries
// ============================================

export async function createReviewerEmail(data: InsertReviewerEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reviewerEmails).values(data);
  return result[0].insertId;
}

export async function getReviewerEmailById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(reviewerEmails).where(eq(reviewerEmails.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllReviewerEmails() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(reviewerEmails)
    .orderBy(desc(reviewerEmails.createdAt));
}

export async function getActiveReviewerEmails() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(reviewerEmails)
    .where(eq(reviewerEmails.isActive, 1))
    .orderBy(desc(reviewerEmails.createdAt));
}

export async function updateReviewerEmail(id: number, data: Partial<InsertReviewerEmail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reviewerEmails).set(data).where(eq(reviewerEmails.id, id));
}

export async function deleteReviewerEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(reviewerEmails).where(eq(reviewerEmails.id, id));
}
