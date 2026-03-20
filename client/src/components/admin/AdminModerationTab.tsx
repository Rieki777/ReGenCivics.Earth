import React, { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  HelpCircle,
  Clock,
  ChevronRight,
  MessageSquare,
  Handshake,
  Palette,
  Home as HomeIcon,
  UserCheck,
  Globe,
  TrendingUp,
} from "lucide-react";
import { RoleSubmissionsView } from "@/components/RoleSubmissionsView";

const ActivityTimeline = lazy(() =>
  import("@/components/ActivityTimeline").then((m) => ({ default: m.ActivityTimeline }))
);

const pathTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  alliance: { label: "Alliance Partners", color: "bg-purple-500", icon: Handshake },
  create: { label: "Create with ReGens", color: "bg-blue-500", icon: Palette },
  live: { label: "Live in a Land Project", color: "bg-green-500", icon: HomeIcon },
  role: { label: "Role in ReGen Civics", color: "bg-amber-500", icon: UserCheck },
  finance: { label: "Finance Regeneration", color: "bg-emerald-500", icon: TrendingUp },
  learn: { label: "Learn and Explore", color: "bg-cyan-500", icon: Globe },
  other: { label: "Other Inquiries", color: "bg-gray-500", icon: HelpCircle },
};

function getAgeInfo(createdAt: string | Date) {
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

interface Props {
  activeSubTab: "alliance" | "create" | "live" | "role" | "other";
  inquiries: any[] | undefined;
  updateGeneralMutation: any;
  ContactNotesPanel: React.ComponentType<{ contactType: string; contactId: number }>;
  ContactTagsPanel: React.ComponentType<{ contactType: string; contactId: number }>;
  ReminderPanel: React.ComponentType<{ contactType: string; contactId: number }>;
  AssigneeSelect: React.ComponentType<{ contactType: string; contactId: number }>;
  EmailHistoryPanelComp: React.ComponentType<{ email: string }>;
}

export function AdminModerationTab({
  activeSubTab,
  inquiries,
  updateGeneralMutation,
  ContactNotesPanel,
  ContactTagsPanel,
  ReminderPanel,
  AssigneeSelect,
  EmailHistoryPanelComp,
}: Props) {
  const tabTitles: Record<string, { title: string; desc: string; icon: React.ElementType }> = {
    alliance: {
      title: "Alliance Partner Inquiries",
      desc: "Organizations interested in joining the ReGen Civics Alliance",
      icon: Handshake,
    },
    create: {
      title: "Create with ReGens Inquiries",
      desc: "People interested in collaborating on regenerative projects",
      icon: Palette,
    },
    live: {
      title: "Live in a Land Project Inquiries",
      desc: "People interested in living in regenerative communities",
      icon: HomeIcon,
    },
    role: {
      title: "Role Applications",
      desc: "Enhanced view for exploring and managing role submissions",
      icon: UserCheck,
    },
    other: {
      title: "Other Inquiries",
      desc: "Finance, Learn, and other general inquiries",
      icon: HelpCircle,
    },
  };

  const tab = tabTitles[activeSubTab] || tabTitles.other;
  const TabIcon = tab.icon;

  if (activeSubTab === "role") {
    return (
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle
            className="text-[#1a472a] flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <TabIcon className="w-5 h-5" />
            {tab.title}
          </CardTitle>
          <CardDescription>{tab.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <RoleSubmissionsView />
        </CardContent>
      </Card>
    );
  }

  if (activeSubTab === "alliance" || activeSubTab === "create" || activeSubTab === "live") {
    const pathInquiries = (inquiries || []).filter((i: any) => i.pathType === activeSubTab);
    return (
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle
            className="text-[#1a472a] flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <TabIcon className="w-5 h-5" />
            {tab.title}
          </CardTitle>
          <CardDescription>{tab.desc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#1a472a]/10">
            {pathInquiries.map((inquiry: any) => {
              const ageInq = getAgeInfo(inquiry.createdAt);
              return (
                <div key={inquiry.id} className="p-4 hover:bg-[#f0ebe3]/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#1a472a]">{inquiry.fullName}</p>
                      <p className="text-sm text-[#1a472a]/80">{inquiry.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                        {inquiry.status?.replace(/_/g, " ")}
                      </Badge>
                      <span className={`text-xs ${ageInq.color}`}>{ageInq.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {pathInquiries.length === 0 && (
              <div className="p-8 text-center text-[#1a472a]/70">
                <TabIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No {activeSubTab} inquiries yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Other tab
  const filteredOther = inquiries?.filter((i: any) =>
    ["other", "learn", "finance"].includes(i.pathType)
  );

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle
          className="text-[#1a472a] flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <HelpCircle className="w-5 h-5" />
          Other Inquiries
        </CardTitle>
        <CardDescription>Finance, Learn, and other general inquiries</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#1a472a]/10">
          {filteredOther?.map((inquiry: any) => {
            const config = pathTypeConfig[inquiry.pathType] || pathTypeConfig.other;
            const Icon = config.icon;
            const ageOther = getAgeInfo(inquiry.createdAt);
            return (
              <Dialog key={inquiry.id}>
                <DialogTrigger asChild>
                  <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}
                        >
                          <Icon className="w-5 h-5 text-[#1a472a]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a472a]">{inquiry.fullName}</p>
                          <p className="text-sm text-[#1a472a]/80">{inquiry.email}</p>
                          <Badge variant="outline" className="mt-1 text-xs capitalize">
                            {inquiry.pathType?.replace(/_/g, " ") || "General"}
                          </Badge>
                          {inquiry.message && (
                            <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                              {inquiry.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={
                            inquiry.status === "new" || inquiry.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : inquiry.status === "contacted"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }
                        >
                          {inquiry.status?.replace(/_/g, " ")}
                        </Badge>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ageOther.bg} ${ageOther.color}`}
                        >
                          {ageOther.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                          {ageOther.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#1a472a]/55" />
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}
                      >
                        <Icon className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <div>
                        <span className="text-[#1a472a]">{inquiry.fullName}</span>
                        <p className="text-sm font-normal text-[#1a472a]/80 capitalize">
                          {inquiry.pathType?.replace(/_/g, " ") || "General"} Inquiry
                        </p>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide">
                          Email
                        </p>
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="text-[#4a7c59] hover:underline"
                        >
                          {inquiry.email}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide">
                          Submitted
                        </p>
                        <p className="text-[#1a472a]">
                          {new Date(inquiry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {inquiry.message && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide mb-2">
                          Message
                        </p>
                        <div className="bg-[#f0ebe3] rounded-lg p-4">
                          <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message}</p>
                        </div>
                      </div>
                    )}
                    <Suspense fallback={null}>
                      <ActivityTimeline
                        email={inquiry.email}
                        contactType="general_inquiry"
                        contactId={inquiry.id}
                      />
                    </Suspense>
                    <EmailHistoryPanelComp email={inquiry.email} />
                    <ContactNotesPanel contactType="general_inquiry" contactId={inquiry.id} />
                    <ContactTagsPanel contactType="general_inquiry" contactId={inquiry.id} />
                    <ReminderPanel contactType="general_inquiry" contactId={inquiry.id} />
                  </div>
                  <DialogFooter className="flex-col gap-3">
                    <AssigneeSelect contactType="general_inquiry" contactId={inquiry.id} />
                    <div className="w-full flex items-center gap-2">
                      <span className="text-xs text-[#1a472a]/80 shrink-0">Status:</span>
                      <Select
                        value={inquiry.status}
                        onValueChange={(newStatus: string) => {
                          updateGeneralMutation.mutate({ id: inquiry.id, status: newStatus });
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
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            );
          })}
          {(!filteredOther || filteredOther.length === 0) && (
            <div className="p-8 text-center text-[#1a472a]/70">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No inquiries yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
