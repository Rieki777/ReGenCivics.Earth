import React from "react";
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
  Landmark,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { ActivitySparkline } from "./ActivitySparkline";
import { AdminGovernancePanel } from "./AdminGovernancePanel";
import { AdminCSuiteBriefing } from "./AdminCSuiteBriefing";
import { AdminNeedsYou } from "./AdminNeedsYou";
import { AdminContinueRow } from "./AdminContinueRow";
import { inquiryTypeForPath } from "@/lib/adminInquiry";

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
  setActiveTab: (tab: string, extras?: { type?: string; open?: string }) => void;
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
      {/* Work waiting on you first. Everything else is context. */}
      <AdminNeedsYou onSelectTab={setActiveTab} inquiries={inquiries} applications={applications} />

      <AdminContinueRow onSelectTab={setActiveTab} />

      <Link
        href="/admin-create"
        className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] px-5 py-5 md:px-7 md:py-6 shadow-sm transition-all hover:from-[#2d5a3d] hover:to-[#4a7c59] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#7dd87d]/40"
      >
        <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#7dd87d]/20 text-[#7dd87d]">
          <Sprout className="w-6 h-6 md:w-7 md:h-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg md:text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            The Harvest
          </span>
          <span className="block text-sm md:text-base text-white">
            Compose, fact-check, and publish. Your content pipeline.
          </span>
        </span>
        <ArrowRight className="hidden sm:block w-6 h-6 flex-shrink-0 text-[#7dd87d] transition-transform group-hover:translate-x-1" />
      </Link>

      <Link
        href="/admin/funding"
        className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/30 px-5 py-5 md:px-7 md:py-6 hover:border-[#7dd87d]/70 hover:shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-[#7dd87d]/40"
      >
        <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d]">
          <Landmark className="w-6 h-6 md:w-7 md:h-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg md:text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Funding Pipeline
          </span>
          <span className="block text-sm md:text-base text-white">
            All 117 researched funders, where each application stands, and the positioning generator. Prepare an application to get a Cowork prompt you can run.
          </span>
        </span>
        <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#7dd87d] text-[#1a472a] font-bold px-5 py-3 min-h-11 flex-shrink-0 group-hover:bg-[#a8e6a8] transition-colors">
          Open
          <ArrowRight className="w-4 h-4" />
        </span>
      </Link>

      <AdminCSuiteBriefing onSelectTab={setActiveTab} />

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
          <CardDescription className="text-white/85">
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
                  <Link
                    key={app.id}
                    href={`/admin/application/${app.id}`}
                    className="block p-4 min-h-11 hover:bg-[#f0ebe3]/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1a472a] truncate">{app.projectName}</p>
                        <p className="text-sm text-[#1a472a]/80 truncate">{app.location}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 flex-shrink-0">
                        {app.status}
                      </Badge>
                    </div>
                  </Link>
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
                  <button
                    type="button"
                    key={key}
                    className="p-4 min-h-11 rounded-lg bg-[#f0ebe3] hover:bg-[#e8e3db] transition-colors text-left"
                    onClick={() => setActiveTab("inquiries", { type: inquiryTypeForPath(key) })}
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
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Season Overview */}
      {(() => {
        // Count by the stored season tag (applications.season, migration 0219).
        // Dates can't separate the cohorts: the Season 1 batch was seeded with
        // submittedAt 2026-03-14, after real Season 2 applications began arriving.
        const SEASONS = [
          { label: "Season 1", season: 1 },
          { label: "Season 2", season: 2 },
          { label: "Season 3", season: 3 },
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
                {SEASONS.map((season) => {
                  const count = (applications || []).filter((a: any) => a.season === season.season).length;
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
