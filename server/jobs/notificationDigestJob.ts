/**
 * Daily notification digest: batches unread, un-emailed notifications into
 * one "while you were away" email per user, honoring per-type prefs
 * (cadence 'daily') and the global emailDigestFrequency 'never' switch.
 *
 * Deterministic aggregation, zero LLM (STEERING §11). Registered as a
 * 24h interval in server/_core/index.ts next to the weekly digest job.
 * Idempotent: included rows get emailedAt stamped, so a crashed or
 * double-fired run never re-emails an event.
 */
import { and, gte, inArray, isNull, eq, asc } from "drizzle-orm";
import { getDb, isUserBanned, getPlayerProfileByUserId } from "../db";
import { notifications, users } from "../../drizzle/schema";
import {
  resolvePrefs,
  cadenceFor,
  renderDigestEmail,
  type DigestItem,
} from "../lib/notification-email";

const DIGESTABLE_TYPES = ["mention", "forum_reply", "guide_reply", "gratitude"] as const;
const LOOKBACK_DAYS = 3;

export async function runNotificationDigestJob(): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;
  const db = await getDb();
  if (!db) return;

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      link: notifications.link,
      createdAt: notifications.createdAt,
      email: users.email,
      name: users.name,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .where(
      and(
        inArray(notifications.type, [...DIGESTABLE_TYPES]),
        isNull(notifications.emailedAt),
        eq(notifications.isRead, 0),
        gte(notifications.createdAt, since)
      )
    )
    .orderBy(asc(notifications.createdAt));

  const byUser = new Map<number, typeof rows>();
  for (const row of rows) {
    if (!row.email) continue;
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }
  if (byUser.size === 0) {
    console.log("[NotificationDigestJob] nothing to send");
    return;
  }

  const { sendEmail, toAbsoluteUrl } = await import("../_core/email");
  const { createEmailLog } = await import("../emailTracking");

  let sent = 0;
  for (const [userId, userRows] of byUser) {
    try {
      const profile = await getPlayerProfileByUserId(userId);
      if (profile?.emailDigestFrequency === "never") continue;
      const prefs = resolvePrefs(profile?.notificationPrefs);
      const wanted = userRows.filter((r) => cadenceFor(r.type, prefs) === "daily");
      if (wanted.length === 0) continue;
      if (await isUserBanned(userId)) continue;

      const items: DigestItem[] = wanted.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        link: r.link,
        createdAt: r.createdAt,
      }));
      const toUrl = (path: string) =>
        toAbsoluteUrl(path, { campaign: "notification-digest", medium: "digest" });
      const html = renderDigestEmail({ items, toUrl });
      const subject =
        items.length === 1
          ? items[0].title
          : `${items.length} things happened while you were away`;

      let emailLogId: number | undefined;
      try {
        emailLogId = await createEmailLog({
          recipientEmail: userRows[0].email!,
          recipientName: userRows[0].name ?? undefined,
          subject,
          template: "notification-digest",
        });
      } catch { /* log row is best-effort */ }

      await sendEmail({
        to: userRows[0].email!,
        subject,
        html,
        template: "notification-digest",
        recipientName: userRows[0].name ?? undefined,
        emailLogId,
      });

      await db
        .update(notifications)
        .set({ emailedAt: new Date() })
        .where(inArray(notifications.id, items.map((i) => i.id)));
      sent++;

      // Gentle pacing under the Resend rate limiter.
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[NotificationDigestJob] failed for user ${userId}`, err);
    }
  }
  console.log(`[NotificationDigestJob] sent ${sent} digests (${byUser.size} candidates)`);
}
