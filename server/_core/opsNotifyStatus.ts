/**
 * Honest ops-notify channel status (booleans only — never tokens, ids, or emails).
 *
 * Mirrors the env gates the morning pulse already uses:
 *   - Email: notifyOwner in notification.ts (OWNER_EMAIL)
 *   - Telegram / WhatsApp Cloud API: sendTelegram / sendWhatsApp in notify.ts
 *
 * TELEGRAM_BRAIN_* is a different bot and is intentionally ignored.
 */
export type OpsNotifyChannelStatus = {
  emailConfigured: boolean;
  telegramConfigured: boolean;
  whatsappConfigured: boolean;
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function getOpsNotifyChannelStatus(
  env: NodeJS.ProcessEnv = process.env,
): OpsNotifyChannelStatus {
  return {
    emailConfigured: present(env.OWNER_EMAIL),
    telegramConfigured:
      present(env.TELEGRAM_BOT_TOKEN) && present(env.TELEGRAM_CHAT_ID),
    whatsappConfigured:
      present(env.WHATSAPP_PHONE_NUMBER_ID) &&
      present(env.WHATSAPP_ACCESS_TOKEN) &&
      present(env.WHATSAPP_TO_NUMBER),
  };
}
