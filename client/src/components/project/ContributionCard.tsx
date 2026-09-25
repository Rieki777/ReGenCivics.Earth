/**
 * One offer, as a project steward sees it: who offered, how to reach them,
 * what they said, and what the steward can do next. Module level with props,
 * so it keeps its identity across renders of the review panel.
 *
 * The buttons only open dialogs. Every action goes through a campaigns.*
 * procedure that checks the steward on the server (server/lib/project-steward.ts).
 *
 * Give or lend (build spec 2026-09-25, section 6): a lent thing shows its
 * dates and the one condition note, a gift says Gift. A loan the stewards
 * took on gets a Returned button (campaigns.markLoanReturned), a stamp that
 * changes no status and no counter.
 */
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Gift,
  Leaf,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  PackageCheck,
  Phone,
  RotateCcw,
  Timer,
  Undo2,
  User,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";
import { isHoursNeed } from "@shared/roleCapacity";
import { formatShortDay, toDay } from "@shared/crowdpoolNeedAction";
import { LOAN_ROW } from "@shared/crowdpoolCopy";
import { STEWARD_STATUS_CLASSES, STEWARD_STATUS_LABELS } from "@/lib/needDisplay";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type OwnerContribution = RouterOutputs["campaigns"]["getContributionsForOwner"][number];
export type CampaignNeed = RouterOutputs["campaigns"]["getItems"][number];

export type ContributionAction = "accept" | "reject" | "deliver" | "thanks" | "release" | "hours" | "returned";

const TAKEN_ON = ["accepted", "fulfilled", "thanked"];

/** A lend the stewards took on and have not yet marked returned. */
export function canMarkReturned(c: Pick<OwnerContribution, "offerMode" | "status" | "returnedAt">): boolean {
  return c.offerMode === "lend" && TAKEN_ON.includes(c.status) && !c.returnedAt;
}

/** "Loan: 1 Apr to 30 Jun", or "Loan: until 30 Jun" with no start date. */
export function loanLine(c: Pick<OwnerContribution, "availableFrom" | "lendUntil">): string | null {
  const until = toDay(c.lendUntil);
  if (!until) return null;
  const from = toDay(c.availableFrom);
  return LOAN_ROW.loan(from ? formatShortDay(from) : "", formatShortDay(until));
}

function ContributionIcon({ type }: { type: string }) {
  switch (type) {
    case "land": return <Leaf className="w-5 h-5 text-green-600 flex-shrink-0" />;
    case "equipment": return <Wrench className="w-5 h-5 text-orange-600 flex-shrink-0" />;
    case "role": return <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />;
    case "resource": return <Package className="w-5 h-5 text-purple-600 flex-shrink-0" />;
    case "financial": return <DollarSign className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
    default: return <Package className="w-5 h-5 text-gray-600 flex-shrink-0" />;
  }
}

/** The delivery window on an accepted count need. Hours needs never expire. */
function claimCountdown(c: OwnerContribution): { text: string; overdue: boolean } | null {
  if (c.status !== "accepted" || !c.claimExpiresAt) return null;
  const msLeft = new Date(c.claimExpiresAt).getTime() - Date.now();
  if (msLeft <= 0) {
    return { text: "The delivery window passed. The nightly sweep will free this place.", overdue: true };
  }
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return {
    text: days > 0 ? `${days}d ${hours}h left to deliver` : `${hours}h left to deliver`,
    overdue: false,
  };
}

const text = (s: string | null | undefined) => decodeBasicEntities(s ?? "");

