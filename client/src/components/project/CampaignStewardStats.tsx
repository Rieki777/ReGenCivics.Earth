/**
 * The campaign's numbers at a glance for its stewards: how much is pledged
 * of the whole, and how many offers sit at each step. The contributor count
 * comes from the server (distinct contributors across accepted, delivered
 * and thanked offers), so it matches the public campaign page.
 */
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { BarChart3, CheckCircle2, Clock, PackageCheck, Users } from "lucide-react";

export function CampaignStewardStats({
  campaignId,
  totalValue,
  pledgedTotal,
  contributorsCount,
  counts,
  formatCurrency,
}: {
  campaignId: number;
  totalValue: number;
  pledgedTotal: number;
  contributorsCount: number;
  counts: { waiting: number; accepted: number; delivered: number };
  formatCurrency: (amount: number) => string;
}) {
  const pct = totalValue > 0 ? Math.min((pledgedTotal / totalValue) * 100, 100) : 0;
  const tiles = [
    { label: "Waiting", value: counts.waiting, icon: Clock, bg: "bg-yellow-50", fg: "text-yellow-700" },
    { label: "Accepted", value: counts.accepted, icon: CheckCircle2, bg: "bg-green-50", fg: "text-green-700" },
    { label: "Delivered", value: counts.delivered, icon: PackageCheck, bg: "bg-emerald-50", fg: "text-emerald-700" },
    { label: "Contributors", value: contributorsCount, icon: Users, bg: "bg-blue-50", fg: "text-blue-700" },
  ];
  return (
    <section id="stats" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <BarChart3 className="w-5 h-5 text-[#4a7c59]" />
        How it's going
      </h2>
      <div className="space-y-2">
        <div className="flex justify-between text-sm gap-2">
          <span className="text-[#1a472a]/80">Pledged so far</span>
          <span className="font-bold text-[#4a7c59]">{pct.toFixed(0)}%</span>
        </div>
        <Progress value={pct} className="h-3" />
        <p className="text-sm text-[#1a472a]/80">
          <strong>{formatCurrency(pledgedTotal)}</strong> pledged of <strong>{formatCurrency(totalValue)}</strong>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {tiles.map((t) => (
          <div key={t.label} className={`${t.bg} rounded-xl p-3 text-center`}>
            <t.icon className={`w-5 h-5 ${t.fg} mx-auto mb-1`} />
            <div className={`text-2xl font-bold ${t.fg}`}>{t.value}</div>
            <div className={`text-xs ${t.fg}`}>{t.label}</div>
          </div>
        ))}
      </div>
      <Link href={`/campaign/${campaignId}/analytics`} className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-[#4a7c59] hover:underline">
        <BarChart3 className="w-4 h-4" />
        See visits and conversions
      </Link>
    </section>
  );
}
