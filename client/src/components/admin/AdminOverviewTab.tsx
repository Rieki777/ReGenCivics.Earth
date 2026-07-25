import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  Mail,
  FileText,
  Sparkles,
  TrendingUp,
  Sprout,
  BarChart2,
  Coins,
} from "lucide-react";
import { ActivitySparkline } from "./ActivitySparkline";
import { AdminGovernancePanel } from "./AdminGovernancePanel";
import { AdminCSuiteBriefing } from "./AdminCSuiteBriefing";
import { AdminNeedsYou } from "./AdminNeedsYou";

// Path type config subset needed for the overview
const pathTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  alliance: { label: "Alliance Partners", color: "bg-purple-500", icon: () => null },
  create: { label: "Create with ReGens", color: "bg-blue-500", icon: () => null },
  live: { label: "Live in a Land Project", color: "bg-green-500", icon: () => null },
  role: { label: "Role in ReGen Civics", color: "bg-amber-500", icon: () => null },
  finance: { label: "Finance Regeneration", color: "bg-emerald-500", icon: () => null },
  learn: { label: "Learn and Explore", color: "bg-cyan-500", icon: () => null },
  other: { label: "Other Inquiries", color: "bg-gray-500", icon: () => null },
};

const landProjectsList = [
  { id: "la_tierra", name: "La Tierra" },
  { id: "starseed", name: "StarSeed Village" },
  { id: "nyx", name: "The Nyx" },
  { id: "neighbourgood", name: "Our NeighbourGood" },
  { id: "highland_lake", name: "Highland Lake CampUS" },
  { id: "liminal", name: "Liminal Village" },
  { id: "heartland", name: "Heartland Retreat" },
  { id: "tdf", name: "Traditional Dream Factory" },
  { id: "ubuntu", name: "Ubuntu" },
  { id: "finca_sagrada", name: "Finca Sagrada" },
  { id: "tabi", name: "Tabi" },
  { id: "tioga", name: "Tioga" },
  { id: "lala_gardens", name: "LaLa Gardens Cooperative" },
];

interface Props {
  stats: {
    totalApplications: number;
    totalInvestors: number;
    totalInquiries: number;
    pendingReview: number;
  };
  applications: any[] | undefined;
  investors: any[] | undefined;
  inquiries: any[] | undefined;
  inquiriesByPath: Record<string, number>;
  setActiveTab: (tab: string) => void;
  setInvestorStatusFilter: (filter: string) => void;
}

