/**
 * Presentation helpers for the admin Behavior analytics page.
 *
 * Pure functions over the existing analytics.funnel / analytics.top /
 * analytics.volume payloads. No extra backend calls.
 */

export type VolumeRow = { day: string; event: string; count: number };
export type TopEvent = { event: string; count: number };
export type FunnelCounts = {
  pageViews: number;
  ctaClicks: number;
  applySubmitted: number;
  loiSubmitted: number;
};

export const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views",
  cta_click: "CTA clicks",
  apply_started: "Apply started",
  apply_form_submitted: "Apply submitted",
  apply_step_1: "Apply step 1",
  apply_step_2: "Apply step 2",
  apply_step_3: "Apply step 3",
  apply_step_4: "Apply step 4",
  apply_step_5: "Apply step 5",
  apply_step_6: "Apply step 6",
  loi_submitted: "LOI submitted",
  newsletter_signup: "Newsletter signup",
  share_clicked: "Share clicked",
  application_submitted: "Application submitted",
  investor_form_submitted: "Investor form submitted",
  player_registered: "Player registered",
  quest_completed: "Quest completed",
  quest_shared: "Quest shared",
  forum_post_created: "Forum post",
  site_tour_opened: "Site tour opened",
  campaign_created: "Campaign created",
  calculation_saved: "Calculation saved",
  custom_game_waitlist_joined: "Custom game waitlist",
  org_claimed: "Org claimed",
  investor_verified: "Investor verified",
};

export type DayPoint = {
  day: string;
  label: string;
  total: number;
  page_view: number;
  cta_click: number;
  apply_started: number;
  apply_form_submitted: number;
  loi_submitted: number;
  newsletter_signup: number;
  share_clicked: number;
};

export type VolumeSeriesKey = Exclude<keyof DayPoint, "day" | "label">;

export const VOLUME_SERIES: Array<{
  key: VolumeSeriesKey;
  name: string;
  color: string;
  always?: boolean;
}> = [
  { key: "total", name: "All events", color: "#1a472a", always: true },
  { key: "page_view", name: "Page views", color: "#3d6b47" },
  { key: "cta_click", name: "CTA clicks", color: "#b07a4a" },
  { key: "apply_started", name: "Apply started", color: "#2f6b47" },
  { key: "apply_form_submitted", name: "Apply submitted", color: "#8a5a2b" },
];

const APPLY_FUNNEL_ORDER = [
  "apply_started",
  "apply_step_1",
  "apply_step_2",
  "apply_step_3",
  "apply_step_4",
  "apply_step_5",
  "apply_step_6",
  "apply_form_submitted",
] as const;

export type DeltaTone = "ok" | "empty" | "muted";

export type ApplyFunnelStep = {
  event: string;
  label: string;
  count: number;
  rate: string | null;
};

export function formatEventLabel(event: string): string {
  if (EVENT_LABELS[event]) return EVENT_LABELS[event];
  return event
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toDayKey(raw: string | Date): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
}

