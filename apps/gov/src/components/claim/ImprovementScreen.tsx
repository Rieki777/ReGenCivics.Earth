import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";

export function ImprovementScreen({ draft, setDraft, next, back }: ScreenProps) {
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">How could we make this better?</h2>
      <p className="text-white/60 text-sm mb-6">This whole flow is a game we're playing with you. If a question felt off, or a category was missing, or something didn't sit right, tell us. The best ideas become proposals that shape the next version.</p>
      <textarea
        value={draft.improvementSuggestion ?? ""}
        onChange={(e) => setDraft({ improvementSuggestion: e.target.value })}
        placeholder="What would you change?"
        rows={6}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#7dd87d] mb-4"
      />
      <p className="text-white/60 text-xs mb-6">If you drop something in here, we'll post it to the forum under Air &gt; Onboarding Games &gt; Historical Contribution Accounting, tagged to your name.</p>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
