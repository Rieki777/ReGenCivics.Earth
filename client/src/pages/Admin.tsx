import { useState, useEffect, lazy, Suspense } from "react";
import SEO from "@/components/SEO";
import { AdminAIAssistant, type AdminAIAction } from "@/components/AdminAIAssistant";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminApplicationsSection } from "@/components/admin/AdminApplicationsSection";
import { AdminNotificationCenter } from "@/components/admin/AdminNotificationCenter";
import { AdminCitizenshipTiers } from "@/components/admin/AdminCitizenshipTiers";
import { EmailHistoryPanel } from "@/components/admin/EmailHistoryPanel";
import { AdminInquiriesHub } from "@/components/admin/AdminInquiriesHub";
import { ContactNotesPanel, ContactTagsPanel, ReminderPanel, AssigneeSelect } from "@/components/admin/AdminContactPanels";
import { NewsletterSubscribersList } from "@/components/admin/AdminSettingsPanels";
import { AdminPlayersTab } from "@/components/admin/AdminPlayersTab";
import { AdminCustomGameWaitlist, AdminCustomGameApplications } from "@/components/admin/AdminCustomGamesPanels";
import { AdminPasswordGate } from "@/components/admin/AdminPasswordGate";
import { exportToCSV, getInvestorPriority } from "@/lib/adminInquiry";
import { recordAdminVisit } from "@/lib/adminUsage";
import { writeAdminContinueFromTab } from "@/lib/adminNav";
import { InquirySection } from "@/components/admin/AdminInquirySection";

const AdminApplicationsTab = lazy(() => import("@/components/admin/AdminApplicationsTab").then(m => ({ default: m.AdminApplicationsTab })));
const AdminAnalyticsTab = lazy(() => import("@/components/admin/AdminAnalyticsTab").then(m => ({ default: m.AdminAnalyticsTab })));
const AdminNewsletterTab = lazy(() => import("@/components/admin/AdminNewsletterTab").then(m => ({ default: m.AdminNewsletterTab })));
const AdminSettingsTab = lazy(() => import("@/components/admin/AdminSettingsTab").then(m => ({ default: m.AdminSettingsTab })));
const AdminInvestorsTab = lazy(() => import("@/components/admin/AdminInvestorsTab").then(m => ({ default: m.AdminInvestorsTab })));
const AdminAllianceTab = lazy(() => import("@/components/admin/AdminAllianceTab").then(m => ({ default: m.AdminAllianceTab })));
const AdminSeedsClaimsTab = lazy(() => import("@/components/admin/AdminSeedsClaimsTab").then(m => ({ default: m.AdminSeedsClaimsTab })));
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
const AdminEventsTab = lazy(() => import("@/components/admin/AdminEventsTab").then(m => ({ default: m.AdminEventsTab })));
const AdminRecordingsTab = lazy(() => import("@/components/admin/AdminRecordingsTab").then(m => ({ default: m.AdminRecordingsTab })));
const AdminAuditLogTab = lazy(() => import("@/components/admin/AdminAuditLogTab").then(m => ({ default: m.AdminAuditLogTab })));

const LEGACY_INQUIRY_TABS = new Set(["live", "create", "role", "other", "kanban"]);

