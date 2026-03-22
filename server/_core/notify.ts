/**
 * notify.ts — Channel announcements for ReGen Civics
 *
 * Sends brief announcements to Telegram and WhatsApp when:
 *  - A new event is created (admin)
 *  - A recording drops (Riverside webhook)
 *
 * Setup:
 *  - Telegram: Create a bot via @BotFather, add it to your group/channel.
 *    Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Railway env vars.
 *  - WhatsApp: Uses the Meta Cloud API (WhatsApp Business).
 *    Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_TO_NUMBER in Railway env vars.
 *    WHATSAPP_TO_NUMBER is the phone number of the group/individual to send to (164xxxxxxxx format).
 *
 * If env vars are missing, the function logs a warning and skips that channel silently.
 */

const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://regencivics.earth";

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("[notify/telegram] Skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[notify/telegram] Send failed:", res.status, body);
    } else {
      console.log("[notify/telegram] Sent OK");
    }
  } catch (err) {
    console.error("[notify/telegram] Error:", err);
  }
}

// ── WhatsApp (Meta Cloud API) ─────────────────────────────────────────────────

async function sendWhatsApp(message: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const toNumber = process.env.WHATSAPP_TO_NUMBER;
  if (!phoneNumberId || !accessToken || !toNumber) {
    console.log("[notify/whatsapp] Skipped — WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, or WHATSAPP_TO_NUMBER not set");
    return;
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toNumber,
          type: "text",
          text: { body: message },
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.warn("[notify/whatsapp] Send failed:", res.status, body);
    } else {
      console.log("[notify/whatsapp] Sent OK");
    }
  } catch (err) {
    console.error("[notify/whatsapp] Error:", err);
  }
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Announce a new or updated event to Telegram and WhatsApp.
 * Call from the admin events.create mutation.
 */
export async function notifyNewEvent(event: {
  title: string;
  startTime: Date;
  timezone?: string | null;
  riversideRoomUrl?: string | null;
  zoomUrl?: string | null;
  season?: string | null;
}): Promise<void> {
  const dateStr = event.startTime.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeStr = event.startTime.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
  const tz = event.timezone ?? "UTC";
  const joinUrl = event.riversideRoomUrl ?? event.zoomUrl ?? `${APP_BASE_URL}/schedule`;
  const seasonTag = event.season ? ` (${event.season})` : "";

  const message =
    `*New event added${seasonTag}*\n\n` +
    `*${event.title}*\n` +
    `${dateStr} at ${timeStr} ${tz}\n\n` +
    `Join: ${joinUrl}\n` +
    `Full schedule: ${APP_BASE_URL}/schedule`;

  await Promise.all([sendTelegram(message), sendWhatsApp(message)]);
}

/**
 * Announce a recording drop to Telegram and WhatsApp.
 * Call from the Riverside webhook handler after email is sent.
 */
export async function notifyRecordingReady(recording: {
  title: string;
  youtubeUrl?: string | null;
  riversideUrl?: string | null;
  forumPostId?: number | null;
}): Promise<void> {
  const watchUrl = recording.youtubeUrl ?? recording.riversideUrl ?? `${APP_BASE_URL}/schedule`;
  const forumUrl = recording.forumPostId
    ? `${APP_BASE_URL}/community/post/${recording.forumPostId}`
    : null;

  let message =
    `*Recording ready*\n\n` +
    `*${recording.title}*\n\n` +
    `Watch: ${watchUrl}`;

  if (forumUrl) {
    message += `\nDiscussion: ${forumUrl}`;
  }

  await Promise.all([sendTelegram(message), sendWhatsApp(message)]);
}
