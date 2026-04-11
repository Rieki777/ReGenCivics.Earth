import { useEffect, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";
import { suggestTier } from "@/lib/tierSuggestion";
import { TierBadge } from "@/components/TierBadge";
import { cn } from "@/lib/cn";

export function TierSuggestionScreen({ draft, setDraft, next, back }: ScreenProps) {
  const suggestion = useMemo(() => {
    if (!draft.claimType || !draft.duration || !draft.reach) return null;
    return suggestTier(
      draft.claimType,
      draft.formsOfCapital ?? [],
      draft.duration,
      draft.reach,
      draft.tangibleOutputs ?? [],
    );
  }, [draft.claimType, draft.duration, draft.reach, draft.formsOfCapital, draft.tangibleOutputs]);

  useEffect(() => {
    if (suggestion) {
      setDraft({
        suggestedTier: suggestion.tier,
        suggestedTierUsd: suggestion.usdValue,
        suggestedTierTokens: suggestion.tokenAmount,
        routeToFundPathway: suggestion.aboveTier,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.tier]);

  if (!suggestion) {
    return (
      <GlassCard className="p-6 md:p-10">
        <p className="text-white/75">We need a few more answers before we can suggest a tier. Go back a step.</p>
        <div className="mt-6"><PillButton variant="secondary" onClick={back}>Back</PillButton></div>
      </GlassCard>
    );
  }

  const override = draft.contributorOverride ?? "accept";

  return (
    <GlassCard className="p-6 md:p-10">
      {suggestion.aboveTier ? (
        <>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">This looks bigger than the individual game.</h2>
          <p className="text-white/70 text-sm mb-4">What you've described is the kind of contribution we recognize through the Fund pathway, not the Game tier system. Both are real. Both count.</p>
          <p className="text-white/60 text-sm mb-6">We'll flag your claim for the Fund review track. Someone from our team will be in touch to continue the conversation there. You can still complete the rest of this flow, and your story will carry through.</p>
        </>
      ) : (
        <>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Based on what you shared, we're looking at:</h2>
          <p className="text-white/60 text-sm mb-6">This is a starting point. It's a conversation, not a verdict.</p>
        </>
      )}

      <div className="rounded-2xl p-6 mb-6 border" style={{ borderColor: `${suggestion.tierDef.color}66`, backgroundColor: `${suggestion.tierDef.color}14` }}>
        <TierBadge tier={suggestion.tier} className="mb-3" />
        <div className="text-white text-xl font-bold mb-1">{suggestion.tierLabel}</div>
        <div className="text-white/75 text-sm mb-4">{suggestion.tierDef.description}</div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
          <div>
            <div className="text-white/50 text-[11px] uppercase tracking-wide">USD equivalent</div>
            <div className="text-white text-lg font-semibold">${suggestion.usdValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-white/50 text-[11px] uppercase tracking-wide">$ReGen tokens</div>
            <div className="text-white text-lg font-semibold">{suggestion.tokenAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-white/70 text-sm mb-2">Does this feel right?</p>
        {[
          { id: "accept" as const, label: "Yes, this feels right" },
          { id: "lower" as const, label: "It feels a bit high" },
          { id: "higher" as const, label: "It feels a bit low" },
        ].map((opt) => {
          const active = override === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setDraft({ contributorOverride: opt.id })}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-xl border transition-colors text-sm",
                active ? "border-[#7dd87d] bg-[#7dd87d]/10 text-white" : "border-white/10 bg-white/3 text-white/75 hover:border-white/25",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {(override === "higher" || override === "lower") && (
        <textarea
          value={draft.overrideReason ?? ""}
          onChange={(e) => setDraft({ overrideReason: e.target.value })}
          placeholder="Tell us why. A few sentences."
          rows={4}
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#7dd87d] mb-4"
        />
      )}

      <div className="flex justify-between mt-6">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
