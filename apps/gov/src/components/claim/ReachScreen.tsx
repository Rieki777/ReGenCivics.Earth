import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";
import { individualReachOptions, orgReachOptions } from "@/lib/tierConfig";
import { cn } from "@/lib/cn";

export function ReachScreen({ draft, setDraft, next, back }: ScreenProps) {
  const isOrg = draft.claimType === "organization";
  const options = isOrg ? orgReachOptions : individualReachOptions;
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">How far has your work reached?</h2>
      <p className="text-white/60 text-sm mb-6">A rough sense is fine. We're looking for scale, not precision.</p>
      <div className="space-y-2 mb-6">
        {options.map((r) => {
          const active = draft.reach === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setDraft({ reach: r.id })}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm",
                active ? "border-[#7dd87d] bg-[#7dd87d]/10 text-white" : "border-white/10 bg-white/3 text-white/75 hover:border-white/25",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next} disabled={!draft.reach}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