export function AdminOverviewTab({
  stats,
  applications,
  investors,
  inquiries,
  inquiriesByPath,
  setActiveTab,
  setInvestorStatusFilter,
}: Props) {
  return (
    <div className="space-y-6">
      {/* One prioritized action queue: what is waiting on the operator, first. */}
      <AdminNeedsYou onSelectTab={setActiveTab} />

      {/* C-suite briefing + ecosystem KPIs: the AI-assisted front door. */}
      <AdminCSuiteBriefing onSelectTab={setActiveTab} />

      {/* Pending Items Alert */}
      {stats.pendingReview > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              {stats.pendingReview} item{stats.pendingReview !== 1 ? "s" : ""} pending review
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Review and respond to keep your community engaged
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
              onClick={() => setActiveTab("applications")}
            >
              Applications
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
              onClick={() => setActiveTab("investors")}
            >
              Investors
            </Button>
          </div>
        </div>
      )}

      {/* Today's Focus */}
      {(() => {
        const now = Date.now();
        const h48 = now - 48 * 3_600_000;
        const h24 = now - 24 * 3_600_000;
        const overdueInvestors = (investors || []).filter(
          (i: any) => (!i.status || i.status === "new") && new Date(i.createdAt).getTime() < h48
        );
        const overdueInquiries = (inquiries || []).filter(
          (i: any) => (!i.status || i.status === "new") && new Date(i.createdAt).getTime() < h48
        );
        const newToday = [
          ...(investors || [])
            .filter((i: any) => new Date(i.createdAt).getTime() > h24)
            .map((i: any) => ({ type: "investor", name: i.fullName || i.email })),
          ...(applications || [])
            .filter((a: any) => new Date(a.submittedAt || a.createdAt).getTime() > h24)
            .map((a: any) => ({ type: "application", name: a.projectName || a.contactName })),
          ...(inquiries || [])
            .filter((i: any) => new Date(i.createdAt).getTime() > h24)
            .map((i: any) => ({ type: "inquiry", name: i.fullName || i.email })),
        ];
        const hasItems =
          overdueInvestors.length > 0 || overdueInquiries.length > 0 || newToday.length > 0;
        if (!hasItems) return null;
        return (
          <div className="bg-white border-2 border-[#1a472a]/10 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#1a472a] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Today's Focus
            </h3>
            {overdueInvestors.length > 0 && (
              <button
                onClick={() => {
                  setInvestorStatusFilter("new");
                  setActiveTab("investors");
                }}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-700">
                  <strong>{overdueInvestors.length}</strong> investor
                  {overdueInvestors.length !== 1 ? "s" : ""} in "new" status for 48+ hours, follow up now
                </span>
              </button>
            )}
            {overdueInquiries.length > 0 && (
              <button
                onClick={() => setActiveTab("live")}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-xs text-orange-700">
                  <strong>{overdueInquiries.length}</strong>{" "}
                  {overdueInquiries.length !== 1 ? "inquiries" : "inquiry"} waiting 48+ hours for a response
                </span>
              </button>
            )}
            {newToday.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                <Sparkles className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-green-700">
                  <strong>{newToday.length}</strong> new submission{newToday.length !== 1 ? "s" : ""} in
                  the last 24h:{" "}
                  <span className="text-green-600">
                    {newToday
                      .slice(0, 3)
                      .map((n) => n.name)
                      .filter(Boolean)
                      .join(", ")}
                    {newToday.length > 3 ? ` +${newToday.length - 3} more` : ""}
                  </span>
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Send Newsletter", icon: Mail, color: "bg-blue-500", tab: "newsletter" },
          { label: "Review Applications", icon: FileText, color: "bg-[#4a7c59]", tab: "applications" },
          { label: "Email Templates", icon: Sparkles, color: "bg-purple-500", tab: "settings" },
          { label: "View Analytics", icon: TrendingUp, color: "bg-amber-500", tab: "analytics" },
        ].map((action) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => setActiveTab(action.tab)}
              className="p-4 rounded-xl bg-white border-2 border-[#1a472a]/10 hover:border-[#7dd87d]/50 hover:shadow-md transition-all text-left group"
            >
              <div
                className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
              >
                <ActionIcon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#1a472a]">{action.label}</p>
            </button>
          );
        })}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <ActivitySparkline />

        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader className="pb-2">
            <CardTitle
              className="text-[#1a472a] text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const pending =
                  (applications?.filter((a: any) => a.status === "pending").length || 0) +
                  (investors?.filter((i: any) => i.status === "pending").length || 0) +
                  (inquiries?.filter((i: any) => i.status === "pending" || i.status === "new")
                    .length || 0);
                const reviewed =
                  (applications?.filter(
                    (a: any) => a.status === "reviewed" || a.status === "in_review"
                  ).length || 0) +
                  (investors?.filter(
                    (i: any) => i.status === "reviewed" || i.status === "contacted"
                  ).length || 0) +
                  (inquiries?.filter(
                    (i: any) => i.status === "reviewed" || i.status === "contacted"
                  ).length || 0);
                const total =
                  stats.totalApplications + stats.totalInvestors + stats.totalInquiries;
                const reviewRate = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                return (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#1a472a]/75">Pending Review</span>
                        <span className="font-medium text-yellow-600">{pending}</span>
                      </div>
                      <div className="w-full bg-[#f0ebe3] rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#1a472a]/75">Reviewed/Contacted</span>
                        <span className="font-medium text-green-600">{reviewed}</span>
                      </div>
                      <div className="w-full bg-[#f0ebe3] rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${reviewRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#1a472a]/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#1a472a]/75">Review Rate</span>
                        <span className="text-lg font-bold text-[#1a472a]">{reviewRate}%</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader className="pb-2">
            <CardTitle
              className="text-[#1a472a] text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Top Interests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const projectCounts: Record<string, number> = {};
                inquiries?.forEach((inquiry: any) => {
                  try {
                    const formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
                    const projects = formData.selectedProjects || [];
                    projects.forEach((p: string) => {
                      projectCounts[p] = (projectCounts[p] || 0) + 1;
                    });
                  } catch (e) {
                    console.error("[AdminOverviewTab] failed to parse inquiry formData", e);
                  }
                });
                const sorted = Object.entries(projectCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5);
                if (sorted.length === 0) {
                  return <p className="text-sm text-[#1a472a]/75">No project interests yet</p>;
                }
                return sorted.map(([projectId, count]) => {
                  const project = landProjectsList.find((p) => p.id === projectId);
                  return (
                    <div key={projectId} className="flex items-center justify-between">
                      <span className="text-sm text-[#1a472a]/75 truncate max-w-[150px]">
                        {project?.name || projectId}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Stats */}
      <Card className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] border-0">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-white text-lg flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Sparkles className="w-5 h-5 text-[#7dd87d]" />
            Impact Stats (All Projects Applied)
          </CardTitle>
          <CardDescription className="text-white/60">
            Aggregate data from all land project applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const projectCount = applications?.length || 0;
              let totalHectares = 0;
              let totalFamilies = 0;
              let totalHumans = 0;
              applications?.forEach((app: any) => {
                if (typeof app.projectSizeHectares === "number") totalHectares += app.projectSizeHectares;
                if (typeof app.intendedHouseholdCount === "number") totalFamilies += app.intendedHouseholdCount;
                else if (typeof app.currentHouseholdCount === "number") totalFamilies += app.currentHouseholdCount;
                if (typeof app.intendedPeopleCount === "number") totalHumans += app.intendedPeopleCount;
                else if (typeof app.currentPeopleCount === "number") totalHumans += app.currentPeopleCount;
              });
              // Convert hectares to acres (1 ha = 2.47105 acres)
              const totalAcres = Math.round(totalHectares * 2.47105);
              return (
                <>
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-[#7dd87d]">{projectCount}</p>
                    <p className="text-white/80 text-sm">Projects Applied</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-[#7dd87d]">{totalAcres.toLocaleString()}</p>
                    <p className="text-white/70 text-sm">Total Acres</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-[#7dd87d]">{totalFamilies.toLocaleString()}</p>
                    <p className="text-white/70 text-sm">Families</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-[#7dd87d]">{totalHumans.toLocaleString()}</p>
                    <p className="text-white/70 text-sm">Humans</p>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader>
            <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              Recent Project Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {applications && applications.length > 0 ? (
              <div className="divide-y divide-[#1a472a]/10">
                {applications.slice(0, 5).map((app: any) => (
                  <div key={app.id} className="p-4 hover:bg-[#f0ebe3]/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#1a472a]">{app.projectName}</p>
                        <p className="text-sm text-[#1a472a]/80">{app.location}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#1a472a]/75">
                <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No applications yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inquiry Summary by Type */}
        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader>
            <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              Inquiries by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(pathTypeConfig).map(([key, config]) => {
                const count = inquiriesByPath[key] || 0;
                return (
                  <div
                    key={key}
                    className="p-4 rounded-lg bg-[#f0ebe3] hover:bg-[#e8e3db] transition-colors cursor-pointer"
                    onClick={() =>
                      setActiveTab(
                        key === "finance" || key === "learn" ? "other" : key
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}
                      />
                      <div>
                        <p className="text-2xl font-bold text-[#1a472a]">{count}</p>
                        <p className="text-xs text-[#1a472a]/80">{config.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Season Overview */}
      {(() => {
        const now = Date.now();
        const SEASON_RANGES = [
          { label: "Season 1", start: new Date("2024-01-01"), end: new Date("2024-06-30") },
          { label: "Season 2", start: new Date("2024-07-01"), end: new Date("2024-12-31") },
          { label: "Season 3", start: new Date("2025-01-01"), end: new Date("2025-12-31") },
        ];
        return (
          <Card className="bg-white border-2 border-[#1a472a]/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#1a472a] text-base flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <Sprout className="w-4 h-4 text-[#4a7c59]" />
                Season Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {SEASON_RANGES.map((season) => {
                  const count = (applications || []).filter((a: any) => {
                    const d = new Date(a.submittedAt || a.createdAt);
                    return d >= season.start && d <= season.end;
                  }).length;
                  return (
                    <div key={season.label} className="text-center p-3 rounded-lg bg-[#f0ebe3]">
                      <p className="text-2xl font-bold text-[#1a472a]">{count}</p>
                      <p className="text-xs text-[#1a472a]/80 mt-0.5">{season.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Bioregion Breakdown */}
      {(() => {
        const bioregionCounts: Record<string, number> = {};
        (inquiries || []).forEach((i: any) => {
          if (i.pathType) {
            bioregionCounts[i.pathType] = (bioregionCounts[i.pathType] || 0) + 1;
          }
        });
        const entries = Object.entries(bioregionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        if (entries.length === 0) return null;
        const max = entries[0][1];
        return (
          <Card className="bg-white border-2 border-[#1a472a]/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#1a472a] text-base flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <BarChart2 className="w-4 h-4 text-[#4a7c59]" />
                Inquiry Breakdown by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {entries.map(([key, count]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-[#1a472a]/80 w-32 truncate capitalize">{key.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-2 bg-[#f0ebe3] rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-[#4a7c59] rounded-full"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#1a472a] w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Token Governance Panel */}
      <div>
        <h2 className="text-base font-semibold text-[#1a472a] mb-4 flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#4a7c59]" />
          Token Governance
        </h2>
        <AdminGovernancePanel />
      </div>
    </div>
  );
}
