import type { MouseEvent } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, Plus, XCircle, AlertCircle } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Link, useLocation } from "wouter";
import { BackButton } from "@/components/BackButton";
import { projectPathForApplication } from "@shared/projectKey";

/**
 * Build spec bundle 1, section 16.3. /campaigns' "For land projects" block
 * sends founders who are already running a campaign here, so an accepted
 * row opens its project page and the campaign wizard, and a status this map
 * does not know (active and inactive were missing until 2026-10-09) falls
 * back to the draft look instead of taking the whole page down.
 */
const ROW_LINKS = {
  project: "Open your project page",
  start: "Start your campaign",
} as const;

/** Shown in place of "New Application" once an application was accepted (section 15, question 12). */
const ONE_PER_ACCOUNT = {
  lead: "One application per account for now. To bring another land project, ",
  link: "write to us",
} as const;

/** Statuses that mean the application was accepted at some point. */
const ACCEPTED_STATUSES = ["approved", "active", "inactive"];
/** Statuses whose project page and campaign wizard are open to the founder. */
const CAN_START_STATUSES = ["approved", "active"];

const STATUS_CONFIG = {
  draft: {
    icon: FileText,
    label: "Draft",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  submitted: {
    icon: Clock,
    label: "Submitted",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  under_review: {
    icon: Clock,
    label: "Under Review",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  changes_requested: {
    icon: AlertCircle,
    label: "Changes Requested",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  active: {
    icon: CheckCircle2,
    label: "Accepted, taking part",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  inactive: {
    icon: Clock,
    label: "Paused",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
};

function statusConfigFor(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
}

export default function MyApplications() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: applications, isLoading } = trpc.applications.myApplications.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (authLoading || isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Login Required</h2>
          <p className="text-[#1a472a]/75 mb-6">
            You need to be logged in to view your applications.
          </p>
          <Button asChild className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] min-h-11">
            <Link href="/sign-in?returnTo=%2Fmy-applications">Login to Continue</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const hasAccepted = (applications ?? []).some((app) => ACCEPTED_STATUSES.includes(app.status));

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-12">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1a472a] mb-2">
              My Applications
            </h1>
            <p className="text-[#1a472a]/75">
              Track your project applications and their status
            </p>
            {hasAccepted && (
              <p className="text-[#1a472a]/80 mt-3">
                {ONE_PER_ACCOUNT.lead}
                <Link href="/connect" className="underline underline-offset-4 font-medium text-[#1a472a]">
                  {ONE_PER_ACCOUNT.link}
                </Link>
                .
              </p>
            )}
          </div>
          {!hasAccepted && (
            <Link href="/apply">
              <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
                <Plus className="w-4 h-4 mr-2" />
                New Application
              </Button>
            </Link>
          )}
        </div>

        {/* Applications List */}
        {!applications || applications.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <FileText className="w-16 h-16 text-[#1a472a]/75 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1a472a] mb-2">
              No Applications Yet
            </h2>
            <p className="text-[#1a472a]/75 mb-6">
              Start by submitting your first application
            </p>
            <Link href="/apply">
              <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
                <Plus className="w-4 h-4 mr-2" />
                Create Application
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const statusConfig = statusConfigFor(app.status);
              const StatusIcon = statusConfig.icon;
              const canStart = CAN_START_STATUSES.includes(app.status);
              const stop = (e: MouseEvent) => e.stopPropagation();

              return (
                <Card
                  key={app.id}
                  className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/apply/status`)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-[#1a472a]">
                          {app.projectName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[#1a472a]/75 mb-3">
                        <span>{app.location}</span>
                        <span>•</span>
                        <span className="capitalize">
                          {app.projectType.replace("_", " ")}
                        </span>
                        {app.submittedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Submitted {new Date(app.submittedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>

                      {app.vision && (
                        <p className="text-[#1a472a]/80 line-clamp-2">
                          {app.vision}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch sm:ml-4 shrink-0">
                      {canStart && (
                        <>
                          <Button asChild className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] min-h-11">
                            <Link href={projectPathForApplication(app.id, app.projectName)} onClick={stop}>
                              {ROW_LINKS.project}
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="border-[#7dd87d] text-[#4a7c59] min-h-11">
                            <Link href={`/create-campaign?application=${app.id}`} onClick={stop}>
                              {ROW_LINKS.start}
                            </Link>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="border-[#7dd87d] text-[#4a7c59] min-h-11"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/apply/status`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
