import { useMemo } from 'react';
import { Clock, Users, TrendingUp, AlertTriangle } from 'lucide-react';

interface CampaignProgressTrackerProps {
  totalValue: number;
  pledgedTotal: number;
  financialTarget: number;
  pledgedFinancial: number;
  contributorsCount: number;
  durationDays: number;
  startedAt: string | Date | null;
  status: string;
  currency?: string;
  compact?: boolean; // For card view
}

function formatCurrency(amount: number, symbol: string = '$'): string {
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', CAD: 'C$', AUD: 'A$',
    CHF: 'CHF', CNY: '\u00A5', INR: '\u20B9', MXN: 'MX$', BRL: 'R$', KRW: '\u20A9',
  };
  return symbols[currency] || '$';
}

export function CampaignProgressTracker({
  totalValue,
  pledgedTotal,
  financialTarget,
  pledgedFinancial,
  contributorsCount,
  durationDays,
  startedAt,
  status,
  currency = 'USD',
  compact = false,
}: CampaignProgressTrackerProps) {
  const symbol = getCurrencySymbol(currency);

  const { daysRemaining, daysElapsed, percentTimeUsed, isExpired } = useMemo(() => {
    if (!startedAt) {
      return { daysRemaining: durationDays, daysElapsed: 0, percentTimeUsed: 0, isExpired: false };
    }
    const start = new Date(startedAt);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, durationDays - elapsed);
    return {
      daysRemaining: remaining,
      daysElapsed: elapsed,
      percentTimeUsed: Math.min(100, (elapsed / durationDays) * 100),
      isExpired: remaining === 0,
    };
  }, [startedAt, durationDays]);

  const totalGoal = totalValue + financialTarget;
  const totalRaised = pledgedTotal + pledgedFinancial;
  const fundingPercent = totalGoal > 0 ? Math.min(100, (totalRaised / totalGoal) * 100) : 0;

  const urgencyLevel = useMemo(() => {
    if (isExpired) return 'expired';
    if (daysRemaining <= 7) return 'critical';
    if (daysRemaining <= 14) return 'urgent';
    if (percentTimeUsed > 75 && fundingPercent < 50) return 'behind';
    return 'normal';
  }, [isExpired, daysRemaining, percentTimeUsed, fundingPercent]);

  const progressColor = useMemo(() => {
    if (fundingPercent >= 100) return 'bg-[#4a7c59]';
    if (fundingPercent >= 75) return 'bg-[#7dd87d]';
    if (fundingPercent >= 50) return 'bg-[#d4a574]';
    return 'bg-[#4a7c59]';
  }, [fundingPercent]);

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="w-full bg-[#f0f7f0] rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${fundingPercent}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1a472a]">
            {fundingPercent.toFixed(0)}% funded
          </span>
          <div className="flex items-center gap-3 text-[#1a472a]/60">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {contributorsCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {status === 'active' ? (
                isExpired ? (
                  <span className="text-red-500">Ended</span>
                ) : (
                  `${daysRemaining}d left`
                )
              ) : status === 'pending_review' ? (
                <span className="text-amber-600">Pending</span>
              ) : status === 'funded' ? (
                <span className="text-[#4a7c59]">Funded!</span>
              ) : (
                status
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full view for detail page
  return (
    <div className="bg-white rounded-2xl border border-[#7dd87d]/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4a7c59] to-[#1a472a] px-5 py-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <TrendingUp className="w-5 h-5" />
            Campaign Progress
          </h3>
          {urgencyLevel === 'critical' && (
            <span className="flex items-center gap-1 bg-red-500/20 text-red-200 px-2 py-1 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left!
            </span>
          )}
          {urgencyLevel === 'expired' && (
            <span className="flex items-center gap-1 bg-red-500/20 text-red-200 px-2 py-1 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              Campaign ended
            </span>
          )}
        </div>

        {/* Main progress bar */}
        <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-[#7dd87d] transition-all duration-700 relative"
            style={{ width: `${fundingPercent}%` }}
          >
            {fundingPercent >= 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1a472a]">
                {fundingPercent.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="opacity-80">
            {formatCurrency(totalRaised, symbol)} raised
          </span>
          <span className="font-bold">
            of {formatCurrency(totalGoal, symbol)}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x divide-[#7dd87d]/20">
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">{fundingPercent.toFixed(0)}%</div>
          <div className="text-xs text-[#1a472a]/60 mt-1">Funded</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-[#4a7c59]">{contributorsCount}</div>
          <div className="text-xs text-[#1a472a]/60 mt-1">Contributors</div>
        </div>
        <div className="p-4 text-center">
          <div className={`text-2xl font-bold ${
            urgencyLevel === 'critical' || urgencyLevel === 'expired' ? 'text-red-500' : 
            urgencyLevel === 'urgent' ? 'text-amber-500' : 'text-[#4a7c59]'
          }`}>
            {status === 'active' ? (
              isExpired ? 0 : daysRemaining
            ) : status === 'pending_review' ? (
              <span className="text-lg">--</span>
            ) : status === 'funded' ? (
              <span className="text-lg text-[#4a7c59]">Done</span>
            ) : (
              '--'
            )}
          </div>
          <div className="text-xs text-[#1a472a]/60 mt-1">
            {status === 'active' ? 'Days Left' : status === 'pending_review' ? 'Pending Review' : 'Status'}
          </div>
        </div>
      </div>

      {/* Time progress bar */}
      {status === 'active' && startedAt && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs text-[#1a472a]/50 mb-1">
            <span>Day {daysElapsed} of {durationDays}</span>
            <span>{percentTimeUsed.toFixed(0)}% time elapsed</span>
          </div>
          <div className="w-full bg-[#f0f7f0] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                urgencyLevel === 'critical' || urgencyLevel === 'expired' ? 'bg-red-400' :
                urgencyLevel === 'urgent' ? 'bg-amber-400' : 'bg-[#4a7c59]/40'
              }`}
              style={{ width: `${percentTimeUsed}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignProgressTracker;
