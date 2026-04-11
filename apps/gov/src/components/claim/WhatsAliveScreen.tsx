import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";

export function WhatsAliveScreen({ draft, setDraft, next, back }: ScreenProps) {
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What's alive for you right now?</h2>
      <p className="text-white/60 text-sm mb-6">What you're bringing forward. What you're grieving. What you're curious about. Whatever's up at this moment.</p>
      <textarea
        value={draft.whatsAlive ?? ""}
        onChange={(e) => setDraft({ whatsAlive: e.target.value })}
        placeholder="Just a few sentences."
        rows={5}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#7dd87d] mb-6"
      />
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
