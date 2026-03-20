// Simple pass-through tab wrappers for single-component tabs
import { AdminBroadcastPanel } from "@/components/AdminBroadcastPanel";
import { LOIManager } from "@/components/LOIManager";
import { AdminImageStudio } from "@/components/AdminImageStudio";
import { AdminBannerEditor } from "@/components/AdminBannerEditor";
import { CrowdPoolingProjectsManager } from "@/components/CrowdPoolingProjectsManager";
import { AdminCampaignApproval } from "@/components/AdminCampaignApproval";

export function AdminCrowdpoolingTab() {
  return (
    <div className="space-y-6">
      <AdminCampaignApproval />
      <CrowdPoolingProjectsManager />
    </div>
  );
}

export function AdminBroadcastTab() {
  return <AdminBroadcastPanel />;
}

export function AdminLOITab() {
  return <LOIManager />;
}

export function AdminBannersTab() {
  return (
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
        { key: 'fund-launch-banner', label: 'Fund Launch Announcement' },
      ].map(({ key, label }) => (
        <AdminBannerEditor key={key} bannerKey={key} title={label} />
      ))}
    </div>
  );
}

export function AdminImagesTab() {
  return <AdminImageStudio />;
}

interface AdminCustomGamesTabProps {
  AdminCustomGameWaitlistComp: React.ComponentType;
}

export function AdminCustomGamesTab({ AdminCustomGameWaitlistComp }: AdminCustomGamesTabProps) {
  return <AdminCustomGameWaitlistComp />;
}
