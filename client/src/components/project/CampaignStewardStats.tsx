/**
 * The campaign's numbers at a glance for its stewards: the two-line bar
 * (in-kind first, then money) read from the campaign's one progress reading
 * (shared/campaignProgress.ts, the same figures visitors see), the soft
 * money-share note, and how many offers sit at each step. The contributor
 * count comes from the server (distinct contributors across accepted,
 * delivered and thanked offers), so it matches the public page.
 *
 * The money-share note is guidance for stewards only (ruling 2026-09-24):
 * contributors never see it, and nothing blocks on it.
 */
import { Link } from "wouter";
import { BarChart3, CheckCircle2, Clock, PackageCheck, Users } from "lucide-react";
import { moneyShareNote, type CampaignProgress, type CampaignProgressSummary } from "@shared/campaignProgress";
import { CASH_SHARE } from "@shared/crowdpoolModel";
import { TwoLineBar } from "@/components/crowdpool/TwoLineBar";

export type MoneyShareBand = { softMinPct: number; softMaxPct: number };

export function CampaignStewardStats({
  campaignId,
  progress,
  band = CASH_SHARE,
  contributorsCount,
  counts,
  formatCurrency,
}: {
  campaignId: number;
  progress: CampaignProgress | CampaignProgressSummary;
  /** campaigns.crowdpoolSettings.moneyShare; the model's defaults until it loads. */
  band?: MoneyShareBand;
  contributorsCount: number;
  counts: { waiting: number; accepted: number; delivered: number };
  formatCurrency: (amount: number) => string;
}) {
  const note = moneyShareNote({
    inKindAsk: progress.inKind.ask,
    moneyAsk: progress.money.ask,
    asksNone: progress.money.asksNone,
    band,
  });
  const tiles = [
    { label: "Waiting", value: counts.waiting, icon: Clock, bg: "bg-yellow-50", fg: "text-yellow-800" },
    { label: "Accepted", value: counts.accepted, icon: CheckCircle2, bg: "bg-green-50", fg: "text-green-800" },
    { label: "Delivered", value: counts.delivered, icon: PackageCheck, bg: "bg-emerald-50", fg: "text-emerald-800" },
    { label: "Contributors", value: contributorsCount, icon: Users, bg: "bg-blue-50", fg: "text-blue-800" },
  ];
  return (
    <section id="stats" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <BarChart3 className="w-5 h-5 text-[#4a7c59]" />
        How it's going
      </h2>
      <TwoLineBar progress={progress} formatCurrency={formatCurrency} variant="compact" />
      {/* The bar already says "This project asks for no money". */}
      {note.line && !progress.money.asksNone && (
        <p className={`mt-2 text-sm ${note.outside ? "text-[#1a472a] font-medium" : "text-[#1a472a]/80"}`}>{note.line}</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {tiles.map((t) => (
          <div key={t.label} className={`${t.bg} rounded-xl p-3 text-center`}>
            <t.icon className={`w-5 h-5 ${t.fg} mx-auto mb-1`} />
            <div className={`text-2xl font-bold ${t.fg}`}>{t.value}</div>
            <div className={`text-xs ${t.fg}`}>{t.label}</div>
          </div>
        ))}
      </div>
      <Link href={`/campaign/${campaignId}/analytics`} className="inline-flex items-center gap-1 mt-4 min-h-11 text-sm font-medium text-[#4a7c59] hover:underline">
        <BarChart3 className="w-4 h-4" />
        See visits and conversions
      </Link>
    </section>
  );
}
