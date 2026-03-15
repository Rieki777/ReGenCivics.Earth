import { useState, useEffect, lazy, Suspense } from "react";
import { AdminAIAssistant, type AdminAIAction } from "@/components/AdminAIAssistant";
import { CrowdPoolingProjectsManager } from "@/components/CrowdPoolingProjectsManager";
import { AdminCampaignApproval } from "@/components/AdminCampaignApproval";
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
} from "lucide-react";
import { AdminBroadcastPanel } from "@/components/AdminBroadcastPanel";
import { trpc } from "@/lib/trpc";
import { TaoSpinner } from "@/components/TaoSpinner";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { toast } from "sonner";
import { EmailTemplateSelector, emailTemplates } from "@/components/EmailTemplateSelector";
import { RoleSubmissionsView } from "@/components/RoleSubmissionsView";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { EmailSettings } from "@/components/EmailSettings";
import { LOIManager } from "@/components/LOIManager";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { AdminBannerEditor } from "@/components/AdminBannerEditor";
const AdminKanban = lazy(() => import("@/components/AdminKanban").then(m => ({ default: m.AdminKanban })));
const ActivityTimeline = lazy(() => import("@/components/ActivityTimeline").then(m => ({ default: m.ActivityTimeline })));
import { AdminImageStudio } from "@/components/AdminImageStudio";
import KnowledgeMapAdminPanel from "@/components/KnowledgeMapAdminPanel";

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
          className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm"
        >
          <option value="all">All</option>
          <option value="waitlist">Waitlist</option>
          <option value="intro_scheduled">Intro Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="declined">Declined</option>
          <option value="completed">Completed</option>
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
                      className="bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-xs"
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
          <p className="text-xs text-[#1a472a]/60">Token expires yearly. Paste a new one below to update it. Get it at buffer.com → Settings → Developers → Access Token.</p>
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
                  <span className="text-[#1a472a]/60">{p.formatted_username ?? p.service_username}</span>
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
          <p className="text-xs text-[#1a472a]/60">
            Farcaster posting opens Warpcast in a new tab. No API key needed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Email History Panel ───────────────────────────────────────────────────────
