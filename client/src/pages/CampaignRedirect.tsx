/**
 * /campaign/:id is the project page now (build spec 2026-09-25, section 8.7).
 *
 * A public campaign never reaches this component: the server answers its
 * /campaign/:id with a 301 (server/lib/campaign-redirect.ts). This handles
 * the rest: an unpublished campaign its stewards can see (campaigns.getById
 * admits them), and in-app navigation to an old link. It moves in place to
 * /project/:key?campaign=:id, keeping every other query parameter (?ref=)
 * and the #anchor.
 *
 * A component on purpose, not a <Redirect to>: the target depends on data,
 * so it is not a static entry in shared/redirects.ts
 * (server/redirect-parity.test.ts).
 */
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { TaoSpinner } from "@/components/TaoSpinner";
import { campaignRedirectTarget } from "@shared/projectKey";
import { PAGE } from "@shared/crowdpoolCopy";

export default function CampaignRedirect() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const campaignId = Number(id);
  const valid = Number.isInteger(campaignId) && campaignId > 0;

  const { data, isLoading } = trpc.campaigns.getById.useQuery({ id: campaignId }, { enabled: valid, retry: false });

  useEffect(() => {
    if (!data) return;
    navigate(campaignRedirectTarget(data, window.location.search, window.location.hash), { replace: true });
  }, [data]);

  if (valid && (isLoading || data)) return <TaoSpinner fullPage size={72} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur rounded-3xl light-form-island p-6 shadow-xl text-center">
        <h1 className="text-xl font-bold text-[#1a472a] mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {PAGE.campaignNotFound}
        </h1>
        <Button asChild className="w-full min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
          <Link href="/campaigns">{PAGE.browseLiveCampaigns}</Link>
        </Button>
      </div>
    </div>
  );
}
