import { APP_BASE_URL } from "../_core/email";
import { offsetLead } from "@shared/eventAutoReminders";
import { SESSION_TIME_ZONE } from "@shared/sessionClock";
import { JOIN_URL, RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";

type ReminderEmailInput = {
  title: string;
  startTime: Date;
  timezone?: string | null;
  description?: string | null;
  bodyText?: string | null;
  joinUrl: string;
  offsetMinutes: number;
  unsubscribeUrl: string;
};

export function reminderJoinUrl(opts: {
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
}): string {
  const stored = opts.riversideRoomUrl?.trim();
  if (stored && stored !== RIVERSIDE_ROOM_URL) return stored;
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
            <p style="color:#444;font-size:15px;margin:0 0 20px 0;">${escapeHtml(dateStr)} at ${escapeHtml(timeStr)}</p>
            ${bodyHtml}
            <a href="${joinUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">${escapeHtml(joinLabel)}</a>
            <a href="${APP_BASE_URL}/schedule" style="display:inline-block;background:#1a472a;color:#7dd87d;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #7dd87d;">View Schedule</a>
          </div>
          <div style="background:#f0f7f0;padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;border-top:none;">
            <p style="color:#888;font-size:12px;margin:0;">You are receiving this as a reminder for this event.<br/>
            <a href="${APP_BASE_URL}/schedule" style="color:#7dd87d;">View all events</a> · <a href="${input.unsubscribeUrl}" style="color:#999;">Unsubscribe</a></p>
          </div>
        </div>`;
}

export function reminderUnsubscribeUrl(email: string, eventId: number, mode: "event_signup" | "list"): string {
  if (mode === "event_signup") {
    return `${APP_BASE_URL}/schedule?unsubscribe=${eventId}&email=${encodeURIComponent(email)}`;
  }
  return `${APP_BASE_URL}/unsubscribe`;
}
