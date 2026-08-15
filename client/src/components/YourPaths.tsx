/**
 * Your Paths: actionable progression hub for the Profile Quests tab.
 *
 * Phase 2 of QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md, section 8.
 *
 * Renders one block per path the player has declared. Each block has
 * three visual states:
 *   A. Action checklist + concrete buttons (working toward Co-Creator
 *      or Steward).
 *   B. Single big "Claim N RGVoice on Hypha" button (criteria met,
 *      bonus waiting).
 *   C. Calm earned banner with the date (bonus claimed).
 *
 * Plus an "Add a Path" button at the bottom that opens a small modal
 * to declare investor / land_project / ally explicitly.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Sprout, Droplets, Wind, Flame, ArrowRight, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

type PathSlug = "player" | "investor" | "land_project" | "ally";

const PATH_META: Record<PathSlug, { label: string; tagline: string; Icon: React.ComponentType<{ className?: string }> }> = {
  player: {
    label: "ReGen Player",
    tagline: "Walk the 14 Rites of Passage",
    Icon: Flame,
  },
  investor: {
    label: "Investor",
    tagline: "Fund the Renaissance",
    Icon: Droplets,
  },
  land_project: {
    label: "Land Project",
    tagline: "Steward your land",
    Icon: Sprout,
  },
  ally: {
    label: "Alliance Partner",
    tagline: "Bring your tools",
    Icon: Wind,
  },
};

export function YourPaths() {
  const utils = trpc.useUtils();
  const { data: paths, isLoading } = trpc.playerPaths.getMyPaths.useQuery(undefined, {
    staleTime: 30_000,
  });
  const declareMutation = trpc.playerPaths.declarePath.useMutation({
    onSuccess: () => {
      void utils.playerPaths.getMyPaths.invalidate();
      toast.success("Path added.");
    },
    onError: (err) => toast.error(err.message ?? "Could not add path."),
  });
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-white/70 text-sm">Loading paths...</div>
      </div>
    );
  }

  const declaredPaths: PathSlug[] = (paths ?? []).map((p) => p.path as PathSlug);
  const undeclared = (Object.keys(PATH_META) as PathSlug[]).filter((p) => !declaredPaths.includes(p));

  return (
    <div className="glass-panel p-6 rounded-xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7dd87d]" /> Your Paths
          </h2>
          <p className="text-white/70 text-xs mt-1">
            Each path you walk earns its own Co-Creator and Steward titles, plus an RGVoice bonus on Hypha.
          </p>
        </div>
        {undeclared.length > 0 && (
          <button
            onClick={() => setAddOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add a path
          </button>
        )}
      </div>

      {addOpen && (
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 space-y-2">
          <div className="text-xs text-white/60 mb-2">Choose a path to add. You can walk more than one.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {undeclared.map((p) => {
              const meta = PATH_META[p];
              const Icon = meta.Icon;
              return (
                <button
                  key={p}
                  onClick={() => {
                    declareMutation.mutate({ path: p });
                    setAddOpen(false);
                  }}
                  disabled={declareMutation.isPending}
                  className="text-left p-3 rounded-lg border border-white/10 hover:border-[#7dd87d]/30 hover:bg-[#1a472a]/30 transition-colors flex items-center gap-3"
                >
                  <Icon className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{meta.label}</div>
                    <div className="text-xs text-white/70">{meta.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(paths ?? []).length === 0 && !addOpen && (
        <div className="border border-dashed border-white/10 rounded-lg p-6 text-center">
          <div className="text-white/60 text-sm">No paths yet. Add your first path to start earning toward Co-Creator.</div>
        </div>
      )}

      <div className="space-y-3">
        {(paths ?? []).map((p) => (
          <PathBlock key={p.path} data={p} />
        ))}
      </div>
    </div>
  );
}

interface PathBlockProps {
  data: {
    path: string;
    declaredAt: string;
    tier: string;
    unclaimedBonusAmount: number;
    coCreatorSteps: Array<{ label: string; done: boolean; actionRoute?: string; actionLabel?: string }>;
    stewardSteps: Array<{ label: string; done: boolean; actionRoute?: string; actionLabel?: string }>;
    coCreatorEarnedAt: string | null;
    stewardEarnedAt: string | null;
  };
}

function PathBlock({ data }: PathBlockProps) {
  const meta = PATH_META[data.path as PathSlug];
  const Icon = meta?.Icon ?? Sparkles;
  const earnedDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };

  const stewardClaimed = data.tier === "steward_claimed";
  const stewardReached = data.tier === "steward_earned" || stewardClaimed;
  const coCreatorClaimed = data.tier === "co_creator_claimed";
  const coCreatorReached = data.tier === "co_creator_earned" || coCreatorClaimed || stewardReached;

  // Earned banner: covers both earned-and-unclaimed and claimed states.
  // The tier bonus RGVoice lands in the player's private balance
  // automatically. Claiming happens from the token totals area, which
  // gates on the claim threshold. No claim button here on purpose.
  if (coCreatorReached) {
    const earnedTierLabel = stewardReached ? "Steward" : "Co-Creator";
    const earnedAtIso = stewardReached ? data.stewardEarnedAt : data.coCreatorEarnedAt;
    const d = earnedDate(earnedAtIso);
    const showStewardChecklist = !stewardReached && data.stewardSteps.length > 0;
    return (
      <div className="border border-white/10 bg-white/[0.02] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-6 h-6 text-[#7dd87d] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-base font-bold text-white">{meta?.label ?? data.path}</div>
            <div className="text-xs text-white/60 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#7dd87d]" />
              {earnedTierLabel} earned
              {d ? <span className="text-white/60"> · {d}</span> : null}
            </div>
          </div>
        </div>
        {data.unclaimedBonusAmount > 0 && (
          <div className="text-xs text-white/60 mb-1">
            +{data.unclaimedBonusAmount} RGVoice added to your balance. Claim it with your other tokens from your token totals once you reach the claim threshold.
          </div>
        )}
        {/* Next-tier checklist if applicable */}
        {showStewardChecklist && (
          <div className="border-t border-white/10 pt-3 mt-2 space-y-2">
            <div className="text-xs text-white/60 mb-2">Working toward Steward (+{144} RGVoice)</div>
            {data.stewardSteps.map((step, i) => (
              <CriterionRow key={i} step={step} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // State A: working toward Co-Creator. Show checklist.
  return (
    <div className="border border-white/10 bg-white/[0.02] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6 text-[#7dd87d] flex-shrink-0" />
        <div>
          <div className="text-base font-bold text-white">{meta?.label ?? data.path}</div>
          <div className="text-xs text-white/70">Working toward Co-Creator (+77 RGVoice)</div>
        </div>
      </div>
      <div className="space-y-2">
        {data.coCreatorSteps.map((step, i) => (
          <CriterionRow key={i} step={step} />
        ))}
      </div>
    </div>
  );
}

function CriterionRow({
  step,
}: {
  step: { label: string; done: boolean; actionRoute?: string; actionLabel?: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {step.done ? (
          <CheckCircle2 className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
        ) : (
          <span className="w-4 h-4 rounded-full border border-white/30 flex-shrink-0" aria-hidden />
        )}
        <span className={`text-sm ${step.done ? "text-white/60 line-through" : "text-white/90"}`}>{step.label}</span>
      </div>
      {!step.done && step.actionRoute && step.actionLabel && (
        <Link
          href={step.actionRoute}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1a472a] border border-[#7dd87d]/30 text-[#7dd87d] text-xs font-medium hover:bg-[#2a5a3a] transition-colors flex-shrink-0"
        >
          {step.actionLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
