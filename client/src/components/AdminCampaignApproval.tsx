/**
 * Admin Campaign Approval Component
 * Shows campaign submissions with full detail view, approve/reject workflow.
 *
 * The review dialog reads the campaign's one progress reading
 * (campaign.progress, shared/campaignProgress.ts) as the compact two-line
 * bar, with the soft money-share note under the money ask (guidance only,
 * ruling 2026-09-24). It also carries the money routes the project added
 * (campaigns.getPartnerLinksForSteward), which only an admin verifies
 * (campaigns.reviewPartnerLink), and the Ready to crowdpool ticks the project
 * stored on the campaign (campaigns.getReadiness) beside the reviewer's own.
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { resolveAssetUrl } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, XCircle, Eye, Clock, MapPin, DollarSign, 
  Users, Calendar, Leaf, ChevronDown, ChevronUp, ExternalLink,
  FileText, Loader2, AlertTriangle, Sparkles, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { CrowdpoolReadiness } from './CrowdpoolReadiness';
import { TwoLineBar } from './crowdpool/TwoLineBar';
import { formatCloseDate, moneyShareNote } from '@shared/campaignProgress';
import { kindForItem, needTitle, roleTimeLine, thingWindowLine } from '@shared/crowdpoolNeedAction';
import { CASH_SHARE } from '@shared/crowdpoolModel';
import { ROUTE_LABELS, ROUTE_REVIEW, STEWARD_MONEY } from '@shared/crowdpoolCopy';

/** A currency formatter that survives codes Intl does not know (SEEDS, USDC). */
function currencyFormatter(currency: string | null | undefined): (n: number) => string {
  const code = currency || 'USD';
  try {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 });
    return (n: number) => fmt.format(n || 0);
  } catch {
    return (n: number) => `${Math.round(n || 0).toLocaleString('en-US')} ${code}`;
  }
}

function dayOf(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : formatCloseDate(d);
}

const REVIEW_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD'];

type ReviewRoute = {
  id: number;
  partner: string;
  label: string | null;
  url: string;
  proofUrl: string | null;
  status: string;
  reviewNote: string | null;
  cachedCurrency: string | null;
  createdAt: Date | string;
};

