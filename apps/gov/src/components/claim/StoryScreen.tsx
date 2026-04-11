import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";

export function StoryScreen({ draft, setDraft, next, back }: ScreenProps) {
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Tell us a little of the story.</h2>
      <p className="text-white/60 text-sm mb-6">In your own words. What has this work been about, and why did you keep showing up? No word count, no format. Write what wants to be written.</p>
      <textarea
        value={draft.description ?? ""}
        onChange={(e) => setDraft({ description: e.target.value })}
        placeholder="Start anywhere."
        rows={10}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#7dd87d] mb-6"
      />
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next} disabled={(draft.description ?? "").trim().length === 0}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
