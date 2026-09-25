import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CampaignProgressTracker } from "@/components/CampaignProgressTracker";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  TrendingUp,
  Users,
  Leaf,
  Wrench,
  UserCheck,
  Package,
  ExternalLink,
  Heart,
  CheckCircle2,
  DollarSign,
  User,
  Settings,
  Bell,
  BellRing,
  Gift,
  Activity,
  Mail,
  Loader2,
  Layers,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { TaoSpinner } from "@/components/TaoSpinner";
import { ContributionModal, type ContributionNeed } from "@/components/ContributionModal";
import { EligibilityQuiz } from "@/components/crowdpool/EligibilityQuiz";
import { PledgeSimulator } from "@/components/crowdpool/PledgeSimulator";
import { SEO } from "@/components/SEO";
import { ShareButtons } from "@/components/ShareButtons";
import { BackButton } from "@/components/BackButton";
import VideoEmbed from "@/components/VideoEmbed";
import { BlurImage } from "@/components/BlurImage";
import { CampaignMilestones } from "@/components/CampaignMilestones";
import { NeedsRegistry } from "@/components/campaign-needs/NeedsRegistry";
import { CampaignPhotoGallery } from "@/components/campaign-needs/CampaignPhotoGallery";
import { CampaignUpdatesList } from "@/components/project/CampaignUpdatesList";
import { CancelledCampaignNotice } from "@/components/project/CancelledCampaignNotice";
import { decodeBasicEntities } from "@shared/htmlText";
import { projectPathForCampaignFocus } from "@shared/projectKey";

// Helper to detect device type
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
}

