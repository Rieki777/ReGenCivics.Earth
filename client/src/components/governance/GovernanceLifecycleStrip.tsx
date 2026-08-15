/**
 * GovernanceLifecycleStrip
 *
 * A calm four-stage status strip for governance threads:
 *   Dialogue → Sensing → Proposal → Decision
 *
 * Renders only once a thread has actually entered governance (sensing and
 * beyond). Casual threads show nothing; the way in is a quiet action under
 * the post (CommunityPost). Styled for the light post card it lives on.
 *
 * In Proposal and Decision stages also shows reversibility and sunset date.
 * On mobile, collapses to current stage with a tap to expand.
 *
 * While a thread is in Sensing, the person who started it (or an admin) can
 * return it to dialogue. The server keeps that undo participation-aware: it
 * posts a visible note on the thread once other people have weighed in.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type GovernanceStage = "dialogue" | "sensing" | "proposal" | "decided";

const STAGE_CONFIG: Record<GovernanceStage, { label: string; description: string }> = {
  dialogue: {
    label: "Dialogue",
    description: "Open conversation, sharing perspectives and building understanding.",
  },
  sensing: {
    label: "Sensing",
    description: "Gathering where people stand before a proposal forms.",
  },
  proposal: {
    label: "Proposal",
    description: "A formal proposal is open for stances. The bar to move forward: good enough for now, safe enough to try.",
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
  sensingStartedBy?: number | null;
}

export function GovernanceLifecycleStrip({ threadId, governanceStage, sensingStartedBy }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const inGovernance =
    governanceStage === "sensing" || governanceStage === "proposal" || governanceStage === "decided";

  const { data: decision } = trpc.governance.getDecisionStatus.useQuery(
    { threadId },
    { staleTime: 30_000, enabled: governanceStage === "proposal" || governanceStage === "decided" }
  );

  const { data: perspectiveData } = trpc.forum.perspectives.get.useQuery(
    { threadId },
    { staleTime: 30_000, enabled: governanceStage === "sensing" }
  );

  const returnToDialogue = trpc.forum.returnToDialogue.useMutation({
    onSuccess: () => {
      setConfirmingReturn(false);
      utils.forum.postById.invalidate({ id: threadId });
      utils.forum.perspectives.get.invalidate({ threadId });
    },
  });

  if (!inGovernance) return null;

  const currentStage: GovernanceStage = governanceStage as GovernanceStage;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  const reversibility = (decision as any)?.reversibility as string | undefined;
  const sunsetAt = (decision as any)?.sunsetAt ? new Date((decision as any).sunsetAt as any) : null;

  const stageLabel = STAGE_CONFIG[currentStage]?.label ?? "Sensing";

  // Participation-aware undo: how many people besides me have weighed in
  const tallies = (perspectiveData as any)?.tallies ?? [];
  const totalVoices = tallies.reduce((sum: number, t: any) => sum + Number(t.count ?? 0), 0);
  const othersCount = Math.max(0, totalVoices - ((perspectiveData as any)?.myPerspective ? 1 : 0));

  const isAdminOrSuper = user?.role === "admin" || user?.role === "superadmin";
  const canReturn =
    currentStage === "sensing" && !!user && (user.id === sensingStartedBy || isAdminOrSuper);

  return (
    <div className="rounded-xl border border-[#e8e4de] bg-[#fbfaf7] overflow-hidden">
      {/* Mobile: collapsed — shows current stage + tap to expand */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="sm:hidden w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-[#1a472a] text-sm font-semibold">{stageLabel}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#4a7c59]/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#4a7c59]/60" />
        )}
      </button>

      {/* Stage strip — always visible on desktop, expandable on mobile */}
      <div className={`${expanded ? "block" : "hidden"} sm:block`}>
        <div className="flex items-stretch border-b border-[#e8e4de]">
          {STAGE_ORDER.map((stage, i) => {
            const isActive = stage === currentStage;
            const isPast = i < currentIdx;
            const cfg = STAGE_CONFIG[stage];
            return (
              <div
                key={stage}
                className={`flex-1 px-3 py-2.5 text-center border-r border-[#e8e4de] last:border-r-0 transition-colors ${
                  isActive
                    ? "bg-[#7dd87d]/15 border-b-2 border-b-[#4a7c59]"
                    : isPast
                    ? "bg-[#f0f7f0]"
                    : ""
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    isActive ? "text-[#1a472a]" : isPast ? "text-[#4a7c59]" : "text-[#1a472a]/75"
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
          <p className="text-[#4a7c59] text-xs leading-relaxed">
            {STAGE_CONFIG[currentStage]?.description}
          </p>

          {/* Reversibility + sunset (Proposal / Decided) */}
          {(currentStage === "proposal" || currentStage === "decided") && (reversibility || sunsetAt) && (
            <div className="flex flex-wrap gap-3 mt-2">
              {reversibility && REVERSIBILITY_LABELS[reversibility] && (
                <span
                  className="text-[11px] text-[#1a472a]/80 bg-[#f0f7f0] border border-[#7dd87d]/30 rounded-full px-2.5 py-0.5"
                  title={REVERSIBILITY_LABELS[reversibility].tooltip}
                  aria-label={`${REVERSIBILITY_LABELS[reversibility].label}: ${REVERSIBILITY_LABELS[reversibility].tooltip}`}
                >
                  {REVERSIBILITY_LABELS[reversibility].label}
                </span>
              )}
              {reversibility && REVERSIBILITY_LABELS[reversibility] && (
                <span className="md:hidden text-[10px] text-[#1a472a]/75 w-full">
                  {REVERSIBILITY_LABELS[reversibility].tooltip}
                </span>
              )}
              {sunsetAt && (
                <span className="text-[11px] text-[#4a7c59] bg-[#f0f7f0] border border-[#7dd87d]/30 rounded-full px-2.5 py-0.5">
                  Revisits {sunsetAt.toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Return to dialogue (Sensing only, starter or admin) */}
          {canReturn && (
            <div className="mt-3">
              {confirmingReturn ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-[#1a472a]/80">
                    {othersCount > 0
                      ? `Return this thread to dialogue? ${othersCount === 1 ? "One person has" : `${othersCount} people have`} shared a perspective, so a note will be posted on the thread. Perspectives are kept.`
                      : "Return this thread to dialogue?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => returnToDialogue.mutate({ threadId })}
                    disabled={returnToDialogue.isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a472a] underline hover:text-[#4a7c59] transition-colors"
                  >
                    {returnToDialogue.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Yes, return it
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReturn(false)}
                    className="text-xs text-[#1a472a]/75 hover:text-[#4a7c59] transition-colors"
                  >
                    Keep sensing
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingReturn(true)}
                  className="text-xs text-[#1a472a]/75 hover:text-[#1a472a] underline transition-colors"
                  title="Undo Sensing and return this thread to open conversation."
                >
                  Return to dialogue
                </button>
              )}
              {returnToDialogue.isError && (
                <p className="text-xs text-red-600 mt-1">
                  {(returnToDialogue.error as any)?.message ?? "Could not return to dialogue"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
