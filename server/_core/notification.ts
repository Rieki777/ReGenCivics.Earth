import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

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

/**
 * Notifies the site owner via Resend email.
 * Returns true if sent, false if email not configured (non-fatal).
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  // Skip during tests
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    console.log("[Notification] Skipped (test environment):", payload.title);
    return true;
  }

  const { title, content } = validatePayload(payload);

  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!resendApiKey || !ownerEmail) {
    console.warn("[Notification] RESEND_API_KEY or OWNER_EMAIL not configured — skipping owner notification");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `ReGen Civics <notifications@${process.env.EMAIL_DOMAIN || "regencivics.earth"}>`,
        to: [ownerEmail],
        subject: title,
        text: content,
        html: `<div style="font-family:sans-serif;max-width:600px"><h2>${title}</h2><p style="white-space:pre-wrap">${content}</p></div>`,
      }),
    });

    if (!res.ok) {
      console.warn(`[Notification] Resend failed: ${res.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error sending notification email:", error);
    return false;
  }
}
