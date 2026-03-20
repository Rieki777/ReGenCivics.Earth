/**
 * ProfileStats
 * Displays token balances and key stat numbers for a player.
 * Props flow from PlayerProfile.tsx.
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Trophy, Star } from "lucide-react";

interface ProfileStatsProps {
  rgenBalance?: number | null;
  rvoiceBalance?: number | null;
  contributionCount?: number;
  questsCompleted?: string;
}

export function ProfileStats({
  rgenBalance,
  rvoiceBalance,
  contributionCount,
  questsCompleted,
}: ProfileStatsProps) {
  const questCount = (() => {
    try {
      return JSON.parse(questsCompleted || "[]").length;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="bg-white/10 border border-white/20">
        <CardContent className="p-4 text-center">
          <Coins className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{rgenBalance ?? 0}</p>
          <p className="text-xs text-white/60">RGEN</p>
        </CardContent>
      </Card>
      <Card className="bg-white/10 border border-white/20">
        <CardContent className="p-4 text-center">
          <Star className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{rvoiceBalance ?? 0}</p>
          <p className="text-xs text-white/60">RVOICE</p>
        </CardContent>
      </Card>
      <Card className="bg-white/10 border border-white/20">
        <CardContent className="p-4 text-center">
          <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{questCount}</p>
          <p className="text-xs text-white/60">Quests</p>
        </CardContent>
      </Card>
      <Card className="bg-white/10 border border-white/20">
        <CardContent className="p-4 text-center">
          <Badge className="bg-[#7dd87d]/20 text-[#7dd87d] border-[#7dd87d]/30 mb-2">
            +{contributionCount ?? 0}
          </Badge>
          <p className="text-2xl font-bold text-white">{contributionCount ?? 0}</p>
          <p className="text-xs text-white/60">Contributions</p>
        </CardContent>
      </Card>
    </div>
  );
}
