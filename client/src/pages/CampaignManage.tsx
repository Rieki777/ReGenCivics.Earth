import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Leaf,
  Wrench,
  UserCheck,
  Package,
  Mail,
  Phone,
  User,
  MessageSquare,
  Loader2,
  Eye,
  AlertCircle,
  BarChart3,
  Camera,
  PackageCheck,
  Gift,
  BookOpen,
  Target,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { CAPITAL_LABELS, type CapitalType } from "@shared/crowdpoolingTaxonomy";
import { TaoSpinner } from "@/components/TaoSpinner";
import { CampaignImageUpload } from "@/components/CampaignImageUpload";
import { getLoginUrl } from "@/const";
import { BackButton } from "@/components/BackButton";

type ContributionAction = 'accept' | 'reject' | 'deliver' | 'thanks';

const ACTION_STATUS: Record<ContributionAction, 'accepted' | 'rejected' | 'fulfilled' | 'thanked'> = {
  accept: 'accepted',
  reject: 'rejected',
  deliver: 'fulfilled',
  thanks: 'thanked',
};

const ACTION_VERBS: Record<ContributionAction, string> = {
  accept: 'accepted',
  reject: 'rejected',
  deliver: 'marked delivered',
  thanks: 'thanked',
};

export default function CampaignManage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [actionType, setActionType] = useState<ContributionAction | null>(null);
  const [ownerNotes, setOwnerNotes] = useState('');
  const [thanksImageUrl, setThanksImageUrl] = useState('');

  // Updates composer state
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateBody, setUpdateBody] = useState('');
  const [updateImages, setUpdateImages] = useState('');

  // Fetch campaign data
  const { data: campaign, isLoading, error, refetch } = trpc.campaigns.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id }
  );

  // Fetch all contributions with full PII for the owner view
  const { data: allContributions, refetch: refetchContributions } = trpc.campaigns.getContributionsForOwner.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id && isAuthenticated }
  );

  // Existing updates for the composer's journal list
  const { data: campaignUpdates, refetch: refetchUpdates } = trpc.campaigns.listUpdates.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id && isAuthenticated }
  );

  // Post a new update to followers and the public journal
  const createUpdateMutation = trpc.campaigns.createUpdate.useMutation({
    onSuccess: () => {
      toast.success('Update published');
      setUpdateTitle('');
      setUpdateBody('');
      setUpdateImages('');
      refetchUpdates();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to publish update');
    }
  });

  const handlePublishUpdate = () => {
    if (!updateTitle.trim() || !updateBody.trim()) {
      toast.error('An update needs a title and a body');
      return;
    }
    const imageUrls = updateImages
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    createUpdateMutation.mutate({
      campaignId: parseInt(id!),
      title: updateTitle.trim(),
      body: updateBody.trim(),
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });
  };

  // Update contribution status mutation
  const updateStatusMutation = trpc.campaigns.updateContributionStatus.useMutation({
    onSuccess: () => {
      toast.success(`Contribution ${actionType ? ACTION_VERBS[actionType] : 'updated'}`);
      setSelectedContribution(null);
      setActionType(null);
      setOwnerNotes('');
      setThanksImageUrl('');
      refetch();
      refetchContributions();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update contribution status');
    }
  });

  // Formalize a delivered contribution on the project's Hypha DHO. Returns an
  // internal bridge URL; the bridge page hands off to Hypha to finish.
  const formalizeMutation = trpc.campaigns.formalizeOnHypha.useMutation({
    onSuccess: (res: any) => {
      toast.success('Bridge ready. Hypha opens to finish formalizing.');
      if (res?.bridgeUrl) window.location.href = res.bridgeUrl;
    },
    onError: (error) => {
      toast.error(error.message || 'Could not formalize on Hypha');
    }
  });
  const [formalizingId, setFormalizingId] = useState<number | null>(null);

  // Handle auth loading
  if (authLoading) {
    return <TaoSpinner fullPage size={72} />;
  }
  
  // Require authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
        <Card className="max-w-md w-full bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[#1a472a]">Login Required</CardTitle>
            <CardDescription>You need to be logged in to manage campaigns.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = getLoginUrl()}
              className="w-full bg-[#4a7c59] hover:bg-[#1a472a]"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }
  
  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
        <Card className="max-w-md w-full bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[#1a472a]">Campaign Not Found</CardTitle>
            <CardDescription>The campaign you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/campaigns')}
              className="w-full bg-[#4a7c59] hover:bg-[#1a472a]"
            >
              Browse All Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Check if user owns this campaign
  if (campaign.userId !== user?.id && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] px-4">
        <Card className="max-w-md w-full bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-[#1a472a] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>You don't have permission to manage this campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate(`/campaign/${id}`)}
              variant="outline"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Campaign
            </Button>
            <Button 
              onClick={() => navigate('/campaigns')}
              className="w-full bg-[#4a7c59] hover:bg-[#1a472a]"
            >
              Browse All Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Group contributions by status
  const pendingContributions = allContributions?.filter(c => c.status === 'pending') || [];
  const acceptedContributions = allContributions?.filter(c => c.status === 'accepted') || [];
  const fulfilledContributions = allContributions?.filter(c => c.status === 'fulfilled') || [];
  const thankedContributions = allContributions?.filter(c => c.status === 'thanked') || [];
  const closedContributions = allContributions?.filter(c => c.status === 'rejected' || c.status === 'expired') || [];
  const deliveredCount = fulfilledContributions.length + thankedContributions.length;
  
  // Calculate totals
  const totalValue = campaign.items.reduce((sum, item) => sum + item.estimatedValue, 0);
  const pledgedValue = campaign.pledgedTotal || 0;
  const progressPercentage = totalValue > 0 ? Math.min((pledgedValue / totalValue) * 100, 100) : 0;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: campaign.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Get contribution type icon
  const getContributionIcon = (type: string) => {
    switch (type) {
      case 'land': return <Leaf className="w-5 h-5 text-green-600" />;
      case 'equipment': return <Wrench className="w-5 h-5 text-orange-600" />;
      case 'role': return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'resource': return <Package className="w-5 h-5 text-purple-600" />;
      case 'financial': return <DollarSign className="w-5 h-5 text-emerald-600" />;
      default: return <Package className="w-5 h-5 text-gray-600" />;
    }
  };
  
  // Handle action
  const handleAction = () => {
    if (!selectedContribution || !actionType) return;

    if (actionType === 'thanks' && !ownerNotes.trim()) {
      toast.error('A thank-you note is required. Tell them what their contribution made possible.');
      return;
    }

    updateStatusMutation.mutate({
      contributionId: selectedContribution.id,
      status: ACTION_STATUS[actionType],
      ownerNotes: actionType !== 'thanks' ? (ownerNotes.trim() || undefined) : undefined,
      acknowledgedNote: actionType === 'thanks' ? ownerNotes.trim() : undefined,
      acknowledgedImageUrl: actionType === 'thanks' ? (thanksImageUrl.trim() || undefined) : undefined,
    });
  };

  const closeActionDialog = () => {
    setSelectedContribution(null);
    setActionType(null);
    setOwnerNotes('');
    setThanksImageUrl('');
  };
  
  // Claim expiry countdown text for accepted claims
  const claimCountdown = (contribution: any): { text: string; overdue: boolean } | null => {
    if (contribution.status !== 'accepted' || !contribution.claimExpiresAt) return null;
    const msLeft = new Date(contribution.claimExpiresAt).getTime() - Date.now();
    if (msLeft <= 0) {
      return { text: 'Claim window passed. The nightly sweep will release this slot.', overdue: true };
    }
    const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
    const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return {
      text: days > 0 ? `${days}d ${hours}h left to deliver` : `${hours}h left to deliver`,
      overdue: false,
    };
  };

  // Contribution card component
  const ContributionCard = ({ contribution, showActions = false }: { contribution: any; showActions?: boolean }) => {
    const countdown = claimCountdown(contribution);
    const isExpired = contribution.status === 'expired';
    return (
    <Card className={`bg-white border-gray-200 ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {getContributionIcon(contribution.contributionType)}
            <div>
              <CardTitle className="text-base text-[#1a472a]">{contribution.title}</CardTitle>
              <CardDescription className="capitalize">
                {contribution.contributionType}
                {(contribution.quantityPledged || 1) > 1 && ` · ${contribution.quantityPledged} slots`}
                {!!contribution.isAnonymous && ' · anonymous publicly'}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#4a7c59]">
              {formatCurrency(contribution.estimatedValue)}
            </div>
            <Badge
              className={
                contribution.status === 'pending' ? 'bg-yellow-500' :
                contribution.status === 'accepted' ? 'bg-green-500' :
                contribution.status === 'fulfilled' ? 'bg-emerald-600' :
                contribution.status === 'thanked' ? 'bg-purple-500' :
                contribution.status === 'rejected' ? 'bg-red-500' :
                contribution.status === 'expired' ? 'bg-gray-400' :
                'bg-gray-500'
              }
            >
              {contribution.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Claim expiry countdown */}
        {countdown && (
          <div className={`flex items-center gap-2 text-sm rounded-lg p-2 ${
            countdown.overdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{countdown.text}</span>
          </div>
        )}

        {/* Contributor Info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{contribution.contributorName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-300" />
            <a href={`mailto:${contribution.contributorEmail}`} className="hover:underline">
              {contribution.contributorEmail}
            </a>
          </div>
          {contribution.contributorPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-300" />
              <span>{contribution.contributorPhone}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {contribution.description && (
          <p className="text-sm text-gray-600">{contribution.description}</p>
        )}

        {/* Contributor Notes */}
        {contribution.contributorNotes && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">Contributor Notes:</p>
                <p className="text-sm text-blue-600">{contribution.contributorNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Owner Notes */}
        {contribution.ownerNotes && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Your Response:</p>
                <p className="text-sm text-purple-600">{contribution.ownerNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Thank-you note sent to the contributor */}
        {contribution.acknowledgedNote && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Your Thanks:</p>
                <p className="text-sm text-green-600">{contribution.acknowledgedNote}</p>
                {contribution.acknowledgedImageUrl && (
                  <img
                    src={contribution.acknowledgedImageUrl}
                    alt="Thank-you photo"
                    className="mt-2 w-24 h-24 object-cover rounded-lg"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submitted date */}
        <p className="text-xs text-gray-300">
          Submitted: {new Date(contribution.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                setSelectedContribution(contribution);
                setActionType('accept');
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                setSelectedContribution(contribution);
                setActionType('reject');
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {/* Mark delivered: the moment the contribution counts */}
        {contribution.status === 'accepted' && (
          <div className="pt-2">
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setSelectedContribution(contribution);
                setActionType('deliver');
              }}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Mark delivered
            </Button>
          </div>
        )}

        {/* Send thanks: closes the loop after delivery */}
        {contribution.status === 'fulfilled' && (
          <div className="pt-2">
            <Button
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                setSelectedContribution(contribution);
                setActionType('thanks');
              }}
            >
              <Gift className="w-4 h-4 mr-2" />
              Send thanks
            </Button>
          </div>
        )}

        {/* Formalize on Hypha: after delivery, bring it to the project DHO so the
            DHO can issue project tokens on chain. One way, one time per contribution. */}
        {(contribution.status === 'fulfilled' || contribution.status === 'thanked') && !contribution.hyphaBridgeKey && (
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white"
              disabled={formalizeMutation.isPending && formalizingId === contribution.id}
              onClick={() => {
                setFormalizingId(contribution.id);
                formalizeMutation.mutate({ contributionId: contribution.id });
              }}
            >
              {formalizeMutation.isPending && formalizingId === contribution.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Formalize on Hypha
            </Button>
            <p className="text-[11px] text-gray-500 mt-1 text-center">
              Brings this to the project DHO so it can issue project tokens on chain.
            </p>
          </div>
        )}
        {contribution.hyphaBridgeKey && (
          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[#4a7c59]">
            <CheckCircle2 className="w-4 h-4" />
            On its way to Hypha
          </div>
        )}
      </CardContent>
    </Card>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] pt-24 pb-12">
      <div className="container max-w-6xl px-4">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/campaign/${id}`)}
                className="mb-2 -ml-2 text-[#1a472a]/80 hover:text-[#1a472a]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Campaign
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Manage: {campaign.title}
              </h1>
              <p className="text-[#1a472a]/80 mt-1">{campaign.projectName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/campaign/${id}/analytics`)}
                className="border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Analytics
              </Button>
              <Badge 
                className={
                  campaign.status === 'active' ? 'bg-green-500' :
                  campaign.status === 'funded' ? 'bg-blue-500' :
                  campaign.status === 'completed' ? 'bg-purple-500' :
                  'bg-gray-500'
                }
              >
                {campaign.status}
              </Badge>
            </div>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#1a472a]/80">Campaign Progress</span>
              <span className="font-bold text-[#4a7c59]">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-[#1a472a]/80">
                <strong>{formatCurrency(pledgedValue)}</strong> pledged
              </span>
              <span className="text-[#1a472a]/80">
                of <strong>{formatCurrency(totalValue)}</strong> total
              </span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">{pendingContributions.length}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{acceptedContributions.length}</div>
              <div className="text-xs text-green-600">Accepted</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <PackageCheck className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-emerald-700">{deliveredCount}</div>
              <div className="text-xs text-emerald-600">Delivered</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {new Set(acceptedContributions.map(c => c.contributorEmail)).size}
              </div>
              <div className="text-xs text-blue-600">Contributors</div>
            </div>
          </div>
        </div>
        
        {/* Needs at a glance: unfilled slots are where to point the next share */}
        {campaign.items.length > 0 && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Target className="w-5 h-5 text-[#4a7c59]" />
              Needs ({campaign.items.length})
            </h2>
            <p className="text-sm text-[#1a472a]/70 mb-4">
              Delivered fills the bar solid; accepted claims show lighter. Unfilled needs are where to point your next share.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {campaign.items.map((item: any) => {
                const kind = needKindForItem(item);
                const capital = needCapitalForItem(item);
                const wanted = item.quantityWanted || 1;
                const claimed = item.quantityClaimed || 0;
                const delivered = item.quantityDelivered || 0;
                const claimedPct = Math.min((claimed / wanted) * 100, 100);
                const deliveredPct = Math.min((delivered / wanted) * 100, 100);
                return (
                  <div key={item.id} className="bg-[#f0f7f0] rounded-xl p-3 border border-[#7dd87d]/30">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NEED_KIND_CHIPS[kind] || 'bg-gray-100 text-gray-700'}`}>
                        {NEED_KIND_LABELS[kind] || kind}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white text-[#4a7c59]">
                        {CAPITAL_LABELS[capital].label}
                      </span>
                    </div>
                    <p className="font-medium text-[#1a472a] text-sm mb-2 truncate">{needTitleForItem(item)}</p>
                    <div className="w-full bg-[#1a472a]/10 rounded-full h-2 relative overflow-hidden mb-1">
                      <div className="absolute inset-y-0 left-0 bg-[#7dd87d]/40 rounded-full" style={{ width: `${claimedPct}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-[#4a7c59] rounded-full" style={{ width: `${deliveredPct}%` }} />
                    </div>
                    <p className="text-xs text-[#1a472a]/80">
                      {delivered} of {wanted} delivered
                      {claimed > delivered ? `, ${claimed - delivered} more claimed` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contributions Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-white/95 backdrop-blur mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="pending" className="text-sm">
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingContributions.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="text-sm">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accepted ({acceptedContributions.length})
            </TabsTrigger>
            <TabsTrigger value="fulfilled" className="text-sm">
              <PackageCheck className="w-4 h-4 mr-2" />
              Fulfilled ({fulfilledContributions.length})
            </TabsTrigger>
            <TabsTrigger value="thanked" className="text-sm">
              <Gift className="w-4 h-4 mr-2" />
              Thanked ({thankedContributions.length})
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-sm">
              <XCircle className="w-4 h-4 mr-2" />
              Closed ({closedContributions.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Pending Contributions */}
          <TabsContent value="pending" className="space-y-4">
            {pendingContributions.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Pending Contributions</h3>
                  <p className="text-gray-500">New contributions will appear here for your review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingContributions.map((contribution) => (
                  <ContributionCard 
                    key={contribution.id} 
                    contribution={contribution} 
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Accepted Contributions */}
          <TabsContent value="accepted" className="space-y-4">
            {acceptedContributions.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Accepted Contributions Yet</h3>
                  <p className="text-gray-500">Accepted contributions will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {acceptedContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Fulfilled Contributions: delivered, awaiting thanks */}
          <TabsContent value="fulfilled" className="space-y-4">
            {fulfilledContributions.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <PackageCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Nothing Delivered Yet</h3>
                  <p className="text-gray-500">When you mark an accepted claim delivered, it lands here so you can send thanks.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {fulfilledContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Thanked Contributions: the loop is closed */}
          <TabsContent value="thanked" className="space-y-4">
            {thankedContributions.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Thanks Sent Yet</h3>
                  <p className="text-gray-500">Contributions you have thanked will appear here with your note.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {thankedContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Closed: rejected and expired */}
          <TabsContent value="closed" className="space-y-4">
            {closedContributions.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Nothing Closed</h3>
                  <p className="text-gray-500">Rejected and expired contributions will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {closedContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Updates composer: numbered journal entries that reach followers */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mt-6 shadow-xl">
          <h2 className="text-xl font-bold text-[#1a472a] mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <BookOpen className="w-5 h-5 text-[#4a7c59]" />
            Updates ({campaignUpdates?.length ?? 0})
          </h2>
          <p className="text-sm text-[#1a472a]/70 mb-4">
            Post progress to your campaign page. Followers and email subscribers hear about it.
          </p>
          <div className="space-y-3 mb-6">
            <div className="space-y-2">
              <Label htmlFor="updateTitle">Title</Label>
              <Input
                id="updateTitle"
                value={updateTitle}
                onChange={(e) => setUpdateTitle(e.target.value)}
                placeholder="e.g., The greenhouse frame is up"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateBody">What happened?</Label>
              <Textarea
                id="updateBody"
                value={updateBody}
                onChange={(e) => setUpdateBody(e.target.value)}
                placeholder="Tell your contributors what their pooling made possible..."
                rows={4}
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateImages">Image URLs (optional, comma separated)</Label>
              <Input
                id="updateImages"
                value={updateImages}
                onChange={(e) => setUpdateImages(e.target.value)}
                placeholder="https://... , https://..."
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <Button
              onClick={handlePublishUpdate}
              disabled={createUpdateMutation.isPending || !updateTitle.trim() || !updateBody.trim()}
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white"
            >
              {createUpdateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish update'
              )}
            </Button>
          </div>

          {/* Published updates */}
          {campaignUpdates && campaignUpdates.length > 0 && (
            <div className="space-y-4 border-t border-[#1a472a]/10 pt-4">
              {campaignUpdates.map((update) => (
                <div key={update.id} className="border-l-3 border-[#7dd87d] pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-[#4a7c59] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {update.updateNumber}
                    </span>
                    <h3 className="font-bold text-[#1a472a]">{update.title}</h3>
                  </div>
                  <p className="text-xs text-[#1a472a]/70 mb-1">
                    {update.publishedAt ? new Date(update.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                  </p>
                  <p className="text-sm text-[#1a472a]/80 whitespace-pre-line">{update.body}</p>
                  {Array.isArray(update.imageUrls) && update.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {update.imageUrls.map((url: string, idx: number) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`${update.title} photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Campaign Photos Section */}
      <div className="bg-white/95 backdrop-blur rounded-2xl p-6 border border-[#7dd87d]/30">
        <h2 className="text-xl font-bold text-[#1a472a] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Camera className="w-5 h-5 text-[#4a7c59]" />
          Campaign Photos
        </h2>
        <p className="text-sm text-[#1a472a]/70 mb-4">
          Upload photos of your land, team, and progress. These will appear on your campaign card and detail page.
        </p>
        <CampaignImageUpload campaignId={parseInt(id!)} />
      </div>

      {/* Contribution action dialog: accept, reject, mark delivered, send thanks */}
      <Dialog open={!!selectedContribution && !!actionType} onOpenChange={closeActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={
              actionType === 'accept' ? 'text-green-700' :
              actionType === 'reject' ? 'text-red-700' :
              actionType === 'deliver' ? 'text-emerald-700' :
              'text-purple-700'
            }>
              {actionType === 'accept' && 'Accept Contribution'}
              {actionType === 'reject' && 'Reject Contribution'}
              {actionType === 'deliver' && 'Mark Delivered'}
              {actionType === 'thanks' && 'Send Thanks'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept' && 'This reserves the slot and starts the delivery window. It counts once it lands.'}
              {actionType === 'reject' && 'This contribution will be marked as rejected.'}
              {actionType === 'deliver' && 'Confirm this contribution arrived. This is the moment it counts: progress, recognition, all of it.'}
              {actionType === 'thanks' && 'Close the loop. Your note goes to the contributor and onto the Pool Ledger.'}
            </DialogDescription>
          </DialogHeader>

          {selectedContribution && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getContributionIcon(selectedContribution.contributionType)}
                  <span className="font-medium">{selectedContribution.title}</span>
                </div>
                <p className="text-sm text-gray-600">
                  From: {selectedContribution.contributorName}
                </p>
                <p className="text-sm font-bold text-[#4a7c59]">
                  Value: {formatCurrency(selectedContribution.estimatedValue)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {actionType === 'thanks' ? 'Thank-you note (required)' : 'Message to Contributor (optional)'}
                </Label>
                <Textarea
                  id="notes"
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  placeholder={
                    actionType === 'accept' ? "Thank you for your contribution! We'll be in touch soon..." :
                    actionType === 'reject' ? 'Thank you for your interest. Unfortunately...' :
                    actionType === 'deliver' ? 'Arrived in great shape, already in use...' :
                    'Your tractor turned the whole east field this week. Here is what that made possible...'
                  }
                  rows={3}
                />
              </div>

              {actionType === 'thanks' && (
                <div className="space-y-2">
                  <Label htmlFor="thanksImage" className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    Photo URL (optional)
                  </Label>
                  <Input
                    id="thanksImage"
                    value={thanksImageUrl}
                    onChange={(e) => setThanksImageUrl(e.target.value)}
                    placeholder="https://... a photo of their contribution at work"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateStatusMutation.isPending}
              className={
                actionType === 'accept' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                actionType === 'deliver' ? 'bg-emerald-600 hover:bg-emerald-700' :
                'bg-purple-600 hover:bg-purple-700'
              }
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'accept' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept
                    </>
                  )}
                  {actionType === 'reject' && (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                  {actionType === 'deliver' && (
                    <>
                      <PackageCheck className="w-4 h-4 mr-2" />
                      Mark delivered
                    </>
                  )}
                  {actionType === 'thanks' && (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Send thanks
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Needs panel helpers ----

const NEED_KIND_LABELS: Record<string, string> = {
  item: 'Item',
  role: 'Role',
  shift: 'Shift',
  loan: 'Loan',
  knowledge: 'Knowledge',
  crypto: 'Crypto',
  financial_link: 'Partner',
};

const NEED_KIND_CHIPS: Record<string, string> = {
  item: 'bg-purple-100 text-purple-700',
  role: 'bg-blue-100 text-blue-700',
  shift: 'bg-orange-100 text-orange-700',
  loan: 'bg-amber-100 text-amber-700',
  knowledge: 'bg-indigo-100 text-indigo-700',
  crypto: 'bg-emerald-100 text-emerald-700',
  financial_link: 'bg-gray-100 text-gray-700',
};

/** Legacy items without a capitalType map from their old category. */
function needCapitalForItem(item: any): CapitalType {
  if (item.capitalType) return item.capitalType;
  switch (item.category) {
    case 'land': return 'living';
    case 'role': return 'experiential';
    default: return 'material';
  }
}

function needKindForItem(item: any): string {
  if (item.kind) return item.kind;
  return item.category === 'role' ? 'role' : 'item';
}

function needTitleForItem(item: any): string {
  if (item.roleTitle) return item.roleTitle;
  if (item.equipmentName) return item.equipmentName;
  if (item.resourceName) return item.resourceName;
  if (item.hectares && item.region) return `${item.hectares} hectares in ${item.region}`;
  if (item.landDescription) {
    const firstLine = String(item.landDescription).split('\n')[0];
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  }
  return 'Campaign need';
}