// Helper to get or create visitor ID
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let visitorId = localStorage.getItem('regen_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('regen_visitor_id', visitorId);
  }
  return visitorId;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<ContributionNeed | null>(null);
  // Moving to another campaign (back button, a related campaign link) closes
  // the sheet; the ContributionModal below is keyed by id, so it starts fresh
  // and a practice receipt never shows over a different campaign.
  useEffect(() => {
    setShowContributionModal(false);
    setSelectedNeed(null);
  }, [id]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [viewTracked, setViewTracked] = useState(false);
  
  // Track view mutation
  const trackViewMutation = trpc.campaigns.trackView.useMutation();
  
  // Fetch campaign data
  const { data: campaign, isLoading, error, refetch } = trpc.campaigns.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id }
  );
  
  // Track page view when campaign loads
  useEffect(() => {
    if (campaign && !viewTracked && id) {
      const urlParams = new URLSearchParams(window.location.search);
      trackViewMutation.mutate({
        campaignId: parseInt(id),
        visitorId: getVisitorId(),
        referrer: document.referrer || undefined,
        utmSource: urlParams.get('utm_source') || undefined,
        utmMedium: urlParams.get('utm_medium') || undefined,
        utmCampaign: urlParams.get('utm_campaign') || undefined,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
      });
      setViewTracked(true);
    }
  }, [campaign, viewTracked, id]);
  
  // Fetch accepted contributions
  const { data: contributions } = trpc.campaigns.getContributions.useQuery(
    { campaignId: parseInt(id!), status: 'accepted' },
    { enabled: !!id }
  );

  // Fulfilled contributions: the "delivered so far" line under the thermometer
  const { data: fulfilledContributions } = trpc.campaigns.getContributions.useQuery(
    { campaignId: parseInt(id!), status: 'fulfilled' },
    { enabled: !!id }
  );

  // Recommended-funder links (Ma Earth / GoSteward / grants). Read-only display
  // numbers, nightly-cached. We collect zero fiat; contributors finish on the
  // funder's own site.
  const { data: partnerLinksData } = trpc.campaigns.getPartnerLinks.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id }
  );

  // Pool Ledger activity feed
  const { data: activity } = trpc.campaigns.getActivity.useQuery(
    { campaignId: parseInt(id!), limit: 50 },
    { enabled: !!id }
  );

  // Updates journal
  const { data: updates } = trpc.campaigns.listUpdates.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id }
  );

  // Follow / unfollow with optimistic toggle
  const followMutation = trpc.campaigns.follow.useMutation({
    onError: () => {
      setIsFollowing(false);
      toast.error('Could not follow this campaign. Try again.');
    },
  });
  const unfollowMutation = trpc.campaigns.unfollow.useMutation({
    onError: () => {
      setIsFollowing(true);
      toast.error('Could not unfollow this campaign. Try again.');
    },
  });
  const handleFollowToggle = () => {
    const next = !isFollowing;
    setIsFollowing(next);
    if (next) {
      followMutation.mutate({ campaignId: parseInt(id!) });
    } else {
      unfollowMutation.mutate({ campaignId: parseInt(id!) });
    }
  };

  // Email subscribe for visitors without an account
  const subscribeMutation = trpc.campaigns.subscribeByEmail.useMutation({
    onSuccess: () => {
      toast.success("You're on the list. Updates from this campaign will land in your inbox.");
      setSubscribeEmail('');
    },
    onError: (error) => {
      toast.error(error.message || 'Could not subscribe. Try again.');
    },
  });
  const handleSubscribe = () => {
    const email = subscribeEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    subscribeMutation.mutate({ campaignId: parseInt(id!), email });
  };

  // Whether the viewer stewards this campaign (creator, the application's
  // stewards, approved org claim holders, admins). Drives the Manage button.
  const { data: canSteward } = trpc.campaigns.canSteward.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id && isAuthenticated }
  );

  // Fetch related campaigns (active campaigns to show at the bottom)
  const { data: allActiveCampaigns } = trpc.campaigns.list.useQuery(
    { status: 'active' },
    { staleTime: 5 * 60 * 1000 }
  );
  const relatedCampaigns = allActiveCampaigns
    ?.filter((c) => c.id !== parseInt(id!))
    .slice(0, 3);

  // A cancelled campaign points its people at live campaigns that could use
  // their energy (the same suggestions the project page shows).
  const isCancelled = campaign?.status === 'cancelled';
  // Example campaigns take practice runs: every way in works, and the server
  // writes nothing (campaigns.submitContribution returns practice:true).
  const isExample = !!campaign?.isDemo;
  const { data: cancelSuggestions } = trpc.campaigns.suggestAlternatives.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id && isCancelled }
  );

  // Start the Follow button from what the server knows (getById carries
  // isFollowing for the signed-in viewer). Synced once per campaign, so a
  // later refetch never undoes an optimistic toggle.
  const followSyncedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!campaign || followSyncedFor.current === campaign.id) return;
    followSyncedFor.current = campaign.id;
    setIsFollowing(Boolean((campaign as { isFollowing?: boolean }).isFollowing));
  }, [campaign]);
  
  if (isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }
  
  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
        <Card className="max-w-md w-full bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[#1a472a]">Campaign Not Found</CardTitle>
            <CardDescription>The campaign you're looking for doesn't exist or has been removed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/campaigns'}
              className="w-full bg-[#4a7c59] hover:bg-[#1a472a]"
            >
              Browse All Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // The land project's own page (shared/projectKey.ts).
  const projectPath = projectPathForCampaignFocus(campaign);

  // A cancel with a message posts it as the campaign's last update, titled
  // "This campaign has been cancelled" (server/lib/campaign-cancel.ts).
  const latestUpdate = updates && updates.length > 0 ? updates[0] : null;
  const cancelledMessage = isCancelled && latestUpdate
    && decodeBasicEntities(latestUpdate.title) === 'This campaign has been cancelled'
    ? latestUpdate.body
    : null;

  // Calculate progress
  const totalValue = campaign.items.reduce((sum, item) => sum + item.estimatedValue, 0);
  const raisedValue = campaign.pledgedTotal || 0;
  const progressPercentage = totalValue > 0 ? Math.min((raisedValue / totalValue) * 100, 100) : 0;
  
  // Financial progress
  const financialTarget = campaign.financialTarget || 0;
  const financialRaised = campaign.pledgedFinancial || 0;
  const financialProgress = financialTarget > 0 ? Math.min((financialRaised / financialTarget) * 100, 100) : 0;
  
  // Value delivered so far: fulfilled contributions, summed
  const deliveredValue = (fulfilledContributions || []).reduce((sum, c) => sum + (c.estimatedValue || 0), 0);

  // Recommended funders, looked up by kind. A missing row just renders the
  // default link with no numbers.
  const partnerLinks = partnerLinksData || [];
  const maEarthLink = partnerLinks.find((p) => p.partner === 'maearth');
  const goStewardLink = partnerLinks.find((p) => p.partner === 'gosteward');

  // Setting up a Ma Earth or Steward account is the campaign creator's job, and
  // it is not something we can do for them. A campaign whose steward has not
  // done it must not show a button that sends a would-be funder to a page with
  // no campaign on it. So these render only where a real link exists: no
  // partner rows, no panel, and no funder quiz recommending funders this
  // project cannot receive from. Rye, 2026-09-04.
  const hasPartnerFunders = Boolean(maEarthLink || goStewardLink);

  // Capital stack: the whole project's funding across layers. In-kind and
  // crypto come from delivered contributions on-platform; gift, debt, and
  // grants come from the funders' cached numbers. Zero-value layers drop out.
  const fulfilledList = fulfilledContributions || [];
  const inKindDelivered = fulfilledList
    .filter((c) => c.contributionType !== 'financial')
    .reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  const cryptoDelivered = fulfilledList
    .filter((c) => c.contributionType === 'financial')
    .reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  const giftRaised = maEarthLink?.cachedRaised || 0;
  const debtRaised = goStewardLink?.cachedRaised || 0;
  const grantsRaised = partnerLinks
    .filter((p) => p.partner === 'grant')
    .reduce((sum, p) => sum + (p.cachedRaised || 0), 0);
  const capitalStack = [
    { key: 'inkind', label: 'In-kind delivered', value: inKindDelivered, color: '#4a7c59' },
    { key: 'crypto', label: 'Crypto pledged', value: cryptoDelivered, color: '#10b981' },
    { key: 'gift', label: 'Gift (Ma Earth)', value: giftRaised, color: '#d4a574' },
    { key: 'debt', label: 'Debt (GoSteward)', value: debtRaised, color: '#3b82f6' },
    { key: 'grants', label: 'Grants', value: grantsRaised, color: '#8b5cf6' },
  ].filter((seg) => seg.value > 0);
  const capitalStackTotal = capitalStack.reduce((sum, seg) => sum + seg.value, 0);

  // Count unique contributors
  const contributorCount = contributions ? new Set(contributions.map(c => c.contributorName)).size : 0;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: campaign.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Status badge
  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'funded':
        return <Badge className="bg-blue-500 text-white">Complete</Badge>;
      case 'completed':
        return <Badge className="bg-purple-500 text-white">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Draft</Badge>;
    }
  };
  
  // Get contribution type icon
  const getContributionIcon = (type: string) => {
    switch (type) {
      case 'land': return <Leaf className="w-4 h-4 text-green-600" />;
      case 'equipment': return <Wrench className="w-4 h-4 text-orange-600" />;
      case 'role': return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'resource': return <Package className="w-4 h-4 text-purple-600" />;
      case 'financial': return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default: return <Heart className="w-4 h-4 text-pink-600" />;
    }
  };
  
  // Format currency for SEO description
  const formatCurrencyForSEO = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: campaign.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <>
      {/* SEO for social sharing */}
      <SEO
        title={`${campaign.title} - Support This Campaign`}
        description={`${campaign.description.slice(0, 150)}... Goal: ${formatCurrencyForSEO(totalValue)} | ${contributorCount} contributors | ${progressPercentage.toFixed(0)}% complete`}
        keywords={`crowdfunding, regenerative project, ${campaign.projectName}, land project, impact investment, community funding`}
        url={`/campaign/${id}`}
        type="website"
      />
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] pt-24 pb-12">
      <div className="container max-w-6xl px-4">
        {/* Video Embed (if campaign has a video) */}
        {campaign.videoUrl && (
          <div className="mb-6">
            <VideoEmbed
              url={campaign.videoUrl}
              title={campaign.title}
              className="shadow-xl"
            />
          </div>
        )}

        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                  {campaign.title}
                </h1>
                {getStatusBadge()}
              </div>
              {campaign.location && (
                <div className="flex items-center gap-2 text-[#1a472a]/80">
                  <MapPin className="w-4 h-4" />
                  <span>{campaign.location}</span>
                </div>
              )}
              <Link
                href={projectPath}
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[#4a7c59] hover:text-[#1a472a] hover:underline"
              >
                <Leaf className="w-4 h-4" />
                About this land project
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Manage button for this project's stewards: it opens the
                  steward tools on the project page. The server decides who
                  stewards and checks every tool again. */}
              {canSteward && (
                <Link href={`${projectPath}#steward-tools`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white flex-1 md:flex-none"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              )}
              {isAuthenticated && !isCancelled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFollowToggle}
                  className={`flex-1 md:flex-none ${
                    isFollowing
                      ? 'bg-[#4a7c59] text-white border-[#4a7c59] hover:bg-[#1a472a]'
                      : 'border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <BellRing className="w-4 h-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
              <ShareButtons
                url={`/campaign/${id}`}
                title={campaign.title}
                description={campaign.description.slice(0, 200)}
                hashtags={['ReGenCivics', 'Regenerative', 'CrowdPooling']}
                className="flex-1 md:flex-none"
                showEmbed={true}
              />
              {!isCancelled && (
                <Button
                  size="sm"
                  className="bg-[#4a7c59] hover:bg-[#1a472a] text-white flex-1 md:flex-none"
                  onClick={() => setShowContributionModal(true)}
                  disabled={campaign.status !== 'active'}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Contribute
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-[#1a472a]/80 leading-relaxed mb-6">
            {campaign.description}
          </p>

          {isExample && campaign.status === 'active' && (
            <p className="text-sm bg-[#f0f7f0] text-[#1a472a] rounded-xl p-3 mb-6">
              This is an example campaign. You can try every step, and nothing you send reaches a real project.
            </p>
          )}

          {/* Email subscribe for visitors without an account */}
          {!isAuthenticated && !isCancelled && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }}
              className="flex flex-col sm:flex-row gap-2 mb-6 bg-[#f0f7f0] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 flex-1">
                <Mail className="w-4 h-4 text-[#4a7c59] flex-shrink-0" />
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label="Your email for campaign updates"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder="Your email for campaign updates"
                  className="bg-white border-[#4a7c59]/40 text-[#1a472a] placeholder:text-[#1a472a]/75"
                />
              </div>
              <Button
                size="sm"
                type="submit"
                disabled={subscribeMutation.isPending}
                className="bg-[#4a7c59] hover:bg-[#1a472a] text-white sm:self-center"
              >
                {subscribeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Get updates'
                )}
              </Button>
            </form>
          )}

          {/* Campaign Progress Tracker */}
          <CampaignProgressTracker
            totalValue={totalValue}
            pledgedTotal={campaign.pledgedTotal || 0}
            financialTarget={financialTarget}
            pledgedFinancial={campaign.pledgedFinancial || 0}
            contributorsCount={contributorCount}
            durationDays={campaign.durationDays || 90}
            startedAt={campaign.startedAt || campaign.publishedAt || campaign.createdAt}
            status={campaign.status}
            currency={campaign.currency || 'USD'}
          />

          {/* Delivered so far: pledges count when they land (decision 4) */}
          {deliveredValue > 0 && (
            <p className="flex items-center gap-2 text-sm text-[#1a472a]/80 mt-3">
              <CheckCircle2 className="w-4 h-4 text-[#4a7c59]" />
              <span>
                <strong className="text-[#4a7c59]">{formatCurrency(deliveredValue)}</strong> delivered so far
              </span>
            </p>
          )}
        </div>

        {/* The whole capital stack: in-kind + crypto pooled here, gift + debt +
            grants through the funders we recommend. Zero-value layers drop out. */}
        {capitalStack.length > 0 && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Layers className="w-5 h-5 text-[#4a7c59]" />
              The whole capital stack
            </h2>
            <p className="text-sm text-[#1a472a]/75 mb-4">
              What money can't buy, pooled here. What it can, through the funders we recommend.
            </p>
            <div className="w-full flex rounded-full overflow-hidden h-4 bg-[#1a472a]/10">
              {capitalStack.map((seg) => (
                <div
                  key={seg.key}
                  className="h-full"
                  style={{ width: `${(seg.value / capitalStackTotal) * 100}%`, backgroundColor: seg.color }}
                  title={`${seg.label}: ${formatCurrency(seg.value)}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mt-4">
              {capitalStack.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[#1a472a]/80 min-w-0">{seg.label}</span>
                  <span className="ml-auto font-medium text-[#1a472a] whitespace-nowrap">{formatCurrency(seg.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Photo Gallery */}
        {campaign.images && campaign.images.length > 0 && (
          <CampaignPhotoGallery images={campaign.images} />
        )}

        {/* Cover Image Hero (if no gallery but has cover) */}
        {campaign.coverImage && (!campaign.images || campaign.images.length === 0) && (
          <div className="rounded-3xl overflow-hidden mb-6 shadow-xl">
            <BlurImage
              src={campaign.coverImage.url}
              alt={campaign.coverImage.caption || campaign.title}
              className="w-full h-48 md:h-64"
              loading="lazy"
            />
          </div>
        )}

        {/* Campaign Milestone Timeline */}
        <CampaignMilestones
          campaign={campaign}
          contributions={(contributions || []).map((c) => ({
            amount: c.estimatedValue,
            createdAt: c.submittedAt,
          }))}
          currency={campaign.currency || 'USD'}
        />

        {/* Contributors Section */}
        {contributions && contributions.length > 0 && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#1a472a] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#4a7c59]" />
              Contributors ({contributorCount})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contributions.slice(0, 6).map((contribution) => (
                <div 
                  key={contribution.id}
                  className="flex items-start gap-3 p-3 bg-[#f0f7f0] rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-[#4a7c59] flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#1a472a] truncate">
                      {contribution.isAnonymous ? 'A contributor' : contribution.contributorName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#1a472a]/80">
                      {getContributionIcon(contribution.contributionType)}
                      <span className="capitalize truncate">{contribution.title}</span>
                    </div>
                    <div className="text-xs text-[#4a7c59] font-medium mt-1">
                      {formatCurrency(contribution.estimatedValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {contributions.length > 6 && (
              <p className="text-center text-sm text-[#1a472a]/80 mt-4">
                +{contributions.length - 6} more contributors
              </p>
            )}
          </div>
        )}
        
        {/* Project Details Section */}
        {(campaign.vision || campaign.landSize || campaign.governanceModel || campaign.foodSystems) && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#1a472a] mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Leaf className="w-5 h-5 text-[#4a7c59]" />
              Project Details
            </h2>
            
            {/* Vision */}
            {campaign.vision && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#4a7c59] uppercase tracking-wide mb-2">Vision</h3>
                <p className="text-[#1a472a]/80 leading-relaxed">{campaign.vision}</p>
              </div>
            )}
            
            {/* Key Facts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {campaign.landSize && (
                <div className="bg-[#f0f7f0] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">Land Size</div>
                  <div className="text-[#1a472a] font-medium">{campaign.landSize}</div>
                </div>
              )}
              {campaign.landStatus && (
                <div className="bg-[#f0f7f0] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">Land Status</div>
                  <div className="text-[#1a472a] font-medium">{campaign.landStatus}</div>
                </div>
              )}
              {campaign.currentPhase && (
                <div className="bg-[#f0f7f0] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">Current Phase</div>
                  <div className="text-[#1a472a] font-medium">{campaign.currentPhase}</div>
                </div>
              )}
              {campaign.timeline && (
                <div className="bg-[#f0f7f0] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">Timeline</div>
                  <div className="text-[#1a472a] font-medium">{campaign.timeline}</div>
                </div>
              )}
              {campaign.legalStructure && (
                <div className="bg-[#f0f7f0] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">Legal Structure</div>
                  <div className="text-[#1a472a] font-medium">{campaign.legalStructure}</div>
                </div>
              )}
              {campaign.teamSize && campaign.teamSize > 0 && (
                <div className="bg-[#f0f7f0] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4a7c59] uppercase tracking-wide mb-1">Team Size</div>
                  <div className="text-[#1a472a] font-medium">{campaign.teamSize} members</div>
                </div>
              )}
            </div>
            
            {/* Systems & Infrastructure */}
            {(campaign.governanceModel || campaign.membershipModel || campaign.housingPlans || campaign.foodSystems || campaign.waterSystems || campaign.energySystems) && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#4a7c59] uppercase tracking-wide mb-3">Systems & Infrastructure</h3>
                <div className="space-y-3">
                  {campaign.governanceModel && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Governance</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.governanceModel}</p>
                    </div>
                  )}
                  {campaign.membershipModel && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Membership</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.membershipModel}</p>
                    </div>
                  )}
                  {campaign.housingPlans && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Housing</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.housingPlans}</p>
                    </div>
                  )}
                  {campaign.foodSystems && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Food Systems</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.foodSystems}</p>
                    </div>
                  )}
                  {campaign.waterSystems && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Water Systems</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.waterSystems}</p>
                    </div>
                  )}
                  {campaign.energySystems && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Energy Systems</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.energySystems}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Community & Impact */}
            {(campaign.educationPrograms || campaign.communityEngagement || campaign.impactMetrics || campaign.regenerativePractices) && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#4a7c59] uppercase tracking-wide mb-3">Community & Impact</h3>
                <div className="space-y-3">
                  {campaign.educationPrograms && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Education Programs</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.educationPrograms}</p>
                    </div>
                  )}
                  {campaign.communityEngagement && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Community Engagement</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.communityEngagement}</p>
                    </div>
                  )}
                  {campaign.impactMetrics && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Impact Metrics</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.impactMetrics}</p>
                    </div>
                  )}
                  {campaign.regenerativePractices && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/80 mb-1">Regenerative Practices</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.regenerativePractices}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Challenges & Team */}
            {(campaign.challenges || campaign.teamDescription) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campaign.challenges && (
                  <div>
                    <h3 className="text-sm font-bold text-[#4a7c59] uppercase tracking-wide mb-2">Known Challenges</h3>
                    <p className="text-[#1a472a]/80 text-sm leading-relaxed">{campaign.challenges}</p>
                  </div>
                )}
                {campaign.teamDescription && (
                  <div>
                    <h3 className="text-sm font-bold text-[#4a7c59] uppercase tracking-wide mb-2">Team</h3>
                    <p className="text-[#1a472a]/80 text-sm leading-relaxed">{campaign.teamDescription}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* External Links */}
            {(campaign.websiteUrl || campaign.videoUrl || campaign.daoLink) && (
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-[#1a472a]/10">
                {campaign.websiteUrl && (
                  <a href={campaign.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-[#4a7c59] text-[#4a7c59]">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Website
                    </Button>
                  </a>
                )}
                {campaign.videoUrl && (
                  <a href={campaign.videoUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-[#4a7c59] text-[#4a7c59]">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Video
                    </Button>
                  </a>
                )}
                {campaign.daoLink && (
                  <a href={campaign.daoLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-[#4a7c59] text-[#4a7c59]">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      DAO / Governance
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Cancelled: the stewards' closing message and where to go next */}
        {isCancelled && (
          <CancelledCampaignNotice
            message={cancelledMessage}
            suggestions={cancelSuggestions ?? []}
          />
        )}

        {/* Needs Registry: needs grouped by the capital they feed */}
        <NeedsRegistry
          items={campaign.items}
          campaignActive={campaign.status === 'active'}
          claimsHidden={isCancelled}
          formatCurrency={formatCurrency}
          onClaim={(need) => {
            setSelectedNeed(need);
            setShowContributionModal(true);
          }}
        />

        {/* Eligibility quiz: routes projects to the funder that fits. It only
            recommends Ma Earth and Steward, so it is gated on this campaign
            actually having one of them set up. */}
        {hasPartnerFunders && <EligibilityQuiz />}

        {/* Additional funders, shown only where this campaign has an account.
            These are not the core fundraise and must not read as though they
            are: what is pooled on this page is the project's whole ask, in cash
            and in kind. These cover money we don't hold. We collect zero fiat;
            you finish on the funder's own site. */}
        {hasPartnerFunders && (
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
          <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Heart className="w-5 h-5 text-[#4a7c59]" />
            Additional ways to fund this project
          </h2>
          <p className="text-sm text-[#1a472a]/75 mb-6">
            Alongside what this project is pooling here, some needs take money we don't hold. These are funders this project already works with. You give on their site and they get it to the project.
          </p>
          <div className={`grid grid-cols-1 gap-4 ${maEarthLink && goStewardLink ? 'md:grid-cols-2' : ''}`}>
            {/* Ma Earth: gift funding with matching */}
            {maEarthLink && (
            <div className="flex flex-col bg-[#f0f7f0] rounded-2xl p-5 border border-[#1a472a]/10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-[#4a7c59]" />
                <h3 className="font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                  Give and get matched
                </h3>
              </div>
              <p className="text-sm text-[#1a472a]/80 mb-3">
                Ma Earth pools small donations and matches them with grant money, so a little gift grows. Good for spreading wide and rewarding a lot of people who each give a bit.
              </p>
              {maEarthLink && maEarthLink.cachedRaised != null && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3 text-sm">
                  <span className="font-bold text-[#4a7c59] text-lg">{formatCurrency(maEarthLink.cachedRaised)}</span>
                  <span className="text-[#1a472a]/75">raised</span>
                  {maEarthLink.cachedPercent != null && (
                    <span className="text-[#1a472a]/75">· {maEarthLink.cachedPercent}% funded</span>
                  )}
                  {maEarthLink.cachedContributorCount != null && (
                    <span className="text-[#1a472a]/75">· {maEarthLink.cachedContributorCount} givers</span>
                  )}
                </div>
              )}
              <p className="text-xs text-[#1a472a]/75 mb-4">
                Donations run through Ma Earth. We recommend them and don't take a cut.
              </p>
              <div className="mt-auto">
                <a href={maEarthLink.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Give on Ma Earth
                  </Button>
                </a>
                <p className="text-xs text-[#1a472a]/75 mt-2 text-center">You'll finish this on their site.</p>
              </div>
            </div>
            )}
            {/* GoSteward: regenerative loans */}
            {goStewardLink && (
            <div className="flex flex-col bg-[#f0f7f0] rounded-2xl p-5 border border-[#1a472a]/10">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="w-5 h-5 text-[#4a7c59]" />
                <h3 className="font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                  Back a regenerative loan
                </h3>
              </div>
              <p className="text-sm text-[#1a472a]/80 mb-3">
                Steward arranges loans that regenerative projects pay back with a return to the people who lend. Good for projects with revenue that need larger capital.
              </p>
              {goStewardLink && goStewardLink.cachedRaised != null && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3 text-sm">
                  <span className="font-bold text-[#4a7c59] text-lg">{formatCurrency(goStewardLink.cachedRaised)}</span>
                  <span className="text-[#1a472a]/75">committed</span>
                  {goStewardLink.cachedPercent != null && (
                    <span className="text-[#1a472a]/75">· {goStewardLink.cachedPercent}% funded</span>
                  )}
                  {goStewardLink.cachedContributorCount != null && (
                    <span className="text-[#1a472a]/75">· {goStewardLink.cachedContributorCount} lenders</span>
                  )}
                </div>
              )}
              <p className="text-xs text-[#1a472a]/75 mb-4">
                Loans run through Steward, who also help projects design their whole capital stack.
              </p>
              <div className="mt-auto">
                <a href={goStewardLink.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="w-full bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Lend through Steward
                  </Button>
                </a>
                <p className="text-xs text-[#1a472a]/75 mt-2 text-center">You'll finish this on their site.</p>
              </div>
            </div>
            )}
          </div>
        </div>
        )}

        {/* Pledge simulator: a pure-client "what does my pledge unlock" widget,
            grounded in the same coach numbers as the wizard. */}
        <PledgeSimulator items={campaign.items} region={campaign.location} currency={campaign.currency || undefined} />

        {/* Pool Ledger: the public record of pledges, deliveries, and thanks */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
          <h2 className="text-xl font-bold text-[#1a472a] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Activity className="w-5 h-5 text-[#4a7c59]" />
            Pool Ledger
          </h2>
          {!activity || activity.length === 0 ? (
            <p className="text-sm text-[#1a472a]/75">
              Every pledge, delivery, and thank-you lands here. Nothing yet, this pool is just getting started.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {(showAllActivity ? activity : activity.slice(0, 6)).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-[#f0f7f0] rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                      {event.kind === 'delivered' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4a7c59]" />
                      ) : event.kind === 'thanked' ? (
                        <Gift className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Heart className="w-4 h-4 text-pink-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a472a]">
                        <span className="font-medium">{event.contributorName}</span>
                        {event.kind === 'delivered' && ' delivered '}
                        {event.kind === 'thanked' && ' was thanked for '}
                        {event.kind === 'pledged' && ' pledged '}
                        {event.title}
                      </p>
                      <p className="text-xs text-[#1a472a]/75 capitalize">
                        {event.contributionType} · {formatCurrency(event.estimatedValue || 0)} · {new Date(event.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {activity.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  className="mt-3 text-[#4a7c59] hover:text-[#1a472a]"
                >
                  {showAllActivity ? 'See less' : `See all (${activity.length})`}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Updates journal */}
        <CampaignUpdatesList updates={updates} />
      </div>
      
      {/* Related Campaigns */}
      {relatedCampaigns && relatedCampaigns.length > 0 && (
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mt-6 shadow-xl">
          <h2 className="text-xl font-bold text-[#1a472a] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <TrendingUp className="w-5 h-5 text-[#4a7c59]" />
            More Campaigns
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedCampaigns.map((c) => {
              const cTotal = c.financialTarget || 0;
              const cRaised = c.pledgedTotal || 0;
              const cPct = cTotal > 0 ? Math.min((cRaised / cTotal) * 100, 100) : 0;
              return (
                <div key={c.id} className="flex flex-col bg-[#f0f7f0] rounded-2xl p-4 border border-[#1a472a]/10">
                  <h3 className="font-bold text-[#1a472a] text-sm mb-1 line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {c.title}
                  </h3>
                  {c.location && (
                    <p className="text-xs text-[#1a472a]/80 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      {c.location}
                    </p>
                  )}
                  <p className="text-xs text-[#1a472a]/75 mb-3 line-clamp-2 flex-1">
                    {c.description?.slice(0, 100)}{c.description && c.description.length > 100 ? "…" : ""}
                  </p>
                  {cTotal > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-[#1a472a]/80 mb-1">
                        <span>{cPct.toFixed(0)}% complete</span>
                      </div>
                      <div className="w-full bg-[#1a472a]/10 rounded-full h-1.5">
                        <div
                          className="bg-[#4a7c59] h-1.5 rounded-full"
                          style={{ width: `${cPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Link href={`/campaign/${c.id}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white">
                      View Campaign
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      <ContributionModal
        key={id}
        isOpen={showContributionModal}
        onClose={() => {
          setShowContributionModal(false);
          setSelectedNeed(null);
        }}
        campaignId={parseInt(id!)}
        campaignTitle={campaign.title}
        currency={campaign.currency || 'USD'}
        need={selectedNeed ?? undefined}
        onSuccess={({ practice }) => {
          // A practice run wrote nothing, so there is nothing to refetch.
          if (practice) return;
          refetch();
          toast.success('Your contribution has been submitted!');
        }}
      />
    </div>
    </>
  );
}
