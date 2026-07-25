/**
 * Contribution Aggregation Component
 * Shows all submitted proposals with total pooled resources and contributor breakdown
 * For project owners to view and manage contributions to their projects
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Eye,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Coins,
  Briefcase,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface ContributionAggregationProps {
  projectId: number;
  projectName: string;
  targetAmount: number;
  currency: string;
}

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  PHP: '₱',
  JPY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: '$',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'Fr',
  CNY: '¥',
};

const formatCurrency = (amount: number, symbol: string) => {
  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toLocaleString()}`;
};

export default function ContributionAggregation({ 
  projectId, 
  projectName, 
  targetAmount, 
  currency 
}: ContributionAggregationProps) {
  const [expandedProposal, setExpandedProposal] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  
  const currencySymbol = currencySymbols[currency] || '$';
  
  // Fetch proposals for this project
  const proposalsQuery = trpc.crowdPoolingProposals.getByProject.useQuery({ projectId });
  const updateStatusMutation = trpc.crowdPoolingProposals.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Proposal status updated');
      proposalsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
  
  const proposals = proposalsQuery.data || [];
  
  // Filter proposals
  const filteredProposals = proposals.filter(p => 
    filterStatus === 'all' || p.status === filterStatus
  );
  
  // Calculate aggregated totals
  const acceptedProposals = proposals.filter(p => p.status === 'accepted');
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  
  // Parse contributions from JSON
  const parseContributions = (proposal: any) => {
    try {
      const immediate = JSON.parse(proposal.immediateContributions || '[]');
      const future = JSON.parse(proposal.futureContributions || '[]');
      return { immediate, future };
    } catch {
      return { immediate: [], future: [] };
    }
  };
  
  // Calculate totals for accepted proposals
  const acceptedTotals = acceptedProposals.reduce((acc, p) => {
    const { immediate, future } = parseContributions(p);
    const immediateValue = immediate.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    const futureValue = future.reduce((sum: number, c: any) => 
      sum + ((c.weeks || 0) * (c.hoursPerWeek || 0) * (c.hourlyRate || 0)), 0);
    
    // Count financial vs non-financial
    const financialImmediate = immediate
      .filter((c: any) => c.category === 'money')
      .reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    
    return {
      total: acc.total + immediateValue + futureValue,
      immediate: acc.immediate + immediateValue,
      future: acc.future + futureValue,
      financial: acc.financial + financialImmediate,
      contributors: acc.contributors + 1,
    };
  }, { total: 0, immediate: 0, future: 0, financial: 0, contributors: 0 });
  
  // Calculate totals for pending proposals
  const pendingTotals = pendingProposals.reduce((acc, p) => {
    const { immediate, future } = parseContributions(p);
    const immediateValue = immediate.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    const futureValue = future.reduce((sum: number, c: any) => 
      sum + ((c.weeks || 0) * (c.hoursPerWeek || 0) * (c.hourlyRate || 0)), 0);
    
    const financialImmediate = immediate
      .filter((c: any) => c.category === 'money')
      .reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    
    return {
      total: acc.total + immediateValue + futureValue,
      immediate: acc.immediate + immediateValue,
      future: acc.future + futureValue,
      financial: acc.financial + financialImmediate,
      contributors: acc.contributors + 1,
    };
  }, { total: 0, immediate: 0, future: 0, financial: 0, contributors: 0 });
  
  // Progress percentages
  const acceptedProgress = targetAmount > 0 ? (acceptedTotals.total / targetAmount) * 100 : 0;
  const pendingProgress = targetAmount > 0 ? (pendingTotals.total / targetAmount) * 100 : 0;
  const financialProgress = targetAmount > 0 ? (acceptedTotals.financial / targetAmount) * 100 : 0;
  
  if (proposalsQuery.isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#7dd87d]/30">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#7dd87d]/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            Contribution Dashboard
          </h3>
          <p className="text-sm text-[#1a472a]/80">{projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#1a472a]/80">{proposals.length} proposals</span>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#f0f7f0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#4a7c59]" />
            <span className="text-xs text-[#1a472a]/80">Contributors</span>
          </div>
          <p className="text-2xl font-bold text-[#1a472a]">{acceptedTotals.contributors}</p>
          <p className="text-xs text-[#4a7c59]">+{pendingTotals.contributors} pending</p>
        </div>
        
        <div className="bg-[#f0f7f0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#4a7c59]" />
            <span className="text-xs text-[#1a472a]/80">Total Accepted</span>
          </div>
          <p className="text-2xl font-bold text-[#1a472a]">{formatCurrency(acceptedTotals.total, currencySymbol)}</p>
          <p className="text-xs text-[#4a7c59]">{acceptedProgress.toFixed(1)}% of target</p>
        </div>
        
        <div className="bg-[#f0f7f0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-[#4a7c59]" />
            <span className="text-xs text-[#1a472a]/80">Financial</span>
          </div>
          <p className="text-2xl font-bold text-[#1a472a]">{formatCurrency(acceptedTotals.financial, currencySymbol)}</p>
          <p className="text-xs text-[#4a7c59]">{financialProgress.toFixed(1)}% of target</p>
        </div>
        
        <div className="bg-[#fff8e1] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-[#d4a017]" />
            <span className="text-xs text-[#1a472a]/80">Pending</span>
          </div>
          <p className="text-2xl font-bold text-[#1a472a]">{formatCurrency(pendingTotals.total, currencySymbol)}</p>
          <p className="text-xs text-[#d4a017]">{pendingTotals.contributors} awaiting review</p>
        </div>
      </div>
      
      {/* Dual Progress Bars */}
      <div className="space-y-4 mb-6">
        {/* Total Contributions Bar */}
        <div className="bg-[#f0f7f0] rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#1a472a] font-medium">Total Contributions</span>
            <span className="text-[#1a472a]/80">
              {formatCurrency(acceptedTotals.total + pendingTotals.total, currencySymbol)} / {formatCurrency(targetAmount, currencySymbol)}
            </span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-6">
            {/* Accepted (solid green) */}
            <div 
              className="absolute h-6 rounded-full bg-gradient-to-r from-[#4a7c59] to-[#7dd87d] transition-all duration-500"
              style={{ width: `${Math.min(acceptedProgress, 100)}%` }}
            />
            {/* Pending (striped pattern) */}
            <div 
              className="absolute h-6 rounded-r-full bg-[#7dd87d]/40 transition-all duration-500"
              style={{ 
                left: `${Math.min(acceptedProgress, 100)}%`,
                width: `${Math.min(pendingProgress, 100 - acceptedProgress)}%`,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)'
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-[#4a7c59]">Accepted: {formatCurrency(acceptedTotals.total, currencySymbol)}</span>
            <span className="text-[#d4a017]">Pending: {formatCurrency(pendingTotals.total, currencySymbol)}</span>
          </div>
        </div>
        
        {/* Financial Contributions Bar */}
        <div className="bg-[#f0f7f0] rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#1a472a] font-medium">Financial Contributions</span>
            <span className="text-[#1a472a]/80">
              {formatCurrency(acceptedTotals.financial + pendingTotals.financial, currencySymbol)} / {formatCurrency(targetAmount * 0.2, currencySymbol)} (20% target)
            </span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-6">
            <div 
              className="absolute h-6 rounded-full bg-gradient-to-r from-[#1a472a] to-[#4caf50] transition-all duration-500"
              style={{ width: `${Math.min((acceptedTotals.financial / (targetAmount * 0.2)) * 100, 100)}%` }}
            />
            <div 
              className="absolute h-6 rounded-r-full bg-[#4caf50]/40 transition-all duration-500"
              style={{ 
                left: `${Math.min((acceptedTotals.financial / (targetAmount * 0.2)) * 100, 100)}%`,
                width: `${Math.min((pendingTotals.financial / (targetAmount * 0.2)) * 100, 100 - (acceptedTotals.financial / (targetAmount * 0.2)) * 100)}%`,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 10px)'
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-[#1a472a]">Accepted: {formatCurrency(acceptedTotals.financial, currencySymbol)}</span>
            <span className="text-[#d4a017]">Pending: {formatCurrency(pendingTotals.financial, currencySymbol)}</span>
          </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['all', 'pending', 'accepted', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === status
                ? 'bg-[#4a7c59] text-white'
                : 'bg-[#f0f7f0] text-[#1a472a] hover:bg-[#e0efe0]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'pending' && pendingTotals.contributors > 0 && (
              <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                {pendingTotals.contributors}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Proposals List */}
      <div className="space-y-3">
        {filteredProposals.length === 0 ? (
          <div className="text-center py-8 text-[#1a472a]/80">
            No {filterStatus === 'all' ? '' : filterStatus} proposals yet.
          </div>
        ) : (
          filteredProposals.map((proposal) => {
            const { immediate, future } = parseContributions(proposal);
            const immediateValue = immediate.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
            const futureValue = future.reduce((sum: number, c: any) => 
              sum + ((c.weeks || 0) * (c.hoursPerWeek || 0) * (c.hourlyRate || 0)), 0);
            const totalValue = immediateValue + futureValue;
            const isExpanded = expandedProposal === proposal.id;
            
            return (
              <div 
                key={proposal.id}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  proposal.status === 'accepted' 
                    ? 'border-[#4a7c59]/30 bg-[#f0f7f0]/50'
                    : proposal.status === 'rejected'
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-[#7dd87d]/30'
                }`}
              >
                {/* Proposal Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-[#f0f7f0]/50 transition-colors"
                  onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        proposal.status === 'accepted' 
                          ? 'bg-[#4a7c59] text-white'
                          : proposal.status === 'rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-[#d4a017] text-white'
                      }`}>
                        {proposal.contributorName?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="font-medium text-[#1a472a]">{proposal.contributorName || 'Anonymous'}</p>
                        <p className="text-xs text-[#1a472a]/80">{proposal.contributorEmail || 'No email provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-[#1a472a]">{formatCurrency(totalValue, currencySymbol)}</p>
                        <p className="text-xs text-[#1a472a]/80">
                          {formatCurrency(immediateValue, currencySymbol)} immediate + {formatCurrency(futureValue, currencySymbol)} future
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        proposal.status === 'accepted' 
                          ? 'bg-[#4a7c59] text-white'
                          : proposal.status === 'rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-[#d4a017] text-white'
                      }`}>
                        {proposal.status}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#1a472a]/80" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#1a472a]/80" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#7dd87d]/20">
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      {/* Immediate Contributions */}
                      <div>
                        <h4 className="text-sm font-medium text-[#1a472a] mb-2 flex items-center gap-2">
                          <Coins className="w-4 h-4 text-[#4a7c59]" />
                          Immediate Contributions
                        </h4>
                        {immediate.length === 0 ? (
                          <p className="text-xs text-[#1a472a]/80">None</p>
                        ) : (
                          <div className="space-y-1">
                            {immediate.map((c: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm bg-white rounded p-2">
                                <span className="text-[#1a472a]/75">{c.description || c.category}</span>
                                <span className="font-medium text-[#1a472a]">{formatCurrency(c.value, currencySymbol)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Future Contributions */}
                      <div>
                        <h4 className="text-sm font-medium text-[#1a472a] mb-2 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#4a7c59]" />
                          Future Value Commitments
                        </h4>
                        {future.length === 0 ? (
                          <p className="text-xs text-[#1a472a]/80">None</p>
                        ) : (
                          <div className="space-y-1">
                            {future.map((c: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm bg-white rounded p-2">
                                <span className="text-[#1a472a]/75">
                                  {c.roleName}: {c.weeks}w x {c.hoursPerWeek}h/w @ {formatCurrency(c.hourlyRate, currencySymbol)}/h
                                </span>
                                <span className="font-medium text-[#1a472a]">
                                  {formatCurrency(c.weeks * c.hoursPerWeek * c.hourlyRate, currencySymbol)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    {proposal.status === 'pending' && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-[#7dd87d]/20">
                        <Button
                          onClick={() => updateStatusMutation.mutate({ 
                            id: proposal.id, 
                            status: 'accepted' 
                          })}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => updateStatusMutation.mutate({ 
                            id: proposal.id, 
                            status: 'rejected' 
                          })}
                          disabled={updateStatusMutation.isPending}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    {proposal.status !== 'pending' && (
                      <div className="mt-4 pt-4 border-t border-[#7dd87d]/20">
                        <Button
                          onClick={() => updateStatusMutation.mutate({ 
                            id: proposal.id, 
                            status: 'pending' 
                          })}
                          disabled={updateStatusMutation.isPending}
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                        >
                          Reset to Pending
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
