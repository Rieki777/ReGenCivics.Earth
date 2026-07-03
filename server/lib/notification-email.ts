/**
 * Email delivery for the notification spine. Two paths:
 *   - Immediate: mention / forum_reply / guide_reply, sent from the
 *     fire-and-forget fan-out right after the in-app row is written.
 *   - Daily: everything the user set to 'daily' is batched by
 *     server/jobs/notificationDigestJob.ts into one "while you were away"
 *     email. Rows are stamped emailedAt either way so no event ever emails twice.
 *
 * Guard rails: per-user prefs (playerProfiles.notificationPrefs JSON),
 * emailDigestFrequency 'never' as a global off, banned users never emailed,
 * hard cap of 20 notification emails per user per day.
 */
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb, isUserBanned, getUserById, getPlayerProfileByUserId } from "../db";
import { notifications, users } from "../../drizzle/schema";
import type { NotificationInput } from "./forum-notify";

export type EmailCadence = "immediate" | "daily" | "off";

export interface NotificationPrefs {
  mentionsEmail: EmailCadence;
  repliesEmail: EmailCadence;
  gratitudeEmail: Exclude<EmailCadence, "immediate">;
  forumInApp: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  mentionsEmail: "immediate",
  repliesEmail: "immediate",
  gratitudeEmail: "daily",
  forumInApp: true,
};

/** Hard ceiling on notification emails per user per rolling day. */
export const DAILY_EMAIL_CAP = 20;

/** Merge stored prefs (possibly partial/junk JSON) over the defaults. Pure. */
export function resolvePrefs(raw: unknown): NotificationPrefs {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.mentionsEmail === "immediate" || r.mentionsEmail === "daily" || r.mentionsEmail === "off") {
      prefs.mentionsEmail = r.mentionsEmail;
    }
    if (r.repliesEmail === "immediate" || r.repliesEmail === "daily" || r.repliesEmail === "off") {
      prefs.repliesEmail = r.repliesEmail;
    }
    if (r.gratitudeEmail === "daily" || r.gratitudeEmail === "off") {
      prefs.gratitudeEmail = r.gratitudeEmail;
    }
    if (typeof r.forumInApp === "boolean") prefs.forumInApp = r.forumInApp;
  }
  return prefs;
}

/** Which cadence applies to a notification type under these prefs. Pure. */
export function cadenceFor(type: string, prefs: NotificationPrefs): EmailCadence {
  switch (type) {
    case "mention":
      return prefs.mentionsEmail;
    case "forum_reply":
    case "guide_reply":
      return prefs.repliesEmail;
    case "gratitude":
      return prefs.gratitudeEmail;
    default:
      // Everything else is in-app only (thread activity and milestones by
      // email would be noise).
      return "off";
  }
}

/** Inner HTML for a single-notification email; sendEmail adds the branded
 * header/footer wrapper. Pure. */
