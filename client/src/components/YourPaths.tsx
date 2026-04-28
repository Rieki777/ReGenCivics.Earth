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
  // Reuse the existing Hypha claim flow. The player has 77 (or 144 or
  // 233) RGVoice waiting in their private ledger; requestClaim
  // packages the redeem-tokens proposal and redirects to Hypha.
  const claimMutation = trpc.playerProfiles.requestClaim.useMutation({
    onSuccess: (data) => {
      // requestClaim returns { parentClaimId, bridges, hyphaUrl }.
      // hyphaUrl is the deep link to the Hypha proposal flow when one
      // bridge was created; nullable when there's nothing to redeem yet.
      if (data?.hyphaUrl) {
        window.location.href = data.hyphaUrl;
      } else {
        toast.success("Claim started.");
        void utils.playerPaths.getMyPaths.invalidate();
      }
    },
    onError: (err) => toast.error(err.message ?? "Could not start the claim."),
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
          <PathBlock
            key={p.path}
            data={p}
            onClaim={() => {
              // Claim the user's RGVoice via existing Hypha flow.
              claimMutation.mutate({ tokens: ["rgvoice"] });
            }}
            claiming={claimMutation.isPending}
          />
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
  onClaim: () => void;
  claiming: boolean;
}

function PathBlock({ data, onClaim, claiming }: PathBlockProps) {
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
  const stewardEarned = data.tier === "steward_earned";
  const coCreatorClaimed = data.tier === "co_creator_claimed" || stewardClaimed || stewardEarned;
  const coCreatorEarned = data.tier === "co_creator_earned" || coCreatorClaimed;

  // State B: criteria met for whichever tier is next, bonus unclaimed.
  // The detector landed RGVoice in private ledger; claim button uses
  // existing requestClaim flow.
  if (data.unclaimedBonusAmount > 0) {
    const tierLabel = stewardEarned ? "Steward" : "Co-Creator";
    return (
      <div className="border border-[#7dd87d]/30 bg-gradient-to-br from-[#1a472a]/40 to-[#2d5a3d]/40 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-[#7dd87d] flex-shrink-0" />
            <div>
              <div className="text-base font-bold text-white">{meta?.label ?? data.path}</div>
              <div className="text-sm text-[#7dd87d]">{tierLabel} earned</div>
            </div>
          </div>
        </div>
        <button
          onClick={onClaim}
          disabled={claiming}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] text-[#0a1f15] font-bold text-base hover:from-[#8de89d] hover:to-[#5a8c69] transition-all shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {claiming ? "Starting claim..." : `Claim ${data.unclaimedBonusAmount} RGVoice on Hypha`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // State C: claimed. Calm earned banner + next tier checklist if any.
  if (coCreatorClaimed) {
    return (
      <div className="border border-white/10 bg-white/[0.02] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-6 h-6 text-[#7dd87d] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-base font-bold text-white">{meta?.label ?? data.path}</div>
            <div className="text-xs text-white/60 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#7dd87d]" />
              {stewardClaimed ? "Steward" : "Co-Creator"} earned
              {(() => {
                const d = earnedDate(stewardClaimed ? data.stewardEarnedAt : data.coCreatorEarnedAt);
                return d ? <span className="text-white/40"> · {d}</span> : null;
              })()}
            </div>
          </div>
        </div>
        {/* Next-tier checklist if applicable */}
        {data.stewardSteps.length > 0 && (
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
