/**
 * One need on a project page (build spec 2026-09-25, section 8.4).
 *
 * The button carries the need's verb (shared/crowdpoolNeedAction.ts): Apply
 * for roles and knowledge sessions, Offer for things, Sign up for shifts. The
 * status under the meter comes from the campaign's progress reading
 * (shared/campaignProgress.ts needStatus), in words. Roles, shifts and
 * knowledge sessions show no dollar figure (no price in front of a person's
 * time); things keep theirs. The root carries id="need-{id}" so a link can
 * land on it (the Needs tab, a shared need).
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Heart, Pin } from "lucide-react";
import type { ContributionNeed } from "@/components/ContributionModal";
import type { CapitalType } from "@shared/crowdpoolingTaxonomy";
import { KIND_LABELS, descriptionForItem, kindForItem, titleForItem } from "@/lib/needDisplay";
import { fullTimeLabel, isHoursNeed, roleFillState } from "@shared/roleCapacity";
import { needStatus, offeredLine, type NeedProgress } from "@shared/campaignProgress";
import { formatShortDay, isThingKind, needVerb, roleTimeLine, thingWindowLine, toDay } from "@shared/crowdpoolNeedAction";

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

/**
 * A need's progress when the campaign reading is not at hand, from the
 * need's own counters. Hours needs read through roleFillState, the same
 * numbers the server uses. Nothing to give or lend is known here.
 */
export function needProgressFromItem(item: any): NeedProgress {
  const hours = isHoursNeed(item);
  let wanted: number;
  let confirmed: number;
  let delivered: number;
  let filled: boolean;
  if (hours) {
    const fill = roleFillState({
      kind: item.kind,
      capacityUnit: item.capacityUnit,
      quantityWanted: item.quantityWanted || 0,
      quantityClaimed: item.quantityClaimed || 0,
      quantityDelivered: item.quantityDelivered || 0,
      estimatedValue: item.estimatedValue || 0,
    });
    wanted = fill.needed;
    confirmed = fill.accepted;
    delivered = fill.delivered;
    filled = fill.filled;
  } else {
    wanted = Math.max(item.quantityWanted || 1, 1);
    confirmed = item.quantityClaimed || 0;
    delivered = item.quantityDelivered || 0;
    filled = confirmed >= wanted;
  }
  const np: NeedProgress = {
    unit: hours ? "hours_per_week" : "count",
    wanted,
    confirmed,
    delivered,
    offered: confirmed,
    offerCount: confirmed > 0 ? 1 : 0,
    open: Math.max(wanted - confirmed, 0),
    filled,
    confirmedValue: 0,
    deliveredValue: 0,
    gives: 0,
    lends: [],
    status: { key: "none", text: "" },
  };
  np.status = needStatus(np);
  return np;
}

/** What the offer sheet needs to know about a need. */
export function toContributionNeed(item: any, capital: CapitalType | string | null | undefined, progress?: NeedProgress): ContributionNeed {
  const np = progress ?? needProgressFromItem(item);
  return {
    id: item.id,
    kind: kindForItem(item),
    capitalType: capital ?? item.capitalType ?? null,
    title: titleForItem(item),
    quantityWanted: Math.max(np.wanted, 1),
    quantityClaimed: np.confirmed,
    quantityDelivered: np.delivered,
    estimatedValue: item.estimatedValue || 0,
    capacityUnit: item.capacityUnit ?? null,
    hoursPerWeek: item.hoursPerWeek ?? null,
    shiftStartsAt: item.shiftStartsAt,
    shiftEndsAt: item.shiftEndsAt,
    loanWindowStart: item.loanWindowStart,
    loanWindowEnd: item.loanWindowEnd,
    acceptsGift: item.acceptsGift ?? null,
    acceptsLoan: item.acceptsLoan ?? null,
    neededFrom: toDay(item.neededFrom),
    neededUntil: toDay(item.neededUntil),
    workMode: item.workMode ?? null,
  };
}

