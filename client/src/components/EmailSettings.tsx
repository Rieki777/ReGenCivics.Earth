/**
 * Email Settings Component
 * Provides test email sending, template preview with inline rendering,
 * template persistence (save/revert), and bulk email sending
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Mail, 
  Send, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Pencil,
  RotateCcw,
  Copy,
  CheckCircle,
  Clock,
  HelpCircle,
  Calendar,
  UserPlus,
  Newspaper,
  Handshake,
  ThumbsDown,
  PartyPopper,
  Save,
  Users,
  Plus,
  Trash2,
  AlertTriangle,
  Database,
  Download,
  Sprout,
  AlertCircle,
} from "lucide-react";
import {
  APPLICATION_EMAIL_SOURCES,
  statusForSourceId,
} from "@/lib/applicationEmailSources";

// Complete email template options - all form types
const EMAIL_TEMPLATES = [
  { 
    id: "applicationReceived", 
    name: "Application Received", 
    description: "Sent when a land project application is submitted",
    category: "Applications",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  { 
    id: "landProjectAccepted", 
    name: "Project Accepted", 
    description: "Sent when a project passes quality check",
    category: "Applications",
    icon: CheckCircle,
    color: "text-emerald-500",
  },
  { 
    id: "investorWelcome", 
    name: "Investor Welcome", 
    description: "Sent to new investor inquiries",
    category: "Onboarding",
    icon: UserPlus,
    color: "text-amber-600",
  },
  { 
    id: "newsletterWelcome", 
    name: "Newsletter Welcome", 
    description: "Sent to new newsletter subscribers",
    category: "Onboarding",
    icon: Newspaper,
    color: "text-blue-500",
  },
  { 
    id: "followUp", 
    name: "Follow Up", 
    description: "General follow-up email for inquiries",
    category: "Communication",
    icon: Clock,
    color: "text-amber-500",
  },
  { 
    id: "requestMoreInfo", 
    name: "Request More Info", 
    description: "Request additional information from applicants",
    category: "Communication",
    icon: HelpCircle,
    color: "text-blue-500",
  },
  { 
    id: "notSelected", 
    name: "Not Selected", 
    description: "Sent when an application is not selected",
    category: "Applications",
    icon: ThumbsDown,
    color: "text-red-400",
  },
  { 
    id: "scheduleCall", 
    name: "Schedule a Call", 
    description: "Invite to schedule a discovery call",
    category: "Communication",
    icon: Calendar,
    color: "text-purple-500",
  },
  { 
    id: "contributionAccepted", 
    name: "Contribution Accepted", 
    description: "Sent when a campaign contribution is accepted",
    category: "Campaigns",
    icon: Handshake,
    color: "text-green-500",
  },
  { 
    id: "contributionRejected", 
    name: "Contribution Rejected", 
    description: "Sent when a campaign contribution is not accepted",
    category: "Campaigns",
    icon: XCircle,
    color: "text-red-500",
  },
  { 
    id: "contributionFulfilled", 
    name: "Contribution Fulfilled", 
    description: "Sent when a campaign contribution is completed",
    category: "Campaigns",
    icon: PartyPopper,
    color: "text-emerald-600",
  },
];

// Group templates by category
const TEMPLATE_CATEGORIES = ["Applications", "Onboarding", "Communication", "Campaigns"] as const;

// Bulk email template options (subset that makes sense for bulk)
const BULK_TEMPLATES = [
  { id: "newsletter_welcome", name: "Newsletter Welcome" },
  { id: "investor_welcome", name: "Investor Welcome" },
  { id: "follow_up", name: "Follow Up" },
  { id: "acceptance", name: "Acceptance" },
  { id: "not_selected", name: "Not Selected" },
  { id: "schedule_call", name: "Schedule a Call" },
  { id: "custom", name: "Custom Email" },
] as const;

export function EmailSettings() {
  return (
    <div className="space-y-6">
      <SendTestEmail />
      <EmailTemplatePreview />
      <BulkEmailSender />
    </div>
  );
}

/**
 * Send Test Email Section
 */
