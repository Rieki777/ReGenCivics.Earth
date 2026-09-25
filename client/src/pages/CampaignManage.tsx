/**
 * /campaign/:id/manage is now the project page's steward tools.
 *
 * The campaign tools moved to /project/:key (ProjectPage, with the pieces in
 * components/project/). This page only redirects, keeping the #anchor so the
 * steward digest's #review, #claims, #needs and #followers links still land.
 * With no anchor it opens #steward-tools.
 */
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { TaoSpinner } from "@/components/TaoSpinner";
import { projectPathForCampaignFocus } from "@shared/projectKey";

export default function CampaignManage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const campaignId = Number.parseInt(id ?? "", 10);
  const valid = Number.isInteger(campaignId) && campaignId > 0;

  const { data: campaign, isLoading } = trpc.campaigns.getById.useQuery(
    { id: campaignId },
    { enabled: valid, retry: false },
  );

  useEffect(() => {
    if (!campaign) return;
    navigate(projectPathForCampaignFocus(campaign) + (window.location.hash || "#steward-tools"), { replace: true });
  }, [campaign]);

  if (valid && (isLoading || campaign)) return <TaoSpinner fullPage size={72} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur rounded-3xl p-6 shadow-xl text-center">
        <h1 className="text-xl font-bold text-[#1a472a] mb-4" style={{ fontFamily: "var(--font-display)" }}>
          We couldn't find that campaign.
        </h1>
        <Link href="/campaigns">
          <Button className="w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white">Browse live campaigns</Button>
        </Link>
      </div>
    </div>
  );
}