export function ContributionCard({
  contribution,
  need,
  formatCurrency,
  onAction,
  onFormalize,
  formalizing,
}: {
  contribution: OwnerContribution;
  need: CampaignNeed | null;
  formatCurrency: (amount: number) => string;
  onAction: (action: ContributionAction, contribution: OwnerContribution) => void;
  onFormalize: (contribution: OwnerContribution) => void;
  formalizing: boolean;
}) {
  const c = contribution;
  const hoursNeed = isHoursNeed(need);
  const standing = c.status === "accepted" || c.status === "fulfilled" || c.status === "thanked";
  const countdown = hoursNeed ? null : claimCountdown(c);
  const faded = ["expired", "released", "cancelled", "withdrawn", "rejected"].includes(c.status);
  const offered = c.hoursPerWeek ?? c.quantityPledged;

  return (
    <Card id={`contribution-${c.id}`} className={`bg-white border-gray-200 text-[#1a472a] light-form-island scroll-mt-24 ${faded ? "opacity-70" : ""}`}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ContributionIcon type={c.contributionType} />
            <div className="min-w-0">
              <CardTitle className="text-base text-[#1a472a] break-words">{text(c.title)}</CardTitle>
              <CardDescription>
                {hoursNeed ? (
                  <>
                    Offers {offered} hours a week
                    {standing && ` · Accepted at ${c.quantityPledged}`}
                  </>
                ) : (
                  <span className="capitalize">
                    {c.contributionType}
                    {(c.quantityPledged || 1) > 1 && ` · ${c.quantityPledged} slots`}
                  </span>
                )}
                {!!c.isAnonymous && " · anonymous publicly"}
              </CardDescription>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-[#4a7c59]">{formatCurrency(c.estimatedValue)}</div>
            <Badge className={STEWARD_STATUS_CLASSES[c.status] ?? "bg-gray-500"}>
              {STEWARD_STATUS_LABELS[c.status] ?? c.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {countdown && (
          <div className={`flex items-center gap-2 text-sm rounded-lg p-2 ${countdown.overdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{countdown.text}</span>
          </div>
        )}

        {/* Contact details: every project steward sees these (OWASP A01 note). */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-[#1a472a] break-words min-w-0">{text(c.contributorName)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a href={`mailto:${c.contributorEmail}`} className="hover:underline break-all min-w-0">
              {c.contributorEmail}
            </a>
          </div>
          {c.contributorPhone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <a href={`tel:${c.contributorPhone}`} className="hover:underline break-all">{c.contributorPhone}</a>
            </div>
          )}
        </div>

        {c.offerMode === "lend" && (
          <div className="rounded-lg bg-[#f0f7f0] p-3 text-sm text-[#1a472a] space-y-1 min-w-0">
            {loanLine(c) && <p className="font-medium">{loanLine(c)}</p>}
            {c.lendTerms && <p className="break-words">{LOAN_ROW.condition(text(c.lendTerms))}</p>}
            {c.returnedAt && (
              <p className="flex items-center gap-1.5 font-semibold text-[#1a472a]">
                <RotateCcw className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {LOAN_ROW.returnedOn(formatShortDay(toDay(c.returnedAt)))}
              </p>
            )}
          </div>
        )}
        {c.offerMode === "give" && (
          <p className="text-sm font-medium text-[#1a472a]">{LOAN_ROW.gift}</p>
        )}

        {c.description && <p className="text-sm text-gray-600 break-words">{text(c.description)}</p>}

        {c.contributorNotes && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-700 mb-1">Their note</p>
                <p className="text-sm text-blue-700 break-words">{text(c.contributorNotes)}</p>
              </div>
            </div>
          </div>
        )}

        {c.ownerNotes && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-purple-700 mb-1">Your note to them</p>
                <p className="text-sm text-purple-700 break-words">{text(c.ownerNotes)}</p>
              </div>
            </div>
          </div>
        )}

        {c.acknowledgedNote && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-700 mb-1">Your thanks</p>
                <p className="text-sm text-green-700 break-words">{text(c.acknowledgedNote)}</p>
                {c.acknowledgedImageUrl && (
                  <img src={c.acknowledgedImageUrl} alt="Thank-you photo" className="mt-2 w-24 h-24 object-cover rounded-lg" loading="lazy" />
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Offered {new Date(c.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>

        {c.status === "pending" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="flex-1 min-w-[8rem] bg-green-600 hover:bg-green-700" onClick={() => onAction("accept", c)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button size="sm" variant="outline" className="flex-1 min-w-[8rem] border-red-300 text-red-600 hover:bg-red-50" onClick={() => onAction("reject", c)}>
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        )}

        {c.status === "accepted" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="flex-1 min-w-[8rem] bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction("deliver", c)}>
              <PackageCheck className="w-4 h-4 mr-2" />
              Mark delivered
            </Button>
            {hoursNeed && (
              <Button size="sm" variant="outline" className="flex-1 min-w-[8rem] border-[#4a7c59] text-[#4a7c59]" onClick={() => onAction("hours", c)}>
                <Timer className="w-4 h-4 mr-2" />
                Change hours
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex-1 min-w-[8rem] border-gray-300 text-gray-700" onClick={() => onAction("release", c)}>
              <Undo2 className="w-4 h-4 mr-2" />
              Release
            </Button>
          </div>
        )}

        {c.status === "fulfilled" && (
          <div className="pt-1">
            <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => onAction("thanks", c)}>
              <Gift className="w-4 h-4 mr-2" />
              Send thanks
            </Button>
          </div>
        )}

        {canMarkReturned(c) && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full min-h-11 border-[#1a472a]/40 text-[#1a472a] hover:bg-[#f0f7f0]"
              onClick={() => onAction("returned", c)}
              aria-label={LOAN_ROW.dialogButton}
            >
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              {LOAN_ROW.returnedButton}
            </Button>
          </div>
        )}

        {/* Formalize on Hypha: after delivery, bring it to the project DHO so the
            DHO can issue project tokens on chain. One way, one time per contribution. */}
        {(c.status === "fulfilled" || c.status === "thanked") && !c.hyphaBridgeKey && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white"
              disabled={formalizing}
              onClick={() => onFormalize(c)}
            >
              {formalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Formalize on Hypha
            </Button>
            <p className="text-[11px] text-gray-500 mt-1 text-center">
              Brings this to the project DHO so it can issue project tokens on chain.
            </p>
          </div>
        )}
        {c.hyphaBridgeKey && (
          <div className="pt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#4a7c59]">
            <CheckCircle2 className="w-4 h-4" />
            {c.hyphaConfirmedAt ? "Confirmed on Hypha" : "On its way to Hypha"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
