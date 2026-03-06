/**
 * PathSelectionScreen — Full-screen interstitial shown once after first login.
 * User picks their path; selection is stored via tRPC and onboardingComplete is set.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Coins, Sprout, Handshake, Leaf } from "lucide-react";

type Path = "investor" | "land_project" | "ally" | "player";

const paths: {
  id: Path;
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
  borderColor: string;
}[] = [
  {
    id: "investor",
    icon: Coins,
    title: "Investor",
    description: "I want to fund regenerative land projects",
    accentColor: "#fbbf24",
    borderColor: "border-yellow-400/40",
  },
  {
    id: "land_project",
    icon: Sprout,
    title: "Land Project",
    description: "I have land and want to build a regenerative community",
    accentColor: "#7dd87d",
    borderColor: "border-green-400/40",
  },
  {
    id: "ally",
    icon: Handshake,
    title: "Alliance Partner",
    description: "I'm an organization that supports regenerative projects",
    accentColor: "#60a5fa",
    borderColor: "border-blue-400/40",
  },
  {
    id: "player",
    icon: Leaf,
    title: "Player",
    description: "I want to do Quests and participate in co-creating the Infinite Game",
    accentColor: "#a78bfa",
    borderColor: "border-purple-400/40",
  },
];

interface PathSelectionScreenProps {
  onComplete: () => void;
}

export function PathSelectionScreen({ onComplete }: PathSelectionScreenProps) {
  const [selected, setSelected] = useState<Path | null>(null);
  const [saving, setSaving] = useState(false);

  const setPath = trpc.userProfiles.setPath.useMutation({
    onSuccess: () => {
      onComplete();
    },
  });

  async function handleConfirm() {
    if (!selected || saving) return;
    setSaving(true);
    setPath.mutate({ path: selected });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome to ReGen Civics
          </h1>
          <p className="text-white/70 text-lg">Which best describes you?</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {paths.map((p) => {
            const Icon = p.icon;
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`glass-panel p-6 text-left transition-all duration-200 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 ${
                  isSelected
                    ? `${p.borderColor} scale-[1.02] shadow-lg`
                    : "border-white/10 hover:border-white/30 hover:scale-[1.01]"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${p.accentColor}22` }}
                >
                  <Icon className="w-5 h-5" style={{ color: p.accentColor }} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{p.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{p.description}</p>
                {isSelected && (
                  <div
                    className="mt-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: p.accentColor }}
                  >
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="px-8 py-3 rounded-lg font-semibold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selected
                ? paths.find((p) => p.id === selected)?.accentColor
                : "#7dd87d",
              color: "#1a1a1a",
            }}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
          <button
            onClick={onComplete}
            className="text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
