export function OpsNotifyChannelBadges({
  status,
  className,
  testId,
}: {
  status?: OpsNotifyChannelFlags | null;
  className?: string;
  testId?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 flex-wrap ${className ?? ""}`}
      data-testid={testId}
    >
      <ChannelStatusBadge ok={Boolean(status.emailConfigured)} label="Email" />
      <ChannelStatusBadge ok={Boolean(status.telegramConfigured)} label="Telegram" />
      <ChannelStatusBadge ok={Boolean(status.whatsappConfigured)} label="WhatsApp" />
    </span>
  );
}
