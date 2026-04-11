import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";
import { durationOptions } from "@/lib/tierConfig";
import { cn } from "@/lib/cn";

export function DurationScreen({ draft, setDraft, next, back }: ScreenProps) {
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">How long have you been doing this work?</h2>
      <p className="text-white/60 text-sm mb-6">Ballpark is fine. Count the years you've been actively at it.</p>
      <div className="space-y-2 mb-6">
        {durationOptions.map((d) => {
          const active = draft.duration === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setDraft({ duration: d.id })}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm",
                active ? "border-[#7dd87d] bg-[#7dd87d]/10 text-white" : "border-white/10 bg-white/3 text-white/75 hover:border-white/25",
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next} disabled={!draft.duration}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
