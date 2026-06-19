import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Users, CheckCircle, Wallet } from "lucide-react";

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function AdminGovernancePanel() {
  const { data: stats, isLoading } = trpc.admin.getTokenStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-[#1a472a]/5 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      label: "Total Players",
      value: stats.totalPlayers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "With Wallet",
      value: stats.playersWithWallet,
      icon: Wallet,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Total RGVoice",
      value: stats.totalRvoice.toLocaleString(),
      icon: Coins,
      color: "text-[#4a7c59]",
      bg: "bg-green-50",
    },
    {
      label: "Total ReGen",
      value: stats.totalRgen.toLocaleString(),
      icon: Coins,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="bg-white border-2 border-[#1a472a]/10">
              <CardContent className="pt-4">
                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-[#1a472a]/80 mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top 10 Token Holders */}
      {stats.topHolders && stats.topHolders.length > 0 && (
        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: "var(--font-display)" }}>
              Top Token Holders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topHolders.map((holder: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a472a]/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#1a472a]/70 w-5">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-[#1a472a]">{holder.displayName || "Unnamed"}</p>
                      {holder.walletAddress && (
                        <p className="text-xs text-[#1a472a]/80 font-mono">{truncateAddress(holder.walletAddress)}</p>
                      )}
                    </div>
                    {holder.isVerified ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#2d7a3a] font-semibold">{(holder.rvoiceBalance || 0).toLocaleString()} RV</p>
                    <p className="text-xs text-emerald-600">{(holder.rgenBalance || 0).toLocaleString()} RG</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
