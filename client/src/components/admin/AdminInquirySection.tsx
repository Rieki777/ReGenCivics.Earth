import { useState, lazy, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Download, Send, Loader2, MapPin, Clock, ChevronRight, Mail, X, CheckCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { EmailTemplateSelector, emailTemplates } from "@/components/EmailTemplateSelector";
import { EmailMarkdownComposer } from "@/components/admin/EmailMarkdownComposer";
import { EmailSaveTemplateBar } from "@/components/admin/EmailSaveTemplateBar";
import { defaultLayoutForTemplate, type LetterLayout } from "@shared/letterLayout";
import {
  pathTypeConfig, landProjectsList, allianceOrgsList, filterByProject, exportToCSV, getAgeInfo, inquiryListBlurb,
} from "@/lib/adminInquiry";
import { ContactNotesPanel, ContactTagsPanel, ReminderPanel, AssigneeSelect } from "./AdminContactPanels";
import { EmailHistoryPanel } from "./EmailHistoryPanel";
import { GeneralInquiryAnswersPanel } from "./GeneralInquiryAnswersPanel";

const ActivityTimeline = lazy(() => import("@/components/ActivityTimeline").then(m => ({ default: m.ActivityTimeline })));

export function InquirySection({
  pathType,
  inquiries,
  openId,
  onOpenIdChange,
}: {
  pathType: string;
  inquiries: any[];
  openId?: number | null;
  onOpenIdChange?: (id: number | null) => void;
}) {
  const [internalOpen, setInternalOpen] = useState<number | null>(openId ?? null);
  useEffect(() => {
    if (openId != null) setInternalOpen(openId);
  }, [openId]);
  const activeOpen = onOpenIdChange ? (openId ?? null) : internalOpen;
  const setOpen = (id: number | null) => {
    if (onOpenIdChange) onOpenIdChange(id);
    else setInternalOpen(id);
  };
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(() => {
    try { return localStorage.getItem(`admin_inquiry_filter_${pathType}`); } catch { return null; }
  });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkEmailTemplate, setBulkEmailTemplate] = useState('follow_up');
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailBody, setBulkEmailBody] = useState('');
  const [bulkEmailLayout, setBulkEmailLayout] = useState<LetterLayout>('plain');

  useEffect(() => {
    try {
      if (activeFilter) localStorage.setItem(`admin_inquiry_filter_${pathType}`, activeFilter);
      else localStorage.removeItem(`admin_inquiry_filter_${pathType}`);
    } catch { /* storage blocked */ }
  }, [activeFilter, pathType]);

  useEffect(() => {
    if (!activeOpen) return;
    const el = document.getElementById(`inquiry-${activeOpen}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeOpen]);

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
      setBulkEmailLayout(defaultLayoutForTemplate(templateId));
    }
  };
  
  const config = pathTypeConfig[pathType] || pathTypeConfig.other;
  const Icon = config.icon;
  const baseFilteredInquiries = inquiries.filter((i: any) => i.pathType === pathType);

  // Apply search filter
  const searchFiltered = search
    ? baseFilteredInquiries.filter((i: any) => {
        const q = search.toLowerCase();
        return (
          i.fullName?.toLowerCase().includes(q) ||
          i.email?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          inquiryListBlurb(i).toLowerCase().includes(q)
        );
      })
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

  const noneSubmitted = baseFilteredInquiries.length === 0;

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
                <SelectTrigger className="min-h-11 text-xs bg-white">
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
          <div className="space-y-1 apply-form-dark">
            <Label className="text-xs text-blue-700">Body (markdown. Use {'{{name}}'} for recipient name.)</Label>
            <EmailMarkdownComposer
              subject={bulkEmailSubject}
              body={bulkEmailBody}
              layout={bulkEmailLayout}
              onLayoutChange={setBulkEmailLayout}
              onSubjectChange={setBulkEmailSubject}
              onBodyChange={setBulkEmailBody}
              showSubject={false}
              minHeightClass="min-h-[120px]"
              bodyId="admin-bulk-email-body"
            />
            <EmailSaveTemplateBar
              subject={bulkEmailSubject}
              body={bulkEmailBody}
              layout={bulkEmailLayout}
              builtinTemplates={emailTemplates}
              currentKey={bulkEmailTemplate}
              onSaved={() => {}}
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
                  bodyFormat: "markdown",
                  layout: bulkEmailLayout,
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
      {filteredInquiries.length === 0 ? (
        <div className="text-center py-8 text-[#1a472a]/75">
          <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>
            {noneSubmitted
              ? `No ${config.label.toLowerCase()} inquiries yet`
              : "No inquiries match this search"}
          </p>
          {!noneSubmitted && (
            <button
              type="button"
              onClick={() => { setSearch(""); setActiveFilter(null); }}
              className="mt-2 min-h-11 px-3 text-sm font-semibold text-[#1a472a] underline-offset-2 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
      <div className="divide-y divide-[#1a472a]/10">
      {filteredInquiries.map((inquiry: any, currentIndex: number) => {
        // Prefer real general_inquiries columns; fall back to legacy formData JSON if present.
        let formData: any = {};
        try {
          formData = inquiry.formData ? JSON.parse(inquiry.formData) : {};
        } catch (e) {
          formData = {};
        }
        const parseList = (raw: unknown): string[] => {
          if (Array.isArray(raw)) return raw.map(String);
          if (typeof raw !== "string" || !raw.trim()) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            return [];
          }
        };
        const selectedProjects = parseList(inquiry.landProjects).length
          ? parseList(inquiry.landProjects)
          : (formData.selectedProjects || []);
        const selectedOrgs = parseList(inquiry.allianceOrganizations).length
          ? parseList(inquiry.allianceOrganizations)
          : (formData.selectedOrganizations || []);
        const roleArchetypes = parseList(inquiry.roleArchetypes).length
          ? parseList(inquiry.roleArchetypes)
          : (formData.roleArchetypes || []);
        const contributionTypes = formData.contributionTypes || [];
        
        const isOpen = activeOpen === inquiry.id;
        const blurb = inquiryListBlurb(inquiry);
        return (
          <div key={inquiry.id} id={`inquiry-${inquiry.id}`} className="border-b border-[#1a472a]/10 last:border-b-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(isOpen ? null : inquiry.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(isOpen ? null : inquiry.id);
                  }
                }}
                className={`p-4 hover:bg-[#f0ebe3]/50 transition-colors cursor-pointer ${isOpen ? "bg-[#f0ebe3]/70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Checkbox
                      checked={selectedItems.has(inquiry.id)}
                      onCheckedChange={() => toggleItemSelection(inquiry.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-[#1a472a]" />
                    </div>
                    <div className="min-w-0 flex-1">
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
                      
                      {blurb ? (
                        <p className="text-sm text-[#1a472a]/75 mt-2 line-clamp-2">
                          {blurb}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="min-h-11 px-3 rounded-lg bg-[#1a472a] text-white text-xs font-semibold inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(inquiry.id);
                          requestAnimationFrame(() => document.getElementById(`inquiry-email-${inquiry.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
                        }}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </button>
                      <ChevronRight className={`w-4 h-4 text-[#1a472a]/75 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </div>
              </div>
              {isOpen && (
              <div className="px-4 pb-5 pt-1 bg-[#f8f5f0] border-t border-[#1a472a]/15">
              <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div>
                    <span className="text-[#1a472a] font-semibold">{inquiry.fullName || 'Anonymous'}</span>
                    <p className="text-sm font-normal text-[#1a472a]/80">{config.label}</p>
                  </div>
              </div>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
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

                <GeneralInquiryAnswersPanel inquiry={inquiry} />

                {/* Activity Timeline */}
                <Suspense fallback={null}><ActivityTimeline email={inquiry.email} contactType="inquiry" contactId={inquiry.id} /></Suspense>

                {/* Email History */}
                <EmailHistoryPanel email={inquiry.email} />

                {/* Internal Notes */}
                <ContactNotesPanel contactType="inquiry" contactId={inquiry.id} />
                <ContactTagsPanel contactType="inquiry" contactId={inquiry.id} />
                <ReminderPanel contactType="inquiry" contactId={inquiry.id} />
              </div>

              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#1a472a]/10">
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
                    <SelectTrigger className="min-h-11 text-xs flex-1">
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
                        className="text-xs min-h-11"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const prevInquiry = filteredInquiries[currentIndex - 1];
                          if (prevInquiry) setOpen(prevInquiry.id);
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    {currentIndex < filteredInquiries.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs min-h-11"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const nextInquiry = filteredInquiries[currentIndex + 1];
                          if (nextInquiry) setOpen(nextInquiry.id);
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <div className="flex-1" id={`inquiry-email-${inquiry.id}`}>
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
                        setOpen(nextInquiry.id);
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
              </div>
              </div>
              )}
          </div>
        );
      })}
      </div>
      )}
    </div>
  );
}
