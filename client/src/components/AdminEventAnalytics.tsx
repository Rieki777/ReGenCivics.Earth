/**
 * AdminEventAnalytics: first-party behavior analytics.
 *
 * Reads the analytics router (analytics.funnel / analytics.top /
 * analytics.volume), which is fed by the public /api/analytics/collect
 * ingest route. Presentation only: sparklines, conversion strip, and
 * chart styling are derived from those three payloads.
 */
import { useId, useMemo, useState, type ElementType } from "react";
import { trpc } from "@/lib/trpc";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowRight, Eye, FileText, MousePointerClick } from "lucide-react";
import {
  applyFunnelFromTop,
  applySubmitRate,
  conversionCaption,
  formatEventLabel,
  hasAnalyticsSignal,
  pivotVolumeByDay,
  rankBarFill,
  sparklineValues,
  visibleVolumeSeries,
  type DayPoint,
  type DeltaTone,
  type FunnelCounts,
  type TopEvent,
  type VolumeSeriesKey,
} from "@/lib/adminEventAnalytics";

const RANGES = [7, 30, 90] as const;

const TONE_CLASS: Record<DeltaTone, string> = {
  ok: "text-[#1a472a] font-semibold",
  muted: "text-[#1a472a]/80",
  empty: "text-[#1a472a]/70",
};

const CARD =
  "rounded-2xl border border-[#1a472a]/12 bg-white shadow-sm transition-shadow hover:shadow-md hover:border-[#1a472a]/20";

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const gradientId = useId();
  if (values.length < 2 || values.every((value) => value === 0)) {
    return (
      <div
        className="h-8 w-[4.5rem] rounded-md bg-[#1a472a]/[0.04] border border-dashed border-[#1a472a]/15"
        aria-hidden
      />
    );
  }
  const max = Math.max(...values, 1);
  const width = 72;
  const height = 32;
  const pad = 2;
  const coords = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - (value / max) * (height - pad * 2);
    return { x, y };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={line}
      />
    </svg>
  );
}

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1a472a]/15 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-[#1a472a] mb-1.5">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-6 text-[#1a472a]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="tabular-nums font-semibold">{Number(entry.value || 0).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  caption,
  tone,
  spark,
  sparkColor,
}: {
  label: string;
  value: number;
  icon: ElementType;
  caption: string;
  tone: DeltaTone;
  spark: number[];
  sparkColor: string;
}) {
  const empty = value === 0;
  return (
    <article className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1a472a]/8 text-[#1a472a]">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#1a472a]/80 truncate">
            {label}
          </h3>
        </div>
        <MiniSpark values={spark} color={sparkColor} />
      </div>
      <p
        className={`mt-3 text-3xl font-bold tabular-nums leading-none ${
          empty ? "text-[#1a472a]/55" : "text-[#1a472a]"
        }`}
      >
        {value.toLocaleString()}
      </p>
      <p className={`mt-2 text-xs ${TONE_CLASS[tone]}`}>{caption}</p>
    </article>
  );
}