export function renderNotificationEmail(args: {
  title: string;
  excerpt?: string | null;
  ctaUrl: string;
  prefsUrl: string;
}): string {
  const quoted = args.excerpt
    ? `<div style="background: #f0f7f0; padding: 16px 20px; border-left: 4px solid #7dd87d; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="color: #333; margin: 0; line-height: 1.6;">${escapeHtml(args.excerpt)}</p>
      </div>`
    : "";
  return `
    <h2 style="color: #1a472a; margin-top: 0;">${escapeHtml(args.title)}</h2>
    ${quoted}
    <div style="text-align: center; margin: 28px 0;">
      <a href="${args.ctaUrl}" style="background: #1a472a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Open the conversation</a>
    </div>
    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      <a href="${args.prefsUrl}" style="color: #4a7c59;">Choose which emails you get</a>
    </p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when the user already hit the rolling-day email ceiling. */
async function isOverDailyCap(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNotNull(notifications.emailedAt),
        gte(notifications.emailedAt, oneDayAgo)
      )
    );
  return Number(rows[0]?.c ?? 0) >= DAILY_EMAIL_CAP;
}

/** Stamp emailedAt on the row for this dedupeKey so it never emails again
 * (neither a retried hook nor the daily digest will pick it up). */
async function stampEmailed(dedupeKey: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ emailedAt: new Date() })
    .where(eq(notifications.dedupeKey, dedupeKey));
}

/**
 * Send the immediate email copy of a just-inserted notification, if the
 * recipient's prefs ask for it. Called from insertNotification only on a
 * FRESH insert, so retries can't email twice; emailedAt is the second guard.
 */
export async function maybeSendImmediateEmail(input: NotificationInput): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;

  const [user, profile] = await Promise.all([
    getUserById(input.userId),
    getPlayerProfileByUserId(input.userId),
  ]);
  if (!user?.email) return;
  if (profile?.emailDigestFrequency === "never") return;

  const prefs = resolvePrefs(profile?.notificationPrefs);
  if (cadenceFor(input.type, prefs) !== "immediate") return;

  if (await isUserBanned(input.userId)) return;
  if (await isOverDailyCap(input.userId)) {
    console.warn(`[notification-email] daily cap hit for user ${input.userId}, dropping "${input.title}"`);
    return;
  }

  const { sendEmail, toAbsoluteUrl } = await import("../_core/email");
  const { createEmailLog } = await import("../emailTracking");

  const ctaUrl = toAbsoluteUrl(input.link, { campaign: "forum-notification" });
  const prefsUrl = toAbsoluteUrl("/settings/notifications", { campaign: "forum-notification" });
  const html = renderNotificationEmail({
    title: input.title,
    excerpt: input.body,
    ctaUrl,
    prefsUrl,
  });

  let emailLogId: number | undefined;
  try {
    emailLogId = await createEmailLog({
      recipientEmail: user.email,
      recipientName: user.name ?? undefined,
      subject: input.title,
      template: "forum-notification",
    });
  } catch (err) {
    console.warn("[notification-email] email log create failed (sending anyway)", err);
  }

  const { id } = await sendEmail({
    to: user.email,
    subject: input.title,
    html,
    template: "forum-notification",
    recipientName: user.name ?? undefined,
    emailLogId,
  });

  // Stamp even when Resend declined (rate limiter, EMAIL_HOLD): retrying the
  // same event later would surprise more than a missed email does.
  void id;
  await stampEmailed(input.dedupeKey);
}

// ─── Daily digest support (used by server/jobs/notificationDigestJob.ts) ─────

export interface DigestItem {
  id: number;
  type: string;
  title: string;
  link: string | null;
  createdAt: Date;
}

/** Human summary line: "2 mentions, 5 replies, 1 gratitude". Pure. */
export function summarizeDigest(items: DigestItem[]): string {
  const labels: [string, string, (t: string) => boolean][] = [
    ["mention", "mentions", (t) => t === "mention"],
    ["reply", "replies", (t) => t === "forum_reply" || t === "guide_reply"],
    ["gratitude", "gratitude", (t) => t === "gratitude"],
  ];
  const parts: string[] = [];
  for (const [singular, plural, match] of labels) {
    const n = items.filter((i) => match(i.type)).length;
    if (n > 0) parts.push(`${n} ${n === 1 ? singular : plural}`);
  }
  return parts.join(", ");
}

/** Inner HTML for the daily digest email. Pure. */
export function renderDigestEmail(args: {
  items: DigestItem[];
  toUrl: (path: string) => string;
}): string {
  const list = args.items
    .slice(0, 10)
    .map((i) => {
      const url = args.toUrl(i.link || "/notifications");
      return `<li style="margin: 0 0 10px;"><a href="${url}" style="color: #1a472a; text-decoration: none; font-weight: bold;">${escapeHtml(i.title)}</a></li>`;
    })
    .join("");
  const more = args.items.length > 10
    ? `<p style="color: #666; font-size: 13px;">And ${args.items.length - 10} more in <a href="${args.toUrl("/notifications")}" style="color: #4a7c59;">your notifications</a>.</p>`
    : "";
  return `
    <h2 style="color: #1a472a; margin-top: 0;">While you were away: ${escapeHtml(summarizeDigest(args.items))}</h2>
    <ul style="color: #333; line-height: 1.7; padding-left: 20px; margin: 20px 0;">${list}</ul>
    ${more}
    <div style="text-align: center; margin: 28px 0;">
      <a href="${args.toUrl("/notifications")}" style="background: #1a472a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">See everything</a>
    </div>
    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      <a href="${args.toUrl("/settings/notifications")}" style="color: #4a7c59;">Choose which emails you get</a>
    </p>
  `;
}
