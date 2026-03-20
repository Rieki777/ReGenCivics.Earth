import React from "react";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { EmailSettings } from "@/components/EmailSettings";
import KnowledgeMapAdminPanel from "@/components/KnowledgeMapAdminPanel";

interface Props {
  BufferSettingsPanelComp: React.ComponentType;
  ReviewerEmailManagerComp: React.ComponentType;
  ScheduledEmailsManagerComp: React.ComponentType;
  AdminAMAPanelComp: React.ComponentType;
  OrgClaimsAdminPanelComp: React.ComponentType;
  JoinRequestsAdminPanelComp: React.ComponentType;
  ProjectConnectionsAdminComp: React.ComponentType;
  GlossaryAdminPanelComp: React.ComponentType;
}

export function AdminSettingsTab({
  BufferSettingsPanelComp,
  ReviewerEmailManagerComp,
  ScheduledEmailsManagerComp,
  AdminAMAPanelComp,
  OrgClaimsAdminPanelComp,
  JoinRequestsAdminPanelComp,
  ProjectConnectionsAdminComp,
  GlossaryAdminPanelComp,
}: Props) {
  return (
    <div className="space-y-6">
      <BufferSettingsPanelComp />
      <NotificationPreferences />
      <ReviewerEmailManagerComp />
      <EmailSettings />
      <ScheduledEmailsManagerComp />
      <AdminAMAPanelComp />
      <OrgClaimsAdminPanelComp />
      <JoinRequestsAdminPanelComp />
      <ProjectConnectionsAdminComp />
      <GlossaryAdminPanelComp />
      <KnowledgeMapAdminPanel />
    </div>
  );
}
