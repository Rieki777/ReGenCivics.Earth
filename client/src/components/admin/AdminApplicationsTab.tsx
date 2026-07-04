import React, { Suspense, lazy, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sprout,
  Download,
  Search,
  Clock,
  Globe,
  ExternalLink,
  FileText,
} from "lucide-react";
import { EmailTemplateSelector } from "@/components/EmailTemplateSelector";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BulkActionBar } from "./BulkActionBar";
import { ApplicationTimeline } from "./ApplicationTimeline";

const ActivityTimeline = lazy(() =>
  import("@/components/ActivityTimeline").then((m) => ({ default: m.ActivityTimeline }))
);

function getAgeInfo(createdAt: string | Date): {
  label: string;
  color: string;
  bg: string;
  isOverdue: boolean;
} {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageH = ageMs / 3_600_000;
  if (ageH < 24)
    return {
      label: `${Math.round(ageH)}h ago`,
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
      isOverdue: false,
    };
  if (ageH < 48)
    return {
      label: `${Math.floor(ageH / 24)}d ago`,
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      isOverdue: false,
    };
  return {
    label: `${Math.floor(ageH / 24)}d, overdue`,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    isOverdue: true,
  };
}

function csvRow(cells: any[]) {
  return cells
    .map(
      (c: any) =>
        `"${String(c ?? "")
          .replace(/"/g, '""')
          .replace(/[\n\r]/g, " ")}"`
    )
    .join(",");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportToCSV(data: any[], filename: string) {
  if (!data.length) {
    toast.error("No data to export");
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => csvRow(headers.map((h) => row[h])));
  downloadCSV([csvRow(headers), ...rows].join("\n"), filename);
}

// Panels imported inline to keep state in Admin.tsx
function EmailHistoryPanel({ email }: { email: string }) {
  return null; // rendered via Admin.tsx internal functions
}

interface Props {
  applications: any[] | undefined;
  draftApplications: any[] | undefined;
  filteredApps: any[];
  appSearch: string;
  setAppSearch: (v: string) => void;
  showDrafts: boolean;
  setShowDrafts: (v: boolean) => void;
  ContactNotesPanel: React.ComponentType<{ contactType: string; contactId: number }>;
  ContactTagsPanel: React.ComponentType<{ contactType: string; contactId: number }>;
  ReminderPanel: React.ComponentType<{ contactType: string; contactId: number }>;
  AssigneeSelect: React.ComponentType<{ contactType: string; contactId: number }>;
  EmailHistoryPanelComp: React.ComponentType<{ email: string }>;
}

export function AdminApplicationsTab({
  applications,
  draftApplications,
  filteredApps,
  appSearch,
  setAppSearch,
  showDrafts,
  setShowDrafts,
  ContactNotesPanel,
  ContactTagsPanel,
  ReminderPanel,
  AssigneeSelect,
  EmailHistoryPanelComp,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Persist the season filter so it survives tab switches and reloads.
  const [seasonFilter, setSeasonFilter] = useState<string>(() => {
    try { return localStorage.getItem("admin_app_season_filter") || "all"; } catch { return "all"; }
  });
  useEffect(() => {
    try { localStorage.setItem("admin_app_season_filter", seasonFilter); } catch { /* storage blocked */ }
  }, [seasonFilter]);
  const utils = trpc.useUtils();
  const updateStatus = trpc.applications.updateStatus.useMutation();
  const [bulkPending, setBulkPending] = useState(false);

  // Season date ranges (approximate)
  const SEASON_RANGES: Record<string, { start: Date; end: Date }> = {
    "1": { start: new Date("2024-01-01"), end: new Date("2024-06-30") },
    "2": { start: new Date("2024-07-01"), end: new Date("2024-12-31") },
    "3": { start: new Date("2025-01-01"), end: new Date("2025-12-31") },
  };

  function applySeasonFilter(apps: any[]): any[] {
    if (seasonFilter === "all") return apps;
    const range = SEASON_RANGES[seasonFilter];
    if (!range) return apps;
    return apps.filter((a: any) => {
      const d = new Date(a.submittedAt || a.createdAt);
      return d >= range.start && d <= range.end;
    });
  }

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkAction(action: string) {
    if (action === 'export-csv') {
      const selected = (applications || []).filter((a: any) => selectedIds.has(a.id));
      exportToCSV(selected, 'selected_applications');
      setSelectedIds(new Set());
      return;
    }

    const statusMap: Record<string, "under_review" | "approved" | "rejected"> = {
      'move-reviewed': 'under_review',
      'approve': 'approved',
      'reject': 'rejected',
    };
    const status = statusMap[action];
    const ids = Array.from(selectedIds);
    if (!status || ids.length === 0) { setSelectedIds(new Set()); return; }

    // Approve/reject change an applicant's outcome, so confirm them.
    if (action === 'approve' || action === 'reject') {
      const verb = action === 'approve' ? 'Approve' : 'Reject';
      if (!window.confirm(`${verb} ${ids.length} application${ids.length === 1 ? '' : 's'}? This changes their status.`)) return;
    }

    setBulkPending(true);
    try {
      await Promise.all(ids.map((id) => updateStatus.mutateAsync({ id, status })));
      await utils.applications.list.invalidate();
      toast.success(`Updated ${ids.length} application${ids.length === 1 ? '' : 's'} to ${status.replace(/_/g, ' ')}`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(`Bulk update failed: ${e?.message || 'unknown error'}`);
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <>
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle
              className="text-[#1a472a] flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Sprout className="w-5 h-5 text-[#4a7c59]" />
              Project Applications
            </CardTitle>
            <CardDescription className="mt-1">
              {applications?.length || 0} submitted
              {(draftApplications?.length || 0) > 0 && (
                <span className="text-[#1a472a]/70">
                  {" "}
                  · {draftApplications?.length} draft
                  {draftApplications?.length !== 1 ? "s" : ""}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#7dd87d] text-[#1a472a] w-fit"
              onClick={() => exportToCSV(applications || [], "project_applications")}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/30 text-[#1a472a]"
              asChild
            >
              <a href="/admin/applications">Full Review Page</a>
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/65" />
            <input
              type="text"
              placeholder="Search by project name, location, or vision..."
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/65 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
            />
          </div>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="text-sm border border-[#1a472a]/20 rounded-lg px-3 py-2 bg-white text-[#1a472a] focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
          >
            <option value="all">All Seasons</option>
            <option value="1">Season 1</option>
            <option value="2">Season 2</option>
            <option value="3">Season 3</option>
          </select>
        </div>
        {filteredApps.length !== (applications?.length || 0) && (
          <p className="text-xs text-[#1a472a]/70 pt-1">
            Showing {filteredApps.length} of {applications?.length || 0} applications
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {applications === undefined ? (
          <div className="divide-y divide-[#1a472a]/10">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d]/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#1a472a]/10 rounded w-1/3" />
                    <div className="h-3 bg-[#1a472a]/10 rounded w-1/4" />
                    <div className="h-3 bg-[#1a472a]/10 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : applications && applications.length > 0 ? (
          <div className="divide-y divide-[#1a472a]/10">
            {applySeasonFilter(filteredApps).map((app: any) => {
              const ageApp = getAgeInfo(app.submittedAt || app.createdAt || new Date());
              return (
                <Dialog key={app.id}>
                  <DialogTrigger asChild>
                    <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(app.id)}
                            onClick={(e) => toggleSelect(app.id, e)}
                            onChange={() => {}}
                            className="mt-2.5 flex-shrink-0 cursor-pointer accent-[#1a472a]"
                            aria-label={`Select ${app.projectName}`}
                          />
                          <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                            <Sprout className="w-5 h-5 text-[#1a472a]" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1a472a]">{app.projectName}</p>
                            <p className="text-sm text-[#1a472a]/80">{app.location}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {app.projectSizeHectares && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-50 border-green-200"
                                >
                                  {app.projectSizeHectares} ha (
                                  {(app.projectSizeHectares * 2.471).toFixed(0)} acres)
                                </Badge>
                              )}
                            </div>
                            {app.vision && (
                              <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                {app.vision}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            className={
                              app.status === "submitted"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : app.status === "under_review"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : app.status === "approved"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : app.status === "rejected"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {app.status?.replace(/_/g, " ")}
                          </Badge>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ageApp.bg} ${ageApp.color}`}
                          >
                            {ageApp.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                            {app.submittedAt ? ageApp.label : "Draft"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle
                        className="text-[#1a472a]"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {app.projectName}
                      </DialogTitle>
                      <DialogDescription>{app.location}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {app.vision && (
                        <div>
                          <Label className="text-sm font-semibold text-[#1a472a]">Vision</Label>
                          <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">
                            {app.vision}
                          </p>
                        </div>
                      )}
                      {app.teamDescription && (
                        <div>
                          <Label className="text-sm font-semibold text-[#1a472a]">
                            Team Description
                          </Label>
                          <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">
                            {app.teamDescription}
                          </p>
                        </div>
                      )}
                      {(app.websiteUrl || app.videoUrl) && (
                        <div className="flex gap-4">
                          {app.websiteUrl && (
                            <a
                              href={app.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-4 h-4" /> Website
                            </a>
                          )}
                          {app.videoUrl && (
                            <a
                              href={app.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" /> Video
                            </a>
                          )}
                        </div>
                      )}
                      <Suspense fallback={null}>
                        <ActivityTimeline
                          email={app.contactEmail || ""}
                          contactType="project_application"
                          contactId={app.id}
                        />
                      </Suspense>
                      <ApplicationTimeline applicationId={app.id} />
                      <EmailHistoryPanelComp email={app.contactEmail || ""} />
                      <ContactNotesPanel contactType="project_application" contactId={app.id} />
                      <ContactTagsPanel contactType="project_application" contactId={app.id} />
                      <ReminderPanel contactType="project_application" contactId={app.id} />
                    </div>
                    <DialogFooter className="flex-col gap-2">
                      <AssigneeSelect contactType="project_application" contactId={app.id} />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <EmailTemplateSelector
                          recipientEmail={app.contactEmail || ""}
                          recipientName={app.contactName || ""}
                          contextSubject={app.projectName}
                          inquiryType="project"
                          className="w-full sm:w-auto"
                        />
                        <Link href={`/admin/application/${app.id}`}>
                          <Button className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:w-auto">
                            <FileText className="w-4 h-4 mr-2" />
                            Review Project
                          </Button>
                        </Link>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-[#1a472a]/70">
            <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No project applications yet</p>
          </div>
        )}

        {(draftApplications?.length || 0) > 0 && (
          <div className="border-t border-[#1a472a]/10">
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#1a472a]/80 hover:bg-[#f0ebe3]/30 transition-colors"
            >
              <span className="font-medium">
                {draftApplications?.length} incomplete draft
                {draftApplications?.length !== 1 ? "s" : ""} (not yet submitted)
              </span>
              <span className="text-xs">{showDrafts ? "Hide" : "Show"}</span>
            </button>
            {showDrafts && (
              <div className="divide-y divide-[#1a472a]/10 bg-[#f9f7f4]/50">
                {draftApplications?.map((app: any) => (
                  <div key={app.id} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a472a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sprout className="w-4 h-4 text-[#1a472a]/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1a472a]/80 text-sm">
                        {app.projectName || "Unnamed project"}
                      </p>
                      <p className="text-xs text-[#1a472a]/70">
                        {app.location || "No location"} · Started{" "}
                        {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">
                      draft
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    <BulkActionBar
      selectedCount={selectedIds.size}
      entityType="applications"
      onAction={handleBulkAction}
      onClear={() => setSelectedIds(new Set())}
      busy={bulkPending}
    />
    </>
  );
}
