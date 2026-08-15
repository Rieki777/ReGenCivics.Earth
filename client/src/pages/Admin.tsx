import { useState, useEffect, lazy, Suspense } from "react";
import SEO from "@/components/SEO";
import { AdminAIAssistant, type AdminAIAction } from "@/components/AdminAIAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Lock,
  FileText,
  Users,
  TrendingUp,
  MessageSquare,
  Eye,
  Calendar,
  Mail,
  MapPin,
  Building,
  Briefcase,
  Heart,
  Sprout,
  Phone,
  Home as HomeIcon,
  UserCheck,
  HelpCircle,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Edit,
  Settings,
  Palette,
  Globe,
  Handshake,
  Sparkles,
  X,
  Search,
  CheckCheck,
  AlertTriangle,
  DollarSign,
  Filter,
  RefreshCw,
  Send,
  Clock,
  Radio,
  BookOpen,
  AlignJustify,
  Bell,
  ClipboardList,
  ChevronDown,
  Menu,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Link } from "wouter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { toast } from "sonner";
import { EmailTemplateSelector, emailTemplates } from "@/components/EmailTemplateSelector";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { EmailSettings } from "@/components/EmailSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";
const ActivityTimeline = lazy(() => import("@/components/ActivityTimeline").then(m => ({ default: m.ActivityTimeline })));
import KnowledgeMapAdminPanel from "@/components/KnowledgeMapAdminPanel";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { ShortcutHelpOverlay } from "@/components/admin/ShortcutHelpOverlay";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { AdminNotificationCenter } from "@/components/admin/AdminNotificationCenter";
import { AdminGovernancePanel } from "@/components/admin/AdminGovernancePanel";
import { AdminCitizenshipTiers } from "@/components/admin/AdminCitizenshipTiers";
import { EmailHistoryPanel } from "@/components/admin/EmailHistoryPanel";
// Tab bodies load on demand — only the active tab's chunk is fetched, keeping
// the initial /admin payload small. The Overview tab stays eager (it is the
// landing view). Named exports are unwrapped to the default lazy() expects.
const AdminApplicationsTab = lazy(() => import("@/components/admin/AdminApplicationsTab").then(m => ({ default: m.AdminApplicationsTab })));
const AdminAnalyticsTab = lazy(() => import("@/components/admin/AdminAnalyticsTab").then(m => ({ default: m.AdminAnalyticsTab })));
const AdminNewsletterTab = lazy(() => import("@/components/admin/AdminNewsletterTab").then(m => ({ default: m.AdminNewsletterTab })));
const AdminSettingsTab = lazy(() => import("@/components/admin/AdminSettingsTab").then(m => ({ default: m.AdminSettingsTab })));
const AdminInvestorsTab = lazy(() => import("@/components/admin/AdminInvestorsTab").then(m => ({ default: m.AdminInvestorsTab })));
const AdminAllianceTab = lazy(() => import("@/components/admin/AdminAllianceTab").then(m => ({ default: m.AdminAllianceTab })));
const AdminCreateTab = lazy(() => import("@/components/admin/AdminAllianceTab").then(m => ({ default: m.AdminCreateTab })));
const AdminLiveTab = lazy(() => import("@/components/admin/AdminAllianceTab").then(m => ({ default: m.AdminLiveTab })));
const AdminRoleTab = lazy(() => import("@/components/admin/AdminAllianceTab").then(m => ({ default: m.AdminRoleTab })));
const AdminRolesTab = lazy(() => import("@/components/admin/AdminAllianceTab").then(m => ({ default: m.AdminRolesTab })));
const AdminOtherInquiriesTab = lazy(() => import("@/components/admin/AdminOtherInquiriesTab").then(m => ({ default: m.AdminOtherInquiriesTab })));
const AdminSeedsClaimsTab = lazy(() => import("@/components/admin/AdminSeedsClaimsTab").then(m => ({ default: m.AdminSeedsClaimsTab })));
const AdminKanbanTab = lazy(() => import("@/components/admin/AdminKanbanTab").then(m => ({ default: m.AdminKanbanTab })));
const AdminCrowdpoolingTab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminCrowdpoolingTab })));
const AdminBroadcastTab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminBroadcastTab })));
const AdminLOITab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminLOITab })));
const AdminBannersTab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminBannersTab })));
const AdminImagesTab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminImagesTab })));
const AdminCustomGamesTab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminCustomGamesTab })));
const AdminWidgetsTab = lazy(() => import("@/components/admin/AdminSimpleTabs").then(m => ({ default: m.AdminWidgetsTab })));
const AdminRoleHoldersTab = lazy(() => import("@/components/admin/AdminRoleHoldersTab").then(m => ({ default: m.AdminRoleHoldersTab })));
const AdminTasksTab = lazy(() => import("@/components/admin/AdminTasksTab").then(m => ({ default: m.AdminTasksTab })));
const AdminEditsTab = lazy(() => import("@/components/admin/AdminEditsTab"));

// ─── Audit Log Tab ─────────────────────────────────────────────────────────────
const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 },
];

function formatRelativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function AdminAuditLogTab() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: entries, isLoading } = trpc.admin.auditLog.useQuery({ limit: 100 });

  const now = Date.now();
  const filtered = (entries ?? []).filter((entry: any) => {
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
    if (dateRangeDays > 0) {
      const age = now - new Date(entry.createdAt).getTime();
      if (age > dateRangeDays * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const uniqueActions = Array.from(new Set((entries ?? []).map((e: any) => e.action as string))).sort();

  return (
    <Card className="bg-white border border-[#1a472a]/10">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <ClipboardList className="w-5 h-5" />
            Audit Log
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="bg-white border border-[#1a472a]/20 rounded-lg px-3 py-1.5 text-[#1a472a] text-sm"
            >
              <option value="all">All actions</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={dateRangeDays}
              onChange={e => setDateRangeDays(Number(e.target.value))}
              className="bg-white border border-[#1a472a]/20 rounded-lg px-3 py-1.5 text-[#1a472a] text-sm"
            >
              {DATE_RANGE_OPTIONS.map(o => (
                <option key={o.days} value={o.days}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#1a472a]/80" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-[#1a472a]/80 text-sm py-12">No admin actions recorded yet.</p>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a472a]/10 text-xs uppercase tracking-wide text-[#1a472a]/80">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Admin</th>
                  <th className="text-left px-4 py-2.5 font-medium">Action</th>
                  <th className="text-left px-4 py-2.5 font-medium">Entity</th>
                  <th className="text-left px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a472a]/5">
                {filtered.map((entry: any) => {
                  const createdAt = new Date(entry.createdAt);
                  const isExpanded = expandedRow === entry.id;
                  return (
                    <>
                      <tr
                        key={entry.id}
                        className="hover:bg-[#f5f9f5] cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                      >
                        <td className="px-4 py-3 text-[#1a472a]/75 whitespace-nowrap">
                          <span title={createdAt.toLocaleString()}>
                            {formatRelativeTime(createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1a472a]/75">#{entry.adminUserId}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-[#1a472a]/10 text-[#1a472a] text-xs px-2 py-0.5 rounded font-mono">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1a472a]/75">
                          {entry.entityType && (
                            <span>
                              {entry.entityType}
                              {entry.entityId ? ` #${entry.entityId}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#1a472a] max-w-xs truncate">
                          {entry.description ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          {entry.metadata && (
                            <ChevronDown
                              className={`w-4 h-4 text-[#1a472a]/80 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          )}
                        </td>
                      </tr>
                      {isExpanded && entry.metadata && (
                        <tr key={`${entry.id}-meta`} className="bg-[#f0f7f0]">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="text-xs text-[#1a472a]/80 whitespace-pre-wrap font-mono bg-white border border-[#1a472a]/10 rounded-lg p-3 overflow-x-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin: Custom Game Waitlist ──────────────────────────────────────────────
function AdminCustomGameWaitlist() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: inquiries, refetch } = trpc.customGameInquiries.list.useQuery({});
  const updateMut = trpc.customGameInquiries.updateStatus.useMutation({ onSuccess: () => refetch() });

  const filtered = (inquiries ?? []).filter(
    (i: any) => statusFilter === "all" || i.status === statusFilter
  );

  const STATUS_COLORS: Record<string, string> = {
    waitlist: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    intro_scheduled: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    in_progress: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    declined: "bg-red-500/20 text-red-300 border-red-500/30",
    completed: "bg-green-500/20 text-green-300 border-green-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Custom Game Waitlist</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1a472a] border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm"
        >
          <option value="all" className="bg-[#1a472a] text-white">All</option>
          <option value="waitlist" className="bg-[#1a472a] text-white">Waitlist</option>
          <option value="intro_scheduled" className="bg-[#1a472a] text-white">Intro Scheduled</option>
          <option value="in_progress" className="bg-[#1a472a] text-white">In Progress</option>
          <option value="declined" className="bg-[#1a472a] text-white">Declined</option>
          <option value="completed" className="bg-[#1a472a] text-white">Completed</option>
        </select>
      </div>

      {!filtered.length && (
        <p className="text-white/75 text-sm py-8 text-center">No submissions yet.</p>
      )}

      <div className="space-y-3">
        {filtered.map((inq: any) => (
          <div
            key={inq.id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-white/8 transition-colors"
              onClick={() => setExpanded(expanded === inq.id ? null : inq.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white text-sm">{inq.fullName}</p>
                  <a href={`mailto:${inq.email}`} className="text-[#7dd87d] text-xs hover:underline">{inq.email}</a>
                  <p className="text-white/80 text-sm mt-0.5">{inq.projectName}{inq.websiteOrSocial && <a href={inq.websiteOrSocial} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#7dd87d] hover:underline text-xs">↗ site</a>}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[inq.status] ?? "bg-white/10 text-white/60 border-white/10"}`}>
                    {inq.status}
                  </span>
                  <span className="text-white/80 text-sm">{inq.timeline}</span>
                  {inq.budgetConfirmed ? <span className="text-green-400 text-xs">✓ Budget</span> : <span className="text-red-400 text-xs">✗ Budget</span>}
                </div>
              </div>

              {expanded === inq.id && (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-white/75 text-sm font-medium mb-1">Land Status</p>
                    <p className="text-white/90 text-sm">{inq.landStatus}</p>
                  </div>
                  <div>
                    <p className="text-white/75 text-sm font-medium mb-1">Community Stage</p>
                    <p className="text-white/90 text-sm">{inq.communityStage}</p>
                  </div>
                  <div>
                    <p className="text-white/75 text-sm font-medium mb-1">Primary Goal</p>
                    <p className="text-white/90 text-sm leading-relaxed">{inq.primaryGoal}</p>
                  </div>
                  {inq.additionalNotes && (
                    <div>
                      <p className="text-white/75 text-sm font-medium mb-1">Additional Notes</p>
                      <p className="text-white/90 text-sm">{inq.additionalNotes}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <label className="text-white/75 text-sm">Status:</label>
                    <select
                      value={inq.status}
                      onChange={(e) => updateMut.mutate({ id: inq.id, status: e.target.value })}
                      className="bg-[#1a472a] border border-white/30 rounded px-2 py-1 text-white text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="waitlist">Waitlist</option>
                      <option value="intro_scheduled">Intro Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="declined">Declined</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin: Custom Game Applications (Sylva intake queue) ─────────────────────
// One row per /custom-games/apply submission. Filterable by status, sortable by
// score, expandable to the blueprint draft summary + the Sylva transcript
// (fetched per row via `get`; the list query excludes the transcript).
function AdminCustomGameApplications() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "newest">("score");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: apps, refetch } = trpc.customGameApplications.list.useQuery({});
  const updateMut = trpc.customGameApplications.updateStatus.useMutation({ onSuccess: () => refetch() });
  const { data: expandedApp } = trpc.customGameApplications.get.useQuery(
    { id: expanded ?? 0 },
    { enabled: expanded !== null }
  );

  const filtered = (apps ?? [])
    .filter((a: any) => statusFilter === "all" || a.status === statusFilter)
    .sort((a: any, b: any) =>
      sortBy === "score"
        ? (b.score ?? 0) - (a.score ?? 0)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-white/10 text-white/60 border-white/10",
    submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    reviewing: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    in_conversation: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    accepted: "bg-green-500/20 text-green-300 border-green-500/30",
    declined: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "reviewing", label: "Reviewing" },
    { value: "in_conversation", label: "In Conversation" },
    { value: "accepted", label: "Accepted" },
    { value: "declined", label: "Declined" },
  ];

  const scoreColor = (score: number) =>
    score >= 70 ? "text-green-400" : score >= 40 ? "text-amber-300" : "text-white/60";

  /** Pull the reviewable facts out of a blueprint draft. */
  const draftSummary = (bp: any): Array<{ label: string; value: string }> => {
    if (!bp || typeof bp !== "object") return [];
    const rows: Array<{ label: string; value: string }> = [];
    const push = (label: string, value: unknown) => {
      if (value === undefined || value === null || value === "") return;
      rows.push({ label, value: String(value) });
    };
    push("Role", bp.applicant?.role);
    push("Location", bp.identity?.location);
    push("Land status", bp.identity?.landStatus);
    push("Acreage", bp.identity?.acreage);
    push("Stage", bp.identity?.stage);
    push("Website", bp.identity?.website);
    push("Vision", typeof bp.content?.vision === "string" ? bp.content.vision.slice(0, 400) : undefined);
    push("Goals", Array.isArray(bp.content?.goals) ? bp.content.goals.join("; ") : undefined);
    push("Pains", Array.isArray(bp.content?.problems) ? bp.content.problems.join(" | ").slice(0, 600) : undefined);
    push("Personas", Array.isArray(bp.personas) ? bp.personas.map((p: any) => p.label || p.id).join(", ") : undefined);
    push("Member name", bp.language?.memberName);
    push("Currency", bp.language?.currencyName);
    push("Guide", bp.language?.guideName);
    push("Guide voice", bp.language?.guideVoice);
    push("Team hours/week", bp.team?.hoursPerWeek);
    push("Team size", bp.team?.size);
    push("Technical comfort", bp.team?.technicalComfort);
    push("Hosting", bp.deployment?.hosting);
    push("Domain", bp.deployment?.domain);
    push("Timeline", bp.deployment?.timelineEstimate);
    push("Budget confirmed", bp.deployment?.budgetConfirmed === undefined ? undefined : bp.deployment.budgetConfirmed ? "yes" : "no");
    push("Referral", bp.deployment?.referralSource);
    push("LLM provider", bp.integrations?.llmProvider);
    push("Email provider", bp.integrations?.emailProvider);
    push("Links", Array.isArray(bp.generationInputs?.uploads) ? bp.generationInputs.uploads.join(" ") : undefined);
    return rows;
  };

  const parseTranscript = (raw: unknown): Array<{ role: string; content: string }> => {
    if (typeof raw !== "string" || !raw) return [];
    try {
      const turns = JSON.parse(raw);
      return Array.isArray(turns) ? turns : [];
    } catch { return []; }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Custom Game Applications</h2>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1a472a] border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm"
          >
            <option value="all" className="bg-[#1a472a] text-white">All</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#1a472a] text-white">{o.label}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "newest")}
            className="bg-[#1a472a] border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm"
          >
            <option value="score" className="bg-[#1a472a] text-white">By score</option>
            <option value="newest" className="bg-[#1a472a] text-white">Newest first</option>
          </select>
        </div>
      </div>

      {!filtered.length && (
        <p className="text-white/75 text-sm py-8 text-center">No applications yet.</p>
      )}

      <div className="space-y-3">
        {filtered.map((app: any) => (
          <div
            key={app.id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-white/8 transition-colors"
              onClick={() => setExpanded(expanded === app.id ? null : app.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white text-sm">{app.applicantName} <span className="text-white/60 font-normal">({app.applicantRole})</span></p>
                  <a href={`mailto:${app.applicantEmail}`} onClick={(e) => e.stopPropagation()} className="text-[#7dd87d] text-xs hover:underline">{app.applicantEmail}</a>
                  <p className="text-white/80 text-sm mt-0.5">{app.projectName}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${scoreColor(app.score ?? 0)}`}>{app.score ?? 0}/100</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[app.status] ?? "bg-white/10 text-white/60 border-white/10"}`}>
                    {app.status}
                  </span>
                  <span className="text-white/60 text-xs">{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {expanded === app.id && (
                <div className="mt-4 space-y-4 border-t border-white/10 pt-3" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <p className="text-white/75 text-sm font-medium mb-2">Blueprint draft</p>
                    {draftSummary(app.blueprintDraft).length === 0 && (
                      <p className="text-white/60 text-sm">No draft fields captured.</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {draftSummary(app.blueprintDraft).map(({ label, value }) => (
                        <div key={label} className="text-sm">
                          <span className="text-white/60">{label}: </span>
                          <span className="text-white/90 break-words">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/75 text-sm font-medium mb-2">Sylva transcript</p>
                    {expandedApp && expandedApp.id === app.id ? (
                      parseTranscript(expandedApp.transcript).length > 0 ? (
                        <div className="max-h-80 overflow-y-auto space-y-1.5 bg-black/20 border border-white/10 rounded-lg p-3">
                          {parseTranscript(expandedApp.transcript).map((t, i) => (
                            <p key={i} className="text-sm leading-relaxed">
                              <span className={t.role === "assistant" ? "text-[#7dd87d] font-medium" : "text-amber-300 font-medium"}>
                                {t.role === "assistant" ? "Sylva" : "Applicant"}:
                              </span>{" "}
                              <span className="text-white/85">{t.content}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/60 text-sm">No conversation; they typed the form.</p>
                      )
                    ) : (
                      <p className="text-white/60 text-sm">Loading transcript...</p>
                    )}
                  </div>

                  {app.internalNotes && (
                    <div>
                      <p className="text-white/75 text-sm font-medium mb-1">Internal notes</p>
                      <p className="text-white/90 text-sm whitespace-pre-wrap">{app.internalNotes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <label className="text-white/75 text-sm">Status:</label>
                    <select
                      value={app.status}
                      onChange={(e) => updateMut.mutate({ id: app.id, status: e.target.value as any })}
                      className="bg-[#1a472a] border border-white/30 rounded px-2 py-1 text-white text-xs"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <a
                      href={`mailto:${app.applicantEmail}?subject=${encodeURIComponent(`Your custom game: ${app.projectName}`)}`}
                      className="text-[#7dd87d] text-xs hover:underline"
                    >
                      Email {app.applicantName.split(" ")[0]}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADMIN_PASSWORD = "333";

// ─── Utility: age / response-time indicator ───────────────────────────────────
function getAgeInfo(createdAt: string | Date): { label: string; color: string; bg: string; isOverdue: boolean } {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageH = ageMs / 3_600_000;
  if (ageH < 24) return { label: `${Math.round(ageH)}h ago`, color: 'text-green-700', bg: 'bg-green-50 border-green-200', isOverdue: false };
  if (ageH < 48) return { label: `${Math.floor(ageH / 24)}d ago`, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', isOverdue: false };
  return { label: `${Math.floor(ageH / 24)}d  -  overdue`, color: 'text-red-700', bg: 'bg-red-50 border-red-200', isOverdue: true };
}

// ─── Buffer Settings Panel ────────────────────────────────────────────────────
const LS_FARCASTER_KEY = "admin_farcaster_handle";

function BufferSettingsPanel() {
  const [farcasterHandle, setFarcasterHandle] = useState<string>(() => {
    try { return localStorage.getItem(LS_FARCASTER_KEY) ?? ""; } catch { return ""; }
  });
  const [testing, setTesting] = useState(false);
  const [profileResults, setProfileResults] = useState<Array<{ id: string; service: string; service_username: string; formatted_username?: string }> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const getProfiles = trpc.admin.broadcast.getBufferProfiles.useQuery(undefined, { enabled: false });

  async function saveToken() {
    if (!newToken.trim()) return;
    setSavingToken(true);
    setTokenError(null);
    setTokenSaved(false);
    try {
      const res = await fetch("/api/admin/buffer/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: newToken.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setTokenError(data.error ?? "Failed to save token");
      } else {
        setTokenSaved(true);
        setNewToken("");
        setTimeout(() => setTokenSaved(false), 3000);
      }
    } catch (err) {
      setTokenError(String(err));
    } finally {
      setSavingToken(false);
    }
  }

  function saveFarcasterHandle(v: string) {
    setFarcasterHandle(v);
    try { localStorage.setItem(LS_FARCASTER_KEY, v); } catch {}
  }

  async function testConnection() {
    setTesting(true);
    setTestError(null);
    setProfileResults(null);
    try {
      const result = await getProfiles.refetch();
      if (result.data) {
        setProfileResults(result.data);
      } else if (result.error) {
        setTestError(result.error.message);
      }
    } catch (err) {
      setTestError(String(err));
    } finally {
      setTesting(false);
    }
  }

  const serviceLabels: Record<string, string> = {
    twitter: "X / Twitter",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    instagram: "Instagram",
    bluesky: "Bluesky",
  };

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Radio className="w-5 h-5" />
          Broadcast Settings
        </CardTitle>
        <CardDescription>Configure Buffer and Farcaster for social posting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Buffer */}
        <div className="space-y-3">
          <Label className="text-[#1a472a] font-semibold">Buffer Connection</Label>
          <p className="text-xs text-[#1a472a]/80">Token expires yearly. Paste a new one below to update it. Get it at buffer.com → Settings → Developers → Access Token.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="password"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              placeholder="Paste new Buffer access token…"
              className="max-w-xs border-[#1a472a]/20 focus:border-[#1a472a] font-mono text-sm"
            />
            <Button
              variant="outline"
              onClick={saveToken}
              disabled={savingToken || !newToken.trim()}
              className="border-[#1a472a]/30 text-[#1a472a]"
            >
              {savingToken ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {tokenSaved ? "Saved!" : "Save Token"}
            </Button>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing}
              className="border-[#1a472a]/30 text-[#1a472a]"
            >
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
          </div>
          {tokenError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {tokenError}
            </p>
          )}
          {tokenSaved && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Token saved. Click "Test Connection" to verify.
            </p>
          )}
          {testError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {testError}
            </p>
          )}
          {profileResults && profileResults.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {profileResults.map(p => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1a472a]/10 text-[#1a472a] text-xs font-medium"
                >
                  <span className="capitalize">{serviceLabels[p.service.toLowerCase()] ?? p.service}</span>
                  <span className="text-[#1a472a]/80">{p.formatted_username ?? p.service_username}</span>
                </span>
              ))}
            </div>
          )}
          {profileResults && profileResults.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Connected, but no profiles found. Add channels in your Buffer account.
            </p>
          )}
        </div>

        {/* Farcaster */}
        <div className="space-y-2">
          <Label className="text-[#1a472a] font-semibold">Farcaster Handle (display only)</Label>
          <Input
            value={farcasterHandle}
            onChange={e => saveFarcasterHandle(e.target.value)}
            placeholder="@handle.eth"
            className="max-w-xs border-[#1a472a]/20 focus:border-[#1a472a]"
          />
          <p className="text-xs text-[#1a472a]/80">
            Farcaster posting opens Warpcast in a new tab. No API key needed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Email History Panel ───────────────────────────────────────────────────────
// EmailHistoryPanel moved to client/src/components/admin/EmailHistoryPanel.tsx
// per FIXES_TO_MAKE_2026-04-25_world-class.md item 27 (incremental
// Admin.tsx refactor). Imported at the top of this file.

// ─── Contact Notes Panel ───────────────────────────────────────────────────────
function ContactNotesPanel({ contactType, contactId }: { contactType: string; contactId: number }) {
  const [newNote, setNewNote] = useState('');
  const utils = trpc.useUtils();

  const { data: notes, isLoading } = trpc.contactNotes.list.useQuery({ contactType, contactId });
  const createNote = trpc.contactNotes.create.useMutation({
    onSuccess: () => {
      utils.contactNotes.list.invalidate({ contactType, contactId });
      setNewNote('');
      toast.success('Note saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteNote = trpc.contactNotes.delete.useMutation({
    onSuccess: () => utils.contactNotes.list.invalidate({ contactType, contactId }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="border-t border-[#1a472a]/10 pt-4 space-y-3">
      <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Internal Notes {notes?.length ? `(${notes.length})` : ''}
      </p>
      {isLoading && <p className="text-xs text-[#1a472a]/75">Loading…</p>}
      {notes?.map((note: any) => (
        <div key={note.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#1a472a] whitespace-pre-wrap">{note.note}</p>
            <p className="text-xs text-[#1a472a]/75 mt-1">
              {note.authorName} · {new Date(note.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => deleteNote.mutate({ id: note.id })}
            className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
          placeholder="Add an internal note (visible to admin team only)…"
          className="min-h-[60px] text-xs bg-white flex-1 resize-none"
        />
        <Button
          size="sm"
          onClick={() => createNote.mutate({ contactType, contactId, note: newNote })}
          disabled={!newNote.trim() || createNote.isPending}
          className="self-end bg-[#1a472a] hover:bg-[#2d5a3d]"
        >
          {createNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Reminder Panel ───────────────────────────────────────────────────────────
function ReminderPanel({ contactType, contactId }: { contactType: string; contactId: number }) {
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState('');
  const utils = trpc.useUtils();

  const { data: notes } = trpc.contactNotes.list.useQuery({ contactType, contactId });
  const createNote = trpc.contactNotes.create.useMutation({
    onSuccess: () => {
      utils.contactNotes.list.invalidate({ contactType, contactId });
      setDate(''); setMsg('');
      toast.success('Reminder set');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteNote = trpc.contactNotes.delete.useMutation({
    onSuccess: () => utils.contactNotes.list.invalidate({ contactType, contactId }),
  });

  const reminders = (notes || []).filter((n: any) => n.note.startsWith('⏰ Reminder'));

  const handleSet = () => {
    if (!date) return;
    const text = `⏰ Reminder [${date}]: ${msg || 'Follow up'}`;
    createNote.mutate({ contactType, contactId, note: text });
  };

  return (
    <div className="border-t border-[#1a472a]/10 pt-4 space-y-2">
      <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Reminders {reminders.length > 0 ? `(${reminders.length})` : ''}
      </p>
      {reminders.map((r: any) => (
        <div key={r.id} className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs">
          <span className="flex-1 text-orange-800">{r.note}</span>
          <button onClick={() => deleteNote.mutate({ id: r.id })} className="text-orange-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-7 text-xs bg-white w-36"
        />
        <Input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Reminder note…"
          className="h-7 text-xs bg-white flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSet(); }}
        />
        <Button
          size="sm"
          onClick={handleSet}
          disabled={!date || createNote.isPending}
          className="h-7 bg-[#1a472a] hover:bg-[#2d5a3d]"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Assignee Select ──────────────────────────────────────────────────────────
const TEAM_MEMBERS = ['Rieki', 'Alice', 'Bob', 'Carlos', 'Dana', 'Evan'];

function AssigneeSelect({ contactType, contactId }: { contactType: string; contactId: number }) {
  const utils = trpc.useUtils();
  const { data: tags } = trpc.contactTags.list.useQuery({ contactType, contactId });
  const addTag = trpc.contactTags.add.useMutation({
    onSuccess: () => utils.contactTags.list.invalidate({ contactType, contactId }),
  });
  const removeTag = trpc.contactTags.remove.useMutation({
    onSuccess: () => utils.contactTags.list.invalidate({ contactType, contactId }),
  });

  const assigneeTag = tags?.find((t: any) => t.tag.startsWith('assignee:'));
  const currentAssignee = assigneeTag?.tag?.replace('assignee:', '') || '';

  const handleChange = (value: string) => {
    if (assigneeTag) removeTag.mutate({ id: assigneeTag.id });
    if (value && value !== 'unassigned') {
      addTag.mutate({ contactType, contactId, tag: `assignee:${value}` });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#1a472a]/80 shrink-0">Assigned to:</span>
      <Select value={currentAssignee || 'unassigned'} onValueChange={handleChange}>
        <SelectTrigger className="h-7 text-xs flex-1 max-w-[160px]">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {TEAM_MEMBERS.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Contact Tags Panel ────────────────────────────────────────────────────────
const PRESET_TAGS = ['hot-lead', 'vip', 'follow-up', 'do-not-contact', 'season-3', 'needs-call', 'investor-ready', 'land-project'];

function ContactTagsPanel({ contactType, contactId }: { contactType: string; contactId: number }) {
  const [input, setInput] = useState('');
  const utils = trpc.useUtils();

  const { data: tags } = trpc.contactTags.list.useQuery({ contactType, contactId });
  const addTag = trpc.contactTags.add.useMutation({
    onSuccess: () => {
      utils.contactTags.list.invalidate({ contactType, contactId });
      setInput('');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const removeTag = trpc.contactTags.remove.useMutation({
    onSuccess: () => utils.contactTags.list.invalidate({ contactType, contactId }),
    onError: (e: any) => toast.error(e.message),
  });

  const existingTagNames = new Set(tags?.map((t: any) => t.tag) || []);

  const handleAdd = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || existingTagNames.has(trimmed)) return;
    addTag.mutate({ contactType, contactId, tag: trimmed });
  };

  return (
    <div className="border-t border-[#1a472a]/10 pt-4 space-y-2">
      <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide">Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {tags?.map((t: any) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7dd87d]/20 border border-[#4a7c59]/30 text-xs text-[#1a472a]"
          >
            {t.tag}
            <button onClick={() => removeTag.mutate({ id: t.id })} className="text-[#1a472a]/75 hover:text-red-500">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {PRESET_TAGS.filter(pt => !existingTagNames.has(pt)).slice(0, 6).map(pt => (
          <button
            key={pt}
            type="button"
            onClick={() => handleAdd(pt)}
            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 hover:bg-[#7dd87d]/20 border border-gray-200 text-gray-600 hover:text-[#1a472a] transition-colors"
          >
            + {pt}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(input); } }}
          placeholder="Add custom tag…"
          className="h-7 text-xs bg-white flex-1"
        />
        <Button
          size="sm"
          onClick={() => handleAdd(input)}
          disabled={!input.trim() || addTag.isPending}
          className="h-7 bg-[#1a472a] hover:bg-[#2d5a3d]"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Path type labels and icons
const pathTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  alliance: { label: "Alliance Partners", icon: Handshake, color: "bg-purple-500" },
  create: { label: "Create with ReGens", icon: Palette, color: "bg-blue-500" },
  live: { label: "Live in a Land Project", icon: HomeIcon, color: "bg-green-500" },
  role: { label: "Role in ReGen Civics", icon: UserCheck, color: "bg-amber-500" },
  finance: { label: "Finance Regeneration", icon: TrendingUp, color: "bg-emerald-500" },
  learn: { label: "Learn & Explore", icon: Globe, color: "bg-cyan-500" },
  other: { label: "Other Inquiries", icon: HelpCircle, color: "bg-gray-500" },
};

// Password Gate Component
function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_authenticated", "true");
      onAuthenticated();
    } else {
      setError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] flex items-center justify-center p-4">
      <div className={isShaking ? "animate-shake" : ""}>
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-2 border-[#7dd87d]/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a472a] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#7dd87d]" />
            </div>
            <CardTitle className="text-2xl text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              Admin Access
            </CardTitle>
            <CardDescription>
              Enter the password to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`text-center text-lg ${error ? 'border-red-500 focus:ring-red-500' : 'border-[#1a472a]/30 focus:ring-[#7dd87d]'}`}
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stats Card Component - Now clickable with navigation
function StatsCard({ title, value, icon: Icon, color, description, onClick, linkTo }: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  description?: string;
  onClick?: () => void;
  linkTo?: string;
}) {
  const content = (
    <Card className={`bg-white border-2 border-[#1a472a]/10 hover:border-[#7dd87d]/50 transition-all ${onClick || linkTo ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm text-[#1a472a]/80 mb-1 break-words">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-[#1a472a]/75 mt-1 break-words">{description}</p>
            )}
          </div>
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${color} flex items-center justify-center flex-shrink-0 ml-2`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
        {(onClick || linkTo) && (
          <div className="mt-3 pt-3 border-t border-[#1a472a]/10 flex items-center justify-between text-xs text-[#4a7c59]">
            <span>Click to view</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  if (onClick) {
    // Keyboard-reachable wrapper. Bare onClick on a div doesn't fire on
    // Enter/Space and isn't focusable, which fails WCAG 2.2 keyboard nav.
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]/60 rounded-lg"
      >
        {content}
      </div>
    );
  }

  return content;
}

// Reviewer Email Management Component
function ReviewerEmailManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [notifyApplications, setNotifyApplications] = useState(true);
  const [notifyInvestors, setNotifyInvestors] = useState(true);
  const [notifyInquiries, setNotifyInquiries] = useState(true);
  const [selectedInquiryTypes, setSelectedInquiryTypes] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);

  const { data: reviewers, isLoading, refetch } = trpc.reviewerEmails.list.useQuery();
  const createMutation = trpc.reviewerEmails.create.useMutation({
    onSuccess: () => {
      toast.success("Reviewer added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const deleteMutation = trpc.reviewerEmails.delete.useMutation({
    onSuccess: () => {
      toast.success("Reviewer removed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const updateMutation = trpc.reviewerEmails.update.useMutation({
    onSuccess: () => {
      toast.success("Reviewer updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setNewEmail("");
    setNewName("");
    setNotifyApplications(true);
    setNotifyInvestors(true);
    setNotifyInquiries(true);
    setSelectedInquiryTypes([]);
    setSelectedProjects([]);
    setSelectedOrganizations([]);
  };

  const handleAddReviewer = () => {
    if (!newEmail) {
      toast.error("Email is required");
      return;
    }
    createMutation.mutate({
      email: newEmail,
      name: newName || undefined,
      notifyApplications,
      notifyInvestors,
      notifyInquiries,
      inquiryTypes: selectedInquiryTypes.length > 0 ? selectedInquiryTypes : undefined,
    });
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateMutation.mutate({
      id,
      data: { isActive: !currentActive },
    });
  };

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Mail className="w-5 h-5" />
              Reviewer Emails
            </CardTitle>
            <CardDescription>
              Manage who receives notifications when applications are submitted
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
                <Plus className="w-4 h-4 mr-2" />
                Add Reviewer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md !grid-rows-[auto_1fr_auto] !max-h-[85vh]">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Add Reviewer Email</DialogTitle>
                <DialogDescription>
                  Add an email address to receive notifications when applications are submitted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 overflow-y-auto min-h-0 pr-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="reviewer@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Notification Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify-applications"
                        checked={notifyApplications}
                        onCheckedChange={(checked) => setNotifyApplications(checked as boolean)}
                      />
                      <Label htmlFor="notify-applications" className="text-sm font-normal">
                        Land Project Applications
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify-investors"
                        checked={notifyInvestors}
                        onCheckedChange={(checked) => setNotifyInvestors(checked as boolean)}
                      />
                      <Label htmlFor="notify-investors" className="text-sm font-normal">
                        Investor Inquiries
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notify-inquiries"
                        checked={notifyInquiries}
                        onCheckedChange={(checked) => setNotifyInquiries(checked as boolean)}
                      />
                      <Label htmlFor="notify-inquiries" className="text-sm font-normal">
                        General Inquiries
                      </Label>
                    </div>
                  </div>
                </div>
                {notifyInquiries && (
                  <div className="space-y-3">
                    <Label>Specific Inquiry Types (leave empty for all)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(pathTypeConfig).map(([key, config]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`inquiry-${key}`}
                            checked={selectedInquiryTypes.includes(key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedInquiryTypes([...selectedInquiryTypes, key]);
                              } else {
                                setSelectedInquiryTypes(selectedInquiryTypes.filter(t => t !== key));
                              }
                            }}
                          />
                          <Label htmlFor={`inquiry-${key}`} className="text-xs font-normal">
                            {config.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Project Assignment */}
                <div className="space-y-3">
                  <Label>Assigned Land Projects (leave empty for all)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {landProjectsList.map((project) => (
                        <div key={project.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`project-${project.id}`}
                            checked={selectedProjects.includes(project.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProjects([...selectedProjects, project.id]);
                              } else {
                                setSelectedProjects(selectedProjects.filter(p => p !== project.id));
                              }
                            }}
                          />
                          <Label htmlFor={`project-${project.id}`} className="text-xs font-normal">
                            {project.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Organization Assignment */}
                <div className="space-y-3">
                  <Label>Assigned Alliance Organizations (leave empty for all)</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {allianceOrgsList.map((org) => (
                        <div key={org.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`org-${org.id}`}
                            checked={selectedOrganizations.includes(org.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrganizations([...selectedOrganizations, org.id]);
                              } else {
                                setSelectedOrganizations(selectedOrganizations.filter(o => o !== org.id));
                              }
                            }}
                          />
                          <Label htmlFor={`org-${org.id}`} className="text-xs font-normal">
                            {org.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddReviewer}
                  disabled={createMutation.isPending}
                  className="bg-[#1a472a] hover:bg-[#2d5a3d]"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Add Reviewer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
          </div>
        ) : reviewers && reviewers.length > 0 ? (
          <div className="space-y-3">
            {reviewers.map((reviewer: any) => (
              <div 
                key={reviewer.id} 
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  reviewer.isActive ? 'bg-white border-[#1a472a]/10' : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${reviewer.isActive ? 'bg-[#7dd87d]/20' : 'bg-gray-200'} flex items-center justify-center`}>
                    <Mail className={`w-5 h-5 ${reviewer.isActive ? 'text-[#1a472a]' : 'text-gray-300'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a472a]">
                      {reviewer.name || reviewer.email}
                    </p>
                    {reviewer.name && (
                      <p className="text-sm text-[#1a472a]/80">{reviewer.email}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reviewer.notifyApplications === 1 && (
                        <Badge variant="outline" className="text-xs">Applications</Badge>
                      )}
                      {reviewer.notifyInvestors === 1 && (
                        <Badge variant="outline" className="text-xs">Investors</Badge>
                      )}
                      {reviewer.notifyInquiries === 1 && (
                        <Badge variant="outline" className="text-xs">Inquiries</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(reviewer.id, reviewer.isActive === 1)}
                    className="text-[#1a472a]/80 hover:text-[#1a472a]"
                  >
                    {reviewer.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this reviewer?')) {
                        deleteMutation.mutate({ id: reviewer.id });
                      }
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#1a472a]/75">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No reviewer emails configured</p>
            <p className="text-sm mt-1">Add reviewers to receive notifications when applications are submitted</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Newsletter Subscribers List Component
function NewsletterSubscribersList() {
  const { data: subscribers, isLoading } = trpc.newsletter.list.useQuery();
  
  // Store subscribers in window for CSV export
  useEffect(() => {
    if (subscribers) {
      (window as any).__newsletterSubscribers = subscribers;
    }
  }, [subscribers]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
      </div>
    );
  }
  
  if (!subscribers || subscribers.length === 0) {
    return (
      <div className="text-center py-8 text-[#1a472a]/75">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No newsletter subscribers yet</p>
        <p className="text-sm mt-1">Subscribers will appear here when people sign up</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1a472a]/10">
        <p className="text-sm text-[#1a472a]/80">
          {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
        </p>
      </div>
      {subscribers.map((subscriber: any) => (
        <div 
          key={subscriber.id} 
          className="flex items-center justify-between p-3 rounded-lg bg-[#f0ebe3]/50 border border-[#1a472a]/10"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#1a472a]" />
            </div>
            <div>
              <p className="font-medium text-[#1a472a]">{subscriber.email}</p>
              <p className="text-xs text-[#1a472a]/75">
                Subscribed {new Date(subscriber.createdAt).toLocaleDateString()}
                {subscriber.source && ` via ${subscriber.source}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {subscriber.source || 'website'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// Land projects and alliance organizations for export filtering
const landProjectsList = [
  { id: "la_tierra", name: "La Tierra", location: "Costa Rica" },
  { id: "starseed", name: "StarSeed Village", location: "Guatemala" },
  { id: "nyx", name: "The Nyx", location: "Bali, Indonesia" },
  { id: "neighbourgood", name: "Our NeighbourGood", location: "New Zealand" },
  { id: "highland_lake", name: "Highland Lake CampUS", location: "NC, USA" },
  { id: "liminal", name: "Liminal Village", location: "Italy" },
  { id: "heartland", name: "Heartland Retreat", location: "California, USA" },
  { id: "tdf", name: "Traditional Dream Factory", location: "Portugal" },
  { id: "ubuntu", name: "Ubuntu", location: "Various" },
  { id: "finca_sagrada", name: "Finca Sagrada", location: "Latin America" },
  { id: "tabi", name: "Tabi", location: "Various" },
  { id: "tioga", name: "Tioga", location: "Various" },
  { id: "lala_gardens", name: "LaLa Gardens Cooperative", location: "Various" },
];

const allianceOrgsList = [
  { id: "hypha", name: "Hypha DAO" },
  { id: "seeds", name: "SEEDS" },
  { id: "nestr", name: "Nestr.io" },
  { id: "kinship_earth", name: "Kinship Earth" },
  { id: "open_future", name: "Open Future Coalition" },
  { id: "united_planet", name: "UP.Game (United Planet)" },
  { id: "gaia_biolab", name: "Gaia Union BioLab" },
  { id: "closer", name: "Closer.earth" },
  { id: "oasa", name: "OASA.earth" },
  { id: "planetary_party", name: "Planetary Party" },
  { id: "dao_universe", name: "DAO Universe Club" },
  { id: "desa", name: "DESA" },
  { id: "permatours", name: "Permatours" },
  { id: "maptio", name: "Maptio" },
  { id: "local_scale", name: "LocalScale" },
];

// Helper function to export inquiries to CSV
function csvRow(cells: any[]) {
  return cells.map((c: any) => `"${String(c ?? '').replace(/"/g, '""').replace(/[\n\r]/g, ' ')}"`).join(',');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportToCSV(data: any[], filename: string, projectName?: string) {
  if (data.length === 0) { toast.error("No data to export"); return; }

  // Detect type from filename or data shape
  if (filename.includes('investor')) {
    const headers = ["Full Name","Email","Phone","Organization","Role","Location","Investor Type","Investment Range","Timeline","Primary Interest","Investment Experience","Motivations","Impact Goals","Questions","Referral Source","Status","Submitted"];
    const rows = data.map((i: any) => csvRow([
      i.fullName, i.email, i.phone, i.organization, i.role, i.location,
      i.investorType, i.investmentRange, i.investmentTimeline, i.primaryInterest,
      i.investmentExperience, i.motivations, i.impactGoals, i.questionsForTeam,
      i.referralSource || i.howHeard, i.status, new Date(i.createdAt).toLocaleString()
    ]));
    downloadCSV([headers.join(','), ...rows].join('\n'), filename + (projectName ? '_' + projectName : ''));
  } else if (filename.includes('application')) {
    const headers = ["Project Name","Contact Name","Contact Email","Location","Size (ha)","Current People","Target People","Households","Land Status","Vision","Regenerative Practices","Governance","Current Funding","Funding Needs","Status","Submitted"];
    const rows = data.map((a: any) => csvRow([
      a.projectName, a.contactName, a.contactEmail, a.location,
      a.projectSizeHectares, a.currentPeopleCount, a.intendedPeopleCount, a.intendedHouseholdCount,
      a.landStatus, a.vision, a.regenerativePractices, a.governanceApproach,
      a.currentFunding, a.fundingNeeds, a.status,
      a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'Draft'
    ]));
    downloadCSV([headers.join(','), ...rows].join('\n'), filename + (projectName ? '_' + projectName : ''));
  } else {
    const headers = ["Full Name","Email","Organization","Path Type","Message","Status","Location","Date"];
    const rows = data.map((i: any) => csvRow([
      i.fullName, i.email, i.organization, i.pathType,
      i.message, i.status, i.location, new Date(i.createdAt).toLocaleString()
    ]));
    downloadCSV([headers.join(','), ...rows].join('\n'), filename + (projectName ? '_' + projectName : ''));
  }
  toast.success(`Exported ${data.length} records to CSV`);
}

// Filter inquiries by specific project or organization
function filterByProject(inquiries: any[], projectId: string): any[] {
  return inquiries.filter((inquiry: any) => {
    try {
      const formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
      const selectedProjects = formData.selectedProjects || [];
      const selectedOrganizations = formData.selectedOrganizations || [];
      return selectedProjects.includes(projectId) || 
             selectedOrganizations.includes(projectId) ||
             selectedProjects.includes('all') ||
             selectedOrganizations.includes('all');
    } catch (e) {
      return false;
    }
  });
}

// Inquiry Section Component for each path type with export functionality
function InquirySection({ pathType, inquiries }: { pathType: string; inquiries: any[] }) {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [showReviewModal, setShowReviewModal] = useState<number | null>(null);
  const [currentReviewNote, setCurrentReviewNote] = useState('');
  const [search, setSearch] = useState('');
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkEmailTemplate, setBulkEmailTemplate] = useState('follow_up');
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailBody, setBulkEmailBody] = useState('');

  const utils = trpc.useUtils();
  const auditNote = trpc.contactNotes.create.useMutation();
  const updateStatusMutation = trpc.generalInquiries.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.generalInquiries.list.invalidate();
      auditNote.mutate({ contactType: 'inquiry', contactId: variables.id, note: `📋 Status → ${variables.status}`, authorName: 'System' });
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const sendBulkEmailMutation = trpc.email.sendBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`Sent ${data.totalSent} email${data.totalSent !== 1 ? 's' : ''}${data.totalFailed > 0 ? `, ${data.totalFailed} failed` : ''}!`);
      setShowBulkEmail(false);
      setSelectedItems(new Set());
      setShowBulkActions(false);
    },
    onError: (error: any) => {
      toast.error(`Bulk email failed: ${error.message}`);
    },
  });

  const loadBulkTemplate = (templateId: string) => {
    setBulkEmailTemplate(templateId);
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (tpl) {
      setBulkEmailSubject(tpl.subject);
      setBulkEmailBody(tpl.body); // Keep {{name}} placeholder for per-recipient merge
    }
  };
  
  const config = pathTypeConfig[pathType] || pathTypeConfig.other;
  const Icon = config.icon;
  const baseFilteredInquiries = inquiries.filter((i: any) => i.pathType === pathType);

  // Apply search filter
  const searchFiltered = search
    ? baseFilteredInquiries.filter((i: any) =>
        i.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        i.email?.toLowerCase().includes(search.toLowerCase()) ||
        i.message?.toLowerCase().includes(search.toLowerCase()) ||
        i.location?.toLowerCase().includes(search.toLowerCase())
      )
    : baseFilteredInquiries;

  // Apply active filter
  const filteredInquiries = activeFilter
    ? filterByProject(searchFiltered, activeFilter)
    : searchFiltered;
  
  // Determine which project list to use based on path type
  const projectList = pathType === 'live' ? landProjectsList : 
                      pathType === 'create' ? allianceOrgsList : 
                      pathType === 'alliance' ? allianceOrgsList :
                      null;
  
  // Get the name of the active filter
  const activeFilterName = activeFilter && projectList
    ? projectList.find(p => p.id === activeFilter)?.name || activeFilter
    : null;

  const handleExportAll = () => {
    exportToCSV(filteredInquiries, `${pathType}_inquiries`);
    setShowExportDropdown(false);
  };

  const handleExportByProject = (projectId: string, projectName: string) => {
    const filtered = filterByProject(filteredInquiries, projectId);
    if (filtered.length === 0) {
      toast.error(`No inquiries found for ${projectName}`);
      return;
    }
    exportToCSV(filtered, `${pathType}_inquiries`, projectName.replace(/\s+/g, '_'));
    setShowExportDropdown(false);
  };

  if (filteredInquiries.length === 0) {
    return (
      <div className="text-center py-8 text-[#1a472a]/75">
        <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No {config.label.toLowerCase()} inquiries yet</p>
      </div>
    );
  }

  // Toggle item selection
  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };
  
  // Select all items
  const selectAll = () => {
    if (selectedItems.size === filteredInquiries.length) {
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedItems(new Set(filteredInquiries.map((i: any) => i.id)));
      setShowBulkActions(true);
    }
  };
  
  // Clear filter
  const clearFilter = () => {
    setActiveFilter(null);
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  return (
    <div>
      {/* Filter & Export Controls */}
      <div className="p-4 border-b border-[#1a472a]/10 bg-[#f0ebe3]/30">
        {/* Search Row */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/75" />
          <input
            type="text"
            placeholder={`Search ${config.label.toLowerCase()} by name, email, or message...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#1a472a]/75">
              {filteredInquiries.length} {filteredInquiries.length === 1 ? 'inquiry' : 'inquiries'}
              {activeFilterName && (
                <span className="ml-1 text-[#7dd87d]">for {activeFilterName}</span>
              )}
              {search && (
                <span className="ml-1 text-blue-500">matching "{search}"</span>
              )}
            </p>
            
            {/* Filter Button */}
            {projectList && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-[#1a472a]/30 text-[#1a472a] ${activeFilter ? 'bg-[#7dd87d]/20 border-[#7dd87d]' : ''}`}
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  {activeFilter ? 'Filtered' : 'Filter'}
                </Button>
                
                {showFilterDropdown && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#1a472a]/10 z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <button
                        onClick={() => { clearFilter(); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${!activeFilter ? 'bg-[#7dd87d]/20 text-[#1a472a]' : 'text-[#1a472a] hover:bg-[#7dd87d]/10'}`}
                      >
                        Show All ({baseFilteredInquiries.length})
                      </button>
                      
                      <div className="border-t border-[#1a472a]/10 my-2" />
                      <p className="px-3 py-1 text-xs text-[#1a472a]/75 font-medium">
                        Filter by {pathType === 'live' ? 'Land Project' : 'Organization'}:
                      </p>
                      {projectList.map((project) => {
                        const count = filterByProject(baseFilteredInquiries, project.id).length;
                        return (
                          <button
                            key={project.id}
                            onClick={() => { setActiveFilter(project.id); setShowFilterDropdown(false); setSelectedItems(new Set()); setShowBulkActions(false); }}
                            className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${activeFilter === project.id ? 'bg-[#7dd87d]/20 text-[#1a472a]' : 'text-[#1a472a] hover:bg-[#7dd87d]/10'}`}
                            disabled={count === 0}
                          >
                            <span className={count === 0 ? 'opacity-50' : ''}>{project.name}</span>
                            <Badge variant="outline" className={`text-xs ${count === 0 ? 'opacity-50' : ''}`}>
                              {count}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="w-full text-center py-2 text-xs text-[#1a472a]/75 hover:bg-[#f0ebe3] border-t border-[#1a472a]/10"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Clear Filter Button */}
            {activeFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[#1a472a]/80 hover:text-[#1a472a]"
                onClick={clearFilter}
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filter
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 mr-2">
              <Checkbox
                checked={selectedItems.size === filteredInquiries.length && filteredInquiries.length > 0}
                onCheckedChange={selectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-xs text-[#1a472a]/80 cursor-pointer">
                Select All
              </Label>
            </div>
            
            {/* Export Button */}
            <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="border-[#7dd87d] text-[#1a472a]"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            
            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#1a472a]/10 z-50 max-h-96 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={handleExportAll}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#7dd87d]/20 text-sm font-medium text-[#1a472a]"
                  >
                    Export All ({filteredInquiries.length})
                  </button>
                  
                  {projectList && (
                    <>
                      <div className="border-t border-[#1a472a]/10 my-2" />
                      <p className="px-3 py-1 text-xs text-[#1a472a]/75 font-medium">
                        Export by {pathType === 'live' ? 'Land Project' : 'Alliance Organization'}:
                      </p>
                      {projectList.map((project) => {
                        const count = filterByProject(filteredInquiries, project.id).length;
                        return (
                          <button
                            key={project.id}
                            onClick={() => handleExportByProject(project.id, project.name)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-[#7dd87d]/20 text-sm text-[#1a472a] flex justify-between items-center"
                            disabled={count === 0}
                          >
                            <span className={count === 0 ? 'opacity-50' : ''}>{project.name}</span>
                            <Badge variant="outline" className={`text-xs ${count === 0 ? 'opacity-50' : ''}`}>
                              {count}
                            </Badge>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowExportDropdown(false)}
                  className="w-full text-center py-2 text-xs text-[#1a472a]/75 hover:bg-[#f0ebe3] border-t border-[#1a472a]/10"
                >
                  Close
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {showBulkActions && selectedItems.size > 0 && (
        <div className="p-3 bg-[#7dd87d]/20 border-b border-[#7dd87d]/30 flex items-center justify-between">
          <p className="text-sm font-medium text-[#1a472a]">
            {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/30 text-[#1a472a]"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                const prevStatuses = Array.from(selectedItems).map(id => ({
                  id,
                  status: filteredInquiries.find((i: any) => i.id === id)?.status || 'new',
                }));
                Array.from(selectedItems).forEach(id =>
                  updateStatusMutation.mutate({ id, status: 'contacted' })
                );
                toast(`Marked ${selectedItems.size} items as reviewed`, {
                  action: {
                    label: 'Undo',
                    onClick: () => prevStatuses.forEach(({ id, status }) => updateStatusMutation.mutate({ id, status })),
                  },
                  duration: 5000,
                });
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark as Reviewed
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                const prevStatuses = Array.from(selectedItems).map(id => ({
                  id,
                  status: filteredInquiries.find((i: any) => i.id === id)?.status || 'new',
                }));
                Array.from(selectedItems).forEach(id =>
                  updateStatusMutation.mutate({ id, status: 'archived' })
                );
                toast(`Archived ${selectedItems.size} items`, {
                  action: {
                    label: 'Undo',
                    onClick: () => prevStatuses.forEach(({ id, status }) => updateStatusMutation.mutate({ id, status })),
                  },
                  duration: 5000,
                });
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
            >
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => {
                if (!showBulkEmail) {
                  loadBulkTemplate('follow_up');
                }
                setShowBulkEmail(!showBulkEmail);
              }}
            >
              <Mail className="w-4 h-4 mr-1" />
              Send Email
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#1a472a]/80"
              onClick={() => {
                setSelectedItems(new Set());
                setShowBulkActions(false);
                setShowBulkEmail(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Email Compose */}
      {showBulkEmail && selectedItems.size > 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send email to {selectedItems.size} selected contact{selectedItems.size !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setShowBulkEmail(false)} className="text-blue-400 hover:text-blue-700" aria-label="Close bulk email panel">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-blue-700">Template</Label>
              <Select value={bulkEmailTemplate} onValueChange={loadBulkTemplate}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-blue-700">Subject</Label>
              <Input
                value={bulkEmailSubject}
                onChange={(e) => setBulkEmailSubject(e.target.value)}
                className="h-8 text-xs bg-white"
                placeholder="Subject line..."
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-blue-700">Body (use {'{{name}}'} for recipient name)</Label>
            <Textarea
              value={bulkEmailBody}
              onChange={(e) => setBulkEmailBody(e.target.value)}
              className="bg-white text-xs min-h-[100px] resize-y"
              placeholder="Email body..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const recipients = filteredInquiries
                  .filter((i: any) => selectedItems.has(i.id))
                  .filter((i: any) => i.email)
                  .map((i: any) => ({ email: i.email, name: i.fullName || i.email }));
                if (recipients.length === 0) {
                  toast.error('No valid email addresses in selection');
                  return;
                }
                // Always use "custom" templateType since we always supply customSubject+customBody.
                // The server's bulk handler respects customSubject/customBody over template defaults.
                sendBulkEmailMutation.mutate({
                  recipients,
                  templateType: 'custom',
                  customSubject: bulkEmailSubject,
                  customBody: bulkEmailBody,
                });
              }}
              disabled={sendBulkEmailMutation.isPending || !bulkEmailSubject.trim() || !bulkEmailBody.trim()}
              className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
              size="sm"
            >
              {sendBulkEmailMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Send to {selectedItems.size} Contact{selectedItems.size !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkEmail(false)}
              className="border-blue-300 text-blue-700">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Inquiry List */}
      <div className="divide-y divide-[#1a472a]/10">
      {filteredInquiries.map((inquiry: any, currentIndex: number) => {
        // Parse form data
        let formData: any = {};
        try {
          formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
        } catch (e) {
          formData = {};
        }
        
        // Get selected projects/orgs
        const selectedProjects = formData.selectedProjects || [];
        const selectedOrgs = formData.selectedOrganizations || [];
        const roleArchetypes = formData.roleArchetypes || [];
        const contributionTypes = formData.contributionTypes || [];
        
        return (
          <Dialog key={inquiry.id}>
            <DialogTrigger asChild>
              <div className="p-4 hover:bg-[#f0ebe3]/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.has(inquiry.id)}
                      onCheckedChange={() => toggleItemSelection(inquiry.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-[#1a472a]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1a472a]">{inquiry.fullName || 'Anonymous'}</p>
                        {inquiry.location && (
                          <span className="text-xs text-[#1a472a]/75 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {inquiry.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#1a472a]/80">{inquiry.email}</p>
                      
                      {/* Show key info based on path type */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedProjects.length > 0 && selectedProjects.slice(0, 3).map((proj: string) => (
                          <Badge key={proj} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            {landProjectsList.find(p => p.id === proj)?.name || proj}
                          </Badge>
                        ))}
                        {selectedProjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{selectedProjects.length - 3} more</Badge>
                        )}
                        {selectedOrgs.length > 0 && selectedOrgs.slice(0, 3).map((org: string) => (
                          <Badge key={org} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                            {allianceOrgsList.find(o => o.id === org)?.name || org}
                          </Badge>
                        ))}
                        {selectedOrgs.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{selectedOrgs.length - 3} more</Badge>
                        )}
                        {roleArchetypes.length > 0 && roleArchetypes.map((role: string) => (
                          <Badge key={role} variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                            {role}
                          </Badge>
                        ))}
                        {contributionTypes.length > 0 && contributionTypes.map((type: string) => (
                          <Badge key={type} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            {type}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Preview of message */}
                      {(inquiry.message || formData.additionalNotes) && (
                        <p className="text-sm text-[#1a472a]/75 mt-2 line-clamp-2">
                          {inquiry.message || formData.additionalNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                      {inquiry.status}
                    </Badge>
                    {(() => {
                      const age = getAgeInfo(inquiry.createdAt);
                      return (
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${age.bg} ${age.color}`}>
                          {age.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                          {age.label}
                        </span>
                      );
                    })()}
                    <ChevronRight className="w-4 h-4 text-[#1a472a]/75" />
                  </div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div>
                    <span className="text-[#1a472a]">{inquiry.fullName || 'Anonymous'}</span>
                    <p className="text-sm font-normal text-[#1a472a]/80">{config.label}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Email</p>
                    <p className="text-[#1a472a]">{inquiry.email}</p>
                  </div>
                  {inquiry.location && (
                    <div>
                      <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Location</p>
                      <p className="text-[#1a472a]">{inquiry.location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Status</p>
                    <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                      {inquiry.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Submitted</p>
                    <p className="text-[#1a472a]">{new Date(inquiry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* Selected Projects/Orgs */}
                {selectedProjects.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Selected Land Projects</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProjects.map((proj: string) => (
                        <Badge key={proj} className="bg-green-100 text-green-800 border-green-200">
                          {landProjectsList.find(p => p.id === proj)?.name || proj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedOrgs.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Selected Alliance Organizations</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrgs.map((org: string) => (
                        <Badge key={org} className="bg-purple-100 text-purple-800 border-purple-200">
                          {allianceOrgsList.find(o => o.id === org)?.name || org}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {roleArchetypes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Role Archetypes</p>
                    <div className="flex flex-wrap gap-2">
                      {roleArchetypes.map((role: string) => (
                        <Badge key={role} className="bg-amber-100 text-amber-800 border-amber-200">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {contributionTypes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Contribution Types</p>
                    <div className="flex flex-wrap gap-2">
                      {contributionTypes.map((type: string) => (
                        <Badge key={type} className="bg-blue-100 text-blue-800 border-blue-200">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Alliance-specific: Organization info */}
                {(inquiry.organizationUrl || inquiry.partnershipDescription) && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-800 uppercase tracking-wide mb-2">Alliance Partnership Details</p>
                    {inquiry.organizationUrl && (
                      <div className="mb-3">
                        <p className="text-xs text-purple-600 font-medium">Organization URL</p>
                        <a 
                          href={inquiry.organizationUrl.startsWith('http') ? inquiry.organizationUrl : `https://${inquiry.organizationUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 hover:underline break-all"
                        >
                          {inquiry.organizationUrl}
                        </a>
                      </div>
                    )}
                    {inquiry.partnershipDescription && (
                      <div>
                        <p className="text-xs text-purple-600 font-medium mb-1">Partnership Vision</p>
                        <p className="text-sm text-purple-900 whitespace-pre-wrap">{inquiry.partnershipDescription}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Land Partner-specific: Project info */}
                {(inquiry.projectUrl || inquiry.projectInspiration) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-800 uppercase tracking-wide mb-2">Land Project Details</p>
                    {inquiry.projectUrl && (
                      <div className="mb-3">
                        <p className="text-xs text-green-600 font-medium">Project URL</p>
                        <a 
                          href={inquiry.projectUrl.startsWith('http') ? inquiry.projectUrl : `https://${inquiry.projectUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 hover:underline break-all"
                        >
                          {inquiry.projectUrl}
                        </a>
                      </div>
                    )}
                    {inquiry.projectInspiration && (
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">Project Inspiration</p>
                        <p className="text-sm text-green-900 whitespace-pre-wrap">{inquiry.projectInspiration}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Role-specific: Pre-filled role info */}
                {formData.prefilledRole && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-2">Applied for Role</p>
                    <p className="font-semibold text-amber-900">{formData.prefilledRole.title}</p>
                    {formData.prefilledRole.circle && (
                      <p className="text-sm text-amber-700">Circle: {formData.prefilledRole.circle}</p>
                    )}
                    {formData.prefilledRole.purpose && (
                      <p className="text-sm text-amber-700 mt-1">{formData.prefilledRole.purpose}</p>
                    )}
                  </div>
                )}
                
                {/* Role Interest */}
                {inquiry.roleInterest && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Role Interest</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.roleInterest}</p>
                    </div>
                  </div>
                )}
                
                {/* Unique Contribution (Something Else path) */}
                {inquiry.uniqueContribution && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Unique Contribution</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.uniqueContribution}</p>
                    </div>
                  </div>
                )}
                
                {/* Capital Types (9 Forms of Capital) */}
                {inquiry.capitalTypes && (() => {
                  try {
                    const capitals = JSON.parse(inquiry.capitalTypes);
                    if (capitals.length > 0) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Forms of Capital to Contribute</p>
                          <div className="flex flex-wrap gap-2">
                            {capitals.map((cap: string) => (
                              <Badge key={cap} className="bg-teal-100 text-teal-800 border-teal-200 capitalize">
                                {cap.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Organizational Capital */}
                {inquiry.organizationalCapital && (() => {
                  try {
                    const orgCaps = JSON.parse(inquiry.organizationalCapital);
                    if (orgCaps.length > 0) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Organizational Capital</p>
                          <div className="flex flex-wrap gap-2">
                            {orgCaps.map((cap: string) => (
                              <Badge key={cap} className="bg-indigo-100 text-indigo-800 border-indigo-200 capitalize">
                                {cap.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Alliance Support Categories */}
                {inquiry.allianceSupportCategories && (() => {
                  try {
                    const categories = JSON.parse(inquiry.allianceSupportCategories);
                    if (categories.length > 0) {
                      return (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Alliance Support Categories</p>
                          <div className="flex flex-wrap gap-2">
                            {categories.map((cat: string) => (
                              <Badge key={cat} className="bg-violet-100 text-violet-800 border-violet-200 capitalize">
                                {cat.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Alliance Support Description */}
                {inquiry.allianceSupportDescription && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">How Alliance Supports Land Projects</p>
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                      <p className="text-violet-900 whitespace-pre-wrap">{inquiry.allianceSupportDescription}</p>
                    </div>
                  </div>
                )}
                
                {/* Other Alliance Support */}
                {inquiry.otherAllianceSupport && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Other Support Category</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.otherAllianceSupport}</p>
                    </div>
                  </div>
                )}
                
                {/* Value Contribution */}
                {inquiry.valueContribution && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Value Contribution</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-emerald-900 whitespace-pre-wrap">{inquiry.valueContribution}</p>
                    </div>
                  </div>
                )}
                
                {/* Why Ideal Fit */}
                {inquiry.whyIdealFit && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Why They Would Be an Ideal Fit</p>
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                      <p className="text-sky-900 whitespace-pre-wrap">{inquiry.whyIdealFit}</p>
                    </div>
                  </div>
                )}
                
                {/* Message/Notes */}
                {(inquiry.message || formData.additionalNotes) && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Message</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message || formData.additionalNotes}</p>
                    </div>
                  </div>
                )}
                
                {/* All Form Data */}
                {Object.keys(formData).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">All Form Data</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-[#1a472a]/75">
                        {JSON.stringify(formData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Activity Timeline */}
                <Suspense fallback={null}><ActivityTimeline email={inquiry.email} contactType="inquiry" contactId={inquiry.id} /></Suspense>

                {/* Email History */}
                <EmailHistoryPanel email={inquiry.email} />

                {/* Internal Notes */}
                <ContactNotesPanel contactType="inquiry" contactId={inquiry.id} />
                <ContactTagsPanel contactType="inquiry" contactId={inquiry.id} />
                <ReminderPanel contactType="inquiry" contactId={inquiry.id} />
              </div>

              <DialogFooter className="flex-col gap-3">
                {/* Assignee */}
                <AssigneeSelect contactType="inquiry" contactId={inquiry.id} />
                {/* Status update row */}
                <div className="w-full flex items-center gap-2">
                  <span className="text-xs text-[#1a472a]/80 shrink-0">Update status:</span>
                  <Select
                    value={inquiry.status}
                    onValueChange={(newStatus: any) => {
                      const prevStatus = inquiry.status;
                      updateStatusMutation.mutate({ id: inquiry.id, status: newStatus });
                      toast('Status updated', {
                        action: { label: 'Undo', onClick: () => updateStatusMutation.mutate({ id: inquiry.id, status: prevStatus }) },
                        duration: 5000,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Navigation indicator */}
                <div className="w-full flex items-center justify-between text-xs text-[#1a472a]/75">
                  <span>Inquiry {currentIndex + 1} of {filteredInquiries.length}</span>
                  <div className="flex gap-2">
                    {currentIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.preventDefault();
                          // Navigate to previous inquiry by closing this dialog and opening the previous one
                          const prevInquiry = filteredInquiries[currentIndex - 1];
                          if (prevInquiry) {
                            // Store the target and trigger navigation
                            (window as any).__navigateToInquiry = prevInquiry.id;
                            toast.info(`Navigate to previous inquiry`);
                          }
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    {currentIndex < filteredInquiries.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.preventDefault();
                          const nextInquiry = filteredInquiries[currentIndex + 1];
                          if (nextInquiry) {
                            (window as any).__navigateToInquiry = nextInquiry.id;
                            toast.info(`Navigate to next inquiry`);
                          }
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <EmailTemplateSelector
                      recipientEmail={inquiry.email}
                      recipientName={inquiry.fullName || ''}
                      contextSubject={config.label}
                      className="w-full"
                    />
                  </div>
                  <Button
                    className="bg-[#1a472a] hover:bg-[#2d5a3d] flex-1"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => {
                      const prevStatus = inquiry.status;
                      updateStatusMutation.mutate({ id: inquiry.id, status: 'contacted' });
                      const note = reviewNotes[inquiry.id] || '';
                      toast(`Marked as reviewed${note ? ' with notes' : ''}`, {
                        action: { label: 'Undo', onClick: () => updateStatusMutation.mutate({ id: inquiry.id, status: prevStatus }) },
                        duration: 5000,
                      });
                      if (currentIndex < filteredInquiries.length - 1) {
                        const nextInquiry = filteredInquiries[currentIndex + 1];
                        toast.info(`Next: ${nextInquiry.fullName || 'Anonymous'}`, { duration: 2000 });
                      }
                    }}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <CheckCheck className="w-4 h-4 mr-1" />
                    )}
                    Mark as Reviewed
                    {currentIndex < filteredInquiries.length - 1 && (
                      <ChevronRight className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })}
      </div>
    </div>
  );
}

// Main Admin Dashboard
// ─── Scheduled Emails Manager ─────────────────────────────────────────────────
function ScheduledEmailsManager() {
  const utils = trpc.useUtils();
  const { data: scheduled, isLoading } = trpc.scheduledEmails.list.useQuery();
  const cancel = trpc.scheduledEmails.cancel.useMutation({
    onSuccess: () => {
      utils.scheduledEmails.list.invalidate();
      toast.success('Scheduled email cancelled');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = scheduled?.filter((s: any) => s.status === 'pending') || [];
  const past = scheduled?.filter((s: any) => s.status !== 'pending') || [];

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Send className="w-5 h-5" />
          Scheduled Emails
        </CardTitle>
        <CardDescription>{pending.length} pending</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-[#1a472a]/75">Loading…</p>}
        {!isLoading && scheduled?.length === 0 && (
          <p className="text-sm text-[#1a472a]/75">No scheduled emails. Use "Send Later" when composing to schedule.</p>
        )}
        {pending.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide">Pending</p>
            {pending.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a472a] truncate">{s.subject}</p>
                  <p className="text-xs text-[#1a472a]/80">To: {s.recipientName || s.recipientEmail} · {new Date(s.scheduledFor).toLocaleString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => cancel.mutate({ id: s.id })}
                  disabled={cancel.isPending}
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide">History</p>
            {past.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a472a]/75 truncate">{s.subject}</p>
                  <p className="text-xs text-[#1a472a]/75">
                    To: {s.recipientName || s.recipientEmail} ·
                    <span className={s.status === 'sent' ? 'text-green-600' : s.status === 'cancelled' ? 'text-gray-500' : 'text-red-500'}> {s.status}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin AMA Panel ───────────────────────────────────────────────────────────
function AdminAMAPanel() {
  const utils = trpc.useUtils();
  const { data: amas, isLoading } = trpc.amas.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    hostName: "",
    date: "",
    time: "",
    timezone: "America/New_York",
    forumThreadUrl: "",
  });

  const createMut = trpc.amas.create.useMutation({
    onSuccess: () => {
      utils.amas.list.invalidate();
      setShowForm(false);
      setForm({ projectName: "", hostName: "", date: "", time: "", timezone: "America/New_York", forumThreadUrl: "" });
      toast.success("AMA created");
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleMut = trpc.amas.setActive.useMutation({ onSuccess: () => utils.amas.list.invalidate() });
  const deleteMut = trpc.amas.delete.useMutation({ onSuccess: () => utils.amas.list.invalidate() });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-4 h-4 text-[#7dd87d]" /> Upcoming AMAs
        </CardTitle>
        <CardDescription>Manage live Ask Me Anything sessions shown in the site banner.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/70" />}
        {!isLoading && amas && amas.length === 0 && (
          <p className="text-white/70 text-sm">No AMAs scheduled.</p>
        )}
        {amas?.map(ama => (
          <div key={ama.id} className="flex items-start gap-3 p-3 bg-white/4 rounded-xl border border-white/8">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{ama.projectName}</p>
              <p className="text-white/75 text-xs">{ama.date} at {ama.time} ({ama.timezone})</p>
              <p className="text-white/70 text-xs">Host: {ama.hostName}</p>
              {ama.forumThreadUrl && (
                <a href={ama.forumThreadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7dd87d]/70 hover:text-[#7dd87d] underline">
                  Forum thread
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleMut.mutate({ id: ama.id, isActive: !ama.isActive })}
                className={`text-xs px-2 py-1 rounded-full border ${ama.isActive ? "bg-[#7dd87d]/15 text-[#7dd87d] border-[#7dd87d]/25" : "bg-white/5 text-white/70 border-white/15"}`}
              >
                {ama.isActive ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => { if (confirm("Delete this AMA?")) deleteMut.mutate({ id: ama.id }); }}
                className="text-white/65 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {showForm ? (
          <div className="bg-white/4 border border-white/12 rounded-xl p-4 space-y-3">
            <p className="text-white/70 text-sm font-semibold">Schedule AMA</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Project Name</Label>
                <Input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="Amora Costa Rica" className="mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Host Name</Label>
                <Input value={form.hostName} onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))} placeholder="Maria Santos" className="mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Date (YYYY-MM-DD)</Label>
                <Input value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="2026-04-26" className="mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Time</Label>
                <Input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="11:00 AM EST" className="mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Timezone</Label>
                <Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Forum Thread URL (optional)</Label>
                <Input value={form.forumThreadUrl} onChange={e => setForm(f => ({ ...f, forumThreadUrl: e.target.value }))} placeholder="https://..." className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createMut.mutate({ ...form, forumThreadUrl: form.forumThreadUrl || undefined })}
                disabled={!form.projectName || !form.date || !form.time || createMut.isPending}
              >
                {createMut.isPending ? "Creating..." : "Create AMA"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Schedule AMA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Org Claims Admin Panel ────────────────────────────────────────────────────
function OrgClaimsAdminPanel() {
  const utils = trpc.useUtils();
  const { data: claims, isLoading } = trpc.orgClaims.listAll.useQuery();
  const approveMutation = trpc.orgClaims.approve.useMutation({
    onSuccess: () => { utils.orgClaims.listAll.invalidate(); toast.success("Claim approved  -  join requests routed to steward"); },
  });
  const rejectMutation = trpc.orgClaims.reject.useMutation({
    onSuccess: () => { utils.orgClaims.listAll.invalidate(); toast.success("Claim rejected"); },
  });
  const assignMutation = trpc.orgClaims.adminAssign.useMutation({
    onSuccess: () => { utils.orgClaims.listAll.invalidate(); toast.success("Steward assigned directly"); setAssignForm({ userId: '', orgType: 'land_project', orgId: '', orgName: '' }); },
    onError: (e) => toast.error("Assignment failed", { description: e.message }),
  });
  const [assignForm, setAssignForm] = useState({ userId: '', orgType: 'land_project' as 'land_project' | 'alliance_org', orgId: '', orgName: '' });
  const [showAssign, setShowAssign] = useState(false);

  return (
    <Card className="bg-white border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-lg text-[#1a472a] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#7dd87d]" />
          Org / Project Stewardship Claims
        </CardTitle>
        <CardDescription>Review requests from users claiming stewardship of land projects or alliance orgs</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-[#1a472a]/75">Loading…</p>}
        {!isLoading && !claims?.length && (
          <p className="text-sm text-[#1a472a]/75">No stewardship claims yet.</p>
        )}
        <div className="space-y-3 mb-4">
          {claims?.map((claim: any) => (
            <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border border-[#1a472a]/10 bg-[#f8f5f0]">
              <div>
                <p className="font-medium text-[#1a472a] text-sm">{claim.orgName}</p>
                <p className="text-xs text-[#1a472a]/75">{claim.orgType === 'land_project' ? 'Land Project' : 'Alliance Org'} · User #{claim.userId} · ID: {claim.orgId}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={
                  claim.status === 'approved' ? 'border-green-500 text-green-700' :
                  claim.status === 'rejected' ? 'border-red-500 text-red-700' :
                  'border-yellow-500 text-yellow-700'
                }>
                  {claim.status}
                </Badge>
                {claim.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => approveMutation.mutate({ id: claim.id })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-400 text-red-600 hover:bg-red-50"
                      onClick={() => rejectMutation.mutate({ id: claim.id })}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Direct Assign */}
        <div className="border-t border-[#1a472a]/10 pt-4">
          <button
            onClick={() => setShowAssign(!showAssign)}
            className="flex items-center gap-2 text-sm text-[#4a7c59] font-medium hover:text-[#1a472a]"
          >
            <Shield className="w-4 h-4" />
            Directly assign steward (skip claim flow)
          </button>
          {showAssign && (
            <div className="mt-3 space-y-3 p-4 bg-[#f0f7f0] rounded-lg border border-[#7dd87d]/20">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#1a472a]/80 mb-1 block">User ID</label>
                  <input
                    type="number"
                    value={assignForm.userId}
                    onChange={e => setAssignForm(f => ({ ...f, userId: e.target.value }))}
                    placeholder="User ID #"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd87d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#1a472a]/80 mb-1 block">Org Type</label>
                  <select
                    value={assignForm.orgType}
                    onChange={e => setAssignForm(f => ({ ...f, orgType: e.target.value as any }))}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd87d]"
                  >
                    <option value="land_project">Land Project</option>
                    <option value="alliance_org">Alliance Org</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#1a472a]/80 mb-1 block">Org ID (slug or DB ID)</label>
                  <input
                    value={assignForm.orgId}
                    onChange={e => setAssignForm(f => ({ ...f, orgId: e.target.value }))}
                    placeholder="e.g. ubuntu or 42"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd87d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#1a472a]/80 mb-1 block">Org Display Name</label>
                  <input
                    value={assignForm.orgName}
                    onChange={e => setAssignForm(f => ({ ...f, orgName: e.target.value }))}
                    placeholder="Ubuntu Village"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd87d]"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                disabled={!assignForm.userId || !assignForm.orgId || !assignForm.orgName || assignMutation.isPending}
                onClick={() => assignMutation.mutate({
                  userId: parseInt(assignForm.userId),
                  orgType: assignForm.orgType,
                  orgId: assignForm.orgId,
                  orgName: assignForm.orgName,
                })}
              >
                {assignMutation.isPending ? 'Assigning…' : 'Assign Steward'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Join Requests Admin Panel ─────────────────────────────────────────────────
function JoinRequestsAdminPanel() {
  const { data: requests, isLoading } = trpc.projectJoinRequests.listAll.useQuery();

  return (
    <Card className="bg-white border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-lg text-[#1a472a] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#7dd87d]" />
          Project / Org Join Requests
        </CardTitle>
        <CardDescription>All requests submitted via /connect to join a land project or alliance org</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-[#1a472a]/75">Loading…</p>}
        {!isLoading && !requests?.length && (
          <p className="text-sm text-[#1a472a]/75">No join requests yet.</p>
        )}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {requests?.map((req: any) => (
            <div key={req.id} className="p-3 rounded-lg border border-[#1a472a]/10 bg-[#f8f5f0] text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1a472a]">{req.submitterName}</p>
                  <p className="text-xs text-[#1a472a]/75">{req.submitterEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#1a472a]/75 font-medium">{req.targetName}</p>
                  <Badge variant="outline" className="text-xs h-5 mt-0.5">
                    {req.status}
                  </Badge>
                </div>
              </div>
              {req.submitterMessage && (
                <p className="mt-1.5 text-xs text-[#1a472a]/80 italic border-t border-[#1a472a]/10 pt-1.5">"{req.submitterMessage}"</p>
              )}
              {!req.stewardUserId && (
                <p className="mt-1 text-xs text-amber-600">No steward assigned  -  approve an org claim to route this</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Keyboard shortcuts help content
const SHORTCUTS = [
  { key: '/', desc: 'Focus search' },
  { key: '1–9', desc: 'Jump to tab (1=Overview, 2=Apps, 3=Investors…)' },
  { key: 'Esc', desc: 'Close dialog / clear search' },
];

// ─── Investor Priority Scoring ─────────────────────────────────────────────────

function getInvestorPriority(investor: any): { score: number; label: string; color: string } {
  let score = 0;
  const range = (investor.investmentRange || '').toLowerCase();
  if (range.includes('1m') || range.includes('1,000,000') || range.includes('million')) score += 5;
  else if (range.includes('500k') || range.includes('500,000')) score += 4;
  else if (range.includes('100k') || range.includes('100,000')) score += 3;
  else if (range.includes('50k') || range.includes('50,000')) score += 2;
  else if (range) score += 1;
  const daysOld = (Date.now() - new Date(investor.createdAt).getTime()) / 86_400_000;
  if (daysOld <= 7) score += 3;
  else if (daysOld <= 30) score += 2;
  else score += 1;
  const status = investor.status || 'new';
  if (status === 'new') score += 2;
  else if (status === 'in_discussion') score += 1;
  else if (status === 'declined' || status === 'archived') score -= 3;
  if (score >= 8) return { score, label: 'High', color: 'bg-red-100 text-red-700 border-red-200' };
  if (score >= 5) return { score, label: 'Med', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { score, label: 'Low', color: 'bg-gray-100 text-gray-500 border-gray-200' };
}

// ─── C15: Project Connections Admin Panel ─────────────────────────────────────
function ProjectConnectionsAdmin() {
  const utils = trpc.useUtils();
  const { data: connections, isLoading } = trpc.projectConnections.listAll.useQuery();
  const [postAId, setPostAId] = useState("");
  const [postBId, setPostBId] = useState("");
  const [connType, setConnType] = useState<"needs_each_other" | "similar">("needs_each_other");
  const [note, setNote] = useState("");

  const createMutation = trpc.projectConnections.create.useMutation({
    onSuccess: () => {
      setPostAId(""); setPostBId(""); setNote("");
      utils.projectConnections.listAll.invalidate();
    },
  });
  const deleteMutation = trpc.projectConnections.delete.useMutation({
    onSuccess: () => utils.projectConnections.listAll.invalidate(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2">
          <Handshake className="w-5 h-5" />
          Project Cross-Links
        </CardTitle>
        <CardDescription>Link forum threads as "Needs Each Other" or "Similar Projects" (C15)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-xs text-[#1a472a]/80 mb-1 block">Post A ID</Label>
            <Input type="number" value={postAId} onChange={e => setPostAId(e.target.value)} placeholder="e.g. 12" className="border-[#e8e4de]" />
          </div>
          <div>
            <Label className="text-xs text-[#1a472a]/80 mb-1 block">Post B ID</Label>
            <Input type="number" value={postBId} onChange={e => setPostBId(e.target.value)} placeholder="e.g. 34" className="border-[#e8e4de]" />
          </div>
          <div>
            <Label className="text-xs text-[#1a472a]/80 mb-1 block">Type</Label>
            <Select value={connType} onValueChange={(v) => setConnType(v as "needs_each_other" | "similar")}>
              <SelectTrigger className="border-[#e8e4de] text-[#1a472a]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_each_other">Needs Each Other</SelectItem>
                <SelectItem value="similar">Similar Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => createMutation.mutate({ postAId: parseInt(postAId), postBId: parseInt(postBId), connectionType: connType, note: note || undefined })}
            disabled={!postAId || !postBId || createMutation.isPending}
            className="bg-[#4a7c59] hover:bg-[#3a6449] text-white"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Link
          </Button>
        </div>
        <div>
          <Label className="text-xs text-[#1a472a]/80 mb-1 block">Note (optional)</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the connection..." className="border-[#e8e4de]" />
        </div>

        {isLoading ? (
          <p className="text-sm text-[#1a472a]/75">Loading...</p>
        ) : connections && connections.length > 0 ? (
          <div className="space-y-2 mt-2">
            {connections.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-[#f8f5f0] border border-[#e8e4de]">
                <div className="text-sm text-[#1a472a]">
                  <span className="font-semibold">#{c.postAId}</span>
                  <span className="text-[#1a472a]/75 mx-2">{c.connectionType === "needs_each_other" ? "needs" : "similar to"}</span>
                  <span className="font-semibold">#{c.postBId}</span>
                  {c.note && <span className="text-[#1a472a]/75 ml-2 text-xs">: {c.note}</span>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate({ id: c.id })}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#1a472a]/75 italic">No connections yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── C13: Glossary Admin Panel ────────────────────────────────────────────────
function GlossaryAdminPanel() {
  const utils = trpc.useUtils();
  const { data: terms, isLoading } = trpc.glossary.listAll.useQuery();
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [newSource, setNewSource] = useState("");
  const [editDefs, setEditDefs] = useState<Record<number, string>>({});

  const approveMutation = trpc.glossary.approve.useMutation({ onSuccess: () => utils.glossary.listAll.invalidate() });
  const rejectMutation = trpc.glossary.reject.useMutation({ onSuccess: () => utils.glossary.listAll.invalidate() });
  const addMutation = trpc.glossary.add.useMutation({
    onSuccess: () => { setNewTerm(""); setNewDef(""); setNewSource(""); utils.glossary.listAll.invalidate(); },
  });

  const proposed = (terms || []).filter(t => t.status === "proposed");
  const approved = (terms || []).filter(t => t.status === "approved");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Glossary Admin
        </CardTitle>
        <CardDescription>Review AI-proposed terms and manage the community glossary (C13)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add manually */}
        <div className="p-3 rounded-lg bg-[#f8f5f0] border border-[#e8e4de] space-y-2">
          <p className="text-xs font-bold text-[#1a472a] uppercase tracking-wide">Add Term Manually</p>
          <Input value={newTerm} onChange={e => setNewTerm(e.target.value)} placeholder="Term name" className="border-[#e8e4de]" />
          <Textarea value={newDef} onChange={e => setNewDef(e.target.value)} placeholder="Definition" rows={2} className="border-[#e8e4de] resize-none" />
          <Input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source thread URL (optional)" className="border-[#e8e4de]" />
          <Button
            onClick={() => addMutation.mutate({ term: newTerm, definition: newDef, sourceThreadUrl: newSource || undefined })}
            disabled={!newTerm || !newDef || addMutation.isPending}
            className="bg-[#4a7c59] hover:bg-[#3a6449] text-white"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add to Glossary
          </Button>
        </div>

        {/* Proposed terms */}
        {proposed.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#1a472a] uppercase tracking-wide mb-2">Proposed by AI ({proposed.length})</p>
            <div className="space-y-2">
              {proposed.map(t => (
                <div key={t.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-2">
                  <p className="font-bold text-[#1a472a] text-sm">{t.term}</p>
                  <Textarea
                    value={editDefs[t.id] ?? t.definition}
                    onChange={e => setEditDefs(prev => ({ ...prev, [t.id]: e.target.value }))}
                    rows={2}
                    className="border-[#e8e4de] bg-white resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: t.id, definition: editDefs[t.id] })}
                      disabled={approveMutation.isPending}
                      className="bg-[#4a7c59] hover:bg-[#3a6449] text-white h-7 text-xs px-3"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: t.id })}
                      disabled={rejectMutation.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs px-3"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved terms */}
        {approved.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#1a472a] uppercase tracking-wide mb-2">Approved ({approved.length})</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {approved.map(t => (
                <div key={t.id} className="flex items-start justify-between p-2 rounded bg-[#f8f5f0] border border-[#e8e4de]">
                  <div>
                    <p className="font-semibold text-[#1a472a] text-xs">{t.term}</p>
                    <p className="text-[#1a472a]/75 text-xs line-clamp-1">{t.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-[#1a472a]/75">Loading glossary...</p>}
        {!isLoading && (terms || []).length === 0 && (
          <p className="text-sm text-[#1a472a]/75 italic">No terms yet. AI will propose terms weekly based on forum activity.</p>
        )}
      </CardContent>
    </Card>
  );
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function AdminPlayersTab() {
  const { data: players, isLoading, refetch } = trpc.playerProfiles.list.useQuery();
  const [playerFilter, setPlayerFilter] = useState<'all' | 'verified' | 'unverified' | 'banned'>('all');
  const verifyMut = trpc.playerProfiles.verify.useMutation({ onSuccess: () => { refetch(); toast.success('Player verified'); } });
  const unverifyMut = trpc.playerProfiles.unverify.useMutation({ onSuccess: () => { refetch(); toast.success('Player unverified'); } });
  const banMut = trpc.playerProfiles.banPlayer.useMutation({ onSuccess: () => { refetch(); toast.success('Player banned'); } });
  const deleteMut = trpc.playerProfiles.deleteProfile.useMutation({ onSuccess: () => { refetch(); toast.success('Profile deleted'); } });
  const syncMut = trpc.playerProfiles.adminSyncTokens.useMutation({ onSuccess: () => { refetch(); toast.success('Tokens synced'); } });

  const filtered = (players || []).filter((p: any) => {
    if (playerFilter === 'verified') return p.isVerified === 1;
    if (playerFilter === 'unverified') return p.isVerified !== 1;
    return true;
  });

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Users className="w-5 h-5" />
            Players ({players?.length ?? 0})
          </CardTitle>
          <div className="flex gap-2">
            {(['all', 'verified', 'unverified'] as const).map(f => (
              <button
                key={f}
                onClick={() => setPlayerFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${playerFilter === f ? 'bg-[#1a472a] text-white border-[#1a472a]' : 'border-[#1a472a]/20 text-[#1a472a]/75 hover:bg-[#f0ebe3]'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-[#1a472a]/80">Loading players...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[#1a472a]/80">No players found</div>
        ) : (
          <div className="divide-y divide-[#1a472a]/10">
            {filtered.map((player: any) => (
              <div key={player.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1a472a] text-sm">{player.displayName}</p>
                    {player.isVerified === 1 ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Verified</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">Unverified</Badge>
                    )}
                    {player.walletAddress ? (
                      <span className="text-[10px] text-[#1a472a]/80 font-mono">{truncateAddr(player.walletAddress)}</span>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">No wallet</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#1a472a]/80 mt-0.5">
                    RV: {player.rvoiceBalance || 0} | RG: {player.rgenBalance || 0}
                    {player.lastTokenSync ? ` | Synced ${new Date(player.lastTokenSync).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {player.isVerified !== 1 ? (
                    <button
                      onClick={() => verifyMut.mutate({ id: player.id })}
                      className="text-[10px] px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                    >Verify</button>
                  ) : (
                    <button
                      onClick={() => unverifyMut.mutate({ profileId: player.id })}
                      className="text-[10px] px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                    >Unverify</button>
                  )}
                  {player.walletAddress && (
                    <button
                      onClick={() => syncMut.mutate({ profileId: player.id })}
                      className="text-[10px] px-2 py-1 rounded border border-[#7dd87d] text-[#4a7c59] hover:bg-green-50 transition-colors"
                    >Sync Tokens</button>
                  )}
                  <button
                    onClick={() => { if (window.confirm('Ban this player?')) banMut.mutate({ profileId: player.id }); }}
                    className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >Ban</button>
                  <button
                    onClick={() => { if (window.confirm('Delete this profile? This cannot be undone.')) deleteMut.mutate({ profileId: player.id }); }}
                    className="text-[10px] px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("tab") || "overview"; } catch { return "overview"; }
  });
  // Mirror the active tab into the URL (?tab=) so admin sections are
  // bookmarkable, shareable, survive a refresh, and respond to browser
  // back/forward. Query-only, so wouter stays on /admin and existing
  // /admin/* routes are untouched.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (activeTab === "overview") url.searchParams.delete("tab");
      else url.searchParams.set("tab", activeTab);
      const next = url.pathname + url.search;
      if (next !== window.location.pathname + window.location.search) {
        window.history.pushState(null, "", next);
      }
    } catch { /* history unavailable */ }
  }, [activeTab]);
  useEffect(() => {
    const onPop = () => {
      try { setActiveTab(new URLSearchParams(window.location.search).get("tab") || "overview"); } catch { /* noop */ }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [investorSearch, setInvestorSearch] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [investorStatusFilter, setInvestorStatusFilter] = useState<string>('all');
  const [showDrafts, setShowDrafts] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiSelectedContact, setAiSelectedContact] = useState<{ email?: string; name?: string } | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem('admin_density') === 'compact'; } catch { return false; }
  });
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleAIAction(action: AdminAIAction) {
    if (action.type === "navigate" && action.tab) {
      setActiveTab(action.tab);
    } else if (action.type === "search" && action.query) {
      setInvestorSearch(action.query);
      setActiveTab("investors");
    } else if (action.type === "compose" && action.to) {
      // Open compose  -  navigate to investors/alliance and set the search
      setInvestorSearch(action.to);
    } else if (action.type === "focus" && action.contactEmail) {
      setAiSelectedContact({ email: action.contactEmail, name: action.contactEmail });
    }
  }

  // Debounce global search for tRPC endpoint
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(globalSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [globalSearch]);

  // Fetch forum posts + campaigns via globalSearch tRPC router
  const { data: trpcSearchResults } = trpc.globalSearch.query.useQuery(
    { q: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 }
  );

  // Keyboard shortcuts
  useEffect(() => {
    const TAB_KEYS: Record<string, string> = {
      '1': 'overview', '2': 'applications', '3': 'investors',
      '4': 'alliance', '5': 'live', '6': 'create', '7': 'other',
      '8': 'broadcast', '9': 'kanban',
    };
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      // '?' is handled by ShortcutHelpOverlay
      if (e.key === '/' ) { e.preventDefault(); (document.querySelector('[data-global-search]') as HTMLInputElement)?.focus(); }
      if (TAB_KEYS[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setActiveTab(TAB_KEYS[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch all data
  const { data: applications, isLoading: loadingApps } = trpc.applications.list.useQuery();
  const { data: draftApplications } = trpc.applications.listDrafts.useQuery();
  const { data: investors, isLoading: loadingInvestors } = trpc.investorInquiries.list.useQuery();
  const { data: inquiries, isLoading: loadingInquiries } = trpc.generalInquiries.list.useQuery();

  const utils = trpc.useUtils();
  const auditNote = trpc.contactNotes.create.useMutation();

  const logAudit = (contactType: string, contactId: number, message: string) => {
    auditNote.mutate({ contactType, contactId, note: `📋 ${message}`, authorName: 'System' });
  };

  const updateInvestorMutation = trpc.investorInquiries.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.investorInquiries.list.invalidate();
      logAudit('investor', variables.id, `Status → ${variables.status}`);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const updateGeneralMutation = trpc.generalInquiries.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.generalInquiries.list.invalidate();
      logAudit('general_inquiry', variables.id, `Status → ${variables.status}`);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const isLoading = loadingApps || loadingInvestors || loadingInquiries;

  // Calculate stats
  const stats = {
    totalApplications: applications?.length || 0,
    totalInvestors: investors?.length || 0,
    totalInquiries: inquiries?.length || 0,
    pendingReview: (applications?.filter((a: any) => a.status === 'pending').length || 0) +
                   (investors?.filter((i: any) => i.status === 'pending').length || 0) +
                   (inquiries?.filter((i: any) => i.status === 'pending' || i.status === 'new').length || 0),
  };

  // Group inquiries by path type
  const inquiriesByPath = inquiries?.reduce((acc: Record<string, number>, inquiry: any) => {
    const path = inquiry.pathType || 'other';
    acc[path] = (acc[path] || 0) + 1;
    return acc;
  }, {}) || {};

  // Duplicate email detection for investors
  const investorEmailCounts = (investors || []).reduce((acc: Record<string, number>, inv: any) => {
    if (inv.email) acc[inv.email] = (acc[inv.email] || 0) + 1;
    return acc;
  }, {});
  const duplicateInvestorEmails = new Set(
    Object.entries(investorEmailCounts).filter(([, c]) => c > 1).map(([e]) => e)
  );

  // Filtered lists for search
  const filteredInvestors = (investors || []).filter((inv: any) => {
    const matchesSearch = !investorSearch ||
      inv.fullName?.toLowerCase().includes(investorSearch.toLowerCase()) ||
      inv.email?.toLowerCase().includes(investorSearch.toLowerCase()) ||
      inv.investmentRange?.toLowerCase().includes(investorSearch.toLowerCase()) ||
      inv.organization?.toLowerCase().includes(investorSearch.toLowerCase());
    const matchesStatus = investorStatusFilter === 'all' || inv.status === investorStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredApps = (applications || []).filter((app: any) =>
    !appSearch ||
    app.projectName?.toLowerCase().includes(appSearch.toLowerCase()) ||
    app.location?.toLowerCase().includes(appSearch.toLowerCase()) ||
    app.vision?.toLowerCase().includes(appSearch.toLowerCase())
  );

  const q = globalSearch.trim().toLowerCase();
  const isSearching = q.length >= 2;
  const globalResults = isSearching ? {
    investors: (investors || []).filter((i: any) =>
      i.fullName?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.organization?.toLowerCase().includes(q)
    ).slice(0, 4),
    applications: (applications || []).filter((a: any) =>
      a.projectName?.toLowerCase().includes(q) || a.contactName?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
    ).slice(0, 4),
    inquiries: (inquiries || []).filter((i: any) =>
      i.fullName?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q)
    ).slice(0, 4),
    forumPosts: trpcSearchResults?.forumPosts ?? [],
    campaigns: trpcSearchResults?.campaigns ?? [],
  } : null;

  // Investor investment range totals for display
  const investorRangeCounts = (investors || []).reduce((acc: Record<string, number>, inv: any) => {
    const range = inv.investmentRange || 'Not specified';
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  return (
    <div className={`admin-root flex h-[100dvh] overflow-hidden bg-[#f0ebe3] ${compact ? 'admin-compact' : ''}`}>
      <ShortcutHelpOverlay />
      <AdminNotificationCenter open={notifCenterOpen} onClose={() => setNotifCenterOpen(false)} />
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <AdminCommandPalette onSelectTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white py-4 md:py-6">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden min-h-11 min-w-11 -ml-2 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors"
                aria-label="Open admin navigation"
              >
                <Menu className="w-6 h-6" />
              </button>
              <img src="/images/logos/regencivics-logo-dark-transparent-rounded.webp" alt="ReGen Civics" className="w-10 h-10 md:w-12 md:h-12 object-contain flex-shrink-0" width={48} height={48} loading="lazy" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    Admin Dashboard
                  </h1>
                  {stats.pendingReview > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-400 text-[#1a472a] text-xs font-bold min-w-[24px]">
                      {stats.pendingReview}
                    </span>
                  )}
                </div>
                <p className="text-white/85 text-sm md:text-base">
                  {stats.totalApplications + stats.totalInvestors + stats.totalInquiries} total submissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <Link href="/admin-create">
                <Button size="sm" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#a8e6a8] font-semibold text-xs md:text-sm">
                  <Sprout className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  The Harvest
                </Button>
              </Link>
              <Link href="/admin/calls">
                <Button variant="outline" size="sm" className="border-[#7dd87d]/60 text-[#7dd87d] hover:bg-[#7dd87d]/20 text-xs md:text-sm">
                  <Phone className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Calls
                </Button>
              </Link>
              <Link href="/admin/funding">
                <Button variant="outline" size="sm" className="border-[#7dd87d]/60 text-[#7dd87d] hover:bg-[#7dd87d]/20 text-xs md:text-sm">
                  <Landmark className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Funding
                </Button>
              </Link>
              <Link href="/admin/applications">
                <Button variant="outline" size="sm" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/20 text-xs md:text-sm">
                  <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Application </span>Reviews
                </Button>
              </Link>
              <Link href="/admin/moderation">
                <Button variant="outline" size="sm" className="border-[#d4a574] text-[#d4a574] hover:bg-[#d4a574]/20 text-xs md:text-sm">
                  <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Forum </span>Moderation
                </Button>
              </Link>
              <button
                onClick={() => setNotifCenterOpen(true)}
                className="relative p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
                title="Notification Center"
                aria-label="Notification Center"
              >
                <Bell className="w-4 h-4" />
              </button>
              <Button
                variant="outline"
                size="sm"
                className={`border-white/30 text-white hover:bg-white/10 text-xs ${compact ? 'bg-white/10' : ''}`}
                onClick={() => {
                  const next = !compact;
                  setCompact(next);
                  try { localStorage.setItem('admin_density', next ? 'compact' : 'default'); } catch {}
                }}
                title={compact ? 'Switch to default density' : 'Switch to compact density'}
              >
                <AlignJustify className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline ml-1">{compact ? 'Default' : 'Compact'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 text-xs md:text-sm"
                onClick={() => {
                  localStorage.removeItem("admin_authenticated");
                  window.location.reload();
                }}
              >
                <Lock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Logout
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 text-xs md:text-sm">
                  <HomeIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Back to Site</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* The Harvest: the daily driver. The header chip is easy to miss, so the
          content pipeline gets a front door you cannot walk past. */}
      <div className="bg-white border-b border-[#1a472a]/10">
        <div className="container px-4 py-4">
          <Link
            href="/admin-create"
            className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] px-5 py-5 md:px-7 md:py-6 shadow-sm transition-all hover:from-[#2d5a3d] hover:to-[#4a7c59] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#7dd87d]/40"
          >
            <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#7dd87d]/20 text-[#7dd87d]">
              <Sprout className="w-6 h-6 md:w-7 md:h-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg md:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                The Harvest
              </span>
              <span className="block text-sm md:text-base text-white/85">
                Compose, fact-check, and publish. Your content pipeline.
              </span>
            </span>
            <ArrowRight className="hidden sm:block w-6 h-6 flex-shrink-0 text-[#7dd87d] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-white border-b border-[#1a472a]/10">
        <div className="container px-4 py-2.5">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/75 pointer-events-none" />
            <input
              type="text"
              data-global-search
              placeholder='Search contacts, projects, posts… (press "/" to focus)'
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setGlobalSearchOpen(true); }}
              onFocus={() => setGlobalSearchOpen(true)}
              onBlur={() => setTimeout(() => setGlobalSearchOpen(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setGlobalSearch(''); setGlobalSearchOpen(false); }
                if (e.key === 'Enter' && globalResults) {
                  // Navigate to first available result
                  const first =
                    globalResults.investors[0] ? (() => { setInvestorSearch(globalResults.investors[0].email || globalResults.investors[0].fullName); setActiveTab('investors'); setGlobalSearch(''); }) :
                    globalResults.applications[0] ? (() => { setAppSearch(globalResults.applications[0].projectName); setActiveTab('applications'); setGlobalSearch(''); }) :
                    globalResults.inquiries[0] ? (() => { setActiveTab(globalResults.inquiries[0].pathType || 'live'); setGlobalSearch(''); }) :
                    globalResults.campaigns[0] ? (() => { window.open(globalResults.campaigns[0].url, '_blank'); setGlobalSearch(''); }) :
                    globalResults.forumPosts[0] ? (() => { window.open(globalResults.forumPosts[0].url, '_blank'); setGlobalSearch(''); }) :
                    null;
                  if (first) first();
                }
              }}
              className="w-full pl-9 pr-8 py-2 text-sm border border-[#1a472a]/40 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/80 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
              aria-label="Search contacts, projects, posts"
            />
            {globalSearch && (
              <button onClick={() => { setGlobalSearch(''); setGlobalSearchOpen(false); }} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1a472a]/75 hover:text-[#1a472a]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {globalSearchOpen && isSearching && globalResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#1a472a]/20 rounded-xl shadow-xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
                {globalResults.investors.length === 0 && globalResults.applications.length === 0 && globalResults.inquiries.length === 0 && globalResults.forumPosts.length === 0 && globalResults.campaigns.length === 0 ? (
                  <p className="p-4 text-sm text-[#1a472a]/75 text-center">No results for "{globalSearch}"</p>
                ) : (
                  <div className="divide-y divide-[#1a472a]/10">
                    {globalResults.investors.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-semibold text-[#1a472a]/75 uppercase tracking-wide bg-amber-50">Investors</p>
                        {globalResults.investors.map((i: any) => (
                          <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2"
                            onClick={() => { setInvestorSearch(i.email || i.fullName); setActiveTab('investors'); setGlobalSearch(''); }}>
                            <TrendingUp className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{i.fullName}</span>
                            <span className="text-xs text-[#1a472a]/75 truncate">{i.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.applications.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-semibold text-[#1a472a]/75 uppercase tracking-wide bg-green-50">Projects</p>
                        {globalResults.applications.map((a: any) => (
                          <button key={a.id} className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2"
                            onClick={() => { setAppSearch(a.projectName || a.contactName); setActiveTab('applications'); setGlobalSearch(''); }}>
                            <Sprout className="w-3.5 h-3.5 text-[#4a7c59] flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{a.projectName || a.contactName}</span>
                            <span className="text-xs text-[#1a472a]/75">{a.location}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.inquiries.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-semibold text-[#1a472a]/75 uppercase tracking-wide bg-purple-50">Inquiries</p>
                        {globalResults.inquiries.map((i: any) => (
                          <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2"
                            onClick={() => { setActiveTab(i.pathType || 'live'); setGlobalSearch(''); }}>
                            <MessageSquare className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{i.fullName || i.email}</span>
                            <span className="text-xs text-[#1a472a]/75">{i.pathType?.replace(/_/g, ' ')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.campaigns.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-semibold text-[#1a472a]/75 uppercase tracking-wide bg-blue-50">Campaigns</p>
                        {globalResults.campaigns.map((c: any) => (
                          <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer"
                            className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2 block"
                            onClick={() => setGlobalSearch('')}>
                            <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{c.title}</span>
                            <ExternalLink className="w-3 h-3 text-[#1a472a]/80 ml-auto flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                    {globalResults.forumPosts.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-semibold text-[#1a472a]/75 uppercase tracking-wide bg-teal-50">Forum Posts</p>
                        {globalResults.forumPosts.map((p: any) => (
                          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                            className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2 block"
                            onClick={() => setGlobalSearch('')}>
                            <BookOpen className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{p.title}</span>
                            <ExternalLink className="w-3 h-3 text-[#1a472a]/80 ml-auto flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The old alert banner is replaced by the richer "Needs you" queue at
          the top of the Overview tab (AdminNeedsYou). */}
      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto">
      {/* Stats */}
      <div className="container py-8">
        {/* Funding Pipeline: the primary way into /admin/funding. The header
            chip is easy to miss, and this is the surface Rye works from most
            during a raise, so it gets a full-width card instead of a button in
            a row of six. White on #1a472a measures 10.6:1. */}
        <Link href="/admin/funding">
          <a className="group block mb-6 rounded-2xl bg-gradient-to-r from-[#1a472a] to-[#0d2818] border border-[#7dd87d]/30 p-5 md:p-6 hover:border-[#7dd87d]/70 hover:shadow-xl transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#7dd87d]/20 border border-[#7dd87d]/40 flex items-center justify-center flex-shrink-0">
                <Landmark className="w-6 h-6 md:w-7 md:h-7 text-[#7dd87d]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-white">Funding Pipeline</h2>
                <p className="text-white/85 text-sm md:text-base">
                  All 117 researched funders, where each application stands, and the positioning generator. Prepare an
                  application to get a Cowork prompt you can run.
                </p>
              </div>
              <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#7dd87d] text-[#1a472a] font-bold px-5 py-3 min-h-11 flex-shrink-0 group-hover:bg-[#a8e6a8] transition-colors">
                Open
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </a>
        </Link>

        {/* The clickable KPI row inside the Overview tab is the single stat
            surface now; the old duplicate summary cards were removed. */}

        {/* Main Tabs - navigation is handled by AdminSidebar */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <Suspense fallback={<div className="py-20 text-center text-[#1a472a]/75 text-sm">Loading section…</div>}>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <AdminOverviewTab
              stats={stats}
              applications={applications}
              investors={investors}
              inquiries={inquiries}
              inquiriesByPath={inquiriesByPath}
              setActiveTab={setActiveTab}
              setInvestorStatusFilter={setInvestorStatusFilter}
            />
          </TabsContent>



          {/* Project Applications Tab */}
          <TabsContent value="applications">
            <AdminApplicationsTab
              applications={applications}
              draftApplications={draftApplications}
              filteredApps={filteredApps}
              appSearch={appSearch}
              setAppSearch={setAppSearch}
              showDrafts={showDrafts}
              setShowDrafts={setShowDrafts}
              ContactNotesPanel={ContactNotesPanel}
              ContactTagsPanel={ContactTagsPanel}
              ReminderPanel={ReminderPanel}
              AssigneeSelect={AssigneeSelect}
              EmailHistoryPanelComp={EmailHistoryPanel}
            />
          </TabsContent>

          {/* Investor Inquiries Tab */}
          <TabsContent value="investors">
            <AdminInvestorsTab
              investors={investors}
              filteredInvestors={filteredInvestors}
              investorSearch={investorSearch}
              setInvestorSearch={setInvestorSearch}
              investorStatusFilter={investorStatusFilter}
              setInvestorStatusFilter={setInvestorStatusFilter}
              investorRangeCounts={investorRangeCounts}
              duplicateInvestorEmails={duplicateInvestorEmails}
              updateInvestorMutation={updateInvestorMutation}
              getInvestorPriority={getInvestorPriority}
              exportToCSV={exportToCSV}
              EmailHistoryPanelComp={EmailHistoryPanel}
              ContactNotesPanelComp={ContactNotesPanel}
              ContactTagsPanelComp={ContactTagsPanel}
              ReminderPanelComp={ReminderPanel}
              AssigneeSelectComp={AssigneeSelect}
            />
          </TabsContent>

          {/* Alliance Partners Tab */}
          <TabsContent value="alliance">
            <AdminAllianceTab inquiries={inquiries} InquirySectionComp={InquirySection} />
          </TabsContent>

          {/* Create with ReGens Tab */}
          <TabsContent value="create">
            <AdminCreateTab inquiries={inquiries} InquirySectionComp={InquirySection} />
          </TabsContent>

          {/* Live in Land Project Tab */}
          <TabsContent value="live">
            <AdminLiveTab inquiries={inquiries} InquirySectionComp={InquirySection} />
          </TabsContent>

          {/* Role in ReGen Civics Tab */}
          <TabsContent value="role">
            <AdminRoleTab />
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="roles">
            <AdminRolesTab AdminPlayersTabComp={AdminPlayersTab} />
          </TabsContent>

          {/* Other Inquiries Tab */}
          <TabsContent value="other">
            <AdminOtherInquiriesTab
              inquiries={inquiries}
              updateGeneralMutation={updateGeneralMutation}
              pathTypeConfig={pathTypeConfig}
              EmailHistoryPanelComp={EmailHistoryPanel}
              ContactNotesPanelComp={ContactNotesPanel}
              ContactTagsPanelComp={ContactTagsPanel}
              ReminderPanelComp={ReminderPanel}
              AssigneeSelectComp={AssigneeSelect}
            />
          </TabsContent>

          {/* Crowd Pooling Projects Tab */}
          <TabsContent value="crowdpooling">
            <AdminCrowdpoolingTab />
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter">
            <AdminNewsletterTab
              NewsletterSubscribersListComp={NewsletterSubscribersList}
            />
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <AdminBroadcastTab />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AdminAnalyticsTab />
          </TabsContent>

          {/* LOI Tab */}
          <TabsContent value="loi">
            <AdminLOITab />
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners">
            <AdminBannersTab />
          </TabsContent>

          {/* Kanban Board Tab */}
          <TabsContent value="kanban">
            <AdminKanbanTab
              investors={investors || []}
              inquiries={inquiries || []}
              applications={applications || []}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AdminSettingsTab
              BufferSettingsPanelComp={BufferSettingsPanel}
              ReviewerEmailManagerComp={ReviewerEmailManager}
              ScheduledEmailsManagerComp={ScheduledEmailsManager}
              AdminAMAPanelComp={AdminAMAPanel}
              OrgClaimsAdminPanelComp={OrgClaimsAdminPanel}
              JoinRequestsAdminPanelComp={JoinRequestsAdminPanel}
              ProjectConnectionsAdminComp={ProjectConnectionsAdmin}
              GlossaryAdminPanelComp={GlossaryAdminPanel}
            />
          </TabsContent>

          <TabsContent value="images">
            <AdminImagesTab />
          </TabsContent>

          <TabsContent value="custom-games">
            <div className="space-y-10">
              <AdminCustomGameApplications />
              <AdminCustomGamesTab AdminCustomGameWaitlistComp={AdminCustomGameWaitlist} />
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <AdminEventsTab />
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings">
            <AdminRecordingsTab />
          </TabsContent>

          {/* Role Holders Tab (Movement Coordination Engine, Phase 1) */}
          <TabsContent value="role-holders">
            <AdminRoleHoldersTab />
          </TabsContent>

          {/* Call Tasks Queue (Movement Coordination Engine, Phase 3) */}
          <TabsContent value="call-tasks">
            <AdminTasksTab />
          </TabsContent>

          {/* Edited Cuts (Movement Coordination Engine, Phase 4) */}
          <TabsContent value="edited-cuts">
            <AdminEditsTab />
          </TabsContent>

          {/* Widgets Tab */}
          <TabsContent value="widgets">
            <AdminWidgetsTab />
          </TabsContent>

          {/* SEEDS Claims Tab */}
          <TabsContent value="seeds-claims">
            <AdminSeedsClaimsTab />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log">
            <AdminAuditLogTab />
          </TabsContent>
          <TabsContent value="citizenship-tiers">
            <AdminCitizenshipTiers />
          </TabsContent>
          </Suspense>
        </Tabs>
      </div>
      </div>{/* end flex-1 overflow-y-auto */}
      </div>{/* end flex-1 flex flex-col overflow-hidden */}

      {/* Floating AI Assistant */}
      <AdminAIAssistant
        context={{
          activeTab,
          investorCount: investors?.length,
          inquiryCount: inquiries?.length,
          applicationCount: applications?.length,
          selectedContactEmail: aiSelectedContact?.email,
          selectedContactName: aiSelectedContact?.name,
        }}
        onAction={handleAIAction}
      />
    </div>
  );
}

// ── Recordings Tab ────────────────────────────────────────────────────────────
function AdminRecordingsTab() {
  const { data: recs = [], refetch, isLoading } = trpc.recordings.adminList.useQuery();
  const updateMutation = trpc.recordings.update.useMutation({ onSuccess: () => refetch() });
  const sendEmailMutation = trpc.recordings.sendEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Email sent to ${data.sent} subscribers`);
      refetch();
    },
  });
  const deleteMutation = trpc.recordings.delete.useMutation({ onSuccess: () => refetch() });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editSummary, setEditSummary] = useState('');

  function startEdit(rec: (typeof recs)[0]) {
    setEditingId(rec.id);
    setEditYoutubeUrl(rec.youtubeUrl ?? '');
    setEditSummary(rec.aiSummary ?? '');
  }
  function saveEdit(id: number) {
    updateMutation.mutate({ id, youtubeUrl: editYoutubeUrl || null, aiSummary: editSummary || null });
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recordings</h2>
          <p className="text-muted-foreground text-sm mt-1">Recordings received from Riverside.fm via webhook. Add YouTube URLs and send email summaries from here.</p>
        </div>
      </div>

      {isLoading && <div className="text-muted-foreground">Loading recordings…</div>}

      {!isLoading && recs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Radio className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recordings yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Once you set up the Riverside webhook at <code className="bg-muted px-1 rounded text-xs">https://regencivics.earth/api/webhooks/riverside</code>, recordings will appear here automatically after each session.
            </p>
          </CardContent>
        </Card>
      )}

      {recs.map((rec) => (
        <Card key={rec.id} className={rec.emailSent ? 'border-green-500/30' : ''}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg">{rec.title}</CardTitle>
                <CardDescription className="mt-1">
                  {rec.sessionDate ? new Date(rec.sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date unknown'}
                  {rec.durationSeconds ? ` · ${Math.floor(rec.durationSeconds / 60)} min` : ''}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {rec.emailSent ? (
                  <Badge variant="outline" className="border-green-500 text-green-600">Email sent</Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">Email pending</Badge>
                )}
                {rec.featured ? <Badge className="bg-purple-600">Featured</Badge> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingId === rec.id ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">YouTube URL</Label>
                  <Input value={editYoutubeUrl} onChange={e => setEditYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">AI Summary</Label>
                  <Textarea value={editSummary} onChange={e => setEditSummary(e.target.value)} rows={4} placeholder="Paste or edit the summary shown in the email..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(rec.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-3 text-sm">
                  {rec.youtubeUrl && (
                    <a href={rec.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-500 hover:underline">
                      <ExternalLink className="w-3 h-3" /> YouTube
                    </a>
                  )}
                  {rec.riversideUrl && (
                    <a href={rec.riversideUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-500 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Riverside
                    </a>
                  )}
                  {rec.forumPostId && (
                    <a href={`/community/post/${rec.forumPostId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                      <MessageSquare className="w-3 h-3" /> Forum post
                    </a>
                  )}
                </div>
                {rec.aiSummary && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{rec.aiSummary}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => startEdit(rec)}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              {!rec.emailSent && (
                <Button
                  size="sm"
                  className="bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => sendEmailMutation.mutate({ id: rec.id })}
                  disabled={sendEmailMutation.isPending}
                >
                  <Send className="w-3 h-3 mr-1" />
                  {sendEmailMutation.isPending ? 'Sending…' : 'Send Email Summary'}
                </Button>
              )}
              {rec.emailSent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendEmailMutation.mutate({ id: rec.id })}
                  disabled={sendEmailMutation.isPending}
                >
                  <Send className="w-3 h-3 mr-1" /> Resend Email
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateMutation.mutate({ id: rec.id, featured: rec.featured ? 0 : 1 })}
              >
                {rec.featured ? 'Unfeature' : '⭐ Feature'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => { if (confirm('Delete this recording record?')) deleteMutation.mutate({ id: rec.id }); }}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground font-medium mb-2">Webhook setup</p>
          <p className="text-xs text-muted-foreground">In Riverside: Settings → Integrations → Webhooks → add URL:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">https://regencivics.earth/api/webhooks/riverside</code>
          <p className="text-xs text-muted-foreground mt-2">Set <code className="bg-muted px-1 rounded">RIVERSIDE_WEBHOOK_SECRET</code> in Railway to the signing secret from Riverside.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Events Tab ────────────────────────────────────────────────────────────────
function AdminEventsTab() {
  const { data: allEvents = [], refetch, isLoading } = trpc.events.adminList.useQuery();
  const { data: signupCounts = [] } = trpc.events.signupCounts.useQuery();
  const { data: agendaSuggestions = [] } = trpc.events.listAgendaSuggestions.useQuery({});
  const createMutation = trpc.events.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); setFormData(defaultForm); } });
  const updateMutation = trpc.events.update.useMutation({ onSuccess: () => { refetch(); setEditingId(null); } });
  const deleteMutation = trpc.events.delete.useMutation({ onSuccess: () => refetch() });
  const reminderMutation = trpc.events.sendReminders.useMutation();
  const agendaUpdateMutation = trpc.events.updateAgendaSuggestion.useMutation({ onSuccess: () => { refetch(); } });
  const rollupMutation = trpc.events.sendSeasonRollup.useMutation();
  const followupMutation = trpc.events.sendFollowup.useMutation();
  const markAttendanceMutation = trpc.events.markAttendance.useMutation({ onSuccess: () => { refetchAttendance(); } });
  const removeAttendanceMutation = trpc.events.removeAttendance.useMutation({ onSuccess: () => { refetchAttendance(); } });
  const speakerIntroMutation = trpc.events.sendSpeakerIntro.useMutation();
  const [followupSuccess, setFollowupSuccess] = useState<number | null>(null);
  const [checkinCopied, setCheckinCopied] = useState<number | null>(null);
  const [speakerIntroSuccess, setSpeakerIntroSuccess] = useState<number | null>(null);
  const [scheduleFor, setScheduleFor] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState<number | null>(null);

  const defaultForm = {
    title: '', description: '', type: 'open' as const, startTime: '', endTime: '',
    timezone: 'EDT', zoomUrl: '', riversideRoomUrl: '', youtubeUrl: '',
    season: '', episodeNumber: '', maxAttendees: '',
    guestSpeakerName: '', guestSpeakerBio: '', guestSpeakerTopic: '',
  };

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [attendanceEventId, setAttendanceEventId] = useState<number | null>(null);
  const [attendanceInput, setAttendanceInput] = useState(''); // comma or newline-separated emails
  const [formData, setFormData] = useState(defaultForm);
  const [reminderSuccess, setReminderSuccess] = useState<number | null>(null);
  const [reminderEditorOpen, setReminderEditorOpen] = useState<number | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [rollupSeason, setRollupSeason] = useState('');
  const [showAgendaFor, setShowAgendaFor] = useState<number | null>(null);
  const [preflightEventId, setPreflightEventId] = useState<number | null>(null);
  const [preflightConfirmed, setPreflightConfirmed] = useState(false);

  const { data: attendanceList = [], refetch: refetchAttendance } = trpc.events.listAttendance.useQuery(
    { eventId: attendanceEventId! },
    { enabled: attendanceEventId !== null }
  );
  const { data: tokenLeaderboard = [] } = trpc.events.tokenLeaderboard.useQuery({ limit: 10 });

  const countMap = Object.fromEntries(signupCounts.map(r => [r.eventId, r.count]));

  function startEdit(ev: any) {
    setEditingId(ev.id);
    setFormData({
      title: ev.title ?? '',
      description: ev.description ?? '',
      type: ev.type ?? 'open',
      startTime: ev.startTime ? new Date(ev.startTime).toISOString().slice(0, 16) : '',
      endTime: ev.endTime ? new Date(ev.endTime).toISOString().slice(0, 16) : '',
      timezone: ev.timezone ?? 'EDT',
      zoomUrl: ev.zoomUrl ?? '',
      riversideRoomUrl: ev.riversideRoomUrl ?? '',
      youtubeUrl: ev.youtubeUrl ?? '',
      season: ev.season ?? '',
      maxAttendees: (ev as any).maxAttendees ? String((ev as any).maxAttendees) : '',
      episodeNumber: ev.episodeNumber ? String(ev.episodeNumber) : '',
      guestSpeakerName: ev.guestSpeakerName ?? '',
      guestSpeakerBio: ev.guestSpeakerBio ?? '',
      guestSpeakerTopic: ev.guestSpeakerTopic ?? '',
    });
  }

  function handleSave() {
    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      startTime: formData.startTime,
      endTime: formData.endTime || undefined,
      timezone: formData.timezone,
      zoomUrl: formData.zoomUrl || undefined,
      riversideRoomUrl: formData.riversideRoomUrl || undefined,
      youtubeUrl: formData.youtubeUrl || undefined,
      season: formData.season || undefined,
      maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
      episodeNumber: formData.episodeNumber ? parseInt(formData.episodeNumber) : undefined,
      guestSpeakerName: formData.guestSpeakerName || undefined,
      guestSpeakerBio: formData.guestSpeakerBio || undefined,
      guestSpeakerTopic: formData.guestSpeakerTopic || undefined,
    };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload as any);
    }
  }

  const typeColors: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-300',
    episode: 'bg-green-500/20 text-green-300',
    special: 'bg-purple-500/20 text-purple-300',
  };
  const statusColors: Record<string, string> = {
    upcoming: 'bg-yellow-500/20 text-yellow-300',
    live: 'bg-red-500/20 text-red-300 animate-pulse',
    completed: 'bg-gray-500/20 text-gray-300',
    cancelled: 'bg-gray-700/30 text-gray-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Events</h2>
          <p className="text-sm text-white/70">Manage schedule events. Events appear on the Schedule page automatically.</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingId(null); setFormData(defaultForm); }}
          className="bg-green-600 hover:bg-green-700 text-white">
          <Plus size={14} className="mr-1" /> Add Event
        </Button>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId !== null) && (
        <Card className="bg-[#0f2a18] border-green-800/40">
          <CardHeader>
            <CardTitle className="text-white text-base">{editingId !== null ? 'Edit Event' : 'New Event'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">Title *</Label>
                <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="Week 1: Selection Day" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="What will this session cover?" className="bg-white/5 border-white/20 text-white mt-1 resize-none" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Session</SelectItem>
                    <SelectItem value="episode">Incubator Episode</SelectItem>
                    <SelectItem value="special">Special Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Timezone display (e.g., EDT)</Label>
                <Input value={formData.timezone} onChange={e => setFormData(f => ({ ...f, timezone: e.target.value }))}
                  placeholder="EDT" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Start Time (local, stored as UTC)</Label>
                <Input type="datetime-local" value={formData.startTime} onChange={e => setFormData(f => ({ ...f, startTime: e.target.value }))}
                  className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">End Time (optional)</Label>
                <Input type="datetime-local" value={formData.endTime} onChange={e => setFormData(f => ({ ...f, endTime: e.target.value }))}
                  className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Season (e.g., Season 2)</Label>
                <Input value={formData.season} onChange={e => setFormData(f => ({ ...f, season: e.target.value }))}
                  placeholder="Season 2" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Episode Number</Label>
                <Input type="number" value={formData.episodeNumber} onChange={e => setFormData(f => ({ ...f, episodeNumber: e.target.value }))}
                  placeholder="1" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Max Attendees <span className="text-white/70 font-normal">(leave blank for unlimited)</span></Label>
                <Input type="number" value={formData.maxAttendees} onChange={e => setFormData(f => ({ ...f, maxAttendees: e.target.value }))}
                  placeholder="e.g. 50 (triggers waitlist when full)" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Riverside Room URL <span className="text-purple-400 font-normal">(primary join link)</span></Label>
                <Input value={formData.riversideRoomUrl} onChange={e => setFormData(f => ({ ...f, riversideRoomUrl: e.target.value }))}
                  placeholder="https://riverside.fm/studio/..." className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Zoom URL <span className="text-white/70 font-normal">(fallback, only shown if no Riverside)</span></Label>
                <Input value={formData.zoomUrl} onChange={e => setFormData(f => ({ ...f, zoomUrl: e.target.value }))}
                  placeholder="https://us06web.zoom.us/..." className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">YouTube URL (livestream or premiere)</Label>
                <Input value={formData.youtubeUrl} onChange={e => setFormData(f => ({ ...f, youtubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/live/..." className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              {/* #25 - Guest Speaker Fields */}
              <div className="md:col-span-2 border-t border-white/10 pt-3 mt-1">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-2">Guest Speaker (optional)</p>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Speaker Name</Label>
                <Input value={formData.guestSpeakerName} onChange={e => setFormData(f => ({ ...f, guestSpeakerName: e.target.value }))}
                  placeholder="Jane Doe" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Speaker Topic</Label>
                <Input value={formData.guestSpeakerTopic} onChange={e => setFormData(f => ({ ...f, guestSpeakerTopic: e.target.value }))}
                  placeholder="Regenerative land economics" className="bg-white/5 border-white/20 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70 text-xs">Speaker Bio</Label>
                <Textarea value={formData.guestSpeakerBio} onChange={e => setFormData(f => ({ ...f, guestSpeakerBio: e.target.value }))}
                  rows={2} placeholder="Brief bio for the introduction email" className="bg-white/5 border-white/20 text-white mt-1 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!formData.title || !formData.startTime || createMutation.isPending || updateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white">
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {editingId !== null ? 'Save Changes' : 'Create Event'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowCreate(false); setEditingId(null); setFormData(defaultForm); }}
                className="text-white/60 hover:text-white">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      {isLoading && <div className="text-center py-8 text-white/65"><Loader2 size={24} className="animate-spin mx-auto" /></div>}

      <div className="space-y-2">
        {allEvents.map(ev => {
          const signupCount = Number(countMap[ev.id] ?? 0);
          const startDate = ev.startTime ? new Date(ev.startTime) : null;
          const dateStr = startDate ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : '-';
          const timeStr = startDate ? startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : '';
          return (
            <Card key={ev.id} className={`bg-[#0a1f14] border-white/10 ${ev.status === 'cancelled' ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[ev.type] ?? ''}`}>{ev.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ev.status] ?? ''}`}>{ev.status}</span>
                      {ev.season && <span className="text-xs text-white/65">{ev.season}{ev.episodeNumber ? ` · Ep ${ev.episodeNumber}` : ''}</span>}
                    </div>
                    <p className="font-medium text-white text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-white/70 mt-0.5">{dateStr} {timeStr} {ev.timezone ?? ''}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-white/65">
                      <span><Bell size={11} className="inline mr-1" />{signupCount} reminder signup{signupCount !== 1 ? 's' : ''}</span>
                      {ev.riversideRoomUrl && <a href={ev.riversideRoomUrl} target="_blank" rel="noreferrer" className="text-green-400 hover:underline">Riverside room ↗</a>}
                      {ev.youtubeUrl && <a href={ev.youtubeUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">YouTube ↗</a>}
                      {ev.recordingId && <span className="text-purple-400">Recording #{ev.recordingId}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(ev)}
                      className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
                      <Edit size={11} className="mr-1" /> Edit
                    </Button>
                    {reminderSuccess === ev.id
                      ? <Button size="sm" variant="ghost" disabled className="text-yellow-400 h-7 px-2 text-xs">
                          <CheckCheck size={11} className="mr-1" /> Sent!
                        </Button>
                      : <Button size="sm" variant="ghost"
                          onClick={() => {
                            // Open the email editor for this event with defaults pre-filled
                            setReminderEditorOpen(reminderEditorOpen === ev.id ? null : ev.id);
                            if (reminderEditorOpen !== ev.id) {
                              setCustomSubject(`Reminder: ${ev.title} is tomorrow`);
                              setCustomBody(ev.description ?? '');
                              // #24 - Default schedule suggestion: 9 AM EST day before event
                              if (ev.startTime) {
                                const dayBefore = new Date(ev.startTime);
                                dayBefore.setDate(dayBefore.getDate() - 1);
                                dayBefore.setHours(9, 0, 0, 0);
                                setScheduleFor(dayBefore.toISOString().slice(0, 16));
                              }
                            }
                          }}
                          className="text-white/60 hover:text-yellow-300 hover:bg-yellow-500/10 h-7 px-2 text-xs">
                          <Bell size={11} className="mr-1" />
                          {reminderEditorOpen === ev.id ? 'Cancel' : 'Send Reminders'}
                        </Button>}
                    {/* #17 - Send Follow-up for completed events */}
                    {ev.status === 'completed' && (
                      followupSuccess === ev.id
                        ? <Button size="sm" variant="ghost" disabled className="text-green-400 h-7 px-2 text-xs">
                            <CheckCheck size={11} className="mr-1" /> Follow-up Sent!
                          </Button>
                        : <Button size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Send "How was it?" follow-up email to everyone who signed up for "${ev.title}"?`)) {
                                followupMutation.mutate({ eventId: ev.id }, {
                                  onSuccess: () => {
                                    setFollowupSuccess(ev.id);
                                    setTimeout(() => setFollowupSuccess(null), 4000);
                                  },
                                });
                              }
                            }}
                            disabled={followupMutation.isPending}
                            className="text-white/60 hover:text-green-300 hover:bg-green-500/10 h-7 px-2 text-xs">
                            <Send size={11} className="mr-1" />
                            {followupMutation.isPending ? 'Sending...' : 'Send Follow-up'}
                          </Button>
                    )}
                    {/* #25 - Send Speaker Intro (only if event has a guest speaker) */}
                    {(ev as any).guestSpeakerName && (
                      speakerIntroSuccess === ev.id
                        ? <Button size="sm" variant="ghost" disabled className="text-purple-400 h-7 px-2 text-xs">
                            <CheckCheck size={11} className="mr-1" /> Speaker Intro Sent!
                          </Button>
                        : <Button size="sm" variant="ghost"
                            onClick={() => {
                              if (confirm(`Send speaker introduction email for "${(ev as any).guestSpeakerName}" to all signups?`)) {
                                speakerIntroMutation.mutate({ eventId: ev.id }, {
                                  onSuccess: () => {
                                    setSpeakerIntroSuccess(ev.id);
                                    setTimeout(() => setSpeakerIntroSuccess(null), 4000);
                                  },
                                });
                              }
                            }}
                            disabled={speakerIntroMutation.isPending}
                            className="text-white/60 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2 text-xs">
                            <Users size={11} className="mr-1" />
                            {speakerIntroMutation.isPending ? 'Sending...' : 'Send Speaker Intro'}
                          </Button>
                    )}
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm(`Delete "${ev.title}"?`)) deleteMutation.mutate({ id: ev.id }); }}
                      className="text-white/60 hover:text-red-400 hover:bg-red-500/10 h-7 px-2 text-xs">
                      <Trash2 size={11} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Guest speaker info display */}
                {(ev as any).guestSpeakerName && (
                  <div className="border-t border-white/10 px-4 py-2">
                    <span className="text-xs text-purple-400">Guest: {(ev as any).guestSpeakerName}{(ev as any).guestSpeakerTopic ? `, ${(ev as any).guestSpeakerTopic}` : ''}</span>
                  </div>
                )}

                {/* #16 - Check-in URL and copy button */}
                {(ev as any).checkinToken && (
                  <div className="border-t border-white/10 px-4 py-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/65">Check-in URL:</span>
                    <code className="text-xs text-[#7dd87d] bg-white/5 px-2 py-0.5 rounded break-all">
                      {window.location.origin}/checkin/{(ev as any).checkinToken}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/checkin/${(ev as any).checkinToken}`);
                        setCheckinCopied(ev.id);
                        setTimeout(() => setCheckinCopied(null), 2000);
                      }}
                      className="text-xs text-white/65 hover:text-[#7dd87d] transition-colors flex items-center gap-1"
                    >
                      {checkinCopied === ev.id ? <><CheckCheck size={11} /> Copied!</> : <><ClipboardList size={11} /> Copy</>}
                    </button>
                  </div>
                )}

                {/* Inline email editor - opens when "Send Reminders" is clicked */}
                {reminderEditorOpen === ev.id && (
                  <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
                    <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Preview &amp; Edit Reminder Email</p>
                    <div>
                      <Label className="text-white/60 text-xs">Subject line</Label>
                      <Input
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm mt-1"
                        placeholder={`Reminder: ${ev.title} is tomorrow`}
                      />
                    </div>
                    <div>
                      <Label className="text-white/60 text-xs">Body paragraph (shown below the date)</Label>
                      <Textarea
                        value={customBody}
                        onChange={e => setCustomBody(e.target.value)}
                        rows={4}
                        className="bg-white/5 border-white/20 text-white text-sm mt-1 resize-none"
                        placeholder="What do you want people to know before they join? Leave blank to use the event description."
                      />
                    </div>

                    {/* Live email preview */}
                    <div className="rounded-xl overflow-hidden border border-white/10 text-sm">
                      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] px-5 py-4 text-center">
                        <p className="text-[#7dd87d] font-bold text-base m-0">ReGen Civics</p>
                        <p className="text-[#a8e6a8] text-xs mt-1 m-0">Event reminder</p>
                      </div>
                      <div className="bg-white px-5 py-5 space-y-2">
                        <p className="text-gray-300 text-xs m-0">Starting in ~24 hours</p>
                        <p className="text-[#1a472a] font-bold text-base m-0">{ev.title}</p>
                        <p className="text-gray-500 text-sm m-0">
                          {ev.startTime ? new Date(ev.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                          {ev.startTime ? ` at ${new Date(ev.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${ev.timezone ?? ''}` : ''}
                        </p>
                        {(customBody || ev.description) && (
                          <p className="text-gray-600 text-sm leading-relaxed m-0">{customBody || ev.description}</p>
                        )}
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <span className="bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-xs font-bold">Join on Riverside</span>
                          <span className="border-2 border-[#1a472a] text-[#1a472a] px-4 py-2 rounded-lg text-xs font-bold">View Schedule</span>
                        </div>
                      </div>
                      <div className="bg-[#f0f7f0] px-5 py-3 text-center">
                        <p className="text-gray-300 text-xs m-0">You signed up for a reminder for this event.</p>
                      </div>
                    </div>

                    <p className="text-xs text-white/65">Subject: <span className="text-white/70">{customSubject || `Reminder: ${ev.title} is tomorrow`}</span></p>
                    <p className="text-xs text-white/65">Sending to <span className="text-white/70">{Number(countMap[ev.id] ?? 0)} people</span> who signed up for this event.</p>

                    <div className="flex flex-wrap items-end gap-2">
                      <Button
                        disabled={reminderMutation.isPending || Number(countMap[ev.id] ?? 0) === 0}
                        onClick={() => { setPreflightEventId(ev.id); setPreflightConfirmed(false); }}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs h-8 px-4"
                      >
                        {Number(countMap[ev.id] ?? 0) === 0
                          ? 'No signups yet'
                          : `Review & Send to ${Number(countMap[ev.id] ?? 0)} ${Number(countMap[ev.id] ?? 0) === 1 ? 'person' : 'people'}`}
                      </Button>

                      {/* #24 - Schedule for later */}
                      <div className="flex items-end gap-1.5">
                        <div>
                          <Label className="text-white/65 text-xs">Schedule for...</Label>
                          <Input
                            type="datetime-local"
                            value={scheduleFor}
                            onChange={e => setScheduleFor(e.target.value)}
                            className="bg-white/5 border-white/20 text-white text-xs h-8 mt-0.5 w-48"
                          />
                        </div>
                        <Button
                          disabled={!scheduleFor || reminderMutation.isPending || Number(countMap[ev.id] ?? 0) === 0}
                          onClick={async () => {
                            const result = await reminderMutation.mutateAsync({
                              id: ev.id,
                              customSubject: customSubject || undefined,
                              customBody: customBody || undefined,
                              scheduledFor: new Date(scheduleFor).toISOString(),
                            });
                            setScheduleSuccess(ev.id);
                            setReminderEditorOpen(null);
                            setScheduleFor('');
                            setTimeout(() => setScheduleSuccess(null), 6000);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3"
                        >
                          <Clock size={11} className="mr-1" /> Schedule
                        </Button>
                      </div>
                    </div>
                    {scheduleSuccess === ev.id && (
                      <p className="text-xs text-blue-400">Reminder scheduled. It will send at the selected time (lost if server restarts).</p>
                    )}

                    {/* #22 Preflight checklist dialog */}
                    {preflightEventId === ev.id && (() => {
                      const signupCount = Number(countMap[ev.id] ?? 0);
                      const hasJoinLink = !!(ev.riversideRoomUrl || ev.zoomUrl);
                      const isUpcoming = new Date(ev.startTime) > new Date();
                      const alreadySent = !!(ev as any).reminderSent;

                      return (
                        <Dialog open onOpenChange={(open) => { if (!open) setPreflightEventId(null); }}>
                          <DialogContent className="bg-[#0a1f14] border-white/20 text-white max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-white text-base">Preflight Check: Send Reminders</DialogTitle>
                              <DialogDescription className="text-white/70 text-sm">{ev.title}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3 py-2">
                              {/* Join link check */}
                              <div className="flex items-center gap-2 text-sm">
                                {hasJoinLink
                                  ? <CheckCheck size={14} className="text-green-400 flex-shrink-0" />
                                  : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                                <span className={hasJoinLink ? 'text-white/70' : 'text-red-300'}>
                                  {hasJoinLink ? 'Join link is set' : 'No join link set (Zoom or Riverside URL missing)'}
                                </span>
                              </div>

                              {/* Upcoming check */}
                              <div className="flex items-center gap-2 text-sm">
                                {isUpcoming
                                  ? <CheckCheck size={14} className="text-green-400 flex-shrink-0" />
                                  : <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                                <span className={isUpcoming ? 'text-white/70' : 'text-red-300'}>
                                  {isUpcoming ? 'Event is still upcoming' : 'Event start time has already passed'}
                                </span>
                              </div>

                              {/* Recipient count */}
                              <div className="flex items-center gap-2 text-sm">
                                <Users size={14} className="text-blue-400 flex-shrink-0" />
                                <span className="text-white/70">
                                  {signupCount} {signupCount === 1 ? 'person' : 'people'} will receive this email
                                </span>
                              </div>

                              {/* Already sent warning */}
                              {alreadySent && (
                                <div className="flex items-start gap-2 text-sm bg-yellow-900/30 border border-yellow-700/40 rounded-lg p-3">
                                  <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-yellow-300">
                                    Reminders were already sent for this event. Sending again will send duplicate emails.
                                  </span>
                                </div>
                              )}

                              {/* Confirmation checkbox */}
                              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                <Checkbox
                                  id={`preflight-confirm-${ev.id}`}
                                  checked={preflightConfirmed}
                                  onCheckedChange={(val) => setPreflightConfirmed(!!val)}
                                  className="border-white/30 data-[state=checked]:bg-[#7dd87d] data-[state=checked]:border-[#7dd87d]"
                                />
                                <Label htmlFor={`preflight-confirm-${ev.id}`} className="text-sm text-white/70 cursor-pointer">
                                  I've reviewed and confirm sending to {signupCount} {signupCount === 1 ? 'person' : 'people'}
                                </Label>
                              </div>
                            </div>

                            <DialogFooter className="gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => setPreflightEventId(null)}
                                className="text-white/70 hover:text-white text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                disabled={!preflightConfirmed || reminderMutation.isPending}
                                onClick={async () => {
                                  await reminderMutation.mutateAsync({
                                    id: ev.id,
                                    customSubject: customSubject || undefined,
                                    customBody: customBody || undefined,
                                  });
                                  setPreflightEventId(null);
                                  setReminderSuccess(ev.id);
                                  setReminderEditorOpen(null);
                                  refetch(); // refresh to get updated reminderSent flag
                                  setTimeout(() => setReminderSuccess(null), 4000);
                                }}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs h-8 px-4"
                              >
                                {reminderMutation.isPending
                                  ? <><Loader2 size={12} className="animate-spin mr-1" /> Sending...</>
                                  : `Send Reminders`}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Setup reminder */}
      <Card className="bg-[#0a1f14] border-yellow-800/30 mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-yellow-400 text-sm flex items-center gap-2"><Clock size={14} /> Auto-Reminder Cron Setup</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-white/60 space-y-1">
          <p>Reminders send automatically if you set up the Railway cron job:</p>
          <ol className="list-decimal list-inside space-y-1 text-white/70">
            <li>In Railway: New Service → Cron Job</li>
            <li>Schedule: <code className="bg-white/10 px-1 rounded">0 * * * *</code> (hourly)</li>
            <li>Command: <code className="bg-white/10 px-1 rounded break-all">curl -X POST https://regencivics.earth/api/cron/event-reminders -H "Authorization: Bearer $CRON_SECRET"</code></li>
            <li>Add <code className="bg-white/10 px-1 rounded">CRON_SECRET</code> as an env var on both services (any secure random string)</li>
          </ol>
          <p className="mt-2">The same cron job also auto-updates event status (upcoming → live → completed) based on start/end times.</p>
        </CardContent>
      </Card>

      {/* #10 - Season Rollup Email */}
      <Card className="bg-[#0a1f14] border-[#7dd87d]/20 mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#7dd87d] text-sm flex items-center gap-2"><Bell size={14} /> Season Rollup Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-white/60">Sends a "here's what we built together" digest to all event signups + newsletter subscribers for a completed season.</p>
          <div className="flex items-center gap-2">
            <input
              value={rollupSeason}
              onChange={e => setRollupSeason(e.target.value)}
              placeholder="Season name (e.g. Season 2)"
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <button
              onClick={() => {
                if (!rollupSeason.trim()) return;
                if (window.confirm(`Send season rollup email for "${rollupSeason}" to all signups + newsletter subscribers?`)) {
                  rollupMutation.mutate({ season: rollupSeason.trim() });
                }
              }}
              disabled={rollupMutation.isPending || !rollupSeason.trim()}
              className="bg-[#7dd87d] hover:bg-[#9de89d] disabled:opacity-50 text-[#1a472a] px-4 py-1.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
            >
              {rollupMutation.isPending ? 'Sending...' : 'Send Rollup'}
            </button>
          </div>
          {rollupMutation.isSuccess && (
            <p className="text-[#7dd87d] text-xs">Sent to {(rollupMutation.data as any)?.sent ?? 0} recipients.</p>
          )}
        </CardContent>
      </Card>

      {/* #9 - Agenda Suggestions from Community */}
      {agendaSuggestions.length > 0 && (
        <Card className="bg-[#0a1f14] border-purple-800/30 mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
              <Bell size={14} /> Agenda Suggestions ({agendaSuggestions.filter((s: any) => s.status === 'pending').length} pending)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agendaSuggestions.map((s: any) => {
              const eventTitle = allEvents.find(e => e.id === s.eventId)?.title ?? `Event #${s.eventId}`;
              return (
                <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${s.status === 'pending' ? 'bg-white/5 border-white/10' : s.status === 'approved' ? 'bg-green-900/20 border-green-800/30 opacity-60' : 'bg-red-900/10 border-red-800/20 opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs mb-1">{eventTitle} · {s.authorName || s.authorEmail}</p>
                    <p className="text-white text-sm">{s.suggestion}</p>
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => agendaUpdateMutation.mutate({ id: s.id, status: 'approved' })}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1 rounded">✓</button>
                      <button onClick={() => agendaUpdateMutation.mutate({ id: s.id, status: 'rejected' })}
                        className="bg-red-800 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">✕</button>
                    </div>
                  )}
                  {s.status !== 'pending' && (
                    <span className={`text-xs px-2 py-1 rounded ${s.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>{s.status}</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* #8 revised - Attendance Tracking + $ReGen Token Awards */}
      <Card className="bg-white/5 border border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
            ✦ Event Attendance + $ReGen Token Awards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/70 text-xs">
            Mark who actually attended a completed event. Each person earns 33 $ReGen tokens, recorded in the contribution ledger.
          </p>

          {/* Event selector */}
          <div className="flex gap-2">
            <select
              value={attendanceEventId ?? ''}
              onChange={e => { setAttendanceEventId(e.target.value ? Number(e.target.value) : null); setAttendanceInput(''); }}
              className="flex-1 bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/20"
            >
              <option value="">Select an event...</option>
              {allEvents.filter(e => e.status === 'completed' || e.status === 'live').map(e => (
                <option key={e.id} value={e.id}>{e.title} ({e.season ?? 'no season'})</option>
              ))}
            </select>
          </div>

          {attendanceEventId && (
            <div className="space-y-3">
              {/* Current attendance list */}
              {attendanceList.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <p className="text-amber-400 text-xs font-medium">{attendanceList.length} confirmed attendees · {attendanceList.reduce((sum, a: any) => sum + (a.tokensAwarded ?? 0), 0)} $ReGen awarded</p>
                  {attendanceList.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-white text-sm">{a.name || a.email}</span>
                        {a.name && <span className="text-white/65 text-xs ml-2">{a.email}</span>}
                        <span className="text-amber-400 text-xs ml-2">+{a.tokensAwarded} $ReGen</span>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove attendance for ${a.email}? This will also remove their ${a.tokensAwarded} $ReGen tokens.`)) {
                            removeAttendanceMutation.mutate({ eventId: attendanceEventId, email: a.email });
                          }
                        }}
                        className="text-white/70 hover:text-red-400 text-xs px-2 py-1 rounded"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add attendees input */}
              <div className="space-y-2">
                <label className="text-white/60 text-xs">Add attendees (one email per line, or paste a comma-separated list):</label>
                <textarea
                  value={attendanceInput}
                  onChange={e => setAttendanceInput(e.target.value)}
                  placeholder="jane@example.com&#10;alex@example.com"
                  rows={4}
                  className="w-full bg-white/10 text-white text-sm rounded px-3 py-2 border border-white/20 placeholder:text-white/70 font-mono"
                />
                <button
                  onClick={() => {
                    const emails = attendanceInput
                      .split(/[\n,;]+/)
                      .map(e => e.trim())
                      .filter(e => e.includes('@'));
                    if (emails.length === 0) return;
                    if (window.confirm(`Mark ${emails.length} attendee(s) for this event? Each will earn 33 $ReGen tokens.`)) {
                      markAttendanceMutation.mutate({
                        eventId: attendanceEventId,
                        attendees: emails.map(email => ({ email })),
                      });
                      setAttendanceInput('');
                    }
                  }}
                  disabled={markAttendanceMutation.isPending || !attendanceInput.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-medium"
                >
                  {markAttendanceMutation.isPending ? 'Marking...' : 'Mark Attendance + Award Tokens'}
                </button>
                {markAttendanceMutation.isSuccess && (
                  <p className="text-amber-400 text-xs">
                    Marked {(markAttendanceMutation.data as any)?.newlyMarked ?? 0} new attendees. {(markAttendanceMutation.data as any)?.tokensAwarded ?? 0} $ReGen awarded.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* $ReGen Leaderboard */}
          {tokenLeaderboard.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="text-white/60 text-xs mb-2">$ReGen Leaderboard (top earners)</p>
              <div className="space-y-1">
                {tokenLeaderboard.map((entry: any, i: number) => (
                  <div key={entry.email} className="flex items-center justify-between text-xs">
                    <span className="text-white/70">#{i + 1} {entry.email}</span>
                    <span className="text-amber-400 font-medium">{entry.total} $ReGen</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Export with Password Protection
export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem("admin_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <>
        <SEO title="Admin" description="Admin" noIndex />
        <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />
      </>
    );
  }

  return (
    <>
      <SEO title="Admin" description="Admin" noIndex />
      <AdminDashboard />
    </>
  );
}
