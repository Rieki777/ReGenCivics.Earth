/**
 * Newsletter subscriber queries.
 *
 * First domain extracted from the db.ts god module (foundation audit Phase 2,
 * finding C1). Pattern for the rest of the split: move a domain's functions
 * here unchanged, re-export them from db.ts so every existing
 * `import { ... } from "./db"` keeps working, and let typecheck prove the
 * move. Follow server/db/tokens.ts for anything that needs transactions.
 */
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { InsertNewsletterSubscriber, newsletterSubscribers } from "../../drizzle/schema";
import { EMAIL_TOPICS, type EmailTopicKey } from "../../shared/emailPrefs";
import { getDb } from "../db";

type NewsletterSource = NonNullable<InsertNewsletterSubscriber["source"]>;

export async function createNewsletterSubscriber(data: InsertNewsletterSubscriber) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if email already exists
  const existing = await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    // Double opt-in: only newsletter.confirm (JWT) sets isActive=1.
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

/** Active subscribers only. Optional source filter for Outbound issues. */
export async function getNewsletterAudience(opts?: { sources?: string[] }) {
  const db = await getDb();
  if (!db) return [];
  const sources = (opts?.sources ?? []).filter((s): s is NewsletterSource => Boolean(s) && s !== "all");
  if (sources.length === 0) {
    return getActiveNewsletterSubscribers();
  }
  return db.select().from(newsletterSubscribers)
    .where(and(
      eq(newsletterSubscribers.isActive, 1),
      inArray(newsletterSubscribers.source, sources),
    ))
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function getRecordingSubscribers(): Promise<{ email: string; name: string | null }[]> {
  return getSubscribersForTopic("recordings");
}

/**
 * Active community subscribers who want a given topic and are not paused.
 * Events / Outbound / Harvest / recordings should call this (or audienceForTopic).
 */
export async function getSubscribersForTopic(topic: EmailTopicKey): Promise<{ email: string; name: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  const column = newsletterSubscribers[EMAIL_TOPICS[topic].column];
  const now = new Date();
  return db.select({
    email: newsletterSubscribers.email,
    name: newsletterSubscribers.name,
  }).from(newsletterSubscribers)
    .where(and(
      eq(newsletterSubscribers.isActive, 1),
      eq(column, 1),
      or(
        isNull(newsletterSubscribers.marketingPausedUntil),
        lt(newsletterSubscribers.marketingPausedUntil, now),
      ),
    ));
}

export async function updateNewsletterPrefs(
  email: string,
  patch: Partial<{
    isActive: number;
    prefSeasonal: number;
    prefOpenAccess: number;
    prefSeason2: number;
    prefEvents: number;
    notifyRecordings: number;
    marketingPausedUntil: Date | null;
  }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(newsletterSubscribers)
    .set(patch)
    .where(eq(newsletterSubscribers.email, email));
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