function SendTestEmail() {
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState("newsletterWelcome");
  const [sending, setSending] = useState(false);
  
  const sendTestMutation = trpc.email.sendTest.useMutation({
    onSuccess: () => {
      toast.success("Test email sent successfully! Check your inbox.");
      setEmail("");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to send test email: ${error.message}`);
    },
    onSettled: () => {
      setSending(false);
    }
  });
  
  const handleSendTest = () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    setSending(true);
    sendTestMutation.mutate({ email, template });
  };
  
  return (
    <Card className="border-[#4a7c59]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a472a]">
          <Send className="w-5 h-5 text-[#4a7c59]" />
          Send Test Email
        </CardTitle>
        <CardDescription>
          Send a test email to verify your email configuration is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-email" className="text-[#1a472a]">Recipient Email</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="test-template" className="text-[#1a472a]">Email Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-[#4a7c59] bg-[#f0f7f0]">{cat}</div>
                    {EMAIL_TEMPLATES.filter(t => t.category === cat).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={handleSendTest}
          disabled={sending || !email}
          className="bg-[#4a7c59] hover:bg-[#4a7c59] text-white"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Test Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Email Template Preview Section - with persistence and customization
 */
function EmailTemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState("newsletterWelcome");
  const [activeTab, setActiveTab] = useState("browse");
  const [editingSubject, setEditingSubject] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const utils = trpc.useUtils();
  
  const previewQuery = trpc.email.getPreview.useQuery(
    { template: selectedTemplate },
    { enabled: true }
  );

  // Fetch saved custom templates from database
  const customTemplatesQuery = trpc.email.getCustomTemplates.useQuery();
  
  // Save custom template mutation
  const saveTemplateMutation = trpc.email.saveCustomTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully!");
      utils.email.getCustomTemplates.invalidate();
      setIsEditing(false);
      setActiveTab("preview");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });
  
  // Delete custom template mutation (revert to default)
  const deleteTemplateMutation = trpc.email.deleteCustomTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template reverted to default!");
      utils.email.getCustomTemplates.invalidate();
      utils.email.getPreview.invalidate();
      setIsEditing(false);
      setActiveTab("preview");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to revert template: ${error.message}`);
    },
  });

  const selectedInfo = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
  
  // Check if selected template has a custom version saved
  const customVersion = customTemplatesQuery.data?.find(
    (ct: { templateKey: string; bodyFormat?: string | null }) =>
      ct.templateKey === selectedTemplate && (!ct.bodyFormat || ct.bodyFormat === "html")
  );
  
  // Group templates by category for the browse view
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, typeof EMAIL_TEMPLATES> = {};
    TEMPLATE_CATEGORIES.forEach(cat => {
      groups[cat] = EMAIL_TEMPLATES.filter(t => t.category === cat);
    });
    return groups;
  }, []);

  const handleCopyHtml = () => {
    if (previewQuery.data?.html) {
      navigator.clipboard.writeText(previewQuery.data.html);
      setCopiedId(selectedTemplate);
      toast.success("Template HTML copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleStartEdit = () => {
    if (previewQuery.data) {
      setEditingSubject(customVersion?.customSubject || previewQuery.data.subject || "");
      setEditingBody(customVersion?.customBody || previewQuery.data.html || "");
      setIsEditing(true);
      setActiveTab("edit");
    }
  };
  
  const handleSaveTemplate = () => {
    saveTemplateMutation.mutate({
      templateKey: selectedTemplate,
      customSubject: editingSubject,
      customBody: editingBody,
      isActive: 1,
      bodyFormat: "html",
      layout: null,
    });
  };
  
  const handleRevertTemplate = () => {
    if (customVersion) {
      deleteTemplateMutation.mutate({ templateKey: selectedTemplate });
    } else {
      setIsEditing(false);
      setActiveTab("preview");
    }
  };
  
  return (
    <Card className="border-[#4a7c59]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a472a]">
          <Eye className="w-5 h-5 text-[#4a7c59]" />
          Email Template Manager
        </CardTitle>
        <CardDescription>
          Browse, preview, and customize all email templates. Customizations are saved to the database and persist across sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="browse">Browse Templates</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>
          
          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-4">
            {TEMPLATE_CATEGORIES.map((category) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-[#4a7c59] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4a7c59]" />
                  {category}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                  {groupedTemplates[category]?.map((t) => {
                    const Icon = t.icon;
                    const hasCustom = customTemplatesQuery.data?.some(
                      (ct: { templateKey: string; bodyFormat?: string | null }) =>
                        ct.templateKey === t.id && (!ct.bodyFormat || ct.bodyFormat === "html")
                    );
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedTemplate === t.id
                            ? "border-[#4a7c59] bg-[#f0f7f0] shadow-sm"
                            : "border-gray-200 hover:border-[#4a7c59]/50 hover:bg-[#f8faf8]"
                        }`}
                        onClick={() => {
                          setSelectedTemplate(t.id);
                          setIsEditing(false);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${t.color}`} />
                          <h4 className="font-medium text-[#1a472a] text-sm">{t.name}</h4>
                          {hasCustom && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 bg-amber-50">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#1a472a]/80">{t.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button 
                variant="outline"
                className="border-[#4a7c59]/30 hover:bg-[#f0f7f0]"
                onClick={() => setActiveTab("preview")}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview: {selectedInfo?.name || "Select a template"}
              </Button>
              <Button
                variant="outline"
                className="border-[#4a7c59]/30 hover:bg-[#f0f7f0]"
                onClick={handleStartEdit}
                disabled={previewQuery.isLoading}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Customize
              </Button>
            </div>
          </TabsContent>
          
          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {selectedInfo && (
                  <>
                    <selectedInfo.icon className={`w-5 h-5 ${selectedInfo.color}`} />
                    <span className="font-medium text-[#1a472a]">{selectedInfo.name}</span>
                    <Badge variant="outline" className="text-xs">{selectedInfo.category}</Badge>
                    {customVersion && (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 bg-amber-50">
                        Customized
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyHtml}
                  className="border-[#4a7c59]/30"
                >
                  {copiedId === selectedTemplate ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Copied</>
                  ) : (
                    <><Copy className="w-3 h-3 mr-1" /> Copy HTML</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="border-[#4a7c59]/30"
                  disabled={previewQuery.isLoading}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Customize
                </Button>
                {customVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevertTemplate}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    disabled={deleteTemplateMutation.isPending}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Revert to Default
                  </Button>
                )}
              </div>
            </div>
            
            {/* Subject line preview */}
            {previewQuery.data?.subject && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <Label className="text-xs text-[#1a472a]/80 mb-1 block">Subject Line</Label>
                <p className="text-sm font-medium text-[#1a472a]">
                  {customVersion?.customSubject || previewQuery.data.subject}
                </p>
              </div>
            )}
            
            {/* Inline email preview */}
            <div className="border rounded-lg bg-gray-50 overflow-hidden">
              {previewQuery.isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#4a7c59]" />
                  <span className="ml-2 text-[#4a7c59]">Loading preview...</span>
                </div>
              ) : previewQuery.error ? (
                <div className="flex items-center justify-center p-8 text-red-500">
                  <XCircle className="w-5 h-5 mr-2" />
                  Failed to load preview: {previewQuery.error.message}
                </div>
              ) : (
                <iframe
                  srcDoc={customVersion?.customBody || previewQuery.data?.html || ""}
                  className="w-full h-[550px] border-0"
                  title="Email Preview"
                />
              )}
            </div>
            
            <p className="text-xs text-[#1a472a]/80 text-center">
              Preview uses sample data (Jane Smith, Green Valley Regenerative Farm). Actual emails will use real recipient data.
            </p>
          </TabsContent>
          
          {/* Edit Tab */}
          <TabsContent value="edit" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {selectedInfo && (
                  <>
                    <selectedInfo.icon className={`w-5 h-5 ${selectedInfo.color}`} />
                    <span className="font-medium text-[#1a472a]">Editing: {selectedInfo.name}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevertTemplate}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={deleteTemplateMutation.isPending}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {customVersion ? "Revert to Default" : "Cancel"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTemplate}
                  className="bg-[#4a7c59] hover:bg-[#4a7c59] text-white"
                  disabled={saveTemplateMutation.isPending}
                >
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 mr-1" />
                  )}
                  Save to Database
                </Button>
              </div>
            </div>
            
            <div className="bg-[#f0f7f0] border border-[#4a7c59]/20 rounded-lg p-3">
              <p className="text-xs text-[#1a472a]">
                <strong>Template Persistence:</strong> Changes saved here are stored in the database and will be used for all future emails 
                of this type. You can always revert to the default template. Use <code className="bg-white px-1 rounded">{"{{name}}"}</code> for 
                recipient name and <code className="bg-white px-1 rounded">{"{{email}}"}</code> for recipient email as merge fields.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[#1a472a]">Subject Line</Label>
                <Input
                  value={editingSubject}
                  onChange={(e) => setEditingSubject(e.target.value)}
                  className="bg-white"
                  placeholder="Email subject line..."
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#1a472a]">Email Body (HTML)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1.5 border-b flex items-center gap-2">
                    <span className="text-xs text-gray-500">HTML Source</span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-300">Tip: Edit the HTML below and see changes in the live preview</span>
                  </div>
                  <Textarea
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    className="bg-white min-h-[300px] font-mono text-xs border-0 rounded-none resize-y"
                    placeholder="<h2>Hello {{name}},</h2><p>Your email content here...</p>"
                  />
                </div>
              </div>
            </div>
            
            {/* Live preview of edits */}
            <div className="space-y-2">
              <Label className="text-[#1a472a]">Live Preview</Label>
              <div className="border rounded-lg bg-gray-50 overflow-hidden">
                <iframe
                  srcDoc={editingBody}
                  className="w-full h-[400px] border-0"
                  title="Edit Preview"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Bulk Email Sender Section
 */
function BulkEmailSender() {
  const [recipients, setRecipients] = useState<{ email: string; name: string; projectName?: string }[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [bulkTemplate, setBulkTemplate] = useState("newsletter_welcome");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [mergeFields, setMergeFields] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [inputMode, setInputMode] = useState<"single" | "bulk">("single");
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const autoloadedSource = useRef(false);
  
  // Queries for loading recipients from database
  const newsletterQuery = trpc.newsletter.listActive.useQuery(undefined, { enabled: false });
  const investorQuery = trpc.investorInquiries.list.useQuery(undefined, { enabled: false });
  const loiQuery = trpc.loi.list.useQuery(undefined, { enabled: false });
  const generalInquiriesQuery = trpc.generalInquiries.list.useQuery(undefined, { enabled: false });
  const utils = trpc.useUtils();

  const sourceLabels: Record<string, string> = {
    newsletter: "newsletter subscribers",
    investors: "investor inquiries",
    loi: "letters of intent",
    inquiries: "general inquiries",
    ...Object.fromEntries(APPLICATION_EMAIL_SOURCES.map((s) => [s.id, s.label.toLowerCase()])),
  };
  
  const handleLoadFromDatabase = async (source: string) => {
    setLoadingSource(source);
    try {
      let newRecipients: { email: string; name: string; projectName?: string }[] = [];
      
      if (source === "newsletter") {
        const result = await newsletterQuery.refetch();
        if (result.data) {
          newRecipients = result.data
            .filter((s: any) => s.email && s.isActive)
            .map((s: any) => ({ email: s.email, name: s.name || s.email.split("@")[0] }));
        }
      } else if (source === "investors") {
        const result = await investorQuery.refetch();
        if (result.data) {
          newRecipients = result.data
            .filter((i: any) => i.email)
            .map((i: any) => ({ email: i.email, name: i.fullName || i.email.split("@")[0] }));
        }
      } else if (source === "loi") {
        const result = await loiQuery.refetch();
        if (result.data) {
          newRecipients = result.data
            .filter((l: any) => l.email)
            .map((l: any) => ({ email: l.email, name: l.fullName || l.email.split("@")[0] }));
        }
      } else if (source === "inquiries") {
        const result = await generalInquiriesQuery.refetch();
        if (result.data) {
          newRecipients = result.data
            .filter((g: any) => g.email)
            .map((g: any) => ({ email: g.email, name: g.fullName || g.email.split("@")[0] }));
        }
      } else {
        const appStatus = statusForSourceId(source);
        if (appStatus) {
          const data = await utils.applications.listEmailRecipients.fetch({ status: appStatus });
          newRecipients = data.map((r) => ({
            email: r.email,
            name: r.name,
            projectName: r.projectName,
          }));
        }
      }
      
      // Deduplicate against existing recipients
      const existingEmails = new Set(recipients.map(r => r.email));
      const uniqueNew = newRecipients.filter(r => !existingEmails.has(r.email));
      
      if (uniqueNew.length === 0) {
        toast.info(newRecipients.length === 0 ? "No recipients found in this list." : "All recipients from this list are already added.");
      } else {
        setRecipients(prev => [...prev, ...uniqueNew].slice(0, 100));
        toast.success(`Loaded ${uniqueNew.length} recipient(s) from ${sourceLabels[source] || source}`);
      }
    } catch (error: any) {
      toast.error(`Failed to load recipients: ${error.message || "Unknown error"}`);
    } finally {
      setLoadingSource(null);
    }
  };
  
  const sendBulkMutation = trpc.email.sendBulk.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      toast.success(`Sent ${data.totalSent} of ${data.totalSent + data.totalFailed} emails successfully!`);
      setSending(false);
    },
    onError: (error: { message: string }) => {
      toast.error(`Bulk send failed: ${error.message}`);
      setSending(false);
    },
  });
  
  const handleAddRecipient = () => {
    if (!newEmail) {
      toast.error("Please enter an email address");
      return;
    }
    if (recipients.some(r => r.email === newEmail)) {
      toast.error("This email is already in the list");
      return;
    }
    setRecipients([...recipients, { email: newEmail, name: newName || newEmail.split("@")[0] }]);
    setNewEmail("");
    setNewName("");
  };
  
  const handleParseBulk = () => {
    const lines = bulkInput.split("\n").filter(l => l.trim());
    const parsed: { email: string; name: string }[] = [];
    const errors: string[] = [];
    
    for (const line of lines) {
      // Support formats: "email,name" or "email" or "name <email>"
      const angleMatch = line.match(/(.+?)\s*<(.+?)>/);
      if (angleMatch) {
        parsed.push({ name: angleMatch[1].trim(), email: angleMatch[2].trim() });
      } else if (line.includes(",")) {
        const [email, name] = line.split(",").map(s => s.trim());
        if (email.includes("@")) {
          parsed.push({ email, name: name || email.split("@")[0] });
        } else {
          errors.push(line);
        }
      } else if (line.includes("@")) {
        parsed.push({ email: line.trim(), name: line.trim().split("@")[0] });
      } else {
        errors.push(line);
      }
    }
    
    // Deduplicate
    const unique = parsed.filter((p, i) => parsed.findIndex(q => q.email === p.email) === i);
    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.email));
      return [...prev, ...unique.filter(u => !existing.has(u.email))];
    });
    
    if (errors.length > 0) {
      toast.error(`Could not parse ${errors.length} line(s). Make sure each line has a valid email.`);
    } else {
      toast.success(`Added ${unique.length} recipient(s)`);
      setBulkInput("");
    }
  };
  
  useEffect(() => {
    if (autoloadedSource.current) return;
    try {
      const source = new URLSearchParams(window.location.search).get("emailSource");
      if (source) {
        autoloadedSource.current = true;
        void handleLoadFromDatabase(source);
      }
    } catch {
      /* ignore malformed search */
    }
    // Load once on mount when arriving from Application Reviews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };
  
  const handleSendBulk = () => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }
    if (bulkTemplate === "custom" && !customSubject) {
      toast.error("Please enter a subject for the custom email");
      return;
    }
    setSending(true);
    setResults(null);
    sendBulkMutation.mutate({
      recipients,
      templateType: bulkTemplate as any,
      customSubject: bulkTemplate === "custom" ? customSubject : undefined,
      customBody: bulkTemplate === "custom" ? customBody : undefined,
      bodyFormat: bulkTemplate === "custom" ? "html" : undefined,
      mergeFields: Object.keys(mergeFields).length > 0 ? mergeFields : undefined,
    });
  };
  
  return (
    <Card className="border-[#4a7c59]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a472a]">
          <Users className="w-5 h-5 text-[#4a7c59]" />
          Bulk Email Sender
        </CardTitle>
        <CardDescription>
          Send template-based emails to multiple recipients at once. Max 100 recipients per batch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#1a472a]">Email Template</Label>
            <Select value={bulkTemplate} onValueChange={setBulkTemplate}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {BULK_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {bulkTemplate === "investor_welcome" && (
            <div className="space-y-2">
              <Label className="text-[#1a472a]">Investment Range (merge field)</Label>
              <Input
                placeholder="e.g. $100k - $250k"
                value={mergeFields.investmentRange || ""}
                onChange={(e) => setMergeFields({ ...mergeFields, investmentRange: e.target.value })}
                className="bg-white"
              />
            </div>
          )}
          
          {bulkTemplate === "land_project_accepted" && (
            <div className="space-y-2">
              <Label className="text-[#1a472a]">Project Name (merge field)</Label>
              <Input
                placeholder="e.g. Green Valley Farm"
                value={mergeFields.projectName || ""}
                onChange={(e) => setMergeFields({ ...mergeFields, projectName: e.target.value })}
                className="bg-white"
              />
            </div>
          )}
        </div>
        
        {/* Custom template fields */}
        {bulkTemplate === "custom" && (
          <div className="space-y-3 p-4 border border-[#4a7c59]/20 rounded-lg bg-[#f8faf8]">
            <div className="space-y-2">
              <Label className="text-[#1a472a]">Custom Subject</Label>
              <Input
                placeholder="Email subject line..."
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1a472a]">Custom Body (HTML)</Label>
              <Textarea
                placeholder={"<h2>Hello {{name}},</h2>\n<p>Your message here...</p>\n<p>Use {{name}}, {{email}}, and {{projectName}} as merge fields.</p>"}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="bg-white min-h-[150px] font-mono text-xs"
              />
            </div>
          </div>
        )}
        
        {/* Recipients */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-[#1a472a] font-semibold">
              Recipients ({recipients.length}/100)
            </Label>
            <div className="flex gap-2 flex-wrap">
              {/* Load from Database dropdown */}
              <div className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#4a7c59]/30 text-xs"
                  disabled={!!loadingSource}
                >
                  {loadingSource ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
                  ) : (
                    <><Database className="w-3 h-3 mr-1" /> Load from Database</>
                  )}
                </Button>
                <div className="absolute right-0 top-full mt-1 w-64 max-h-[28rem] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 hidden group-hover:block group-focus-within:block">
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => handleLoadFromDatabase("newsletter")}
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#f0f7f0] flex items-center gap-2 text-[#1a472a]"
                      disabled={!!loadingSource}
                    >
                      <Newspaper className="w-4 h-4 text-blue-500" />
                      Newsletter Subscribers
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFromDatabase("investors")}
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#f0f7f0] flex items-center gap-2 text-[#1a472a]"
                      disabled={!!loadingSource}
                    >
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      Investor Inquiries
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFromDatabase("loi")}
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#f0f7f0] flex items-center gap-2 text-[#1a472a]"
                      disabled={!!loadingSource}
                    >
                      <Handshake className="w-4 h-4 text-green-600" />
                      Letters of Intent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFromDatabase("inquiries")}
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#f0f7f0] flex items-center gap-2 text-[#1a472a]"
                      disabled={!!loadingSource}
                    >
                      <Mail className="w-4 h-4 text-purple-500" />
                      General Inquiries
                    </button>
                    <div className="h-px bg-gray-100 my-1" role="separator" />
                    <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-[#1a472a]/50">Land projects</p>
                    {APPLICATION_EMAIL_SOURCES.map((source) => {
                      const Icon =
                        source.status === "approved" ? Sprout
                        : source.status === "rejected" ? XCircle
                        : source.status === "changes_requested" ? AlertCircle
                        : Clock;
                      const iconClass =
                        source.status === "approved" ? "text-green-600"
                        : source.status === "rejected" ? "text-red-400"
                        : source.status === "changes_requested" ? "text-orange-500"
                        : source.status === "submitted" ? "text-blue-500"
                        : "text-amber-600";
                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => handleLoadFromDatabase(source.id)}
                          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#f0f7f0] flex items-center gap-2 text-[#1a472a]"
                          disabled={!!loadingSource}
                        >
                          <Icon className={`w-4 h-4 ${iconClass}`} />
                          {source.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMode(inputMode === "single" ? "bulk" : "single")}
                className="border-[#4a7c59]/30 text-xs"
              >
                {inputMode === "single" ? "Switch to Bulk Paste" : "Switch to Single Add"}
              </Button>
              {recipients.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setRecipients([]); setResults(null); }}
                  className="border-red-300 text-red-600 hover:bg-red-50 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          
          {inputMode === "single" ? (
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-white flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
              />
              <Input
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white w-40"
                onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
              />
              <Button
                variant="outline"
                onClick={handleAddRecipient}
                className="border-[#4a7c59]/30"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder={"Paste emails, one per line. Supported formats:\nemail@example.com\nemail@example.com, Name\nName <email@example.com>"}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="bg-white min-h-[100px] font-mono text-xs"
              />
              <Button
                variant="outline"
                onClick={handleParseBulk}
                className="border-[#4a7c59]/30"
                disabled={!bulkInput.trim()}
              >
                Parse and Add Recipients
              </Button>
            </div>
          )}
          
          {/* Recipient list */}
          {recipients.length > 0 && (
            <div className="border rounded-lg max-h-[200px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[#1a472a]/75 font-medium">#</th>
                    <th className="text-left px-3 py-2 text-[#1a472a]/75 font-medium">Email</th>
                    <th className="text-left px-3 py-2 text-[#1a472a]/75 font-medium">Name</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r, i) => (
                    <tr key={r.email} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-[#1a472a]/80 text-xs">{i + 1}</td>
                      <td className="px-3 py-1.5 text-[#1a472a]">{r.email}</td>
                      <td className="px-3 py-1.5 text-[#1a472a]/75">{r.name}</td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => handleRemoveRecipient(r.email)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          aria-label={`Remove ${r.email}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Send Button */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <Button
            onClick={handleSendBulk}
            disabled={sending || recipients.length === 0}
            className="bg-[#4a7c59] hover:bg-[#4a7c59] text-white"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending to {recipients.length} recipients...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {recipients.length} Recipient{recipients.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
          
          {recipients.length > 10 && (
            <div className="flex items-center gap-1 text-amber-600 text-xs">
              <AlertTriangle className="w-3 h-3" />
              Large batch - emails will be sent with a 200ms delay between each
            </div>
          )}
        </div>
        
        {/* Results */}
        {results && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
            <h4 className="font-medium text-[#1a472a] text-sm">Send Results</h4>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {results.filter(r => r.success).length} sent
              </span>
              {results.filter(r => !r.success).length > 0 && (
                <span className="text-red-500 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {results.filter(r => !r.success).length} failed
                </span>
              )}
            </div>
            {results.filter(r => !r.success).length > 0 && (
              <div className="text-xs text-red-500 space-y-1 mt-2">
                {results.filter(r => !r.success).map((r) => (
                  <div key={r.email}>
                    {r.email}: {r.error || "Unknown error"}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
