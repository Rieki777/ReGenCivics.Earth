/**
 * Admin Citizenship Tiers Panel
 * 4-column comparison grid, override buttons, grace period dashboard, run nightly job.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, AlertTriangle, Users, Shield, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { CitizenshipBadge } from "@/components/game/TierBadge";

const TIERS = [
  { key: "explorer", label: "Explorer", emoji: "🧭", color: "#7C9A7E" },
  { key: "co_creator", label: "Co-Creator", emoji: "🔥", color: "#E8A838" },
  { key: "steward", label: "Steward", emoji: "🏔️", color: "#6B8DD6" },
  { key: "sage", label: "Sage", emoji: "✨", color: "#C084FC" },
];

export function AdminCitizenshipTiers() {
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideTier, setOverrideTier] = useState<string>("explorer");

  const { data: graceList = [] } = trpc.batchJobs.getGracePeriodPlayers.useQuery();
  const { data: jobHistory = [] } = trpc.batchJobs.getJobHistory.useQuery({ limit: 5 });

  const runJobMutation = trpc.batchJobs.runNightly.useMutation({
    onSuccess: (result) => {
      toast.success(`Nightly job completed: ${result.playersProcessed} players, ${result.promotions} promotions, ${result.demotions} demotions`);
    },
    onError: (err) => toast.error("Job failed", { description: err.message }),
  });

  const overrideMutation = trpc.batchJobs.overrideTier.useMutation({
    onSuccess: () => {
      toast.success("Tier overridden");
      setOverrideUserId("");
    },
    onError: (err) => toast.error("Override failed", { description: err.message }),
  });

  return (
    <div className="space-y-6">
      {/* Tier Comparison Grid */}
      <Card className="bg-[#0d2818] border-[#7dd87d]/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Citizenship Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.key}
                className="rounded-xl p-4 border"
                style={{ borderColor: `${tier.color}30`, backgroundColor: `${tier.color}08` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CitizenshipBadge tier={tier.key} size="md" />
                  <span className="text-white font-bold text-sm">{tier.label}</span>
                </div>
                <div className="space-y-1 text-white/60 text-xs">
                  {tier.key === "explorer" && <p>Entry level. All new players start here.</p>}
                  {tier.key === "co_creator" && <p>15th percentile + Fire quest + 1 rite + 5 gratitude + 2 seasons</p>}
                  {tier.key === "steward" && <p>50th percentile + 1 epic + 1 project endorsement + 10 gratitude + 3 seasons</p>}
                  {tier.key === "sage" && <p>90th percentile + 100 contributions + 10 endorsements + 6 seasons</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nightly Job Controls */}
      <Card className="bg-[#0d2818] border-[#7dd87d]/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#7dd87d]" />
            Nightly Job
          </CardTitle>
          <Button
            onClick={() => runJobMutation.mutate()}
            disabled={runJobMutation.isPending}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b]"
          >
            <Play className="w-4 h-4 mr-1" />
            {runJobMutation.isPending ? "Running..." : "Run Now"}
          </Button>
        </CardHeader>
        <CardContent>
          {jobHistory.length > 0 ? (
            <div className="space-y-2">
              {(jobHistory as any[]).map((job: any) => (
                <div key={job.id} className="flex items-center justify-between text-sm px-3 py-2 bg-white/5 rounded-lg">
                  <span className="text-white/60">{new Date(job.startedAt).toLocaleString()}</span>
                  <Badge variant={job.status === "success" ? "default" : "destructive"} className="text-xs">
                    {job.status}
                  </Badge>
                  <span className="text-white/60 text-xs">
                    {job.playersProcessed} players, {job.promotions}↑ {job.demotions}↓
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-sm text-center py-4">No jobs run yet</p>
          )}
        </CardContent>
      </Card>

      {/* Grace Period Dashboard */}
      <Card className="bg-[#0d2818] border-[#7dd87d]/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Grace Period Players ({graceList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(graceList as any[]).length > 0 ? (
            <div className="space-y-2">
              {(graceList as any[]).map((p: any) => (
                <div key={p.userId} className="flex items-center justify-between text-sm px-3 py-2 bg-white/5 rounded-lg">
                  <span className="text-white">{p.displayName ?? `User #${p.userId}`}</span>
                  <CitizenshipBadge tier={p.citizenshipTier ?? "explorer"} showLabel />
                  <span className="text-amber-400/70 text-xs">
                    Since {new Date(p.graceStartedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-sm text-center py-4">No players in grace period</p>
          )}
        </CardContent>
      </Card>

      {/* Manual Override */}
      <Card className="bg-[#0d2818] border-[#7dd87d]/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#7dd87d]" />
            Manual Tier Override
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={overrideUserId}
              onChange={(e) => setOverrideUserId(e.target.value)}
              placeholder="User ID"
              className="w-32 bg-white/5 border-white/10 text-white"
            />
            <Select value={overrideTier} onValueChange={setOverrideTier}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => overrideMutation.mutate({ userId: parseInt(overrideUserId), tier: overrideTier as any })}
              disabled={!overrideUserId || overrideMutation.isPending}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              Override
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
