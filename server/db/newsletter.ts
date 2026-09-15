/**
 * Newsletter subscriber queries.
 *
 * First domain extracted from the db.ts god module (foundation audit Phase 2,
 * finding C1). Pattern for the rest of the split: move a domain's functions
 * here unchanged, re-export them from db.ts so every existing
 * `import { ... } from "./db"` keeps working, and let typecheck prove the
 * move. Follow server/db/tokens.ts for anything that needs transactions.
 */
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
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

/**
 * Active community subscribers for a topic (default seasonal for Outbound).
 * Honors pause and topic mute. Optional source filter.
 */
export async function getNewsletterAudience(opts?: { sources?: string[]; topic?: EmailTopicKey }) {
  const db = await getDb();
  if (!db) return [];
  const topic = opts?.topic ?? "seasonal";
  const column = newsletterSubscribers[EMAIL_TOPICS[topic].column];
  const now = new Date();
  const sources = (opts?.sources ?? []).filter((s): s is NewsletterSource => Boolean(s) && s !== "all");
  const filters = [
    eq(newsletterSubscribers.isActive, 1),
    eq(column, 1),
    or(
      isNull(newsletterSubscribers.marketingPausedUntil),
      lt(newsletterSubscribers.marketingPausedUntil, now),
    ),
  ];
  if (sources.length > 0) {
    filters.push(inArray(newsletterSubscribers.source, sources));
  }
  return db.select().from(newsletterSubscribers)
    .where(and(...filters))
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function getRecordingSubscribers(): Promise<{ email: string; name: string | null }[]> {
  return getSubscribersForTopic("recordings");
}

/**
 * Active community subscribers who want a given topic and are not paused.
 * Events / Outbound / Harvest / recordings should call this (or audienceForTopic).
 */
export async function getSubscribersForTopic(
  topic: EmailTopicKey,
  opts?: { sources?: string[] },
): Promise<{ email: string; name: string | null }[]> {
  const rows = await getNewsletterAudience({ topic, sources: opts?.sources });
  return rows.map((row) => ({ email: row.email, name: row.name }));
}

/** Newsletter emails that must not receive this topic (muted, paused, or unsubscribed). */
export async function emailsBlockingTopic(topic: EmailTopicKey): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const column = newsletterSubscribers[EMAIL_TOPICS[topic].column];
  const now = new Date();
  const rows = await db.select({ email: newsletterSubscribers.email })
    .from(newsletterSubscribers)
    .where(or(
      eq(newsletterSubscribers.isActive, 0),
      eq(column, 0),
      and(
        isNotNull(newsletterSubscribers.marketingPausedUntil),
        gte(newsletterSubscribers.marketingPausedUntil, now),
      ),
    ));
  return new Set(rows.map((row) => row.email.toLowerCase()));
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
