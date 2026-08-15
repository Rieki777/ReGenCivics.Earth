/**
 * AdminEventAnalytics: first-party behavior analytics.
 *
 * Reads the analytics router (analytics.funnel / analytics.top /
 * analytics.volume), which is fed by the public /api/analytics/collect
 * ingest route. Shows the conversion funnel, the top events, and daily event
 * volume. All data lives on our own infrastructure (no third-party scripts).
 *
 * Until the ingest endpoint has collected data (after deploy + the 0136
 * migration is applied), this renders a calm empty state.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, MousePointerClick, Eye, ArrowRight } from "lucide-react";

const RANGES = [7, 30, 90] as const;

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function AdminEventAnalytics() {
  const [days, setDays] = useState<number>(30);

  const funnel = trpc.analytics.funnel.useQuery({ days }, { staleTime: 60_000 });
  const top = trpc.analytics.top.useQuery({ days, limit: 12 }, { staleTime: 60_000 });
  const volume = trpc.analytics.volume.useQuery({ days }, { staleTime: 60_000 });

  // Pivot the volume rows into one point per day with the key events.
  const byDay = new Map<string, { day: string; total: number; page_view: number; cta_click: number }>();
  for (const r of volume.data ?? []) {
    const d = byDay.get(r.day) ?? { day: r.day, total: 0, page_view: 0, cta_click: 0 };
    d.total += r.count;
    if (r.event === "page_view") d.page_view += r.count;
    if (r.event === "cta_click") d.cta_click += r.count;
    byDay.set(r.day, d);
  }
  const volumeSeries = Array.from(byDay.values());

  const f = funnel.data;
  const hasData = (top.data?.length ?? 0) > 0 || volumeSeries.length > 0;

  const funnelSteps = f
    ? [
        { label: "Page views", value: f.pageViews, icon: Eye, rate: "100%" },
        { label: "CTA clicks", value: f.ctaClicks, icon: MousePointerClick, rate: pct(f.ctaClicks, f.pageViews) },
        { label: "Apply submitted", value: f.applySubmitted, icon: ArrowRight, rate: pct(f.applySubmitted, f.ctaClicks) },
        { label: "LOI submitted", value: f.loiSubmitted, icon: ArrowRight, rate: pct(f.loiSubmitted, f.ctaClicks) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#1a472a]" />
          <h2 className="text-lg font-bold text-[#1a472a]">Behavior analytics</h2>
          <span className="text-xs text-[#1a472a]/75">first-party, cookieless</span>
        </div>
        <div className="inline-flex rounded-lg border border-[#1a472a]/15 overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                days === r ? "bg-[#1a472a] text-white" : "text-[#1a472a]/75 hover:bg-[#1a472a]/5"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-[#1a472a]/75">
            <Activity className="w-8 h-8 mx-auto mb-3 text-[#1a472a]/30" />
            <p className="font-medium">No events yet</p>
            <p className="text-sm mt-1">
              Events appear here once the site is deployed, the 0136 migration is applied, and
              visitors start moving through the funnel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Funnel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {funnelSteps.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-[#1a472a]/75 mb-1">
                    <s.icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{s.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1a472a] tabular-nums">{s.value.toLocaleString()}</div>
                  <div className="text-xs text-[#7dd87d] font-semibold mt-0.5">{s.rate} of prior</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily volume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily event volume</CardTitle>
                <CardDescription>Total events, page views, and CTA clicks per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={volumeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a472a15" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#1a472a" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="page_view" stroke="#7dd87d" strokeWidth={2} dot={false} name="Page views" />
                    <Line type="monotone" dataKey="cta_click" stroke="#d4a574" strokeWidth={2} dot={false} name="CTA clicks" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top events</CardTitle>
                <CardDescription>Most frequent events in the last {days} days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={top.data ?? []} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a472a15" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="event" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7dd87d" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminEventAnalytics;
