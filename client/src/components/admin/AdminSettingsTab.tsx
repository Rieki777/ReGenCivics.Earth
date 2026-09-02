import { useState, type ComponentType } from "react";
import { ChevronRight } from "lucide-react";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { EmailSettings } from "@/components/EmailSettings";
import KnowledgeMapAdminPanel from "@/components/KnowledgeMapAdminPanel";
import {
  BufferSettingsPanel,
  ReviewerEmailManager,
  ScheduledEmailsManager,
  AdminAMAPanel,
  OrgClaimsAdminPanel,
  JoinRequestsAdminPanel,
  ProjectConnectionsAdmin,
  GlossaryAdminPanel,
} from "./AdminSettingsPanels";

const SECTIONS = [
  { id: "broadcast", label: "Broadcast settings", blurb: "Buffer token and Farcaster handle", Comp: BufferSettingsPanel },
  { id: "notifications", label: "Notification preferences", blurb: "What you get pinged about", Comp: NotificationPreferences },
  { id: "reviewers", label: "Reviewer emails", blurb: "Who gets application review mail", Comp: ReviewerEmailManager },
  { id: "email", label: "Email settings", blurb: "Sending domain and from-address", Comp: EmailSettings },
  { id: "scheduled", label: "Scheduled emails", blurb: "Queued letters waiting to send", Comp: ScheduledEmailsManager },
  { id: "ama", label: "AMA schedule", blurb: "Upcoming Ask Me Anything sessions", Comp: AdminAMAPanel },
  { id: "claims", label: "Org claims", blurb: "Alliance organization claim requests", Comp: OrgClaimsAdminPanel },
  { id: "joins", label: "Join requests", blurb: "People asking to join a project", Comp: JoinRequestsAdminPanel },
  { id: "links", label: "Project cross-links", blurb: "Needs-each-other and similar threads", Comp: ProjectConnectionsAdmin },
  { id: "glossary", label: "Glossary", blurb: "Terms that show on the site", Comp: GlossaryAdminPanel },
  { id: "knowledge", label: "Knowledge map", blurb: "Admin tools for the knowledge graph", Comp: KnowledgeMapAdminPanel },
] as const;

export function AdminSettingsTab() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Settings
        </h2>
        <p className="text-sm text-[#1a472a]/80">Tap a section. It opens on that row.</p>
      </div>
      {SECTIONS.map((section) => {
        const open = openId === section.id;
        const Comp = section.Comp;
        return (
          <div
            key={section.id}
            className={`rounded-2xl border bg-white overflow-hidden ${open ? "border-[#1a472a]/40" : "border-[#1a472a]/15"}`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : section.id)}
              className="w-full min-h-11 px-4 py-3 flex items-center gap-3 text-left"
              aria-expanded={open}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#1a472a]">{section.label}</span>
                <span className="block text-xs text-[#1a472a]/75">{section.blurb}</span>
              </span>
              <ChevronRight className={`w-4 h-4 text-[#1a472a]/50 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open && (
              <div className="border-t border-[#1a472a]/10 p-4">
                <Comp />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Kept so older imports that expected a panel stack still typecheck during the split. */
export function AdminSettingsStack(props: {
  BufferSettingsPanelComp?: ComponentType;
  ReviewerEmailManagerComp?: ComponentType;
  ScheduledEmailsManagerComp?: ComponentType;
  AdminAMAPanelComp?: ComponentType;
  OrgClaimsAdminPanelComp?: ComponentType;
  JoinRequestsAdminPanelComp?: ComponentType;
  ProjectConnectionsAdminComp?: ComponentType;
  GlossaryAdminPanelComp?: ComponentType;
}) {
  void props;
  return <AdminSettingsTab />;
}
