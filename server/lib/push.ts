/**
 * Web push delivery for the notification spine (Phase 1B).
 *
 * Third delivery channel next to in-app and email. Fully gated on VAPID env
 * keys: without VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY every function no-ops,
 * so the feature turns on by setting Railway vars, no code change.
 *
 * Hygiene rules:
 *   - 410 Gone / 404 from the push service deletes the subscription row.
 *   - Other failures increment failureCount; rows past the threshold prune.
 *   - pushedAt on the notification row dedupes (a retried hook never
 *     re-pushes the same event).
 *   - Payloads carry only what the OS notification needs: title, body
 *     excerpt, deep-link URL. No email, tokens, or location ever.
 */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { notifications, pushSubscriptions } from "../../drizzle/schema";
import type { NotificationInput } from "./forum-notify";

const FAILURE_PRUNE_THRESHOLD = 5;

/** Types that go to push when the user has subscribed. Thread activity and
 * milestones stay in-app only, same reasoning as email. */
const PUSHABLE_TYPES = new Set(["mention", "forum_reply", "guide_reply", "elder_reply", "gratitude"]);

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

async function getWebPush() {
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@regencivics.earth",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export interface PushPayload {
  title: string;
  body?: string | null;
  url: string;
  /** Collapse key: notifications with the same tag replace each other. */
  tag?: string;
}

/** Send a push to every live subscription a user has. Prunes dead endpoints. */
export async function sendPush(userId: number, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return 0;
  const db = await getDb();
  if (!db) return 0;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (subs.length === 0) return 0;

  const webpush = await getWebPush();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body || "",
    url: payload.url,
    tag: payload.tag || "regen-civics",
  });

  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 24 * 60 * 60, urgency: "normal" }
      );
      delivered++;
      if (sub.failureCount > 0) {
        await db.update(pushSubscriptions)
          .set({ failureCount: 0, lastSeenAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    } catch (err: any) {
      const status = err?.statusCode ?? 0;
      if (status === 404 || status === 410) {
        // Endpoint is gone (permission revoked, browser reinstalled). Delete.
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      } else {
        const failures = sub.failureCount + 1;
        if (failures >= FAILURE_PRUNE_THRESHOLD) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          await db.update(pushSubscriptions)
            .set({ failureCount: failures })
            .where(eq(pushSubscriptions.id, sub.id));
        }
        console.warn(`[push] send failed (status ${status}) for user ${userId}, failures=${failures}`);
      }
    }
  }
  return delivered;
}

/**
 * Push the OS-level copy of a just-inserted notification. Called from
 * insertNotification only on a FRESH insert; pushedAt is the second guard.
 * Respects per-type push prefs (mentionsPush / repliesPush / gratitudePush
 * on playerProfiles.notificationPrefs, default true — the subscription
 * itself is the master opt-in).
 */
export async function maybeSendPush(input: NotificationInput): Promise<void> {
  if (!isPushConfigured()) return;
  if (!PUSHABLE_TYPES.has(input.type)) return;
  const db = await getDb();
  if (!db) return;

  // Per-type pref check. The stored prefs JSON may carry push keys the
  // email module doesn't model; read them loosely with true as default.
  const { getPlayerProfileByUserId } = await import("../db");
  const profile = await getPlayerProfileByUserId(input.userId);
  const raw = (profile?.notificationPrefs ?? {}) as Record<string, unknown>;
  const prefKey =
    input.type === "mention" ? "mentionsPush"
    : input.type === "gratitude" ? "gratitudePush"
    : "repliesPush";
  if (raw[prefKey] === false) return;

  const delivered = await sendPush(input.userId, {
    title: input.title,
    body: input.body,
    url: input.link,
    tag: input.postId ? `post-${input.postId}` : undefined,
  });

  if (delivered > 0) {
    await db.update(notifications)
      .set({ pushedAt: new Date() })
      .where(and(eq(notifications.dedupeKey, input.dedupeKey), sql`${notifications.pushedAt} IS NULL`));
  }
}

/** Upsert a browser subscription (unique on endpoint). */
export async function saveSubscription(args: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pushSubscriptions)
    .values({
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent ?? null,
      lastSeenAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        userId: args.userId,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent ?? null,
        failureCount: 0,
        lastSeenAt: new Date(),
      },
    });
}

export async function removeSubscription(userId: number, endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function countSubscriptions(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return Number(rows[0]?.c ?? 0);
}
