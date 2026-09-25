import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Coins, ExternalLink, Heart, Pin } from "lucide-react";
import type { ContributionNeed } from "@/components/ContributionModal";
import { CRYPTO_PAYMENT_CONTEXT, type CapitalType } from "@shared/crowdpoolingTaxonomy";
import { KIND_LABELS, descriptionForItem, kindForItem, titleForItem } from "@/lib/needDisplay";
import { fullTimeLabel, isHoursNeed, roleFillState } from "@shared/roleCapacity";

function formatDay(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Reads a shift value into a Date without flipping between UTC and local. A
 * Date passes straight through; a bare "YYYY-MM-DD HH:mm:ss" (no zone) is read
 * as local time the same way the Date path is, so start and end can never end
 * up on different clocks.
 */
function toLocalDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  const s = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(d) ? d.replace(' ', 'T') : d;
  return new Date(s);
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * A shift window in the viewer's own timezone and locale. Start and end run
 * through one formatter, so an evening shift reads as an evening shift. The
 * date only repeats when the shift crosses midnight, so a two-day shift shows
 * both dates instead of looking like one long night.
 */
function formatShiftWindow(start: string | Date, end: string | Date): string {
  const s = toLocalDate(start);
  const e = toLocalDate(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const startLabel = `${s.toLocaleDateString(undefined, dateOpts)}, ${s.toLocaleTimeString(undefined, timeOpts)}`;
  const endLabel = sameLocalDay(s, e)
    ? e.toLocaleTimeString(undefined, timeOpts)
    : `${e.toLocaleDateString(undefined, dateOpts)}, ${e.toLocaleTimeString(undefined, timeOpts)}`;
  return `${startLabel} to ${endLabel}`;
}

export function NeedCard({
  item,
  capital,
  accent,
  campaignActive,
  claimsHidden = false,
  formatCurrency,
  onClaim,
}: {
  item: any;
  capital: CapitalType;
  accent: string;
  campaignActive: boolean;
  claimsHidden?: boolean;
  formatCurrency: (amount: number) => string;
  onClaim: (need: ContributionNeed) => void;
}) {
  const kind = kindForItem(item);
  const title = titleForItem(item);
  const description = descriptionForItem(item);
  // A role measured in hours a week (capacityUnit 'hours_per_week') keeps its
  // meter in hours: wanted is the hours needed, claimed the hours accepted,
  // delivered the hours delivered. A legacy role still on 'count' reads as
  // slots, exactly as before.
  const hoursNeed = isHoursNeed(item);
  const fill = hoursNeed
    ? roleFillState({
        kind: item.kind,
        capacityUnit: item.capacityUnit,
        quantityWanted: item.quantityWanted || 0,
        quantityClaimed: item.quantityClaimed || 0,
        quantityDelivered: item.quantityDelivered || 0,
        estimatedValue: item.estimatedValue || 0,
      })
    : null;
  const wanted = fill ? Math.max(fill.needed, 1) : (item.quantityWanted || 1);
  const claimed = fill ? fill.accepted : (item.quantityClaimed || 0);
  const delivered = fill ? fill.delivered : (item.quantityDelivered || 0);
  const claimedPct = Math.min((claimed / wanted) * 100, 100);
  const deliveredPct = Math.min((delivered / wanted) * 100, 100);
  const filled = fill ? fill.filled : claimed >= wanted;

  // Fiat asks render as recommended-funder CTA cards. Money never touches us.
  if (kind === 'financial_link') {
    const linkUrl = item.videoUrl
      || (String(item.resourceDescription || item.landDescription || '').match(/https?:\/\/\S+/) || [])[0];
    return (
      <Card className="bg-white/95 backdrop-blur border-dashed" style={{ borderColor: `${accent}80` }}>
        <CardHeader className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ExternalLink className="w-6 h-6 flex-shrink-0" style={{ color: accent }} />
              <div>
                <CardTitle className="text-[#1a472a] text-base">{title}</CardTitle>
                <CardDescription>You'll finish this on the recommended funder's site.</CardDescription>
              </div>
            </div>
            {linkUrl && (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="border-[#4a7c59] text-[#4a7c59]">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open funder site
                </Button>
              </a>
            )}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="bg-white backdrop-blur border-l-4 flex flex-col h-full transition-shadow hover:shadow-md"
      style={{ borderLeftColor: accent }}
    >
      <CardHeader className="p-4 md:p-5 pb-3">
        <div className="flex items-start gap-3">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={title}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${accent}1a`, color: accent }}
              >
                {KIND_LABELS[kind] || kind}
              </span>
              {fill?.filled && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a472a]/10 text-[#1a472a]">
                  Filled
                </span>
              )}
              {!!item.priorityPinned && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#d4a017]/15 text-[#d4a017] flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  Priority
                </span>
              )}
            </div>
            <CardTitle className="text-[#1a472a] text-base leading-snug">{title}</CardTitle>
            {fill && (
              <p className="text-sm text-[#1a472a]/85 mt-0.5">
                Needs {fill.needed} hours a week ({fullTimeLabel(fill.needed)})
              </p>
            )}
            {description && (
              <CardDescription className="mt-1 line-clamp-2 text-sm">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-5 pt-0 mt-auto space-y-3">
        {/* Slot meter: delivered solid in the capital color, claimed lighter */}
        <div>
          <div className="w-full bg-[#1a472a]/10 rounded-full h-2 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${claimedPct}%`, backgroundColor: `${accent}59` }} />
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${deliveredPct}%`, backgroundColor: accent }} />
          </div>
          {fill ? (
            <p className="text-xs text-[#1a472a]/75 mt-1.5">
              {fill.accepted} of {fill.needed} hours a week filled
              {fill.delivered > 0 ? `, ${fill.delivered} delivered` : ''}
            </p>
          ) : (
            <p className="text-xs text-[#1a472a]/75 mt-1.5">
              {delivered} of {wanted} delivered
              {claimed > delivered ? `, ${claimed - delivered} more claimed` : ''}
            </p>
          )}
        </div>
        {(item.needDeadline || item.shiftStartsAt || item.loanWindowStart) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1a472a]/75">
            {item.needDeadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" style={{ color: accent }} />
                Needed by {formatDay(item.needDeadline)}
              </span>
            )}
            {item.shiftStartsAt && item.shiftEndsAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" style={{ color: accent }} />
                {formatShiftWindow(item.shiftStartsAt, item.shiftEndsAt)}
              </span>
            )}
            {item.loanWindowStart && item.loanWindowEnd && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" style={{ color: accent }} />
                On loan {formatDay(item.loanWindowStart)} to {formatDay(item.loanWindowEnd)}
              </span>
            )}
          </div>
        )}
        {kind === 'crypto' && (
          <p className="text-xs text-[#1a472a]/75 flex items-start gap-1">
            <Coins className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            {CRYPTO_PAYMENT_CONTEXT.helperText}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-lg font-bold" style={{ color: accent }}>
            {formatCurrency(item.estimatedValue || 0)}
          </div>
          {claimsHidden ? null : fill && fill.filled ? (
            <span className="text-sm font-semibold text-[#1a472a]/75 text-right">
              This role is filled
            </span>
          ) : (
            <Button
              size="sm"
              className="text-white"
              style={{ backgroundColor: filled ? '#9ca3af' : accent }}
              disabled={!campaignActive || filled}
              onClick={() =>
                onClaim({
                  id: item.id,
                  kind,
                  capitalType: capital,
                  title,
                  quantityWanted: fill ? fill.needed : wanted,
                  quantityClaimed: claimed,
                  quantityDelivered: delivered,
                  estimatedValue: item.estimatedValue || 0,
                  capacityUnit: item.capacityUnit ?? null,
                  hoursPerWeek: item.hoursPerWeek ?? null,
                  shiftStartsAt: item.shiftStartsAt,
                  shiftEndsAt: item.shiftEndsAt,
                  loanWindowStart: item.loanWindowStart,
                  loanWindowEnd: item.loanWindowEnd,
                })
              }
            >
              <Heart className="w-4 h-4 mr-2" />
              {filled ? 'Filled' : fill ? 'Offer your time' : 'Claim'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
