/**
 * Application queries.
 *
 * Extracted from the db.ts god module (foundation audit Phase 2, finding C1),
 * following the pattern set by server/db/newsletter.ts: the functions moved
 * here unchanged, db.ts re-exports them so every existing
 * `import { ... } from "./db"` keeps working, and typecheck proves the move.
 * Anything transactional follows server/db/tokens.ts instead.
 */
import { and, desc, eq, getTableColumns, lt, ne } from "drizzle-orm";
import { applications, InsertApplication, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { asMutationResult } from "./_shared";

const applicationWithContact = {
  ...getTableColumns(applications),
  contactEmail: users.email,
  contactName: users.name,
};

export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(applications).values(data);
  return result[0].insertId;
}

export async function updateApplication(id: number, data: Partial<InsertApplication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(applications).set(data).where(eq(applications.id, id));
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select(applicationWithContact)
    .from(applications)
    .leftJoin(users, eq(users.id, applications.userId))
    .where(eq(applications.id, id))
    .limit(1);

  return result[0];
}

export async function getApplicationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.adminSeeded, 0)))
    .orderBy(desc(applications.createdAt));
}

export async function getAllApplications() {
  const db = await getDb();
  if (!db) return [];

  // Exclude drafts from the admin review queue.
  // contactEmail/contactName come from the applicant's user account.
  return db.select(applicationWithContact)
    .from(applications)
    .leftJoin(users, eq(users.id, applications.userId))
    .where(ne(applications.status, "draft"))
    .orderBy(desc(applications.submittedAt));
}

export async function getDraftApplications() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(applications)
    .where(eq(applications.status, "draft"))
    .orderBy(desc(applications.updatedAt));
}

export async function deleteStaleApplicationDrafts(olderThanDays = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db.delete(applications)
    .where(and(eq(applications.status, "draft"), lt(applications.updatedAt, cutoff)));
  return asMutationResult(result).affectedRows ?? 0;
}

export async function getApplicationsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select(applicationWithContact)
    .from(applications)
    .leftJoin(users, eq(users.id, applications.userId))
    .where(eq(applications.status, status as any))
    .orderBy(desc(applications.submittedAt));
}
