import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps } from "./types";
import { X, Plus } from "lucide-react";

export function EvidenceScreen({ draft, setDraft, next, back }: ScreenProps) {
  const links = draft.evidenceLinks ?? [];
  const update = (i: number, v: string) => setDraft({ evidenceLinks: links.map((l, idx) => (idx === i ? v : l)) });
  const add = () => setDraft({ evidenceLinks: [...links, ""] });
  const remove = (i: number) => setDraft({ evidenceLinks: links.filter((_, idx) => idx !== i) });

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Any links we should see?</h2>
      <p className="text-white/60 text-sm mb-6">Totally optional. A website, a project, a piece of writing, a video. Whatever shows some of the work.</p>
      <div className="space-y-2 mb-4">
        {links.length === 0 && <p className="text-white/40 text-sm italic">No links added.</p>}
        {links.map((link, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="url"
              value={link}
              onChange={(e) => update(i, e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-white/35 focus:outline-none focus:border-[#7dd87d]"
            />
            <button onClick={() => remove(i)} className="text-white/55 hover:text-white p-2" aria-label="Remove link">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="text-[#7dd87d] hover:text-[#9de89d] text-sm flex items-center gap-1 mb-6">
        <Plus className="w-4 h-4" /> Add a link
      </button>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
