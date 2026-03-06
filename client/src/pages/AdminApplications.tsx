import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, XCircle, AlertCircle, Eye } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

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
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    count: 0,
  },
};

export default function AdminApplications() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: applications, isLoading } = trpc.applications.list.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  if (authLoading || isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Login Required</h2>
          <p className="text-[#1a472a]/70 mb-6">
            You need to be logged in as an admin to access this page.
          </p>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
          >
            Login to Continue
          </Button>
        </Card>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Access Denied</h2>
          <p className="text-[#1a472a]/70 mb-6">
            You don't have permission to access this page.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  // Count applications by status
  const statusCounts = applications?.reduce((acc, app) => {
    if (app.status !== "draft") {
      acc[app.status] = (acc[app.status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const filterByStatus = (status: string) => {
    return applications?.filter(app => app.status === status) || [];
  };

  const ApplicationCard = ({ app }: { app: any }) => {
    const statusConfig = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
    if (!statusConfig) return null;
    
    const StatusIcon = statusConfig.icon;

    return (
      <Card
        className="p-4 md:p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate(`/admin/application/${app.id}`)}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
              <h3 className="text-lg md:text-xl font-bold text-[#1a472a]">
                {app.projectName}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
              >
                <StatusIcon className="w-3 h-3 md:w-4 md:h-4" />
                {statusConfig.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-[#1a472a]/70 mb-3">
              <span>{app.location}</span>
              <span className="hidden md:inline">•</span>
              <span className="capitalize">
                {app.projectType.replace("_", " ")}
              </span>
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
              <p className="text-[#1a472a]/80 line-clamp-2 text-sm md:text-base">
                {app.vision}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-[#7dd87d] text-[#4a7c59] w-full md:w-auto md:ml-4"
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
    <div className="min-h-screen bg-[#f0ebe3] py-6 md:py-12">
      <div className="container max-w-6xl px-4">
      <BackButton />
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-[#1a472a]">
              Application Reviews
            </h1>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/30 text-[#1a472a] w-fit"
              onClick={() => navigate('/admin')}
            >
              Back to Dashboard
            </Button>
          </div>
          <p className="text-[#1a472a]/70 text-sm md:text-base">
            Review and manage project applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = statusCounts[status] || 0;
            const StatusIcon = config.icon;
            
            return (
              <Card key={status} className="p-3 md:p-4 bg-white">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-4 h-4 md:w-5 md:h-5 ${config.color}`} />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-[#1a472a]">{count}</div>
                    <div className="text-[10px] md:text-xs text-[#1a472a]/60 leading-tight">{config.label}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Tabs by Status */}
        <Tabs defaultValue="submitted" className="w-full">
          <TabsList className="flex flex-wrap w-full gap-1 mb-4 md:mb-6 h-auto p-1">
            <TabsTrigger value="submitted" className="text-xs md:text-sm px-2 md:px-3 py-1.5">
              <span className="hidden sm:inline">Submitted</span><span className="sm:hidden">New</span> ({statusCounts.submitted || 0})
            </TabsTrigger>
            <TabsTrigger value="under_review" className="text-xs md:text-sm px-2 md:px-3 py-1.5">
              <span className="hidden sm:inline">Under Review</span><span className="sm:hidden">Review</span> ({statusCounts.under_review || 0})
            </TabsTrigger>
            <TabsTrigger value="changes_requested" className="text-xs md:text-sm px-2 md:px-3 py-1.5">
              Changes ({statusCounts.changes_requested || 0})
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs md:text-sm px-2 md:px-3 py-1.5">
              Approved ({statusCounts.approved || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs md:text-sm px-2 md:px-3 py-1.5">
              Rejected ({statusCounts.rejected || 0})
            </TabsTrigger>
          </TabsList>

          {Object.keys(STATUS_CONFIG).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {filterByStatus(status).length === 0 ? (
                <Card className="p-12 text-center bg-white">
                  <FileText className="w-16 h-16 text-[#1a472a]/30 mx-auto mb-4" />
                  <p className="text-[#1a472a]/70">
                    No applications with this status
                  </p>
                </Card>
              ) : (
                filterByStatus(status).map((app) => (
                  <ApplicationCard key={app.id} app={app} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
