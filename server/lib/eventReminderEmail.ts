import { APP_BASE_URL } from "../_core/email";
import {
  ALWAYS_INCLUDED_FOOTER_TEXT,
  ALWAYS_INCLUDED_STOP_PATH,
  defaultAudienceMode,
  offsetLead,
  type EventKindForReminders,
} from "@shared/eventAutoReminders";
import type { EmailTopicKey } from "@shared/emailPrefs";
import { SESSION_TIME_ZONE } from "@shared/sessionClock";
import { JOIN_URL } from "@shared/sessionLinks";
import { localTimeCtaHtml } from "@shared/localTimeCta";

type ReminderEmailInput = {
  title: string;
  startTime: Date;
  timezone?: string | null;
  description?: string | null;
  bodyText?: string | null;
  /**
   * When set, the join CTA is /join?e=<id> so GET /join can route to this
   * event's stored room. Prefer this over a raw platform URL.
   */
  eventId?: number | null;
  /** @deprecated Ignored — href always comes from reminderJoinUrl({ eventId }). Kept so older call sites type-check. */
  joinUrl?: string;
  offsetMinutes: number;
  /** Signed community prefs URL. Footer CTA is Manage email preferences. */
  preferencesUrl?: string;
  /**
   * The recipient is on ALWAYS_INCLUDE_REMINDER_RECIPIENTS. They never signed
   * up, so the footer says why they are getting this and how to stop, in place
   * of a preferences link that would do nothing for them.
   */
  alwaysIncluded?: boolean;
};

function footerHtml(input: ReminderEmailInput): string {
  const schedule = `<a href="${APP_BASE_URL}/schedule" style="color:#7dd87d;">View all events</a>`;
  if (input.alwaysIncluded) {
    const stop = `${APP_BASE_URL}${ALWAYS_INCLUDED_STOP_PATH}`;
    return `${escapeHtml(ALWAYS_INCLUDED_FOOTER_TEXT)} <a href="${stop}" style="color:#7dd87d;">${escapeHtml(stop.replace(/^https?:\/\//, ""))}</a>.<br/>
            ${schedule}`;
  }
  const prefs = input.preferencesUrl
    ? ` · <a href="${escapeHtml(input.preferencesUrl)}" style="color:#999;">Manage email preferences</a>`
    : "";
  return `You are receiving this as a reminder for this event.<br/>
            ${schedule}${prefs}`;
}

/**
 * Durable join URL for reminder emails: always the site /join hook.
 * Never a raw Riverside/Zoom/Holos URL — GET /join redirects to the room
 * (see server/routes/calendarFeed.ts + server/lib/joinRedirect.ts).
 *
 * With a positive eventId → `/join?e=<id>` so /join can route to that event's
 * stored URL. Without an id → plain `/join` (shared studio).
 * riversideRoomUrl / zoomUrl are accepted for call-site compatibility only;
 * they never appear in the returned href.
 */
export function reminderJoinUrl(opts?: {
  eventId?: number | null;
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
}): string {
  const id = opts?.eventId;
  if (typeof id === "number" && Number.isInteger(id) && id > 0) {
    return `${JOIN_URL}?e=${id}`;
  }
  return JOIN_URL;
}

/** User-facing join CTA — never names Riverside, Zoom, or any platform. */
export function reminderJoinLabel(_joinUrl?: string): string {
  return "Join the call";
}

/**
 * Prefs-page mute highlight for signup / scheduled-custom reminder blasts.
 * Matches the auto-reminder sweep's communityTopicForAudience mapping.
 */
export function reminderMuteTopic(event: EventKindForReminders): EmailTopicKey {
  const mode = defaultAudienceMode(event);
  if (mode === "season2_approved") return "season2";
  if (mode === "open_access") return "open_access";
  return "events";
}

function formatSessionWhen(startTime: Date): { dateStr: string; timeStr: string } {
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: SESSION_TIME_ZONE,
  });
  const timeStr = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SESSION_TIME_ZONE,
    timeZoneName: "short",
  });
  return { dateStr, timeStr };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAutoReminderHtml(input: ReminderEmailInput): string {
  const { dateStr, timeStr } = formatSessionWhen(input.startTime);
  const body = (input.bodyText ?? input.description ?? "").trim();
  const title = escapeHtml(input.title);
  const bodyHtml = body ? `<p style="color:#444;line-height:1.7;margin:0 0 24px 0;">${escapeHtml(body)}</p>` : "";
  // Reminder emails always use the durable /join hook (never a raw room URL).
  const joinUrl = reminderJoinUrl({ eventId: input.eventId });
  const joinLabel = reminderJoinLabel();
  const lead = escapeHtml(offsetLead(input.offsetMinutes));

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background-color: #1a472a; background:linear-gradient(135deg,#1a472a 0%,#2d5a3d 100%);padding:30px 20px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="color:#7dd87d;margin:0;font-size:22px;">ReGen Civics</h1>
            <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:13px;">Event reminder</p>
          </div>
          <div style="padding:30px 24px;background:#fff;border:1px solid #e0e0e0;border-top:none;">
            <p style="color:#888;font-size:13px;margin:0 0 6px 0;">${lead}</p>
            <h2 style="color:#1a472a;margin:0 0 6px 0;font-size:20px;">${title}</h2>
            <p style="color:#444;font-size:15px;margin:0 0 20px 0;">${escapeHtml(dateStr)} at ${escapeHtml(timeStr)}${localTimeCtaHtml(input.startTime, { title: input.title })}</p>
            ${bodyHtml}
            <a href="${joinUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">${escapeHtml(joinLabel)}</a>
            <a href="${APP_BASE_URL}/schedule" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;">View Schedule</a>
          </div>
          <div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
            <p style="color:#888;font-size:12px;margin:0;">${footerHtml(input)}</p>
          </div>
        </div>`;
}

/**
 * Signup-blast / scheduled-custom reminder HTML: same builder as the auto-
 * reminder sweep (prefs footer, Pacific clock, local-time CTA, join label).
 */
export function buildSignupReminderHtml(input: {
  title: string;
  startTime: Date;
  timezone?: string | null;
  description?: string | null;
  bodyText?: string | null;
  eventId?: number | null;
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
  offsetMinutes: number;
  preferencesUrl: string;
}): string {
  return buildAutoReminderHtml({
    title: input.title,
    startTime: input.startTime,
    timezone: input.timezone,
    description: input.description,
    bodyText: input.bodyText,
    eventId: input.eventId,
    offsetMinutes: input.offsetMinutes,
    preferencesUrl: input.preferencesUrl,
  });
}

/**
 * Per-event signup cancel URL. List / community reminders use managePreferencesUrl instead.
 *
 * Takes the token rather than minting it, so this stays synchronous and every
 * caller decides once where the signing happens. Passing no token falls back to
 * the address, which keeps links in already-sent mail working.
 */
export function reminderUnsubscribeUrl(
  email: string,
  eventId: number,
  mode: "event_signup" | "list",
  token?: string,
): string {
  if (mode === "event_signup") {
    const q = token
      ? `token=${encodeURIComponent(token)}`
      : `email=${encodeURIComponent(email)}`;
    return `${APP_BASE_URL}/schedule?unsubscribe=${eventId}&${q}`;
  }
  return `${APP_BASE_URL}/email-preferences`;
}