function RouteReviewRow({
  route,
  campaignCurrency,
  loanRoutesOpen,
  pending,
  onReview,
}: {
  route: ReviewRoute;
  campaignCurrency: string;
  loanRoutesOpen: boolean;
  pending: boolean;
  onReview: (decision: 'verified' | 'rejected', currency: string, note: string) => void;
}) {
  const [currency, setCurrency] = useState((route.cachedCurrency || campaignCurrency || 'USD').toUpperCase());
  const [note, setNote] = useState(route.reviewNote ?? '');
  const reviewable = route.status === 'pending' || route.status === 'rejected';
  const loanBlocked = route.partner === 'gosteward' && !loanRoutesOpen;
  const label = route.partner === 'maearth' || route.partner === 'gosteward' ? ROUTE_LABELS[route.partner] : (route.label ?? route.partner);
  const added = dayOf(route.createdAt);
  const currencies = Array.from(new Set([currency, campaignCurrency.toUpperCase(), ...REVIEW_CURRENCIES]));
  const statusText = (ROUTE_REVIEW.status as Record<string, string>)[route.status] ?? ROUTE_REVIEW.status.pending;

  return (
    <li className="rounded-lg bg-[#f8f5f0] p-3 space-y-2 min-w-0" data-testid={`route-review-${route.id}`}>
      <p className="text-sm font-semibold text-[#1a472a]">{label}</p>
      {route.status !== 'example' && (
        <a href={route.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#4a7c59] underline break-all min-h-11">
          <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {route.url}
        </a>
      )}
      {route.proofUrl && (
        <p className="text-xs text-[#1a472a]/80">
          {ROUTE_REVIEW.proof}:{' '}
          <a href={route.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[#4a7c59] underline break-all">
            {route.proofUrl}
          </a>
        </p>
      )}
      <p className="text-xs text-[#1a472a]/80">
        {added ? `${ROUTE_REVIEW.added(added)}. ` : ''}{statusText}
        {route.status === 'rejected' && route.reviewNote ? ` ${route.reviewNote}` : ''}
      </p>
      {reviewable && (
        <div className="space-y-2 pt-1">
          <div>
            <label htmlFor={`route-currency-${route.id}`} className="block text-xs font-medium text-[#1a472a] mb-1">
              {ROUTE_REVIEW.currencyLabel}
            </label>
            <select
              id={`route-currency-${route.id}`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full min-h-11 rounded-md border border-[#1a472a]/20 bg-white px-3 text-base md:text-sm text-[#1a472a]"
            >
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`route-note-${route.id}`} className="block text-xs font-medium text-[#1a472a] mb-1">
              {ROUTE_REVIEW.noteLabel}
            </label>
            <Textarea
              id={`route-note-${route.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={2}
              className="border-[#1a472a]/20 text-base md:text-sm"
            />
          </div>
          {loanBlocked && <p className="text-xs font-medium text-[#1a472a]">{ROUTE_REVIEW.loanRailOff}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || loanBlocked}
              onClick={() => onReview('verified', currency, note)}
              className="min-h-11 bg-green-700 hover:bg-green-800 text-white"
            >
              {ROUTE_REVIEW.verify}
            </Button>
            {route.status === 'pending' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => onReview('rejected', currency, note)}
                className="min-h-11 border-red-300 text-red-700 hover:bg-red-50"
              >
                {ROUTE_REVIEW.dontShow}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function MoneyRoutesToCheck({ campaignId, campaignCurrency }: { campaignId: number; campaignCurrency: string }) {
  const utils = trpc.useUtils();
  const { data: routes, isLoading } = trpc.campaigns.getPartnerLinksForSteward.useQuery({ campaignId }, { retry: false });
  const { data: settings } = trpc.campaigns.crowdpoolSettings.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const review = trpc.campaigns.reviewPartnerLink.useMutation({
    onSuccess: (res) => {
      toast.success(res.status === 'verified' ? ROUTE_REVIEW.verifiedDone : ROUTE_REVIEW.rejectedDone);
      utils.campaigns.getPartnerLinksForSteward.invalidate({ campaignId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="border-t border-[#1a472a]/10 pt-4">
      <h4 className="text-sm font-bold text-[#1a472a] mb-1">{ROUTE_REVIEW.heading}</h4>
      <p className="text-xs text-[#1a472a]/80 mb-3">{ROUTE_REVIEW.intro}</p>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#4a7c59]" />
      ) : !routes || routes.length === 0 ? (
        <p className="text-sm text-[#1a472a]/80">{ROUTE_REVIEW.none}</p>
      ) : (
        <ul className="space-y-2">
          {routes.map((r) => (
            <RouteReviewRow
              key={r.id}
              route={r}
              campaignCurrency={campaignCurrency}
              loanRoutesOpen={settings?.loanRoutesOpen ?? false}
              pending={review.isPending}
              onReview={(decision, currency, note) =>
                review.mutate({
                  linkId: r.id,
                  decision,
                  ...(decision === 'verified' ? { currency } : {}),
                  ...(decision === 'rejected' && note.trim() ? { note: note.trim() } : {}),
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// 'funded' stays readable for old rows only. Nothing here sets it: an admin
// marks a campaign complete (status 'completed').
type CampaignStatus = 'pending_review' | 'active' | 'rejected' | 'draft' | 'completed' | 'cancelled';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_review: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3 h-3" /> },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <FileText className="w-3 h-3" /> },
  funded: { label: 'Complete', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Sparkles className="w-3 h-3" /> },
  completed: { label: 'Complete', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Sparkles className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <XCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1 text-xs`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function CampaignDetailModal({ campaignId, onClose, onStatusChange }: { 
  campaignId: number; 
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const { data: campaign, isLoading } = trpc.campaigns.getById.useQuery({ id: campaignId });
  const { data: settings } = trpc.campaigns.crowdpoolSettings.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const { data: projectTicks } = trpc.campaigns.getReadiness.useQuery({ campaignId }, { retry: false });
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const updateStatusMutation = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => {
      onStatusChange();
      toast.success('Campaign status updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    const title = campaign?.title ?? 'this campaign';
    if (newStatus === 'completed' && !window.confirm(`Mark ${title} complete? Its stewards and contributors with an account hear about it. This can't be undone.`)) return;
    if (newStatus === 'cancelled' && !window.confirm(`Cancel ${title}? Every offer that is waiting or accepted closes, and everyone involved is told. This can't be undone.`)) return;
    setActionLoading(newStatus);
    try {
      // Review notes travel with an approval or a decline: they are saved on
      // the campaign and shown to its stewards in their notice.
      const notes = reviewNotes.trim();
      await updateStatusMutation.mutateAsync({
        id: campaignId,
        status: newStatus,
        ...((newStatus === 'active' || newStatus === 'rejected') && notes ? { reviewNotes: notes } : {}),
      });
    } catch {
      // onError already showed the server's message.
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#4a7c59]" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-center py-8 text-[#1a472a]/80">Campaign not found</div>;
  }

  const formatMoney = currencyFormatter(campaign.currency);
  const progress = campaign.progress;
  const shareNote = moneyShareNote({
    inKindAsk: progress.inKind.ask,
    moneyAsk: progress.money.ask,
    asksNone: progress.money.asksNone,
    band: settings?.moneyShare ?? CASH_SHARE,
  });

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            {campaign.title}
          </h2>
          <p className="text-sm text-[#1a472a]/80">{campaign.projectName}</p>
          {campaign.location && (
            <div className="flex items-center gap-1 text-sm text-[#1a472a]/80 mt-1">
              <MapPin className="w-3 h-3" />
              {campaign.location}
            </div>
          )}
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* The two-line bar: the same reading the project page shows */}
      <div className="rounded-lg bg-white border border-[#1a472a]/10 p-3">
        <TwoLineBar progress={progress} formatCurrency={formatMoney} variant="compact" />
      </div>

      {/* The ask, in-kind and money, with the soft money-share note */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#f0f7f0] rounded-lg p-3">
          <p className="text-xs text-[#1a472a]/80">{STEWARD_MONEY.inKindAsked}</p>
          <p className="text-lg font-bold text-[#1a472a]">{formatMoney(progress.inKind.ask)}</p>
        </div>
        <div className="bg-[#f0f7f0] rounded-lg p-3">
          <p className="text-xs text-[#1a472a]/80">{STEWARD_MONEY.moneyAsked}</p>
          <p className="text-lg font-bold text-[#1a472a]">{formatMoney(progress.money.ask)}</p>
          {shareNote.line && (
            <p className={`text-xs mt-1 ${shareNote.outside ? 'text-[#1a472a] font-medium' : 'text-[#1a472a]/80'}`}>{shareNote.line}</p>
          )}
        </div>
        <div className="bg-[#f0f7f0] rounded-lg p-3">
          <p className="text-xs text-[#1a472a]/80">{STEWARD_MONEY.landValue}</p>
          <p className="text-lg font-bold text-[#1a472a]">{formatMoney(campaign.landValue)}</p>
        </div>
        <div className="bg-[#f0f7f0] rounded-lg p-3">
          <p className="text-xs text-[#1a472a]/80">{STEWARD_MONEY.duration}</p>
          <p className="text-lg font-bold text-[#1a472a]">{STEWARD_MONEY.days(String(campaign.durationDays || 90))}</p>
        </div>
      </div>

      {/* Project Details Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#f0f7f0] w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-[#1a472a] data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="items" className="text-xs data-[state=active]:bg-[#1a472a] data-[state=active]:text-white">Items ({campaign.items?.length || 0})</TabsTrigger>
          <TabsTrigger value="images" className="text-xs data-[state=active]:bg-[#1a472a] data-[state=active]:text-white">Photos ({campaign.images?.length || 0})</TabsTrigger>
          <TabsTrigger value="details" className="text-xs data-[state=active]:bg-[#1a472a] data-[state=active]:text-white">Full Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {campaign.vision && (
            <div>
              <h4 className="text-sm font-bold text-[#1a472a] mb-1">Vision</h4>
              <p className="text-sm text-[#1a472a]/75">{campaign.vision}</p>
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-[#1a472a] mb-1">Description</h4>
            <p className="text-sm text-[#1a472a]/75">{campaign.description}</p>
          </div>
          {campaign.videoUrl && (
            <div>
              <h4 className="text-sm font-bold text-[#1a472a] mb-1">Video</h4>
              <a href={campaign.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {campaign.videoUrl}
              </a>
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          {campaign.items && campaign.items.length > 0 ? (
            <div className="space-y-2">
              {campaign.items.map((item) => {
                // What the need asks and when, as the project page words it.
                const detail = thingWindowLine(item) ?? roleTimeLine(item);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 bg-[#f8f5f0] rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1a472a] break-words">{needTitle(item)}</p>
                      <p className="text-xs text-[#1a472a]/80">{kindForItem(item)} | {item.capitalType}</p>
                      {detail && <p className="text-xs text-[#1a472a]/80 mt-1">{detail}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#1a472a]">{formatMoney(item.estimatedValue)}</p>
                      <p className="text-xs text-[#1a472a]/80">Qty: {item.quantityWanted}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#1a472a]/80 text-center py-4">No items added yet</p>
          )}
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          {campaign.images && campaign.images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {campaign.images.map((img: any) => (
                <div key={img.id} className="aspect-square rounded-lg overflow-hidden relative group">
                  <img src={resolveAssetUrl(img.imageUrl)} alt={img.caption || ''} className="w-full h-full object-cover" width={400} height={400} loading="lazy" />
                  {img.caption && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.caption}
                    </div>
                  )}
                  {img.isCover === 1 && (
                    <Badge className="absolute top-1 left-1 bg-[#7dd87d] text-[#1a472a] text-[10px]">Cover</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#1a472a]/80 text-center py-4">No photos uploaded yet</p>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Land Status', value: campaign.landStatus },
              { label: 'Land Size', value: campaign.landSize },
              { label: 'Current Phase', value: campaign.currentPhase },
              { label: 'Timeline', value: campaign.timeline },
              { label: 'Legal Structure', value: campaign.legalStructure },
              { label: 'Governance Model', value: campaign.governanceModel },
              { label: 'Membership Model', value: campaign.membershipModel },
              { label: 'Housing Plans', value: campaign.housingPlans },
              { label: 'Food Systems', value: campaign.foodSystems },
              { label: 'Water Systems', value: campaign.waterSystems },
              { label: 'Energy Systems', value: campaign.energySystems },
              { label: 'Education Programs', value: campaign.educationPrograms },
              { label: 'Community Engagement', value: campaign.communityEngagement },
              { label: 'Impact Metrics', value: campaign.impactMetrics },
              { label: 'Challenges', value: campaign.challenges },
              { label: 'Team Size', value: campaign.teamSize ? `${campaign.teamSize} members` : null },
              { label: 'Website', value: campaign.websiteUrl },

            ].filter(f => f.value).map((field) => (
              <div key={field.label} className="bg-[#f8f5f0] rounded-lg p-3">
                <p className="text-xs font-medium text-[#1a472a]/80">{field.label}</p>
                <p className="text-sm text-[#1a472a]">{field.value}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ready to crowdpool: what the review checks before approving */}
      <div className="border-t border-[#1a472a]/10 pt-4">
        <h4 className="text-sm font-bold text-[#1a472a] mb-1">Ready to crowdpool</h4>
        <p className="text-xs text-[#1a472a]/80 mb-3">
          Check each against what the project shows. Anything missing goes in the review notes.
        </p>
        <CrowdpoolReadiness framed={false} audience="review" storageKey={`review-${campaign.id}`} projectTicks={projectTicks} />
      </div>

      <MoneyRoutesToCheck campaignId={campaign.id} campaignCurrency={campaign.currency || 'USD'} />

      {/* Admin Review Notes */}
      <div className="border-t border-[#1a472a]/10 pt-4">
        <h4 className="text-sm font-bold text-[#1a472a] mb-1">Review notes</h4>
        <p className="text-xs text-[#1a472a]/80 mb-2">
          Sent to the project's stewards with an approval or a decline.
        </p>
        <Textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="What the stewards should know, or what to change before this goes live"
          className="mb-3 border-[#1a472a]/20"
          rows={3}
          maxLength={2000}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 border-t border-[#1a472a]/10 pt-4">
        {campaign.status === 'pending_review' && (
          <>
            <Button
              onClick={() => handleStatusChange('active')}
              disabled={actionLoading !== null}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading === 'active' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Approve & Publish
            </Button>
            <Button
              onClick={() => handleStatusChange('rejected')}
              disabled={actionLoading !== null}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {actionLoading === 'rejected' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
          </>
        )}
        {campaign.status === 'active' && (
          <>
            <Button
              onClick={() => handleStatusChange('completed')}
              disabled={actionLoading !== null}
              className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
            >
              {actionLoading === 'completed' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Mark complete
            </Button>
            <Button
              onClick={() => handleStatusChange('cancelled')}
              disabled={actionLoading !== null}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {actionLoading === 'cancelled' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Cancel Campaign
            </Button>
          </>
        )}
        {campaign.status === 'rejected' && (
          <Button
            onClick={() => handleStatusChange('active')}
            disabled={actionLoading !== null}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve & Publish
          </Button>
        )}
        <Button variant="outline" onClick={onClose} className="border-[#1a472a]/20 text-[#1a472a]">
          Close
        </Button>
      </div>
    </div>
  );
}

export function AdminCampaignApproval() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  
  // Fetch all campaigns (no status filter to get everything)
  const { data: allCampaigns, isLoading } = trpc.campaigns.list.useQuery({});
  
  const campaigns = allCampaigns?.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  }) || [];

  const pendingCount = allCampaigns?.filter(c => c.status === 'pending_review').length || 0;
  const activeCount = allCampaigns?.filter(c => c.status === 'active').length || 0;
  const rejectedCount = allCampaigns?.filter(c => c.status === 'rejected').length || 0;

  const handleStatusChange = () => {
    utils.campaigns.list.invalidate();
    setSelectedCampaignId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <FileText className="w-5 h-5" />
            Campaign Submissions
          </CardTitle>
          <CardDescription>
            Review and approve campaign proposals from land projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' ? 'bg-[#1a472a] text-white' : 'border-[#1a472a]/20 text-[#1a472a]'}
            >
              All ({allCampaigns?.length || 0})
            </Button>
            <Button
              variant={statusFilter === 'pending_review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending_review')}
              className={statusFilter === 'pending_review' ? 'bg-amber-600 text-white' : 'border-amber-200 text-amber-700'}
            >
              <Clock className="w-3 h-3 mr-1" />
              Pending ({pendingCount})
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
              className={statusFilter === 'active' ? 'bg-green-600 text-white' : 'border-green-200 text-green-700'}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active ({activeCount})
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('rejected')}
              className={statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'border-red-200 text-red-700'}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Rejected ({rejectedCount})
            </Button>
          </div>

          {/* Campaign list */}
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#4a7c59] mx-auto" />
              <p className="mt-2 text-sm text-[#1a472a]/80">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-[#1a472a]/20 mx-auto mb-3" />
              <p className="text-[#1a472a]/80">No campaigns found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-[#f8f5f0] rounded-xl p-4 hover:bg-[#f0ede5] transition-colors cursor-pointer border border-transparent hover:border-[#7dd87d]/30"
                  onClick={() => setSelectedCampaignId(campaign.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-[#1a472a] text-sm truncate">{campaign.title}</h4>
                      <StatusBadge status={campaign.status} />
                    </div>
                    <p className="text-xs text-[#1a472a]/80 mb-1">{campaign.projectName}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#1a472a]/80">
                      {campaign.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {campaign.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {campaign.currency} {campaign.totalValue.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaignId(campaign.id);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Review
                    </Button>
                    {campaign.status === 'pending_review' && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Needs Review
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={selectedCampaignId !== null} onOpenChange={(open) => !open && setSelectedCampaignId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              Campaign Review
            </DialogTitle>
          </DialogHeader>
          {selectedCampaignId && (
            <CampaignDetailModal
              campaignId={selectedCampaignId}
              onClose={() => setSelectedCampaignId(null)}
              onStatusChange={handleStatusChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminCampaignApproval;
