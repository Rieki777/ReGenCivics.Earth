import { BarChart3, Coins, Activity, TrendingUp, Heart, Wallet } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

const REGEN_STATS = [
  { label: "Total supply", value: "10,000,000", icon: Coins, color: "#7dd87d" },
  { label: "Active holders", value: "247", icon: Wallet, color: "#7dd87d" },
  { label: "Staked in governance", value: "1,240,000", icon: TrendingUp, color: "#d4a574" },
  { label: "In escrow (milestones)", value: "380,000", icon: Activity, color: "#ffd700" },
];

const DISTRIBUTION = [
  { label: "Quest rewards this season", value: "45,000", pct: 45 },
  { label: "Gratitude flows", value: "23,000", pct: 23 },
  { label: "Role compensation", value: "18,000", pct: 18 },
  { label: "Land project grants", value: "14,000", pct: 14 },
];

export default function EconomyPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-[#7dd87d]" />
        <div>
          <h1 className="text-3xl font-bold text-white">Economy</h1>
          <p className="text-white/55 text-sm">$ReGen as a living currency for coordination</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {REGEN_STATS.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: s.color }} />
                <p className="text-white/55 text-xs">{s.label}</p>
              </div>
              <p className="text-white font-bold text-xl">{s.value}</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-4">Distribution this season</h2>
          <div className="space-y-3">
            {DISTRIBUTION.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/80">{d.label}</span>
                  <span className="text-[#7dd87d] font-bold">{d.value}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#7dd87d] rounded-full" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-[10px] uppercase tracking-widest text-[#d4a574] font-bold mb-4">Gratitude Flows</h2>
          <div className="text-center py-6">
            <Heart className="w-12 h-12 text-[#d4a574]/60 mx-auto mb-3" />
            <p className="text-3xl font-bold text-[#d4a574]">1,247</p>
            <p className="text-white/55 text-sm mt-1">gratitude messages sent this season</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">23,000</p>
              <p className="text-white/55 text-[10px]">$ReGen via gratitude</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">142</p>
              <p className="text-white/55 text-[10px]">unique senders</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-[10px] uppercase tracking-widest text-[#d4a574] font-bold mb-4">Fund Health ($RCivics)</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "$RCivics total committed", value: "$2.4M" },
            { label: "Investors", value: "34" },
            { label: "Fund utilization", value: "67%" },
            { label: "Next distribution", value: "Season 3" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-white/55 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-white/45 text-xs text-center mt-4">
          Planted vs. sold transparency: 67% of committed capital has been deployed to land projects. 33% remains in reserve for upcoming seasons.
        </p>
      </GlassCard>
    </div>
  );
}
