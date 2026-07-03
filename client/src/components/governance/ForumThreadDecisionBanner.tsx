/**
 * ForumThreadDecisionBanner
 *
 * The living backlink banner that sits at the top of a forum thread once it
 * has been promoted to a formal decision. Polls governance.getDecisionStatus
 * for live status updates and shows the right call-to-action for each state.
 */
import { trpc } from "@/lib/trpc";
import { Vote, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface Props {
  threadId: number;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }>; }> = {
  draft: { label: "Draft", color: "bg-white/8 border-white/15 text-white/65", icon: Clock },
  open: { label: "Open for stances", color: "bg-[#7dd87d]/15 border-[#7dd87d]/45 text-[#7dd87d]", icon: Vote },
  closing_soon: { label: "Closing soon", color: "bg-amber-500/15 border-amber-500/45 text-amber-300", icon: AlertCircle },
  closed: { label: "Closed", color: "bg-white/8 border-white/15 text-white/75", icon: Clock },
  ratified: { label: "Ratified", color: "bg-emerald-500/15 border-emerald-500/45 text-emerald-300", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-red-500/15 border-red-500/45 text-red-300", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-white/8 border-white/15 text-white/70", icon: XCircle },
};

export function ForumThreadDecisionBanner({ threadId }: Props) {
  const { data: decision } = trpc.governance.getDecisionStatus.useQuery(
    { threadId },
    { staleTime: 30 * 1000, refetchInterval: 60 * 1000 },
  );
  if (!decision) return null;

  const meta = STATUS_META[decision.status as string] ?? STATUS_META.open;
  const Icon = meta.icon;
  const closesAt = decision.closesAt ? new Date(decision.closesAt as any) : null;
  const closedAt = decision.closedAt ? new Date(decision.closedAt as any) : null;
  const sunsetAt = decision.sunsetAt ? new Date(decision.sunsetAt as any) : null;

  // Time-remaining helper
  const fmtRemaining = (target: Date) => {
    const ms = target.getTime() - Date.now();
    if (ms < 0) return "passed";
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    if (days >= 2) return `${days} days`;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    return `${hours}h`;
  };

  return (
    <div className={`rounded-xl border-2 px-4 py-3 mb-3 ${meta.color}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">Decision #{decision.id}</span>
            <span className="text-[10px] uppercase tracking-widest opacity-80">{meta.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 capitalize">{decision.track} track</span>
          </div>
          <div className="text-xs opacity-85 mt-1 flex items-center gap-3 flex-wrap">
            {decision.stanceCount > 0 && <span>{decision.stanceCount} stances</span>}
            {decision.status === "open" && closesAt && <span>Closes in {fmtRemaining(closesAt)}</span>}
            {decision.status === "closing_soon" && closesAt && <span>Closes in {fmtRemaining(closesAt)}</span>}
            {(decision.status === "ratified" || decision.status === "declined") && closedAt && (
              <span>Closed {closedAt.toLocaleDateString()}</span>
            )}
            {sunsetAt && (decision.status === "ratified") && (
              <span>Sunsets in {fmtRemaining(sunsetAt)}</span>
            )}
          </div>
          {decision.outcomeSummary && (decision.status === "ratified" || decision.status === "declined") && (
            <p className="text-xs mt-2 opacity-90 leading-relaxed">{(decision.outcomeSummary ?? "").slice(0, 220)}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col gap-1.5">
          {decision.hyphaBridgeId && (
            <Link
              href={`/bridge/hypha/${decision.hyphaBridgeId}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" /> Bridge
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
