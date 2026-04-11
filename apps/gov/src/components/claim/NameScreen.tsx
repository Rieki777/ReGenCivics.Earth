import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";

export function NameScreen({ draft, setDraft, next, back }: ScreenProps) {
  const isOrg = draft.claimType === "organization";
  const canAdvance = (draft.displayName ?? "").trim().length > 0;
  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
        {isOrg ? "What's the name of the organization?" : "What should we call you?"}
      </h2>
      <p className="text-white/60 text-sm mb-6">
        {isOrg ? "The name that should appear on your contributor profile." : "Your real name or a handle. Whatever feels right for this work."}
      </p>
      <input
        type="text"
        value={draft.displayName ?? ""}
        onChange={(e) => setDraft({ displayName: e.target.value })}
        placeholder={isOrg ? "Organization name" : "Name or handle"}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#7dd87d] mb-4"
      />
      {isOrg && (
        <>
          <label className="block text-white/70 text-sm mb-2">A short description of what the organization does (optional)</label>
          <textarea
            value={draft.orgDescription ?? ""}
            onChange={(e) => setDraft({ orgDescription: e.target.value })}
            placeholder="A few sentences."
            rows={3}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#7dd87d] mb-4"
          />
        </>
      )}
      <div className="flex justify-between mt-6">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next} disabled={!canAdvance}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