export function NeedCard({
  item,
  capital,
  accent,
  campaignActive,
  claimsHidden = false,
  formatCurrency,
  onClaim,
  progress,
}: {
  item: any;
  capital: CapitalType;
  accent: string;
  campaignActive: boolean;
  /** Hide the button (a cancelled campaign takes no offers). */
  claimsHidden?: boolean;
  formatCurrency: (amount: number) => string;
  onClaim: (need: ContributionNeed) => void;
  /** This need's line in the campaign's progress reading (progress.byNeed). */
  progress?: NeedProgress;
}) {
  const kind = kindForItem(item);
  const title = titleForItem(item);
  const description = descriptionForItem(item);
  const verb = needVerb(kind);
  const thing = isThingKind(kind);
  const np = progress ?? needProgressFromItem(item);
  const status = np.status.text ? np.status : needStatus(np);
  const hoursNeed = np.unit === "hours_per_week";

  const wanted = Math.max(np.wanted, 1);
  const confirmedPct = Math.min((np.confirmed / wanted) * 100, 100);
  const deliveredPct = Math.min((np.delivered / wanted) * 100, 100);

  const timeLine = kind === "role" ? roleTimeLine(item) : null;
  const hoursForLabel = hoursNeed ? np.wanted : Math.floor(Number(item.hoursPerWeek) || 0);
  const windowLine = thing ? thingWindowLine(item) : null;
  const offered = thing ? offeredLine(np) : null;
  const deadline = item.needDeadline && !toDay(item.neededUntil) ? item.needDeadline : null;

  return (
    <Card
      id={`need-${item.id}`}
      className="bg-white backdrop-blur border-l-4 flex flex-col h-full transition-shadow hover:shadow-md scroll-mt-24"
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
              {!!item.priorityPinned && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#d4a017]/15 text-[#8a6a10] flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  Priority
                </span>
              )}
            </div>
            <CardTitle className="text-[#1a472a] text-base leading-snug break-words">{title}</CardTitle>
            {timeLine && <p className="text-sm text-[#1a472a]/85 mt-0.5">{timeLine}</p>}
            {kind === "role" && hoursForLabel >= 20 && (
              <p className="text-xs text-[#1a472a]/75 mt-0.5">{fullTimeLabel(hoursForLabel)}</p>
            )}
            {description && (
              <CardDescription className="mt-1 line-clamp-2 text-sm">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-5 pt-0 mt-auto space-y-3">
        {/* Meter: delivered solid in the capital colour, confirmed lighter. The text says both. */}
        <div>
          <div className="w-full bg-[#1a472a]/10 rounded-full h-2 relative overflow-hidden" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${confirmedPct}%`, backgroundColor: `${accent}59` }} />
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${deliveredPct}%`, backgroundColor: accent }} />
          </div>
          <p className="text-xs font-medium text-[#1a472a]/85 mt-1.5" data-status={status.key}>{status.text}</p>
          {np.delivered > 0 && (
            <p className="text-xs text-[#1a472a]/75">
              {hoursNeed ? `${np.delivered} hours a week delivered` : `${np.delivered} delivered`}
            </p>
          )}
        </div>
        {(deadline || item.shiftStartsAt || windowLine || offered) && (
          <div className="space-y-1 text-xs text-[#1a472a]/75">
            {deadline && (
              <p className="flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" style={{ color: accent }} />
                Needed by {formatShortDay(deadline)}.
              </p>
            )}
            {item.shiftStartsAt && item.shiftEndsAt && (
              <p className="flex items-center gap-1">
                <Calendar className="w-3 h-3 shrink-0" style={{ color: accent }} />
                {formatShiftWindow(item.shiftStartsAt, item.shiftEndsAt)}
              </p>
            )}
            {windowLine && (
              <p className="flex items-start gap-1">
                <Calendar className="w-3 h-3 mt-0.5 shrink-0" style={{ color: accent }} />
                <span>{windowLine}</span>
              </p>
            )}
            {offered && <p>{offered}</p>}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-lg font-bold" style={{ color: accent }}>
            {thing ? formatCurrency(item.estimatedValue || 0) : null}
          </div>
          {claimsHidden || np.filled || !verb ? null : (
            <Button
              size="sm"
              className="text-white min-h-11"
              style={{ backgroundColor: accent }}
              disabled={!campaignActive}
              aria-label={`${verb}: ${title}`}
              onClick={() => onClaim(toContributionNeed(item, capital, progress))}
            >
              <Heart className="w-4 h-4 mr-2" />
              {verb}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
