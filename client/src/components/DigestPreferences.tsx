/**
 * DigestPreferences - User-controlled email digest frequency settings
 * Shows on PlayerProfile page for authenticated users with a profile
 */
import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type DigestFrequency = "never" | "weekly" | "monthly" | "seasonal" | "newsletter";

const OPTIONS: { value: DigestFrequency; label: string; description: string }[] = [
  { value: "newsletter", label: "Newsletter", description: "Occasional and important updates" },
  { value: "weekly", label: "Weekly", description: "Every Monday  -  stay on top of new quests & project updates" },
  { value: "monthly", label: "Monthly", description: "First of the month  -  fund updates, highlights & community news" },
  { value: "seasonal", label: "Seasonal", description: "4x per year  -  deep-dive reflections & major milestones" },
  { value: "never", label: "Never", description: "No digest emails  -  you can always visit the site directly" },
];

interface Props {
  currentFrequency: DigestFrequency;
}

export function DigestPreferences({ currentFrequency }: Props) {
  const [selected, setSelected] = useState<DigestFrequency>(currentFrequency);
  const [saving, setSaving] = useState(false);

  const updateMutation = trpc.playerProfiles.updateDigestFrequency.useMutation({
    onSuccess: () => {
      toast.success("Digest preference saved");
      setSaving(false);
    },
    onError: (err) => {
      toast.error("Failed to save preference", { description: err.message });
      setSaving(false);
    },
  });

  function handleSelect(freq: DigestFrequency) {
    setSelected(freq);
    setSaving(true);
    updateMutation.mutate({ frequency: freq });
  }

  return (
    <div id="email-digest" className="glass-panel p-5 rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-semibold text-sm">Email Digest Frequency</h3>
        {saving && <span className="text-white/60 text-xs">Saving…</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`relative text-left p-3 rounded-xl border transition-all ${
              selected === opt.value
                ? "border-[#7dd87d] bg-[#7dd87d]/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            {selected === opt.value && (
              <span className="absolute top-2.5 right-2.5">
                <Check className="w-3.5 h-3.5 text-[#7dd87d]" />
              </span>
            )}
            <p className={`text-sm font-medium ${selected === opt.value ? "text-[#7dd87d]" : "text-white"}`}>
              {opt.label}
            </p>
            <p className="text-white/70 text-xs mt-0.5 pr-4">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
