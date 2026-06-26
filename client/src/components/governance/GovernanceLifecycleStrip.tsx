/**
 * GovernanceLifecycleStrip
 *
 * A calm four-stage status strip for governance threads:
 *   Dialogue → Sensing → Proposal → Decision
 *
 * Shows the current stage highlighted, the rest quiet. In Proposal and
 * Decision stages also shows reversibility and sunset date. On mobile,
 * collapses to current stage with a tap to expand.
 *
 * Extends ForumThreadDecisionBanner to cover the full pipeline instead
 * of just the promoted-to-decision state.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type GovernanceStage = "dialogue" | "sensing" | "proposal" | "decided";

const STAGE_CONFIG: Record<GovernanceStage, { label: string; description: string }> = {
  dialogue: {
    label: "Dialogue",
    description: "Open conversation — sharing perspectives and building understanding.",
  },
  sensing: {
    label: "Sensing",
    description: "Gathering where people stand before a proposal forms.",
  },
  proposal: {
    label: "Proposal",
    description: "A formal proposal is open for stances.",
  },
  decided: {
    label: "Decision",
    description: "A decision has been reached.",
  },
};

const STAGE_ORDER: GovernanceStage[] = ["dialogue", "sensing", "proposal", "decided"];

const REVERSIBILITY_LABELS: Record<string, { label: string; tooltip: string }> = {
  reversible: { label: "Reversible", tooltip: "This decision can be changed if needed." },
  semi_reversible: { label: "Hard to undo", tooltip: "This decision is difficult but not impossible to reverse." },
  one_way_door: { label: "One-way door", tooltip: "One-way door: hard to undo, so we move carefully." },
};

interface Props {
  threadId: number;
  governanceStage?: GovernanceStage | null;
  onEnterSensing?: () => void;
}

export function GovernanceLifecycleStrip({ threadId, governanceStage, onEnterSensing }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: decision } = trpc.governance.getDecisionStatus.useQuery(
    { threadId },
    { staleTime: 30_000, enabled: (governanceStage === "proposal" || governanceStage === "decided") }
  );

  const enterSensing = trpc.forum.enterSensing.useMutation({
    onSuccess: () => {
      utils.forum.perspectives.get.invalidate({ threadId });
      onEnterSensing?.();
    },
  });

  const currentStage: GovernanceStage = governanceStage ?? "dialogue";
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  const reversibility = (decision as any)?.reversibility as string | undefined;
  const sunsetAt = (decision as any)?.sunsetAt ? new Date((decision as any).sunsetAt as any) : null;

  const stageLabel = STAGE_CONFIG[currentStage]?.label ?? "Dialogue";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Mobile: collapsed — shows current stage + tap to expand */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="sm:hidden w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-white/80 text-sm font-semibold">{stageLabel}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {/* Stage strip — always visible on desktop, expandable on mobile */}
      <div className={`${expanded ? "block" : "hidden"} sm:block`}>
        <div className="flex items-stretch border-b border-white/8">
          {STAGE_ORDER.map((stage, i) => {
            const isActive = stage === currentStage;
            const isPast = i < currentIdx;
            const cfg = STAGE_CONFIG[stage];
            return (
              <div
                key={stage}
                className={`flex-1 px-3 py-2.5 text-center border-r border-white/8 last:border-r-0 transition-colors ${
                  isActive
                    ? "bg-[#7dd87d]/10 border-b-2 border-b-[#7dd87d]"
                    : isPast
                    ? "bg-white/[0.02]"
                    : ""
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    isActive ? "text-[#7dd87d]" : isPast ? "text-white/60" : "text-white/30"
                  }`}
                >
                  {cfg.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Current stage description + meta */}
        <div className="px-4 py-3">
          <p className="text-white/60 text-xs leading-relaxed">
            {STAGE_CONFIG[currentStage]?.description}
          </p>

          {/* Reversibility + sunset (Proposal / Decided) */}
          {(currentStage === "proposal" || currentStage === "decided") && (reversibility || sunsetAt) && (
            <div className="flex flex-wrap gap-3 mt-2">
              {reversibility && REVERSIBILITY_LABELS[reversibility] && (
                <span
                  className="text-[11px] text-white/50 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5"
                  title={REVERSIBILITY_LABELS[reversibility].tooltip}
                  aria-label={`${REVERSIBILITY_LABELS[reversibility].label}: ${REVERSIBILITY_LABELS[reversibility].tooltip}`}
                >
                  {REVERSIBILITY_LABELS[reversibility].label}
                </span>
              )}
              {reversibility && REVERSIBILITY_LABELS[reversibility] && (
                <span className="md:hidden text-[10px] text-white/40 w-full">
                  {REVERSIBILITY_LABELS[reversibility].tooltip}
                </span>
              )}
              {sunsetAt && (
                <span className="text-[11px] text-white/50 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
                  Revisits {sunsetAt.toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* "Ready to sense the room?" prompt (shown when dialogue, user is signed in) */}
          {currentStage === "dialogue" && user && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => enterSensing.mutate({ threadId })}
                disabled={enterSensing.isPending}
                className="flex items-center gap-1.5 text-xs text-[#7dd87d] hover:text-[#9de89d] transition-colors"
              >
                {enterSensing.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Ready to sense the room?
              </button>
              {enterSensing.isError && (
                <span className="text-xs text-red-400">
                  {(enterSensing.error as any)?.message ?? "Could not enter Sensing"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