export function formatChartDay(day: string): string {
  const key = toDayKey(day);
  const [year, month, date] = key.split("-").map(Number);
  if (!year || !month || !date) return key;
  const dt = new Date(Date.UTC(year, month - 1, date));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function fillDayRange(days: number, now = new Date()): string[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(end - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

function emptyPoint(day: string): DayPoint {
  return {
    day,
    label: formatChartDay(day),
    total: 0,
    page_view: 0,
    cta_click: 0,
    apply_started: 0,
    apply_form_submitted: 0,
    loi_submitted: 0,
    newsletter_signup: 0,
    share_clicked: 0,
  };
}

export function pivotVolumeByDay(
  rows: VolumeRow[],
  days: number,
  now = new Date(),
): DayPoint[] {
  if (rows.length === 0) return [];

  const byDay = new Map<string, DayPoint>();
  for (const key of fillDayRange(days, now)) {
    byDay.set(key, emptyPoint(key));
  }
  for (const row of rows) {
    const key = toDayKey(row.day);
    if (!byDay.has(key)) byDay.set(key, emptyPoint(key));
    const point = byDay.get(key)!;
    const count = Number(row.count) || 0;
    point.total += count;
    if (row.event === "page_view") point.page_view += count;
    if (row.event === "cta_click") point.cta_click += count;
    if (row.event === "apply_started") point.apply_started += count;
    if (row.event === "apply_form_submitted") point.apply_form_submitted += count;
    if (row.event === "loi_submitted") point.loi_submitted += count;
    if (row.event === "newsletter_signup") point.newsletter_signup += count;
    if (row.event === "share_clicked") point.share_clicked += count;
  }
  return Array.from(byDay.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
}

export function seriesHasSignal(points: DayPoint[], key: VolumeSeriesKey): boolean {
  return points.some((point) => point[key] > 0);
}

export function sparklineValues(points: DayPoint[], key: VolumeSeriesKey): number[] {
  return points.map((point) => point[key]);
}

export function conversionCaption(current: number, prior: number): { text: string; tone: DeltaTone } {
  if (prior <= 0 && current <= 0) return { text: "None in this range", tone: "empty" };
  if (prior <= 0 && current > 0) return { text: "Prior step empty", tone: "muted" };
  if (current <= 0) return { text: "0% of prior", tone: "empty" };
  return { text: `${Math.round((current / prior) * 100)}% of prior`, tone: "ok" };
}

export function applyFunnelFromTop(top: TopEvent[]): ApplyFunnelStep[] {
  const counts = new Map(top.map((row) => [row.event, row.count]));
  const present = APPLY_FUNNEL_ORDER.filter((event) => (counts.get(event) ?? 0) > 0);
  if (present.length === 0) return [];

  const steps = APPLY_FUNNEL_ORDER.filter((event) => {
    if (event === "apply_started" || event === "apply_form_submitted") return true;
    return (counts.get(event) ?? 0) > 0;
  });

  const started = counts.get("apply_started") ?? 0;
  return steps.map((event, index) => {
    const count = counts.get(event) ?? 0;
    let rate: string | null = null;
    if (index > 0 && started > 0) rate = `${Math.round((count / started) * 100)}%`;
    return { event, label: formatEventLabel(event), count, rate };
  });
}

export function applySubmitRate(top: TopEvent[]): { started: number; submitted: number; text: string } | null {
  const started = top.find((row) => row.event === "apply_started")?.count ?? 0;
  const submitted = top.find((row) => row.event === "apply_form_submitted")?.count ?? 0;
  if (started <= 0 && submitted <= 0) return null;
  if (started <= 0) return { started, submitted, text: `${submitted.toLocaleString()} submitted` };
  const pct = Math.round((submitted / started) * 100);
  return {
    started,
    submitted,
    text: `${submitted.toLocaleString()} of ${started.toLocaleString()} started reached submit (${pct}%)`,
  };
}

const RANK_FILLS = ["#1a472a", "#245c38", "#2d6b42", "#3a7a4e", "#4a8a5c", "#5c9a6c", "#6aad7a"];

export function rankBarFill(rankIndex: number): string {
  return RANK_FILLS[Math.min(Math.max(rankIndex, 0), RANK_FILLS.length - 1)];
}

export function visibleVolumeSeries(points: DayPoint[]) {
  return VOLUME_SERIES.filter((series) => series.always || seriesHasSignal(points, series.key));
}

export function hasAnalyticsSignal(
  top: TopEvent[] | undefined,
  points: DayPoint[],
  funnel: FunnelCounts | undefined,
): boolean {
  if ((top?.length ?? 0) > 0) return true;
  if (points.some((point) => point.total > 0)) return true;
  if (!funnel) return false;
  return funnel.pageViews + funnel.ctaClicks + funnel.applySubmitted + funnel.loiSubmitted > 0;
}
