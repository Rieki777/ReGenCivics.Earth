/**
 * Per-channel enabled / not-connected badges for ops chat alerts.
 * Renders booleans only — never tokens, chat ids, or destination numbers.
 */
export type OpsNotifyChannelFlags = {
  emailConfigured?: boolean;
  telegramConfigured?: boolean;
  whatsappConfigured?: boolean;
};

export function ChannelStatusBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  const state = ok ? "enabled" : "not connected";
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <span
      data-testid={`ops-notify-badge-${slug}`}
      title={ok ? `${label} configured` : `${label} not connected`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        ok
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-400"}`}
        aria-hidden
      />
      <span>{label}</span>
      <span className="font-medium opacity-90">{state}</span>
    </span>
  );
}

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
