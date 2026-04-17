import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CampaignProgressTracker } from "@/components/CampaignProgressTracker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Target, 
  Calendar, 
  TrendingUp, 
  Users, 
  Leaf, 
  Wrench, 
  UserCheck, 
  Package,
  ExternalLink,
  Heart,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Settings,
  Camera,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { toast } from "sonner";
import { TaoSpinner } from "@/components/TaoSpinner";
import { ContributionModal } from "@/components/ContributionModal";
import { SEO } from "@/components/SEO";
import { ShareButtons } from "@/components/ShareButtons";
import { BackButton } from "@/components/BackButton";
import VideoEmbed from "@/components/VideoEmbed";
import { BlurImage } from "@/components/BlurImage";
import { CampaignMilestones } from "@/components/CampaignMilestones";

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

  // Fetch related campaigns (active campaigns to show at the bottom)
  const { data: allActiveCampaigns } = trpc.campaigns.list.useQuery(
    { status: 'active' },
    { staleTime: 5 * 60 * 1000 }
  );
  const relatedCampaigns = allActiveCampaigns
    ?.filter((c) => c.id !== parseInt(id!))
    .slice(0, 3);
  
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
  
  // Calculate progress
  const totalValue = campaign.items.reduce((sum, item) => sum + item.estimatedValue, 0);
  const raisedValue = campaign.pledgedTotal || 0;
  const progressPercentage = totalValue > 0 ? Math.min((raisedValue / totalValue) * 100, 100) : 0;
  
  // Financial progress
  const financialTarget = campaign.financialTarget || 0;
  const financialRaised = campaign.pledgedFinancial || 0;
  const financialProgress = financialTarget > 0 ? Math.min((financialRaised / financialTarget) * 100, 100) : 0;
  
  // Group items by category
  const landItems = campaign.items.filter(item => item.category === 'land');
  const equipmentItems = campaign.items.filter(item => item.category === 'equipment');
  const roleItems = campaign.items.filter(item => item.category === 'role');
  const resourceItems = campaign.items.filter(item => item.category === 'resource');
  
  // Count unique contributors
  const contributorCount = contributions ? new Set(contributions.map(c => c.contributorEmail)).size : 0;
  
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
        return <Badge className="bg-blue-500 text-white">Funded</Badge>;
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
        description={`${campaign.description.slice(0, 150)}... Goal: ${formatCurrencyForSEO(totalValue)} | ${contributorCount} contributors | ${progressPercentage.toFixed(0)}% funded`}
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
                <div className="flex items-center gap-2 text-[#1a472a]/60">
                  <MapPin className="w-4 h-4" />
                  <span>{campaign.location}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Manage button for campaign owners */}
              {isAuthenticated && (user?.id === campaign.userId || user?.role === 'admin') && (
                <Link href={`/campaign/${id}/manage`}>
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
              <ShareButtons
                url={`/campaign/${id}`}
                title={campaign.title}
                description={campaign.description.slice(0, 200)}
                hashtags={['ReGenCivics', 'Regenerative', 'CrowdPooling']}
                className="flex-1 md:flex-none"
                showEmbed={true}
              />
              <Button
                size="sm"
                className="bg-[#4a7c59] hover:bg-[#1a472a] text-white flex-1 md:flex-none"
                onClick={() => setShowContributionModal(true)}
                disabled={campaign.status !== 'active'}
              >
                <Heart className="w-4 h-4 mr-2" />
                Contribute
              </Button>
            </div>
          </div>
          
          <p className="text-[#1a472a]/80 leading-relaxed mb-6">
            {campaign.description}
          </p>
          
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
        </div>
        
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
                      {contribution.contributorName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#1a472a]/60">
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
              <p className="text-center text-sm text-[#1a472a]/60 mt-4">
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
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Governance</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.governanceModel}</p>
                    </div>
                  )}
                  {campaign.membershipModel && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Membership</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.membershipModel}</p>
                    </div>
                  )}
                  {campaign.housingPlans && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Housing</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.housingPlans}</p>
                    </div>
                  )}
                  {campaign.foodSystems && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Food Systems</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.foodSystems}</p>
                    </div>
                  )}
                  {campaign.waterSystems && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Water Systems</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.waterSystems}</p>
                    </div>
                  )}
                  {campaign.energySystems && (
                    <div className="border-l-3 border-[#7dd87d] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Energy Systems</div>
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
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Education Programs</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.educationPrograms}</p>
                    </div>
                  )}
                  {campaign.communityEngagement && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Community Engagement</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.communityEngagement}</p>
                    </div>
                  )}
                  {campaign.impactMetrics && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Impact Metrics</div>
                      <p className="text-[#1a472a]/80 text-sm">{campaign.impactMetrics}</p>
                    </div>
                  )}
                  {campaign.regenerativePractices && (
                    <div className="border-l-3 border-[#d4a574] pl-4">
                      <div className="text-xs font-bold text-[#1a472a]/60 mb-1">Regenerative Practices</div>
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
        
        {/* Campaign Needs Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white/95 backdrop-blur mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs md:text-sm">All ({campaign.items.length})</TabsTrigger>
            {landItems.length > 0 && <TabsTrigger value="land" className="text-xs md:text-sm">Land ({landItems.length})</TabsTrigger>}
            {equipmentItems.length > 0 && <TabsTrigger value="equipment" className="text-xs md:text-sm">Equipment ({equipmentItems.length})</TabsTrigger>}
            {roleItems.length > 0 && <TabsTrigger value="roles" className="text-xs md:text-sm">Roles ({roleItems.length})</TabsTrigger>}
            {resourceItems.length > 0 && <TabsTrigger value="resources" className="text-xs md:text-sm">Resources ({resourceItems.length})</TabsTrigger>}
          </TabsList>
          
          {/* All Needs */}
          <TabsContent value="all" className="space-y-4">
            {campaign.items.map((item: any) => (
              <Card key={item.id} className="bg-white/95 backdrop-blur">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {item.category === 'land' && <Leaf className="w-6 h-6 text-green-600 flex-shrink-0" />}
                      {item.category === 'equipment' && <Wrench className="w-6 h-6 text-orange-600 flex-shrink-0" />}
                      {item.category === 'role' && <UserCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />}
                      {item.category === 'resource' && <Package className="w-6 h-6 text-purple-600 flex-shrink-0" />}
                      <div>
                        <CardTitle className="text-[#1a472a] text-base md:text-lg">
                          {item.category === 'land' && `${item.hectares} hectares in ${item.region}`}
                          {item.category === 'equipment' && `${item.equipmentName} (x${item.equipmentQuantity})`}
                          {item.category === 'role' && item.roleTitle}
                          {item.category === 'resource' && item.resourceName}
                        </CardTitle>
                        <CardDescription className="capitalize">{item.category}</CardDescription>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xl md:text-2xl font-bold text-[#4a7c59]">
                        {formatCurrency(item.estimatedValue)}
                      </div>
                      {item.pledgedValue > 0 && (
                        <div className="text-xs text-[#1a472a]/60 mt-1">
                          {formatCurrency(item.pledgedValue)} pledged
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  {item.landDescription && <p className="text-[#1a472a]/80 text-sm">{item.landDescription}</p>}
                  {item.roleDescription && <p className="text-[#1a472a]/80 text-sm">{item.roleDescription}</p>}
                  {item.resourceDescription && <p className="text-[#1a472a]/80 text-sm">{item.resourceDescription}</p>}
                  {item.features && (() => {
                    try {
                      const features = typeof item.features === 'string' ? JSON.parse(item.features) : item.features;
                      return features.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {features.map((feature: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="border-[#7dd87d]/30 text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                  {item.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(item.videoUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Watch Video
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          {/* Land Tab */}
          {landItems.length > 0 && (
            <TabsContent value="land" className="space-y-4">
              {landItems.map((item: any) => (
                <Card key={item.id} className="bg-white/95 backdrop-blur">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Leaf className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <CardTitle className="text-[#1a472a] text-base md:text-lg">
                            {item.hectares} hectares in {item.region}
                          </CardTitle>
                          <CardDescription>Land Requirement</CardDescription>
                        </div>
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-[#4a7c59]">
                        {formatCurrency(item.estimatedValue)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    {item.landDescription && <p className="text-[#1a472a]/80 mb-3 text-sm">{item.landDescription}</p>}
                    {item.features && (() => {
                      try {
                        const features = typeof item.features === 'string' ? JSON.parse(item.features) : item.features;
                        return features.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {features.map((feature: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="border-[#7dd87d]/30 text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                    {item.videoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => window.open(item.videoUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Watch Video
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
          
          {/* Equipment Tab */}
          {equipmentItems.length > 0 && (
            <TabsContent value="equipment" className="space-y-4">
              {equipmentItems.map((item: any) => (
                <Card key={item.id} className="bg-white/95 backdrop-blur">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Wrench className="w-6 h-6 text-orange-600 flex-shrink-0" />
                        <div>
                          <CardTitle className="text-[#1a472a] text-base md:text-lg">
                            {item.equipmentName} (x{item.equipmentQuantity})
                          </CardTitle>
                          <CardDescription className="capitalize">{item.equipmentCategory}</CardDescription>
                        </div>
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-[#4a7c59]">
                        {formatCurrency(item.estimatedValue)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>
          )}
          
          {/* Roles Tab */}
          {roleItems.length > 0 && (
            <TabsContent value="roles" className="space-y-4">
              {roleItems.map((item: any) => (
                <Card key={item.id} className="bg-white/95 backdrop-blur">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <CardTitle className="text-[#1a472a] text-base md:text-lg">{item.roleTitle}</CardTitle>
                          <CardDescription>
                            {item.hoursPerWeek}hrs/week for {item.durationMonths} months
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-[#4a7c59]">
                        {formatCurrency(item.estimatedValue)}
                      </div>
                    </div>
                  </CardHeader>
                  {item.roleDescription && (
                    <CardContent className="p-4 md:p-6 pt-0">
                      <p className="text-[#1a472a]/80 text-sm">{item.roleDescription}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>
          )}
          
          {/* Resources Tab */}
          {resourceItems.length > 0 && (
            <TabsContent value="resources" className="space-y-4">
              {resourceItems.map((item: any) => (
                <Card key={item.id} className="bg-white/95 backdrop-blur">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-purple-600 flex-shrink-0" />
                        <div>
                          <CardTitle className="text-[#1a472a] text-base md:text-lg">{item.resourceName}</CardTitle>
                          <CardDescription>
                            {item.resourceQuantity} {item.resourceUnit}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-[#4a7c59]">
                        {formatCurrency(item.estimatedValue)}
                      </div>
                    </div>
                  </CardHeader>
                  {item.resourceDescription && (
                    <CardContent className="p-4 md:p-6 pt-0">
                      <p className="text-[#1a472a]/80 text-sm">{item.resourceDescription}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>
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
                    <p className="text-xs text-[#1a472a]/50 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      {c.location}
                    </p>
                  )}
                  <p className="text-xs text-[#1a472a]/70 mb-3 line-clamp-2 flex-1">
                    {c.description?.slice(0, 100)}{c.description && c.description.length > 100 ? "…" : ""}
                  </p>
                  {cTotal > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-[#1a472a]/60 mb-1">
                        <span>{cPct.toFixed(0)}% funded</span>
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
        isOpen={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        campaignId={parseInt(id!)}
        campaignTitle={campaign.title}
        currency={campaign.currency || 'USD'}
        onSuccess={() => {
          refetch();
          toast.success('Your contribution has been submitted!');
        }}
      />
    </div>
    </>
  );
}

// Photo Gallery component for campaign detail page
function CampaignPhotoGallery({ images }: { images: any[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const IMAGE_CATEGORIES: Record<string, string> = {
    land: 'Land',
    team: 'Team',
    progress: 'Progress',
    infrastructure: 'Infrastructure',
    community: 'Community',
    other: 'Other',
  };

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  if (images.length === 0) return null;

  // Cover image is the first one (sorted by isCover desc)
  const coverImage = images[0];
  const otherImages = images.slice(1);

  return (
    <>
      <div className="bg-white/95 backdrop-blur rounded-3xl overflow-hidden mb-6 shadow-xl">
        {/* Cover / Featured Image */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => setSelectedIndex(0)}
        >
          <BlurImage
            src={coverImage.url}
            alt={coverImage.caption || 'Campaign cover photo'}
            className="w-full h-48 md:h-72"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {coverImage.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white text-sm">{coverImage.caption}</p>
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-[#7dd87d] text-[#1a472a]">
            <Camera className="w-3 h-3 mr-1" />
            {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
          </Badge>
        </div>

        {/* Thumbnail Grid */}
        {otherImages.length > 0 && (
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {otherImages.map((img: any, idx: number) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedIndex(idx + 1)}
                  className="aspect-square rounded-lg overflow-hidden relative group"
                >
                  <BlurImage
                    src={img.url}
                    alt={img.caption || `Photo ${idx + 2}`}
                    className="absolute inset-0"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                    {IMAGE_CATEGORIES[img.category] || 'Other'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Photo viewer"
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedIndex].url}
              alt={images[selectedIndex].caption || `Photo ${selectedIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              {images[selectedIndex].caption && (
                <p className="text-white/90 text-sm mb-1">{images[selectedIndex].caption}</p>
              )}
              <p className="text-white/50 text-xs">
                {IMAGE_CATEGORIES[images[selectedIndex].category] || 'Other'} - {selectedIndex + 1} of {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
