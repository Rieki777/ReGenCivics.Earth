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
import { textForEmail } from "../../shared/htmlText";

export type EmailCadence = "immediate" | "daily" | "off";

export interface NotificationPrefs {
  mentionsEmail: EmailCadence;
  repliesEmail: EmailCadence;
  gratitudeEmail: Exclude<EmailCadence, "immediate">;
  forumInApp: boolean;
  /** Campaign notices (offers, answers, deliveries, thanks, cancellations). */
  campaignsEmail: EmailCadence;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  mentionsEmail: "immediate",
  repliesEmail: "immediate",
  gratitudeEmail: "daily",
  forumInApp: true,
  campaignsEmail: "immediate",
};

/**
 * Every spine type a campaign event writes. They share one email pref
 * (campaignsEmail), one push pref (campaignsPush) and the project-page CTA.
 */
export const CAMPAIGN_NOTIFICATION_TYPES = [
  "new_contribution",
  "contribution_accepted",
  "contribution_rejected",
  "contribution_delivered",
  "contribution_thanked",
  "contribution_released",
  "role_filled",
  "campaign_update",
  "campaign_approved",
  "campaign_declined",
  "campaign_cancelled",
  "campaign_completed",
  "campaign_milestone",
  "claim_expired",
] as const;

export function isCampaignNotificationType(type: string): boolean {
  return (CAMPAIGN_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/**
 * The stored prefs as a plain object. playerProfiles.notificationPrefs is a
 * json column, and players.updateNotificationPrefs used to JSON.stringify
 * before writing, so some rows hold a JSON string of the object (double
 * encoded). Parse up to twice; anything else reads as {}.
 */
export function parseStoredPrefs(raw: unknown): Record<string, unknown> {
  let v: unknown = raw;
  for (let i = 0; i < 2 && typeof v === "string"; i++) {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};
}

/**
 * The one way to write notificationPrefs. Keeps every key already stored
 * (communityUpdates, questAnnouncements, governanceUpdates, the *Push keys),
 * fills the modelled email prefs, then applies the patch. Returns an OBJECT:
 * write it as is, never JSON.stringify it (drizzle's json column encodes it,
 * and server/jobs/assemblyNotify.ts matches the serialized
 * '"governanceUpdates":true' with LIKE). Pure.
 */
export function mergeNotificationPrefs(raw: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  const stored = parseStoredPrefs(raw);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
  return { ...stored, ...resolvePrefs(stored), ...clean };
}

/** Hard ceiling on notification emails per user per rolling day. */
export const DAILY_EMAIL_CAP = 20;

/** Merge stored prefs (possibly partial/junk JSON) over the defaults. Pure. */
export function resolvePrefs(raw: unknown): NotificationPrefs {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS };
  const parsed = typeof raw === "string" ? parseStoredPrefs(raw) : raw;
  if (parsed && typeof parsed === "object") {
    const r = parsed as Record<string, unknown>;
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
    if (r.campaignsEmail === "immediate" || r.campaignsEmail === "daily" || r.campaignsEmail === "off") {
      prefs.campaignsEmail = r.campaignsEmail;
    }
  }
  return prefs;
}

/** Campaign notices that go to many people at once; their email waits for the digest. */
export const FAN_OUT_CAMPAIGN_TYPES: ReadonlyArray<string> = [
  "campaign_update", "campaign_cancelled", "campaign_completed", "role_filled",
];

/**
 * An immediate email that could not go out (the hourly cap held it, or
 * EMAIL_HOLD) leaves emailedAt NULL. Once it is this old, the daily digest
 * carries it, so nothing is dropped. Younger rows are left alone so the
 * digest never races an immediate send still in flight.
 */
export const MISSED_IMMEDIATE_AFTER_MS = 60 * 60 * 1000;

/** Whether the daily digest should carry this unemailed row. Pure. */
export function digestWants(type: string, createdAt: Date, prefs: NotificationPrefs, now = Date.now()): boolean {
  const cadence = cadenceFor(type, prefs);
  if (cadence === "daily") return true;
  return cadence === "immediate" && now - createdAt.getTime() >= MISSED_IMMEDIATE_AFTER_MS;
}

/** Which cadence applies to a notification type under these prefs. Pure. */
export function cadenceFor(type: string, prefs: NotificationPrefs): EmailCadence {
  if (isCampaignNotificationType(type)) {
    // These fan out to many people at once (every follower, every
    // contributor, every holder of a role). Immediate mail for them would
    // burn the shared hourly send cap (server/_core/email.ts) that the
    // direct emails to contributors without an account depend on, so they
    // wait for the daily digest. The bell and push still carry them at once.
    if (FAN_OUT_CAMPAIGN_TYPES.includes(type) && prefs.campaignsEmail === "immediate") return "daily";
    return prefs.campaignsEmail;
  }
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
  /** Button label. Campaign notices pass "Open the project page". */
  ctaLabel?: string;
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
      <a href="${args.ctaUrl}" style="background: #1a472a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${escapeHtml(args.ctaLabel ?? "Open the conversation")}</a>
    </div>
    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      <a href="${args.prefsUrl}" style="color: #4a7c59;">Choose which emails you get</a>
    </p>
  `;
}

/** Decode entities once, then escape, so sanitized text never shows as "&amp;amp;". */
function escapeHtml(s: string): string {
  return textForEmail(s);
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

  const isCampaign = isCampaignNotificationType(input.type);
  const template = isCampaign ? "campaign-notification" : "forum-notification";
  const ctaUrl = toAbsoluteUrl(input.link, { campaign: template });
  const prefsUrl = toAbsoluteUrl("/settings/notifications", { campaign: template });
  const html = renderNotificationEmail({
    title: input.title,
    excerpt: input.body,
    ctaUrl,
    prefsUrl,
    ctaLabel: isCampaign ? "Open the project page" : undefined,
  });

  let emailLogId: number | undefined;
  try {
    emailLogId = await createEmailLog({
      recipientEmail: user.email,
      recipientName: user.name ?? undefined,
      subject: input.title,
      template,
    });
  } catch (err) {
    console.warn("[notification-email] email log create failed (sending anyway)", err);
  }

  const { id } = await sendEmail({
    to: user.email,
    subject: input.title,
    html,
    template,
    recipientName: user.name ?? undefined,
    emailLogId,
  });

  // Stamp only when the email went out. A send the hourly cap or EMAIL_HOLD
  // refused ({ id: null }) stays unstamped, and the daily digest carries it
  // (digestWants), so a busy hour never silently drops a notice.
  if (id) await stampEmailed(input.dedupeKey);
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
    ["piece of campaign news", "pieces of campaign news", (t) => isCampaignNotificationType(t)],
  ];
  const parts: string[] = [];
  for (const [singular, plural, match] of labels) {
    const n = items.filter((i) => match(i.type)).length;
    if (n > 0) parts.push(`${n} ${n === 1 ? singular : plural}`);
  }
  // Never a blank heading, whatever type slips in.
  if (parts.length === 0 && items.length > 0) {
    parts.push(`${items.length} ${items.length === 1 ? "new notice" : "new notices"}`);
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