function readSearch() {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

function AdminDashboard() {
  const params = readSearch();
  const rawTab = params.get("tab") || "overview";
  const [activeTab, setActiveTabState] = useState(() => (LEGACY_INQUIRY_TABS.has(rawTab) ? "inquiries" : rawTab));
  const [inquiryType, setInquiryType] = useState<string | null>(() =>
    LEGACY_INQUIRY_TABS.has(rawTab) ? (rawTab === "kanban" ? "kanban" : rawTab) : params.get("type"),
  );
  const [openRecordId, setOpenRecordId] = useState<number | null>(() => {
    const open = params.get("open");
    return open ? Number(open) : null;
  });
  const [investorSearch, setInvestorSearch] = useState("");
  const [appSearch, setAppSearch] = useState("");
  const [investorStatusFilter, setInvestorStatusFilter] = useState<string>("all");
  const [showDrafts, setShowDrafts] = useState(false);
  const [aiSelectedContact, setAiSelectedContact] = useState<{ email?: string; name?: string } | null>(null);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  const setActiveTab = (tab: string, extras?: { type?: string; open?: string }) => {
    const nextTab = LEGACY_INQUIRY_TABS.has(tab) ? "inquiries" : tab;
    setActiveTabState(nextTab);
    if (LEGACY_INQUIRY_TABS.has(tab)) {
      setInquiryType(tab === "kanban" ? "kanban" : tab);
    } else if (extras?.type) {
      setInquiryType(extras.type);
    }
    if (extras?.open) setOpenRecordId(Number(extras.open));
    else if (nextTab !== activeTab) setOpenRecordId(null);
    recordAdminVisit(nextTab);
    writeAdminContinueFromTab(nextTab);
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (activeTab === "overview") url.searchParams.delete("tab");
      else url.searchParams.set("tab", activeTab);
      if (activeTab === "inquiries" && inquiryType) url.searchParams.set("type", inquiryType);
      else url.searchParams.delete("type");
      if (openRecordId) url.searchParams.set("open", String(openRecordId));
      else url.searchParams.delete("open");
      const next = url.pathname + url.search;
      if (next !== window.location.pathname + window.location.search) {
        window.history.pushState(null, "", next);
      }
    } catch { /* history unavailable */ }
  }, [activeTab, inquiryType, openRecordId]);

  useEffect(() => {
    const onPop = () => {
      const p = readSearch();
      const tab = p.get("tab") || "overview";
      setActiveTabState(LEGACY_INQUIRY_TABS.has(tab) ? "inquiries" : tab);
      setInquiryType(LEGACY_INQUIRY_TABS.has(tab) ? (tab === "kanban" ? "kanban" : tab) : p.get("type"));
      const open = p.get("open");
      setOpenRecordId(open ? Number(open) : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function handleAIAction(action: AdminAIAction) {
    if (action.type === "navigate" && action.tab) {
      setActiveTab(action.tab);
    } else if (action.type === "search" && action.query) {
      setInvestorSearch(action.query);
      setActiveTab("investors");
    } else if (action.type === "compose" && action.to) {
      setInvestorSearch(action.to);
    } else if (action.type === "focus" && action.contactEmail) {
      setAiSelectedContact({ email: action.contactEmail, name: action.contactEmail });
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "/") {
        e.preventDefault();
        (document.querySelector("[data-global-search]") as HTMLInputElement)?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: applications } = trpc.applications.list.useQuery(undefined, { retry: false });
  const { data: draftApplications } = trpc.applications.listDrafts.useQuery(undefined, { retry: false });
  const { data: investors } = trpc.investorInquiries.list.useQuery(undefined, { retry: false });
  const { data: inquiries } = trpc.generalInquiries.list.useQuery(undefined, { retry: false });

  const utils = trpc.useUtils();
  const auditNote = trpc.contactNotes.create.useMutation();
  const logAudit = (contactType: string, contactId: number, message: string) => {
    auditNote.mutate({ contactType, contactId, note: `📋 ${message}`, authorName: "System" });
  };

  const updateInvestorMutation = trpc.investorInquiries.updateStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.investorInquiries.list.invalidate();
      logAudit("investor", variables.id, `Status → ${variables.status}`);
    },
    onError: (error: { message: string }) => toast.error(`Failed: ${error.message}`),
  });

  const stats = {
    totalApplications: applications?.length || 0,
    totalInvestors: investors?.length || 0,
    totalInquiries: inquiries?.length || 0,
    pendingReview:
      (applications?.filter((a: { status: string }) => a.status === "pending").length || 0) +
      (investors?.filter((i: { status: string }) => i.status === "pending").length || 0) +
      (inquiries?.filter((i: { status: string }) => i.status === "pending" || i.status === "new").length || 0),
  };

  const inquiriesByPath = inquiries?.reduce((acc: Record<string, number>, inquiry: { pathType?: string }) => {
    const path = inquiry.pathType || "other";
    acc[path] = (acc[path] || 0) + 1;
    return acc;
  }, {}) || {};

  const investorEmailCounts = (investors || []).reduce((acc: Record<string, number>, inv: { email?: string }) => {
    if (inv.email) acc[inv.email] = (acc[inv.email] || 0) + 1;
    return acc;
  }, {});
  const duplicateInvestorEmails = new Set(
    Object.entries(investorEmailCounts).filter(([, c]) => c > 1).map(([e]) => e),
  );

  const filteredInvestors = (investors || []).filter((inv: any) => {
    const matchesSearch = !investorSearch ||
      inv.fullName?.toLowerCase().includes(investorSearch.toLowerCase()) ||
      inv.email?.toLowerCase().includes(investorSearch.toLowerCase()) ||
      inv.investmentRange?.toLowerCase().includes(investorSearch.toLowerCase()) ||
      inv.organization?.toLowerCase().includes(investorSearch.toLowerCase());
    const matchesStatus = investorStatusFilter === "all" || inv.status === investorStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredApps = (applications || []).filter((app: any) =>
    !appSearch ||
    app.projectName?.toLowerCase().includes(appSearch.toLowerCase()) ||
    app.location?.toLowerCase().includes(appSearch.toLowerCase()) ||
    app.vision?.toLowerCase().includes(appSearch.toLowerCase()),
  );

  const investorRangeCounts = (investors || []).reduce((acc: Record<string, number>, inv: any) => {
    const range = inv.investmentRange || "Not specified";
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminChrome
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={stats.pendingReview}
      onNotif={() => setNotifCenterOpen(true)}
    >
      <AdminNotificationCenter open={notifCenterOpen} onClose={() => setNotifCenterOpen(false)} />
      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab)} className="space-y-6">
        <Suspense fallback={<div className="py-20 text-center text-[#1a472a]/75 text-sm">Loading section…</div>}>
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

          <TabsContent value="applications">
            <AdminApplicationsSection
              list={
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
              }
            />
          </TabsContent>

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
              openId={activeTab === "investors" ? openRecordId : null}
              onOpenIdChange={setOpenRecordId}
            />
          </TabsContent>

          <TabsContent value="alliance">
            <AdminAllianceTab inquiries={inquiries} InquirySectionComp={InquirySection} />
          </TabsContent>

          <TabsContent value="inquiries">
            <AdminInquiriesHub
              inquiries={inquiries}
              investors={investors}
              applications={applications}
              openId={openRecordId}
              initialType={inquiryType}
              onOpenIdChange={setOpenRecordId}
              onTypeChange={setInquiryType}
            />
          </TabsContent>

          <TabsContent value="roles">
            <AdminPlayersTab />
          </TabsContent>

          <TabsContent value="crowdpooling"><AdminCrowdpoolingTab /></TabsContent>
          <TabsContent value="newsletter">
            <AdminNewsletterTab NewsletterSubscribersListComp={NewsletterSubscribersList} />
          </TabsContent>
          <TabsContent value="broadcast"><AdminBroadcastTab /></TabsContent>
          <TabsContent value="analytics"><AdminAnalyticsTab /></TabsContent>
          <TabsContent value="loi"><AdminLOITab /></TabsContent>
          <TabsContent value="banners"><AdminBannersTab /></TabsContent>
          <TabsContent value="settings"><AdminSettingsTab /></TabsContent>
          <TabsContent value="images"><AdminImagesTab /></TabsContent>
          <TabsContent value="custom-games">
            <div className="space-y-10">
              <AdminCustomGameApplications />
              <AdminCustomGamesTab AdminCustomGameWaitlistComp={AdminCustomGameWaitlist} />
            </div>
          </TabsContent>
          <TabsContent value="events"><AdminEventsTab /></TabsContent>
          <TabsContent value="recordings"><AdminRecordingsTab /></TabsContent>
          <TabsContent value="role-holders"><AdminRoleHoldersTab /></TabsContent>
          <TabsContent value="call-tasks"><AdminTasksTab /></TabsContent>
          <TabsContent value="edited-cuts"><AdminEditsTab /></TabsContent>
          <TabsContent value="widgets"><AdminWidgetsTab /></TabsContent>
          <TabsContent value="seeds-claims"><AdminSeedsClaimsTab /></TabsContent>
          <TabsContent value="audit-log"><AdminAuditLogTab /></TabsContent>
          <TabsContent value="citizenship-tiers"><AdminCitizenshipTiers /></TabsContent>
        </Suspense>
      </Tabs>

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
    </AdminChrome>
  );
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return localStorage.getItem("admin_authenticated") === "true"; } catch { return false; }
  });

  return (
    <>
      <SEO title="Admin | ReGen Civics" description="Admin dashboard" noIndex />
      {isAuthenticated ? <AdminDashboard /> : <AdminPasswordGate onAuthenticated={() => setIsAuthenticated(true)} />}
    </>
  );
}