function EmailHistoryPanel({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = trpc.email.getLogsForEmail.useQuery(
    { email },
    { enabled: open && !!email }
  );

  return (
    <div className="border-t border-[#1a472a]/10 pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-[#1a472a]/60 hover:text-[#1a472a] transition-colors w-full"
      >
        <Mail className="w-3.5 h-3.5" />
        <span className="font-medium">Email History</span>
        {logs?.length ? <span className="text-[#7dd87d]">({logs.length})</span> : null}
        <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {isLoading && <p className="text-xs text-[#1a472a]/40 py-2">Loading…</p>}
          {!isLoading && !logs?.length && (
            <p className="text-xs text-[#1a472a]/40 py-2">No emails sent to this contact yet.</p>
          )}
          {logs?.map((log: any) => (
            <div key={log.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <p className="font-medium text-[#1a472a] truncate">{log.subject}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#1a472a]/50">
                <span>{new Date(log.sentAt).toLocaleString()}</span>
                <span className={
                  log.status === 'delivered' ? 'text-green-600 font-medium' :
                  log.status === 'bounced' ? 'text-red-600 font-medium' :
                  log.status === 'failed' ? 'text-red-500' : 'text-gray-500'
                }>{log.status}</span>
                {log.openedAt && <span className="text-blue-500">· opened</span>}
                {log.clickedAt && <span className="text-purple-500">· clicked</span>}
                {log.template && <span className="text-[#4a7c59]/60">template: {log.template}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Internal Notes {notes?.length ? `(${notes.length})` : ''}
      </p>
      {isLoading && <p className="text-xs text-[#1a472a]/40">Loading…</p>}
      {notes?.map((note: any) => (
        <div key={note.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#1a472a] whitespace-pre-wrap">{note.note}</p>
            <p className="text-[10px] text-[#1a472a]/40 mt-1">
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
      <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide flex items-center gap-1.5">
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
      <span className="text-xs text-[#1a472a]/60 shrink-0">Assigned to:</span>
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
      <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide">Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {tags?.map((t: any) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7dd87d]/20 border border-[#4a7c59]/30 text-xs text-[#1a472a]"
          >
            {t.tag}
            <button onClick={() => removeTag.mutate({ id: t.id })} className="text-[#1a472a]/40 hover:text-red-500">
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
            className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 hover:bg-[#7dd87d]/20 border border-gray-200 text-gray-600 hover:text-[#1a472a] transition-colors"
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={isShaking ? "animate-shake" : ""}
      >
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
      </motion.div>
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
            <p className="text-xs md:text-sm text-[#1a472a]/60 mb-1 break-words">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-[#1a472a]/50 mt-1 break-words">{description}</p>
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
    return <div onClick={onClick}>{content}</div>;
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
              <Button className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]">
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
                    <Mail className={`w-5 h-5 ${reviewer.isActive ? 'text-[#1a472a]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1a472a]">
                      {reviewer.name || reviewer.email}
                    </p>
                    {reviewer.name && (
                      <p className="text-sm text-[#1a472a]/60">{reviewer.email}</p>
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
                    className="text-[#1a472a]/60 hover:text-[#1a472a]"
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
          <div className="text-center py-8 text-[#1a472a]/50">
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
      <div className="text-center py-8 text-[#1a472a]/50">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No newsletter subscribers yet</p>
        <p className="text-sm mt-1">Subscribers will appear here when people sign up</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1a472a]/10">
        <p className="text-sm text-[#1a472a]/60">
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
              <p className="text-xs text-[#1a472a]/50">
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
      <div className="text-center py-8 text-[#1a472a]/50">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/40" />
          <input
            type="text"
            placeholder={`Search ${config.label.toLowerCase()} by name, email, or message...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/40 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#1a472a]/70">
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
                      <p className="px-3 py-1 text-xs text-[#1a472a]/50 font-medium">
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
                      className="w-full text-center py-2 text-xs text-[#1a472a]/50 hover:bg-[#f0ebe3] border-t border-[#1a472a]/10"
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
                className="text-[#1a472a]/60 hover:text-[#1a472a]"
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
              <Label htmlFor="select-all" className="text-xs text-[#1a472a]/60 cursor-pointer">
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
                      <p className="px-3 py-1 text-xs text-[#1a472a]/50 font-medium">
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
                  className="w-full text-center py-2 text-xs text-[#1a472a]/50 hover:bg-[#f0ebe3] border-t border-[#1a472a]/10"
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
              className="text-[#1a472a]/60"
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
                          <span className="text-xs text-[#1a472a]/50 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {inquiry.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#1a472a]/60">{inquiry.email}</p>
                      
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
                        <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${age.bg} ${age.color}`}>
                          {age.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                          {age.label}
                        </span>
                      );
                    })()}
                    <ChevronRight className="w-4 h-4 text-[#1a472a]/30" />
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
                    <p className="text-sm font-normal text-[#1a472a]/60">{config.label}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Email</p>
                    <p className="text-[#1a472a]">{inquiry.email}</p>
                  </div>
                  {inquiry.location && (
                    <div>
                      <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Location</p>
                      <p className="text-[#1a472a]">{inquiry.location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Status</p>
                    <Badge className={`${inquiry.status === 'pending' || inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} border`}>
                      {inquiry.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Submitted</p>
                    <p className="text-[#1a472a]">{new Date(inquiry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {/* Selected Projects/Orgs */}
                {selectedProjects.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Selected Land Projects</p>
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
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Selected Alliance Organizations</p>
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
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Role Archetypes</p>
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
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Contribution Types</p>
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
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Role Interest</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.roleInterest}</p>
                    </div>
                  </div>
                )}
                
                {/* Unique Contribution (Something Else path) */}
                {inquiry.uniqueContribution && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Unique Contribution</p>
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
                          <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Forms of Capital to Contribute</p>
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
                          <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Organizational Capital</p>
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
                          <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Alliance Support Categories</p>
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
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">How Alliance Supports Land Projects</p>
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                      <p className="text-violet-900 whitespace-pre-wrap">{inquiry.allianceSupportDescription}</p>
                    </div>
                  </div>
                )}
                
                {/* Other Alliance Support */}
                {inquiry.otherAllianceSupport && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Other Support Category</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.otherAllianceSupport}</p>
                    </div>
                  </div>
                )}
                
                {/* Value Contribution */}
                {inquiry.valueContribution && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Value Contribution</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-emerald-900 whitespace-pre-wrap">{inquiry.valueContribution}</p>
                    </div>
                  </div>
                )}
                
                {/* Why Ideal Fit */}
                {inquiry.whyIdealFit && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Why They Would Be an Ideal Fit</p>
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                      <p className="text-sky-900 whitespace-pre-wrap">{inquiry.whyIdealFit}</p>
                    </div>
                  </div>
                )}
                
                {/* Message/Notes */}
                {(inquiry.message || formData.additionalNotes) && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Message</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4">
                      <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message || formData.additionalNotes}</p>
                    </div>
                  </div>
                )}
                
                {/* All Form Data */}
                {Object.keys(formData).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">All Form Data</p>
                    <div className="bg-[#f0ebe3] rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-[#1a472a]/70">
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
                  <span className="text-xs text-[#1a472a]/60 shrink-0">Update status:</span>
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
                <div className="w-full flex items-center justify-between text-xs text-[#1a472a]/50">
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
        {isLoading && <p className="text-sm text-[#1a472a]/40">Loading…</p>}
        {!isLoading && scheduled?.length === 0 && (
          <p className="text-sm text-[#1a472a]/40">No scheduled emails. Use "Send Later" when composing to schedule.</p>
        )}
        {pending.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide">Pending</p>
            {pending.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a472a] truncate">{s.subject}</p>
                  <p className="text-xs text-[#1a472a]/60">To: {s.recipientName || s.recipientEmail} · {new Date(s.scheduledFor).toLocaleString()}</p>
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
            <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide">History</p>
            {past.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a472a]/70 truncate">{s.subject}</p>
                  <p className="text-xs text-[#1a472a]/40">
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
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
        {!isLoading && amas && amas.length === 0 && (
          <p className="text-white/40 text-sm">No AMAs scheduled.</p>
        )}
        {amas?.map(ama => (
          <div key={ama.id} className="flex items-start gap-3 p-3 bg-white/4 rounded-xl border border-white/8">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{ama.projectName}</p>
              <p className="text-white/55 text-xs">{ama.date} at {ama.time} ({ama.timezone})</p>
              <p className="text-white/45 text-xs">Host: {ama.hostName}</p>
              {ama.forumThreadUrl && (
                <a href={ama.forumThreadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7dd87d]/70 hover:text-[#7dd87d] underline">
                  Forum thread
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleMut.mutate({ id: ama.id, isActive: !ama.isActive })}
                className={`text-xs px-2 py-1 rounded-full border ${ama.isActive ? "bg-[#7dd87d]/15 text-[#5ab85a] border-[#7dd87d]/25" : "bg-white/5 text-white/40 border-white/15"}`}
              >
                {ama.isActive ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => { if (confirm("Delete this AMA?")) deleteMut.mutate({ id: ama.id }); }}
                className="text-white/25 hover:text-red-400 transition-colors"
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
        {isLoading && <p className="text-sm text-[#1a472a]/40">Loading…</p>}
        {!isLoading && !claims?.length && (
          <p className="text-sm text-[#1a472a]/40">No stewardship claims yet.</p>
        )}
        <div className="space-y-3 mb-4">
          {claims?.map((claim: any) => (
            <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border border-[#1a472a]/10 bg-[#f8f5f0]">
              <div>
                <p className="font-medium text-[#1a472a] text-sm">{claim.orgName}</p>
                <p className="text-xs text-[#1a472a]/50">{claim.orgType === 'land_project' ? 'Land Project' : 'Alliance Org'} · User #{claim.userId} · ID: {claim.orgId}</p>
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
                  <label className="text-xs text-[#1a472a]/60 mb-1 block">User ID</label>
                  <input
                    type="number"
                    value={assignForm.userId}
                    onChange={e => setAssignForm(f => ({ ...f, userId: e.target.value }))}
                    placeholder="User ID #"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd87d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#1a472a]/60 mb-1 block">Org Type</label>
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
                  <label className="text-xs text-[#1a472a]/60 mb-1 block">Org ID (slug or DB ID)</label>
                  <input
                    value={assignForm.orgId}
                    onChange={e => setAssignForm(f => ({ ...f, orgId: e.target.value }))}
                    placeholder="e.g. ubuntu or 42"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white focus:outline-none focus:ring-1 focus:ring-[#7dd87d]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#1a472a]/60 mb-1 block">Org Display Name</label>
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
        {isLoading && <p className="text-sm text-[#1a472a]/40">Loading…</p>}
        {!isLoading && !requests?.length && (
          <p className="text-sm text-[#1a472a]/40">No join requests yet.</p>
        )}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {requests?.map((req: any) => (
            <div key={req.id} className="p-3 rounded-lg border border-[#1a472a]/10 bg-[#f8f5f0] text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1a472a]">{req.submitterName}</p>
                  <p className="text-xs text-[#1a472a]/50">{req.submitterEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#1a472a]/70 font-medium">{req.targetName}</p>
                  <Badge variant="outline" className="text-xs h-5 mt-0.5">
                    {req.status}
                  </Badge>
                </div>
              </div>
              {req.submitterMessage && (
                <p className="mt-1.5 text-xs text-[#1a472a]/60 italic border-t border-[#1a472a]/10 pt-1.5">"{req.submitterMessage}"</p>
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
            <Label className="text-xs text-[#1a472a]/60 mb-1 block">Post A ID</Label>
            <Input type="number" value={postAId} onChange={e => setPostAId(e.target.value)} placeholder="e.g. 12" className="border-[#e8e4de]" />
          </div>
          <div>
            <Label className="text-xs text-[#1a472a]/60 mb-1 block">Post B ID</Label>
            <Input type="number" value={postBId} onChange={e => setPostBId(e.target.value)} placeholder="e.g. 34" className="border-[#e8e4de]" />
          </div>
          <div>
            <Label className="text-xs text-[#1a472a]/60 mb-1 block">Type</Label>
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
          <Label className="text-xs text-[#1a472a]/60 mb-1 block">Note (optional)</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the connection..." className="border-[#e8e4de]" />
        </div>

        {isLoading ? (
          <p className="text-sm text-[#1a472a]/50">Loading...</p>
        ) : connections && connections.length > 0 ? (
          <div className="space-y-2 mt-2">
            {connections.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-[#f8f5f0] border border-[#e8e4de]">
                <div className="text-sm text-[#1a472a]">
                  <span className="font-semibold">#{c.postAId}</span>
                  <span className="text-[#1a472a]/40 mx-2">{c.connectionType === "needs_each_other" ? "needs" : "similar to"}</span>
                  <span className="font-semibold">#{c.postBId}</span>
                  {c.note && <span className="text-[#1a472a]/50 ml-2 text-xs">: {c.note}</span>}
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
          <p className="text-sm text-[#1a472a]/40 italic">No connections yet.</p>
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
                    <p className="text-[#1a472a]/50 text-xs line-clamp-1">{t.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-[#1a472a]/40">Loading glossary...</p>}
        {!isLoading && (terms || []).length === 0 && (
          <p className="text-sm text-[#1a472a]/40 italic">No terms yet. AI will propose terms weekly based on forum activity.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [investorSearch, setInvestorSearch] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [investorStatusFilter, setInvestorStatusFilter] = useState<string>('all');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [aiSelectedContact, setAiSelectedContact] = useState<{ email?: string; name?: string } | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

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
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); }
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
  const globalResults = q.length > 1 ? {
    investors: (investors || []).filter((i: any) =>
      i.fullName?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.organization?.toLowerCase().includes(q)
    ).slice(0, 4),
    applications: (applications || []).filter((a: any) =>
      a.projectName?.toLowerCase().includes(q) || a.contactName?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
    ).slice(0, 4),
    inquiries: (inquiries || []).filter((i: any) =>
      i.fullName?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q)
    ).slice(0, 4),
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
    <div className="min-h-screen bg-[#f0ebe3]">
      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1a472a]">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close keyboard shortcuts" className="text-[#1a472a]/40 hover:text-[#1a472a]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <kbd className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 font-mono text-xs">{s.key}</kbd>
                  <span className="text-[#1a472a]/70">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white py-4 md:py-6">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <img src="/images/logos/regencivics-logo-dark-transparent-rounded.png" alt="ReGen Civics" className="w-10 h-10 md:w-12 md:h-12 object-contain flex-shrink-0" loading="lazy" />
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
                <p className="text-white/70 text-sm md:text-base">
                  {stats.totalApplications + stats.totalInvestors + stats.totalInquiries} total submissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
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
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 text-xs"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard shortcuts (?)"
              >
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline ml-1">Shortcuts</span>
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

      {/* Global Search Bar */}
      <div className="bg-white border-b border-[#1a472a]/10">
        <div className="container px-4 py-2.5">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/40 pointer-events-none" />
            <input
              type="text"
              data-global-search
              placeholder='Search all contacts… (press "/" to focus)'
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setGlobalSearchOpen(true); }}
              onFocus={() => setGlobalSearchOpen(true)}
              onBlur={() => setTimeout(() => setGlobalSearchOpen(false), 200)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/40 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1a472a]/40 hover:text-[#1a472a]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {globalSearchOpen && globalResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#1a472a]/20 rounded-xl shadow-xl z-50 overflow-hidden">
                {globalResults.investors.length === 0 && globalResults.applications.length === 0 && globalResults.inquiries.length === 0 ? (
                  <p className="p-4 text-sm text-[#1a472a]/40 text-center">No results for "{globalSearch}"</p>
                ) : (
                  <div className="divide-y divide-[#1a472a]/10">
                    {globalResults.investors.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-[#1a472a]/50 uppercase tracking-wide bg-amber-50">Investors</p>
                        {globalResults.investors.map((i: any) => (
                          <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2"
                            onClick={() => { setInvestorSearch(i.email || i.fullName); setActiveTab('investors'); setGlobalSearch(''); }}>
                            <TrendingUp className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{i.fullName}</span>
                            <span className="text-xs text-[#1a472a]/50 truncate">{i.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.applications.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-[#1a472a]/50 uppercase tracking-wide bg-green-50">Projects</p>
                        {globalResults.applications.map((a: any) => (
                          <button key={a.id} className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2"
                            onClick={() => { setAppSearch(a.projectName || a.contactName); setActiveTab('applications'); setGlobalSearch(''); }}>
                            <Sprout className="w-3.5 h-3.5 text-[#4a7c59] flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{a.projectName || a.contactName}</span>
                            <span className="text-xs text-[#1a472a]/50">{a.location}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.inquiries.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-[#1a472a]/50 uppercase tracking-wide bg-purple-50">Inquiries</p>
                        {globalResults.inquiries.map((i: any) => (
                          <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-[#f0f7f0] flex items-center gap-2"
                            onClick={() => { setActiveTab(i.pathType || 'live'); setGlobalSearch(''); }}>
                            <MessageSquare className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            <span className="text-sm text-[#1a472a] font-medium">{i.fullName || i.email}</span>
                            <span className="text-xs text-[#1a472a]/50">{i.pathType?.replace(/_/g, ' ')}</span>
                          </button>
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

      {/* Stats */}
      <div className="container py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <StatsCard 
            title="Project Applications" 
            value={stats.totalApplications} 
            icon={Sprout} 
            color="bg-[#4a7c59]"
            description="Land project submissions"
            onClick={() => {
              setActiveTab("applications");
              // Scroll to tabs on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
          <StatsCard 
            title="Investor Inquiries" 
            value={stats.totalInvestors} 
            icon={TrendingUp} 
            color="bg-amber-500"
            description="Investment interest forms"
            onClick={() => {
              setActiveTab("investors");
              // Scroll to tabs on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
          <StatsCard 
            title="General Inquiries" 
            value={stats.totalInquiries} 
            icon={MessageSquare} 
            color="bg-[#7dd87d]"
            description="Connect form submissions"
            onClick={() => {
              setActiveTab("live");
              // Scroll to tabs on mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
          <StatsCard 
            title="Pending Review" 
            value={stats.pendingReview} 
            icon={Eye} 
            color="bg-[#1a472a]"
            description="Awaiting response"
            linkTo="/admin/applications"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border-2 border-[#1a472a]/10 p-1 flex flex-wrap h-auto gap-1 overflow-x-auto max-w-full">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="applications" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Sprout className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Projects</span> ({stats.totalApplications})
            </TabsTrigger>
            <TabsTrigger 
              value="investors" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Investors</span> ({stats.totalInvestors})
            </TabsTrigger>
            <TabsTrigger 
              value="loi" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">LOIs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="alliance" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Handshake className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Alliance</span> ({inquiriesByPath.alliance || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Palette className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Create</span> ({inquiriesByPath.create || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="live" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <HomeIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Live</span> ({inquiriesByPath.live || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="role" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <UserCheck className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Roles</span> ({inquiriesByPath.role || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="other" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <HelpCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Other</span> ({(inquiriesByPath.other || 0) + (inquiriesByPath.learn || 0) + (inquiriesByPath.finance || 0)})
            </TabsTrigger>
            <TabsTrigger 
              value="crowdpooling" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Crowd Pooling</span>
            </TabsTrigger>
            <TabsTrigger
              value="newsletter"
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Mail className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Newsletter</span>
            </TabsTrigger>
            <TabsTrigger
              value="broadcast"
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Radio className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Broadcast</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="banners" 
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Banners</span>
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <span className="mr-1 md:mr-2">🖼️</span>
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger
              value="custom-games"
              className="data-[state=active]:bg-[#1a472a] data-[state=active]:text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <span className="mr-1 md:mr-2">🎮</span>
              <span className="hidden sm:inline">Custom Games</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Pending Items Alert */}
              {stats.pendingReview > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800">
                      {stats.pendingReview} item{stats.pendingReview !== 1 ? 's' : ''} pending review
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Review and respond to keep your community engaged
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
                      onClick={() => setActiveTab('applications')}>
                      Applications
                    </Button>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
                      onClick={() => setActiveTab('investors')}>
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
                const overdueInvestors = (investors || []).filter((i: any) =>
                  (!i.status || i.status === 'new') && new Date(i.createdAt).getTime() < h48
                );
                const overdueInquiries = (inquiries || []).filter((i: any) =>
                  (!i.status || i.status === 'new') && new Date(i.createdAt).getTime() < h48
                );
                const newToday = [
                  ...(investors || []).filter((i: any) => new Date(i.createdAt).getTime() > h24)
                    .map((i: any) => ({ type: 'investor', name: i.fullName || i.email })),
                  ...(applications || []).filter((a: any) => new Date(a.submittedAt || a.createdAt).getTime() > h24)
                    .map((a: any) => ({ type: 'application', name: a.projectName || a.contactName })),
                  ...(inquiries || []).filter((i: any) => new Date(i.createdAt).getTime() > h24)
                    .map((i: any) => ({ type: 'inquiry', name: i.fullName || i.email })),
                ];
                const hasItems = overdueInvestors.length > 0 || overdueInquiries.length > 0 || newToday.length > 0;
                if (!hasItems) return null;
                return (
                  <div className="bg-white border-2 border-[#1a472a]/10 rounded-xl p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-[#1a472a] flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Today's Focus
                    </h3>
                    {overdueInvestors.length > 0 && (
                      <button onClick={() => { setInvestorStatusFilter('new'); setActiveTab('investors'); }}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-700">
                          <strong>{overdueInvestors.length}</strong> investor{overdueInvestors.length !== 1 ? 's' : ''} in "new" status for 48+ hours  -  follow up now
                        </span>
                      </button>
                    )}
                    {overdueInquiries.length > 0 && (
                      <button onClick={() => setActiveTab('live')}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <span className="text-xs text-orange-700">
                          <strong>{overdueInquiries.length}</strong> {overdueInquiries.length !== 1 ? 'inquiries' : 'inquiry'} waiting 48+ hours for a response
                        </span>
                      </button>
                    )}
                    {newToday.length > 0 && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                        <Sparkles className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-green-700">
                          <strong>{newToday.length}</strong> new submission{newToday.length !== 1 ? 's' : ''} in the last 24h:{' '}
                          <span className="text-green-600">
                            {newToday.slice(0, 3).map(n => n.name).filter(Boolean).join(', ')}
                            {newToday.length > 3 ? ` +${newToday.length - 3} more` : ''}
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
                  { label: 'Send Newsletter', icon: Mail, color: 'bg-blue-500', tab: 'newsletter' },
                  { label: 'Review Applications', icon: FileText, color: 'bg-[#4a7c59]', tab: 'applications' },
                  { label: 'Email Templates', icon: Sparkles, color: 'bg-purple-500', tab: 'settings' },
                  { label: 'View Analytics', icon: TrendingUp, color: 'bg-amber-500', tab: 'analytics' },
                ].map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => setActiveTab(action.tab)}
                      className="p-4 rounded-xl bg-white border-2 border-[#1a472a]/10 hover:border-[#7dd87d]/50 hover:shadow-md transition-all text-left group"
                    >
                      <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                        <ActionIcon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-[#1a472a]">{action.label}</p>
                    </button>
                  );
                })}
              </div>

              {/* Analytics Charts Row */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Submissions Over Time */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      Submissions This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const now = new Date();
                        const thisMonth = now.getMonth();
                        const thisYear = now.getFullYear();
                        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
                        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
                        
                        const thisMonthApps = applications?.filter((a: any) => {
                          const d = new Date(a.submittedAt || a.createdAt);
                          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                        }).length || 0;
                        
                        const lastMonthApps = applications?.filter((a: any) => {
                          const d = new Date(a.submittedAt || a.createdAt);
                          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
                        }).length || 0;
                        
                        const thisMonthInvestors = investors?.filter((i: any) => {
                          const d = new Date(i.createdAt);
                          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                        }).length || 0;
                        
                        const thisMonthInquiries = inquiries?.filter((i: any) => {
                          const d = new Date(i.createdAt);
                          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                        }).length || 0;
                        
                        const appChange = lastMonthApps > 0 ? Math.round(((thisMonthApps - lastMonthApps) / lastMonthApps) * 100) : 0;
                        
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70">Applications</span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-[#1a472a]">{thisMonthApps}</span>
                                {appChange !== 0 && (
                                  <span className={`text-xs ${appChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {appChange > 0 ? '+' : ''}{appChange}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70">Investors</span>
                              <span className="text-lg font-bold text-[#1a472a]">{thisMonthInvestors}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70">Inquiries</span>
                              <span className="text-lg font-bold text-[#1a472a]">{thisMonthInquiries}</span>
                            </div>
                            <div className="pt-2 border-t border-[#1a472a]/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[#1a472a]">Total</span>
                                <span className="text-xl font-bold text-[#7dd87d]">{thisMonthApps + thisMonthInvestors + thisMonthInquiries}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Conversion Funnel */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const pending = (applications?.filter((a: any) => a.status === 'pending').length || 0) +
                                        (investors?.filter((i: any) => i.status === 'pending').length || 0) +
                                        (inquiries?.filter((i: any) => i.status === 'pending' || i.status === 'new').length || 0);
                        const reviewed = (applications?.filter((a: any) => a.status === 'reviewed' || a.status === 'in_review').length || 0) +
                                        (investors?.filter((i: any) => i.status === 'reviewed' || i.status === 'contacted').length || 0) +
                                        (inquiries?.filter((i: any) => i.status === 'reviewed' || i.status === 'contacted').length || 0);
                        const total = stats.totalApplications + stats.totalInvestors + stats.totalInquiries;
                        const reviewRate = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                        
                        return (
                          <>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#1a472a]/70">Pending Review</span>
                                <span className="font-medium text-yellow-600">{pending}</span>
                              </div>
                              <div className="w-full bg-[#f0ebe3] rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%` }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#1a472a]/70">Reviewed/Contacted</span>
                                <span className="font-medium text-green-600">{reviewed}</span>
                              </div>
                              <div className="w-full bg-[#f0ebe3] rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${reviewRate}%` }} />
                              </div>
                            </div>
                            <div className="pt-2 border-t border-[#1a472a]/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[#1a472a]/70">Review Rate</span>
                                <span className="text-lg font-bold text-[#1a472a]">{reviewRate}%</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Top Interests */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#1a472a] text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      Top Interests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        // Count project interests
                        const projectCounts: Record<string, number> = {};
                        inquiries?.forEach((inquiry: any) => {
                          try {
                            const formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
                            const projects = formData.selectedProjects || [];
                            projects.forEach((p: string) => {
                              projectCounts[p] = (projectCounts[p] || 0) + 1;
                            });
                          } catch (e) {}
                        });
                        
                        const sorted = Object.entries(projectCounts)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5);
                        
                        if (sorted.length === 0) {
                          return <p className="text-sm text-[#1a472a]/50">No project interests yet</p>;
                        }
                        
                        return sorted.map(([projectId, count]) => {
                          const project = landProjectsList.find(p => p.id === projectId);
                          return (
                            <div key={projectId} className="flex items-center justify-between">
                              <span className="text-sm text-[#1a472a]/70 truncate max-w-[150px]">
                                {project?.name || projectId}
                              </span>
                              <Badge variant="outline" className="text-xs">{count}</Badge>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Impact Stats - Acres and Families */}
              <Card className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                    <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                    Impact Stats (All Projects Applied)
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Aggregate data from all land project applications - ready for homepage display
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      // Calculate total acres and families from all applications
                      let totalAcres = 0;
                      let totalFamilies = 0;
                      let totalHumans = 0;
                      let projectCount = applications?.length || 0;
                      
                      applications?.forEach((app: any) => {
                        // Parse acreage - handle various formats
                        const acreage = app.acreage || app.landSize || '';
                        const acreMatch = String(acreage).match(/([\d,]+\.?\d*)/)
                        if (acreMatch) {
                          totalAcres += parseFloat(acreMatch[1].replace(/,/g, ''));
                        }
                        
                        // Parse families/humans
                        const families = app.familyCount || app.householdCount || app.families || 0;
                        const humans = app.memberCount || app.humanCount || app.people || 0;
                        
                        if (typeof families === 'number') totalFamilies += families;
                        else if (typeof families === 'string') {
                          const famMatch = families.match(/([\d,]+)/);
                          if (famMatch) totalFamilies += parseInt(famMatch[1].replace(/,/g, ''));
                        }
                        
                        if (typeof humans === 'number') totalHumans += humans;
                        else if (typeof humans === 'string') {
                          const humMatch = humans.match(/([\d,]+)/);
                          if (humMatch) totalHumans += parseInt(humMatch[1].replace(/,/g, ''));
                        }
                      });
                      
                      return (
                        <>
                          <div className="bg-white/10 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-[#7dd87d]">{projectCount}</p>
                            <p className="text-white/70 text-sm">Projects Applied</p>
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
                  <p className="text-white/50 text-xs mt-4 text-center">
                    Note: These stats can be displayed on the homepage. Data is extracted from application forms.
                  </p>
                </CardContent>
              </Card>
              
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Applications */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader>
                    <CardTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
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
                                <p className="text-sm text-[#1a472a]/60">{app.location}</p>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                                {app.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[#1a472a]/50">
                        <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No applications yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inquiry Summary by Type */}
                <Card className="bg-white border-2 border-[#1a472a]/10">
                  <CardHeader>
                    <CardTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                      Inquiries by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(pathTypeConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        const count = inquiriesByPath[key] || 0;
                        return (
                          <div 
                            key={key} 
                            className="p-4 rounded-lg bg-[#f0ebe3] hover:bg-[#e8e3db] transition-colors cursor-pointer"
                            onClick={() => setActiveTab(key === 'finance' || key === 'learn' ? 'other' : key)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-[#1a472a]">{count}</p>
                                <p className="text-xs text-[#1a472a]/60">{config.label}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Project Applications Tab */}
          <TabsContent value="applications">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                      <Sprout className="w-5 h-5 text-[#4a7c59]" />
                      Project Applications
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {applications?.length || 0} total · {applications?.filter((a: any) => a.status === 'submitted').length || 0} awaiting review
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#7dd87d] text-[#1a472a] w-fit"
                      onClick={() => exportToCSV(applications || [], 'project_applications')}
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
                {/* Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/40" />
                  <input
                    type="text"
                    placeholder="Search by project name, location, or vision..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/40 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
                  />
                </div>
                {filteredApps.length !== (applications?.length || 0) && (
                  <p className="text-xs text-[#1a472a]/50 pt-1">
                    Showing {filteredApps.length} of {applications?.length || 0} applications
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {applications && applications.length > 0 ? (
                  <div className="divide-y divide-[#1a472a]/10">
                    {filteredApps.map((app: any) => {
                      const ageApp = getAgeInfo(app.submittedAt || app.createdAt || new Date());
                      return (
                      <Dialog key={app.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                                  <Sprout className="w-5 h-5 text-[#1a472a]" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1a472a]">{app.projectName}</p>
                                  <p className="text-sm text-[#1a472a]/60">{app.location}</p>
                                  
                                  {/* Project Metrics - Key Stats */}
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {app.projectSizeHectares && (
                                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                                        {app.projectSizeHectares} ha ({(app.projectSizeHectares * 2.471).toFixed(0)} acres)
                                      </Badge>
                                    )}
                                    {(app.currentPeopleCount || app.intendedPeopleCount) && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                        {app.currentPeopleCount || 0} → {app.intendedPeopleCount || '?'} people
                                      </Badge>
                                    )}
                                    {(app.currentHouseholdCount || app.intendedHouseholdCount) && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                                        {app.currentHouseholdCount || 0} → {app.intendedHouseholdCount || '?'} households
                                      </Badge>
                                    )}
                                    {app.mixedUse && (() => {
                                      try {
                                        const uses = JSON.parse(app.mixedUse);
                                        return uses.length > 0 && (
                                          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 capitalize">
                                            {uses.slice(0, 2).join(', ')}{uses.length > 2 ? ` +${uses.length - 2}` : ''}
                                          </Badge>
                                        );
                                      } catch { return null; }
                                    })()}
                                  </div>
                                  
                                  {app.vision && (
                                    <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                      {app.vision}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={
                                  app.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  app.status === 'under_review' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  app.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                  app.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                  app.status === 'changes_requested' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }>
                                  {app.status?.replace(/_/g, ' ')}
                                </Badge>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ageApp.bg} ${ageApp.color}`}>
                                  {ageApp.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                                  {app.submittedAt ? ageApp.label : 'Draft'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                              {app.projectName}
                            </DialogTitle>
                            <DialogDescription>{app.location}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {app.projectSizeHectares && (
                                <div className="bg-green-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-green-700">{app.projectSizeHectares}</p>
                                  <p className="text-xs text-green-600">Hectares ({(app.projectSizeHectares * 2.471).toFixed(0)} acres)</p>
                                </div>
                              )}
                              {app.currentPeopleCount !== null && (
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-blue-700">{app.currentPeopleCount}</p>
                                  <p className="text-xs text-blue-600">Current People</p>
                                </div>
                              )}
                              {app.intendedPeopleCount !== null && (
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-blue-700">{app.intendedPeopleCount}</p>
                                  <p className="text-xs text-blue-600">Target People</p>
                                </div>
                              )}
                              {app.teamSize && (
                                <div className="bg-purple-50 p-3 rounded-lg text-center">
                                  <p className="text-2xl font-bold text-purple-700">{app.teamSize}</p>
                                  <p className="text-xs text-purple-600">Core Team</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Mixed Use */}
                            {app.mixedUse && (() => {
                              try {
                                const uses = JSON.parse(app.mixedUse);
                                return uses.length > 0 && (
                                  <div>
                                    <Label className="text-sm font-semibold text-[#1a472a]">Land Use Types</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {uses.map((use: string) => (
                                        <Badge key={use} className="bg-amber-100 text-amber-800 capitalize">{use}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                );
                              } catch { return null; }
                            })()}
                            
                            {/* Vision */}
                            {app.vision && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Vision</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.vision}</p>
                              </div>
                            )}
                            
                            {/* Land Status */}
                            {app.landStatus && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Land Status</Label>
                                <Badge variant="outline" className="ml-2 capitalize">{app.landStatus}</Badge>
                              </div>
                            )}
                            
                            {/* Team Description */}
                            {app.teamDescription && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Team Description</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.teamDescription}</p>
                              </div>
                            )}
                            
                            {/* Regenerative Practices */}
                            {app.regenerativePractices && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Regenerative Practices</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.regenerativePractices}</p>
                              </div>
                            )}
                            
                            {/* Governance */}
                            {app.governanceApproach && (
                              <div>
                                <Label className="text-sm font-semibold text-[#1a472a]">Governance Approach</Label>
                                <p className="text-sm text-[#1a472a]/80 mt-1 whitespace-pre-wrap">{app.governanceApproach}</p>
                              </div>
                            )}
                            
                            {/* Funding */}
                            {(app.currentFunding || app.fundingNeeds) && (
                              <div className="grid grid-cols-2 gap-4">
                                {app.currentFunding && (
                                  <div>
                                    <Label className="text-sm font-semibold text-[#1a472a]">Current Funding</Label>
                                    <p className="text-sm text-[#1a472a]/80 mt-1">{app.currentFunding}</p>
                                  </div>
                                )}
                                {app.fundingNeeds && (
                                  <div>
                                    <Label className="text-sm font-semibold text-[#1a472a]">Funding Needs</Label>
                                    <p className="text-sm text-[#1a472a]/80 mt-1">{app.fundingNeeds}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Links */}
                            {(app.websiteUrl || app.videoUrl) && (
                              <div className="flex gap-4">
                                {app.websiteUrl && (
                                  <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1">
                                    <Globe className="w-4 h-4" /> Website
                                  </a>
                                )}
                                {app.videoUrl && (
                                  <a href={app.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-4 h-4" /> Video
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {/* Default Acceptance Message Template */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <p className="text-xs font-medium text-green-800 uppercase tracking-wide mb-2">Default Acceptance Message Template</p>
                              <p className="text-sm text-green-900 leading-relaxed">
                                Congratulations! Your project has passed our first quality check. Participation in the season is dependent on the community governance process. However, since you meet our criteria, we highly encourage you to follow along the journey regardless of whether you're selected. If you complete all the steps, you may still be eligible for joining the alliance!
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 border-green-300 text-green-700 hover:bg-green-100"
                                onClick={() => {
                                  navigator.clipboard.writeText("Congratulations! Your project has passed our first quality check. Participation in the season is dependent on the community governance process. However, since you meet our criteria, we highly encourage you to follow along the journey regardless of whether you're selected. If you complete all the steps, you may still be eligible for joining the alliance!");
                                  toast.success('Acceptance message copied to clipboard');
                                }}
                              >
                                Copy Message
                              </Button>
                            </div>

                            <Suspense fallback={null}><ActivityTimeline email={app.contactEmail || ''} contactType="project_application" contactId={app.id} /></Suspense>
                            <EmailHistoryPanel email={app.contactEmail || ''} />
                            <ContactNotesPanel contactType="project_application" contactId={app.id} />
                            <ContactTagsPanel contactType="project_application" contactId={app.id} />
                            <ReminderPanel contactType="project_application" contactId={app.id} />
                          </div>
                          <DialogFooter className="flex-col gap-2">
                            <AssigneeSelect contactType="project_application" contactId={app.id} />
                            <div className="flex flex-col sm:flex-row gap-2">
                            <EmailTemplateSelector
                              recipientEmail={app.contactEmail || ''}
                              recipientName={app.contactName || ''}
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
                  <div className="p-8 text-center text-[#1a472a]/50">
                    <Sprout className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No project applications yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investor Inquiries Tab */}
          <TabsContent value="investors">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                      <TrendingUp className="w-5 h-5 text-amber-500" />
                      Investor Inquiries
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {investors?.length || 0} total · {investors?.filter((i: any) => i.status === 'new' || i.status === 'pending').length || 0} pending review
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#7dd87d] text-[#1a472a] w-fit"
                    onClick={() => exportToCSV(investors || [], 'investor_inquiries')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                {/* Investment Range Breakdown */}
                {Object.keys(investorRangeCounts).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-[#1a472a]/10 mt-3">
                    {Object.entries(investorRangeCounts)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([range, count]) => (
                        <span key={range} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800">
                          <DollarSign className="w-3 h-3" />
                          {range}: <strong>{count as number}</strong>
                        </span>
                      ))}
                  </div>
                )}
                {/* Search & Filter Row */}
                <div className="flex flex-col sm:flex-row gap-2 pt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/40" />
                    <input
                      type="text"
                      data-search-input
                      placeholder="Search by name, email, range, or org..."
                      value={investorSearch}
                      onChange={(e) => setInvestorSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/40 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
                    />
                  </div>
                  <Select value={investorStatusFilter} onValueChange={setInvestorStatusFilter}>
                    <SelectTrigger className="sm:w-44 h-9 text-sm">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="in_discussion">In Discussion</SelectItem>
                      <SelectItem value="committed">Committed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filteredInvestors.length !== (investors?.length || 0) && (
                  <p className="text-xs text-[#1a472a]/50 pt-1">
                    Showing {filteredInvestors.length} of {investors?.length || 0} investors
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {investors && investors.length > 0 ? (
                  filteredInvestors.length === 0 ? (
                    <div className="p-8 text-center text-[#1a472a]/50">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No investors match your search</p>
                      <button onClick={() => { setInvestorSearch(''); setInvestorStatusFilter('all'); }} className="text-[#7dd87d] text-sm mt-2 hover:underline">
                        Clear filters
                      </button>
                    </div>
                  ) : (
                  <div className="divide-y divide-[#1a472a]/10">
                    {filteredInvestors.map((investor: any) => (
                      <Dialog key={investor.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                  <TrendingUp className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1a472a]">{investor.fullName}</p>
                                  <p className="text-sm text-[#1a472a]/60">{investor.email}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {investor.investmentRange && (
                                      <Badge variant="outline" className="text-xs">
                                        {investor.investmentRange}
                                      </Badge>
                                    )}
                                    {investor.investorType && (
                                      <Badge variant="outline" className="text-xs">
                                        {investor.investorType}
                                      </Badge>
                                    )}
                                  </div>
                                  {investor.motivation && (
                                    <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                      {investor.motivation}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge className={
                                  investor.status === 'new' || investor.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  investor.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  investor.status === 'in_discussion' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                  investor.status === 'committed' ? 'bg-green-100 text-green-800 border-green-200' :
                                  investor.status === 'declined' ? 'bg-red-100 text-red-800 border-red-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }>
                                  {investor.status?.replace(/_/g, ' ')}
                                </Badge>
                                {(() => {
                                  const age = getAgeInfo(investor.createdAt);
                                  return (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${age.bg} ${age.color}`}>
                                      {age.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                                      {age.label}
                                    </span>
                                  );
                                })()}
                                {(() => {
                                  const p = getInvestorPriority(investor);
                                  return (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${p.color}`} title={`Priority score: ${p.score}`}>
                                      {p.label} priority
                                    </span>
                                  );
                                })()}
                                {duplicateInvestorEmails.has(investor.email) && (
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">
                                    Duplicate email
                                  </Badge>
                                )}
                                <ChevronRight className="w-4 h-4 text-[#1a472a]/30" />
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <span className="text-[#1a472a]">{investor.fullName}</span>
                                <p className="text-sm font-normal text-[#1a472a]/60">Investor Inquiry</p>
                              </div>
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Email</p>
                                <a href={`mailto:${investor.email}`} className="text-[#4a7c59] hover:underline break-all">
                                  {investor.email}
                                </a>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Status</p>
                                <Badge className={
                                  investor.status === 'new' || investor.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  investor.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  investor.status === 'in_discussion' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                  investor.status === 'committed' ? 'bg-green-100 text-green-800 border-green-200' :
                                  investor.status === 'declined' ? 'bg-red-100 text-red-800 border-red-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }>
                                  {investor.status?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Submitted</p>
                                <p className="text-[#1a472a]">{new Date(investor.createdAt).toLocaleString()}</p>
                              </div>
                              {investor.organization && (
                                <div>
                                  <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Organization</p>
                                  <p className="text-[#1a472a]">{investor.organization}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Investment Details */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-3">Investment Details</p>
                              <div className="grid grid-cols-2 gap-4">
                                {investor.investmentRange && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Investment Range</p>
                                    <p className="text-amber-900 font-semibold">{investor.investmentRange}</p>
                                  </div>
                                )}
                                {investor.investorType && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Investor Type</p>
                                    <p className="text-amber-900 font-semibold capitalize">{investor.investorType?.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                                {investor.timeline && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Timeline</p>
                                    <p className="text-amber-900 font-semibold capitalize">{investor.timeline?.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                                {investor.accreditedStatus && (
                                  <div>
                                    <p className="text-xs text-amber-600 font-medium">Accredited Status</p>
                                    <p className="text-amber-900 font-semibold capitalize">{investor.accreditedStatus?.replace(/_/g, ' ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Primary Interest */}
                            {investor.primaryInterest && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Primary Interest</p>
                                <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">
                                  {investor.primaryInterest?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Motivation */}
                            {investor.motivation && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Motivation</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{investor.motivation}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Experience */}
                            {investor.experience && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Investment Experience</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{investor.experience}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Questions */}
                            {investor.questions && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Questions</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{investor.questions}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* How They Heard */}
                            {investor.howHeard && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">How They Heard About Us</p>
                                <p className="text-[#1a472a]">{investor.howHeard}</p>
                              </div>
                            )}

                            {/* Activity Timeline */}
                            <Suspense fallback={null}><ActivityTimeline email={investor.email} contactType="investor" contactId={investor.id} /></Suspense>

                            {/* Email History */}
                            <EmailHistoryPanel email={investor.email} />

                            {/* Internal Notes */}
                            <ContactNotesPanel contactType="investor" contactId={investor.id} />
                            <ContactTagsPanel contactType="investor" contactId={investor.id} />
                            <ReminderPanel contactType="investor" contactId={investor.id} />
                          </div>

                          <DialogFooter className="flex-col gap-3">
                            {/* Assignee */}
                            <AssigneeSelect contactType="investor" contactId={investor.id} />
                            {/* Status update */}
                            <div className="w-full flex items-center gap-2">
                              <span className="text-xs text-[#1a472a]/60 shrink-0">Status:</span>
                              <Select
                                value={investor.status}
                                onValueChange={(newStatus: any) => {
                                  const prevStatus = investor.status;
                                  updateInvestorMutation.mutate({ id: investor.id, status: newStatus });
                                  toast('Status updated', {
                                    action: { label: 'Undo', onClick: () => updateInvestorMutation.mutate({ id: investor.id, status: prevStatus }) },
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
                                  <SelectItem value="in_discussion">In Discussion</SelectItem>
                                  <SelectItem value="committed">Committed</SelectItem>
                                  <SelectItem value="declined">Declined</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-full flex flex-col sm:flex-row gap-2">
                              <EmailTemplateSelector
                                recipientEmail={investor.email}
                                recipientName={investor.fullName}
                                contextSubject="Investment Inquiry"
                                inquiryType="investor"
                                className="w-full sm:flex-1"
                              />
                              <Button
                                className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:flex-1"
                                disabled={updateInvestorMutation.isPending}
                                onClick={() => {
                                  const prevStatus = investor.status;
                                  updateInvestorMutation.mutate({ id: investor.id, status: 'contacted' });
                                  toast('Marked as reviewed', {
                                    action: { label: 'Undo', onClick: () => updateInvestorMutation.mutate({ id: investor.id, status: prevStatus }) },
                                    duration: 5000,
                                  });
                                }}
                              >
                                {updateInvestorMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCheck className="w-4 h-4 mr-1" />
                                )}
                                Mark as Reviewed
                              </Button>
                            </div>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                  )
                ) : (
                  <div className="p-8 text-center text-[#1a472a]/50">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No investor inquiries yet</p>
                    <p className="text-xs mt-2">Investor inquiries will appear here when submitted</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alliance Partners Tab */}
          <TabsContent value="alliance">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Handshake className="w-5 h-5" />
                  Alliance Partner Inquiries
                </CardTitle>
                <CardDescription>
                  Organizations interested in joining the ReGen Civics Alliance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InquirySection pathType="alliance" inquiries={inquiries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create with ReGens Tab */}
          <TabsContent value="create">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Palette className="w-5 h-5" />
                  Create with ReGens Inquiries
                </CardTitle>
                <CardDescription>
                  People interested in collaborating on regenerative projects
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InquirySection pathType="create" inquiries={inquiries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live in Land Project Tab */}
          <TabsContent value="live">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <HomeIcon className="w-5 h-5" />
                  Live in a Land Project Inquiries
                </CardTitle>
                <CardDescription>
                  People interested in living in regenerative communities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InquirySection pathType="live" inquiries={inquiries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role in ReGen Civics Tab */}
          <TabsContent value="role">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <UserCheck className="w-5 h-5" />
                  Role Applications
                </CardTitle>
                <CardDescription>
                  Enhanced view for exploring and managing role submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleSubmissionsView />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Inquiries Tab */}
          <TabsContent value="other">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <HelpCircle className="w-5 h-5" />
                  Other Inquiries
                </CardTitle>
                <CardDescription>
                  Finance, Learn, and other general inquiries
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#1a472a]/10">
                  {inquiries?.filter((i: any) => ['other', 'learn', 'finance'].includes(i.pathType)).map((inquiry: any) => {
                    const config = pathTypeConfig[inquiry.pathType] || pathTypeConfig.other;
                    const Icon = config.icon;
                    const ageOther = getAgeInfo(inquiry.createdAt);
                    return (
                      <Dialog key={inquiry.id}>
                        <DialogTrigger asChild>
                          <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                                  <Icon className="w-5 h-5 text-[#1a472a]" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1a472a]">{inquiry.fullName}</p>
                                  <p className="text-sm text-[#1a472a]/60">{inquiry.email}</p>
                                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                                    {inquiry.pathType?.replace(/_/g, ' ') || 'General'}
                                  </Badge>
                                  {inquiry.message && (
                                    <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                                      {inquiry.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={
                                  inquiry.status === 'new' || inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  inquiry.status === 'in_progress' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                  inquiry.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }>
                                  {inquiry.status?.replace(/_/g, ' ')}
                                </Badge>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ageOther.bg} ${ageOther.color}`}>
                                  {ageOther.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                                  {ageOther.label}
                                </span>
                                <ChevronRight className="w-4 h-4 text-[#1a472a]/30" />
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
                                <span className="text-[#1a472a]">{inquiry.fullName}</span>
                                <p className="text-sm font-normal text-[#1a472a]/60 capitalize">{inquiry.pathType?.replace(/_/g, ' ') || 'General'} Inquiry</p>
                              </div>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6 py-4">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Email</p>
                                <a href={`mailto:${inquiry.email}`} className="text-[#4a7c59] hover:underline">{inquiry.email}</a>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Status</p>
                                <Badge className={
                                  inquiry.status === 'new' || inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  inquiry.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }>
                                  {inquiry.status?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Submitted</p>
                                <p className="text-[#1a472a]">{new Date(inquiry.createdAt).toLocaleString()}</p>
                              </div>
                              {inquiry.location && (
                                <div>
                                  <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide">Location</p>
                                  <p className="text-[#1a472a]">{inquiry.location}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Message */}
                            {inquiry.message && (
                              <div>
                                <p className="text-xs font-medium text-[#1a472a]/50 uppercase tracking-wide mb-2">Message</p>
                                <div className="bg-[#f0ebe3] rounded-lg p-4">
                                  <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message}</p>
                                </div>
                              </div>
                            )}

                            <Suspense fallback={null}><ActivityTimeline email={inquiry.email} contactType="general_inquiry" contactId={inquiry.id} /></Suspense>
                            <EmailHistoryPanel email={inquiry.email} />
                            <ContactNotesPanel contactType="general_inquiry" contactId={inquiry.id} />
                            <ContactTagsPanel contactType="general_inquiry" contactId={inquiry.id} />
                            <ReminderPanel contactType="general_inquiry" contactId={inquiry.id} />
                          </div>

                          <DialogFooter className="flex-col gap-3">
                            <AssigneeSelect contactType="general_inquiry" contactId={inquiry.id} />
                            <div className="w-full flex items-center gap-2">
                              <span className="text-xs text-[#1a472a]/60 shrink-0">Status:</span>
                              <Select
                                value={inquiry.status}
                                onValueChange={(newStatus: any) => {
                                  const prevStatus = inquiry.status;
                                  updateGeneralMutation.mutate({ id: inquiry.id, status: newStatus });
                                  toast('Status updated', {
                                    action: { label: 'Undo', onClick: () => updateGeneralMutation.mutate({ id: inquiry.id, status: prevStatus }) },
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
                            <div className="w-full flex flex-col sm:flex-row gap-2">
                              <EmailTemplateSelector
                                recipientEmail={inquiry.email}
                                recipientName={inquiry.fullName || ''}
                                contextSubject="General Inquiry"
                                className="w-full sm:flex-1"
                              />
                              <Button
                                className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:flex-1"
                                disabled={updateGeneralMutation.isPending}
                                onClick={() => {
                                  const prevStatus = inquiry.status;
                                  updateGeneralMutation.mutate({ id: inquiry.id, status: 'contacted' });
                                  toast('Marked as reviewed', {
                                    action: { label: 'Undo', onClick: () => updateGeneralMutation.mutate({ id: inquiry.id, status: prevStatus }) },
                                    duration: 5000,
                                  });
                                }}
                              >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Mark as Reviewed
                              </Button>
                            </div>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                  {(!inquiries || inquiries.filter((i: any) => ['other', 'learn', 'finance'].includes(i.pathType)).length === 0) && (
                    <div className="p-8 text-center text-[#1a472a]/50">
                      <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No other inquiries yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crowd Pooling Projects Tab */}
          <TabsContent value="crowdpooling">
            <div className="space-y-6">
              <AdminCampaignApproval />
              <CrowdPoolingProjectsManager />
            </div>
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                      <Mail className="w-5 h-5" />
                      Newsletter Subscribers
                    </CardTitle>
                    <CardDescription>
                      People who signed up to receive updates
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    className="border-[#1a472a]/30 text-[#1a472a]"
                    onClick={() => {
                      // Export newsletter subscribers as CSV
                      const subscribers = (window as any).__newsletterSubscribers || [];
                      if (subscribers.length === 0) {
                        toast.error('No subscribers to export');
                        return;
                      }
                      const headers = ['Email', 'Source', 'Subscribed Date'];
                      const rows = subscribers.map((s: any) => [
                        s.email,
                        s.source || 'website',
                        new Date(s.createdAt).toLocaleDateString()
                      ]);
                      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('CSV downloaded');
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <NewsletterSubscribersList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <AdminBroadcastPanel />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              <AdminAnalytics />
            </div>
          </TabsContent>

          {/* LOI Tab */}
          <TabsContent value="loi">
            <LOIManager />
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners">
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Manage banners per page. Active banners appear at the top of their target page. The global banner shows on all pages.</p>
              {[
                { key: 'main-banner', label: 'Global (all pages)' },
                { key: 'home-banner', label: 'Home' },
                { key: 'community-banner', label: 'Community' },
                { key: 'map-banner', label: 'Map' },
                { key: 'opportunity-banner', label: 'Opportunity / Investor' },
                { key: 'apply-banner', label: 'Apply' },
                { key: 'forum-banner', label: 'Forum' },
                { key: 'fund-banner', label: 'Fund' },
              ].map(({ key, label }) => (
                <AdminBannerEditor key={key} bannerKey={key} title={label} />
              ))}
            </div>
          </TabsContent>

          {/* Kanban Board Tab */}
          <TabsContent value="kanban">
            <Card className="bg-white border-2 border-[#1a472a]/10">
              <CardHeader>
                <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Filter className="w-5 h-5" />
                  Kanban Board
                </CardTitle>
                <CardDescription>Drag cards between columns to update status</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="flex items-center justify-center py-20 text-[#1a472a]/50">Loading board…</div>}>
                  <AdminKanban
                    investors={investors || []}
                    inquiries={inquiries || []}
                    applications={applications || []}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <BufferSettingsPanel />
              <NotificationPreferences />
              <ReviewerEmailManager />
              <EmailSettings />
              <ScheduledEmailsManager />
              <AdminAMAPanel />
              <OrgClaimsAdminPanel />
              <JoinRequestsAdminPanel />
              <ProjectConnectionsAdmin />
              <GlossaryAdminPanel />
              <KnowledgeMapAdminPanel />
            </div>
          </TabsContent>

          <TabsContent value="images">
            <AdminImageStudio />
          </TabsContent>

          <TabsContent value="custom-games">
            <AdminCustomGameWaitlist />
          </TabsContent>
        </Tabs>
      </div>

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
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard />;
}
