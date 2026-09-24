import { describe, expect, it } from "vitest";
import { getOpsNotifyChannelStatus } from "./opsNotifyStatus";

const EMPTY: NodeJS.ProcessEnv = {};

describe("getOpsNotifyChannelStatus", () => {
  it("returns only the three boolean flags when nothing is set", () => {
    const status = getOpsNotifyChannelStatus(EMPTY);
    expect(status).toEqual({
      emailConfigured: false,
      telegramConfigured: false,
      whatsappConfigured: false,
    });
    expect(Object.keys(status).sort()).toEqual([
      "emailConfigured",
      "telegramConfigured",
      "whatsappConfigured",
    ]);
    expect(Object.values(status).every((v) => typeof v === "boolean")).toBe(true);
  });

  it("treats OWNER_EMAIL as email configured (whitespace-only is not)", () => {
    expect(getOpsNotifyChannelStatus({ OWNER_EMAIL: "rieki@example.com" }).emailConfigured).toBe(true);
    expect(getOpsNotifyChannelStatus({ OWNER_EMAIL: "   " }).emailConfigured).toBe(false);
  });

  it("requires both Telegram vars; ignores TELEGRAM_BRAIN_*", () => {
    expect(
      getOpsNotifyChannelStatus({ TELEGRAM_BOT_TOKEN: "tok" }).telegramConfigured,
    ).toBe(false);
    expect(
      getOpsNotifyChannelStatus({ TELEGRAM_CHAT_ID: "-1001" }).telegramConfigured,
    ).toBe(false);
    expect(
      getOpsNotifyChannelStatus({
        TELEGRAM_BOT_TOKEN: "tok",
        TELEGRAM_CHAT_ID: "-1001",
      }).telegramConfigured,
    ).toBe(true);
    expect(
      getOpsNotifyChannelStatus({
        TELEGRAM_BRAIN_BOT_TOKEN: "brain-tok",
        TELEGRAM_BRAIN_OWNER_ID: "1",
      }).telegramConfigured,
    ).toBe(false);
  });

  it("requires all three WhatsApp Cloud API vars from notify.ts", () => {
    const two = {
      WHATSAPP_PHONE_NUMBER_ID: "pnid",
      WHATSAPP_ACCESS_TOKEN: "token",
    };
    expect(getOpsNotifyChannelStatus(two).whatsappConfigured).toBe(false);
    expect(
      getOpsNotifyChannelStatus({
        ...two,
        WHATSAPP_TO_NUMBER: "16475551212",
      }).whatsappConfigured,
    ).toBe(true);
  });

  it("never echoes secrets even when they are present in env", () => {
    const status = getOpsNotifyChannelStatus({
      OWNER_EMAIL: "secret@example.com",
      TELEGRAM_BOT_TOKEN: "123:ABC",
      TELEGRAM_CHAT_ID: "-100999",
      WHATSAPP_PHONE_NUMBER_ID: "111",
      WHATSAPP_ACCESS_TOKEN: "EAAB",
      WHATSAPP_TO_NUMBER: "16475551212",
    });
    const blob = JSON.stringify(status);
    expect(blob).not.toMatch(/secret@|123:ABC|-100999|EAAB|16475551212|111/);
    expect(status).toEqual({
      emailConfigured: true,
      telegramConfigured: true,
      whatsappConfigured: true,
    });
  });
});
