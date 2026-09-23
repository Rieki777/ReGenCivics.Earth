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
