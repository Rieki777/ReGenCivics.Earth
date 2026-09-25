/**
 * Campaign Analytics: visits, devices, traffic sources and conversion for a
 * campaign's stewards. The numbers live in CampaignAnalyticsPanel; the
 * server (campaigns.getAnalytics) decides who may see them.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { CampaignAnalyticsPanel } from "@/components/CampaignAnalyticsPanel";
import { decodeBasicEntities } from "@shared/htmlText";
import { projectPathForCampaignFocus } from "@shared/projectKey";

export default function CampaignAnalytics() {
  const { id } = useParams<{ id: string }>();
  const campaignId = parseInt(id || "0");
  const { user, loading: authLoading } = useAuth();

  const { data: campaign, isLoading: campaignLoading } = trpc.campaigns.getById.useQuery(
    { id: campaignId },
    { enabled: campaignId > 0 }
  );

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center p-4">
        <BackButton />
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[#1a472a]">Sign in first</CardTitle>
            <CardDescription>
              Sign in to see this campaign's numbers. Only its stewards can see them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/campaigns">
              <Button className="w-full bg-[#4a7c59] hover:bg-[#1a472a]">
                Back to campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || campaignLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-[#1a472a]">We couldn't find that campaign.</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/campaigns">
              <Button className="w-full bg-[#4a7c59] hover:bg-[#1a472a]">
                Browse campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = decodeBasicEntities(campaign.title);

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <SEO
        title={`Analytics: ${title}`}
        description={`Visits and conversions for ${title}`}
        noIndex
      />

      {/* Header */}
      <div className="bg-[#1a472a] text-white py-6">
        <div className="container">
          <Link href={`${projectPathForCampaignFocus(campaign)}#steward-tools`}>
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to the project page
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Campaign analytics
          </h1>
          <p className="text-white/80 mt-1 break-words">{title}</p>
        </div>
      </div>

      <div className="container py-8">
        <CampaignAnalyticsPanel campaignId={campaignId} />
      </div>
    </div>
  );
}
