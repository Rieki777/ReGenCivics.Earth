import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ScreenProps, CapitalFormEntry } from "./types";
import { capitalForms } from "@/lib/tierConfig";
import { cn } from "@/lib/cn";

export function CapitalFormsScreen({ draft, setDraft, next, back }: ScreenProps) {
  const entries = draft.formsOfCapital ?? [];
  const selectedIds = new Set(entries.map((e) => e.form));

  const toggle = (id: string) => {
    if (selectedIds.has(id)) {
      setDraft({ formsOfCapital: entries.filter((e) => e.form !== id) });
    } else {
      setDraft({ formsOfCapital: [...entries, { form: id, example: "" }] });
    }
  };

  const setExample = (id: string, example: string) => {
    setDraft({ formsOfCapital: entries.map((e) => (e.form === id ? { ...e, example } : e)) });
  };

  return (
    <GlassCard className="p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">What forms of capital have you been contributing?</h2>
      <p className="text-white/60 text-sm mb-6">Pick any that apply. For each one you pick, drop in a single line about what it looked like.</p>
      <div className="space-y-3 mb-6">
        {capitalForms.map((cf) => {
          const active = selectedIds.has(cf.id);
          const entry = entries.find((e) => e.form === cf.id);
          return (
            <div key={cf.id} className={cn("rounded-xl border transition-colors", active ? "border-[#7dd87d]/50 bg-[#7dd87d]/5" : "border-white/10 bg-white/3")}>
              <button
                onClick={() => toggle(cf.id)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                <span className={cn("w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center", active ? "bg-[#7dd87d] border-[#7dd87d]" : "border-white/30")}>
                  {active && <span className="text-[#0d2818] text-xs font-bold">✓</span>}
                </span>
                <div>
                  <div className="text-white font-semibold text-sm">{cf.label}</div>
                  <div className="text-white/55 text-xs">{cf.description}</div>
                </div>
              </button>
              {active && (
                <div className="px-4 pb-4 pl-12">
                  <input
                    type="text"
                    value={entry?.example ?? ""}
                    onChange={(e) => setExample(cf.id, e.target.value)}
                    placeholder="One line of what this looked like"
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
        <PillButton onClick={next} disabled={entries.length === 0}>Next</PillButton>
      </div>
    </GlassCard>
  );
}
