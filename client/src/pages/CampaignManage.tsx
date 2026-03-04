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
  Camera
} from "lucide-react";
import { toast } from "sonner";
import { SeedOfLifeSpinner } from "@/components/SeedOfLifeSpinner";
import { CampaignImageUpload } from "@/components/CampaignImageUpload";
import { getLoginUrl } from "@/const";
import { BackButton } from "@/components/BackButton";

export default function CampaignManage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  const [selectedContribution, setSelectedContribution] = useState<any>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [ownerNotes, setOwnerNotes] = useState('');
  
  // Fetch campaign data
  const { data: campaign, isLoading, error, refetch } = trpc.campaigns.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id }
  );
  
  // Fetch all contributions (not just accepted)
  const { data: allContributions, refetch: refetchContributions } = trpc.campaigns.getContributions.useQuery(
    { campaignId: parseInt(id!) },
    { enabled: !!id }
  );
  
  // Update contribution status mutation
  const updateStatusMutation = trpc.campaigns.updateContributionStatus.useMutation({
    onSuccess: () => {
      toast.success(`Contribution ${actionType === 'accept' ? 'accepted' : 'rejected'} successfully`);
      setSelectedContribution(null);
      setActionType(null);
      setOwnerNotes('');
      refetch();
      refetchContributions();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update contribution status');
    }
  });
  
  // Handle auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
      <BackButton />
        <div className="text-center">
          <SeedOfLifeSpinner size={64} className="text-[#7dd87d] mx-auto mb-4" />
          <p className="text-[#7dd87d]/80 text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
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
              className="w-full bg-[#4a7c59] hover:bg-[#2e7d32]"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
        <div className="text-center">
          <SeedOfLifeSpinner size={64} className="text-[#7dd87d] mx-auto mb-4" />
          <p className="text-[#7dd87d]/80 text-sm animate-pulse">Loading campaign...</p>
        </div>
      </div>
    );
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
              className="w-full bg-[#4a7c59] hover:bg-[#2e7d32]"
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
              onClick={() => navigate(`/campaigns/${id}`)}
              variant="outline"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Campaign
            </Button>
            <Button 
              onClick={() => navigate('/campaigns')}
              className="w-full bg-[#4a7c59] hover:bg-[#2e7d32]"
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
  const rejectedContributions = allContributions?.filter(c => c.status === 'rejected') || [];
  
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
    
    updateStatusMutation.mutate({
      contributionId: selectedContribution.id,
      status: actionType === 'accept' ? 'accepted' : 'rejected',
      ownerNotes: ownerNotes.trim() || undefined,
    });
  };
  
  // Contribution card component
  const ContributionCard = ({ contribution, showActions = false }: { contribution: any; showActions?: boolean }) => (
    <Card className="bg-white border-gray-200">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {getContributionIcon(contribution.contributionType)}
            <div>
              <CardTitle className="text-base text-[#1a472a]">{contribution.title}</CardTitle>
              <CardDescription className="capitalize">{contribution.contributionType}</CardDescription>
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
                contribution.status === 'rejected' ? 'bg-red-500' :
                'bg-gray-500'
              }
            >
              {contribution.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Contributor Info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{contribution.contributorName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <a href={`mailto:${contribution.contributorEmail}`} className="hover:underline">
              {contribution.contributorEmail}
            </a>
          </div>
          {contribution.contributorPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
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
        
        {/* Submitted date */}
        <p className="text-xs text-gray-400">
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
      </CardContent>
    </Card>
  );
  
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
                onClick={() => navigate(`/campaigns/${id}`)}
                className="mb-2 -ml-2 text-[#1a472a]/60 hover:text-[#1a472a]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Campaign
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Manage: {campaign.title}
              </h1>
              <p className="text-[#1a472a]/60 mt-1">{campaign.projectName}</p>
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
              <span className="text-[#1a472a]/60">Campaign Progress</span>
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
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">{rejectedContributions.length}</div>
              <div className="text-xs text-red-600">Rejected</div>
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
            <TabsTrigger value="rejected" className="text-sm">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected ({rejectedContributions.length})
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
          
          {/* Rejected Contributions */}
          <TabsContent value="rejected" className="space-y-4">
            {rejectedContributions.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Rejected Contributions</h3>
                  <p className="text-gray-500">Rejected contributions will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedContributions.map((contribution) => (
                  <ContributionCard key={contribution.id} contribution={contribution} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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

      {/* Accept/Reject Dialog */}
      <Dialog open={!!selectedContribution && !!actionType} onOpenChange={() => {
        setSelectedContribution(null);
        setActionType(null);
        setOwnerNotes('');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={actionType === 'accept' ? 'text-green-700' : 'text-red-700'}>
              {actionType === 'accept' ? 'Accept Contribution' : 'Reject Contribution'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept' 
                ? 'This contribution will be added to your campaign totals.'
                : 'This contribution will be marked as rejected.'}
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
                <Label htmlFor="notes">Message to Contributor (optional)</Label>
                <Textarea
                  id="notes"
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  placeholder={
                    actionType === 'accept' 
                      ? "Thank you for your contribution! We'll be in touch soon..."
                      : "Thank you for your interest. Unfortunately..."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedContribution(null);
                setActionType(null);
                setOwnerNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateStatusMutation.isPending}
              className={actionType === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'accept' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
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
