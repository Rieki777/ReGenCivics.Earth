/**
 * Newsletter subscriber queries.
 *
 * First domain extracted from the db.ts god module (foundation audit Phase 2,
 * finding C1). Pattern for the rest of the split: move a domain's functions
 * here unchanged, re-export them from db.ts so every existing
 * `import { ... } from "./db"` keeps working, and let typecheck prove the
 * move. Follow server/db/tokens.ts for anything that needs transactions.
 */
import { and, desc, eq } from "drizzle-orm";
import { InsertNewsletterSubscriber, newsletterSubscribers } from "../../drizzle/schema";
import { getDb } from "../db";

export async function createNewsletterSubscriber(data: InsertNewsletterSubscriber) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if email already exists
  const existing = await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    // Update existing subscriber to active if they were inactive
    if (existing[0].isActive === 0) {
      await db.update(newsletterSubscribers)
        .set({ isActive: 1, source: data.source })
        .where(eq(newsletterSubscribers.id, existing[0].id));
    }
    return existing[0].id;
  }

  const result = await db.insert(newsletterSubscribers).values(data);
  return result[0].insertId;
}

export async function getNewsletterSubscriberByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllNewsletterSubscribers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function getActiveNewsletterSubscribers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, 1))
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function getRecordingSubscribers(): Promise<{ email: string; name: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    email: newsletterSubscribers.email,
    name: newsletterSubscribers.name,
  }).from(newsletterSubscribers)
    .where(and(
      eq(newsletterSubscribers.isActive, 1),
      eq(newsletterSubscribers.notifyRecordings, 1),
    ));
}

export async function unsubscribeNewsletter(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(newsletterSubscribers)
    .set({ isActive: 0 })
    .where(eq(newsletterSubscribers.email, email));
}

export async function activateNewsletterSubscriber(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(newsletterSubscribers)
    .set({ isActive: 1 })
    .where(eq(newsletterSubscribers.email, email));
}
