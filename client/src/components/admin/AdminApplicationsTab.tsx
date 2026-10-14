import React, { Suspense, lazy, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sprout,
  Download,
  Search,
  Clock,
} from "lucide-react";
import { EmailTemplateSelector } from "@/components/EmailTemplateSelector";
import { AdminApplicationReviewForm } from "@/components/admin/AdminApplicationReviewForm";
import { ApplicationAnswersPanel } from "@/components/admin/ApplicationAnswersPanel";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BulkActionBar } from "./BulkActionBar";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { ImpactDataPanel } from "./ImpactDataPanel";
import { ADMIN_SEASON_CHIP, adminStatusChipClass } from "@/lib/adminContrast";
import { VoteInviteBacklogBar, VoteInvitePanel } from "./VoteInvitePanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

type StatusChange = Awaited<ReturnType<ReturnType<typeof trpc.applications.updateStatus.useMutation>["mutateAsync"]>>;

/** One line on what approval did: how many vote invites went out, and any that did not. */
export function approvalSummary(results: StatusChange[]): string | null {
  const handoffs = results.map((r) => r.handoff).filter((h): h is NonNullable<typeof h> => h != null);
  if (handoffs.length === 0) return null;
  const sent = handoffs.filter((h) => h.invite === "sent").length;
  const quiet = handoffs.filter((h) => h.invite === "not_requested").length;
  const notSent = handoffs.length - sent - quiet - handoffs.filter((h) => h.invite === "already_sent").length;
  const parts: string[] = [];
  if (sent) parts.push(`${sent} vote invite${sent === 1 ? "" : "s"} sent`);
  if (quiet) parts.push(`${quiet} approved without email`);
  if (notSent) parts.push(`${notSent} invite${notSent === 1 ? "" : "s"} not sent, see each application's panel`);
  return parts.length ? parts.join(", ") : null;
}

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
  // Bulk approve asks first, with the vote invite email on by default.
  const [approveIds, setApproveIds] = useState<number[] | null>(null);
  const [emailOnApprove, setEmailOnApprove] = useState(true);

  // Filter on the stored season tag (applications.season, migration 0219).
  // Dates can't separate the cohorts: the Season 1 batch was seeded with
  // submittedAt 2026-03-14 while Season 2 applications arrived from Feb 2026.
  function applySeasonFilter(apps: any[]): any[] {
    if (seasonFilter === "all") return apps;
    return apps.filter((a: any) => a.season === Number(seasonFilter));
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

    // Approve opens its own dialog, which asks about the vote invite email.
    if (action === 'approve') {
      setEmailOnApprove(true);
      setApproveIds(ids);
      return;
    }
    // Reject changes an applicant's outcome, so confirm it.
    if (action === 'reject') {
      if (!window.confirm(`Reject ${ids.length} application${ids.length === 1 ? '' : 's'}? This changes their status.`)) return;
    }
    await runBulk(ids, status);
  }

  async function runBulk(ids: number[], status: "under_review" | "approved" | "rejected", notify?: boolean) {
    setBulkPending(true);
    try {
      // One at a time: each approval sends an email, and the hourly limit is
      // shared, so a burst of parallel sends gains nothing.
      const results: StatusChange[] = [];
      for (const id of ids) results.push(await updateStatus.mutateAsync({ id, status, notify }));
      await utils.applications.list.invalidate();
      utils.applications.voteInviteBacklog.invalidate();
      const summary = approvalSummary(results);
      toast.success(`Updated ${ids.length} application${ids.length === 1 ? '' : 's'} to ${status.replace(/_/g, ' ')}${summary ? `. ${summary}.` : ''}`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(`Bulk update failed: ${e?.message || 'unknown error'}`);
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <>
    <AlertDialog open={approveIds != null} onOpenChange={(open) => { if (!open) setApproveIds(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Approve {approveIds?.length ?? 0} application{approveIds?.length === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Each project gets its Land Projects forum thread. With the email on, each applicant also gets the
            call time vote invite: a link to vote on the Season Schedule and how to join the calls.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-3 text-sm text-[#1a472a] min-h-11">
          <Checkbox checked={emailOnApprove} onCheckedChange={(v) => setEmailOnApprove(v === true)} />
          Email each applicant the call time vote invite
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const ids = approveIds ?? [];
              setApproveIds(null);
              void runBulk(ids, "approved", emailOnApprove);
            }}
          >
            {emailOnApprove ? "Approve and email" : "Approve quietly"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
                <span className="text-[#1a472a]/75">
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
              className="border-[#7dd87d] text-[#1a472a] w-fit min-h-11"
              onClick={() => exportToCSV(applications || [], "project_applications")}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        <VoteInviteBacklogBar />
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/75" />
            <input
              type="text"
              placeholder="Search by project name, location, or vision..."
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              className="w-full min-h-11 pl-9 pr-4 py-2 text-sm border border-[#1a472a]/60 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
            />
          </div>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="text-sm border border-[#1a472a]/60 rounded-lg px-3 py-2 bg-white text-[#1a472a] focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
          >
            <option value="all">All Seasons</option>
            <option value="1">Season 1</option>
            <option value="2">Season 2</option>
            <option value="3">Season 3</option>
          </select>
        </div>
        {filteredApps.length !== (applications?.length || 0) && (
          <p className="text-xs text-[#1a472a]/75 pt-1">
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
                <Sheet key={app.id}>
                  <SheetTrigger asChild>
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
                              {app.season != null && (
                                <span className={ADMIN_SEASON_CHIP}>
                                  Season {app.season}
                                </span>
                              )}
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
                              <p className="text-sm text-[#1a472a]/75 mt-2 line-clamp-2">
                                {app.vision}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${adminStatusChipClass(app.status)}`}
                          >
                            {app.status?.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ageApp.bg} ${ageApp.color}`}
                          >
                            {ageApp.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                            {app.submittedAt ? ageApp.label : "Draft"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full overflow-hidden bg-[#f8f5f0] text-[#1a472a]">
                    <SheetHeader className="shrink-0 px-6 pt-6">
                      <SheetTitle
                        className="text-[#1a472a]"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {app.projectName}
                      </SheetTitle>
                      <SheetDescription className="text-[#1a472a]/80">{app.location}</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 py-4">
                      <VoteInvitePanel applicationId={app.id} status={app.status} />
                      <ApplicationAnswersPanel application={app} />
                      <Suspense fallback={null}>
                        <ActivityTimeline
                          email={app.contactEmail || ""}
                          contactType="project_application"
                          contactId={app.id}
                        />
                      </Suspense>
                      <ApplicationTimeline applicationId={app.id} />
                      <ImpactDataPanel applicationId={app.id} />
                      <EmailHistoryPanelComp email={app.contactEmail || ""} />
                      <ContactNotesPanel contactType="project_application" contactId={app.id} />
                      <ContactTagsPanel contactType="project_application" contactId={app.id} />
                      <ReminderPanel contactType="project_application" contactId={app.id} />
                    </div>
                    <SheetFooter className="shrink-0 border-t border-[#1a472a]/10 px-6 py-4 flex-col gap-2 bg-[#f8f5f0]">
                      <AssigneeSelect contactType="project_application" contactId={app.id} />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <EmailTemplateSelector
                          recipientEmail={app.contactEmail || ""}
                          recipientName={app.contactName || app.projectName || ""}
                          contextSubject={app.projectName}
                          inquiryType="project"
                          className="w-full sm:w-auto"
                        />
                        <div className="w-full">
                          <AdminApplicationReviewForm applicationId={app.id} />
                        </div>
                      </div>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-[#1a472a]/75">
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
                      <Sprout className="w-4 h-4 text-[#1a472a]/75" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1a472a]/80 text-sm">
                        {app.projectName || "Unnamed project"}
                      </p>
                      <p className="text-xs text-[#1a472a]/75">
                        {app.location || "No location"} · Started{" "}
                        {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-[#3d4a3d] text-[#f8f5f0]">
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
