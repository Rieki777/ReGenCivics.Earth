import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { User, Building2 } from "lucide-react";
import { ScreenProps } from "./types";
import { cn } from "@/lib/cn";

export function ClaimTypeScreen({ draft, setDraft, next, back }: ScreenProps) {
  const selected = draft.claimType;
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Are you claiming as a person or an organization?</h2>
      <p className="text-white/60 text-sm mb-8">Either is welcome. The questions shift a little depending on your answer.</p>
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {[
          { id: "individual" as const, label: "An individual", Icon: User, blurb: "Your own work, your own story." },
          { id: "organization" as const, label: "An organization", Icon: Building2, blurb: "A collective, network, fund, or group." },
        ].map((opt) => {
          const active = selected === opt.id;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.id}
              onClick={() => setDraft({ claimType: opt.id })}
              className={cn(
                "text-left p-5 rounded-2xl border transition-all",
                active ? "border-[#7dd87d] bg-[#7dd87d]/10" : "border-white/10 bg-white/5 hover:border-white/25",
              )}
            >
              <Icon className="w-7 h-7 text-[#7dd87d] mb-3" />
              <div className="text-white font-semibold mb-1">{opt.label}</div>
              <div className="text-white/60 text-sm">{opt.blurb}</div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next} disabled={!selected}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
