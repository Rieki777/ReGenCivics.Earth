import { APP_BASE_URL } from "../_core/email";
import {
  ALWAYS_INCLUDED_FOOTER_TEXT,
  ALWAYS_INCLUDED_STOP_PATH,
  offsetLead,
} from "@shared/eventAutoReminders";
import { SESSION_TIME_ZONE } from "@shared/sessionClock";
import { JOIN_URL, isDefaultRoomUrl } from "@shared/sessionLinks";
import { localTimeCtaHtml } from "@shared/localTimeCta";

type ReminderEmailInput = {
  title: string;
  startTime: Date;
  timezone?: string | null;
  description?: string | null;
  bodyText?: string | null;
  joinUrl: string;
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
 * The join button's target: /join for our studio, a genuinely different room
 * or a Zoom link as stored.
 *
 * This compared against RIVERSIDE_ROOM_URL by exact string until 2026-09-21.
 * Every events row stores the old `?t=` token link, so while the constant held
 * that same link the rows matched and fell through to /join. When the constant
 * moved to the wvhy-zyit room on 2026-09-14, no row matched any more, and every
 * auto-reminder's join button sent people to the stored old link instead of
 * /join. isDefaultRoomUrl matches any link into the studio, whatever form it
 * was stored in.
 */
export function reminderJoinUrl(opts: {
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
}): string {
  const stored = opts.riversideRoomUrl?.trim();
  if (stored && !isDefaultRoomUrl(stored)) return stored;
  const zoom = opts.zoomUrl?.trim();
  if (zoom) return zoom;
  return JOIN_URL;
}

export function reminderJoinLabel(joinUrl: string): string {
  if (/zoom\.(us|com)/i.test(joinUrl)) return "Join on Zoom";
  return "Join the call";
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
  const joinUrl = input.joinUrl || JOIN_URL;
  const joinLabel = reminderJoinLabel(joinUrl);
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

/** Per-event signup cancel URL. List / community reminders use managePreferencesUrl instead. */
export function reminderUnsubscribeUrl(email: string, eventId: number, mode: "event_signup" | "list"): string {
  if (mode === "event_signup") {
    return `${APP_BASE_URL}/schedule?unsubscribe=${eventId}&email=${encodeURIComponent(email)}`;
  }
  return `${APP_BASE_URL}/email-preferences`;
}
