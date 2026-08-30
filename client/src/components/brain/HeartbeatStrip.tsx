/**
 * The heartbeat strip: the first thing on Today (response doc §11).
 *
 * The scheduled ingest stopped for fifteen days in August and nobody noticed.
 * This strip exists so that silence is visible before the work is. Each chip is
 * a signal and its age; amber means past twice its expected cadence.
 */
import { trpc } from "@/lib/trpc";

const LABEL: Record<string, string> = {
  capture: "capture",
  bridge: "bridge",
  generation: "generation",
  digest: "digest",
};

/** Coarse age. Minutes under an hour, hours under two days, days after that. */
export function ago(d: string | Date | null, now = Date.now()): string {
  if (!d) return "never";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "never";
  const m = Math.max(0, Math.floor((now - t) / 60_000));
  if (m < 60) return `${m}m`;
  if (m < 48 * 60) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export function HeartbeatStrip() {
  const q = trpc.brain.status.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60_000,
  });
  if (!q.data) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 text-xs"
      aria-label="Pipeline heartbeat"
    >
      {Object.entries(q.data.signals).map(([key, signal]) => (
        <span
          key={key}
          className={`shrink-0 rounded-full border px-2.5 py-1 ${
            signal.state === "ok"
              ? "border-[#4a7c59]/40 text-[#1a472a]"
              : signal.state === "late"
                ? "border-amber-400 bg-amber-50 text-amber-900"
                : "border-red-300 bg-red-50 text-red-900"
          }`}
          title={`${LABEL[key] ?? key}: ${signal.state}`}
        >
          {LABEL[key] ?? key} · {ago(signal.lastAt as unknown as string | null)}
        </span>
      ))}
    </div>
  );
}
