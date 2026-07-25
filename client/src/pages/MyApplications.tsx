import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, Plus, XCircle, AlertCircle } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { BackButton } from "@/components/BackButton";

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
};

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
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
          >
            Login to Continue
          </Button>
        </Card>
      </div>
    );
  }

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
          </div>
          <Link href="/apply">
            <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </Link>
        </div>

        {/* Applications List */}
        {!applications || applications.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <FileText className="w-16 h-16 text-[#1a472a]/75 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1a472a] mb-2">
              No Applications Yet
            </h2>
            <p className="text-[#1a472a]/75 mb-6">
              Start your journey by submitting your first application
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
              const statusConfig = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = statusConfig.icon;

              return (
                <Card
                  key={app.id}
                  className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/apply/status`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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

                    <Button
                      variant="outline"
                      className="border-[#7dd87d] text-[#4a7c59] ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/apply/status`);
                      }}
                    >
                      View Details
                    </Button>
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
