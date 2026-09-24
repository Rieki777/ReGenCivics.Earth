/**
 * Live event-reminder cron health for Admin Events (+ compact Overview).
 * Honest: env + known schedule + real last delivery / last cron OK.
 */
import { Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import type { EventReminderCronStatus } from "@shared/eventReminderCronHealth";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function statusLabel(
  status: EventReminderCronStatus,
  tone: "dark" | "light" = "dark",
): { text: string; className: string } {
  const dark = {
    ok: "text-emerald-300",
    stale: "text-amber-300",
    not_tracked_yet: "text-yellow-200",
    unconfigured: "text-red-300",
  } as const;
  const light = {
    ok: "text-emerald-700",
    stale: "text-amber-700",
    not_tracked_yet: "text-amber-800",
    unconfigured: "text-red-700",
  } as const;
  const colors = tone === "light" ? light : dark;
  switch (status) {
    case "ok":
      return { text: "Healthy", className: colors.ok };
    case "stale":
      return { text: "Stale — cron may not be firing", className: colors.stale };
    case "not_tracked_yet":
      return { text: "Configured — last run not tracked yet", className: colors.not_tracked_yet };
    case "unconfigured":
    default:
      return { text: "CRON_SECRET not set", className: colors.unconfigured };
  }
}

export function AdminEventReminderCronHealth({
  compact = false,
}: {
  /** Compact strip for Overview; full card for Events tab. */
  compact?: boolean;
}) {
  const { data, isLoading } = trpc.admin.eventReminderCronHealth.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (isLoading && !data) {
    return (
      <div
        className={
          compact
            ? "rounded-2xl border border-[#1a472a]/12 bg-white px-4 py-3 flex items-center gap-2 text-sm text-[#1a472a]/70"
            : "rounded-lg bg-[#0a1f14] border border-white/15 px-3 py-3 flex items-center gap-2 text-xs text-white/60"
        }
        data-testid="admin-reminder-cron-health-loading"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking reminder cron…
      </div>
    );
  }

  if (!data) return null;

  const badge = statusLabel(data.status, compact ? "light" : "dark");
  const Icon =
    data.status === "ok"
      ? CheckCircle2
      : data.status === "unconfigured" || data.status === "stale"
        ? AlertTriangle
        : Clock;

  if (compact) {
    return (
      <div
        className="rounded-2xl border border-[#1a472a]/12 bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
        data-testid="admin-reminder-cron-health"
        data-status={data.status}
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a472a]">
          <Icon className="w-4 h-4" />
          Event reminder cron
        </span>
        <span className={`text-xs font-medium ${badge.className}`}>
          {badge.text}
        </span>
        <span className="text-xs text-[#1a472a]/65 tabular-nums">
          Next: {formatWhen(data.nextCronAt)}
        </span>
        <span className="text-xs text-[#1a472a]/65 tabular-nums">
          Last OK: {data.lastCronOkAt ? formatWhen(data.lastCronOkAt) : "not tracked yet"}
        </span>
        <span className="text-xs text-[#1a472a]/65 tabular-nums">
          Last delivery: {data.lastDeliveryAt ? formatWhen(data.lastDeliveryAt) : "none yet"}
        </span>
      </div>
    );
  }

  return (
    <Card className="bg-[#0a1f14] border-yellow-800/30" data-testid="admin-reminder-cron-health" data-status={data.status}>
      <CardHeader className="pb-2">
        <CardTitle className="text-yellow-400 text-sm flex items-center gap-2">
          <Icon size={14} /> Event reminder cron health
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-white/70 space-y-2">
        <p className={`font-semibold ${badge.className}`}>{badge.text}</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <dt className="text-white/45">CRON_SECRET</dt>
            <dd className="text-white/85">{data.cronSecretConfigured ? "set" : "missing"}</dd>
          </div>
          <div>
            <dt className="text-white/45">Schedule</dt>
            <dd className="text-white/85 font-mono">
              {data.scheduleCron} <span className="text-white/50">(UTC)</span>
            </dd>
          </div>
          <div>
            <dt className="text-white/45">In-process sweep</dt>
            <dd className="text-white/85">every {data.inProcessSweepMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-white/45">Endpoint</dt>
            <dd className="text-white/85 font-mono break-all">POST {data.endpoint}</dd>
          </div>
          <div>
            <dt className="text-white/45">Next expected run</dt>
            <dd className="text-white/85 tabular-nums">{formatWhen(data.nextCronAt)}</dd>
          </div>
          <div>
            <dt className="text-white/45">Last cron success</dt>
            <dd className="text-white/85 tabular-nums">
              {data.lastCronOkAt ? formatWhen(data.lastCronOkAt) : "not tracked yet"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Last delivery</dt>
            <dd className="text-white/85 tabular-nums">
              {data.lastDeliveryAt
                ? formatWhen(data.lastDeliveryAt)
                : "none yet (from auto-reminder send log)"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Enabled auto-reminders</dt>
            <dd className="text-white/85 tabular-nums">{data.enabledAutoReminderEvents}</dd>
          </div>
        </dl>
        <p className="text-white/45 pt-1">{data.scheduleNote}</p>
      </CardContent>
    </Card>
  );
}

export default AdminEventReminderCronHealth;
