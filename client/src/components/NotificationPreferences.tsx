import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Bell,
  Loader2,
  Mail,
  FileText,
  Users,
  DollarSign,
  Handshake,
  TrendingUp,
  UserCheck,
  Palette,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Save,
  Info,
} from "lucide-react";

interface NotificationType {
  key: string;
  emailKey: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const notificationTypes: NotificationType[] = [
  {
    key: "applicationSubmissions",
    emailKey: "applicationEmails",
    label: "Project Applications",
    description: "New land project applications for ReGen Civics seasons",
    icon: FileText,
  },
  {
    key: "investorInquiries",
    emailKey: "investorEmails",
    label: "Investor Inquiries",
    description: "Investor form submissions and capital partner interest",
    icon: TrendingUp,
  },
  {
    key: "allianceRequests",
    emailKey: "allianceEmails",
    label: "Alliance Requests",
    description: "Alliance partnership applications from organizations",
    icon: Handshake,
  },
  {
    key: "workWithRegens",
    emailKey: "workWithRegensEmails",
    label: "Work with ReGens",
    description: "Inquiries from people wanting to create/collaborate with ReGens",
    icon: Palette,
  },
  {
    key: "roleRequests",
    emailKey: "roleRequestEmails",
    label: "Role Requests",
    description: "Applications for roles within ReGen Civics",
    icon: UserCheck,
  },
  {
    key: "loiSubmissions",
    emailKey: "loiEmails",
    label: "Letters of Intent",
    description: "Capital partner LOI submissions with pledge amounts",
    icon: DollarSign,
  },
  {
    key: "campaignContributions",
    emailKey: "campaignEmails",
    label: "Campaign Contributions",
    description: "Contributions to crowd pooling campaigns",
    icon: Users,
  },
  {
    key: "newsletterSignups",
    emailKey: "newsletterEmails",
    label: "Newsletter Signups",
    description: "New newsletter subscriber notifications (can be high volume)",
    icon: Newspaper,
  },
];

export function NotificationPreferences() {
  const { data: preferences, isLoading, refetch } = trpc.admin.getNotificationPreferences.useQuery();
  const updatePreferences = trpc.admin.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update preferences");
    },
  });

  const [localPrefs, setLocalPrefs] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [dirtyEmails, setDirtyEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
      // Initialize email drafts from preferences
      const drafts: Record<string, string> = {};
      notificationTypes.forEach((type) => {
        const emailVal = (preferences as any)[type.emailKey];
        drafts[type.emailKey] = emailVal || "";
      });
      setEmailDrafts(drafts);
    }
  }, [preferences]);

  const handleToggle = (key: string, checked: boolean) => {
    const newVal = checked ? 1 : 0;
    setLocalPrefs({ ...localPrefs, [key]: newVal });
    updatePreferences.mutate({ [key]: newVal });
  };

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleEmailChange = (emailKey: string, value: string) => {
    setEmailDrafts((prev) => ({ ...prev, [emailKey]: value }));
    setDirtyEmails((prev) => new Set(prev).add(emailKey));
  };

  const saveEmailRouting = (emailKey: string) => {
    const value = emailDrafts[emailKey]?.trim() || null;
    updatePreferences.mutate({ [emailKey]: value });
    setDirtyEmails((prev) => {
      const next = new Set(prev);
      next.delete(emailKey);
      return next;
    });
  };

  if (isLoading || !localPrefs) {
    return (
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
        </CardContent>
      </Card>
    );
  }

  const isEnabled = (key: string): boolean => {
    const val = localPrefs[key];
    return val === 1 || val === true;
  };

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#7dd87d]" />
          </div>
          <div>
            <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control which events trigger email notifications and where they are sent
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            const enabled = isEnabled(type.key);
            const isExpanded = expandedItems.has(type.key);
            const emailValue = emailDrafts[type.emailKey] || "";
            const isDirty = dirtyEmails.has(type.emailKey);

            return (
              <div
                key={type.key}
                className={`rounded-lg border transition-colors ${
                  enabled
                    ? "border-[#7dd87d]/30 bg-white"
                    : "border-[#1a472a]/10 bg-gray-50"
                }`}
              >
                {/* Main toggle row */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => toggleExpand(type.key)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        enabled ? "bg-[#7dd87d]/15" : "bg-gray-200"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          enabled ? "text-[#7dd87d]" : "text-gray-300"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label
                          className={`text-sm font-semibold cursor-pointer ${
                            enabled ? "text-[#1a472a]" : "text-gray-300"
                          }`}
                        >
                          {type.label}
                        </Label>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[#1a472a]/40" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[#1a472a]/40" />
                        )}
                      </div>
                      <p className="text-xs text-[#1a472a]/50 mt-0.5 line-clamp-1">
                        {type.description}
                      </p>
                    </div>
                  </button>
                  <Switch
                    id={type.key}
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggle(type.key, checked)}
                    disabled={updatePreferences.isPending}
                  />
                </div>

                {/* Expanded email routing section */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-12 border-t border-[#1a472a]/10 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-3.5 h-3.5 text-[#1a472a]/50" />
                        <span className="text-xs font-medium text-[#1a472a]/70">
                          Email Routing
                        </span>
                      </div>
                      <p className="text-xs text-[#1a472a]/50 mb-2">
                        Comma-separated email addresses. Leave empty to use default
                        owner notifications.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="e.g. admin@example.com, team@example.com"
                          value={emailValue}
                          onChange={(e) =>
                            handleEmailChange(type.emailKey, e.target.value)
                          }
                          className="text-sm h-9 border-[#1a472a]/20 focus:border-[#7dd87d] focus:ring-[#7dd87d]/30"
                          disabled={!enabled}
                        />
                        {isDirty && (
                          <Button
                            size="sm"
                            onClick={() => saveEmailRouting(type.emailKey)}
                            disabled={updatePreferences.isPending}
                            className="h-9 px-3 bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] text-xs"
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Save
                          </Button>
                        )}
                      </div>
                      {emailValue && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {emailValue.split(",").map((email, i) => {
                            const trimmed = email.trim();
                            if (!trimmed) return null;
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7dd87d]/10 text-xs text-[#1a472a]/70"
                              >
                                <Mail className="w-3 h-3" />
                                {trimmed}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info note */}
        <div className="mt-5 p-3 bg-[#7dd87d]/10 rounded-lg border border-[#7dd87d]/20">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#4a7c59] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#1a472a]/70 leading-relaxed">
              <strong>How it works:</strong> Toggle switches control whether
              notifications are sent for each event type. Click any row to expand
              email routing options. Custom email addresses override the default
              owner notification. Submissions are always saved in the database
              regardless of notification settings.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
