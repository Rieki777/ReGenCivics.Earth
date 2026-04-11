import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps, TangibleOutputEntry } from "./types";
import { tangibleOutputTypes } from "@/lib/tierConfig";
import { cn } from "@/lib/cn";

export function TangibleOutputsScreen({ draft, setDraft, next, back }: ScreenProps) {
  const outputs = draft.tangibleOutputs ?? [];
  const selectedTypes = new Set(outputs.map((o) => o.type));

  const toggle = (id: string) => {
    if (selectedTypes.has(id)) {
      setDraft({ tangibleOutputs: outputs.filter((o) => o.type !== id) });
    } else {
      setDraft({ tangibleOutputs: [...outputs, { type: id, name: "", description: "" }] });
    }
  };

  const updateOutput = (id: string, patch: Partial<TangibleOutputEntry>) => {
    setDraft({ tangibleOutputs: outputs.map((o) => (o.type === id ? { ...o, ...patch } : o)) });
  };

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What have you built, grown, or put into the world?</h2>
      <p className="text-white/60 text-sm mb-6">Pick any that apply. For each one, give it a name and a sentence or two of description. Feel free to skip the rest once you've got a few in.</p>
      <div className="space-y-3 mb-6">
        {tangibleOutputTypes.map((ot) => {
          const active = selectedTypes.has(ot.id);
          const entry = outputs.find((o) => o.type === ot.id);
          return (
            <div key={ot.id} className={cn("rounded-xl border", active ? "border-[#7dd87d]/50 bg-[#7dd87d]/5" : "border-white/10 bg-white/3")}>
              <button onClick={() => toggle(ot.id)} className="w-full text-left p-3 flex items-center gap-3">
                <span className={cn("w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center", active ? "bg-[#7dd87d] border-[#7dd87d]" : "border-white/30")}>
                  {active && <span className="text-[#0d2818] text-xs font-bold">✓</span>}
                </span>
                <span className="text-white text-sm font-medium">{ot.label}</span>
              </button>
              {active && (
                <div className="px-3 pb-3 pl-11 space-y-2">
                  <input
                    type="text"
                    value={entry?.name ?? ""}
                    onChange={(e) => updateOutput(ot.id, { name: e.target.value })}
                    placeholder="Name"
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-white/35 focus:outline-none focus:border-[#7dd87d]"
                  />
                  <textarea
                    value={entry?.description ?? ""}
                    onChange={(e) => updateOutput(ot.id, { description: e.target.value })}
                    placeholder="A sentence or two about it"
                    rows={2}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-white/35 focus:outline-none focus:border-[#7dd87d]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        <PillButton variant="secondary" onClick={back}>Back</PillButton>
        <PillButton onClick={next}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
