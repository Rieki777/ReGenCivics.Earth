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

export function AdminWidgetsTab() {
  const BASE = "https://regencivics.earth";
  const widgets = [
    { name: "Campaign Progress", code: `<iframe src="${BASE}/embed/campaign/1" width="320" height="240" frameborder="0"></iframe>`, desc: "Shows live funding progress for a specific campaign. Replace /1 with the campaign ID." },
    { name: "Quest Badge", code: `<iframe src="${BASE}/embed/badge/quest/0?name=Fire&player=PlayerName" width="320" height="200" frameborder="0"></iframe>`, desc: "Shows a quest completion badge. Set name and player query params." },
    { name: "Alliance Badge", code: `<iframe src="${BASE}/embed/badge/alliance?org=OrgName" width="320" height="220" frameborder="0"></iframe>`, desc: "Alliance partner badge for org websites." },
    { name: "Season Countdown", code: `<iframe src="${BASE}/embed/season" width="320" height="200" frameborder="0"></iframe>`, desc: "Countdown to Season 2. Updates automatically." },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#1a472a] mb-1">Embeddable Widgets</h3>
        <p className="text-sm text-[#1a472a]/80">Share these embed codes with land projects, alliance partners, and community members. Each widget links back to regencivics.earth.</p>
      </div>
      {widgets.map(w => (
        <div key={w.name} className="bg-[#f8f5f0] rounded-xl p-4 border border-[#e8e4de]">
          <h4 className="font-bold text-[#1a472a] mb-1">{w.name}</h4>
          <p className="text-xs text-[#1a472a]/80 mb-2">{w.desc}</p>
          <div className="flex gap-2 items-start">
            <code className="flex-1 text-xs bg-white border border-[#e8e4de] rounded-lg p-3 font-mono text-[#1a472a]/80 break-all select-all">{w.code}</code>
            <button
              onClick={() => navigator.clipboard.writeText(w.code)}
              className="px-3 py-2 bg-[#7dd87d] text-[#1a472a] text-xs font-bold rounded-lg hover:bg-[#9de89d] flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <div className="mt-3">
            <p className="text-[10px] text-[#1a472a]/80 mb-1">Preview:</p>
            <iframe src={w.code.match(/src="([^"]+)"/)?.[1] || ""} width="320" height="200" className="rounded-lg border border-[#e8e4de]" />
          </div>
        </div>
      ))}
    </div>
  );
}
