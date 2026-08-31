/**
 * The heartbeat strip: the first thing on Today (response doc §11).
 *
 * Two different things live here, and the order is the argument.
 *
 * The week metric comes first. ADDENDUM-2 item 8: the plan named
 * items-closed-per-week as THE month-one metric and then never displayed it,
 * so the command center could have run for a month without ever saying whether
 * the backlog was shrinking. Closed and promoted are an achievement, not a
 * status light, so they get a card, full-size numerals and the top of the
 * screen; the pipeline signals stay chips underneath.
 *
 * The signals come second. The scheduled ingest stopped for fifteen days in
 * August and nobody noticed. Each chip is a signal and its age; amber means
 * past twice its expected cadence.
 *
 * Colours are the shipped Harvest pairings, unchanged and re-measured:
 * #1a472a on #ffffff is 10.61:1, #2d5a3d on #ffffff is 7.95:1, and the ok/late/
 * never chip skins below are exactly what shipped in 66f6e83. Nothing here
 * invents a tint; the last lane that did shipped a 2.78:1 placeholder.
 */
import { trpc } from "@/lib/trpc";

const LABEL: Record<string, string> = {
  capture: "capture",
  bridge: "bridge",
  generation: "generation",
  digest: "digest",
  automations: "automations",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

/**
 * "Aug 24" for the Monday the count started from. Written out rather than
 * handed to `toLocaleDateString`, which returns a different string per locale
 * and per Node ICU build: this one renders the same in Rye's browser and in a
 * test, which is the only way the label can be asserted at all.
 */
export function weekLabel(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const dt = new Date(d as string);
  if (Number.isNaN(dt.getTime())) return null;
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

/** One number and its noun. The number is the thing being read, so it is big. */
function Metric({ n, label, testId }: { n: number; label: string; testId: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span data-testid={testId} className="text-2xl font-bold leading-none text-[#1a472a]">
        {n}
      </span>
      <span className="text-xs font-medium text-[#2d5a3d]">{label}</span>
    </span>
  );
}

export function HeartbeatStrip() {
  const q = trpc.brain.status.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60_000,
  });
  if (!q.data) return null;

  // Older deploys of `brain.status` returned only `signals`. Reading these
  // defensively means a client ahead of the server shows the chips rather than
  // a blank screen where the numbers should be.
  const data = q.data as typeof q.data & {
    closedThisWeek?: number;
    promotedThisWeek?: number;
    weekStart?: string | Date | null;
  };
  const closed = data.closedThisWeek ?? 0;
  const promoted = data.promotedThisWeek ?? 0;
  const since = weekLabel(data.weekStart);

  return (
    <div className="space-y-2">
      <div className="px-4 pt-2">
        <div
          data-testid="brain-week-metric"
          role="group"
          aria-label="Items closed and promoted this week"
          className="flex items-center gap-5 rounded-xl border border-[#1a472a]/25 bg-white px-3 py-2.5"
        >
          <Metric n={closed} label="closed" testId="brain-week-closed" />
          <Metric n={promoted} label="promoted" testId="brain-week-promoted" />
          <span className="ml-auto text-right text-[11px] leading-4 text-[#2d5a3d]">
            this week
            {since ? (
              <>
                <br />
                since {since}
              </>
            ) : null}
          </span>
        </div>
      </div>

      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 text-xs"
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
    </div>
  );
}
