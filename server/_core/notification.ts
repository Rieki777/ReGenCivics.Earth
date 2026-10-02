import { TRPCError } from "@trpc/server";
import { textForEmail } from "../../shared/htmlText";
import { providerAccepted } from "../lib/emailAttempt";
import { sendEmail } from "./email";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  }

  return { title, content };
};

export function ownerAlertHtml(title: string, content: string): string {
  return `<div style="font-family:sans-serif;max-width:600px"><h2>${textForEmail(title)}</h2><p style="white-space:pre-wrap">${textForEmail(content)}</p></div>`;
}

/**
 * Owner alerts go through sendEmail so EMAIL_HOLD, the hourly cap, and the
 * attempt log apply. Returns true only when Resend accepts the letter.
 */
export async function deliverOwnerAlert(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  if (!ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL not configured, skipping owner notification");
    return false;
  }
  try {
    const result = await sendEmail({
      to: [ownerEmail],
      subject: title,
      html: ownerAlertHtml(title, content),
      template: "owner_notification",
      skipBrandedWrap: true,
    });
    return providerAccepted(result);
  } catch (error) {
    console.warn("[Notification] Error sending notification email:", error);
    return false;
  }
}

/**
 * Notifies the site owner. Tests skip the send and report success so suites
 * do not write email_logs. Production uses deliverOwnerAlert.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    console.log("[Notification] Skipped (test environment):", payload.title);
    return true;
  }
  return deliverOwnerAlert(payload);
}
