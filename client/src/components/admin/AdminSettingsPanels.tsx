import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Radio, Loader2, RefreshCw, Mail, Handshake, Plus, Trash2, BookOpen, Clock, Send, Calendar, Users, X, Shield,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatClaimant } from "@/lib/adminContrast";
import { pathTypeConfig, landProjectsList, allianceOrgsList } from "@/lib/adminInquiry";

const LS_FARCASTER_KEY = "admin_farcaster_handle";

export function BufferSettingsPanel() {
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
        <CardDescription className="text-[#1a472a]/85">Configure Buffer and Farcaster for social posting</CardDescription>
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
              className="max-w-xs bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/30 focus:border-[#1a472a] font-mono text-sm"
            />
            <Button
              onClick={saveToken}
              disabled={savingToken || !newToken.trim()}
              className="bg-[#1a472a] text-[#f8f5f0] hover:bg-[#14331f] disabled:opacity-70 disabled:text-[#f8f5f0]"
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

export function ReviewerEmailManager() {
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


export function NewsletterSubscribersList() {
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

export function ScheduledEmailsManager() {
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


export function AdminAMAPanel() {
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
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#1a472a]/70" />}
        {!isLoading && amas && amas.length === 0 && (
          <p className="text-[#1a472a]/75 text-sm">No AMAs scheduled.</p>
        )}
        {amas?.map(ama => (
          <div key={ama.id} className="flex items-start gap-3 p-3 bg-[#f8f5f0] rounded-xl border border-[#1a472a]/15">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1a472a] text-sm">{ama.projectName}</p>
              <p className="text-[#1a472a]/80 text-xs">{ama.date} at {ama.time} ({ama.timezone})</p>
              <p className="text-[#1a472a]/75 text-xs">Host: {ama.hostName}</p>
              {ama.forumThreadUrl && (
                <a href={ama.forumThreadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a472a] underline">
                  Forum thread
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleMut.mutate({ id: ama.id, isActive: !ama.isActive })}
                className={`text-xs px-2 py-1 rounded-full border font-semibold ${ama.isActive ? "bg-[#1a472a] text-[#f8f5f0] border-[#1a472a]" : "bg-[#f0ebe3] text-[#1a472a] border-[#1a472a]/30"}`}
              >
                {ama.isActive ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => { if (confirm("Delete this AMA?")) deleteMut.mutate({ id: ama.id }); }}
                className="text-[#8b1e1e] hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {showForm ? (
          <div className="bg-[#f8f5f0] border border-[#1a472a]/15 rounded-xl p-4 space-y-3">
            <p className="text-[#1a472a] text-sm font-semibold">Schedule AMA</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[#1a472a] text-xs">Project Name</Label>
                <Input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="Amora Costa Rica" className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75" />
              </div>
              <div>
                <Label className="text-[#1a472a] text-xs">Host Name</Label>
                <Input value={form.hostName} onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))} placeholder="Maria Santos" className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75" />
              </div>
              <div>
                <Label className="text-[#1a472a] text-xs">Date (YYYY-MM-DD)</Label>
                <Input value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="2026-04-26" className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75" />
              </div>
              <div>
                <Label className="text-[#1a472a] text-xs">Time</Label>
                <Input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="11:00 AM EST" className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75" />
              </div>
              <div>
                <Label className="text-[#1a472a] text-xs">Timezone</Label>
                <Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75" />
              </div>
              <div>
                <Label className="text-[#1a472a] text-xs">Forum Thread URL (optional)</Label>
                <Input value={form.forumThreadUrl} onChange={e => setForm(f => ({ ...f, forumThreadUrl: e.target.value }))} placeholder="https://..." className="mt-1 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75" />
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


export function OrgClaimsAdminPanel() {
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
                {(() => {
                  const who = formatClaimant(claim);
                  return (
                    <p className="text-xs text-[#1a472a] font-medium">
                      {who.primary} · {who.secondary}
                    </p>
                  );
                })()}
                <p className="text-xs text-[#1a472a]/75">{claim.orgType === 'land_project' ? 'Land Project' : 'Alliance Org'} · User #{claim.userId} · org {claim.orgId}</p>
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


export function JoinRequestsAdminPanel() {
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
  { key: '1–9', desc: 'Jump to the first nine sidebar items (1=Overview, 2=Applications…)' },
  { key: 'Esc', desc: 'Close dialog / clear search' },
];

// ─── Investor Priority Scoring ─────────────────────────────────────────────────

export function ProjectConnectionsAdmin() {
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


export function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
export function GlossaryAdminPanel() {
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