function ApplyFunnelStrip({ top }: { top: TopEvent[] }) {
  const steps = applyFunnelFromTop(top);
  const summary = applySubmitRate(top);
  if (steps.length < 2) return null;
  return (
    <section className={`${CARD} p-4 md:p-5`} aria-label="Apply conversion">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1a472a]">Apply conversion</h3>
          <p className="text-xs text-[#1a472a]/80 mt-0.5">
            From apply started through submit, using events already recorded
          </p>
        </div>
        {summary && <p className="text-xs font-semibold text-[#1a472a]">{summary.text}</p>}
      </div>
      <ol className="flex flex-wrap items-stretch gap-2">
        {steps.map((step, index) => (
          <li key={step.event} className="flex items-center gap-2 min-w-0">
            {index > 0 && (
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[#1a472a]/35" aria-hidden />
            )}
            <div className="rounded-xl border border-[#1a472a]/10 bg-[#f8f5f0] px-3 py-2 min-w-[6.5rem]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1a472a]/75">
                {step.label}
              </p>
              <p className="text-xl font-bold tabular-nums text-[#1a472a] leading-tight mt-0.5">
                {step.count.toLocaleString()}
              </p>
              {step.rate && (
                <p className="text-[11px] text-[#1a472a]/80 mt-0.5">{step.rate} of started</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TopEventsList({ rows }: { rows: TopEvent[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ol className="space-y-2.5">
      {rows.map((row, index) => {
        const width = Math.max(6, Math.round((row.count / max) * 100));
        const fill = rankBarFill(index);
        return (
          <li key={row.event}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm font-medium text-[#1a472a] truncate">
                <span className="text-[11px] tabular-nums text-[#1a472a]/60 mr-2">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {formatEventLabel(row.event)}
              </span>
              <span className="text-sm font-bold tabular-nums text-[#1a472a] flex-shrink-0">
                {row.count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#1a472a]/8 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${fill} 0%, ${fill}cc 100%)`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function VolumeCard({ points, days }: { points: DayPoint[]; days: number }) {
  const series = visibleVolumeSeries(points);
  const gradientId = useId();
  const tickGap = days > 60 ? 36 : days > 14 ? 28 : 16;
  return (
    <section className={`${CARD} p-4 md:p-5`}>
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-[#1a472a]">Daily event volume</h3>
        <p className="text-xs text-[#1a472a]/80 mt-0.5">
          All events plus any series that recorded activity in this range
        </p>
      </header>
      {points.length === 0 ? (
        <p className="text-sm text-[#1a472a]/75 py-16 text-center">No daily volume in this range.</p>
      ) : (
        <div
          className="h-[280px]"
          role="img"
          aria-label={`Daily event volume for the last ${days} days`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a472a" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#1a472a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a472a14" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#1a472a" }}
                axisLine={{ stroke: "#1a472a22" }}
                tickLine={false}
                minTickGap={tickGap}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#1a472a" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={32}
              />
              <Tooltip content={<VolumeTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#1a472a", paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {series.map((item) =>
                item.key === "total" ? (
                  <Area
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke="#1a472a"
                    strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ) : (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke={item.color}
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ),
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${CARD} h-28 animate-pulse bg-[#1a472a]/[0.04]`} />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`${CARD} h-72 animate-pulse bg-[#1a472a]/[0.04]`} />
        <div className={`${CARD} h-72 animate-pulse bg-[#1a472a]/[0.04]`} />
      </div>
    </div>
  );
}

function summarySpark(points: DayPoint[], key: VolumeSeriesKey): number[] {
  return sparklineValues(points, key);
}

export function AdminEventAnalytics() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);

  const funnel = trpc.analytics.funnel.useQuery({ days }, { staleTime: 60_000 });
  const top = trpc.analytics.top.useQuery({ days, limit: 12 }, { staleTime: 60_000 });
  const volume = trpc.analytics.volume.useQuery({ days }, { staleTime: 60_000 });

  const volumeSeries = useMemo(
    () => pivotVolumeByDay(volume.data ?? [], days),
    [volume.data, days],
  );

  const f = funnel.data as FunnelCounts | undefined;
  const topRows = (top.data ?? []) as TopEvent[];
  const loading = funnel.isLoading && top.isLoading && volume.isLoading;
  const hasData = hasAnalyticsSignal(topRows, volumeSeries, f);
  const pageViews = f?.pageViews ?? 0;
  const ctaClicks = f?.ctaClicks ?? 0;
  const applySubmitted = f?.applySubmitted ?? 0;
  const loiSubmitted = f?.loiSubmitted ?? 0;
  const pageCaption =
    pageViews > 0
      ? { text: "Recorded in this range", tone: "ok" as const }
      : { text: "None in this range", tone: "empty" as const };
  const ctaCaption = conversionCaption(ctaClicks, pageViews);
  const applyCaption = conversionCaption(applySubmitted, ctaClicks);
  const loiCaption = conversionCaption(loiSubmitted, ctaClicks);
  const showTrackingNote = pageViews === 0 && ctaClicks === 0 && hasData;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-5 h-5 text-[#1a472a]" aria-hidden />
            <h2 className="text-lg font-bold text-[#1a472a]">Behavior analytics</h2>
            <span className="inline-flex items-center rounded-full border border-[#1a472a]/15 bg-[#1a472a]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#1a472a]">
              first-party, cookieless
            </span>
          </div>
          <p className="text-xs text-[#1a472a]/80 mt-1 ml-7">
            Events land from this site only. No third-party tracker.
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-[#1a472a]/15 overflow-hidden bg-white"
          role="group"
          aria-label="Date range"
        >
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              aria-pressed={days === range}
              className={`px-3 py-1.5 text-sm font-medium transition-colors min-h-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a] focus-visible:ring-inset ${
                days === range
                  ? "bg-[#1a472a] text-white"
                  : "text-[#1a472a] hover:bg-[#1a472a]/5"
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <div className={`${CARD} py-12 text-center text-[#1a472a]/80`}>
          <Activity className="w-8 h-8 mx-auto mb-3 text-[#1a472a]/30" aria-hidden />
          <p className="font-medium text-[#1a472a]">No events yet</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Events appear here once visitors move through the site. The ingest
            path is first-party and cookieless.
          </p>
        </div>
      ) : (
        <>
          {showTrackingNote && (
            <p className="text-xs text-[#1a472a]/80 px-1">
              Page views and CTA clicks are 0 in this range. Apply, share, and
              newsletter events are still being recorded.
            </p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Page views"
              value={pageViews}
              icon={Eye}
              caption={pageCaption.text}
              tone={pageCaption.tone}
              spark={summarySpark(volumeSeries, "page_view")}
              sparkColor="#3d6b47"
            />
            <SummaryCard
              label="CTA clicks"
              value={ctaClicks}
              icon={MousePointerClick}
              caption={ctaCaption.text}
              tone={ctaCaption.tone}
              spark={summarySpark(volumeSeries, "cta_click")}
              sparkColor="#b07a4a"
            />
            <SummaryCard
              label="Apply submitted"
              value={applySubmitted}
              icon={ArrowRight}
              caption={applyCaption.text}
              tone={applyCaption.tone}
              spark={summarySpark(volumeSeries, "apply_form_submitted")}
              sparkColor="#2f6b47"
            />
            <SummaryCard
              label="LOI submitted"
              value={loiSubmitted}
              icon={FileText}
              caption={loiCaption.text}
              tone={loiCaption.tone}
              spark={summarySpark(volumeSeries, "loi_submitted")}
              sparkColor="#8a5a2b"
            />
          </div>

          <ApplyFunnelStrip top={topRows} />

          <div className="grid lg:grid-cols-2 gap-4">
            <VolumeCard points={volumeSeries} days={days} />
            <section className={`${CARD} p-4 md:p-5`}>
              <header className="mb-4">
                <h3 className="text-sm font-semibold text-[#1a472a]">Top events</h3>
                <p className="text-xs text-[#1a472a]/80 mt-0.5">
                  Most frequent events in the last {days} days
                </p>
              </header>
              {topRows.length === 0 ? (
                <p className="text-sm text-[#1a472a]/75 py-12 text-center">
                  No named events in this range.
                </p>
              ) : (
                <TopEventsList rows={topRows} />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminEventAnalytics;
