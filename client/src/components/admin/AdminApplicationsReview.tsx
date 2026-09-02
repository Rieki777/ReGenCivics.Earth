import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, XCircle, AlertCircle, Eye, Mail, Search } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { useLocation } from "wouter";
import { ApplicantStatusEmailDialog } from "@/components/admin/ApplicantStatusEmailDialog";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  submitted: {
    icon: Clock,
    label: "Submitted",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    count: 0,
  },
  under_review: {
    icon: Clock,
    label: "Under Review",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    count: 0,
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-green-600",
    bgColor: "bg-green-100",
    count: 0,
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
    count: 0,
  },
  changes_requested: {
    icon: AlertCircle,
    label: "Changes Requested",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    count: 0,
  },
};

const STATUS_KEYS = Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[];

function statusFromSearch(): keyof typeof STATUS_CONFIG | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("status");
    if (raw && raw in STATUS_CONFIG) return raw as keyof typeof STATUS_CONFIG;
  } catch {
    /* ignore */
  }
  return null;
}

export function AdminApplicationsReview() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<keyof typeof STATUS_CONFIG>(
    () => statusFromSearch() || "submitted",
  );
  const autoPicked = useRef(Boolean(statusFromSearch()));
  const [emailOpen, setEmailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: applications, isLoading } = trpc.applications.list.useQuery();

  const statusCounts =
    applications?.reduce(
      (acc, app) => {
        if (app.status !== "draft") {
          acc[app.status] = (acc[app.status] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("status", activeTab);
      window.history.replaceState({}, "", url.pathname + url.search);
    } catch {
      /* history unavailable */
    }
  }, [activeTab]);

  useEffect(() => {
    if (autoPicked.current || !applications) return;
    const firstWithItems = STATUS_KEYS.find((key) => (statusCounts[key] || 0) > 0);
    if (firstWithItems) setActiveTab(firstWithItems);
    autoPicked.current = true;
  }, [applications, statusCounts]);

  const needle = search.trim().toLowerCase();
  const filterByStatus = (status: string) => {
    const rows = applications?.filter((app) => app.status === status) || [];
    if (!needle) return rows;
    return rows.filter((app) => {
      const hay = `${app.projectName ?? ""} ${app.location ?? ""} ${app.vision ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  };

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <TaoSpinner size={56} />
      </div>
    );
  }

  const ApplicationCard = ({ app }: { app: { id: number; projectName: string; location: string; projectType: string; submittedAt?: string | Date | null; vision?: string | null; status: string } }) => {
    const statusConfig = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
    if (!statusConfig) return null;

    const StatusIcon = statusConfig.icon;

    return (
      <Card
        className="p-4 md:p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate(`/admin/application/${app.id}`)}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
              <h3 className="text-lg md:text-xl font-bold text-[#1a472a]">{app.projectName}</h3>
              <span
                className={`inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
              >
                <StatusIcon className="w-3 h-3 md:w-4 md:h-4" />
                {statusConfig.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-[#1a472a]/75 mb-3">
              <span>{app.location}</span>
              <span className="hidden md:inline">•</span>
              <span className="capitalize">{app.projectType.replace("_", " ")}</span>
              {app.submittedAt && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="text-xs">
                    Submitted {new Date(app.submittedAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>

            {app.vision && (
              <p className="text-[#1a472a]/80 line-clamp-2 text-sm md:text-base">{app.vision}</p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-[#7dd87d] text-[#4a7c59] w-full md:w-auto md:ml-4 min-h-11"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/application/${app.id}`);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Review
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as keyof typeof STATUS_CONFIG)}
        className="w-full"
      >
        <TabsList
          aria-label="Filter applications by review status"
          className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 w-full h-auto bg-transparent p-0 mb-4 md:mb-6"
        >
          {STATUS_KEYS.map((status) => {
            const config = STATUS_CONFIG[status];
            const count = statusCounts[status] || 0;
            const StatusIcon = config.icon;
            return (
              <TabsTrigger
                key={status}
                value={status}
                className={cn(
                  "h-auto min-h-11 w-full flex-none p-3 md:p-4 rounded-xl border bg-white shadow-none",
                  "flex items-center justify-start gap-2 md:gap-3 text-left whitespace-normal",
                  "text-[#1a472a] hover:bg-[#f8faf8]",
                  "dark:text-[#1a472a] dark:bg-white dark:hover:bg-[#f8faf8]",
                  "data-[state=active]:bg-[#f0f7f0] data-[state=active]:text-[#1a472a]",
                  "dark:data-[state=active]:bg-[#f0f7f0] dark:data-[state=active]:text-[#1a472a]",
                  "data-[state=active]:border-[#1a472a] data-[state=active]:ring-2 data-[state=active]:ring-[#1a472a]/25",
                  "data-[state=inactive]:border-[#1a472a]/15",
                  "[&_svg]:size-4 md:[&_svg]:size-5",
                )}
              >
                <span
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <StatusIcon className={`w-4 h-4 md:w-5 md:h-5 ${config.color}`} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl md:text-2xl font-bold tabular-nums leading-none">
                    {count}
                  </span>
                  <span className="block text-[10px] md:text-xs font-medium text-[#1a472a] leading-tight mt-1">
                    {config.label}
                  </span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/75 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project, location, or vision"
            aria-label="Search applications"
            className="w-full min-h-11 pl-9 pr-4 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-sm md:text-base text-[#1a472a] font-medium">
            {STATUS_CONFIG[activeTab].label}: {statusCounts[activeTab] || 0}
            {needle ? ` matching "${search.trim()}"` : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-[#1a472a]/30 text-[#1a472a] w-full sm:w-auto min-h-11"
            disabled={(statusCounts[activeTab] || 0) === 0}
            onClick={() => setEmailOpen(true)}
            aria-label={`Email ${STATUS_CONFIG[activeTab].label} applicants`}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email these applicants ({statusCounts[activeTab] || 0})
          </Button>
        </div>

        {STATUS_KEYS.map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filterByStatus(status).length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <FileText className="w-16 h-16 text-[#1a472a]/75 mx-auto mb-4" />
                <p className="text-[#1a472a]/75">
                  {needle ? "No applications match this search" : "No applications with this status"}
                </p>
              </Card>
            ) : (
              filterByStatus(status).map((app) => <ApplicationCard key={app.id} app={app} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
      <ApplicantStatusEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        status={activeTab}
        statusLabel={STATUS_CONFIG[activeTab].label}
        applicationCount={statusCounts[activeTab] || 0}
      />
    </div>
  );
}

export default AdminApplicationsReview;
